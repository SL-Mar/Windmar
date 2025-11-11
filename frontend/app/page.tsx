'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Card, { StatCard } from '@/components/Card';
import FuelChart from '@/components/FuelChart';
import {
  Navigation,
  TrendingDown,
  Clock,
  Fuel,
  Wind,
  Waves,
  Ship,
  Play,
  Loader2,
} from 'lucide-react';
import { apiClient, RouteResponse } from '@/lib/api';
import {
  formatDistance,
  formatFuel,
  formatDuration,
  formatSpeed,
  formatDate,
} from '@/lib/utils';

// Dynamic import for map (client-side only)
const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-maritime-dark rounded-lg">
      <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
    </div>
  ),
});

// Predefined routes
const ROUTES = {
  ara_med: {
    name: 'ARA - MED (Rotterdam → Augusta)',
    start: { latitude: 51.9225, longitude: 4.4792 },
    end: { latitude: 37.2333, longitude: 15.2167 },
  },
  transatlantic: {
    name: 'Transatlantic (New York → Gibraltar)',
    start: { latitude: 40.7128, longitude: -74.0060 },
    end: { latitude: 36.1408, longitude: -5.3536 },
  },
  mediterranean: {
    name: 'Mediterranean (Malta → Alexandria)',
    start: { latitude: 35.8989, longitude: 14.5146 },
    end: { latitude: 31.2001, longitude: 29.9187 },
  },
};

export default function HomePage() {
  const [selectedRoute, setSelectedRoute] = useState<keyof typeof ROUTES>('ara_med');
  const [isLaden, setIsLaden] = useState(true);
  const [useWeather, setUseWeather] = useState(true);
  const [loading, setLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const route = ROUTES[selectedRoute];
      const result = await apiClient.optimizeRoute({
        start: route.start,
        end: route.end,
        is_laden: isLaden,
        use_weather: useWeather,
        departure_time: new Date().toISOString(),
      });
      setRouteResult(result);
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Route optimization failed. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = routeResult
    ? [
        {
          name: 'Route Fuel',
          calm_water: routeResult.total_fuel_mt * 0.6,
          wind: routeResult.total_fuel_mt * 0.25,
          waves: routeResult.total_fuel_mt * 0.15,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-maritime">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Hero Section */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-3">
            Route Optimization
          </h2>
          <p className="text-gray-300 text-lg">
            Fuel-optimal maritime routing powered by real-time weather data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <Card title="Route Selection" icon={<Navigation className="w-5 h-5" />}>
              <div className="space-y-4">
                {/* Route Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Route
                  </label>
                  <select
                    value={selectedRoute}
                    onChange={(e) => setSelectedRoute(e.target.value as keyof typeof ROUTES)}
                    className="w-full bg-maritime-dark border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-400 transition-colors"
                  >
                    {Object.entries(ROUTES).map(([key, route]) => (
                      <option key={key} value={key}>
                        {route.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Loading Condition */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Loading Condition
                  </label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsLaden(true)}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                        isLaden
                          ? 'bg-primary-500 text-white shadow-maritime'
                          : 'bg-maritime-dark text-gray-400 hover:bg-maritime-light'
                      }`}
                    >
                      Laden
                    </button>
                    <button
                      onClick={() => setIsLaden(false)}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                        !isLaden
                          ? 'bg-primary-500 text-white shadow-maritime'
                          : 'bg-maritime-dark text-gray-400 hover:bg-maritime-light'
                      }`}
                    >
                      Ballast
                    </button>
                  </div>
                </div>

                {/* Weather Toggle */}
                <div className="flex items-center justify-between p-4 bg-maritime-dark rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Wind className="w-5 h-5 text-primary-400" />
                    <span className="text-sm font-medium text-white">
                      Use Weather Data
                    </span>
                  </div>
                  <button
                    onClick={() => setUseWeather(!useWeather)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useWeather ? 'bg-primary-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useWeather ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Optimize Button */}
                <button
                  onClick={handleOptimize}
                  disabled={loading}
                  className="w-full bg-gradient-ocean hover:opacity-90 text-white font-semibold py-4 px-6 rounded-lg shadow-ocean transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Optimizing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span>Optimize Route</span>
                    </>
                  )}
                </button>
              </div>
            </Card>

            {/* Results Summary */}
            {routeResult && (
              <Card title="Results Summary" icon={<TrendingDown className="w-5 h-5" />}>
                <div className="space-y-4">
                  <ResultRow
                    icon={<Navigation className="w-4 h-4" />}
                    label="Distance"
                    value={formatDistance(routeResult.total_distance_nm)}
                  />
                  <ResultRow
                    icon={<Clock className="w-4 h-4" />}
                    label="Duration"
                    value={formatDuration(routeResult.total_time_hours)}
                  />
                  <ResultRow
                    icon={<Fuel className="w-4 h-4" />}
                    label="Total Fuel"
                    value={formatFuel(routeResult.total_fuel_mt)}
                  />
                  <ResultRow
                    icon={<TrendingDown className="w-4 h-4" />}
                    label="Fuel/nm"
                    value={formatFuel(routeResult.fuel_per_nm)}
                  />
                  <ResultRow
                    icon={<Ship className="w-4 h-4" />}
                    label="Avg Speed"
                    value={formatSpeed(
                      routeResult.total_distance_nm / routeResult.total_time_hours
                    )}
                  />
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-400 mb-1">Method</p>
                  <p className="text-sm font-medium text-white">
                    {routeResult.optimization_method}
                  </p>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-1">ETA</p>
                  <p className="text-sm font-medium text-white">
                    {formatDate(routeResult.arrival_time)}
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* Center - Map */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="h-[600px]">
              {routeResult ? (
                <RouteMap
                  waypoints={routeResult.waypoints}
                  startLabel={ROUTES[selectedRoute].name.split('→')[0].trim()}
                  endLabel={ROUTES[selectedRoute].name.split('→')[1].trim()}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <div className="mb-6">
                    <Ship className="w-24 h-24 text-primary-400/30 mx-auto mb-4" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Ready to Optimize
                  </h3>
                  <p className="text-gray-400 max-w-md">
                    Select a route and conditions, then click "Optimize Route" to calculate
                    the fuel-optimal path considering weather and vessel performance.
                  </p>
                </div>
              )}
            </Card>

            {/* Stats Cards */}
            {routeResult && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Distance"
                  value={formatDistance(routeResult.total_distance_nm)}
                  icon={<Navigation className="w-5 h-5" />}
                />
                <StatCard
                  label="Time"
                  value={formatDuration(routeResult.total_time_hours)}
                  icon={<Clock className="w-5 h-5" />}
                />
                <StatCard
                  label="Fuel"
                  value={formatFuel(routeResult.total_fuel_mt)}
                  icon={<Fuel className="w-5 h-5" />}
                  trend="down"
                />
                <StatCard
                  label="Efficiency"
                  value={formatFuel(routeResult.fuel_per_nm)}
                  icon={<TrendingDown className="w-5 h-5" />}
                />
              </div>
            )}

            {/* Fuel Breakdown Chart */}
            {routeResult && (
              <Card title="Fuel Consumption Breakdown" className="h-80">
                <FuelChart data={chartData} />
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ResultRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2 text-gray-400">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}
