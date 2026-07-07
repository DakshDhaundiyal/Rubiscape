import React, { useState } from 'react';
import { useStore } from '../../store';
import { motion, AnimatePresence } from 'framer-motion';

const gridVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

type FilterType = 'ALL' | 'HIGH' | 'MED';

const TYPE_ICON: Record<string, string> = {
  'Volatility':       '⚡',
  'Linked Metrics':   '🔗',
  'Distorted Average':'📐',
  'Missing Data':     '🕳',
  'Anomaly Cluster':  '🔴',
};

const SEV_COLOR = {
  CRITICAL: { text: '#e05252', border: 'rgba(224,82,82,0.35)', bg: 'rgba(224,82,82,0.06)', bar: '#e05252' },
  HIGH:     { text: '#e05252', border: 'rgba(224,82,82,0.25)', bg: 'rgba(224,82,82,0.04)', bar: '#e05252' },
  MED:      { text: '#b44fff', border: 'rgba(180,79,255,0.25)', bg: 'rgba(180,79,255,0.04)', bar: '#b44fff' },
  LOW:      { text: 'rgba(57,255,106,0.6)', border: 'var(--bio-border)', bg: 'transparent', bar: '#39ff6a' },
};

function CorrelationBar({ r }: { r: number }) {
  const pct = Math.abs(r) * 100;
  const color = r > 0 ? '#39ff6a' : '#e05252';
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[8px] font-mono uppercase" style={{ color: 'var(--text-muted)', width: 28 }}>
        {r > 0 ? '+' : '−'}{Math.abs(r).toFixed(2)}
      </span>
      <div className="flex-1 h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          style={{ background: color, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
      <span className="text-[8px] font-mono" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

export const InsightsPanel: React.FC = () => {
  const { analysis } = useStore();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!analysis) return null;

  const insights = analysis.insights ?? [];

  const highCount = insights.filter(i => i.severity === 'HIGH' || i.severity === 'CRITICAL').length;
  const medCount  = insights.filter(i => i.severity === 'MED').length;
  const lowCount  = insights.filter(i => i.severity === 'LOW').length;

  const filtered = insights.filter(ins => {
    if (filter === 'HIGH') return ins.severity === 'HIGH' || ins.severity === 'CRITICAL';
    if (filter === 'MED')  return ins.severity === 'MED';
    return true;
  });

  const filterBtns: { id: FilterType; label: string; count: number; color: string }[] = [
    { id: 'ALL',  label: 'All',         count: insights.length, color: 'rgba(57,255,106,0.7)' },
    { id: 'HIGH', label: 'Urgent',      count: highCount,       color: '#e05252' },
    { id: 'MED',  label: 'Watch List',  count: medCount,        color: '#b44fff' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Summary Strip ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="grid grid-cols-4 gap-3"
      >
        {[
          { label: 'Total Findings',  value: insights.length, color: '#39ff6a',  sub: 'from your dataset' },
          { label: 'Needs Attention', value: highCount,        color: '#e05252',  sub: 'urgent or critical' },
          { label: 'Worth Watching',  value: medCount,         color: '#b44fff',  sub: 'moderate priority' },
          { label: 'Analysis Score',  value: `${analysis.insightScore}`,  color: analysis.insightScore >= 70 ? '#39ff6a' : '#e05252', sub: 'data health out of 100' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="rounded-lg p-4 relative overflow-hidden"
            style={{
              background: 'var(--bio-card)',
              border: '1px solid var(--bio-border)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 80% 20%, ${item.color}08, transparent)`, pointerEvents: 'none' }} />
            <div className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
              {item.label}
            </div>
            <div className="font-display text-2xl font-black" style={{ color: item.color, animation: 'node-pulse 2.2s ease-in-out infinite' }}>
              {item.value}
            </div>
            <div className="text-[8px] font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {item.sub}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Narrative Block ─────────────────────────────────────────────── */}
      {analysis.narrativeBlock && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
          className="rounded-lg p-5 relative overflow-hidden"
          style={{
            background: 'var(--bio-card)',
            border: '1px solid var(--bio-border)',
            borderLeft: '3px solid var(--bio-purple)',
          }}
        >
          <div style={{ position: 'absolute', top: 8, right: 16, opacity: 0.04, pointerEvents: 'none', userSelect: 'none' }}>
            <span className="font-display text-6xl italic" style={{ color: 'var(--bio-purple)' }}>AI</span>
          </div>
          <div style={{ position: 'absolute', width: 100, height: 100, bottom: -20, right: -20, background: 'radial-gradient(circle, rgba(180,79,255,0.08), transparent)', animation: 'morph 9s ease-in-out infinite', pointerEvents: 'none', borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%' }} />
          <h2 className="font-display text-[10px] uppercase mb-3 pb-2" style={{ color: 'var(--bio-purple)', letterSpacing: '0.2em', borderBottom: '1px solid rgba(180,79,255,0.12)' }}>
            Key Findings
          </h2>
          <p className="font-narrative text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {analysis.narrativeBlock}
          </p>
        </motion.div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        {filterBtns.map(btn => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className="px-4 py-1.5 rounded-sm text-[10px] font-mono uppercase tracking-widest transition-all duration-150 flex items-center gap-2"
            style={{
              border: '1px solid ' + (filter === btn.id ? btn.color : 'var(--bio-border)'),
              color: filter === btn.id ? btn.color : 'rgba(57,255,106,0.4)',
              background: filter === btn.id ? `${btn.color}12` : 'transparent',
            }}
          >
            {btn.label}
            <span
              className="text-[8px] px-1.5 py-0.5 rounded-full font-bold"
              style={{
                background: filter === btn.id ? `${btn.color}20` : 'rgba(255,255,255,0.05)',
                color: filter === btn.id ? btn.color : 'rgba(255,255,255,0.3)',
                border: `1px solid ${filter === btn.id ? btn.color + '40' : 'transparent'}`,
              }}
            >
              {btn.count}
            </span>
          </button>
        ))}
        <div className="ml-auto text-[9px] font-mono" style={{ color: 'rgba(57,255,106,0.3)' }}>
          {filtered.length} finding{filtered.length !== 1 ? 's' : ''} shown
        </div>
      </div>

      {/* ── Insight Cards ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'rgba(57,255,106,0.3)' }}>
          <div className="font-display text-3xl mb-2">✓</div>
          <div className="font-mono text-[11px] uppercase tracking-widest">No findings in this category</div>
        </div>
      ) : (
        <motion.div
          key={filter}
          variants={gridVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-5"
        >
          {filtered.map((ins) => {
            const isCritical = ins.severity === 'HIGH' || ins.severity === 'CRITICAL';
            const sevColors  = SEV_COLOR[ins.severity] ?? SEV_COLOR.LOW;
            const icon       = TYPE_ICON[ins.type] ?? '📊';
            const isOpen     = expanded === ins.id;
            const corrMatch  = ins.correlation?.match(/r\s*=\s*([-\d.]+)/i);
            const corrVal    = corrMatch ? parseFloat(corrMatch[1]) : null;

            return (
              <motion.div key={ins.id} variants={cardVariants}>
                <div
                  className="h-full rounded-lg flex flex-col transition-all duration-200 relative overflow-hidden"
                  style={{
                    background: isCritical ? 'rgba(224,82,82,0.04)' : 'var(--bio-card)',
                    border: `1px solid ${sevColors.border}`,
                    borderLeft: `3px solid ${sevColors.bar}`,
                  }}
                >
                  {/* Morph blob */}
                  <div style={{
                    position: 'absolute', width: 80, height: 80, bottom: -15, right: -15,
                    background: `radial-gradient(circle, ${sevColors.bar}0a, transparent)`,
                    animation: 'morph 9s ease-in-out 1s infinite',
                    pointerEvents: 'none', borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
                  }} />

                  {/* ── Card Header ── */}
                  <div
                    className="flex items-center justify-between px-5 pt-4 pb-3 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : ins.id)}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm flex-shrink-0">{icon}</span>
                      <span
                        className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          color: sevColors.text,
                          border: `1px solid ${sevColors.border}`,
                          background: sevColors.bg,
                        }}
                      >
                        {ins.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className="text-[9px] font-bold font-mono uppercase tracking-wider px-2 py-0.5 rounded"
                        style={{
                          color: sevColors.text,
                          border: `1px solid ${sevColors.border}`,
                          background: sevColors.bg,
                        }}
                      >
                        {isCritical ? 'NEEDS ATTENTION' : 'WATCH'}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: 'rgba(57,255,106,0.35)' }}>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* ── Always-visible body ── */}
                  <div className="px-5 py-4 flex flex-col gap-3">
                    <h3 className="font-display text-[14px] leading-snug" style={{ color: 'var(--text-primary)' }}>
                      {ins.title}
                    </h3>
                    <p className="font-narrative text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {ins.body}
                    </p>

                    {/* Correlation bar (always visible if present) */}
                    {corrVal !== null && (
                      <div>
                        <div className="text-[8px] font-mono uppercase tracking-widest mb-1" style={{ color: 'rgba(57,255,106,0.4)' }}>
                          Link Strength
                        </div>
                        <CorrelationBar r={corrVal} />
                      </div>
                    )}

                    {/* Column tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {ins.columns.map(col => (
                        <span
                          key={col}
                          className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                          style={{
                            background: 'var(--bio-card2)',
                            border: '1px solid rgba(57,255,106,0.12)',
                            color: 'rgba(57,255,106,0.5)',
                          }}
                        >
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ── Expandable detail ── */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div className="px-5 py-4 flex flex-col gap-4">

                          {/* Possible Reason */}
                          {ins.root_cause && (
                            <div className="rounded-md p-3" style={{ background: isCritical ? 'rgba(224,82,82,0.05)' : 'rgba(57,255,106,0.04)', border: `1px solid ${sevColors.border}` }}>
                              <span className="text-[8px] uppercase font-bold font-mono block mb-1" style={{ color: sevColors.text }}>
                                Possible Reason
                              </span>
                              <p className="text-[11px] font-mono leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                                {ins.root_cause}
                              </p>
                            </div>
                          )}

                          {/* What to Do */}
                          {ins.recommendation && (
                            <div style={{ borderTop: '1px solid rgba(0,245,200,0.15)', paddingTop: '1rem' }}>
                              <span className="text-[8px] uppercase font-mono tracking-widest block mb-2" style={{ color: 'var(--bio-teal)', letterSpacing: '0.14em' }}>
                                WHAT TO DO
                              </span>
                              <div className="p-3 rounded-lg" style={{ background: 'var(--bio-card2)', border: '1px solid rgba(0,245,200,0.12)' }}>
                                <p className="font-narrative text-[13px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                                  {ins.recommendation}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Expand hint */}
                  <button
                    className="w-full text-center py-2 text-[8px] font-mono uppercase tracking-widest transition-colors duration-150"
                    style={{ color: 'rgba(57,255,106,0.25)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    onClick={() => setExpanded(isOpen ? null : ins.id)}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(57,255,106,0.5)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(57,255,106,0.25)')}
                  >
                    {isOpen ? 'Collapse ▲' : 'See Possible Reason & Action ▼'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};
