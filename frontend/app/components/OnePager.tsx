"use client";

import { useRef, useState } from "react";
import { Illustration } from "../lib/types";
import { money, pct } from "../lib/format";
import { useLang } from "../lib/i18n";
import PayoffChart from "./PayoffChart";

// A single-page, client-shareable summary: brief deal terms + the payoff chart.
// Exports the whole card to a PNG (via html-to-image) so the sales team can drop
// it straight into a client chat. Dynamic-import keeps the DOM-only lib out of SSR.
function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-1.5">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-medium tabular-nums text-slate-800">{value}</div>
    </div>
  );
}

export default function OnePager({ ill }: { ill: Illustration }) {
  const { t } = useLang();
  const s = ill.summary;
  const cur = s.currency;
  const cardRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "working" | "ok" | "failed">("idle");

  const onExport = async () => {
    const node = cardRef.current;
    if (!node) return;
    setState("working");
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ELN-onepager-${s.ticker}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setState("ok");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onExport}
          disabled={state === "working"}
          className={`rounded-md px-3 py-1.5 text-xs font-medium text-white ${
            state === "ok"
              ? "bg-positive"
              : state === "failed"
              ? "bg-negative"
              : "bg-sky-600 hover:bg-sky-500 disabled:opacity-60"
          }`}
        >
          {state === "working"
            ? t("op_img_working")
            : state === "ok"
            ? t("op_img_done")
            : state === "failed"
            ? t("op_img_failed")
            : t("op_image")}
        </button>
      </div>

      <div ref={cardRef} className="onepager rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-navy-900">{t("op_title")}</h2>
          <p className="text-sm text-slate-500">
            {t("ts_underlying")}: <span className="font-semibold text-slate-800">{s.ticker}</span> @ {money(s.spot, cur, 2)} ({cur})
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-x-6 sm:grid-cols-4">
          <Cell label={t("ts_coupon_pa")} value={`${pct(s.coupon_pa_pct)} p.a.`} />
          <Cell label={t("ts_strike")} value={`${pct(s.strike_pct * 100, 0)} · ${money(s.strike, cur, 2)}`} />
          <Cell label={t("ts_tenor")} value={`${s.tenor_months}M`} />
          <Cell label={t("ts_call_level")} value={`${pct(s.call_level_pct, 0)} · ${money(s.call_level_st, cur, 2)}`} />
          <Cell label={t("ts_notional")} value={money(s.notional, cur, 0)} />
          <Cell label={t("ts_settlement")} value={s.settlement === "cash" ? t("settlement_cash") : t("settlement_physical")} />
          <Cell label={t("ts_breakeven")} value={money(s.breakeven_st, cur, 2)} />
          <Cell label={t("ts_max_loss")} value={pct(s.max_loss_pct)} />
        </div>

        <PayoffChart payoff={ill.payoff} s={s} />

        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">{t("ts_disclaimer")}</p>
      </div>
    </div>
  );
}
