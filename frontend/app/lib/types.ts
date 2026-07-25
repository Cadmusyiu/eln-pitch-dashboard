// Pricing input + output types. Field names MIRROR backend/pricing.py dataclasses
// exactly — the FE/Python sync is by convention (see lib/engine.ts).

export type Currency = "USD" | "HKD";
export type Settlement = "cash" | "physical";

export interface PricingInput {
  ticker: string;
  spot: number;
  strike_pct: number; // 0.95 -> strike = 0.95 × spot
  tenor_months: number; // {1,3,6,12}
  iv: number; // σ, fraction
  risk_free_rate: number; // r, fraction (continuous)
  dividend_yield: number; // q, fraction (continuous)
  notional: number;
  currency: Currency;
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

  iv: number; // fraction
  risk_free_rate: number; // fraction
  dividend_yield: number; // fraction

  notional: number;
  shares: number;

  put_price_per_share: number;
  total_premium: number;

  coupon_abs_pct: number;
  coupon_annualized_simple_pct: number;
  coupon_annualized_compounded_pct: number;

  prob_itm_pct: number;
  breakeven_st: number;
  breakeven_pct_of_spot: number;
  max_loss_pct: number;

  delta: number;
  gamma: number;
  vega_per_1pct: number;
  theta_per_day: number;

  d1: number;
  d2: number;

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
  iv_default: number | null; // null for HK (no option chain)
  iv_source: "option_chain" | "manual" | "unavailable";
  as_of: string;
}
