# ELN Short-Put Pitch Dashboard

A dynamic dashboard for sales teams to pitch **Equity Linked Notes (ELN)** built on a
**short-put** structure — the investor sells a European put on the underlying, the
premium becomes the enhanced coupon, and at expiry `S ≥ K` returns principal + coupon
while `S < K` takes the downside (cash or physical delivery).

Sister dashboard to [`premium-financing`](https://github.com/Cadmusyiu/premium-financing) —
same dual-engine monorepo (canonical Python + client-side TS mirror), same GitHub Pages
static-deploy contract.

- **Underlyings**: US equities (AAPL…) + HK equities (0700, 9988…)
- **Pricing**: Black-Scholes European put, continuous compounding
- **Live data**: optional yfinance auto-fill for spot/dividend/IV (US); HK IV always manual

---

## Architecture — three modes

The deployed GitHub Pages site is **fully static and backend-less**: `frontend/app/lib/engine.ts`
computes everything client-side. The Python backend is the canonical, unit-tested twin and an
optional live-data source.

| Mode | Where | Spot | IV | Pricing |
|---|---|---|---|---|
| **Static (deployed)** | Browser | manual | manual | `engine.ts`, always works |
| **Local full-stack** | `next dev` + `uvicorn` | yfinance auto | US option-chain / HK manual | `engine.ts` (or `/price`) |
| **Hosted backend** (optional) | any CORS origin | auto | auto | same as local |

`api.ts` falls back to `engine.ts` whenever the backend is unreachable or
`NEXT_PUBLIC_USE_API !== "true"`, so the UI never breaks. The static deploy is the
always-works, shareable manual version; run it locally with the backend for live auto-fill.

---

## Repo layout

```
eln-pitch-dashboard/
├── backend/                   # FastAPI + canonical Python engine
│   ├── pricing.py             # ★ BS put, coupon/yield, scenarios, Greeks, prob-ITM
│   ├── marketdata.py          # yfinance fetch (spot, dividend, US IV) — never raises
│   ├── models.py              # Pydantic req/resp + validation
│   ├── main.py                # POST /price · GET /marketdata · GET /health
│   ├── test_pricing.py        # engine unit tests (canonical pins, TOL 1e-6)
│   └── test_api.py            # endpoint tests
└── frontend/                  # Next.js 14 + Recharts + Tailwind
    └── app/
        ├── lib/{types,engine,format,api,i18n}.ts
        ├── components/{InputForm,SummaryCards,PayoffChart,ScenarioTable,GreeksCard,ComparisonView,TermSheet}.tsx
        └── page.tsx
```

---

## The math (Black-Scholes short-put)

```
d1 = [ln(S0/K) + (r − q + σ²/2)·T] / (σ·√T)        d2 = d1 − σ·√T
P  = K·e^(−rT)·N(−d2) − S0·e^(−qT)·N(−d1)           (put price per share)
```

Derived figures (FE/Python share field names):

| Field | Formula |
|---|---|
| `shares` | `notional / S0` |
| `total_premium` | `P × shares` |
| `coupon_abs_pct` | `P / S0 × 100` (absolute over tenor) |
| `coupon_annualized_simple_pct` | `(P/S0)/T × 100` |
| `coupon_annualized_compounded_pct` | `((1+P/S0)^(1/T) − 1) × 100` |
| `prob_itm_pct` | `N(−d2) × 100` (≈ P(assigned)) |
| `breakeven_st` | `K − P` |
| `max_loss_pct` | `(K/S0 − P/S0) × 100` (S_T → 0) |

Return on notional at expiry (identical for cash & physical settlement — the toggle only
changes TermSheet framing):

- `S_T ≥ K → +coupon_abs_pct`
- `S_T < K → coupon_abs_pct − (K − S_T)/S0 × 100`

**Conventions**: all rate/vol inputs are fractions (`strike_pct 0.95`, `iv 0.25`); `_pct`
outputs are ×100. Day-count `T = tenor_months/12` in **both** engines (never mix ACT/365).
Currency: US→USD, HK→HKD.

---

## Run it

### Backend (canonical engine + tests + optional API)

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
pytest -q                       # 35 tests, incl. canonical pins
uvicorn main:app --reload       # http://localhost:8000  (docs at /docs)
```

### Frontend (the deployed surface)

```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000 — default loads the AAPL canonical example
```

With live yfinance auto-fill (backend running):

```bash
NEXT_PUBLIC_USE_API=true NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
# type "AAPL" → Fetch → spot/dividend/IV auto-fill; tweak strike/tenor → instant recompute
```

Static build for GitHub Pages:

```bash
cd frontend && GITHUB_PAGES=true npm run build    # → frontend/out/
```

---

## Canonical verified sample

AAPL short-put — `S0=190, strike_pct=0.95 (K=180.5), 3M (T=0.25), σ=0.25, r=0.045, q=0.005,
notional=100,000, USD, cash`. Verified independently with `math.erf`; the TS mirror reproduces
to ~2e-11:

| Quantity | Value |
|---|---|
| `put_price_per_share` | `4.614517611` |
| `coupon_abs_pct` | `2.4287%` |
| `coupon_annualized_simple_pct` | `9.7148%` |
| `coupon_annualized_compounded_pct` | `10.0745%` |
| `prob_itm_pct` | `33.44%` |
| `breakeven_st` | `175.89 (92.57% of spot)` |
| `max_loss_pct` | `92.57%` |
| `delta / gamma / vega(1%) / theta(day)` | `-0.2902 / 0.0144 / 0.3249 / -0.0379` |

Scenario returns on notional: −30%→`-22.57%`, −20%→`-12.57%`, −10%→`-2.57%`,
0%→`+2.43%`, +10%→`+2.43%`, +20%→`+2.43%` (flat ceiling above strike).

Re-verify independently:

```bash
python3 -c "from math import log,sqrt,exp,erf; S,K,T,sig,r,q=190,180.5,.25,.25,.045,.005;\
d1=(log(S/K)+(r-q+sig*sig/2)*T)/(sig*sqrt(T)); d2=d1-sig*sqrt(T); N=lambda x:.5*(1+erf(x/sqrt(2)));\
print(K*exp(-r*T)*N(-d2)-S*exp(-q*T)*N(-d1))"   # -> 4.614517611
```

---

## Notes & caveats

- **HK IV**: yfinance returns empty HK option chains → `iv_default` is always null for HK,
  forcing manual IV entry (`warn_hk_no_iv`). Confirm IV with the desk before pitching.
- **Dividend yield** `q` is continuous (`info["dividendYield"]`); near an ex-div date the realized
  carry diverges — keep `q` editable. Second-order effect for short-dated ELNs.
- **norm_cdf parity**: Python uses `math.erf` (exact); the TS mirror integrates the PDF via
  Simpson's rule (n=1000), matching to ~1e-11 — far inside the 1e-6 test tolerance.
- **yfinance rate limits**: `/marketdata` never raises; on Yahoo 429 it returns nulls and the FE
  falls back to manual input. `as_of` timestamp is surfaced so stale data is visible.

*For illustrative purposes only. Not an offer, solicitation, or investment advice.*
