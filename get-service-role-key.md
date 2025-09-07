# 🔑 How to Get Your Supabase Service Role Key

## Step-by-Step Instructions:

### 1. Go to Supabase Dashboard
- Open your browser and go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Sign in to your account

### 2. Select Your Project
- Click on your project: `jsbuakrmbtypyverhoez`

### 3. Navigate to API Settings
- In the left sidebar, click on **"Settings"**
- Click on **"API"**

### 4. Find the Service Role Key
- Look for the **"Project API keys"** section
- Find the **"service_role"** key (NOT the "anon" key)
- It should look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzYnVha3JtYnR5cHl2ZXJob2V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE5ODg5MCwiZXhwIjoyMDcyNzc0ODkwfQ...`

### 5. Copy the Service Role Key
- Click the **"Copy"** button next to the service_role key
- **⚠️ IMPORTANT**: This key has admin privileges - keep it secret!

### 6. Update Your .env.local File
- Open your `.env.local` file
- Replace `your_service_role_key_here` with your actual service role key
- Save the file

### 7. Restart Your Development Server
- Stop your current server (Ctrl+C)
- Run `npm run dev` again

## 🔒 Security Note:
- The service_role key has full admin access to your Supabase project
- Never commit this key to version control
- Only use it in server-side code (like our API route)
- Keep it in your `.env.local` file (which should be in `.gitignore`)

## ✅ After Setup:
Once you've updated the service role key, the delete account functionality will:
- Delete all user credentials from the database
- Delete the user account from Supabase Authentication
- Completely remove the user from the Users list in your Supabase dashboard
