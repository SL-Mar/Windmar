-- Weather Database Architecture (v0.0.5)
-- Pre-fetched weather grids stored in PostgreSQL for fast route optimization.

-- Track forecast ingestion runs
CREATE TABLE IF NOT EXISTS weather_forecast_runs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(20) NOT NULL,          -- 'gfs', 'cmems_wave', 'cmems_current'
    run_time TIMESTAMP WITH TIME ZONE NOT NULL,  -- forecast model run time
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'ingesting',  -- ingesting, complete, failed, superseded
    grid_resolution FLOAT NOT NULL,        -- degrees
    lat_min FLOAT NOT NULL,
    lat_max FLOAT NOT NULL,
    lon_min FLOAT NOT NULL,
    lon_max FLOAT NOT NULL,
    forecast_hours INTEGER[],             -- array of available hours [0,3,6,...,120]
    metadata JSONB,
    UNIQUE(source, run_time)
);

-- Compressed weather grid blobs per forecast hour
CREATE TABLE IF NOT EXISTS weather_grid_data (
    id SERIAL PRIMARY KEY,
    run_id INTEGER NOT NULL REFERENCES weather_forecast_runs(id) ON DELETE CASCADE,
    forecast_hour INTEGER NOT NULL,        -- 0, 3, 6, ... 120
    parameter VARCHAR(30) NOT NULL,        -- 'wind_u', 'wind_v', 'wave_hs', 'wave_tp', 'wave_dir', 'current_u', 'current_v'
    lats BYTEA NOT NULL,                   -- zlib-compressed float32 array
    lons BYTEA NOT NULL,                   -- zlib-compressed float32 array
    data BYTEA NOT NULL,                   -- zlib-compressed float32 2D array [lat x lon]
    shape_rows INTEGER NOT NULL,
    shape_cols INTEGER NOT NULL,
    UNIQUE(run_id, forecast_hour, parameter)
);

CREATE INDEX IF NOT EXISTS idx_grid_data_run_hour ON weather_grid_data(run_id, forecast_hour);
CREATE INDEX IF NOT EXISTS idx_forecast_runs_source_status ON weather_forecast_runs(source, status);
CREATE INDEX IF NOT EXISTS idx_forecast_runs_time ON weather_forecast_runs(run_time DESC);
