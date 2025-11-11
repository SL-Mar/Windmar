#!/bin/bash

# WINDMAR Startup Script
# Starts both backend API and frontend web application

set -e

echo "======================================================================"
echo "  WINDMAR - Maritime Route Optimizer"
echo "======================================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}Python 3 not found. Please install Python 3.8+${NC}"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check if backend dependencies are installed
echo -e "${BLUE}Checking Python dependencies...${NC}"
python3 -c "import fastapi" 2>/dev/null || {
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    pip install -r requirements.txt
}

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

echo ""
echo -e "${GREEN}✓ All dependencies ready${NC}"
echo ""

# Create data directory
mkdir -p data/grib_cache

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down WINDMAR...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${BLUE}Starting Backend API (port 8000)...${NC}"
cd "$(dirname "$0")"
python3 api/main.py > /dev/null 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Check if backend is running
if ! curl -s http://localhost:8000/api/health > /dev/null; then
    echo -e "${YELLOW}Warning: Backend may not have started correctly${NC}"
fi

# Start frontend
echo -e "${BLUE}Starting Frontend Web App (port 3000)...${NC}"
cd frontend
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
sleep 5

echo ""
echo "======================================================================"
echo -e "${GREEN}✓ WINDMAR is ready!${NC}"
echo "======================================================================"
echo ""
echo "  Frontend:     http://localhost:3000"
echo "  API Docs:     http://localhost:8000/api/docs"
echo "  Health Check: http://localhost:8000/api/health"
echo ""
echo "  Press Ctrl+C to stop all services"
echo ""
echo "======================================================================"

# Keep script running
wait
