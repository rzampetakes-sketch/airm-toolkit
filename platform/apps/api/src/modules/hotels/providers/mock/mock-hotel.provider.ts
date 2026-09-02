import { Injectable } from "@nestjs/common";
import { HotelOffer, HotelSearchParams } from "@travel-platform/types";
import { HotelProvider } from "../hotel-provider.interface";

const MOCK_HOTELS = [
  { name: "The Carlyle", roomType: "Deluxe King", amount: 1450 },
  { name: "Aman New York", roomType: "Corner Suite", amount: 3200 },
  { name: "Four Seasons", roomType: "Executive Suite", amount: 1890 },
];

@Injectable()
export class MockHotelProvider implements HotelProvider {
  readonly source = "mock" as const;

  isEnabled(): boolean {
    return process.env.USE_MOCK_PROVIDERS === "true";
  }

  async search(params: HotelSearchParams): Promise<HotelOffer[]> {
    return MOCK_HOTELS.map((hotel, index) => ({
      id: `mock_hotel_${index}`,
      source: "mock",
      sourcePropertyId: `mock-property-${index}`,
      name: hotel.name,
      roomType: hotel.roomType,
      location: params.location,
      checkIn: params.checkIn,
      checkOut: params.checkOut,
      amount: hotel.amount,
      currency: "USD",
    }));
  }
}
