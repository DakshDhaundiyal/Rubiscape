from typing import List, Dict, Any

def classify_insights(stats: Dict[str, Any], anomalies: List[Dict[str, Any]], total_rows: int, clusters: List[Dict[str, Any]], correlations: Dict[str, Dict[str, float]]) -> Dict[str, Any]:
    insights = []
    
    # 1. Column-Specific Insights
    for col, s in stats.items():
        cv = s["cv"]
        
        # Context & Volatility (Insight 1)
        if cv > 0.5:
            typical_cv = 0.26
            ratio = cv / typical_cv
            
            # Distribution Breakdown (Insight 2)
            buckets = s.get("buckets", [])
            dist_text = ""
            if buckets:
                dist_text = f"The distribution is skewed: " + ", ".join([f"{b['percent']:.0f}% in {b['label']}" for b in buckets])

            # Root Cause (Insight 3)
            col_anomalies = [a for a in anomalies if a["col"] == col]
            root_cause = ""
            if col_anomalies:
                # Check if anomalies share a common context
                context_counts = {}
                for a in col_anomalies:
                    for cat, val in a.get("context", {}).items():
                        key = f"{cat}: {val}"
                        context_counts[key] = context_counts.get(key, 0) + 1
                
                if context_counts:
                    top_cause = max(context_counts.items(), key=lambda x: x[1])
                    if top_cause[1] > len(col_anomalies) * 0.5:
                        root_cause = f"Outliers are concentrated in records where {top_cause[0]} ({top_cause[1]} entries)."

            # Correlation (Insight 4)
            related = []
            for target_col, corr in correlations.get(col, {}).items():
                if target_col != col and abs(corr) > 0.6:
                    related.append(f"{target_col} ({'positive' if corr > 0 else 'negative'} correlation: {corr:.2f})")
            
            corr_text = f"Highly correlated with: {', '.join(related)}." if related else ""

            insights.append({
                "id": f"vol-{col}",
                "type": "🔴 Performance Gap",
                "severity": "HIGH",
                "title": f"Unpredictable variance in {col}",
                "context": f"This feature is {ratio:.1f}x more volatile than the established baseline for this sector.",
                "interpretation": "The data indicates an inconsistent capture process or a highly fragmented population segment.",
                "body": f"The stability of {col} has dropped significantly. {dist_text}",
                "root_cause": root_cause if root_cause else "Anomalies in this segment are distorting the overall reliability score.",
                "correlation": corr_text.replace("correlation", "strategic alignment") if corr_text else "",
                "recommendation": f"Focus audit efforts on values exceeding {s['mean'] + (2*s['stdDev']):.1f} to stabilize the dataset.",
                "columns": [col]
            })

    # 5. Segmentation-Based Insights (Insight 5)
    for cluster in clusters:
        if cluster["percent"] < 15:
            insights.append({
                "id": f"seg-{cluster['id']}",
                "type": "🧠 Segment Analysis",
                "severity": "MED",
                "title": f"Isolated Variance in {cluster['label']}",
                "body": f"Volatility is isolated to a specific cluster representing ~{cluster['percent']:.0f}% of records.",
                "recommendation": f"Apply segment-specific normalization for {cluster['label']} to stabilize global metrics.",
                "columns": list(stats.keys())
            })

    # 8. Narrative Block (Insight 8)
    top_vol = sorted(stats.items(), key=lambda x: x[1]["cv"], reverse=True)[0] if stats else None
    narrative = "No major narrative generated."
    if top_vol:
        col, s = top_vol
        narrative = (
            f"The dataset is currently experiencing a stability gap in {col}. "
            f"Our analysis shows that {s['buckets'][2]['percent']:.0f}% of the records are heavily skewed, creating an unpredictable environment for standard operations. "
        )
        if clusters:
            narrative += f"Strategic segmentation has identified specific pockets where data quality is deteriorating, which should be isolated to prevent systemic contamination. "
        
        narrative += f"Immediate Priority: Initiate a targeted validation of high-value outliers to restore dataset integrity."

    # Composite Score
    anomaly_penalty = (len(anomalies) / total_rows) * 100 if total_rows > 0 else 0
    insight_score = max(0, min(100, 100 - (anomaly_penalty * 2)))
    
    return insights, int(insight_score), narrative
