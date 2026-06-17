"""
revenue_model.py
=================

Revenue-side calculations for the AIRM 615 Air Mercury simulation: pricing
policy logic, expected average fare, and route-level revenue/profit estimates
that combine with `cost_model.CostCalculator`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .cost_model import BusinessCaseData, CostCalculator, SectorCostBreakdown

# Pricing policy options, per the Air Mercury Business Case document:
#   Option 1: single fare = 100% of Base Price -> average fare = 100% of Base Price
#   Option 2: fares from 50% to 100% of Base Price -> average fare ~ 80% of Base Price
#   Option 3: fares from 33% to 100% of Base Price -> average fare ~ 70% of Base Price
PRICING_POLICIES = {
    1: {"min_fare_pct": 1.00, "avg_fare_pct": 1.00},
    2: {"min_fare_pct": 0.50, "avg_fare_pct": 0.80},
    3: {"min_fare_pct": 0.33, "avg_fare_pct": 0.70},
}


def average_fare(base_price: float, policy: int) -> float:
    """Return the expected average fare for a given Base Price and pricing
    policy option (1, 2 or 3)."""
    if policy not in PRICING_POLICIES:
        raise ValueError(f"Unknown pricing policy: {policy!r}. Must be 1, 2 or 3.")
    return base_price * PRICING_POLICIES[policy]["avg_fare_pct"]


@dataclass
class RouteEconomics:
    sector: str
    aircraft_type: str
    configuration: str
    cabin: str

    seats: int
    base_price: float
    pricing_policy: int
    load_factor: float

    cost: SectorCostBreakdown

    @property
    def avg_fare(self) -> float:
        return average_fare(self.base_price, self.pricing_policy)

    @property
    def passengers(self) -> float:
        return self.seats * self.load_factor

    @property
    def revenue_per_flight(self) -> float:
        return self.passengers * self.avg_fare

    @property
    def cost_per_flight(self) -> float:
        return self.cost.total_cost_per_flight

    @property
    def profit_per_flight(self) -> float:
        return self.revenue_per_flight - self.cost_per_flight

    @property
    def breakeven_load_factor(self) -> float:
        """Load factor at which revenue exactly covers cost, given the
        current base price and pricing policy."""
        if self.seats == 0 or self.avg_fare == 0:
            return float("inf")
        return self.cost_per_flight / (self.seats * self.avg_fare)

    def as_dict(self) -> dict:
        return {
            "sector": self.sector,
            "aircraft_type": self.aircraft_type,
            "configuration": self.configuration,
            "cabin": self.cabin,
            "seats": self.seats,
            "base_price": self.base_price,
            "pricing_policy": self.pricing_policy,
            "avg_fare": self.avg_fare,
            "load_factor": self.load_factor,
            "passengers": self.passengers,
            "revenue_per_flight": self.revenue_per_flight,
            "cost_per_flight": self.cost_per_flight,
            "profit_per_flight": self.profit_per_flight,
            "breakeven_load_factor": self.breakeven_load_factor,
        }


class RevenueCalculator:
    """Combines cost calculations with pricing/load-factor assumptions to
    produce route-level profitability estimates."""

    def __init__(self, data: BusinessCaseData):
        self.data = data
        self.cost_calc = CostCalculator(data)

    def evaluate(
        self,
        sector: str,
        aircraft_type: str,
        configuration: str,
        base_price: float,
        pricing_policy: int = 2,
        load_factor: float = 0.80,
    ) -> RouteEconomics:
        cost = self.cost_calc.compute(sector, aircraft_type, configuration)
        return RouteEconomics(
            sector=sector,
            aircraft_type=aircraft_type,
            configuration=configuration,
            cabin="ALL",
            seats=cost.seats,
            base_price=base_price,
            pricing_policy=pricing_policy,
            load_factor=load_factor,
            cost=cost,
        )

    def compare_aircraft(
        self,
        sector: str,
        base_price: float,
        pricing_policy: int = 2,
        load_factor: float = 0.80,
        preferred_configuration: str = "Y",
    ) -> list[RouteEconomics]:
        """For a given sector, evaluate every aircraft type that can operate
        it. Uses `preferred_configuration` (default: single-class 'Y', the
        typical LCC/ULCC setup) when that aircraft offers it, otherwise falls
        back to its first available configuration. Returns results sorted by
        profit per flight, descending."""
        results = []
        for ac_type in self.data.aircraft_types:
            if (sector, ac_type) not in self.data.route_lookup:
                continue
            configs = list(self.data.get_configs(ac_type).keys())
            if not configs:
                continue
            config = preferred_configuration if preferred_configuration in configs else configs[0]
            results.append(
                self.evaluate(sector, ac_type, config, base_price, pricing_policy, load_factor)
            )
        results.sort(key=lambda r: r.profit_per_flight, reverse=True)
        return results

    def required_load_factor_for_target_profit(
        self,
        sector: str,
        aircraft_type: str,
        configuration: str,
        base_price: float,
        pricing_policy: int,
        target_profit: float = 0.0,
    ) -> float:
        """Solve for the load factor needed to hit a target profit per
        flight (default: breakeven, i.e. target_profit = 0)."""
        cost = self.cost_calc.compute(sector, aircraft_type, configuration)
        fare = average_fare(base_price, pricing_policy)
        if cost.seats == 0 or fare == 0:
            return float("inf")
        return (cost.total_cost_per_flight + target_profit) / (cost.seats * fare)
