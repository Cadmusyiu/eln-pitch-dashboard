"use client";

import { ScenarioRow, Currency } from "../lib/types";
import { money, pct, signColor } from "../lib/format";
import { useLang } from "../lib/i18n";

export default function ScenarioTable({ rows, currency }: { rows: ScenarioRow[]; currency: Currency }) {
  const { t } = useLang();
  return (
    <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold text-slate-800">{t("scenario_title")}</h3>
      </div>
      <div className="table-scroll overflow-auto">
        <table className="w-full border-collapse text-right text-sm">
          <thead className="sticky top-0 bg-navy-900 text-white">
            <tr>
              <th className="whitespace-nowrap px-3 py-2 font-medium">{t("th_move")}</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">{t("th_st")}</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">{t("th_return")}</th>
              <th className="whitespace-nowrap px-3 py-2 font-medium">{t("th_ending")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.st_move_pct} className={r.return_on_notional_pct >= 0 ? "bg-green-50/60" : "bg-red-50/60"}>
                <td className="px-3 py-1.5 text-center font-semibold text-slate-700 tabular-nums">
                  {r.st_move_pct > 0 ? `+${r.st_move_pct.toFixed(0)}%` : `${r.st_move_pct.toFixed(0)}%`}
                </td>
                <td className="px-3 py-1.5 tabular-nums text-slate-600">{money(r.st, currency, 2)}</td>
                <td className={`px-3 py-1.5 font-medium tabular-nums ${signColor(r.return_on_notional_pct)}`}>
                  {pct(r.return_on_notional_pct)}
                </td>
                <td className={`px-3 py-1.5 font-medium tabular-nums ${signColor(r.return_on_notional_pct)}`}>
                  {money(r.ending_value, currency, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
