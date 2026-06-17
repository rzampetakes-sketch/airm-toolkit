"""
AIRM 615 Decision Platform
===========================
Streamlit web app that surfaces the best route, aircraft, and pricing
decisions from the Air Mercury business-case data.

Run with:
    streamlit run app.py
"""

from __future__ import annotations

import math
from typing import Optional

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

from airm_toolkit import (
    BusinessCaseData,
    CostCalculator,
    RevenueCalculator,
    DemandAnalyzer,
    PRICING_POLICIES,
)

st.set_page_config(
    page_title="AIRM 615 Decision Platform",
    page_icon="✈",
    layout="wide",
)

POLICY_LABELS = {
    1: "Policy 1 – Full price only (avg 100%)",
    2: "Policy 2 – Discount pricing (avg 80%)",
    3: "Policy 3 – Deep discount (avg 70%)",
}

POLICY_SHORT = {1: "Full price", 2: "Discount", 3: "Deep discount"}

RISK_LABELS = {
    "Low": "🟢 Low",
    "Medium": "🟡 Medium",
    "High": "🔴 High",
}

# ── cached data ────────────────────────────────────────────────────────────────

@st.cache_resource
def load_data() -> BusinessCaseData:
    return BusinessCaseData()


@st.cache_data
def market_df(year: int = 2025) -> pd.DataFrame:
    data = load_data()
    demand = DemandAnalyzer(data)
    rows = demand.market_overview(year=year)
    df = pd.DataFrame(rows)
    df["demand_share"] = df["total_demand"] / df["competitor_seats"].replace(0, float("nan"))
    df.rename(columns={
        "od": "Route",
        "total_demand": "Annual Demand",
        "num_competitors": "Competitors",
        "competitor_seats": "Competitor Seats",
        "demand_per_competitor_seat": "Demand/Seat",
    }, inplace=True)
    return df


@st.cache_data
def best_aircraft_df(sector: str, base_price: float, policy: int, lf: float) -> pd.DataFrame:
    data = load_data()
    rev = RevenueCalculator(data)
    results = rev.compare_aircraft(
        sector=sector,
        base_price=base_price,
        pricing_policy=policy,
        load_factor=lf,
    )
    rows = [r.as_dict() for r in results]
    df = pd.DataFrame(rows)
    keep = ["aircraft_type", "configuration", "seats", "cost_per_flight",
            "revenue_per_flight", "profit_per_flight", "breakeven_load_factor"]
    df = df[keep].copy()
    df.rename(columns={
        "aircraft_type": "Aircraft",
        "configuration": "Config",
        "seats": "Seats",
        "cost_per_flight": "Cost/flight",
        "revenue_per_flight": "Revenue/flight",
        "profit_per_flight": "Profit/flight",
        "breakeven_load_factor": "Breakeven LF",
    }, inplace=True)
    df["Profitable"] = df["Profit/flight"] > 0
    return df


@st.cache_data
def cost_breakdown_dict(sector: str, aircraft: str, config: str) -> dict:
    data = load_data()
    calc = CostCalculator(data)
    b = calc.compute(sector, aircraft, config)
    return b.as_dict()


@st.cache_data
def opportunity_df(base_price: float, policy: int, lf: float) -> pd.DataFrame:
    data = load_data()
    rev = RevenueCalculator(data)
    demand = DemandAnalyzer(data)

    rows = []
    for sector in data.sectors:
        try:
            results = rev.compare_aircraft(
                sector=sector,
                base_price=base_price,
                pricing_policy=policy,
                load_factor=lf,
            )
        except Exception:
            continue
        if not results:
            continue
        best = results[0]
        try:
            mkt = demand.competitor_capacity_summary(sector)
            comp_seats = mkt["total_annual_seats"]
            num_comp = mkt["num_competitors"]
        except Exception:
            comp_seats = 0
            num_comp = 0

        try:
            od_demand = demand.total_demand(sector).total_2025
        except Exception:
            od_demand = 0

        headroom = (od_demand / comp_seats) if comp_seats > 0 else float("nan")
        score = headroom * best.profit_per_flight if best.profit_per_flight > 0 else 0.0

        rows.append({
            "Route": sector,
            "Best Aircraft": best.aircraft_type,
            "Config": best.configuration,
            "Seats": best.seats,
            "Profit/flight": best.profit_per_flight,
            "Breakeven LF": best.breakeven_load_factor,
            "Annual Demand": od_demand,
            "Competitor Seats": comp_seats,
            "Competitors": num_comp,
            "Demand/Comp.Seat": headroom,
            "Opportunity Score": score,
        })

    df = pd.DataFrame(rows)
    df.sort_values("Opportunity Score", ascending=False, inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


def _risk_label(breakeven_lf: float, assumed_lf: float, num_competitors: int) -> str:
    """Simple 3-band risk rating based on breakeven margin and competition."""
    margin = assumed_lf - breakeven_lf
    if margin >= 0.20 and num_competitors <= 2:
        return "Low"
    elif margin >= 0.10 or (margin >= 0.05 and num_competitors <= 3):
        return "Medium"
    else:
        return "High"


def _find_optimal_price(
    rev: RevenueCalculator,
    sector: str,
    aircraft_type: str,
    configuration: str,
    policy: int,
    lf: float,
    price_min: float = 50.0,
    price_max: float = 600.0,
    steps: int = 111,
) -> tuple[float, float]:
    """Sweep base prices and return (optimal_price, max_profit)."""
    best_price = price_min
    best_profit = float("-inf")
    step = (price_max - price_min) / steps
    p = price_min
    while p <= price_max:
        try:
            econ = rev.evaluate(sector, aircraft_type, configuration, p, policy, lf)
            if econ.profit_per_flight > best_profit:
                best_profit = econ.profit_per_flight
                best_price = p
        except Exception:
            pass
        p += step
    return best_price, best_profit


@st.cache_data
def decision_engine_df(
    fleet: tuple[str, ...],
    policy: int,
    lf: float,
    flights_per_day: int,
) -> pd.DataFrame:
    """
    For each route, find the best aircraft (from fleet) + optimal price.
    Returns a ranked action plan.
    """
    data = load_data()
    rev = RevenueCalculator(data)
    demand = DemandAnalyzer(data)
    fleet_set = set(fleet)

    rows = []
    for sector in data.sectors:
        try:
            results = rev.compare_aircraft(
                sector=sector,
                base_price=150,   # placeholder; we'll optimise price per aircraft below
                pricing_policy=policy,
                load_factor=lf,
            )
        except Exception:
            continue

        # filter to fleet
        fleet_results = [r for r in results if r.aircraft_type in fleet_set]
        if not fleet_results:
            continue

        # for each fleet aircraft, find optimal price
        best_profit = float("-inf")
        best_rec = None
        for r in fleet_results:
            opt_price, opt_profit = _find_optimal_price(
                rev, sector, r.aircraft_type, r.configuration, policy, lf
            )
            if opt_profit > best_profit:
                best_profit = opt_profit
                best_rec = {
                    "aircraft_type": r.aircraft_type,
                    "configuration": r.configuration,
                    "seats": r.seats,
                    "optimal_price": opt_price,
                    "profit_per_flight": opt_profit,
                    "breakeven_lf": r.breakeven_load_factor,
                }

        if best_rec is None:
            continue

        try:
            mkt = demand.competitor_capacity_summary(sector)
            comp_seats = mkt["total_annual_seats"]
            num_comp = mkt["num_competitors"]
        except Exception:
            comp_seats = 0
            num_comp = 0

        try:
            od_demand = demand.total_demand(sector).total_2025
        except Exception:
            od_demand = 0

        headroom = od_demand / comp_seats if comp_seats > 0 else float("nan")
        annual_profit = best_rec["profit_per_flight"] * flights_per_day * 365 * 2  # round-trip

        risk = _risk_label(best_rec["breakeven_lf"], lf, num_comp)

        rows.append({
            "Route": sector,
            "Recommended Aircraft": best_rec["aircraft_type"],
            "Config": best_rec["configuration"],
            "Seats": best_rec["seats"],
            "Optimal Price (USD)": round(best_rec["optimal_price"]),
            "Profit/flight": best_rec["profit_per_flight"],
            "Est. Annual Profit": annual_profit,
            "Breakeven LF": best_rec["breakeven_lf"],
            "Margin vs LF": lf - best_rec["breakeven_lf"],
            "Annual Demand": od_demand,
            "Competitors": num_comp,
            "Demand Headroom": headroom,
            "Risk": risk,
        })

    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df.sort_values("Est. Annual Profit", ascending=False, inplace=True)
    df.reset_index(drop=True, inplace=True)
    df["Priority"] = range(1, len(df) + 1)
    return df


@st.cache_data
def price_sweep_df(
    sector: str,
    aircraft_type: str,
    configuration: str,
    policy: int,
    lf: float,
    price_min: float = 30.0,
    price_max: float = 700.0,
    steps: int = 200,
) -> pd.DataFrame:
    data = load_data()
    rev = RevenueCalculator(data)
    step = (price_max - price_min) / steps
    rows = []
    p = price_min
    while p <= price_max:
        try:
            econ = rev.evaluate(sector, aircraft_type, configuration, p, policy, lf)
            rows.append({
                "Base Price": p,
                "Avg Fare": econ.avg_fare,
                "Revenue/flight": econ.revenue_per_flight,
                "Cost/flight": econ.cost_per_flight,
                "Profit/flight": econ.profit_per_flight,
            })
        except Exception:
            pass
        p += step
    return pd.DataFrame(rows)


# ── sidebar ────────────────────────────────────────────────────────────────────

with st.sidebar:
    st.title("✈ AIRM 615")
    st.caption("Air Mercury Decision Platform")
    st.divider()

    st.subheader("Global assumptions")
    base_price = st.number_input("Base ticket price (USD)", min_value=10.0, max_value=2000.0,
                                  value=120.0, step=5.0)
    policy = st.selectbox("Pricing policy", options=[1, 2, 3],
                           format_func=lambda x: POLICY_LABELS[x], index=1)
    lf = st.slider("Assumed load factor", min_value=0.40, max_value=1.00,
                   value=0.80, step=0.01, format="%.0f%%",
                   help="Used for revenue & profit projections")

    st.divider()
    page = st.radio("Page", [
        "🎯 Decision Engine",
        "💡 Pricing Optimizer",
        "🏆 Best Opportunities",
        "📊 Market Overview",
        "🔍 Route Deep-Dive",
        "✈ Aircraft Comparison",
        "💰 Cost Breakdown",
    ])


data = load_data()

# ── page: decision engine ──────────────────────────────────────────────────────

if page == "🎯 Decision Engine":
    st.title("Decision Engine")
    st.caption(
        "Configure your fleet and constraints. The engine finds the optimal aircraft, "
        "price, and route for every opportunity — and outputs a prioritised action plan."
    )

    with st.expander("⚙️ Fleet & schedule constraints", expanded=True):
        col_f, col_s = st.columns([3, 1])
        with col_f:
            fleet_options = data.aircraft_types
            fleet = st.multiselect(
                "Aircraft types in your fleet",
                options=fleet_options,
                default=fleet_options,
                help="Only aircraft types selected here will be considered.",
            )
        with col_s:
            flights_per_day = st.number_input(
                "Flights/day per route",
                min_value=1, max_value=8, value=2,
                help="Used to estimate annual profit (× 2 for round-trip × 365).",
            )

    if not fleet:
        st.warning("Select at least one aircraft type to generate recommendations.")
        st.stop()

    with st.spinner("Computing optimal decisions across all routes…"):
        plan = decision_engine_df(tuple(sorted(fleet)), policy, lf, flights_per_day)

    if plan.empty:
        st.error("No profitable routes found for the selected fleet. Try adjusting your constraints.")
        st.stop()

    profitable = plan[plan["Profit/flight"] > 0]
    unprofitable = plan[plan["Profit/flight"] <= 0]

    # ── KPI row ──
    total_annual = profitable["Est. Annual Profit"].sum()
    avg_breakeven = profitable["Breakeven LF"].mean()
    avg_margin = profitable["Margin vs LF"].mean()

    k1, k2, k3, k4, k5 = st.columns(5)
    k1.metric("Profitable routes", len(profitable), f"of {len(plan)} total")
    k2.metric("Est. total annual profit", f"${total_annual:,.0f}")
    k3.metric("Avg breakeven LF", f"{avg_breakeven:.1%}")
    k4.metric("Avg safety margin", f"{avg_margin:+.1%}",
              delta_color="normal" if avg_margin > 0 else "inverse")
    k5.metric("Low-risk routes", len(profitable[profitable["Risk"] == "Low"]))

    st.divider()

    # ── Top recommendation cards ──
    st.subheader("Top recommendations")
    top5 = profitable.head(5)
    cols = st.columns(min(5, len(top5)))
    for i, (_, row) in enumerate(top5.iterrows()):
        with cols[i]:
            risk_icon = {"Low": "🟢", "Medium": "🟡", "High": "🔴"}.get(row["Risk"], "")
            st.markdown(
                f"""
<div style="border:1px solid #ddd;border-radius:8px;padding:12px;text-align:center">
<div style="font-size:1.4em;font-weight:bold">{row['Route']}</div>
<div style="font-size:0.85em;color:#555">#{int(row['Priority'])} priority</div>
<hr style="margin:6px 0">
<div><b>Aircraft:</b> {row['Recommended Aircraft']}</div>
<div><b>Price:</b> ${row['Optimal Price (USD)']}</div>
<div><b>Profit/flight:</b> ${row['Profit/flight']:,.0f}</div>
<div><b>Breakeven LF:</b> {row['Breakeven LF']:.1%}</div>
<div style="margin-top:6px">{risk_icon} <b>{row['Risk']} risk</b></div>
</div>
""",
                unsafe_allow_html=True,
            )

    st.divider()

    # ── Full action plan ──
    st.subheader("Complete action plan")

    def _fmt_risk(r):
        icons = {"Low": "🟢 Low", "Medium": "🟡 Medium", "High": "🔴 High"}
        return icons.get(r, r)

    display = profitable.copy()
    display["Risk"] = display["Risk"].apply(_fmt_risk)

    st.dataframe(
        display.style.format({
            "Profit/flight": "${:,.0f}",
            "Est. Annual Profit": "${:,.0f}",
            "Optimal Price (USD)": "${:,.0f}",
            "Breakeven LF": "{:.1%}",
            "Margin vs LF": "{:+.1%}",
            "Annual Demand": "{:,.0f}",
            "Demand Headroom": "{:.2f}x",
        }).background_gradient(subset=["Est. Annual Profit"], cmap="Greens")
         .background_gradient(subset=["Margin vs LF"], cmap="RdYlGn"),
        width="stretch",
        height=420,
    )

    # ── Visual: annual profit by route ──
    col_left, col_right = st.columns(2)
    with col_left:
        fig_plan = px.bar(
            profitable.sort_values("Est. Annual Profit"),
            x="Est. Annual Profit", y="Route", orientation="h",
            color="Risk",
            color_discrete_map={"Low": "#2ecc71", "Medium": "#f39c12", "High": "#e74c3c"},
            title="Estimated annual profit by route",
            labels={"Est. Annual Profit": "Annual Profit (USD)"},
        )
        st.plotly_chart(fig_plan, width="stretch")

    with col_right:
        fig_risk = px.scatter(
            profitable,
            x="Breakeven LF", y="Profit/flight",
            color="Risk",
            size="Annual Demand",
            text="Route",
            color_discrete_map={"Low": "#2ecc71", "Medium": "#f39c12", "High": "#e74c3c"},
            title="Risk vs. profitability",
            labels={"Breakeven LF": "Breakeven Load Factor",
                    "Profit/flight": "Profit per Flight (USD)"},
        )
        fig_risk.add_vline(x=lf, line_dash="dash", line_color="blue",
                           annotation_text=f"Your LF {lf:.0%}")
        fig_risk.update_xaxes(tickformat=".0%")
        fig_risk.update_traces(textposition="top center")
        st.plotly_chart(fig_risk, width="stretch")

    # ── Routes to avoid ──
    if not unprofitable.empty:
        with st.expander(f"⛔ Routes to avoid or re-price ({len(unprofitable)} routes)", expanded=False):
            st.caption("These routes are unprofitable at the optimal price under your current constraints.")
            st.dataframe(
                unprofitable[["Route", "Recommended Aircraft", "Optimal Price (USD)",
                               "Profit/flight", "Breakeven LF", "Competitors"]].style.format({
                    "Profit/flight": "${:,.0f}",
                    "Optimal Price (USD)": "${:,.0f}",
                    "Breakeven LF": "{:.1%}",
                }),
                width="stretch",
            )

    # ── Decision rationale ──
    st.divider()
    st.subheader("Decision rationale")
    with st.expander("How decisions are made", expanded=False):
        st.markdown("""
**Step 1 – Fleet filter**
Only aircraft types in your selected fleet are considered per route.

**Step 2 – Price optimisation**
For each (route, aircraft) pair, base prices from $50–$600 are swept in 111 steps.
The price that maximises `profit per flight` under the selected pricing policy is chosen.

**Step 3 – Aircraft selection**
The aircraft that delivers the highest optimised profit on each route is recommended.

**Step 4 – Risk rating**
| Rating | Condition |
|--------|-----------|
| 🟢 Low | Safety margin ≥ 20 pp above breakeven **and** ≤ 2 competitors |
| 🟡 Medium | Margin ≥ 10 pp, or margin ≥ 5 pp with ≤ 3 competitors |
| 🔴 High | Breakeven LF is close to or above your assumed load factor |

**Step 5 – Annual profit estimate**
`profit/flight × flights_per_day × 2 (round-trip) × 365`
""")


# ── page: pricing optimizer ────────────────────────────────────────────────────

elif page == "💡 Pricing Optimizer":
    st.title("Pricing Optimizer")
    st.caption(
        "Find the base price that maximises profit for any route/aircraft combination. "
        "Use this to validate or refine the prices suggested by the Decision Engine."
    )

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        sector = st.selectbox("Route", data.sectors)
    with col2:
        ac_options = sorted({r["aircraft_type"] for r in data.routes if r["sector"] == sector})
        aircraft = st.selectbox("Aircraft", ac_options)
    with col3:
        configs = list(data.get_configs(aircraft).keys())
        config = st.selectbox("Configuration", configs)
    with col4:
        opt_policy = st.selectbox("Pricing policy", [1, 2, 3],
                                   format_func=lambda x: POLICY_LABELS[x], index=1,
                                   key="opt_policy")

    price_min = st.slider("Price range minimum (USD)", 20, 200, 50, step=10)
    price_max = st.slider("Price range maximum (USD)", 200, 1500, 600, step=25)

    sweep = price_sweep_df(sector, aircraft, config, opt_policy, lf, float(price_min), float(price_max))

    if sweep.empty:
        st.error("No results — check that this route/aircraft combination exists.")
        st.stop()

    best_idx = sweep["Profit/flight"].idxmax()
    best_price = sweep.loc[best_idx, "Base Price"]
    best_profit = sweep.loc[best_idx, "Profit/flight"]
    best_fare = sweep.loc[best_idx, "Avg Fare"]

    # Breakeven price
    be_rows = sweep[sweep["Profit/flight"] >= 0]
    breakeven_price = be_rows["Base Price"].min() if not be_rows.empty else None

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Optimal base price", f"${best_price:,.0f}")
    m2.metric("Avg fare at optimal price", f"${best_fare:,.0f}")
    m3.metric("Max profit/flight", f"${best_profit:,.0f}")
    if breakeven_price is not None:
        m4.metric("Min profitable price", f"${breakeven_price:,.0f}")
    else:
        m4.metric("Min profitable price", "Not found")

    st.success(
        f"**Recommendation:** Set base price to **${best_price:,.0f}** on {sector} "
        f"with {aircraft} ({config}). Expected profit **${best_profit:,.0f}/flight** "
        f"at {lf:.0%} load factor under {POLICY_SHORT[opt_policy]} pricing."
    )

    # Profit curve
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=sweep["Base Price"], y=sweep["Profit/flight"],
        mode="lines", name="Profit/flight",
        line=dict(color="#2ecc71", width=2.5),
    ))
    fig.add_trace(go.Scatter(
        x=sweep["Base Price"], y=sweep["Revenue/flight"],
        mode="lines", name="Revenue/flight",
        line=dict(color="#3498db", width=1.5, dash="dot"),
    ))
    fig.add_trace(go.Scatter(
        x=sweep["Base Price"], y=sweep["Cost/flight"],
        mode="lines", name="Cost/flight (fixed)",
        line=dict(color="#e74c3c", width=1.5, dash="dash"),
    ))
    fig.add_vline(x=best_price, line_color="#2ecc71", line_dash="dash",
                  annotation_text=f"Optimal ${best_price:,.0f}")
    fig.add_hline(y=0, line_color="gray", line_dash="dot", annotation_text="Breakeven")
    fig.update_layout(
        title=f"Profit curve: {sector} | {aircraft} | {config}",
        xaxis_title="Base Price (USD)",
        yaxis_title="USD per flight",
        height=420,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
    )
    st.plotly_chart(fig, width="stretch")

    # Price vs avg fare
    fig2 = px.line(sweep, x="Base Price", y="Avg Fare",
                   title="Average fare by pricing policy",
                   labels={"Base Price": "Base Price (USD)", "Avg Fare": "Avg Fare (USD)"})
    fig2.add_vline(x=best_price, line_color="#2ecc71", line_dash="dash")
    st.plotly_chart(fig2, width="stretch")

    # Policy comparison at optimal price
    st.subheader("Policy comparison at optimal price")
    rev_calc = RevenueCalculator(data)
    policy_rows = []
    for p in [1, 2, 3]:
        opt_p, opt_prof = _find_optimal_price(rev_calc, sector, aircraft, config, p, lf,
                                               float(price_min), float(price_max))
        try:
            econ = rev_calc.evaluate(sector, aircraft, config, opt_p, p, lf)
            policy_rows.append({
                "Policy": POLICY_LABELS[p],
                "Optimal Price": opt_p,
                "Avg Fare": econ.avg_fare,
                "Revenue/flight": econ.revenue_per_flight,
                "Cost/flight": econ.cost_per_flight,
                "Profit/flight": econ.profit_per_flight,
                "Breakeven LF": econ.breakeven_load_factor,
            })
        except Exception:
            pass

    pol_df = pd.DataFrame(policy_rows)
    best_policy_row = pol_df.loc[pol_df["Profit/flight"].idxmax()]
    st.info(
        f"Best policy: **{best_policy_row['Policy']}** at price "
        f"**${best_policy_row['Optimal Price']:,.0f}** → profit "
        f"**${best_policy_row['Profit/flight']:,.0f}/flight**"
    )
    st.dataframe(
        pol_df.style.format({
            "Optimal Price": "${:,.0f}",
            "Avg Fare": "${:,.0f}",
            "Revenue/flight": "${:,.0f}",
            "Cost/flight": "${:,.0f}",
            "Profit/flight": "${:,.0f}",
            "Breakeven LF": "{:.1%}",
        }),
        width="stretch",
    )


# ── page: best opportunities ───────────────────────────────────────────────────

elif page == "🏆 Best Opportunities":
    st.title("Best Route Opportunities")
    st.caption(
        "Opportunity score = (demand / competitor_seats) × profit_per_flight. "
        "Higher means more demand headroom and better unit economics."
    )

    df = opportunity_df(base_price, policy, lf)
    top = df[df["Profit/flight"] > 0].head(10)

    col1, col2, col3 = st.columns(3)
    col1.metric("Best route", top.iloc[0]["Route"] if len(top) else "—")
    col2.metric("Best aircraft on top route", top.iloc[0]["Best Aircraft"] if len(top) else "—")
    col3.metric("Profit/flight (best)",
                f"${top.iloc[0]['Profit/flight']:,.0f}" if len(top) else "—")

    if len(top):
        st.success(
            f"**Top action:** Fly {top.iloc[0]['Route']} with {top.iloc[0]['Best Aircraft']} "
            f"({top.iloc[0]['Config']}) at base price ${base_price:,.0f} "
            f"(Policy {policy}). Expected profit **${top.iloc[0]['Profit/flight']:,.0f}/flight**, "
            f"breakeven at **{top.iloc[0]['Breakeven LF']:.1%}** load factor."
        )

    st.subheader("Top 10 opportunities")
    st.dataframe(
        top.style.format({
            "Profit/flight": "${:,.0f}",
            "Breakeven LF": "{:.1%}",
            "Annual Demand": "{:,.0f}",
            "Competitor Seats": "{:,.0f}",
            "Demand/Comp.Seat": "{:.2f}",
            "Opportunity Score": "{:.1f}",
        }).background_gradient(subset=["Opportunity Score", "Profit/flight"], cmap="Greens"),
        width="stretch",
        height=380,
    )

    st.subheader("Opportunity landscape")
    fig = px.scatter(
        df[df["Profit/flight"] > 0],
        x="Demand/Comp.Seat",
        y="Profit/flight",
        size="Annual Demand",
        color="Opportunity Score",
        text="Route",
        hover_data=["Best Aircraft", "Seats", "Breakeven LF", "Competitors"],
        color_continuous_scale="Viridis",
        labels={"Demand/Comp.Seat": "Demand headroom (demand / comp. seats)",
                "Profit/flight": "Best profit per flight (USD)"},
        title="Market attractiveness vs. unit profitability",
    )
    fig.update_traces(textposition="top center")
    fig.update_layout(height=500)
    st.plotly_chart(fig, width="stretch")

    st.subheader("All routes ranked")
    st.dataframe(
        df.style.format({
            "Profit/flight": "${:,.0f}",
            "Breakeven LF": "{:.1%}",
            "Annual Demand": "{:,.0f}",
            "Competitor Seats": "{:,.0f}",
            "Demand/Comp.Seat": "{:.2f}",
            "Opportunity Score": "{:.1f}",
        }),
        width="stretch",
    )


# ── page: market overview ──────────────────────────────────────────────────────

elif page == "📊 Market Overview":
    st.title("Market Overview")

    df = market_df()

    # Decision callout
    best_route = df.loc[df["Demand/Seat"].idxmax(), "Route"]
    best_demand = df.loc[df["Annual Demand"].idxmax(), "Route"]
    st.info(
        f"**Best undersupplied market:** {best_route} (highest demand per competitor seat). "
        f"**Highest absolute demand:** {best_demand}."
    )

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("City pairs", len(df))
    col2.metric("Total annual demand", f"{df['Annual Demand'].sum():,.0f}")
    col3.metric("Avg competitors/route", f"{df['Competitors'].mean():.1f}")
    col4.metric("Highest demand route", best_demand)

    fig = px.bar(
        df.sort_values("Annual Demand", ascending=True),
        x="Annual Demand", y="Route", orientation="h",
        color="Competitors",
        color_continuous_scale="Blues",
        title="Annual passenger demand by route (2025)",
        labels={"Annual Demand": "Annual Passengers"},
    )
    fig.update_layout(height=420)
    st.plotly_chart(fig, width="stretch")

    fig2 = px.scatter(
        df,
        x="Competitor Seats",
        y="Annual Demand",
        size="Competitors",
        color="Demand/Seat",
        text="Route",
        color_continuous_scale="RdYlGn",
        title="Demand vs. competitor capacity (green = undersupplied)",
        labels={"Demand/Seat": "Demand per competitor seat"},
    )
    fig2.add_shape(type="line", x0=0, y0=0,
                   x1=df["Competitor Seats"].max(), y1=df["Competitor Seats"].max(),
                   line=dict(dash="dash", color="gray"))
    fig2.update_traces(textposition="top center")
    fig2.update_layout(height=480)
    st.plotly_chart(fig2, width="stretch")

    st.dataframe(
        df.style.format({
            "Annual Demand": "{:,.0f}",
            "Competitor Seats": "{:,.0f}",
            "Demand/Seat": "{:.2f}",
        }),
        width="stretch",
    )


# ── page: route deep-dive ──────────────────────────────────────────────────────

elif page == "🔍 Route Deep-Dive":
    st.title("Route Deep-Dive")

    sector = st.selectbox("Select route", options=data.sectors)

    demand_a = DemandAnalyzer(data)
    try:
        od = demand_a.total_demand(sector)
        mkt = demand_a.competitor_capacity_summary(sector)
        annual_demand = od.total_2025
        by_cabin = od.by_cabin
    except Exception:
        annual_demand = 0
        by_cabin = {}
        mkt = {"num_competitors": 0, "competitors": [], "total_annual_seats": 0}

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("Annual demand (2025)", f"{annual_demand:,.0f}")
    col2.metric("Competitors", mkt["num_competitors"])
    col3.metric("Competitor seats/yr", f"{mkt['total_annual_seats']:,.0f}")
    headroom = annual_demand / mkt["total_annual_seats"] if mkt["total_annual_seats"] else 0
    col4.metric("Demand per competitor seat", f"{headroom:.2f}x",
                delta="above parity" if headroom > 1 else "below parity",
                delta_color="normal" if headroom > 1 else "inverse")

    df_ac = best_aircraft_df(sector, base_price, policy, lf)
    best_ac = df_ac[df_ac["Profitable"]].iloc[0] if df_ac["Profitable"].any() else None

    if best_ac is not None:
        st.success(
            f"**Recommendation for {sector}:** Deploy **{best_ac['Aircraft']}** "
            f"({best_ac['Config']}, {best_ac['Seats']} seats) at base price **${base_price:,.0f}**. "
            f"Expected profit **${best_ac['Profit/flight']:,.0f}/flight**, "
            f"breakeven at **{best_ac['Breakeven LF']:.1%}** LF."
        )
    else:
        st.warning(f"No profitable aircraft found on {sector} at the current price and load factor.")

    if by_cabin:
        fig_cabin = px.pie(
            names=list(by_cabin.keys()),
            values=list(by_cabin.values()),
            title=f"Demand by cabin class – {sector}",
        )
        st.plotly_chart(fig_cabin, width="stretch")

    if mkt["competitors"]:
        st.subheader("Competitors on route")
        st.write(", ".join(mkt["competitors"]))

    st.divider()
    st.subheader("Aircraft comparison on this route")

    col_a, col_b = st.columns(2)
    with col_a:
        fig_profit = px.bar(
            df_ac.sort_values("Profit/flight"),
            x="Profit/flight", y="Aircraft", orientation="h",
            color="Profitable",
            color_discrete_map={True: "#2ecc71", False: "#e74c3c"},
            title="Profit per flight by aircraft type",
        )
        st.plotly_chart(fig_profit, width="stretch")

    with col_b:
        fig_be = px.bar(
            df_ac.sort_values("Breakeven LF"),
            x="Breakeven LF", y="Aircraft", orientation="h",
            color="Breakeven LF",
            color_continuous_scale="RdYlGn_r",
            title="Breakeven load factor by aircraft type",
            range_x=[0, 1],
        )
        fig_be.add_vline(x=lf, line_dash="dash", line_color="blue",
                         annotation_text=f"Assumed LF {lf:.0%}")
        st.plotly_chart(fig_be, width="stretch")

    st.dataframe(
        df_ac.style.format({
            "Cost/flight": "${:,.0f}",
            "Revenue/flight": "${:,.0f}",
            "Profit/flight": "${:,.0f}",
            "Breakeven LF": "{:.1%}",
        }).apply(
            lambda col: ["background-color: #d5f5e3" if v else "background-color: #fadbd8"
                         for v in df_ac["Profitable"]],
            axis=0, subset=["Profit/flight"]
        ),
        width="stretch",
    )


# ── page: aircraft comparison ──────────────────────────────────────────────────

elif page == "✈ Aircraft Comparison":
    st.title("Aircraft Comparison")

    sector = st.selectbox("Route", options=data.sectors)
    df = best_aircraft_df(sector, base_price, policy, lf)

    best_row = df[df["Profitable"]].iloc[0] if df["Profitable"].any() else df.iloc[0]
    worst_be = df.loc[df["Breakeven LF"].idxmin()]

    st.success(
        f"**Best profit:** {best_row['Aircraft']} — ${best_row['Profit/flight']:,.0f}/flight, "
        f"breakeven {best_row['Breakeven LF']:.1%} LF."
    )
    if worst_be["Aircraft"] != best_row["Aircraft"]:
        st.info(
            f"**Lowest risk (easiest breakeven):** {worst_be['Aircraft']} — "
            f"breakeven at only {worst_be['Breakeven LF']:.1%} LF."
        )

    fig = make_subplots(rows=1, cols=2,
                        subplot_titles=("Revenue vs. Cost per flight", "Breakeven Load Factor"))
    colors = ["#2ecc71" if p else "#e74c3c" for p in df["Profitable"]]

    fig.add_trace(go.Bar(name="Revenue", x=df["Aircraft"], y=df["Revenue/flight"],
                          marker_color="#3498db", showlegend=True), row=1, col=1)
    fig.add_trace(go.Bar(name="Cost", x=df["Aircraft"], y=df["Cost/flight"],
                          marker_color="#e67e22", showlegend=True), row=1, col=1)
    fig.add_trace(go.Bar(name="Breakeven LF", x=df["Aircraft"], y=df["Breakeven LF"],
                          marker_color=colors, showlegend=False), row=1, col=2)
    fig.add_hline(y=lf, line_dash="dash", line_color="blue",
                  annotation_text=f"Assumed LF {lf:.0%}", row=1, col=2)
    fig.update_layout(barmode="group", height=440,
                      yaxis2=dict(tickformat=".0%", range=[0, 1.05]))
    st.plotly_chart(fig, width="stretch")

    st.dataframe(
        df.style.format({
            "Cost/flight": "${:,.0f}",
            "Revenue/flight": "${:,.0f}",
            "Profit/flight": "${:,.0f}",
            "Breakeven LF": "{:.1%}",
        }),
        width="stretch",
    )

    st.divider()
    st.subheader("Sensitivity: profit vs. load factor")
    ac_choice = st.selectbox("Aircraft to analyse", df["Aircraft"].tolist())
    config_choice = df.loc[df["Aircraft"] == ac_choice, "Config"].iloc[0]

    rev_calc = RevenueCalculator(data)
    lf_range = [x / 100 for x in range(40, 101)]
    profits = []
    for lf_val in lf_range:
        econ = rev_calc.evaluate(
            sector=sector, aircraft_type=ac_choice, configuration=config_choice,
            base_price=base_price, pricing_policy=policy, load_factor=lf_val,
        )
        profits.append(econ.profit_per_flight)

    sens_df = pd.DataFrame({"Load Factor": lf_range, "Profit/flight": profits})
    be_lf_val = next((x for x, p in zip(lf_range, profits) if p >= 0), None)
    fig_sens = px.line(sens_df, x="Load Factor", y="Profit/flight",
                       title=f"Profit sensitivity – {ac_choice} on {sector}",
                       labels={"Load Factor": "Load Factor", "Profit/flight": "Profit (USD)"})
    fig_sens.add_hline(y=0, line_color="red", line_dash="dash", annotation_text="Breakeven")
    fig_sens.add_vline(x=lf, line_color="blue", line_dash="dot",
                       annotation_text=f"Assumed LF {lf:.0%}")
    if be_lf_val is not None:
        fig_sens.add_vline(x=be_lf_val, line_color="red", line_dash="dash",
                           annotation_text=f"Breakeven {be_lf_val:.0%}")
    fig_sens.update_xaxes(tickformat=".0%")
    st.plotly_chart(fig_sens, width="stretch")

    if be_lf_val is not None:
        margin = lf - be_lf_val
        if margin > 0:
            st.success(f"Safety margin: your assumed LF is {margin:.1%} above breakeven.")
        else:
            st.error(f"Warning: your assumed LF is {abs(margin):.1%} BELOW breakeven.")


# ── page: cost breakdown ───────────────────────────────────────────────────────

elif page == "💰 Cost Breakdown":
    st.title("Cost Breakdown")

    col_s, col_a, col_c = st.columns(3)
    with col_s:
        sector = st.selectbox("Route", data.sectors)
    with col_a:
        aircraft_options = sorted({
            r["aircraft_type"] for r in data.routes if r["sector"] == sector
        })
        aircraft = st.selectbox("Aircraft", aircraft_options)
    with col_c:
        configs = list(data.get_configs(aircraft).keys())
        config = st.selectbox("Configuration", configs)

    b = cost_breakdown_dict(sector, aircraft, config)

    col1, col2, col3 = st.columns(3)
    col1.metric("Total cost/flight", f"${b['total_cost_per_flight']:,.2f}")
    col2.metric("Cost per seat", f"${b['cost_per_seat']:,.2f}")
    col3.metric("Cost per ASK", f"${b['cost_per_ask']:.4f}")

    cost_items = {
        "Fuel": b["fuel_cost"],
        "Environmental": b["environmental_cost"],
        "Overflight (ANSP)": b["overflight_cost"],
        "Variable Mx": b["variable_mx_cost"],
        "Fixed Mx": b["fixed_mx_cost_per_flight"],
        "Crew": b["crew_cost"],
        "Airport (dep)": b["airport_cost_departure"],
        "Airport (arr)": b["airport_cost_arrival"],
        "Lease": b["lease_cost_per_flight"],
        "Insurance": b["insurance_cost_per_flight"],
        "Overhead": b["overhead_cost_per_flight"],
    }

    cost_df = pd.DataFrame(
        {"Component": list(cost_items.keys()), "Cost (USD)": list(cost_items.values())}
    ).sort_values("Cost (USD)", ascending=False)
    cost_df["% of Total"] = cost_df["Cost (USD)"] / b["total_cost_per_flight"]

    # Decision callout based on cost structure
    top_cost = cost_df.iloc[0]
    st.info(
        f"**Biggest cost driver:** {top_cost['Component']} at "
        f"${top_cost['Cost (USD)']:,.0f}/flight ({top_cost['% of Total']:.1%} of total). "
        f"Focus cost reduction efforts here first."
    )

    col_pie, col_bar = st.columns(2)
    with col_pie:
        fig_pie = px.pie(cost_df, names="Component", values="Cost (USD)",
                         title="Cost composition")
        st.plotly_chart(fig_pie, width="stretch")
    with col_bar:
        fig_bar = px.bar(cost_df.sort_values("Cost (USD)"),
                          x="Cost (USD)", y="Component", orientation="h",
                          title="Cost components ranked",
                          color="Cost (USD)", color_continuous_scale="Reds")
        st.plotly_chart(fig_bar, width="stretch")

    st.subheader("Detailed breakdown")
    st.dataframe(
        cost_df.style.format({"Cost (USD)": "${:,.2f}", "% of Total": "{:.1%}"}),
        width="stretch",
    )

    st.divider()
    st.subheader("Flight parameters")
    param_cols = st.columns(3)
    param_cols[0].metric("Seats", b["seats"])
    param_cols[1].metric("Distance (km)", f"{b['distance_km']:,.0f}")
    param_cols[2].metric("Block hours", f"{b['block_hours']:.2f} h")
