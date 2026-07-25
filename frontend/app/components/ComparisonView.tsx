"use client";

import { buildIllustration } from "../lib/engine";
import { PricingInput, Summary } from "../lib/types";
import { money, pct } from "../lib/format";
import { useLang } from "../lib/i18n";

// Compare the base structure against a lower-strike and a longer-tenor variant,
// so sales can show the coupon / risk trade-off in one glance.
function variants(base: PricingInput): { label: string; s: Summary }[] {
  const lowerStrike = Math.max(0.85, Math.round((base.strike_pct - 0.05) * 100) / 100);
  const longerTenor = base.tenor_months >= 12 ? 6 : base.tenor_months * 2;
  const defs: { label: string; patch: Partial<PricingInput> }[] = [
    { label: t_strikeTenor(base.strike_pct, base.tenor_months), patch: {} },
    { label: t_strikeTenor(lowerStrike, base.tenor_months), patch: { strike_pct: lowerStrike } },
    { label: t_strikeTenor(base.strike_pct, longerTenor), patch: { tenor_months: longerTenor } },
  ];
  return defs.map((d) => ({ label: d.label, s: buildIllustration({ ...base, ...d.patch }).summary }));
}

function t_strikeTenor(strikePct: number, tenor: number): string {
  return `${(strikePct * 100).toFixed(0)}% · ${tenor}M`;
}

export default function ComparisonView({ base }: { base: PricingInput }) {
  const { t } = useLang();
  const cols = variants(base);
  const cur = base.currency;
  const bestCoupon = Math.max(...cols.map((c) => c.s.coupon_pa_pct));

  const rows: { label: string; render: (s: Summary) => string; cls?: string }[] = [
    { label: t("row_coupon_pa"), render: (s) => pct(s.coupon_pa_pct), cls: "font-semibold" },
    { label: t("row_coupon_abs"), render: (s) => pct(s.coupon_abs_pct) },
    { label: t("row_breakeven"), render: (s) => money(s.breakeven_st, cur, 2) },
    { label: t("row_max_loss"), render: (s) => pct(s.max_loss_pct) },
  ];

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-3 font-semibold text-slate-800">{t("cmp_title")}</h3>
      <div className="table-scroll overflow-auto">
        <table className="w-full border-collapse text-right text-sm">
          <thead className="bg-navy-900 text-white">
            <tr>
              <th className="px-3 py-2 text-left font-medium">{t("th_metric")}</th>
              {cols.map((c, i) => (
                <th key={i} className="whitespace-nowrap px-3 py-2 font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-slate-100">
                <td className="px-3 py-1.5 text-left text-slate-600">{r.label}</td>
                {cols.map((c, i) => {
                  const isBestCoupon =
                    r.label === t("row_coupon_pa") &&
                    c.s.coupon_pa_pct === bestCoupon;
                  return (
                    <td
                      key={i}
                      className={`px-3 py-1.5 tabular-nums ${r.cls ?? ""} ${
                        isBestCoupon ? "text-positive" : "text-slate-800"
                      }`}
                    >
                      {r.render(c.s)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
