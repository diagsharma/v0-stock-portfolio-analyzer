-- =============================================
-- Scope saved backtests to the user who ran them
-- =============================================
-- Run this after 003_create_saved_portfolios.sql.
--
-- 001_create_tables.sql created `backtests` when the app was anonymous by
-- design, so every policy on it was `using (true)`. Once Google sign-in and
-- saved portfolios landed, that left a hole: a backtest row records the
-- portfolio that produced it (name, symbols and weights), and both the API and
-- the policies read every row, so the History panel showed each user the
-- allocations of everyone else -- and let any visitor delete them.
--
-- This adds the owner column that 001 anticipated and replaces the open
-- policies with the same auth.uid() rule saved_portfolios already uses.

alter table public.backtests
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_backtests_user_id
  on public.backtests (user_id, created_at desc);

drop policy if exists "Anyone can read backtests"   on public.backtests;
drop policy if exists "Anyone can insert backtests" on public.backtests;
drop policy if exists "Anyone can update backtests" on public.backtests;
drop policy if exists "Anyone can delete backtests" on public.backtests;
drop policy if exists "Users manage their own backtests" on public.backtests;

-- One policy covers select/insert/update/delete: a user only ever sees and
-- writes their own rows. Rows left over from the anonymous era have a NULL
-- user_id, so they match no policy and are now visible to nobody. They are
-- left in place rather than deleted -- see the note at the end of this file.
create policy "Users manage their own backtests"
  on public.backtests for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Optional cleanup, NOT run automatically because it destroys data.
-- Those pre-existing rows can no longer be read by anyone through the app, but
-- they still sit in the table. To remove them for good, run this by hand:
--
--   delete from public.backtests where user_id is null;
