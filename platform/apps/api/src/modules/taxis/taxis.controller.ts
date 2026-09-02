import { Controller, Get, Query } from "@nestjs/common";
import { TaxisService } from "./taxis.service";

@Controller("taxis")
export class TaxisController {
  constructor(private readonly taxisService: TaxisService) {}

  @Get("search")
  search(
    @Query("pickupLocation") pickupLocation: string,
    @Query("dropoffLocation") dropoffLocation: string,
    @Query("pickupAt") pickupAt: string,
    @Query("passengers") passengers = "1",
  ) {
    return this.taxisService.search({ pickupLocation, dropoffLocation, pickupAt, passengers: Number(passengers) });
  }
}
