#!/usr/bin/env python3
"""
cli.py
======

Command-line interface for quick AIRM 615 route/fleet analysis without
writing any Python.

Examples
--------
List every sector and aircraft type available::

    python cli.py list

Show the full cost breakdown for a sector + aircraft + configuration::

    python cli.py cost BCNZRH 32N Y

Compare every aircraft type on a sector (first available config each)::

    python cli.py compare-aircraft BCNZRH --base-price 120 --policy 2 --lf 0.80

Show profit/breakeven economics for a specific route/aircraft/config::

    python cli.py economics BCNZRH 32N Y --base-price 120 --policy 2 --lf 0.80

Show demand + competitor market overview for every city pair::

    python cli.py market
"""

from __future__ import annotations

import argparse
import sys

from airm_toolkit import BusinessCaseData, CostCalculator, RevenueCalculator, DemandAnalyzer


def cmd_list(args, data: BusinessCaseData):
    print("Aircraft types:")
    for ac in data.aircraft_types:
        name = data.aircraft[ac]["Name"]
        print(f"  {ac:6s} {name}")
    print()
    print("Sectors (directional):")
    for s in data.sectors:
        print(f"  {s}")


def cmd_cost(args, data: BusinessCaseData):
    calc = CostCalculator(data)
    b = calc.compute(args.sector, args.aircraft, args.config)
    print(f"Cost breakdown: {args.sector} | {args.aircraft} | {args.config}")
    print(f"  Seats:                          {b.seats}")
    print(f"  Distance (km):                  {b.distance_km}")
    print(f"  Flight hours:                   {b.flight_hours:.3f}")
    print(f"  Block hours:                    {b.block_hours:.3f}")
    print(f"  Fuel cost:                      {b.fuel_cost:,.2f}")
    print(f"  Environmental charge:           {b.environmental_cost:,.2f}")
    print(f"  Overflight (ANSP) cost:         {b.overflight_cost:,.2f}")
    print(f"  Variable maintenance cost:      {b.variable_mx_cost:,.2f}")
    print(f"  Fixed mx cost (per flight):     {b.fixed_mx_cost_per_flight:,.2f}")
    print(f"  Crew cost (per flight):         {b.crew_cost:,.2f}")
    print(f"  Airport cost (departure):       {b.airport_cost_departure:,.2f}")
    print(f"  Airport cost (arrival):         {b.airport_cost_arrival:,.2f}")
    print(f"  Lease cost (per flight):        {b.lease_cost_per_flight:,.2f}")
    print(f"  Insurance cost (per flight):    {b.insurance_cost_per_flight:,.2f}")
    print(f"  Overhead cost (per flight):     {b.overhead_cost_per_flight:,.2f}")
    print(f"  ------------------------------------------------")
    print(f"  TOTAL COST PER FLIGHT:          {b.total_cost_per_flight:,.2f}")
    print(f"  Cost per seat:                  {b.cost_per_seat:,.2f}")
    print(f"  Cost per ASK:                   {b.cost_per_ask:.4f}")


def cmd_compare_aircraft(args, data: BusinessCaseData):
    rev_calc = RevenueCalculator(data)
    results = rev_calc.compare_aircraft(
        sector=args.sector,
        base_price=args.base_price,
        pricing_policy=args.policy,
        load_factor=args.lf,
    )
    print(f"Aircraft comparison for {args.sector} "
          f"(base price={args.base_price}, policy={args.policy}, LF={args.lf})")
    print(f"{'Aircraft':8s} {'Seats':>6s} {'Cost/flt':>12s} {'Rev/flt':>12s} {'Profit/flt':>12s} {'Breakeven LF':>14s}")
    for r in results:
        print(
            f"{r.aircraft_type:8s} {r.seats:6d} {r.cost_per_flight:12,.0f} "
            f"{r.revenue_per_flight:12,.0f} {r.profit_per_flight:12,.0f} "
            f"{r.breakeven_load_factor:14.2%}"
        )


def cmd_economics(args, data: BusinessCaseData):
    rev_calc = RevenueCalculator(data)
    econ = rev_calc.evaluate(
        sector=args.sector,
        aircraft_type=args.aircraft,
        configuration=args.config,
        base_price=args.base_price,
        pricing_policy=args.policy,
        load_factor=args.lf,
    )
    print(f"Economics: {args.sector} | {args.aircraft} | {args.config}")
    print(f"  Seats:                  {econ.seats}")
    print(f"  Base price:             {econ.base_price:,.2f}")
    print(f"  Pricing policy:         {econ.pricing_policy}")
    print(f"  Average fare:           {econ.avg_fare:,.2f}")
    print(f"  Load factor:            {econ.load_factor:.2%}")
    print(f"  Passengers:             {econ.passengers:,.1f}")
    print(f"  Revenue per flight:     {econ.revenue_per_flight:,.2f}")
    print(f"  Cost per flight:        {econ.cost_per_flight:,.2f}")
    print(f"  Profit per flight:      {econ.profit_per_flight:,.2f}")
    print(f"  Breakeven load factor:  {econ.breakeven_load_factor:.2%}")


def cmd_market(args, data: BusinessCaseData):
    demand = DemandAnalyzer(data)
    overview = demand.market_overview()
    print(f"{'City pair':10s} {'Demand 2025':>14s} {'#Competitors':>13s} {'Competitor seats':>17s}")
    for row in overview:
        print(
            f"{row['od']:10s} {row['total_demand']:14,.0f} "
            f"{row['num_competitors']:13d} {row['competitor_seats']:17,.0f}"
        )


def main():
    parser = argparse.ArgumentParser(description="AIRM 615 Air Mercury analysis CLI")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="List available aircraft types and sectors")

    p_cost = sub.add_parser("cost", help="Full cost breakdown for one flight")
    p_cost.add_argument("sector", help="e.g. BCNZRH")
    p_cost.add_argument("aircraft", help="e.g. 32N")
    p_cost.add_argument("config", help="e.g. Y")

    p_cmp = sub.add_parser("compare-aircraft", help="Compare every aircraft type on a sector")
    p_cmp.add_argument("sector")
    p_cmp.add_argument("--base-price", type=float, required=True)
    p_cmp.add_argument("--policy", type=int, default=2, choices=[1, 2, 3])
    p_cmp.add_argument("--lf", type=float, default=0.80, help="Load factor, 0-1")

    p_econ = sub.add_parser("economics", help="Profit/breakeven economics for one flight")
    p_econ.add_argument("sector")
    p_econ.add_argument("aircraft")
    p_econ.add_argument("config")
    p_econ.add_argument("--base-price", type=float, required=True)
    p_econ.add_argument("--policy", type=int, default=2, choices=[1, 2, 3])
    p_econ.add_argument("--lf", type=float, default=0.80, help="Load factor, 0-1")

    sub.add_parser("market", help="Demand + competitor overview for every city pair")

    args = parser.parse_args()
    data = BusinessCaseData()

    dispatch = {
        "list": cmd_list,
        "cost": cmd_cost,
        "compare-aircraft": cmd_compare_aircraft,
        "economics": cmd_economics,
        "market": cmd_market,
    }
    dispatch[args.command](args, data)


if __name__ == "__main__":
    sys.exit(main())
