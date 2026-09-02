import { Injectable } from "@nestjs/common";
import { CarRentalOffer, CarRentalSearchParams } from "@travel-platform/types";
import { CarRentalProvider } from "../car-rental-provider.interface";

const MOCK_VEHICLES = [
  { vehicleType: "Mercedes S-Class", amount: 420 },
  { vehicleType: "Range Rover Autobiography", amount: 480 },
  { vehicleType: "BMW 7 Series", amount: 390 },
];

@Injectable()
export class MockCarRentalProvider implements CarRentalProvider {
  readonly source = "mock" as const;

  isEnabled(): boolean {
    return process.env.USE_MOCK_PROVIDERS === "true";
  }

  async search(params: CarRentalSearchParams): Promise<CarRentalOffer[]> {
    return MOCK_VEHICLES.map((vehicle, index) => ({
      id: `mock_car_${index}`,
      source: "mock",
      vehicleType: vehicle.vehicleType,
      pickupLocation: params.pickupLocation,
      dropoffLocation: params.dropoffLocation,
      pickupAt: params.pickupAt,
      dropoffAt: params.dropoffAt,
      amount: vehicle.amount,
      currency: "USD",
    }));
  }
}
