# AIRM 615 Toolkit

Python toolkit for the IATA **Air Mercury** business simulation (AIRM 615
course). It reproduces the cost, revenue, and demand calculations from the
official Business Case workbook in code, so route and fleet decisions can be
computed, compared, and re-run quickly instead of editing spreadsheet
formulas by hand.

## What it does

- **Cost model** (`airm_toolkit.cost_model`): for any (route, aircraft type,
  cabin configuration) combination, computes the full per-flight unit-cost
  breakdown — fuel, environmental charge, ANSP overflight cost, variable and
  fixed maintenance, crew, airport fees (both ends), lease, insurance, and
  overhead.
- **Revenue model** (`airm_toolkit.revenue_model`): applies the simulation's
  three pricing policies (Base Price only / -50% / -33%) and a load factor
  assumption to estimate revenue, profit per flight, and the breakeven load
  factor for any route/aircraft/config/price combination.
- **Demand model** (`airm_toolkit.demand_model`): aggregates historical
  demand per city pair and cross-references competitor capacity (seats,
  number of competitors) to highlight attractive vs. saturated markets.
- **CLI** (`cli.py`): run any of the above from the terminal without writing
  Python.

All underlying reference data (aircraft specs, routes, airports, airport
costs, demand history, competitor schedules, ancillary services) is bundled
in `data/business_case_data.json`, extracted directly from the official
`Business_Case_AIRM_615_-_2026.xlsx` workbook.

## Project layout

```
airm-toolkit/
├── airm_toolkit/
│   ├── __init__.py        # public API
│   ├── cost_model.py       # BusinessCaseData, CostCalculator
│   ├── revenue_model.py    # RevenueCalculator, pricing policies
│   └── demand_model.py     # DemandAnalyzer
├── data/
│   └── business_case_data.json   # extracted reference data
├── tests/
│   ├── test_cost_model.py
│   ├── test_revenue_model.py
│   └── test_demand_model.py
├── cli.py                  # command-line interface
├── requirements.txt
├── setup.py
└── README.md
```

## Installation

```bash
git clone <this-repo>
cd airm-toolkit
pip install -r requirements.txt   # only needed for running tests (pytest)
```

No other dependencies are required to use the library itself — it's pure
Python standard library.

## Quick start

```python
from airm_toolkit import BusinessCaseData, CostCalculator, RevenueCalculator, DemandAnalyzer

data = BusinessCaseData()

# 1. Cost breakdown for one flight
cost_calc = CostCalculator(data)
breakdown = cost_calc.compute(sector="BCNZRH", aircraft_type="32N", configuration="Y")
print(breakdown.total_cost_per_flight, breakdown.cost_per_seat)

# 2. Profit / breakeven economics given a price and load factor assumption
rev_calc = RevenueCalculator(data)
econ = rev_calc.evaluate(
    sector="BCNZRH", aircraft_type="32N", configuration="Y",
    base_price=120, pricing_policy=2, load_factor=0.82,
)
print(econ.profit_per_flight, econ.breakeven_load_factor)

# 3. Compare every aircraft type on a route (defaults to single-class Y when available)
for r in rev_calc.compare_aircraft(sector="BCNZRH", base_price=120, pricing_policy=2, load_factor=0.80):
    print(r.aircraft_type, r.profit_per_flight)

# 4. Demand + competitor overview for every city pair
demand = DemandAnalyzer(data)
for row in demand.market_overview():
    print(row)
```

## CLI usage

```bash
# List every available aircraft type and sector
python cli.py list

# Full cost breakdown for one flight
python cli.py cost BCNZRH 32N Y

# Compare every aircraft type on a sector
python cli.py compare-aircraft BCNZRH --base-price 120 --policy 2 --lf 0.80

# Profit/breakeven economics for one route/aircraft/config
python cli.py economics BCNZRH 32N Y --base-price 120 --policy 2 --lf 0.80

# Demand + competitor market overview for every city pair
python cli.py market
```

## Running the tests

```bash
pip install -r requirements.txt
pytest tests/ -v
```

The test suite includes regression checks derived directly from the cached
formula results in the reference `UNITCOST_.xlsx` workbook, so the cost model
can be trusted to match the official methodology component-by-component
(fuel, environmental charge, overflight cost, variable maintenance, fixed
cost allocation, crew cost).

## Methodology notes / known divergences from the reference workbook

While building this toolkit, the underlying `UNITCOST_.xlsx` reference
workbook was reverse-engineered cell-by-cell to make sure every formula here
matches it. Two points are worth flagging explicitly:

1. **Airport landing fee.** The Business Case documentation states the
   landing fee is *"Airport Cost per MTOW per landing"*, i.e. it should be
   multiplied by the aircraft's MTOW. Several sheets in the reference
   workbook instead sum the raw landing-fee rate without that
   multiplication. This toolkit follows the documented formula (with the
   MTOW multiplier), so its totals will be slightly higher — and more
   consistent with the stated methodology — than those specific reference
   cells.
2. **Monthly-to-per-flight cost allocation.** Fixed monthly costs (lease,
   insurance, fixed maintenance, crew, overhead) are spread over the number
   of flights an aircraft can operate per month at maximum utilization on a
   given sector. This is computed as
   `floor(Max Utilization / (Block Hours × 2 + Min TAT × 2)) × 2 × 30`.
   One single sheet in the reference workbook (BCN–ZRH, A320 Neo) applied
   this rounding inconsistently by hand; this toolkit applies the
   floor-based rule consistently across every route and aircraft type,
   matching the other reference sheets that were checked.

Crew cost assumes 2 full crews per aircraft (so it can keep flying
round-the-clock while one crew rests): 2 pilots × 2 crews for the cockpit,
and the configuration's legal-minimum cabin crew count × 2 crews for the
cabin — this matches the reference workbook exactly.

## Data source

`data/business_case_data.json` was extracted from
`Business_Case_AIRM_615_-_2026.xlsx` (IATA Training, copyright IATA 2026),
covering the General Cost, Demand, Competitors, Routes, Airports, Aircraft,
Aircraft Config, Airport Cost, and Services sheets, for the five-airport
European network used in the simulation: Barcelona (BCN), Copenhagen (CPH),
London Heathrow (LHR), Paris CDG (CDG), and Zurich (ZRH).
