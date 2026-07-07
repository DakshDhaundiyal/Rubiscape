import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from './store';
import { TopBar } from './components/layout/TopBar';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewPanel }  from './components/panels/OverviewPanel';
import { StatsPanel }     from './components/panels/StatsPanel';
import { AnomalyPanel }   from './components/panels/AnomalyPanel';
import { InsightsPanel }  from './components/panels/InsightsPanel';
import { NarrativePanel } from './components/panels/NarrativePanel';
import { QueryPanel }     from './components/panels/QueryPanel';
import { pingBackend }    from './lib/api';
import { handleDataLoad, loadSampleData } from './lib/dataHandler';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import Papa from 'papaparse';

// ─── Panel transition — membrane switch ──────────────────
const panelVariants = {
  initial: { opacity: 0, filter: 'blur(6px)',  scale: 0.985 },
  animate: { opacity: 1, filter: 'blur(0px)',  scale: 1,
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] as const } },
  exit:    { opacity: 0, filter: 'blur(4px)',  scale: 1.008,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const } },
};

// ─── Particle Canvas ─────────────────────────────────────
const ParticleCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef<number>(0);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    type Particle = { x: number; y: number; vx: number; vy: number; r: number; color: string };
    const BIO_GREEN  = 'rgba(57,255,106,';
    const BIO_PURPLE = 'rgba(180,79,255,';

    const particles: Particle[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r:  0.5 + Math.random() * 1.5,
      color: Math.random() > 0.3 ? BIO_GREEN : BIO_PURPLE,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            const alpha = (1 - dist / 90) * 0.18;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(57,255,106,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}0.7)`;
        ctx.fill();

        // Update
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();
  }, []);

  useEffect(() => {
    init();
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width  = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [init]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
};

// ─── Scanline Overlay ─────────────────────────────────────
const ScanlineOverlay: React.FC = () => (
  <>
    <div className="scanline-overlay" />
    <div className="scanline-beam" />
  </>
);

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
      header:        true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete:      (results) => handleDataLoad(results.data, file.name),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFileUpload(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'overview':  return <OverviewPanel  />;
      case 'stats':     return <StatsPanel     />;
      case 'anomaly':   return <AnomalyPanel   />;
      case 'insights':  return <InsightsPanel  />;
      case 'narrative': return <NarrativePanel />;
      case 'query':     return <QueryPanel     />;
    }
  };

  return (
    <div
      className="flex flex-col h-screen overflow-hidden relative"
      style={{ background: 'var(--bio-black)', color: 'var(--text-primary)' }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Living background */}
      <ParticleCanvas />
      <ScanlineOverlay />

      {/* UI shell */}
      <div className="relative z-10 flex flex-col h-full">
        <TopBar />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />

          <main
            className="flex-1 overflow-auto p-8 relative custom-scrollbar"
            style={{ background: 'transparent' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activePanel}
                variants={panelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="h-full"
              >
                {dataset ? renderPanel() : <EmptyState onFileChange={handleFileChange} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* ── Drag & Drop Overlay ── */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 backdrop-blur-md z-[100] flex items-center justify-center p-14"
            style={{ background: 'rgba(3,5,8,0.88)' }}
          >
            {/* Radial center glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at center, rgba(57,255,106,0.07) 0%, transparent 65%)',
              }}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1,    opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-6 scan-lines"
              style={{ borderColor: 'rgba(57,255,106,0.6)' }}
            >
              {/* Morphing organism glyph */}
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="relative w-24 h-24 morph-blob"
                style={{
                  position: 'relative',
                  width: 96,
                  height: 96,
                  background: 'radial-gradient(circle, rgba(57,255,106,0.2), transparent)',
                  animation: 'morph 6s ease-in-out infinite',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  className="font-display"
                  style={{
                    fontSize: 42,
                    color: '#39ff6a',
                    textShadow: '0 0 20px rgba(57,255,106,0.8), 0 0 60px rgba(57,255,106,0.3)',
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'node-pulse 2.2s ease-in-out infinite',
                  }}
                >
                  N
                </span>
              </motion.div>

              <h2 className="font-display text-3xl uppercase"
                style={{ color: '#39ff6a', letterSpacing: '0.2em', animation: 'node-pulse 2.2s ease-in-out infinite' }}>
                Drop Your CSV File Here
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: 'rgba(57,255,106,0.5)' }}>
                CSV · Release to start analysis
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Empty State ─────────────────────────────────────────
const EmptyState: React.FC<{ onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void }> = ({
  onFileChange,
}) => (
  <div className="h-full flex items-center justify-center">
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="text-center space-y-8 max-w-sm"
    >
      {/* Morphing organism glyph */}
      <div className="mx-auto" style={{ width: 96, height: 96, position: 'relative' }}>
        <div
          style={{
            width: 96, height: 96,
            background: 'radial-gradient(circle, rgba(57,255,106,0.12), transparent)',
            animation: 'morph 6s ease-in-out infinite',
            position: 'absolute',
            inset: 0,
          }}
        />
        {/* Pulse ring */}
        <motion.div
          animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          style={{
            position: 'absolute', inset: 0,
            border: '1px solid rgba(57,255,106,0.3)',
            borderRadius: '50%',
          }}
        />
        <span
          className="font-display"
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, color: '#39ff6a',
            animation: 'node-pulse 2.2s ease-in-out infinite',
          }}
        >
          N
        </span>
      </div>

      <div className="space-y-2">
        <h2 className="font-display text-xl uppercase"
          style={{ color: '#39ff6a', letterSpacing: '0.2em', animation: 'node-pulse 2.2s ease-in-out infinite' }}>
          Upload Your Data
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-widest"
          style={{ color: 'rgba(57,255,106,0.5)' }}>
          Drag &amp; drop CSV · or select below
        </p>
      </div>

      <div className="flex items-center gap-4 justify-center">
        {/* Manual file select */}
        <div className="relative inline-block">
          <input
            type="file"
            accept=".csv"
            onChange={onFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="font-mono text-[10px] uppercase tracking-widest px-5 py-2 rounded-sm transition-colors"
            style={{
              background: 'var(--bio-card)',
              border: '1px solid var(--bio-border)',
              color: 'rgba(57,255,106,0.7)',
            }}
          >
            Select File
          </motion.button>
        </div>

        {/* Sample dataset — bio-green shimmer button */}
        <motion.button
          onClick={loadSampleData}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.12 }}
          className="group relative flex items-center gap-2 px-5 py-2 rounded-sm overflow-hidden"
          style={{
            background: 'var(--bio-green-dim)',
            border: '1px solid rgba(57,255,106,0.4)',
            boxShadow: '0 0 16px rgba(57,255,106,0.1)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
          <Zap size={12} style={{ color: '#39ff6a' }} className="relative z-10" />
          <span className="text-[10px] font-bold font-mono uppercase tracking-widest relative z-10"
            style={{ color: '#39ff6a' }}>
            Sample Dataset
          </span>
        </motion.button>
      </div>

      <p className="font-mono text-[9px] uppercase tracking-widest"
        style={{ color: 'rgba(57,255,106,0.25)' }}>
        Ready · ARIA AI v2 · Groq Cloud
      </p>
    </motion.div>
  </div>
);

export default App;
