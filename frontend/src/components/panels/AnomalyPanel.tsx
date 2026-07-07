import React, { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { Card, Badge } from '../ui';
import { ZScatterPlot } from '../charts/ZScatterPlot';
import { formatVal } from '../charts/Histogram';
import { motion } from 'framer-motion';

type SortKey = 'row' | 'col' | 'val' | 'z' | 'deviation' | 'impact';
type SortDir = 'asc' | 'desc';

const rowVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.03 } },
};
const rowItemVariants = {
  hidden:  { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

const COL_HEADERS: { key: SortKey; label: string }[] = [
  { key: 'row',       label: 'ENTRY #'                },
  { key: 'col',       label: 'METRIC'                 },
  { key: 'val',       label: 'ACTUAL VALUE'           },
  { key: 'z',         label: 'RISK LEVEL'             },
  { key: 'deviation', label: 'DIFFERENCE FROM AVG'   },
  { key: 'impact',    label: 'ESTIMATED EFFECT'       },
];

export const AnomalyPanel: React.FC = () => {
  const { dataset, analysis } = useStore();
  const [sortKey, setSortKey] = useState<SortKey>('z');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  if (!dataset || !analysis) return null;

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const enrichedAnomalies = useMemo(() => {
    return analysis.anomalies.map((an) => {
      const s        = analysis.stats[an.col];
      const stdDev   = s?.stdDev ?? 0;
      const deviation = an.val - an.mean;
      const impact   = Math.abs(an.z) * stdDev;
      return { ...an, stdDev, deviation, impact };
    });
  }, [analysis]);

  const sorted = useMemo(() => {
    return [...enrichedAnomalies].sort((a, b) => {
      let av = 0, bv = 0;
      switch (sortKey) {
        case 'row':       av = a.row;       bv = b.row;       break;
        case 'col':       return sortDir === 'asc'
          ? a.col.localeCompare(b.col)
          : b.col.localeCompare(a.col);
        case 'val':       av = a.val;       bv = b.val;       break;
        case 'z':         av = Math.abs(a.z); bv = Math.abs(b.z); break;
        case 'deviation': av = Math.abs(a.deviation); bv = Math.abs(b.deviation); break;
        case 'impact':    av = a.impact;    bv = b.impact;    break;
      }
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [enrichedAnomalies, sortKey, sortDir]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-6"
    >
      {/* ── Z-SCORE SCATTER PLOT ── */}
      <Card className="flex flex-col gap-3 min-h-[380px]" hover={false} breatheDelay={0.1}>
        <div
          className="flex justify-between items-center pb-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(57,255,106,0.06)' }}
        >
          <h3
            className="font-display text-sm uppercase"
            style={{ color: 'var(--bio-green)', letterSpacing: '0.16em' }}
          >
            Risk Map
          </h3>
          <div className="flex gap-2 items-center">
            <span className="text-[9px] font-mono uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}>
              How unusual each entry is
            </span>
            <Badge variant={analysis.anomalies.length > 0 ? 'danger' : 'success'}>
              {analysis.anomalies.length} flagged
            </Badge>
          </div>
        </div>
        <div className="flex-1 min-h-0" style={{ minHeight: 300 }}>
          <ZScatterPlot
            anomalies={analysis.anomalies}
            stats={analysis.stats}
            cols={analysis.numericColumns}
          />
        </div>
      </Card>

      {/* ── MUTATION LOG TABLE ── */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ border: '1px solid var(--bio-border)', background: 'var(--bio-card)' }}
      >
        {/* Table header */}
        <div
          className="px-4 py-3 flex justify-between items-center"
          style={{ background: 'var(--bio-card2)', borderBottom: '1px solid var(--bio-border)' }}
        >
          <h3
            className="font-display text-[10px] uppercase"
            style={{ color: 'rgba(57,255,106,0.5)', letterSpacing: '0.2em' }}
          >
            Review List
          </h3>
          <span className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
            Values outside normal range · click headers to sort
          </span>
        </div>

        <div className="max-h-[360px] overflow-auto custom-scrollbar">
          {sorted.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--bio-green)', animation: 'node-pulse 2.2s ease-in-out infinite' }}>
                \u2713 No unusual entries found in your data
              </p>
            </div>
          ) : (
            <table className="w-full text-xs font-mono">
              <thead className="sticky top-0 z-10" style={{ background: 'var(--bio-card2)' }}>
                <tr>
                  {COL_HEADERS.map(({ key, label }) => {
                    const isActive = sortKey === key;
                    return (
                      <th
                        key={key}
                        onClick={() => handleSort(key)}
                        className="p-3 text-left text-[9px] uppercase font-bold font-display cursor-pointer select-none"
                        style={{
                          color: isActive ? '#39ff6a' : 'rgba(57,255,106,0.5)',
                          letterSpacing: '0.14em',
                          textDecoration: isActive ? 'underline' : 'none',
                          textUnderlineOffset: 3,
                        }}
                      >
                        {label} {isActive ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <motion.tbody variants={rowVariants} initial="hidden" animate="visible">
                {sorted.map((an, i) => {
                  const absZ      = Math.abs(an.z);
                  const isCrit    = absZ >= 3;
                  const isMedHigh = absZ >= 2.5 && absZ < 3;
                  const zColor    = isCrit ? '#e05252' : isMedHigh ? 'var(--bio-purple)' : 'rgba(57,255,106,0.7)';
                  const zAnim     = isCrit ? 'node-pulse 2.2s ease-in-out infinite' : 'none';

                  const devColor  = an.deviation >= 0 ? '#39ff6a' : '#e05252';
                  const devStr    = `${an.deviation >= 0 ? '+' : ''}${formatVal(an.deviation, an.col)}`;
                  const impactStr = formatVal(an.impact, an.col);

                  return (
                    <motion.tr
                      key={i}
                      variants={rowItemVariants}
                      className="transition-colors"
                      style={{
                        borderBottom: '1px solid rgba(57,255,106,0.05)',
                        borderLeft: isCrit ? '2px solid #e05252' : '2px solid transparent',
                        background: i % 2 === 0 ? 'var(--bio-card)' : 'var(--bio-card2)',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(57,255,106,0.04)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'var(--bio-card)' : 'var(--bio-card2)'; }}
                    >
                      <td className="p-3" style={{ color: 'var(--text-muted)' }}>#{an.row}</td>
                      <td className="p-3 font-bold" style={{ color: 'var(--text-primary)' }}>{an.col}</td>
                      <td className="p-3" style={{ color: 'rgba(57,255,106,0.6)' }}>
                        {formatVal(an.val, an.col)}
                      </td>
                      <td className="p-3 font-black" style={{ color: zColor, animation: zAnim }}>
                        {absZ > 4.0 ? 'URGENT' : absZ >= 3.0 ? 'HIGH RISK' : 'ABOVE NORMAL'}
                      </td>
                      <td className="p-3 font-bold" style={{ color: devColor }}>
                        {devStr}
                      </td>
                      <td className="p-3" style={{ color: 'rgba(0,245,200,0.8)' }}>
                        {impactStr}
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          )}
        </div>

        {/* Table caption */}
        <div
          className="px-4 py-2"
          style={{ borderTop: '1px solid var(--bio-border)', background: 'var(--bio-card2)' }}
        >
          <p className="font-mono" style={{ fontSize: 8, color: 'rgba(57,255,106,0.40)' }}>
            These entries have values far outside what’s normal for their metric. Review them to confirm they are real or correct any data errors.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
