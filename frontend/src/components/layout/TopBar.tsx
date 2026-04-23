import React from 'react';
import { useStore } from '../../store';
import { motion } from 'framer-motion';
import type { PanelType } from '../../types';

export const TopBar: React.FC = () => {
  const { activePanel, setActivePanel, filename } = useStore();

  const tabs: { id: PanelType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'stats', label: 'Statistical Engine' },
    { id: 'anomaly', label: 'Anomaly Radar' },
    { id: 'insights', label: 'Insights' },
    { id: 'narrative', label: 'Narrative' },
    { id: 'query', label: 'Query' },
  ];

  return (
    <header className="h-[56px] bg-bg-1 border-b border-border flex items-center px-4 z-50">
      <div className="flex items-center gap-3 w-[204px]">
        <div className="w-6 h-6 bg-gold text-bg-0 flex items-center justify-center font-black rounded-sm text-sm">N</div>
        <span className="font-display font-bold text-xs uppercase tracking-tight text-text-primary">Narrative Analytics</span>
      </div>

      <nav className="flex h-full ml-10 flex-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            className={`px-4 h-full text-[10px] font-bold uppercase tracking-widest transition-all relative ${
              activePanel === tab.id ? 'text-gold' : 'text-text-secondary hover:text-text-primary hover:bg-bg-2'
            }`}
          >
            {tab.label}
            {activePanel === tab.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold shadow-[0_0_8px_var(--gold)]" 
              />
            )}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-bg-3 px-3 py-1 rounded-full border border-border">
          <div className="w-1.5 h-1.5 bg-accent-success rounded-full animate-pulse shadow-[0_0_8px_var(--success)]"></div>
          <span className="text-[10px] font-mono text-text-secondary uppercase">Groq · Llama3.3</span>
        </div>
        <div className="flex items-center gap-2 bg-bg-3 px-3 py-1 rounded-full border border-border">
          <span className="text-[10px] font-mono text-text-primary uppercase max-w-[120px] truncate">{filename || 'No File'}</span>
        </div>
      </div>
    </header>
  );
};
