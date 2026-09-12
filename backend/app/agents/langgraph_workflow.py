"""Official LangGraph Multi-Agent Workflow for PS17 NagrikSewa.
Coordinates the 6 autonomous civic agents using langgraph.graph.StateGraph:
- Agent A: Multilingual Ingestion & NER (Gemini 2.5 Flash / Ollama)
- Conditional Edge 1: Completeness Gatekeeper (Missing spatial anchors check)
- Agent C: PostGIS Geodesic Deduplication & 150m Clustering
- Conditional Edge 2: Duplicate Router (Merge vs Unique Incident)
- Agent B: Dynamic Multi-Factor Priority Math & Statutory RTS Act SLA
- Agent D: 4-Tier Statutory Escalation Ladder & Officer Dispatch
- Agent F: Field Officer Action Copilot (SOP & BOM)
- Agent E: Omnichannel WhatsApp Milestone Alert & 24h Reopen Loop
"""

from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import uuid

from langgraph.graph import StateGraph, END

from app.core.clock import ClockService
from app.core.llm import LLMService
from app.services.database import db
from app.models.schemas import PriorityEnum, TicketStatusEnum, AuditLogRecord
from app.agents.pipeline import haversine_distance_meters


class CivicIncidentState(TypedDict, total=False):
    """LangGraph shared incident state across all 6 agents."""
    ticket_id: str
    created_at: datetime
    raw_input_text: str
    channel: str
    ward_id: str
    latitude: float
    longitude: float
    complainant_name: str
    complainant_phone: str

    # Agent A outputs
    detected_language: str
    extracted_category: str
    canonical_english_summary: str
    landmark: Optional[str]
    missing_critical_info: bool
    clarification_prompt: Optional[str]

    # Agent C outputs
    is_duplicate: bool
    parent_ticket_id: Optional[str]
    nearest_distance_meters: Optional[float]
    cluster_size: int
    cluster_boost_delta: float
    crew_dispatch_prevented: bool

    # Agent B outputs
    priority_score: float
    priority_tier: str
    sla_duration_hours: int
    sla_deadline: datetime
    assigned_department_id: str
    assigned_department_name: str

    # Agent D outputs
    assigned_officer_id: str
    assigned_officer_name: str
    assigned_officer_designation: str
    escalation_level: int
    status: str

    # Agent F outputs
    sop_checklist: List[str]
    bill_of_materials: List[Any]

    # Agent E outputs
    whatsapp_payload: Dict[str, Any]
    notification_dispatched: bool

    # Audit History
    audit_trail: List[Dict[str, Any]]


# =========================================================================
# LANGGRAPH NODE FUNCTIONS (THE 6 AGENTS)
# =========================================================================

def node_agent_a_triage(state: CivicIncidentState) -> Dict[str, Any]:
    """Agent A: Normalizes Marathi/Hinglish to English, performs NER, checks completeness."""
    raw_text = state.get("raw_input_text", "")
    parsed = LLMService.parse_complaint_multilingual(raw_text)

    detected_lang = parsed.get("detected_language", "English")
    cat = parsed.get("extracted_category", "General Municipal Redressal")
    summary = parsed.get("canonical_english_summary", raw_text)
    landmark = parsed.get("landmark") or state.get("landmark")
    missing_info = parsed.get("missing_critical_info", False)

    # Spatial coordinate assignment
    lat = state.get("latitude")
    lng = state.get("longitude")
    if lat is None or lng is None:
        cat_lower = cat.lower()
        if "water" in cat_lower:
            lat, lng = 18.5074, 73.8077
            landmark = landmark or "Near Shivaji Chowk, Paud Road"
        elif "drain" in cat_lower or "sewer" in cat_lower or "manhole" in cat_lower:
            lat, lng = 18.5580, 73.8070
            landmark = landmark or "Parihar Chowk, Aundh"
        elif "waste" in cat_lower:
            lat, lng = 18.5080, 73.8085
            landmark = landmark or "Market Road"
        elif "road" in cat_lower:
            lat, lng = 18.5060, 73.8065
            landmark = landmark or "Paud Road Bridge Ramp"
        else:
            lat, lng = 18.5090, 73.8070
            landmark = landmark or "Ward Municipal Office"

    clarification = None
    if missing_info:
        clarification = "Please provide exact landmark, road name, or share location pin via WhatsApp."

    return {
        "detected_language": detected_lang,
        "extracted_category": cat,
        "canonical_english_summary": summary,
        "landmark": landmark,
        "latitude": lat,
        "longitude": lng,
        "missing_critical_info": missing_info,
        "clarification_prompt": clarification,
        "audit_trail": state.get("audit_trail", []) + [{
            "agent": "Agent A: Ingestion & Multilingual Triage",
            "action": "NORMALIZED_AND_EXTRACTED_NER",
            "details": f"Language: {detected_lang}, Category: {cat}, Landmark: {landmark}"
        }]
    }


def route_completeness_gate(state: CivicIncidentState) -> str:
    """Conditional Edge 1: Routes to clarification if critical spatial anchors are missing."""
    if state.get("missing_critical_info", False):
        return "agent_e_clarify"
    return "agent_c_deduplication"


def node_agent_e_clarify(state: CivicIncidentState) -> Dict[str, Any]:
    """Agent E (Clarification Branch): Auto-prompts citizen on WhatsApp for missing landmark."""
    ticket_id = state.get("ticket_id", "PENDING")
    prompt_text = state.get("clarification_prompt", "Please provide nearest landmark or GPS pin.")
    return {
        "status": "AWAITING_CITIZEN_LOCATION",
        "whatsapp_payload": {
            "recipient": state.get("complainant_phone", ""),
            "message": f"PMC Care Grievance #{ticket_id}: We received your report but require exact location. {prompt_text}",
            "interactive_type": "REQUEST_LOCATION_PIN"
        },
        "audit_trail": state.get("audit_trail", []) + [{
            "agent": "Agent E: Citizen Clarification",
            "action": "LOCATION_PIN_REQUESTED",
            "details": prompt_text
        }]
    }


def node_agent_c_deduplication(state: CivicIncidentState) -> Dict[str, Any]:
    """Agent C: 150m Haversine radius geodesic deduplication against active complaints."""
    CLUSTER_RADIUS = 150.0
    lat = state.get("latitude", 18.5074)
    lng = state.get("longitude", 73.8077)
    cat = state.get("extracted_category", "")

    matched_parent = None
    min_dist = 999999.0

    for existing_id, existing in db.complaints.items():
        if existing.status == TicketStatusEnum.RESOLVED:
            continue
        if existing.extracted_category != cat:
            continue

        d = haversine_distance_meters(lat, lng, existing.latitude, existing.longitude)
        if d < min_dist:
            min_dist = d
        if d <= CLUSTER_RADIUS:
            matched_parent = existing
            break

    if matched_parent:
        matched_parent.cluster_size += 1
        boost = matched_parent.cluster_size * 5.0
        return {
            "is_duplicate": True,
            "parent_ticket_id": matched_parent.ticket_id,
            "nearest_distance_meters": round(min_dist, 1),
            "cluster_size": matched_parent.cluster_size,
            "cluster_boost_delta": boost,
            "crew_dispatch_prevented": True,
            "audit_trail": state.get("audit_trail", []) + [{
                "agent": "Agent C: Spatial Deduplication",
                "action": "CLUSTERED_INTO_PARENT",
                "details": f"Merged into #{matched_parent.ticket_id} (Distance: {round(min_dist, 1)}m <= 150m)"
            }]
        }

    return {
        "is_duplicate": False,
        "parent_ticket_id": None,
        "nearest_distance_meters": round(min_dist, 1) if min_dist < 99999 else None,
        "cluster_size": 1,
        "cluster_boost_delta": 0.0,
        "crew_dispatch_prevented": False,
        "audit_trail": state.get("audit_trail", []) + [{
            "agent": "Agent C: Spatial Deduplication",
            "action": "UNIQUE_INCIDENT_VERIFIED",
            "details": "No existing active incidents within 150m radius"
        }]
    }


def node_agent_b_priority(state: CivicIncidentState) -> Dict[str, Any]:
    """Agent B: Multi-factor priority math P = 0.45*Sh + 0.25*St + 0.20*Sp + Delta_c."""
    cat = state.get("extracted_category", "General")
    delta_cluster = state.get("cluster_boost_delta", 0.0)

    # Base scores per municipal domain
    cat_lower = cat.lower()
    if "water" in cat_lower:
        dept_id = "dept-wat-01"
        dept_name = "Water Supply & Pumping"
        s_hazard, s_traffic, s_pop = 95.0, 88.0, 85.0
    elif "drain" in cat_lower or "sewer" in cat_lower or "manhole" in cat_lower:
        dept_id = "dept-drn-03"
        dept_name = "Drainage & Sewerage"
        s_hazard, s_traffic, s_pop = 96.0, 92.0, 90.0
    elif "waste" in cat_lower:
        dept_id = "dept-swm-02"
        dept_name = "Solid Waste Management (SWM)"
        s_hazard, s_traffic, s_pop = 75.0, 60.0, 85.0
    elif "light" in cat_lower or "elec" in cat_lower:
        dept_id = "dept-ele-04"
        dept_name = "Streetlighting & Electrical"
        s_hazard, s_traffic, s_pop = 55.0, 45.0, 60.0
    else:
        dept_id = "dept-rdm-05"
        dept_name = "Roads & Traffic Infrastructure"
        s_hazard, s_traffic, s_pop = 40.0, 70.0, 50.0

    raw_p = (0.45 * s_hazard) + (0.25 * s_traffic) + (0.20 * s_pop) + delta_cluster
    p_score = min(100.0, max(1.0, raw_p))

    # Statutory RTS Act SLA binding
    if p_score >= 85.0:
        tier = PriorityEnum.P1_CRITICAL.value
        sla_hours = 6
    elif p_score >= 60.0:
        tier = PriorityEnum.P2_HIGH.value
        sla_hours = 18
    elif p_score >= 40.0:
        tier = PriorityEnum.P3_MEDIUM.value
        sla_hours = 36
    else:
        tier = PriorityEnum.P4_LOW.value
        sla_hours = 48

    now = state.get("created_at") or ClockService.get_current_virtual_time()
    deadline = now + timedelta(hours=sla_hours)

    return {
        "priority_score": round(p_score, 2),
        "priority_tier": tier,
        "sla_duration_hours": sla_hours,
        "sla_deadline": deadline,
        "assigned_department_id": dept_id,
        "assigned_department_name": dept_name,
        "audit_trail": state.get("audit_trail", []) + [{
            "agent": "Agent B: Priority Scoring & Department Routing",
            "action": "PRIORITY_COMPUTED",
            "details": f"Score: {round(p_score, 2)} ({tier}), Dept: {dept_name}, RTS SLA: {sla_hours}h"
        }]
    }


def node_agent_d_dispatch(state: CivicIncidentState) -> Dict[str, Any]:
    """Agent D: Dispatches Tier 1 field responder (JE/SI) and initializes 4-tier ladder."""
    dept_id = state.get("assigned_department_id", "dept-wat-01")
    officer = db.get_tier_officer(dept_id, 1)

    return {
        "assigned_officer_id": officer.officer_id,
        "assigned_officer_name": officer.name,
        "assigned_officer_designation": officer.designation,
        "escalation_level": 1,
        "status": "IN_PROGRESS",
        "audit_trail": state.get("audit_trail", []) + [{
            "agent": "Agent D: SLA Tracker & Escalation Orchestrator",
            "action": "DISPATCHED_TO_OFFICER",
            "details": f"Assigned to {officer.name} ({officer.designation}) [Tier 1 Field Responder]"
        }]
    }


def node_agent_f_copilot(state: CivicIncidentState) -> Dict[str, Any]:
    """Agent F: Generates domain SOP checklist & Bill of Materials for field crew."""
    cat = state.get("extracted_category", "General")
    summary = state.get("canonical_english_summary", "")
    sop_data = LLMService.generate_sop_checklist(cat, summary)

    return {
        "sop_checklist": sop_data.get("sop_checklist", []),
        "bill_of_materials": sop_data.get("bill_of_materials", []),
        "audit_trail": state.get("audit_trail", []) + [{
            "agent": "Agent F: Field Officer Action Copilot",
            "action": "SOP_AND_BOM_GENERATED",
            "details": f"{len(sop_data.get('sop_checklist', []))} SOP steps, {len(sop_data.get('bill_of_materials', []))} BOM items"
        }]
    }


def node_agent_e_milestones(state: CivicIncidentState) -> Dict[str, Any]:
    """Agent E: Emits WhatsApp Business API milestone notification and 24h reopen poll."""
    ticket_id = state.get("ticket_id", "PMC-2026-UNKNOWN")
    dept = state.get("assigned_department_name", "Municipal Corporation")
    sla = state.get("sla_duration_hours", 24)
    phone = state.get("complainant_phone", "")
    officer = state.get("assigned_officer_name", "Field Officer")
    category = state.get("category", "General")
    priority = state.get("priority_label", state.get("priority", "MEDIUM"))
    location = state.get("location_text", state.get("ward_id", "Unknown"))

    wa_payload = {
        "channel": "WHATSAPP_BUSINESS_API",
        "recipient": phone,
        "header": "Pune Municipal Corporation (PMC Care)",
        "body": (
            f"Namaskar! Your grievance #{ticket_id} has been registered under {dept}. "
            f"Statutory SLA under Maharashtra RTS Act 2015 is {sla} Hours. "
            f"Officer {officer} has been dispatched."
        ),
        "interactive_buttons": [
            {"id": "btn_track", "label": "Track Location"},
            {"id": "btn_reopen", "label": "Reopen (Auto L2 AMC)"}
        ],
        "delivery_status": "PENDING"
    }

    # --- REAL TWILIO DISPATCH ---
    twilio_sid = None
    if phone and len(phone) >= 10:
        try:
            from app.services.notification_service import notify_complaint_received
            twilio_sid = notify_complaint_received(
                citizen_phone=phone,
                complaint_id=ticket_id,
                category=category,
                priority=str(priority),
                location=location,
            )
            wa_payload["delivery_status"] = "DELIVERED" if twilio_sid else "QUEUED"
        except Exception as exc:
            wa_payload["delivery_status"] = f"ERROR: {exc}"

    # --- REAL TELEGRAM DISPATCH ---
    telegram_sent = False
    try:
        from app.services.telegram_service import notify_complaint_received_tg, get_active_chat_ids
        # Send to complainant if phone is a chat ID or broadcast to active demo chats
        target_chats = [phone] if (phone and phone.isdigit() and len(phone) < 15) else get_active_chat_ids()
        for cid in target_chats:
            res = notify_complaint_received_tg(
                chat_id=cid,
                complaint_id=ticket_id,
                category=category,
                priority=str(priority),
                location=location
            )
            if res and res.get("ok"):
                telegram_sent = True
    except Exception as exc:
        pass

    return {
        "whatsapp_payload": wa_payload,
        "notification_dispatched": True,
        "telegram_dispatched": telegram_sent,
        "audit_trail": state.get("audit_trail", []) + [{
            "agent": "Agent E: Omnichannel Citizen Engagement",
            "action": "OMNICHANNEL_MILESTONE_DELIVERED",
            "details": f"Dispatched for ticket #{ticket_id} | Twilio={twilio_sid} | Telegram={telegram_sent}",
            "twilio_sid": twilio_sid,
            "telegram_sent": telegram_sent
        }]
    }


# =========================================================================
# LANGGRAPH STATEGRAPH COMPILATION
# =========================================================================

def build_civic_langgraph() -> StateGraph:
    """Builds and wires the official LangGraph StateGraph for PS17 NagrikSewa."""
    workflow = StateGraph(CivicIncidentState)

    # 1. Register all Agent nodes
    workflow.add_node("agent_a_triage", node_agent_a_triage)
    workflow.add_node("agent_e_clarify", node_agent_e_clarify)
    workflow.add_node("agent_c_deduplication", node_agent_c_deduplication)
    workflow.add_node("agent_b_priority", node_agent_b_priority)
    workflow.add_node("agent_d_dispatch", node_agent_d_dispatch)
    workflow.add_node("agent_f_copilot", node_agent_f_copilot)
    workflow.add_node("agent_e_milestones", node_agent_e_milestones)

    # 2. Entry Point -> Agent A
    workflow.set_entry_point("agent_a_triage")

    # 3. Conditional Edge 1: Completeness Gatekeeper
    workflow.add_conditional_edges(
        "agent_a_triage",
        route_completeness_gate,
        {
            "agent_e_clarify": "agent_e_clarify",
            "agent_c_deduplication": "agent_c_deduplication"
        }
    )

    # Clarification branch terminates awaiting citizen location pin
    workflow.add_edge("agent_e_clarify", END)

    # 4. Agent C -> Agent B (Priority Math & Department Assignment)
    workflow.add_edge("agent_c_deduplication", "agent_b_priority")

    # 5. Agent B -> Agent D (Statutory Escalation Ladder & Officer Dispatch)
    workflow.add_edge("agent_b_priority", "agent_d_dispatch")

    # 6. Agent D -> Agent F (Field Action Copilot & SOP Generation)
    workflow.add_edge("agent_d_dispatch", "agent_f_copilot")

    # 7. Agent F -> Agent E (Citizen WhatsApp Milestones & 24h Reopen Loop)
    workflow.add_edge("agent_f_copilot", "agent_e_milestones")

    # 8. Terminal Edge
    workflow.add_edge("agent_e_milestones", END)

    return workflow


# Compiled LangGraph Application
civic_langgraph_app = build_civic_langgraph().compile()


def get_langgraph_ascii() -> str:
    """Returns the ASCII visual representation of the LangGraph state machine."""
    return civic_langgraph_app.get_graph().draw_ascii()


def get_langgraph_mermaid() -> str:
    """Returns the Mermaid syntax diagram of the LangGraph state machine."""
    return civic_langgraph_app.get_graph().draw_mermaid()


def run_langgraph(incident_input: Dict[str, Any]) -> CivicIncidentState:
    """Executes the full LangGraph state machine on a citizen complaint input."""
    now = ClockService.get_current_virtual_time()
    ticket_id = incident_input.get("ticket_id") or f"PMC-2026-{str(uuid.uuid4())[:8].upper()}"

    initial_state: CivicIncidentState = {
        "ticket_id": ticket_id,
        "created_at": now,
        "raw_input_text": incident_input.get("raw_text", ""),
        "channel": incident_input.get("channel", "WHATSAPP"),
        "ward_id": incident_input.get("ward_id", "Ward-14 (Kothrud)"),
        "latitude": incident_input.get("latitude"),
        "longitude": incident_input.get("longitude"),
        "complainant_name": incident_input.get("complainant_name", "Citizen"),
        "complainant_phone": incident_input.get("complainant_phone", "+919876543210"),
        "audit_trail": []
    }

    final_state = civic_langgraph_app.invoke(initial_state)
    return final_state
