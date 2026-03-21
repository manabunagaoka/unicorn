# AI Investor Testing & Fine-Tuning System
**Date**: November 9, 2025  
**Status**: Ready for Testing

---

## 🎯 What We Built

A complete AI investor testing and management system that allows you to:
1. **Manually trigger AI trading** (test anytime, market open or closed)
2. **View complete trading logs** (see every OpenAI prompt/response)
3. **Edit AI personalities** (coming next - tune strategies, catchphrases)
4. **Debug in real-time** (know exactly what each AI is thinking)

---

## 📁 Files Created/Modified

### **New Files:**
1. `/supabase/create_ai_trading_logs.sql` - Database table for capturing all AI activity
2. `/src/app/api/admin/ai-trading/trigger/route.ts` - Manual trigger endpoint (bypasses cron)
3. `/scripts/test-ai-system.sh` - Testing script
4. `/scripts/check-ai-investors.js` - Status checker

### **Key Features:**
- ✅ Manual trigger API (test AI trading anytime)
- ✅ Verbose logging (every OpenAI interaction captured)
- ✅ Admin UI trigger button (in AI detail modal)
- ✅ Enhanced FOMO Master logic (forces trading when >40% cash)
- ✅ Live price fetching (works with cached prices)

---

## 🚀 Deployment Steps

### **Step 1: Create Trading Logs Table**

```bash
# Open Supabase SQL Editor
# Copy/paste contents of: /workspaces/rize/supabase/create_ai_trading_logs.sql
# Execute the SQL
```

This creates the `ai_trading_logs` table that captures:
- OpenAI prompts sent
- Raw JSON responses received  
- Parsed decisions (BUY/SELL/HOLD)
- Execution results (success/failure)
- Portfolio snapshots (before/after)

### **Step 2: Deploy to Vercel**

```bash
cd /workspaces/rize

# Commit changes
git add .
git commit -m "Add AI testing system with manual triggers and logging"
git push

# Vercel will auto-deploy
```

### **Step 3: Verify Environment Variables**

Make sure these are set in Vercel:
- ✅ `OPENAI_API_KEY` - For AI decisions
- ✅ `STOCK_API_KEY` - For live prices  
- ✅ `CRON_SECRET` - For cron auth
- ✅ `SUPABASE_SERVICE_KEY` - For database access
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL

---

## 🧪 Testing Locally (Market Closed)

### **Option A: Quick Check (Current Status)**

```bash
node scripts/check-ai-investors.js
```

This shows:
- Current AI portfolios
- Recent transaction history
- Holdings breakdown

### **Option B: Manual Trigger Test (Full System)**

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open admin panel:**
   ```
   http://localhost:3000/admin
   Password: rize2025
   ```

3. **Click any AI → Test Trade Now button**
   - Triggers OpenAI decision-making
   - Executes trade if not HOLD
   - Shows results immediately
   - Logs everything to database

4. **Review results:**
   - Check admin UI for updated portfolio
   - Query `ai_trading_logs` table in Supabase
   - See OpenAI prompts/responses

---

## 🔍 Debugging & Verification

### **Check AI Trading Logs**

```sql
-- View all recent AI trades
SELECT 
  execution_timestamp,
  ai_nickname,
  ai_strategy,
  decision_action,
  decision_pitch_id,
  decision_shares,
  decision_reasoning,
  execution_success
FROM ai_trading_logs
ORDER BY execution_timestamp DESC
LIMIT 20;
```

### **Check Specific AI (e.g., FOMO Master)**

```sql
-- FOMO Master trading history
SELECT 
  execution_timestamp,
  decision_action,
  decision_reasoning,
  cash_before,
  cash_after,
  execution_success,
  execution_message
FROM ai_trading_logs
WHERE ai_nickname = 'FOMO Master'
ORDER BY execution_timestamp DESC;
```

### **View OpenAI Prompts (for debugging)**

```sql
-- See what AI was thinking
SELECT 
  ai_nickname,
  execution_timestamp,
  openai_prompt,
  openai_response_raw,
  decision_reasoning
FROM ai_trading_logs
WHERE ai_nickname = 'FOMO Master'
ORDER BY execution_timestamp DESC
LIMIT 1;
```

---

## 🎭 AI Personality Enhancements

### **FOMO Master Special Rules**

The system now has aggressive checks for FOMO Master:

```typescript
// If FOMO Master has >40% cash, prompt includes:
🚨🚨🚨 EMERGENCY ALERT 🚨🚨🚨
YOU HAVE 100% CASH! This is UNACCEPTABLE for a MOMENTUM trader!
YOUR RULE: >40% cash is FORBIDDEN! You MUST trade NOW!
Look for ANY stock up even 1%+ today and BUY IMMEDIATELY!
If NOTHING is up, buy the LEAST negative stock!
DO NOT HOLD! FOMO Masters are ALWAYS in the market!
```

### **Strategy Limits Updated**

- **MOMENTUM**: 60-90% per trade (increased from 40-80%)
- **ALL_IN**: 80-95% per trade (unchanged)
- **CONSERVATIVE**: 5-15% per trade (cautious)
- **DIVERSIFIED**: 15-25% per trade (balanced)

---

## 📊 Expected Behavior After Testing

### **FOMO Master Should:**
- ❌ Never sit on >40% cash
- ✅ Buy aggressively when stocks are rising
- ✅ Sell quickly when stocks drop 2%+
- ✅ Always have skin in the game

### **YOLO Kid Should:**
- ✅ Go 80-95% all-in on ONE stock
- ✅ Have <20% cash at all times
- ✅ Make bold, concentrated bets

### **Diamond Hands Should:**
- ✅ Buy and NEVER sell
- ✅ Accumulate positions over time
- ✅ Ignore short-term volatility

### **All AIs Should:**
- ✅ Reference pitch content in reasoning
- ✅ Show distinct personalities
- ✅ Make decisions that match their strategy
- ✅ Log every decision to database

---

## 🔧 API Endpoints

### **Manual Trigger (Admin Only)**

```bash
POST /api/admin/ai-trading/trigger
Authorization: Bearer <admin-token>
Content-Type: application/json

# Test all AIs
{}

# Test single AI
{ "userId": "ai_fomo_master" }
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-11-09T...",
  "results": [
    {
      "investor": "FOMO Master",
      "decision": {
        "action": "BUY",
        "pitch_id": 5,
        "shares": 1230.45,
        "reasoning": "Reddit up 5%! Can't miss this momentum!"
      },
      "result": {
        "success": true,
        "message": "FOMO Master bought 1230.45 shares..."
      }
    }
  ]
}
```

### **Cron Trigger (Production)**

```bash
POST /api/ai-trading/execute
Authorization: Bearer <cron-secret>
```

Runs automatically via Vercel Cron:
- 2:30 PM EST (Monday-Friday)
- 5:30 PM EST (Monday-Friday)
- 8:30 PM EST (Monday-Friday)

---

## 🚨 Troubleshooting

### **Issue: FOMO Master still not trading**

1. **Check logs:**
   ```sql
   SELECT * FROM ai_trading_logs 
   WHERE ai_nickname = 'FOMO Master' 
   ORDER BY execution_timestamp DESC LIMIT 1;
   ```

2. **Look at prompt:**
   - Does it include the EMERGENCY ALERT?
   - Is cash percentage calculated correctly?

3. **Check OpenAI response:**
   - Did it return valid JSON?
   - Is the action HOLD or BUY?
   - What's the reasoning?

4. **Check execution:**
   - Did trade execution succeed?
   - Any error messages?
   - Balance sufficient?

### **Issue: No trades executing**

1. **Verify OpenAI API key:** `echo $OPENAI_API_KEY`
2. **Check Supabase connection:** Can you query `user_token_balances`?
3. **Test price fetching:** Are live prices working?
4. **Check logs table:** Does it exist? Run create SQL again if needed.

### **Issue: Trades executing but no logs**

1. **Verify table exists:** `SELECT * FROM ai_trading_logs LIMIT 1;`
2. **Check RLS policies:** Service role should have INSERT permission
3. **Review error logs:** Look for database errors in Vercel logs

---

## 📈 Next Steps

### **Phase 1: Test & Debug (Today - Nov 9)**
- ✅ Create `ai_trading_logs` table
- ⬜ Test all 10 AIs manually
- ⬜ Verify FOMO Master trades
- ⬜ Review OpenAI prompts/responses
- ⬜ Fix any issues found

### **Phase 2: Edit Functionality (Tomorrow - Nov 10)**
- ⬜ Add Edit AI modal in admin
- ⬜ Create PATCH /api/admin/ai-investors/[userId]
- ⬜ Allow editing: nickname, emoji, strategy, catchphrase
- ⬜ Add custom personality prompt field
- ⬜ Test personality changes

### **Phase 3: Launch (When Market Opens - Nov 11)**
- ⬜ Verify cron is working (Pro tier)
- ⬜ Monitor first automatic trading round
- ⬜ Check all AIs are trading as expected
- ⬜ Review trading logs after each round
- ⬜ Fine-tune personalities based on behavior

---

## 📝 Testing Checklist

```
Manual Testing (Market Closed - Today):
[ ] Run create_ai_trading_logs.sql in Supabase
[ ] Start dev server (npm run dev)
[ ] Open admin panel (localhost:3000/admin)
[ ] Trigger test trade for FOMO Master
[ ] Verify trade executed (check logs table)
[ ] Review OpenAI prompt (check emergency alert)
[ ] Trigger test trade for YOLO Kid
[ ] Trigger test trade for Diamond Hands
[ ] Trigger test trade for all 10 AIs
[ ] Verify portfolio updates in admin
[ ] Check all logs in Supabase
[ ] Review reasoning for each AI

Production Testing (After Deploy):
[ ] Deploy to Vercel
[ ] Run create_ai_trading_logs.sql on production DB
[ ] Verify cron schedule is active
[ ] Test manual trigger via API
[ ] Wait for next cron execution (2:30 PM EST Mon-Fri)
[ ] Monitor Vercel logs during cron run
[ ] Check ai_trading_logs after cron
[ ] Verify all AIs traded
[ ] Review performance over 24 hours
```

---

## 🎉 Success Criteria

You'll know the system is working when:

1. **FOMO Master**:
   - Has < 40% cash
   - Trading frequently (multiple times per day)
   - Shows aggressive momentum buying

2. **All AIs**:
   - Have entries in `ai_trading_logs` table
   - Show distinct personalities in reasoning
   - Make decisions consistent with their strategy
   - Reference pitch content in decisions

3. **Admin Panel**:
   - Shows updated portfolios after trades
   - Test trade button works
   - AI detail modal shows recent activity

4. **Production Cron**:
   - Runs 3x daily (weekdays)
   - All 10 AIs trade each round
   - No errors in Vercel logs
   - Trades appear in database

---

## 🔗 Quick Links

- **Admin Panel**: `/admin` (password: rize2025)
- **Supabase Dashboard**: [Your Supabase Project]
- **Vercel Logs**: [Your Vercel Project] → Logs
- **OpenAI Usage**: https://platform.openai.com/usage

---

**Ready to test?** Start with:
```bash
npm run dev
# Then open http://localhost:3000/admin
```
