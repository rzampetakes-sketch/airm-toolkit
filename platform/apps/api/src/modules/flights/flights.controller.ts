import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { CabinClass } from "@travel-platform/types";
import { FlightsService } from "./flights.service";

@Controller("flights")
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Get("search")
  search(
    @Query("origin") origin: string,
    @Query("destination") destination: string,
    @Query("departureDate") departureDate: string,
    @Query("returnDate") returnDate: string | undefined,
    @Query("passengers") passengers = "1",
    @Query("cabinClass") cabinClass: string = "business",
  ) {
    if (cabinClass !== "business" && cabinClass !== "first") {
      throw new BadRequestException("cabinClass must be 'business' or 'first' — this search is premium-cabin only");
    }

    return this.flightsService.search({
      origin,
      destination,
      departureDate,
      returnDate,
      passengers: Number(passengers),
      cabinClass: cabinClass as CabinClass,
    });
  }
}
