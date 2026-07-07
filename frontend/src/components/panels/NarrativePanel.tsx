import React, { useState } from 'react';
import { useStore } from '../../store';
import { Button, SkeletonBlock } from '../ui';
import { streamNarrative } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { NarrativeMode } from '../../types';

export const NarrativePanel: React.FC = () => {
  const { analysis, narrative, setNarrative, isGenerating, setIsGenerating, filename } = useStore();
  const [mode, setMode] = useState<NarrativeMode>('executive');

  const generate = () => {
    if (!analysis) return;
    setIsGenerating(true);
    setNarrative('');

    streamNarrative(
      analysis.stats,
      analysis.insights,
      mode,
      (token)  => setNarrative((prev: string) => prev + token),
      ()       => setIsGenerating(false),
      (err)    => {
        console.error(err);
        setIsGenerating(false);
        setNarrative('## Engine Error\nPlease verify API connectivity or Groq API Key configuration.');
      }
    );
  };

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5 h-full">

      {/* ── Controls ── */}
      <div className="flex justify-between items-center flex-shrink-0">
        {/* Mode toggle — spring pill */}
        <div
          className="flex gap-1 p-1 rounded-sm"
          style={{ background: 'var(--bio-card2)', border: '1px solid var(--bio-border)' }}
        >
          {(['executive', 'analyst'] as const).map((m) => (
            <motion.button
              key={m}
              onClick={() => setMode(m)}
              whileTap={{ scale: 0.97 }}
              className="relative px-5 py-1.5 rounded-sm text-[10px] font-bold font-mono tracking-widest uppercase transition-colors duration-150"
              style={{ color: mode === m ? 'var(--bio-black)' : 'rgba(57,255,106,0.4)' }}
            >
              {mode === m && (
                <motion.div
                  layoutId="bio-mode-pill"
                  className="absolute inset-0 rounded-sm"
                  style={{ background: 'var(--bio-green)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
              <span className="relative z-10">{m === 'executive' ? 'QUICK SUMMARY' : 'FULL BREAKDOWN'}</span>
            </motion.button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            icon={Copy}
            onClick={() => navigator.clipboard.writeText(narrative)}
            disabled={!narrative}
          >
            Copy
          </Button>
          <Button
            variant="filled"
            icon={RotateCcw}
            onClick={generate}
            disabled={isGenerating || !analysis}
          >
            {isGenerating ? 'Generating…' : 'Regenerate'}
          </Button>
        </div>
      </div>

      {/* ── Report Canvas ── */}
      <div
        className="flex-1 overflow-y-auto custom-scrollbar rounded-lg relative"
        style={{
          background: 'var(--bio-card)',
          border: '1px solid var(--bio-border)',
          boxShadow: '0 0 0 1px rgba(57,255,106,0.05), 0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-0.5"
          style={{ background: 'rgba(57,255,106,0.15)' }}
        />
        <div className="p-8">
          {/* Letterhead */}
          <div className="pb-6 mb-8" style={{ borderBottom: '1px solid rgba(57,255,106,0.15)' }}>
            <h1
              className="font-display text-2xl uppercase mb-2"
              style={{
                color: 'var(--bio-green)',
                letterSpacing: '0.16em',
                animation: 'node-pulse 2.2s ease-in-out infinite',
              }}
            >
              Analysis Report
            </h1>
            {/* Green rule lines */}
            <div className="h-px mb-3" style={{ background: 'rgba(57,255,106,0.15)' }} />
            <div className="flex gap-4 text-[10px] font-mono uppercase flex-wrap"
              style={{ color: 'rgba(57,255,106,0.4)' }}>
              <span>File Analyzed: {filename || 'No File'}</span>
              <span>·</span>
              <span>Analysis Engine: Llama-3.3-70b</span>
              <span>·</span>
              <span>Mode: {mode === 'executive' ? 'Quick Summary' : 'Full Breakdown'}</span>
              <span>·</span>
              <span>{today}</span>
            </div>
          </div>

          {/* Skeleton while waiting */}
          <AnimatePresence>
            {isGenerating && !narrative && (
              <SkeletonBlock lines={8} />
            )}
          </AnimatePresence>

          {/* Narrative content */}
          <motion.div
            key={narrative.length > 0 ? 'content' : 'empty'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="prose-narrative"
          >
            <ReactMarkdown>
              {narrative || (!isGenerating
                ? "Click **Regenerate** to generate a plain-English summary of your data using AI."
                : ''
              )}
            </ReactMarkdown>
            {/* Streaming block cursor */}
            {isGenerating && narrative && (
              <span className="bio-cursor" />
            )}
          </motion.div>
        </div>
      </div>

      {/* ── SSE Status Footer ── */}
      <div
        className="flex items-center gap-3 text-[9px] font-mono px-1 py-2 flex-shrink-0"
        style={{ borderTop: '1px solid var(--bio-border)', color: 'rgba(57,255,106,0.4)' }}
      >
        <div className="flex items-center gap-1.5">
          <motion.div
            animate={{ opacity: isGenerating ? [1, 0.3, 1] : 1 }}
            transition={{ duration: 1.2, repeat: isGenerating ? Infinity : 0, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: isGenerating ? 'var(--bio-green)' : 'var(--bio-teal)',
              animation: 'node-pulse 2.2s ease-in-out infinite',
            }}
          />
          <span className="uppercase tracking-wider">
            {isGenerating ? 'Live Analysis in Progress' : 'Analysis Engine'}
          </span>
        </div>
        <span>·</span>
        <span className="uppercase tracking-wider">
          {isGenerating ? 'LIVE · Receiving tokens…' : 'Ready'}
        </span>
        {isGenerating && (
          <motion.span
            animate={{ opacity: [0, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            style={{ color: 'var(--bio-green)' }}
          >
            ···
          </motion.span>
        )}
      </div>
    </div>
  );
};
