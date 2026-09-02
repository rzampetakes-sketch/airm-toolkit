import { Controller, Get, Query } from "@nestjs/common";
import { EmptyLegsService } from "./empty-legs.service";

@Controller("empty-legs")
export class EmptyLegsController {
  constructor(private readonly emptyLegsService: EmptyLegsService) {}

  @Get("search")
  search(
    @Query("origin") origin?: string,
    @Query("destination") destination?: string,
    @Query("earliestDeparture") earliestDeparture = new Date().toISOString(),
    @Query("latestDeparture") latestDeparture = new Date(Date.now() + 14 * 24 * 3_600_000).toISOString(),
  ) {
    return this.emptyLegsService.search({ origin, destination, earliestDeparture, latestDeparture });
  }
}
