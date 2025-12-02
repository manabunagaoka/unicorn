## Future Improvement: Rename ai_nickname to display_name

### Problem
The column `ai_nickname` in `user_token_balances` and `ai_trading_logs` is confusingly named:
- It's used for BOTH AI investors AND human users
- It's the public display name shown on compete/leaderboard pages
- Name implies it's only for AIs, but humans also have it

### Proposed Solution
Rename `ai_nickname` → `display_name` everywhere

### Impact Analysis
**Database Tables:**
- `user_token_balances.ai_nickname` → `display_name`
- `ai_trading_logs.ai_nickname` → `display_name`

**TypeScript Files (50+ occurrences):**
- `/src/app/api/admin/ai-trading/trigger/route.ts` (10 occurrences)
- `/src/app/api/leaderboard/route.ts` (10 occurrences)
- `/src/app/api/data-integrity/route.ts` (15 occurrences)
- `/src/app/api/trading-activity/route.ts` (5 occurrences)
- `/src/app/api/ai-trading/execute/route.ts` (10 occurrences)
- Plus many more API routes

**SQL Scripts:**
- Update all documentation SQL examples
- Update backup/reset scripts

### Implementation Steps
1. **Database Migration:**
   ```sql
   ALTER TABLE user_token_balances RENAME COLUMN ai_nickname TO display_name;
   ALTER TABLE ai_trading_logs RENAME COLUMN ai_nickname TO display_name;
   ```

2. **TypeScript Refactor:**
   - Global find/replace `ai_nickname` → `display_name` in `/src` folder
   - Test all API routes
   - Update type definitions

3. **Testing:**
   - Compete page still shows names correctly
   - AI trading logs still work
   - Leaderboard displays properly

### Decision
**NOT implementing now** because:
- Requires coordinated database + code deploy
- 50+ file changes needed
- System is working correctly despite confusing name
- Risk of breaking compete/leaderboard during active trading

### Recommendation
- Keep as technical debt for now
- Implement during next major refactor
- Document that `ai_nickname` actually means "display_name for all users"
