"""
Tests for airm_toolkit.cost_model.

The expected values below were independently derived by reading the formulas
and cached values directly out of the reference UNITCOST_.xlsx workbook
(sheets 'BCNZRH 752 Unit Cost' and 'BCNZRH 32N Unit Cost'), so these tests
double as a regression check against that source of truth.
"""

import math

import pytest

from airm_toolkit.cost_model import BusinessCaseData, CostCalculator, hhmm_to_hours


@pytest.fixture(scope="module")
def data():
    return BusinessCaseData()


@pytest.fixture(scope="module")
def calc(data):
    return CostCalculator(data)


def test_hhmm_to_hours():
    assert hhmm_to_hours("01:30") == pytest.approx(1.5)
    assert hhmm_to_hours("00:35") == pytest.approx(35 / 60)
    assert hhmm_to_hours("15:00") == pytest.approx(15.0)


def test_loads_all_aircraft_types(data):
    expected = {"32N", "752", "321", "221", "290", "E70", "7M9", "320", "738"}
    assert set(data.aircraft_types) == expected


def test_loads_all_sectors(data):
    # 5 airports => 5*4 = 20 directional sectors
    assert len(data.sectors) == 20


def test_fuel_environmental_overflight_match_reference(calc):
    """These three components are computed identically in every reference
    sheet we inspected, so they make a strong regression anchor."""
    b = calc.compute(sector="BCNZRH", aircraft_type="752", configuration="Y")
    assert b.fuel_cost == pytest.approx(5869.219683170308, rel=1e-9)
    assert b.environmental_cost == pytest.approx(553.7000082507719, rel=1e-9)
    assert b.overflight_cost == pytest.approx(573.562, rel=1e-9)


def test_variable_maintenance_matches_reference(calc):
    b = calc.compute(sector="BCNZRH", aircraft_type="752", configuration="Y")
    # 851.2666666666652 (BH) + 1058.2 (FH) + 214 (cycle) = 2123.4666666666667
    assert b.variable_mx_cost == pytest.approx(2123.4666666666667, rel=1e-9)


def test_fixed_costs_per_flight_match_reference(calc):
    """Monthly fixed costs (mx fleet, crew, insurance, lease, overhead),
    divided by 180 flights/month (= floor(3.16 round trips/day) * 2 * 30),
    as derived from the reference BCNZRH 752 Unit Cost sheet."""
    b = calc.compute(sector="BCNZRH", aircraft_type="752", configuration="Y")
    assert b.fixed_mx_cost_per_flight == pytest.approx(50000 / 180, rel=1e-9)
    assert b.crew_cost == pytest.approx((18000 + 20000) / 180, rel=1e-9)
    assert b.insurance_cost_per_flight == pytest.approx(35000 / 180, rel=1e-9)
    assert b.lease_cost_per_flight == pytest.approx(175000 / 180, rel=1e-9)
    assert b.overhead_cost_per_flight == pytest.approx(250000 / 180, rel=1e-9)


def test_seats_for_y_config(calc):
    b = calc.compute(sector="BCNZRH", aircraft_type="752", configuration="Y")
    assert b.seats == 228


def test_total_cost_per_flight_is_positive_and_consistent(calc):
    b = calc.compute(sector="BCNZRH", aircraft_type="752", configuration="Y")
    component_sum = (
        b.fuel_cost
        + b.environmental_cost
        + b.overflight_cost
        + b.variable_mx_cost
        + b.fixed_mx_cost_per_flight
        + b.crew_cost
        + b.airport_cost_departure
        + b.airport_cost_arrival
        + b.lease_cost_per_flight
        + b.insurance_cost_per_flight
        + b.overhead_cost_per_flight
    )
    assert b.total_cost_per_flight == pytest.approx(component_sum, rel=1e-12)
    assert b.total_cost_per_flight > 0


def test_cost_per_seat_and_per_ask(calc):
    b = calc.compute(sector="BCNZRH", aircraft_type="752", configuration="Y")
    assert b.cost_per_seat == pytest.approx(b.total_cost_per_flight / b.seats, rel=1e-12)
    assert b.cost_per_ask == pytest.approx(
        b.total_cost_per_flight / (b.seats * b.distance_km), rel=1e-12
    )


def test_unknown_route_raises(calc):
    with pytest.raises(KeyError):
        calc.compute(sector="XYZXYZ", aircraft_type="32N", configuration="Y")


def test_unknown_configuration_raises(calc):
    with pytest.raises(KeyError):
        calc.compute(sector="BCNZRH", aircraft_type="32N", configuration="NOT_A_CONFIG")


def test_compute_all_configs_returns_every_config(calc, data):
    results = calc.compute_all_configs(sector="BCNZRH", aircraft_type="32N")
    expected_configs = set(data.get_configs("32N").keys())
    assert {r.configuration for r in results} == expected_configs


def test_compute_all_aircraft_covers_every_type_with_route_data(calc, data):
    results = calc.compute_all_aircraft(sector="BCNZRH")
    expected_types = {
        ac for ac in data.aircraft_types if ("BCNZRH", ac) in data.route_lookup
    }
    assert {r.aircraft_type for r in results} == expected_types
