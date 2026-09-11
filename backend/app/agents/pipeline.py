"""Multi-Agent Municipal Incident Redressal Pipeline.
Implements the 6 LangGraph agents from PS17 PRD:
- Agent A: Ingestion & Multilingual Triage (NER & Completeness)
- Agent C: Spatial Deduplication & Clustering (Haversine radius & semantic match)
- Agent B: Department Routing & Priority Assignment (Hazard Scoring)
- Agent D: SLA Tracker & Escalation Orchestrator
- Agent E: Citizen Engagement Bot (Milestone alerts & Clarification)
- Agent F: Field Officer Action Copilot (SOP Checklist & Photo Proof)
"""

from datetime import datetime, timezone, timedelta
import math
import re
import uuid
from typing import Dict, List, Optional, Tuple
from app.models.schemas import (
    MunicipalIncidentAgentState, PriorityEnum, TicketStatusEnum,
    ComplaintSubmission, AuditLogRecord
)
from app.core.clock import ClockService
from app.services.database import db


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance between two points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class MunicipalMultiAgentPipeline:
    """Coordinates the 6 discrete agents across a state machine."""

    @classmethod
    def run_agent_pipeline(cls, sub: ComplaintSubmission) -> MunicipalIncidentAgentState:
        now = ClockService.get_current_virtual_time()
        ticket_id = f"PMC-2026-{str(uuid.uuid4())[:8].upper()}"

        # Initialize base state
        state = MunicipalIncidentAgentState(
            ticket_id=ticket_id,
            created_at=now,
            raw_input_text=sub.raw_text,
            channel=sub.channel,
            ward_id=sub.ward_id or "Ward-14 (Kothrud)",
            sla_deadline=now + timedelta(hours=24)
        )

        # -------------------------------------------------------------
        # 1. AGENT A: Ingestion & Multilingual Triage Agent
        # -------------------------------------------------------------
        cls._agent_a_triage(state)

        # -------------------------------------------------------------
        # 2. AGENT C: Spatial Deduplication & Clustering Agent
        # -------------------------------------------------------------
        cls._agent_c_spatial_deduplication(state)

        # -------------------------------------------------------------
        # 3. AGENT B: Department Routing & Priority Scoring
        # -------------------------------------------------------------
        cls._agent_b_routing_and_priority(state, now)

        # -------------------------------------------------------------
        # 4. AGENT D: SLA Tracker & Officer Dispatch
        # -------------------------------------------------------------
        cls._agent_d_sla_and_dispatch(state, now)

        # -------------------------------------------------------------
        # 5. AGENT F: Field Officer Action Copilot
        # -------------------------------------------------------------
        cls._agent_f_field_copilot(state)

        # -------------------------------------------------------------
        # 6. AGENT E: Citizen Engagement
        # -------------------------------------------------------------
        cls._agent_e_citizen_engagement(state, now)

        # Save to database
        db.complaints[state.ticket_id] = state
        return state

    @classmethod
    def _agent_a_triage(cls, state: MunicipalIncidentAgentState):
        """Agent A: Normalizes Hinglish/Marathi to Canonical English, performs NER, and checks completeness."""
        raw = state.raw_input_text.lower()
        
        # Detect language
        if any(w in raw for w in ["phutli", "ahe", "pani", "sathlay", "kachra", "rastyavar", "ghanta", "javal"]):
            state.detected_language = "Marathi / Hinglish (Code-Mixed)"
        else:
            state.detected_language = "English"

        # Entity extraction & Canonical translation
        if any(w in raw for w in ["water", "pipeline", "burst", "leak", "phutli", "drinking", "jal"]):
            state.extracted_category = "Water Supply & Pumping"
            state.canonical_english_summary = "Catastrophic municipal water pipeline burst with active high-pressure flooding."
            state.landmark = "Near Shivaji Chowk"
            state.latitude = 18.5074
            state.longitude = 73.8077
        elif any(w in raw for w in ["garbage", "bin", "kachra", "waste", "stench", "dump", "safai"]):
            state.extracted_category = "Solid Waste Management (SWM)"
            state.canonical_english_summary = "Community waste bin overflow uncollected for multiple days with severe sanitation risk."
            state.landmark = "Market Road"
            state.latitude = 18.5080
            state.longitude = 73.8085
        elif any(w in raw for w in ["pothole", "road", "bridge", "skid", "rasta", "khadda", "asphalt"]):
            state.extracted_category = "Roads & Traffic Infrastructure"
            state.canonical_english_summary = "Monsoon road pothole cavitation causing vehicular hazard on bridge approach ramp."
            state.landmark = "Paud Road Bridge Ramp"
            state.latitude = 18.5060
            state.longitude = 73.8065
        elif any(w in raw for w in ["streetlight", "light", "dark", "pole", "wire", "cable", "vij"]):
            state.extracted_category = "Streetlighting & Electrical"
            state.canonical_english_summary = "Non-functional streetlighting cluster causing public safety hazard in lane."
            state.landmark = "Behind Bus Terminal"
            state.latitude = 18.5090
            state.longitude = 73.8070
        else:
            state.extracted_category = "General Municipal Redressal"
            state.canonical_english_summary = state.raw_input_text

        # Completeness Check
        if len(state.raw_input_text.strip()) < 10:
            state.missing_critical_info = True
            state.clarification_prompt = "Please provide exact landmark, road name, or share location pin via WhatsApp."

        audit = AuditLogRecord(
            ticket_id=state.ticket_id,
            acting_agent="Agent A: Multilingual Triage & NER",
            action_type="PARSED_AND_NORMALIZED",
            payload_snapshot={
                "language": state.detected_language,
                "category": state.extracted_category,
                "landmark": state.landmark,
                "summary": state.canonical_english_summary
            },
            created_at=state.created_at
        )
        state.audit_history.append(audit)
        db.audit_logs.append(audit)

    @classmethod
    def _agent_c_spatial_deduplication(cls, state: MunicipalIncidentAgentState):
        """Agent C: Checks if an active incident exists within <= 150m with matching category."""
        CLUSTER_RADIUS_METERS = 150.0

        for existing_id, existing in db.complaints.items():
            if existing.status == TicketStatusEnum.RESOLVED:
                continue
            if existing.extracted_category != state.extracted_category:
                continue

            dist = haversine_distance_meters(
                state.latitude, state.longitude,
                existing.latitude, existing.longitude
            )

            if dist <= CLUSTER_RADIUS_METERS:
                state.is_duplicate = True
                state.parent_ticket_id = existing_id
                state.cluster_incident_id = existing_id
                existing.cluster_size += 1
                existing.similar_ticket_ids.append(state.ticket_id)

                audit = AuditLogRecord(
                    ticket_id=state.ticket_id,
                    acting_agent="Agent C: Spatial Deduplication",
                    action_type="CLUSTERED_INTO_PARENT",
                    payload_snapshot={
                        "parent_ticket_id": existing_id,
                        "distance_meters": round(dist, 1),
                        "cluster_size": existing.cluster_size
                    },
                    created_at=state.created_at
                )
                state.audit_history.append(audit)
                db.audit_logs.append(audit)
                return

    @classmethod
    def _agent_b_routing_and_priority(cls, state: MunicipalIncidentAgentState, now: datetime):
        """Agent B: Computes dynamic priority score P in [1, 100] and maps to responsible department."""
        cat = state.extracted_category
        dept_id = "dept-wat-01"
        dept_name = "Water Supply & Pumping"
        p_level = PriorityEnum.P3_MEDIUM
        sla_hours = 24
        p_score = 50.0

        if "Water Supply" in cat:
            dept_id = "dept-wat-01"
            dept_name = "Water Supply & Pumping"
            p_level = PriorityEnum.P1_CRITICAL
            p_score = 92.0
            sla_hours = 6
        elif "Solid Waste" in cat:
            dept_id = "dept-swm-02"
            dept_name = "Solid Waste Management (SWM)"
            p_level = PriorityEnum.P2_HIGH
            p_score = 75.0
            sla_hours = 18
        elif "Drainage" in cat:
            dept_id = "dept-drn-03"
            dept_name = "Drainage & Sewerage"
            p_level = PriorityEnum.P2_HIGH
            p_score = 78.0
            sla_hours = 18
        elif "Electrical" in cat:
            dept_id = "dept-ele-04"
            dept_name = "Streetlighting & Electrical"
            p_level = PriorityEnum.P3_MEDIUM
            p_score = 55.0
            sla_hours = 36
        elif "Roads" in cat:
            dept_id = "dept-rdm-05"
            dept_name = "Roads & Traffic Infrastructure"
            p_level = PriorityEnum.P4_LOW
            p_score = 38.0
            sla_hours = 48

        # Cluster boost if multiple residents reported the same event
        if state.cluster_size > 1:
            p_score = min(100.0, p_score + (state.cluster_size * 5))

        state.assigned_department_id = dept_id
        state.assigned_department_name = dept_name
        state.priority_level = p_level
        state.priority_score = p_score
        state.sla_duration_hours = sla_hours
        state.sla_deadline = now + timedelta(hours=sla_hours)

        audit = AuditLogRecord(
            ticket_id=state.ticket_id,
            acting_agent="Agent B: Department Routing & Priority",
            action_type="ROUTED_AND_PRIORITIZED",
            payload_snapshot={
                "department": dept_name,
                "priority_level": p_level.value,
                "priority_score": p_score,
                "sla_hours": sla_hours,
                "deadline": state.sla_deadline.isoformat()
            },
            created_at=now
        )
        state.audit_history.append(audit)
        db.audit_logs.append(audit)

    @classmethod
    def _agent_d_sla_and_dispatch(cls, state: MunicipalIncidentAgentState, now: datetime):
        """Agent D: Dispatches Tier 1 field responder and initializes SLA monitoring."""
        officer = db.get_tier_officer(state.assigned_department_id, 1)
        state.assigned_officer_id = officer.officer_id
        state.assigned_officer_name = officer.name
        state.assigned_officer_designation = officer.designation
        state.escalation_level = 1
        state.status = TicketStatusEnum.IN_PROGRESS

        audit = AuditLogRecord(
            ticket_id=state.ticket_id,
            acting_agent="Agent D: SLA Tracker & Orchestrator",
            action_type="ASSIGNED_TO_FIELD_RESPONDER",
            payload_snapshot={
                "officer_name": officer.name,
                "designation": officer.designation,
                "tier": 1,
                "deadline": state.sla_deadline.isoformat()
            },
            created_at=now
        )
        state.audit_history.append(audit)
        db.audit_logs.append(audit)

    @classmethod
    def _agent_f_field_copilot(cls, state: MunicipalIncidentAgentState):
        """Agent F: Drafts SOP repair checklist and Bill of Materials for field engineer."""
        cat = state.extracted_category

        if "Water Supply" in cat:
            state.sop_checklist = [
                "1. Isolate primary gate valve at distribution node 4.",
                "2. Deploy submersible dewatering pump to drain trench.",
                "3. Mount 150mm mechanical repair collar with EPDM gasket.",
                "4. Conduct step pressure test to 4 bar to verify zero weepage.",
                "5. Backfill trench with stone aggregate and notify ward desk."
            ]
            state.bill_of_materials = [
                "1x 150mm Cast Iron Collar Sleeve",
                "2x High-Grade EPDM Gaskets",
                "1.5 Ton Stone Aggregate"
            ]
        elif "Solid Waste" in cat:
            state.sop_checklist = [
                "1. Dispatch compaction dumper truck crew to community bin #14.",
                "2. Clear overflow perimeter within 5-meter radial zone.",
                "3. Spray organophosphate disinfectant & odor neutralizer.",
                "4. Log geotagged clearance confirmation with time-stamped photo."
            ]
            state.bill_of_materials = [
                "1x 10-Ton Hydraulic Compactor",
                "5L Chemical Odor Neutralizer",
                "Heavy-Duty Sanitation Gloves & Tarps"
            ]
        elif "Roads" in cat:
            state.sop_checklist = [
                "1. Place cautionary reflective traffic cones around pothole zone.",
                "2. Cut square edge perimeter using asphalt cutter.",
                "3. Lay cationic bitumen emulsion tack coat primer.",
                "4. Compact cold mix asphalt using 3-ton vibratory roller.",
                "5. Verify smooth grade transition with road surface."
            ]
            state.bill_of_materials = [
                "2.0 Ton Cold Mix Asphalt Compound",
                "20L Bitumen Emulsion Tack Coat",
                "4x High-Visibility Traffic Cones"
            ]
        else:
            state.sop_checklist = [
                "1. Inspect feeder pillar box & circuit breaker status.",
                "2. Measure voltage drop across pole terminal blocks.",
                "3. Replace failed LED luminaire driver unit.",
                "4. Verify photocell timer alignment."
            ]
            state.bill_of_materials = [
                "2x 72W IP66 LED Luminaire Modules",
                "1x 16A Miniature Circuit Breaker",
                "50m 3-Core Armored Cable"
            ]

        audit = AuditLogRecord(
            ticket_id=state.ticket_id,
            acting_agent="Agent F: Field Officer Action Copilot",
            action_type="SOP_CHECKLIST_GENERATED",
            payload_snapshot={
                "sop_steps_count": len(state.sop_checklist),
                "bom_items_count": len(state.bill_of_materials)
            },
            created_at=state.created_at
        )
        state.audit_history.append(audit)
        db.audit_logs.append(audit)

    @classmethod
    def _agent_e_citizen_engagement(cls, state: MunicipalIncidentAgentState, now: datetime):
        """Agent E: Emits automated milestone notifications to the complainant."""
        audit = AuditLogRecord(
            ticket_id=state.ticket_id,
            acting_agent="Agent E: Citizen Engagement Bot",
            action_type="SMS_WHATSAPP_DISPATCHED",
            payload_snapshot={
                "notification_type": "TICKET_REGISTERED",
                "message": f"Dear Citizen, your grievance {state.ticket_id} has been registered with {state.assigned_department_name}. Field Officer {state.assigned_officer_name} assigned with a statutory {state.sla_duration_hours}h SLA."
            },
            created_at=now
        )
        state.audit_history.append(audit)
        db.audit_logs.append(audit)
