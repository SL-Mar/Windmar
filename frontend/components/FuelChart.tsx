'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FuelChartProps {
  data: Array<{
    name: string;
    calm_water: number;
    wind: number;
    waves: number;
  }>;
}

export default function FuelChart({ data }: FuelChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis
          dataKey="name"
          stroke="#9ca3af"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#9ca3af"
          style={{ fontSize: '12px' }}
          label={{ value: 'Fuel (MT)', angle: -90, position: 'insideLeft', style: { fill: '#9ca3af' } }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(26, 41, 66, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#fff' }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="circle"
        />
        <Bar dataKey="calm_water" name="Calm Water" fill="#0073e6" stackId="a" />
        <Bar dataKey="wind" name="Wind" fill="#008ba2" stackId="a" />
        <Bar dataKey="waves" name="Waves" fill="#4da5ff" stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
