#!/bin/bash

# Deploy socket server using Docker
echo "🐳 Deploying socket server with Docker..."

# Build the socket server Docker image
echo "📦 Building socket server Docker image..."
docker build -f Dockerfile.socket -t passwordvault-socket-server .

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    
    # Run the socket server container
    echo "🚀 Starting socket server container..."
    docker run -d \
        --name passwordvault-socket \
        --env-file .env.local \
        -p 3001:3001 \
        --restart unless-stopped \
        passwordvault-socket-server
    
    if [ $? -eq 0 ]; then
        echo "✅ Socket server container started successfully!"
        echo "📋 Socket server is running on port 3001"
        echo "🔗 Health check: http://localhost:3001/health"
        echo ""
        echo "📝 Next steps:"
        echo "1. Update your main app's NEXT_PUBLIC_SOCKET_URL to point to this socket server"
        echo "2. For production, deploy this to your hosting platform (Railway, etc.)"
        echo "3. Make sure the socket server URL is accessible from your main app"
    else
        echo "❌ Failed to start socket server container"
        exit 1
    fi
else
    echo "❌ Failed to build Docker image"
    exit 1
fi
