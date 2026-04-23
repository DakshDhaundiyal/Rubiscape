import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Badge } from '../ui';
import { BoxPlot } from '../charts/BoxPlot';
import { motion } from 'framer-motion';

export const StatsPanel: React.FC = () => {
  const { analysis } = useStore();
  const [selectedCol, setSelectedCol] = useState(analysis?.numericColumns[0] || '');

  if (!analysis || !selectedCol) return null;

  const s = analysis.stats[selectedCol];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-12 gap-6 h-full"
    >
      <div className="col-span-8 overflow-hidden flex flex-col border border-border rounded-sm bg-bg-2">
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-bg-3 text-text-secondary z-10">
              <tr>
                <th className="p-3 text-left">Column</th>
                <th className="p-3 text-left">Mean</th>
                <th className="p-3 text-left">Median</th>
                <th className="p-3 text-left">Std Dev</th>
                <th className="p-3 text-left">Skew</th>
                <th className="p-3 text-left">Kurtosis</th>
                <th className="p-3 text-left">Nulls%</th>
              </tr>
            </thead>
            <tbody>
              {analysis.numericColumns.map(col => (
                <tr
                  key={col}
                  onClick={() => setSelectedCol(col)}
                  className={`border-b border-border hover:bg-bg-3 cursor-pointer transition-colors ${selectedCol === col ? 'bg-gold-dim' : ''}`}
                >
                  <td className={`p-3 font-bold ${selectedCol === col ? 'text-gold' : 'text-text-primary'}`}>{col}</td>
                  <td className="p-3">{analysis.stats[col].mean.toFixed(2)}</td>
                  <td className="p-3">{analysis.stats[col].median.toFixed(2)}</td>
                  <td className="p-3">{analysis.stats[col].stdDev.toFixed(2)}</td>
                  <td className="p-3">{analysis.stats[col].skewness.toFixed(2)}</td>
                  <td className="p-3">{(analysis.stats[col]?.kurtosis ?? 0).toFixed(2)}</td>
                  <td className="p-3">{(((analysis.stats[col]?.nulls ?? 0) / (analysis.stats[col]?.n ?? 1)) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="col-span-4 flex flex-col gap-6">
        <Card className="flex-1 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <h3 className="font-display text-lg text-gold">{selectedCol}</h3>
            <Badge variant={Math.abs(s.skewness) > 1 ? 'warning' : 'success'}>
              {Math.abs(s.skewness) > 1 ? 'SKEWED' : 'NORMAL'}
            </Badge>
          </div>
          <div className="h-48 bg-bg-1 border border-border rounded-sm">
            <BoxPlot stats={s} />
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <h4 className="font-display text-[10px] text-text-muted uppercase">Statistical Interpretation</h4>
            <p className="font-narrative text-md leading-relaxed text-text-secondary">
              {selectedCol} exhibits a {Math.abs(s.skewness) > 1 ? 'highly skewed' : 'relatively normal'} distribution.
              With a mean of <span className="text-gold font-bold">{s.mean.toFixed(2)}</span> and standard deviation of <span className="text-gold font-bold">{s.stdDev.toFixed(2)}</span>,
              the data points are {s.stdDev / s.mean > 0.5 ? 'widely dispersed' : 'tightly clustered'}.
            </p>
          </div>
        </Card>
      </div>
    </motion.div>
  );
};
