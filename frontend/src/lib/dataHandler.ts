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
    const csvText = await response.text();
    
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      quoteChar: '', // Disable quote handling to prevent truncation on "dirty" data
      complete: (results) => {
        handleDataLoad(results.data, 'sample_data.csv');
      }
    });
  } catch (e) {
    updateProgress('Fetch Error', 0);
  }
};
