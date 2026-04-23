import React, { useState } from 'react';
import { useStore } from '../../store';
import { Card, Button } from '../ui';
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
      (token) => setNarrative((prev: string) => prev + token),
      () => setIsGenerating(false),
      (err) => {
        console.error(err);
        setIsGenerating(false);
        setNarrative("## Narrative Engine Error\nPlease verify API connectivity or Groq API Key configuration.");
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 h-full overflow-hidden">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {(['executive', 'analyst'] as const).map(m => (
            <button 
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all ${mode === m ? 'bg-gold text-bg-0' : 'bg-bg-3 text-text-muted hover:text-text-secondary'}`}
            >
              {m.toUpperCase()} MODE
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Copy} onClick={() => navigator.clipboard.writeText(narrative)}>Copy</Button>
          <Button variant="filled" icon={RotateCcw} onClick={generate} disabled={isGenerating || !analysis}>
            {isGenerating ? 'Generating...' : 'Regenerate'}
          </Button>
        </div>
      </div>

      <Card className="flex-1 overflow-auto bg-bg-1 border-l-2 border-l-gold relative">
        <div className="p-8 font-narrative text-lg leading-relaxed text-text-primary">
          <div className="border-b border-border pb-6 mb-8">
            <h1 className="font-display text-2xl text-gold uppercase tracking-tighter mb-2">Analysis Report</h1>
            <div className="flex gap-4 text-[10px] font-mono text-text-muted uppercase">
              <span>Source: {filename}</span>
              <span>•</span>
              <span>Model: Llama-3.3-70b</span>
            </div>
          </div>
          
          <AnimatePresence>
            {isGenerating && !narrative && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="h-4 bg-bg-3 rounded w-3/4 shimmer"></div>
                <div className="h-4 bg-bg-3 rounded w-full shimmer"></div>
                <div className="h-4 bg-bg-3 rounded w-1/2 shimmer"></div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:text-gold prose-mark:bg-gold/20 prose-mark:text-gold prose-strong:text-gold prose-p:mb-6">
            <ReactMarkdown>{narrative || "Click 'Regenerate' to produce a structural narrative using the Groq LLM engine."}</ReactMarkdown>
          </div>
        </div>
      </Card>
      
      <div className="flex items-center gap-4 text-[9px] font-mono text-text-muted px-2 py-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-gold animate-pulse' : 'bg-accent-success'}`}></div>
          <span>GROQ CLOUD API</span>
        </div>
        <span>•</span>
        <span>SSE STREAMING ACTIVE</span>
      </div>
    </div>
  );
};
