import { Injectable } from "@nestjs/common";
import { FlightOffer, FlightSearchParams } from "@travel-platform/types";
import { FlightProvider } from "../flight-provider.interface";

const MOCK_AIRLINES = ["Emirates", "Qatar Airways", "Singapore Airlines", "Lufthansa", "British Airways"];

/**
 * Deterministic, dependency-free fixture data so search/ranking/booking
 * can be built and demoed before any real GDS credentials exist. Never
 * wired up alongside real providers in production — see
 * FlightsModule, which registers this only when `USE_MOCK_PROVIDERS=true`.
 */
@Injectable()
export class MockFlightProvider implements FlightProvider {
  readonly source = "mock" as const;

  isEnabled(): boolean {
    return process.env.USE_MOCK_PROVIDERS === "true";
  }

  async search(params: FlightSearchParams): Promise<FlightOffer[]> {
    const basePrice = params.cabinClass === "first" ? 8500 : 4200;

    return MOCK_AIRLINES.map((airline, index) => {
      const hour = String(8 + index * 2).padStart(2, "0");
      const departureAt = new Date(`${params.departureDate}T${hour}:00:00Z`);
      const durationMinutes = 420 + index * 30;
      const arrivalAt = new Date(departureAt.getTime() + durationMinutes * 60_000);

      return {
        id: `mock_${params.origin}_${params.destination}_${index}`,
        source: "mock",
        sourceOfferId: `mock-offer-${index}`,
        cabinClass: params.cabinClass,
        airline,
        segments: [
          {
            origin: params.origin,
            destination: params.destination,
            departureAt: departureAt.toISOString(),
            arrivalAt: arrivalAt.toISOString(),
            airline,
            flightNumber: `${airline.slice(0, 2).toUpperCase()}${100 + index}`,
            durationMinutes,
          },
        ],
        amount: basePrice + index * 350,
        currency: "USD",
        seatsAvailable: 4 - (index % 3),
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      };
    });
  }
}
