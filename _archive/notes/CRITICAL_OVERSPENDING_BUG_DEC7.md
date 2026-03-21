# CRITICAL: AI Trading Overspending Bug - Dec 7, 2025

## URGENT ISSUE
Multiple AI investors now have **MILLIONS in portfolio value** despite starting with only $1M each.
This indicates the balance validation is **COMPLETELY BROKEN** and AIs are spending far beyond their available cash.

## Current State (Dec 7)
- **Expected:** Each AI should have ~$1M total (cash + holdings)
- **Actual:** Multiple AIs have millions in portfolio value
- **Root Cause:** Balance validation not working despite code claiming to check `totalCost > balanceBefore`

## Investigation Needed
Run these queries to assess damage:

```sql
-- 1. Show all AI portfolios (should all be ~$1M)
SELECT 
  display_name,
  available_tokens as cash,
  (SELECT SUM(current_value) FROM user_investments ui WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) as holdings,
  available_tokens + (SELECT SUM(current_value) FROM user_investments ui WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) as total_portfolio,
  CASE 
    WHEN available_tokens + (SELECT SUM(current_value) FROM user_investments ui WHERE ui.user_id = utb.user_id AND ui.shares_owned > 0) > 1000000 
    THEN 'OVERSPENT'
    ELSE 'OK'
  END as status
FROM user_token_balances utb
WHERE is_ai_investor = true
ORDER BY total_portfolio DESC;

-- 2. Count how many cron runs happened since Dec 3
SELECT 
  DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST') as date,
  COUNT(DISTINCT DATE_TRUNC('minute', created_at)) as cron_runs,
  COUNT(*) as total_trades
FROM ai_trading_logs
WHERE created_at >= '2025-12-03'
GROUP BY DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'EST')
ORDER BY date;

-- 3. Find the worst overspenders
SELECT 
  display_name,
  COUNT(*) as total_trades,
  SUM(CAST(SUBSTRING(execution_message FROM 'for \$([0-9.]+)') AS NUMERIC)) as total_logged_spend,
  (SELECT available_tokens FROM user_token_balances utb2 WHERE utb2.display_name = atl.display_name) as current_cash
FROM ai_trading_logs atl
WHERE created_at >= '2025-12-03'
  AND execution_success = true
GROUP BY display_name
ORDER BY total_logged_spend DESC;
```

## Known Issues

### 1. Balance Validation Not Working
**File:** `/src/app/api/admin/ai-trading/trigger/route.ts` (lines 383-404)
**Problem:** Code claims to validate `totalCost > balanceBefore` but AIs are still overspending
**Possible Causes:**
- Balance not being refreshed between trades in same cron run
- Race condition with multiple cron instances running simultaneously
- Database transaction not properly rolling back failed trades
- `balanceBefore` variable being cached/stale

### 2. Multiple Cron Executions Per Window
**Evidence:** Dec 3 showed 4 manual test runs + 1 scheduled run = 5 executions
**Problem:** Cron may be running multiple times (Vercel Edge timeout retries?)
**Impact:** Each AI getting 5x the trades = 5x the spending

### 3. No Transaction Rollback
**Problem:** If a trade validation fails, the log is created but database state may be inconsistent
**Evidence:** Logs show successful trades that shouldn't have been possible given balance

## TO-DO LIST (PRIORITY ORDER)

### IMMEDIATE (Before Next Cron Run)
- [ ] **DISABLE CRON** - Temporarily stop automatic trading until bug is fixed
  - Comment out cron schedule in `vercel.json`
  - Or add feature flag to skip trading if not in test mode
  
- [ ] **Reset All AI Balances to $1M**
  ```sql
  UPDATE user_token_balances 
  SET available_tokens = 1000000.00, total_invested = 0 
  WHERE is_ai_investor = true;
  
  DELETE FROM user_investments WHERE user_id IN (
    SELECT user_id FROM user_token_balances WHERE is_ai_investor = true
  );
  
  -- Clear logs if needed
  TRUNCATE ai_trading_logs;
  ```

### HIGH PRIORITY (Fix Core Bug)
- [ ] **Add Transaction Locking**
  - Wrap entire trade execution in database transaction
  - Use `FOR UPDATE` lock on user_token_balances row
  - Ensure balance can't change mid-trade

- [ ] **Refresh Balance Before EVERY Trade**
  ```typescript
  // BEFORE calculating trade
  const { data: freshBalance } = await supabase
    .from('user_token_balances')
    .select('available_tokens')
    .eq('user_id', ai.user_id)
    .single();
  
  if (!freshBalance) throw new Error('Failed to get fresh balance');
  
  const balanceBefore = freshBalance.available_tokens;
  const totalCost = decision.shares * currentPrice;
  
  if (totalCost > balanceBefore) {
    // BLOCK TRADE
    return { success: false, message: 'Insufficient funds' };
  }
  ```

- [ ] **Add Idempotency Key**
  - Generate unique key per cron execution (timestamp + random)
  - Store in ai_trading_logs to detect duplicate runs
  - Skip execution if key already exists in last 5 minutes

- [ ] **Log Balance at Every Step**
  ```typescript
  console.log(`[${ai.display_name}] BEFORE: $${balanceBefore}`);
  console.log(`[${ai.display_name}] ATTEMPTING: ${shares} @ $${price} = $${totalCost}`);
  // ... execute trade ...
  console.log(`[${ai.display_name}] AFTER: $${balanceAfter}`);
  console.log(`[${ai.display_name}] ACTUAL DB: $${freshBalance.available_tokens}`);
  ```

### MEDIUM PRIORITY (Improve Reliability)
- [ ] **Add Database Constraints**
  ```sql
  -- Prevent negative balances
  ALTER TABLE user_token_balances 
  ADD CONSTRAINT positive_balance 
  CHECK (available_tokens >= 0);
  
  -- Prevent negative shares
  ALTER TABLE user_investments 
  ADD CONSTRAINT positive_shares 
  CHECK (shares_owned >= 0);
  ```

- [ ] **Add Pre-Trade Validation Endpoint**
  - Test endpoint that simulates trade without executing
  - Verify balance checks work before enabling cron
  - `/api/admin/ai-trading/test-validation`

- [ ] **Implement Trade Limits**
  - Max trade size: 45% of balance (per design)
  - Max trades per day: 2 (morning + afternoon)
  - Add `last_trade_at` column to prevent duplicate same-minute trades

### LOW PRIORITY (Monitoring & Safety)
- [ ] **Add Admin Alerts**
  - Email/Slack notification if any AI portfolio > $1.1M
  - Alert if platform total != $11M
  - Warning if any single trade > $500K

- [ ] **Create Test Suite**
  - Unit tests for balance validation logic
  - Integration test: Run cron 10x, verify all stay at $1M
  - Stress test: 100 concurrent trade attempts

- [ ] **Add Circuit Breaker**
  - If 3+ AIs overspend in single cron run, disable trading
  - Require manual admin reset to re-enable

## Testing Protocol (Before Re-Enabling Cron)

1. **Reset to Clean State**
   - All AIs: $1M cash, 0 holdings
   - Platform total: $11M
   - Clear all ai_trading_logs

2. **Manual Test Run #1**
   - Trigger `/api/admin/ai-trading/trigger` manually
   - Verify: All trades stay within balance
   - Check: Platform total still $11M
   - Review: Vercel logs for any errors

3. **Manual Test Run #2**
   - Trigger again immediately (test idempotency)
   - Verify: No duplicate trades executed
   - Check: Balances match expected amounts

4. **Manual Test Run #3**
   - Wait 5 minutes, trigger again
   - Verify: Each AI made max 1 new trade
   - Check: No overspending occurred

5. **Enable Cron (One Day Only)**
   - Monitor closely for 24 hours
   - Check after each scheduled run (9:30 AM, 3:30 PM EST)
   - Be ready to disable immediately if issues appear

6. **Full Production**
   - Only after 3+ days of successful test runs
   - Continue daily monitoring for first week

## Files to Review/Modify

### Primary Suspect
- `/src/app/api/admin/ai-trading/trigger/route.ts`
  - Lines 383-404: Balance validation
  - Lines 675-720: Main execution loop
  - Lines 440-480: BUY trade execution

### Supporting Files
- `/src/lib/price-cache.ts` - Ensure prices aren't causing calculation errors
- `vercel.json` - Cron schedule configuration
- `/src/app/api/admin/ai-trading/cron/route.ts` - Cron entry point

## Questions to Answer

1. **Why is validation failing?**
   - Is `balanceBefore` stale?
   - Is `totalCost` calculated wrong?
   - Is the IF condition never being hit?

2. **Are crons running multiple times?**
   - Check Vercel logs for duplicate executions
   - Look for timeout/retry patterns

3. **Is database state getting corrupted?**
   - Are there partial transactions?
   - Do balances match sum of transactions?

4. **When did it start?**
   - Was Dec 3 morning cron (9:30 AM) clean?
   - Did it break during afternoon cron (3:30 PM)?
   - Or did it accumulate over multiple days?

## Time Wasted
- **Dec 3-4:** Spent on admin display bug ($53M showing instead of $1M)
- **Dec 7:** Discovered actual overspending bug
- **Total:** ~3-4 days lost to trading system bugs

## Risk Assessment
**CRITICAL:** If not fixed before Harvard launch, students will see:
- Broken leaderboard (AIs with millions)
- Unfair competition (AIs have unlimited money)
- Platform credibility destroyed
- Potential financial liability if real money ever involved

## Next Session Goals
1. Run diagnostic queries to assess full damage
2. Identify exact moment/trade where overspending started
3. Fix balance validation with transaction locking
4. Test fix 10+ times manually
5. Monitor first real cron run closely
6. Document root cause for future reference

---

**STATUS:** Cron should be DISABLED until this is fixed and thoroughly tested.
**PRIORITY:** P0 - Blocks launch
**OWNER:** Needs immediate attention
**ESTIMATED FIX TIME:** 4-8 hours (investigation + fix + testing)
