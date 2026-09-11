# PS17: Multi-Agent Municipal Complaint Router with SLA Escalation

## Comprehensive Engineering Architecture, Multi-Agent Specification & Deployment Blueprint

---

## 1\. Executive Summary & Problem Framing

Municipal corporations across urban centers process thousands of citizen grievances daily covering critical urban infrastructure: water contamination, overflowing solid waste, road cave-ins, and dark streetlights. Traditional grievance redressal systems suffer from three systemic failure points:

1. **Misclassification & Manual Dispatch Overhead:** Unstructured, code-mixed (e.g., Hinglish, Marathi-English) citizen grievances submitted via web portals or WhatsApp get incorrectly routed between fragmented departments (e.g., Road Works vs. Drainage vs. Water Supply).  
2. **Duplicate Crew Dispatch:** When a public water main bursts or a community garbage bin overflows, dozens of residents independently report the incident. Without spatial-semantic clustering, municipal departments issue redundant work orders to separate contractors.  
3. **SLA Stagnation Without Escalation:** Grievances routinely languish at the lowest field operational tier (Ward Junior Engineers or Sanitary Inspectors). Because traditional databases lack active temporal monitoring, SLA breaches occur silently without notifying administrative leadership.

This blueprint outlines a production-ready, multi-agent municipal operating platform built on **LangGraph**, **FastAPI**, **PostgreSQL/pgvector**, and **Next.js**. The platform autonomously ingests unstructured complaints, disambiguates missing spatial data, deduplicates concurrent local reports, computes dynamic hazard-weighted SLAs, and enforces an automated multi-tier administrative escalation hierarchy backed by a virtual time-travel simulation engine designed for live hackathon demonstration.

---

## 2\. Real-World Domain Context & Indian Municipal Standards

Grounded in municipal frameworks such as the **Pune Municipal Corporation (PMC Care)**, **Pimpri-Chinchwad Municipal Corporation (PCMC Sarathi)**, the **Ministry of Housing and Urban Affairs (MoHUA Swachhata Platform)**, and statutory timelines under the **Maharashtra Right to Public Services Act (RTS)**:

### 2.1 Departmental Taxonomy & Benchmark SLAs

| Category | Typical Grievances | Responsible Department | Field Responder | Statutory SLA | Priority Class |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Water Supply** | Main pipeline burst, sewage mixing in drinking lines, low pressure, valve leak | Water Supply & Pumping | Junior Engineer (Water), Valve Inspector | **4 – 12 Hours** | **P1 (Critical)** |
| **Solid Waste Management (SWM)** | Overflowing community bin, missed door-to-door collection, carcass removal | Health & Sanitation / SWM | Sanitary Inspector (SI), Ward Mukadam | **12 – 24 Hours** | **P2 (High)** |
| **Drainage & Sewerage** | Choked underground sewer line, open manhole cover, storm drain backup | Drainage Maintenance | Drainage Inspector, Suction Machine Crew | **12 – 24 Hours** | **P1 / P2** |
| **Streetlighting & Electrical** | Live exposed cable sparking, entire blackout on main road, dark alley lights | Electrical Department | Junior Engineer (Electrical), Lineman Squad | **24 – 48 Hours** | **P2 / P3** |
| **Roads & Traffic Infra** | Monsoon potholes, sunken trench after utility cable laying, paver damage | Road Maintenance & Civil | Junior Engineer (Civil), Maintenance Road Crew | **48 – 72 Hours** | **P3 / P4** |

### 2.2 Four-Tier Administrative Escalation Matrix

Municipal administration operates on a decentralized Ward/Prabhag structure. Escalation must mirror statutory reporting lines:

\[Level 1: Ward Field Responder\]

Roles: Junior Engineer (JE), Sanitary Inspector (SI), Beat Officer

Responsibility: Physical site verification, contractor dispatch, before/after photo upload.

Trigger to L2: Unacknowledged within 6 hours OR 80% SLA elapsed without status 'IN\_PROGRESS'.

        │

        ▼

\[Level 2: Ward Administration\]

Roles: Assistant Municipal Commissioner (AMC) / Executive Engineer (EE)

Responsibility: Inter-departmental coordination, emergency fund sanction, contractor nudge.

Trigger to L3: Hard 100% SLA breach reached without ticket closure.

        │

        ▼

\[Level 3: Zonal / City Department Head\]

Roles: Deputy Municipal Commissioner (DMC) \- Engineering / Sanitation

Responsibility: Contractor penalty imposition, reallocation of municipal machinery.

Trigger to L4: Ticket overdue by \> 150% of statutory SLA or repeated citizen reopen.

        │

        ▼

\[Level 4: Municipal Leadership & Appellate Authority\]

Roles: Municipal Commissioner (IAS) / Chief Grievance Officer

Responsibility: Statutory disciplinary review under Right to Services Act and public reporting.

---

## 3\. Multi-Agent System Architecture

The system avoids monolithic prompt design by deploying six discrete agents coordinated by a shared state graph:

                      ┌─────────────────────────────────────────┐

                      │            Raw Citizen Input            │

                      │   (Text / Audio / WhatsApp / Web Form)  │

                      └────────────────────┬────────────────────┘

                                           │

                                           ▼

┌─────────────────────────────────────────────────────────────────────────────────────┐

│ Agent A: Ingestion & Multilingual Triage Agent                                      │

│ • Code-Mixed Parsing (Marathi / Hindi / Hinglish \-\> Canonical English)              │

│ • Named Entity Recognition (Landmarks, Ward number, colony, cross-streets)          │

│ • Information Completeness Gatekeeper (Flags missing landmark or photo)             │

└──────────────────────┬───────────────────────────────────────┬──────────────────────┘

                       │ Valid                                 │ Incomplete

                       ▼                                       ▼

┌───────────────────────────────────────────┐      ┌──────────────────────────────────┐

│ Agent C: Spatial Deduplication & Cluster  │      │ Agent E: Citizen Engagement      │

│ • Haversine & pgvector cosine similarity  │      │ • Conversational Clarifications  │

│ • Groups same-street reports into 1 Parent│      │ • Omnichannel Status (WA/SMS)    │

└──────────────────────┬────────────────────┘      └──────────────────────────────────┘

                       │ Unique / Clustered

                       ▼

┌───────────────────────────────────────────────────┐

│ Agent B: Department Routing & Priority Agent      │

│ • Maps to Engineering / Sanitation Directorates   │

│ • Severity Scoring (P1 Critical to P4 Low)        │

│ • Base SLA Assignment (4h – 72h)                  │

└──────────────────────┬────────────────────────────┘

                       │

                       ▼

┌───────────────────────────────────────────────────┐      ┌──────────────────────────────────┐

│ Agent D: SLA Tracker & Escalation Orchestrator    │◄────►│ Human-in-the-Loop (HITL)         │

│ • Heartbeat monitor & virtual clock evaluator     │      │ • Ward Officer Approval          │

│ • Hierarchical Escalation (Tiers 1 to 4\)          │      │ • Photographic Proof Audit       │

└──────────────────────┬────────────────────────────┘      └──────────────────────────────────┘

                       │

                       ▼

┌───────────────────────────────────────────────────┐

│ Agent F: Field Officer Action Copilot             │

│ • Generates SOP repair checklist & bill of stores │

│ • Validates geotagged "Before/After" closure proof│

└───────────────────────────────────────────────────┘

### 3.1 Agent A: Ingestion & Multilingual Parsing Agent

* **Core Responsibilities:**  
  * Ingests multi-modal complaints (audio voice notes via Whisper ASR, WhatsApp chat text, and web forms).  
  * Normalizes code-mixed Indian vernaculars (Marathi, Hindi, Hinglish) into canonical structured English.  
  * Performs Named Entity Recognition (NER) to extract: `ward_name`, `landmark`, `colony`, `pincode`, and `issue_phrase`.  
  * **Completeness Gatekeeper:** Evaluates if sufficient spatial anchors exist to dispatch a physical team. If a citizen submits: *"There is a massive water leak near the shop"* without mentioning colony, road, or ward, Agent A emits `status: NEEDS_CLARIFICATION` and routes to Agent E.

### 3.2 Agent B: Department Routing & Priority Assignment Agent

* **Core Responsibilities:**  
  * Maps parsed complaints to municipal departments based on asset taxonomy.  
  * Calculates a dynamic numerical **Priority Score** ($P \\in \[1, 100\]$): $$P \= (W\_{\\text{hazard}} \\times S\_{\\text{hazard}}) \+ (W\_{\\text{traffic}} \\times S\_{\\text{traffic}}) \+ (W\_{\\text{pop}} \\times S\_{\\text{density}}) \+ \\Delta\_{\\text{cluster}}$$  
    * $P \\ge 85 \\implies \\textbf{P1 (Critical)}$: Assigned 4–6 hour SLA.  
    * $60 \\le P \< 85 \\implies \\textbf{P2 (High)}$: Assigned 12–24 hour SLA.  
    * $40 \\le P \< 60 \\implies \\textbf{P3 (Medium)}$: Assigned 24–48 hour SLA.  
    * $P \< 40 \\implies \\textbf{P4 (Low)}$: Assigned 48–72 hour SLA.

### 3.3 Agent C: Spatial Deduplication & Clustering Agent

* **Core Responsibilities:**  
  * Queries open active tickets using a compound filter:  
    1. Spatial radius: PostGIS `ST_DWithin` $\\le 150\\text{ meters}$.  
    2. Semantic embedding: pgvector cosine similarity $\\ge 0.85$.  
  * If a match is found:  
    * Marks incoming ticket as a **Child Ticket** linked to `parent_ticket_id`.  
    * Adds complainant phone number to the notification subscriber list.  
    * Increases the parent ticket's cluster weight $\\Delta\_{\\text{cluster}}$, dynamically boosting its priority.

### 3.4 Agent D: SLA Tracker & Escalation Orchestrator Agent

* **Core Responsibilities:**  
  * Evaluates deadline state transitions: $\\Delta t \= T\_{\\text{deadline}} \- T\_{\\text{virtual\_now}}$.  
  * Automatically issues warnings at 50% and 80% elapsed time.  
  * Executes automated state transitions on hard breach: transitions `status` to `ESCALATED`, promotes `escalation_level`, updates assigned officer to higher administrative rank, and logs an immutable audit event.

### 3.5 Agent E: Citizen Engagement & Feedback Agent

* **Core Responsibilities:**  
  * Conversational clarification bot: sends interactive WhatsApp/SMS messages with one-tap location pin requests when data is incomplete.  
  * Sends real-time milestone alerts: `TICKET_REGISTERED`, `ASSIGNED_TO_OFFICER`, `ESCALATED`, `RESOLVED`.  
  * Feedback polling: upon ticket resolution, sends a side-by-side photo with a 24-hour reopen poll. If citizen marks "Unresolved", it automatically triggers a Level 2 escalation.

### 3.6 Agent F: Field Officer Action Copilot

* **Core Responsibilities:**  
  * Generates Standard Operating Procedure (SOP) task checklists for the junior engineer.  
  * Drafts bill of materials (e.g., *"1x 150mm cast iron collar sleeve, 2 tons asphalt cold mix"*).  
  * Validates closure evidence: ensures closure photos contain metadata coordinates matching the incident site within 100 meters.

---

## 4\. LangGraph State Machine & Schema Definition

### 4.1 LangGraph StateGraph Node Transitions

\# State transition topology

builder \= StateGraph(MunicipalIncidentAgentState)

&nbsp;

builder.add\_node("ingestion\_multilingual", ingestion\_multilingual\_agent)

builder.add\_node("citizen\_followup", citizen\_followup\_agent)

builder.add\_node("spatial\_clustering", spatial\_clustering\_agent)

builder.add\_node("routing\_priority", routing\_priority\_agent)

builder.add\_node("sla\_orchestration", sla\_orchestration\_agent)

builder.add\_node("field\_copilot", field\_copilot\_agent)

builder.add\_node("hitl\_review", hitl\_review\_node)

builder.add\_node("citizen\_notify", citizen\_notify\_agent)

&nbsp;

\# Conditional Edges

builder.add\_edge(START, "ingestion\_multilingual")

&nbsp;

builder.add\_conditional\_edges(

    "ingestion\_multilingual",

    lambda state: "citizen\_followup" if state\["missing\_critical\_info"\] else "spatial\_clustering"

)

&nbsp;

builder.add\_conditional\_edges(

    "spatial\_clustering",

    lambda state: "citizen\_notify" if state\["is\_duplicate"\] else "routing\_priority"

)

&nbsp;

builder.add\_edge("routing\_priority", "sla\_orchestration")

builder.add\_edge("sla\_orchestration", "field\_copilot")

builder.add\_edge("field\_copilot", "hitl\_review")

&nbsp;

builder.add\_conditional\_edges(

    "hitl\_review",

    lambda state: "citizen\_notify" if state\["closure\_approved"\] else "field\_copilot"

)

&nbsp;

builder.add\_edge("citizen\_notify", END)

### 4.2 Shared Agent State Schema (Pydantic / JSON Schema)

from pydantic import BaseModel, Field

from typing import List, Optional, Dict, Any

from datetime import datetime

from enum import Enum

&nbsp;

class PriorityEnum(str, Enum):

    P1\_CRITICAL \= "P1\_CRITICAL"

    P2\_HIGH \= "P2\_HIGH"

    P3\_MEDIUM \= "P3\_MEDIUM"

    P4\_LOW \= "P4\_LOW"

&nbsp;

class TicketStatusEnum(str, Enum):

    REGISTERED \= "REGISTERED"

    PENDING\_INFO \= "PENDING\_INFO"

    ASSIGNED \= "ASSIGNED"

    IN\_PROGRESS \= "IN\_PROGRESS"

    ESCALATED \= "ESCALATED"

    RESOLVED \= "RESOLVED"

    REOPENED \= "REOPENED"

&nbsp;

class MunicipalIncidentAgentState(BaseModel):

    ticket\_id: str

    parent\_ticket\_id: Optional\[str\] \= None

    created\_at: datetime

    raw\_input\_text: str

    detected\_language: str

    channel: str \# WEB, WHATSAPP, VOICE

&nbsp;&nbsp;&nbsp;&nbsp;

    \# Extracted Spatial & Categorical Data

    canonical\_english\_summary: str

    extracted\_category: str

    ward\_id: str

    landmark: Optional\[str\] \= None

    latitude: float

    longitude: float

    missing\_critical\_info: bool \= False

&nbsp;&nbsp;&nbsp;&nbsp;

    \# Deduplication

    is\_duplicate: bool \= False

    cluster\_incident\_id: Optional\[str\] \= None

    cluster\_size: int \= 1

&nbsp;&nbsp;&nbsp;&nbsp;

    \# Routing & SLA

    assigned\_department\_id: str

    assigned\_officer\_id: str

    priority\_level: PriorityEnum

    priority\_score: float

    sla\_duration\_hours: int

    sla\_deadline: datetime

    escalation\_level: int \= 1 \# 1: Ward JE, 2: AMC/EE, 3: DMC, 4: Comm

&nbsp;&nbsp;&nbsp;&nbsp;

    \# Actions & Proof

    sop\_checklist: List\[str\] \= \[\]

    closure\_proof\_photo\_url: Optional\[str\] \= None

    closure\_approved: bool \= False

&nbsp;&nbsp;&nbsp;&nbsp;

    \# Audit Trail

    audit\_history: List\[Dict\[str, Any\]\] \= \[\]

---

## 5\. PostgreSQL & pgvector Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE EXTENSION IF NOT EXISTS vector;

CREATE EXTENSION IF NOT EXISTS postgis;

&nbsp;

\-- 1\. Municipal Departments

CREATE TABLE departments (

    department\_id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),

    name VARCHAR(100) NOT NULL UNIQUE,

    code VARCHAR(20) NOT NULL UNIQUE,

    head\_officer\_email VARCHAR(150) NOT NULL

);

&nbsp;

\-- 2\. Administrative Officers

CREATE TABLE officers (

    officer\_id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),

    department\_id UUID REFERENCES departments(department\_id),

    name VARCHAR(120) NOT NULL,

    designation VARCHAR(80) NOT NULL, \-- 'Junior Engineer', 'Executive Engineer', 'Deputy Commissioner'

    hierarchy\_tier INT NOT NULL,     \-- 1: Ward Field, 2: Ward Admin, 3: Zonal Head, 4: Commissioner

    ward\_id VARCHAR(50) NOT NULL,    \-- 'Ward-14 (Kothrud)', 'Ward-08 (Aundh)'

    phone\_number VARCHAR(20) NOT NULL,

    email VARCHAR(150) NOT NULL

);

&nbsp;

\-- 3\. Statutory SLA Policies

CREATE TABLE sla\_policies (

    policy\_id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),

    department\_id UUID REFERENCES departments(department\_id),

    category VARCHAR(80) NOT NULL,

    priority\_tier VARCHAR(20) NOT NULL, \-- 'P1\_CRITICAL', 'P2\_HIGH', 'P3\_MEDIUM', 'P4\_LOW'

    resolution\_sla\_hours INT NOT NULL,

    l2\_escalation\_hours INT NOT NULL,

    l3\_escalation\_hours INT NOT NULL

);

&nbsp;

\-- 4\. Complaints Master Table

CREATE TABLE complaints (

    ticket\_id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),

    ticket\_number VARCHAR(50) UNIQUE NOT NULL, \-- e.g. 'PMC-2026-WAT-0492'

    parent\_ticket\_id UUID REFERENCES complaints(ticket\_id) ON DELETE SET NULL,

    raw\_text TEXT NOT NULL,

    canonical\_text TEXT NOT NULL,

    category VARCHAR(80) NOT NULL,

    priority VARCHAR(20) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',

&nbsp;&nbsp;&nbsp;&nbsp;

    ward\_id VARCHAR(50) NOT NULL,

    location\_address TEXT NOT NULL,

    landmark TEXT,

    coordinates GEOMETRY(Point, 4326),

    embedding vector(1536), \-- OpenAI / bge-large text embedding

&nbsp;&nbsp;&nbsp;&nbsp;

    assigned\_department\_id UUID REFERENCES departments(department\_id),

    assigned\_officer\_id UUID REFERENCES officers(officer\_id),

&nbsp;&nbsp;&nbsp;&nbsp;

    escalation\_level INT NOT NULL DEFAULT 1,

    current\_sla\_deadline TIMESTAMPTZ NOT NULL,

    is\_breached BOOLEAN DEFAULT FALSE,

    resolved\_at TIMESTAMPTZ,

    created\_at TIMESTAMPTZ DEFAULT CURRENT\_TIMESTAMP

);

&nbsp;

\-- 5\. Escalations Ledger

CREATE TABLE escalations (

    escalation\_id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),

    ticket\_id UUID NOT NULL REFERENCES complaints(ticket\_id) ON DELETE CASCADE,

    from\_officer\_id UUID REFERENCES officers(officer\_id),

    to\_officer\_id UUID REFERENCES officers(officer\_id),

    previous\_level INT NOT NULL,

    new\_level INT NOT NULL,

    breach\_hours\_overdue NUMERIC(6, 2\) NOT NULL,

    trigger\_reason TEXT NOT NULL,

    escalated\_at TIMESTAMPTZ DEFAULT CURRENT\_TIMESTAMP

);

&nbsp;

\-- 6\. Comprehensive Audit Logs

CREATE TABLE audit\_logs (

    log\_id UUID PRIMARY KEY DEFAULT uuid\_generate\_v4(),

    ticket\_id UUID NOT NULL REFERENCES complaints(ticket\_id) ON DELETE CASCADE,

    acting\_agent VARCHAR(80) NOT NULL, \-- 'Agent:Ingestion', 'Agent:Router', 'Agent:SLA\_Orchestrator'

    action\_type VARCHAR(100) NOT NULL,

    payload\_snapshot JSONB,

    created\_at TIMESTAMPTZ DEFAULT CURRENT\_TIMESTAMP

);

&nbsp;

\-- Indices for rapid spatial, vector, and temporal lookups

CREATE INDEX idx\_complaints\_parent ON complaints(parent\_ticket\_id);

CREATE INDEX idx\_complaints\_status ON complaints(status);

CREATE INDEX idx\_complaints\_sla ON complaints(current\_sla\_deadline);

CREATE INDEX idx\_complaints\_spatial ON complaints USING GIST (coordinates);

CREATE INDEX idx\_complaints\_embedding ON complaints USING hnsw (embedding vector\_cosine\_ops);

---

## 6\. The "Virtual Time-Travel" Simulation Engine

### 6.1 The Hackathon Dilemma

Hackathon judging rounds are limited to **3 to 5 minutes**. An SLA engine with 6-hour, 24-hour, or 48-hour timelines cannot be verified in real-world time.

### 6.2 Implementation Blueprint

1. A centralized **`ClockService`** maintains a global time offset (`simulated_offset_seconds`) stored atomically in Redis.  
2. Every database query, state transition, and agent heartbeat reads the simulated clock: $$\\text{Current Virtual Time} \= \\text{System Clock} \+ \\text{Redis Offset}$$  
3. The Admin dashboard exposes a dedicated **"Time-Travel Control Bar"** with buttons: `[ +6 Hours ]`, `[ +24 Hours ]`, `[ +48 Hours ]`.  
4. Clicking a time advance updates Redis and immediately forces an evaluation pass by the **SLA Monitoring Agent**. Tickets exceeding their deadlines turn red, transition to `ESCALATED`, update their escalation tier, and emit real-time WebSocket notifications.

\# backend/services/clock\_service.py

import redis

from datetime import datetime, timezone, timedelta

&nbsp;

redis\_conn \= redis.Redis(host='localhost', port=6379, db=0)

&nbsp;

def get\_current\_virtual\_time() \-\> datetime:

    offset \= int(redis\_conn.get("virtual\_time\_offset\_sec") or 0\)

    return datetime.now(timezone.utc) \+ timedelta(seconds=offset)

&nbsp;

def advance\_virtual\_clock(hours: int) \-\> datetime:

    current\_offset \= int(redis\_conn.get("virtual\_time\_offset\_sec") or 0\)

    new\_offset \= current\_offset \+ (hours \* 3600\)

    redis\_conn.set("virtual\_time\_offset\_sec", new\_offset)

    return get\_current\_virtual\_time()

---

## 7\. Hackathon 3-Minute Live Demo Script

| Elapsed Time | Screen View | Presenter Narration & Live Actions |
| :---- | :---- | :---- |
| **0:00 – 0:40** | **Citizen Portal (Split Screen)** Chat Interface \+ Live Ward Map | **Action:** Click "Load Hackathon Presets" to inject 4 distinct complaints at once: 1\. *Water:* "Main pipeline burst near Shivaji Chowk, water flooding entire street." (Marathi/English) 2\. *Garbage:* "Overflowing bin on Market Road uncollected for 3 days." 3\. *Road:* "Huge pothole after bridge causing bike skids." 4\. *Streetlight:* "3 streetlights dark in lane 5 behind bus terminal." **Narration:** *"Citizens don't know municipal departments or jurisdictions. They report issues in natural, code-mixed language. Our Ingestion Agent extracts the intent, pinpoints the ward, and identifies missing landmarks."* |
| **0:40 – 1:15** | **Agent Execution Trace (LangGraph)** Live Stream of JSON States | **Action:** Highlight the streaming agent node executions on screen. **Narration:** *"Notice the multi-agent reasoning: The Triage Agent identifies the water main burst as a P1 Critical emergency with a 6-hour SLA. Meanwhile, the Deduplication Agent runs a spatial vector check and confirms the garbage complaint is a duplicate of an existing parent ticket in Ward 14, automatically clustering them without sending duplicate trucks."* |
| **1:15 – 1:50** | **Admin Department Command Center** Department Kanban Boards | **Action:** Show the 4 tickets automatically routed to their respective department queues: • Water Supply $\\rightarrow$ Junior Engineer (Water, Ward 14\) • Solid Waste $\\rightarrow$ Sanitary Inspector (SWM) • Road Works $\\rightarrow$ Junior Engineer (Civil) • Electrical $\\rightarrow$ Ward Lineman Squad **Narration:** *"Zero manual dispatcher overhead. Every ticket is placed in the exact ward engineer's queue with an automated SOP repair checklist."* |
| **1:50 – 2:35** | **The SLA Time-Travel Demonstration** Admin Simulation Bar | **Action:** Click the **`[ +24 Hours ]`** button on the virtual time slider. **Visual Effect:** 1\. Dashboard flashes with an audio/visual SLA Breach Alert. 2\. The **Water Contamination** ticket turns bright red: **`SLA BREACHED (+18h Overdue)`**. 3\. Ticket status updates autonomously to `ESCALATED`. 4\. The assigned officer shifts from **Junior Engineer (Level 1\)** to **Deputy Municipal Commissioner (Level 3\)**. 5\. An immutable escalation audit log is written to PostgreSQL. **Narration:** *"Here is our core innovation: Municipal delays happen because tickets languish unnoticed. Watch as we fast-forward virtual time by 24 hours. The local team failed to address the 6-hour critical water emergency. Without human intervention, the SLA Orchestrator detects the breach, escalates the case to Level 3, and alerts the Deputy Commissioner."* |
| **2:35 – 3:00** | **Citizen Transparency & Verification View** | **Action:** Switch to the citizen tracking link showing updated status and audit logs. **Narration:** *"Citizens receive proactive escalation notices rather than radio silence, and city leadership gets an automated heatmap of departmental bottlenecks. That is autonomous civic governance."* |

---

## 8\. Judging Rubric Alignment & Competitive Edge

| Hackathon Evaluation Criterion | How PS17 Excels |
| :---- | :---- |
| **True Multi-Agent Depth** | Employs 6 discrete agents (Triage, Spatial Deduplication, Routing, SLA Orchestrator, Citizen Engagement, Field Copilot) connected in a cyclical graph with stateful persistence. |
| **Technical Differentiation** | Integrates PostGIS spatial indexing \+ pgvector semantic deduplication to solve the real-world problem of redundant crew dispatches. |
| **Live Demo Wow Factor** | The **Virtual Time-Travel Engine** provides a visual and reliable way to demonstrate SLA overruns and multi-tier escalations live on stage. |
| **Local Domain Authenticity** | Implements genuine Indian municipal governance nomenclature (Ward/Prabhag, Junior Engineer, Sanitary Inspector, AMC, DMC) and adheres to statutory Citizen Charter timelines. |

&nbsp;