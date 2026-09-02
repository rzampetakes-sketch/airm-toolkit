import { Body, Controller, Post } from "@nestjs/common";
import { BookingService } from "./booking.service";

@Controller("bookings")
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post("flights")
  bookFlight(@Body() dto: { userId: string; flightId: string }) {
    return this.bookingService.bookFlight(dto.userId, dto.flightId);
  }

  @Post("empty-legs")
  bookEmptyLeg(@Body() dto: { userId: string; emptyLegId: string }) {
    return this.bookingService.bookEmptyLeg(dto.userId, dto.emptyLegId);
  }
}
