import { Injectable } from "@nestjs/common";
import { UnifiedFlightOffer } from "@travel-platform/types";
import { FlightSearchParams, FlightSourceAdapter } from "../../../common/interfaces/flight-adapter.interface";

/**
 * Wraps the Avinode marketplace API for private jet charter quotes and
 * published empty legs. Avinode charter pricing is a live RFQ, not an
 * instantly bookable fare — offers returned here typically carry a short
 * `expiresAt` and the resulting booking flow uses the charter-request
 * path (see docs/architecture/ARCHITECTURE.md) rather than instant book.
 *
 * TODO: replace with the real Avinode REST/Marketplace API client once
 * AVINODE_API_KEY / AVINODE_API_SECRET are provisioned.
 */
@Injectable()
export class AvinodeAdapter implements FlightSourceAdapter {
  readonly source = "avinode" as const;

  async search(params: FlightSearchParams): Promise<UnifiedFlightOffer[]> {
    const [charterQuotes, emptyLegs] = await Promise.all([
      this.fetchCharterQuotes(params),
      this.fetchEmptyLegs(params),
    ]);
    return [...charterQuotes.map((q) => this.toUnifiedOffer(q, "private_jet_charter")),
            ...emptyLegs.map((q) => this.toUnifiedOffer(q, "empty_leg"))];
  }

  private async fetchCharterQuotes(params: FlightSearchParams): Promise<any[]> {
    void params;
    return [];
  }

  private async fetchEmptyLegs(params: FlightSearchParams): Promise<any[]> {
    void params;
    return [];
  }

  private toUnifiedOffer(raw: any, type: "private_jet_charter" | "empty_leg"): UnifiedFlightOffer {
    return {
      id: `avinode_${raw.id}`,
      source: "avinode",
      sourceOfferId: raw.id,
      type,
      cabinClass: "private",
      aircraftType: raw.aircraft?.type,
      operatorName: raw.operator?.name,
      segments: [
        {
          origin: raw.departureAirport,
          destination: raw.arrivalAirport,
          departureAt: raw.departureTime,
          arrivalAt: raw.arrivalTime,
          durationMinutes: raw.flightTimeMinutes,
        },
      ],
      baseAmount: Number(raw.price?.amount),
      baseCurrency: raw.price?.currency ?? "USD",
      finalAmount: Number(raw.price?.amount),
      finalCurrency: raw.price?.currency ?? "USD",
      seatsAvailable: raw.aircraft?.maxPassengers,
      expiresAt: raw.quoteExpiresAt,
    };
  }
}
