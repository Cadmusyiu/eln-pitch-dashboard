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
// FMP migrated to /stable/* on 2025-08-31; the legacy /api/v3/* quote route now
// 403s for keys created after that date. Free plan = US exchanges only — HKEX
// symbols (0700.HK, 9988.HK, …) return HTTP 402 "premium", so HK stays manual.
const FMP_BASE = "https://financialmodelingprep.com/stable";
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

// /stable/quote has no `currency` field, so infer from exchange (NASDAQ/NYSE → USD),
// falling back to the ticker (.HK / pure digits → HKD).
function currencyFromFmp(ticker: string, exchange: string | undefined): Currency {
  const ex = (exchange || "").toUpperCase();
  if (ex.includes("HK") || ex.includes("HONG")) return "HKD";
  return looksHK(ticker) ? "HKD" : "USD";
}

export type LiveSpotResult =
  | { ok: true; spot: number; currency: Currency }
  | { ok: false; reason: "nokey" | "premium" | "notfound" | "error" };

// GET /stable/quote?symbol=SYM&apikey=KEY -> [{ symbol, name, price, exchange, ... }]
// (no `currency` field — inferred in currencyFromFmp). FMP's FREE plan covers only a
// curated set of popular US large-caps; HKEX, ADRs, and some share classes return
// HTTP 402 "premium". We return a discriminated result so the UI can tell the user
// WHY a fetch failed (paid plan vs not-found vs network) — not just "failed".
export async function fetchLiveSpotFmp(ticker: string): Promise<LiveSpotResult> {
  const tk = ticker.trim();
  const key = resolveFmpKey();
  if (!key || !tk) return { ok: false, reason: "nokey" };
  // HKEX is always premium on the free plan — short-circuit to save a quota call
  // and give instant feedback.
  if (looksHK(tk)) return { ok: false, reason: "premium" };
  const sym = normalizeForFmp(tk);
  try {
    const url = `${FMP_BASE}/quote?symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`;
    const r = await fetch(url);
    if (r.status === 402) return { ok: false, reason: "premium" };
    if (r.status === 404) return { ok: false, reason: "notfound" };
    if (!r.ok) return { ok: false, reason: "error" };
    const data = await r.json();
    // FMP reports bad keys as `{ "Error Message": "..." }` — guard before indexing.
    if (!Array.isArray(data) || data.length === 0) return { ok: false, reason: "notfound" };
    const row = data[0];
    const price = typeof row.price === "number" ? row.price : Number(row.price);
    if (!isFinite(price) || price <= 0) return { ok: false, reason: "notfound" };
    return { ok: true, spot: price, currency: currencyFromFmp(tk, row.exchange) };
  } catch {
    return { ok: false, reason: "error" };
  }
}
