// Client-side illustration engine for the short-put ELN.
//
// COUPON-DRIVEN (no Black-Scholes in the sales flow): the salesperson enters the
// quoted coupon (p.a.) directly. That coupon IS the premium received, so the
// structure is derived purely from coupon + strike + tenor:
//
//   coupon_abs (over tenor) = coupon_pa × T          (the premium as % of notional)
//   P (premium per share)   = coupon_abs_frac × S0
//   breakeven               = K − P
//   max_loss (S_T → 0)      = (K − P) / S0           (= breakeven % of spot)
//   payoff at S_T           = P − max(K − S_T, 0)    (per share), / S0 for % of notional
//
// backend/pricing.py keeps the canonical BS engine for the theoretical price path;
// this FE mirror illustrates the quoted structure.

import { Illustration, PayoffPoint, PricingInput, ScenarioRow } from "./types";

export const SCENARIO_MOVES = [-0.3, -0.2, -0.1, 0.0, 0.1, 0.2];
export const PAYOFF_LO = 0.5;
export const PAYOFF_HI = 1.3;
export const PAYOFF_STEP = 0.025;

// --------------------------------------------------------------------------- //
// Primitives
// --------------------------------------------------------------------------- //
export function returnAtMaturity(spot: number, strike: number, premiumPerShare: number, st: number): number {
  const intrinsic = Math.max(strike - st, 0);
  return (premiumPerShare - intrinsic) / spot;
}

// --------------------------------------------------------------------------- //
// Assembly
// --------------------------------------------------------------------------- //
export function buildScenarios(inp: PricingInput, strike: number, P: number): ScenarioRow[] {
  const rows: ScenarioRow[] = [];
  for (const m of SCENARIO_MOVES) {
    const st = inp.spot * (1 + m);
    const ret = returnAtMaturity(inp.spot, strike, P, st);
    rows.push({
      st_move_pct: m * 100,
      st,
      return_on_notional_pct: ret * 100,
      ending_value: inp.notional * (1 + ret),
    });
  }
  return rows;
}

export function buildPayoff(inp: PricingInput, strike: number, P: number, step = PAYOFF_STEP): PayoffPoint[] {
  const rows: PayoffPoint[] = [];
  const nSteps = Math.round((PAYOFF_HI - PAYOFF_LO) / step);
  for (let i = 0; i <= nSteps; i++) {
    const frac = PAYOFF_LO + i * step;
    const st = inp.spot * frac;
    const pnlShare = P - Math.max(strike - st, 0);
    rows.push({
      st_pct_of_spot: frac * 100,
      st,
      pnl_per_share: pnlShare,
      pnl_on_notional_pct: (pnlShare / inp.spot) * 100,
    });
  }
  return rows;
}

export function buildIllustration(inp: PricingInput): Illustration {
  const strike = inp.strike_pct * inp.spot;
  const T = inp.tenor_months / 12;
  const shares = inp.notional / inp.spot;

  // The quoted coupon (p.a.) over the tenor (simple day-count) is the premium as a
  // fraction of notional. P is the per-share equivalent.
  const couponAbsFrac = (inp.coupon_pa_pct / 100) * T;
  const couponAbsPct = couponAbsFrac * 100; // = coupon_pa_pct × T
  const P = couponAbsFrac * inp.spot; // premium per share
  const totalPremium = couponAbsFrac * inp.notional; // = P × shares

  const breakevenSt = strike - P;
  const breakevenPct = (breakevenSt / inp.spot) * 100;
  const maxLoss = ((strike - P) / inp.spot) * 100; // = breakevenPct (S_T → 0)

  const callLevelSt = (inp.call_level_pct / 100) * inp.spot;

  const warnings: string[] = [];
  if (inp.strike_pct < 0.9) warnings.push("warn_deep_otm");
  if (inp.call_level_pct < inp.strike_pct * 100) warnings.push("warn_call_below_strike");

  const summary = {
    currency: inp.currency,
    ticker: inp.ticker,
    settlement: inp.settlement,
    spot: inp.spot,
    strike,
    strike_pct: inp.strike_pct,
    tenor_months: inp.tenor_months,
    T,
    coupon_pa_pct: inp.coupon_pa_pct,
    coupon_abs_pct: couponAbsPct,
    call_level_pct: inp.call_level_pct,
    call_level_st: callLevelSt,
    notional: inp.notional,
    shares,
    total_premium: totalPremium,
    breakeven_st: breakevenSt,
    breakeven_pct_of_spot: breakevenPct,
    max_loss_pct: maxLoss,
    warnings,
  };

  return {
    summary,
    scenarios: buildScenarios(inp, strike, P),
    payoff: buildPayoff(inp, strike, P),
  };
}
