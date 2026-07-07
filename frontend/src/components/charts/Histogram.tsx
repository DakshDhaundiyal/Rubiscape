import React from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Cell, Tooltip,
} from 'recharts';
import type { StatSummary } from '../../types';

// ─── Shared formatting helpers ───────────────────────────────────────────────

const CURRENCY_KEYWORDS = /price|revenue|cost|salary|income|amount|value|sales|spend|budget|profit|wage|fee|rate|charge/i;

export function isCurrencyCol(colName: string): boolean {
  return CURRENCY_KEYWORDS.test(colName);
}

export function formatVal(v: number, colName?: string): string {
  if (colName && isCurrencyCol(colName)) {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toFixed(0)}`;
  }
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? '-' : ''}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${v < 0 ? '-' : ''}${(abs / 1_000).toFixed(1)}K`;
  return v.toFixed(2);
}

// Parse bucket label like "20.0–30.0" or "20.0-30.0" → midpoint
function parseBucketMidpoint(label: string): number | null {
  const parts = label.split(/[–—-]/).map((s) => parseFloat(s.trim()));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return (parts[0] + parts[1]) / 2;
  }
  const single = parseFloat(label);
  return isNaN(single) ? null : single;
}

type Zone = 'core' | 'fringe' | 'anomaly';

function getZone(mid: number, mean: number, sd: number): Zone {
  const dist = Math.abs(mid - mean);
  if (dist <= sd)     return 'core';
  if (dist <= 2 * sd) return 'fringe';
  return 'anomaly';
}

const ZONE_COLOR: Record<Zone, string> = {
  core:    'rgba(57,255,106,0.70)',
  fringe:  'rgba(57,255,106,0.30)',
  anomaly: '#e05252',
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { range, count } = payload[0].payload;
    return (
      <div
        className="p-2.5 text-[10px] font-mono shadow-2xl rounded"
        style={{
          background: 'var(--bio-card2)',
          border: '1px solid rgba(57,255,106,0.25)',
          zIndex: 50,
        }}
      >
        <p className="mb-1" style={{ color: 'var(--bio-green)' }}>Value Range: {range}</p>
        <p style={{ color: 'var(--text-primary)' }}>
          Number of Entries: <span className="font-bold">{count}</span>
        </p>
      </div>
    );
  }
  return null;
};

// ─── Overlay label ────────────────────────────────────────────────────────────

const RefLabel = ({ viewBox, label, color }: any) => {
  if (!viewBox) return null;
  return (
    <text
      x={viewBox.x + 3}
      y={(viewBox.y ?? 0) + 12}
      fontSize={8}
      fill={color}
      fontFamily="DM Mono"
      style={{ pointerEvents: 'none' }}
    >
      {label}
    </text>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

interface HistogramProps {
  stats?: StatSummary;
  colName?: string;
  // Legacy compat props kept for gallery sparklines
  data?: Array<{ range: string; count: number }>;
  color?: string;
  showAxes?: boolean;
}

export const Histogram: React.FC<HistogramProps> = ({
  stats,
  colName = '',
  data: legacyData,
  color = '#39ff6a',
  showAxes = false,
}) => {
  // Support legacy call signature from gallery mini-histograms
  const rawData = stats?.buckets
    ? stats.buckets.map((b) => ({ range: b.label, count: b.count }))
    : legacyData ?? [];

  if (!rawData || rawData.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[10px] font-mono italic"
        style={{ color: 'var(--text-muted)' }}>
        No distribution data
      </div>
    );
  }

  // If no stats provided, fall back to plain colour histogram (gallery mode)
  if (!stats) {
    const maxCount = Math.max(...rawData.map((d) => d.count));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rawData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }} barCategoryGap="4%">
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {rawData.map((_, i) => (
              <Cell key={i} fill={color} fillOpacity={0.25 + (rawData[i].count / maxCount) * 0.6} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  const { mean, median, stdDev, min, max } = stats;
  const range = max - min;

  // Compute skew warning
  const skewDetected = range > 0 && Math.abs(mean - median) / range > 0.10;

  // Format X-axis tick labels
  const xTicks: string[] = [];
  if (showAxes && rawData.length > 0) {
    // Pick ~5 evenly spaced bucket labels
    const step = Math.max(1, Math.floor(rawData.length / 5));
    for (let i = 0; i < rawData.length; i += step) {
      xTicks.push(rawData[i].range);
    }
    if (!xTicks.includes(rawData[rawData.length - 1].range)) {
      xTicks.push(rawData[rawData.length - 1].range);
    }
  }

  // Compute bar colors
  const coloredData = rawData.map((d) => {
    const mid = parseBucketMidpoint(d.range);
    const zone: Zone = mid !== null && stdDev > 0 ? getZone(mid, mean, stdDev) : 'core';
    return { ...d, zone, barColor: ZONE_COLOR[zone] };
  });

  const maxCount = Math.max(...rawData.map((d) => d.count));
  const yDomain = [0, Math.ceil(maxCount * 1.2)];

  // Reference line positions — we use the bucket index space (Recharts uses category axis)
  // For overlay lines we need to map mean/median/sigma to x-positions
  // We'll use ReferenceLine with x= set to the closest bucket label
  function closestBucketLabel(val: number): string | undefined {
    let best: string | undefined;
    let bestDist = Infinity;
    for (const d of rawData) {
      const mid = parseBucketMidpoint(d.range);
      if (mid !== null) {
        const dist = Math.abs(mid - val);
        if (dist < bestDist) { bestDist = dist; best = d.range; }
      }
    }
    return best;
  }

  const xMean   = closestBucketLabel(mean);
  const xMedian = closestBucketLabel(median);
  const xSigP   = closestBucketLabel(mean + stdDev);
  const xSigN   = closestBucketLabel(mean - stdDev);

  const formatXTick = (val: string) => {
    const mid = parseBucketMidpoint(val);
    if (mid === null) return val;
    return formatVal(mid, colName);
  };

  return (
    <div className="flex flex-col h-full w-full gap-1">
      {/* Skew badge */}
      {showAxes && skewDetected && (
        <div className="self-end">
          <span
            className="text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded"
            style={{
              color: '#e05252',
              border: '1px solid rgba(224,82,82,0.3)',
              background: 'rgba(224,82,82,0.06)',
            }}
          >
            ⚠ VALUES ARE UNEVEN
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={coloredData}
            margin={showAxes
              ? { top: 16, right: 12, left: 8, bottom: 28 }
              : { top: 4, right: 4, left: 4, bottom: 4 }
            }
            barCategoryGap="3%"
          >
            {showAxes && (
              <XAxis
                dataKey="range"
                ticks={xTicks}
                tick={{ fill: 'rgba(57,255,106,0.45)', fontSize: 8, fontFamily: 'DM Mono' }}
                axisLine={{ stroke: 'rgba(57,255,106,0.13)' }}
                tickLine={false}
                tickFormatter={formatXTick}
                interval={0}
              />
            )}
            {showAxes && (
              <YAxis
                domain={yDomain}
                tickCount={4}
                tick={{ fill: 'rgba(57,255,106,0.35)', fontSize: 8, fontFamily: 'DM Mono' }}
                axisLine={false}
                tickLine={false}
                label={{
                  value: 'NUMBER OF ENTRIES',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fill: 'rgba(57,255,106,0.3)', fontSize: 8, fontFamily: 'DM Mono' },
                }}
              />
            )}

            {!showAxes && <YAxis domain={yDomain} hide />}

            <Tooltip
              content={<CustomTooltip colName={colName} />}
              cursor={{ fill: 'rgba(57,255,106,0.04)' }}
            />

            {/* Subtle horizontal rules instead of grid */}
            {showAxes && [0.25, 0.5, 0.75, 1.0].map((pct) => (
              <ReferenceLine
                key={pct}
                y={Math.round(yDomain[1] * pct)}
                stroke="rgba(57,255,106,0.06)"
                strokeWidth={1}
                ifOverflow="extendDomain"
              />
            ))}

            {/* ±1σ dashed lines */}
            {showAxes && xSigN && (
              <ReferenceLine
                x={xSigN}
                stroke="rgba(57,255,106,0.4)"
                strokeWidth={1}
                strokeDasharray="4 3"
                label={<RefLabel label="Normal Range−1" color="rgba(57,255,106,0.5)" />}
              />
            )}
            {showAxes && xSigP && (
              <ReferenceLine
                x={xSigP}
                stroke="rgba(57,255,106,0.4)"
                strokeWidth={1}
                strokeDasharray="4 3"
                label={<RefLabel label="Normal Range+1" color="rgba(57,255,106,0.5)" />}
              />
            )}

            {/* Median line — bio-teal */}
            {showAxes && xMedian && (
              <ReferenceLine
                x={xMedian}
                stroke="#00f5c8"
                strokeWidth={1}
                label={<RefLabel label={`Midpoint (${formatVal(median, colName)})`} color="#00f5c8" />}
              />
            )}

            {/* Mean line — bio-green solid */}
            {showAxes && xMean && (
              <ReferenceLine
                x={xMean}
                stroke="#39ff6a"
                strokeWidth={1.5}
                label={<RefLabel label={`Average (${formatVal(mean, colName)})`} color="#39ff6a" />}
              />
            )}

            {/* Bars */}
            <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out">
              {coloredData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.barColor}
                  style={entry.zone === 'anomaly' ? { animation: 'node-pulse 2.2s ease-in-out infinite' } : {}}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart caption */}
      {showAxes && (
        <p
          className="font-mono text-center leading-tight"
          style={{ fontSize: 8, color: 'rgba(57,255,106,0.40)' }}
        >
          Bars in the green zone are within the normal range. Red bars are unusual entries worth reviewing.
        </p>
      )}
    </div>
  );
};
