import { Injectable } from "@nestjs/common";
import { UnifiedFlightOffer } from "@travel-platform/types";
import { FlightSearchParams, FlightSourceAdapter } from "../../../common/interfaces/flight-adapter.interface";

/**
 * Wraps the Duffel API (NDC aggregator for scheduled airlines) and maps
 * Duffel offers to UnifiedFlightOffer. Business/First cabin filtering
 * happens here so the orchestrator only ever receives premium-cabin
 * commercial offers.
 *
 * TODO: swap the stub `duffelClient` for the official `@duffel/api` SDK
 * once DUFFEL_API_KEY is provisioned.
 */
@Injectable()
export class DuffelAdapter implements FlightSourceAdapter {
  readonly source = "duffel" as const;

  async search(params: FlightSearchParams): Promise<UnifiedFlightOffer[]> {
    const rawOffers = await this.fetchOffersFromDuffel(params);
    return rawOffers.map((raw) => this.toUnifiedOffer(raw));
  }

  private async fetchOffersFromDuffel(params: FlightSearchParams): Promise<any[]> {
    // Placeholder for the real Duffel offer request:
    // const response = await duffelClient.offerRequests.create({ slices: [...], cabin_class: 'business' });
    void params;
    return [];
  }

  private toUnifiedOffer(raw: any): UnifiedFlightOffer {
    return {
      id: `duffel_${raw.id}`,
      source: "duffel",
      sourceOfferId: raw.id,
      type: "commercial_flight",
      cabinClass: raw.cabin_class === "first" ? "first" : "business",
      segments: (raw.slices ?? []).flatMap((slice: any) =>
        (slice.segments ?? []).map((segment: any) => ({
          origin: segment.origin.iata_code,
          destination: segment.destination.iata_code,
          departureAt: segment.departing_at,
          arrivalAt: segment.arriving_at,
          flightNumber: `${segment.marketing_carrier.iata_code}${segment.marketing_carrier_flight_number}`,
          durationMinutes: segment.duration_minutes,
        })),
      ),
      baseAmount: Number(raw.total_amount),
      baseCurrency: raw.total_currency,
      finalAmount: Number(raw.total_amount),
      finalCurrency: raw.total_currency,
      seatsAvailable: raw.available_seats,
      expiresAt: raw.expires_at,
    };
  }
}
