"use client";

import { Illustration } from "../lib/types";
import { money, pct } from "../lib/format";
import { useLang } from "../lib/i18n";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium tabular-nums text-slate-800">{value}</span>
    </div>
  );
}

export default function TermSheet({ ill }: { ill: Illustration }) {
  const { t } = useLang();
  const s = ill.summary;
  const cur = s.currency;

  return (
    <div className="termsheet mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy-900">{t("ts_title")}</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-navy-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800"
        >
          {t("ts_print")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        <div>
          <Row label={t("ts_underlying")} value={s.ticker} />
          <Row label={t("ts_spot")} value={money(s.spot, cur, 2)} />
          <Row label={t("ts_strike")} value={`${money(s.strike, cur, 2)} (${pct(s.strike_pct * 100, 0)})`} />
          <Row label={t("ts_tenor")} value={`${s.tenor_months}M`} />
          <Row label={t("ts_iv")} value={pct(s.iv * 100, 1)} />
          <Row label={t("ts_rate")} value={pct(s.risk_free_rate * 100, 2)} />
          <Row label={t("ts_div")} value={pct(s.dividend_yield * 100, 2)} />
        </div>
        <div>
          <Row label={t("ts_notional")} value={money(s.notional, cur, 0)} />
          <Row label={t("ts_shares")} value={s.shares.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
          <Row label={t("ts_premium")} value={money(s.total_premium, cur, 2)} />
          <Row label={t("ts_coupon_pa")} value={pct(s.coupon_annualized_simple_pct)} />
          <Row label={t("ts_coupon_comp")} value={pct(s.coupon_annualized_compounded_pct)} />
          <Row label={t("ts_coupon_abs")} value={pct(s.coupon_abs_pct)} />
          <Row label={t("ts_settlement")} value={s.settlement === "cash" ? t("settlement_cash") : t("settlement_physical")} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        <Row label={t("ts_breakeven")} value={`${money(s.breakeven_st, cur, 2)} (${pct(s.breakeven_pct_of_spot)})`} />
        <Row label={t("ts_max_loss")} value={pct(s.max_loss_pct)} />
        <Row label={t("ts_prob_itm")} value={pct(s.prob_itm_pct)} />
      </div>

      <p className="mt-4 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
        {s.settlement === "cash" ? t("ts_note_cash") : t("ts_note_physical")}
      </p>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">{t("ts_disclaimer")}</p>
    </div>
  );
}
