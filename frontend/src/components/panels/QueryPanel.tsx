import React, { useState } from 'react';
import { useStore } from '../../store';
import { askQuery } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Terminal, Sparkles } from 'lucide-react';

export const QueryPanel: React.FC = () => {
  const { analysis } = useStore();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<Array<{ role: 'user' | 'ai'; content: string; confidence?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!query.trim() || !analysis) return;
    
    const userMsg = query;
    setHistory((prev: any[]) => [...prev, { role: 'user', content: userMsg }]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await askQuery(userMsg, analysis);
      setHistory((prev: any[]) => [...prev, { 
        role: 'ai', 
        content: res.answer,
        confidence: 'HIGH'
      }]);
    } catch (e) {
      setHistory((prev: any[]) => [...prev, { role: 'ai', content: "Failed to connect to the query engine." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 max-w-5xl mx-auto">
      <div className="flex-1 overflow-auto space-y-6 pr-4">
        <AnimatePresence>
          {history.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-sm p-4 relative ${
                msg.role === 'user' ? 'bg-bg-3 border border-border' : 'bg-bg-2 border-l-2 border-l-gold'
              }`}>
                {msg.role === 'ai' && (
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-gold">
                      <Sparkles size={14} />
                      <span className="text-[10px] font-bold tracking-widest uppercase">AI Agent</span>
                    </div>
                  </div>
                )}
                <p className={`${msg.role === 'user' ? 'font-display text-sm' : 'font-mono text-[13px]'} leading-relaxed text-text-primary`}>
                  {msg.content}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && <div className="text-gold font-mono text-[10px] animate-pulse">ANALYZING DATASET...</div>}
      </div>

      <div className="relative group">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about correlations, anomalies, or trends..."
          className="w-full bg-bg-1 border border-border focus:border-gold p-5 pl-14 font-mono text-sm text-text-primary focus:outline-none rounded-sm relative z-10"
        />
        <Terminal className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-gold transition-colors z-20" size={20} />
        <button onClick={handleSend} className="absolute right-5 top-1/2 -translate-y-1/2 bg-gold text-bg-0 w-8 h-8 flex items-center justify-center rounded-sm z-20">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
