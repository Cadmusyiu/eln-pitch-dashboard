// Builds a clean, paste-ready text summary of the ELN structure for the sales team
// to copy into a client message (Slack / WhatsApp / email). Output follows the
// active language. Pure function — no DOM, no React.

import { Illustration } from "./types";
import { money, pct } from "./format";
import { Lang } from "./i18n";

type Dict = Record<string, string>;

const EN: Dict = {
  title: "ELN — Equity Linked Note (Short Put)",
  underlying: "Underlying",
  strike: "Strike",
  tenor: "Tenor",
  coupon: "Coupon",
  overTenor: "over the tenor",
  autocall: "Autocall",
  autocallV: "monthly from month 2, at",
  ncp: "; first month non-callable",
  notional: "Notional",
  settlement: "Settlement",
  cash: "cash",
  physical: "physical delivery",
  atMaturity: "At maturity",
  ifAbove: "Spot at maturity ≥ strike",
  then: "→ return of principal + coupon",
  breakeven: "Breakeven",
  ofSpot: "of spot",
  maxLoss: "Max loss (spot at maturity → 0)",
  disclaimer:
    "Illustrative only — not an offer or solicitation. ELNs involve risk of loss up to the max loss shown.",
};

const ZH: Dict = {
  title: "ELN — 股票掛鈎票據（短認售期權）",
  underlying: "標的",
  strike: "行使價",
  tenor: "年期",
  coupon: "票息",
  overTenor: "全期",
  autocall: "自動贖回",
  autocallV: "自第 2 個月起每月觀察，水平",
  ncp: "；首月不可贖回",
  notional: "本金",
  settlement: "結算方式",
  cash: "現金",
  physical: "實物交收",
  atMaturity: "到期結算",
  ifAbove: "到期股價 ≥ 行使價",
  then: "→ 返還本金 + 票息",
  breakeven: "打和價",
  ofSpot: "佔現價",
  maxLoss: "最大虧損（到期股價 → 0）",
  disclaimer: "僅供演示，非要約或招攬。ELN 可能虧損本金至上限所示金額。",
};

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + " ".repeat(w - s.length);
}

export function buildPitchText(ill: Illustration, lang: Lang): string {
  const s = ill.summary;
  const cur = s.currency;
  const L = lang === "zh" ? ZH : EN;
  const W = 12; // label column width

  return [
    L.title,
    "",
    `${pad(L.underlying, W)}${s.ticker} @ ${money(s.spot, cur, 2)} (${cur})`,
    `${pad(L.strike, W)}${pct(s.strike_pct * 100, 0)} (${money(s.strike, cur, 2)})`,
    `${pad(L.tenor, W)}${s.tenor_months}M`,
    `${pad(L.coupon, W)}${pct(s.coupon_pa_pct)} p.a. (${pct(s.coupon_abs_pct)} ${L.overTenor})`,
    `${pad(L.autocall, W)}${L.autocallV} ${pct(s.call_level_pct, 0)} (${money(s.call_level_st, cur, 2)})${L.ncp}`,
    `${pad(L.notional, W)}${money(s.notional, cur, 0)}`,
    `${pad(L.settlement, W)}${s.settlement === "cash" ? L.cash : L.physical}`,
    "",
    `${L.atMaturity}:`,
    `  ${L.ifAbove} (${money(s.strike, cur, 2)}) ${L.then} (+${pct(s.coupon_abs_pct)})`,
    `  ${L.breakeven}: ${money(s.breakeven_st, cur, 2)} (${pct(s.breakeven_pct_of_spot)} ${L.ofSpot})`,
    `  ${L.maxLoss}: ${pct(s.max_loss_pct)}`,
    "",
    L.disclaimer,
  ].join("\n");
}
