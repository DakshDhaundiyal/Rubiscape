import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import type { StatSummary } from '../../types';

interface AnomalyRadarProps {
  data: any[];
  stats: Record<string, StatSummary>;
  cols: string[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { feature, zScore, critical } = payload[0].payload;
    return (
      <div
        className="p-2.5 text-[10px] font-mono shadow-2xl rounded-sm"
        style={{
          background: 'var(--bio-card2)',
          border: '1px solid rgba(180,79,255,0.3)',
        }}
      >
        <p className="font-bold mb-1" style={{ color: 'var(--bio-green)' }}>{feature}</p>
        <p style={{ color: critical ? '#e05252' : 'var(--text-primary)' }}>
          Max Z-Score: <span className="font-bold">{zScore.toFixed(2)}</span>
        </p>
        {critical && (
          <p className="text-[9px] mt-0.5 uppercase tracking-wider"
            style={{ color: '#e05252' }}>Critical Mutation</p>
        )}
      </div>
    );
  }
  return null;
};

export const AnomalyRadar: React.FC<AnomalyRadarProps> = ({ data, stats, cols }) => {
  if (!data || data.length === 0 || !cols || cols.length < 3) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[10px] font-mono italic"
        style={{ color: 'var(--text-muted)' }}>
        Need ≥ 3 numeric strands for radar
      </div>
    );
  }

  const radarData = cols.slice(0, 10).map((col) => {
    const s = stats[col];
    if (!s || s.stdDev === 0) return { feature: col, zScore: 0, critical: false };

    const maxZ = data.reduce((acc, row) => {
      const val = row[col];
      if (typeof val !== 'number' || isNaN(val)) return acc;
      const z = Math.abs((val - s.mean) / s.stdDev);
      return Math.max(acc, z);
    }, 0);

    return { feature: col, zScore: maxZ, critical: maxZ > 2.5 };
  });

  const tickFormatter = (v: string) =>
    v.length > 10 ? v.slice(0, 9) + '…' : v;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart data={radarData} margin={{ top: 16, right: 32, bottom: 16, left: 32 }}>
        <PolarGrid
          stroke="rgba(57,255,106,0.15)"
          strokeWidth={1}
        />
        <PolarAngleAxis
          dataKey="feature"
          tickFormatter={tickFormatter}
          tick={{
            fill: 'rgba(57,255,106,0.6)',
            fontSize: 9,
            fontFamily: 'DM Mono',
          }}
        />
        <Radar
          name="Z-Score"
          dataKey="zScore"
          stroke="#b44fff"
          fill="#b44fff"
          fillOpacity={0.18}
          strokeWidth={1.5}
          dot={{ fill: '#b44fff', r: 4 }}
          isAnimationActive={true}
          animationDuration={800}
          animationEasing="ease-out"
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
};
