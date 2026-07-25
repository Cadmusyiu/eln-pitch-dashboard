// Curated basket of underlyings for the static (GitHub Pages) deploy, where no
// free quote API is reachable from the browser (Yahoo 429s even from a residential
// IP; Stooq's CSV endpoint 404s). These are INDICATIVE spot seeds — the salesperson
// confirms spot with the desk before pitching (the coupon is entered directly, and
// the desk quotes it).
//
// To add or remove a name, just edit PRESETS below. Live yfinance spot auto-fill is
// still available in local full-stack mode (NEXT_PUBLIC_USE_API=true + FastAPI):
// picking a preset fills the indicative spot instantly, then "Fetch live" refines it.

export interface Preset {
  ticker: string; // canonical symbol, also the datalist value + match key
  name: string; // human-readable label shown in the dropdown + badge
  currency: "USD" | "HKD";
  spot: number; // indicative, editable
}

// Indicative spot seeds — confirm with the desk before pitching.
export const PRESETS: Preset[] = [
  // ── US megacap (USD) ──────────────────────────────────────────────────────
  { ticker: "AAPL", name: "Apple Inc.", currency: "USD", spot: 225 },
  { ticker: "MSFT", name: "Microsoft Corp.", currency: "USD", spot: 430 },
  { ticker: "NVDA", name: "NVIDIA Corp.", currency: "USD", spot: 175 },
  { ticker: "AMZN", name: "Amazon.com Inc.", currency: "USD", spot: 220 },
  { ticker: "GOOGL", name: "Alphabet Inc. (A)", currency: "USD", spot: 190 },
  { ticker: "META", name: "Meta Platforms Inc.", currency: "USD", spot: 560 },
  { ticker: "TSLA", name: "Tesla Inc.", currency: "USD", spot: 250 },
  { ticker: "JPM", name: "JPMorgan Chase & Co.", currency: "USD", spot: 230 },

  // ── HK bluechips (HKD) ────────────────────────────────────────────────────
  { ticker: "0700.HK", name: "Tencent Holdings", currency: "HKD", spot: 500 },
  { ticker: "9988.HK", name: "Alibaba Group", currency: "HKD", spot: 85 },
  { ticker: "1299.HK", name: "AIA Group", currency: "HKD", spot: 55 },
  { ticker: "0005.HK", name: "HSBC Holdings", currency: "HKD", spot: 75 },
  { ticker: "0941.HK", name: "China Mobile", currency: "HKD", spot: 95 },
  { ticker: "0388.HK", name: "Hong Kong Exchanges", currency: "HKD", spot: 280 },
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
