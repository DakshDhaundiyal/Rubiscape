import Papa from 'papaparse';
import { processData } from './api';
import { useStore } from '../store';

export const handleDataLoad = async (data: any[], name: string) => {
  const { setDataset, setAnalysis, updateProgress } = useStore.getState();

  updateProgress('Parsing...', 20);
  setDataset(data, name);

  updateProgress('Processing Engine...', 50);
  try {
    const analysis = await processData(data);
    setAnalysis(analysis);
    updateProgress('Analysis Ready', 100);
  } catch (e) {
    updateProgress('Engine Error', 0);
    console.error('Data processing error:', e);
  }
};

export const loadSampleData = async () => {
  const { updateProgress } = useStore.getState();
  updateProgress('Fetching Sample...', 10);

  try {
    const response = await fetch('/sample_data.csv');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();

    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        handleDataLoad(results.data, 'sample_data.csv');
      },
      error: (err: Error) => {
        console.error('CSV parse error:', err);
        updateProgress('Parse Error', 0);
      }
    });
  } catch (e) {
    console.error('Sample data fetch error:', e);
    updateProgress('Fetch Error', 0);
  }
};
