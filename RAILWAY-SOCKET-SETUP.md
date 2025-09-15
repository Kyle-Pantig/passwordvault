# Railway Socket Server Setup Guide

## Environment Variables Required

### For the Main App (Next.js)
Set these in your main Railway service:

```bash
NEXT_PUBLIC_APP_URL=https://your-app-name.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### For the Socket Server
Set these in your socket server Railway service:

```bash
NODE_ENV=production
PORT=3001
NEXT_PUBLIC_APP_URL=https://your-app-name.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Deployment Steps

1. **Deploy the Socket Server first:**
   - Use the `railway-socket.json` configuration
   - Make sure all environment variables are set
   - Note the Railway URL for the socket server

2. **Deploy the Main App:**
   - Use the `railway.json` configuration
   - Set `NEXT_PUBLIC_SOCKET_URL` to your socket server's Railway URL
   - Make sure all other environment variables are set

3. **Verify the setup:**
   - Check that both services are running
   - Test the health endpoints:
     - Main app: `https://your-app-name.up.railway.app`
     - Socket server: `https://your-socket-server.up.railway.app/health`

## Troubleshooting

### Check Socket Connection
1. Open browser dev tools
2. Look for socket connection logs in the console
3. Check for CORS errors
4. Verify the socket URL is correct

### Check Server Logs
1. In Railway dashboard, check the socket server logs
2. Look for connection/disconnection messages
3. Check for authentication errors

### Common Issues
1. **CORS errors**: Make sure both domains are in the CORS origin list
2. **Authentication failures**: Verify Supabase keys are correct
3. **Connection timeouts**: Check if the socket server is accessible
4. **Database errors**: Verify table names match between socket server and API routes

## Testing Real-time Features

1. Open two browser windows/tabs
2. Log in with different accounts
3. Send an invitation from one account
4. Check if the other account receives the real-time notification
5. Check browser console and server logs for any errors
