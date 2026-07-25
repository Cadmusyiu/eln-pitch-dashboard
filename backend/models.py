"""Pydantic request/response models + validation for the ELN pitch API."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from pricing import Illustration, PricingInput

VALID_TENORS = {1, 3, 6, 12}
VALID_CURRENCIES = {"USD", "HKD"}
VALID_SETTLEMENTS = {"cash", "physical"}


class PriceRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=16)
    spot: float = Field(..., gt=0)
    strike_pct: float = Field(0.95, gt=0.50, le=1.10)
    tenor_months: int = Field(3)
    iv: float = Field(..., gt=0, le=5.0)
    risk_free_rate: float = Field(0.045, ge=-0.02, le=0.20)
    dividend_yield: float = Field(0.005, ge=-0.05, le=0.20)
    notional: float = Field(100_000, gt=0)
    currency: str = Field("USD")
    settlement: str = Field("cash")

    @field_validator("tenor_months")
    @classmethod
    def _valid_tenor(cls, v: int) -> int:
        if v not in VALID_TENORS:
            raise ValueError(f"tenor_months must be one of {sorted(VALID_TENORS)}")
        return v

    @field_validator("currency")
    @classmethod
    def _valid_currency(cls, v: str) -> str:
        if v not in VALID_CURRENCIES:
            raise ValueError(f"currency must be one of {sorted(VALID_CURRENCIES)}")
        return v

    @field_validator("settlement")
    @classmethod
    def _valid_settlement(cls, v: str) -> str:
        if v not in VALID_SETTLEMENTS:
            raise ValueError(f"settlement must be one of {sorted(VALID_SETTLEMENTS)}")
        return v

    def to_pricing_input(self) -> PricingInput:
        return PricingInput(
            ticker=self.ticker,
            spot=self.spot,
            strike_pct=self.strike_pct,
            tenor_months=self.tenor_months,
            iv=self.iv,
            risk_free_rate=self.risk_free_rate,
            dividend_yield=self.dividend_yield,
            notional=self.notional,
            currency=self.currency,
            settlement=self.settlement,
        )


class ScenarioRowOut(BaseModel):
    st_move_pct: float
    st: float
    return_on_notional_pct: float
    ending_value: float


class PayoffPointOut(BaseModel):
    st_pct_of_spot: float
    st: float
    pnl_per_share: float
    pnl_on_notional_pct: float


class SummaryOut(BaseModel):
    currency: str
    ticker: str
    settlement: str
    spot: float
    strike: float
    strike_pct: float
    tenor_months: int
    T: float
    iv: float
    risk_free_rate: float
    dividend_yield: float
    notional: float
    shares: float
    put_price_per_share: float
    total_premium: float
    coupon_abs_pct: float
    coupon_annualized_simple_pct: float
    coupon_annualized_compounded_pct: float
    prob_itm_pct: float
    breakeven_st: float
    breakeven_pct_of_spot: float
    max_loss_pct: float
    delta: float
    gamma: float
    vega_per_1pct: float
    theta_per_day: float
    d1: float
    d2: float
    warnings: List[str]


class PriceResponse(BaseModel):
    summary: SummaryOut
    scenarios: List[ScenarioRowOut]
    payoff: List[PayoffPointOut]

    @classmethod
    def from_illustration(cls, ill: Illustration) -> "PriceResponse":
        return cls(
            summary=SummaryOut(**ill.summary.__dict__),
            scenarios=[ScenarioRowOut(**r.__dict__) for r in ill.scenarios],
            payoff=[PayoffPointOut(**p.__dict__) for p in ill.payoff],
        )


class MarketDataResponse(BaseModel):
    ticker: str
    currency: str
    spot: Optional[float] = None
    dividend_yield: Optional[float] = None
    iv_default: Optional[float] = None       # None for HK (no option chain)
    iv_source: str = "manual"                # "option_chain" | "manual" | "unavailable"
    as_of: str
