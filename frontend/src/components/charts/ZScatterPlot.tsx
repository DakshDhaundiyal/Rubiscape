import React, { useRef, useState, useEffect } from 'react';
import type { Anomaly, StatSummary } from '../../types';
import { formatVal } from './Histogram';

interface ZScatterPlotProps {
  anomalies: Anomaly[];
  stats?: Record<string, StatSummary>;
  cols: string[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  row: number;
  col: string;
  val: number;
  z: number;
  isAnomaly: boolean;
}

function fmtAxis(val: number): string {
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000)     return `${(val / 1_000).toFixed(0)}K`;
  return val.toFixed(1);
}

export const ZScatterPlot: React.FC<ZScatterPlotProps> = ({ anomalies, stats, cols }) => {
  const svgRef   = useRef<SVGSVGElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 900, h: 320 });
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, row: 0, col: '', val: 0, z: 0, isAnomaly: false,
  });

  /* Responsive width */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const rows = Math.max(cols.length, 1);
      const h = Math.max(260, Math.min(rows * 30 + 80, 480));
      setDims({ w: Math.floor(w), h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [cols.length]);

  const numericCols = cols.filter(c => stats?.[c]);

  if (!stats || numericCols.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[10px] font-mono italic"
        style={{ color: 'var(--text-muted)' }}>
        No numeric metrics to display
      </div>
    );
  }

  /* ── Layout constants ─────────────────────────── */
  const W     = dims.w;
  const H     = dims.h;
  const padL  = 110;  // room for metric name labels
  const padR  = 24;
  const padT  = 20;
  const padB  = 44;   // x-axis labels
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  /* ── Global X domain: min/max across ALL metrics ─ */
  let globalMin = Infinity, globalMax = -Infinity;
  for (const col of numericCols) {
    const s = stats[col]!;
    globalMin = Math.min(globalMin, s.min);
    globalMax = Math.max(globalMax, s.max);
  }
  if (globalMin === globalMax) { globalMin -= 1; globalMax += 1; }
  const xRange = globalMax - globalMin;

  const toX = (val: number) => padL + ((val - globalMin) / xRange) * plotW;

  /* ── Y: one horizontal band per metric ──────────── */
  const rowCount = numericCols.length;
  const bandH    = plotH / rowCount;
  const toY = (idx: number) => padT + (idx + 0.5) * bandH;

  /* ── Anomaly set for fast lookup ─────────────────── */
  const anomalySet = new Set(anomalies.map(a => `${a.row}__${a.col}`));
  const anomalyMap: Record<string, Anomaly> = {};
  for (const a of anomalies) anomalyMap[`${a.row}__${a.col}`] = a;

  /* ── X axis ticks ────────────────────────────────── */
  const tickCount = Math.max(4, Math.min(8, Math.floor(plotW / 100)));
  const xTicks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    xTicks.push(globalMin + (i / tickCount) * xRange);
  }

  /* ── Mouse handlers ──────────────────────────────── */
  const handleMouseEnter = (
    e: React.MouseEvent<SVGCircleElement>,
    row: number, col: string, val: number, z: number, isAnomaly: boolean,
  ) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ visible: true, x: e.clientX - rect.left + 14, y: e.clientY - rect.top - 8, row, col, val, z, isAnomaly });
  };
  const handleMouseLeave = () => setTooltip(t => ({ ...t, visible: false }));

  return (
    <div ref={wrapRef} className="relative w-full h-full" style={{ minHeight: 260 }}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', width: '100%', height: '100%' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Normal zone fill gradient */}
          <linearGradient id="zone-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(57,255,106,0.07)" />
            <stop offset="100%" stopColor="rgba(57,255,106,0.03)" />
          </linearGradient>
          {/* Glow filter for anomaly dots */}
          <filter id="red-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="grn-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Plot background ── */}
        <rect x={padL} y={padT} width={plotW} height={plotH}
          fill="rgba(57,255,106,0.015)" rx={4} />

        {/* ── Alternating row bands ── */}
        {numericCols.map((_, idx) => (
          <rect
            key={idx}
            x={padL} y={padT + idx * bandH}
            width={plotW} height={bandH}
            fill={idx % 2 === 0 ? 'rgba(57,255,106,0.025)' : 'transparent'}
          />
        ))}

        {/* ── Per-metric: normal zone shading (mean ± 2σ) ── */}
        {numericCols.map((col, idx) => {
          const s = stats![col]!;
          const zoneLeft  = Math.max(globalMin, s.mean - 2 * s.stdDev);
          const zoneRight = Math.min(globalMax, s.mean + 2 * s.stdDev);
          const x1 = toX(zoneLeft);
          const x2 = toX(zoneRight);
          const cy = padT + idx * bandH;
          if (x2 <= x1) return null;
          return (
            <rect
              key={col}
              x={x1} y={cy + bandH * 0.1}
              width={x2 - x1} height={bandH * 0.8}
              fill="url(#zone-grad)"
              rx={2}
            />
          );
        })}

        {/* ── Normal dots (all dataset points drawn per metric from stats.buckets approx)
               We use a deterministic pseudo-random spread from row index ── */}
        {numericCols.map((col, colIdx) => {
          const s = stats![col]!;
          const cy = toY(colIdx);
          // We can't access raw dataset here, but stats gives us buckets.
          // Render synthetic normal-zone dots representing density from buckets.
          const buckets = s.buckets ?? [];
          const dots: JSX.Element[] = [];
          let dotKey = 0;
          for (let bi = 0; bi < buckets.length; bi++) {
            const bucket = buckets[bi];
            const count = Math.min(bucket.count, 60); // cap at 60 per bucket for perf
            // Spread: each bucket spans 1/3 of [min, max]
            const segW  = (s.max - s.min) / 3;
            const segMin = s.min + bi * segW;
            const segMax = segMin + segW;
            for (let d = 0; d < count; d++) {
              // LCG-style deterministic spread (no Math.random so no re-renders)
              const t     = (d * 2654435761 + bi * 1013904223 + colIdx * 22695477) % 1000 / 1000;
              const val   = segMin + t * (segMax - segMin);
              const cx    = toX(val);
              const jitter = ((d * 1664525 + colIdx * 1013904223) % 100) / 100;
              const dotY  = cy + (jitter - 0.5) * bandH * 0.55;
              dots.push(
                <circle
                  key={`n-${col}-${dotKey++}`}
                  cx={cx} cy={dotY} r={2.5}
                  fill="rgba(57,255,106,0.55)"
                  fillOpacity={0.7}
                  style={{ cursor: 'default' }}
                />
              );
            }
          }
          return <g key={col}>{dots}</g>;
        })}

        {/* ── Anomaly dots (red, on top) ── */}
        {anomalies.map((an, i) => {
          const colIdx = numericCols.indexOf(an.col);
          if (colIdx < 0) return null;
          const cx    = toX(an.val);
          const absZ  = Math.abs(an.z);
          const cy    = toY(colIdx);
          const jitter = ((i * 1664525 + colIdx * 1013904223) % 100) / 100;
          const dotY  = cy + (jitter - 0.5) * bandH * 0.5;
          const isCrit = absZ >= 3.5;
          const r     = isCrit ? 5.5 : absZ >= 3 ? 4.5 : 3.5;
          return (
            <circle
              key={`a-${i}`}
              cx={cx} cy={dotY} r={r}
              fill={isCrit ? '#e05252' : 'rgba(224,82,82,0.85)'}
              fillOpacity={0.9}
              filter="url(#red-glow)"
              style={{
                cursor: 'pointer',
              }}
              onMouseEnter={e => handleMouseEnter(e, an.row, an.col, an.val, absZ, true)}
              onMouseLeave={handleMouseLeave}
            />
          );
        })}

        {/* ── Y axis: metric labels ── */}
        {numericCols.map((col, idx) => {
          const cy   = toY(idx);
          const label = col.length > 14 ? col.slice(0, 13) + '…' : col;
          const hasAnomaly = anomalies.some(a => a.col === col);
          return (
            <g key={col}>
              <line x1={padL - 4} y1={cy} x2={padL} y2={cy}
                stroke="rgba(57,255,106,0.2)" strokeWidth={1} />
              <text
                x={padL - 8} y={cy + 3.5}
                textAnchor="end"
                fontSize={9}
                fontFamily="DM Mono"
                fill={hasAnomaly ? '#e05252' : 'rgba(57,255,106,0.55)'}
                fontWeight={hasAnomaly ? 700 : 400}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* ── Y axis line ── */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH}
          stroke="rgba(57,255,106,0.2)" strokeWidth={1} />

        {/* ── X axis line ── */}
        <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH}
          stroke="rgba(57,255,106,0.2)" strokeWidth={1} />

        {/* ── X axis grid lines + ticks ── */}
        {xTicks.map((val, i) => {
          const cx = toX(val);
          return (
            <g key={i}>
              <line x1={cx} y1={padT} x2={cx} y2={padT + plotH}
                stroke="rgba(57,255,106,0.06)" strokeWidth={1} strokeDasharray="3 3" />
              <line x1={cx} y1={padT + plotH} x2={cx} y2={padT + plotH + 4}
                stroke="rgba(57,255,106,0.25)" strokeWidth={1} />
              <text
                x={cx} y={padT + plotH + 14}
                textAnchor="middle"
                fontSize={8}
                fontFamily="DM Mono"
                fill="rgba(57,255,106,0.45)"
              >
                {fmtAxis(val)}
              </text>
            </g>
          );
        })}

        {/* ── Legend ── */}
        <g transform={`translate(${padL + 8}, ${padT + plotH + 28})`}>
          <circle cx={0} cy={0} r={4} fill="rgba(57,255,106,0.6)" />
          <text x={10} y={3.5} fontSize={8} fontFamily="DM Mono" fill="rgba(57,255,106,0.5)">Normal</text>
          <circle cx={70} cy={0} r={4} fill="#e05252" filter="url(#red-glow)" />
          <text x={80} y={3.5} fontSize={8} fontFamily="DM Mono" fill="rgba(224,82,82,0.8)">Anomaly ({anomalies.length})</text>
          <rect x={160} y={-5} width={20} height={10} fill="rgba(57,255,106,0.12)" rx={1} />
          <text x={184} y={3.5} fontSize={8} fontFamily="DM Mono" fill="rgba(57,255,106,0.4)">Normal Zone (±2σ)</text>
        </g>
      </svg>

      {/* ── Hover tooltip ── */}
      {tooltip.visible && (
        <div
          className="absolute pointer-events-none font-mono text-[9px] rounded p-2.5 shadow-2xl z-50"
          style={{
            left: tooltip.x,
            top:  tooltip.y,
            background: 'var(--bio-card2)',
            border: `1px solid ${tooltip.isAnomaly ? 'rgba(224,82,82,0.5)' : 'rgba(57,255,106,0.3)'}`,
            minWidth: 160,
          }}
        >
          <p style={{ color: tooltip.isAnomaly ? '#e05252' : 'var(--bio-green)', fontWeight: 700, marginBottom: 3 }}>
            Entry #{tooltip.row.toLocaleString()}
          </p>
          <p style={{ color: 'var(--text-primary)', marginBottom: 2 }}>
            Metric: <span style={{ color: 'var(--bio-green)' }}>{tooltip.col}</span>
          </p>
          <p style={{ color: 'var(--text-primary)', marginBottom: 2 }}>
            Value: {formatVal(tooltip.val, tooltip.col)}
          </p>
          {tooltip.isAnomaly && (
            <p style={{ color: '#e05252', fontWeight: 700 }}>
              Risk: {tooltip.z >= 4 ? 'URGENT' : tooltip.z >= 3 ? 'HIGH RISK' : 'ABOVE NORMAL'}
              <span style={{ opacity: 0.6, fontWeight: 400 }}> · z={tooltip.z.toFixed(2)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
