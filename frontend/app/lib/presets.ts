// Curated basket of underlyings for the static (GitHub Pages) deploy, where no
// free quote API is reachable from the browser (Yahoo 429s even from a residential
// IP; Stooq's CSV endpoint 404s). These are INDICATIVE seeds — spot/dividend/IV are
// ballpark figures the salesperson confirms with the desk before pitching (the
// warn_hk_no_iv / warn_iv_below_realized guards already push for desk confirmation).
//
// To add or remove a name, just edit PRESETS below. Live yfinance auto-fill is still
// available in local full-stack mode (NEXT_PUBLIC_USE_API=true + the FastAPI backend):
// picking a preset fills indicative values instantly, then "Fetch live" refines them.

export interface Preset {
  ticker: string; // canonical symbol, also the datalist value + match key
  name: string; // human-readable label shown in the dropdown + badge
  currency: "USD" | "HKD";
  spot: number;
  dividend_yield: number; // continuous, fraction (e.g. 0.005 = 0.5%)
  iv: number; // annualized, fraction (e.g. 0.26 = 26%)
}

// Indicative seeds — confirm spot/IV with the desk before pitching.
export const PRESETS: Preset[] = [
  // ── US megacap (USD) ──────────────────────────────────────────────────────
  { ticker: "AAPL", name: "Apple Inc.", currency: "USD", spot: 225, dividend_yield: 0.005, iv: 0.26 },
  { ticker: "MSFT", name: "Microsoft Corp.", currency: "USD", spot: 430, dividend_yield: 0.007, iv: 0.24 },
  { ticker: "NVDA", name: "NVIDIA Corp.", currency: "USD", spot: 175, dividend_yield: 0.0003, iv: 0.45 },
  { ticker: "AMZN", name: "Amazon.com Inc.", currency: "USD", spot: 220, dividend_yield: 0, iv: 0.32 },
  { ticker: "GOOGL", name: "Alphabet Inc. (A)", currency: "USD", spot: 190, dividend_yield: 0, iv: 0.28 },
  { ticker: "META", name: "Meta Platforms Inc.", currency: "USD", spot: 560, dividend_yield: 0.0003, iv: 0.35 },
  { ticker: "TSLA", name: "Tesla Inc.", currency: "USD", spot: 250, dividend_yield: 0, iv: 0.55 },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", currency: "USD", spot: 230, dividend_yield: 0.022, iv: 0.26 },

  // ── HK bluechips (HKD) ────────────────────────────────────────────────────
  { ticker: "0700.HK", name: "Tencent Holdings", currency: "HKD", spot: 500, dividend_yield: 0.008, iv: 0.32 },
  { ticker: "9988.HK", name: "Alibaba Group", currency: "HKD", spot: 85, dividend_yield: 0.01, iv: 0.38 },
  { ticker: "1299.HK", name: "AIA Group", currency: "HKD", spot: 55, dividend_yield: 0.015, iv: 0.3 },
  { ticker: "0005.HK", name: "HSBC Holdings", currency: "HKD", spot: 75, dividend_yield: 0.05, iv: 0.25 },
  { ticker: "0941.HK", name: "China Mobile", currency: "HKD", spot: 95, dividend_yield: 0.04, iv: 0.24 },
  { ticker: "0388.HK", name: "Hong Kong Exchanges", currency: "HKD", spot: 280, dividend_yield: 0.025, iv: 0.3 },
];

// Normalize for fuzzy matching: "0700.HK", "0700", "700" all collapse to "700";
// US tickers normalize to their uppercased form. This lets sales type the bare HK
// code without the ".HK" suffix or leading zeros.
export function normalizeTicker(raw: string): string {
  let t = raw.trim().toUpperCase().replace(".HK", "");
  if (/^\d+$/.test(t)) t = t.replace(/^0+/, "") || "0"; // HK numeric code, strip leading zeros
  return t;
}

export function findPreset(ticker: string): Preset | undefined {
  const key = normalizeTicker(ticker);
  return PRESETS.find((p) => normalizeTicker(p.ticker) === key);
}
