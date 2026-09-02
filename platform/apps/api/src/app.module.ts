import { Module } from "@nestjs/common";
import { FlightsModule } from "./modules/flights/flights.module";
import { EmptyLegsModule } from "./modules/empty-legs/empty-legs.module";
import { OperatorsModule } from "./modules/operators/operators.module";
import { BookingModule } from "./modules/booking/booking.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    FlightsModule,
    EmptyLegsModule,
    OperatorsModule,
    BookingModule,
    PaymentsModule,
    NotificationsModule,
    UsersModule,
  ],
})
export class AppModule {}
