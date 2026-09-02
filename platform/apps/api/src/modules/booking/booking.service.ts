import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BagType, EmptyLegListing, FlightOffer, PassengerInput } from "@travel-platform/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { PaymentsService } from "../payments/payments.service";

const CHECKED_BAG_PRICE = 120;
const CARRY_ON_BAG_PRICE = 0;
const FRONT_ROW_SEAT_UPCHARGE = 150;

/**
 * One Booking is the whole checkout container: the primary purchase
 * (exactly one of `flightId`/`emptyLegId`), every Passenger, their
 * seat/baggage selections, and any hotel/car/taxi add-ons — all
 * assembled while `status = draft`, all paid in a single Payment once
 * `checkout()` moves it to `pending_payment`. This is what makes the
 * add-ons feel like the next step of one flow instead of a separate
 * purchase (see ARCHITECTURE.md's checkout walkthrough).
 *
 * TODO: real seat/baggage pricing should come from the provider's own
 * ancillary-pricing API (Duffel exposes both); the flat heuristics below
 * exist so the checkout flow works end-to-end before that integration.
 */
@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * `offer` is the exact FlightOffer the client got back from
   * GET /flights/search — search results are never persisted (see
   * FlightsService), so the offer the customer actually chose is cached
   * here, at the moment they commit to it, as the Flight + FlightSegment
   * rows the rest of checkout (seat selection specifically) references.
   */
  async startFlightBooking(userId: string, offer: FlightOffer) {
    if (new Date(offer.expiresAt) < new Date()) {
      throw new BadRequestException("This fare has expired — please search again");
    }
    if (offer.segments.length === 0) {
      throw new BadRequestException("Offer has no segments");
    }

    const flight = await this.prisma.flight.create({
      data: {
        source: offer.source,
        sourceOfferId: offer.sourceOfferId,
        cabinClass: offer.cabinClass,
        airline: offer.airline,
        origin: offer.segments[0].origin,
        destination: offer.segments[offer.segments.length - 1].destination,
        departureAt: new Date(offer.segments[0].departureAt),
        arrivalAt: new Date(offer.segments[offer.segments.length - 1].arrivalAt),
        rawPayload: offer as object,
        amount: offer.amount,
        currency: offer.currency,
        seatsAvailable: offer.seatsAvailable,
        expiresAt: new Date(offer.expiresAt),
        segments: {
          create: offer.segments.map((segment, sequence) => ({
            sequence,
            origin: segment.origin,
            destination: segment.destination,
            departureAt: new Date(segment.departureAt),
            arrivalAt: new Date(segment.arrivalAt),
            airline: segment.airline,
            flightNumber: segment.flightNumber,
            durationMinutes: segment.durationMinutes,
          })),
        },
      },
    });

    return this.prisma.booking.create({
      data: {
        userId,
        bookingType: "flight",
        flightId: flight.id,
        status: "draft",
        totalAmount: flight.amount,
        currency: flight.currency,
      },
    });
  }

  /**
   * `listing` is the exact EmptyLegListing the client got back from
   * GET /empty-legs/search. Only `platform_listed` listings (an
   * Operator's own inventory) already exist as a real `EmptyLeg` row —
   * everything else (mock, Avinode, ...) is provider-search output that,
   * like FlightOffer, was never persisted (see EmptyLegsService). So the
   * listing the customer actually chose is cached here into a real row
   * first, exactly mirroring startFlightBooking's Flight-caching step.
   *
   * Empty-leg inventory is scarce enough that we hold the seat for the
   * duration of checkout, the same tradeoff an airline makes with a seat
   * hold — flips `EmptyLeg.status` to `booked` immediately rather than
   * only at final payment. TODO: a TTL-based release job for abandoned
   * drafts (e.g. reopen after 15 minutes with no `checkout()` call).
   */
  async startEmptyLegBooking(userId: string, listing: EmptyLegListing) {
    return this.prisma.$transaction(async (tx) => {
      const emptyLeg =
        listing.source === "platform_listed"
          ? await tx.emptyLeg.findUnique({ where: { id: listing.id } })
          : await tx.emptyLeg.create({
              data: {
                operatorId: listing.operatorId,
                operatorName: listing.operatorName,
                source: listing.source,
                sourceListingId: listing.id,
                aircraftType: listing.aircraftType,
                origin: listing.origin,
                destination: listing.destination,
                departureAt: new Date(listing.departureAt),
                arrivalAt: new Date(listing.arrivalAt),
                seatsAvailable: listing.seatsAvailable,
                amount: listing.amount,
                currency: listing.currency,
                status: "available",
              },
            });

      if (!emptyLeg) {
        throw new NotFoundException(`EmptyLeg ${listing.id} not found`);
      }
      if (emptyLeg.status !== "available") {
        throw new BadRequestException(`This empty leg is no longer available (status: ${emptyLeg.status})`);
      }

      await tx.emptyLeg.update({ where: { id: emptyLeg.id }, data: { status: "booked" } });

      return tx.booking.create({
        data: {
          userId,
          bookingType: "empty_leg",
          emptyLegId: emptyLeg.id,
          status: "draft",
          totalAmount: emptyLeg.amount,
          currency: emptyLeg.currency,
        },
      });
    });
  }

  /**
   * Full current state of a Booking for the checkout UI to render —
   * everything attached to it so far, in one call, rather than the
   * frontend having to stitch together several endpoints.
   */
  getBooking(bookingId: string) {
    return this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        flight: { include: { segments: { orderBy: { sequence: "asc" } } } },
        emptyLeg: true,
        passengers: { include: { seatSelections: true, baggageSelections: true } },
        hotelBookings: true,
        carRentalBookings: true,
        taxiBookings: true,
        payments: true,
      },
    });
  }

  addPassenger(bookingId: string, input: PassengerInput) {
    return this.prisma.passenger.create({
      data: {
        bookingId,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: new Date(input.dateOfBirth),
        passportNumber: input.passportNumber,
        loyaltyAirlineIataCode: input.loyalty?.airlineIataCode,
        loyaltyMembershipNumber: input.loyalty?.membershipNumber,
      },
    });
  }

  async selectSeat(bookingId: string, passengerId: string, flightSegmentId: string, seatNumber: string) {
    const priceAdjustment = this.priceSeat(seatNumber);

    return this.prisma.$transaction(async (tx) => {
      const seatSelection = await tx.seatSelection.create({
        data: { bookingId, passengerId, flightSegmentId, seatNumber, priceAdjustment, currency: "USD" },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { totalAmount: { increment: priceAdjustment } } });
      return seatSelection;
    });
  }

  async selectBaggage(bookingId: string, passengerId: string, bagType: BagType, quantity: number) {
    const pricePerBag = bagType === "checked" ? CHECKED_BAG_PRICE : CARRY_ON_BAG_PRICE;
    const priceAdjustment = pricePerBag * quantity;

    return this.prisma.$transaction(async (tx) => {
      const baggageSelection = await tx.baggageSelection.create({
        data: { bookingId, passengerId, bagType, quantity, priceAdjustment, currency: "USD" },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { totalAmount: { increment: priceAdjustment } } });
      return baggageSelection;
    });
  }

  addHotel(
    bookingId: string,
    offer: { sourcePropertyId: string; hotelName: string; roomType: string; checkIn: string; checkOut: string; amount: number; currency: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const hotelBooking = await tx.hotelBooking.create({
        data: {
          bookingId,
          source: "mock",
          sourcePropertyId: offer.sourcePropertyId,
          hotelName: offer.hotelName,
          roomType: offer.roomType,
          checkIn: new Date(offer.checkIn),
          checkOut: new Date(offer.checkOut),
          amount: offer.amount,
          currency: offer.currency,
        },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { totalAmount: { increment: offer.amount } } });
      return hotelBooking;
    });
  }

  addCarRental(
    bookingId: string,
    offer: { vehicleType: string; pickupLocation: string; dropoffLocation: string; pickupAt: string; dropoffAt: string; amount: number; currency: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const carRentalBooking = await tx.carRentalBooking.create({
        data: {
          bookingId,
          source: "mock",
          vehicleType: offer.vehicleType,
          pickupLocation: offer.pickupLocation,
          dropoffLocation: offer.dropoffLocation,
          pickupAt: new Date(offer.pickupAt),
          dropoffAt: new Date(offer.dropoffAt),
          amount: offer.amount,
          currency: offer.currency,
        },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { totalAmount: { increment: offer.amount } } });
      return carRentalBooking;
    });
  }

  addTaxi(
    bookingId: string,
    offer: { vehicleType: string; pickupLocation: string; dropoffLocation: string; pickupAt: string; amount: number; currency: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const taxiBooking = await tx.taxiBooking.create({
        data: {
          bookingId,
          source: "mock",
          vehicleType: offer.vehicleType,
          pickupLocation: offer.pickupLocation,
          dropoffLocation: offer.dropoffLocation,
          pickupAt: new Date(offer.pickupAt),
          amount: offer.amount,
          currency: offer.currency,
        },
      });
      await tx.booking.update({ where: { id: bookingId }, data: { totalAmount: { increment: offer.amount } } });
      return taxiBooking;
    });
  }

  /**
   * Locks the accumulated `totalAmount`, moves the Booking out of
   * `draft`, and creates the single Payment covering the flight/
   * empty-leg plus every seat/baggage/add-on selection made during
   * checkout.
   */
  async checkout(bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
    if (booking.status !== "draft") {
      throw new BadRequestException(`Booking ${bookingId} is not in draft (status: ${booking.status})`);
    }

    await this.prisma.booking.update({ where: { id: bookingId }, data: { status: "pending_payment" } });

    try {
      return await this.paymentsService.createPaymentForBooking(bookingId);
    } catch (error) {
      // Revert to draft so the customer can retry once real Stripe
      // credentials are configured, rather than getting stuck in
      // pending_payment with no payment record.
      await this.prisma.booking.update({ where: { id: bookingId }, data: { status: "draft" } });
      throw new BadGatewayException(
        "Payment could not be processed. This environment has no live Stripe key configured — see STRIPE_SECRET_KEY in .env.",
      );
    }
  }

  private priceSeat(seatNumber: string): number {
    const row = parseInt(seatNumber, 10);
    return Number.isFinite(row) && row <= 5 ? FRONT_ROW_SEAT_UPCHARGE : 0;
  }
}
