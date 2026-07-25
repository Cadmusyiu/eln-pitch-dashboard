// Client-side pricing engine for the short-put ELN.
// MIRRORS backend/pricing.py (Black-Scholes short-put model). The Python engine
// remains the canonical, unit-tested source of truth. This TS mirror is what the
// deployed static site actually runs.

import { Illustration, PayoffPoint, PricingInput, ScenarioRow } from "./types";

const SQRT_2 = Math.sqrt(2);
const SQRT_2PI = Math.sqrt(2 * Math.PI);

export const SCENARIO_MOVES = [-0.3, -0.2, -0.1, 0.0, 0.1, 0.2];
export const PAYOFF_LO = 0.5;
export const PAYOFF_HI = 1.3;
export const PAYOFF_STEP = 0.025;

// --------------------------------------------------------------------------- //
// Black-Scholes primitives
// --------------------------------------------------------------------------- //
export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

// Standard normal CDF via Simpson's rule integration of the PDF.
// Python uses math.erf (exact); this matches it to ~1e-11 — far inside the 1e-6
// parity tolerance the tests pin. (The A&S 7.1.26 rational erf is only ~1.5e-7
// accurate, which would drift put_price past 1e-6, so we integrate instead.)
export function normCdf(x: number): number {
  if (x === 0) return 0.5;
  if (x > 8) return 1.0;
  if (x < -8) return 0.0;
  const sign = x < 0 ? -1 : 1;
  const b = Math.abs(x);
  const n = 1000; // subdivisions (even)
  const h = b / n;
  let s = normPdf(0) + normPdf(b);
  for (let i = 1; i < n; i++) {
    s += (i % 2 === 0 ? 2 : 4) * normPdf(i * h);
  }
  return 0.5 + sign * ((h / 3) * s);
}

export function d1d2(
  spot: number,
  strike: number,
  T: number,
  sigma: number,
  r: number,
  q: number
): [number, number] {
  const sd = sigma * Math.sqrt(T);
  const d1 = (Math.log(spot / strike) + (r - q + 0.5 * sigma * sigma) * T) / sd;
  return [d1, d1 - sd];
}

export function putPricePerShare(
  spot: number,
  strike: number,
  T: number,
  sigma: number,
  r: number,
  q: number
): number {
  const [d1, d2] = d1d2(spot, strike, T, sigma, r, q);
  return strike * Math.exp(-r * T) * normCdf(-d2) - spot * Math.exp(-q * T) * normCdf(-d1);
}

export interface Greeks {
  delta: number;
  gamma: number;
  vega_per_1pct: number;
  theta_per_day: number;
}

export function putGreeks(
  spot: number,
  strike: number,
  T: number,
  sigma: number,
  r: number,
  q: number
): Greeks {
  const [d1, d2] = d1d2(spot, strike, T, sigma, r, q);
  const pdfD1 = normPdf(d1);
  const sd = sigma * Math.sqrt(T);
  const discQ = Math.exp(-q * T);
  const discR = Math.exp(-r * T);
  const gamma = spot * sd > 0 ? pdfD1 / (spot * sd) : 0;
  const vega = spot * discQ * pdfD1 * Math.sqrt(T); // per 1.00 vol
  const theta =
    -(spot * pdfD1 * sigma * discQ) / (2 * Math.sqrt(T)) +
    r * strike * discR * normCdf(-d2) -
    q * spot * discQ * normCdf(-d1);
  return {
    delta: normCdf(d1) - 1,
    gamma,
    vega_per_1pct: vega / 100,
    theta_per_day: theta / 365,
  };
}

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

  const P = putPricePerShare(inp.spot, strike, T, inp.iv, inp.risk_free_rate, inp.dividend_yield);
  const g = putGreeks(inp.spot, strike, T, inp.iv, inp.risk_free_rate, inp.dividend_yield);
  const [d1, d2] = d1d2(inp.spot, strike, T, inp.iv, inp.risk_free_rate, inp.dividend_yield);

  const couponAbs = P / inp.spot; // fraction over the tenor
  const totalPremium = P * shares;
  const couponAbsPct = couponAbs * 100;
  const couponSimple = (couponAbs / T) * 100;
  const couponComp = (Math.pow(1 + couponAbs, 1 / T) - 1) * 100;
  const probItm = normCdf(-d2) * 100;
  const breakevenSt = strike - P;
  const breakevenPct = (breakevenSt / inp.spot) * 100;
  const maxLoss = (strike / inp.spot - couponAbs) * 100;

  const warnings: string[] = [];
  if (inp.iv < 0.1) warnings.push("warn_iv_below_realized");
  if (inp.currency === "HKD") warnings.push("warn_hk_no_iv");
  if (inp.strike_pct < 0.9) warnings.push("warn_deep_otm");
  if (probItm > 40) warnings.push("warn_high_assignment");

  const summary = {
    currency: inp.currency,
    ticker: inp.ticker,
    settlement: inp.settlement,
    spot: inp.spot,
    strike,
    strike_pct: inp.strike_pct,
    tenor_months: inp.tenor_months,
    T,
    iv: inp.iv,
    risk_free_rate: inp.risk_free_rate,
    dividend_yield: inp.dividend_yield,
    notional: inp.notional,
    shares,
    put_price_per_share: P,
    total_premium: totalPremium,
    coupon_abs_pct: couponAbsPct,
    coupon_annualized_simple_pct: couponSimple,
    coupon_annualized_compounded_pct: couponComp,
    prob_itm_pct: probItm,
    breakeven_st: breakevenSt,
    breakeven_pct_of_spot: breakevenPct,
    max_loss_pct: maxLoss,
    delta: g.delta,
    gamma: g.gamma,
    vega_per_1pct: g.vega_per_1pct,
    theta_per_day: g.theta_per_day,
    d1,
    d2,
    warnings,
  };

  return {
    summary,
    scenarios: buildScenarios(inp, strike, P),
    payoff: buildPayoff(inp, strike, P),
  };
}
