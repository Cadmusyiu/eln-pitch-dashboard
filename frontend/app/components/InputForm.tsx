"use client";

import { useEffect, useState } from "react";
import {
  LIVE_DATA_ENABLED,
  fetchLiveSpotFmp,
  fetchMarketData,
  fmpAvailable,
  envFmpKeyPresent,
  readLsFmpKey,
  writeLsFmpKey,
} from "../lib/api";
import { findPreset, PRESETS } from "../lib/presets";
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

const baseInputCls =
  "w-full rounded-md border border-slate-600 bg-navy-800 px-3 py-2 text-sm text-white " +
  "focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400";
const inputCls = "mt-1 " + baseInputCls;

// Text-backed numeric input — see premium-financing InputForm for the rationale
// (a type=number bound to a number snaps "0" back when you clear the last digit).
// Optional `suffix` (e.g. "%") renders an absolutely-positioned unit label inside the field.
function NumberField({
  value,
  onValue,
  placeholder,
  suffix,
}: {
  value: number;
  onValue: (n: number) => void;
  placeholder?: string;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const displayed = focused ? text : String(value);
  const inputEl = (
    <input
      type="text"
      inputMode="decimal"
      className={suffix ? baseInputCls + " pr-8" : inputCls}
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
  if (!suffix) return inputEl;
  return (
    <div className="relative mt-1">
      {inputEl}
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-slate-400">
        {suffix}
      </span>
    </div>
  );
}

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

  // Live-data availability. FMP key may live in localStorage (per-browser) or be
  // baked in via NEXT_PUBLIC_FMP_KEY; we mirror it into state so the UI reacts when
  // the user saves/clears their key. fmpOn = a usable key exists (LS or env).
  // NOTE: this is a "use client" component but Next still SSRs the initial HTML, so
  // we initialise to empty/false and populate from localStorage in a mount effect —
  // otherwise reading window/localStorage during render causes a hydration mismatch.
  const [fmpOn, setFmpOn] = useState(false);
  const [envFmp] = useState(envFmpKeyPresent()); // build-time constant: same on server & client
  const [keyDraft, setKeyDraft] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyMsg, setKeyMsg] = useState<string>("");

  useEffect(() => {
    setFmpOn(fmpAvailable());
    setKeyDraft(readLsFmpKey());
  }, []);

  // The live button shows whenever the FMP path OR the backend path is usable.
  const liveOn = fmpOn || LIVE_DATA_ENABLED;

  // Derived each render — the ticker is the single source of truth, so no state needed.
  // `presetApplied` is true only when the fields actually hold the preset's values, so the
  // indicative badge never falsely claims a preset is loaded (e.g. on the canonical default).
  const presetMatch = findPreset(value.ticker);
  const presetApplied = !!presetMatch && Math.abs(value.spot - presetMatch.spot) < 1e-9;

  // Fetch live spot. Prefers the client-side FMP path (works on the static deploy);
  // falls back to the backend yfinance path when USE_API is on and no FMP key is set.
  const onFetch = async () => {
    if (!liveOn || !value.ticker.trim()) return;
    setFetching(true);
    setStatus("idle");
    try {
      let spot: number | null = null;
      let currency: Currency | null = null;
      if (fmpOn) {
        const live = await fetchLiveSpotFmp(value.ticker);
        if (live) {
          spot = live.spot;
          currency = live.currency;
        }
      } else if (LIVE_DATA_ENABLED) {
        const md = await fetchMarketData(value.ticker, value.tenor_months, value.strike_pct);
        if (md) {
          spot = md.spot;
          currency = md.currency;
        }
      }
      if (spot == null || !currency) {
        setStatus("failed");
      } else {
        onChange({ spot, currency });
        setStatus("ok");
      }
    } catch {
      setStatus("failed");
    } finally {
      setFetching(false);
    }
  };

  const saveKey = () => {
    writeLsFmpKey(keyDraft);
    const on = fmpAvailable();
    setFmpOn(on);
    setKeyMsg(on ? "fmp_key_saved" : "fmp_key_cleared");
  };

  const clearKey = () => {
    writeLsFmpKey("");
    setKeyDraft("");
    setFmpOn(fmpAvailable()); // may still be on via env
    setKeyMsg("fmp_key_cleared");
  };

  const panelLabel = fmpOn ? t("fmp_panel_set") : t("fmp_panel_open");

  return (
    <div className="rounded-xl bg-navy-900 p-5 shadow-lg">
      <h2 className="mb-4 text-lg font-semibold text-white">{t("inputs_title")}</h2>

      <Field label={t("ticker")} hint={t("ticker_hint")}>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            className={inputCls}
            list="ticker-presets"
            value={value.ticker}
            onChange={(e) => {
              const tk = e.target.value.toUpperCase();
              const p = findPreset(tk);
              if (p) {
                // Matched a curated underlying — fill indicative spot + currency.
                onChange({
                  ticker: tk,
                  currency: p.currency,
                  spot: p.spot,
                });
              } else {
                // Unknown ticker — keep fields as-is, just infer currency.
                onChange({ ticker: tk, currency: inferCurrency(tk) });
              }
            }}
          />
          {liveOn && (
            <button
              type="button"
              disabled={fetching || !value.ticker.trim()}
              onClick={onFetch}
              className="shrink-0 rounded-md bg-navy-700 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {fetching ? "…" : t("fetch_btn")}
            </button>
          )}
        </div>
        {/* Native autocomplete fed by the curated basket — works on the static deploy. */}
        <datalist id="ticker-presets">
          {PRESETS.map((p) => (
            <option key={p.ticker} value={p.ticker}>
              {p.name}
            </option>
          ))}
        </datalist>
        {presetApplied ? (
          <span className="mt-1 block text-xs text-sky-300">
            {presetMatch?.name} · {t("indicative")}
          </span>
        ) : (
          !liveOn && <span className="mt-1 block text-xs text-slate-500">{t("fetch_no_key")}</span>
        )}
        {status === "ok" && <span className="mt-1 block text-xs text-positive">{t("fetch_ok")}</span>}
        {status === "failed" && (
          <span className="mt-1 block text-xs text-negative">
            {looksHK(value.ticker) ? t("fetch_failed_hk") : t("fetch_failed")}
          </span>
        )}
      </Field>

      {/* Live-data API key (client-side FMP). Collapsible; only needed on the static
          deploy without a baked-in env key. Per-browser, never committed. */}
      <div className="mb-4 rounded-md border border-slate-700 bg-navy-800/50">
        <button
          type="button"
          onClick={() => setKeyOpen((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-slate-200 hover:text-white"
        >
          <span className={fmpOn ? "text-positive" : ""}>
            {fmpOn ? "● " : "○ "}
            {panelLabel}
          </span>
          <span className="text-slate-400">{keyOpen ? "▾" : "▸"}</span>
        </button>
        {keyOpen && (
          <div className="border-t border-slate-700 px-3 py-3">
            <p className="mb-2 text-xs leading-relaxed text-slate-400">{t("fmp_panel_hint")}</p>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                className={baseInputCls}
                placeholder={t("fmp_key_ph")}
                value={keyDraft}
                onChange={(e) => {
                  setKeyDraft(e.target.value);
                  setKeyMsg("");
                }}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={saveKey}
                className="shrink-0 rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500"
              >
                {t("fmp_key_save")}
              </button>
              {(keyDraft || fmpOn) && (
                <button
                  type="button"
                  onClick={clearKey}
                  className="shrink-0 rounded-md bg-navy-700 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-navy-800"
                >
                  {t("fmp_key_clear")}
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={showKey}
                  onChange={(e) => setShowKey(e.target.checked)}
                  className="h-3 w-3"
                />
                {t("fmp_key_show")}
              </label>
              <a
                href="https://site.financialmodelingprep.com/developer/docs"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300"
              >
                {t("fmp_key_get")}
              </a>
            </div>
            {keyMsg && <span className="mt-2 block text-xs text-positive">{t(keyMsg)}</span>}
            {envFmp && !fmpOn && (
              <span className="mt-2 block text-xs text-slate-500">{t("fmp_key_env_note")}</span>
            )}
          </div>
        )}
      </div>

      <Field label={t("spot")}>
        <NumberField value={value.spot} onValue={(n) => onChange({ spot: n })} />
      </Field>

      <Field label={t("currency")}>
        <div className="mt-1 flex rounded-md bg-navy-800 p-1">
          {(["USD", "HKD"] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ currency: c })}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                value.currency === c ? "bg-white text-navy-900" : "text-slate-300 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("strike_pct")} hint={t("strike_hint")}>
        <NumberField
          value={+(value.strike_pct * 100).toFixed(2)}
          onValue={(n) => onChange({ strike_pct: n / 100 })}
          suffix="%"
        />
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

      {/* No Black-Scholes model in the sales flow — the coupon (p.a.) is a direct desk
          quote. The structure (breakeven, max loss, payoff) is derived from it. */}

      <Field label={t("coupon_pa")} hint={t("coupon_hint")}>
        <NumberField value={value.coupon_pa_pct} onValue={(n) => onChange({ coupon_pa_pct: n })} suffix="%" />
      </Field>

      <Field label={t("call_level")} hint={t("call_level_hint")}>
        <NumberField value={value.call_level_pct} onValue={(n) => onChange({ call_level_pct: n })} suffix="%" />
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
