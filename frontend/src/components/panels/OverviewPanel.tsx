import React, { useState } from 'react';
import { useStore } from '../../store';
import { StatCard, Card, Badge } from '../ui';
import { Histogram } from '../charts/Histogram';
import { motion } from 'framer-motion';

const galleryVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.02 } },
};
const galleryItemVariants = {
  hidden:  { opacity: 0, x: 8  },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
};

export const OverviewPanel: React.FC = () => {
  const { dataset, analysis } = useStore();
  const [focusCol, setFocusCol] = useState<string | null>(null);

  if (!dataset || !analysis) return null;

  const sortedCols = [...analysis.numericColumns].sort(
    (a, b) => (analysis.stats[b]?.cv || 0) - (analysis.stats[a]?.cv || 0)
  );
  const mostVolatile = sortedCols[0];
  const activeCol   = focusCol && analysis.numericColumns.includes(focusCol) ? focusCol : mostVolatile;
  const activeStats = analysis.stats[activeCol];
  const isCritical  = (activeStats?.cv || 0) > 0.5;

  // ── Analytical card computations ──────────────────────────────────────────
  const totalRows = dataset.length;
  const mean      = activeStats?.mean    ?? 0;
  const median    = activeStats?.median  ?? 0;
  const stdDev    = activeStats?.stdDev  ?? 1;

  // Card 1: Mean vs Median Delta
  const meanMedianPct = mean !== 0 ? Math.abs((mean - median) / mean) * 100 : 0;
  const isSkewed      = meanMedianPct > 10;

  // Card 2: Core Concentration — % within μ ± 1σ
  let coreCount = 0;
  for (const row of dataset) {
    const v = row[activeCol];
    if (typeof v === 'number' && !isNaN(v) && v >= mean - stdDev && v <= mean + stdDev) {
      coreCount++;
    }
  }
  const corePct      = totalRows > 0 ? (coreCount / totalRows) * 100 : 0;
  const coreIsLow    = corePct < 60;

  // Card 3: Outlier Exposure — beyond μ ± 2σ
  let outlierCount = 0;
  for (const row of dataset) {
    const v = row[activeCol];
    if (typeof v === 'number' && !isNaN(v) && Math.abs(v - mean) > 2 * stdDev) {
      outlierCount++;
    }
  }
  const outlierPct     = totalRows > 0 ? (outlierCount / totalRows) * 100 : 0;
  const outlierIsHigh  = outlierPct > 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8"
    >
      {/* ── Top Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard index={0} label="TOTAL ENTRIES"   value={dataset.length.toLocaleString()} subtext="Entries loaded from your file" variant="gold" />
        <StatCard index={1} label="NUMBER METRICS"  value={analysis.numericColumns.length} subtext="Numeric metrics found" variant="gold" />
        <StatCard index={2} label="RECORDS TO REVIEW" value={analysis.anomalies.length} subtext="Entries outside normal range" variant={analysis.anomalies.length > 0 ? 'danger' : 'default'} />
        <StatCard index={3} label="ANALYSIS CONFIDENCE" value={analysis.insightScore} subtext="How reliable this analysis is" variant="gold" />
      </div>

      {/* ── Main Area ── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Left: histogram focus */}
        <div className="col-span-2 flex flex-col gap-4">
          <Card className="flex flex-col gap-5" hover={false} breatheDelay={0.2}>
            {/* Morph blob */}
            <div style={{
              position: 'absolute', width: 120, height: 120, bottom: -20, right: -20,
              background: isCritical
                ? 'radial-gradient(circle, rgba(224,82,82,0.06), transparent)'
                : 'radial-gradient(circle, rgba(57,255,106,0.06), transparent)',
              animation: 'morph 9s ease-in-out infinite',
              pointerEvents: 'none', borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
            }} />

            {/* Card header */}
            <div className="flex justify-between items-start pb-4"
              style={{ borderBottom: '1px solid rgba(57,255,106,0.06)' }}>
              <div>
                <h3 className="font-display text-sm uppercase"
                  style={{ color: 'var(--bio-green)', letterSpacing: '0.16em' }}>
                  Value Spread
                </h3>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Analyzing: <span style={{ color: 'rgba(57,255,106,0.7)' }}>{activeCol}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="warning">Consistency: {(activeStats?.cv || 0).toFixed(2)}</Badge>
                <Badge variant={isCritical ? 'danger' : 'success'}>
                  {isCritical ? 'UNPREDICTABLE' : 'CONSISTENT'}
                </Badge>
              </div>
            </div>

            {/* Annotated Histogram */}
            <div className="h-[260px] w-full">
              {activeStats && (
                <Histogram
                  stats={activeStats}
                  colName={activeCol}
                  showAxes={true}
                />
              )}
            </div>

            {/* ── 3 Analytical Cards ── */}
            <div className="grid grid-cols-3 gap-4 pt-4"
              style={{ borderTop: '1px solid rgba(57,255,106,0.06)' }}>

              {/* Card 1: Balance Check */}
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bio-card2)' }}>
                <span className="block text-[8px] font-mono uppercase mb-1 tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>
                  BALANCE CHECK
                </span>
                <span className="block text-xl font-display font-black"
                  style={{ color: isSkewed ? '#e05252' : '#39ff6a', animation: 'node-pulse 2.2s ease-in-out infinite' }}>
                  {meanMedianPct.toFixed(1)}%
                </span>
                <span className="text-[8px] font-mono uppercase tracking-widest"
                  style={{ color: isSkewed ? '#e05252' : '#39ff6a' }}>
                  {isSkewed ? '\u26a0 UNEVEN — values lean unevenly' : '\u2713 BALANCED — values are evenly spread'}
                </span>
              </div>

              {/* Card 2: Typical Range */}
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bio-card2)' }}>
                <span className="block text-[8px] font-mono uppercase mb-1 tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>
                  TYPICAL RANGE
                </span>
                <span className="block text-xl font-display font-black"
                  style={{ color: coreIsLow ? '#b44fff' : '#39ff6a', animation: 'node-pulse 2.2s ease-in-out infinite' }}>
                  {corePct.toFixed(1)}%
                </span>
                <span className="text-[8px] font-mono uppercase tracking-widest"
                  style={{ color: coreIsLow ? '#b44fff' : 'rgba(57,255,106,0.5)' }}>
                  {coreIsLow ? '\u26a0 FEWER THAN 60% IN NORMAL ZONE' : 'of entries in the normal zone'}
                </span>
              </div>

              {/* Card 3: Records to Review */}
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bio-card2)' }}>
                <span className="block text-[8px] font-mono uppercase mb-1 tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>
                  RECORDS TO REVIEW
                </span>
                <span className="block text-xl font-display font-black"
                  style={{ color: outlierIsHigh ? '#e05252' : '#39ff6a', animation: 'node-pulse 2.2s ease-in-out infinite' }}>
                  {outlierCount.toLocaleString()}
                </span>
                <span className="text-[8px] font-mono"
                  style={{ color: outlierIsHigh ? '#e05252' : 'rgba(57,255,106,0.5)' }}>
                  {outlierPct.toFixed(2)}% of your data
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Feature gallery */}
        <div className="flex flex-col gap-3 max-h-[520px] overflow-auto pr-1 custom-scrollbar">
          <h3
            className="font-display text-[9px] uppercase sticky top-0 py-1 z-10"
            style={{
              color: 'rgba(57,255,106,0.4)',
              letterSpacing: '0.2em',
              background: 'var(--bio-black)',
            }}
          >
            Metric Gallery
          </h3>

          <motion.div
            variants={galleryVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {analysis.numericColumns.map((col) => {
              const s       = analysis.stats[col];
              if (!s) return null;
              const isFocus  = activeCol === col;
              const isVolatile = s.cv >= 0.2;

              return (
                <motion.div
                  key={col}
                  variants={galleryItemVariants}
                  whileHover={{ scale: 1.015 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setFocusCol(col)}
                  className="cursor-pointer rounded-lg p-3 transition-all relative overflow-hidden"
                  style={{
                    background: 'var(--bio-card)',
                    border: isFocus
                      ? '1px solid rgba(57,255,106,0.5)'
                      : '1px solid var(--bio-border)',
                    boxShadow: isFocus ? '0 0 16px rgba(57,255,106,0.08)' : 'none',
                    opacity: isFocus ? 1 : 0.65,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = '1';
                    (e.currentTarget as HTMLElement).style.border = '1px solid rgba(57,255,106,0.35)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isFocus) {
                      (e.currentTarget as HTMLElement).style.opacity = '0.65';
                      (e.currentTarget as HTMLElement).style.border = '1px solid var(--bio-border)';
                    }
                  }}
                >
                  {/* Header row */}
                  <div className="flex justify-between items-center mb-1.5">
                    <h4
                      className="font-mono text-[10px] truncate max-w-[100px]"
                      style={{
                        color: isFocus ? 'var(--bio-green)' : 'var(--text-primary)',
                        animation: isFocus ? 'node-pulse 2.2s ease-in-out infinite' : 'none',
                      }}
                    >
                      {col}
                    </h4>
                    {/* STABLE / VOLATILE badge */}
                    <span
                      className="text-[7px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded"
                      style={{
                        color: isVolatile ? '#e05252' : '#39ff6a',
                        border: `1px solid ${isVolatile ? 'rgba(224,82,82,0.3)' : 'rgba(57,255,106,0.3)'}`,
                        background: isVolatile ? 'rgba(224,82,82,0.06)' : 'rgba(57,255,106,0.06)',
                      }}
                    >
                      {isVolatile ? 'UNPREDICTABLE' : 'CONSISTENT'}
                    </span>
                  </div>

                  {/* Mini histogram — 12 bars using deviation zone coloring */}
                  <div className="h-12 relative">
                    {s.buckets && (
                      <Histogram
                        stats={s}
                        colName={col}
                        showAxes={false}
                      />
                    )}
                  </div>

                  {/* CV value */}
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[8px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      Consistency
                    </span>
                    <span className="text-[9px] font-bold font-mono"
                      style={{ color: s.cv > 0.5 ? '#e05252' : '#39ff6a' }}>
                      {(s.cv * 100).toFixed(0)}% swing
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
