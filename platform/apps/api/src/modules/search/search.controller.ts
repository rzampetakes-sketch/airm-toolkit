import { Controller, Get, Query } from "@nestjs/common";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query("origin") origin: string,
    @Query("destination") destination: string,
    @Query("departureDate") departureDate: string,
    @Query("returnDate") returnDate?: string,
    @Query("passengers") passengers = "1",
  ) {
    return this.searchService.search({
      origin,
      destination,
      departureDate,
      returnDate,
      passengers: Number(passengers),
    });
  }
}
