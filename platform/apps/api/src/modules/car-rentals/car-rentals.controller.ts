import { Controller, Get, Query } from "@nestjs/common";
import { CarRentalsService } from "./car-rentals.service";

@Controller("car-rentals")
export class CarRentalsController {
  constructor(private readonly carRentalsService: CarRentalsService) {}

  @Get("search")
  search(
    @Query("pickupLocation") pickupLocation: string,
    @Query("dropoffLocation") dropoffLocation: string,
    @Query("pickupAt") pickupAt: string,
    @Query("dropoffAt") dropoffAt: string,
  ) {
    return this.carRentalsService.search({ pickupLocation, dropoffLocation, pickupAt, dropoffAt });
  }
}
