# Username System Specification

**Date:** October 31, 2025  
**Status:** Ready for Implementation

---

## 📋 Decisions Made

### **Username Format Rules:**
- ✅ **Spaces allowed** - "Mana Mana" is valid
- ✅ **Max length:** 20 characters
- ❌ **No emojis** - Strip/reject emoji input
- ✅ **Case-insensitive uniqueness** - "ManaMana" = "manamana"
- ✅ **Min length:** 3 characters
- ✅ **Characters allowed:** Letters, numbers, spaces, hyphens, underscores

### **Privacy Settings:**
- ❌ **Real names NOT shown publicly** - Only usernames on leaderboard
- ✅ **Real names visible to admins only** - For moderation
- ✅ **Usernames displayed as:** `@username` or just `username` (decide per component)

### **Branding:**
- ✅ **RIZE → MM7 Index** (Manaboodle Magnificent 7 Index)
- ✅ **Keep domain:** rize.vercel.app (no need to rename codespace)
- ✅ **Update all UI text** throughout app

### **Existing Users:**
- ✅ **Current user (you):** Set username to "ManaMana"
- ✅ **Future users:** Prompt for username on first login
- ✅ **No auto-generation needed** (only one user currently)

---

## 💾 Database Schema

### **Add to `users` table:**
```sql
-- Username column (allows spaces, max 50 to be safe)
ALTER TABLE users ADD COLUMN username VARCHAR(50);

-- Timestamp when username was set
ALTER TABLE users ADD COLUMN username_set_at TIMESTAMP;

-- Create unique index (case-insensitive)
CREATE UNIQUE INDEX idx_users_username_lower 
ON users (LOWER(username));

-- Set your username
UPDATE users 
SET username = 'ManaMana', 
    username_set_at = NOW()
WHERE email = 'your-email@manaboodle.com'; -- Replace with actual email
```

---

## 🎨 Display Format

### **Leaderboard:**
```
#1   AI Warren       $1,245,000   +24.5%   🥇
#2   AI Cathie       $1,189,000   +18.9%   🥈
...
#52  ManaMana        $1,042,000   +4.2%    ⬆️+3
```

### **Profile Page:**
```
Username: ManaMana
Real Name: [Your Real Name] (visible to you only)
Email: [Your Email] (visible to you only)
Member Since: Oct 2025
```

### **Transaction History:**
```
BUY  MSFT  10 shares  @ManaMana  Oct 31, 10:30am
```

---

## 🔒 Validation Rules

### **Username Validation Function:**
```typescript
function isValidUsername(username: string): boolean {
  // Remove emoji
  const noEmoji = username.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
  
  // Check length
  if (noEmoji.length < 3 || noEmoji.length > 20) return false;
  
  // Check characters (letters, numbers, space, hyphen, underscore)
  const validChars = /^[a-zA-Z0-9 _-]+$/;
  if (!validChars.test(noEmoji)) return false;
  
  // No leading/trailing spaces
  if (noEmoji !== noEmoji.trim()) return false;
  
  // No multiple consecutive spaces
  if (/  /.test(noEmoji)) return false;
  
  return true;
}
```

### **Reserved Usernames (Block These):**
```typescript
const RESERVED_USERNAMES = [
  'admin', 'moderator', 'support', 'manaboodle',
  'ai warren', 'ai cathie', 'ai peter', 'ai ray',
  'ai charlie', 'ai benjamin', 'ai michael',
  'system', 'official', 'verified'
];
```

---

## 🔄 User Flow

### **First Login (After SSO):**
```
1. User logs in via Manaboodle SSO
2. App checks: user.username exists?
3. If NO:
   - Show "Welcome! Choose your investor name" modal
   - User enters username
   - Real-time check: available?
   - Save username
4. If YES:
   - Proceed to app
```

### **Username Already Set:**
```
User sees their username throughout the app:
- Leaderboard: "ManaMana"
- Profile: "ManaMana"
- Settings: Can change username (with confirmation)
```

---

## 🎯 AI Investor Usernames

Auto-generate for 7 AIs:
```sql
-- Set usernames for AI investors
UPDATE users SET username = 'AI Warren' WHERE email = 'ai.warren@rize.ai';
UPDATE users SET username = 'AI Cathie' WHERE email = 'ai.cathie@rize.ai';
UPDATE users SET username = 'AI Peter' WHERE email = 'ai.peter@rize.ai';
UPDATE users SET username = 'AI Ray' WHERE email = 'ai.ray@rize.ai';
UPDATE users SET username = 'AI Charlie' WHERE email = 'ai.charlie@rize.ai';
UPDATE users SET username = 'AI Benjamin' WHERE email = 'ai.benjamin@rize.ai';
UPDATE users SET username = 'AI Michael' WHERE email = 'ai.michael@rize.ai';
```

---

## 📊 API Endpoints

### **1. Check Username Availability**
```
GET /api/check-username?username=ManaMana

Response:
{
  "available": false,
  "suggestions": ["ManaMana2", "ManaMana_", "Mana Mana"]
}
```

### **2. Set Username**
```
POST /api/set-username
Body: { "username": "ManaMana" }

Response:
{
  "success": true,
  "username": "ManaMana"
}
```

### **3. Update Username**
```
PUT /api/update-username
Body: { "newUsername": "Mana Investor" }

Response:
{
  "success": true,
  "username": "Mana Investor"
}
```

---

## 🎨 Branding Changes

### **Text Replacements:**
| Old | New |
|-----|-----|
| RIZE | MM7 Index |
| Rize | MM7 Index |
| rize | mm7 |

### **Files to Update:**
- `/src/components/Header.tsx` - Logo/title
- `/src/app/layout.tsx` - Page metadata
- `/README.md` - Project description
- `/package.json` - Project name (optional)
- All page titles

### **Keep Same:**
- Domain: `rize.vercel.app`
- Codespace name: No need to change
- GitHub repo name: Can stay "rize"

---

## ✅ Implementation Checklist

### **Phase 1A - Task 1: Username System**
- [ ] Run SQL migration to add username column
- [ ] Set your username to "ManaMana"
- [ ] Create `/api/check-username` endpoint
- [ ] Create `/api/set-username` endpoint
- [ ] Build username validation function
- [ ] Create `UsernameSetupModal` component
- [ ] Add check on app load (if no username, show modal)
- [ ] Update leaderboard to display usernames

### **Phase 1A - Task 2: Rebrand to MM7**
- [ ] Update Header component
- [ ] Update page metadata (title, description)
- [ ] Update README
- [ ] Find/replace "RIZE" → "MM7 Index" in all files
- [ ] Update competition titles
- [ ] Update landing page text (if keeping it)

---

**Ready to start implementing!** 🚀
