"use client";

import { Summary } from "../lib/types";
import { money, pct } from "../lib/format";
import { useLang } from "../lib/i18n";

// Summarises the autocall (call) feature. The note is callable monthly after a
// non-callable first month; if S ≥ call level at an observation it is redeemed early
// at principal + accrued coupon. We disclose the terms here — call probability is not
// modelled (no MC in the sales flow).
export default function CallFeatureCard({ s }: { s: Summary }) {
  const { t } = useLang();
  const cur = s.currency;
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-2 font-semibold text-slate-800">{t("call_card_title")}</h3>
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">{t("call_card_level")}</dt>
          <dd className="text-right tabular-nums text-slate-800">
            {pct(s.call_level_pct, 0)} <span className="text-slate-400">({money(s.call_level_st, cur, 2)})</span>
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">{t("call_card_obs")}</dt>
          <dd className="text-slate-800">{t("call_card_obs_v")}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-slate-500">{t("call_card_ncp")}</dt>
          <dd className="text-slate-800">{t("call_card_ncp_v")}</dd>
        </div>
      </dl>
      <p className="mt-3 rounded-md bg-sky-50 p-2 text-xs leading-relaxed text-slate-700">
        {t("call_card_redemption", { coupon: pct(s.coupon_pa_pct) })}
      </p>
    </div>
  );
}
