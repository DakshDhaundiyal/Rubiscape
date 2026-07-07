import os
import json
import asyncio
from typing import List, Dict, Any
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import AsyncGroq
from dotenv import load_dotenv

from engine import StatsEngine
from insights import classify_insights
from persona import ARIA_PERSONA

load_dotenv()

app = FastAPI(title="Narrative Analytics API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq Client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = AsyncGroq(api_key=GROQ_API_KEY)

class ProcessRequest(BaseModel):
    data: List[Dict[str, Any]]

class QueryRequest(BaseModel):
    question: str
    context: Dict[str, Any]

@app.get("/ping")
async def ping():
    return {"status": "alive"}

@app.post("/api/process")
async def process_data(req: ProcessRequest):
    try:
        results = StatsEngine.process_data(req.data)
        insights, score, narrative = classify_insights(
            results["stats"], 
            results["anomalies"], 
            results["totalRows"],
            results.get("clusters", []),
            results.get("correlations", {})
        )
        results["insights"] = insights
        results["insightScore"] = score
        results["narrativeBlock"] = narrative
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/narrative")
async def stream_narrative(req: Request):
    try:
        body = await req.json()
        stats = body.get("stats")
        insights = body.get("insights")
        mode = body.get("mode", "executive")

        context_injection = (
            f"You are analyzing this dataset summary:\n{json.dumps(stats)}\n\n"
            f"Key Insights from the engine:\n{json.dumps(insights)}\n\n"
            "The user is a business professional making real operational decisions. "
            "Use the actual column names from the data in your analysis. "
            "Reference specific numbers. Be precise and direct."
        )

        system_prompt = f"{ARIA_PERSONA}\n\n{context_injection}"

        if mode == "executive":
            user_prompt = """Write a QUICK SUMMARY of this dataset for a busy executive who has 2 minutes.

Rules:
- Write in plain English. No jargon. No statistics terms.
- Maximum 250 words total.
- Structure it as exactly 3 short sections:

## ✅ What Your Data Shows
One clear sentence describing what this dataset is about and how many entries it contains.

## ⚠️ What Needs Your Attention (Top 3 Findings)
Three bullet points. Each bullet names the specific metric, states the finding in plain English, and says why it matters. Be direct. Use the actual numbers.

## 🎯 What To Do Next
Two concrete actions the business should take based on this data. Be specific — name the metrics and the action.

Never use: CV, standard deviation, skewness, kurtosis, z-score, distribution, correlation.
Replace with: consistency, typical swing, balance, risk level, unusual entries, connection.
Format numbers as currency ($12K, $2.4M) or percentages wherever possible."""

        else:  # analyst / full breakdown
            user_prompt = """Write a FULL BREAKDOWN analytical report for this dataset. This is for a data-literate analyst who wants depth.

Structure the report with these exact sections:

## 📊 Dataset Overview
Summarize what the dataset contains: number of entries, key metrics, and the overall health of the data (missing values, data quality issues).

## 🔍 Key Metric Analysis
For each of the top 3-5 most important metrics by volatility and anomaly count:
- **[Metric Name]**: State the average value, how much it varies, whether it leans high or low, and flag any entries that look unusual. Explain what this pattern means for the business.

## 🚨 Flagged Records & Risk Areas
List the specific metrics with the most unusual entries. For each:
- How many entries are flagged
- What direction they deviate (too high or too low)
- What business risk this creates

## 🔗 Connections Between Metrics
Name 2-3 pairs of metrics that move together. Explain what that relationship means in business terms (e.g., "When X goes up, Y tends to go up too — this suggests...").

## 📋 Priority Action Plan
Rank 4-5 specific recommendations from highest to lowest priority. Each recommendation must:
- Name the specific metric
- State the exact issue (with a number)
- Suggest a concrete next step

Be analytical but write in plain English. Use actual column names and numbers throughout."""

        async def event_generator():
            try:
                stream = await client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    stream=True,
                )
                async for chunk in stream:
                    token = chunk.choices[0].delta.content
                    if token:
                        yield f"data: {json.dumps({'token': token})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/query")
async def handle_query(req: QueryRequest):
    try:
        # Build a readable summary from context instead of dumping raw JSON
        ctx = req.context
        stats = ctx.get("stats", {})
        insights = ctx.get("insights", [])
        anomalies = ctx.get("anomalies", [])
        total_rows = ctx.get("totalRows", 0)

        # Plain-English metric summaries
        metric_lines = []
        for col, s in list(stats.items())[:8]:   # cap at 8 metrics
            mean = s.get("mean", 0)
            cv   = s.get("cv",   0)
            nulls = s.get("nulls", 0)
            swing = int(cv * 100)
            mean_fmt = (
                f"${mean/1_000_000:.1f}M" if abs(mean) >= 1_000_000
                else f"${mean/1_000:.1f}K" if abs(mean) >= 1_000
                else f"{mean:.2f}"
            )
            null_note = f", {nulls} missing values" if nulls > 0 else ""
            metric_lines.append(
                f"- {col}: typical value {mean_fmt}, varies about {swing}% from that typical value{null_note}"
            )

        # Top insight titles
        insight_titles = [f"- {i['title']}" for i in insights[:5]]
        anomaly_note   = f"{len(anomalies)} unusual records were flagged across all metrics." if anomalies else ""

        context_injection = (
            f"DATASET SUMMARY ({total_rows:,} total records):\n"
            + "\n".join(metric_lines) + "\n\n"
            + ("KEY FINDINGS:\n" + "\n".join(insight_titles) + "\n\n" if insight_titles else "")
            + (anomaly_note + "\n\n" if anomaly_note else "")
            + "HOW TO ANSWER:\n"
            "1. Write in plain, conversational English — like you're explaining to a smart but non-technical manager.\n"
            "2. NEVER use: CV, standard deviation, z-score, skewness, kurtosis, percentile, variance, correlation coefficient, p-value.\n"
            "   INSTEAD say: 'consistency', 'typical swing', 'how much it varies', 'unusual entries', 'moves together with', 'risk level'.\n"
            "3. NEVER paste raw decimal numbers with more than 1 decimal place (e.g., avoid 123456.789). Round and use K/M suffixes for money.\n"
            "4. Always refer to the actual column name from the dataset — never say 'the metric' generically.\n"
            "5. Keep the answer to 3-5 sentences max, unless the user explicitly asks for a breakdown.\n"
            "6. If flagged records are mentioned, say 'a handful of entries look unusual' or 'X records stand out' — not 'X rows have a z-score of Y'.\n"
            "7. End every answer with one concrete, specific action the user should take next."
        )

        system_prompt = f"{ARIA_PERSONA}\n\n{context_injection}"

        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.question}
            ],
            max_tokens=1024
        )
        return {"answer": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
