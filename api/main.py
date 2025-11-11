"""
FastAPI Backend for WINDMAR Maritime Route Optimizer.

Provides REST API endpoints for:
- Route optimization
- Weather forecasts
- Fuel calculations
- Model calibration
- Vessel management
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# Import WINDMAR modules
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.grib.extractor import GRIBExtractor
from src.grib.parser import GRIBParser
from src.optimization.vessel_model import VesselModel, VesselSpecs
from src.optimization.router import MaritimeRouter, RouteConstraints
from src.database.excel_parser import ExcelParser
from src.database.calibration import ModelCalibrator


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Initialize FastAPI app
app = FastAPI(
    title="WINDMAR API",
    description="Maritime Route Optimization API for MR Product Tankers",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)


# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Request/Response Models
# ============================================================================

class Position(BaseModel):
    """Geographic position."""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in degrees")


class RouteRequest(BaseModel):
    """Route optimization request."""
    start: Position
    end: Position
    departure_time: datetime = Field(default_factory=datetime.utcnow)
    is_laden: bool = True
    target_speed_kts: Optional[float] = None
    use_weather: bool = True
    max_wind_speed_ms: float = 25.0
    max_wave_height_m: float = 5.0


class RouteResponse(BaseModel):
    """Route optimization response."""
    waypoints: List[List[float]]  # [[lat, lon], ...]
    total_distance_nm: float
    total_time_hours: float
    total_fuel_mt: float
    fuel_per_nm: float
    departure_time: datetime
    arrival_time: datetime
    optimization_method: str


class FuelCalculationRequest(BaseModel):
    """Fuel consumption calculation request."""
    speed_kts: float = Field(..., gt=0, lt=25)
    is_laden: bool = True
    distance_nm: float = 348.0
    wind_speed_ms: Optional[float] = None
    wind_dir_deg: Optional[float] = None
    sig_wave_height_m: Optional[float] = None
    wave_dir_deg: Optional[float] = None
    heading_deg: Optional[float] = None


class FuelCalculationResponse(BaseModel):
    """Fuel consumption calculation response."""
    fuel_mt: float
    power_kw: float
    time_hours: float
    fuel_breakdown: Dict[str, float]
    resistance_breakdown_kn: Dict[str, float]


class WeatherRequest(BaseModel):
    """Weather forecast request."""
    position: Position
    forecast_hours: int = Field(default=120, le=384)


class WeatherResponse(BaseModel):
    """Weather forecast response."""
    position: Position
    forecast_time: datetime
    wind_speed_ms: float
    wind_dir_deg: float
    pressure_pa: Optional[float]
    sig_wave_height_m: Optional[float]
    wave_period_s: Optional[float]
    wave_dir_deg: Optional[float]


class VesselConfig(BaseModel):
    """Vessel configuration."""
    dwt: float = 49000.0
    loa: float = 183.0
    beam: float = 32.0
    draft_laden: float = 11.8
    draft_ballast: float = 6.5
    mcr_kw: float = 8840.0
    sfoc_at_mcr: float = 171.0
    service_speed_laden: float = 14.5
    service_speed_ballast: float = 15.0


class CalibrationRequest(BaseModel):
    """Model calibration request."""
    noon_reports: List[Dict]


class CalibrationResponse(BaseModel):
    """Model calibration response."""
    calibration_factors: Dict[str, float]
    quality_metrics: Dict[str, float]
    report: str


# ============================================================================
# Global State
# ============================================================================

# Initialize components
grib_extractor = GRIBExtractor(cache_dir="data/grib_cache")
current_vessel_specs = VesselSpecs()
current_vessel_model = VesselModel(specs=current_vessel_specs)


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "WINDMAR API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/api/docs",
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/routes/optimize", response_model=RouteResponse)
async def optimize_route(request: RouteRequest, background_tasks: BackgroundTasks):
    """
    Optimize maritime route between two positions.

    Returns fuel-optimal route considering weather (if enabled).
    """
    try:
        logger.info(f"Optimizing route from {request.start} to {request.end}")

        # Prepare positions
        start_pos = (request.start.latitude, request.start.longitude)
        end_pos = (request.end.latitude, request.end.longitude)

        # Download weather if requested
        grib_parser_gfs = None
        grib_parser_wave = None

        if request.use_weather:
            try:
                waypoints = [start_pos, end_pos]
                gfs_file, wave_file = grib_extractor.download_route_forecast(
                    waypoints=waypoints,
                    forecast_hours=168,
                    buffer_degrees=2.0,
                )

                # Try to parse GRIB files
                try:
                    grib_parser_gfs = GRIBParser(gfs_file)
                    grib_parser_wave = GRIBParser(wave_file)
                    logger.info("Weather data loaded successfully")
                except ImportError:
                    logger.warning("pygrib not available, using great circle route")

            except Exception as e:
                logger.warning(f"Could not download weather: {e}")

        # Create router
        constraints = RouteConstraints(
            max_wind_speed_ms=request.max_wind_speed_ms,
            max_wave_height_m=request.max_wave_height_m,
            grid_resolution_deg=0.5,
        )

        router = MaritimeRouter(
            vessel_model=current_vessel_model,
            grib_parser_gfs=grib_parser_gfs,
            grib_parser_wave=grib_parser_wave,
            constraints=constraints,
        )

        # Optimize route
        result = router.find_optimal_route(
            start_pos=start_pos,
            end_pos=end_pos,
            departure_time=request.departure_time,
            is_laden=request.is_laden,
            target_speed_kts=request.target_speed_kts,
        )

        # Format response
        return RouteResponse(
            waypoints=result["waypoints"],
            total_distance_nm=result["total_distance_nm"],
            total_time_hours=result["total_time_hours"],
            total_fuel_mt=result["total_fuel_mt"],
            fuel_per_nm=result["total_fuel_mt"] / result["total_distance_nm"],
            departure_time=result["departure_time"],
            arrival_time=result["arrival_time"],
            optimization_method="A* with weather" if grib_parser_gfs else "Great circle",
        )

    except Exception as e:
        logger.error(f"Route optimization failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/fuel/calculate", response_model=FuelCalculationResponse)
async def calculate_fuel(request: FuelCalculationRequest):
    """
    Calculate fuel consumption for given conditions.

    Returns fuel consumption, power requirement, and breakdown.
    """
    try:
        # Prepare weather dict
        weather = None
        if request.wind_speed_ms is not None:
            weather = {
                "wind_speed_ms": request.wind_speed_ms,
                "wind_dir_deg": request.wind_dir_deg or 0,
                "heading_deg": request.heading_deg or 0,
            }
            if request.sig_wave_height_m is not None:
                weather["sig_wave_height_m"] = request.sig_wave_height_m
                weather["wave_dir_deg"] = request.wave_dir_deg or 0

        # Calculate fuel
        result = current_vessel_model.calculate_fuel_consumption(
            speed_kts=request.speed_kts,
            is_laden=request.is_laden,
            weather=weather,
            distance_nm=request.distance_nm,
        )

        return FuelCalculationResponse(**result)

    except Exception as e:
        logger.error(f"Fuel calculation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/vessel/specs")
async def get_vessel_specs():
    """Get current vessel specifications."""
    specs = current_vessel_specs
    return {
        "dwt": specs.dwt,
        "loa": specs.loa,
        "beam": specs.beam,
        "draft_laden": specs.draft_laden,
        "draft_ballast": specs.draft_ballast,
        "mcr_kw": specs.mcr_kw,
        "sfoc_at_mcr": specs.sfoc_at_mcr,
        "service_speed_laden": specs.service_speed_laden,
        "service_speed_ballast": specs.service_speed_ballast,
    }


@app.post("/api/vessel/specs")
async def update_vessel_specs(config: VesselConfig):
    """Update vessel specifications."""
    global current_vessel_specs, current_vessel_model

    try:
        current_vessel_specs = VesselSpecs(
            dwt=config.dwt,
            loa=config.loa,
            beam=config.beam,
            draft_laden=config.draft_laden,
            draft_ballast=config.draft_ballast,
            mcr_kw=config.mcr_kw,
            sfoc_at_mcr=config.sfoc_at_mcr,
            service_speed_laden=config.service_speed_laden,
            service_speed_ballast=config.service_speed_ballast,
        )
        current_vessel_model = VesselModel(specs=current_vessel_specs)

        return {"status": "success", "message": "Vessel specs updated"}

    except Exception as e:
        logger.error(f"Failed to update vessel specs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/calibration/run", response_model=CalibrationResponse)
async def run_calibration(request: CalibrationRequest):
    """
    Calibrate vessel model from noon reports.

    Returns calibration factors and quality metrics.
    """
    try:
        calibrator = ModelCalibrator(vessel_specs=current_vessel_specs)

        factors = calibrator.calibrate(
            noon_reports=request.noon_reports,
            initial_factors={"calm_water": 1.0, "wind": 1.0, "waves": 1.0},
        )

        report = calibrator.get_calibration_report()

        return CalibrationResponse(
            calibration_factors=factors,
            quality_metrics=calibrator.calibration_quality,
            report=report,
        )

    except Exception as e:
        logger.error(f"Calibration failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scenarios")
async def get_fuel_scenarios():
    """Get pre-calculated fuel scenarios for comparison."""
    scenarios = []

    # Scenario 1: Calm, laden
    calm = current_vessel_model.calculate_fuel_consumption(
        speed_kts=14.5, is_laden=True, weather=None, distance_nm=348.0
    )
    scenarios.append({
        "name": "Calm Weather (Laden)",
        "fuel_mt": calm["fuel_mt"],
        "power_kw": calm["power_kw"],
        "conditions": "14.5 kts, no wind/waves",
    })

    # Scenario 2: Moderate wind
    wind = current_vessel_model.calculate_fuel_consumption(
        speed_kts=14.5,
        is_laden=True,
        weather={"wind_speed_ms": 10.0, "wind_dir_deg": 0, "heading_deg": 0},
        distance_nm=348.0,
    )
    scenarios.append({
        "name": "Head Wind 20 kts (Laden)",
        "fuel_mt": wind["fuel_mt"],
        "power_kw": wind["power_kw"],
        "conditions": "14.5 kts, 20 kt head wind",
    })

    # Scenario 3: Rough seas
    rough = current_vessel_model.calculate_fuel_consumption(
        speed_kts=14.5,
        is_laden=True,
        weather={
            "wind_speed_ms": 12.5,
            "wind_dir_deg": 0,
            "heading_deg": 0,
            "sig_wave_height_m": 3.0,
            "wave_dir_deg": 0,
        },
        distance_nm=348.0,
    )
    scenarios.append({
        "name": "Rough Seas (Laden)",
        "fuel_mt": rough["fuel_mt"],
        "power_kw": rough["power_kw"],
        "conditions": "14.5 kts, 25 kt wind + 3m waves",
    })

    # Scenario 4: Ballast
    ballast = current_vessel_model.calculate_fuel_consumption(
        speed_kts=15.0, is_laden=False, weather=None, distance_nm=360.0
    )
    scenarios.append({
        "name": "Calm Weather (Ballast)",
        "fuel_mt": ballast["fuel_mt"],
        "power_kw": ballast["power_kw"],
        "conditions": "15.0 kts, no wind/waves",
    })

    return {"scenarios": scenarios}


# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
