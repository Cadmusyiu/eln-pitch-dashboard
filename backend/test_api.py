"""HTTP-layer integration tests for the ELN pitch API."""

from __future__ import annotations

import socket

import pytest
from fastapi.testclient import TestClient

from main import app
from marketdata import _normalize

client = TestClient(app)
TOL = 1e-6

CANONICAL_BODY = {
    "ticker": "AAPL",
    "spot": 190.0,
    "strike_pct": 0.95,
    "tenor_months": 3,
    "iv": 0.25,
    "risk_free_rate": 0.045,
    "dividend_yield": 0.005,
    "notional": 100_000.0,
    "currency": "USD",
    "settlement": "cash",
}


def _network_available() -> bool:
    try:
        socket.create_connection(("finance.yahoo.com", 443), timeout=3).close()
        return True
    except OSError:
        return False


NETWORK = _network_available()


# --------------------------------------------------------------------------- #
# /health
# --------------------------------------------------------------------------- #
def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# --------------------------------------------------------------------------- #
# /price — canonical pins
# --------------------------------------------------------------------------- #
def test_price_canonical():
    r = client.post("/price", json=CANONICAL_BODY)
    assert r.status_code == 200
    s = r.json()["summary"]
    assert s["put_price_per_share"] == pytest.approx(4.614517611, abs=TOL)
    assert s["coupon_abs_pct"] == pytest.approx(2.4286934795, abs=TOL)
    assert s["coupon_annualized_simple_pct"] == pytest.approx(9.7147739179, abs=TOL)
    assert s["prob_itm_pct"] == pytest.approx(33.43814927, abs=1e-6)
    assert s["breakeven_st"] == pytest.approx(175.885482389, abs=TOL)
    assert s["max_loss_pct"] == pytest.approx(92.5713065205, abs=TOL)
    body = r.json()
    assert len(body["scenarios"]) == 6
    assert len(body["payoff"]) == 33


def test_price_uses_defaults_when_optional_omitted():
    # Only the required fields supplied; rest fall back to model defaults.
    r = client.post("/price", json={"ticker": "AAPL", "spot": 190.0, "iv": 0.25})
    assert r.status_code == 200
    s = r.json()["summary"]
    assert s["currency"] == "USD"
    assert s["settlement"] == "cash"
    assert s["strike_pct"] == pytest.approx(0.95)


# --------------------------------------------------------------------------- #
# /price — validation rejections (422)
# --------------------------------------------------------------------------- #
def test_price_rejects_bad_strike():
    r = client.post("/price", json={**CANONICAL_BODY, "strike_pct": 0.40})
    assert r.status_code == 422


def test_price_rejects_bad_tenor():
    r = client.post("/price", json={**CANONICAL_BODY, "tenor_months": 13})
    assert r.status_code == 422


def test_price_rejects_bad_iv():
    r = client.post("/price", json={**CANONICAL_BODY, "iv": 0})
    assert r.status_code == 422


def test_price_rejects_bad_currency():
    r = client.post("/price", json={**CANONICAL_BODY, "currency": "EUR"})
    assert r.status_code == 422


def test_price_rejects_bad_spot():
    r = client.post("/price", json={**CANONICAL_BODY, "spot": -1})
    assert r.status_code == 422


# --------------------------------------------------------------------------- #
# marketdata._normalize (no network needed)
# --------------------------------------------------------------------------- #
def test_normalize_us():
    assert _normalize("aapl") == ("AAPL", "USD")
    assert _normalize("MSFT") == ("MSFT", "USD")


def test_normalize_hk():
    assert _normalize("0700") == ("0700.HK", "HKD")
    assert _normalize("0700.HK") == ("0700.HK", "HKD")
    assert _normalize("9988") == ("9988.HK", "HKD")
    assert _normalize("388") == ("0388.HK", "HKD")


# --------------------------------------------------------------------------- #
# /marketdata — network-dependent (skipped offline so CI never fails)
# --------------------------------------------------------------------------- #
@pytest.mark.skipif(not NETWORK, reason="no network access to Yahoo Finance")
def test_marketdata_aapl():
    # Contract: endpoint returns 200 with the right shape and NEVER raises.
    # spot/iv may be null when Yahoo throttles the IP (429) — graceful degradation
    # is the documented behaviour, so we only assert shape, not non-null data.
    r = client.get("/marketdata", params={"ticker": "AAPL"})
    assert r.status_code == 200
    j = r.json()
    assert j["currency"] == "USD"
    assert j["ticker"] == "AAPL"
    assert j["iv_source"] in ("option_chain", "unavailable", "manual")
    assert j["spot"] is None or j["spot"] > 0
    assert j["iv_default"] is None or 0 < j["iv_default"] <= 5.0


@pytest.mark.skipif(not NETWORK, reason="no network access to Yahoo Finance")
def test_marketdata_hk_null_iv():
    r = client.get("/marketdata", params={"ticker": "0700.HK"})
    assert r.status_code == 200
    j = r.json()
    assert j["currency"] == "HKD"
    assert j["ticker"] == "0700.HK"
    # HK has no option chain on yfinance -> IV is forced manual
    assert j["iv_default"] is None
    assert j["iv_source"] == "manual"
