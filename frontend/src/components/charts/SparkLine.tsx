import React from 'react';
import { AreaChart, Area, LineChart, Line, ResponsiveContainer } from 'recharts';

interface SparkLineProps {
  // Legacy histogram sparkline mode
  data?: Array<{ range: string; count: number }>;
  // New raw-values mode (last 30 trend)
  rawValues?: number[];
  color?: string;
}

export const SparkLine: React.FC<SparkLineProps> = ({
  data,
  rawValues,
  color = '#39ff6a',
}) => {
  // Raw values mode — plain line, no fill, no axes
  if (rawValues && rawValues.length > 0) {
    const chartData = rawValues.map((v, i) => ({ i, v }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1}
            dot={false}
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Legacy histogram sparkline mode
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-grad-${color.replace('#', '')})`}
          dot={false}
          isAnimationActive={true}
          animationDuration={800}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
