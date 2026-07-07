/**
 * localQueryEngine.ts
 * Answers factual questions directly from the raw dataset — no AI needed.
 * Returns null if the question is too complex/ambiguous, triggering AI fallback.
 */

type Row = Record<string, any>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtVal(val: any): string {
  if (val === null || val === undefined || val === '') return 'N/A';
  if (typeof val === 'number') {
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000)     return `${(val / 1_000).toFixed(1)}K`;
    return Number.isInteger(val) ? String(val) : val.toFixed(2);
  }
  return String(val);
}

function fmtRow(row: Row, labelCol: string | null, valueCol: string, value: any): string {
  const label = labelCol ? row[labelCol] ?? 'Unknown' : null;
  const rest = Object.entries(row)
    .filter(([k]) => k !== labelCol && k !== valueCol)
    .map(([k, v]) => `${k}: ${fmtVal(v)}`)
    .join(' | ');
  const who = label ? `**${label}**` : 'The record';
  return `${who} has a ${valueCol} of **${fmtVal(value)}**${rest ? `\n> ${rest}` : ''}`;
}

/** Find the column in the dataset that best matches a keyword from the question */
function findColumn(columns: string[], keyword: string): string | null {
  const k = keyword.toLowerCase();
  // Exact match first
  const exact = columns.find(c => c.toLowerCase() === k);
  if (exact) return exact;
  // Substring match
  const sub = columns.find(c => c.toLowerCase().includes(k) || k.includes(c.toLowerCase()));
  if (sub) return sub;
  return null;
}

/** Find the best "label" column — typically a name/ID/string column */
function findLabelColumn(columns: string[], rows: Row[]): string | null {
  // Prefer columns containing 'name', 'employee', 'id', 'person', 'label'
  const preferred = ['name', 'employee', 'id', 'person', 'label', 'title', 'item', 'product', 'customer'];
  for (const pref of preferred) {
    const col = columns.find(c => c.toLowerCase().includes(pref));
    if (col) return col;
  }
  // Fall back to first non-numeric column
  const firstStr = columns.find(c => {
    const sample = rows.slice(0, 10).map(r => r[c]).filter(v => v != null);
    return sample.some(v => typeof v === 'string');
  });
  return firstStr ?? null;
}

/** Find a numeric column that best matches a keyword */
function findNumericColumn(columns: string[], stats: Record<string, any>, keyword: string): string | null {
  const numericCols = Object.keys(stats);
  return findColumn(numericCols.length ? numericCols : columns, keyword);
}

/** Find a categorical column that best matches a keyword */
function findCategoryColumn(columns: string[], stats: Record<string, any>, keyword: string): string | null {
  // Category columns = those NOT in stats (non-numeric)
  const numericCols = new Set(Object.keys(stats));
  const catCols = columns.filter(c => !numericCols.has(c));
  return findColumn(catCols.length ? catCols : columns, keyword);
}

function numericRows(rows: Row[], col: string): Row[] {
  return rows.filter(r => r[col] != null && typeof r[col] === 'number' && !isNaN(r[col]));
}

// ── Pattern Matchers ─────────────────────────────────────────────────────────

export function tryLocalQuery(
  question: string,
  rows: Row[],
  columns: string[],
  stats: Record<string, any>
): string | null {
  if (!rows || rows.length === 0) return null;

  const q = question.toLowerCase().trim();
  const labelCol = findLabelColumn(columns, rows);

  // ── Keyword extraction helpers ─────────────────────────────
  // Extract a column name mentioned in the question
  function extractColFromQ(preferNumeric = true): string | null {
    // Try each column name as a substring match in the question
    const pool = preferNumeric ? Object.keys(stats) : columns;
    // Sort by length desc so longer/more specific names match first
    const sorted = [...pool].sort((a, b) => b.length - a.length);
    for (const col of sorted) {
      if (q.includes(col.toLowerCase().replace(/_/g, ' ')) ||
          q.includes(col.toLowerCase())) {
        return col;
      }
    }
    // Fallback keyword guessing
    const numericKeywords = ['salary', 'score', 'age', 'revenue', 'sales', 'price',
                             'profit', 'cost', 'amount', 'value', 'count', 'total',
                             'income', 'expense', 'experience', 'performance', 'rate'];
    for (const kw of numericKeywords) {
      if (q.includes(kw)) {
        const col = findNumericColumn(columns, stats, kw);
        if (col) return col;
      }
    }
    return null;
  }

  function extractCatColFromQ(): string | null {
    const catKeywords = ['department', 'team', 'category', 'type', 'group', 'location',
                         'region', 'status', 'role', 'gender', 'city', 'country', 'division'];
    for (const kw of catKeywords) {
      if (q.includes(kw)) {
        const col = findCategoryColumn(columns, stats, kw);
        if (col) return col;
      }
    }
    // Try all non-numeric cols
    const numericCols = new Set(Object.keys(stats));
    const catCols = columns.filter(c => !numericCols.has(c));
    for (const col of catCols) {
      if (q.includes(col.toLowerCase().replace(/_/g, ' ')) || q.includes(col.toLowerCase())) {
        return col;
      }
    }
    return null;
  }

  // ── 1. MAX — "who has the highest X" / "what is the max X" ──────────────
  if (/highest|maximum|max|most|largest|biggest|top/.test(q) &&
      !/top\s+\d/.test(q)) {
    const col = extractColFromQ(true);
    if (col) {
      const valid = numericRows(rows, col);
      if (!valid.length) return null;
      const best = valid.reduce((a, b) => a[col] > b[col] ? a : b);
      const label = labelCol ? `**${best[labelCol] ?? 'Unknown'}**` : 'The record';
      const details = Object.entries(best)
        .filter(([k]) => k !== col && k !== labelCol)
        .map(([k, v]) => `${k}: ${fmtVal(v)}`).join(' | ');
      return (
        `The highest **${col}** is **${fmtVal(best[col])}**, belonging to ${label}.\n` +
        (details ? `> ${details}` : '')
      ).trim();
    }
  }

  // ── 2. MIN — "who has the lowest X" / "what is the min X" ───────────────
  if (/lowest|minimum|min|least|smallest/.test(q)) {
    const col = extractColFromQ(true);
    if (col) {
      const valid = numericRows(rows, col);
      if (!valid.length) return null;
      const best = valid.reduce((a, b) => a[col] < b[col] ? a : b);
      const label = labelCol ? `**${best[labelCol] ?? 'Unknown'}**` : 'The record';
      const details = Object.entries(best)
        .filter(([k]) => k !== col && k !== labelCol)
        .map(([k, v]) => `${k}: ${fmtVal(v)}`).join(' | ');
      return (
        `The lowest **${col}** is **${fmtVal(best[col])}**, belonging to ${label}.\n` +
        (details ? `> ${details}` : '')
      ).trim();
    }
  }

  // ── 3. AVERAGE — "what is the average/mean X" ───────────────────────────
  if (/average|mean|avg/.test(q)) {
    const col = extractColFromQ(true);
    if (col) {
      const valid = numericRows(rows, col);
      if (!valid.length) return null;
      const avg = valid.reduce((s, r) => s + r[col], 0) / valid.length;
      return `The average **${col}** across ${valid.length.toLocaleString()} records is **${fmtVal(avg)}**.`;
    }
  }

  // ── 4. TOTAL/SUM — "what is the total/sum X" ────────────────────────────
  if (/total|sum/.test(q)) {
    const col = extractColFromQ(true);
    if (col) {
      const valid = numericRows(rows, col);
      if (!valid.length) return null;
      const total = valid.reduce((s, r) => s + r[col], 0);
      return `The total **${col}** across ${valid.length.toLocaleString()} records is **${fmtVal(total)}**.`;
    }
  }

  // ── 5. COUNT — "how many rows/records/employees" ────────────────────────
  if (/how many|count|number of/.test(q)) {
    // "how many in [category]?"
    const catCol = extractCatColFromQ();
    if (catCol) {
      // Count per group
      const groups: Record<string, number> = {};
      for (const row of rows) {
        const v = String(row[catCol] ?? 'Unknown');
        groups[v] = (groups[v] ?? 0) + 1;
      }
      const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]);
      const lines = sorted.map(([g, n]) => `- **${g}**: ${n.toLocaleString()} records`).join('\n');
      return `**${catCol}** breakdown (${rows.length.toLocaleString()} total records):\n${lines}`;
    }
    // Just total count
    if (/row|record|entr|employee|person|people/.test(q)) {
      return `There are **${rows.length.toLocaleString()} records** in this dataset.`;
    }
  }

  // ── 6. TOP N — "show top 5 by salary" ───────────────────────────────────
  const topMatch = q.match(/top\s+(\d+)/);
  if (topMatch) {
    const n = Math.min(parseInt(topMatch[1], 10), 20);
    const col = extractColFromQ(true);
    if (col) {
      const valid = numericRows(rows, col);
      const sorted = [...valid].sort((a, b) => b[col] - a[col]).slice(0, n);
      const lines = sorted.map((r, i) => {
        const label = labelCol ? `${r[labelCol] ?? 'Unknown'}` : `Record ${i + 1}`;
        return `${i + 1}. **${label}** — ${col}: **${fmtVal(r[col])}**`;
      }).join('\n');
      return `**Top ${n} by ${col}:**\n${lines}`;
    }
  }

  // ── 7. BOTTOM N — "show bottom 5 by salary" ─────────────────────────────
  const bottomMatch = q.match(/bottom\s+(\d+)|worst\s+(\d+)|lowest\s+(\d+)/);
  if (bottomMatch) {
    const n = Math.min(parseInt(bottomMatch[1] || bottomMatch[2] || bottomMatch[3], 10), 20);
    const col = extractColFromQ(true);
    if (col) {
      const valid = numericRows(rows, col);
      const sorted = [...valid].sort((a, b) => a[col] - b[col]).slice(0, n);
      const lines = sorted.map((r, i) => {
        const label = labelCol ? `${r[labelCol] ?? 'Unknown'}` : `Record ${i + 1}`;
        return `${i + 1}. **${label}** — ${col}: **${fmtVal(r[col])}**`;
      }).join('\n');
      return `**Bottom ${n} by ${col}:**\n${lines}`;
    }
  }

  // ── 8. GROUP AVERAGE — "average salary by department" ───────────────────
  if (/by\s+\w+/.test(q) && /average|mean|avg|total|sum|highest|max/.test(q)) {
    const numCol = extractColFromQ(true);
    const catCol = extractCatColFromQ();
    if (numCol && catCol) {
      const groups: Record<string, number[]> = {};
      for (const row of rows) {
        const v = String(row[catCol] ?? 'Unknown');
        const n = row[numCol];
        if (typeof n === 'number' && !isNaN(n)) {
          if (!groups[v]) groups[v] = [];
          groups[v].push(n);
        }
      }
      const isTotal = /total|sum/.test(q);
      const computed = Object.entries(groups).map(([g, vals]) => ({
        group: g,
        value: isTotal ? vals.reduce((s, v) => s + v, 0) : vals.reduce((s, v) => s + v, 0) / vals.length,
        count: vals.length,
      })).sort((a, b) => b.value - a.value);

      const label = isTotal ? 'Total' : 'Average';
      const lines = computed.map((c, i) =>
        `${i + 1}. **${c.group}** — ${label} ${numCol}: **${fmtVal(c.value)}** (${c.count} records)`
      ).join('\n');
      return `**${label} ${numCol} by ${catCol}:**\n${lines}`;
    }
  }

  // ── 9. FILTER — "show employees in [category]" ─── ──────────────────────
  if (/show|list|find|filter|who (is|are|work)/.test(q)) {
    const catCol = extractCatColFromQ();
    if (catCol) {
      // Try to find a filter value in the question
      const numericCols = new Set(Object.keys(stats));
      const catCols = columns.filter(c => !numericCols.has(c));
      // Collect all unique values across categorical columns
      const allValues: Array<{ col: string; val: string }> = [];
      for (const col of catCols) {
        const unique = [...new Set(rows.map(r => String(r[col] ?? '')).filter(Boolean))];
        for (const val of unique) {
          if (q.includes(val.toLowerCase())) {
            allValues.push({ col, val });
          }
        }
      }
      if (allValues.length > 0) {
        const { col: filterCol, val: filterVal } = allValues[0];
        const filtered = rows.filter(r => String(r[filterCol] ?? '').toLowerCase() === filterVal.toLowerCase());
        if (filtered.length === 0) return `No records found where **${filterCol}** is **${filterVal}**.`;
        if (filtered.length > 10) {
          const preview = filtered.slice(0, 5);
          const lines = preview.map(r => {
            const label = labelCol ? `**${r[labelCol] ?? 'Unknown'}**` : 'Record';
            const vals = Object.entries(r).filter(([k]) => k !== labelCol)
              .map(([k, v]) => `${k}: ${fmtVal(v)}`).join(' | ');
            return `- ${label}: ${vals}`;
          }).join('\n');
          return `Found **${filtered.length}** records where **${filterCol}** = **${filterVal}**. Here are the first 5:\n${lines}`;
        }
        const lines = filtered.map(r => {
          const label = labelCol ? `**${r[labelCol] ?? 'Unknown'}**` : 'Record';
          const vals = Object.entries(r).filter(([k]) => k !== labelCol)
            .map(([k, v]) => `${k}: ${fmtVal(v)}`).join(' | ');
          return `- ${label}: ${vals}`;
        }).join('\n');
        return `**${filtered.length}** records where **${filterCol}** = **${filterVal}**:\n${lines}`;
      }
    }
  }

  // ── 10. UNIQUE VALUES — "what departments are there" ────────────────────
  if (/what\s+(are the|categories|types|departments|groups|values|options)|list (all|unique)/.test(q)) {
    const catCol = extractCatColFromQ() ?? (columns.find(c => !Object.keys(stats).includes(c)));
    if (catCol) {
      const unique = [...new Set(rows.map(r => r[catCol]).filter(v => v != null && v !== ''))];
      const lines = unique.map(v => `- **${v}**`).join('\n');
      return `**Unique values in ${catCol}** (${unique.length} total):\n${lines}`;
    }
  }

  // ── 11. MISSING/NULL COUNT ───────────────────────────────────────────────
  if (/missing|null|empty|blank/.test(q)) {
    const col = extractColFromQ(false) ?? extractCatColFromQ();
    if (col) {
      const missing = rows.filter(r => r[col] == null || r[col] === '').length;
      const pct = ((missing / rows.length) * 100).toFixed(1);
      return `**${missing.toLocaleString()}** out of ${rows.length.toLocaleString()} records (${pct}%) are missing a value for **${col}**.`;
    }
    // All columns
    const report = columns.map(c => {
      const m = rows.filter(r => r[c] == null || r[c] === '').length;
      return { col: c, missing: m };
    }).filter(x => x.missing > 0).sort((a, b) => b.missing - a.missing);
    if (report.length === 0) return 'Great news — there are **no missing values** in this dataset!';
    const lines = report.map(x =>
      `- **${x.col}**: ${x.missing.toLocaleString()} missing (${((x.missing / rows.length) * 100).toFixed(1)}%)`
    ).join('\n');
    return `**Missing value summary:**\n${lines}`;
  }

  // ── 12. COLUMN LIST — "what columns/fields are in this dataset" ──────────
  if (/what (columns|fields|variables|metrics)|columns does|fields does/.test(q)) {
    const lines = columns.map(c => {
      const isNum = Object.keys(stats).includes(c);
      return `- **${c}** (${isNum ? 'numeric' : 'text'})`;
    }).join('\n');
    return `This dataset has **${columns.length} columns**:\n${lines}`;
  }

  // ── 13. DATASET SIZE ─────────────────────────────────────────────────────
  if (/how (large|big|many rows|many records)|size of (the )?dataset|dataset size|row count/.test(q)) {
    return `The dataset contains **${rows.length.toLocaleString()} rows** and **${columns.length} columns**.`;
  }

  return null; // Not handled — fall through to AI
}
