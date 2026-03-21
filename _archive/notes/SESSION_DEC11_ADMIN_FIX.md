# Session Notes - December 11, 2025

## Summary
Fixed admin page data integrity checks for human investors and prepared AI portfolio reset + CRON reactivation.

---

## What We Fixed

### 1. Admin Page - Human Investor Support
**Problem:** Human investors (like "Super ManaMana") showed "MISMATCH" in the Data Integrity tab because the comparison included the AI Investors API which returns $0 for humans.

**Solution:**
- Skip AI Investors API column for human investors (shows 3 columns instead of 4)
- Added `closeEnough()` tolerance function (< $1 difference OK) for price timing variations
- Fixed max difference calculation to exclude AI Investors API for humans
- Human investors now correctly show "ALL MATCH" when Data Integrity ≈ Leaderboard

**Files Changed:**
- `src/app/admin/page.tsx` - Comparison logic and display

### 2. AI Portfolio Reset
Created `RESET_AI_DEC11.sql` to reset all 11 AI investors:
- Delete all holdings from `user_investments`
- Set `available_tokens = 1,000,000`
- Set `total_invested = 0`
- Verification queries included

### 3. CRON Schedule Reactivated
Updated `vercel.json` to run AI trading twice daily on weekdays:

| Schedule | UTC Time | EST Time | Description |
|----------|----------|----------|-------------|
| `30 14 * * 1-5` | 14:30 UTC | 9:30 AM EST | 1 hour after market open |
| `30 20 * * 1-5` | 20:30 UTC | 3:30 PM EST | 30 min before market close |

---

## What to Test Tomorrow (Dec 12, 2025)

### Morning Check (After 9:30 AM EST)
1. **Verify CRON triggered** - Check Vercel Dashboard → Logs for `/api/admin/ai-trading/cron`
2. **Check AI trading logs:**
   ```sql
   SELECT 
     display_name, 
     decision_action, 
     decision_ticker,
     execution_success,
     created_at AT TIME ZONE 'America/New_York' as est_time
   FROM ai_trading_logs 
   WHERE created_at >= '2025-12-12'
   ORDER BY created_at DESC;
   ```

3. **Verify portfolio values (should be close to $1M with small trades):**
   ```sql
   SELECT 
     display_name,
     available_tokens as cash,
     (SELECT COALESCE(SUM(current_value), 0) FROM user_investments ui WHERE ui.user_id = utb.user_id) as holdings,
     available_tokens + (SELECT COALESCE(SUM(current_value), 0) FROM user_investments ui WHERE ui.user_id = utb.user_id) as total
   FROM user_token_balances utb
   WHERE is_ai_investor = true
   ORDER BY display_name;
   ```

4. **Check no overspending (AI total should be ~$10M):**
   ```sql
   -- AI investors only (10 × $1M = $10M)
   SELECT 
     SUM(available_tokens) + 
     (SELECT COALESCE(SUM(current_value), 0) FROM user_investments 
      WHERE user_id IN (SELECT user_id FROM user_token_balances WHERE is_ai_investor = true)) 
     as ai_total,
     10000000 as expected_ai_total
   FROM user_token_balances WHERE is_ai_investor = true;
   ```

### Afternoon Check (After 3:30 PM EST)
- Repeat above checks
- Verify 2 cron runs total for the day
- Each AI should have 2 trade log entries (1 per cron run)

### Admin Page Verification
1. Go to Admin → Data Integrity
2. Verify all AI investors show "ALL MATCH" (green badge)
3. Verify human investor "Super ManaMana" shows "ALL MATCH" with 3-column layout (no AI Investors API column)

---

## Known Issues / Watch For

1. **Price timing differences** - Small ($1-10) differences between APIs are normal due to live price fetching at different moments
2. **Market hours only** - CRON only runs Mon-Fri, won't trigger on weekends
3. **First trade day** - AIs start fresh with $1M, expect conservative initial trades

---

## Files in This Commit
- `src/app/admin/page.tsx` - Human investor support fix
- `vercel.json` - CRON schedule (9:30 AM, 3:30 PM EST Mon-Fri)
- `RESET_AI_DEC11.sql` - AI portfolio reset script
- `SESSION_DEC11_ADMIN_FIX.md` - This file
