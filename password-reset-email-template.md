# Password Reset Email Template

## Supabase Email Template Configuration

To enable password reset functionality, you need to configure the email template in your Supabase dashboard.

### Steps to Configure:

1. **Go to Supabase Dashboard**
   - Navigate to **Authentication** → **Settings** → **Email Templates**

2. **Update "Reset Password" Template**
   - Click on **"Reset password"** template
   - Replace the content with the template below

3. **Set Redirect URL**
   - In **Authentication** → **Settings** → **URL Configuration**
   - Add `http://localhost:3000/reset-password` to **Redirect URLs**

## Email Template

```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .SiteURL }}/reset-password?access_token={{ .TokenHash }}&type=recovery" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>

<p>If you didn't request a password reset, you can safely ignore this email.</p>

<p>Best regards,<br>
DigiVault Team</p>
```

## Template Variables Used:

- `{{ .SiteURL }}` - Your site URL (e.g., http://localhost:3000)
- `{{ .TokenHash }}` - The hashed token for password reset
- `type=recovery` - Tells the app this is a password reset link

## How It Works:

1. **User clicks "Forgot Password"** on login page
2. **Enters email** and submits form
3. **Supabase sends email** with reset link
4. **User clicks link** → Redirected to `/reset-password` page
5. **Token is validated** → User can set new password
6. **Password updated** → User redirected to login page

## Security Features:

- ✅ **Token validation** - Checks if reset link is valid
- ✅ **Expiration handling** - Shows error for expired links
- ✅ **Password confirmation** - User must confirm new password
- ✅ **Password strength** - Minimum 6 characters required
- ✅ **Show/hide passwords** - Toggle visibility for both fields

## Testing:

1. Go to login page
2. Click "Forgot your password?"
3. Enter a registered email address
4. Check email for reset link
5. Click the reset link
6. Set new password
7. Try logging in with new password

The password reset flow is now fully functional! 🔐
