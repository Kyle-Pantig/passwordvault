# Socket Server Docker Deployment Guide

This guide helps you deploy the socket server using Docker, either locally or on Railway.

## 🐳 Local Docker Deployment

### Quick Start

1. **Build and run the socket server:**
   ```bash
   npm run docker:socket:deploy
   ```

2. **Or manually:**
   ```bash
   # Build the image
   npm run docker:socket:build
   
   # Run the container
   npm run docker:socket:run
   ```

3. **Check if it's running:**
   ```bash
   curl http://localhost:3001/health
   ```

### Manual Docker Commands

```bash
# Build the socket server image
docker build -f Dockerfile.socket -t passwordvault-socket-server .

# Run the container
docker run -d \
  --name passwordvault-socket \
  --env-file .env.local \
  -p 3001:3001 \
  --restart unless-stopped \
  passwordvault-socket-server

# Check logs
docker logs passwordvault-socket

# Stop and remove
docker stop passwordvault-socket && docker rm passwordvault-socket
```

## 🚀 Railway Docker Deployment

### Method 1: Using Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Deploy socket server:**
   ```bash
   railway up --service socket-server --dockerfile Dockerfile.socket
   ```

### Method 2: Using Railway Dashboard

1. Go to [Railway.app](https://railway.app)
2. Create a new project
3. Add a new service
4. Choose "Deploy from GitHub repo"
5. Select your repository
6. **Set Dockerfile path to: `Dockerfile.socket`**
7. Add environment variables:
   ```env
   NODE_ENV=production
   PORT=3001
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_APP_URL=https://passwordvault-production.up.railway.app
   ```

## 🔧 Environment Variables

Make sure these are set in your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=https://passwordvault-production.up.railway.app
NODE_ENV=production

# Socket Server Configuration
PORT=3001
```

## 📋 Update Main App

After deploying the socket server, update your main app's environment variables:

```env
NEXT_PUBLIC_SOCKET_URL=https://your-socket-server-railway-url.railway.app
```

## 🧪 Testing

### Health Check
```bash
curl https://your-socket-server-url.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

### Socket Connection Test
Open your browser console and check for:
- "Attempting to connect to socket server: [URL]"
- "Socket connected successfully"

## 🐛 Troubleshooting

### Common Issues

1. **Container won't start:**
   ```bash
   docker logs passwordvault-socket
   ```

2. **Port already in use:**
   ```bash
   docker stop passwordvault-socket
   docker rm passwordvault-socket
   ```

3. **Environment variables not loaded:**
   - Check `.env.local` file exists
   - Verify variable names match exactly

4. **CORS errors:**
   - Ensure `NEXT_PUBLIC_APP_URL` matches your main app domain
   - Check both HTTP and HTTPS protocols

### Docker Commands

```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View container logs
docker logs passwordvault-socket

# Execute commands in container
docker exec -it passwordvault-socket sh

# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune
```

## 📊 Monitoring

### Railway Dashboard
- View logs in real-time
- Monitor resource usage
- Check deployment status

### Docker Monitoring
```bash
# Resource usage
docker stats passwordvault-socket

# Container details
docker inspect passwordvault-socket
```

## 🔄 Updates

To update the socket server:

1. **Stop current container:**
   ```bash
   npm run docker:socket:stop
   ```

2. **Rebuild and restart:**
   ```bash
   npm run docker:socket:deploy
   ```

3. **Or for Railway:**
   - Push changes to GitHub
   - Railway will automatically redeploy

## 🎯 Production Checklist

- [ ] Socket server deployed and running
- [ ] Health check endpoint responding
- [ ] Environment variables configured
- [ ] Main app updated with socket URL
- [ ] CORS settings correct
- [ ] Monitoring set up
- [ ] Backup strategy in place

---

**Your socket server will be available at:**
`https://your-socket-server-name.railway.app`

**Update your main app's `NEXT_PUBLIC_SOCKET_URL` to this URL!**
