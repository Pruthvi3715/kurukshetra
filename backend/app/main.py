"""Main FastAPI Application.
PS17 Multi-Agent Municipal Complaint Redressal & SLA Escalation System.
"""

from datetime import datetime, timezone
import os
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.models.schemas import (
    TimeTravelRequest, TimeTravelStatus, MunicipalIncidentAgentState,
    Department, Officer, EscalationRecord, AuditLogRecord, ComplaintSubmission,
    TicketStatusEnum
)
from app.core.clock import ClockService
from app.services.database import db
from app.agents.pipeline import MunicipalMultiAgentPipeline

app = FastAPI(
    title="PS17 Multi-Agent Municipal Complaint Router",
    description="Autonomous Civic Incident Redressal with Dynamic Multi-Tier SLA Escalation",
    version="1.0.0"
)

# Allow CORS for Next.js/React frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    """System health and runtime status."""
    return {
        "status": "healthy",
        "service": "PS17 Municipal Multi-Agent Operating System",
        "clock": ClockService.get_status(),
        "registered_complaints_count": len(db.complaints),
        "escalations_count": len(db.escalations)
    }


# ==========================================
# Virtual Time-Travel Engine Endpoints
# ==========================================

@app.get("/api/time-travel/status", response_model=TimeTravelStatus)
def get_time_travel_status():
    """Returns current simulated virtual time and system time offset."""
    status = ClockService.get_status()
    return TimeTravelStatus(
        virtual_time=status["virtual_time"],
        real_time=status["real_time"],
        offset_seconds=status["offset_seconds"],
        offset_hours=status["offset_hours"],
    )


@app.post("/api/time-travel/advance")
def advance_time(req: TimeTravelRequest):
    """Fast-forwards the municipal virtual clock by N hours.
    Immediately triggers SLA evaluation across all active complaints.
    """
    new_virtual_time = ClockService.advance_virtual_clock(req.hours)
    escalated_events = db.evaluate_all_slas()
    status = ClockService.get_status()
    return {
        "message": f"Virtual clock advanced by {req.hours} hours",
        "new_virtual_time": new_virtual_time,
        "offset_hours": status["offset_hours"],
        "escalations_triggered": len(escalated_events),
        "escalation_details": escalated_events
    }


@app.post("/api/time-travel/reset")
def reset_time():
    """Resets the virtual clock back to real system time."""
    ClockService.reset_virtual_clock()
    return {
        "message": "Virtual clock reset to real system time",
        "current_time": ClockService.get_current_virtual_time()
    }


# ==========================================
# Municipal Metadata & Administrative Queries
# ==========================================

@app.get("/api/departments", response_model=List[Department])
def list_departments():
    """Lists all municipal departments with code and contact information."""
    return list(db.departments.values())


@app.get("/api/officers", response_model=List[Officer])
def list_officers(tier: Optional[int] = Query(None, description="Filter by administrative hierarchy tier (1-4)")):
    """Lists municipal administrative officers."""
    officers = list(db.officers.values())
    if tier is not None:
        officers = [o for o in officers if o.hierarchy_tier == tier]
    return officers


@app.get("/api/stats")
def get_dashboard_stats():
    """Returns aggregated high-level civic intelligence metrics."""
    total = len(db.complaints)
    resolved = sum(1 for c in db.complaints.values() if c.status == TicketStatusEnum.RESOLVED)
    escalated = sum(1 for c in db.complaints.values() if c.status == TicketStatusEnum.ESCALATED or c.is_breached)
    active = total - resolved

    dept_counts: Dict[str, int] = {}
    for c in db.complaints.values():
        name = c.assigned_department_name or "Unassigned"
        dept_counts[name] = dept_counts.get(name, 0) + 1

    return {
        "total_complaints": total,
        "active_complaints": active,
        "escalated_complaints": escalated,
        "resolved_complaints": resolved,
        "department_breakdown": dept_counts,
        "total_escalation_actions": len(db.escalations),
        "clock": ClockService.get_status()
    }


# ==========================================
# Complaints & Multi-Agent Ingestion Endpoints
# ==========================================

@app.get("/api/complaints", response_model=List[MunicipalIncidentAgentState])
def list_complaints(status: Optional[str] = None, department: Optional[str] = None):
    """Lists complaints, optionally filtered by status or department."""
    db.evaluate_all_slas()
    results = list(db.complaints.values())
    if status:
        results = [r for r in results if r.status.value.upper() == status.upper()]
    if department:
        results = [r for r in results if department.lower() in r.assigned_department_name.lower()]
    return results


@app.post("/api/complaints", response_model=MunicipalIncidentAgentState)
def submit_complaint(sub: ComplaintSubmission):
    """Ingests a citizen complaint through the 6-agent LangGraph pipeline."""
    return MunicipalMultiAgentPipeline.run_agent_pipeline(sub)


@app.get("/api/complaints/{ticket_id}", response_model=MunicipalIncidentAgentState)
def get_complaint(ticket_id: str):
    """Fetches full state, audit history, and SOP checklist for a complaint."""
    db.evaluate_all_slas()
    if ticket_id not in db.complaints:
        raise HTTPException(status_code=404, detail="Complaint ticket not found")
    return db.complaints[ticket_id]


@app.post("/api/complaints/{ticket_id}/resolve")
def resolve_complaint(ticket_id: str):
    """Simulates Field Officer submitting photo proof and closing the ticket."""
    if ticket_id not in db.complaints:
        raise HTTPException(status_code=404, detail="Complaint ticket not found")
    ticket = db.complaints[ticket_id]
    ticket.status = TicketStatusEnum.RESOLVED
    ticket.closure_approved = True
    ticket.is_breached = False
    return {"message": "Ticket successfully marked as resolved", "ticket": ticket}


@app.post("/api/complaints/{ticket_id}/reopen")
def reopen_complaint(ticket_id: str):
    """Citizen marks ticket as unresolved during post-closure poll. Auto-escalates to Tier 2."""
    if ticket_id not in db.complaints:
        raise HTTPException(status_code=404, detail="Complaint ticket not found")
    ticket = db.complaints[ticket_id]
    now = ClockService.get_current_virtual_time()

    ticket.status = TicketStatusEnum.ESCALATED
    ticket.escalation_level = max(2, ticket.escalation_level)
    amc = db.get_tier_officer(ticket.assigned_department_id, 2)
    ticket.assigned_officer_id = amc.officer_id
    ticket.assigned_officer_name = amc.name
    ticket.assigned_officer_designation = amc.designation

    audit = AuditLogRecord(
        ticket_id=ticket.ticket_id,
        acting_agent="Agent E: Citizen Engagement Bot",
        action_type="CITIZEN_REOPEN_AUTO_L2",
        payload_snapshot={"reopened_by": "Citizen Poll", "escalated_to": amc.designation},
        created_at=now
    )
    ticket.audit_history.append(audit)
    db.audit_logs.append(audit)

    return {"message": "Ticket reopened and escalated to Tier 2 AMC", "ticket": ticket}


@app.get("/api/escalations", response_model=List[EscalationRecord])
def list_escalations():
    """Returns immutable log of all statutory escalation events."""
    return db.escalations


@app.get("/api/audit-logs", response_model=List[AuditLogRecord])
def list_audit_logs():
    """Returns full multi-agent audit trail."""
    return db.audit_logs


# ==========================================
# Static Files Serving for Frontend Dashboard
# ==========================================
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
