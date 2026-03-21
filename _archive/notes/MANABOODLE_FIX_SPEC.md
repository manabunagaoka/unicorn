# Manaboodle Academic Portal SSO Fix Specification

## Problem
The `/academic-portal/login` endpoint is showing the login form every time, even when the user is already authenticated with Manaboodle. This causes an endless redirect loop between RIZE and the Academic Portal.

## Current Behavior (BROKEN)
1. User clicks "Log in with Manaboodle" on RIZE
2. Redirects to: `https://www.manaboodle.com/academic-portal/login?return_url=https://rize-git-main-manabunagaokas-projects.vercel.app&app_name=RIZE`
3. Academic Portal **shows login form** (even though user is already logged in)
4. User submits form → redirects back to RIZE with tokens ✓ (this part works now!)
5. **But step 3 should be skipped if already logged in**

## Expected Behavior (FIXED)
1. User clicks "Log in with Manaboodle" on RIZE
2. Redirects to: `https://www.manaboodle.com/academic-portal/login?return_url=https://rize-git-main-manabunagaokas-projects.vercel.app&app_name=RIZE`
3. Academic Portal **checks for existing Manaboodle session cookie**
4. **If logged in:** Immediately redirect to `return_url` with tokens (skip login form)
   - Redirect to: `https://rize-git-main-manabunagaokas-projects.vercel.app/?sso_token=<token>&sso_refresh=<refresh_token>`
5. **If NOT logged in:** Show login form
6. After successful login → redirect to `return_url` with tokens

## Technical Requirements

### Endpoint: `GET /academic-portal/login`

#### Query Parameters
- `return_url` (required): The URL to redirect back to after authentication
- `app_name` (required): The name of the app requesting authentication (e.g., "RIZE")

#### Session Check Logic
```javascript
// Pseudocode for /academic-portal/login endpoint

export async function GET(request) {
  const { return_url, app_name } = request.query;
  
  // 1. Check if user has active Manaboodle session
  const session = await getSessionFromCookie(request.cookies);
  
  if (session && session.user) {
    // User is already logged in!
    // Generate SSO tokens and redirect immediately
    const sso_token = generateSSOToken(session.user, app_name);
    const sso_refresh = generateRefreshToken(session.user, app_name);
    
    const redirectUrl = new URL(return_url);
    redirectUrl.searchParams.set('sso_token', sso_token);
    redirectUrl.searchParams.set('sso_refresh', sso_refresh);
    
    return Response.redirect(redirectUrl.toString());
  }
  
  // User not logged in - show the login form
  return renderLoginForm({
    return_url,
    app_name
  });
}
```

#### Login Form Submission Logic
```javascript
// Pseudocode for POST /academic-portal/login endpoint

export async function POST(request) {
  const { email, password, return_url, app_name } = await request.formData();
  
  // Authenticate user
  const user = await authenticateUser(email, password);
  
  if (user) {
    // Create Manaboodle session
    await createSession(user);
    
    // Generate SSO tokens
    const sso_token = generateSSOToken(user, app_name);
    const sso_refresh = generateRefreshToken(user, app_name);
    
    // IMPORTANT: Redirect to return_url (NOT Academic Portal home)
    const redirectUrl = new URL(return_url);
    redirectUrl.searchParams.set('sso_token', sso_token);
    redirectUrl.searchParams.set('sso_refresh', sso_refresh);
    
    return Response.redirect(redirectUrl.toString());
  }
  
  // Login failed - show error
  return renderLoginForm({
    return_url,
    app_name,
    error: 'Invalid credentials'
  });
}
```

## Test Cases

### Test Case 1: Already Logged In (Most Important!)
**Setup:** User is already logged into Manaboodle (has valid session cookie)

**Steps:**
1. Visit: `https://www.manaboodle.com/academic-portal/login?return_url=https://rize-git-main-manabunagaokas-projects.vercel.app&app_name=RIZE`

**Expected Result:**
- Should **NOT** show login form
- Should **immediately redirect** to: `https://rize-git-main-manabunagaokas-projects.vercel.app/?sso_token=<token>&sso_refresh=<refresh>`

**Current Result (BROKEN):**
- Shows login form (should not)

### Test Case 2: Not Logged In
**Setup:** User has no active Manaboodle session

**Steps:**
1. Visit: `https://www.manaboodle.com/academic-portal/login?return_url=https://rize-git-main-manabunagaokas-projects.vercel.app&app_name=RIZE`
2. See login form
3. Enter credentials and submit

**Expected Result:**
- Shows login form ✓
- After successful login, redirects to: `https://rize-git-main-manabunagaokas-projects.vercel.app/?sso_token=<token>&sso_refresh=<refresh>`

**Current Result (BROKEN):**
- Shows login form ✓
- After login, redirects to Academic Portal home (should redirect to return_url)

### Test Case 3: Invalid Session
**Setup:** User has expired or invalid session cookie

**Steps:**
1. Visit: `https://www.manaboodle.com/academic-portal/login?return_url=https://rize-git-main-manabunagaokas-projects.vercel.app&app_name=RIZE`

**Expected Result:**
- Should show login form (treat as not logged in)

## Security Considerations

1. **Validate return_url:** Ensure it's a whitelisted domain to prevent open redirect vulnerabilities
   ```javascript
   const ALLOWED_DOMAINS = [
     'https://rize-git-main-manabunagaokas-projects.vercel.app',
     'http://localhost:3000',
     // add other allowed domains
   ];
   
   function isValidReturnUrl(url) {
     try {
       const parsed = new URL(url);
       return ALLOWED_DOMAINS.some(domain => url.startsWith(domain));
     } catch {
       return false;
     }
   }
   ```

2. **Token expiry:** SSO tokens should be short-lived (7 days), refresh tokens longer (30 days)

3. **Token binding:** Bind tokens to the `app_name` to prevent token reuse across apps

## Implementation Checklist

- [ ] Add session check at the START of `/academic-portal/login` GET handler
- [ ] If session exists → generate tokens → redirect to `return_url` with tokens
- [ ] If no session → show login form as before
- [ ] Update POST handler to redirect to `return_url` (not Academic Portal home)
- [ ] Validate `return_url` against whitelist
- [ ] Add `https://rize-git-main-manabunagaokas-projects.vercel.app` to whitelist
- [ ] Test with RIZE: `https://rize-git-main-manabunagaokas-projects.vercel.app`
- [ ] Test both scenarios:
  - Already logged in (should skip form)
  - Not logged in (should show form, then redirect after login)

## Questions?

Contact: manabunagaoka (RIZE developer)

## Expected Timeline

This is a critical blocker for RIZE SSO. The fix should be straightforward - just add session check before rendering the login form.

Estimated time: 15-30 minutes
