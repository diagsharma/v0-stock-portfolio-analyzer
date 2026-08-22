-- =============================================
-- Portfolio Backtester — optional storage schema
-- =============================================
-- Saved history is NOT required to run the app. With the Supabase environment
-- variables unset the app works normally and the History panel stays empty.
-- Run this in the Supabase SQL Editor only if you want runs to persist.
--
-- Columns here match exactly what app/api/backtest/route.ts writes. An earlier
-- version of this file declared a NOT NULL user_id and flat numeric metric
-- columns, which meant every insert failed.

create table if not exists public.backtests (
  id                 uuid primary key default gen_random_uuid(),
  name               text,
  assets             jsonb       not null,   -- [{id, symbol, weight}]
  start_date         date        not null,
  end_date           date        not null,
  initial_investment numeric     not null,
  status             text        not null default 'completed'
                       check (status in ('pending', 'in_progress', 'completed', 'failed')),
  metrics            jsonb,                  -- {totalReturn, annualizedReturn, ...}
  portfolio_history  jsonb,                  -- [{date, value}]
  asset_returns      jsonb,                  -- {SYMBOL: percent}
  error              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_backtests_created_at
  on public.backtests (created_at desc);

-- Row Level Security
--
-- The app is anonymous by design: the brief puts user accounts out of scope, so
-- there is no auth.uid() to scope rows against and every policy is open. If you
-- later add Supabase Auth, add a user_id column referencing auth.users and
-- replace `true` below with `auth.uid() = user_id`.
alter table public.backtests enable row level security;

drop policy if exists "Anyone can read backtests"   on public.backtests;
drop policy if exists "Anyone can insert backtests" on public.backtests;
drop policy if exists "Anyone can update backtests" on public.backtests;
drop policy if exists "Anyone can delete backtests" on public.backtests;

create policy "Anyone can read backtests"
  on public.backtests for select using (true);

create policy "Anyone can insert backtests"
  on public.backtests for insert with check (true);

-- UPDATE and DELETE policies were missing previously, so marking a run complete
-- and deleting from the History panel both silently affected zero rows.
create policy "Anyone can update backtests"
  on public.backtests for update using (true) with check (true);

create policy "Anyone can delete backtests"
  on public.backtests for delete using (true);

-- Keep updated_at current on every write.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists backtests_set_updated_at on public.backtests;

create trigger backtests_set_updated_at
  before update on public.backtests
  for each row execute function public.set_updated_at();
