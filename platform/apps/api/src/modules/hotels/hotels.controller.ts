import { Controller, Get, Query } from "@nestjs/common";
import { HotelsService } from "./hotels.service";

@Controller("hotels")
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get("search")
  search(
    @Query("location") location: string,
    @Query("checkIn") checkIn: string,
    @Query("checkOut") checkOut: string,
    @Query("guests") guests = "1",
  ) {
    return this.hotelsService.search({ location, checkIn, checkOut, guests: Number(guests) });
  }
}
