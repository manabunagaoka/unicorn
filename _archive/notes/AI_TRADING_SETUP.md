# AI Trading System Setup

## Overview
The AI trading system uses OpenAI to make authentic trading decisions for 10 AI investors. Each AI has a unique personality and strategy, creating engaging market activity and providing a competitive benchmark for human investors.

## Environment Variables Required

Add these to your `.env.local`:

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-your-openai-api-key-here

# Cron Job Security
CRON_SECRET=your-random-secure-secret-here

# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=https://otxidzozhdnszvqbgzne.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Getting OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy and paste into `.env.local`
4. We're using `gpt-4o-mini` model (~$0.001 per trade decision)

### Generating CRON_SECRET
```bash
openssl rand -base64 32
```

## Database Setup

### 1. Initialize HM7 Market Data
Run this SQL in Supabase Dashboard:

```bash
# Open the file and copy contents
cat /workspaces/rize/supabase/initialize_hm7_market_data.sql
```

This creates market data for the 7 Harvard legendary companies:
- Facebook (META)
- Microsoft (MSFT)
- Dropbox (DBX)
- Reddit (RDDT)
- Quora (Private)
- Khan Academy (Nonprofit)
- Snapchat (SNAP)

### 2. Verify AI Investors
AI investors should already be enrolled in HM7. Verify with:

```sql
SELECT 
  ai_nickname,
  ai_strategy,
  available_tokens,
  total_invested,
  portfolio_value
FROM user_token_balances
WHERE is_ai_investor = true;
```

Should show 10 AI investors with 1M MTK each.

## API Endpoints

### POST /api/ai-trading/execute
Triggers AI trading for all AI investors.

**Security**: Requires `Authorization: Bearer ${CRON_SECRET}` header

**Process**:
1. Fetches all AI investors from database
2. Gets current portfolio and HM7 market prices
3. For each AI: Calls OpenAI with personality prompt
4. Executes trade decision (BUY/SELL/HOLD)
5. Records transaction and updates balances

**Response**:
```json
{
  "success": true,
  "timestamp": "2025-11-02T10:30:00Z",
  "results": [
    {
      "investor": "The Boomer",
      "decision": {
        "action": "BUY",
        "pitch_id": 2,
        "amount_mtk": 50000,
        "reasoning": "Microsoft is solid. Slow and steady wins."
      },
      "result": {
        "success": true,
        "message": "The Boomer bought 117.65 shares of Microsoft for 50000 MTK"
      }
    }
  ]
}
```

## Testing Locally

### 1. Start Development Server
```bash
npm run dev
```

### 2. Manual Test
```bash
./scripts/test-ai-trading.sh
```

Or with curl:
```bash
curl -X POST http://localhost:3000/api/ai-trading/execute \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json"
```

### 3. Check Results
Query the database to see trades:
```sql
SELECT 
  it.id,
  utb.ai_nickname,
  it.transaction_type,
  it.pitch_id,
  it.shares,
  it.total_amount,
  it.timestamp
FROM investment_transactions it
JOIN user_token_balances utb ON it.user_id = utb.user_id
WHERE utb.is_ai_investor = true
ORDER BY it.timestamp DESC
LIMIT 20;
```

## Production Deployment

### Vercel Cron Job
Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/ai-trading/execute",
      "schedule": "0 9,15,21 * * *"
    }
  ]
}
```

This runs at 9am, 3pm, and 9pm EST daily.

**Note**: Vercel automatically adds the cron secret. The endpoint checks:
```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Alternative: GitHub Actions
Create `.github/workflows/ai-trading.yml`:

```yaml
name: AI Trading Cron

on:
  schedule:
    - cron: '0 14,20,2 * * *' # 9am, 3pm, 9pm EST (UTC times)
  workflow_dispatch: # Manual trigger

jobs:
  trigger-trading:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger AI Trading
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/ai-trading/execute \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

Add secrets in GitHub repo settings:
- `API_URL`: https://your-app.vercel.app
- `CRON_SECRET`: Your generated secret

## AI Investor Personalities

| AI Investor | Strategy | Personality |
|------------|----------|-------------|
| The Boomer | CONSERVATIVE | Microsoft & blue chips, small positions |
| YOLO Kid | ALL_IN | Big bold moves, high risk |
| Diamond Hands | HOLD_FOREVER | Buy quality, never sell |
| Silicon Brain | TECH_ONLY | Pure tech plays only |
| Cloud Surfer | SAAS_ONLY | SaaS businesses with recurring revenue |
| FOMO Master | MOMENTUM | Buy rising stocks, chase trends |
| Hype Train | TREND_FOLLOW | Follow the momentum |
| The Contrarian | CONTRARIAN | Buy dips, sell rallies |
| The Oracle | PERFECT_TIMING | Try to time the market |
| Steady Eddie | DIVERSIFIED | Balanced portfolio |

## Cost Estimation

**OpenAI API Costs** (gpt-4o-mini):
- Input: ~500 tokens per decision
- Output: ~100 tokens per decision
- Cost per decision: ~$0.001
- 10 AI investors × 3 times/day × 30 days = 900 decisions/month
- **Monthly cost: ~$0.90**

Very affordable for authentic AI trading!

## Marketing Claims
✅ "AI investors trade real Harvard-founded companies"
✅ "Powered by OpenAI for authentic intelligence"
✅ "10 unique AI personalities with different strategies"
✅ "Beat the AI - compete against real AI traders"
✅ "Watch AI discover the next dorm-room unicorn"

## Monitoring

### Check AI Activity
```sql
-- Recent trades by AI
SELECT 
  utb.ai_nickname,
  COUNT(*) as trade_count,
  SUM(CASE WHEN it.transaction_type = 'BUY' THEN 1 ELSE 0 END) as buys,
  SUM(CASE WHEN it.transaction_type = 'SELL' THEN 1 ELSE 0 END) as sells,
  SUM(it.total_amount) as total_volume
FROM investment_transactions it
JOIN user_token_balances utb ON it.user_id = utb.user_id
WHERE utb.is_ai_investor = true
  AND it.timestamp > NOW() - INTERVAL '7 days'
GROUP BY utb.ai_nickname
ORDER BY total_volume DESC;
```

### AI Leaderboard
```sql
SELECT 
  ai_nickname,
  ai_strategy,
  available_tokens,
  portfolio_value,
  available_tokens + portfolio_value as total_value,
  ROUND(((available_tokens + portfolio_value - 1000000.0) / 1000000.0 * 100), 2) as roi_percent
FROM user_token_balances
WHERE is_ai_investor = true
ORDER BY total_value DESC;
```

## Troubleshooting

### Error: "OpenAI API key not found"
- Check `.env.local` has `OPENAI_API_KEY`
- Restart dev server after adding env vars

### Error: "Unauthorized"
- CRON_SECRET mismatch
- Check Authorization header format

### Error: "Price not found"
- Run `initialize_hm7_market_data.sql`
- Verify pitch_market_data has records for pitch_id 1-7

### AI Not Trading
- Check OpenAI API quota/billing
- Check API logs in Vercel dashboard
- Verify AI investors exist in database
- Check CRON_SECRET is set correctly

## Next Steps

1. ✅ Run `initialize_hm7_market_data.sql` in Supabase
2. ✅ Add OPENAI_API_KEY and CRON_SECRET to `.env.local`
3. ✅ Test locally with `./scripts/test-ai-trading.sh`
4. ⏳ Set up Finnhub integration for real stock prices
5. ⏳ Deploy to Vercel and configure cron
6. ⏳ Build UI to display AI trading activity
7. ⏳ Add AI trade reasoning to leaderboard
