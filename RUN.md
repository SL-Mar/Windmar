# WINDMAR - Complete Setup & Run Guide

Quick guide to get the entire WINDMAR system running.

## System Overview

WINDMAR consists of three components:
1. **Backend API** (FastAPI) - Port 8000
2. **Frontend Web App** (Next.js) - Port 3000
3. **Python Core** - Optimization engine

## One-Command Setup

### Option 1: Full Installation (Recommended)

```bash
# Clone and enter directory
cd /home/user/Windmar

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install && cd ..

# Start both backend and frontend
./run.sh
```

### Option 2: Step-by-Step Installation

#### 1. Python Backend Setup

```bash
# Install core dependencies
pip install numpy scipy pandas matplotlib openpyxl requests fastapi uvicorn

# Optional: GRIB support (requires ECCODES)
sudo apt-get install libeccodes-dev  # Ubuntu
pip install pygrib

# Optional: Advanced mapping
pip install cartopy
```

#### 2. Frontend Setup

```bash
cd frontend

# Install Node.js dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

cd ..
```

## Running the Application

### Method 1: Using the Run Script

```bash
# Make script executable
chmod +x run.sh

# Run everything
./run.sh
```

This starts:
- Backend API on http://localhost:8000
- Frontend Web App on http://localhost:3000

### Method 2: Manual Start (Separate Terminals)

**Terminal 1 - Backend:**
```bash
python api/main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Method 3: Production Build

```bash
# Build frontend for production
cd frontend
npm run build

# Start production servers
cd ..
python api/main.py &
cd frontend && npm start
```

## Accessing the Application

Once running:

- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:8000/api/docs
- **API Health Check**: http://localhost:8000/api/health

## Testing the System

### 1. Test Backend API

```bash
# Health check
curl http://localhost:8000/api/health

# Get vessel specs
curl http://localhost:8000/api/vessel/specs

# Get fuel scenarios
curl http://localhost:8000/api/scenarios
```

### 2. Test Frontend

Visit http://localhost:3000 and:
1. Select "ARA - MED" route
2. Choose "Laden" condition
3. Toggle "Use Weather Data" ON
4. Click "Optimize Route"
5. View interactive map and results

### 3. Run Python Examples (Optional)

```bash
# Simple demo (no GRIB required)
python examples/demo_simple.py

# Full ARA-MED optimization (requires pygrib)
python examples/example_ara_med.py

# Calibration example
python examples/example_calibration.py
```

### 4. Run Unit Tests

```bash
pytest tests/ -v
```

## Default Ports

| Service | Port | URL |
|---------|------|-----|
| Backend API | 8000 | http://localhost:8000 |
| API Docs | 8000 | http://localhost:8000/api/docs |
| Frontend Dev | 3000 | http://localhost:3000 |
| Frontend Prod | 3000 | http://localhost:3000 |

## Directory Structure

```
Windmar/
├── api/
│   └── main.py              # FastAPI backend server
├── frontend/
│   ├── app/                 # Next.js pages
│   ├── components/          # React components
│   └── package.json         # Node.js dependencies
├── src/
│   ├── grib/               # GRIB data handling
│   ├── optimization/       # Route & fuel optimization
│   ├── database/           # Data parsing & calibration
│   └── visualization/      # Charts & maps
├── examples/               # Example scripts
├── tests/                  # Unit tests
└── data/
    └── grib_cache/        # Downloaded weather files
```

## Troubleshooting

### Backend Won't Start

**Error**: `ModuleNotFoundError: No module named 'fastapi'`
```bash
pip install fastapi uvicorn
```

**Error**: `Address already in use (port 8000)`
```bash
# Find and kill process using port 8000
lsof -ti:8000 | xargs kill -9
```

### Frontend Won't Start

**Error**: `Cannot find module 'next'`
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Error**: `EADDRINUSE: port 3000 already in use`
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or run on different port
npm run dev -- -p 3001
```

### API Connection Failed

**Error**: Frontend can't connect to backend

1. Check backend is running:
   ```bash
   curl http://localhost:8000/api/health
   ```

2. Check CORS settings in `api/main.py`

3. Verify `.env.local` in frontend:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

### GRIB Files Won't Download

**Error**: `pygrib not installed`
- This is OK! System falls back to great circle route
- To enable: Install ECCODES library, then `pip install pygrib`

**Error**: `Failed to download forecasts`
- Check internet connection
- NOAA servers may be temporarily unavailable
- System continues with offline route optimization

### Map Not Displaying

**Error**: Blank map area

1. Check browser console for errors
2. Ensure Leaflet CSS is loaded
3. Try clearing browser cache
4. Component must be client-side only

## Performance Tips

### Backend Optimization

```python
# Use coarser grid for faster routing
constraints = RouteConstraints(grid_resolution_deg=1.0)  # Default: 0.5

# Disable weather for quick results
use_weather=False
```

### Frontend Optimization

```bash
# Build production bundle (faster than dev)
cd frontend
npm run build
npm start
```

### Caching

GRIB files are cached in `data/grib_cache/` for 7 days.

Clear cache if needed:
```bash
rm -rf data/grib_cache/*.grb2
```

## Stopping the Application

### If using run.sh

```bash
# Press Ctrl+C in terminal
# Or find processes:
ps aux | grep -E "uvicorn|next"
kill [PID]
```

### If running manually

Press Ctrl+C in each terminal, or:

```bash
# Kill backend
lsof -ti:8000 | xargs kill -9

# Kill frontend
lsof -ti:3000 | xargs kill -9
```

## Next Steps

1. **Customize Vessel**: Visit http://localhost:3000/vessel-config
2. **Analyze Fuel**: Check http://localhost:3000/fuel-analysis
3. **Optimize Routes**: Use main page to plan voyages
4. **Calibrate Model**: Upload noon reports (future feature)
5. **API Integration**: Use API docs to integrate with your systems

## Production Deployment

### Docker (Recommended)

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d
```

### Manual Deployment

**Backend:**
```bash
pip install gunicorn
gunicorn api.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

## Support

- API Docs: http://localhost:8000/api/docs
- GitHub Issues: https://github.com/sl-mar/windmar/issues
- Documentation: See README.md and INSTALLATION.md

## Quick Reference

```bash
# Start everything
./run.sh

# Test backend
curl http://localhost:8000/api/health

# Test frontend
open http://localhost:3000

# Run examples
python examples/demo_simple.py

# Run tests
pytest

# Stop everything
killall -9 python node
```

---

**Ready to sail!** 🚢 Navigate to http://localhost:3000 to start optimizing routes.
