import React from 'react';
import { BarChart, Bar, Tooltip, ResponsiveContainer } from 'recharts';

interface HistogramProps {
  data: Array<{ range: string; count: number }>;
  color?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-3 border border-gold/40 p-2 text-[10px] font-mono shadow-2xl">
        <p className="text-gold mb-1">Range: {payload[0].payload.range}</p>
        <p className="text-text-primary">Count: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export const Histogram: React.FC<HistogramProps> = ({ data, color = "#f0a500" }) => {
  if (!data || data.length === 0) return (
    <div className="h-full w-full flex items-center justify-center text-[10px] text-text-muted italic">
      No distribution data
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
        />
        <Bar
          dataKey="count"
          fill={color}
          fillOpacity={0.6}
          radius={[4, 4, 0, 0]}
          minPointSize={10}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
