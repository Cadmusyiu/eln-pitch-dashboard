"use client";

import { useState } from "react";
import { Illustration } from "../lib/types";
import { money, pct } from "../lib/format";
import { useLang } from "../lib/i18n";
import { buildPitchText } from "../lib/pitch";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium tabular-nums text-slate-800">{value}</span>
    </div>
  );
}

export default function TermSheet({ ill }: { ill: Illustration }) {
  const { t, lang } = useLang();
  const s = ill.summary;
  const cur = s.currency;
  const [copied, setCopied] = useState<"idle" | "ok" | "failed">("idle");

  // Copy a clean, paste-ready ELN summary (in the active language) for the sales
  // team to drop into a client message. HTTPS on github.io → clipboard API works.
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildPitchText(ill, lang));
      setCopied("ok");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied("idle"), 2500);
  };

  return (
    <div className="termsheet mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-navy-900">{t("ts_title")}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCopy}
            className={`rounded-md px-3 py-1.5 text-xs font-medium text-white ${
              copied === "ok"
                ? "bg-positive"
                : copied === "failed"
                ? "bg-negative"
                : "bg-sky-600 hover:bg-sky-500"
            }`}
          >
            {copied === "ok" ? t("ts_copied") : copied === "failed" ? t("ts_copy_failed") : t("ts_copy")}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-navy-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800"
          >
            {t("ts_print")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        <div>
          <Row label={t("ts_underlying")} value={s.ticker} />
          <Row label={t("ts_spot")} value={money(s.spot, cur, 2)} />
          <Row label={t("ts_strike")} value={`${money(s.strike, cur, 2)} (${pct(s.strike_pct * 100, 0)})`} />
          <Row label={t("ts_tenor")} value={`${s.tenor_months}M`} />
          <Row label={t("ts_call_level")} value={`${pct(s.call_level_pct, 0)} (${money(s.call_level_st, cur, 2)})`} />
        </div>
        <div>
          <Row label={t("ts_notional")} value={money(s.notional, cur, 0)} />
          <Row label={t("ts_shares")} value={s.shares.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
          <Row label={t("ts_premium")} value={money(s.total_premium, cur, 2)} />
          <Row label={t("ts_coupon_pa")} value={pct(s.coupon_pa_pct)} />
          <Row label={t("ts_coupon_abs")} value={pct(s.coupon_abs_pct)} />
          <Row label={t("ts_settlement")} value={s.settlement === "cash" ? t("settlement_cash") : t("settlement_physical")} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        <Row label={t("ts_breakeven")} value={`${money(s.breakeven_st, cur, 2)} (${pct(s.breakeven_pct_of_spot)})`} />
        <Row label={t("ts_max_loss")} value={pct(s.max_loss_pct)} />
      </div>

      <p className="mt-4 rounded-md bg-sky-50 p-3 text-xs text-slate-700">
        {t("ts_call_feature", { level: pct(s.call_level_pct, 0), price: money(s.call_level_st, cur, 2) })}
      </p>

      <p className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
        {s.settlement === "cash" ? t("ts_note_cash") : t("ts_note_physical")}
      </p>

      <p className="mt-4 text-[11px] leading-relaxed text-slate-400">{t("ts_disclaimer")}</p>
    </div>
  );
}
