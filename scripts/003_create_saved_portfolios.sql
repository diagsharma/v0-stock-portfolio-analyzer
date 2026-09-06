-- =============================================
-- Saved portfolios, scoped to a signed-in user
-- =============================================
-- Requires Supabase Auth with the Google provider enabled. Unlike the
-- backtests table -- which is anonymous by design and has open policies --
-- every row here belongs to exactly one user, so the policies are scoped to
-- auth.uid() and a signed-out client can neither read nor write.

create table if not exists public.saved_portfolios (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  name       text        not null,
  assets     jsonb       not null,   -- [{id, symbol, weight}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saved_portfolios_user_id
  on public.saved_portfolios (user_id, created_at desc);

alter table public.saved_portfolios enable row level security;

drop policy if exists "Users manage their own portfolios" on public.saved_portfolios;

-- One policy covers select/insert/update/delete: a user only ever sees and
-- writes their own rows.
create policy "Users manage their own portfolios"
  on public.saved_portfolios for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Also defined in 001_create_tables.sql. Repeated here (create or replace, so
-- running both is harmless) to keep this script standalone -- saved portfolios
-- do not otherwise depend on the backtests table existing.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists saved_portfolios_set_updated_at on public.saved_portfolios;

create trigger saved_portfolios_set_updated_at
  before update on public.saved_portfolios
  for each row execute function public.set_updated_at();
