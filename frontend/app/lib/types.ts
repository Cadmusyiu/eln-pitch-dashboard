// Pricing input + output types. The dashboard is now COUPON-DRIVEN: the salesperson
// enters the quoted coupon (p.a.) directly, and the structure (breakeven, max loss,
// payoff, scenarios) is derived from that coupon + strike + tenor — no Black-Scholes
// model in the sales flow. The backend retains the canonical BS engine (pricing.py)
// for the theoretical path; this FE type set is the illustration contract.

export type Currency = "USD" | "HKD";
export type Settlement = "cash" | "physical";

export interface PricingInput {
  ticker: string;
  currency: Currency;
  spot: number;
  strike_pct: number; // 0.95 -> strike = 0.95 × spot
  tenor_months: number; // {1,3,6,12}
  coupon_pa_pct: number; // DIRECT quoted annualized coupon, % (e.g. 9.71 = 9.71% p.a.)
  call_level_pct: number; // autocall level, % of spot (e.g. 100 / 90 / 80 / 70)
  notional: number;
  settlement: Settlement;
}

export interface ScenarioRow {
  st_move_pct: number; // -30, -20, ...
  st: number;
  return_on_notional_pct: number;
  ending_value: number; // notional × (1 + return)
}

export interface PayoffPoint {
  st_pct_of_spot: number; // 50 .. 130
  st: number;
  pnl_per_share: number; // premium − max(K − S_T, 0)
  pnl_on_notional_pct: number;
}

export interface Summary {
  currency: Currency;
  ticker: string;
  settlement: Settlement;

  spot: number;
  strike: number;
  strike_pct: number; // fraction
  tenor_months: number;
  T: number;

  // Coupon (echo of the direct input) + autocall level
  coupon_pa_pct: number; // annualized, %
  coupon_abs_pct: number; // over the tenor = coupon_pa × T, %
  call_level_pct: number; // % of spot
  call_level_st: number; // call_level_pct/100 × spot

  notional: number;
  shares: number;

  total_premium: number; // = coupon_abs_frac × notional (total coupon amount, currency)

  breakeven_st: number; // K − P
  breakeven_pct_of_spot: number;
  max_loss_pct: number; // (K − P)/S0 × 100

  warnings: string[];
}

export interface Illustration {
  summary: Summary;
  scenarios: ScenarioRow[];
  payoff: PayoffPoint[];
}

export interface MarketData {
  ticker: string;
  currency: Currency;
  spot: number | null;
  dividend_yield: number | null;
  iv_default: number | null;
  iv_source: "option_chain" | "manual" | "unavailable";
  as_of: string;
}
