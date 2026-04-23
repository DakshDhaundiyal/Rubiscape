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
            "You are analyzing the dataset described above. The user is a business professional making real operational decisions. "
            "Treat every question as consequential. Answer with the confidence of someone who has studied this data thoroughly and is being paid for their strategic judgment."
        )

        system_prompt = f"{ARIA_PERSONA}\n\n{context_injection}"
        user_prompt = f"Generate a {mode} strategic narrative report for this dataset. Name the most important thing first."

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
        context_injection = (
            f"Dataset Context:\n{json.dumps(req.context)}\n\n"
            "You are analyzing the dataset described above. The user is a business professional making real operational decisions. "
            "Treat every question as consequential. Answer with the confidence of someone who has studied this data thoroughly and is being paid for their strategic judgment."
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
