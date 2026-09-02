import { Module } from "@nestjs/common";
import { SearchModule } from "./modules/search/search.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { BookingModule } from "./modules/booking/booking.module";
import { LoyaltyModule } from "./modules/loyalty/loyalty.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    SearchModule,
    PricingModule,
    BookingModule,
    LoyaltyModule,
    PaymentsModule,
    NotificationsModule,
    UsersModule,
  ],
})
export class AppModule {}
