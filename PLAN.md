# Portfolio Backtester — Catch-Up Sprint Plan

Built against `Project goal.md` (Flintolabs PRD). You are behind with a tight
deadline, so this is **sequenced by grade weight**, not by PRD week order.
Each sprint maps back to the PRD milestones it closes out.

## Decisions

| Area | Choice |
|---|---|
| Auth | Out of scope for MVP. Bonus sprint at the very end, only if time remains. |
| Backend | Shared CommonJS modules in `/backend`, two entry points: `server/index.js` (Express) and `app/api/*` (Next.js). One source of truth for the math. |
| Data | Alpha Vantage integrated and documented (graded), Yahoo Finance carrying the actual historical load. **Forced by an API change — see below.** |
| Database | Repurposed as a **price cache**, not user history. See note in Sprint 5. |

## Grade weights driving the order

| Criterion | Weight | Sprint |
|---|---|---|
| Functionality | 40% | 2, 3 |
| Code Quality | 20% | 1 |
| User Experience | 15% | 4 |
| Deployment & Docs | 15% | 5 |
| Accuracy of Calculations | 10% | 1 |

Sprint 1 is first because it closes 30% of the grade (Code Quality + Accuracy)
with pure local code and zero API dependency — the best return per hour, and it
cannot be blocked by a missing key.

## Credentials needed

| Variable | Sprint | Where to get it |
|---|---|---|
| `ALPHA_VANTAGE_API_KEY` | 2 | https://www.alphavantage.co/support/#api-key |
| `NEXT_PUBLIC_SUPABASE_URL` | 5 | Supabase to Project Settings to API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 5 | same page |

Put them in `.env.local` (gitignored). Only the Alpha Vantage key blocks
critical-path work.

---

## BLOCKER FOUND — Alpha Vantage cannot satisfy the PRD on the free tier

Verified live on 2026-08-22 with the project's own API key:

```
GET .../query?function=TIME_SERIES_DAILY&symbol=AAPL&outputsize=full
{"Information": "the outputsize=full parameter value is a premium feature
 for the TIME_SERIES_DAILY endpoint..."}
```

`outputsize=compact` — the only free option — returns **100 daily records
reaching back to 2026-03-31**. That makes the following PRD items impossible
on free Alpha Vantage daily data:

- Week 2: "API returns JSON with at least 1000 daily price records"
- Week 4: "at least 100 daily price records from 2023"
- Week 5 and Week 8: any 2020-2023, 2019-2023 or 2015-2023 backtest
- Success Metrics: "at least 252 data points for a one-year backtest"
- The Example Walkthrough's Jan 2021 - Dec 2023 scenario

This is very likely why the existing `api_sample.json` is weekly rather than
daily — `TIME_SERIES_WEEKLY_ADJUSTED` is still free with full history.

**Yahoo Finance verified as the fix.** A single unauthenticated call returned
**753 daily records for 2021-01-04 to 2023-12-29**, including adjusted close.

**Resolution:** Alpha Vantage stays integrated, documented and demonstrated —
it is named in the 40% Functionality criterion, and the MVP Scope explicitly
permits "Yahoo Finance API as fallback". The provider layer tries Alpha Vantage
first and falls back to Yahoo automatically whenever the requested range exceeds
what the free tier can serve, which for any realistic backtest is always. The
README documents the premium change as the reason.

**Raise this with your mentor.** The PRD was written against an older Alpha
Vantage free tier. Identifying it and engineering around it is a stronger
outcome than silently shipping 100-day backtests.

---

## READ THIS FIRST — the one thing that cannot be compressed

Success Metrics require **"at least 15 commits spanning at least 6 weeks"** and
Deployment/Documentation (15%) grades **"at least 15 commits with descriptive
messages."**

This local folder is **not a git repository** — there is no `.git`. Elapsed
calendar time cannot be manufactured. Options, best first:

1. **The v0 GitHub repo may already have the history.** `README.md` links to
   `diagsharma/v0-stock-portfolio-analyzer`, and v0 pushes commits directly on
   every change. If that repo has commits going back 6+ weeks, you are covered —
   we work in a clone of it from now on. **Check this today.** Renaming a GitHub
   repo preserves history, so it can become `portfolio-backtesting-app` (the name
   the Day 1 Checklist specifies) without losing anything.
2. If that repo is thin, start committing now — small, real, descriptive commits
   at every checkpoint below. This plan has roughly 20 natural commit points.
3. Be straight with your mentor about the timeline rather than backdating
   commits. Backdated history is easy to spot and it is an integrity problem,
   not a technical one.

**Before Sprint 0: send me the GitHub repo URL, or run
`git log --oneline | wc -l` in your existing clone and tell me the count and the
date of the oldest commit.**

---

## Sprint 0 — Get unblocked (half a day)

Closes: PRD Week 1

- Work inside a clone of the real GitHub repo so history accumulates (see above).
- `npm install`, confirm `next dev` serves on :3000.
- `cd server && npm install`, confirm `npm start`, and that
  `POST localhost:3000/api/backtest` returns the hardcoded success JSON — a Week 2
  "Done when" you can tick immediately.
- Create `.env.local`.
- Strip the v0 boilerplate junk from `README.md` — it currently contains stray
  lines reading "try" and "lets seeee", visible on your public repo.

**Review gate:** app loads at localhost:3000, Express server responds, first
commit pushed.

## Sprint 1 — Calculation core + tests — 30% of grade — **DONE**

Closes: PRD Week 2 (tests) and **all of Week 3**

Everything goes in `/backend/utils/calculations.js` as exported CommonJS, which
is exactly what Code Quality grades. Both entry points import it.

- Keep `calculateTotalReturn` as-is (already correct).
- Add `calculateAnnualizedReturn(prices, startDate, endDate)` — CAGR.
- Add `calculateMaxDrawdown(prices)` — running-peak scan.
- Add `calculateSharpeRatio(dailyReturns, riskFreeRate)`.
  **Change the risk-free rate from 4% to 2%.** The Next.js route hardcodes
  `0.04`; the Accuracy criterion (10%) explicitly requires 2%.
- Add `calculateDailyReturns`, `calculatePortfolioReturns`, `normalizeToBase100`.
- Install Jest. Write tests asserting the PRD's exact "Done when" numbers, so the
  milestones become literally demonstrable:
  - `calculateTotalReturn([100,120,150])` gives `50.0`
  - `$10,000` to `$15,000` over 3 years gives `14.47%` (the PRD says 15.87%,
    which is arithmetically wrong — see the note in calculations.js)
  - `calculateMaxDrawdown([100,120,84,90,110])` gives `-30.0`
  - Sharpe on sample SPY returns lands in `0.5 ... 3.0`
  - plus negative-return and zero-return cases (Week 2 requires 3+ cases)
- Wire `server/index.js` to call these on sample data and return real metrics
  (Week 3's final "Done when").

**Review gate: PASSED.** `npm test` reports 37/37 passing. This is the
strongest single artifact you can put in front of a grader.

## Sprint 2 — Data layer — part of Functionality 40% — **DONE**

Closes: PRD Week 4, and fixes the Week 2 sample-data artifact

- `/backend/services/alphaVantage.js` with `fetchHistoricalPrices(ticker, apiKey)`
  hitting `TIME_SERIES_DAILY`, returning `[{date, close}]` sorted chronologically.
- `/backend/services/yahooFinance.js` with an identical interface, used
  automatically when Alpha Vantage returns a rate-limit `Note`.
- `fetchMultipleTickers(tickers, apiKey)` using **`Promise.all`**. The PRD names
  `Promise.all` specifically; the current route uses a serial loop with
  `await sleep(300)`, which is slower and not what is graded.
- Caching plus the required rate-limit handling.
- Error handling: unknown ticker gives **HTTP 400 "Ticker not found"** (today it
  returns 500), rate-limit message, 5s timeout with retry.
- **Regenerate `api_sample.json`.** The current file holds 209 *weekly adjusted*
  records; the Week 2 milestone requires `TIME_SERIES_DAILY` with **1000+ daily
  records**. It does not currently satisfy its own milestone.

**Review gate:** `["AAPL","MSFT","TSLA"]` returns all three under 12 seconds;
`"INVALID"` returns 400 "Ticker not found"; a 2022 range yields ~252 records.

## Sprint 3 — Benchmark + portfolio engine — rest of Functionality 40% — **DONE**

Closes: PRD Week 5. **The biggest functional gap in the codebase.**

The S&P 500 comparison is entirely absent today, yet it appears in the
walkthrough, the MVP scope, the chart requirement, the summary box, and the 40%
Functionality criterion.

- `calculatePortfolioReturns(tickerPrices, startDate, endDate)` — equal weighted,
  normalized to start at 100. The current route computes raw dollar values and
  never normalizes.
- Fetch **SPY** alongside the user's tickers on every run.
- Normalize portfolio and benchmark to a common base of 100.
- Return the PRD's exact response shape:
  `{metrics: {...}, portfolioReturns: [...], benchmarkReturns: [...]}`
- Compute the four metrics for the benchmark too — the Week 8 summary sentence
  needs the benchmark's drawdown, not just the portfolio's.
- Keep the existing custom-weight UI as a superset of the required equal
  weighting, defaulting to equal.

**Review gate:** a TSLA/AAPL/MSFT 2021-2023 run returns both series, both
starting at 100, over a matching date range.

## Sprint 4 — Frontend — UX 15% — **DONE**

Closes: PRD Weeks 6 and 7, plus the Week 8 summary box

- **Two-line chart**: portfolio vs S&P 500, distinct colors, legend reading
  "Your Portfolio" and "S&P 500", tooltip showing both values. Recharts is
  already installed and the PRD permits it — no need for Chart.js.
- Validation *before* the API call: ticker regex `/^[A-Z]{1,5}$/`, 1-10 tickers
  (there is no maximum today), start date before end date.
- Surface "Ticker not found" from the API as a user-facing message.
- **Dynamic summary box** under the chart: "Your portfolio returned X% compared
  to the S&P 500's Y% ... maximum drawdown of Z% versus the benchmark's W%."
- Responsive to 375px with no horizontal scroll.
- Zero console errors — graded explicitly.

**Review gate:** Chrome DevTools at 375px, full run, clean console.

## Sprint 5 — Deploy + documentation — Deployment/Docs 15% — **DOCS DONE, DEPLOY PENDING**

Closes: PRD Weeks 7 (deploy) and 8 (docs)

- **Decide the fate of the Supabase persistence.** The PRD puts saved history out
  of scope, and the implementation is broken anyway: the schema in
  `scripts/001_create_tables.sql` does not match what the API writes, and there
  are no UPDATE or DELETE RLS policies, so writes fail and throw. Broken code
  producing console errors costs UX points.
  **Recommendation:** keep the table but repurpose it as the **price cache** from
  Sprint 2. That converts an out-of-scope feature into the rate-limit mitigation
  the PRD explicitly asks for ("caching previously fetched ticker data"), and it
  justifies the Supabase project the Week 1 milestone required. Roughly an hour.
- Deploy to Vercel, get the public URL, set env vars in the dashboard.
- Rewrite `README.md`: description, install steps, **Alpha Vantage key setup**,
  usage examples, tech stack, and 4 screenshots (landing, form with data,
  dashboard, chart).
- Run and document the 5 required ticker/date combinations.
- Record the 2-3 minute demo video, link it in the README.

**Review gate:** public URL loads in under 3s and runs AAPL 2020-2023 cleanly.

## Sprint 6 — Auth (bonus, only if time remains)

Not graded. Start only once Sprints 0-5 are fully green.

- Supabase Auth, per-user saved backtests, RLS scoped to `auth.uid()`.

---

## Gaps found in the current code

| PRD milestone | Status |
|---|---|
| W2 - Express `/api/backtest` hardcoded | Done, `server/index.js` |
| W2 - `calculateTotalReturn` | Done, returns 50.0 correctly |
| W2 - `api_sample.json` 1000+ daily records | **Wrong data** — 209 weekly records |
| W2 - 3+ unit tests | **Missing** — no test framework installed |
| W3 - CAGR / drawdown / Sharpe in `/backend/utils` | **Missing** — logic lives inline in the Next.js route |
| W3 - Sharpe uses 2% risk-free rate | **Wrong** — hardcoded to 4% |
| W4 - `/backend/services/alphaVantage.js` | **Missing** — wrong location and shape |
| W4 - `Promise.all` parallel fetch | **Missing** — serial loop with sleep |
| W4 - Invalid ticker gives 400 "Ticker not found" | **Wrong** — returns 500 |
| W5 - SPY benchmark | **Missing entirely** |
| W5 - Normalize both series to 100 | **Missing** — raw dollar values |
| W6 - Ticker regex, max 10, date-order validation | **Missing** |
| W6 - Two-line chart with legend | **Missing** — single line only |
| W7 - Four metric cards, spinner, error display | Done |
| W7 - Deployed public URL | **Missing** |
| W8 - Summary sentence box | **Missing** |
| W8 - README, screenshots, demo video | **Missing** — still v0 boilerplate |
| W8 - Responsive 375px | Unverified |
| — Git repo with 15+ commits over 6 weeks | **No local repo at all** — see warning above |

Also worth fixing while in there: dates are serialized with
`toISOString().split('T')[0]`, which shifts local dates back a day for anyone
west of UTC.
