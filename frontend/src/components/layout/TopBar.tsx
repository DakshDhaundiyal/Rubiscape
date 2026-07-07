import React from 'react';
import { useStore } from '../../store';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanelType } from '../../types';

const tabs: { id: PanelType; label: string }[] = [
  { id: 'overview',  label: 'Overview'   },
  { id: 'stats',     label: 'Statistics'  },
  { id: 'anomaly',   label: 'Anomalies'   },
  { id: 'insights',  label: 'Insights'    },
  { id: 'narrative', label: 'Report'      },
  { id: 'query',     label: 'Query'       },
];

export const TopBar: React.FC = () => {
  const { activePanel, setActivePanel, filename } = useStore();

  return (
    <header
      className="h-14 flex items-center px-4 z-50 flex-shrink-0 flicker"
      style={{
        background: 'var(--bio-surface)',
        borderBottom: '1px solid var(--bio-border)',
      }}
    >
      {/* ── Brand ── */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex items-center gap-3 w-auto flex-shrink-0 pr-4"
      >
        {/* N glyph — pulse-ring */}
        <div className="pulse-ring flex-shrink-0">
          <div
            className="w-7 h-7 flex items-center justify-center font-black rounded-sm text-sm"
            style={{
              background: 'var(--bio-green)',
              color: 'var(--bio-black)',
              boxShadow: '0 0 12px rgba(57,255,106,0.4), 0 0 32px rgba(57,255,106,0.15)',
              animation: 'node-pulse 2.2s ease-in-out infinite',
            }}
          >
            N
          </div>
        </div>
        <span
          className="font-display text-[11px] uppercase whitespace-nowrap"
          style={{ color: 'var(--bio-green)', letterSpacing: '0.16em', animation: 'node-pulse 2.2s ease-in-out infinite' }}
        >
          Narrative Analytics
        </span>
      </motion.div>

      {/* ── Nav Tabs ── */}
      <nav className="flex h-full flex-1 ml-4">
        {tabs.map((tab, i) => {
          const isActive = activePanel === tab.id;
          return (
            <motion.button
              key={tab.id}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3, ease: 'easeOut' }}
              onClick={() => setActivePanel(tab.id)}
              className="px-4 h-full text-[10px] font-bold font-mono uppercase tracking-widest relative transition-colors duration-150"
              style={{
                color: isActive ? 'var(--bio-green)' : 'rgba(57,255,106,0.4)',
                background: isActive ? 'var(--bio-green-dim)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(57,255,106,0.7)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) (e.currentTarget as HTMLElement).style.color = 'rgba(57,255,106,0.4)';
              }}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="bio-underline"
                  className="absolute bottom-0 left-0 right-0 h-[1.5px]"
                  style={{
                    background: 'var(--bio-green)',
                    boxShadow: '0 0 8px rgba(57,255,106,0.7), 0 0 20px rgba(57,255,106,0.25)',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* ── Right Badges ── */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
        className="flex items-center gap-2 flex-shrink-0"
      >
        {/* Groq status badge */}
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{ background: 'var(--bio-card)', border: '1px solid var(--bio-border)' }}
        >
          <div className="pulse-ring" style={{ width: 6, height: 6 }}>
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--bio-green)' }}
            />
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider whitespace-nowrap"
            style={{ color: 'rgba(57,255,106,0.6)' }}>
            Groq · Llama3.3
          </span>
        </div>

        {/* Active filename chip */}
        <AnimatePresence mode="wait">
          <motion.div
            key={filename}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex items-center px-3 py-1 rounded-full max-w-[140px]"
            style={{ background: 'var(--bio-card)', border: '1px solid var(--bio-border)' }}
          >
            <span className="text-[10px] font-mono uppercase truncate"
              style={{ color: 'rgba(57,255,106,0.7)' }}>
              {filename || 'No File'}
            </span>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </header>
  );
};
