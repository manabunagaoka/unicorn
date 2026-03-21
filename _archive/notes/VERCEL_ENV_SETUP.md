# RIZE Vercel Environment Variables Setup

## Problem
The landing page shows "⚠️ Database not connected yet" because Supabase environment variables are not set in Vercel production deployment.

## Solution
Add the environment variables from `.env.local` to Vercel.

## Steps

### 1. Go to Vercel Project Settings
Visit: https://vercel.com/manabunagaokas-projects/rize-git-main-manabunagaokas-projects/settings/environment-variables

(Or navigate manually: Vercel Dashboard → Your Project → Settings → Environment Variables)

### 2. Add These 3 Environment Variables

Click "Add New" for each variable:

#### Variable 1: NEXT_PUBLIC_SUPABASE_URL
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://otxidzozhdnszvqbgzne.supabase.co
Environment: Production, Preview, Development (check all)
```

#### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eGlkem96aGRuc3p2cWJnem5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3OTY3ODgsImV4cCI6MjA2NzM3Mjc4OH0.KOi0ZHsSpo5q0aEL1p8w0RAdWIXFXoP9GxLpEDWNQF8
Environment: Production, Preview, Development (check all)
```

#### Variable 3: SUPABASE_SERVICE_KEY
```
Name: SUPABASE_SERVICE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90eGlkem96aGRuc3p2cWJnem5lIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTc5Njc4OCwiZXhwIjoyMDY3MzcyNzg4fQ.r0fVBVfE5JT_HxyuGKCNAi6V_IIqd4hraLZrHeVBD_k
Environment: Production, Preview, Development (check all)
```

⚠️ **IMPORTANT:** The `SUPABASE_SERVICE_KEY` should be marked as "Sensitive" in Vercel (it will be hidden after saving)

### 3. Redeploy the Project

After adding all 3 variables, you need to trigger a new deployment for the changes to take effect.

**Option A: Redeploy from Vercel Dashboard**
1. Go to Deployments tab
2. Click the "..." menu on the latest deployment
3. Click "Redeploy"

**Option B: Push a commit to trigger rebuild**
```bash
git commit --allow-empty -m "Trigger rebuild with environment variables"
git push origin main
```

### 4. Verify It's Working

After deployment completes (~2 minutes), visit your site:
https://rize-git-main-manabunagaokas-projects.vercel.app

**You should see:**
- ✅ Top 10 Harvard Startups displayed as cards
- ✅ No more "⚠️ Database not connected" warning
- ✅ Startup details: rank, name, founder, valuation, description, category
- ✅ "⭐ Rate This Company" buttons

## Database Schema Status

The Supabase database already has:
- ✅ `top_startups` table created (schema.sql run)
- ✅ 10 Harvard startups seeded (seed.sql run)
- ✅ `startup_votes` table created
- ✅ `student_projects` table created
- ✅ Row Level Security (RLS) policies configured

## Next Steps After Env Vars Are Set

Once the environment variables are configured and the Top 10 startups appear:

1. **Build Voting UI** - Create `/vote` page for rating startups
2. **Build Leaderboard** - Create `/leaderboard` showing rankings
3. **Build Submission Form** - Create `/submit` for users to add their startups

## Troubleshooting

**If startups still don't appear after redeploying:**

1. Check Vercel deployment logs for errors
2. Verify environment variables are saved correctly
3. Make sure the Supabase project is accessible (not paused)
4. Check that schema.sql and seed.sql were run in Supabase SQL Editor

**To verify database in Supabase:**
1. Go to https://supabase.com/dashboard
2. Open your project
3. Go to Table Editor
4. Check that `top_startups` table has 10 rows

## Questions?

If you encounter issues, share:
- Vercel deployment logs
- Browser console errors (F12 → Console tab)
- Screenshot of the Vercel environment variables page
