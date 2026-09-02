import { Injectable } from "@nestjs/common";
import { FlightOffer, FlightSearchParams } from "@travel-platform/types";
import { FlightProvider } from "../flight-provider.interface";

/**
 * Duffel supports a `cabin_class` filter on offer requests
 * (economy | premium_economy | business | first) — see
 * https://duffel.com/docs/guides/following-search-best-practices —
 * so business/first filtering happens at the request, not by filtering
 * client-side after a full-cabin search. Coverage still varies by
 * airline/NDC connection; verify premium-cabin availability for your
 * target routes before committing to this as the sole commercial source.
 *
 * TODO: replace the fetch stub with the official `@duffel/api` SDK once
 * DUFFEL_API_KEY is provisioned (self-serve signup, no accreditation
 * required — see the vendor research notes in
 * docs/architecture/api-provider-research.md).
 */
@Injectable()
export class DuffelFlightProvider implements FlightProvider {
  readonly source = "duffel" as const;

  isEnabled(): boolean {
    return Boolean(process.env.DUFFEL_API_KEY);
  }

  async search(params: FlightSearchParams): Promise<FlightOffer[]> {
    const rawOffers = await this.createOfferRequest(params);
    return rawOffers.map((raw) => this.toFlightOffer(raw));
  }

  private async createOfferRequest(params: FlightSearchParams): Promise<any[]> {
    // const offerRequest = await duffelClient.offerRequests.create({
    //   slices: [{ origin: params.origin, destination: params.destination, departure_date: params.departureDate }],
    //   passengers: Array(params.passengers).fill({ type: "adult" }),
    //   cabin_class: params.cabinClass,
    // });
    // return offerRequest.data.offers;
    void params;
    return [];
  }

  private toFlightOffer(raw: any): FlightOffer {
    return {
      id: `duffel_${raw.id}`,
      source: "duffel",
      sourceOfferId: raw.id,
      cabinClass: raw.cabin_class === "first" ? "first" : "business",
      airline: raw.owner?.name,
      segments: (raw.slices ?? []).flatMap((slice: any) =>
        (slice.segments ?? []).map((segment: any) => ({
          origin: segment.origin.iata_code,
          destination: segment.destination.iata_code,
          departureAt: segment.departing_at,
          arrivalAt: segment.arriving_at,
          airline: segment.marketing_carrier.name,
          flightNumber: `${segment.marketing_carrier.iata_code}${segment.marketing_carrier_flight_number}`,
          durationMinutes: segment.duration_minutes,
        })),
      ),
      amount: Number(raw.total_amount),
      currency: raw.total_currency,
      seatsAvailable: raw.available_seats,
      expiresAt: raw.expires_at,
    };
  }
}
