# 🏛️ NagrikSewa AI (PS17): Autonomous Multi-Agent Civic Grievance Operating System

> **Statutory Compliance:** Maharashtra Right to Public Services Act (RTS 2015) & Municipal Corporation Act 1949  
> **Design Framework:** Government of India Unified Experience for Government (UX4G / GIGW 3.0)  
> **Core AI Framework:** LangGraph v1.0 StateGraph & Google Gemini 2.5 Flash  
> **Jurisdiction:** Pune Municipal Corporation (PMC Care) & Pimpri-Chinchwad Municipal Corporation (PCMC)

---

## 🌟 Executive Summary

**NagrikSewa AI** is an end-to-end, production-grade civic grievance redressal and autonomous workflow engine. Designed under **Problem Statement 17 (PS17)**, it replaces slow bureaucratic ticketing systems with a coordinated **6-Agent StateGraph Architecture** that ingests multilingual citizen complaints, prevents duplicate dispatches via geospatial clustering, computes dynamic hazard-weighted priority math, automatically notifies field crews, generates engineering SOPs, and enforces statutory SLAs with automated escalation ladders.

---

## 🏗️ 6-Agent LangGraph Architecture

```
                      +-------------------+
                      |   Citizen Input   | (Voice / Web / WhatsApp)
                      +-------------------+
                                |
                                v
                     +---------------------+
                     |   AGENT A: TRIAGE   | (Multilingual NER & Intent)
                     +---------------------+
                                |
                   [Is Input Actionable & Spatial?]
                      /                       \
             YES     /                         \  NO
                    v                           v
     +---------------------------+    +-----------------------+
     |   AGENT C: DEDUPLICATION  |    |   AGENT E: CLARIFY    |
     +---------------------------+    +-----------------------+
                    |                             |
     [Duplicate in 150m Cluster?]                 v
        /                     \                [END]
   YES /                       \ NO
      v                         v
 [Boost Cluster]     +--------------------+
 [Link Parent]       |  AGENT B: PRIORITY | (Hazard-Weighted Math & SLA)
      \              +--------------------+
       \                        |
        +---------------------->v
                     +---------------------+
                     |  AGENT D: DISPATCH  | (4-Tier RTS Escalation Ladder)
                     +---------------------+
                                |
                                v
                     +---------------------+
                     |   AGENT F: COPILOT  | (Engineering SOP, BOM & Geotag)
                     +---------------------+
                                |
                                v
                     +---------------------+
                     | AGENT E: MILESTONES | (WhatsApp / SMS / Webhooks)
                     +---------------------+
                                |
                                v
                             [END]
```

### The 6 Specialized Civic Agents

1. **Agent A — Multilingual Ingestion & NER**:
   - Accepts voice and text complaints in **Marathi (मराठी)**, **Hindi (हिंदी)**, and **English**.
   - Extracts categorical entities, severity descriptors, and geographic landmarks using Google Gemini 2.5 Flash.
   - Enforces a **Spatial Completeness Gatekeeper** to ensure actionable addresses before dispatch.

2. **Agent B — Spatial Priority Math & Statutory RTS SLA**:
   - Calculates priority scores using the statutory formula:
     $$\text{Priority} = (W_{\text{haz}} \cdot S_{\text{haz}}) + (W_{\text{traf}} \cdot S_{\text{traf}}) + (W_{\text{pop}} \cdot S_{\text{pop}}) + \Delta_{\text{cluster}}$$
   - Maps scores to statutory RTS Act SLA windows:
     - **P1 Critical (Score $\ge$ 85):** 6 Hours (Water contamination, burst mains, road collapse)
     - **P2 High (Score 70–84):** 18 Hours (Overflowing sewage, uncollected garbage clusters)
     - **P3 Medium (Score 50–69):** 24 Hours (Streetlight outages, drainage blockage)
     - **P4 Low (Score < 50):** 48 Hours (General civic maintenance, garden prunings)

3. **Agent C — Geospatial Deduplication & Cluster Engine**:
   - Employs **150-meter Geodesic Haversine clustering** and high-dimensional semantic cosine similarity ($\ge 0.85$).
   - Merges redundant complaint calls into a single parent ticket, boosting priority score while preventing redundant crew dispatches.

4. **Agent D — 4-Tier Statutory Escalation Ladder**:
   - **Level 1 (0–79% SLA):** Ward Junior Engineer (JE).
   - **Level 2 (80–99% SLA):** Assistant Municipal Commissioner (AMC) — Warning alert.
   - **Level 3 (100–149% SLA):** Deputy Municipal Commissioner (DMC) — Hard statutory breach.
   - **Level 4 ($\ge$ 150% SLA):** Municipal Commissioner & Appellate Authority — RTS Act disciplinary penalty review.

5. **Agent E — Omnichannel Citizen Engagement**:
   - Delivers real-time milestone alerts via WhatsApp (Twilio) and Telegram Bot.
   - Provides two-way interactive feedback loops with citizen resolution sign-offs and one-click reopening.

6. **Agent F — Field Engineering Copilot**:
   - Automatically generates itemized **Standard Operating Procedures (SOPs)** and **Bills of Materials (BOM)** based on grievance category.
   - Verifies field repair photographs via **100m geofence audit**, cryptographic timestamp seals, and computer vision before closure sign-off.

---

## 🖥️ Citizen & Administrative User Interface

The frontend follows the **Government of India UX4G (GIGW 3.0)** specifications with clean typography, high contrast, and zero clutter:

- **3-Step Citizen Lodging Wizard**:
  - **Step 1 (Grievance & Pinpoint Map):** Type or speak grievance while simultaneously selecting location via Leaflet OpenStreetMap, 1-click GPS detection, landmark search, or popular locality chips.
  - **Step 2 (Photographic Proof):** Anti-fraud live camera viewfinder with dedicated **Shutter Capture Button** (`#btn-cg-shutter-snap`), real-time GPS coordinates bar, and cryptographic integrity stamping.
  - **Step 3 (Review & Confirm SLA):** AI-triaged category summary, statutory resolution deadline, and instant dispatch.
- **Geospatial War Room Map**:
  - Full-screen Leaflet GIS map displaying all 10 Pune Municipal Administrative Wards, municipal infrastructure depots, water treatment facilities, and live incident markers.
- **Departmental Kanban Redressal Board**:
  - 4 statutory lifecycle columns: *Lodged & Triaged* $\rightarrow$ *Field Assigned (L1)* $\rightarrow$ *SLA Escalated (L2/L3)* $\rightarrow$ *Resolved & Closed*.
  - Collapsible summary view and expandable detailed inspection dossiers.
- **6-Agent Autonomous Execution Laboratory**:
  - Real-time telemetry inspector, LangGraph visualizer (ASCII & Mermaid), and virtual time-travel testing controls.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Python 3.10+ installed
- Node.js (optional, for tools or testing)
- Google Gemini API Key ([Get here](https://aistudio.google.com/))

### 2. Clone & Install
```bash
# Clone repository
git clone https://github.com/Pruthvi3715/kurkshetra.git
cd kurkshetra

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows PowerShell
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment
Create a `.env` file in the project root:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Optional: WhatsApp / SMS Notifications via Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+1xxxxxxxxxx
```

### 4. Start the Application
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Web Dashboard:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Interactive API Docs (Swagger):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Endpoint:** [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

## 🧪 Automated Testing & Verification

Run tests from the terminal to validate the entire multi-agent state machine:

```bash
# Test 1: Full LangGraph StateGraph Execution
python test_langgraph_graph.py

# Test 2: Catastrophic Sewage Overflow & Manhole Failure Scenario (Aundh, Ward 08)
python test_new_scenario.py

# Test 3: Water Pipeline Contamination Scenario (Kothrud, Ward 14)
python test_terminal_agents.py
```

---

## 🌐 Deploy to Vercel

The project is pre-configured for **1-Click Vercel Deployment**:
- [`vercel.json`](file:///c:/Users/pshin/CODEE/kurkshetra/vercel.json): Routes `/api/*` to Python serverless functions and serves static frontend from Edge CDN.
- [`api/index.py`](file:///c:/Users/pshin/CODEE/kurkshetra/api/index.py): ASGI serverless bridge for FastAPI.

### Deployment Steps:
1. Push code to GitHub: `git push origin main`.
2. Open [Vercel Dashboard](https://vercel.com/) $\rightarrow$ **"Add New..."** $\rightarrow$ **"Project"** $\rightarrow$ Import `kurkshetra`.
3. Under **Environment Variables**, add `GEMINI_API_KEY`.
4. Click **Deploy**.

---

## 👥 Contributor Team

- Pruthvi3715  (https://github.com/Pruthvi3715)
- Devendra-006 (https://github.com/Devendra-006)
- sampada-11   (https://github.com/sampada-11)
- rushil-cody  (https://github.com/rushil-cody)


---

## 📜 Legal & Compliance

- **Maharashtra Right to Public Services Act (RTS 2015)**: Automated calculation of legal resolution deadlines and disciplinary breach tracking.
- **Municipal Corporation Act 1949**: Departmental jurisdictions and ward boundaries mapped to Pune Municipal Corporation administrative divisions.
- **GIGW 3.0 / UX4G**: Level AA accessibility guidelines, bilingual controls, and responsive civic design.
