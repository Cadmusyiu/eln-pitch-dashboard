"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PayoffPoint, Summary } from "../lib/types";
import { money } from "../lib/format";
import { useLang } from "../lib/i18n";

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h3 className="mb-3 font-semibold text-slate-800">{title}</h3>
      <div style={{ width: "100%", height: 300 }}>{children}</div>
    </div>
  );
}

export default function PayoffChart({ payoff, s }: { payoff: PayoffPoint[]; s: Summary }) {
  const { t } = useLang();
  const cur = s.currency;
  const data = payoff.map((p) => ({
    st_pct: +p.st_pct_of_spot.toFixed(2),
    pnl: +p.pnl_on_notional_pct.toFixed(4),
  }));

  // Reference-line legend lives BELOW the chart (not as on-chart labels) so the
  // strike / breakeven / call / spot captions can never overlap. Each swatch
  // mirrors its line (color + dash) and shows the % of spot plus the absolute
  // price — more useful to a client than a crowded in-chart label.
  const legend = [
    { key: "spot", label: t("ref_spot"), color: "#1b3a68", dash: "solid", pct: "100.0", price: money(s.spot, cur, 2) },
    { key: "strike", label: t("ref_strike"), color: "#f59e0b", dash: "dashed", pct: (s.strike_pct * 100).toFixed(1), price: money(s.strike, cur, 2) },
    { key: "breakeven", label: t("ref_breakeven"), color: "#d93025", dash: "dotted", pct: s.breakeven_pct_of_spot.toFixed(1), price: money(s.breakeven_st, cur, 2) },
    { key: "call", label: t("ref_call"), color: "#7c3aed", dash: "dashed", pct: s.call_level_pct.toFixed(1), price: money(s.call_level_st, cur, 2) },
  ];

  return (
    <ChartCard title={t("chart_payoff_title")}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="st_pct"
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
            type="number"
            domain={[0, 130]}
          />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={48} />
          <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} labelFormatter={(l) => `${t("ref_st")} = ${l}% of spot`} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <ReferenceLine x={+s.call_level_pct.toFixed(1)} stroke="#7c3aed" strokeDasharray="4 3" />
          <ReferenceLine x={100} stroke="#1b3a68" strokeDasharray="4 3" />
          <ReferenceLine x={+(s.strike_pct * 100).toFixed(1)} stroke="#f59e0b" strokeDasharray="4 3" />
          <ReferenceLine x={+s.breakeven_pct_of_spot.toFixed(1)} stroke="#d93025" strokeDasharray="2 2" />
          <Line type="monotone" dataKey="pnl" stroke="#0f9d58" strokeWidth={2.5} dot={false} name={t("legend_pnl")} />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        {legend.map((it) => (
          <span key={it.key} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              style={{ display: "inline-block", width: 20, height: 0, borderTop: `2.5px ${it.dash} ${it.color}` }}
            />
            <span className="text-slate-500">{it.label}</span>
            <span className="font-semibold tabular-nums text-slate-800">{it.pct}%</span>
            <span className="text-slate-400">· {it.price}</span>
          </span>
        ))}
      </div>
    </ChartCard>
  );
}
