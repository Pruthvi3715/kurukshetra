"""Municipal Incident Management & Multi-Agent State Machine Models.
Based on PS17 Architecture Specification.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


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


class DepartmentEnum(str, Enum):
    WATER_SUPPLY = "Water Supply & Pumping"
    SOLID_WASTE = "Solid Waste Management (SWM)"
    DRAINAGE = "Drainage & Sewerage"
    ELECTRICAL = "Streetlighting & Electrical"
    ROADS_CIVIL = "Roads & Traffic Infrastructure"


class Department(BaseModel):
    department_id: str
    name: str
    code: str
    head_officer_email: str


class Officer(BaseModel):
    officer_id: str
    department_id: str
    name: str
    designation: str  # e.g., 'Junior Engineer', 'Assistant Municipal Commissioner', 'Deputy Municipal Commissioner', 'Municipal Commissioner'
    hierarchy_tier: int  # 1: Ward Field, 2: Ward Admin, 3: Zonal Head, 4: Municipal Leadership
    ward_id: str  # e.g. 'Ward-14 (Kothrud)'
    phone_number: str
    email: str


class SlaPolicy(BaseModel):
    policy_id: str
    department_id: str
    category: str
    priority_tier: PriorityEnum
    resolution_sla_hours: int
    l2_escalation_hours: int
    l3_escalation_hours: int


class ComplaintSubmission(BaseModel):
    raw_text: str = Field(..., description="Citizen grievance text or transcribed voice note")
    channel: str = Field(default="WEB", description="WEB, WHATSAPP, or VOICE")
    ward_id: Optional[str] = Field(default=None, description="Optional pre-selected ward")
    latitude: Optional[float] = Field(default=None)
    longitude: Optional[float] = Field(default=None)
    complainant_phone: Optional[str] = Field(default="+919876543210")
    complainant_name: Optional[str] = Field(default="Citizen User")


# Standalone Agent Testing Schemas
class AgentATestRequest(BaseModel):
    raw_text: str
    ward_id: Optional[str] = "Ward-14 (Kothrud)"


class AgentCTestRequest(BaseModel):
    latitude: float
    longitude: float
    category: str
    raw_text: Optional[str] = ""


class AgentBTestRequest(BaseModel):
    category: str
    hazard_score: float = Field(..., ge=0, le=100)
    traffic_score: float = Field(..., ge=0, le=100)
    density_score: float = Field(..., ge=0, le=100)
    cluster_size: int = Field(default=1, ge=1)


class AgentDTestRequest(BaseModel):
    sla_hours: float = Field(..., gt=0)
    elapsed_hours: float = Field(..., ge=0)
    department_id: Optional[str] = "dept-wat-01"


class AgentFTestRequest(BaseModel):
    category: str
    summary: str
    incident_lat: float = 18.5074
    incident_lng: float = 73.8077
    closure_lat: float = 18.5075
    closure_lng: float = 73.8076


class AgentETestRequest(BaseModel):
    ticket_id: str = "PMC-2026-WAT-01"
    phone: Optional[str] = "+91 98220 54321"
    milestone: Optional[str] = "TICKET_REGISTERED"


class EscalationRecord(BaseModel):
    escalation_id: str = Field(default_factory=lambda: str(uuid4()))
    ticket_id: str
    from_officer_id: Optional[str] = None
    from_officer_name: Optional[str] = None
    to_officer_id: Optional[str] = None
    to_officer_name: Optional[str] = None
    previous_level: int
    new_level: int
    breach_hours_overdue: float
    trigger_reason: str
    escalated_at: datetime


class AuditLogRecord(BaseModel):
    log_id: str = Field(default_factory=lambda: str(uuid4()))
    ticket_id: str
    acting_agent: str  # 'Agent:Ingestion', 'Agent:SpatialCluster', 'Agent:Router', 'Agent:SLA_Orchestrator', 'Agent:FieldCopilot'
    action_type: str
    payload_snapshot: Dict[str, Any] = {}
    created_at: datetime


class MunicipalIncidentAgentState(BaseModel):
    ticket_id: str
    parent_ticket_id: Optional[str] = None
    created_at: datetime
    raw_input_text: str
    detected_language: str = "English"
    channel: str = "WEB"  # WEB, WHATSAPP, VOICE

    # Extracted Spatial & Categorical Data (Agent A)
    canonical_english_summary: str = ""
    extracted_category: str = ""
    ward_id: str = "Ward-14 (Kothrud)"
    landmark: Optional[str] = None
    latitude: float = 18.5074
    longitude: float = 73.8077
    missing_critical_info: bool = False
    clarification_prompt: Optional[str] = None

    # Deduplication (Agent C)
    is_duplicate: bool = False
    cluster_incident_id: Optional[str] = None
    cluster_size: int = 1
    similar_ticket_ids: List[str] = []

    # Routing & SLA (Agent B & D)
    assigned_department_id: str = ""
    assigned_department_name: str = ""
    assigned_officer_id: str = ""
    assigned_officer_name: str = ""
    assigned_officer_designation: str = ""
    priority_level: PriorityEnum = PriorityEnum.P3_MEDIUM
    priority_score: float = 50.0
    sla_duration_hours: int = 24
    sla_deadline: datetime
    escalation_level: int = 1  # 1: Ward Field, 2: Ward Admin, 3: Zonal Head, 4: Commissioner
    status: TicketStatusEnum = TicketStatusEnum.REGISTERED
    is_breached: bool = False
    breach_hours: float = 0.0

    # Actions & Proof (Agent F)
    sop_checklist: List[str] = []
    bill_of_materials: List[str] = []
    closure_proof_photo_url: Optional[str] = None
    closure_approved: bool = False

    # Detailed Per-Agent Math & Performance Breakdown
    agent_metrics: Dict[str, Any] = Field(default_factory=dict)

    # Audit Trail
    audit_history: List[AuditLogRecord] = []


class TimeTravelRequest(BaseModel):
    hours: int = Field(..., description="Hours to advance the virtual clock by (e.g. 6, 24, 48)")


class TimeTravelStatus(BaseModel):
    virtual_time: datetime
    real_time: datetime
    offset_seconds: int
    offset_hours: float
