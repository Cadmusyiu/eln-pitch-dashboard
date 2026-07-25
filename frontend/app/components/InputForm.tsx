"use client";

import { useState } from "react";
import { LIVE_DATA_ENABLED, fetchMarketData } from "../lib/api";
import { Currency, PricingInput, Settlement } from "../lib/types";
import { useLang } from "../lib/i18n";

interface Props {
  value: PricingInput;
  onChange: (patch: Partial<PricingInput>) => void;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="block text-sm font-medium text-slate-200">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const inputCls =
  "mt-1 w-full rounded-md border border-slate-600 bg-navy-800 px-3 py-2 text-sm text-white " +
  "focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400";

// Text-backed numeric input — see premium-financing InputForm for the rationale
// (a type=number bound to a number snaps "0" back when you clear the last digit).
function NumberField({
  value,
  onValue,
  placeholder,
}: {
  value: number;
  onValue: (n: number) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const displayed = focused ? text : String(value);
  return (
    <input
      type="text"
      inputMode="decimal"
      className={inputCls}
      value={displayed}
      placeholder={placeholder}
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onBlur={() => {
        setFocused(false);
        setText(String(value));
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw === "" || raw === "." || /^[0-9]*\.?[0-9]*$/.test(raw)) {
          onValue(raw === "" || raw === "." ? 0 : Number(raw));
        }
      }}
    />
  );
}

const STRIKE_OPTIONS = [0.85, 0.9, 0.95, 1.0, 1.05];
const TENOR_OPTIONS = [1, 3, 6, 12];

function looksHK(ticker: string): boolean {
  const t = ticker.trim().toUpperCase();
  return t.endsWith(".HK") || (/^\d{1,5}$/.test(t) && !t.includes("."));
}

export function inferCurrency(ticker: string): Currency {
  return looksHK(ticker) ? "HKD" : "USD";
}

export default function InputForm({ value, onChange }: Props) {
  const { t } = useLang();
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "failed">("idle");
  const [ivSource, setIvSource] = useState<"option_chain" | "manual" | "unavailable">("manual");

  const onFetch = async () => {
    if (!LIVE_DATA_ENABLED || !value.ticker.trim()) return;
    setFetching(true);
    setStatus("idle");
    try {
      const md = await fetchMarketData(value.ticker, value.tenor_months, value.strike_pct);
      if (!md) {
        setStatus("failed");
      } else {
        const patch: Partial<PricingInput> = {};
        if (md.spot) patch.spot = md.spot;
        if (md.dividend_yield != null) patch.dividend_yield = md.dividend_yield;
        if (md.iv_default != null) patch.iv = md.iv_default;
        patch.currency = md.currency;
        if (Object.keys(patch).length) onChange(patch);
        setIvSource(md.iv_source);
        setStatus(md.spot ? "ok" : "failed");
      }
    } catch {
      setStatus("failed");
    } finally {
      setFetching(false);
    }
  };

  const ivSourceKey = `iv_source_${ivSource}`;

  return (
    <div className="rounded-xl bg-navy-900 p-5 shadow-lg">
      <h2 className="mb-4 text-lg font-semibold text-white">{t("inputs_title")}</h2>

      <Field label={t("ticker")} hint={t("ticker_hint")}>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            className={inputCls}
            value={value.ticker}
            onChange={(e) =>
              onChange({ ticker: e.target.value.toUpperCase(), currency: inferCurrency(e.target.value) })
            }
          />
          <button
            type="button"
            disabled={!LIVE_DATA_ENABLED || fetching || !value.ticker.trim()}
            onClick={onFetch}
            title={LIVE_DATA_ENABLED ? "" : t("fetch_disabled")}
            className="shrink-0 rounded-md bg-navy-700 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {fetching ? "…" : t("fetch_btn")}
          </button>
        </div>
        {!LIVE_DATA_ENABLED && (
          <span className="mt-1 block text-xs text-slate-500">{t("fetch_disabled")}</span>
        )}
        {status === "ok" && <span className="mt-1 block text-xs text-positive">{t("fetch_ok")}</span>}
        {status === "failed" && <span className="mt-1 block text-xs text-negative">{t("fetch_failed")}</span>}
      </Field>

      <Field label={t("spot")}>
        <NumberField value={value.spot} onValue={(n) => onChange({ spot: n })} />
      </Field>

      <Field label={t("strike_pct")}>
        <select
          className={inputCls}
          value={value.strike_pct}
          onChange={(e) => onChange({ strike_pct: Number(e.target.value) })}
        >
          {STRIKE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {(s * 100).toFixed(0)}%
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("tenor")}>
        <select
          className={inputCls}
          value={value.tenor_months}
          onChange={(e) => onChange({ tenor_months: Number(e.target.value) })}
        >
          {TENOR_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}M
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("iv")} hint={t("iv_hint")}>
        <div className="mt-1 flex items-center gap-2">
          <NumberField value={+(value.iv * 100).toFixed(2)} onValue={(n) => onChange({ iv: n / 100 })} />
          <span className="shrink-0 rounded bg-navy-700 px-2 py-1 text-[11px] text-slate-300">
            {t(ivSourceKey)}
          </span>
        </div>
      </Field>

      <Field label={t("risk_free")}>
        <NumberField value={+(value.risk_free_rate * 100).toFixed(2)} onValue={(n) => onChange({ risk_free_rate: n / 100 })} />
      </Field>

      <Field label={t("div_yield")}>
        <NumberField value={+(value.dividend_yield * 100).toFixed(2)} onValue={(n) => onChange({ dividend_yield: n / 100 })} />
      </Field>

      <Field label={t("notional")}>
        <NumberField value={value.notional} onValue={(n) => onChange({ notional: n })} />
      </Field>

      <Field label={t("settlement")}>
        <div className="mt-1 flex rounded-md bg-navy-800 p-1">
          {(["cash", "physical"] as Settlement[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange({ settlement: s })}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                value.settlement === s ? "bg-white text-navy-900" : "text-slate-300 hover:text-white"
              }`}
            >
              {s === "cash" ? t("settlement_cash") : t("settlement_physical")}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}
