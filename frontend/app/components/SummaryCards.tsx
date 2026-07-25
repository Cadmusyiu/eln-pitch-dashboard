"use client";

import { Summary } from "../lib/types";
import { money, pct, signColor } from "../lib/format";
import { useLang } from "../lib/i18n";

function Card({
  label,
  value,
  valueClass = "text-slate-900",
  sub,
  highlight = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 shadow-sm ring-1 ${
        highlight ? "bg-navy-900 ring-navy-700" : "bg-white ring-slate-200"
      }`}
    >
      <div
        className={`text-xs font-medium uppercase tracking-wide ${
          highlight ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${valueClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export default function SummaryCards({ s }: { s: Summary }) {
  const { t } = useLang();
  const cur = s.currency;
  const tenorLabel = `${s.tenor_months}M`;

  return (
    <div>
      {s.warnings.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {s.warnings.map((w, i) => (
            <div key={i}>⚠ {t(w)}</div>
          ))}
        </div>
      )}

      {/* Headline row — the client-facing numbers */}
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card
          label={t("coupon_pa")}
          value={pct(s.coupon_annualized_simple_pct)}
          valueClass="text-positive"
          sub={t("coupon_pa_sub", { abs: pct(s.coupon_abs_pct) })}
          highlight
        />
        <Card
          label={t("coupon_abs")}
          value={pct(s.coupon_abs_pct)}
          valueClass="text-positive"
          sub={t("coupon_abs_sub")}
        />
        <Card
          label={t("breakeven")}
          value={money(s.breakeven_st, cur, 2)}
          valueClass="text-slate-900"
          sub={t("breakeven_sub", { pct: pct(s.breakeven_pct_of_spot) })}
        />
        <Card
          label={t("max_loss")}
          value={pct(s.max_loss_pct)}
          valueClass="text-negative"
          sub={t("max_loss_sub")}
        />
        <Card
          label={t("prob_itm")}
          value={pct(s.prob_itm_pct)}
          valueClass={s.prob_itm_pct > 40 ? "text-negative" : "text-slate-900"}
          sub={t("prob_itm_sub")}
        />
      </div>

      {/* Structure row — the deal terms */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card label={t("s_spot")} value={money(s.spot, cur, 2)} />
        <Card label={t("s_strike")} value={money(s.strike, cur, 2)} sub={`${pct(s.strike_pct * 100, 0)} of spot`} />
        <Card label={t("s_tenor")} value={tenorLabel} />
        <Card label={t("s_iv")} value={pct(s.iv * 100, 1)} />
        <Card label={t("s_shares")} value={s.shares.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
        <Card label={t("s_premium")} value={money(s.total_premium, cur, 0)} />
      </div>
    </div>
  );
}
