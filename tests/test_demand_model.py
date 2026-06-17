import pytest

from airm_toolkit.cost_model import BusinessCaseData
from airm_toolkit.demand_model import DemandAnalyzer


@pytest.fixture(scope="module")
def data():
    return BusinessCaseData()


@pytest.fixture(scope="module")
def demand(data):
    return DemandAnalyzer(data)


def test_list_city_pairs_returns_ten_unique_pairs(demand):
    # 5 airports => C(5,2) = 10 undirected city pairs
    pairs = demand.list_city_pairs()
    assert len(pairs) == 10


def test_total_demand_sums_all_cabins(demand):
    summary = demand.total_demand("BCNZRH", year=2025)
    assert summary.total_2025 == pytest.approx(sum(summary.by_cabin.values()))
    assert summary.total_2025 > 0


def test_rank_city_pairs_by_demand_sorted_desc(demand):
    ranking = demand.rank_city_pairs_by_demand(year=2025)
    totals = [s.total_2025 for s in ranking]
    assert totals == sorted(totals, reverse=True)


def test_competitors_on_route_checks_both_directions(demand):
    fwd = demand.competitors_on_route("BCNCDG")
    rev = demand.competitors_on_route("CDGBCN")
    assert len(fwd) > 0
    assert fwd == rev  # symmetric: both directions return the same entries


def test_competitor_capacity_summary_structure(demand):
    summary = demand.competitor_capacity_summary("BCNZRH")
    assert "num_competitors" in summary
    assert "total_annual_seats" in summary
    assert summary["num_competitors"] == len(summary["competitors"])


def test_market_overview_includes_every_city_pair(demand):
    overview = demand.market_overview()
    assert len(overview) == len(demand.list_city_pairs())
    for row in overview:
        assert "total_demand" in row
        assert "competitor_seats" in row
