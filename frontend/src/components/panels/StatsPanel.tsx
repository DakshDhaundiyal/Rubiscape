import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card } from '../ui';
import { BoxPlot } from '../charts/BoxPlot';
import { SparkLine } from '../charts/SparkLine';
import { motion } from 'framer-motion';

type CvClass = 'stable' | 'watch' | 'volatile';

function cvClass(cv: number): CvClass {
  if (cv < 0.20) return 'stable';
  if (cv <= 0.50) return 'watch';
  return 'volatile';
}

const CV_COLOR: Record<CvClass, string> = {
  stable:   'rgba(57,255,106,0.70)',
  watch:    'rgba(180,79,255,0.70)',
  volatile: '#e05252',
};
const CV_LABEL: Record<CvClass, string> = {
  stable:   'CONSISTENT',
  watch:    'INCONSISTENT',
  volatile: 'UNPREDICTABLE',
};

const rowVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.03 } },
};
const rowItemVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
};

export const StatsPanel: React.FC = () => {
  const { dataset, analysis } = useStore();

  const firstCol = analysis?.numericColumns[0] || '';
  const [selectedCol, setSelectedCol] = useState(firstCol);

  if (!analysis) return null;

  // Sort by CV descending
  const rankedCols = [...analysis.numericColumns].sort(
    (a, b) => (analysis.stats[b]?.cv ?? 0) - (analysis.stats[a]?.cv ?? 0)
  );
  const maxCV = Math.max(...rankedCols.map((c) => analysis.stats[c]?.cv ?? 0));

  const activeCol = selectedCol && analysis.numericColumns.includes(selectedCol)
    ? selectedCol
    : rankedCols[0];

  const s = analysis.stats[activeCol];
  const isSkewed   = Math.abs(s?.skewness ?? 0) > 1;
  const isDisperse = (s?.stdDev ?? 0) / (s?.mean ?? 1) > 0.5;
  const cv         = s?.cv ?? 0;
  const cvCls      = cvClass(cv);

  // All raw values for sparkline (full trend)
  const last30: number[] = dataset
    ? dataset
        .map((row) => row[activeCol])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v))
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex gap-6 h-full"
    >
      {/* ── LEFT: CV Volatility Leaderboard (60%) ── */}
      <div
        className="flex flex-col rounded-lg overflow-hidden"
        style={{
          flex: '0 0 60%',
          background: 'var(--bio-card)',
          border: '1px solid var(--bio-border)',
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--bio-border)', background: 'var(--bio-card2)' }}
        >
          <h3
            className="font-display text-[9px] uppercase"
            style={{ color: 'rgba(57,255,106,0.5)', letterSpacing: '0.16em' }}
          >
            Consistency Ranking
          </h3>
        </div>

        {/* Caption */}
        <div
          className="px-4 py-1.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--bio-border)', background: 'var(--bio-card2)' }}
        >
          <p className="font-mono" style={{ fontSize: 8, color: 'rgba(57,255,106,0.40)' }}>
            Metrics ranked from most unpredictable to most stable. Focus on red metrics first.
          </p>
        </div>

        {/* Leaderboard rows */}
        <div className="overflow-auto flex-1 custom-scrollbar">
          <motion.div variants={rowVariants} initial="hidden" animate="visible">
            {rankedCols.map((col, rowIdx) => {
              const cs      = analysis.stats[col];
              const cv_val  = cs?.cv ?? 0;
              const cls     = cvClass(cv_val);
              const barPct  = maxCV > 0 ? (cv_val / maxCV) * 100 : 0;
              const isActive = activeCol === col;
              const nullCount = cs?.nulls ?? 0;

              return (
                <motion.div
                  key={col}
                  variants={rowItemVariants}
                  onClick={() => setSelectedCol(col)}
                  className="cursor-pointer px-4 flex items-center gap-3 transition-colors"
                  style={{
                    height: 32,
                    background: isActive
                      ? 'var(--bio-green-dim)'
                      : rowIdx % 2 === 0 ? 'var(--bio-card)' : 'var(--bio-card2)',
                    borderBottom: '1px solid rgba(57,255,106,0.05)',
                    borderLeft: isActive ? '2px solid var(--bio-green)' : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(57,255,106,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = rowIdx % 2 === 0 ? 'var(--bio-card)' : 'var(--bio-card2)';
                  }}
                >
                  {/* Feature name */}
                  <span
                    className="font-mono truncate"
                    style={{ fontSize: 10, color: isActive ? 'var(--bio-green)' : 'var(--text-primary)', minWidth: 90, maxWidth: 120 }}
                  >
                    {col}
                  </span>

                  {/* Bar */}
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(57,255,106,0.06)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: CV_COLOR[cls], width: `${barPct}%` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: rowIdx * 0.02 }}
                    />
                  </div>

                  {/* Consistency score display */}
                  <span className="font-mono text-[9px]" style={{ color: CV_COLOR[cls], minWidth: 34, textAlign: 'right' }}>
                    {(cv_val * 100).toFixed(0)}% swing
                  </span>

                  {/* Stability label */}
                  <span
                    className="font-mono text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                    style={{
                      color: CV_COLOR[cls],
                      border: `1px solid ${CV_COLOR[cls].replace('0.70', '0.3').replace('#e05252', 'rgba(224,82,82,0.3)')}`,
                      background: cls === 'volatile' ? 'rgba(224,82,82,0.06)' : cls === 'watch' ? 'rgba(180,79,255,0.06)' : 'rgba(57,255,106,0.06)',
                      animation: cls === 'volatile' ? 'node-pulse 2.2s ease-in-out infinite' : 'none',
                      minWidth: 56,
                      textAlign: 'center',
                    }}
                  >
                    {CV_LABEL[cls]}
                  </span>

                  {/* Null badge */}
                  {nullCount > 0 && (
                    <span
                      className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--bio-card2)', color: 'rgba(57,255,106,0.4)', border: '1px solid rgba(57,255,106,0.1)', whiteSpace: 'nowrap' }}
                    >
                      {nullCount} missing entries
                    </span>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Caption */}
        <div
          className="px-4 py-2 flex-shrink-0"
          style={{ borderTop: '1px solid var(--bio-border)', background: 'var(--bio-card2)' }}
        >
          <p className="font-mono" style={{ fontSize: 8, color: 'rgba(57,255,106,0.40)' }}>
              Higher number = more unpredictable. Focus on metrics marked UNPREDICTABLE first.
            </p>
        </div>
      </div>

      {/* ── RIGHT: Enhanced BoxPlot Detail (40%) ── */}
      <div className="flex flex-col gap-4" style={{ flex: '0 0 38%' }}>
        <Card className="flex-1 flex flex-col gap-4" hover={false} breatheDelay={0.6}>
          {/* Header */}
          <div
            className="flex justify-between items-start pb-3"
            style={{ borderBottom: '1px solid rgba(57,255,106,0.06)' }}
          >
            <div>
              <h3
                className="font-display text-lg truncate max-w-[160px]"
                style={{ color: 'var(--bio-green)', animation: 'node-pulse 2.2s ease-in-out infinite' }}
              >
                {activeCol}
              </h3>
              <p className="font-mono text-[9px] uppercase mt-0.5" style={{ color: 'var(--text-muted)' }}>
                n = {s?.n?.toLocaleString() || '—'}
              </p>
            </div>
            <span
              className="font-mono text-[8px] uppercase px-2 py-0.5 rounded tracking-widest"
              style={{
                color: CV_COLOR[cvCls],
                border: `1px solid ${cvCls === 'volatile' ? 'rgba(224,82,82,0.3)' : cvCls === 'watch' ? 'rgba(180,79,255,0.3)' : 'rgba(57,255,106,0.3)'}`,
                background: cvCls === 'volatile' ? 'rgba(224,82,82,0.06)' : cvCls === 'watch' ? 'rgba(180,79,255,0.06)' : 'rgba(57,255,106,0.06)',
              }}
            >
              {(cv * 100).toFixed(0)}% variation · {CV_LABEL[cvCls]}
            </span>
          </div>

          {/* Sparkline — all records */}
          {last30.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: 'rgba(57,255,106,0.35)' }}>
                FULL TREND — {last30.length.toLocaleString()} entries
              </span>
              <div className="h-14">
                <SparkLine rawValues={last30} color="#39ff6a" />
              </div>
            </div>
          )}

          {/* Enhanced Box Plot */}
          <div className="h-44 w-full">
            <BoxPlot
              stats={s}
              color="#39ff6a"
              datasetMean={s?.mean}
              colName={activeCol}
            />
          </div>

          {/* Business framing + editorial interpretation */}
          <div className="mt-auto pt-3" style={{ borderTop: '1px solid rgba(57,255,106,0.06)' }}>
            <span className="text-[9px] font-mono uppercase tracking-widest block mb-2"
              style={{ color: 'var(--text-muted)' }}>
              What This Metric Tells You
            </span>
            <p className="font-narrative text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              <em>This metric </em>
              <strong style={{ color: 'var(--text-primary)', fontStyle: 'normal' }}>
                {cv < 0.2 ? 'is highly consistent — values stay close to the average' : cv <= 0.5 ? 'has moderate variation — worth keeping an eye on' : 'is highly unpredictable — investigate what’s driving the swings'}
              </strong>
              {'. '}
              <em>{activeCol}</em> typically{' '}
              <strong style={{ color: 'var(--text-primary)', fontStyle: 'normal' }}>
                {isSkewed ? 'leans heavily toward one end' : 'is distributed fairly evenly'}
              </strong>. Entries are{' '}
              <strong style={{ color: 'var(--text-primary)', fontStyle: 'normal' }}>
                {isDisperse ? 'spread widely apart' : 'clustered closely together'}
              </strong>.
            </p>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
