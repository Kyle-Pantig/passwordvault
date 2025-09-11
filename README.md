# DigiVault - Secure Password Manager

A modern, secure password manager built with Next.js, TypeScript, TailwindCSS, shadcn/ui, and Supabase.

## Features

- 🔐 **Secure Authentication** - User sign up, login, and session management with Supabase Auth
- 🛡️ **Encrypted Storage** - Passwords are encrypted before storing in the database
- 📱 **Responsive Design** - Works perfectly on desktop and mobile devices
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 🔍 **Search & Filter** - Quickly find credentials by service name or username
- 📋 **Copy to Clipboard** - One-click copying of usernames and passwords
- 👁️ **Password Visibility Toggle** - Show/hide passwords as needed
- ✏️ **CRUD Operations** - Add, edit, and delete credentials
- 🎨 **Modern UI** - Beautiful interface built with shadcn/ui components

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS v3
- **UI Components**: shadcn/ui
- **Backend**: Supabase (Database + Authentication)
- **Encryption**: CryptoJS for password encryption
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd digivault
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

### 3. Set up the Database

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL commands from `supabase-schema.sql` to create the necessary tables and policies

### 4. Generate Encryption Key

Generate a secure 32-character encryption key for password encryption:

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Add this key to your `.env.local` file as `ENCRYPTION_KEY`.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Sign Up**: Create a new account with your email and password
2. **Sign In**: Log in to access your password vault
3. **Add Credentials**: Click "Add Credential" to store new service credentials
4. **Manage Credentials**: Edit or delete existing credentials using the dropdown menu
5. **Search**: Use the search bar to quickly find specific credentials
6. **Copy**: Click the copy buttons to copy usernames or passwords to clipboard
7. **Toggle Visibility**: Click the eye icon to show/hide passwords
8. **Dark Mode**: Toggle between light and dark themes using the theme button

## Security Features

- **Password Encryption**: All passwords are encrypted using AES encryption before storing
- **Row Level Security**: Database policies ensure users can only access their own data
- **Secure Authentication**: Supabase handles secure user authentication and session management
- **Environment Variables**: Sensitive configuration is stored in environment variables
- **HTTPS Ready**: Production deployment should use HTTPS for maximum security

## Database Schema

The application uses a single `credentials` table with the following structure:

- `id`: Unique identifier (UUID)
- `user_id`: Foreign key to auth.users (UUID)
- `service_name`: Name of the service (TEXT)
- `service_icon`: URL to service icon (TEXT, optional)
- `username`: Username or email (TEXT)
- `password`: Encrypted password (TEXT)
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

Make sure to set all required environment variables in your deployment platform.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.