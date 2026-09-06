-- =============================================
-- Dividend columns for saved backtests
-- =============================================
-- Run this after 001_create_tables.sql. It is additive and safe to re-run.
--
-- Backtests now reinvest dividends, so a saved run carries three more figures:
-- the same portfolio measured without reinvestment (to show what dividends
-- contributed), the portfolio's annualized yield, and each holding's yield.
-- Rows saved before this ran keep NULLs, which the app renders as "no dividend
-- data" rather than as a zero yield.

alter table public.backtests
  add column if not exists price_only_metrics    jsonb,   -- {totalReturn, ...} without dividends
  add column if not exists dividend_yield        numeric, -- portfolio annualized yield, percent
  add column if not exists asset_dividend_yields jsonb;   -- {SYMBOL: percent}
