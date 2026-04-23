import React from 'react';
import { useStore } from '../../store';
import { Card, Badge } from '../ui';
import { motion } from 'framer-motion';

export const InsightsPanel: React.FC = () => {
  const { analysis } = useStore();

  if (!analysis) return null;

  return (
    <div className="space-y-10">
      {/* Narrative Block Section */}
      {analysis.narrativeBlock && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-bg-3/50 backdrop-blur-xl border border-gold/20 p-8 rounded-lg shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <span className="font-display text-6xl italic text-gold">NARRATIVE</span>
          </div>
          <h2 className="font-display text-xl text-gold uppercase tracking-[0.2em] mb-4 border-b border-gold/10 pb-4">Executive Narrative</h2>
          <p className="font-narrative text-lg text-text-primary leading-relaxed max-w-4xl">
            {analysis.narrativeBlock}
          </p>
        </motion.div>
      )}

      {/* Grid of Detailed Insights */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 gap-8"
      >
        {analysis.insights.map((ins, i) => (
          <motion.div
            key={ins.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={`h-full border-l-4 group transition-all hover:bg-bg-3/30 ${ins.severity === 'HIGH' ? 'border-l-accent-danger' : 'border-l-gold'}`}>
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                    <span className="text-[10px] font-bold text-gold uppercase tracking-[0.2em]">{ins.type}</span>
                  </div>
                  <Badge variant={ins.severity === 'HIGH' ? 'danger' : 'warning'}>{ins.severity}</Badge>
                </div>
                
                <h3 className="font-display text-xl text-text-primary leading-tight group-hover:text-gold transition-colors">{ins.title}</h3>
                
                <div className="space-y-4">
                  {ins.context && (
                    <div className="border-l-2 border-gold/20 pl-4">
                      <span className="text-[9px] text-text-muted uppercase tracking-widest block mb-1">Context / Benchmark</span>
                      <p className="font-mono text-xs text-gold/80 italic">"{ins.context}"</p>
                    </div>
                  )}

                  <p className="font-narrative text-md text-text-secondary leading-relaxed">
                    {ins.body}
                  </p>

                  {ins.root_cause && (
                    <div className="bg-accent-danger/5 border border-accent-danger/10 p-3 rounded-sm">
                      <span className="text-[9px] text-accent-danger uppercase font-bold block mb-1">Root Cause Detection</span>
                      <p className="text-xs text-text-primary italic">👉 {ins.root_cause}</p>
                    </div>
                  )}

                  {ins.correlation && (
                    <div className="bg-gold/5 border border-gold/10 p-3 rounded-sm">
                      <span className="text-[9px] text-gold uppercase font-bold block mb-1">Feature Correlation</span>
                      <p className="text-xs text-text-muted">{ins.correlation}</p>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-6 border-t border-border/50">
                  <span className="text-[9px] text-text-muted uppercase block mb-2">Smart Recommendation</span>
                  <div className="bg-bg-4 p-4 rounded-lg border border-gold/5">
                    <p className="font-narrative text-sm text-text-primary leading-relaxed">
                      {ins.recommendation}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {ins.columns.map(col => (
                    <span key={col} className="text-[9px] font-mono bg-bg-4 px-3 py-1 border border-border/50 text-text-muted rounded-full">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
