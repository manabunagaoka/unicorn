# 🚀 RIZE - Tab-Based Index Platform Implementation Roadmap

**Status:** Planning Complete - Ready for Implementation  
**Date:** October 31, 2025

---

## 🎯 Vision

Transform RIZE into a **single-page tab-based platform** where users compete across multiple market indexes:
- **Leaderboard replaces landing page** (homepage)
- **Tab navigation** for different indexes
- **Progressive unlock system** based on performance
- **AI investors** as fixed benchmark
- **User startups** visible from day one

---

## 📊 Core Structure

### **Navigation Tabs (Phase 1: Launch with 3)**
```
[Leaderboard 👑] [HM7 🎓] [H2026 🔒]
```

### **Navigation Tabs (Phase 3: Full Launch)**
```
[Leaderboard 👑] [HM7 🎓] [H2026 🎓] [Markets ▼]
                                      ├─ S&P7 🔒
                                      ├─ DowJ7 🔒
                                      ├─ NASDQ7 🔒
                                      └─ MSCI World7 🔒
```

---

## 📋 Phase 1: Core Foundation (MVP)

### **Goal:** Get leaderboard working with 3 tabs

#### **Task 1: Leaderboard-as-Homepage**
**File:** `/src/app/leaderboard/page.tsx` (new)

**Components:**
1. **User Portfolio Summary** (top banner)
   - Cash Balance | Portfolio Value | All-Time P&L
   - Rank: #52 of 108 investors

2. **AI Benchmark Section**
   - 7 AI investors always shown
   - Ranked by portfolio value
   - Shows gain/loss %

3. **Your Position** (highlighted row)
   - Your rank + movement (⬆️+3)
   - Portfolio metrics

4. **Your Startup Card**
   - "Register Your Startup" button (if not registered)
   - Startup name, $0 valuation (if registered)
   - Status: Locked/Unlocked for others

5. **Unlock Progress Panel**
   - Current gain: +4.2%
   - Progress bar to next unlock (+10%)
   - List of locked/unlocked indexes

---

#### **Task 2: Tab Navigation**
**File:** `/src/components/TabNavigation.tsx` (new)

**Structure:**
- Query param based: `/?tab=leaderboard`, `/?tab=hm7`, `/?tab=h2026`
- Or client-side state with router
- Active tab styling
- Lock icon on H2026 tab

**Desktop:** Full tabs
**Mobile:** Bottom tab bar (3 tabs fit easily)

---

#### **Task 3: Create AI Investor Accounts**
**SQL Migration:**
```sql
-- Insert 7 AI investors
INSERT INTO users (email, display_name, is_ai_investor) VALUES
  ('ai.warren@rize.ai', 'AI Warren', true),
  ('ai.cathie@rize.ai', 'AI Cathie', true),
  ('ai.peter@rize.ai', 'AI Peter', true),
  ('ai.ray@rize.ai', 'AI Ray', true),
  ('ai.charlie@rize.ai', 'AI Charlie', true),
  ('ai.benjamin@rize.ai', 'AI Benjamin', true),
  ('ai.michael@rize.ai', 'AI Michael', true);

-- Give each $1M MTK
INSERT INTO user_token_balances (user_id, total_tokens, available_tokens)
  SELECT id, 1000000, 1000000 FROM users WHERE is_ai_investor = true;
```

**Database Schema Update:**
```sql
-- Add is_ai_investor flag to users table
ALTER TABLE users ADD COLUMN is_ai_investor BOOLEAN DEFAULT false;
```

---

#### **Task 4: Leaderboard API**
**File:** `/src/app/api/leaderboard/route.ts` (new)

**Endpoint:** `GET /api/leaderboard`

**Returns:**
```json
{
  "total_investors": 108,
  "your_rank": 52,
  "your_portfolio_value": 1042000,
  "your_gain_loss_percent": 4.2,
  "rank_movement": 3,
  "ai_benchmark": [
    {
      "rank": 1,
      "name": "AI Warren",
      "portfolio_value": 1245000,
      "gain_loss_percent": 24.5
    },
    // ... 6 more AIs
  ],
  "your_position": {
    "rank": 52,
    "name": "John H.",
    "portfolio_value": 1042000,
    "gain_loss_percent": 4.2
  }
}
```

**Logic:**
1. Calculate portfolio_value for ALL users:
   - `cash + SUM(shares_owned * current_stock_price)`
2. Rank users by portfolio_value DESC
3. Find current user's rank
4. Return top 7 AIs + user's position

---

#### **Task 5: Unlock Progress Tracking**
**File:** `/src/app/api/unlock-progress/route.ts` (new)

**Endpoint:** `GET /api/unlock-progress`

**Returns:**
```json
{
  "current_gain_percent": 4.2,
  "unlocked_indexes": ["hm7"],
  "next_unlock": {
    "index": "h2026",
    "required_percent": 10,
    "progress": 42
  },
  "all_indexes": [
    { "id": "hm7", "name": "Harvard Magnificent 7", "unlocked": true, "required_percent": 0 },
    { "id": "h2026", "name": "Harvard Class of 2026", "unlocked": false, "required_percent": 10 },
    { "id": "sp7", "name": "S&P 500 Top 7", "unlocked": false, "required_percent": 20 },
    { "id": "dowj7", "name": "Dow Jones Top 7", "unlocked": false, "required_percent": 30 },
    { "id": "nasdq7", "name": "NASDAQ Top 7", "unlocked": false, "required_percent": 40 },
    { "id": "msci7", "name": "MSCI World Top 7", "unlocked": false, "required_percent": 50 }
  ]
}
```

---

#### **Task 6: Startup Registration Card (UI Only)**
**File:** `/src/components/StartupCard.tsx` (new)

**State 1: Not Registered**
```
┌────────────────────────────────────────┐
│ 🚀 Your Startup                       │
│                                        │
│ Register your startup to compete in   │
│ the Manaboodle IPO!                    │
│                                        │
│ [Register Your Startup →]             │
└────────────────────────────────────────┘
```

**State 2: Registered**
```
┌────────────────────────────────────────┐
│ 🚀 Your Startup: AI Tutor             │
│                                        │
│ Current Valuation: $0                  │
│ Investors: 0                           │
│ Status: 🔒 Locked                      │
│ Others need +10% to unlock             │
│                                        │
│ [Edit Pitch] [View Profile]           │
└────────────────────────────────────────┘
```

---

#### **Task 7: Refactor HM7 Index View**
**File:** `/src/components/IndexView.tsx` (new)

**Props:**
```typescript
interface IndexViewProps {
  indexId: 'hm7' | 'h2026' | 'sp7' | 'dowj7' | 'nasdq7' | 'msci7';
  indexName: string;
  description: string;
  companies: Company[]; // 7 companies
  userHoldings: Holding[];
}
```

**Layout:**
1. Rules panel (collapsible)
2. Company list table (7 rows)
3. Your holdings in this index
4. Click company → Detail modal/panel

**Reusable for all indexes!**

---

#### **Task 8: Redirect Landing Page**
**File:** `/src/app/page.tsx`

**Change:**
```typescript
// OLD: Show LandingPage component
// NEW: Redirect to leaderboard
export default function Home() {
  redirect('/?tab=leaderboard');
}
```

**Or:**
```typescript
// Make leaderboard the default page.tsx
export default function Home({ user }: { user: any }) {
  return <LeaderboardPage user={user} />;
}
```

---

## 📋 Phase 2: Competition Mechanics

### **Goal:** Make competition real with AI trading + unlocks

#### **Task 9: AI Trading Bot**
**File:** `/src/scripts/ai-trader.ts` (new)

**Frequency:** Daily (or hourly)

**Strategy Per AI:**
```javascript
const AI_STRATEGIES = {
  'AI Warren': 'buy_and_hold',    // Buys once, holds forever
  'AI Cathie': 'growth_momentum',  // Buys NVDA, META, RDDT
  'AI Peter': 'contrarian',        // Buys what others sell
  'AI Ray': 'momentum',            // Follows trends
  'AI Charlie': 'diversified',     // Equal weight all 7
  'AI Benjamin': 'conservative',   // 80% cash, 20% invested
  'AI Michael': 'random'           // Random trades
};
```

**Implementation:**
1. Cron job triggers daily at 9am ET
2. Each AI makes 1-3 trades
3. Uses same `/api/invest` and `/api/sell` endpoints
4. Logs trades to transaction history

---

#### **Task 10: Track Unlocked Indexes**
**Database Migration:**
```sql
-- Add unlocked_indexes to users table
ALTER TABLE users ADD COLUMN unlocked_indexes JSONB DEFAULT '["hm7"]';

-- Create index for fast lookups
CREATE INDEX idx_users_unlocked_indexes ON users USING GIN (unlocked_indexes);
```

**API Update:**
- Check `gain_loss_percent` on each request
- If >= 10% and 'h2026' not in unlocked_indexes → Add it
- If >= 20% and 'sp7' not in unlocked_indexes → Add it
- Etc.

---

#### **Task 11: Build H2026 Index**
**Database Migration:**
```sql
CREATE TABLE student_startups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  founder VARCHAR(255) NOT NULL,
  year VARCHAR(10) NOT NULL,
  pitch TEXT NOT NULL,
  fun_fact TEXT,
  ticker_symbol VARCHAR(10) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed 7 placeholder startups
INSERT INTO student_startups (name, founder, year, pitch, fun_fact, ticker_symbol) VALUES
  ('AI Tutor', 'Student A', '2024', 'Personalized AI tutoring...', 'Built in 48 hours', 'AITU'),
  ('Green Delivery', 'Student B', '2024', 'Carbon-neutral delivery...', 'Uses electric bikes', 'GRND'),
  -- ... 5 more
```

**Component:**
- Reuse `IndexView` component
- Pass `student_startups` data instead of `SUCCESS_STORIES`
- No real stock prices (internal pricing only)

---

#### **Task 12: Startup Registration Flow**
**File:** `/src/app/submit-startup/page.tsx`

**Form Fields:**
- Startup Name
- Founder Name(s)
- Year Founded
- Pitch (500 chars)
- Fun Fact (200 chars)
- [Auto-generate ticker symbol]

**Flow:**
1. User submits form
2. Saves to `student_startups` table
3. Links to user via `user_id`
4. Shows on leaderboard card
5. Appears in H2026 index (once approved)

---

## 📋 Phase 3: Scale & Polish

### **Goal:** Add market indexes + mobile optimization

#### **Task 13: Add Market Indexes**
**Indexes to Add:**

**S&P7 (Top 7 from S&P 500):**
```javascript
const SP7_COMPANIES = [
  { ticker: 'AAPL', name: 'Apple' },
  { ticker: 'MSFT', name: 'Microsoft' },
  { ticker: 'NVDA', name: 'NVIDIA' },
  { ticker: 'GOOGL', name: 'Alphabet' },
  { ticker: 'AMZN', name: 'Amazon' },
  { ticker: 'META', name: 'Meta' },
  { ticker: 'TSLA', name: 'Tesla' }
];
```

**DowJ7 (Top 7 from Dow 30):**
```javascript
const DOWJ7_COMPANIES = [
  { ticker: 'AAPL', name: 'Apple' },
  { ticker: 'MSFT', name: 'Microsoft' },
  { ticker: 'UNH', name: 'UnitedHealth' },
  { ticker: 'JNJ', name: 'Johnson & Johnson' },
  { ticker: 'V', name: 'Visa' },
  { ticker: 'WMT', name: 'Walmart' },
  { ticker: 'JPM', name: 'JPMorgan' }
];
```

**NASDQ7 (Top 7 tech from NASDAQ):**
```javascript
const NASDQ7_COMPANIES = [
  { ticker: 'AAPL', name: 'Apple' },
  { ticker: 'MSFT', name: 'Microsoft' },
  { ticker: 'NVDA', name: 'NVIDIA' },
  { ticker: 'GOOGL', name: 'Alphabet' },
  { ticker: 'AMZN', name: 'Amazon' },
  { ticker: 'META', name: 'Meta' },
  { ticker: 'AVGO', name: 'Broadcom' }
];
```

**All use:**
- Same `IndexView` component
- Finnhub API (already working)
- Unlock at +20%, +30%, +40%

---

#### **Task 14: Add MSCI World7**
**International Stocks (Top 7 Global):**
```javascript
const MSCI_WORLD7_COMPANIES = [
  { ticker: 'AAPL', name: 'Apple', country: 'USA' },
  { ticker: 'MSFT', name: 'Microsoft', country: 'USA' },
  { ticker: 'NVDA', name: 'NVIDIA', country: 'USA' },
  { ticker: 'TSM', name: 'Taiwan Semiconductor', country: 'Taiwan' },
  { ticker: 'NVO', name: 'Novo Nordisk', country: 'Denmark' },
  { ticker: 'LLY', name: 'Eli Lilly', country: 'USA' },
  { ticker: 'V', name: 'Visa', country: 'USA' }
];
```

**Test:** Verify Finnhub supports `TSM` and `NVO` tickers

---

#### **Task 15: Per-Index Portfolio Tracking**
**Database Migration:**
```sql
-- Add index_id to user_investments
ALTER TABLE user_investments ADD COLUMN index_id VARCHAR(20) DEFAULT 'hm7';

-- Add index_id to investment_transactions
ALTER TABLE investment_transactions ADD COLUMN index_id VARCHAR(20) DEFAULT 'hm7';

-- Create indexes
CREATE INDEX idx_investments_index ON user_investments(index_id);
CREATE INDEX idx_transactions_index ON investment_transactions(index_id);
```

**API Updates:**
- `/api/portfolio?index=hm7` → Returns only HM7 holdings
- `/api/portfolio` (no param) → Returns aggregated across all indexes
- `/api/invest` → Requires `index_id` parameter

---

#### **Task 16: Mobile Responsive Tabs**
**Desktop (>1024px):**
```
[Leaderboard] [HM7] [H2026] [Markets ▼]
```

**Tablet (768px - 1024px):**
```
← [Leaderboard] [HM7] [H2026] [Markets] →
(horizontal scroll)
```

**Mobile (<768px):**
```
┌─────────────────────────────────┐
│                                 │
│  [Content fills screen]         │
│                                 │
├─────────────────────────────────┤
│ [👑] [🎓] [📊] [⋯]             │
│ Lead  HM7  S&P7  More           │
└─────────────────────────────────┘
```

---

#### **Task 17: Rank Movement Tracking**
**Database Migration:**
```sql
CREATE TABLE rankings_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  rank INTEGER NOT NULL,
  portfolio_value BIGINT NOT NULL,
  snapshot_date DATE NOT NULL,
  UNIQUE(user_id, snapshot_date)
);

CREATE INDEX idx_rankings_date ON rankings_history(snapshot_date);
```

**Cron Job:**
- Runs daily at midnight
- Snapshots all user ranks
- Stores in `rankings_history`

**Display:**
- Compare today's rank vs. yesterday's rank
- Show: ⬆️+3, ⬇️-5, or → (no change)

---

#### **Task 18: Unlock Celebration**
**When user crosses threshold:**
1. Detect gain crosses +10%, +20%, etc.
2. Show confetti animation (react-confetti)
3. Modal: "🎉 Congratulations! You unlocked [H2026 Index]!"
4. Button: "Explore New Index →"
5. Auto-navigate to newly unlocked tab

---

## 🎨 Design Specifications

### **Color Scheme:**
- **Leaderboard Tab:** Gold/Yellow (#FFD700)
- **HM7 Index:** Blue (#3B82F6)
- **H2026 Index:** Purple (#A855F7)
- **Market Indexes:** Green (#10B981)
- **AI Investors:** Orange (#F97316)
- **Lock Icons:** Gray (#6B7280)

### **Typography:**
- **Headers:** Bold, 24-32px
- **Body:** Regular, 14-16px
- **Metrics:** Bold, 18-24px (portfolio values)
- **Captions:** Regular, 12px (timestamps)

### **Icons:**
- 👑 Leaderboard
- 🎓 Harvard indexes
- 📊 Market indexes
- 🤖 AI investors
- 🔒 Locked
- ✅ Unlocked
- 🚀 Startups
- ⬆️⬇️→ Rank movement

---

## 📊 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/leaderboard` | GET | Get investor rankings |
| `/api/unlock-progress` | GET | Get user's unlock status |
| `/api/portfolio?index=hm7` | GET | Get holdings per index |
| `/api/invest` | POST | Buy shares (add index_id param) |
| `/api/sell` | POST | Sell shares (add index_id param) |
| `/api/submit-startup` | POST | Register user's startup |
| `/api/indexes/hm7` | GET | Get HM7 companies |
| `/api/indexes/h2026` | GET | Get student startups |
| `/api/indexes/sp7` | GET | Get S&P7 companies |

---

## 🚦 Launch Checklist

### **Phase 1 (Week 1-2):**
- [ ] Create leaderboard page
- [ ] Add tab navigation
- [ ] Insert 7 AI accounts
- [ ] Build leaderboard API
- [ ] Add unlock progress UI
- [ ] Add startup card (UI only)
- [ ] Refactor HM7 to IndexView
- [ ] Redirect landing page

### **Phase 2 (Week 3-4):**
- [ ] Build AI trading bot
- [ ] Track unlocked indexes in DB
- [ ] Create student_startups table
- [ ] Build H2026 index
- [ ] Create startup registration form
- [ ] Test unlock system

### **Phase 3 (Week 5-6):**
- [ ] Add S&P7, DowJ7, NASDQ7 indexes
- [ ] Add MSCI World7 index
- [ ] Implement per-index portfolio tracking
- [ ] Mobile responsive tabs
- [ ] Add rank movement tracking
- [ ] Add unlock celebration animation

---

## 🎯 Success Metrics

**Phase 1:**
- Users see their rank immediately
- 7 AI investors visible as benchmark
- H2026 tab shows "locked" correctly

**Phase 2:**
- AI investors trade daily
- Users unlock H2026 at +10%
- Startup registration works

**Phase 3:**
- 5+ indexes available
- Mobile experience smooth
- Users unlock multiple indexes

---

## 💡 Future Enhancements

1. **Social Features:**
   - Follow other investors
   - Copy trades ("I'll invest what AI Warren invests")
   - Leaderboard comments/chat

2. **Advanced AI:**
   - AI investors learn from user behavior
   - Different strategies per index
   - AI posts "investment thesis"

3. **Rewards:**
   - Weekly prizes for top 3
   - Badges for achievements
   - Real investment in winner's startup

4. **Analytics:**
   - Portfolio performance charts
   - Gain/loss over time
   - Compare vs. AI benchmark

5. **More Indexes:**
   - YC Top 7 (Y Combinator)
   - Crypto Top 7
   - European Unicorns 7
   - User-created indexes

---

## 🔄 Deployment Strategy

1. **Phase 1:** Deploy to staging, test with 5-10 users
2. **Phase 2:** Deploy AI trading, monitor for 1 week
3. **Phase 3:** Launch all indexes, announce on social media

---

**Ready to start coding?** Let's begin with Phase 1, Task 1! 🚀
