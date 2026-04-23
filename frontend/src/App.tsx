import React, { useState, useEffect } from 'react';
import { useStore } from './store';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewPanel } from './components/panels/OverviewPanel';
import { StatsPanel } from './components/panels/StatsPanel';
import { AnomalyPanel } from './components/panels/AnomalyPanel';
import { InsightsPanel } from './components/panels/InsightsPanel';
import { NarrativePanel } from './components/panels/NarrativePanel';
import { QueryPanel } from './components/panels/QueryPanel';
import { pingBackend } from './lib/api';
import { handleDataLoad } from './lib/dataHandler';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload } from 'lucide-react';
import Papa from 'papaparse';

const App: React.FC = () => {
  const { dataset, activePanel } = useStore();
  const [isDragging, setIsDragging] = useState(false);

  // Keep-alive Ping (14 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      pingBackend().catch(console.error);
    }, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      quoteChar: '', // Disable quote handling to prevent truncation
      complete: (results) => {
        handleDataLoad(results.data, file.name);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) handleFileUpload(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'overview': return <OverviewPanel />;
      case 'stats': return <StatsPanel />;
      case 'anomaly': return <AnomalyPanel />;
      case 'insights': return <InsightsPanel />;
      case 'narrative': return <NarrativePanel />;
      case 'query': return <QueryPanel />;
    }
  };

  return (
    <div 
      className="flex flex-col h-screen bg-bg-0 text-text-primary overflow-hidden"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePanel}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              {dataset ? renderPanel() : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-6">
                    <Upload size={48} className="mx-auto text-text-muted animate-pulse" />
                    <div className="space-y-2">
                      <h2 className="font-display text-xl text-text-secondary uppercase">Ingest Data for Analysis</h2>
                      <p className="font-mono text-[10px] text-text-muted">Drag & Drop CSV to initialize full-stack engine</p>
                    </div>
                    <div className="relative inline-block">
                      <input 
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileChange} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button className="bg-bg-3 border border-gold/40 text-gold px-6 py-2 rounded-sm font-display text-[10px] uppercase tracking-widest hover:bg-gold hover:text-bg-0 transition-all">
                        Select File Manually
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {isDragging && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gold/10 backdrop-blur-md z-[100] flex items-center justify-center p-12">
            <div className="w-full h-full border-4 border-dashed border-gold flex flex-col items-center justify-center gap-6 rounded-3xl bg-bg-0/80">
              <Upload size={64} className="text-gold animate-bounce" />
              <h2 className="font-display text-4xl text-text-primary uppercase">Drop Analysis Target</h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
