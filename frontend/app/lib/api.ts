import { buildIllustration } from "./engine";
import { Illustration, MarketData, PricingInput } from "./types";

// The dashboard computes client-side by default (instant, no backend needed —
// this is what the static GitHub Pages deploy runs). Set NEXT_PUBLIC_USE_API=true
// and NEXT_PUBLIC_API_URL to route through the FastAPI backend (local or hosted),
// which also enables the live yfinance market-data fetch. On any failure we fall
// back to the TS engine / manual input so the UI never breaks.
const USE_API = process.env.NEXT_PUBLIC_USE_API === "true";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function computePricing(input: PricingInput): Promise<Illustration> {
  if (!USE_API) return buildIllustration(input);
  try {
    const r = await fetch(`${API_BASE}/price`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!r.ok) return buildIllustration(input);
    return (await r.json()) as Illustration;
  } catch {
    return buildIllustration(input);
  }
}

export async function fetchMarketData(
  ticker: string,
  tenorMonths: number,
  strikePct: number
): Promise<MarketData | null> {
  if (!USE_API) return null; // static deploy: manual input only
  try {
    const r = await fetch(
      `${API_BASE}/marketdata?ticker=${encodeURIComponent(ticker)}` +
        `&tenor_months=${tenorMonths}&strike_pct=${strikePct}`
    );
    if (!r.ok) return null;
    return (await r.json()) as MarketData;
  } catch {
    return null;
  }
}

export const LIVE_DATA_ENABLED = USE_API;
