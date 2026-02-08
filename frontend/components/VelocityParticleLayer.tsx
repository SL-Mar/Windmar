'use client';

import { useEffect, useRef, useState } from 'react';
import { VelocityData } from '@/lib/api';

interface VelocityParticleLayerProps {
  data: VelocityData[] | null;
  type: 'wind' | 'currents';
}

const WIND_COLOR_SCALE = [
  'rgb(36,104,180)',
  'rgb(60,157,194)',
  'rgb(128,205,193)',
  'rgb(198,231,181)',
  'rgb(255,238,159)',
  'rgb(255,182,100)',
  'rgb(252,150,75)',
  'rgb(250,112,52)',
  'rgb(245,64,32)',
  'rgb(237,45,28)',
  'rgb(220,24,32)',
  'rgb(180,7,23)',
];

const CURRENT_COLOR_SCALE = [
  'rgb(36,104,180)',
  'rgb(24,176,200)',
  'rgb(60,200,180)',
  'rgb(100,210,160)',
  'rgb(180,230,120)',
  'rgb(240,210,80)',
  'rgb(250,180,60)',
  'rgb(250,130,30)',
];

export default function VelocityParticleLayer(props: VelocityParticleLayerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return <VelocityParticleLayerInner {...props} />;
}

function VelocityParticleLayerInner({ data, type }: VelocityParticleLayerProps) {
  const { useMap } = require('react-leaflet');
  const L = require('leaflet');
  const map = useMap();
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!data || data.length < 2) return;

    // Import leaflet-velocity (side-effect: adds L.velocityLayer)
    require('leaflet-velocity/dist/leaflet-velocity.css');
    require('leaflet-velocity');

    if (!L.velocityLayer) return;

    const isWind = type === 'wind';

    const layer = L.velocityLayer({
      displayValues: true,
      displayOptions: {
        velocityType: isWind ? 'Wind' : 'Ocean Current',
        position: 'bottomleft',
        emptyString: 'No data',
        angleConvention: 'bearingCW',
        speedUnit: 'm/s',
        directionString: 'Direction',
        speedString: 'Speed',
      },
      data: data,
      minVelocity: 0,
      maxVelocity: isWind ? 15 : 1.5,
      velocityScale: isWind ? 0.01 : 0.05,
      colorScale: isWind ? WIND_COLOR_SCALE : CURRENT_COLOR_SCALE,
      lineWidth: isWind ? 1.5 : 1.5,
      particleAge: isWind ? 90 : 60,
      particleMultiplier: isWind ? 1 / 100 : 1 / 150,
      frameRate: 20,
      opacity: 0.97,
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [data, type, map, L]);

  return null;
}
