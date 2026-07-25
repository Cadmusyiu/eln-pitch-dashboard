"use client";

import { Summary } from "../lib/types";
import { useLang } from "../lib/i18n";

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums text-slate-800">{value}</div>
    </div>
  );
}

export default function GreeksCard({ s }: { s: Summary }) {
  const { t } = useLang();
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-3 font-semibold text-slate-800">{t("greeks_title")}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label={t("g_delta")} value={s.delta.toFixed(3)} />
        <Mini label={t("g_gamma")} value={s.gamma.toFixed(4)} />
        <Mini label={t("g_vega")} value={s.vega_per_1pct.toFixed(3)} />
        <Mini label={t("g_theta")} value={s.theta_per_day.toFixed(4)} />
      </div>
    </div>
  );
}
