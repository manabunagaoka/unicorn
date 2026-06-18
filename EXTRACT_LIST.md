# EXTRACT_LIST.md

The bridge from the frozen **Unicorn** repo to the next one. See [FROZEN_STATE.md](FROZEN_STATE.md) for what the whole project was.

**This document is self-contained on purpose.** The new repo will not have access to this code, so each pattern below reproduces the *actual logic* — shapes, formulas, guards — not just file pointers. Everything here is concept-agnostic: it was built for a trading sim, but the engineering transfers to any system that needs a panel of opinionated LLM actors making auditable decisions over a shared dataset.

Each section ends with **Keep / Fix** — what worked and what to change when rebuilding.

---

## 1. Multi-agent persona engine

The single most valuable thing in the old repo. A roster of distinct AI personalities, each making one structured, validated, logged decision per run over a shared dataset.

### 1a. Strategy archetypes — three tuned dimensions each

Every agent has a `strategy` enum. Each strategy is defined along **three independent dimensions**, all keyed off the same enum. This separation is the reusable idea: *voice*, *sizing*, and *exit* are tuned independently, so you can remix personalities without rewriting prompt logic.

**Dimension 1 — position-size limits** (`min`/`max` as a fraction of available capital, plus a human-readable suggestion). Reproduced shape:

```ts
function getStrategyLimits(strategy: string, available: number) {
  const limits: Record<string, { min: number; max: number; suggestion: string }> = {
    CONSERVATIVE:   { min: 0.05*available, max: 0.15*available, suggestion: '5-15% per trade (small, cautious)' },
    DIVERSIFIED:    { min: 0.15*available, max: 0.25*available, suggestion: '15-25% per trade (balanced)' },
    ALL_IN:         { min: 0.80*available, max: 0.95*available, suggestion: '80-95% all at once (GO BIG)' },
    HOLD_FOREVER:   { min: 0.30*available, max: 0.50*available, suggestion: '30-50% when buying (never sell)' },
    TECH_ONLY:      { min: 0.25*available, max: 0.45*available, suggestion: '25-45% per tech stock' },
    SAAS_ONLY:      { min: 0.30*available, max: 0.50*available, suggestion: '30-50% per SaaS play' },
    MOMENTUM:       { min: 0.60*available, max: 0.90*available, suggestion: '60-90% FOMO hard' },
    TREND_FOLLOW:   { min: 0.30*available, max: 0.60*available, suggestion: '30-60% follow momentum' },
    CONTRARIAN:     { min: 0.25*available, max: 0.55*available, suggestion: '25-55% buy the dip' },
    PERFECT_TIMING: { min: 0.20*available, max: 0.45*available, suggestion: '20-45% precise entries' },
  };
  return limits[strategy] ?? { min: 0.20*available, max: 0.30*available, suggestion: '20-30% moderate' };
  // (original used Math.floor on each bound)
}
```

**Dimension 2 — behavioral voice** (one vivid paragraph per strategy, injected into the prompt). Representative examples:

- `CONSERVATIVE` → *"The Boomer: ONLY established, proven companies… you lived through the dot-com crash — never again!"*
- `ALL_IN` → *"YOLO Kid: Pick ONE stock and BET BIG (80-95%). Fortune favors the bold! No half measures!"*
- `HOLD_FOREVER` → *"Diamond Hands: Buy quality and NEVER sell. Paper hands lose, diamond hands WIN."*
- `MOMENTUM` → *"FOMO Master: You HATE missing gains. Buy stocks rising 1%+. Sitting on >40% cash is UNACCEPTABLE."*
- `CONTRARIAN` → *"Buy when others panic-sell; SELL when others FOMO-buy. Go against the herd ALWAYS."*

**Dimension 3 — sell triggers** (explicit exit thresholds per strategy). Examples:

- `CONSERVATIVE` → "SELL gains 5%+ to lock profit; SELL losers down 3%+ to cut losses."
- `MOMENTUM` → "SELL immediately if a position drops 1%+; SELL winners up 3%+ to chase the next wave."
- `HOLD_FOREVER` → "NEVER SELL. Selling is for paper hands."
- `CONTRARIAN` → "SELL when everyone is buying — a stock up 3%+ and hyped is your exit."

> The trading-specific *content* (percent thresholds, "stocks") is disposable. The reusable structure is: **enum → {sizing, voice, exit} lookup tables**, each independently editable.

### 1b. Persona-prompt layer (override on top of archetype)

Each agent row can carry a stored `ai_personality_prompt`. At decision time:

```ts
const personalityGuidelines = agent.ai_personality_prompt || getStrategyGuidelines(agent.strategy);
```

That stored persona is generated once by a separate endpoint (`gpt-4o`, JSON mode) from a freeform human description into a **fixed `[SECTION]` template**: `[SUMMARY] [BACKGROUND] [ROI_PHILOSOPHY] [SECTOR_FOCUS] [INVESTMENT_STYLE] [COMPANY_TYPE_PREFERENCES] [GREEN_FLAGS] [RED_FLAGS] [BUY_SELL_TIMING]`. Keeping a rigid template made personas comparable and parseable. The generator also defends against the model returning an object instead of a string (it flattens nested objects into `[KEY]\nvalue` text).

### 1c. Decision loop structure

Per run, for each active agent:

1. **Fetch fresh state** right before deciding — re-read the balance from the DB, don't trust an in-memory copy (prevents double-spend across a batch).
2. **Build a rich prompt**: current cash/holdings split (% of total), per-position P&L, an explicit "SELL CANDIDATES" list (positions beyond the strategy's gain/loss thresholds), and the market catalog **shuffled** (`[...items].sort(() => Math.random() - 0.5)`) to kill ordering bias toward whatever appears first.
3. **Single LLM call**: `gpt-4o-mini`, `temperature: 0.8`, `response_format: { type: 'json_object' }`, system message *"Always respond with valid JSON only."*
4. **Expect a strict shape**: `{ action: 'BUY'|'SELL'|'HOLD', pitch_id: number, shares?: number, reasoning: string }`.
5. **Validate/sanitize** (next section).
6. **Execute** + **log** (sections 1d, 2).

### 1d. Output validation / sanitization + overspend guards — DO NOT SKIP

This is what made an LLM safe to put in a write path. Reproduced logic:

**Post-parse sanitization** (coerce bad output to a no-op instead of trusting it):

```ts
const decision = JSON.parse(raw);

// invalid/missing action → HOLD
if (!['BUY','SELL','HOLD'].includes(decision.action)) decision.action = 'HOLD';

// BUY/SELL with no shares → HOLD (annotate reasoning)
if ((decision.action === 'BUY' || decision.action === 'SELL') && !decision.shares) {
  decision.reasoning = `(Converted from ${decision.action} - no shares) ${decision.reasoning ?? ''}`;
  decision.action = 'HOLD';
}

// non-numeric or non-positive shares → HOLD
if (decision.shares && (typeof decision.shares !== 'number' || decision.shares <= 0)) {
  decision.action = 'HOLD';
  decision.shares = undefined;
}
```

**API-error fence**: if the LLM call throws, return a `HOLD` decision whose `reasoning` contains `"Technical difficulties"`. The executor checks for that marker and refuses to trade on it — a failed model call can never move money.

**Overspend guards in the executor** (checked *before any DB write*):

```ts
const totalCost = shares * priceFromDB;          // price read from the DB, not from the LLM
if (totalCost > balanceBefore) return blocked(`overspend: wanted ${totalCost}, has ${balanceBefore}`);
if (totalCost > agent.total_tokens)  return blocked(`cost exceeds total portfolio`);
// SELL path: verify the position exists AND shares_owned >= shares before selling
```

Two principles to carry forward verbatim: **(a) never let the model supply the price** — it proposes `shares`, the server multiplies by an authoritative price; **(b) every BUY/SELL is bounded by a server-side balance/position check that the model cannot talk its way past.**

**Keep:** the three-dimension archetype structure; the persona override + fixed-template generation; fetch-fresh-before-decide; shuffle inputs; strict JSON shape; sanitize-to-no-op; server-authoritative pricing; overspend/position guards; the "Technical difficulties" fence.
**Fix:** trades were a sequence of separate Supabase writes (ledger, holdings, balance) with no real transaction — wrap them in a single DB transaction/RPC so a mid-sequence failure can't leave balances inconsistent. Also make the "API error" detection a real status flag, not a substring match on `reasoning`.

---

## 2. Audit-logging schema

Every decision wrote one row capturing **prompt + raw response + decision + outcome + trigger source** — enough to fully reconstruct or debug any agent action after the fact. Reproducible table def (PostgreSQL):

```sql
CREATE TABLE ai_trading_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT NOT NULL,            -- which agent
  display_name          TEXT,                     -- denormalized for easy reads
  ai_strategy           TEXT,
  -- state snapshot at decision time
  cash_before           NUMERIC,
  portfolio_value_before NUMERIC,
  -- the LLM interaction (the whole point: full reproducibility)
  openai_prompt         TEXT,                     -- exact prompt sent
  openai_response_raw   TEXT,                     -- raw JSON string returned
  -- the parsed decision
  decision_action       TEXT,                     -- BUY | SELL | HOLD
  decision_pitch_id     INTEGER,                  -- target (generalize: target_id)
  decision_shares       NUMERIC,
  decision_reasoning    TEXT,                     -- model's stated why
  -- the outcome
  execution_success     BOOLEAN,
  execution_error       TEXT,
  execution_message     TEXT,
  -- provenance
  triggered_by          TEXT,                     -- 'cron' | 'manual' | 'admin'
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_logs_user    ON ai_trading_logs(user_id);
CREATE INDEX idx_ai_logs_created ON ai_trading_logs(created_at DESC);
CREATE INDEX idx_ai_logs_action  ON ai_trading_logs(decision_action);
CREATE INDEX idx_ai_logs_success ON ai_trading_logs(execution_success);
```

Logging was wrapped in its own try/catch so a logging failure never aborts the actual operation.

**Keep:** storing the *exact prompt and raw response* alongside the parsed decision and the real-world outcome — this is what made the agents debuggable and the feed trustworthy; the `triggered_by` provenance field; logging isolated from the main path.
**Fix:** generalize the trading-specific columns (`decision_pitch_id`/`decision_shares`) to a single `decision_payload JSONB`; add a `model`/`model_version` column (the old logs didn't record which model produced them); consider a token-count/cost column.

---

## 3. External-API-with-cache + graceful-fallback

From `price-cache.ts`. A tiny resilient fetch wrapper: cache hits, then a fresh fetch, then **degrade to stale rather than fail**. Reproduced logic:

```ts
const cache = new Map<string, { value: number; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 min

async function fetchWithCache(key: string, apiKey: string): Promise<number> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.ts < TTL) return hit.value;          // 1. fresh cache

  try {
    const res = await fetch(url(key, apiKey), {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),                    // hard 5s timeout
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    if (data.value > 0) {
      cache.set(key, { value: data.value, ts: now });       // 2. fresh fetch → update cache
      return data.value;
    }
    if (hit) return hit.value;                              // 3a. bad data → stale cache
    throw new Error('bad data and no cache');
  } catch (err) {
    if (hit) return hit.value;                              // 3b. error → stale cache (any age)
    throw err;                                              // 4. no cache at all → let caller fall back (e.g. DB price)
  }
}
```

The escalation ladder is the pattern: **fresh cache → live fetch → stale cache → throw so the caller can fall back to its own source of truth.** Plus a hard per-request timeout and `no-store` to defeat upstream caching.

**Keep:** the four-step degrade ladder; the request timeout; throwing only when there is truly no fallback so the *caller* owns the final fallback (here, the DB price).
**Fix (known weakness):** the cache is a module-level `Map`, so on Vercel/serverless it is **per-instance** and does not survive cold starts or span instances — most requests missed it. Next time back it with **Redis / Vercel KV / Upstash** (or any shared store) so the cache is actually shared, and stamp each entry with its age so stale reads are observable.

---

## 4. Deploy skeleton (Next 15 + Supabase + Vercel cron + admin console)

Structural description — reproduce the shape, not the trading specifics.

- **Framework:** Next.js 15 App Router, TypeScript, Tailwind. Public read pages are client components that poll JSON API routes (`/api/*`) on an interval (the spectator dashboard polled every 30s).
- **Data:** Supabase Postgres. API routes create a server client with the **service-role key** (`createClient(URL, SERVICE_KEY, { auth: { persistSession: false } })`) and enforce access in the app layer. Read routes set `export const dynamic = 'force-dynamic'` and `Cache-Control: no-store`.
- **Scheduled work:** `vercel.json` `crons[]` hitting `/api/*` GET routes on cron expressions. A cron route should: verify a shared secret from the environment, do an **idempotency check** (has this slot already run?), do the work, and record completion. (The old repo had the idempotency code but left it commented out — *do it for real*.)
- **Background engine:** a privileged POST route (`/api/admin/.../trigger`) that runs the actual batch. Keep `runtime = 'nodejs'`, set `maxDuration`, and guard against long-running fan-out exceeding the platform timeout (the old code skipped per-item delays when invoked by cron for exactly this reason).
- **Admin console:** a single client-side page for CRUD on agents, persona generation, manual trigger, and resets. Convenient, but it was the weakest security surface.

**Keep:** API-routes-as-backend + polled client pages; service-role client confined to server routes with `no-store`; cron→privileged-trigger split; `runtime`/`maxDuration` discipline.
**Fix:** real auth on admin + cron (the old repo used a **hardcoded `Bearer admin-cron-token`** and a client-side admin password — replace with a verified secret / signed request / proper session); turn on the cron idempotency that was left commented out; don't hardcode calendars/config (the holiday table was a literal 2025–2026 map) — make them data or compute them.

---

## Quick reuse checklist for the new repo

- [ ] Persona engine: enum → `{sizing, voice, exit}` tables + stored-persona override + fixed template.
- [ ] Decision loop: fetch-fresh → rich+shuffled prompt → strict JSON → sanitize-to-no-op → server-authoritative execution → audit log.
- [ ] Guards: never trust model-supplied prices/amounts; bound every write with a server-side check; fence model-call failures.
- [ ] `ai_trading_logs`-style audit table (generalized to `decision_payload JSONB` + `model` column).
- [ ] Cache wrapper with the four-step degrade ladder — but **shared store, not in-memory**.
- [ ] Deploy skeleton with **real** cron auth + **enabled** idempotency, and config-as-data instead of hardcoded tables.
