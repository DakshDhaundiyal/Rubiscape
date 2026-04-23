import React from 'react';
import { ComposedChart, Bar, XAxis, YAxis, ResponsiveContainer, Scatter } from 'recharts';
import type { StatSummary } from '../../types';

interface BoxPlotProps {
  stats: StatSummary;
  color?: string;
}

export const BoxPlot: React.FC<BoxPlotProps> = ({ stats, color = "#f0a500" }) => {
  if (!stats) return null;

  const data = [
    {
      name: 'Distribution',
      min: stats.min,
      q1: stats.mean - stats.stdDev,
      median: stats.median,
      q3: stats.mean + stats.stdDev,
      max: stats.max,
      mean: stats.mean,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        layout="vertical"
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <XAxis type="number" hide domain={[stats.min * 0.9, stats.max * 1.1]} />
        <YAxis type="category" dataKey="name" hide />
        
        <Bar 
          dataKey="q3" 
          fill={color} 
          fillOpacity={0.6} 
          stackId="a" 
          barSize={40} 
        />
        
        <Scatter dataKey="median" fill="#fff" shape="diamond" />
        <Scatter dataKey="mean" fill="#000" shape="circle" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
