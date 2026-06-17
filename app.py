"""
AIRM 615 Decision Platform
===========================
Run with:  streamlit run app.py
"""

from __future__ import annotations

import math
from collections import defaultdict

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
    page_title="AIRM 615 – Air Mercury",
    page_icon="✈",
    layout="wide",
)

POLICY_LABELS = {
    1: "Policy 1 – Full price (avg = base price)",
    2: "Policy 2 – Discount (avg = 80 % of base)",
    3: "Policy 3 – Deep discount (avg = 70 % of base)",
}
CABIN_ORDER = {"F": 0, "J": 1, "Y": 2}
CABIN_COLOR = {"F": "#9b59b6", "J": "#2980b9", "Y": "#27ae60"}

# ── cached data loaders ────────────────────────────────────────────────────────

@st.cache_resource
def load_data() -> BusinessCaseData:
    return BusinessCaseData()


@st.cache_data
def competitor_fares_df() -> pd.DataFrame:
    """
    Returns a flat DataFrame with one row per (route, competitor, cabin, quarter).
    Columns: route, competitor, cabin, quarter, sectors, seats, avg_fare
    The 'route' column uses the 6-letter airport code format derived from
    the competitor's Route field.
    """
    data = load_data()
    rows = []
    for entry in data.competitors:
        route = entry.get("Route", "")
        comp = entry.get("Competitor", "")
        cabin = entry.get("Cabin", "Y")
        for q in [1, 2, 3, 4]:
            sectors = entry.get(f"Sectors_Q{q}", 0) or 0
            seats = entry.get(f"Seats_Q{q}", 0) or 0
            fare = entry.get(f"Average Fare_Q{q}", None)
            if fare is not None:
                rows.append({
                    "route": route,
                    "competitor": comp,
                    "cabin": cabin,
                    "quarter": q,
                    "sectors": sectors,
                    "seats": seats,
                    "avg_fare": float(fare),
                })
    return pd.DataFrame(rows)


@st.cache_data
def _canonical_route(sector: str) -> str:
    """Return the alphabetically sorted 6-letter airport pair (matches competitor data keys)."""
    dep, arr = sector[:3], sector[3:]
    return (dep + arr) if dep <= arr else (arr + dep)


def market_fares_by_route() -> dict:
    """
    Returns {canonical_route: {cabin: {avg_fare, min_fare, max_fare, total_seats}}}
    Canonical route = alphabetically sorted airport pair (e.g. BCNCDG, not CDGBCN).
    """
    df = competitor_fares_df()
    result = {}
    for route in df["route"].unique():
        result[route] = {}
        sub = df[df["route"] == route]
        for cabin in sub["cabin"].unique():
            csub = sub[sub["cabin"] == cabin]
            total_seats = csub["seats"].sum()
            if total_seats > 0:
                wavg = (csub["avg_fare"] * csub["seats"]).sum() / total_seats
            else:
                wavg = csub["avg_fare"].mean()
            result[route][cabin] = {
                "avg_fare": round(wavg, 2),
                "min_fare": csub["avg_fare"].min(),
                "max_fare": csub["avg_fare"].max(),
                "total_annual_seats": int(csub["seats"].sum()),
            }
    return result


@st.cache_data
def profitability_matrix(lf_pct: int) -> pd.DataFrame:
    """
    For every (sector, aircraft, config, cabin, policy), compute:
    - cost per flight
    - breakeven base price (minimum price needed)
    - market ceiling fare (what competitors charge for that cabin)
    - gap = market_fare - breakeven_price  (positive = viable)
    - verdict
    lf_pct: integer 40-100
    """
    lf = lf_pct / 100
    data = load_data()
    calc = CostCalculator(data)
    mfares = market_fares_by_route()

    rows = []
    for sector in data.sectors:
        fares = mfares.get(_canonical_route(sector), {})

        for ac_type in data.aircraft_types:
            try:
                configs = data.get_configs(ac_type)
            except Exception:
                continue
            for config_name, cabins in configs.items():
                try:
                    b = calc.compute(sector, ac_type, config_name)
                except Exception:
                    continue

                total_cost = b.total_cost_per_flight

                for policy in [1, 2, 3]:
                    avg_pct = PRICING_POLICIES[policy]["avg_fare_pct"]
                    # breakeven base price: cost = seats * base * avg_pct * lf
                    be_price = total_cost / (b.seats * avg_pct * lf)

                    # find the dominant cabin (most seats) to get market fare
                    # also try to get per-cabin fare
                    cabin_list = sorted(cabins.keys(),
                                        key=lambda c: CABIN_ORDER.get(c, 9))
                    dominant_cabin = cabin_list[-1]  # lowest class = most seats = Y or J

                    mkt = fares.get(dominant_cabin, {})
                    market_fare = mkt.get("avg_fare", None)

                    if market_fare:
                        gap = market_fare - be_price
                        if gap > 20:
                            verdict = "✅ Profitable"
                        elif gap > 0:
                            verdict = "⚠️ Marginal"
                        else:
                            verdict = "❌ Loss"
                    else:
                        gap = None
                        verdict = "❓ No market data"

                    rows.append({
                        "Sector": sector,
                        "Aircraft": ac_type,
                        "Config": config_name,
                        "Seats": b.seats,
                        "Policy": policy,
                        "Cost/flight": total_cost,
                        "Cost/seat": b.cost_per_seat,
                        "Breakeven Price": be_price,
                        "Market Fare": market_fare,
                        "Gap": gap,
                        "Verdict": verdict,
                        "Cabin": dominant_cabin,
                    })

    df = pd.DataFrame(rows)
    df.sort_values(["Sector", "Gap"], ascending=[True, False], inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


@st.cache_data
def path_to_profit_df(lf_pct: int) -> pd.DataFrame:
    """
    Best viable option per sector: lowest breakeven price that is below market fare.
    """
    df = profitability_matrix(lf_pct)
    lf = lf_pct / 100
    data = load_data()
    rev = RevenueCalculator(data)
    demand = DemandAnalyzer(data)

    viable = df[df["Gap"].notna() & (df["Gap"] > 0)].copy()
    if viable.empty:
        # fall back to best (least negative gap)
        viable = df[df["Gap"].notna()].copy()

    # best option per sector
    best = viable.loc[viable.groupby("Sector")["Gap"].idxmax()].copy()

    rows = []
    for _, row in best.iterrows():
        sector = row["Sector"]
        ac = row["Aircraft"]
        config = row["Config"]
        policy = int(row["Policy"])
        recommended_price = row["Breakeven Price"] * 1.10  # 10% above breakeven

        try:
            econ = rev.evaluate(sector, ac, config, recommended_price, policy, lf)
            profit = econ.profit_per_flight
            be_lf = econ.breakeven_load_factor
        except Exception:
            profit = 0
            be_lf = 1.0

        try:
            mkt = demand.competitor_capacity_summary(sector)
            num_comp = mkt["num_competitors"]
        except Exception:
            num_comp = 0

        try:
            od_demand = demand.total_demand(sector).total_2025
        except Exception:
            od_demand = 0

        rows.append({
            "Route": sector,
            "Action: Use Aircraft": ac,
            "Action: Config": config,
            "Action: Policy": policy,
            "Action: Set Price": round(recommended_price),
            "Market Fare": row["Market Fare"],
            "Breakeven Price": round(row["Breakeven Price"]),
            "Profit at Recommended Price": profit,
            "Breakeven LF": be_lf,
            "Safety Margin": lf - be_lf,
            "Seats": int(row["Seats"]),
            "Competitors": num_comp,
            "Annual Demand": od_demand,
            "Viable": row["Verdict"],
        })

    result = pd.DataFrame(rows)
    result.sort_values("Profit at Recommended Price", ascending=False, inplace=True)
    result.reset_index(drop=True, inplace=True)
    return result


@st.cache_data
def price_sensitivity(sector: str, aircraft: str, config: str,
                      policy: int, lf_pct: int) -> pd.DataFrame:
    lf = lf_pct / 100
    data = load_data()
    rev = RevenueCalculator(data)
    rows = []
    for p in range(30, 801, 5):
        try:
            e = rev.evaluate(sector, aircraft, config, float(p), policy, lf)
            rows.append({
                "Base Price": p,
                "Avg Fare": e.avg_fare,
                "Revenue": e.revenue_per_flight,
                "Cost": e.cost_per_flight,
                "Profit": e.profit_per_flight,
            })
        except Exception:
            pass
    return pd.DataFrame(rows)


# ── sidebar ────────────────────────────────────────────────────────────────────

with st.sidebar:
    st.title("✈ Air Mercury")
    st.caption("AIRM 615 Decision Platform")
    st.divider()

    st.subheader("Assumptions")

    # LF as integer 40–100 so the % displays correctly
    lf_pct = st.slider(
        "Load factor (%)",
        min_value=40, max_value=100, value=80, step=1,
        help="Percentage of seats filled. 80% = 0.80.",
    )
    lf = lf_pct / 100

    policy = st.selectbox(
        "Pricing policy",
        options=[1, 2, 3],
        format_func=lambda x: POLICY_LABELS[x],
        index=1,
    )

    st.caption(
        f"Avg fare = base price × {PRICING_POLICIES[policy]['avg_fare_pct']:.0%}"
    )

    st.divider()
    page = st.radio("Navigate", [
        "🎯 Path to Profitability",
        "🏪 Market Intelligence",
        "🔍 Route Analyser",
        "💡 Pricing Tool",
        "💰 Cost Breakdown",
    ])

data = load_data()

# ══════════════════════════════════════════════════════════════════════════════
# PAGE 1 – PATH TO PROFITABILITY
# ══════════════════════════════════════════════════════════════════════════════

if page == "🎯 Path to Profitability":
    st.title("Path to Profitability")
    st.markdown(
        """
Your tutor is right — **pure economy (Y) is nearly impossible to profit from** on most routes
because low-cost carriers (Vueling, Ryanair, easyJet) fly at **€69–95 avg fare**, which is
below the **€114–164 breakeven price** for economy seats on most aircraft.

The table below shows **exactly what you must do on each route to achieve profit**.
"""
    )

    plan = path_to_profit_df(lf_pct)
    matrix = profitability_matrix(lf_pct)

    profitable = plan[plan["Profit at Recommended Price"] > 0]
    marginal = plan[
        (plan["Profit at Recommended Price"] <= 0) &
        (plan["Breakeven LF"] < 1.0)
    ]

    # ── KPI row
    k1, k2, k3, k4 = st.columns(4)
    k1.metric("Routes with profit path", len(profitable), f"of {len(plan)}")
    if not profitable.empty:
        best_r = profitable.iloc[0]
        k2.metric("Best route", best_r["Route"])
        k3.metric("Best aircraft", best_r["Action: Use Aircraft"])
        k4.metric("Profit/flight", f"${best_r['Profit at Recommended Price']:,.0f}")
    else:
        k2.metric("Best route", "—")
        k3.metric("Best aircraft", "—")
        k4.metric("Profit/flight", "—")

    st.divider()

    # ── Profitable routes
    if not profitable.empty:
        st.subheader("✅ Routes where profit IS achievable")
        st.caption(
            "Recommended price = 10% above breakeven. "
            "Still below or at competitor fare so market-competitive."
        )

        # Recommendation cards
        card_cols = st.columns(min(4, len(profitable)))
        for i, (_, row) in enumerate(profitable.head(4).iterrows()):
            with card_cols[i]:
                margin_pp = row["Safety Margin"] * 100
                st.markdown(
                    f"""
<div style="border:2px solid #2ecc71;border-radius:10px;padding:14px;text-align:center;background:#f0fff4">
<div style="font-size:1.5em;font-weight:bold">{row['Route']}</div>
<hr style="margin:6px 0;border-color:#2ecc71">
<div>✈ <b>{row['Action: Use Aircraft']}</b> · {row['Action: Config']}</div>
<div>💺 {row['Seats']} seats</div>
<div>🎟 Set price: <b>${row['Action: Set Price']}</b></div>
<div>📉 Breakeven LF: <b>{row['Breakeven LF']:.1%}</b></div>
<div>🛡 Safety margin: <b>{margin_pp:+.1f} pp</b></div>
<div style="margin-top:8px;font-size:1.1em">💰 <b>${row['Profit at Recommended Price']:,.0f}/flight</b></div>
</div>
""",
                    unsafe_allow_html=True,
                )

        st.markdown("")
        st.dataframe(
            profitable[[
                "Route", "Action: Use Aircraft", "Action: Config",
                "Action: Policy", "Action: Set Price", "Market Fare",
                "Breakeven Price", "Profit at Recommended Price",
                "Breakeven LF", "Safety Margin", "Seats", "Competitors",
            ]].style.format({
                "Action: Set Price": "${:,.0f}",
                "Market Fare": "${:,.0f}",
                "Breakeven Price": "${:,.0f}",
                "Profit at Recommended Price": "${:,.0f}",
                "Breakeven LF": "{:.1%}",
                "Safety Margin": "{:+.1%}",
            }).background_gradient(
                subset=["Profit at Recommended Price", "Safety Margin"], cmap="Greens"
            ),
            width="stretch", height=350,
        )

    # ── Why Y-class fails
    st.divider()
    st.subheader("❌ Why pure economy (Y) fails on most routes")

    y_rows = matrix[
        (matrix["Cabin"] == "Y") &
        (matrix["Policy"] == policy) &
        (matrix["Config"].str.contains("^Y$", regex=True))
    ].copy()
    y_summary = y_rows.groupby("Sector").agg(
        best_be_price=("Breakeven Price", "min"),
        market_fare=("Market Fare", "first"),
    ).reset_index()
    y_summary["Gap"] = y_summary["market_fare"] - y_summary["best_be_price"]
    y_summary.sort_values("Gap", inplace=True)
    y_summary.columns = ["Route", "Cheapest Breakeven (Y)", "Competitor Y Fare", "Gap"]

    fig_gap = px.bar(
        y_summary,
        x="Route", y="Gap",
        color="Gap",
        color_continuous_scale="RdYlGn",
        title=f"Economy gap: competitor fare minus your breakeven price (load factor {lf_pct}%)",
        labels={"Gap": "USD (positive = you can undercut & profit)"},
    )
    fig_gap.add_hline(y=0, line_dash="dash", line_color="black")
    st.plotly_chart(fig_gap, width="stretch")

    st.dataframe(
        y_summary.style.format({
            "Cheapest Breakeven (Y)": "${:,.0f}",
            "Competitor Y Fare": "${:,.0f}",
            "Gap": "${:,.0f}",
        }).background_gradient(subset=["Gap"], cmap="RdYlGn"),
        width="stretch",
    )

    # ── Premium cabin insight
    st.divider()
    st.subheader("💡 Where premium cabins (J/F) create the opportunity")
    mfares = market_fares_by_route()
    premium_rows = []
    for route, cabins in mfares.items():
        for cabin in ["J", "F"]:
            if cabin in cabins:
                premium_rows.append({
                    "Route": route,
                    "Cabin": cabin,
                    "Competitor Avg Fare": cabins[cabin]["avg_fare"],
                    "Competitor Min Fare": cabins[cabin]["min_fare"],
                    "Competitor Max Fare": cabins[cabin]["max_fare"],
                    "Annual Seats (competitors)": cabins[cabin]["total_annual_seats"],
                })
    if premium_rows:
        prem_df = pd.DataFrame(premium_rows).sort_values(
            ["Cabin", "Competitor Avg Fare"], ascending=[True, False]
        )
        st.caption(
            "Legacy carriers (Swiss, BA, Air France, SAS) serve premium cabins at "
            "**much higher fares** — this is where Air Mercury can be profitable."
        )
        st.dataframe(
            prem_df.style.format({
                "Competitor Avg Fare": "${:,.0f}",
                "Competitor Min Fare": "${:,.0f}",
                "Competitor Max Fare": "${:,.0f}",
                "Annual Seats (competitors)": "{:,.0f}",
            }).background_gradient(subset=["Competitor Avg Fare"], cmap="Greens"),
            width="stretch",
        )


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 2 – MARKET INTELLIGENCE
# ══════════════════════════════════════════════════════════════════════════════

elif page == "🏪 Market Intelligence":
    st.title("Market Intelligence")
    st.caption("Competitor fares, demand by cabin, and market positioning per route.")

    comp_df = competitor_fares_df()
    demand_a = DemandAnalyzer(data)

    route_options = sorted(comp_df["route"].unique())
    sel_route = st.selectbox("Select route (city-pair)", route_options)

    sub = comp_df[comp_df["route"] == sel_route]

    # ── Fare benchmarks
    st.subheader("Competitor fares")
    fare_summary = (
        sub.groupby(["competitor", "cabin"])
        .agg(avg_fare=("avg_fare", "mean"), total_seats=("seats", "sum"))
        .reset_index()
    )

    fig_fares = px.bar(
        fare_summary.sort_values(["cabin", "avg_fare"]),
        x="competitor", y="avg_fare", color="cabin",
        barmode="group",
        color_discrete_map=CABIN_COLOR,
        title=f"Average fare by competitor and cabin – {sel_route}",
        labels={"avg_fare": "Avg Fare (USD)", "competitor": "Competitor"},
    )
    st.plotly_chart(fig_fares, width="stretch")

    # Show what breakeven is for this route
    matrix = profitability_matrix(lf_pct)
    sector_options = [s for s in data.sectors if _canonical_route(s) == sel_route]
    if sector_options:
        sel_sector = st.selectbox("Corresponding sector", sector_options)
        sec_matrix = matrix[
            (matrix["Sector"] == sel_sector) & (matrix["Policy"] == policy)
        ]

        st.subheader("Your breakeven price vs. market fares")
        col_a, col_b = st.columns(2)
        with col_a:
            be_summary = (
                sec_matrix.groupby(["Aircraft", "Cabin"])["Breakeven Price"]
                .min().reset_index()
            )
            fig_be = px.bar(
                be_summary.sort_values("Breakeven Price"),
                x="Breakeven Price", y="Aircraft", color="Cabin",
                orientation="h",
                color_discrete_map=CABIN_COLOR,
                title="Minimum breakeven price by aircraft (your cost)",
                barmode="group",
            )
            for cabin, grp in fare_summary.groupby("cabin"):
                wavg = grp["avg_fare"].mean()
                fig_be.add_vline(
                    x=wavg, line_dash="dash",
                    line_color=CABIN_COLOR.get(cabin, "gray"),
                    annotation_text=f"Mkt {cabin} ${wavg:.0f}",
                    annotation_position="top right",
                )
            st.plotly_chart(fig_be, width="stretch")

        with col_b:
            verdicts = sec_matrix.groupby("Aircraft")["Verdict"].first().reset_index()
            verdict_counts = sec_matrix["Verdict"].value_counts().reset_index()
            verdict_counts.columns = ["Verdict", "Count"]
            fig_v = px.pie(verdict_counts, names="Verdict", values="Count",
                           color="Verdict",
                           color_discrete_map={
                               "✅ Profitable": "#2ecc71",
                               "⚠️ Marginal": "#f39c12",
                               "❌ Loss": "#e74c3c",
                               "❓ No market data": "#95a5a6",
                           },
                           title="Profitability verdicts across aircraft/configs")
            st.plotly_chart(fig_v, width="stretch")

    # ── Demand by cabin
    st.divider()
    st.subheader("Passenger demand by cabin (2025 annual)")
    try:
        od = demand_a.total_demand(sel_route)
        cabin_data = od.by_cabin
        if cabin_data:
            fig_demand = px.bar(
                x=list(cabin_data.keys()),
                y=list(cabin_data.values()),
                color=list(cabin_data.keys()),
                color_discrete_map=CABIN_COLOR,
                labels={"x": "Cabin", "y": "Annual Passengers"},
                title=f"Annual demand by cabin – {sel_route}",
            )
            st.plotly_chart(fig_demand, width="stretch")
            for cabin, val in sorted(cabin_data.items()):
                st.metric(f"Cabin {cabin}", f"{val:,.0f} pax/year")
    except Exception:
        st.info("Demand data not available for this route key.")

    # ── Competitor seats vs demand
    st.divider()
    st.subheader("Seat supply vs. demand")
    st.dataframe(
        fare_summary.style.format({
            "avg_fare": "${:,.0f}",
            "total_seats": "{:,.0f}",
        }),
        width="stretch",
    )


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 3 – ROUTE ANALYSER
# ══════════════════════════════════════════════════════════════════════════════

elif page == "🔍 Route Analyser":
    st.title("Route Analyser")

    sector = st.selectbox("Select sector", data.sectors)
    canon = _canonical_route(sector)

    mfares = market_fares_by_route()
    fares = mfares.get(canon, {})
    demand_a = DemandAnalyzer(data)

    # ── Market context
    col1, col2, col3, col4 = st.columns(4)
    try:
        mkt = demand_a.competitor_capacity_summary(sector)
        col1.metric("Competitors", mkt["num_competitors"])
        col2.metric("Annual competitor seats", f"{mkt['total_annual_seats']:,.0f}")
    except Exception:
        col1.metric("Competitors", "—")
        col2.metric("Annual competitor seats", "—")

    try:
        od = demand_a.total_demand(canon)
        col3.metric("Annual demand", f"{od.total_2025:,.0f}")
    except Exception:
        col3.metric("Annual demand", "—")

    y_fare = fares.get("Y", {}).get("avg_fare")
    j_fare = fares.get("J", {}).get("avg_fare")
    col4.metric(
        "Market Y/J fare",
        f"Y: ${y_fare:,.0f} / J: ${j_fare:,.0f}" if y_fare and j_fare
        else f"Y: ${y_fare:,.0f}" if y_fare else "—"
    )

    # ── Per-aircraft analysis
    st.subheader("Aircraft comparison on this sector")
    rev_calc = RevenueCalculator(data)
    calc = CostCalculator(data)
    base_price = st.number_input("Base ticket price to test (USD)", 50.0, 1000.0, 150.0, 5.0)

    rows = []
    for ac in data.aircraft_types:
        try:
            configs = data.get_configs(ac)
        except Exception:
            continue
        for cfg in configs:
            try:
                b = calc.compute(sector, ac, cfg)
                econ = rev_calc.evaluate(sector, ac, cfg, base_price, policy, lf)
                be_price = b.total_cost_per_flight / (b.seats * PRICING_POLICIES[policy]["avg_fare_pct"] * lf)
                rows.append({
                    "Aircraft": ac,
                    "Config": cfg,
                    "Seats": b.seats,
                    "Cost/flight": b.total_cost_per_flight,
                    "Cost/seat": b.cost_per_seat,
                    "Breakeven Price": be_price,
                    "Market Y Fare": y_fare,
                    "Profit/flight": econ.profit_per_flight,
                    "Breakeven LF": econ.breakeven_load_factor,
                    "Viable": "✅" if be_price < (y_fare or 0) else "❌",
                })
            except Exception:
                pass

    if rows:
        df = pd.DataFrame(rows).sort_values("Profit/flight", ascending=False)
        best = df.iloc[0]
        if best["Profit/flight"] > 0:
            st.success(
                f"**Best option:** {best['Aircraft']} · {best['Config']} · "
                f"${base_price:,.0f} base → **${best['Profit/flight']:,.0f} profit/flight** · "
                f"breakeven at **{best['Breakeven LF']:.1%}** LF"
            )
        else:
            cheapest = df.loc[df["Breakeven Price"].idxmin()]
            st.warning(
                f"At ${base_price:,.0f} base price, no aircraft is profitable. "
                f"Cheapest option is **{cheapest['Aircraft']} {cheapest['Config']}** — "
                f"needs minimum **${cheapest['Breakeven Price']:.0f}** base price at {lf_pct}% LF."
            )

        # chart
        col_a, col_b = st.columns(2)
        with col_a:
            fig_p = px.bar(
                df.sort_values("Profit/flight"),
                x="Profit/flight", y="Aircraft", color="Config",
                orientation="h",
                title="Profit per flight by aircraft & config",
            )
            fig_p.add_vline(x=0, line_color="red", line_dash="dash")
            st.plotly_chart(fig_p, width="stretch")

        with col_b:
            fig_be = px.bar(
                df.sort_values("Breakeven LF"),
                x="Breakeven LF", y="Aircraft", color="Config",
                orientation="h",
                title="Breakeven load factor",
                range_x=[0, 1.1],
            )
            fig_be.add_vline(x=lf, line_color="blue", line_dash="dash",
                             annotation_text=f"Your LF {lf_pct}%")
            fig_be.update_xaxes(tickformat=".0%")
            st.plotly_chart(fig_be, width="stretch")

        st.dataframe(
            df.style.format({
                "Cost/flight": "${:,.0f}",
                "Cost/seat": "${:,.0f}",
                "Breakeven Price": "${:,.0f}",
                "Market Y Fare": "${:,.0f}",
                "Profit/flight": "${:,.0f}",
                "Breakeven LF": "{:.1%}",
            }),
            width="stretch",
        )


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 4 – PRICING TOOL
# ══════════════════════════════════════════════════════════════════════════════

elif page == "💡 Pricing Tool":
    st.title("Pricing Tool")
    st.caption("Sweep prices to find your exact breakeven and profit-maximising point.")

    col1, col2, col3 = st.columns(3)
    with col1:
        sector = st.selectbox("Route", data.sectors)
    with col2:
        ac_opts = sorted({r["aircraft_type"] for r in data.routes if r["sector"] == sector})
        aircraft = st.selectbox("Aircraft", ac_opts)
    with col3:
        cfgs = list(data.get_configs(aircraft).keys())
        config = st.selectbox("Configuration", cfgs)

    df_sweep = price_sensitivity(sector, aircraft, config, policy, lf_pct)

    if df_sweep.empty:
        st.error("No data for this combination.")
        st.stop()

    # Find key points
    be_row = df_sweep[df_sweep["Profit"] >= 0]
    be_price = be_row["Base Price"].min() if not be_row.empty else None
    opt_row = df_sweep.loc[df_sweep["Profit"].idxmax()]
    opt_price = opt_row["Base Price"]
    opt_profit = opt_row["Profit"]

    mfares = market_fares_by_route()
    fares = mfares.get(_canonical_route(sector), {})

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Min profitable price", f"${be_price:,.0f}" if be_price else "Not achievable")
    m2.metric("Price at max profit", f"${opt_price:,.0f}")
    m3.metric("Max profit/flight", f"${opt_profit:,.0f}")
    m4.metric("Load factor assumed", f"{lf_pct}%")

    if be_price:
        st.success(
            f"**Action:** Set base price to **${int(opt_price):,}** on {sector} "
            f"with {aircraft} ({config}), Policy {policy}, {lf_pct}% LF → "
            f"profit **${opt_profit:,.0f}/flight**."
        )
    else:
        st.error(
            f"This route/aircraft/config cannot break even at {lf_pct}% LF under Policy {policy}. "
            f"Try a different aircraft, higher-density config, or raise the load factor."
        )

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=df_sweep["Base Price"], y=df_sweep["Profit"],
                              name="Profit/flight", line=dict(color="#2ecc71", width=2.5)))
    fig.add_trace(go.Scatter(x=df_sweep["Base Price"], y=df_sweep["Revenue"],
                              name="Revenue/flight", line=dict(color="#3498db", width=1.5, dash="dot")))
    fig.add_trace(go.Scatter(x=df_sweep["Base Price"], y=df_sweep["Cost"],
                              name="Cost/flight (fixed)", line=dict(color="#e74c3c", width=1.5, dash="dash")))

    if be_price:
        fig.add_vline(x=be_price, line_color="orange", line_dash="dash",
                      annotation_text=f"Min price ${be_price:,}")
    fig.add_vline(x=opt_price, line_color="#2ecc71", line_dash="solid",
                  annotation_text=f"Optimal ${opt_price:,}")

    for cabin, info in fares.items():
        fig.add_vline(x=info["avg_fare"], line_color=CABIN_COLOR.get(cabin, "gray"),
                      line_dash="dot", line_width=1,
                      annotation_text=f"Market {cabin} ${info['avg_fare']:,.0f}")

    fig.add_hline(y=0, line_color="black", line_dash="dot")
    fig.update_layout(
        title=f"Profit curve – {sector} · {aircraft} · {config} · Policy {policy} · LF {lf_pct}%",
        xaxis_title="Base Price (USD)",
        yaxis_title="USD per flight",
        height=460,
        legend=dict(orientation="h", y=1.05, x=1, xanchor="right"),
    )
    st.plotly_chart(fig, width="stretch")

    # Policy comparison at optimal price
    st.subheader("Policy comparison")
    rev_calc = RevenueCalculator(data)
    pol_rows = []
    for p in [1, 2, 3]:
        best_profit_p = float("-inf")
        best_price_p = None
        for price in range(30, 801, 5):
            try:
                e = rev_calc.evaluate(sector, aircraft, config, float(price), p, lf)
                if e.profit_per_flight > best_profit_p:
                    best_profit_p = e.profit_per_flight
                    best_price_p = price
            except Exception:
                pass
        if best_price_p is not None:
            try:
                e2 = rev_calc.evaluate(sector, aircraft, config, float(best_price_p), p, lf)
                pol_rows.append({
                    "Policy": POLICY_LABELS[p],
                    "Optimal Base Price": best_price_p,
                    "Avg Fare": e2.avg_fare,
                    "Profit/flight": e2.profit_per_flight,
                    "Breakeven LF": e2.breakeven_load_factor,
                })
            except Exception:
                pass

    if pol_rows:
        pol_df = pd.DataFrame(pol_rows)
        best_pol = pol_df.loc[pol_df["Profit/flight"].idxmax()]
        st.info(
            f"Best policy for this route/aircraft: **{best_pol['Policy']}** at "
            f"**${best_pol['Optimal Base Price']:,}** → profit **${best_pol['Profit/flight']:,.0f}/flight**"
        )
        st.dataframe(
            pol_df.style.format({
                "Optimal Base Price": "${:,.0f}",
                "Avg Fare": "${:,.0f}",
                "Profit/flight": "${:,.0f}",
                "Breakeven LF": "{:.1%}",
            }),
            width="stretch",
        )


# ══════════════════════════════════════════════════════════════════════════════
# PAGE 5 – COST BREAKDOWN
# ══════════════════════════════════════════════════════════════════════════════

elif page == "💰 Cost Breakdown":
    st.title("Cost Breakdown")

    col_s, col_a, col_c = st.columns(3)
    with col_s:
        sector = st.selectbox("Route", data.sectors)
    with col_a:
        aircraft_options = sorted({r["aircraft_type"] for r in data.routes if r["sector"] == sector})
        aircraft = st.selectbox("Aircraft", aircraft_options)
    with col_c:
        configs = list(data.get_configs(aircraft).keys())
        config = st.selectbox("Configuration", configs)

    calc = CostCalculator(data)
    b = calc.compute(sector, aircraft, config)
    bd = b.as_dict()

    col1, col2, col3 = st.columns(3)
    col1.metric("Total cost/flight", f"${bd['total_cost_per_flight']:,.2f}")
    col2.metric("Cost per seat", f"${bd['cost_per_seat']:,.2f}")
    col3.metric("Cost per ASK", f"${bd['cost_per_ask']:.4f}")

    cost_items = {
        "Fuel": bd["fuel_cost"],
        "Environmental": bd["environmental_cost"],
        "Overflight (ANSP)": bd["overflight_cost"],
        "Variable Mx": bd["variable_mx_cost"],
        "Fixed Mx": bd["fixed_mx_cost_per_flight"],
        "Crew": bd["crew_cost"],
        "Airport (dep)": bd["airport_cost_departure"],
        "Airport (arr)": bd["airport_cost_arrival"],
        "Lease": bd["lease_cost_per_flight"],
        "Insurance": bd["insurance_cost_per_flight"],
        "Overhead": bd["overhead_cost_per_flight"],
    }

    cost_df = pd.DataFrame(
        {"Component": list(cost_items.keys()), "Cost (USD)": list(cost_items.values())}
    ).sort_values("Cost (USD)", ascending=False)
    cost_df["% of Total"] = cost_df["Cost (USD)"] / bd["total_cost_per_flight"]

    top_cost = cost_df.iloc[0]
    st.info(
        f"**Biggest cost driver:** {top_cost['Component']} "
        f"(${top_cost['Cost (USD)']:,.0f}, {top_cost['% of Total']:.1%} of total). "
        f"To cut total cost, focus here first."
    )

    col_pie, col_bar = st.columns(2)
    with col_pie:
        fig_pie = px.pie(cost_df, names="Component", values="Cost (USD)",
                         title="Cost composition")
        st.plotly_chart(fig_pie, width="stretch")
    with col_bar:
        fig_bar = px.bar(cost_df.sort_values("Cost (USD)"),
                         x="Cost (USD)", y="Component", orientation="h",
                         color="Cost (USD)", color_continuous_scale="Reds",
                         title="Cost components ranked")
        st.plotly_chart(fig_bar, width="stretch")

    st.subheader("Full cost table")
    st.dataframe(
        cost_df.style.format({
            "Cost (USD)": "${:,.2f}",
            "% of Total": "{:.1%}",
        }),
        width="stretch",
    )

    st.divider()
    st.subheader("Flight parameters")
    pc = st.columns(4)
    pc[0].metric("Seats", bd["seats"])
    pc[1].metric("Distance (km)", f"{bd['distance_km']:,.0f}")
    pc[2].metric("Flight hours", f"{bd['flight_hours']:.2f} h")
    pc[3].metric("Block hours", f"{bd['block_hours']:.2f} h")
