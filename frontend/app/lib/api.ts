import { buildIllustration } from "./engine";
import { Currency, Illustration, MarketData, PricingInput } from "./types";

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

// --------------------------------------------------------------------------- //
// Client-side live spot via Financial Modeling Prep (FMP)
// --------------------------------------------------------------------------- //
// FMP sends `Access-Control-Allow-Origin: *`, so the static GitHub Pages deploy
// can call it directly from the browser — no backend required. Free tier:
// 250 req/day. The API key resolves with this precedence:
//
//   1. localStorage["eln.fmp_key"]   — per-browser, set via the in-app key field.
//                                       NOT in the repo, NOT shipped in the bundle;
//                                       each salesperson uses their own key (quota
//                                       is per-person, not shared).
//   2. NEXT_PUBLIC_FMP_KEY           — optional build-time default (baked into the
//                                       bundle, so publicly readable). Use only if
//                                       you accept a shared, publicly visible key.
const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const ENV_FMP_KEY = process.env.NEXT_PUBLIC_FMP_KEY || "";
const LS_KEY = "eln.fmp_key";

export function readLsFmpKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(LS_KEY) || "";
  } catch {
    return "";
  }
}

export function writeLsFmpKey(k: string): void {
  if (typeof window === "undefined") return;
  try {
    const v = k.trim();
    if (v) window.localStorage.setItem(LS_KEY, v);
    else window.localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function resolveFmpKey(): string {
  return (readLsFmpKey() || ENV_FMP_KEY).trim();
}

export function envFmpKeyPresent(): boolean {
  return ENV_FMP_KEY.length > 0;
}

export function fmpAvailable(): boolean {
  return resolveFmpKey().length > 0;
}

function looksHK(ticker: string): boolean {
  const t = ticker.trim().toUpperCase();
  return t.endsWith(".HK") || (/^\d{1,5}$/.test(t) && !t.includes("."));
}

// FMP expects HKEX symbols as zero-padded 4-digit + ".HK" (0700.HK, 9988.HK).
// US tickers pass through uppercased.
export function normalizeForFmp(ticker: string): string {
  const t = ticker.trim().toUpperCase();
  if (looksHK(t)) {
    const digits = t.replace(/\.HK$/, "").padStart(4, "0");
    return `${digits}.HK`;
  }
  return t;
}

// FMP returns the real currency (USD/HKD/EUR/...). We model only USD & HKD; treat
// anything non-HK as USD for illustration purposes.
function currencyFromFmp(cur: string | undefined, exchange: string | undefined): Currency {
  const c = (cur || "").toUpperCase();
  const ex = (exchange || "").toUpperCase();
  if (c === "HKD" || ex.includes("HK") || ex.includes("HONG")) return "HKD";
  return "USD";
}

export interface LiveSpot {
  spot: number;
  currency: Currency;
}

// GET /v3/quote/{symbol}?apikey=KEY -> [{ symbol, price, currency, exchange, name, ... }]
// Returns null on any error / empty / non-numeric price so the caller shows a
// graceful "fetch failed" and keeps manual input.
export async function fetchLiveSpotFmp(ticker: string): Promise<LiveSpot | null> {
  const key = resolveFmpKey();
  if (!key || !ticker.trim()) return null;
  const sym = normalizeForFmp(ticker);
  try {
    const url = `${FMP_BASE}/quote/${encodeURIComponent(sym)}?apikey=${encodeURIComponent(key)}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const data = await r.json();
    // FMP reports bad keys / unknown symbols as `{ "Error Message": "..." }`
    // (sometimes with HTTP 200) — guard before indexing.
    if (!Array.isArray(data) || data.length === 0) return null;
    const row = data[0];
    const price = typeof row.price === "number" ? row.price : Number(row.price);
    if (!isFinite(price) || price <= 0) return null;
    return { spot: price, currency: currencyFromFmp(row.currency, row.exchange) };
  } catch {
    return null;
  }
}
