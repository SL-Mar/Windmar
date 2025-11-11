# WINDMAR - Maritime Route Optimizer for MR Product Tanker

A complete maritime route optimization system for Medium Range (MR) Product Tankers that minimizes fuel consumption using real-time weather and wave data from NOAA. Features a **beautiful web interface** inspired by Syroco's professional design.

## 🚢 Features

### Core Engine
- **GRIB Data Integration**: Automatic download and parsing of NOAA GFS (weather) and WaveWatch III (waves) forecasts
- **Vessel Performance Model**: Physics-based fuel consumption model using Holtrop-Mennen resistance and SFOC curves
- **Route Optimization**: A* pathfinding algorithm adapted for maritime navigation
- **Model Calibration**: Calibrate performance models from Excel noon report data
- **Constraint Handling**: Under Keel Clearance (UKC), ECA zones, weather limits

### Web Application
- **🗺️ Interactive Route Planning**: Optimize routes with real-time weather data
- **📊 Fuel Analysis Dashboard**: Compare fuel consumption across scenarios
- **⚙️ Vessel Configuration**: Customize vessel specifications
- **🌊 Weather Integration**: Real-time NOAA weather routing
- **📈 Performance Charts**: Visual fuel breakdown and optimization insights
- **🎨 Beautiful UI**: Professional maritime design inspired by Syroco

### Technology Stack
- **Backend**: FastAPI (Python) - REST API
- **Frontend**: Next.js 15 + TypeScript - Modern web interface
- **Styling**: Tailwind CSS - Custom maritime theme
- **Maps**: React Leaflet - Interactive route visualization
- **Charts**: Recharts - Performance analytics

## Vessel Specifications

The system is optimized for a typical MR Product Tanker:
- **DWT**: 49,000 MT
- **LOA**: 183m, Beam: 32m
- **Draft**: 11.8m (laden), 6.5m (ballast)
- **Main Engine**: 8,840 kW
- **SFOC**: 171 g/kWh at MCR
- **Service Speed**: 14.5 kts (laden), 15.0 kts (ballast)

## 🚀 Quick Start

### One-Command Setup

```bash
# Install dependencies and start everything
./run.sh
```

Then visit:
- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:8000/api/docs

### Manual Setup

#### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### 2. Install Frontend Dependencies

```bash
cd frontend && npm install && cd ..
```

#### 3. Start Backend API

```bash
python api/main.py
```

#### 4. Start Frontend (in new terminal)

```bash
cd frontend && npm run dev
```

### Python Examples (Optional)

```bash
# Simple demo (no GRIB required)
python examples/demo_simple.py

# Full ARA-MED optimization
python examples/example_ara_med.py

# Model calibration
python examples/example_calibration.py
```

## 📁 Project Structure

```
windmar/
├── api/
│   └── main.py                   # FastAPI backend server
├── frontend/
│   ├── app/                      # Next.js pages
│   │   ├── page.tsx             # Route optimization
│   │   ├── fuel-analysis/       # Fuel dashboard
│   │   └── vessel-config/       # Vessel settings
│   └── components/              # React components
├── src/
│   ├── grib/
│   │   ├── extractor.py         # Download GRIB files from NOAA
│   │   └── parser.py            # Parse GRIB data with pygrib
│   ├── visualization/
│   │   └── plotter.py           # Weather maps and route visualization
│   ├── optimization/
│   │   ├── vessel_model.py      # Fuel consumption model
│   │   └── router.py            # A* route optimization
│   └── database/
│       ├── excel_parser.py      # Parse Excel noon reports
│       └── calibration.py       # Calibrate model from data
├── examples/
│   ├── demo_simple.py           # Simple demo (no GRIB)
│   ├── example_ara_med.py       # Rotterdam-Augusta example
│   └── example_calibration.py   # Calibration example
├── tests/
│   └── unit/                    # Unit tests
├── data/
│   └── grib_cache/             # Downloaded GRIB files
└── run.sh                      # One-command startup script
```

## 🌐 Web Interface

The WINDMAR web application provides:

### Route Optimization
- Select predefined routes (ARA-MED, Transatlantic, Mediterranean)
- Choose loading condition (Laden/Ballast)
- Toggle weather routing
- View optimized route on interactive map
- Real-time fuel consumption calculations

### Fuel Analysis
- Compare scenarios (calm vs rough seas)
- Weather impact analysis
- Fuel breakdown charts
- Optimization opportunities

### Vessel Configuration
- Configure vessel dimensions
- Set engine specifications
- Customize service speeds
- Save custom configurations

## 📊 Data Sources

- **Weather Forecasts**: NOAA GFS (0.25° resolution, 384-hour forecast)
- **Wave Forecasts**: NOAA WaveWatch III (0.5° resolution, 180-hour forecast)

Both datasets are freely available and updated every 6 hours.

## 📖 Documentation

- **Complete Setup Guide**: See [RUN.md](RUN.md)
- **Installation Details**: See [INSTALLATION.md](INSTALLATION.md)
- **Frontend Docs**: See [frontend/README.md](frontend/README.md)
- **API Documentation**: http://localhost:8000/api/docs (when running)

## 🧪 Testing

```bash
# Run unit tests
pytest tests/ -v

# Run specific test file
pytest tests/unit/test_vessel_model.py -v
```

## 📸 Screenshots

The web interface features:
- **Dark Maritime Theme**: Professional design inspired by Syroco
- **Interactive Maps**: Leaflet-based route visualization
- **Real-time Data**: Live weather and route calculations
- **Responsive Design**: Works on desktop and tablet

## 🚀 Production Deployment

See [RUN.md](RUN.md) for Docker and production deployment instructions.

## 📝 License

Private - SL Mar

## 👥 Author

SL Mar - Maritime Route Optimization Team

## 🤝 Support

- API Documentation: http://localhost:8000/api/docs
- GitHub Issues: For bug reports and feature requests
- Documentation: See RUN.md and INSTALLATION.md for detailed guides
