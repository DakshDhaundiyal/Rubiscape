import React from 'react';
import { motion } from 'framer-motion';
import type { StatSummary } from '../../types';
import { formatVal } from './Histogram';

interface BoxPlotProps {
  stats: StatSummary;
  color?: string;
  datasetMean?: number;
  colName?: string;
}

/**
 * Enhanced SVG Box-and-Whisker — BIOPUNK edition.
 * Q1 = mean - stdDev | Q3 = mean + stdDev (approximation)
 * Adds: benchmark reference line (datasetMean), OUTPERFORMING/UNDERPERFORMING badge,
 * formatted labels, outlier dots with node-pulse-purple animation.
 */
export const BoxPlot: React.FC<BoxPlotProps> = ({
  stats,
  color = '#39ff6a',
  datasetMean,
  colName = '',
}) => {
  if (!stats) return null;

  const { min, max, mean, median, stdDev } = stats;
  const q1 = mean - stdDev;
  const q3 = mean + stdDev;

  const W    = 340;
  const H    = 130;
  const padL = 28;
  const padR = 48;   // wider right for DATASET μ label
  const plotW = W - padL - padR;
  const midY  = H / 2;
  const boxH  = 30;

  const range = max - min;
  if (range === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[10px] font-mono"
        style={{ color: 'var(--text-muted)' }}>
        All entries have the same value — nothing to display
      </div>
    );
  }

  const toX = (v: number) => padL + ((Math.min(Math.max(v, min), max) - min) / range) * plotW;

  const x_min    = toX(min);
  const x_q1     = toX(Math.max(min, q1));
  const x_median = toX(median);
  const x_q3     = toX(Math.min(max, q3));
  const x_max    = toX(max);

  const boxTop = midY - boxH / 2;
  const boxBot = midY + boxH / 2;

  // Benchmark reference line
  const showBench = datasetMean !== undefined;
  const x_bench   = showBench ? toX(datasetMean!) : 0;
  const isOutperforming = median >= (datasetMean ?? mean);

  // Simulate outliers beyond whiskers as dots
  // We don't have raw data in BoxPlot, so show synthetic dots at min/max if they're far
  const minIsOutlier = (mean - min) / stdDev > 2.5;
  const maxIsOutlier = (max - mean) / stdDev > 2.5;

  const labelItems = [
    { x: x_min,    label: 'LOWEST VALUE',  val: min    },
    { x: x_q1,     label: 'LOWER BOUND',   val: q1     },
    { x: x_median, label: 'MIDPOINT',      val: median },
    { x: x_q3,     label: 'UPPER BOUND',   val: q3     },
    { x: x_max,    label: 'HIGHEST VALUE', val: max    },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: 'visible' }}
      >
        {/* ── Min tick ── */}
        <motion.line
          x1={x_min} y1={midY - 9} x2={x_min} y2={midY + 9}
          stroke={color} strokeWidth={1.5}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0, duration: 0.3 }}
        />
        {/* ── Left whisker ── */}
        <motion.line
          x1={x_min} y1={midY} x2={x_q1} y2={midY}
          stroke="rgba(57,255,106,0.5)" strokeWidth={1}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.05, duration: 0.35, ease: 'easeOut' }}
          style={{ transformOrigin: `${x_min}px ${midY}px` }}
        />

        {/* ── IQR Box ── */}
        <motion.rect
          x={x_q1}
          y={boxTop}
          width={x_q3 - x_q1}
          height={boxH}
          fill="rgba(57,255,106,0.08)"
          stroke="rgba(57,255,106,0.5)"
          strokeWidth={1}
          rx={2}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
          style={{ transformOrigin: `${x_q1}px ${midY}px` }}
        />

        {/* ── Median line ── */}
        <motion.line
          x1={x_median} y1={boxTop} x2={x_median} y2={boxBot}
          stroke="#39ff6a" strokeWidth={2}
          initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }}
          transition={{ delay: 0.3, duration: 0.25 }}
          style={{ transformOrigin: `${x_median}px ${midY}px` }}
        />

        {/* ── Right whisker ── */}
        <motion.line
          x1={x_q3} y1={midY} x2={x_max} y2={midY}
          stroke="rgba(57,255,106,0.5)" strokeWidth={1}
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ delay: 0.05, duration: 0.35, ease: 'easeOut' }}
          style={{ transformOrigin: `${x_q3}px ${midY}px` }}
        />
        {/* ── Max tick ── */}
        <motion.line
          x1={x_max} y1={midY - 9} x2={x_max} y2={midY + 9}
          stroke={color} strokeWidth={1.5}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0, duration: 0.3 }}
        />

        {/* ── Outlier dots at min/max if extreme ── */}
        {minIsOutlier && (
          <circle
            cx={x_min - 8}
            cy={midY}
            r={4}
            fill="#b44fff"
            style={{ animation: 'node-pulse-purple 2.2s ease-in-out infinite' }}
          />
        )}
        {maxIsOutlier && (
          <circle
            cx={x_max + 8}
            cy={midY}
            r={4}
            fill="#b44fff"
            style={{ animation: 'node-pulse-purple 2.2s ease-in-out infinite' }}
          />
        )}

        {/* ── Benchmark reference line — bio-teal ── */}
        {showBench && (
          <>
            <motion.line
              x1={x_bench} y1={boxTop - 14}
              x2={x_bench} y2={boxBot + 14}
              stroke="#00f5c8"
              strokeWidth={1}
              strokeDasharray="4 3"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            />
            <text
              x={W - padR + 3}
              y={midY + 3}
              fontSize={7}
              fill="#00f5c8"
              fontFamily="DM Mono"
            >
              OVERALL AVG
            </text>
          </>
        )}

        {/* ── Labels ── */}
        {labelItems.map(({ x, label, val }) => (
          <g key={label}>
            <text
              x={x} y={boxTop - 8}
              textAnchor="middle"
              fontSize={7}
              fill="rgba(57,255,106,0.4)"
              fontFamily="DM Mono"
            >
              {label}
            </text>
            <text
              x={x} y={boxBot + 15}
              textAnchor="middle"
              fontSize={8}
              fill="rgba(57,255,106,0.65)"
              fontFamily="DM Mono"
            >
              {formatVal(val, colName)}
            </text>
          </g>
        ))}
      </svg>

      {/* OUTPERFORMING / UNDERPERFORMING badge */}
      {showBench && (
        <span
          className="text-[8px] font-mono uppercase tracking-widest px-2 py-0.5 rounded self-center"
          style={{
            color: isOutperforming ? '#39ff6a' : '#e05252',
            border: `1px solid ${isOutperforming ? 'rgba(57,255,106,0.3)' : 'rgba(224,82,82,0.3)'}`,
            background: isOutperforming ? 'rgba(57,255,106,0.05)' : 'rgba(224,82,82,0.05)',
          }}
        >
          {isOutperforming ? '▲ ABOVE AVERAGE — performing well' : '▼ BELOW AVERAGE — needs attention'}
        </span>
      )}
    </div>
  );
};
