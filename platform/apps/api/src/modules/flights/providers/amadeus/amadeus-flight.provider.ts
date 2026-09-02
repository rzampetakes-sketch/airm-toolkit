import { Injectable, Logger } from "@nestjs/common";
import { FlightOffer, FlightSearchParams } from "@travel-platform/types";
import { FlightProvider } from "../flight-provider.interface";

/**
 * ⚠️ Amadeus for Developers shut down the Self-Service API portal on
 * July 17, 2026 (registration paused earlier in Spring 2026). New
 * integrations can no longer self-serve a key — only existing Amadeus
 * Enterprise customers can reach equivalent flight-search data, through
 * a direct commercial/GDS agreement, not this developer portal. This
 * provider is kept as a dormant seam for teams that already hold (or
 * later negotiate) Enterprise access; it will never enable itself via a
 * self-service key. See docs/architecture/api-provider-research.md.
 */
@Injectable()
export class AmadeusFlightProvider implements FlightProvider {
  private readonly logger = new Logger(AmadeusFlightProvider.name);
  readonly source = "amadeus" as const;

  isEnabled(): boolean {
    if (process.env.AMADEUS_CLIENT_ID) {
      this.logger.warn(
        "AMADEUS_CLIENT_ID is set, but Amadeus Self-Service was decommissioned 2026-07-17. " +
          "This key is only usable if it is an Enterprise-portal credential, not a Self-Service one.",
      );
    }
    return Boolean(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_ENTERPRISE === "true");
  }

  async search(params: FlightSearchParams): Promise<FlightOffer[]> {
    void params;
    return [];
  }
}
