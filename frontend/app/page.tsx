"use client";

import { useEffect, useMemo, useState } from "react";
import InputForm from "./components/InputForm";
import SummaryCards from "./components/SummaryCards";
import PayoffChart from "./components/PayoffChart";
import ScenarioTable from "./components/ScenarioTable";
import CallFeatureCard from "./components/CallFeatureCard";
import ComparisonView from "./components/ComparisonView";
import TermSheet from "./components/TermSheet";
import OnePager from "./components/OnePager";
import { buildIllustration } from "./lib/engine";
import { PricingInput } from "./lib/types";
import { LangProvider, useLang, Lang } from "./lib/i18n";

// Canonical example: AAPL short-put, 95% strike, 3M, 9.71% p.a. coupon, 100% call.
const DEFAULT_INPUT: PricingInput = {
  ticker: "AAPL",
  currency: "USD",
  spot: 190,
  strike_pct: 0.95,
  tenor_months: 3,
  coupon_pa_pct: 9.71,
  call_level_pct: 100,
  notional: 100_000,
  settlement: "cash",
};

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function LangToggle() {
  const { lang, setLang, t } = useLang();
  const langs: Lang[] = ["en", "zh"];
  return (
    <div className="flex rounded-lg bg-navy-800 p-1">
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            lang === l ? "bg-white text-navy-900" : "text-slate-300 hover:text-white"
          }`}
        >
          {l === "en" ? t("lang_en") : t("lang_zh")}
        </button>
      ))}
    </div>
  );
}

type Tab = "single" | "compare" | "termsheet" | "onepager";

function Dashboard() {
  const { t } = useLang();
  const [input, setInput] = useState<PricingInput>(DEFAULT_INPUT);
  const [tab, setTab] = useState<Tab>("single");
  const debounced = useDebounced(input, 300);

  const illustration = useMemo(() => buildIllustration(debounced), [debounced]);

  const onChange = (patch: Partial<PricingInput>) => setInput((prev) => ({ ...prev, ...patch }));

  return (
    <div className="min-h-screen">
      <header className="bg-navy-900 px-4 py-4 shadow-md sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-white sm:text-xl">{t("app_title")}</h1>
            <p className="text-xs text-slate-300 sm:text-sm">{t("app_subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-navy-800 p-1">
              {(["single", "compare", "termsheet", "onepager"] as Tab[]).map((tb) => (
                <button
                  key={tb}
                  onClick={() => setTab(tb)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                    tab === tb ? "bg-white text-navy-900" : "text-slate-300 hover:text-white"
                  }`}
                >
                  {tb === "single"
                    ? t("tab_single")
                    : tb === "compare"
                    ? t("tab_compare")
                    : tb === "termsheet"
                    ? t("tab_termsheet")
                    : t("tab_onepager")}
                </button>
              ))}
            </div>
            <LangToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <aside>
            <InputForm value={input} onChange={onChange} />
          </aside>

          <section className="space-y-6">
            {tab === "single" && (
              <>
                <SummaryCards s={illustration.summary} />
                <PayoffChart payoff={illustration.payoff} s={illustration.summary} />
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
                  <ScenarioTable rows={illustration.scenarios} currency={illustration.summary.currency} />
                  <CallFeatureCard s={illustration.summary} />
                </div>
              </>
            )}
            {tab === "compare" && <ComparisonView base={debounced} />}
            {tab === "termsheet" && <TermSheet ill={illustration} />}
            {tab === "onepager" && <OnePager ill={illustration} />}
          </section>
        </div>
      </main>

      <footer className="px-4 py-4 text-center sm:px-6">
        <p className="text-xs text-slate-400">{t("footer")}</p>
        <div className="mt-2 text-xs">
          <span className="text-slate-400">{t("footer_powered")} </span>
          <span className="font-bold tracking-[0.2em] text-navy-700">CADAI</span>
        </div>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <LangProvider>
      <Dashboard />
    </LangProvider>
  );
}
