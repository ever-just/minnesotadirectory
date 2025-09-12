#!/bin/bash

echo "🚀 Starting development servers..."

# Kill any existing processes
pkill -f vite 2>/dev/null
pkill -f auth-server 2>/dev/null
sleep 1

# Start the auth server
echo "Starting authentication server on port 8888..."
node dev-auth-server.cjs &
AUTH_PID=$!

# Wait for auth server to start
sleep 2

# Start Vite dev server
echo "Starting Vite dev server on port 5173..."
npm run dev:vite &
VITE_PID=$!

# Wait for Vite to start
sleep 3

echo ""
echo "✅ Development servers started!"
echo ""
echo "📍 Application URL: http://localhost:5173"
echo "📍 Auth Server URL: http://localhost:8888"
echo ""
echo "Test credentials:"
echo "  Email: demo@test.com"
echo "  Password: Demo1234!"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap "kill $AUTH_PID $VITE_PID 2>/dev/null; exit" INT
wait