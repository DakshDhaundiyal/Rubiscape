from typing import List, Dict, Any

def _fmt(val: float) -> str:
    """Format a number for display: currency-style with K/M suffix."""
    if abs(val) >= 1_000_000:
        return f"${val/1_000_000:.1f}M"
    if abs(val) >= 1_000:
        return f"${val/1_000:.1f}K"
    return f"{val:.2f}"

def classify_insights(
    stats: Dict[str, Any],
    anomalies: List[Dict[str, Any]],
    total_rows: int,
    clusters: List[Dict[str, Any]],
    correlations: Dict[str, Dict[str, float]]
) -> tuple:
    insights = []
    used_pairs = set()

    # ── 1. HIGH VOLATILITY — CV > 0.5 ─────────────────────────────────────────
    for col, s in stats.items():
        cv = s["cv"]
        if cv <= 0.5:
            continue

        mean    = s["mean"]
        std     = s["stdDev"]
        thresh  = mean + 2 * std
        col_anomalies = [a for a in anomalies if a["col"] == col]
        n_outliers = len(col_anomalies)

        # Build root cause from context patterns
        root_cause = ""
        if col_anomalies:
            context_counts: Dict[str, int] = {}
            for a in col_anomalies:
                for cat, val in a.get("context", {}).items():
                    key = f"{cat} = {val}"
                    context_counts[key] = context_counts.get(key, 0) + 1
            if context_counts:
                top_k, top_v = max(context_counts.items(), key=lambda x: x[1])
                if top_v >= max(1, len(col_anomalies) * 0.4):
                    root_cause = (
                        f"{top_v} of the {n_outliers} flagged records share the same "
                        f"attribute: {top_k}. This category may be driving the instability."
                    )
        if not root_cause and n_outliers > 0:
            root_cause = (
                f"{n_outliers} record{'s' if n_outliers > 1 else ''} fell outside the "
                f"normal corridor (above {_fmt(thresh)}). Review these entries first."
            )
        elif not root_cause:
            root_cause = (
                f"No single category dominates. The spread is broad — consider "
                f"segmenting this metric by another attribute to isolate the cause."
            )

        # Skew context
        skew = s.get("skewness", 0)
        skew_note = ""
        if abs(skew) > 1.0:
            direction = "upward (a few very high values inflate the average)" if skew > 0 else "downward (a few very low values drag the average down)"
            skew_note = f" The distribution is skewed {direction}."

        swing_pct = int(cv * 100)

        insights.append({
            "id": f"vol-{col}",
            "type": "Volatility",
            "severity": "HIGH" if cv > 1.0 else "MED",
            "title": f"{col} swings {swing_pct}% from its average",
            "body": (
                f"The typical value for {col} is {_fmt(mean)}, but entries vary by "
                f"±{_fmt(std)} on average — a {swing_pct}% swing.{skew_note} "
                f"This level of inconsistency makes forecasting unreliable."
            ),
            "root_cause": root_cause,
            "correlation": "",
            "recommendation": (
                f"Flag all {col} values above {_fmt(thresh)} for manual review. "
                f"Then investigate whether a single customer segment, time period, "
                f"or product category is responsible for the extreme values."
            ),
            "columns": [col]
        })

    # ── 2. STRONG CORRELATIONS — r > 0.7 ──────────────────────────────────────
    for col_a, peers in correlations.items():
        if col_a not in stats:
            continue
        for col_b, r in peers.items():
            if col_b not in stats or col_a == col_b:
                continue
            pair = tuple(sorted([col_a, col_b]))
            if pair in used_pairs or abs(r) < 0.7:
                continue
            used_pairs.add(pair)

            direction = "rises" if r > 0 else "falls"
            strength  = "very strongly" if abs(r) > 0.9 else "strongly"
            r_label   = f"{abs(r):.2f}"

            insights.append({
                "id": f"corr-{col_a}-{col_b}",
                "type": "Linked Metrics",
                "severity": "MED",
                "title": f"When {col_a} goes up, {col_b} {direction} with it",
                "body": (
                    f"These two metrics move {strength} together (link strength: {r_label} out of 1.0). "
                    f"A change in one is a reliable early signal for a change in the other."
                ),
                "root_cause": (
                    f"This connection could reflect a real business relationship — "
                    f"for example, higher {col_a} may drive {col_b}, or both may be "
                    f"influenced by a third factor you haven't measured yet."
                ),
                "correlation": f"r = {r:.2f}",
                "recommendation": (
                    f"Use {col_a} as a leading indicator. When it moves sharply, "
                    f"proactively check {col_b} before the impact fully shows up in your reports."
                ),
                "columns": [col_a, col_b]
            })

    # ── 3. SKEW WITHOUT HIGH CV — hidden average distortion ───────────────────
    for col, s in stats.items():
        skew = s.get("skewness", 0)
        mean = s["mean"]
        median = s["median"]
        cv = s["cv"]
        if abs(skew) < 1.5 or cv > 0.5:  # already caught by volatility insight
            continue

        gap_pct = abs(mean - median) / abs(mean) * 100 if mean != 0 else 0
        if gap_pct < 8:
            continue

        direction_word = "inflated" if mean > median else "suppressed"
        extreme_word   = "high outliers" if mean > median else "low outliers"

        insights.append({
            "id": f"skew-{col}",
            "type": "Distorted Average",
            "severity": "MED",
            "title": f"The average {col} is misleading — {extreme_word} skew it",
            "body": (
                f"The average is {_fmt(mean)}, but the midpoint value is {_fmt(median)} — "
                f"a gap of {gap_pct:.1f}%. This means your reported average is "
                f"{direction_word} by a small number of extreme records. "
                f"Most of your data actually sits closer to {_fmt(median)}."
            ),
            "root_cause": (
                f"A handful of very {'high' if mean > median else 'low'} values are "
                f"pulling the average away from where most of your data actually sits. "
                f"This is a common pattern when a small segment behaves very differently from the rest."
            ),
            "correlation": "",
            "recommendation": (
                f"Use the midpoint value ({_fmt(median)}) instead of the average when "
                f"reporting {col} to executives. The average overstates "
                f"{'performance' if mean > median else 'weakness'} for most records."
            ),
            "columns": [col]
        })

    # ── 4. HIGH NULL RATES — missing data risk ────────────────────────────────
    for col, s in stats.items():
        n       = s.get("n", 0)
        nulls   = s.get("nulls", 0)
        if n == 0:
            continue
        null_pct = nulls / (n + nulls) * 100 if (n + nulls) > 0 else 0
        if null_pct < 5:
            continue

        insights.append({
            "id": f"null-{col}",
            "type": "Missing Data",
            "severity": "HIGH" if null_pct > 20 else "MED",
            "title": f"{null_pct:.0f}% of {col} entries are missing",
            "body": (
                f"Out of {n + nulls:,} records, {nulls:,} have no value for {col}. "
                f"That is {null_pct:.1f}% of your dataset. Any analysis that uses "
                f"this metric is working with an incomplete picture."
            ),
            "root_cause": (
                f"Missing values can occur due to optional fields in a form, "
                f"failed data imports, or records from a period before this metric was tracked. "
                f"You should understand whether the absence of data itself carries meaning."
            ),
            "correlation": "",
            "recommendation": (
                f"Decide on a strategy: either fill in missing {col} values using "
                f"the midpoint ({_fmt(s['median'])}) as a neutral estimate, "
                f"or flag these {nulls:,} records separately so they don't silently "
                f"distort your totals."
            ),
            "columns": [col]
        })

    # ── 5. ANOMALY CONCENTRATION — many outliers in one metric ───────────────
    anomaly_counts: Dict[str, int] = {}
    for a in anomalies:
        anomaly_counts[a["col"]] = anomaly_counts.get(a["col"], 0) + 1

    for col, count in anomaly_counts.items():
        if col not in stats or count < 3:
            continue
        s = stats[col]
        pct = count / total_rows * 100 if total_rows > 0 else 0
        # Skip if already covered by volatility insight (cv > 0.5)
        if s["cv"] > 0.5:
            continue

        insights.append({
            "id": f"anom-{col}",
            "type": "Anomaly Cluster",
            "severity": "HIGH",
            "title": f"{count} unusual {col} records need your attention",
            "body": (
                f"{count} records ({pct:.1f}% of your data) have {col} values "
                f"that fall well outside the normal range. "
                f"The average is {_fmt(s['mean'])}, but these records sit far beyond "
                f"the expected corridor of {_fmt(s['mean'] - 2*s['stdDev'])} – {_fmt(s['mean'] + 2*s['stdDev'])}."
            ),
            "root_cause": (
                f"Concentrated anomalies in an otherwise stable metric often signal "
                f"a data entry error, a one-time event (promotion, refund batch, system glitch), "
                f"or a specific customer/product segment behaving very differently."
            ),
            "correlation": "",
            "recommendation": (
                f"Pull the {count} flagged {col} records and look for what they share in common — "
                f"same date, same region, same customer type. The pattern will reveal the source."
            ),
            "columns": [col]
        })

    # ── Sort: critical first, then HIGH, then MED/LOW ─────────────────────────
    severity_order = {"CRITICAL": 0, "HIGH": 1, "MED": 2, "LOW": 3}
    insights.sort(key=lambda x: severity_order.get(x.get("severity", "LOW"), 3))

    # ── Narrative block ────────────────────────────────────────────────────────
    high_count = sum(1 for i in insights if i["severity"] in ("HIGH", "CRITICAL"))
    med_count  = sum(1 for i in insights if i["severity"] == "MED")

    top_vol = sorted(stats.items(), key=lambda x: x[1]["cv"], reverse=True)
    top_col, top_s = top_vol[0] if top_vol else (None, None)

    if top_col:
        narrative = (
            f"Your dataset contains {total_rows:,} records across {len(stats)} numeric metrics. "
            f"The analysis found {high_count} issue{'s' if high_count != 1 else ''} that need immediate attention "
            f"and {med_count} area{'s' if med_count != 1 else ''} worth monitoring. "
            f"The biggest concern right now is {top_col}, which swings {int(top_s['cv']*100)}% from its average — "
            f"meaning the typical entry deviates by {_fmt(top_s['stdDev'])} from the expected {_fmt(top_s['mean'])}. "
        )
        if anomalies:
            narrative += (
                f"Across all metrics, {len(anomalies)} individual records were flagged as highly unusual. "
            )
        if high_count == 0:
            narrative = (
                f"Your dataset of {total_rows:,} records looks broadly healthy. "
                f"No critical issues were detected. "
                f"There are {med_count} pattern{'s' if med_count != 1 else ''} worth your awareness, "
                f"but nothing that requires urgent action right now."
            )
    else:
        narrative = "Upload a dataset to generate insights."

    # ── Composite Score ────────────────────────────────────────────────────────
    anomaly_penalty = (len(anomalies) / total_rows) * 100 if total_rows > 0 else 0
    insight_score   = max(0, min(100, 100 - (anomaly_penalty * 2)))

    return insights, int(insight_score), narrative
