# Pitch Voting Feature - Complete!

## ✅ What's Working Now:

### 1. **Rankings Display (#1-10)**
   - 🥇 Gold badge for #1 (most votes)
   - 🥈 Silver badge for #2  
   - 🥉 Bronze badge for #3
   - Gray badges for #4-10
   - **Rankings automatically re-order** based on vote counts!

### 2. **Voting System**
   - ✅ **One vote per user per pitch** (you can vote for multiple pitches)
   - Click "Vote for This Pitch" → Vote recorded → Button shows "Voted! (X)"
   - Click again → Vote removed (toggle on/off)
   - Vote counts update in real-time
   - **Works with Manaboodle SSO authentication**

### 3. **Before/After Votes:**
   - **Before votes:** All pitches ranked #1-10 in default order (Facebook first, Booking.com last)
   - **After votes:** Automatically re-ranks by vote count (highest → lowest)
   - **Example:** Vote for Dropbox 5 times → It jumps to #1!

## 🧪 How to Test:

1. **Run the migration** (if you haven't):
   ```sql
   -- In Supabase SQL Editor, run:
   -- supabase/pitch_votes_migration.sql
   ```

2. **Visit your site:**
   ```
   https://rize-git-main-manabunagaokas-projects.vercel.app
   ```

3. **Sign in with Manaboodle SSO:**
   - Click "Start Voting" or any vote button
   - Redirects to Manaboodle login
   - Returns to RIZE with your user_id

4. **Vote on pitches:**
   - Scroll to "Vote on Legendary Pitches"
   - Click "Vote for This Pitch" on any card
   - Button changes to "Voted! (1)" with company color
   - Ranking badge updates if it moves up!

5. **Toggle votes:**
   - Click "Voted! (1)" again
   - Vote removed → Button back to gray "Vote for This Pitch (0)"

6. **Test ranking changes:**
   - Vote for Dropbox (#3) → Watch it move up
   - Vote for Reddit (#5) multiple times → Might jump to #1!
   - Refresh page → Rankings persist

## 🔍 Debug Tools:

### Visit `/debug-vote` page:
```
https://your-app.vercel.app/debug-vote
```
- Shows your SSO user data
- Test vote button with console output
- See exact API responses

### Browser Console:
```javascript
// Open DevTools → Console
// Click vote button, look for:
[PITCH CARD] Voting for pitch: 1
[VOTE API] User verification: { hasUser: true, userId: "...", ... }
```

## 📊 Database Tables:

### `legendary_pitch_votes`
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Auto-increment primary key |
| pitch_id | INTEGER | 1-10 (matching SUCCESS_STORIES array) |
| user_id | TEXT | From Manaboodle SSO |
| user_email | TEXT | From Manaboodle SSO |
| user_name | TEXT | From Manaboodle SSO |
| class_code | TEXT | e.g., "2026" |
| created_at | TIMESTAMPTZ | When vote was cast |

**Constraint:** `unique_user_pitch` - One vote per user per pitch

### `legendary_pitch_rankings` (View)
| Column | Type | Description |
|--------|------|-------------|
| pitch_id | INTEGER | 1-10 |
| vote_count | BIGINT | Total votes for this pitch |
| unique_voters | BIGINT | Number of distinct users |
| classes_voting | BIGINT | Number of distinct classes |

Auto-updates as votes change!

## 🐛 Troubleshooting:

### "Not authenticated" error:
- **Fix:** Sign in via /login (redirects to Manaboodle)
- **Check:** Open /debug-vote to see if you have valid SSO token

### Vote doesn't save:
- **Fix:** Verify migration ran in Supabase
- **Check:** Supabase Table Editor → `legendary_pitch_votes` table exists

### Vote count doesn't update:
- **Fix:** Check browser console for API errors
- **Check:** Network tab → `/api/vote-pitch` returns 200 OK

### Rankings don't change:
- **Cause:** All pitches have 0 votes (tied)
- **Fix:** Add a few votes → Rankings will update!

### "Invalid pitch ID" error:
- **Cause:** pitch_id must be 1-10
- **Fix:** Report to developer (shouldn't happen in production)

## 📈 Growth Strategy:

1. **Share link with Harvard students**
   - "Vote on legendary Harvard pitches!"
   - Low barrier to entry (just click vote)

2. **Monitor engagement:**
   ```sql
   -- In Supabase SQL Editor:
   SELECT * FROM legendary_pitch_rankings ORDER BY vote_count DESC;
   ```

3. **See which pitches resonate:**
   - Facebook winning? Students love social networks
   - Warby Parker popular? Social impact matters
   - Use insights to guide student submissions!

4. **Natural funnel:**
   - Students vote → Get inspired → See CTA "Submit Your Startup"
   - Much better than "submit first, vote later"

## ✅ Next Steps:

- [x] Pitch voting with rankings ← **DONE!**
- [ ] Student startup voting page (/vote)
- [ ] Admin approval panel (/admin)
- [ ] Test with real Harvard students
- [ ] Launch to Class of 2026!

---

**Status:** ✅ Feature complete and deployed!  
**Last Updated:** Oct 27, 2025  
**Deployment:** Auto-deploys on push to main
