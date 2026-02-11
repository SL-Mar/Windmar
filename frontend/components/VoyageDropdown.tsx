'use client';

import { useState } from 'react';
import { Wind, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useVoyage } from '@/components/VoyageContext';

const STRATEGIES = [
  { key: 'fuel' as const, label: 'Fuel Optimal' },
  { key: 'pareto' as const, label: 'Pareto' },
  { key: 'safety' as const, label: 'Safety' },
];

export default function VoyageDropdown() {
  const { calmSpeed, setCalmSpeed, isLaden, setIsLaden, useWeather, setUseWeather, optimizationStrategy, setOptimizationStrategy } = useVoyage();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="absolute top-full right-0 mt-2 w-72 bg-maritime-dark/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl p-4 space-y-4 z-50">
      {/* Calm Speed */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">Calm Water Speed</label>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="8"
            max="18"
            step="0.5"
            value={calmSpeed}
            onChange={(e) => setCalmSpeed(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="w-16 text-right text-white font-semibold text-sm">
            {calmSpeed} kts
          </span>
        </div>
      </div>

      {/* Loading Condition */}
      <div>
        <label className="block text-sm text-gray-300 mb-2">Loading Condition</label>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsLaden(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              isLaden
                ? 'bg-primary-500 text-white'
                : 'bg-maritime-medium text-gray-400 hover:text-white'
            }`}
          >
            Laden
          </button>
          <button
            onClick={() => setIsLaden(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isLaden
                ? 'bg-primary-500 text-white'
                : 'bg-maritime-medium text-gray-400 hover:text-white'
            }`}
          >
            Ballast
          </button>
        </div>
      </div>

      {/* Weather Toggle */}
      <div className="flex items-center justify-between p-3 bg-maritime-medium rounded-lg">
        <div className="flex items-center space-x-2">
          <Wind className="w-4 h-4 text-primary-400" />
          <span className="text-sm text-white">Use Weather</span>
        </div>
        <button
          onClick={() => setUseWeather(!useWeather)}
          className={`relative w-10 h-6 rounded-full transition-colors ${
            useWeather ? 'bg-primary-500' : 'bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
              useWeather ? 'left-5' : 'left-1'
            }`}
          />
        </button>
      </div>

      {/* Optimization Strategy */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm text-gray-300">Optimization Strategy</label>
          <button
            onClick={() => setHelpOpen(!helpOpen)}
            className="p-0.5 text-gray-500 hover:text-primary-400 transition-colors"
            title="Algorithm help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="flex space-x-1">
          {STRATEGIES.map((s) => (
            <button
              key={s.key}
              onClick={() => setOptimizationStrategy(s.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                optimizationStrategy === s.key
                  ? 'bg-primary-500 text-white'
                  : 'bg-maritime-medium text-gray-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Help expandable section */}
      {helpOpen && (
        <div className="p-3 bg-maritime-medium/80 rounded-lg text-xs text-gray-300 space-y-3 max-h-64 overflow-y-auto">
          <div>
            <div className="font-semibold text-white mb-1">Route Optimization Engines</div>
            <p className="mb-2 text-gray-400">
              Both engines are custom implementations built for Windmar. They share the same vessel model, weather data, and seakeeping safety assessment.
            </p>
            <div className="mb-2">
              <span className="font-medium text-green-400">A* Search</span> &mdash; Grid-based pathfinding using the A* algorithm with a weather-aware cost function. Operates on a 0.5&deg; spatial grid. Best for shorter routes where fine-grained coastal navigation matters.
            </div>
            <div>
              <span className="font-medium text-orange-400">VISIR-style Dijkstra</span> &mdash; Time-expanded graph search inspired by the VISIR algorithm (Mannarini et al., 2016). Operates on a coarser 1&deg; grid with discrete time steps, accounting for weather evolution over the voyage. Best for longer ocean crossings.
            </div>
          </div>
          <div className="border-t border-white/10 pt-2">
            <div className="font-semibold text-white mb-1">Optimization Strategies</div>
            <ul className="space-y-1.5">
              <li>
                <span className="font-medium text-primary-400">Fuel Optimal</span> &mdash; Pure fuel minimization. Safety as hard constraint only. Produces the most fuel-efficient route.
              </li>
              <li>
                <span className="font-medium text-primary-400">Pareto</span> &mdash; Runs each engine at 3 safety levels (0%, 50%, 100%) and shows the trade-off. Helps decide how much extra fuel the safety margin is worth.
              </li>
              <li>
                <span className="font-medium text-primary-400">Safety Priority</span> &mdash; Full weather avoidance. Routes actively detour around dangerous conditions. May use more fuel in exchange for calmer seas.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
