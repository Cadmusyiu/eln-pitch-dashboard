"""FastAPI entry point for the ELN short-put pitch tool."""

from __future__ import annotations

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from marketdata import fetch_market_data
from models import MarketDataResponse, PriceRequest, PriceResponse
from pricing import build_illustration

app = FastAPI(title="ELN Short-Put Pitch API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/price", response_model=PriceResponse)
def price(req: PriceRequest) -> PriceResponse:
    ill = build_illustration(req.to_pricing_input())
    return PriceResponse.from_illustration(ill)


@app.get("/marketdata", response_model=MarketDataResponse)
def marketdata(
    ticker: str = Query(..., min_length=1, max_length=16),
    tenor_months: int = Query(3, ge=1, le=12),
    strike_pct: float = Query(0.95, gt=0.5, le=1.1),
) -> MarketDataResponse:
    # Never raises — returns nulls on failure so the FE manual path stays usable.
    return fetch_market_data(ticker, target_tenor_months=tenor_months, target_strike_pct=strike_pct)
