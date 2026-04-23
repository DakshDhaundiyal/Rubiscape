export interface StatSummary {
  mean: number;
  median: number;
  stdDev: number;
  cv: number;
  skewness: number;
  kurtosis: number;
  nulls: number;
  min: number;
  max: number;
  n: number;
  buckets?: Array<{ label: string; count: number; percent: number }>;
}

export interface Anomaly {
  row: number;
  col: string;
  val: number;
  z: number;
  mean: number;
}

export interface Insight {
  id: string;
  type: string;
  severity: 'LOW' | 'MED' | 'HIGH' | 'CRITICAL';
  title: string;
  body: string;
  recommendation: string;
  columns: string[];
  context?: string;
  interpretation?: string;
  root_cause?: string;
  correlation?: string;
}

export interface ProcessResponse {
  stats: Record<string, StatSummary>;
  anomalies: Anomaly[];
  columns: string[];
  numericColumns: string[];
  insights: Insight[];
  insightScore: number;
  correlations: Record<string, Record<string, number>>;
  totalRows: number;
  narrativeBlock?: string;
}

export type PanelType = 'overview' | 'stats' | 'anomaly' | 'insights' | 'narrative' | 'query';
export type NarrativeMode = 'executive' | 'analyst';
