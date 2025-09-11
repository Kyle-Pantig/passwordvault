# hCaptcha Integration Setup Guide

This guide will help you set up hCaptcha integration with your DigiVault application.

## Prerequisites

- A Supabase project with Attack Protection enabled
- hCaptcha account (free tier available)

## Step 1: Get hCaptcha Keys

1. Go to [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)
2. Sign up or log in to your account
3. Create a new site or use an existing one
4. Copy your **Site Key** and **Secret Key**

## Step 2: Configure Environment Variables

1. Run the setup script to create your `.env.local` file:
   ```bash
   node setup-env.js
   ```

2. Open `.env.local` and add your hCaptcha keys:
   ```env
   # hCaptcha Configuration
   NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_actual_site_key_here
   HCAPTCHA_SECRET_KEY=your_actual_secret_key_here
   ```

## Step 3: Configure Supabase Attack Protection

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Attack Protection**
3. Enable **Bot and Abuse Protection**
4. Select **hCaptcha** as the provider
5. Enter your hCaptcha **Secret Key** in the "Captcha secret" field
6. Save the changes

## Step 4: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to your login or signup page
3. You should see the hCaptcha widget appear
4. Complete the captcha and try to log in/sign up

## Features Implemented

### ✅ Login Form
- hCaptcha verification before login attempts
- Captcha reset on failed login attempts
- Error handling for captcha failures

### ✅ Signup Form
- hCaptcha verification before account creation
- Captcha reset on failed signup attempts
- Error handling for captcha failures

### ✅ API Integration
- Server-side captcha verification
- Integration with existing rate limiting
- Proper error responses

### ✅ Security Features
- Captcha tokens are verified server-side
- Failed attempts reset the captcha
- Environment-based configuration

## Configuration Options

The hCaptcha component supports several configuration options:

```tsx
<HCaptchaComponent
  onVerify={handleCaptchaVerify}
  onExpire={handleCaptchaExpire}
  onError={handleCaptchaError}
  theme="light" // or "dark"
  size="normal" // or "compact"
  className="flex justify-center"
/>
```

## Troubleshooting

### Captcha Not Showing
- Check that `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is set correctly
- Verify the site key is valid in hCaptcha dashboard
- Check browser console for errors

### Captcha Verification Failing
- Verify `HCAPTCHA_SECRET_KEY` is set correctly
- Check that the secret key matches the site key
- Ensure Supabase Attack Protection is configured with the same secret key

### Development vs Production
- Use different hCaptcha sites for development and production
- Update environment variables accordingly
- Test thoroughly in both environments

## Security Notes

- Never expose your secret key in client-side code
- Always verify captcha tokens server-side
- Use HTTPS in production
- Monitor captcha success rates in hCaptcha dashboard

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Test with a fresh incognito window
4. Check hCaptcha dashboard for site status

## Free Tier Limits

hCaptcha free tier includes:
- 1,000,000 requests per month
- Basic analytics
- Standard support

For higher limits, consider upgrading to a paid plan.
