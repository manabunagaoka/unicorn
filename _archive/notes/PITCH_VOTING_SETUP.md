# Legendary Pitch Voting Setup

## Database Migration Required

Before the pitch voting feature works, you need to run the database migration:

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project
   - Click "SQL Editor" in the left sidebar

2. **Run the Migration**
   - Open the file: `supabase/pitch_votes_migration.sql`
   - Copy all the SQL code
   - Paste into Supabase SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

3. **Verify Tables Created**
   - Go to "Table Editor" in Supabase
   - You should see two new items:
     - ✅ `legendary_pitch_votes` (table)
     - ✅ `legendary_pitch_rankings` (view)

### What This Creates:

- **legendary_pitch_votes**: Stores which pitches students vote for
  - Columns: id, pitch_id (1-10), user_id, user_email, user_name, class_code, created_at
  - One vote per user per pitch (can toggle on/off)
  
- **legendary_pitch_rankings**: Real-time view showing vote counts
  - Shows: pitch_id, vote_count, unique_voters, classes_voting
  - Automatically updates as votes come in

### How It Works:

1. **Landing Page**: Shows 10 legendary Harvard startup pitches
   - Facebook, Microsoft, Dropbox, Akamai, Reddit, Priceonomics, Quora, Warby Parker, Typeform, Booking.com
   
2. **Vote Button**: Students click to vote for their favorite pitch
   - Authenticated users can vote (redirects to /login if not logged in)
   - Vote toggles on/off (click again to unvote)
   - Real-time vote counts displayed
   
3. **Database**: Tracks all votes
   - Uses Manaboodle SSO user data (user_id, email, name, class)
   - Prevents duplicate votes with unique constraint
   - Fast lookups with indexes

4. **Growth Strategy**: 
   - Invite students to vote on legendary pitches → They get inspired → They submit their own startup
   - Much better onboarding than "submit first, vote later"
   - Students engage with inspirational content before committing

### Testing:

```bash
# After running migration, test the vote flow:
1. Visit https://rize-git-main-manabunagaokas-projects.vercel.app
2. Sign in with Manaboodle SSO
3. Scroll to "Vote on Legendary Pitches"
4. Click "Vote for This Pitch" on any card
5. Vote count should increment
6. Button should show "Voted! (X)"
7. Click again to unvote
8. Vote count should decrement
```

### Troubleshooting:

- **"Not authenticated" error**: User needs to sign in via /login
- **Vote doesn't save**: Check that migration ran successfully in Supabase
- **Vote count doesn't update**: Check browser console for API errors
- **"Invalid pitch ID"**: pitch_id must be 1-10 (matching SUCCESS_STORIES array)

### Next Steps After Migration:

✅ Migration complete → Feature is live!
🚀 Share link with Harvard students to start voting
📊 Monitor vote counts in Supabase Table Editor
🎯 Students who vote are more likely to submit their own startups
