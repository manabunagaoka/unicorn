# AI Investor Persona Generation & Trading Setup - November 17, 2025

## Session Summary

Successfully completed AI investor persona generation system and enabled automated trading with 10 unique AI personalities.

## Major Accomplishments

### 1. Persona Generation System (COMPLETE ✅)
- **Upgraded from GPT-4o-mini to GPT-4o** for reliable instruction following
- Cost: ~$0.05 per generation (vs $0.01 for mini) - worth it for quality
- All 10 unique AI investor personas generated successfully

**Why GPT-4o was needed:**
- GPT-4o-mini repeatedly ignored formatting instructions (used `0:`, `1:`, `2:` instead of `-`)
- Added "student" mentions despite explicit NO STUDENT rules
- Included "voting" language despite NO VOTING platform
- Generated identical personas (Cloud Surfer = Diamond Hands)

**Template Structure (9 sections):**
1. SUMMARY - One sentence identity
2. BACKGROUND - Track record
3. ROI_PHILOSOPHY - Financial/Impact/Blended/Opportunistic
4. SECTOR_FOCUS - Industries invested in
5. INVESTMENT_STYLE - Position sizing, timing
6. COMPANY_TYPE_PREFERENCES - COMMERCIAL/SOCIAL/STUDENTS (YES/NO/MAYBE)
7. GREEN_FLAGS - What they look for
8. RED_FLAGS - Deal-breakers
9. BUY_SELL_TIMING - When they act

### 2. Platform Reality Clarification
- **NOT** just student startups - includes general market stocks, non-profits, student ventures
- **NO** voting system exists - investors evaluate pitch + fun fact directly
- **MTK tokens** represent market belief in companies (profit OR impact OR both)
- Need to handle COMMERCIAL/SOCIAL/STUDENTS equally

### 3. The 10 AI Investors

| Investor | Strategy | ROI | Buy Timing | Sell Timing | Unique Trait |
|----------|----------|-----|-----------|-------------|--------------|
| Cloud Surfer | SAAS_ONLY | Financial | Week 1 | 6mo | SaaS-only, subscription focus |
| Diamond Hands | HOLD_FOREVER | Blended | 24hrs | NEVER | Holds forever, diversified |
| FOMO Master | MOMENTUM | Opportunistic | 24hrs | 30d | Fears missing gains, >40% cash forbidden |
| Hype Train | TREND_FOLLOW | Opportunistic | 24hrs | 14d | Viral hunter, sells faster than FOMO |
| Silicon Brain | TECH_ONLY | Financial | 48hrs | 18mo | Tech-only, code is eating world |
| Steady Eddie | DIVERSIFIED | Blended | Week 1 | 6mo | 10-15 companies, balanced |
| The Boomer | CONSERVATIVE | Financial | 2-4wks | 6mo | Proven traction only, lived through dot-com |
| The Oracle | PERFECT_TIMING | Blended | Strategic | Realized | Precision timing, buy low/sell high |
| YOLO Kid | ALL_IN | Financial | Immediate | 90d | 80% all-in on ONE company |
| The Contrarian | CONTRARIAN | Opportunistic | 2+wks | Hype starts | NEVER buys stocks rising >2% |

### 4. AI Trading Bug Fixes

**Issue #1: 401 Unauthorized (BLOCKING)**
- **Symptom**: All 10 AI trading tests returned 401, no trades executed
- **Root cause**: Batch test missing `Authorization: Bearer` header in fetch call
- **Fix**: Added header to line 358 in `/src/app/admin/page.tsx`
- **File**: `src/app/admin/page.tsx`
- **Commit**: `67fe52d`

**Issue #2: The Contrarian buying rising stocks**
- **Symptom**: Bought Dropbox despite +8% gain (contradicts contrarian strategy)
- **Root cause**: Persona said "overlooked companies" but didn't explicitly forbid rising stocks
- **Fix**: Updated persona with "ABSOLUTE RULE: NEVER buy stocks with >2% gain today"
- **SQL**: `supabase/fix-contrarian-persona.sql`

### 5. Automated Trading Schedule (ENABLED ✅)

**Cron Schedule**: Twice daily
- **9:30am EST (2:30pm UTC)** - 1 hour after market open
- **3:30pm EST (8:30pm UTC)** - 30 min before market close

**Implementation:**
- Created `/src/app/api/admin/ai-trading/cron/route.ts`
- Updated `vercel.json` with cron entries
- Uses `CRON_SECRET` env var (already set in Vercel)
- Commit: `c04cc58`

**Expected Activity:**
- 2 runs per day
- Up to 10 trades per run (one per active AI)
- Up to 20 trades per day total

### 6. First Test Results

Tested all 10 AIs after reset to 1M MTK each:

**Dropbox dominated (8 out of 10 bought it):**
- Cloud Surfer ✅ (SaaS-only strategy)
- Diamond Hands ✅ (Diversified)
- FOMO Master ✅ (+8% = FOMO trigger)
- Silicon Brain ✅ (Tech-only)
- Steady Eddie ✅ (Balanced)
- The Oracle ✅ (Blended ROI)
- YOLO Kid ✅ (80% all-in)
- The Contrarian ❌ (Should NOT buy +8% stock - FIXED)

**Different purchases:**
- The Boomer → Microsoft (proven, stable)
- Hype Train → Akamai (+7.7% momentum)

**Why concentration happened:**
- Dropbox +8% today = strong signal for momentum strategies
- Lowest price ($30.36) = allows larger positions
- Strong founder story = emotional appeal
- SaaS/Tech = fits multiple strategies perfectly

**This is working as designed** - when one stock shows strong signals, multiple strategies converge. Once prices normalize (mixed up/down/flat), diversity will increase.

## Technical Architecture

### Persona Storage
- **Database**: `user_token_balances` table
- **Column**: `ai_personality_prompt` (text field)
- **User IDs**: `ai_cloud`, `ai_diamond`, `ai_fomo`, etc.
- **Trading reads it**: Line 205 of `/src/app/api/admin/ai-trading/trigger/route.ts`

### Trading System
- **Manual endpoint**: `/api/admin/ai-trading/trigger` (POST with Authorization header)
- **Cron endpoint**: `/api/admin/ai-trading/cron` (GET with CRON_SECRET)
- **Model**: gpt-4o-mini for trading decisions (temperature 0.8)
- **Logs**: `ai_trading_logs` table with full prompt/response/reasoning

### Key Files Modified
1. `/src/app/api/admin/ai-generate-persona/route.ts` - Persona generation (GPT-4o)
2. `/src/app/admin/page.tsx` - Admin UI with batch test auth fix
3. `/src/app/api/admin/ai-trading/cron/route.ts` - NEW cron endpoint
4. `/vercel.json` - Added AI trading cron schedule
5. `/supabase/fix-contrarian-persona.sql` - Updated Contrarian rules

## Monitoring Queries

### Check today's automated trades
```sql
SELECT 
  DATE_TRUNC('hour', execution_timestamp) as trade_hour,
  COUNT(*) as trades,
  COUNT(CASE WHEN decision_action = 'BUY' THEN 1 END) as buys,
  COUNT(CASE WHEN decision_action = 'SELL' THEN 1 END) as sells,
  COUNT(CASE WHEN decision_action = 'HOLD' THEN 1 END) as holds
FROM ai_trading_logs
WHERE DATE(execution_timestamp) = CURRENT_DATE
  AND triggered_by = 'cron'
GROUP BY DATE_TRUNC('hour', execution_timestamp)
ORDER BY trade_hour;
```

### Check AI investor status
```sql
SELECT 
  user_id,
  ai_nickname,
  ai_strategy,
  is_active,
  available_tokens as cash,
  (total_tokens - available_tokens) as invested,
  total_tokens as portfolio_value
FROM user_token_balances
WHERE is_ai_investor = true
ORDER BY ai_nickname;
```

### Check recent buys by company
```sql
SELECT 
  arp.company_name,
  arp.ticker,
  COUNT(*) as num_buyers,
  STRING_AGG(atl.ai_nickname, ', ') as buyers,
  AVG(arp.price_change_24h) as avg_price_change
FROM ai_trading_logs atl
JOIN ai_readable_pitches arp ON atl.decision_pitch_id = arp.pitch_id
WHERE atl.execution_timestamp > NOW() - INTERVAL '24 hours'
  AND atl.decision_action = 'BUY'
GROUP BY arp.company_name, arp.ticker
ORDER BY num_buyers DESC;
```

## Git Commits (November 17, 2025)

1. **91c14bb** - Upgrade to GPT-4o for persona generation
2. **67fe52d** - Fix batch AI trading: Add missing Authorization header
3. **c04cc58** - Enable automated AI trading with cron schedule

## Next Steps

1. ✅ Monitor automated trades starting tomorrow (Nov 18)
2. ✅ Verify cron runs at 9:30am and 3:30pm EST
3. 🔄 Check if diversity increases as market conditions normalize
4. 🔄 Add founder registration system for user-submitted companies
5. 🔄 Update AI trading to evaluate user-submitted companies

## Notes

- **CRON_SECRET** already set in Vercel (never commit secrets!)
- Personas stored in database, not in code
- Trading uses gpt-4o-mini ($0.01/trade) for cost efficiency
- Persona generation uses GPT-4o ($0.05/generation) for quality
- All 10 AIs are `is_active = true` and ready to trade
- HM7 companies (META, MSFT, DBX, AKAM, RDDT, WRBY, BKNG) have full data

## Success Metrics

✅ All 10 personas generated with unique characteristics
✅ Clean formatting (dash bullets, no numbers, no emoji)
✅ COMPANY_TYPE_PREFERENCES forcing differentiation
✅ No student focus unless STUDENTS=YES
✅ No voting language
✅ Authorization bug fixed
✅ Automated trading enabled
✅ First test trades successful
