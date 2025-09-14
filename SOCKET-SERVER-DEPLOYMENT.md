# Socket Server Deployment Guide

This guide will help you deploy the SecretKeys socket server to Railway for real-time functionality.

## 🚀 Railway Deployment Steps

### 1. Prepare the Socket Server

The socket server is already prepared in the `socket-server/` directory with:
- ✅ `package.json` with all dependencies
- ✅ `server.js` - Main server file
- ✅ `railway.json` - Railway configuration
- ✅ `README.md` - Documentation

### 2. Deploy to Railway

1. **Go to [Railway.app](https://railway.app)**
2. **Sign in with GitHub**
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Choose your repository**
6. **Select "Add Service" → "GitHub Repo"**
7. **Set Root Directory to: `socket-server`**
8. **Click "Deploy"**

### 3. Configure Environment Variables

In Railway dashboard, go to your socket server service and add these environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App Configuration  
NEXT_PUBLIC_APP_URL=https://your-main-app-domain.com
NODE_ENV=production

# Server Configuration (Railway will set PORT automatically)
PORT=3001
```

### 4. Update Main App Environment

In your main app's environment variables (Vercel/Netlify/etc.), add:

```env
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server-railway-url.railway.app
```

### 5. Test the Connection

1. Deploy both services
2. Open your main app
3. Check browser console for "Socket connected" message
4. Test folder sharing invitations

## 🔧 Local Development

To test the socket server locally:

```bash
cd socket-server
npm install
cp .env.example .env
# Edit .env with your values
npm run dev
```

## 📊 Monitoring

Railway provides:
- ✅ **Real-time logs** in the dashboard
- ✅ **Health checks** and auto-restart
- ✅ **Metrics** and performance monitoring
- ✅ **Custom domains** (optional)

## 🛠️ Troubleshooting

### Common Issues:

1. **Socket Connection Failed**
   - Check `NEXT_PUBLIC_SOCKET_URL` is correct
   - Verify CORS settings in socket server
   - Check Railway logs for errors

2. **Authentication Errors**
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
   - Check JWT token is being passed correctly

3. **CORS Issues**
   - Ensure `NEXT_PUBLIC_APP_URL` matches your main app domain
   - Check both HTTP and HTTPS protocols

### Railway Logs:
```bash
# View logs in Railway dashboard or CLI
railway logs
```

## 🔒 Security Notes

- ✅ JWT tokens are validated on every connection
- ✅ CORS is configured for production domains only
- ✅ No sensitive data is stored in socket connections
- ✅ All database operations use service role key

## 📈 Scaling

Railway automatically handles:
- ✅ **Auto-scaling** based on demand
- ✅ **Load balancing** across instances
- ✅ **Health monitoring** and recovery
- ✅ **Zero-downtime deployments**

## 💰 Cost

Railway offers:
- ✅ **Free tier** with generous limits
- ✅ **Pay-as-you-scale** pricing
- ✅ **No minimum charges**

---

**Your socket server will be available at:**
`https://your-project-name.railway.app`

**Update your main app's `NEXT_PUBLIC_SOCKET_URL` to this URL!**
