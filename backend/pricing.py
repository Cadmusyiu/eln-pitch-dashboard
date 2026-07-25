"""Canonical Black-Scholes pricing engine for a short-put ELN.

The ELN economically = deposit notional + sell a European put on the underlying.
The premium received is the "coupon". This module is the canonical, unit-tested
source of truth; frontend/app/lib/engine.ts mirrors it field-for-field.

Conventions
-----------
- All rate/vol inputs are FRACTIONS (strike_pct 0.95, iv 0.25, r 0.045, q 0.005).
- Output fields ending in ``_pct`` are already multiplied by 100 (display-ready),
  matching the premium-financing convention. Raw inputs (strike_pct, iv, ...) stay
  as fractions and are ×100 at the display boundary.
- Day-count: ``T = tenor_months / 12`` in BOTH engines — never mix ACT/365 or the
  FE/Python parity breaks.
- Settlement (cash vs physical) does NOT change the mark-to-market return; it only
  changes the TermSheet framing language.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import List

_SQRT_2 = math.sqrt(2.0)
_SQRT_2PI = math.sqrt(2.0 * math.pi)

# Terminal-stock scenarios shown in the scenario table (fractional move off spot).
SCENARIO_MOVES: List[float] = [-0.30, -0.20, -0.10, 0.0, 0.10, 0.20]

# Payoff diagram samples S_T from 50% to 130% of spot at this step.
PAYOFF_LO = 0.50
PAYOFF_HI = 1.30
PAYOFF_STEP = 0.025


# --------------------------------------------------------------------------- #
# Core Black-Scholes primitives
# --------------------------------------------------------------------------- #
def norm_cdf(x: float) -> float:
    """Standard normal CDF, via math.erf (matches the TS erf polyfill to ~1e-12)."""
    return 0.5 * (1.0 + math.erf(x / _SQRT_2))


def norm_pdf(x: float) -> float:
    """Standard normal PDF."""
    return math.exp(-0.5 * x * x) / _SQRT_2PI


def d1_d2(spot: float, strike: float, T: float, sigma: float, r: float, q: float):
    """Return (d1, d2) for the Black-Scholes formula."""
    sd = sigma * math.sqrt(T)
    d1 = (math.log(spot / strike) + (r - q + 0.5 * sigma * sigma) * T) / sd
    d2 = d1 - sd
    return d1, d2


def put_price_per_share(spot: float, strike: float, T: float, sigma: float, r: float, q: float) -> float:
    """Black-Scholes European put price per share (continuous compounding)."""
    d1, d2 = d1_d2(spot, strike, T, sigma, r, q)
    return strike * math.exp(-r * T) * norm_cdf(-d2) - spot * math.exp(-q * T) * norm_cdf(-d1)


def call_price_per_share(spot: float, strike: float, T: float, sigma: float, r: float, q: float) -> float:
    """Black-Scholes European call — used only for the put-call parity cross-check."""
    d1, d2 = d1_d2(spot, strike, T, sigma, r, q)
    return spot * math.exp(-q * T) * norm_cdf(d1) - strike * math.exp(-r * T) * norm_cdf(d2)


@dataclass
class Greeks:
    delta: float        # dP/dS  (put delta = N(d1) - 1, ≤ 0)
    gamma: float        # d²P/dS² (same as call)
    vega_per_1pct: float  # dP per 1.00 (i.e. 1%) absolute change in vol
    theta_per_day: float  # dP per calendar day (365/yr)


def put_greeks(spot: float, strike: float, T: float, sigma: float, r: float, q: float) -> Greeks:
    d1, d2 = d1_d2(spot, strike, T, sigma, r, q)
    pdf_d1 = norm_pdf(d1)
    sd = sigma * math.sqrt(T)
    discount_q = math.exp(-q * T)
    discount_r = math.exp(-r * T)
    gamma = pdf_d1 / (spot * sd) if spot * sd > 0 else 0.0
    vega = spot * discount_q * pdf_d1 * math.sqrt(T)        # per 1.00 vol
    # Put theta (per year): -S φ(d1) σ e^-qT / (2√T) + r K e^-rT N(-d2) - q S e^-qT N(-d1)
    theta = (
        -(spot * pdf_d1 * sigma * discount_q) / (2.0 * math.sqrt(T))
        + r * strike * discount_r * norm_cdf(-d2)
        - q * spot * discount_q * norm_cdf(-d1)
    )
    return Greeks(
        delta=norm_cdf(d1) - 1.0,
        gamma=gamma,
        vega_per_1pct=vega / 100.0,
        theta_per_day=theta / 365.0,
    )


def return_at_maturity(spot: float, strike: float, premium_per_share: float, st: float) -> float:
    """Return on notional (FRACTION) at maturity given terminal spot S_T = st.

    - S_T ≥ K → +coupon_abs (premium kept, principal safe)
    - S_T < K → coupon_abs − (K − S_T)/S0  (short-put loss kicks in)

    Holds identically for cash and physical settlement (MTM).
    """
    intrinsic = max(strike - st, 0.0)
    return (premium_per_share - intrinsic) / spot


# --------------------------------------------------------------------------- #
# Input / output dataclasses (field names mirrored in frontend/app/lib/types.ts)
# --------------------------------------------------------------------------- #
@dataclass
class PricingInput:
    ticker: str
    spot: float
    strike_pct: float          # 0.95 → strike = 0.95 × spot
    tenor_months: int          # {1, 3, 6, 12}
    iv: float                  # σ, fraction
    risk_free_rate: float      # r, fraction (continuous)
    dividend_yield: float      # q, fraction (continuous)
    notional: float
    currency: str = "USD"      # "USD" | "HKD"
    settlement: str = "cash"   # "cash" | "physical"  (MTM return identical)

    @property
    def strike(self) -> float:
        return self.strike_pct * self.spot

    @property
    def T(self) -> float:
        return self.tenor_months / 12.0

    @property
    def shares(self) -> float:
        return self.notional / self.spot


@dataclass
class ScenarioRow:
    st_move_pct: float            # -30.0, -20.0, ... (display-ready)
    st: float
    return_on_notional_pct: float
    ending_value: float           # notional × (1 + return)


@dataclass
class PayoffPoint:
    st_pct_of_spot: float         # 50.0 .. 130.0 (display-ready)
    st: float
    pnl_per_share: float          # premium − max(K − S_T, 0)
    pnl_on_notional_pct: float


@dataclass
class SummaryMetrics:
    currency: str
    ticker: str
    settlement: str

    spot: float
    strike: float
    strike_pct: float             # fraction (0.95)
    tenor_months: int
    T: float

    iv: float                     # fraction
    risk_free_rate: float         # fraction
    dividend_yield: float         # fraction

    notional: float
    shares: float

    put_price_per_share: float
    total_premium: float          # put_price_per_share × shares

    coupon_abs_pct: float                       # P/S0 × 100
    coupon_annualized_simple_pct: float         # (P/S0)/T × 100
    coupon_annualized_compounded_pct: float     # ((1+P/S0)^(1/T) − 1) × 100

    prob_itm_pct: float           # N(−d2) × 100  (≈ probability of assignment)
    breakeven_st: float           # K − P
    breakeven_pct_of_spot: float  # (K − P)/S0 × 100
    max_loss_pct: float           # (K/S0 − P/S0) × 100  (S_T → 0)

    delta: float
    gamma: float
    vega_per_1pct: float
    theta_per_day: float

    d1: float
    d2: float

    warnings: List[str] = field(default_factory=list)


@dataclass
class Illustration:
    summary: SummaryMetrics
    scenarios: List[ScenarioRow]
    payoff: List[PayoffPoint]


# --------------------------------------------------------------------------- #
# Assembly
# --------------------------------------------------------------------------- #
def build_scenarios(inp: PricingInput, P: float) -> List[ScenarioRow]:
    rows: List[ScenarioRow] = []
    for m in SCENARIO_MOVES:
        st = inp.spot * (1.0 + m)
        ret = return_at_maturity(inp.spot, inp.strike, P, st)
        rows.append(
            ScenarioRow(
                st_move_pct=m * 100.0,
                st=st,
                return_on_notional_pct=ret * 100.0,
                ending_value=inp.notional * (1.0 + ret),
            )
        )
    return rows


def build_payoff(inp: PricingInput, P: float, step: float = PAYOFF_STEP) -> List[PayoffPoint]:
    rows: List[PayoffPoint] = []
    # iterate 0.50 .. 1.30 inclusive
    n_steps = int(round((PAYOFF_HI - PAYOFF_LO) / step))
    for i in range(n_steps + 1):
        frac = PAYOFF_LO + i * step
        st = inp.spot * frac
        pnl_share = P - max(inp.strike - st, 0.0)
        rows.append(
            PayoffPoint(
                st_pct_of_spot=frac * 100.0,
                st=st,
                pnl_per_share=pnl_share,
                pnl_on_notional_pct=(pnl_share / inp.spot) * 100.0,
            )
        )
    return rows


def build_illustration(inp: PricingInput) -> Illustration:
    P = put_price_per_share(inp.spot, inp.strike, inp.T, inp.iv, inp.risk_free_rate, inp.dividend_yield)
    g = put_greeks(inp.spot, inp.strike, inp.T, inp.iv, inp.risk_free_rate, inp.dividend_yield)
    d1, d2 = d1_d2(inp.spot, inp.strike, inp.T, inp.iv, inp.risk_free_rate, inp.dividend_yield)

    coupon_abs = P / inp.spot                       # fraction over the tenor
    total_premium = P * inp.shares
    coupon_abs_pct = coupon_abs * 100.0
    coupon_simple = (coupon_abs / inp.T) * 100.0
    coupon_comp = ((1.0 + coupon_abs) ** (1.0 / inp.T) - 1.0) * 100.0
    prob_itm = norm_cdf(-d2) * 100.0
    breakeven_st = inp.strike - P
    breakeven_pct = (breakeven_st / inp.spot) * 100.0
    max_loss = (inp.strike / inp.spot - coupon_abs) * 100.0

    # Warnings emitted as translation keys (see frontend/app/lib/i18n.ts).
    warnings: List[str] = []
    if inp.iv < 0.10:
        warnings.append("warn_iv_below_realized")
    if inp.currency == "HKD":
        warnings.append("warn_hk_no_iv")
    if inp.strike_pct < 0.90:
        warnings.append("warn_deep_otm")
    if prob_itm > 40.0:
        warnings.append("warn_high_assignment")

    summary = SummaryMetrics(
        currency=inp.currency,
        ticker=inp.ticker,
        settlement=inp.settlement,
        spot=inp.spot,
        strike=inp.strike,
        strike_pct=inp.strike_pct,
        tenor_months=inp.tenor_months,
        T=inp.T,
        iv=inp.iv,
        risk_free_rate=inp.risk_free_rate,
        dividend_yield=inp.dividend_yield,
        notional=inp.notional,
        shares=inp.shares,
        put_price_per_share=P,
        total_premium=total_premium,
        coupon_abs_pct=coupon_abs_pct,
        coupon_annualized_simple_pct=coupon_simple,
        coupon_annualized_compounded_pct=coupon_comp,
        prob_itm_pct=prob_itm,
        breakeven_st=breakeven_st,
        breakeven_pct_of_spot=breakeven_pct,
        max_loss_pct=max_loss,
        delta=g.delta,
        gamma=g.gamma,
        vega_per_1pct=g.vega_per_1pct,
        theta_per_day=g.theta_per_day,
        d1=d1,
        d2=d2,
        warnings=warnings,
    )

    return Illustration(
        summary=summary,
        scenarios=build_scenarios(inp, P),
        payoff=build_payoff(inp, P),
    )
