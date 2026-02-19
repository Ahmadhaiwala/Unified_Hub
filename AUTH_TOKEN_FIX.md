# Authentication Token Fix - 401 Unauthorized Errors

## Problem
Users were experiencing 401 Unauthorized errors when using the chat functionality. The errors occurred because:

1. JWT tokens from Supabase expire after a certain period (typically 1 hour)
2. The frontend wasn't automatically refreshing expired tokens
3. When tokens expired, API calls would fail with 401 errors

## Solution Implemented

### 1. Enhanced AuthContext with Automatic Token Refresh

**File: `frontend/src/context/AuthContext.js`**

Added automatic token refresh logic:
- Listens for `TOKEN_REFRESHED` events from Supabase
- Checks token expiration every 5 minutes
- Automatically refreshes tokens that are about to expire (within 10 minutes)
- Signs out users if token refresh fails

### 2. Improved API Helper with Retry Logic

**File: `frontend/src/lib/api.js`**

Enhanced the `getAuthHeaders()` function:
- Checks if token is expired or about to expire before each API call
- Automatically refreshes token if needed
- Added `authenticatedFetch()` helper that:
  - Automatically retries failed requests with 401 errors
  - Refreshes token and retries once before failing
  - Signs out user if refresh fails

### 3. Manual Session Refresh Button

**File: `frontend/src/components/SessionRefreshButton.js`**

Created a user-facing button that allows manual session refresh:
- Visible in the sidebar
- Shows success/error messages
- Automatically signs out if refresh fails
- Useful for users experiencing authentication issues

**Added to: `frontend/src/components/Sidebar.js`**

## How It Works

### Automatic Token Refresh Flow

1. **Proactive Refresh (Every 5 minutes)**
   - Background check runs every 5 minutes
   - If token expires in < 10 minutes, refresh it
   - Updates session state automatically

2. **On-Demand Refresh (Before API calls)**
   - Before each API call, check token expiration
   - If token expires in < 1 minute, refresh it
   - Use fresh token for the API call

3. **Retry on 401 (After failed API call)**
   - If API returns 401, attempt token refresh
   - Retry the same request with new token
   - Sign out if refresh fails

### Manual Refresh Flow

1. User clicks "🔄 Refresh Session" button
2. Calls `supabase.auth.refreshSession()`
3. Shows success or error message
4. If refresh fails, signs out after 2 seconds

## Usage

### For Users

If you see 401 Unauthorized errors:
1. Click the "🔄 Refresh Session" button in the sidebar
2. If that doesn't work, log out and log back in

### For Developers

The token refresh is now automatic. No code changes needed in components that make API calls.

However, for new API calls, consider using the `authenticatedFetch()` helper:

```javascript
import { authenticatedFetch } from '../lib/api'

// Instead of:
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${user.access_token}` }
})

// Use:
const response = await authenticatedFetch(url, {
  method: 'GET'
})
```

## Testing

To test the token refresh:

1. **Automatic Refresh**: Wait for token to expire (or manually set a short expiration)
2. **Manual Refresh**: Click the refresh button in sidebar
3. **Retry on 401**: Make an API call with an expired token

## Notes

- Tokens typically expire after 1 hour
- Refresh tokens are valid for longer (typically 30 days)
- If refresh token expires, user must log in again
- All token refresh operations are logged to console for debugging

## Files Modified

1. `frontend/src/context/AuthContext.js` - Added automatic token refresh
2. `frontend/src/lib/api.js` - Enhanced with retry logic
3. `frontend/src/components/SessionRefreshButton.js` - New component
4. `frontend/src/components/Sidebar.js` - Added refresh button

## Backend Changes

No backend changes were needed. The backend correctly validates tokens and returns 401 when they're expired.

The issue was purely on the frontend - not refreshing tokens before they expired.
