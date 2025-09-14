# SecretKeys Socket Server

Real-time socket server for SecretKeys password manager using Socket.io and Supabase.

## Features

- Real-time folder sharing notifications
- Invitation acceptance/decline handling
- User authentication with Supabase JWT
- CORS support for production deployment

## Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
NODE_ENV=production

# Server Configuration
PORT=3001
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your environment variables

3. Start the server:
```bash
npm run dev
```

## Railway Deployment

1. Connect your GitHub repository to Railway
2. Create a new service for the socket server
3. Set the root directory to `socket-server/`
4. Add environment variables in Railway dashboard
5. Deploy!

## API Endpoints

The server runs on the configured PORT and handles WebSocket connections for:
- `invitation:accept` - Accept folder sharing invitations
- `invitation:decline` - Decline folder sharing invitations

## Security

- All connections require valid Supabase JWT tokens
- CORS is configured for production domains
- User authentication is verified on connection
