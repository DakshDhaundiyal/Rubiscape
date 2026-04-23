import React from 'react';
import { useStore } from '../../store';
import { Card, Badge } from '../ui';
import { AnomalyRadar } from '../charts/AnomalyRadar';
import { motion } from 'framer-motion';

export const AnomalyPanel: React.FC = () => {
  const { dataset, analysis } = useStore();

  if (!dataset || !analysis) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <Card className="h-[350px]">
        <AnomalyRadar data={dataset} stats={analysis.stats} cols={analysis.numericColumns} />
      </Card>

      <div className="border border-border rounded-sm bg-bg-2 overflow-hidden">
        <div className="max-h-[400px] overflow-auto">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-bg-3 text-text-secondary z-10">
              <tr>
                <th className="p-3 text-left">Row #</th>
                <th className="p-3 text-left">Column</th>
                <th className="p-3 text-left">Value</th>
                <th className="p-3 text-left">Mean</th>
                <th className="p-3 text-left">Z-Score</th>
                <th className="p-3 text-left">Severity</th>
              </tr>
            </thead>
            <tbody>
              {analysis.anomalies.map((an, i) => (
                <tr key={i} className="border-b border-border hover:bg-bg-3 transition-colors">
                  <td className="p-3 text-text-muted">{an.row}</td>
                  <td className="p-3 font-bold text-text-primary">{an.col}</td>
                  <td className="p-3">{an.val.toLocaleString()}</td>
                  <td className="p-3 text-text-muted">{an.mean.toFixed(2)}</td>
                  <td className="p-3 text-accent-danger font-black">{an.z.toFixed(2)}</td>
                  <td className="p-3">
                    <Badge variant="danger">CRITICAL</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
