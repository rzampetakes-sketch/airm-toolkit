"""
cost_model.py
==============

Core cost-calculation logic for the AIRM 615 Air Mercury simulation.

Reproduces, for any (route, aircraft type, configuration) combination, the same
unit-cost building blocks used in the IATA UNITCOST reference workbook:

    * Fuel cost
    * Environmental (emissions) charge
    * Overflight (ANSP) cost
    * Variable maintenance cost (per flight hour, block hour, and cycle)
    * Fixed maintenance cost (allocated per flight)
    * Crew cost (cockpit + cabin)
    * Airport cost (landing fee + handling), both ends
    * Lease cost (allocated per flight)
    * Insurance cost (allocated per flight)
    * Fixed overhead cost (allocated per flight)

All money figures are USD. Time fields (FH, BH, Min TAT, Max Utilization) are
stored as "HH:MM" strings in the source data and are converted to decimal
hours internally.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "business_case_data.json"


def hhmm_to_hours(value: str) -> float:
    """Convert an 'HH:MM' or 'HH:MM:SS' string into decimal hours."""
    parts = str(value).split(":")
    hours = int(parts[0])
    minutes = int(parts[1]) if len(parts) > 1 else 0
    return hours + minutes / 60.0


@dataclass
class SectorCostBreakdown:
    sector: str
    aircraft_type: str
    configuration: str
    cabin: str
    seats: int

    distance_km: float
    flight_hours: float
    block_hours: float

    fuel_cost: float
    environmental_cost: float
    overflight_cost: float
    variable_mx_cost: float
    fixed_mx_cost_per_flight: float
    crew_cost: float
    airport_cost_departure: float
    airport_cost_arrival: float
    lease_cost_per_flight: float
    insurance_cost_per_flight: float
    overhead_cost_per_flight: float

    @property
    def total_cost_per_flight(self) -> float:
        return (
            self.fuel_cost
            + self.environmental_cost
            + self.overflight_cost
            + self.variable_mx_cost
            + self.fixed_mx_cost_per_flight
            + self.crew_cost
            + self.airport_cost_departure
            + self.airport_cost_arrival
            + self.lease_cost_per_flight
            + self.insurance_cost_per_flight
            + self.overhead_cost_per_flight
        )

    @property
    def cost_per_seat(self) -> float:
        if self.seats == 0:
            return 0.0
        return self.total_cost_per_flight / self.seats

    @property
    def cost_per_ask(self) -> float:
        """Cost per Available Seat Kilometer."""
        if self.seats == 0 or self.distance_km == 0:
            return 0.0
        return self.total_cost_per_flight / (self.seats * self.distance_km)

    def as_dict(self) -> dict:
        d = self.__dict__.copy()
        d["total_cost_per_flight"] = self.total_cost_per_flight
        d["cost_per_seat"] = self.cost_per_seat
        d["cost_per_ask"] = self.cost_per_ask
        return d


class BusinessCaseData:
    """Loads and indexes the Air Mercury reference data extracted from the
    Business Case workbook, so it can be queried efficiently."""

    def __init__(self, data_path: Optional[Path] = None):
        path = data_path or DATA_PATH
        with open(path, "r", encoding="utf-8") as f:
            self.raw = json.load(f)

        self.general_cost: dict = self.raw["general_cost"]
        self.aircraft: dict = self.raw["aircraft"]
        self.routes: list = self.raw["routes"]
        self.airports: list = self.raw["airports"]
        self.airport_cost: list = self.raw["airport_cost"]
        self.aircraft_config: list = self.raw["aircraft_config"]
        self.services: list = self.raw["services"]
        self.demand: list = self.raw["demand"]
        self.competitors: list = self.raw["competitors"]

        self._index()

    def _index(self):
        # airport lookup by code
        self.airport_by_code = {a["airport_code"]: a for a in self.airports}

        # airport cost lookup: (airport, aircraft_type) -> entry
        self.airport_cost_lookup = {
            (e["airport"], e["aircraft_type"]): e for e in self.airport_cost
        }

        # routes lookup: (sector, aircraft_type) -> entry
        self.route_lookup = {
            (r["sector"], r["aircraft_type"]): r for r in self.routes
        }

        # aircraft configs grouped: aircraft_type -> configuration -> list of {cabin, seats, cabin_crew}
        self.config_lookup: dict = {}
        for c in self.aircraft_config:
            ac = c["aircraft_type"]
            cfg = c["configuration"]
            self.config_lookup.setdefault(ac, {}).setdefault(cfg, []).append(c)

        # unique sectors (city pairs as directional codes, e.g. BCNCDG, CDGBCN)
        self.sectors = sorted({r["sector"] for r in self.routes})

        # unique aircraft types
        self.aircraft_types = sorted(self.aircraft.keys())

    def get_route(self, sector: str, aircraft_type: str) -> dict:
        key = (sector, aircraft_type)
        if key not in self.route_lookup:
            raise KeyError(f"No route data for sector={sector!r}, aircraft={aircraft_type!r}")
        return self.route_lookup[key]

    def get_airport_cost(self, airport_code: str, aircraft_type: str) -> dict:
        key = (airport_code, aircraft_type)
        if key not in self.airport_cost_lookup:
            raise KeyError(f"No airport cost data for airport={airport_code!r}, aircraft={aircraft_type!r}")
        return self.airport_cost_lookup[key]

    def get_configs(self, aircraft_type: str) -> dict:
        if aircraft_type not in self.config_lookup:
            raise KeyError(f"No configuration data for aircraft={aircraft_type!r}")
        return self.config_lookup[aircraft_type]

    def sector_to_airport_codes(self, sector: str) -> tuple[str, str]:
        """Split a 6-letter sector code (e.g. 'BCNCDG') into its two 3-letter
        airport codes ('BCN', 'CDG')."""
        if len(sector) != 6:
            raise ValueError(f"Unexpected sector code format: {sector!r}")
        return sector[:3], sector[3:]


class CostCalculator:
    """Computes the full unit-cost breakdown for a single flight (one sector,
    one direction) given an aircraft type and a cabin configuration, following
    the same formulas used in the reference UNITCOST workbook."""

    def __init__(self, data: BusinessCaseData):
        self.data = data

    def total_seats_for_config(self, aircraft_type: str, configuration: str) -> int:
        entries = self.data.get_configs(aircraft_type)[configuration]
        return sum(e["seats"] for e in entries)

    def cabin_seats_for_config(self, aircraft_type: str, configuration: str) -> dict:
        entries = self.data.get_configs(aircraft_type)[configuration]
        return {e["cabin"]: e["seats"] for e in entries}

    def total_cabin_crew_for_config(self, aircraft_type: str, configuration: str) -> int:
        entries = self.data.get_configs(aircraft_type)[configuration]
        return sum(e["cabin_crew"] for e in entries)

    def compute(
        self,
        sector: str,
        aircraft_type: str,
        configuration: str,
        cabin: Optional[str] = None,
    ) -> SectorCostBreakdown:
        """Compute the cost breakdown for one flight on `sector` (e.g. 'BCNZRH')
        operated by `aircraft_type` (e.g. '32N') in `configuration`
        (e.g. 'Y', 'J / Y', 'F / J / Y', 'F / Y').

        If `cabin` is given, seats/cost-per-seat are reported for that single
        cabin; otherwise the whole-aircraft (all cabins combined) figures are
        used.
        """
        d = self.data
        route = d.get_route(sector, aircraft_type)
        ac = d.aircraft[aircraft_type]
        gc = d.general_cost

        dep_code, arr_code = d.sector_to_airport_codes(sector)

        flight_hours = hhmm_to_hours(route["flight_hours"])
        block_hours = hhmm_to_hours(route["block_hours"])
        distance_km = route["distance_km"]
        ansp_factor = route["ansp_cost_factor"]

        # --- Fuel & environmental ---
        fuel_burn_kg = ac["Fuel Consumption"] * block_hours
        fuel_cost = fuel_burn_kg * gc["Cost of Fuel"]
        environmental_cost = fuel_burn_kg * gc["Environmental Charge"]

        # --- Overflight (ANSP) cost ---
        # Overflight cost = MTOW * ANSP Cost Factor * Distance / 1000
        overflight_cost = ac["MTOW"] * ansp_factor * distance_km / 1000.0

        # --- Variable maintenance ---
        variable_mx_cost = (
            ac["Mx Cost FH"] * flight_hours
            + ac["MX Cost BH"] * block_hours
            + ac["MX Cost Cycle"]
        )

        # --- Fixed maintenance, lease, insurance, overhead allocated per flight ---
        # These are monthly fixed costs; we express them "per flight" by
        # spreading them over the number of round-trip flights the aircraft
        # can fly per month at maximum utilization on this sector.
        #
        # Methodology note: this mirrors the reference UNITCOST workbook's
        # "Round trip time" (= outbound FH + Min TAT + return FH, in hours)
        # and "Max Return Trips" (= Max Utilization in BH/day / round trip
        # time) calculations. The reference workbook then rounds that
        # theoretical max DOWN to a whole number of daily round trips before
        # multiplying by 30 days (an aircraft cannot fly a fractional round
        # trip per day). We reproduce that floor() step explicitly.
        max_util_hours_per_day = hhmm_to_hours(ac["Max Utilization"])
        min_tat_hours = hhmm_to_hours(ac["Min TAT"])
        round_trip_time_hours = block_hours + min_tat_hours + block_hours
        max_return_trips_per_day_theoretical = (
            max_util_hours_per_day / round_trip_time_hours
            if round_trip_time_hours > 0
            else 0
        )
        daily_return_trips = int(max_return_trips_per_day_theoretical)  # floor
        daily_flights = daily_return_trips * 2
        flights_per_month = daily_flights * 30

        def per_flight(monthly_value: float) -> float:
            return monthly_value / flights_per_month if flights_per_month > 0 else 0.0

        fixed_mx_cost_per_flight = per_flight(ac["Fixe Mx Cost Fleet"])
        lease_cost_per_flight = per_flight(ac["Lease"])
        insurance_cost_per_flight = per_flight(ac["Insurance"])
        overhead_cost_per_flight = per_flight(gc["Fixed Overhead Cost per Aircraft"])

        # --- Crew cost ---
        # Mirrors the reference workbook: round-the-clock operation requires
        # 2 full crews per aircraft (so the aircraft can keep flying while one
        # crew rests). Cockpit complement is 2 pilots per crew (4 pilots
        # total); cabin complement is the legal-minimum cabin crew for this
        # configuration (sum of the "Cabin Crew" column), doubled for 2 crews.
        pilots_per_crew = 2
        num_crews = 2
        cabin_crew_per_crew = self.total_cabin_crew_for_config(aircraft_type, configuration)
        monthly_cockpit_cost = ac["Crew Cost Cockpit"] * pilots_per_crew * num_crews
        monthly_cabin_cost = ac["Crew Cost Cabin"] * cabin_crew_per_crew * num_crews
        crew_cost_per_month = monthly_cockpit_cost + monthly_cabin_cost
        crew_cost = per_flight(crew_cost_per_month)

        # --- Airport costs (both ends) ---
        # Per the Business Case documentation ("XLS_file_details"):
        #   Landing Fee Unit Cost = Airport Cost PER MTOW per landing
        # i.e. the landing fee must be multiplied by the aircraft's MTOW.
        #
        # Known divergence from the reference UNITCOST workbook: several of
        # its Unit Cost sheets sum the raw "Landing Unit Fee" cell directly
        # (without multiplying by MTOW), which does not match the documented
        # formula. This calculator follows the documented formula instead, so
        # totals here will differ slightly (and more accurately) from those
        # specific reference cells.
        dep_cost = d.get_airport_cost(dep_code, aircraft_type)
        arr_cost = d.get_airport_cost(arr_code, aircraft_type)
        airport_cost_departure = (
            dep_cost["landing_unit_fee"] * ac["MTOW"] + dep_cost["handling_cost"]
        )
        airport_cost_arrival = (
            arr_cost["landing_unit_fee"] * ac["MTOW"] + arr_cost["handling_cost"]
        )

        # --- Seats ---
        if cabin:
            seats = self.cabin_seats_for_config(aircraft_type, configuration).get(cabin, 0)
        else:
            seats = self.total_seats_for_config(aircraft_type, configuration)

        return SectorCostBreakdown(
            sector=sector,
            aircraft_type=aircraft_type,
            configuration=configuration,
            cabin=cabin or "ALL",
            seats=seats,
            distance_km=distance_km,
            flight_hours=flight_hours,
            block_hours=block_hours,
            fuel_cost=fuel_cost,
            environmental_cost=environmental_cost,
            overflight_cost=overflight_cost,
            variable_mx_cost=variable_mx_cost,
            fixed_mx_cost_per_flight=fixed_mx_cost_per_flight,
            crew_cost=crew_cost,
            airport_cost_departure=airport_cost_departure,
            airport_cost_arrival=airport_cost_arrival,
            lease_cost_per_flight=lease_cost_per_flight,
            insurance_cost_per_flight=insurance_cost_per_flight,
            overhead_cost_per_flight=overhead_cost_per_flight,
        )

    def compute_all_configs(self, sector: str, aircraft_type: str) -> list[SectorCostBreakdown]:
        """Compute the cost breakdown for every configuration available for
        `aircraft_type` on `sector`."""
        configs = self.data.get_configs(aircraft_type)
        return [self.compute(sector, aircraft_type, cfg) for cfg in configs]

    def compute_all_aircraft(self, sector: str) -> list[SectorCostBreakdown]:
        """Compute the (all-cabins) cost breakdown for every aircraft type
        that has route data for `sector`, using each aircraft's first
        available configuration. Useful for quickly comparing aircraft choice
        on a given sector."""
        results = []
        for ac_type in self.data.aircraft_types:
            if (sector, ac_type) not in self.data.route_lookup:
                continue
            configs = list(self.data.get_configs(ac_type).keys())
            if not configs:
                continue
            results.append(self.compute(sector, ac_type, configs[0]))
        return results
