# Narrative Analytics Interface — Full-Stack

A high-performance analytics platform featuring a **FastAPI** backend and a **React (TypeScript)** frontend, powered by the **ARIA AI Engine** via Groq.

## 🚀 Quick Start

### 1. Prerequisites
- **Python 3.8+**
- **Node.js 18+**
- **Groq API Key** (Get one at [console.groq.com](https://console.groq.com))

---

### 2. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```powershell
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Configure environment variables:
   - Create a `.env` file in the `backend/` folder.
   - Add your Groq API key:
     ```env
     GROQ_API_KEY=your_key_here
     ```
5. Launch the server:
   ```powershell
   python main.py
   ```
   *The backend will be live at `http://localhost:8000`*

---

### 3. Frontend Setup
1. Open a **new** terminal and navigate to the frontend directory:
   ```powershell
   cd frontend
   ```
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Configure environment variables (optional):
   - Create a `.env` file in the `frontend/` folder.
   - Set the API URL:
     ```env
     VITE_API_URL=http://localhost:8000
     ```
4. Launch the development server:
   ```powershell
   npm run dev
   ```
   *The interface will be live at `http://localhost:5173`*

---

### 4. Using the Platform
1. Open your browser to `http://localhost:5173`.
2. **Ingest Data**: Drag and drop any CSV file into the interface.
3. **Analyze**: Explore the "Statistical Engine", "Anomaly Radar", and "Insights" panels.
4. **Narrative**: Go to the "Narrative" panel and click **Regenerate** to have ARIA (the AI engine) build a strategic report.
5. **Query**: Use the "Query" panel to ask ARIA specific questions about your data (e.g., *"Which sector should I focus on first?"*).

---

## 🛠️ Architecture
- **Backend**: FastAPI, Pandas, Scipy, Groq SDK.
- **Frontend**: React, Vite, TypeScript, TailwindCSS, Framer Motion, D3.js, Recharts.
- **AI Engine**: ARIA (Analytical Reasoning and Insight Architect) using Llama-3.3-70b and Llama-3.1-8b.
