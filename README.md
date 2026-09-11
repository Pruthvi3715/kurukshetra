# 🏛️ NagrikSewa (PS17): Autonomous Multi-Agent Civic Grievance Operating System
### Pune Municipal Corporation (PMC Care) & Pimpri Chinchwad Municipal Corporation (PCMC)
**Statutory Compliance:** Maharashtra Right to Public Services Act (RTS 2015)  
**Design System:** Government of India Web Guidelines (UX4G / GIGW 3.0)  
**LLM Engine:** Google Gemini 2.5 Flash & Ollama Local Fallback  

---

## 📖 Comprehensive Documentation
For the complete technical breakdown, mathematical formulas, agent schemas, and API reference, please refer to:
👉 **[WORKING_AND_IMPLEMENTATION.md](file:///c:/Users/pshin/CODEE/kurkshetra/WORKING_AND_IMPLEMENTATION.md)**

---

## 👥 Contributor Team
- **[@Pruthvi3715](https://github.com/Pruthvi3715)** — Project Lead & System Architect
- **[@Devendra-006](https://github.com/Devendra-006)** — Fullstack & Multi-Agent Pipeline Engineer
- **[@sampada-11](https://github.com/sampada-11)** — Civic UX & Statutory Domain Logic Specialist
- **[@rushil-cody](https://github.com/rushil-cody)** — Data Modeling & Core Evaluation

---

## ⚡ Quick Start

```bash
# Clone & Enter Repository
git clone https://github.com/Pruthvi3715/kurkshetra.git
cd kurkshetra

# Create and activate virtualenv
python -m venv venv
.\venv\Scripts\Activate.ps1   # On Windows
# source venv/bin/activate     # On Linux/macOS

# Install dependencies
pip install -r backend/requirements.txt

# Run the FastAPI server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Dashboard & GIS Map:** `http://127.0.0.1:8000/`
- **Agent Workbench:** `http://127.0.0.1:8000/#agent-workbench-section`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`

---

## 🧪 Terminal Verification Scripts

Test all 6 civic agents directly from terminal without a browser:

```bash
# 1. Test Water Pipeline Contamination (Kothrud, Ward 14)
python test_terminal_agents.py

# 2. Test Catastrophic Open Manhole & Sewage Overflow (Aundh, Ward 08)
python test_new_scenario.py
```
