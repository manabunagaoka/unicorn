# RIZE Investment System

## Overview
The Manaboodle Token (MTK) investment system replaces simple voting with an engaging portfolio game where users invest virtual tokens in Harvard startup legends.

**⚠️ CRITICAL DISCLAIMER**: MTK has ZERO real-world value. This is educational entertainment ONLY.

## System Components

### 1. Token Economy
- **Starting Balance**: $1,000,000 MTK per user (FREE)
- **Token Value**: Virtual only, no real monetary value, cannot be exchanged for money
- **Investment Mechanics**: Buy shares in companies based on dynamic pricing
- **Purpose**: Educational simulation of investment concepts

### 2. Legal Compliance

#### Implemented Protections:
1. **Disclaimer Modal** - First-time popup requiring explicit acknowledgment:
   - MTK has no real value
   - Must be 13+ years old
   - Educational/entertainment purpose only
   - No guarantees of service continuity
   - Two checkboxes required before proceeding

2. **Terms of Service** (`/terms`) - Comprehensive legal document covering:
   - Service description and limitations
   - Age requirements (13+)
   - Virtual currency nature
   - No liability for data loss
   - Right to modify/discontinue service
   - Prohibited conduct
   - Dispute resolution

3. **Privacy Policy** (`/privacy`) - Data handling transparency:
   - What data we collect (Manaboodle SSO, game activity)
   - Public information (leaderboard, portfolio stats)
   - No selling of personal data
   - User rights (access, deletion, export)
   - Children's privacy (COPPA compliance)

4. **How to Play Guide** (`/how-to-play`) - Educational resource explaining:
   - MTK mechanics and purpose
   - Investment rules and strategies
   - AI investor personalities
   - Dynamic pricing algorithm
   - Repeated disclaimers about no real value

5. **Footer Disclaimers** - Every page shows:
   - "MTK has no real value" warning
   - Links to Terms and Privacy
   - Age requirement reminder
   - No responsibility for data loss

#### Legal Protections:
- ✅ Explicit "no real value" disclaimers throughout
- ✅ Age verification (13+)
- ✅ Educational purpose framing
- ✅ Service modification rights
- ✅ Limitation of liability
- ✅ Data loss disclaimers
- ✅ Voluntary participation acknowledgment
- ✅ No guarantees of service availability

### 3. AI Investors (10 Personalities)

| Nickname | Emoji | Strategy | Description |
|----------|-------|----------|-------------|
| The Boomer | 💼 | Conservative | Invests in top 3, holds long-term |
| Steady Eddie | 🐢 | Diversified | Spreads across all 10 companies |
| YOLO Kid | 🎰 | All-In | Puts everything in one pick |
| Diamond Hands | 💎 | Hold Forever | Never sells, ever |
| Silicon Brain | 🧠 | Tech Only | Only tech companies |
| Cloud Surfer | ☁️ | SaaS Only | Subscription model believers |
| FOMO Master | 😱 | Momentum | Chases trends, panic sells |
| Hype Train | 🚂 | Trend Follow | Always in top 3 movers |
| The Contrarian | 🔄 | Buy Low | Invests in bottom ranked |
| The Oracle | 🔮 | Perfect Timing | Mysteriously optimal (admin controlled) |

### 3. Pricing Algorithm

```
Share Price = Base Price × (1 + Total Invested / 1,000,000)

Where:
- Base Price = $100
- Total Invested = Sum of all MTK invested in that company
```

**Example:**
- Facebook has $2M MTK invested
- Price = $100 × (1 + 2,000,000 / 1,000,000) = $100 × 3 = $300/share

### 4. Database Schema

#### Tables:
1. **user_token_balances** - Token balances and portfolio totals
2. **user_investments** - Current holdings (positions)
3. **investment_transactions** - Full history of all trades
4. **pitch_market_data** - Real-time pricing and market stats

#### Views:
1. **investment_leaderboard** - Ranked investors (real + AI)
2. **company_rankings** - Companies ranked by total investment

### 5. Key Features

**For Users:**
- Invest MTK in companies
- Build diversified portfolio
- Track gains/losses in real-time
- Compete against AI investors
- Learn investing strategies

**For Admin:**
- Control AI investor moves
- Trigger rebalancing
- Monitor system health
- Adjust pricing parameters

## API Endpoints (To Be Created)

### Investment Actions
- `POST /api/invest` - Buy shares
- `POST /api/sell` - Sell shares (future)
- `GET /api/portfolio` - Get user portfolio
- `GET /api/market-data` - Get all company prices

### Leaderboards
- `GET /api/leaderboard` - Top investors
- `GET /api/company-rankings` - Company rankings

### Admin
- `POST /api/admin/ai-trade` - Execute AI investor trade
- `POST /api/admin/rebalance` - Trigger AI rebalancing
- `GET /api/admin/market-stats` - System statistics

## Running the Migration

### On Supabase Dashboard:
1. Go to SQL Editor
2. Create new query
3. Paste contents of `investment_system_migration.sql`
4. Run query
5. Verify tables created successfully

### Verification Queries:
```sql
-- Check AI investors created
SELECT ai_nickname, ai_emoji, total_tokens FROM user_token_balances WHERE is_ai_investor = true;

-- Check market data initialized
SELECT pitch_id, current_price, total_volume FROM pitch_market_data ORDER BY pitch_id;

-- Check views work
SELECT * FROM investment_leaderboard LIMIT 5;
SELECT * FROM company_rankings;
```

## Next Steps

1. ✅ Database migration (this file)
2. ⏳ Create investment API routes
3. ⏳ Update UI components
4. ⏳ Build portfolio page
5. ⏳ Create admin dashboard for AI control
6. ⏳ Add transaction history view
7. ⏳ Implement sell functionality (optional)

## Legal/Compliance

**Disclaimers Required:**
- MTK has no real monetary value
- Educational/entertainment only
- Not financial advice
- Must be 13+ (COPPA compliant)
- Terms of Service required

**Display on:**
- First-time user modal
- Footer of every page
- Portfolio page
- Before first investment

## Future Enhancements

- Social features (share portfolio)
- Achievement badges
- Weekly competitions
- Real news integration (OpenAI)
- Multiple competition support
- Token purchasing (monetization)
