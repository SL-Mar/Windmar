'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Card from '@/components/Card';
import FuelChart from '@/components/FuelChart';
import { Fuel, Wind, Waves, TrendingUp, TrendingDown } from 'lucide-react';
import { apiClient, FuelScenario } from '@/lib/api';
import { formatFuel, formatPower } from '@/lib/utils';

export default function FuelAnalysisPage() {
  const [scenarios, setScenarios] = useState<FuelScenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await apiClient.getFuelScenarios();
      setScenarios(data.scenarios);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = scenarios.map((s, idx) => ({
    name: s.name.replace(' (Laden)', '').replace(' (Ballast)', ''),
    calm_water: s.fuel_mt * 0.6,
    wind: s.fuel_mt * 0.25,
    waves: s.fuel_mt * 0.15,
  }));

  return (
    <div className="min-h-screen bg-gradient-maritime">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Hero Section */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-3">Fuel Analysis</h2>
          <p className="text-gray-300 text-lg">
            Compare fuel consumption across different operational scenarios
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Scenarios Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {scenarios.map((scenario, idx) => (
                <ScenarioCard key={idx} scenario={scenario} />
              ))}
            </div>

            {/* Comparison Chart */}
            <Card title="Fuel Consumption Comparison" className="h-96">
              <FuelChart data={chartData} />
            </Card>

            {/* Detailed Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Weather Impact Analysis" icon={<Wind className="w-5 h-5" />}>
                <div className="space-y-4">
                  <ImpactRow
                    label="Head Wind (20 kts)"
                    baseline={scenarios[0]?.fuel_mt || 0}
                    actual={scenarios[1]?.fuel_mt || 0}
                  />
                  <ImpactRow
                    label="Rough Seas (3m waves)"
                    baseline={scenarios[0]?.fuel_mt || 0}
                    actual={scenarios[2]?.fuel_mt || 0}
                  />
                  <ImpactRow
                    label="Ballast Condition"
                    baseline={scenarios[0]?.fuel_mt || 0}
                    actual={scenarios[3]?.fuel_mt || 0}
                  />
                </div>
              </Card>

              <Card title="Optimization Opportunities" icon={<TrendingDown className="w-5 h-5" />}>
                <div className="space-y-4">
                  <OpportunityItem
                    title="Weather Routing"
                    description="Avoid head winds and rough seas"
                    savings="15-25%"
                  />
                  <OpportunityItem
                    title="Speed Optimization"
                    description="Adjust speed based on conditions"
                    savings="8-12%"
                  />
                  <OpportunityItem
                    title="Route Planning"
                    description="Choose fuel-optimal waypoints"
                    savings="5-10%"
                  />
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: FuelScenario }) {
  const isLaden = scenario.name.includes('Laden');
  const hasWeather = !scenario.name.includes('Calm');

  return (
    <Card>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{scenario.name}</h3>
          <p className="text-xs text-gray-400">{scenario.conditions}</p>
        </div>
        <div className="flex space-x-1">
          {isLaden && (
            <span className="px-2 py-1 bg-ocean-500/20 text-ocean-300 text-xs rounded">
              Laden
            </span>
          )}
          {hasWeather && (
            <Wind className="w-4 h-4 text-primary-400" />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Daily Fuel</p>
          <p className="text-2xl font-bold text-white">{formatFuel(scenario.fuel_mt)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Power</p>
          <p className="text-lg font-semibold text-gray-300">{formatPower(scenario.power_kw)}</p>
        </div>
      </div>
    </Card>
  );
}

function ImpactRow({
  label,
  baseline,
  actual,
}: {
  label: string;
  baseline: number;
  actual: number;
}) {
  const impact = ((actual - baseline) / baseline) * 100;
  const isNegative = impact < 0;

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <span className="text-sm text-gray-300">{label}</span>
      <div className="flex items-center space-x-2">
        {isNegative ? (
          <TrendingDown className="w-4 h-4 text-green-400" />
        ) : (
          <TrendingUp className="w-4 h-4 text-red-400" />
        )}
        <span
          className={`text-sm font-semibold ${
            isNegative ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {isNegative ? '' : '+'}{impact.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function OpportunityItem({
  title,
  description,
  savings,
}: {
  title: string;
  description: string;
  savings: string;
}) {
  return (
    <div className="flex items-start space-x-4 p-4 bg-maritime-dark rounded-lg hover:bg-maritime-light transition-colors">
      <div className="flex-shrink-0 w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
        <TrendingDown className="w-6 h-6 text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <div className="flex-shrink-0">
        <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-semibold rounded-full">
          {savings}
        </span>
      </div>
    </div>
  );
}
