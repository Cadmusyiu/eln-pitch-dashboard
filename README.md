# ELN Short-Put Pitch Dashboard

> **🌐 Live dashboard → https://cadmusyiu.github.io/eln-pitch-dashboard/**

A dynamic, shareable dashboard for sales teams to pitch **Equity Linked Notes (ELN)**
built on a **short-put** structure. The investor sells a European put on the underlying;
the premium becomes the enhanced **coupon**; at expiry `S ≥ K` returns principal + coupon,
`S < K` takes the downside (cash or physical delivery).

The deployed GitHub Pages site is **coupon-driven**: the salesperson enters the quoted
coupon (p.a.) directly and the structure — breakeven, max loss, payoff curve, scenarios,
autocall — is derived instantly, client-side. **No Black-Scholes, no IV, no backend
required.** Bilingual (English / 繁體中文).

Sister dashboard to [`premium-financing`](https://github.com/Cadmusyiu/premium-financing)
(same Next.js + Tailwind + Recharts stack, same GitHub Pages static-deploy contract).

---

## What it does (sales features)

| Tab | Purpose |
|---|---|
| **Structure** | Headline cards (coupon p.a. / coupon abs / breakeven / max loss) + payoff chart + expiry scenario table + autocall (call feature) card |
| **Compare** | Side-by-side strike / tenor variants |
| **Term Sheet** | Clean termsheet view → **Copy summary** (paste-ready ELN text for client chat) + **Print** |
| **One-pager** | Compact brief + payoff chart → **Download PNG** (drop straight into a client message) |

Other capabilities:
- **Live spot** via [Financial Modeling Prep](https://financialmodelingprep.com/) free API key
  (stored in the browser's `localStorage`, never in the repo). Free plan covers US large-caps;
  HK / ADRs / some share classes need a paid plan and stay manual.
- **Indicative spot presets** for common US megacaps + HK bluechips (confirm with the desk
  before pitching).
- **Autocall (call feature)** — monthly observation from month 2, configurable call level.
- **EN / 中文** toggle — every label, the copy summary, and the one-pager localize.

---

## Architecture — three modes

The deployed site is **fully static and backend-less**: `frontend/app/lib/engine.ts` derives
everything client-side from the coupon input. The Python backend is the **canonical
Black-Scholes twin** (`backend/pricing.py`) — the theoretical pricing path and an optional
live-data source — kept for parity/testing, not used by the static deploy.

| Mode | Where | Spot | Coupon | Pricing |
|---|---|---|---|---|
| **Static (deployed)** | Browser | FMP free key / manual | entered directly | `engine.ts`, always works |
| **Local full-stack** | `next dev` + `uvicorn` | yfinance auto | entered directly | `engine.ts` (or `/price`) |
| **Hosted backend** (optional) | any CORS origin | auto | auto | same as local |

`api.ts` falls back to `engine.ts` whenever the backend is unreachable or
`NEXT_PUBLIC_USE_API !== "true"`, so the UI never breaks. The static deploy is the
always-works, shareable manual version; run it locally with the backend for live auto-fill.

---

## Repo layout

```
eln-pitch-dashboard/
├── README.md
├── .github/workflows/deploy.yml      # GITHUB_PAGES=true → GitHub Pages
├── backend/                          # FastAPI + canonical Black-Scholes engine (theoretical twin)
│   ├── pricing.py                    # BS put, coupon/yield, scenarios, Greeks, prob-ITM
│   ├── marketdata.py                 # yfinance (spot, dividend, US IV) — never raises
│   ├── models.py / main.py           # Pydantic req/resp + POST /price · GET /marketdata · GET /health
│   └── test_pricing.py / test_api.py # canonical pins (TOL 1e-6) + endpoint tests
└── frontend/                         # Next.js 14 + Recharts + Tailwind (the deployed surface)
    └── app/
        ├── lib/{types,engine,format,api,i18n,pitch,presets}.ts
        ├── components/{InputForm,SummaryCards,PayoffChart,ScenarioTable,
        │              CallFeatureCard,ComparisonView,TermSheet,OnePager}.tsx
        ├── page.tsx                  # header + tabs (Structure / Compare / Term Sheet / One-pager)
        └── globals.css               # incl. @media print rules
```

---

## The math (coupon-driven — what the deployed site computes)

Inputs: spot `S0`, strike `K = strike_pct × S0`, tenor `T = tenor_months / 12`, quoted
**coupon p.a.** (entered directly), autocall level, notional, settlement.

```
coupon_abs_pct = coupon_pa_pct × T            (% over the tenor)
P (premium/share, $) = (coupon_abs_pct / 100) × S0
shares              = notional / S0
total_premium       = (coupon_abs_pct / 100) × notional
breakeven_st        = K − P
breakeven_%_of_spot = (K − P) / S0 × 100
max_loss_%          = (K − P) / S0 × 100       (S_T → 0)
```

Return on notional at expiry (identical for cash & physical — the toggle only changes
TermSheet framing):

- `S_T ≥ K → +coupon_abs_pct`
- `S_T < K → coupon_abs_pct − (K − S_T) / S0 × 100`

Payoff per share: `P − max(K − S_T, 0)`.

**Conventions**: `strike_pct`, `call_level_pct` are % (e.g. `95`, `100`); `coupon_pa_pct`
is % p.a. (e.g. `9.71`). Day-count `T = tenor_months / 12`. Currency: US → USD, HK → HKD.

> The backend `pricing.py` retains the full Black-Scholes path (`d1/d2`, put price, Greeks,
> prob-ITM via `math.erf`) for the theoretical view; the deployed sales surface is the
> coupon-driven derivation above.

---

## Run it

### Frontend (the deployed surface)

```bash
cd frontend
npm install
npm run dev                          # http://localhost:3000 — default loads the AAPL example
```

Static build for GitHub Pages:

```bash
cd frontend && GITHUB_PAGES=true npm run build    # → frontend/out/
```

Optional — bake a shared FMP key into the build (overrides are still possible per-browser
via the in-app key panel):

```bash
NEXT_PUBLIC_FMP_KEY=xxxxxxxx GITHUB_PAGES=true npm run build
```

### Live spot on the deployed site

Open the **Live-data API key** panel in the sidebar, paste a free FMP key
([get one →](https://financialmodelingprep.com/)), save. **Fetch live** then pulls spot for
any US ticker the free plan covers. The key lives in this browser only — it is not written to
the repo or the bundle.

### Backend (canonical engine + tests + optional API)

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pytest -q                            # canonical pins
uvicorn main:app --reload            # http://localhost:8000  (docs at /docs)
```

With the backend running, front-end live auto-fill:

```bash
NEXT_PUBLIC_USE_API=true NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

## Verified sample (coupon-driven)

AAPL short-put — `S0=190, strike_pct=0.95 (K=180.5), 3M (T=0.25), coupon 9.71% p.a.,
call 100%, notional=100,000, USD, cash`:

| Quantity | Value |
|---|---|
| `coupon_abs_pct` | `2.4275%` (9.71% × 0.25) |
| `P` (premium/share) | `4.6125` |
| `total_premium` | `2,427.50` |
| `breakeven_st` | `175.89 (92.57% of spot)` |
| `max_loss_pct` | `92.57%` |

Scenario returns on notional: −30%→`-22.57%`, −20%→`-12.57%`, −10%→`-2.57%`,
0%→`+2.43%`, +10%→`+2.43%`, +20%→`+2.43%` (flat ceiling above strike).

---

## Notes & caveats

- **FMP free plan = US large-caps only.** HK / ADRs / some share classes return HTTP 402
  (premium) — enter spot manually for those. FMP migrated to the `/stable/*` endpoints on
  2025-08-31; the legacy `/api/v3/*` returns 403.
- **HK IV**: yfinance returns empty HK option chains → on the backend path `iv_default` is
  null for HK. On the deployed coupon-driven surface IV is not used at all.
- **Indicative spots** in the preset basket are seeds — confirm with the desk before pitching;
  the coupon is quoted by the desk and entered directly.
- **One-pager PNG export** uses `html-to-image` (dynamic-imported, client-side, `pixelRatio: 2`).

*For illustrative purposes only. Not an offer, solicitation, or investment advice. ELNs can
result in loss of principal up to the max loss shown.*
