"""Main FastAPI Application.
PS17 Multi-Agent Municipal Complaint Redressal & SLA Escalation System.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from app.models.schemas import (
    TimeTravelRequest, TimeTravelStatus, MunicipalIncidentAgentState,
    Department, Officer, EscalationRecord, AuditLogRecord
)
from app.core.clock import ClockService
from app.services.database import db

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
    resolved = sum(1 for c in db.complaints.values() if c.status == "RESOLVED")
    escalated = sum(1 for c in db.complaints.values() if c.status == "ESCALATED")
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


@app.get("/api/complaints", response_model=List[MunicipalIncidentAgentState])
def list_complaints(status: Optional[str] = None, department: Optional[str] = None):
    """Lists complaints, optionally filtered by status or department."""
    # Ensure SLA check runs before returning
    db.evaluate_all_slas()
    results = list(db.complaints.values())
    if status:
        results = [r for r in results if r.status.value.upper() == status.upper()]
    if department:
        results = [r for r in results if department.lower() in r.assigned_department_name.lower()]
    return results


@app.get("/api/complaints/{ticket_id}", response_model=MunicipalIncidentAgentState)
def get_complaint(ticket_id: str):
    """Fetches full state, audit history, and SOP checklist for a complaint."""
    db.evaluate_all_slas()
    if ticket_id not in db.complaints:
        raise HTTPException(status_code=404, detail="Complaint ticket not found")
    return db.complaints[ticket_id]


@app.get("/api/escalations", response_model=List[EscalationRecord])
def list_escalations():
    """Returns immutable log of all statutory escalation events."""
    return db.escalations


@app.get("/api/audit-logs", response_model=List[AuditLogRecord])
def list_audit_logs():
    """Returns full multi-agent audit trail."""
    return db.audit_logs
