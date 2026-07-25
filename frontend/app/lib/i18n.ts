"use client";

import { createContext, createElement, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "zh";

type Dict = Record<string, string>;

// English is the source of truth; zh is Traditional Chinese (Taipei / HK clients).
const en: Dict = {
  // header / footer
  app_title: "ELN Short-Put Pitch",
  app_subtitle: "Equity Linked Note · short-put pricing & payoff",
  tab_single: "Structure",
  tab_compare: "Compare",
  tab_termsheet: "Term Sheet",
  footer:
    "Figures are illustrative, derived from the inputs shown · not an offer or solicitation · ELNs involve risk of loss up to the max loss shown.",

  // inputs
  inputs_title: "Structure Inputs",
  ticker: "Underlying Ticker",
  ticker_hint: "US (AAPL) or HK (0700 / 0700.HK).",
  fetch_btn: "Fetch live",
  fetch_disabled: "Live data needs the backend running (NEXT_PUBLIC_USE_API).",
  fetch_ok: "Filled live spot + currency.",
  fetch_failed: "Live fetch unavailable — enter spot manually.",
  fetch_no_key: "Add a free FMP API key below to fetch live spot for any ticker.",
  preset_hint: "Type or pick a preset ticker (↓) to auto-fill an indicative spot; confirm with the desk.",
  // FMP API-key management (client-side live data on the static deploy)
  fmp_panel_open: "Live-data API key",
  fmp_panel_set: "Live-data API key: set",
  fmp_panel_hint: "Free at financialmodelingprep.com (250 req/day, CORS-friendly). Stored in this browser only — not in the repo or bundle.",
  fmp_key_label: "FMP API key",
  fmp_key_ph: "paste your free FMP key",
  fmp_key_show: "show",
  fmp_key_save: "Save",
  fmp_key_saved: "Key saved — Fetch live now works.",
  fmp_key_clear: "Clear",
  fmp_key_cleared: "Key cleared.",
  fmp_key_get: "Get a free key →",
  fmp_key_env_note: "A shared key is already configured for this build; saving your own below overrides it.",
  indicative: "indicative — confirm with desk",
  spot: "Spot",
  strike_pct: "Strike (% of spot)",
  strike_hint: "% of spot — type any value, e.g. 95 = 95%.",
  tenor: "Tenor",
  iv: "Implied Vol (σ)",
  iv_hint: "Annualized fraction, e.g. 0.25 = 25%.",
  risk_free: "Risk-free Rate (r)",
  div_yield: "Dividend Yield (q)",
  notional: "Notional",
  settlement: "Settlement",
  settlement_cash: "Cash",
  settlement_physical: "Physical delivery",
  iv_source_option_chain: "IV from option chain",
  iv_source_manual: "IV manual",
  iv_source_unavailable: "IV unavailable",

  // summary cards
  coupon_pa: "Coupon (p.a.)",
  coupon_pa_sub: "simple · over tenor {abs}",
  coupon_abs: "Coupon (absolute)",
  coupon_abs_sub: "over the tenor",
  breakeven: "Breakeven (at expiry)",
  breakeven_sub: "{pct} of spot",
  max_loss: "Max Loss",
  max_loss_sub: "if S_T → 0",
  prob_itm: "P(assigned)",
  prob_itm_sub: "P(S_T < K) ≈ N(−d2)",
  delta: "Put Delta",
  delta_sub: "sensitivity to spot",
  s_spot: "Spot",
  s_strike: "Strike",
  s_tenor: "Tenor",
  s_iv: "IV",
  s_shares: "Shares",
  s_premium: "Total Premium",

  // warnings
  warn_iv_below_realized: "IV is very low (<10%) — check it reflects realistic realized vol.",
  warn_hk_no_iv: "HK underlyings have no free IV feed — confirm IV with the desk before pitching.",
  warn_deep_otm: "Strike is deep OTM (<90%) — higher assignment protection, thinner premium.",
  warn_high_assignment: "Probability of assignment is high (>40%) — closer to buying the stock.",

  // payoff chart
  chart_payoff_title: "Payoff at Expiry · return on notional vs S_T",
  legend_pnl: "Return on notional",
  ref_spot: "spot",
  ref_strike: "strike",
  ref_breakeven: "breakeven",
  ref_call: "call",

  // scenario table
  scenario_title: "Scenario Analysis at Expiry",
  th_move: "S_T move",
  th_st: "S_T",
  th_return: "Return",
  th_ending: "Ending value",

  // greeks
  greeks_title: "Greeks",
  g_delta: "Delta",
  g_gamma: "Gamma",
  g_vega: "Vega (1% vol)",
  g_theta: "Theta (per day)",

  // comparison
  cmp_title: "Strike / Tenor Comparison",
  cmp_col: "{strike} · {tenor}",
  th_metric: "Metric",
  row_coupon_pa: "Coupon p.a.",
  row_coupon_abs: "Coupon abs.",
  row_breakeven: "Breakeven",
  row_max_loss: "Max loss",
  row_prob_itm: "P(assigned)",

  // term sheet
  ts_title: "Term Sheet (illustrative)",
  ts_underlying: "Underlying",
  ts_spot: "Spot",
  ts_strike: "Strike",
  ts_tenor: "Tenor",
  ts_iv: "Implied Vol",
  ts_rate: "Risk-free Rate",
  ts_div: "Dividend Yield",
  ts_notional: "Notional",
  ts_settlement: "Settlement",
  ts_coupon_pa: "Coupon (p.a., simple)",
  ts_coupon_comp: "Coupon (p.a., comp.)",
  ts_coupon_abs: "Coupon (absolute)",
  ts_breakeven: "Breakeven spot",
  ts_max_loss: "Max loss",
  ts_prob_itm: "P(assigned)",
  ts_shares: "Shares",
  ts_premium: "Total premium",
  ts_note_cash: "If S_T ≥ K at expiry: return of principal + coupon. If S_T < K: cash settlement, loss = (K − S_T)/S₀.",
  ts_note_physical: "If S_T ≥ K at expiry: return of principal + coupon. If S_T < K: physical delivery — receive shares at strike K.",
  ts_print: "Print",
  ts_disclaimer:
    "For illustrative purposes only. Not an offer, solicitation, or investment advice. Figures depend on the inputs shown. ELNs can result in loss of principal up to the max loss shown.",

  // coupon-driven inputs + autocall (call feature)
  currency: "Currency",
  coupon_hint: "Annualized coupon paid at maturity if not called and S_T ≥ strike.",
  call_level: "Call Level",
  call_level_hint: "% of spot — observed monthly after the first non-callable month; called if S ≥ level.",
  s_call_level: "Call Level",
  ts_call_level: "Call Level",
  ts_call_feature:
    "Autocall: observed monthly from month 2 (first month non-callable). If S ≥ {level} ({price}) at an observation, the note is called — investor receives principal + accrued coupon, and the note terminates.",
  call_card_title: "Autocall (Call Feature)",
  call_card_level: "Call level",
  call_card_obs: "Observation",
  call_card_obs_v: "Monthly",
  call_card_ncp: "Non-callable",
  call_card_ncp_v: "First month",
  call_card_redemption: "If called: principal + accrued coupon ({coupon} p.a. × months elapsed / 12).",
  warn_call_below_strike:
    "Call level is below strike — unusual; the note could be called while the put is still OTM.",

  lang_en: "EN",
  lang_zh: "中文",
};

const zh: Dict = {
  app_title: "ELN 短認售期權報價",
  app_subtitle: "股票掛鈎票據 · 賣出認售定價與到期結算",
  tab_single: "結構",
  tab_compare: "比較",
  tab_termsheet: "條款表",
  footer: "數字僅供演示，按所示輸入計算 · 非要約或招攬 · ELN 可能虧損至上限所示金額。",

  inputs_title: "結構參數",
  ticker: "標的代號",
  ticker_hint: "美股（AAPL）或港股（0700 / 0700.HK）。",
  fetch_btn: "即時抓取",
  fetch_disabled: "即時資料需啟動 backend（NEXT_PUBLIC_USE_API）。",
  fetch_ok: "已帶入即時 spot + 貨幣。",
  fetch_failed: "即時抓取失敗——請手動輸入 spot。",
  fetch_no_key: "在下方加入免費 FMP API 金鑰，即可抓取任何 ticker 的即時 spot。",
  preset_hint: "輸入或從預設清單（↓）選取代號，自動帶入示意 spot；pitch 前請向交易台確認。",
  // FMP API 金鑰管理（靜態部署上的 client-side 即時資料）
  fmp_panel_open: "即時資料 API 金鑰",
  fmp_panel_set: "即時資料 API 金鑰：已設定",
  fmp_panel_hint: "免費 @ financialmodelingprep.com（每日 250 次、CORS 友善）。只存在此瀏覽器，不入 repo 或 bundle。",
  fmp_key_label: "FMP API 金鑰",
  fmp_key_ph: "貼上你的免費 FMP 金鑰",
  fmp_key_show: "顯示",
  fmp_key_save: "儲存",
  fmp_key_saved: "金鑰已儲存——現可即時抓取。",
  fmp_key_clear: "清除",
  fmp_key_cleared: "已清除金鑰。",
  fmp_key_get: "取得免費金鑰 →",
  fmp_key_env_note: "此 build 已內建共用金鑰；在下方儲存自己的金鑰會覆寫它。",
  indicative: "示意值——請向交易台確認",
  spot: "現價 Spot",
  strike_pct: "行使價（佔現價 %）",
  strike_hint: "佔現價 %——可自由輸入，例如 95 = 95%。",
  tenor: "年期",
  iv: "隱含波動率 σ",
  iv_hint: "年化分率，例如 0.25 = 25%。",
  risk_free: "無風險利率 r",
  div_yield: "股息率 q",
  notional: "本金 Notional",
  settlement: "結算方式",
  settlement_cash: "現金",
  settlement_physical: "實物交收",
  iv_source_option_chain: "IV 來自期權鏈",
  iv_source_manual: "IV 手動",
  iv_source_unavailable: "IV 不可用",

  coupon_pa: "票息（年化）",
  coupon_pa_sub: "簡單 · 全期 {abs}",
  coupon_abs: "票息（絕對）",
  coupon_abs_sub: "全期合計",
  breakeven: "打和價（到期）",
  breakeven_sub: "現價的 {pct}",
  max_loss: "最大虧損",
  max_loss_sub: "當 S_T → 0",
  prob_itm: "被行使機率",
  prob_itm_sub: "P(S_T < K) ≈ N(−d2)",
  delta: "認售 Delta",
  delta_sub: "對現價敏感度",
  s_spot: "現價",
  s_strike: "行使價",
  s_tenor: "年期",
  s_iv: "IV",
  s_shares: "股數",
  s_premium: "總權利金",

  warn_iv_below_realized: "IV 偏低（<10%）——請確認反映真實已實現波動。",
  warn_hk_no_iv: "港股標的無免費 IV 資料——pitch 前請向交易台確認 IV。",
  warn_deep_otm: "行使價深度價外（<90%）——保障較高但權利金較薄。",
  warn_high_assignment: "被行使機率偏高（>40%）——接近直接買入股票。",

  chart_payoff_title: "到期結算 · 本金報酬率 vs S_T",
  legend_pnl: "本金報酬率",
  ref_spot: "現價",
  ref_strike: "行使價",
  ref_breakeven: "打和價",
  ref_call: "贖回",

  scenario_title: "到期情境分析",
  th_move: "S_T 變動",
  th_st: "S_T",
  th_return: "報酬",
  th_ending: "期末價值",

  greeks_title: "希臘值",
  g_delta: "Delta",
  g_gamma: "Gamma",
  g_vega: "Vega（1% 波動）",
  g_theta: "Theta（每日）",

  cmp_title: "行使價／年期比較",
  cmp_col: "{strike} · {tenor}",
  th_metric: "指標",
  row_coupon_pa: "年化票息",
  row_coupon_abs: "絕對票息",
  row_breakeven: "打和價",
  row_max_loss: "最大虧損",
  row_prob_itm: "被行使機率",

  ts_title: "條款表（演示用）",
  ts_underlying: "標的",
  ts_spot: "現價",
  ts_strike: "行使價",
  ts_tenor: "年期",
  ts_iv: "隱含波動率",
  ts_rate: "無風險利率",
  ts_div: "股息率",
  ts_notional: "本金",
  ts_settlement: "結算方式",
  ts_coupon_pa: "票息（年化·簡單）",
  ts_coupon_comp: "票息（年化·複利）",
  ts_coupon_abs: "票息（絕對）",
  ts_breakeven: "打和現價",
  ts_max_loss: "最大虧損",
  ts_prob_itm: "被行使機率",
  ts_shares: "股數",
  ts_premium: "總權利金",
  ts_note_cash: "到期若 S_T ≥ K：返還本金 + 票息。若 S_T < K：現金結算，虧損 = (K − S_T)/S₀。",
  ts_note_physical: "到期若 S_T ≥ K：返還本金 + 票息。若 S_T < K：實物交收——按行使價 K 收取股票。",
  ts_print: "列印",
  ts_disclaimer: "僅供演示，非要約、招攬或投資建議。數字取決於所示輸入。ELN 可能虧損本金至上限所示金額。",

  // coupon 輸入 + 自動贖回（call）
  currency: "貨幣",
  coupon_hint: "未被贖回且到期 S_T ≥ 行使價時支付的年化票息。",
  call_level: "贖回水平",
  call_level_hint: "佔現價 %——首月不可贖回，之後每月觀察，S ≥ 水平即贖回。",
  s_call_level: "贖回水平",
  ts_call_level: "贖回水平",
  ts_call_feature: "自動贖回：自第 2 個月起每月觀察（首月不可贖回）。若觀察日 S ≥ {level}（{price}），票據即被贖回——投資人取回本金 + 應計票息，票據終止。",
  call_card_title: "自動贖回（Call 條款）",
  call_card_level: "贖回水平",
  call_card_obs: "觀察頻率",
  call_card_obs_v: "每月",
  call_card_ncp: "不可贖回期",
  call_card_ncp_v: "首個月",
  call_card_redemption: "若被贖回：本金 + 應計票息（{coupon} 年化 × 經過月數 / 12）。",
  warn_call_below_strike: "贖回水平低於行使價——不常見；票據可能在 put 仍價外時被贖回。",

  lang_en: "EN",
  lang_zh: "中文",
};

const DICTS: Record<Lang, Dict> = { en, zh };

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFunc;
}

const LangContext = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const t: TFunc = (key, params) => {
    let s = DICTS[lang][key] ?? en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return s;
  };
  return createElement(LangContext.Provider, { value: { lang, setLang, t } }, children);
}

export const useLang = () => useContext(LangContext);
