#!/bin/bash

# Deploy socket server to Railway
echo "🚀 Deploying socket server to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Login to Railway (if not already logged in)
echo "🔐 Checking Railway authentication..."
railway whoami || railway login

# Deploy the socket server
echo "📦 Deploying socket server..."
railway up --service socket-server

echo "✅ Socket server deployment initiated!"
echo "📋 Next steps:"
echo "1. Wait for deployment to complete"
echo "2. Get the socket server URL from Railway dashboard"
echo "3. Update NEXT_PUBLIC_SOCKET_URL in your main app environment variables"
echo "4. Redeploy your main app"
