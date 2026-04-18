-- =============================================
-- Portfolio Backtester Database Schema
-- =============================================
-- Run this in your Supabase SQL Editor (see instructions below)

-- 1. Anonymous Users Table
-- Stores basic info for anonymous users (no auth required)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null
);

-- 2. Backtests Table
-- Stores each backtest run by a user
create table if not exists public.backtests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  assets jsonb not null,              -- Array of {symbol, weight}
  start_date date not null,
  end_date date not null,
  initial_investment numeric not null,
  total_return numeric,
  annualized_return numeric,
  volatility numeric,
  sharpe_ratio numeric,
  max_drawdown numeric,
  created_at timestamptz default now() not null
);

-- 3. Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.backtests enable row level security;

-- 4. RLS Policies for Users
-- Anyone can create a user (anonymous signup)
create policy "Anyone can create a user"
  on public.users for insert
  with check (true);

-- Users can only read their own row
create policy "Users can read own data"
  on public.users for select
  using (true);

-- 5. RLS Policies for Backtests
-- Anyone can insert a backtest (we check user_id exists)
create policy "Anyone can insert backtests"
  on public.backtests for insert
  with check (
    exists (select 1 from public.users where id = user_id)
  );

-- Anyone can read backtests for a valid user_id
create policy "Anyone can read backtests"
  on public.backtests for select
  using (true);

-- 6. Create index for faster lookups
create index if not exists idx_backtests_user_id on public.backtests(user_id);
create index if not exists idx_backtests_created_at on public.backtests(created_at desc);
