# Session Summary - December 2, 2025

## 🐛 Critical Issues Discovered

After first cron run on December 1st, found severe bugs in AI trading system:

### Issue 1: The Contrarian Over-Spending ($2.1M with $1M balance)
**Symptom:** The Contrarian bought 9,640 shares of RDDT @ $5 = $2,153,576 despite only having $1M
**Root Cause:** No balance validation before trade execution
**Impact:** Database corruption, negative balances possible

### Issue 2: Cloud Surfer Bought Delisted AKAM
**Symptom:** Cloud Surfer purchased AKAM which is NOT in current HM14 index
**Root Cause:** Hardcoded `HM14_PITCHES` array with outdated companies (AKAM, DBX, WRBY, BKNG, RDDT)
**Impact:** AIs could trade non-existent/delisted stocks

### Issue 3: Unpredictable Trading Patterns
**Symptom:** All AIs bought same company, no diversity
**Root Cause:** Multiple issues:
- Hardcoded array mismatched actual database pitch_ids
- AI prompt referenced wrong pitch_id ranges
- No clear pitch_id labeling in market data

---

## ✅ Fixes Applied

### Fix 1: Removed Hardcoded HM14_PITCHES Array
**File:** `/src/app/api/admin/ai-trading/trigger/route.ts`

**Before:**
```typescript
const HM14_PITCHES = [
  { id: 1, name: 'Meta', ticker: 'META', ... },
  { id: 3, name: 'Dropbox', ticker: 'DBX', ... },  // WRONG - not in HM14
  { id: 4, name: 'Akamai', ticker: 'AKAM', ... },  // WRONG - delisted
  // ... more outdated entries
];
```

**After:**
```typescript
// REMOVED - now uses only dynamic database data
```

**Why:** The hardcoded array was from HM7 (old index) which included non-Harvard companies. HM14 is Harvard-verified founders only. Must pull from `ai_readable_pitches` view dynamically.

---

### Fix 2: Strict Balance Validation
**File:** `/src/app/api/admin/ai-trading/trigger/route.ts`

**Added BEFORE trade execution:**
```typescript
const totalCost = decision.shares * priceData.current_price;
const balanceBefore = aiInvestor.available_tokens;

// CRITICAL: Strict balance validation BEFORE any transaction
if (totalCost > balanceBefore) {
  const maxShares = Math.floor(balanceBefore / priceData.current_price * 100) / 100;
  console.error(`[AI Trading] ${aiInvestor.ai_nickname} OVERSPENDING BLOCKED`);
  return { 
    success: false, 
    message: `tried $${totalCost.toFixed(2)} but only has $${balanceBefore.toFixed(2)}. Max: ${maxShares} shares`
  };
}

// Additional check: don't exceed total portfolio
if (totalCost > aiInvestor.total_tokens) {
  return { success: false, message: 'exceeds total portfolio value' };
}

const balanceAfter = balanceBefore - totalCost;
```

**Result:** The Contrarian's overspending would now be blocked with clear error message.

---

### Fix 3: Dynamic Pitch Data Throughout
**Changed:**
1. **executeTrade() signature:** Now accepts `pitches` parameter
2. **BUY action:** Validates pitch_id exists in current database
3. **SELL action:** Validates pitch_id exists in current database
4. **Success messages:** Use actual `pitch.company_name` and `pitch.ticker` from database

**Before:**
```typescript
async function executeTrade(supabase, aiInvestor, decision) {
  const pitch = HM14_PITCHES.find(p => p.id === decision.pitch_id); // WRONG
  // ...
}
```

**After:**
```typescript
async function executeTrade(supabase, aiInvestor, decision, pitches) {
  const pitch = pitches.find(p => p.pitch_id === decision.pitch_id);
  if (!pitch) {
    return {
      success: false,
      message: `Invalid pitch_id ${decision.pitch_id} - not found in available pitches`
    };
  }
  // ...
}
```

---

### Fix 4: Improved AI Prompt
**Changes:**
1. Added `[Pitch ID: X]` label to each company in market data
2. Dynamic pitch_id validation in JSON schema
3. Removed outdated "Reddit" example
4. Added explicit instruction: "Use ONLY the Pitch IDs listed above"

**Before:**
```typescript
const marketData = pitches.map(p => {
  return `${p.company_name} (${p.ticker}) - ${p.category}
    Price: $${p.current_price}...`;
}).join('\n\n');

// JSON schema said: "pitch_id": number (1-7)  // WRONG range
```

**After:**
```typescript
const marketData = pitches.map(p => {
  return `[Pitch ID: ${p.pitch_id}] ${p.company_name} (${p.ticker}) - ${p.category}
    Price: $${p.current_price}...`;
}).join('\n\n');

const validPitchIds = pitches.map(p => p.pitch_id).sort((a, b) => a - b);

// JSON schema: "pitch_id": number (valid IDs: 1, 2, 8, 9, 10, 11, 12, 13, 14)
```

**Result:** AI now sees exact valid pitch_ids and can't request invalid ones.

---

## 🔄 Database Reset (December 2)

**File:** `/workspaces/rize/RESET_ALL_TO_1M_DEC2.sql`

**Actions:**
```sql
-- Delete all corrupted data
DELETE FROM investment_transactions;
DELETE FROM user_investments;
DELETE FROM ai_trading_logs;

-- Reset all balances to $1M
UPDATE user_token_balances
SET available_tokens = 1000000, total_tokens = 1000000, total_invested = 0
WHERE user_id IS NOT NULL;

-- Ensure all AIs active
UPDATE user_token_balances
SET is_active = true
WHERE is_ai_investor = true;
```

**Status:** Clean slate for December 3rd cron runs.

---

## 📊 Current System State (Dec 2, Evening)

### Cron Schedule (Unchanged)
```json
{
  "path": "/api/admin/ai-trading/cron",
  "schedule": "30 14,20 * * *"
}
```

**Translation:**
- **14:30 UTC** = 9:30 AM EST (1 hour after market open)
- **20:30 UTC** = 3:30 PM EST (30 min before market close)
- Runs **every day** (7 days/week)

### Available Companies (HM14 - Harvard Verified Only)
Current tradeable pitch_ids: **1, 2, 8, 9, 10, 11, 12, 13, 14**

**HM14 Companies:**
1. Meta (META) - Mark Zuckerberg
2. Microsoft (MSFT) - Bill Gates
8. Affirm (AFRM) - Alex Rampell
9. Peloton (PTON) - John Foley
10. Asana (ASAN) - Justin Rosenstein
11. Lyft (LYFT) - Logan Green
12. ThredUp (TDUP) - James Reinhart
13. Nextdoor (KIND) - Nirav Tolia
14. Rent the Runway (RENT) - Jennifer Hyman

**REMOVED (non-Harvard):**
- ~~Dropbox (DBX)~~ - Drew Houston (MIT)
- ~~Akamai (AKAM)~~ - Tom Leighton (MIT)
- ~~Warby Parker (WRBY)~~ - Not Harvard
- ~~Booking.com (BKNG)~~ - Not Harvard
- ~~Reddit (RDDT)~~ - Not Harvard

### AI Investors Status
All 10 AIs active at $1M:
1. Cloud Surfer
2. Diamond Hands
3. FOMO Master
4. Hype Train
5. Silicon Brain
6. Steady Eddie
7. The Boomer
8. The Contrarian
9. The Oracle
10. YOLO Kid

---

## 🎯 TO-DO: December 3, 2025

### Morning - After 9:30 AM EST Cron Run

#### 1. Check Vercel Cron Logs
**URL:** Vercel Dashboard → Cron Jobs → `/api/admin/ai-trading/cron`

**Expected:**
```
[AI Trading Cron] ===== CRON TRIGGERED =====
[AI Trading Cron] Starting automated trading run...
[AI Trading] Processing: Cloud Surfer (uuid...)
[AI Trading] Cloud Surfer fresh balance: $1000000.00
[AI Trading] Cloud Surfer decision: BUY
[AI Trading] Cloud Surfer result: SUCCESS - bought X shares...
... (repeat for all 10 AIs)
[AI Trading Cron] Completed: { success: true, results: 10 }
```

**Red Flags:**
- ❌ "OVERSPENDING BLOCKED" - balance validation working (good) but AI math is wrong
- ❌ "Invalid pitch_id X - not found" - AI requesting wrong pitch_id
- ❌ 401 Unauthorized - cron auth broken again
- ❌ Timeout - increase maxDuration or optimize

---

#### 2. Check Database Logs
```sql
-- Should show ~10 logs from morning cron
SELECT 
  execution_timestamp,
  ai_nickname,
  decision_action,
  ticker_or_company,
  shares_count,
  success,
  error_message,
  decision_reasoning
FROM ai_trading_logs
WHERE DATE(execution_timestamp) = '2025-12-03'
  AND triggered_by = 'cron'
ORDER BY execution_timestamp DESC;
```

**Expected Results:**
- 10 rows (one per AI)
- `triggered_by = 'cron'`
- Mix of BUY/HOLD actions (SELL unlikely on first run)
- All `success = true` (no overspending errors)
- `ticker_or_company` shows valid HM14 tickers only

**Check for:**
- ✅ No AKAM, DBX, WRBY, BKNG, RDDT
- ✅ All amounts < $1,000,000
- ✅ Diverse companies (not all same stock)
- ✅ Different strategies visible (YOLO Kid aggressive, Boomer conservative)

---

#### 3. Verify AI Balances Changed
```sql
SELECT 
  ai_nickname,
  available_tokens as cash,
  total_tokens - available_tokens as invested,
  total_tokens as total
FROM user_token_balances
WHERE is_ai_investor = true
ORDER BY invested DESC;
```

**Expected:**
- Balances should vary (not all $1M anymore)
- YOLO Kid near top (most invested)
- The Boomer near bottom (least invested)
- All `total` should be ~$1M (no over-spending)
- No negative balances

**Red Flags:**
- ❌ All still at $1M → None traded (check logs for errors)
- ❌ Any total > $1M → Overspending bug still present
- ❌ Negative balances → Critical bug

---

#### 4. Check Actual Trades
```sql
SELECT 
  utb.ai_nickname,
  p.company_name,
  p.ticker,
  it.transaction_type,
  it.shares_count,
  it.price_per_share,
  it.amount_mtk,
  it.timestamp
FROM investment_transactions it
JOIN user_token_balances utb ON it.user_id = utb.user_id
JOIN pitches p ON it.pitch_id = p.id
WHERE utb.is_ai_investor = true
  AND DATE(it.timestamp) = '2025-12-03'
ORDER BY it.timestamp DESC;
```

**Analysis:**
- ✅ Trades spread across multiple companies (diversity)
- ✅ Only valid HM14 tickers (META, MSFT, AFRM, PTON, ASAN, LYFT, TDUP, KIND, RENT)
- ✅ Trade sizes match personalities:
  - YOLO Kid: Large positions (80-95% of balance)
  - The Boomer: Small positions (5-15%)
  - Steady Eddie: Multiple small positions (diversified)
  - Diamond Hands: Buy only (no sells)

**Red Flags:**
- ❌ AKAM, DBX, RDDT appear → Fix didn't work
- ❌ All bought same company → Prompt issue
- ❌ amount_mtk > $1M → Validation failed

---

### Evening - After 3:30 PM EST Cron Run

#### 5. Compare Morning vs Evening
```sql
SELECT 
  DATE_TRUNC('hour', execution_timestamp) as trade_hour,
  COUNT(*) as total_logs,
  COUNT(CASE WHEN decision_action = 'BUY' THEN 1 END) as buys,
  COUNT(CASE WHEN decision_action = 'SELL' THEN 1 END) as sells,
  COUNT(CASE WHEN decision_action = 'HOLD' THEN 1 END) as holds,
  COUNT(CASE WHEN success = false THEN 1 END) as errors
FROM ai_trading_logs
WHERE DATE(execution_timestamp) = '2025-12-03'
  AND triggered_by = 'cron'
GROUP BY DATE_TRUNC('hour', execution_timestamp)
ORDER BY trade_hour;
```

**Expected:**
- 2 rows (9:00 AM and 3:00 PM EST hours)
- Each ~10 logs
- Morning: More BUYs (starting fresh)
- Evening: Mix of BUY/SELL/HOLD (reacting to positions)
- Few/no errors

---

#### 6. End-of-Day Portfolio Analysis
```sql
-- Who performed best?
SELECT 
  utb.ai_nickname,
  utb.ai_strategy,
  utb.available_tokens as cash,
  SUM(ui.current_value) as holdings_value,
  utb.available_tokens + COALESCE(SUM(ui.current_value), 0) as total_value,
  utb.available_tokens + COALESCE(SUM(ui.current_value), 0) - 1000000 as profit_loss
FROM user_token_balances utb
LEFT JOIN user_investments ui ON utb.user_id = ui.user_id
WHERE utb.is_ai_investor = true
GROUP BY utb.user_id, utb.ai_nickname, utb.ai_strategy, utb.available_tokens
ORDER BY profit_loss DESC;
```

**Questions to Answer:**
1. Which AI gained the most in one day?
2. Which AI lost the most?
3. Did strategies work as expected?
   - YOLO Kid: High risk = high reward/loss?
   - The Boomer: Steady, minimal change?
   - Diamond Hands: Still holding everything?
   - The Contrarian: Bought dips, sold peaks?
4. Are trades diverse across HM14 companies?

---

## 🚨 If Issues Found

### Issue: Overspending Errors in Logs
**Symptoms:** Logs show "OVERSPENDING BLOCKED" messages

**Diagnosis:**
- OpenAI is calculating shares incorrectly
- AI prompt math example needs clarification
- Strategy limits might be confusing AI

**Fix:**
- Review AI `decision_reasoning` to see logic
- Adjust prompt to be more explicit about calculation
- Add example showing: "budget $100,000 / price $50 = 2000 shares"

---

### Issue: All AIs Still HOLD
**Symptoms:** All 10 AIs chose HOLD, no trades

**Diagnosis:**
- OpenAI being too conservative
- Personas not aggressive enough
- Market conditions not triggering trades

**Fix:**
- Check individual persona prompts in admin
- Make personas more action-oriented
- Reduce HOLD threshold in prompts

---

### Issue: Invalid pitch_id Errors
**Symptoms:** Logs show "Invalid pitch_id X - not found"

**Diagnosis:**
- AI requesting pitch_id not in database
- Prompt not clearly showing valid IDs
- Database view missing companies

**Fix:**
- Verify `ai_readable_pitches` view has all expected companies
- Make pitch_id labeling more prominent in prompt
- Add explicit "DO NOT use pitch_ids outside this list" warning

---

### Issue: Still Buying AKAM/DBX/etc
**Symptoms:** Trades show delisted tickers

**Diagnosis:**
- Code not deployed properly
- Using cached version
- Database has wrong data

**Fix:**
- Verify deployment timestamp on Vercel
- Check git commit deployed
- Verify `pitches` table ticker list

---

## 📝 Files Modified Today

### Backend
- `/src/app/api/admin/ai-trading/trigger/route.ts`
  - Removed hardcoded HM14_PITCHES array
  - Added strict balance validation
  - Updated executeTrade to use dynamic pitches
  - Enhanced AI prompt with pitch_id labels
  - Fixed BUY/SELL message formatting

### Database
- `/workspaces/rize/RESET_ALL_TO_1M_DEC2.sql` - Clean reset for Dec 3

### Documentation
- `/workspaces/rize/SESSION_DEC2_AI_TRADING_FIXES.md` - This document

---

## 📈 Success Metrics for December 3

### ✅ Core Functionality
- [ ] Both cron runs execute (9:30 AM, 3:30 PM EST)
- [ ] All 10 AIs process successfully
- [ ] No overspending errors in actual trades
- [ ] Only valid HM14 tickers appear

### ✅ Trading Diversity
- [ ] At least 5 different companies traded
- [ ] At least 5 different AIs made trades
- [ ] Mix of BUY/HOLD actions (morning)
- [ ] Some SELL actions (evening if positions decline)

### ✅ Strategy Adherence
- [ ] YOLO Kid: Largest positions (80-95% invested)
- [ ] The Boomer: Smallest positions (5-15% invested)
- [ ] Diamond Hands: No SELL actions
- [ ] The Contrarian: Bought dips (negative price change)
- [ ] Steady Eddie: Multiple holdings (diversified)

### ✅ System Health
- [ ] No AKAM, DBX, WRBY, BKNG, RDDT trades
- [ ] All balances ≤ $1M
- [ ] No negative balances
- [ ] No database errors
- [ ] Vercel logs clean

---

## 🎉 Next Steps (If Dec 3 Success)

1. **Performance Dashboard**
   - Create leaderboard showing AI performance
   - Track daily P&L for each AI
   - Show portfolio composition

2. **Historical Analysis**
   - Which strategies work best over time?
   - Do Harvard companies outperform market?
   - Compare AI vs human (ManaMana) performance

3. **Strategy Refinement**
   - Adjust personas based on behavior
   - Fine-tune trading limits
   - Add new AI personalities

4. **User Features**
   - Let users compete against AIs
   - Show AI reasoning on frontend
   - Real-time trading notifications

---

*Session completed: December 2, 2025, Evening*  
*Next check: December 3, 2025, after 9:30 AM EST*  
*Status: Ready for testing with fixed code*
