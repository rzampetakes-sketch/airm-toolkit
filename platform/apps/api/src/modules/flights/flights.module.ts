import { Module } from "@nestjs/common";
import { FlightsService } from "./flights.service";
import { FlightsController } from "./flights.controller";
import { DuffelFlightProvider } from "./providers/duffel/duffel-flight.provider";
import { AmadeusFlightProvider } from "./providers/amadeus/amadeus-flight.provider";
import { SabreFlightProvider } from "./providers/sabre/sabre-flight.provider";
import { MockFlightProvider } from "./providers/mock/mock-flight.provider";

@Module({
  controllers: [FlightsController],
  providers: [FlightsService, DuffelFlightProvider, AmadeusFlightProvider, SabreFlightProvider, MockFlightProvider],
  exports: [FlightsService],
})
export class FlightsModule {}
