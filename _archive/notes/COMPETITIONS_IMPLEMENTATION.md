# Competitions System - Implementation Plan

## What We're Building

A multi-competition platform where:
- ✅ ONE global trading market (all investors can trade any startup)
- ✅ Multiple competitions run simultaneously (HM7, President's, HIVE, etc.)
- ✅ Competitions = Filtered leaderboards + prizes (not separate markets)
- ✅ Founders can join competitions OR trade global-only
- ✅ Notifications when new competitions launch
- ✅ Profile editing (founders can update their startup/competition choices)

---

## Step 1: Database Setup ✅ READY

### Run the migration:

1. Go to: https://supabase.com/dashboard/project/otxidzozhdnszvqbgzne/sql/new
2. Open file: `/workspaces/rize/supabase/competitions_system.sql`
3. Copy all content
4. Paste into Supabase SQL Editor
5. Click "RUN" (or Cmd/Ctrl + Enter)

### What it creates:

**Tables:**
- `competitions` - Stores competition metadata
- `startup_competitions` - Links startups to competitions (many-to-many)
- `competition_participants` - Tracks who's competing where
- `notifications` - Global notification messages
- `user_notifications` - User-specific notification inbox
- `user_notification_settings` - Notification preferences

**Views:**
- `competition_founder_leaderboard` - Rankings by startup market cap
- `competition_investor_leaderboard` - Rankings by investor balance
- `competition_stats` - Quick stats per competition

**Seed Data:**
- Global Market (special non-competition category)
- HM7 - Fall 2025 (status: trading)
- President's Innovation Challenge 2026 (status: upcoming)
- HIVE 2026 (status: upcoming)

---

## Step 2: Admin Interface (NEXT)

Build `/admin/competitions` with:

### Features:
- View all competitions
- Create new competition
- Edit existing competition
- Change competition status
- Trigger notifications
- View competition stats

### API Routes to create:
- `POST /api/admin/competitions/create`
- `PUT /api/admin/competitions/[id]/update`
- `POST /api/admin/competitions/[id]/notify`
- `GET /api/admin/competitions/stats`

---

## Step 3: Startup Submission Update

Update `/submit` form to:

### Add Competition Selection Step:

```
Step 1: Basic Info (existing)
Step 2: Team Members (existing)  
Step 3: Competition Selection (NEW)
  - Radio: Global Market Only
  - OR Checkboxes: Join competitions
    ☐ President's Innovation Challenge 2026
    ☐ HIVE 2026
    (etc.)
Step 4: IPO Configuration (existing)
```

### Backend:
- When startup created → Auto-add to "Global Market"
- If competitions selected → Add to `startup_competitions` table
- Trigger adds founder to `competition_participants` automatically

---

## Step 4: Profile Editing

Create `/profile/[userId]/edit` for:

### Startup Founders Can Edit:
- ✅ Startup basic info (name, description, team)
- ✅ Competition selections (add/remove competitions)
- ✅ IPO settings (if not launched yet)

### Investors Can Edit:
- ✅ Profile info
- ✅ Competition participation (join/leave competitions)
- ✅ Notification preferences

### API:
- `PUT /api/startups/[id]/update` - Update startup info
- `POST /api/startups/[id]/competitions` - Add/remove competitions
- `PUT /api/users/[id]/profile` - Update user profile

---

## Step 5: Notification System

### In-App Notifications:

**UI Components:**
- Notification bell in header (shows unread count)
- Dropdown with recent notifications
- Click to mark as read
- Action buttons (Join Competition, View Startup, etc.)

**API:**
- `GET /api/notifications` - Get user's notifications
- `POST /api/notifications/[id]/read` - Mark as read
- `POST /api/notifications/[id]/dismiss` - Dismiss
- `GET /api/notifications/unread-count` - Badge number

### Notification Triggers:

**Admin creates competition:**
1. Admin publishes new competition
2. System creates notification record
3. System adds to all users' inboxes (who have preference enabled)
4. Badge count updates
5. (Optional) Email sent

**Competition opens:**
1. Scheduled job checks `registration_start` dates
2. Sends "Competition now open for registration!" 
3. Users get notified

**Competition closing soon:**
1. 7 days before `registration_end`
2. Send reminder to participants
3. 1 day before - send final reminder

---

## Step 6: Competition UI

### Homepage Updates:

Show active/upcoming competitions:

```
🔥 LIVE NOW

HM7 - Fall 2025
156 investors | 7 startups | $24.5M market cap
[Start Trading]

🔜 COMING SOON

President's Innovation Challenge 2026
Opens Jan 15, 2026 | $50k prize pool
[Get Notified]

HIVE 2026
Opens Feb 1, 2026 | EdTech focus
[Get Notified]
```

### Competition Filter:

Add dropdown on startup list page:

```
[All Competitions ▼]
  - All Startups
  - HM7 - Fall 2025
  - President's Challenge 2026
  - HIVE 2026
  - Global Market Only
```

### Leaderboard Tabs:

```
🏆 Leaderboard

[All] [HM7] [President's] [HIVE]

Founders | Investors
```

---

## Timeline

### Today (5-6 hours):

**Phase 1: Database (30 min)** ✅ DONE
- SQL migration ready
- Just needs to be run in Supabase

**Phase 2: Admin Interface (1.5 hours)** ← NEXT
- Create competition form
- Edit competition
- Basic list view

**Phase 3: Startup Submission (1 hour)**
- Add competition selection step
- Save to junction table

**Phase 4: Profile Editing (1 hour)**
- Edit startup info
- Edit competition selections

**Phase 5: Notifications (1.5 hours)**
- Bell icon + dropdown
- API endpoints
- Mark as read

**Phase 6: UI Polish (1 hour)**
- Competition filters
- Leaderboard tabs
- Homepage competition cards

---

## Testing Plan

### After each phase:

1. **Admin:** Create "Test Competition 2025"
2. **Founder:** Submit startup, select competition
3. **Verify:** Startup appears in competition filter
4. **Investor:** Join competition
5. **Verify:** Investor appears in competition leaderboard
6. **Admin:** Publish notification
7. **Verify:** All users see notification
8. **User:** Mark notification as read
9. **Verify:** Badge count decreases

---

## Next Steps

**IMMEDIATE:**
1. Run SQL migration in Supabase Dashboard
2. Verify tables created
3. Start building admin interface

**Ready to proceed?**
