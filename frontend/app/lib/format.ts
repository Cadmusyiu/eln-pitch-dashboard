import { Currency } from "./types";

const SYMBOLS: Record<Currency, string> = {
  USD: "$",
  HKD: "HK$",
};

export function money(n: number, currency: Currency = "USD", decimals = 0): string {
  const sym = SYMBOLS[currency] ?? "";
  return (
    sym +
    n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function pct(n: number | null, decimals = 2): string {
  if (n === null || Number.isNaN(n)) return "—";
  return (
    n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + "%"
  );
}

export function signColor(n: number | null): string {
  if (n === null) return "text-slate-500";
  return n >= 0 ? "text-positive" : "text-negative";
}
