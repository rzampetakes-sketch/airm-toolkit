"""
AIRM 615 Decision Platform
===========================
Streamlit web app that surfaces the best route, aircraft, and pricing
decisions from the Air Mercury business-case data.

Run with:
    streamlit run app.py
"""

from __future__ import annotations

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

SCORE_HELP = (
    "Opportunity score = (demand / competitor_seats) × profit_per_flight. "
    "Higher means more demand headroom and better unit economics."
)


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
        best = results[0]  # already sorted by profit desc
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


# ── sidebar controls ───────────────────────────────────────────────────────────

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
    page = st.radio("Page", ["🏆 Best Opportunities", "📊 Market Overview",
                              "🔍 Route Deep-Dive", "✈ Aircraft Comparison",
                              "💰 Cost Breakdown"])


data = load_data()

# ── page: best opportunities ───────────────────────────────────────────────────

if page == "🏆 Best Opportunities":
    st.title("Best Route Opportunities")
    st.caption(SCORE_HELP)

    df = opportunity_df(base_price, policy, lf)

    top = df[df["Profit/flight"] > 0].head(10)

    col1, col2, col3 = st.columns(3)
    col1.metric("Best route", top.iloc[0]["Route"] if len(top) else "—")
    col2.metric("Best aircraft on top route",
                top.iloc[0]["Best Aircraft"] if len(top) else "—")
    col3.metric("Profit/flight (best)",
                f"${top.iloc[0]['Profit/flight']:,.0f}" if len(top) else "—")

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

    col1, col2, col3, col4 = st.columns(4)
    col1.metric("City pairs", len(df))
    col2.metric("Total annual demand", f"{df['Annual Demand'].sum():,.0f}")
    col3.metric("Avg competitors/route", f"{df['Competitors'].mean():.1f}")
    col4.metric("Highest demand route", df.loc[df['Annual Demand'].idxmax(), 'Route'])

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

    demand = DemandAnalyzer(data)
    try:
        od = demand.total_demand(sector)
        mkt = demand.competitor_capacity_summary(sector)
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

    df_ac = best_aircraft_df(sector, base_price, policy, lf)

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
    st.success(
        f"**Recommended aircraft:** {best_row['Aircraft']} "
        f"({best_row['Seats']} seats, profit ${best_row['Profit/flight']:,.0f}/flight, "
        f"breakeven at {best_row['Breakeven LF']:.1%} load factor)"
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
            sector=sector,
            aircraft_type=ac_choice,
            configuration=config_choice,
            base_price=base_price,
            pricing_policy=policy,
            load_factor=lf_val,
        )
        profits.append(econ.profit_per_flight)

    sens_df = pd.DataFrame({"Load Factor": lf_range, "Profit/flight": profits})
    fig_sens = px.line(sens_df, x="Load Factor", y="Profit/flight",
                       title=f"Profit sensitivity – {ac_choice} on {sector}",
                       labels={"Load Factor": "Load Factor", "Profit/flight": "Profit (USD)"})
    fig_sens.add_hline(y=0, line_color="red", line_dash="dash", annotation_text="Breakeven")
    fig_sens.add_vline(x=lf, line_color="blue", line_dash="dot",
                       annotation_text=f"Assumed LF {lf:.0%}")
    fig_sens.update_xaxes(tickformat=".0%")
    st.plotly_chart(fig_sens, width="stretch")


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
