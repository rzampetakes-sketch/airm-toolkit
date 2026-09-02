import { Injectable } from "@nestjs/common";
import { TaxiOffer, TaxiSearchParams } from "@travel-platform/types";
import { TaxiProvider } from "../taxi-provider.interface";

const MOCK_VEHICLES = [
  { vehicleType: "Executive Sedan", amount: 95 },
  { vehicleType: "Luxury SUV", amount: 145 },
  { vehicleType: "Sprinter Van", amount: 210 },
];

@Injectable()
export class MockTaxiProvider implements TaxiProvider {
  readonly source = "mock" as const;

  isEnabled(): boolean {
    return process.env.USE_MOCK_PROVIDERS === "true";
  }

  async search(params: TaxiSearchParams): Promise<TaxiOffer[]> {
    return MOCK_VEHICLES.map((vehicle, index) => ({
      id: `mock_taxi_${index}`,
      source: "mock",
      vehicleType: vehicle.vehicleType,
      pickupLocation: params.pickupLocation,
      dropoffLocation: params.dropoffLocation,
      pickupAt: params.pickupAt,
      amount: vehicle.amount,
      currency: "USD",
    }));
  }
}
