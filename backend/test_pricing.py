"""Unit tests for the short-put ELN pricing engine.

Canonical example (independently verified with math.erf):
  AAPL short-put — S0=190, strike_pct=0.95 (K=180.5), 3M (T=0.25),
  σ=0.25, r=0.045, q=0.005, notional=100,000, USD, cash-settled.
"""

from __future__ import annotations

from math import exp, log, sqrt

import pytest

from pricing import (
    SCENARIO_MOVES,
    Greeks,
    PricingInput,
    build_illustration,
    build_payoff,
    build_scenarios,
    call_price_per_share,
    d1_d2,
    norm_cdf,
    norm_pdf,
    put_greeks,
    put_price_per_share,
    return_at_maturity,
)

TOL = 1e-6

CANONICAL = PricingInput(
    ticker="AAPL",
    spot=190.0,
    strike_pct=0.95,
    tenor_months=3,
    iv=0.25,
    risk_free_rate=0.045,
    dividend_yield=0.005,
    notional=100_000.0,
    currency="USD",
    settlement="cash",
)


# --------------------------------------------------------------------------- #
# Black-Scholes primitives
# --------------------------------------------------------------------------- #
def test_d1_d2():
    d1, d2 = d1_d2(190.0, 180.5, 0.25, 0.25, 0.045, 0.005)
    assert d1 == pytest.approx(0.5528463551, abs=TOL)
    assert d2 == pytest.approx(0.4278463551, abs=TOL)
    assert d1 - d2 == pytest.approx(0.25 * sqrt(0.25))  # = σ√T


def test_norm_cdf_symmetry_and_bounds():
    assert norm_cdf(0) == pytest.approx(0.5)
    assert norm_cdf(1e9) == pytest.approx(1.0)
    assert norm_cdf(-1e9) == pytest.approx(0.0)
    assert norm_cdf(1.96) == pytest.approx(0.975, abs=1e-3)
    # φ(x) integrates to 1 over (−∞, ∞); symmetry: N(−x) = 1 − N(x)
    assert norm_cdf(0.7) + norm_cdf(-0.7) == pytest.approx(1.0)


def test_put_price_canonical():
    P = put_price_per_share(190.0, 180.5, 0.25, 0.25, 0.045, 0.005)
    assert P == pytest.approx(4.614517611, abs=TOL)


def test_put_call_parity():
    # C − P == S0·e^(−qT) − K·e^(−rT)
    S, K, T, sig, r, q = 190.0, 180.5, 0.25, 0.25, 0.045, 0.005
    C = call_price_per_share(S, K, T, sig, r, q)
    P = put_price_per_share(S, K, T, sig, r, q)
    lhs = C - P
    rhs = S * exp(-q * T) - K * exp(-r * T)
    assert lhs == pytest.approx(rhs, abs=1e-10)


def test_atm_put_positive_and_decreases_with_vol():
    # ATM put, lower vol → cheaper
    high = put_price_per_share(100, 100, 1.0, 0.40, 0.05, 0.0)
    low = put_price_per_share(100, 100, 1.0, 0.10, 0.05, 0.0)
    assert high > low > 0


# --------------------------------------------------------------------------- #
# Greeks (pinned + cross-checked against first principles)
# --------------------------------------------------------------------------- #
def test_greeks_canonical():
    g = put_greeks(190.0, 180.5, 0.25, 0.25, 0.045, 0.005)
    assert g.delta == pytest.approx(-0.2901843118, abs=TOL)
    assert g.gamma == pytest.approx(0.0144170952, abs=TOL)
    assert g.vega_per_1pct == pytest.approx(0.3248793573, abs=TOL)
    assert g.theta_per_day == pytest.approx(-0.0379004626, abs=TOL)


def test_greeks_match_first_principles():
    S, K, T, sig, r, q = 190.0, 180.5, 0.25, 0.25, 0.045, 0.005
    d1, d2 = d1_d2(S, K, T, sig, r, q)
    g = put_greeks(S, K, T, sig, r, q)
    assert g.delta == pytest.approx(norm_cdf(d1) - 1.0, abs=TOL)
    assert g.gamma == pytest.approx(norm_pdf(d1) / (S * sig * sqrt(T)), abs=TOL)
    assert g.vega_per_1pct == pytest.approx(
        S * exp(-q * T) * norm_pdf(d1) * sqrt(T) / 100.0, abs=TOL
    )
    assert g.delta <= 0          # put delta is non-positive
    assert g.gamma > 0
    assert g.vega_per_1pct > 0


# --------------------------------------------------------------------------- #
# Return-at-maturity branches + settlement equivalence
# --------------------------------------------------------------------------- #
def test_return_at_maturity_branches():
    S, K, P = 190.0, 180.5, 4.614517611
    # S_T ≥ K → flat at +coupon_abs
    assert return_at_maturity(S, K, P, 190.0) == pytest.approx(P / S, abs=TOL)
    assert return_at_maturity(S, K, P, 300.0) == pytest.approx(P / S, abs=TOL)  # ceiling
    # S_T < K → coupon_abs − (K − S_T)/S0
    st = 171.0  # −10%
    assert return_at_maturity(S, K, P, st) == pytest.approx(P / S - (K - st) / S, abs=TOL)


def test_cash_equals_physical_return():
    cash = build_illustration(CANONICAL).summary
    phys = build_illustration(
        PricingInput(**{**CANONICAL.__dict__, "settlement": "physical"})
    ).summary
    assert cash.coupon_abs_pct == pytest.approx(phys.coupon_abs_pct)
    assert cash.max_loss_pct == pytest.approx(phys.max_loss_pct)
    assert cash.breakeven_st == pytest.approx(phys.breakeven_st)


# --------------------------------------------------------------------------- #
# Illustration assembly — the canonical pinned numbers
# --------------------------------------------------------------------------- #
def test_canonical_summary_pins():
    ill = build_illustration(CANONICAL)
    s = ill.summary
    assert s.put_price_per_share == pytest.approx(4.614517611, abs=TOL)
    assert s.shares == pytest.approx(100_000.0 / 190.0, abs=TOL)              # 526.3157894737
    assert s.total_premium == pytest.approx(4.614517611 * 100_000.0 / 190.0, abs=TOL)
    assert s.coupon_abs_pct == pytest.approx(2.4286934795, abs=TOL)
    assert s.coupon_annualized_simple_pct == pytest.approx(9.7147739179, abs=TOL)
    assert s.coupon_annualized_compounded_pct == pytest.approx(10.0744521417, abs=TOL)
    assert s.prob_itm_pct == pytest.approx(33.43814927, abs=1e-6)
    assert s.breakeven_st == pytest.approx(180.5 - 4.614517611, abs=TOL)       # 175.885482389
    assert s.breakeven_pct_of_spot == pytest.approx(92.57130652, abs=1e-6)
    assert s.max_loss_pct == pytest.approx(92.5713065205, abs=TOL)
    assert s.currency == "USD"
    assert s.warnings == []  # canonical has no warning flags


def test_scenarios_canonical():
    rows = build_scenarios(CANONICAL, put_price_per_share(
        190.0, 180.5, 0.25, 0.25, 0.045, 0.005))
    assert [r.st_move_pct for r in rows] == [m * 100 for m in SCENARIO_MOVES]
    by_move = {round(r.st_move_pct): r for r in rows}
    assert by_move[0].return_on_notional_pct == pytest.approx(2.4286934795, abs=TOL)
    assert by_move[-10].return_on_notional_pct == pytest.approx(-2.571307, abs=1e-5)
    assert by_move[-20].return_on_notional_pct == pytest.approx(-12.571307, abs=1e-5)
    assert by_move[-30].return_on_notional_pct == pytest.approx(-22.571307, abs=1e-5)
    # flat ceiling above strike (+10%, +20% equal +0%)
    assert by_move[10].return_on_notional_pct == pytest.approx(by_move[0].return_on_notional_pct)
    assert by_move[20].return_on_notional_pct == pytest.approx(by_move[0].return_on_notional_pct)
    # ending_value == notional × (1 + return)
    for r in rows:
        assert r.ending_value == pytest.approx(100_000.0 * (1 + r.return_on_notional_pct / 100.0))


# --------------------------------------------------------------------------- #
# Payoff diagram
# --------------------------------------------------------------------------- #
def test_payoff_range_and_count():
    pts = build_payoff(CANONICAL, 4.614517611)
    assert pts[0].st_pct_of_spot == pytest.approx(50.0)
    assert pts[-1].st_pct_of_spot == pytest.approx(130.0)
    assert len(pts) == 33  # 0.50 → 1.30 step 0.025 inclusive


def test_payoff_monotonic_nondecreasing():
    # Short-put P&L RISES as S_T rises (loss shrinks), then flats above strike.
    pts = build_payoff(CANONICAL, 4.614517611)
    for a, b in zip(pts, pts[1:]):
        assert b.pnl_per_share >= a.pnl_per_share - 1e-9


def test_payoff_per_share_formula():
    # Below strike: pnl_per_share = P − (K − st); at st → 0 this becomes P − K.
    P = 4.614517611
    pts = build_payoff(CANONICAL, P)
    for p in pts:
        expected = P - max(180.5 - p.st, 0.0)
        assert p.pnl_per_share == pytest.approx(expected, abs=TOL)
    # S_T → 0 limit (not sampled; payoff starts at 50% of spot): P − K
    assert (P - 180.5) == pytest.approx(-175.885482389, abs=TOL)


def test_payoff_flat_above_strike():
    pts = build_payoff(CANONICAL, 4.614517611)
    ceiling = 4.614517611  # intrinsic = 0 for S_T ≥ K
    above = [p for p in pts if p.st >= 180.5]
    assert all(p.pnl_per_share == pytest.approx(ceiling, abs=TOL) for p in above)


# --------------------------------------------------------------------------- #
# Edge cases / warnings
# --------------------------------------------------------------------------- #
def test_atm_strike100():
    inp = PricingInput(**{**CANONICAL.__dict__, "strike_pct": 1.00})
    s = build_illustration(inp).summary
    assert s.strike == pytest.approx(190.0)
    assert s.coupon_abs_pct > CANONICAL.iv * 0  # positive
    # ATM put > OTM put (same everything else)
    otm = build_illustration(CANONICAL).summary.coupon_abs_pct
    assert s.coupon_abs_pct > otm


def test_higher_strike_higher_coupon_higher_assignment():
    deep = build_illustration(
        PricingInput(**{**CANONICAL.__dict__, "strike_pct": 1.00})).summary
    otm = build_illustration(CANONICAL).summary
    assert deep.coupon_abs_pct > otm.coupon_abs_pct
    assert deep.prob_itm_pct > otm.prob_itm_pct


def test_higher_iv_higher_coupon():
    hi = build_illustration(PricingInput(**{**CANONICAL.__dict__, "iv": 0.40})).summary
    lo = build_illustration(PricingInput(**{**CANONICAL.__dict__, "iv": 0.15})).summary
    assert hi.coupon_abs_pct > lo.coupon_abs_pct


def test_longer_tenor_higher_abs_coupon_lower_annualized():
    long_t = build_illustration(PricingInput(**{**CANONICAL.__dict__, "tenor_months": 12})).summary
    short_t = build_illustration(CANONICAL).summary  # 3M
    # more time → more absolute premium, but simple-annualized reads lower (less vol/yr effect)
    assert long_t.coupon_abs_pct > short_t.coupon_abs_pct


def test_deep_otm_warns():
    inp = PricingInput(**{**CANONICAL.__dict__, "strike_pct": 0.85})
    s = build_illustration(inp).summary
    assert "warn_deep_otm" in s.warnings


def test_high_assignment_warns():
    # ATM, high IV → prob_itm > 40%
    inp = PricingInput(**{**CANONICAL.__dict__, "strike_pct": 1.00, "iv": 0.50})
    s = build_illustration(inp).summary
    assert s.prob_itm_pct > 40.0
    assert "warn_high_assignment" in s.warnings


def test_hk_warns_no_iv():
    inp = PricingInput(**{**CANONICAL.__dict__, "currency": "HKD", "ticker": "0700.HK"})
    s = build_illustration(inp).summary
    assert "warn_hk_no_iv" in s.warnings


def test_low_iv_warns():
    inp = PricingInput(**{**CANONICAL.__dict__, "iv": 0.08})
    s = build_illustration(inp).summary
    assert "warn_iv_below_realized" in s.warnings
