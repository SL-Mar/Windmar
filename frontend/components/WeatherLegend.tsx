'use client';

interface WeatherLegendProps {
  mode: 'wind' | 'waves' | 'currents';
  timelineVisible?: boolean;
}

const WIND_STOPS = [
  { value: 0, color: 'rgb(30,80,220)' },
  { value: 5, color: 'rgb(0,200,220)' },
  { value: 10, color: 'rgb(0,200,50)' },
  { value: 15, color: 'rgb(240,220,0)' },
  { value: 20, color: 'rgb(240,130,0)' },
  { value: 25, color: 'rgb(220,30,30)' },
];

const WAVE_STOPS = [
  { value: 0, color: 'rgb(0,200,50)' },
  { value: 1, color: 'rgb(240,220,0)' },
  { value: 2, color: 'rgb(240,130,0)' },
  { value: 3, color: 'rgb(220,30,30)' },
  { value: 5, color: 'rgb(128,0,0)' },
];

const CURRENT_STOPS = [
  { value: 0, color: 'rgb(36,104,180)' },
  { value: 0.3, color: 'rgb(24,176,200)' },
  { value: 0.6, color: 'rgb(100,200,160)' },
  { value: 1.0, color: 'rgb(210,220,100)' },
  { value: 1.5, color: 'rgb(250,180,60)' },
  { value: 2.0, color: 'rgb(250,140,40)' },
];

function buildGradient(stops: { value: number; color: string }[]): string {
  const max = stops[stops.length - 1].value;
  const parts = stops.map(
    (s) => `${s.color} ${(s.value / max) * 100}%`
  );
  return `linear-gradient(to right, ${parts.join(', ')})`;
}

export default function WeatherLegend({ mode, timelineVisible = false }: WeatherLegendProps) {
  const stops = mode === 'wind' ? WIND_STOPS : mode === 'currents' ? CURRENT_STOPS : WAVE_STOPS;
  const unit = mode === 'waves' ? 'm' : 'm/s';
  const label = mode === 'wind' ? 'Wind Speed' : mode === 'currents' ? 'Current Speed' : 'Wave Height';
  const gradient = buildGradient(stops);

  return (
    <div className={`absolute right-4 bg-maritime-dark/90 backdrop-blur-sm rounded-lg p-3 z-[1000] min-w-[180px] transition-all ${timelineVisible ? 'bottom-20' : 'bottom-4'}`}>
      <div className="text-xs text-gray-400 mb-2 font-medium">
        {label} ({unit})
      </div>
      <div
        className="h-3 rounded-sm"
        style={{ background: gradient }}
      />
      <div className="flex justify-between mt-1">
        {stops.map((s) => (
          <span key={s.value} className="text-[10px] text-gray-300">
            {s.value}
          </span>
        ))}
      </div>
    </div>
  );
}
