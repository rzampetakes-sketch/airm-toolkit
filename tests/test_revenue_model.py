import pytest

from airm_toolkit.cost_model import BusinessCaseData
from airm_toolkit.revenue_model import RevenueCalculator, average_fare, PRICING_POLICIES


@pytest.fixture(scope="module")
def data():
    return BusinessCaseData()


@pytest.fixture(scope="module")
def rev_calc(data):
    return RevenueCalculator(data)


def test_average_fare_policy_1():
    assert average_fare(100, 1) == pytest.approx(100.0)


def test_average_fare_policy_2():
    assert average_fare(100, 2) == pytest.approx(80.0)


def test_average_fare_policy_3():
    assert average_fare(100, 3) == pytest.approx(70.0)


def test_average_fare_invalid_policy():
    with pytest.raises(ValueError):
        average_fare(100, 4)


def test_evaluate_returns_consistent_economics(rev_calc):
    econ = rev_calc.evaluate(
        sector="BCNZRH",
        aircraft_type="32N",
        configuration="Y",
        base_price=120,
        pricing_policy=2,
        load_factor=0.80,
    )
    assert econ.avg_fare == pytest.approx(96.0)
    assert econ.passengers == pytest.approx(econ.seats * 0.80)
    assert econ.revenue_per_flight == pytest.approx(econ.passengers * econ.avg_fare)
    assert econ.profit_per_flight == pytest.approx(
        econ.revenue_per_flight - econ.cost_per_flight
    )


def test_breakeven_load_factor_is_consistent(rev_calc):
    econ = rev_calc.evaluate(
        sector="BCNZRH",
        aircraft_type="32N",
        configuration="Y",
        base_price=120,
        pricing_policy=2,
        load_factor=econ_lf := 0.80,
    )
    blf = econ.breakeven_load_factor
    # Revenue at the breakeven load factor should equal cost
    revenue_at_blf = econ.seats * blf * econ.avg_fare
    assert revenue_at_blf == pytest.approx(econ.cost_per_flight, rel=1e-9)


def test_compare_aircraft_sorted_by_profit_desc(rev_calc):
    results = rev_calc.compare_aircraft(sector="BCNZRH", base_price=120, pricing_policy=2, load_factor=0.8)
    profits = [r.profit_per_flight for r in results]
    assert profits == sorted(profits, reverse=True)
    assert len(results) > 0


def test_required_load_factor_for_target_profit_zero_matches_breakeven(rev_calc):
    econ = rev_calc.evaluate(
        sector="BCNZRH",
        aircraft_type="32N",
        configuration="Y",
        base_price=120,
        pricing_policy=2,
        load_factor=0.8,
    )
    required_lf = rev_calc.required_load_factor_for_target_profit(
        sector="BCNZRH",
        aircraft_type="32N",
        configuration="Y",
        base_price=120,
        pricing_policy=2,
        target_profit=0.0,
    )
    assert required_lf == pytest.approx(econ.breakeven_load_factor, rel=1e-9)
