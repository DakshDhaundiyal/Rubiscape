import React, { useState } from 'react';
import { useStore } from '../../store';
import { StatCard, Card, Badge } from '../ui';
import { Histogram } from '../charts/Histogram';
import { motion } from 'framer-motion';

export const OverviewPanel: React.FC = () => {
  const { dataset, analysis } = useStore();
  const [focusCol, setFocusCol] = useState<string | null>(null);

  if (!dataset || !analysis) return null;

  // Identify the most volatile column for the focus view (don't mutate store!)
  const sortedCols = [...analysis.numericColumns].sort((a, b) => 
    (analysis.stats[b]?.cv || 0) - (analysis.stats[a]?.cv || 0)
  );
  const mostVolatile = sortedCols[0];
  
  const activeCol = (focusCol && analysis.numericColumns.includes(focusCol)) ? focusCol : mostVolatile;
  const activeStats = analysis.stats[activeCol];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-8"
    >
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          label="Total Records" 
          value={dataset.length.toLocaleString()} 
          subtext="Rows processed"
          variant="gold"
        />
        <StatCard 
          label="Numeric Columns" 
          value={analysis.numericColumns.length} 
          subtext="Feature depth"
        />
        <StatCard 
          label="Anomalies" 
          value={analysis.anomalies.length} 
          subtext="Z-Score > 2.5"
          variant={analysis.anomalies.length > 0 ? 'danger' : 'default'}
        />
        <StatCard 
          label="Insight Score" 
          value={analysis.insightScore} 
          subtext="Composite reliability"
        />
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col gap-6 bg-bg-3/20 border-gold/10">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="font-display text-md text-gold uppercase tracking-widest">Global Distribution Focus</h3>
                <p className="text-[10px] text-text-muted font-mono">Analyzing: {activeCol}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="warning">Stability: {(activeStats?.cv || 0).toFixed(2)}</Badge>
                <Badge variant={activeStats?.cv > 0.5 ? 'danger' : 'success'}>
                  Volatility: {activeStats?.cv > 0.5 ? 'CRITICAL' : 'STABLE'}
                </Badge>
              </div>
            </div>
            
            <div className="h-[300px] w-full py-4">
              {activeStats?.buckets && (
                <Histogram 
                  data={activeStats.buckets.map(b => ({ range: b.label, count: b.count }))} 
                  color={activeStats.cv > 0.5 ? "#ff4d4d" : "#f0a500"}
                />
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
              <div className="text-center">
                <span className="block text-[10px] text-text-muted uppercase mb-1">Mean</span>
                <span className="text-xl font-display text-text-primary">{activeStats?.mean.toFixed(2)}</span>
              </div>
              <div className="text-center border-x border-white/5">
                <span className="block text-[10px] text-text-muted uppercase mb-1">Std Deviation</span>
                <span className="text-xl font-display text-text-primary">{activeStats?.stdDev.toFixed(2)}</span>
              </div>
              <div className="text-center">
                <span className="block text-[10px] text-text-muted uppercase mb-1">Skewness</span>
                <span className="text-xl font-display text-text-primary">{activeStats?.skewness.toFixed(2)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4 max-h-[500px] overflow-auto pr-2 custom-scrollbar">
          <h3 className="font-display text-[10px] text-text-secondary uppercase tracking-widest sticky top-0 bg-bg-0 py-2 z-10">Feature Gallery</h3>
          {analysis.numericColumns.map((col) => {
            const s = analysis.stats[col];
            if (!s) return null;
            const isFocus = activeCol === col;
            
            return (
              <Card 
                key={col} 
                onClick={() => setFocusCol(col)}
                className={`cursor-pointer transition-all hover:scale-[1.02] p-3 ${isFocus ? 'border-gold shadow-[0_0_20px_rgba(240,165,0,0.1)]' : 'opacity-60 hover:opacity-100'}`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-display text-[11px] text-text-primary truncate max-w-[120px]">{col}</h4>
                  <span className="text-[9px] font-mono text-gold">Stability: {s.cv.toFixed(2)}</span>
                </div>
                <div className="h-16 relative">
                  {s.buckets && (
                    <Histogram 
                      data={s.buckets.map(b => ({ range: b.label, count: b.count }))} 
                      color={s.cv > 0.5 ? "#ff4d4d" : "#f0a500"}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
