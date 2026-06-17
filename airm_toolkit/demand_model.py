"""
demand_model.py
================

Demand and competitor-analysis helpers: aggregate historical O&D demand,
inspect competitor capacity/fares per route, and compute simple market-share
style comparisons across the five-airport Air Mercury network
(BCN, CPH, LHR/LON, CDG/PAR, ZRH).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .cost_model import BusinessCaseData

CITY_CODE_BY_AIRPORT = {
    "BCN": "BCN",
    "CPH": "CPH",
    "LHR": "LON",
    "CDG": "PAR",
    "ZRH": "ZRH",
}


@dataclass
class ODDemandSummary:
    od: str
    total_2025: float
    by_cabin: dict


class DemandAnalyzer:
    def __init__(self, data: BusinessCaseData):
        self.data = data

    def list_city_pairs(self) -> list[str]:
        """Unique O&D city-pair codes present in the demand data (each O&D
        sums both directions, e.g. 'BCNZRH' covers BCN->ZRH and ZRH->BCN)."""
        return sorted({d["od"] for d in self.data.demand})

    def total_demand(self, od: str, year: int = 2025) -> ODDemandSummary:
        """Sum demand across all four quarters of `year` for the given O&D
        pair, broken down by cabin and combined."""
        by_cabin: dict = {}
        for entry in self.data.demand:
            if entry["od"] != od:
                continue
            cabin = entry["cabin"]
            total = sum(
                entry.get(f"{year}_Q{q}", 0) or 0 for q in range(1, 5)
            )
            by_cabin[cabin] = by_cabin.get(cabin, 0) + total
        return ODDemandSummary(od=od, total_2025=sum(by_cabin.values()), by_cabin=by_cabin)

    def rank_city_pairs_by_demand(self, year: int = 2025) -> list[ODDemandSummary]:
        summaries = [self.total_demand(od, year) for od in self.list_city_pairs()]
        summaries.sort(key=lambda s: s.total_2025, reverse=True)
        return summaries

    def _od_to_competitor_route(self, od: str) -> str:
        """Translate a Demand-sheet O&D code (which uses CITY codes, e.g.
        'LON', 'PAR') into the equivalent Competitors-sheet route code
        (which uses AIRPORT codes, e.g. 'LHR', 'CDG'). Both sheets use BCN,
        CPH and ZRH directly since those airport codes equal their city
        codes."""
        if len(od) != 6:
            return od
        first, second = od[:3], od[3:]
        city_to_airport = {info["city_code"]: info["airport_code"] for info in self.data.airports}
        first = city_to_airport.get(first, first)
        second = city_to_airport.get(second, second)
        return first + second

    def competitors_on_route(self, route: str) -> list[dict]:
        """Return all competitor entries for a given route code. Accepts
        either Demand-sheet style city codes (e.g. 'BCNLON') or
        Competitors-sheet style airport codes (e.g. 'BCNLHR'); route codes
        may also appear in either directional ordering, so both directions
        are checked."""
        route = self._od_to_competitor_route(route)
        reverse_route = route[3:] + route[:3] if len(route) == 6 else route
        return [
            c
            for c in self.data.competitors
            if c.get("Route") in (route, reverse_route)
        ]

    def competitor_capacity_summary(self, route: str) -> dict:
        """Summarize total annual competitor seat capacity and number of
        distinct competitors for a route."""
        entries = self.competitors_on_route(route)
        total_seats = 0
        competitors = set()
        for e in entries:
            competitors.add(e.get("Competitor"))
            for q in range(1, 5):
                total_seats += e.get(f"Seats_Q{q}", 0) or 0
        return {
            "route": route,
            "num_competitors": len(competitors),
            "competitors": sorted(competitors),
            "total_annual_seats": total_seats,
        }

    def market_overview(self, year: int = 2025) -> list[dict]:
        """Combine demand ranking with competitor capacity for every city
        pair, useful for quickly spotting attractive vs. saturated markets."""
        overview = []
        for summary in self.rank_city_pairs_by_demand(year):
            comp = self.competitor_capacity_summary(summary.od)
            overview.append(
                {
                    "od": summary.od,
                    "total_demand": summary.total_2025,
                    "num_competitors": comp["num_competitors"],
                    "competitor_seats": comp["total_annual_seats"],
                    "demand_per_competitor_seat": (
                        summary.total_2025 / comp["total_annual_seats"]
                        if comp["total_annual_seats"]
                        else None
                    ),
                }
            )
        return overview
