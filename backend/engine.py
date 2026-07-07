import pandas as pd
import numpy as np
from scipy import stats
from typing import List, Dict, Any
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

class StatsEngine:
    @staticmethod
    def process_data(data: List[Dict[str, Any]]) -> Dict[str, Any]:
        df = pd.DataFrame(data)
        total_rows = len(df)
        

        for col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')
            
        # Identify column types after coercion
        all_numeric = df.select_dtypes(include=[np.number]).columns.tolist()
        categorical = df.select_dtypes(exclude=[np.number]).columns.tolist()
        columns = df.columns.tolist()
        
        # Filter for "useful" numeric columns
        numeric_columns = []
        id_keywords = ['id', 'uid', 'code', 'index', 'pk', 'fk', 'sl_no', 'slno', 'serial', 'key']
        
        for col in all_numeric:
            if df[col].isna().all(): continue # Skip fully empty columns
            name_lower = col.lower()
            if any(key in name_lower for key in id_keywords): continue
            if df[col].nunique() == total_rows and total_rows > 10: continue
            if df[col].std() == 0: continue
            numeric_columns.append(col)
            
        if not numeric_columns:
            numeric_columns = all_numeric

        numeric_df = df[numeric_columns].fillna(0)
        
        # --- CLUSTERING ---
        clusters = []
        if len(numeric_columns) >= 2 and total_rows > 10:
            try:
                scaler = StandardScaler()
                scaled_data = scaler.fit_transform(numeric_df)
                kmeans = KMeans(n_clusters=min(3, total_rows), n_init=10, random_state=42)
                df['__cluster'] = kmeans.fit_predict(scaled_data)
                
                for i in range(kmeans.n_clusters):
                    c_df = df[df['__cluster'] == i]
                    clusters.append({
                        "id": i,
                        "size": len(c_df),
                        "percent": (len(c_df) / total_rows) * 100,
                        "label": f"Segment {i+1}",
                        "variance": sanitize(c_df[numeric_columns].std().mean())
                    })
            except:
                pass

        stats_dict = {}
        anomalies = []

        def sanitize(val):
            if pd.isna(val) or np.isinf(val): return 0
            return float(val)
        
        for col in numeric_columns:
            series = df[col].dropna()
            if series.empty: continue
                
            mean = float(series.mean())
            std = float(series.std())
            
            # Distribution Breakdown (Buckets)
            q25, q50, q75 = series.quantile([0.25, 0.5, 0.75])
            buckets = [
                {"label": "Low", "count": int(len(series[series <= q25])), "percent": (len(series[series <= q25]) / len(series)) * 100},
                {"label": "Mid", "count": int(len(series[(series > q25) & (series <= q75)])), "percent": (len(series[(series > q25) & (series <= q75)]) / len(series)) * 100},
                {"label": "High", "count": int(len(series[series > q75])), "percent": (len(series[series > q75]) / len(series)) * 100},
            ]

            stats_dict[col] = {
                "mean": sanitize(mean),
                "median": sanitize(q50),
                "stdDev": sanitize(std),
                "cv": sanitize(std / mean) if mean != 0 else 0,
                "skewness": sanitize(series.skew()),
                "kurtosis": sanitize(series.kurtosis()),
                "min": sanitize(series.min()),
                "max": sanitize(series.max()),
                "buckets": buckets,
                "n": len(series),
                "nulls": int(df[col].isna().sum())
            }
            
            # Anomaly Detection + Root Cause Patterning
            if std > 0:
                z_scores = (series - mean) / std
                outlier_indices = series[abs(z_scores) > 2.5].index
                
                for idx in outlier_indices:
                    val = series[idx]
                    anomaly_entry = {
                        "row": int(idx),
                        "col": col,
                        "val": sanitize(val),
                        "z": sanitize(z_scores[idx]),
                        "mean": sanitize(mean)
                    }
                    
                    # Try to find a "source" or "batch" pattern for this anomaly
                    potential_causes = {}
                    for cat_col in categorical:
                        if df[cat_col].nunique() < 20: # Low cardinality check
                            potential_causes[cat_col] = str(df.loc[idx, cat_col])
                    
                    anomaly_entry["context"] = potential_causes
                    anomalies.append(anomaly_entry)
        
        corr_matrix = numeric_df.corr().fillna(0).to_dict()
        
        return {
            "stats": stats_dict,
            "anomalies": anomalies,
            "columns": columns,
            "numericColumns": numeric_columns,
            "correlations": corr_matrix,
            "clusters": clusters,
            "totalRows": total_rows
        }
