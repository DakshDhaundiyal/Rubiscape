import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { askQuery } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Terminal, Sparkles, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { tryLocalQuery } from '../../lib/localQueryEngine';

interface Message {
  role: 'user' | 'ai';
  content: string;
  source?: 'local' | 'ai';
}

export const QueryPanel: React.FC = () => {
  const { analysis, dataset } = useStore();
  const [query,     setQuery]     = useState('');
  const [history,   setHistory]   = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [history, isLoading]);

  const handleSend = async () => {
    if (!query.trim() || !analysis || isLoading) return;

    const userMsg = query.trim();
    setHistory((prev) => [...prev, { role: 'user', content: userMsg }]);
    setQuery('');
    setIsLoading(true);

    try {
      // ── Hybrid: try local data engine first ──────────────────────────────
      const localAnswer = dataset
        ? tryLocalQuery(userMsg, dataset, analysis.columns, analysis.stats)
        : null;

      if (localAnswer !== null) {
        // Instant answer from raw data — no AI call needed
        setHistory((prev) => [...prev, { role: 'ai', content: localAnswer, source: 'local' }]);
        setIsLoading(false);
        return;
      }

      // ── Fallback: complex/analytical question → AI ────────────────────────
      const res = await askQuery(userMsg, analysis);
      setHistory((prev) => [...prev, { role: 'ai', content: res.answer, source: 'ai' }]);
    } catch {
      setHistory((prev) => [
        ...prev,
        { role: 'ai', content: 'Failed to connect to the query engine. Please check API connectivity.', source: 'ai' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Chip fire helper ──────────────────────────────────────────────────────
  const fireChip = (msg: string, forceAI = false) => {
    if (isLoading) return;
    setHistory((prev) => [...prev, { role: 'user', content: msg }]);
    setIsLoading(true);

    if (!forceAI && dataset) {
      const local = tryLocalQuery(msg, dataset, analysis!.columns, analysis!.stats);
      if (local !== null) {
        setHistory((prev) => [...prev, { role: 'ai', content: local, source: 'local' }]);
        setIsLoading(false);
        return;
      }
    }
    askQuery(msg, analysis!)
      .then((res) => setHistory((prev) => [...prev, { role: 'ai', content: res.answer, source: 'ai' }]))
      .catch(() => setHistory((prev) => [...prev, { role: 'ai', content: 'Query failed.', source: 'ai' }]))
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="flex flex-col h-full gap-3 max-w-4xl mx-auto">

      {/* ── Message list ── */}
      <div
        ref={listRef}
        className="flex-1 overflow-auto space-y-5 pr-2 custom-scrollbar"
      >
        {/* Welcome message */}
        {history.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex justify-start"
          >
            <div
              className="rounded-lg p-5 max-w-[80%]"
              style={{
                background: 'var(--bio-card)',
                border: '1px solid var(--bio-border)',
                borderLeft: '2px solid var(--bio-purple)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} style={{ color: 'var(--bio-green)' }} />
                <span
                  className="text-[10px] font-bold font-mono uppercase tracking-widest"
                  style={{ color: 'var(--bio-green)' }}
                >
                  ARIA AI Agent
                </span>
              </div>
              <p className="font-narrative text-[15px] leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.7)' }}>
                Your data has been loaded and analyzed. Ask me anything — use the quick questions below or type your own.
              </p>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {history.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'user' ? (
                /* User bubble */
                <div
                  className="max-w-[75%] rounded-lg px-5 py-4"
                  style={{
                    background: 'var(--bio-card2)',
                    border: '1px solid var(--bio-border)',
                  }}
                >
                  <p className="font-mono text-sm leading-relaxed"
                    style={{ color: 'rgba(57,255,106,0.85)' }}>
                    {msg.content}
                  </p>
                </div>
              ) : (
                /* AI reply */
                <div
                  className="max-w-[80%] rounded-lg px-5 py-4"
                  style={{
                    background: 'var(--bio-card)',
                    border: '1px solid var(--bio-border)',
                    borderLeft: '2px solid var(--bio-purple)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {msg.source === 'local' ? (
                      <Zap size={13} style={{ color: 'var(--bio-green)' }} />
                    ) : (
                      <Sparkles size={13} style={{ color: 'var(--bio-green)' }} />
                    )}
                    <span
                      className="text-[9px] font-bold font-mono uppercase tracking-widest"
                      style={{ color: 'var(--bio-green)' }}
                    >
                      {msg.source === 'local' ? '⚡ Instant Data' : '✨ AI Analysis'}
                    </span>
                  </div>
                  <div className="font-narrative text-[14px] leading-relaxed prose-narrative"
                    style={{ color: 'rgba(255,255,255,0.75)' }}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex justify-start"
          >
            <div
              className="rounded-lg px-5 py-4 flex items-center gap-3"
              style={{
                background: 'var(--bio-card)',
                border: '1px solid var(--bio-border)',
                borderLeft: '2px solid var(--bio-purple)',
              }}
            >
              <Sparkles size={13} style={{ color: 'var(--bio-green)' }} />
              <span className="font-mono text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--bio-green)' }}>
                Analyzing your question
              </span>
              <motion.span
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                className="font-mono text-sm tracking-widest"
                style={{ color: 'var(--bio-green)' }}
              >
                ···
              </motion.span>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Persistent Quick Questions ── */}
      {analysis && (
        <div
          className="flex-shrink-0 rounded-lg px-4 py-3 space-y-2"
          style={{
            background: 'var(--bio-card)',
            border: '1px solid var(--bio-border)',
          }}
        >
          {/* ⚡ Instant Data row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Zap size={10} style={{ color: '#39ff6a' }} />
              <span className="text-[8px] font-bold font-mono uppercase tracking-widest"
                style={{ color: 'rgba(57,255,106,0.5)' }}>
                Instant
              </span>
            </div>
            {[
              'Who has the highest salary?',
              'Show top 5 by salary',
              'Average salary by department',
              'How many in each department?',
              'How many missing values?',
            ].map((chip) => (
              <button
                key={chip}
                disabled={isLoading}
                onClick={() => fireChip(chip)}
                className="text-[9px] font-mono px-2.5 py-1 rounded-full transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(57,255,106,0.07)',
                  border: '1px solid rgba(57,255,106,0.22)',
                  color: 'rgba(57,255,106,0.85)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = 'rgba(57,255,106,0.16)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(57,255,106,0.07)'; }}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

          {/* ✨ AI Analysis row */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Sparkles size={10} style={{ color: '#b44fff' }} />
              <span className="text-[8px] font-bold font-mono uppercase tracking-widest"
                style={{ color: 'rgba(180,79,255,0.55)' }}>
                AI
              </span>
            </div>
            {[
              'What are the biggest red flags?',
              'Which metric is most inconsistent?',
              'Summarize key findings',
              'Which entries should I review first?',
              'What trends should I watch?',
            ].map((chip) => (
              <button
                key={chip}
                disabled={isLoading}
                onClick={() => fireChip(chip, true)}
                className="text-[9px] font-mono px-2.5 py-1 rounded-full transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(180,79,255,0.07)',
                  border: '1px solid rgba(180,79,255,0.22)',
                  color: 'rgba(180,79,255,0.9)',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={(e) => { if (!isLoading) (e.currentTarget as HTMLElement).style.background = 'rgba(180,79,255,0.16)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(180,79,255,0.07)'; }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="relative group flex-shrink-0">
        <Terminal
          className="absolute left-5 top-1/2 -translate-y-1/2 z-20 transition-colors duration-200"
          size={18}
          style={{ color: 'rgba(57,255,106,0.5)' }}
        />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask anything about your data..."
          disabled={!analysis || isLoading}
          className="w-full py-4 pl-14 pr-16 font-mono text-sm focus:outline-none rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
          style={{
            background: 'var(--bio-card)',
            border: '1px solid var(--bio-border)',
            color: 'var(--text-primary)',
            caretColor: '#39ff6a',
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLElement).style.border = '1px solid rgba(57,255,106,0.6)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px rgba(57,255,106,0.08)';
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.border = '1px solid var(--bio-border)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        />

        {/* Placeholder color hack via CSS */}
        <style>{`
          input::placeholder { color: rgba(57,255,106,0.3); }
        `}</style>

        <motion.button
          onClick={handleSend}
          disabled={!query.trim() || !analysis || isLoading}
          whileHover={!isLoading ? { scale: 1.05 } : {}}
          whileTap={!isLoading  ? { scale: 0.95 } : {}}
          transition={{ duration: 0.1 }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-md z-20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{
            background: 'var(--bio-green)',
            color: 'var(--bio-black)',
          }}
          onMouseEnter={(e) => {
            if (!isLoading) (e.currentTarget as HTMLElement).style.background = 'rgba(57,255,106,0.85)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--bio-green)';
          }}
        >
          <Send size={15} />
        </motion.button>
      </div>

      {/* Context note */}
      {!analysis && (
        <p className="text-center font-mono text-[9px] uppercase tracking-widest"
          style={{ color: 'rgba(57,255,106,0.3)' }}>
          Load your data file to start asking questions
        </p>
      )}
    </div>
  );
};
