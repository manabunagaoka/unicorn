# FROZEN_STATE.md

**Status:** ❄️ FROZEN — permanent record, not maintained, not revived.
**Freeze date:** 2026-06-17
**Frozen at commit:** `8830388` ("Add market view: stock table, tabs, summary bar, expandable agents"), tagged `v1.0-frozen`.

This file is the self-contained snapshot of the project named **"Unicorn."** If you are reading only this file, it should be enough to understand what this project was and the exact state it was left in. The reusable engineering — the parts worth carrying into a new repo — is documented separately in [EXTRACT_LIST.md](EXTRACT_LIST.md).

---

## 1. What this project was

**Unicorn** was an **AI-vs-human stock trading simulation.**

- A roster of **AI investor personas** (e.g. "The Boomer," "YOLO Kid," "Diamond Hands," "FOMO Master," "The Contrarian") autonomously traded **real US stocks** against a **live market price feed** (Finnhub).
- **Humans could compete** on the same leaderboard.
- Everyone was seeded with **$1,000,000 MTK** — Manaboodle Tokens, **game points with no monetary value** ("for entertainment purposes only").
- On top of the stock market sat an **AI-generated-startup "pitch" listing layer**: companies were represented as "pitches" (`ai_readable_pitches`) carrying a ticker, an elevator pitch, a fun fact, and a founder story, so the AIs could "evaluate" them like venture bets rather than tickers alone.
- At its peak the system had executed roughly **1,144 trades**, with real-time stock data, autonomous agents whose reasoning was fully logged, and twice-daily trading cron jobs.

The public site was a **spectator dashboard** ("Manaboodle Unicorn — AI Autonomous Trading"): a Market tab (stock table + category breakdown), an Agents tab (leaderboard with expandable holdings), and a live "Recent Trades" feed.

> Lineage note: the repo went through several names before "Unicorn" — "MM7 Index / Manaboodle Magnificent 7," "HM7 / HM14 (Harvard)," and a never-executed planned rebrand to **"The Pit"** ("Can AI beat Buffett?" with Buffett/Cathie Wood/Burry 13F shadow portfolios). The rebrand was never done; no trace of "The Pit" exists in the code.

## 2. Why it was frozen

Superseded by a new direction. The founding premise — **"use AI to simulate investing personalities"** — no longer holds. By the freeze date, off-the-shelf LLM skills can produce this kind of persona-driven analysis **on demand**, so building and operating a bespoke standing system for it is no longer the interesting problem. Rather than refactor or pivot in place, the project is being **frozen as a record** and a new direction started in a **fresh repo**. This repo is not being revived.

## 3. The architecture as actually built

Stack: **Next.js 15 (App Router) + TypeScript + Tailwind**, **Supabase (Postgres)** for data, **Vercel** for hosting + cron, **OpenAI** for agent decisions (`gpt-4o-mini`) and persona generation (`gpt-4o`), **Finnhub** for live prices.

### Active database schema
The live schema is defined in `supabase/investment_system_migration.sql` (created 2025-10-29). Active objects:

| Object | Type | Role |
|---|---|---|
| `user_token_balances` | table | One row per investor (human + AI). Cash (`available_tokens`), `total_tokens`, `is_ai_investor`, `is_active`, `ai_strategy`, `ai_nickname`/`display_name`, `ai_catchphrase`, `ai_personality_prompt`. Starting balance 1,000,000 MTK. |
| `user_investments` | table | Portfolio holdings. `(user_id, pitch_id)` unique; `shares_owned`, `total_invested`, `avg_purchase_price`, `current_value`, `unrealized_gain_loss`. |
| `investment_transactions` | table | Immutable BUY/SELL ledger: `shares`, `price_per_share`, `total_amount`, `balance_before`, `balance_after`, `timestamp`. |
| `pitch_market_data` | table | Per-company market state: `current_price`, `total_volume`, `total_shares_issued`, `unique_investors`, `price_change_24h`, `market_rank`. **Trades execute at this `current_price`.** |
| `ai_trading_logs` | table | Full audit of every AI decision: prompt + raw LLM response + decision + execution outcome + trigger source. (See EXTRACT_LIST.md for the reproducible def.) |
| `ai_readable_pitches` | view | The company catalog the AIs read: `pitch_id`, `company_name`, `ticker`, `category`, `sector`, `elevator_pitch`, `fun_fact`, `founder_story`, `current_price`, `price_change_24h`. |
| `investment_leaderboard` | view | Combined human + AI ranking by `available_tokens + portfolio_value`. |
| `company_rankings` | view | Companies ranked by `total_volume`. |

Helper SQL also defines `calculate_share_price()` (the dead bonding-curve formula — see §4), `update_portfolio_values()`, and an `after_investment_change` statement-level trigger.

### Agent engine — `src/app/api/admin/ai-trading/trigger/route.ts` (~923 lines)
The heart of the system. For each active AI investor it:
1. Loads a **fresh** balance, the portfolio, and the pitch catalog enriched with **live Finnhub prices**.
2. Computes the persona prompt from the AI's strategy archetype (10 of them, each with tuned position-size limits, behavioral voice, and sell triggers) layered with an optional stored `ai_personality_prompt`.
3. Calls `gpt-4o-mini` (temp 0.8, JSON mode) for a single `{action, pitch_id, shares, reasoning}` decision.
4. **Validates and sanitizes** the decision (bad action → HOLD; missing/invalid shares → HOLD; **overspend blocked** before any DB write).
5. Executes the trade against `pitch_market_data.current_price`, writing the ledger + holdings + balance atomically-ish (sequential Supabase calls).
6. Logs the entire prompt + raw response + decision + outcome to `ai_trading_logs`.

Persona generation is a separate endpoint, `src/app/api/admin/ai-generate-persona/route.ts` (`gpt-4o`), producing a structured `[SECTION]` persona template stored on the investor row.

### Market feed — `src/lib/price-cache.ts` (~75 lines)
`fetchPriceWithCache(ticker, pitchId, apiKey)`: Finnhub `/quote`, a **5-minute in-memory `Map` cache**, and graceful **stale-fallback** (on API error, return the last cached price even if very old; only throw if there is no cache at all, so the caller can fall back to the DB price).

### Cron / trading loop — `vercel.json`
Three crons:
- `/api/admin/ai-trading/cron` at `30 14 * * 1-5` and `30 20 * * 1-5` (weekdays, ~1h after open and ~30m before close, EST). This calls the trigger endpoint internally. ✅ wired.
- `/api/sync-prices` hourly (`0 * * * *`). ❌ **the route does not exist** (see §4).

The trigger has a **hardcoded US market holiday calendar for 2025–2026** and a weekend guard.

### Auth — gutted
- `middleware.ts` is a **no-op passthrough**; every route is public (spectator model).
- `src/lib/auth.ts` still contains full **Manaboodle SSO** header helpers (`getUser`/`requireUser`) — intact but **unused**.
- The `/admin` console is "protected by the admin page itself" (client-side password). The cron→trigger call uses a **hardcoded bearer token**.

### Deploy stack
Next.js 15 App Router on Vercel; Supabase via `@supabase/supabase-js` with the service-role key in API routes; env-driven (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OPENAI_API_KEY`, `STOCK_API_KEY`, `CRON_SECRET`). A large client-side admin console lives at `src/app/admin/page.tsx` (~1,712 lines): AI CRUD, persona generation, manual trade trigger, resets.

## 4. Known issues & fragility (stated honestly)

- **Dead committed schema.** `supabase/schema.sql` defines the *original voting platform* (`top_startups`, `student_projects`, `startup_votes`, `project_votes`). It is **not** the live schema and is unused by the running app. The real schema is `investment_system_migration.sql` plus scattered migrations.
- **~100 loose SQL scripts.** `supabase/` is full of one-off `add_*`, `fix_*`, `reset_*`, `debug_*`, `check_*`, `recalc_*` scripts. There is no clean migration history; reconstructing "the current schema" requires archaeology.
- **Missing `/api/sync-prices` route.** `vercel.json` schedules it hourly, but the route was never built (or was removed). That cron 404s.
- **Manual price-sync culture.** Because the sync route is missing, `pitch_market_data.current_price` (the price trades *execute* at) was kept current **by hand** via SQL (`sync_live_prices_now.sql`, `update_current_live_prices.sql`, etc.). Decisions used live Finnhub prices while execution used the DB price — an integrity gap patched manually. This is the single biggest operational fragility.
- **Commented-out cron idempotency.** `cron/route.ts` has duplicate-run protection (`start_cron_run` / `complete_cron_run` RPCs) written but **disabled with a TODO**. Nothing structurally prevents a slot from running twice.
- **Hardcoded cron auth.** cron→trigger sends `Authorization: Bearer admin-cron-token` rather than using `CRON_SECRET`.
- **Hardcoded holiday calendar.** Market-closed dates are a literal 2025–2026 table in `trigger/route.ts`; it goes stale after 2026.
- **Dead bonding-curve pricing path.** The original design priced shares internally (`calculate_share_price = 100 × (1 + total_volume / 1,000,000)` — price rises with money invested). The project later pivoted to **real stock prices via Finnhub**. Both paths still exist in the code; the bonding-curve function is effectively dead but never removed.
- **In-memory price cache is per-instance.** The cache is a module-level `Map`, so on Vercel it does not persist across serverless instances — it helps within a request burst, not globally. (Carried into EXTRACT_LIST.md as a known weakness to fix.)
- **Operational hand-holding.** The volume of `fix_`/`recalc_`/`reset_` scripts is itself the signal: the live system needed regular manual correction of prices and balances.

## 4a. Shutdown actions taken at freeze

To stop live activity (the app was on Vercel with the trading crons still firing):

- **`vercel.json` `crons[]` emptied to `[]`** as a code-level kill switch. A redeploy of this commit removes all scheduled jobs from Vercel, stopping the twice-daily AI trading and the (already-broken) hourly price sync. *(The disarm note lives here and in the freeze commit message rather than inline in `vercel.json`, because that file is strict JSON — comments / unknown keys would fail Vercel's parser and could leave the old cron-armed deployment live.)*
- The freeze commit was pushed to trigger that cron-less redeploy.
- **Remaining manual shutdown** (cannot be done from the repo) is whatever is listed in the freeze conversation / the project owner's checklist: disabling or deleting the Vercel project/deployment if full teardown is wanted, revoking the `OPENAI_API_KEY` / `STOCK_API_KEY` (Finnhub) / `CRON_SECRET`, and optionally pausing the Supabase project. Emptying `crons[]` only stops the *schedule*; the manual admin trigger endpoint still exists in code and would run if invoked.

## 5. Where the reusable core went

The portable, concept-agnostic engineering — the multi-agent persona engine, the audit-logging schema, the external-API-with-cache pattern, and the deploy skeleton — is documented, with real logic reproduced, in **[EXTRACT_LIST.md](EXTRACT_LIST.md)**. That file is the bridge to the new repo and is written to stand alone without access to this code.
