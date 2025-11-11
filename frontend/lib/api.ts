/**
 * API client for WINDMAR backend.
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Position {
  latitude: number;
  longitude: number;
}

export interface RouteRequest {
  start: Position;
  end: Position;
  departure_time?: string;
  is_laden?: boolean;
  target_speed_kts?: number;
  use_weather?: boolean;
  max_wind_speed_ms?: number;
  max_wave_height_m?: number;
}

export interface RouteResponse {
  waypoints: [number, number][];
  total_distance_nm: number;
  total_time_hours: number;
  total_fuel_mt: number;
  fuel_per_nm: number;
  departure_time: string;
  arrival_time: string;
  optimization_method: string;
}

export interface FuelCalculationRequest {
  speed_kts: number;
  is_laden: boolean;
  distance_nm?: number;
  wind_speed_ms?: number;
  wind_dir_deg?: number;
  sig_wave_height_m?: number;
  wave_dir_deg?: number;
  heading_deg?: number;
}

export interface FuelCalculationResponse {
  fuel_mt: number;
  power_kw: number;
  time_hours: number;
  fuel_breakdown: {
    calm_water: number;
    wind: number;
    waves: number;
  };
  resistance_breakdown_kn: {
    calm_water: number;
    wind: number;
    waves: number;
    total: number;
  };
}

export interface VesselSpecs {
  dwt: number;
  loa: number;
  beam: number;
  draft_laden: number;
  draft_ballast: number;
  mcr_kw: number;
  sfoc_at_mcr: number;
  service_speed_laden: number;
  service_speed_ballast: number;
}

export interface FuelScenario {
  name: string;
  fuel_mt: number;
  power_kw: number;
  conditions: string;
}

// API functions
export const apiClient = {
  // Health check
  async healthCheck() {
    const response = await api.get('/api/health');
    return response.data;
  },

  // Route optimization
  async optimizeRoute(request: RouteRequest): Promise<RouteResponse> {
    const response = await api.post<RouteResponse>('/api/routes/optimize', request);
    return response.data;
  },

  // Fuel calculation
  async calculateFuel(request: FuelCalculationRequest): Promise<FuelCalculationResponse> {
    const response = await api.post<FuelCalculationResponse>('/api/fuel/calculate', request);
    return response.data;
  },

  // Vessel specs
  async getVesselSpecs(): Promise<VesselSpecs> {
    const response = await api.get<VesselSpecs>('/api/vessel/specs');
    return response.data;
  },

  async updateVesselSpecs(specs: VesselSpecs): Promise<{ status: string; message: string }> {
    const response = await api.post('/api/vessel/specs', specs);
    return response.data;
  },

  // Fuel scenarios
  async getFuelScenarios(): Promise<{ scenarios: FuelScenario[] }> {
    const response = await api.get('/api/scenarios');
    return response.data;
  },
};

export default api;
