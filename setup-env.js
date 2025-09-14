const crypto = require('crypto');
const fs = require('fs');

// Generate a secure encryption key
const encryptionKey = crypto.randomBytes(16).toString('hex');

// Create .env.local file
const envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Service Role Key for admin operations (get from Supabase Dashboard > Settings > API)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Encryption key for passwords (generated automatically)
ENCRYPTION_KEY=${encryptionKey}

# hCaptcha Configuration (get from https://dashboard.hcaptcha.com/)
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_hcaptcha_site_key_here
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key_here

# Resend Email Service (get from https://resend.com/)
RESEND_API_KEY=your_resend_api_key_here

# Stripe Payment (optional - get from https://stripe.com/)
STRIPE_SECRET_KEY=your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
`;

fs.writeFileSync('.env.local', envContent);

console.log('✅ .env.local file created successfully!');
console.log('🔑 Your encryption key has been generated automatically');
console.log('📝 Please update the Supabase configuration with your actual values');
console.log('');
console.log('Next steps:');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Copy your project URL and anon key from Settings > API');
console.log('3. Update the .env.local file with your Supabase credentials');
console.log('4. Go to https://dashboard.hcaptcha.com/ and create a new site');
console.log('5. Copy your hCaptcha Site Key and Secret Key to .env.local');
console.log('6. Run the SQL commands from supabase-schema.sql in your Supabase SQL Editor');
console.log('7. Run "npm run dev" to start the development server');
