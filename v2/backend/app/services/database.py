"""Database & Civic Authority Data Store.
Maintains municipal departments, 4-tier officer hierarchy, complaints,
SLA policies, and audit logs.
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any
import uuid
from app.models.schemas import (
    Department, Officer, SlaPolicy, PriorityEnum,
    TicketStatusEnum, EscalationRecord, AuditLogRecord, MunicipalIncidentAgentState
)
from app.core.clock import ClockService


class CivicDatabase:
    """Thread-safe civic store with pre-seeded statutory PMC/PCMC municipal structure."""
    
    def __init__(self):
        self.departments: Dict[str, Department] = {}
        self.officers: Dict[str, Officer] = {}
        self.sla_policies: Dict[str, SlaPolicy] = {}
        self.complaints: Dict[str, MunicipalIncidentAgentState] = {}
        self.escalations: List[EscalationRecord] = []
        self.audit_logs: List[AuditLogRecord] = []
        self._seed_statutory_data()

    def _seed_statutory_data(self):
        # 1. Departments
        depts = [
            Department(
                department_id="dept-wat-01",
                name="Water Supply & Pumping",
                code="WAT",
                head_officer_email="ce.watersupply@punecorporation.org"
            ),
            Department(
                department_id="dept-swm-02",
                name="Solid Waste Management (SWM)",
                code="SWM",
                head_officer_email="dmc.solidwaste@punecorporation.org"
            ),
            Department(
                department_id="dept-drn-03",
                name="Drainage & Sewerage",
                code="DRN",
                head_officer_email="ee.drainage@punecorporation.org"
            ),
            Department(
                department_id="dept-ele-04",
                name="Streetlighting & Electrical",
                code="ELE",
                head_officer_email="ee.electrical@punecorporation.org"
            ),
            Department(
                department_id="dept-rdm-05",
                name="Roads & Traffic Infrastructure",
                code="RDM",
                head_officer_email="ce.roads@punecorporation.org"
            ),
        ]
        for d in depts:
            self.departments[d.department_id] = d

        # 2. Statutory 4-Tier Hierarchy Officers (Ward 14 Kothrud, Ward 8 Aundh, City HQ)
        officers_data = [
            # --- Tier 1: Ward Field Responders ---
            Officer(
                officer_id="off-l1-wat",
                department_id="dept-wat-01",
                name="Er. Sachin Shinde",
                designation="Junior Engineer (Water Works)",
                hierarchy_tier=1,
                ward_id="Ward-14 (Kothrud)",
                phone_number="+91-9822011001",
                email="je.water.ward14@pmc.gov.in"
            ),
            Officer(
                officer_id="off-l1-swm",
                department_id="dept-swm-02",
                name="Inspector Ramesh Jadhav",
                designation="Sanitary Inspector (SI)",
                hierarchy_tier=1,
                ward_id="Ward-14 (Kothrud)",
                phone_number="+91-9822011002",
                email="si.swm.ward14@pmc.gov.in"
            ),
            Officer(
                officer_id="off-l1-drn",
                department_id="dept-drn-03",
                name="Er. Santosh More",
                designation="Drainage Inspector",
                hierarchy_tier=1,
                ward_id="Ward-14 (Kothrud)",
                phone_number="+91-9822011003",
                email="di.drainage.ward14@pmc.gov.in"
            ),
            Officer(
                officer_id="off-l1-ele",
                department_id="dept-ele-04",
                name="Er. Nilesh Kulkarni",
                designation="Junior Engineer (Electrical)",
                hierarchy_tier=1,
                ward_id="Ward-14 (Kothrud)",
                phone_number="+91-9822011004",
                email="je.elec.ward14@pmc.gov.in"
            ),
            Officer(
                officer_id="off-l1-rdm",
                department_id="dept-rdm-05",
                name="Er. Amit Patil",
                designation="Junior Engineer (Civil - Roads)",
                hierarchy_tier=1,
                ward_id="Ward-14 (Kothrud)",
                phone_number="+91-9822011005",
                email="je.roads.ward14@pmc.gov.in"
            ),

            # --- Tier 2: Ward Administration ---
            Officer(
                officer_id="off-l2-amc",
                department_id="dept-wat-01",
                name="Dr. Jayant Bhosekar",
                designation="Assistant Municipal Commissioner (AMC - Ward 14)",
                hierarchy_tier=2,
                ward_id="Ward-14 (Kothrud)",
                phone_number="+91-9822022001",
                email="amc.kothrud@pmc.gov.in"
            ),
            Officer(
                officer_id="off-l2-ee",
                department_id="dept-rdm-05",
                name="Er. Vijay Deshmukh",
                designation="Executive Engineer (EE - Zone 3)",
                hierarchy_tier=2,
                ward_id="Ward-14 (Kothrud)",
                phone_number="+91-9822022002",
                email="ee.zone3@pmc.gov.in"
            ),

            # --- Tier 3: Zonal / City Department Heads ---
            Officer(
                officer_id="off-l3-dmc-eng",
                department_id="dept-wat-01",
                name="Shri Madhav Deshpande",
                designation="Deputy Municipal Commissioner (DMC - Engineering)",
                hierarchy_tier=3,
                ward_id="City Central HQ",
                phone_number="+91-9822033001",
                email="dmc.engineering@pmc.gov.in"
            ),
            Officer(
                officer_id="off-l3-dmc-swm",
                department_id="dept-swm-02",
                name="Smt. Asha Raut",
                designation="Deputy Municipal Commissioner (DMC - Solid Waste)",
                hierarchy_tier=3,
                ward_id="City Central HQ",
                phone_number="+91-9822033002",
                email="dmc.swm@pmc.gov.in"
            ),

            # --- Tier 4: Municipal Leadership & Appellate Authority ---
            Officer(
                officer_id="off-l4-commissioner",
                department_id="dept-wat-01",
                name="Dr. Vikram Kumar, IAS",
                designation="Municipal Commissioner & Appellate Authority",
                hierarchy_tier=4,
                ward_id="PMC Main Bhavan, Shivajinagar",
                phone_number="+91-9822044001",
                email="commissioner@punecorporation.org"
            ),
        ]
        for o in officers_data:
            self.officers[o.officer_id] = o

        # 3. Statutory SLA Policies (Hours)
        policies = [
            SlaPolicy(
                policy_id="pol-p1",
                department_id="dept-wat-01",
                category="Water Supply / Contamination",
                priority_tier=PriorityEnum.P1_CRITICAL,
                resolution_sla_hours=6,
                l2_escalation_hours=5,
                l3_escalation_hours=6,
            ),
            SlaPolicy(
                policy_id="pol-p2",
                department_id="dept-swm-02",
                category="Solid Waste Management",
                priority_tier=PriorityEnum.P2_HIGH,
                resolution_sla_hours=18,
                l2_escalation_hours=14,
                l3_escalation_hours=18,
            ),
            SlaPolicy(
                policy_id="pol-p3",
                department_id="dept-ele-04",
                category="Streetlighting",
                priority_tier=PriorityEnum.P3_MEDIUM,
                resolution_sla_hours=36,
                l2_escalation_hours=30,
                l3_escalation_hours=36,
            ),
            SlaPolicy(
                policy_id="pol-p4",
                department_id="dept-rdm-05",
                category="Roads & Civil Works",
                priority_tier=PriorityEnum.P4_LOW,
                resolution_sla_hours=48,
                l2_escalation_hours=40,
                l3_escalation_hours=48,
            ),
        ]
        for p in policies:
            self.sla_policies[p.policy_id] = p

    def get_tier_officer(self, department_id: str, tier: int) -> Officer:
        """Finds the designated officer for a given department and hierarchy tier."""
        # Tier 4 is always Municipal Commissioner
        if tier == 4:
            return self.officers["off-l4-commissioner"]
        
        # Tier 3
        if tier == 3:
            if "swm" in department_id.lower():
                return self.officers["off-l3-dmc-swm"]
            return self.officers["off-l3-dmc-eng"]
        
        # Tier 2
        if tier == 2:
            if "rdm" in department_id.lower() or "civil" in department_id.lower():
                return self.officers["off-l2-ee"]
            return self.officers["off-l2-amc"]

        # Tier 1 (Field)
        for off in self.officers.values():
            if off.department_id == department_id and off.hierarchy_tier == 1:
                return off
        
        return self.officers["off-l1-wat"]

    def evaluate_all_slas(self) -> List[Dict[str, Any]]:
        """Evaluates all active complaints against the virtual clock.
        Triggers Level 1 -> Level 2 -> Level 3 -> Level 4 escalations automatically on breach.
        """
        now = ClockService.get_current_virtual_time()
        escalated_events = []

        for ticket in self.complaints.values():
            if ticket.status in [TicketStatusEnum.RESOLVED]:
                continue

            deadline = ticket.sla_deadline
            overdue_seconds = (now - deadline).total_seconds()

            if overdue_seconds > 0:
                overdue_hours = round(overdue_seconds / 3600.0, 2)
                ticket.is_breached = True
                ticket.breach_hours = overdue_hours

                # Determine required escalation tier based on overdue extent
                # If breach > 0h -> Level 2 (AMC / EE)
                # If breach > 6h -> Level 3 (Deputy Commissioner DMC)
                # If breach > 24h -> Level 4 (Municipal Commissioner IAS)
                target_level = ticket.escalation_level
                if overdue_hours >= 24:
                    target_level = 4
                elif overdue_hours >= 6:
                    target_level = max(ticket.escalation_level, 3)
                elif overdue_hours > 0:
                    target_level = max(ticket.escalation_level, 2)

                if target_level > ticket.escalation_level:
                    old_level = ticket.escalation_level
                    ticket.escalation_level = target_level
                    ticket.status = TicketStatusEnum.ESCALATED

                    old_officer_name = ticket.assigned_officer_name
                    old_officer_id = ticket.assigned_officer_id

                    new_officer = self.get_tier_officer(ticket.assigned_department_id, target_level)
                    ticket.assigned_officer_id = new_officer.officer_id
                    ticket.assigned_officer_name = new_officer.name
                    ticket.assigned_officer_designation = new_officer.designation

                    if "agent_d" in ticket.agent_metrics:
                        ticket.agent_metrics["agent_d"]["escalation_level"] = target_level
                        ticket.agent_metrics["agent_d"]["active_assigned_officer"] = f"{new_officer.name} ({new_officer.designation})"
                        ticket.agent_metrics["agent_d"]["overdue_hours"] = overdue_hours
                        ticket.agent_metrics["agent_d"]["status"] = "SLA_BREACHED_PROMOTED"

                    # Create escalation ledger record
                    reason = f"Statutory SLA breached by {overdue_hours}h at virtual time {now.strftime('%Y-%m-%d %H:%M:%S UTC')}."
                    esc = EscalationRecord(
                        ticket_id=ticket.ticket_id,
                        from_officer_id=old_officer_id,
                        from_officer_name=old_officer_name,
                        to_officer_id=new_officer.officer_id,
                        to_officer_name=new_officer.name,
                        previous_level=old_level,
                        new_level=target_level,
                        breach_hours_overdue=overdue_hours,
                        trigger_reason=reason,
                        escalated_at=now
                    )
                    self.escalations.append(esc)

                    # Create audit log record
                    audit = AuditLogRecord(
                        ticket_id=ticket.ticket_id,
                        acting_agent="Agent D: SLA Orchestrator",
                        action_type=f"AUTO_ESCALATED_L{old_level}_TO_L{target_level}",
                        payload_snapshot={
                            "overdue_hours": overdue_hours,
                            "promoted_to": new_officer.designation,
                            "new_officer_name": new_officer.name,
                            "trigger_reason": reason
                        },
                        created_at=now
                    )
                    ticket.audit_history.append(audit)
                    self.audit_logs.append(audit)

                    escalated_events.append({
                        "ticket_id": ticket.ticket_id,
                        "old_level": old_level,
                        "new_level": target_level,
                        "overdue_hours": overdue_hours,
                        "assigned_to": f"{new_officer.name} ({new_officer.designation})"
                    })

        return escalated_events


# Global Database Instance
db = CivicDatabase()
