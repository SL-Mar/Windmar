'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, X, Clock, Loader2 } from 'lucide-react';
import { apiClient, VelocityData, ForecastFrames } from '@/lib/api';

interface ForecastTimelineProps {
  visible: boolean;
  onClose: () => void;
  onForecastHourChange: (hour: number, data: VelocityData[] | null) => void;
}

const FORECAST_HOURS = Array.from({ length: 41 }, (_, i) => i * 3); // 0,3,6,...,120
const SPEED_OPTIONS = [1, 2, 4];

// Interval ms per speed: 1x=2000ms, 2x=1000ms, 4x=500ms
const SPEED_INTERVAL: Record<number, number> = { 1: 2000, 2: 1000, 4: 500 };

export default function ForecastTimeline({
  visible,
  onClose,
  onForecastHourChange,
}: ForecastTimelineProps) {
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ cached: 0, total: 41 });
  const [frames, setFrames] = useState<Record<string, VelocityData[]>>({});
  const [runTime, setRunTime] = useState<string | null>(null);
  const [prefetchComplete, setPrefetchComplete] = useState(false);

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const framesRef = useRef<Record<string, VelocityData[]>>({});

  // Keep framesRef in sync
  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  // Start prefetch when timeline becomes visible
  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    const startPrefetch = async () => {
      setIsLoading(true);
      setPrefetchComplete(false);

      try {
        // Trigger prefetch
        await apiClient.triggerForecastPrefetch();

        // Poll status every 3 seconds
        const poll = async () => {
          if (cancelled) return;
          try {
            const status = await apiClient.getForecastStatus();
            setLoadProgress({ cached: status.cached_hours, total: status.total_hours });
            setRunTime(`${status.run_date} ${status.run_hour}Z`);

            if (status.complete || status.cached_hours === status.total_hours) {
              // All cached — load frames
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              await loadAllFrames();
            }
          } catch (e) {
            console.error('Forecast status poll failed:', e);
          }
        };

        // Initial poll
        await poll();

        // Continue polling
        pollIntervalRef.current = setInterval(poll, 3000);
      } catch (e) {
        console.error('Forecast prefetch trigger failed:', e);
        setIsLoading(false);
      }
    };

    startPrefetch();

    return () => {
      cancelled = true;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [visible]);

  // Load all frames bulk
  const loadAllFrames = useCallback(async () => {
    try {
      const data: ForecastFrames = await apiClient.getForecastFrames();
      setFrames(data.frames);
      setRunTime(`${data.run_date} ${data.run_hour}Z`);
      setPrefetchComplete(true);
      setIsLoading(false);

      // Set initial frame
      if (data.frames['0']) {
        onForecastHourChange(0, data.frames['0']);
      }
    } catch (e) {
      console.error('Failed to load forecast frames:', e);
      setIsLoading(false);
    }
  }, [onForecastHourChange]);

  // Handle play/pause
  useEffect(() => {
    if (isPlaying && prefetchComplete) {
      playIntervalRef.current = setInterval(() => {
        setCurrentHour((prev) => {
          const idx = FORECAST_HOURS.indexOf(prev);
          const nextIdx = (idx + 1) % FORECAST_HOURS.length;
          const nextHour = FORECAST_HOURS[nextIdx];
          const frameData = framesRef.current[String(nextHour)] || null;
          onForecastHourChange(nextHour, frameData);
          return nextHour;
        });
      }, SPEED_INTERVAL[speed]);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
    };
  }, [isPlaying, speed, prefetchComplete, onForecastHourChange]);

  // Handle slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hour = parseInt(e.target.value);
    setCurrentHour(hour);
    const frameData = frames[String(hour)] || null;
    onForecastHourChange(hour, frameData);
  };

  // Handle close
  const handleClose = () => {
    setIsPlaying(false);
    setCurrentHour(0);
    onForecastHourChange(0, null); // Reset to live data
    onClose();
  };

  // Format valid time from forecast hour
  const formatValidTime = (fh: number): string => {
    if (!runTime) return `T+${fh}h`;
    try {
      const parts = runTime.split(' ');
      const dateStr = parts[0]; // YYYYMMDD
      const hourStr = parts[1]?.replace('Z', '') || '0'; // HH
      const base = new Date(
        parseInt(dateStr.slice(0, 4)),
        parseInt(dateStr.slice(4, 6)) - 1,
        parseInt(dateStr.slice(6, 8)),
        parseInt(hourStr)
      );
      base.setHours(base.getHours() + fh);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return `${days[base.getDay()]} ${String(base.getUTCHours()).padStart(2, '0')}:00 UTC`;
    } catch {
      return `T+${fh}h`;
    }
  };

  if (!visible) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1001] bg-maritime-dark/95 backdrop-blur-sm border-t border-white/10">
      {/* Loading progress bar */}
      {isLoading && (
        <div className="h-1 bg-gray-700">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${(loadProgress.cached / loadProgress.total) * 100}%` }}
          />
        </div>
      )}

      <div className="px-4 py-3 flex items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={!prefetchComplete}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-primary-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-400 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        {/* Current time display */}
        <div className="flex-shrink-0 min-w-[170px]">
          <div className="flex items-center gap-1.5 text-white text-sm font-medium">
            <Clock className="w-3.5 h-3.5 text-primary-400" />
            <span>T+{currentHour}h</span>
            <span className="text-gray-400 text-xs">|</span>
            <span className="text-gray-300 text-xs">{formatValidTime(currentHour)}</span>
          </div>
          {isLoading && (
            <div className="text-xs text-gray-500 mt-0.5">
              Loading {loadProgress.cached}/{loadProgress.total} frames...
            </div>
          )}
        </div>

        {/* Range slider */}
        <div className="flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={120}
            step={3}
            value={currentHour}
            onChange={handleSliderChange}
            disabled={!prefetchComplete}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-400
              [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary-400 [&::-moz-range-thumb]:border-0"
          />
          {/* Day markers */}
          <div className="flex justify-between mt-1 text-[10px] text-gray-500">
            <span>0h</span>
            <span>24h</span>
            <span>48h</span>
            <span>72h</span>
            <span>96h</span>
            <span>120h</span>
          </div>
        </div>

        {/* Speed selector */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {SPEED_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                speed === s
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Close */}
        <button
          onClick={handleClose}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
