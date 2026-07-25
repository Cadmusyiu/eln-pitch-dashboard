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
  const data = payoff.map((p) => ({
    st_pct: +p.st_pct_of_spot.toFixed(2),
    pnl: +p.pnl_on_notional_pct.toFixed(4),
  }));

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
          <ReferenceLine x={+s.call_level_pct.toFixed(1)} stroke="#7c3aed" strokeDasharray="4 3" label={{ value: t("ref_call"), fontSize: 10, fill: "#6d28d9", position: "insideTopRight" }} />
          <ReferenceLine x={100} stroke="#1b3a68" strokeDasharray="4 3" label={{ value: t("ref_spot"), fontSize: 10, fill: "#1b3a68", position: "insideBottomRight" }} />
          <ReferenceLine x={+(s.strike_pct * 100).toFixed(1)} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: t("ref_strike"), fontSize: 10, fill: "#b45309", position: "insideTopLeft" }} />
          <ReferenceLine x={+s.breakeven_pct_of_spot.toFixed(1)} stroke="#d93025" strokeDasharray="2 2" label={{ value: t("ref_breakeven"), fontSize: 10, fill: "#b91c1c", position: "insideBottomLeft" }} />
          <Line type="monotone" dataKey="pnl" stroke="#0f9d58" strokeWidth={2.5} dot={false} name={t("legend_pnl")} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
