import type { ProcessResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const processData = async (data: any[]): Promise<ProcessResponse> => {
  const res = await fetch(`${API_BASE}/api/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  if (!res.ok) throw new Error('Processing failed');
  return res.json();
};

export const streamNarrative = (
  stats: any, 
  insights: any, 
  mode: string, 
  onToken: (token: string) => void,
  onComplete: () => void,
  onError: (err: any) => void
) => {
  const ctrl = new AbortController();
  
  fetch(`${API_BASE}/api/narrative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stats, insights, mode }),
    signal: ctrl.signal
  }).then(async (res) => {
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const content = line.slice(6).trim();
          if (content === '[DONE]') {
            onComplete();
            return;
          }
          try {
            const data = JSON.parse(content);
            if (data.token) onToken(data.token);
            if (data.error) onError(data.error);
          } catch (e) {
            // Partial JSON or heartbeat
          }
        }
      }
    }
  }).catch(onError);

  return () => ctrl.abort();
};

export const askQuery = async (question: string, context: any) => {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context })
  });
  return res.json();
};

export const pingBackend = () => fetch(`${API_BASE}/ping`);
