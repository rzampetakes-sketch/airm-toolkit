import { Body, Controller, Param, Post } from "@nestjs/common";
import { BagType, FlightOffer, PassengerInput } from "@travel-platform/types";
import { BookingService } from "./booking.service";

@Controller("bookings")
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  /** `offer` is the FlightOffer object returned by GET /flights/search, passed back verbatim. */
  @Post("flights")
  startFlightBooking(@Body() dto: { userId: string; offer: FlightOffer }) {
    return this.bookingService.startFlightBooking(dto.userId, dto.offer);
  }

  @Post("empty-legs")
  startEmptyLegBooking(@Body() dto: { userId: string; emptyLegId: string }) {
    return this.bookingService.startEmptyLegBooking(dto.userId, dto.emptyLegId);
  }

  @Post(":bookingId/passengers")
  addPassenger(@Param("bookingId") bookingId: string, @Body() dto: PassengerInput) {
    return this.bookingService.addPassenger(bookingId, dto);
  }

  @Post(":bookingId/seats")
  selectSeat(
    @Param("bookingId") bookingId: string,
    @Body() dto: { passengerId: string; flightSegmentId: string; seatNumber: string },
  ) {
    return this.bookingService.selectSeat(bookingId, dto.passengerId, dto.flightSegmentId, dto.seatNumber);
  }

  @Post(":bookingId/baggage")
  selectBaggage(
    @Param("bookingId") bookingId: string,
    @Body() dto: { passengerId: string; bagType: BagType; quantity: number },
  ) {
    return this.bookingService.selectBaggage(bookingId, dto.passengerId, dto.bagType, dto.quantity);
  }

  @Post(":bookingId/hotels")
  addHotel(
    @Param("bookingId") bookingId: string,
    @Body()
    dto: { sourcePropertyId: string; hotelName: string; roomType: string; checkIn: string; checkOut: string; amount: number; currency: string },
  ) {
    return this.bookingService.addHotel(bookingId, dto);
  }

  @Post(":bookingId/car-rentals")
  addCarRental(
    @Param("bookingId") bookingId: string,
    @Body()
    dto: { vehicleType: string; pickupLocation: string; dropoffLocation: string; pickupAt: string; dropoffAt: string; amount: number; currency: string },
  ) {
    return this.bookingService.addCarRental(bookingId, dto);
  }

  @Post(":bookingId/taxis")
  addTaxi(
    @Param("bookingId") bookingId: string,
    @Body() dto: { vehicleType: string; pickupLocation: string; dropoffLocation: string; pickupAt: string; amount: number; currency: string },
  ) {
    return this.bookingService.addTaxi(bookingId, dto);
  }

  @Post(":bookingId/checkout")
  checkout(@Param("bookingId") bookingId: string) {
    return this.bookingService.checkout(bookingId);
  }
}
