# PS17 — Multi-Agent Municipal Complaint Router with SLA Escalation
## Master Product Requirements Document (PRD) + TRD + DB Schema + API Blueprint + UI/UX Guide + Roadmap + Env Config

**Document Owner:** Product/Engineering
**Version:** 1.0
**Status:** Ready for Build
**Source Spec:** `PS17_Multi_Agent_Municipal_Complaint_Router.md` (all technical decisions — LangGraph, FastAPI, PostgreSQL/pgvector/PostGIS, Next.js, Redis-backed virtual clock — are preserved exactly as specified in the source document; no substitutions were made. Where the source is silent on an implementation detail, an explicit **[ASSUMPTION]** tag marks the gap so it can be confirmed or overridden.)

---

# PART 0 — HOW TO USE THIS DOCUMENT

This single master document intentionally bundles the six documents a build team (or a coding agent / LLM-assisted dev) needs, so nothing has to be inferred or re-derived from a chat thread:

| # | Document | Section |
|---|---|---|
| 1 | Product Requirements Document (PRD) | Parts 1–4 |
| 2 | Technical Requirements Document (TRD/TSD) | Part 5 |
| 3 | Backend & Database Schema File | Part 6 |
| 4 | API Architecture & App Flow Blueprint | Part 7 |
| 5 | UI/UX Style Guide & Component Document | Part 8 |
| 6 | Implementation Roadmap | Part 9 |
| — | Environment Configuration (`.env.example`) | Part 10 |
| — | Live Demo Script + Judging Alignment (carried over from source spec) | Part 11 |
| — | Risks, Assumptions, Glossary | Part 12 |

---

# PART 1 — PRODUCT OVERVIEW & PROBLEM STATEMENT

## 1.1 Product Name
**PS17 — Multi-Agent Municipal Complaint Router with SLA Escalation** (internal working name: "Civic Router")

## 1.2 One-Line Description
An autonomous, multi-agent civic-governance platform that ingests unstructured, code-mixed citizen grievances (text, WhatsApp, voice), classifies and routes them to the correct municipal department, deduplicates redundant reports of the same physical incident, computes hazard-weighted SLAs, and enforces a four-tier administrative escalation hierarchy without manual dispatcher intervention — demonstrated live via a Redis-backed "virtual time-travel" clock.

## 1.3 Problem Statement
Municipal corporations process thousands of daily grievances (water, sanitation, drainage, electrical, roads). Three systemic failures recur:

1. **Misclassification & Manual Dispatch Overhead** — unstructured, code-mixed complaints (Hinglish, Marathi-English) submitted via web/WhatsApp get routed to the wrong department.
2. **Duplicate Crew Dispatch** — many residents independently report the same incident (e.g., a burst water main), causing redundant work orders without spatial-semantic clustering.
3. **Silent SLA Stagnation** — tickets languish at the lowest field tier because there is no active temporal monitoring or automatic escalation when SLAs are breached.

## 1.4 Solution Summary
A six-agent LangGraph-orchestrated pipeline (Sections 3.1–3.6 of source spec) that:
- Normalizes multilingual/code-mixed input into canonical English and extracts spatial entities.
- Flags and resolves incomplete submissions conversationally.
- Deduplicates near-simultaneous reports of the same incident using PostGIS spatial radius + pgvector semantic similarity.
- Routes to the correct department and computes a hazard-weighted priority score and SLA.
- Monitors SLA deadlines against a simulate-able virtual clock and auto-escalates through 4 statutory tiers.
- Generates field SOP checklists and validates geotagged closure proof.
- Notifies citizens at every milestone and reopens tickets on negative feedback.

## 1.5 Grounding / Domain Standards
Modeled on **Pune Municipal Corporation (PMC Care)**, **Pimpri-Chinchwad Municipal Corporation (PCMC Sarathi)**, **MoHUA Swachhata Platform**, and the **Maharashtra Right to Public Services Act (RTS)** statutory timelines. All department names, SLA windows, and escalation roles below are carried verbatim from the source spec and must not be altered without explicit stakeholder sign-off, since they are load-bearing for statutory compliance framing.

### 1.5.1 Departmental Taxonomy & Benchmark SLAs

| Category | Typical Grievances | Responsible Department | Field Responder | Statutory SLA | Priority Class |
|---|---|---|---|---|---|
| Water Supply | Main pipeline burst, sewage mixing in drinking lines, low pressure, valve leak | Water Supply & Pumping | Junior Engineer (Water), Valve Inspector | 4–12 hours | P1 (Critical) |
| Solid Waste Management (SWM) | Overflowing community bin, missed door-to-door collection, carcass removal | Health & Sanitation / SWM | Sanitary Inspector (SI), Ward Mukadam | 12–24 hours | P2 (High) |
| Drainage & Sewerage | Choked underground sewer line, open manhole cover, storm drain backup | Drainage Maintenance | Drainage Inspector, Suction Machine Crew | 12–24 hours | P1 / P2 |
| Streetlighting & Electrical | Live exposed cable sparking, blackout on main road, dark alley lights | Electrical Department | Junior Engineer (Electrical), Lineman Squad | 24–48 hours | P2 / P3 |
| Roads & Traffic Infra | Monsoon potholes, sunken trench after utility cable laying, paver damage | Road Maintenance & Civil | Junior Engineer (Civil), Maintenance Road Crew | 48–72 hours | P3 / P4 |

### 1.5.2 Four-Tier Administrative Escalation Matrix

```
[Level 1: Ward Field Responder]
  Roles: Junior Engineer (JE), Sanitary Inspector (SI), Beat Officer
  Responsibility: Physical site verification, contractor dispatch, before/after photo upload.
  Trigger to L2: Unacknowledged within 6 hours OR 80% SLA elapsed without status IN_PROGRESS.
        │
        ▼
[Level 2: Ward Administration]
  Roles: Assistant Municipal Commissioner (AMC) / Executive Engineer (EE)
  Responsibility: Inter-departmental coordination, emergency fund sanction, contractor nudge.
  Trigger to L3: Hard 100% SLA breach reached without ticket closure.
        │
        ▼
[Level 3: Zonal / City Department Head]
  Roles: Deputy Municipal Commissioner (DMC) - Engineering / Sanitation
  Responsibility: Contractor penalty imposition, reallocation of municipal machinery.
  Trigger to L4: Ticket overdue by > 150% of statutory SLA or repeated citizen reopen.
        │
        ▼
[Level 4: Municipal Leadership & Appellate Authority]
  Roles: Municipal Commissioner (IAS) / Chief Grievance Officer
  Responsibility: Statutory disciplinary review under Right to Services Act and public reporting.
```

---

# PART 2 — GOALS, SUCCESS METRICS & SCOPE

## 2.1 Product Goals
- **G1:** Eliminate manual dispatcher triage — 100% of valid complaints auto-classified and auto-routed.
- **G2:** Eliminate redundant crew dispatch through spatial-semantic deduplication.
- **G3:** Make SLA breaches structurally impossible to hide — every breach auto-escalates and is logged immutably.
- **G4:** Provide a reliably demonstrable, compressed-time proof of the escalation engine (virtual clock) for stakeholder/judge evaluation without waiting real hours/days.
- **G5:** Keep citizens informed proactively (push, not pull) at every ticket milestone.

## 2.2 Success Metrics (KPIs)

| Metric | Target |
|---|---|
| Complaint → department routing accuracy | ≥ 90% correct department on first pass (validated against labeled eval set) |
| Duplicate detection precision | ≥ 85% (cosine ≥ 0.85 AND within 150m confirmed as true duplicate) |
| Duplicate detection recall on injected duplicate test batch | ≥ 80% |
| SLA breach detection latency (virtual time) | < 5 seconds from clock advance to escalation write |
| End-to-end ticket ingestion latency (text) | < 8 seconds p95 |
| End-to-end ticket ingestion latency (voice, incl. ASR) | < 20 seconds p95 |
| Admin dashboard real-time update propagation | < 500 ms via WebSocket |
| Audit log completeness | 100% of state transitions produce an `audit_logs` row |
| Citizen notification delivery success | ≥ 95% (WhatsApp/SMS channel combined, with retry) |

## 2.3 In Scope (Product-Level)
- Multi-channel complaint ingestion: Web form, WhatsApp, voice note (Whisper ASR).
- Multilingual/code-mixed (Marathi, Hindi, Hinglish → English) normalization.
- 6-agent LangGraph pipeline (Ingestion, Routing/Priority, Spatial Dedup, SLA/Escalation Orchestrator, Citizen Engagement, Field Officer Copilot).
- Human-in-the-loop (HITL) closure review.
- Admin Command Center with department Kanban boards and ward map.
- Redis-backed virtual time-travel clock with a demo control bar.
- Immutable audit trail of every agent action and escalation.
- Citizen-facing status tracking page + feedback/reopen poll.

## 2.4 Out of Scope (v1)
- Payment/contractor-invoicing workflows.
- Multi-tenant support for more than one municipal corporation (single-corporation deployment assumed for v1; multi-tenancy is a Phase 3 roadmap item — see Part 9).
- Native mobile apps (v1 is responsive web only; a field-officer mobile app is a Phase 3 item).
- Full legal/statutory e-filing integration with the RTS Act appellate portal (framed conceptually only in v1).

---

# PART 3 — USERS & PERSONAS

| Persona | Role | Primary Needs | Primary Surface |
|---|---|---|---|
| **Citizen Complainant** | Resident reporting a grievance | Fast, low-friction reporting in own language/dialect; visibility into status; trust that escalation happens without follow-up calls | Web portal, WhatsApp |
| **Ward Field Responder (JE/SI/Beat Officer)** | Level 1 | Clear queue of assigned tickets, SOP checklist, simple closure-proof upload | Admin web (mobile-responsive) |
| **Ward Administrator (AMC/EE)** | Level 2 | Visibility into unacknowledged/breaching tickets in their ward, ability to nudge contractors | Admin web |
| **Zonal/Department Head (DMC)** | Level 3 | Cross-ward view, contractor penalty tools, reallocation controls | Admin web |
| **Municipal Commissioner / Chief Grievance Officer** | Level 4 | City-wide bottleneck heatmap, statutory compliance reporting | Admin web (executive view) |
| **System/Demo Operator** | Hackathon or ops admin | One-click preset complaint loader, virtual clock control bar, full audit visibility | Admin web (Time-Travel Control Bar) |

---

# PART 4 — FUNCTIONAL REQUIREMENTS

Each requirement is tagged `FR-<Agent>-<n>` and traces to a source-spec agent (Section 3 of source doc) or a platform capability.

## 4.1 Agent A — Ingestion & Multilingual Triage Agent

- **FR-A-1:** System MUST accept complaints via three channels: web form (text + optional photo), WhatsApp (text/voice/image), and direct voice upload, all converging on a single ingestion endpoint/pipeline.
- **FR-A-2:** Voice input MUST be transcribed via Whisper ASR before entering the LangGraph pipeline.
- **FR-A-3:** System MUST normalize code-mixed Marathi/Hindi/Hinglish input into canonical structured English (`canonical_english_summary`).
- **FR-A-4:** System MUST perform Named Entity Recognition to extract `ward_name`, `landmark`, `colony`, `pincode`, and `issue_phrase`.
- **FR-A-5 (Completeness Gatekeeper):** If insufficient spatial anchors exist to dispatch a physical team (e.g., no colony/road/ward), the agent MUST set `missing_critical_info = true` and route the state to Agent E (Citizen Engagement) rather than Agent C.
- **FR-A-6:** Every ingestion decision MUST write a row to `audit_logs` with `acting_agent = 'Agent:Ingestion'`.

## 4.2 Agent B — Department Routing & Priority Assignment Agent

- **FR-B-1:** System MUST map the parsed complaint to exactly one municipal department using the taxonomy in §1.5.1.
- **FR-B-2:** System MUST compute a numerical Priority Score `P ∈ [1, 100]`:
  `P = (W_hazard × S_hazard) + (W_traffic × S_traffic) + (W_pop × S_density) + Δ_cluster`
- **FR-B-3:** Priority tiering MUST follow:
  - `P ≥ 85` → **P1 Critical**, 4–6h SLA
  - `60 ≤ P < 85` → **P2 High**, 12–24h SLA
  - `40 ≤ P < 60` → **P3 Medium**, 24–48h SLA
  - `P < 40` → **P4 Low**, 48–72h SLA
- **FR-B-4:** The resolved SLA duration and deadline (`sla_deadline = created_at/virtual_now + sla_duration_hours`) MUST be persisted at ticket-creation time.
- **FR-B-5:** Routing MUST assign both `assigned_department_id` and an initial `assigned_officer_id` (Level 1, ward-matched).

## 4.3 Agent C — Spatial Deduplication & Clustering Agent

- **FR-C-1:** For every incoming (non-clarification-pending) ticket, system MUST query open active tickets using a compound filter:
  1. Spatial radius: PostGIS `ST_DWithin(coordinates, incoming_point, 150)` meters.
  2. Semantic similarity: pgvector cosine similarity ≥ 0.85 between `embedding` vectors.
- **FR-C-2:** If a match is found, the incoming ticket MUST be marked as a **Child Ticket** (`parent_ticket_id` set), the complainant's phone number added to the parent's notification subscriber list, and the parent's `cluster_size` incremented.
- **FR-C-3:** Clustering a duplicate MUST increase the parent's `Δ_cluster` boost term feeding back into Agent B's priority score (re-scored on cluster growth).
- **FR-C-4:** If no match is found, the ticket proceeds to Agent B as a unique/original incident.

## 4.4 Agent D — SLA Tracker & Escalation Orchestrator Agent

- **FR-D-1:** System MUST continuously (or on every virtual-clock advance) evaluate `Δt = T_deadline − T_virtual_now` for all non-terminal tickets.
- **FR-D-2:** System MUST auto-issue a warning notification at 50% SLA elapsed and again at 80% SLA elapsed.
- **FR-D-3:** On breach of the Level 1→2 trigger (unacknowledged 6h OR 80% elapsed without `IN_PROGRESS`), system MUST promote `escalation_level` to 2 and reassign `assigned_officer_id` to the ward's AMC/EE.
- **FR-D-4:** On hard 100% SLA breach without closure, system MUST transition `status → ESCALATED`, promote to Level 3 (DMC), and set `is_breached = true`.
- **FR-D-5:** On overdue > 150% of statutory SLA, OR repeated citizen reopen, system MUST promote to Level 4 (Commissioner / Chief Grievance Officer).
- **FR-D-6:** Every escalation MUST insert an immutable row into `escalations` (previous level, new level, hours overdue, trigger reason) and a corresponding `audit_logs` entry.
- **FR-D-7:** Every escalation event MUST emit a real-time WebSocket notification to connected Admin dashboards.

## 4.5 Agent E — Citizen Engagement & Feedback Agent

- **FR-E-1:** When `missing_critical_info = true`, the agent MUST send an interactive conversational clarification (WhatsApp/SMS/web-chat) including a one-tap location-pin request.
- **FR-E-2:** System MUST send milestone notifications for: `TICKET_REGISTERED`, `ASSIGNED_TO_OFFICER`, `ESCALATED`, `RESOLVED`.
- **FR-E-3:** Upon `RESOLVED`, system MUST send a side-by-side before/after photo plus a 24-hour reopen poll.
- **FR-E-4:** If the citizen responds "Unresolved" within the poll window, system MUST transition ticket to `REOPENED` and trigger a Level 2 escalation automatically (per FR-D-3 logic).
- **FR-E-5:** All outbound/inbound citizen messages MUST be logged (see `notification_log` in Part 6.2).

## 4.6 Agent F — Field Officer Action Copilot

- **FR-F-1:** On ticket assignment, the agent MUST generate an SOP task checklist appropriate to the category (e.g., valve isolation → pipe collar fitting → pressure test → site cleanup).
- **FR-F-2:** The agent MUST draft a bill-of-materials estimate (e.g., "1× 150mm cast-iron collar sleeve, 2 tons asphalt cold mix").
- **FR-F-3:** On closure submission, the agent MUST validate that the closure photo's embedded geotag is within 100 meters of the original incident coordinates before allowing `status → RESOLVED`.
- **FR-F-4:** Closure without valid geotag proof MUST route to `hitl_review` for manual officer/admin override rather than auto-closing.

## 4.7 Human-in-the-Loop (HITL) Review

- **FR-HITL-1:** Before a ticket transitions from field-submitted closure to citizen-facing `RESOLVED`, a ward officer/admin MUST approve or reject via the Admin dashboard.
- **FR-HITL-2:** Rejection MUST route the state back to `field_copilot` (re-open the checklist) rather than terminating the graph.

## 4.8 Platform / Cross-Cutting

- **FR-P-1 (Admin Command Center):** Department-scoped Kanban boards (`REGISTERED / ASSIGNED / IN_PROGRESS / ESCALATED / RESOLVED`) with ward-level filters.
- **FR-P-2 (Ward Map):** Live map view plotting active tickets by coordinates, color-coded by priority/status.
- **FR-P-3 (Virtual Time-Travel Control Bar):** Admin-only control exposing `[+6h] [+24h] [+48h]` buttons (and a reset-to-real-time control) that atomically update the Redis offset and force an immediate SLA Orchestrator evaluation pass.
- **FR-P-4 (Hackathon Preset Loader):** One-click action that injects 4 canned complaints (water/garbage/road/streetlight) for live demo use.
- **FR-P-5 (RBAC):** Every admin-surface action MUST be authorized against the officer's `hierarchy_tier` and `department_id`/`ward_id` scope.
- **FR-P-6 (Immutable Audit Trail):** Every agent decision, status transition, and escalation MUST be independently reconstructable from `audit_logs` + `escalations`.
- **FR-P-7 (Citizen Tracking Page):** Public, tokenized link per ticket showing live status, SLA countdown, and escalation history (no PII of other citizens exposed).

---

# PART 5 — TECHNICAL REQUIREMENTS DOCUMENT (TRD/TSD)

## 5.1 Confirmed Tech Stack (from source spec — not substituted)

| Layer | Technology | Notes |
|---|---|---|
| Multi-agent orchestration | **LangGraph** (Python) | StateGraph with conditional edges exactly as defined in Part 6.1 below |
| Backend API | **FastAPI** (Python 3.11+) | Async endpoints; Pydantic v2 models mirror the shared agent state |
| Database | **PostgreSQL 15+** with **pgvector** and **PostGIS** extensions | Spatial (`GEOMETRY(Point,4326)`) + semantic (`vector(1536)`) in one store |
| Virtual clock / cache | **Redis** | `ClockService` stores `virtual_time_offset_sec`; also usable for pub/sub of realtime events |
| Frontend | **Next.js** | Citizen portal + Admin Command Center |
| ASR | **Whisper** (OpenAI Whisper API or self-hosted `whisper.cpp`/`faster-whisper`) | **[ASSUMPTION]** hosted vs. self-hosted left to infra team; both satisfy the spec |
| Embeddings | OpenAI text-embedding model or **bge-large** | Source spec allows either; column is fixed at `vector(1536)` — **[ASSUMPTION]** if `bge-large` (1024-dim) is used, either pad/project to 1536 or change the column dimension to match the chosen model; this must be decided before migration and kept consistent everywhere embeddings are written/read |
| Messaging channel | WhatsApp Business API (and/or Twilio as a WhatsApp/SMS BSP) | **[ASSUMPTION]** exact BSP not named in source spec; Twilio assumed as the concrete provider for the `.env` in Part 10 since it covers both WhatsApp and SMS with one credential set |
| Realtime transport | WebSockets (FastAPI native `WebSocket` routes, or Socket.IO) | Powers dashboard live updates and breach alerts |
| Background scheduling | **[ASSUMPTION]** APScheduler or Celery + Redis broker | Needed to periodically re-evaluate SLA state in "real time" mode, in addition to the on-demand evaluation triggered by the Time-Travel Control Bar |
| Styling | **[ASSUMPTION]** Tailwind CSS | Not named in source spec; standard, low-friction pairing with Next.js. Swap freely if the team has a house design system. |
| Containerization | Docker + Docker Compose (local), any container host in prod | **[ASSUMPTION]** host-agnostic; source spec does not mandate a specific cloud provider |

## 5.2 Non-Functional Requirements

### 5.2.1 Performance
- Web portal complaint-submission page: first contentful paint < 1.5s on 4G.
- API p95 latency (non-LLM endpoints): < 300ms.
- Full agent pipeline (text channel, excluding LLM cold starts): < 8s p95 end-to-end.
- Admin dashboard: real-time ticket state changes visible within 500ms via WebSocket push.

### 5.2.2 Scalability
- Stateless FastAPI instances behind a load balancer; horizontal scale-out for ingestion spikes (e.g., monsoon season pothole surges).
- LangGraph agent execution should be invocable as async background tasks/workers so a burst of citizen submissions doesn't block API responsiveness (ticket is created in `REGISTERED` state immediately; agent pipeline continues asynchronously and streams state updates over WebSocket).
- PostgreSQL: HNSW index on `embedding` and GIST index on `coordinates` (both specified in source schema) are mandatory at scale — do not skip during migration.

### 5.2.3 Security
- All traffic over TLS 1.2+.
- Authentication: JWT (access + refresh token pair) for all Admin/officer surfaces; OAuth2 password flow at minimum for v1 **[ASSUMPTION — SSO/OIDC deferred to Phase 3]**.
- Authorization: RBAC keyed on `officers.hierarchy_tier` (1–4) and `officers.department_id`/`ward_id`; a Level 1 officer must not see or act on tickets outside their ward; a Level 3 DMC may see all wards within their department.
- PII (citizen phone numbers, addresses) encrypted at rest (e.g., `pgcrypto` column-level encryption or field-level app-layer encryption) — **[ASSUMPTION, not specified in source spec but required for statutory compliance]**.
- All inbound webhook endpoints (WhatsApp) MUST verify provider signatures before processing.
- Rate limiting on public ingestion endpoints to prevent spam/abuse of the citizen-facing complaint form.
- Audit logs (`audit_logs`, `escalations`) MUST be append-only (no `UPDATE`/`DELETE` grants for application roles).

### 5.2.4 Availability & Reliability
- Target 99.5% uptime for citizen-facing ingestion (v1, single-corporation deployment).
- SLA Orchestrator evaluation pass MUST be idempotent — re-running it must not double-escalate or duplicate `escalations` rows for the same breach event.
- Outbound notification delivery (WhatsApp/SMS) MUST retry with backoff and log final failure state rather than silently dropping.

### 5.2.5 Observability
- Structured JSON logging across FastAPI + LangGraph nodes, correlated by `ticket_id`.
- `audit_logs.payload_snapshot` (JSONB) captures full state snapshot at each agent transition for debuggability and post-incident review.
- Health-check endpoints (`/healthz`, `/readyz`) for orchestration/monitoring.

### 5.2.6 Compliance
- SLA windows and escalation triggers must remain configurable per the `sla_policies` table (not hardcoded) so statutory timeline changes under the RTS Act can be applied without a code deploy.

---

# PART 6 — BACKEND & DATABASE SCHEMA

## 6.1 Shared Multi-Agent State (LangGraph)

### 6.1.1 StateGraph Node Topology (verbatim from source spec)

```python
# State transition topology
builder = StateGraph(MunicipalIncidentAgentState)

builder.add_node("ingestion_multilingual", ingestion_multilingual_agent)
builder.add_node("citizen_followup", citizen_followup_agent)
builder.add_node("spatial_clustering", spatial_clustering_agent)
builder.add_node("routing_priority", routing_priority_agent)
builder.add_node("sla_orchestration", sla_orchestration_agent)
builder.add_node("field_copilot", field_copilot_agent)
builder.add_node("hitl_review", hitl_review_node)
builder.add_node("citizen_notify", citizen_notify_agent)

# Conditional Edges
builder.add_edge(START, "ingestion_multilingual")

builder.add_conditional_edges(
    "ingestion_multilingual",
    lambda state: "citizen_followup" if state["missing_critical_info"] else "spatial_clustering"
)

builder.add_conditional_edges(
    "spatial_clustering",
    lambda state: "citizen_notify" if state["is_duplicate"] else "routing_priority"
)

builder.add_edge("routing_priority", "sla_orchestration")
builder.add_edge("sla_orchestration", "field_copilot")
builder.add_edge("field_copilot", "hitl_review")

builder.add_conditional_edges(
    "hitl_review",
    lambda state: "citizen_notify" if state["closure_approved"] else "field_copilot"
)

builder.add_edge("citizen_notify", END)
```

### 6.1.2 Shared Agent State Schema (Pydantic)

```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class PriorityEnum(str, Enum):
    P1_CRITICAL = "P1_CRITICAL"
    P2_HIGH = "P2_HIGH"
    P3_MEDIUM = "P3_MEDIUM"
    P4_LOW = "P4_LOW"


class TicketStatusEnum(str, Enum):
    REGISTERED = "REGISTERED"
    PENDING_INFO = "PENDING_INFO"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    ESCALATED = "ESCALATED"
    RESOLVED = "RESOLVED"
    REOPENED = "REOPENED"


class MunicipalIncidentAgentState(BaseModel):
    ticket_id: str
    parent_ticket_id: Optional[str] = None
    created_at: datetime
    raw_input_text: str
    detected_language: str
    channel: str  # WEB, WHATSAPP, VOICE

    # Extracted Spatial & Categorical Data
    canonical_english_summary: str
    extracted_category: str
    ward_id: str
    landmark: Optional[str] = None
    latitude: float
    longitude: float
    missing_critical_info: bool = False

    # Deduplication
    is_duplicate: bool = False
    cluster_incident_id: Optional[str] = None
    cluster_size: int = 1

    # Routing & SLA
    assigned_department_id: str
    assigned_officer_id: str
    priority_level: PriorityEnum
    priority_score: float
    sla_duration_hours: int
    sla_deadline: datetime
    escalation_level: int = 1  # 1: Ward JE, 2: AMC/EE, 3: DMC, 4: Commissioner

    # Actions & Proof
    sop_checklist: List[str] = []
    closure_proof_photo_url: Optional[str] = None
    closure_approved: bool = False

    # Audit Trail
    audit_history: List[Dict[str, Any]] = []
```

## 6.2 PostgreSQL / pgvector / PostGIS Schema

### 6.2.1 Core Schema (verbatim from source spec)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Municipal Departments
CREATE TABLE departments (
    department_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    head_officer_email VARCHAR(150) NOT NULL
);

-- 2. Administrative Officers
CREATE TABLE officers (
    officer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(department_id),
    name VARCHAR(120) NOT NULL,
    designation VARCHAR(80) NOT NULL,  -- 'Junior Engineer', 'Executive Engineer', 'Deputy Commissioner'
    hierarchy_tier INT NOT NULL,       -- 1: Ward Field, 2: Ward Admin, 3: Zonal Head, 4: Commissioner
    ward_id VARCHAR(50) NOT NULL,      -- 'Ward-14 (Kothrud)', 'Ward-08 (Aundh)'
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL
);

-- 3. Statutory SLA Policies
CREATE TABLE sla_policies (
    policy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID REFERENCES departments(department_id),
    category VARCHAR(80) NOT NULL,
    priority_tier VARCHAR(20) NOT NULL, -- 'P1_CRITICAL', 'P2_HIGH', 'P3_MEDIUM', 'P4_LOW'
    resolution_sla_hours INT NOT NULL,
    l2_escalation_hours INT NOT NULL,
    l3_escalation_hours INT NOT NULL
);

-- 4. Complaints Master Table
CREATE TABLE complaints (
    ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. 'PMC-2026-WAT-0492'
    parent_ticket_id UUID REFERENCES complaints(ticket_id) ON DELETE SET NULL,
    raw_text TEXT NOT NULL,
    canonical_text TEXT NOT NULL,
    category VARCHAR(80) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'REGISTERED',

    ward_id VARCHAR(50) NOT NULL,
    location_address TEXT NOT NULL,
    landmark TEXT,
    coordinates GEOMETRY(Point, 4326),
    embedding vector(1536), -- OpenAI / bge-large text embedding

    assigned_department_id UUID REFERENCES departments(department_id),
    assigned_officer_id UUID REFERENCES officers(officer_id),

    escalation_level INT NOT NULL DEFAULT 1,
    current_sla_deadline TIMESTAMPTZ NOT NULL,
    is_breached BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Escalations Ledger
CREATE TABLE escalations (
    escalation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
    from_officer_id UUID REFERENCES officers(officer_id),
    to_officer_id UUID REFERENCES officers(officer_id),
    previous_level INT NOT NULL,
    new_level INT NOT NULL,
    breach_hours_overdue NUMERIC(6, 2) NOT NULL,
    trigger_reason TEXT NOT NULL,
    escalated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Comprehensive Audit Logs
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
    acting_agent VARCHAR(80) NOT NULL, -- 'Agent:Ingestion', 'Agent:Router', 'Agent:SLA_Orchestrator'
    action_type VARCHAR(100) NOT NULL,
    payload_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid spatial, vector, and temporal lookups
CREATE INDEX idx_complaints_parent ON complaints(parent_ticket_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_sla ON complaints(current_sla_deadline);
CREATE INDEX idx_complaints_spatial ON complaints USING GIST (coordinates);
CREATE INDEX idx_complaints_embedding ON complaints USING hnsw (embedding vector_cosine_ops);
```

### 6.2.2 Extended Supporting Schema (recommended additions — not in source spec, required to fully satisfy the Functional Requirements in Part 4)

These tables are additive; they do not alter or replace anything in §6.2.1.

```sql
-- 7. Citizens (for repeat-complainant tracking, cluster subscriber lists, auth-free tokenized tracking)
CREATE TABLE citizens (
    citizen_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    display_name VARCHAR(120),
    preferred_language VARCHAR(20) DEFAULT 'auto',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Complaint <-> Citizen linkage (a ticket has one filer; a cluster can have many subscribers)
CREATE TABLE complaint_subscribers (
    complaint_id UUID NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
    citizen_id UUID NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
    is_original_filer BOOLEAN NOT NULL DEFAULT FALSE,
    subscribed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (complaint_id, citizen_id)
);

-- 9. Notification Log (Agent E outbound/inbound message audit)
CREATE TABLE notification_log (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
    citizen_id UUID REFERENCES citizens(citizen_id),
    channel VARCHAR(20) NOT NULL, -- 'WHATSAPP', 'SMS', 'WEB_CHAT'
    direction VARCHAR(10) NOT NULL, -- 'OUTBOUND', 'INBOUND'
    milestone VARCHAR(40), -- 'TICKET_REGISTERED','ASSIGNED_TO_OFFICER','ESCALATED','RESOLVED', NULL for freeform
    message_body TEXT NOT NULL,
    delivery_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, FAILED
    provider_message_id VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Feedback / Reopen Polls
CREATE TABLE feedback_polls (
    poll_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL, -- sent_at + 24h
    response VARCHAR(20), -- 'RESOLVED_CONFIRMED', 'UNRESOLVED', NULL = no response yet
    responded_at TIMESTAMPTZ
);

-- 11. SOP Templates (library backing Agent F checklist generation)
CREATE TABLE sop_templates (
    template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(80) NOT NULL,
    checklist_items JSONB NOT NULL, -- ordered array of task strings
    bill_of_materials JSONB,        -- array of {item, quantity, unit}
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Media Assets (before/after/closure photos, voice note originals)
CREATE TABLE media_assets (
    media_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
    asset_type VARCHAR(20) NOT NULL, -- 'VOICE_ORIGINAL','PHOTO_BEFORE','PHOTO_AFTER','PHOTO_CLOSURE'
    storage_url TEXT NOT NULL,
    geotag_lat DOUBLE PRECISION,
    geotag_lng DOUBLE PRECISION,
    geotag_valid BOOLEAN, -- set by Agent F per FR-F-3
    uploaded_by_officer_id UUID REFERENCES officers(officer_id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. Admin/Officer Auth (session-bearing accounts distinct from the officers directory row)
CREATE TABLE officer_accounts (
    account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    officer_id UUID NOT NULL REFERENCES officers(officer_id) ON DELETE CASCADE,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Extended indices
CREATE INDEX idx_notification_ticket ON notification_log(ticket_id);
CREATE INDEX idx_feedback_ticket ON feedback_polls(ticket_id);
CREATE INDEX idx_media_ticket ON media_assets(ticket_id);
CREATE INDEX idx_subscribers_citizen ON complaint_subscribers(citizen_id);
```

## 6.3 Priority Score Formula (Agent B)

```
P = (W_hazard × S_hazard) + (W_traffic × S_traffic) + (W_pop × S_density) + Δ_cluster

P ≥ 85            → P1_CRITICAL  → 4–6h SLA
60 ≤ P < 85       → P2_HIGH      → 12–24h SLA
40 ≤ P < 60       → P3_MEDIUM    → 24–48h SLA
P < 40            → P4_LOW       → 48–72h SLA
```

**[ASSUMPTION]** The source spec defines the formula's shape but not the exact numeric weights (`W_hazard`, `W_traffic`, `W_pop`) or the per-category baseline `S_hazard`/`S_traffic`/`S_density` scores. These must be defined in a config table (or extend `sla_policies`) before Agent B can run deterministically — recommend seeding a `priority_weights` config table keyed by category, with values tunable without a redeploy.

---

# PART 7 — API ARCHITECTURE & APP FLOW BLUEPRINT

## 7.1 High-Level Sequential App Flow

```
Citizen (Web / WhatsApp / Voice)
   │
   ▼
POST /api/v1/complaints  (ticket created, status=REGISTERED, returns tracking token immediately)
   │
   ▼  [async background task kicks off LangGraph run]
Agent A: ingestion_multilingual
   │
   ├─ missing_critical_info=true ──► Agent E: citizen_followup ──► (citizen responds) ──► loop back to Agent A
   │
   └─ complete ──► Agent C: spatial_clustering
                        │
                        ├─ is_duplicate=true ──► Agent (citizen_notify: "merged into existing report") ──► END
                        │
                        └─ unique ──► Agent B: routing_priority
                                          │
                                          ▼
                                   Agent D: sla_orchestration (sets deadline, starts monitoring)
                                          │
                                          ▼
                                   Agent F: field_copilot (SOP + BOM generated, ticket appears in officer Kanban)
                                          │
                                          ▼
                          [officer works ticket in Admin UI; uploads closure photo]
                                          │
                                          ▼
                                   hitl_review (admin/officer approves or rejects)
                                          │
                          ┌───────────────┴────────────────┐
                       rejected                          approved
                          │                                 │
                          ▼                                 ▼
                  back to field_copilot            citizen_notify: RESOLVED + feedback poll
                                                              │
                                              ┌───────────────┴──────────────┐
                                         "Unresolved"                  no response / confirmed
                                              │                                │
                                              ▼                                ▼
                                     status=REOPENED,                      status stays RESOLVED
                                     escalate to Level 2                   (terminal)
```

Independently and continuously (or triggered by Time-Travel advance):
```
SLA Monitor Loop (Agent D) → for each active ticket → compute elapsed% →
   50%/80% → send warning notifications
   100%    → ESCALATED, level+1, write escalations + audit_logs, push WebSocket event
   >150% or repeated reopen → level 4
```

## 7.2 REST API Endpoints

### 7.2.1 Public / Citizen-Facing

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/complaints` | Create a complaint (channel-agnostic body: `{channel, text?, audio_url?, photo_url?, phone_number, latitude?, longitude?}`). Returns `ticket_id`, `ticket_number`, `tracking_token`. |
| `GET` | `/api/v1/complaints/track/{tracking_token}` | Public status view: status, priority, SLA countdown, escalation history (sanitized, no internal officer PII). |
| `POST` | `/api/v1/complaints/{ticket_id}/clarify` | Citizen supplies missing info requested by Agent E (e.g., location pin, landmark text). |
| `POST` | `/api/v1/complaints/{ticket_id}/feedback` | Citizen responds to the resolution poll (`RESOLVED_CONFIRMED` \| `UNRESOLVED`). |
| `POST` | `/webhooks/whatsapp/inbound` | WhatsApp Business API inbound webhook (signature-verified). |
| `POST` | `/webhooks/whatsapp/status` | Delivery status callbacks, updates `notification_log.delivery_status`. |

### 7.2.2 Admin / Officer (JWT-protected, RBAC-scoped)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Officer login → access + refresh JWT. |
| `POST` | `/api/v1/auth/refresh` | Refresh access token. |
| `GET` | `/api/v1/tickets` | List/filter tickets by department, ward, status, priority, escalation level (scoped to caller's RBAC). |
| `GET` | `/api/v1/tickets/{ticket_id}` | Full ticket detail incl. audit trail, cluster children, media. |
| `PATCH` | `/api/v1/tickets/{ticket_id}/status` | Officer transitions status (e.g., `ASSIGNED → IN_PROGRESS`). |
| `POST` | `/api/v1/tickets/{ticket_id}/closure` | Submit closure proof photo(s); triggers Agent F geotag validation → `hitl_review`. |
| `POST` | `/api/v1/tickets/{ticket_id}/hitl-decision` | Admin/officer approves or rejects a pending closure. |
| `GET` | `/api/v1/tickets/{ticket_id}/audit` | Full immutable audit + escalation history. |
| `GET` | `/api/v1/departments` / `/api/v1/officers` / `/api/v1/sla-policies` | Reference-data CRUD (Commissioner/admin role only for writes). |
| `POST` | `/api/v1/demo/load-presets` | Loads the 4 canned hackathon complaints (FR-P-4). Should be feature-flagged off in production. |
| `POST` | `/api/v1/clock/advance` | Body: `{hours: 6\|24\|48}`. Advances Redis virtual offset and forces an SLA Orchestrator pass. Admin-only. |
| `POST` | `/api/v1/clock/reset` | Resets virtual offset to 0 (real time). Admin-only. |
| `GET` | `/api/v1/clock/current` | Returns current virtual time + offset (for dashboard display). |

### 7.2.3 Real-Time

| Transport | Path | Payload |
|---|---|---|
| `WebSocket` | `/ws/admin/dashboard` | Pushes ticket state changes, new escalations, SLA breach alerts as they occur. |
| `WebSocket` | `/ws/citizen/{tracking_token}` | Pushes status updates to a citizen's open tracking page. |

## 7.3 Key Behind-the-Scenes Action Maps

| User Action | Behind-the-Scenes Sequence |
|---|---|
| Citizen submits complaint on web form | Row inserted into `complaints` (`status=REGISTERED`) → `citizens` upsert by phone → background LangGraph run starts → Agent A parses/embeds → `audit_logs` row written → WebSocket event to any admin dashboards → if complete, proceeds through C→B→D→F. |
| Citizen sends WhatsApp voice note | Webhook receives media URL → download → Whisper ASR transcription → same pipeline as above with `channel=VOICE`. |
| Officer clicks "Acknowledge" on Kanban card | `PATCH /tickets/{id}/status → IN_PROGRESS` → cancels the pending L1→L2 "unacknowledged 6h" escalation clock for that ticket → `audit_logs` entry. |
| Admin clicks `[+24 Hours]` | `POST /clock/advance {hours:24}` → Redis offset updated → Agent D re-evaluates every active ticket against new virtual time → any newly-breaching tickets get `status=ESCALATED`, `escalation_level+=1`, `escalations` row inserted, `audit_logs` row inserted → WebSocket broadcast → dashboard cards flash red. |
| Officer uploads closure photo | `POST /tickets/{id}/closure` → `media_assets` row (`PHOTO_CLOSURE`) → Agent F checks EXIF/geotag vs. incident coordinates (≤100m) → if valid, ticket enters `hitl_review`; if invalid, flagged for manual override. |
| Admin approves closure in HITL screen | `POST /tickets/{id}/hitl-decision {approved:true}` → `status=RESOLVED`, `resolved_at` set → Agent E fires `RESOLVED` milestone + feedback poll (`feedback_polls` row, `expires_at = now+24h`). |
| Citizen taps "Unresolved" in poll | `POST /complaints/{id}/feedback {response:"UNRESOLVED"}` → `status=REOPENED` → auto Level 2 escalation per FR-E-4/FR-D-3 → `escalations` + `audit_logs` rows → notify AMC/EE. |

---

# PART 8 — UI/UX STYLE GUIDE & COMPONENT DOCUMENT

## 8.1 Design Principles
- **Clarity under urgency:** SLA state must be legible at a glance (color + numeric countdown, never color alone).
- **Low literacy / low bandwidth friendly** on the citizen side: large tap targets, minimal text entry, WhatsApp-first patterns (buttons/quick replies over free text where possible).
- **Density with structure** on the admin side: Kanban + map + control bar coexist without visual competition.

## 8.2 Theme & Color Tokens

**[ASSUMPTION — exact hex values are a starting proposal; swap for house brand tokens/Figma file if one exists]**

| Token | Hex | Usage |
|---|---|---|
| `--priority-p1-critical` | `#DC2626` (red-600) | P1 badges, breach flashes |
| `--priority-p2-high` | `#EA580C` (orange-600) | P2 badges |
| `--priority-p3-medium` | `#CA8A04` (yellow-600) | P3 badges |
| `--priority-p4-low` | `#16A34A` (green-600) | P4 badges |
| `--status-registered` | `#64748B` (slate-500) | Registered column |
| `--status-in-progress` | `#2563EB` (blue-600) | In-progress column |
| `--status-escalated` | `#B91C1C` (red-700) | Escalated column / alert banner |
| `--status-resolved` | `#15803D` (green-700) | Resolved column |
| `--surface-base` | `#FFFFFF` | Base surface |
| `--surface-muted` | `#F1F5F9` (slate-100) | Card backgrounds |
| `--text-primary` | `#0F172A` (slate-900) | Body text |
| `--text-muted` | `#475569` (slate-600) | Secondary text |
| `--civic-accent` | `#0E7490` (cyan-700) | Primary CTA, municipal branding accent |

## 8.3 Typography
- **[ASSUMPTION]** Primary typeface: **Inter** (or system-ui fallback stack) for Latin script; ensure the chosen font has good Devanagari companion coverage (e.g., **Noto Sans** for Marathi/Hindi glyphs rendered in transcripts) since raw citizen input may be shown verbatim alongside its canonical English translation.
- Scale: `text-xs (12px)` metadata → `text-sm (14px)` body → `text-base (16px)` primary content → `text-lg/xl` section headers → `text-2xl+` dashboard KPI numbers.

## 8.4 Layout Structures

### 8.4.1 Citizen Portal
- Single-column, mobile-first form: channel selector → free-text/voice-record input → optional photo → submit → confirmation screen with tracking link + WhatsApp opt-in for updates.
- Tracking page: status stepper (`Registered → Assigned → In Progress → Resolved`, with an `Escalated` state visually branching in red if triggered), SLA countdown, escalation history timeline, feedback poll widget post-resolution.

### 8.4.2 Admin Command Center
- **Top bar:** Corporation logo, current virtual time display, user/role badge, logout.
- **Time-Travel Control Bar** (persistent, admin-only): `[Reset] [+6h] [+24h] [+48h]` buttons + live virtual-clock readout; triggers a toast/banner animation and red-flash on any newly escalated card.
- **Left rail:** Department/ward filters, priority filter, status filter.
- **Main panel (tab 1 — Kanban):** Columns = `Registered / Assigned / In Progress / Escalated / Resolved`; each card shows ticket number, category icon, priority badge, SLA countdown ring, ward tag, cluster-size badge if > 1.
- **Main panel (tab 2 — Map):** Ward-boundary overlay, pins colored by priority, clustering shown as a stacked pin with count.
- **Ticket detail drawer (slide-over):** Canonical summary, raw original text (with detected language tag), extracted entities, audit trail timeline, escalation ledger, media gallery (before/after/closure), HITL approve/reject actions.
- **Executive view (Level 4 only):** City-wide heatmap of open breaches by department, aggregate KPIs (from Part 2.2), statutory compliance % gauge.

## 8.5 Component Inventory

| Component | States | Notes |
|---|---|---|
| `PriorityBadge` | P1/P2/P3/P4 | Color token per §8.2 + text label (never color-only, for accessibility) |
| `SlaCountdownRing` | Normal (<50%), Warning (50–80%), Critical (80–100%), Breached (>100%) | Numeric hours-remaining always shown alongside the ring |
| `StatusStepper` | Registered/Assigned/In Progress/Escalated/Resolved/Reopened | Used on citizen tracking page |
| `EscalationTimeline` | List of `escalations` rows | Officer name, level transition, trigger reason, timestamp |
| `TimeTravelControlBar` | Idle / Advancing (loading) / Just-advanced (flash) | Disabled for non-admin roles |
| `ClusterBadge` | `1` (hidden) / `>1` (shown, e.g. "×5 reports") | On Kanban card and map pin |
| `HITLReviewPanel` | Pending / Approved / Rejected | Approve/Reject buttons, closure photo compare view |
| `ConversationalClarifyWidget` | Awaiting response / Location pin captured / Completed | Used in both web-chat and rendered WhatsApp-mirrored view in admin |
| `KanbanCard` | Composite of `PriorityBadge` + `SlaCountdownRing` + `ClusterBadge` | Draggable only within permitted status transitions per role |

## 8.6 Accessibility
- Minimum 4.5:1 contrast for all status/priority text.
- All color-coded states paired with an icon or text label.
- Keyboard-navigable Kanban and HITL approval flow (not drag-only).

## 8.7 Design File Linkage
**[ASSUMPTION]** No Figma/wireframe file was provided in the source spec. Recommend the design team produce a Figma file mirroring §8.4–8.5 and link it here (e.g., `Figma: <link-to-be-added>`) before frontend implementation begins, so this document stays the single source of truth once that link exists.

---

# PART 9 — IMPLEMENTATION ROADMAP

## Phase 0 — Foundation (Pre-Build)
- Repo scaffolding: `backend/` (FastAPI + LangGraph), `frontend/` (Next.js), `infra/` (Docker Compose: Postgres+PostGIS+pgvector, Redis).
- DB migration tooling (e.g., Alembic) wired to the schema in Part 6.
- Seed data: departments, officers (across all 4 hierarchy tiers, multiple wards), `sla_policies` per category/priority, `sop_templates` per category.
- CI pipeline: lint, type-check, migration dry-run, basic API smoke tests.

## Phase 1 — MVP (Hackathon/Demo-Critical Scope)
**Goal: the full agent pipeline runs end-to-end and the escalation story is demonstrable live.**
1. Agent A (text-channel only first; Marathi/Hindi/Hinglish → English normalization + NER via LLM prompt) — FR-A-1…A-6 (voice/WhatsApp channels deferred to Phase 2).
2. Agent B routing + priority scoring — FR-B-1…B-5 (with a starter, hardcoded-but-config-table-backed weight set per §6.3 assumption).
3. Agent C spatial + semantic deduplication — FR-C-1…C-4 (PostGIS + pgvector wiring, HNSW/GIST indices live).
4. `complaints`, `departments`, `officers`, `sla_policies`, `escalations`, `audit_logs` tables migrated and seeded.
5. Agent D SLA orchestrator + Redis `ClockService` (Part 11.2 code) + 4-tier escalation logic — FR-D-1…D-7.
6. Admin Command Center: Kanban board (FR-P-1), Time-Travel Control Bar (FR-P-3), audit trail viewer.
7. Hackathon Preset Loader (FR-P-4) — the 4 canned complaints from Part 11.1.
8. Basic citizen tracking page (read-only status, no auth) — subset of FR-P-7.
9. WebSocket push of escalation events to the dashboard (FR-D-7).
10. **Definition of done for Phase 1:** the Part 11.1 demo script can be run start-to-finish without manual DB edits.

## Phase 2 — Full Functional Completeness
1. WhatsApp Business API integration (inbound webhook, outbound milestone messages) — completes FR-A-1, FR-E-1…E-5.
2. Whisper ASR voice-note ingestion — completes FR-A-2.
3. Agent E full conversational clarification flow (`citizen_followup` node) with one-tap location pin capture — FR-E-1.
4. Agent F: SOP checklist + bill-of-materials generation (`sop_templates`-backed) and geotag validation on closure — FR-F-1…F-4.
5. HITL review UI + workflow (approve/reject loop back to `field_copilot`) — FR-HITL-1…HITL-2.
6. Feedback/reopen poll (`feedback_polls`) with auto Level-2 escalation on "Unresolved" — FR-E-3…E-4.
7. RBAC hardening across all admin endpoints (officer accounts, JWT, ward/department scoping) — FR-P-5, §5.2.3.
8. Ward map view with clustering visualization (FR-P-2).
9. Notification delivery retries + `notification_log` completeness (§5.2.4).
10. Observability: structured logging, `/healthz`/`/readyz`, correlation IDs.

## Phase 3 — Scale & Production Hardening
1. Multi-tenant support (multiple municipal corporations in one deployment).
2. Executive/Commissioner heatmap analytics view (city-wide bottleneck reporting) — completes the Level 4 persona surface.
3. SSO/OIDC for officer accounts (replace v1 password-only auth).
4. Field-officer mobile app (native or PWA) for on-site closure photo capture with better offline handling.
5. Load testing (ingestion burst simulation, e.g., monsoon pothole surge) and horizontal scaling validation.
6. Penetration testing and PII-encryption audit (§5.2.3).
7. Formal statutory reporting export (RTS Act compliance reports) for the Commissioner's office.
8. Background scheduler productionization (Celery + Redis broker or equivalent) replacing/augmenting on-demand evaluation for true real-time (non-demo) operation.

---

# PART 10 — ENVIRONMENT CONFIGURATION (`.env.example`)

```bash
# ── Environment ───────────────────────────────────────────────
ENVIRONMENT=development                # development | staging | production
APP_BASE_URL=http://localhost:8000
FRONTEND_BASE_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000

# ── Database (PostgreSQL + PostGIS + pgvector) ───────────────
DATABASE_URL=postgresql+asyncpg://civic_router:changeme@localhost:5432/civic_router_db
DB_POOL_MIN=2
DB_POOL_MAX=10

# ── Redis (Virtual Clock / Cache / Realtime pub-sub) ─────────
REDIS_URL=redis://localhost:6379/0
VIRTUAL_CLOCK_REDIS_KEY=virtual_time_offset_sec

# ── LLM / Embeddings ──────────────────────────────────────────
LLM_PROVIDER=openai                     # openai | azure_openai | self_hosted
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
EMBEDDING_MODEL=text-embedding-3-small  # must match the vector() dimension used in schema
EMBEDDING_DIM=1536

# ── ASR (Whisper) ─────────────────────────────────────────────
ASR_PROVIDER=openai_whisper_api         # openai_whisper_api | self_hosted
WHISPER_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
WHISPER_MODEL=whisper-1

# ── Messaging (WhatsApp / SMS via BSP) ────────────────────────
MESSAGING_PROVIDER=twilio                # twilio | meta_whatsapp_cloud_api
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_SMS_FROM=+1xxxxxxxxxx
WHATSAPP_WEBHOOK_VERIFY_TOKEN=changeme

# ── Auth / JWT ────────────────────────────────────────────────
JWT_SECRET_KEY=changeme-generate-a-long-random-string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ── Maps (Ward Map / Geocoding) ───────────────────────────────
MAPS_PROVIDER=mapbox                     # mapbox | google_maps
MAPBOX_API_KEY=pk.xxxxxxxxxxxxxxxxxxxxxxxx

# ── Media Storage (photos, voice originals) ───────────────────
STORAGE_PROVIDER=s3                      # s3 | gcs | local
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=ap-south-1
S3_BUCKET_NAME=civic-router-media

# ── Background Jobs ────────────────────────────────────────────
SCHEDULER_BROKER_URL=redis://localhost:6379/1
SLA_EVAL_INTERVAL_SECONDS=60             # real-time mode polling cadence (demo mode uses on-demand /clock/advance instead)

# ── Frontend (Next.js public vars) ────────────────────────────
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxxxxxxxxxxxxxxxxxx

# ── Observability ──────────────────────────────────────────────
LOG_LEVEL=INFO
SENTRY_DSN=
```

---

# PART 11 — LIVE DEMO SCRIPT & JUDGING RUBRIC ALIGNMENT
*(carried over from the source spec — treat as an acceptance script for Phase 1/MVP)*

## 11.1 The Virtual Time-Travel Simulation Engine

**Rationale:** Hackathon judging rounds are limited to 3–5 minutes; a 6/24/48-hour SLA engine cannot be verified in real-world time.

**Implementation blueprint:**
1. A centralized `ClockService` maintains a global time offset (`simulated_offset_seconds`) stored atomically in Redis.
2. Every DB query, state transition, and agent heartbeat reads the simulated clock: `Current Virtual Time = System Clock + Redis Offset`.
3. The Admin dashboard exposes a **"Time-Travel Control Bar"** with buttons: `[+6 Hours] [+24 Hours] [+48 Hours]`.
4. Clicking a time advance updates Redis and immediately forces an evaluation pass by the SLA Monitoring Agent. Tickets exceeding their deadlines turn red, transition to `ESCALATED`, update their escalation tier, and emit real-time WebSocket notifications.

```python
# backend/services/clock_service.py
import redis
from datetime import datetime, timezone, timedelta

redis_conn = redis.Redis(host='localhost', port=6379, db=0)


def get_current_virtual_time() -> datetime:
    offset = int(redis_conn.get("virtual_time_offset_sec") or 0)
    return datetime.now(timezone.utc) + timedelta(seconds=offset)


def advance_virtual_clock(hours: int) -> datetime:
    current_offset = int(redis_conn.get("virtual_time_offset_sec") or 0)
    new_offset = current_offset + (hours * 3600)
    redis_conn.set("virtual_time_offset_sec", new_offset)
    return get_current_virtual_time()
```

## 11.2 3-Minute Live Demo Script

| Elapsed Time | Screen View | Presenter Narration & Live Actions |
|---|---|---|
| 0:00–0:40 | Citizen Portal (split screen: chat + live ward map) | Click "Load Hackathon Presets" to inject 4 complaints at once: (1) Water — "Main pipeline burst near Shivaji Chowk, water flooding entire street." (2) Garbage — "Overflowing bin on Market Road uncollected for 3 days." (3) Road — "Huge pothole after bridge causing bike skids." (4) Streetlight — "3 streetlights dark in lane 5 behind bus terminal." Narration: citizens report in natural, code-mixed language; the Ingestion Agent extracts intent, ward, and flags missing landmarks. |
| 0:40–1:15 | Agent Execution Trace (LangGraph live JSON state stream) | Highlight streaming node executions. Narration: the Triage Agent marks the water main burst P1 Critical (6h SLA); the Deduplication Agent spatially/semantically confirms the garbage complaint duplicates an existing Ward-14 parent ticket, clustering without dispatching a duplicate truck. |
| 1:15–1:50 | Admin Department Command Center (Kanban) | Show all 4 tickets auto-routed: Water → JE (Water, Ward 14); Solid Waste → Sanitary Inspector; Road → JE (Civil); Electrical → Ward Lineman Squad. Narration: zero manual dispatcher overhead; each lands in the right officer's queue with an auto-generated SOP checklist. |
| 1:50–2:35 | SLA Time-Travel Demonstration (Control Bar) | Click `[+24 Hours]`. Effects: SLA breach alert fires; the Water ticket turns red — `SLA BREACHED (+18h Overdue)`; status auto-updates to `ESCALATED`; assigned officer shifts from Junior Engineer (L1) to Deputy Municipal Commissioner (L3); an immutable escalation audit log is written. Narration: fast-forwarding 24 virtual hours shows the SLA Orchestrator autonomously escalating an unaddressed critical water emergency. |
| 2:35–3:00 | Citizen Transparency & Verification View | Switch to citizen tracking link showing updated status and audit logs. Narration: citizens get proactive escalation notices instead of silence; leadership gets an automated bottleneck heatmap — autonomous civic governance. |

## 11.3 Judging Rubric Alignment

| Evaluation Criterion | How This Build Excels |
|---|---|
| True Multi-Agent Depth | 6 discrete agents (Triage, Spatial Dedup, Routing, SLA Orchestrator, Citizen Engagement, Field Copilot) in a cyclical, stateful LangGraph. |
| Technical Differentiation | PostGIS spatial indexing + pgvector semantic deduplication solve real redundant-dispatch problems. |
| Live Demo Wow Factor | The Virtual Time-Travel Engine gives a visual, reliable way to show SLA overruns and multi-tier escalation live on stage. |
| Local Domain Authenticity | Genuine Indian municipal nomenclature (Ward/Prabhag, Junior Engineer, Sanitary Inspector, AMC, DMC) and statutory Citizen Charter timelines. |

---

# PART 12 — RISKS, ASSUMPTIONS & GLOSSARY

## 12.1 Consolidated List of Assumptions (flagged inline above, gathered here for quick sign-off)
1. Embedding model choice (OpenAI vs. `bge-large`) and its dimensionality must be pinned before migration; schema currently fixes `vector(1536)`.
2. Messaging BSP: Twilio assumed as the concrete provider in `.env.example`; Meta's WhatsApp Cloud API is a drop-in alternative.
3. Priority-score weights (`W_hazard`, `W_traffic`, `W_pop`) and baseline category scores are not numerically specified in the source spec and need a config table + initial values before Agent B is deterministic.
4. Styling library (Tailwind) and hosting target are not mandated by the source spec; both are freely swappable.
5. PII encryption at rest and SSO/OIDC are recommended for compliance/security but not explicitly required by the source spec; flagged as Phase 2/3 items respectively.
6. Background scheduler (APScheduler/Celery) is an addition needed to support "real time" (non-demo) SLA monitoring alongside the on-demand Time-Travel trigger.
7. Extended tables in §6.2.2 (`citizens`, `notification_log`, `feedback_polls`, `sop_templates`, `media_assets`, `officer_accounts`) are additive and required to fully implement Agents E and F and HITL as functionally specified — not present in the source spec's schema but necessary to avoid unmodeled data.

## 12.2 Key Risks

| Risk | Mitigation |
|---|---|
| LLM-based multilingual normalization misclassifies category on ambiguous input | Maintain a labeled eval set (§2.2) and a fallback "needs human triage" queue for low-confidence classifications. |
| False-positive deduplication merges two genuinely distinct incidents | Keep the 150m + 0.85 cosine thresholds tunable; log all merge decisions to `audit_logs` for officer override/appeal. |
| Virtual clock desync between Redis and application servers under horizontal scaling | Redis remains the single source of truth for the offset; all instances read from it, none maintain local offset state. |
| WhatsApp provider webhook downtime silently drops citizen replies | Delivery retries + `notification_log` status tracking + alerting on sustained `FAILED` rates. |
| Demo preset loader accidentally exposed in production | Feature-flag `/api/v1/demo/load-presets` off outside non-prod environments. |

## 12.3 Glossary

| Term | Meaning |
|---|---|
| PMC / PCMC | Pune Municipal Corporation / Pimpri-Chinchwad Municipal Corporation |
| MoHUA | Ministry of Housing and Urban Affairs (Government of India) |
| RTS Act | Maharashtra Right to Public Services Act — statutory service-delivery timelines |
| JE | Junior Engineer (Level 1 field responder) |
| SI | Sanitary Inspector (Level 1 field responder, SWM) |
| AMC | Assistant Municipal Commissioner (Level 2) |
| EE | Executive Engineer (Level 2) |
| DMC | Deputy Municipal Commissioner (Level 3) |
| Ward/Prabhag | Municipal administrative sub-division |
| SLA | Service Level Agreement — statutory resolution time window |
| HITL | Human-in-the-Loop review step before citizen-facing closure |
| SOP | Standard Operating Procedure (field repair checklist) |

---

**End of Master PRD.** This document is intended to be handed directly to an engineering team or a coding agent as the complete, self-contained build reference for PS17.
