# Deploy Socket Server to Railway

## Quick Deployment Steps

### 1. Deploy Socket Server to Railway

1. Go to [Railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Select "Add Service" → "GitHub Repo"
7. **Set Root Directory to: `socket-server`**
8. Click "Deploy"

### 2. Configure Environment Variables

In Railway dashboard, go to your socket server service and add these environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App Configuration  
NEXT_PUBLIC_APP_URL=https://passwordvault-production.up.railway.app
NODE_ENV=production

# Server Configuration (Railway will set PORT automatically)
PORT=3001
```

### 3. Get Socket Server URL

After deployment, Railway will provide a URL like:
`https://your-socket-server-name.railway.app`

### 4. Update Main App Environment

In your main app's environment variables (Vercel/Netlify/etc.), add:

```env
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server-name.railway.app
```

### 5. Test the Connection

1. Deploy both services
2. Open your main app
3. Check browser console for "Socket connected successfully" message
4. Test folder sharing invitations

## Troubleshooting

### Check Socket Server Health
Visit: `https://your-socket-server-name.railway.app/health`

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

### Check Railway Logs
In Railway dashboard, go to your socket server service and check the logs for:
- Server startup messages
- Connection attempts
- Error messages

### Common Issues

1. **CORS Errors**: Make sure `NEXT_PUBLIC_APP_URL` matches your main app domain exactly
2. **Authentication Errors**: Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
3. **Connection Timeouts**: Check if the socket server is running and accessible

## Current Issue

Your current setup is trying to connect to:
`https://passwordvault-production.up.railway.app/` (main app)

But it should connect to:
`https://your-socket-server-name.railway.app` (separate socket server)

The socket server needs to be deployed as a separate Railway service!
