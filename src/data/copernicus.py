"""
Copernicus Data Provider for WINDMAR.

Fetches weather and ocean data from:
- Copernicus Marine Service (CMEMS) - waves, currents
- Climate Data Store (CDS) - wind forecasts

Requires:
- pip install copernicusmarine xarray netcdf4
- pip install cdsapi

Authentication:
- CMEMS: ~/.copernicusmarine/.copernicusmarine-credentials or environment variables
- CDS: ~/.cdsapirc file with API key
"""

import logging
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class WeatherData:
    """Container for weather grid data."""
    parameter: str
    time: datetime
    lats: np.ndarray
    lons: np.ndarray
    values: np.ndarray  # 2D array [lat, lon]
    unit: str

    # For vector data (wind, currents)
    u_component: Optional[np.ndarray] = None
    v_component: Optional[np.ndarray] = None


@dataclass
class PointWeather:
    """Weather at a specific point."""
    lat: float
    lon: float
    time: datetime
    wind_speed_ms: float
    wind_dir_deg: float
    wave_height_m: float
    wave_period_s: float
    wave_dir_deg: float
    current_speed_ms: float = 0.0
    current_dir_deg: float = 0.0


class CopernicusDataProvider:
    """
    Unified data provider for Copernicus services.

    Handles data fetching, caching, and interpolation for:
    - Wind (from CDS ERA5 or ECMWF)
    - Waves (from CMEMS global wave model)
    - Currents (from CMEMS global physics)
    """

    # CMEMS dataset IDs
    CMEMS_WAVE_DATASET = "cmems_mod_glo_wav_anfc_0.083deg_PT3H-i"
    CMEMS_PHYSICS_DATASET = "cmems_mod_glo_phy_anfc_0.083deg_PT1H-m"

    # CDS dataset for wind
    CDS_WIND_DATASET = "reanalysis-era5-single-levels"

    def __init__(
        self,
        cache_dir: str = "data/copernicus_cache",
        cmems_username: Optional[str] = None,
        cmems_password: Optional[str] = None,
    ):
        """
        Initialize Copernicus data provider.

        Args:
            cache_dir: Directory to cache downloaded data
            cmems_username: CMEMS username (or set CMEMS_USERNAME env var)
            cmems_password: CMEMS password (or set CMEMS_PASSWORD env var)
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # CMEMS credentials
        self.cmems_username = cmems_username or os.environ.get("CMEMS_USERNAME")
        self.cmems_password = cmems_password or os.environ.get("CMEMS_PASSWORD")

        # Cached xarray datasets
        self._wind_data: Optional[any] = None
        self._wave_data: Optional[any] = None
        self._current_data: Optional[any] = None

        # Check for required packages
        self._check_dependencies()

    def _check_dependencies(self):
        """Check if required packages are installed."""
        self._has_copernicusmarine = False
        self._has_cdsapi = False
        self._has_xarray = False

        try:
            import xarray
            self._has_xarray = True
        except ImportError:
            logger.warning("xarray not installed. Run: pip install xarray netcdf4")

        try:
            import copernicusmarine
            self._has_copernicusmarine = True
        except ImportError:
            logger.warning("copernicusmarine not installed. Run: pip install copernicusmarine")

        try:
            import cdsapi
            self._has_cdsapi = True
        except ImportError:
            logger.warning("cdsapi not installed. Run: pip install cdsapi")

    def fetch_wind_data(
        self,
        lat_min: float,
        lat_max: float,
        lon_min: float,
        lon_max: float,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> Optional[WeatherData]:
        """
        Fetch wind data from CDS ERA5.

        Args:
            lat_min, lat_max: Latitude bounds
            lon_min, lon_max: Longitude bounds
            start_time: Start of time range (default: now)
            end_time: End of time range (default: now + 5 days)

        Returns:
            WeatherData with u/v wind components
        """
        if not self._has_cdsapi or not self._has_xarray:
            logger.warning("CDS API not available, returning None")
            return None

        import cdsapi
        import xarray as xr

        if start_time is None:
            start_time = datetime.utcnow()
        if end_time is None:
            end_time = start_time + timedelta(days=5)

        # Generate cache filename
        cache_file = self._get_cache_path(
            "wind", lat_min, lat_max, lon_min, lon_max, start_time
        )

        # Check cache
        if cache_file.exists():
            logger.info(f"Loading wind data from cache: {cache_file}")
            ds = xr.open_dataset(cache_file)
        else:
            logger.info("Downloading wind data from CDS...")

            try:
                client = cdsapi.Client()

                # Request ERA5 10m wind components
                client.retrieve(
                    self.CDS_WIND_DATASET,
                    {
                        'product_type': 'reanalysis',
                        'variable': ['10m_u_component_of_wind', '10m_v_component_of_wind'],
                        'year': start_time.strftime('%Y'),
                        'month': start_time.strftime('%m'),
                        'day': [start_time.strftime('%d')],
                        'time': ['00:00', '06:00', '12:00', '18:00'],
                        'area': [lat_max, lon_min, lat_min, lon_max],
                        'format': 'netcdf',
                    },
                    str(cache_file)
                )

                ds = xr.open_dataset(cache_file)

            except Exception as e:
                logger.error(f"Failed to download wind data: {e}")
                return None

        # Extract data
        try:
            u10 = ds['u10'].values
            v10 = ds['v10'].values
            lats = ds['latitude'].values
            lons = ds['longitude'].values
            time = ds['time'].values[0] if 'time' in ds.dims else start_time

            # Take first time step if multiple
            if len(u10.shape) == 3:
                u10 = u10[0]
                v10 = v10[0]

            return WeatherData(
                parameter="wind",
                time=time if isinstance(time, datetime) else start_time,
                lats=lats,
                lons=lons,
                values=np.sqrt(u10**2 + v10**2),  # Wind speed
                unit="m/s",
                u_component=u10,
                v_component=v10,
            )

        except Exception as e:
            logger.error(f"Failed to parse wind data: {e}")
            return None

    def fetch_wave_data(
        self,
        lat_min: float,
        lat_max: float,
        lon_min: float,
        lon_max: float,
        start_time: Optional[datetime] = None,
    ) -> Optional[WeatherData]:
        """
        Fetch wave data from CMEMS.

        Args:
            lat_min, lat_max: Latitude bounds
            lon_min, lon_max: Longitude bounds
            start_time: Reference time (default: now)

        Returns:
            WeatherData with significant wave height
        """
        if not self._has_copernicusmarine or not self._has_xarray:
            logger.warning("CMEMS API not available, returning None")
            return None

        import copernicusmarine
        import xarray as xr

        if start_time is None:
            start_time = datetime.utcnow()

        # Generate cache filename
        cache_file = self._get_cache_path(
            "wave", lat_min, lat_max, lon_min, lon_max, start_time
        )

        # Check cache
        if cache_file.exists():
            logger.info(f"Loading wave data from cache: {cache_file}")
            ds = xr.open_dataset(cache_file)
        else:
            logger.info("Downloading wave data from CMEMS...")

            try:
                ds = copernicusmarine.open_dataset(
                    dataset_id=self.CMEMS_WAVE_DATASET,
                    variables=["VHM0", "VTPK", "VMDR"],  # Hs, Peak period, Mean direction
                    minimum_longitude=lon_min,
                    maximum_longitude=lon_max,
                    minimum_latitude=lat_min,
                    maximum_latitude=lat_max,
                    start_datetime=start_time.strftime("%Y-%m-%dT%H:%M:%S"),
                    end_datetime=(start_time + timedelta(hours=6)).strftime("%Y-%m-%dT%H:%M:%S"),
                )

                # Save to cache
                ds.to_netcdf(cache_file)

            except Exception as e:
                logger.error(f"Failed to download wave data: {e}")
                return None

        # Extract data
        try:
            # VHM0 = Significant wave height
            hs = ds['VHM0'].values
            lats = ds['latitude'].values
            lons = ds['longitude'].values

            # Take first time step
            if len(hs.shape) == 3:
                hs = hs[0]

            return WeatherData(
                parameter="wave_height",
                time=start_time,
                lats=lats,
                lons=lons,
                values=hs,
                unit="m",
            )

        except Exception as e:
            logger.error(f"Failed to parse wave data: {e}")
            return None

    def fetch_current_data(
        self,
        lat_min: float,
        lat_max: float,
        lon_min: float,
        lon_max: float,
        start_time: Optional[datetime] = None,
    ) -> Optional[WeatherData]:
        """
        Fetch ocean current data from CMEMS.

        Args:
            lat_min, lat_max: Latitude bounds
            lon_min, lon_max: Longitude bounds
            start_time: Reference time (default: now)

        Returns:
            WeatherData with u/v current components
        """
        if not self._has_copernicusmarine or not self._has_xarray:
            logger.warning("CMEMS API not available, returning None")
            return None

        import copernicusmarine
        import xarray as xr

        if start_time is None:
            start_time = datetime.utcnow()

        cache_file = self._get_cache_path(
            "current", lat_min, lat_max, lon_min, lon_max, start_time
        )

        if cache_file.exists():
            logger.info(f"Loading current data from cache: {cache_file}")
            ds = xr.open_dataset(cache_file)
        else:
            logger.info("Downloading current data from CMEMS...")

            try:
                ds = copernicusmarine.open_dataset(
                    dataset_id=self.CMEMS_PHYSICS_DATASET,
                    variables=["uo", "vo"],  # Eastward/Northward velocity
                    minimum_longitude=lon_min,
                    maximum_longitude=lon_max,
                    minimum_latitude=lat_min,
                    maximum_latitude=lat_max,
                    start_datetime=start_time.strftime("%Y-%m-%dT%H:%M:%S"),
                    end_datetime=(start_time + timedelta(hours=6)).strftime("%Y-%m-%dT%H:%M:%S"),
                    minimum_depth=0,
                    maximum_depth=10,  # Surface currents
                )

                ds.to_netcdf(cache_file)

            except Exception as e:
                logger.error(f"Failed to download current data: {e}")
                return None

        try:
            uo = ds['uo'].values
            vo = ds['vo'].values
            lats = ds['latitude'].values
            lons = ds['longitude'].values

            # Take first time/depth
            if len(uo.shape) == 4:
                uo = uo[0, 0]
                vo = vo[0, 0]
            elif len(uo.shape) == 3:
                uo = uo[0]
                vo = vo[0]

            return WeatherData(
                parameter="current",
                time=start_time,
                lats=lats,
                lons=lons,
                values=np.sqrt(uo**2 + vo**2),
                unit="m/s",
                u_component=uo,
                v_component=vo,
            )

        except Exception as e:
            logger.error(f"Failed to parse current data: {e}")
            return None

    def get_weather_at_point(
        self,
        lat: float,
        lon: float,
        time: datetime,
        wind_data: Optional[WeatherData] = None,
        wave_data: Optional[WeatherData] = None,
        current_data: Optional[WeatherData] = None,
    ) -> PointWeather:
        """
        Interpolate weather data at a specific point.

        Args:
            lat, lon: Position
            time: Time
            wind_data, wave_data, current_data: Pre-fetched data (optional)

        Returns:
            PointWeather with all parameters
        """
        result = PointWeather(
            lat=lat,
            lon=lon,
            time=time,
            wind_speed_ms=0.0,
            wind_dir_deg=0.0,
            wave_height_m=0.0,
            wave_period_s=0.0,
            wave_dir_deg=0.0,
            current_speed_ms=0.0,
            current_dir_deg=0.0,
        )

        # Interpolate wind
        if wind_data is not None and wind_data.u_component is not None:
            u, v = self._interpolate_vector(
                wind_data.lats, wind_data.lons,
                wind_data.u_component, wind_data.v_component,
                lat, lon
            )
            result.wind_speed_ms = float(np.sqrt(u**2 + v**2))
            result.wind_dir_deg = float((np.degrees(np.arctan2(-u, -v)) + 360) % 360)

        # Interpolate waves
        if wave_data is not None:
            result.wave_height_m = float(self._interpolate_scalar(
                wave_data.lats, wave_data.lons, wave_data.values, lat, lon
            ))

        # Interpolate currents
        if current_data is not None and current_data.u_component is not None:
            u, v = self._interpolate_vector(
                current_data.lats, current_data.lons,
                current_data.u_component, current_data.v_component,
                lat, lon
            )
            result.current_speed_ms = float(np.sqrt(u**2 + v**2))
            result.current_dir_deg = float((np.degrees(np.arctan2(u, v)) + 360) % 360)

        return result

    def _interpolate_scalar(
        self,
        lats: np.ndarray,
        lons: np.ndarray,
        values: np.ndarray,
        lat: float,
        lon: float,
    ) -> float:
        """Bilinear interpolation for scalar field."""
        from scipy.interpolate import RegularGridInterpolator

        try:
            # Handle NaN values
            values = np.nan_to_num(values, nan=0.0)

            interp = RegularGridInterpolator(
                (lats, lons), values,
                method='linear',
                bounds_error=False,
                fill_value=0.0
            )
            return float(interp([lat, lon])[0])
        except Exception:
            return 0.0

    def _interpolate_vector(
        self,
        lats: np.ndarray,
        lons: np.ndarray,
        u: np.ndarray,
        v: np.ndarray,
        lat: float,
        lon: float,
    ) -> Tuple[float, float]:
        """Bilinear interpolation for vector field."""
        u_val = self._interpolate_scalar(lats, lons, u, lat, lon)
        v_val = self._interpolate_scalar(lats, lons, v, lat, lon)
        return u_val, v_val

    def _get_cache_path(
        self,
        data_type: str,
        lat_min: float,
        lat_max: float,
        lon_min: float,
        lon_max: float,
        time: datetime,
    ) -> Path:
        """Generate cache file path."""
        time_str = time.strftime("%Y%m%d_%H")
        filename = f"{data_type}_{time_str}_lat{lat_min:.1f}_{lat_max:.1f}_lon{lon_min:.1f}_{lon_max:.1f}.nc"
        return self.cache_dir / filename

    def clear_cache(self, older_than_days: int = 7) -> int:
        """Remove old cached files."""
        cutoff = datetime.now() - timedelta(days=older_than_days)
        count = 0

        for f in self.cache_dir.glob("*.nc"):
            if f.stat().st_mtime < cutoff.timestamp():
                f.unlink()
                count += 1

        logger.info(f"Cleared {count} old cache files")
        return count


# Fallback: synthetic data generator for when APIs are not available
class SyntheticDataProvider:
    """
    Generates synthetic weather data for development/demo.

    Use this when Copernicus APIs are not configured.
    """

    def generate_wind_field(
        self,
        lat_min: float,
        lat_max: float,
        lon_min: float,
        lon_max: float,
        resolution: float = 1.0,
        time: Optional[datetime] = None,
    ) -> WeatherData:
        """Generate synthetic wind field."""
        if time is None:
            time = datetime.utcnow()

        lats = np.arange(lat_min, lat_max + resolution, resolution)
        lons = np.arange(lon_min, lon_max + resolution, resolution)

        lon_grid, lat_grid = np.meshgrid(lons, lats)

        # Base westerlies
        base_u = 5.0 + 3.0 * np.sin(np.radians(lat_grid * 2))
        base_v = 2.0 * np.cos(np.radians(lon_grid * 3 + lat_grid * 2))

        # Add weather system
        hour_factor = np.sin(time.hour * np.pi / 12) if time else 0.5
        center_lat = 45.0 + 5.0 * hour_factor
        center_lon = 0.0 + 10.0 * hour_factor

        dist = np.sqrt((lat_grid - center_lat)**2 + (lon_grid - center_lon)**2)
        system_strength = 8.0 * np.exp(-dist / 10.0)

        angle_to_center = np.arctan2(lat_grid - center_lat, lon_grid - center_lon)
        u_cyclonic = -system_strength * np.sin(angle_to_center + np.pi/2)
        v_cyclonic = system_strength * np.cos(angle_to_center + np.pi/2)

        u_wind = base_u + u_cyclonic + np.random.randn(*lat_grid.shape) * 0.5
        v_wind = base_v + v_cyclonic + np.random.randn(*lat_grid.shape) * 0.5

        return WeatherData(
            parameter="wind",
            time=time,
            lats=lats,
            lons=lons,
            values=np.sqrt(u_wind**2 + v_wind**2),
            unit="m/s",
            u_component=u_wind,
            v_component=v_wind,
        )

    def generate_wave_field(
        self,
        lat_min: float,
        lat_max: float,
        lon_min: float,
        lon_max: float,
        resolution: float = 1.0,
        wind_data: Optional[WeatherData] = None,
    ) -> WeatherData:
        """Generate synthetic wave field based on wind."""
        time = datetime.utcnow()

        lats = np.arange(lat_min, lat_max + resolution, resolution)
        lons = np.arange(lon_min, lon_max + resolution, resolution)

        lon_grid, lat_grid = np.meshgrid(lons, lats)

        if wind_data is not None and wind_data.values is not None:
            wind_speed = wind_data.values
            wave_height = 0.15 * wind_speed + np.random.randn(*wind_speed.shape) * 0.3
        else:
            wave_height = 1.5 + 1.0 * np.sin(np.radians(lat_grid * 3))
            wave_height += np.random.randn(*lat_grid.shape) * 0.2

        wave_height = np.maximum(wave_height, 0.3)

        return WeatherData(
            parameter="wave_height",
            time=time,
            lats=lats,
            lons=lons,
            values=wave_height,
            unit="m",
        )
