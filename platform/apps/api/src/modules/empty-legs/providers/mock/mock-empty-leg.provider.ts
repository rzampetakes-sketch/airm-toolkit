import { Injectable } from "@nestjs/common";
import { EmptyLegListing, EmptyLegSearchParams } from "@travel-platform/types";
import { EmptyLegProvider } from "../empty-leg-provider.interface";

const MOCK_LISTINGS: Array<Pick<EmptyLegListing, "aircraftType" | "origin" | "destination" | "operatorName" | "amount" | "seatsAvailable">> = [
  { aircraftType: "Citation CJ3", origin: "TEB", destination: "PBI", operatorName: "Meridian Air Charter", amount: 8900, seatsAvailable: 6 },
  { aircraftType: "Gulfstream G450", origin: "LAX", destination: "ASE", operatorName: "Summit Jets", amount: 15400, seatsAvailable: 8 },
  { aircraftType: "Phenom 300", origin: "MIA", destination: "TEB", operatorName: "Coastal Aviation", amount: 6200, seatsAvailable: 5 },
];

/**
 * Fixture empty-leg listings for development before any real Operator
 * has listed inventory and before Avinode/Jettly credentials exist. See
 * FlightsModule's MockFlightProvider for the same pattern on Part 1.
 */
@Injectable()
export class MockEmptyLegProvider implements EmptyLegProvider {
  readonly source = "mock" as const;

  isEnabled(): boolean {
    return process.env.USE_MOCK_PROVIDERS === "true";
  }

  async search(params: EmptyLegSearchParams): Promise<EmptyLegListing[]> {
    const departureAt = new Date(params.earliestDeparture);

    return MOCK_LISTINGS.map((listing, index) => ({
      id: `mock_empty_leg_${index}`,
      source: "mock",
      operatorName: listing.operatorName,
      aircraftType: listing.aircraftType,
      origin: params.origin ?? listing.origin,
      destination: params.destination ?? listing.destination,
      departureAt: new Date(departureAt.getTime() + index * 3_600_000).toISOString(),
      arrivalAt: new Date(departureAt.getTime() + (index * 3_600_000 + 2 * 3_600_000)).toISOString(),
      seatsAvailable: listing.seatsAvailable,
      amount: listing.amount,
      currency: "USD",
      status: "available",
    }));
  }
}
