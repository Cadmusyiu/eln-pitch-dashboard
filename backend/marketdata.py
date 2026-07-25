"""yfinance market-data fetcher for the ELN pitch tool.

NEVER raises — on any failure returns a MarketDataResponse with nulls so the FE's
manual-input path stays usable. US tickers get an option-chain IV default; HK
tickers have no option chain on yfinance so iv_default stays null (manual).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Optional, Tuple

import pandas as pd
import yfinance as yf

from models import MarketDataResponse


def _normalize(ticker: str) -> Tuple[str, str]:
    """Return (yfinance_symbol, currency). HK codes are zero-padded to 4 digits."""
    t = ticker.strip().upper()
    looks_hk = t.endswith(".HK") or (t.isdigit() and len(t) <= 5)
    if looks_hk:
        code = t.replace(".HK", "")
        code = (code or "0").zfill(4)
        return f"{code}.HK", "HKD"
    return t, "USD"


def _pick_nearest_expiry(exps, target_date: date) -> Optional[str]:
    best: Optional[str] = None
    best_d = None
    for e in exps[:8]:
        try:
            d = datetime.strptime(e, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            continue
        diff = abs((d - target_date).days)
        if best_d is None or diff < best_d:
            best, best_d = e, diff
    return best


def _iv_from_chain(tk, target_strike: float, target_date: date) -> Tuple[Optional[float], str]:
    """Read the implied vol of the put row nearest target_strike; (iv, source)."""
    try:
        exps = tk.options
    except Exception:
        return None, "unavailable"
    if not exps:
        return None, "unavailable"
    expiry = _pick_nearest_expiry(exps, target_date)
    if expiry is None:
        return None, "unavailable"
    try:
        chain = tk.option_chain(expiry)
        df: pd.DataFrame = chain.puts if len(chain.puts) else chain.calls
        if df is None or df.empty:
            return None, "unavailable"
        idx = (df["strike"] - target_strike).abs().idxmin()
        iv = float(df.loc[idx, "impliedVolatility"])
        if iv <= 0 or iv > 5.0:
            return None, "unavailable"
        return iv, "option_chain"
    except Exception:
        return None, "unavailable"


def fetch_market_data(
    ticker: str,
    target_tenor_months: int = 3,
    target_strike_pct: float = 0.95,
) -> MarketDataResponse:
    """Fetch spot + dividend yield (+ US IV default). Never raises."""
    sym, currency = _normalize(ticker)
    as_of = datetime.now(timezone.utc).isoformat()
    spot: Optional[float] = None
    div_yield: Optional[float] = None
    iv_default: Optional[float] = None
    iv_source = "manual"  # HK stays manual (no chain); US may upgrade to option_chain

    try:
        tk = yf.Ticker(sym)

        # ---- spot -----------------------------------------------------------
        try:
            spot = tk.fast_info.get("last_price")  # type: ignore[union-attr]
        except Exception:
            spot = None
        if not spot or spot != spot:  # None or NaN
            try:
                spot = float(tk.history(period="1d")["Close"].iloc[-1])
            except Exception:
                spot = None

        # ---- dividend yield (continuous proxy) ------------------------------
        try:
            div_yield = tk.info.get("dividendYield")
        except Exception:
            div_yield = None

        # ---- IV default (US only; HK chains are empty) ----------------------
        if currency == "USD" and spot:
            target_date = date.today() + timedelta(days=target_tenor_months * 30)
            iv_default, iv_source = _iv_from_chain(tk, target_strike_pct * spot, target_date)
    except Exception:
        # Total failure — leave everything null; the FE falls back to manual.
        pass

    return MarketDataResponse(
        ticker=sym,
        currency=currency,
        spot=spot,
        dividend_yield=div_yield,
        iv_default=iv_default,
        iv_source=iv_source,
        as_of=as_of,
    )
