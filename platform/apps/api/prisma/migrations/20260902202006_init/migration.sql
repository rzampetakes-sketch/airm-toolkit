-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('traveler', 'operator', 'admin');

-- CreateEnum
CREATE TYPE "CabinClass" AS ENUM ('business', 'first');

-- CreateEnum
CREATE TYPE "FlightProviderSource" AS ENUM ('duffel', 'amadeus', 'sabre', 'travelport', 'mock');

-- CreateEnum
CREATE TYPE "EmptyLegProviderSource" AS ENUM ('platform_listed', 'avinode', 'jettly', 'jethunter', 'villiers', 'mock');

-- CreateEnum
CREATE TYPE "EmptyLegStatus" AS ENUM ('available', 'booked', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('flight', 'empty_leg');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('draft', 'pending_payment', 'confirmed', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('unpaid', 'authorized', 'captured', 'refunded');

-- CreateEnum
CREATE TYPE "BagType" AS ENUM ('checked', 'carry_on');

-- CreateEnum
CREATE TYPE "HotelProviderSource" AS ENUM ('partner', 'mock');

-- CreateEnum
CREATE TYPE "CarRentalProviderSource" AS ENUM ('partner', 'mock');

-- CreateEnum
CREATE TYPE "TaxiProviderSource" AS ENUM ('partner', 'mock');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'traveler',
    "operator_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "airline_iata_code" TEXT NOT NULL,
    "membership_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operators" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "certificate_number" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "stripe_connected_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flights" (
    "id" TEXT NOT NULL,
    "source" "FlightProviderSource" NOT NULL,
    "source_offer_id" TEXT NOT NULL,
    "cabin_class" "CabinClass" NOT NULL,
    "airline" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departure_at" TIMESTAMP(3) NOT NULL,
    "arrival_at" TIMESTAMP(3) NOT NULL,
    "raw_payload" JSONB NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "seats_available" INTEGER,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flight_segments" (
    "id" TEXT NOT NULL,
    "flight_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departure_at" TIMESTAMP(3) NOT NULL,
    "arrival_at" TIMESTAMP(3) NOT NULL,
    "airline" TEXT NOT NULL,
    "flight_number" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,

    CONSTRAINT "flight_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empty_legs" (
    "id" TEXT NOT NULL,
    "operator_id" TEXT,
    "operator_name" TEXT NOT NULL,
    "source" "EmptyLegProviderSource" NOT NULL,
    "source_listing_id" TEXT,
    "aircraft_type" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departure_at" TIMESTAMP(3) NOT NULL,
    "arrival_at" TIMESTAMP(3) NOT NULL,
    "seats_available" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "EmptyLegStatus" NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "empty_legs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "booking_type" "BookingType" NOT NULL,
    "flight_id" TEXT,
    "empty_leg_id" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'draft',
    "total_amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passengers" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "passport_number" TEXT,
    "loyalty_airline_iata_code" TEXT,
    "loyalty_membership_number" TEXT,

    CONSTRAINT "passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_selections" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "flight_segment_id" TEXT NOT NULL,
    "seat_number" TEXT NOT NULL,
    "price_adjustment" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baggage_selections" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "passenger_id" TEXT NOT NULL,
    "bag_type" "BagType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_adjustment" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baggage_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_bookings" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "source" "HotelProviderSource" NOT NULL,
    "source_property_id" TEXT NOT NULL,
    "hotel_name" TEXT NOT NULL,
    "room_type" TEXT NOT NULL,
    "check_in" TIMESTAMP(3) NOT NULL,
    "check_out" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "hotel_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_rental_bookings" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "source" "CarRentalProviderSource" NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "pickup_location" TEXT NOT NULL,
    "dropoff_location" TEXT NOT NULL,
    "pickup_at" TIMESTAMP(3) NOT NULL,
    "dropoff_at" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "car_rental_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxi_bookings" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "source" "TaxiProviderSource" NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "pickup_location" TEXT NOT NULL,
    "dropoff_location" TEXT NOT NULL,
    "pickup_at" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "taxi_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "stripe_payment_intent_id" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "platform_fee_amount" DECIMAL(65,30) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_memberships_user_id_airline_iata_code_key" ON "loyalty_memberships"("user_id", "airline_iata_code");

-- CreateIndex
CREATE INDEX "flights_origin_destination_departure_at_idx" ON "flights"("origin", "destination", "departure_at");

-- CreateIndex
CREATE INDEX "flight_segments_flight_id_idx" ON "flight_segments"("flight_id");

-- CreateIndex
CREATE INDEX "empty_legs_origin_destination_departure_at_idx" ON "empty_legs"("origin", "destination", "departure_at");

-- CreateIndex
CREATE INDEX "empty_legs_status_idx" ON "empty_legs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_flight_id_key" ON "bookings"("flight_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_empty_leg_id_key" ON "bookings"("empty_leg_id");

-- CreateIndex
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "passengers_booking_id_idx" ON "passengers"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_selections_passenger_id_flight_segment_id_key" ON "seat_selections"("passenger_id", "flight_segment_id");

-- CreateIndex
CREATE INDEX "baggage_selections_booking_id_idx" ON "baggage_selections"("booking_id");

-- CreateIndex
CREATE INDEX "hotel_bookings_booking_id_idx" ON "hotel_bookings"("booking_id");

-- CreateIndex
CREATE INDEX "car_rental_bookings_booking_id_idx" ON "car_rental_bookings"("booking_id");

-- CreateIndex
CREATE INDEX "taxi_bookings_booking_id_idx" ON "taxi_bookings"("booking_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_memberships" ADD CONSTRAINT "loyalty_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flight_segments" ADD CONSTRAINT "flight_segments_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "flights"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empty_legs" ADD CONSTRAINT "empty_legs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_flight_id_fkey" FOREIGN KEY ("flight_id") REFERENCES "flights"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_empty_leg_id_fkey" FOREIGN KEY ("empty_leg_id") REFERENCES "empty_legs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_selections" ADD CONSTRAINT "seat_selections_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_selections" ADD CONSTRAINT "seat_selections_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_selections" ADD CONSTRAINT "seat_selections_flight_segment_id_fkey" FOREIGN KEY ("flight_segment_id") REFERENCES "flight_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baggage_selections" ADD CONSTRAINT "baggage_selections_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baggage_selections" ADD CONSTRAINT "baggage_selections_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_rental_bookings" ADD CONSTRAINT "car_rental_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxi_bookings" ADD CONSTRAINT "taxi_bookings_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
