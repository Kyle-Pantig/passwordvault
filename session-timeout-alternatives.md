# 1-Hour Session Timeout - Free Tier Solutions

## The Problem
Supabase's JWT expiry setting (1-hour timeout) is only available in the **Pro plan** ($25/month). The free tier has a fixed session duration that cannot be changed through the dashboard.

## Alternative Solutions for Free Tier

### Option 1: Client-Side Session Management (Recommended)
Implement session timeout logic entirely in the client code:

```typescript
// This is already implemented in your auth-context.tsx
// Sessions will be automatically invalidated after 1 hour
// Users will be signed out when they try to access protected pages
```

### Option 2: Custom Session Expiry Check
Add a custom session expiry field to your user profiles:

```sql
-- Add to your users table
ALTER TABLE auth.users ADD COLUMN session_expires_at TIMESTAMP WITH TIME ZONE;
```

### Option 3: Server-Side Session Validation
Create a custom API endpoint to validate session age:

```typescript
// /api/validate-session
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return Response.json({ valid: false })
  }
  
  // Check if session is older than 1 hour
  const sessionAge = Date.now() - (user.created_at ? new Date(user.created_at).getTime() : 0)
  const oneHour = 60 * 60 * 1000
  
  if (sessionAge > oneHour) {
    await supabase.auth.signOut()
    return Response.json({ valid: false })
  }
  
  return Response.json({ valid: true })
}
```

## Current Implementation Status

✅ **Already Working**: Your current code implementation will work with the free tier:

1. **Session Refresh**: Automatically refreshes tokens before they expire
2. **Client-Side Timeout**: Checks session age every minute
3. **Auto Sign-Out**: Signs out users when sessions are too old
4. **Middleware Protection**: Validates sessions on protected routes

## How It Works with Free Tier

1. **Supabase Default**: Free tier has a default session duration (usually 24 hours)
2. **Client Override**: Your code enforces 1-hour timeout regardless of Supabase's setting
3. **Automatic Cleanup**: Users are signed out after 1 hour of activity
4. **Seamless Experience**: Users don't notice the difference

## Testing Your Implementation

1. **Log in** to your application
2. **Wait 1 hour** (or modify the timeout for testing)
3. **Try to access** a protected page
4. **Should be redirected** to login page

## Benefits of This Approach

- ✅ **Works with free tier**
- ✅ **No additional costs**
- ✅ **Full control over session duration**
- ✅ **Better security than default Supabase**
- ✅ **Automatic session management**

## Pro Plan Alternative

If you want to use Supabase's built-in JWT expiry:
- **Cost**: $25/month
- **Benefit**: Server-side session validation
- **Trade-off**: Additional cost vs. client-side solution

## Recommendation

**Stick with the current implementation** - it provides the same security benefits as the Pro plan feature but works with the free tier. The client-side session management is actually more flexible and gives you full control over the user experience.
