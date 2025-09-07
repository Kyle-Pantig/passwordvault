# Supabase Email Configuration

To enable email verification for your password manager, you need to configure the email templates in your Supabase dashboard.

## Steps to Configure Email Verification

### 1. Go to Authentication Settings
1. Open your Supabase project dashboard
2. Navigate to **Authentication** → **Settings**
3. Scroll down to **Email Templates**

### 2. Configure Signup Email Template
1. Click on **"Confirm signup"** template
2. Update the template with the following content:

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>

<p>If you didn't create an account, you can safely ignore this email.</p>
```

### 3. Set Site URL
1. In **Authentication** → **Settings** → **General**
2. Set **Site URL** to: `http://localhost:3000` (for development)
3. For production, set it to your actual domain

### 4. Configure Redirect URLs
1. In **Authentication** → **Settings** → **URL Configuration**
2. Add these redirect URLs:
   - `http://localhost:3000/verify` (for development)
   - `https://yourdomain.com/verify` (for production)

### 5. Email Provider (Optional)
By default, Supabase uses a built-in email service with limited sending capacity. For production, consider:

- **SendGrid**
- **Mailgun** 
- **Amazon SES**
- **Postmark**

## Email Template Variables

Supabase provides these template variables:
- `{{ .ConfirmationURL }}` - The verification link
- `{{ .Token }}` - The verification token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address
- `{{ .Data }}` - Additional user data
- `{{ .RedirectTo }}` - Redirect URL after verification

## Testing Email Verification

1. Sign up with a real email address
2. Check your email inbox (including spam folder)
3. Click the verification link
4. You should be redirected to `/verify` page
5. After successful verification, you can log in

## Troubleshooting

- **Email not received**: Check spam folder, verify email provider settings
- **Invalid link**: Ensure Site URL and redirect URLs are correctly configured
- **Verification fails**: Check that the token hasn't expired (usually 24 hours)
