"""Persistent SQLite Database & Civic Vector Storage for backend_v2.
Stores departments, officers, SLA policies, complaints, escalations, audit logs,
and vector embeddings matching PRD Part 6.
"""

import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

from app.models.schemas import (
    Department, Officer, SlaPolicy, PriorityEnum,
    TicketStatusEnum, EscalationRecord, AuditLogRecord, MunicipalIncidentAgentState
)
from app.core.clock import ClockService
from app.core.llm import LLMService


class PersistentCivicDatabase:
    """Thread-safe persistent SQLite civic store."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_dir = os.path.join(base_dir, "data")
            os.makedirs(data_dir, exist_ok=True)
            self.db_path = os.path.join(data_dir, "kurkshetra.db")
        else:
            self.db_path = db_path

        self.departments: Dict[str, Department] = {}
        self.officers: Dict[str, Officer] = {}
        self.sla_policies: Dict[str, SlaPolicy] = {}
        self.complaints: Dict[str, MunicipalIncidentAgentState] = {}
        self.escalations: List[EscalationRecord] = []
        self.audit_logs: List[AuditLogRecord] = []
        self.embeddings: Dict[str, List[float]] = {}

        self._init_sqlite_tables()
        self._seed_or_load()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_sqlite_tables(self):
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS departments (
                department_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                code TEXT NOT NULL,
                head_officer_email TEXT
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS officers (
                officer_id TEXT PRIMARY KEY,
                department_id TEXT NOT NULL,
                name TEXT NOT NULL,
                designation TEXT NOT NULL,
                hierarchy_tier INTEGER NOT NULL,
                ward_id TEXT,
                phone_number TEXT,
                email TEXT
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sla_policies (
                policy_id TEXT PRIMARY KEY,
                department_id TEXT NOT NULL,
                category TEXT NOT NULL,
                priority_tier TEXT NOT NULL,
                resolution_sla_hours INTEGER NOT NULL,
                l2_escalation_hours INTEGER NOT NULL,
                l3_escalation_hours INTEGER NOT NULL
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS complaints (
                ticket_id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                raw_input_text TEXT NOT NULL,
                channel TEXT NOT NULL,
                ward_id TEXT,
                latitude REAL,
                longitude REAL,
                complainant_name TEXT,
                complainant_phone TEXT,
                detected_language TEXT,
                extracted_category TEXT,
                canonical_english_summary TEXT,
                landmark TEXT,
                missing_critical_info INTEGER,
                clarification_prompt TEXT,
                is_duplicate INTEGER,
                parent_ticket_id TEXT,
                cluster_size INTEGER,
                similar_ticket_ids_json TEXT,
                priority_level TEXT,
                priority_score REAL,
                assigned_department_id TEXT,
                assigned_department_name TEXT,
                assigned_officer_id TEXT,
                assigned_officer_name TEXT,
                assigned_officer_designation TEXT,
                sla_duration_hours INTEGER,
                sla_deadline TEXT,
                status TEXT,
                escalation_level INTEGER,
                is_breached INTEGER,
                sop_checklist_json TEXT,
                bill_of_materials_json TEXT,
                closure_proof_photo_url TEXT,
                closure_approved INTEGER,
                agent_metrics_json TEXT,
                embedding_json TEXT
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS escalations (
                escalation_id TEXT PRIMARY KEY,
                ticket_id TEXT NOT NULL,
                previous_level INTEGER,
                new_level INTEGER,
                previous_officer_name TEXT,
                new_officer_name TEXT,
                trigger_reason TEXT,
                hours_overdue REAL,
                timestamp TEXT NOT NULL
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                log_id TEXT PRIMARY KEY,
                ticket_id TEXT NOT NULL,
                acting_agent TEXT NOT NULL,
                action_type TEXT NOT NULL,
                payload_snapshot_json TEXT,
                created_at TEXT NOT NULL
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS citizens (
                citizen_id TEXT PRIMARY KEY,
                phone_number TEXT UNIQUE NOT NULL,
                display_name TEXT,
                preferred_language TEXT DEFAULT 'auto',
                created_at TEXT NOT NULL
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS complaint_subscribers (
                complaint_id TEXT NOT NULL,
                citizen_id TEXT NOT NULL,
                is_original_filer INTEGER NOT NULL DEFAULT 0,
                subscribed_at TEXT NOT NULL,
                PRIMARY KEY (complaint_id, citizen_id)
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS notification_log (
                notification_id TEXT PRIMARY KEY,
                ticket_id TEXT NOT NULL,
                citizen_id TEXT,
                channel TEXT NOT NULL,
                direction TEXT NOT NULL,
                milestone TEXT,
                message_body TEXT NOT NULL,
                delivery_status TEXT DEFAULT 'DELIVERED',
                provider_message_id TEXT,
                created_at TEXT NOT NULL
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS feedback_polls (
                poll_id TEXT PRIMARY KEY,
                ticket_id TEXT NOT NULL,
                sent_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                response TEXT,
                responded_at TEXT
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS media_assets (
                media_id TEXT PRIMARY KEY,
                ticket_id TEXT NOT NULL,
                asset_type TEXT NOT NULL,
                storage_url TEXT NOT NULL,
                geotag_lat REAL,
                geotag_lng REAL,
                geotag_valid INTEGER,
                uploaded_by_officer_id TEXT,
                created_at TEXT NOT NULL
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS sop_templates (
                template_id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                checklist_items_json TEXT NOT NULL,
                bill_of_materials_json TEXT,
                created_at TEXT NOT NULL
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS closure_verifications (
                verification_id TEXT PRIMARY KEY,
                ticket_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                required_signatures INTEGER NOT NULL,
                collected_signatures INTEGER NOT NULL DEFAULT 0,
                signers_json TEXT NOT NULL DEFAULT '[]',
                cv_structural_score REAL,
                cv_verified INTEGER DEFAULT 0,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """)

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS capex_proposals (
                proposal_id TEXT PRIMARY KEY,
                resolution_number TEXT,
                corridor_id TEXT,
                corridor_name TEXT NOT NULL,
                ward_id TEXT NOT NULL,
                department_id TEXT NOT NULL,
                department_name TEXT NOT NULL,
                incident_count_90d INTEGER NOT NULL,
                centroid_lat REAL NOT NULL,
                centroid_lng REAL NOT NULL,
                radius_meters REAL NOT NULL,
                failure_mode TEXT NOT NULL,
                root_cause_diagnosis TEXT NOT NULL,
                recommended_action TEXT NOT NULL,
                budget_head TEXT NOT NULL,
                estimated_cost_inr REAL NOT NULL,
                estimated_cost_lakhs REAL NOT NULL,
                dsr_items_json TEXT NOT NULL,
                standing_committee_draft_md TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'DRAFT_PENDING_COMMITTEE',
                created_at TEXT NOT NULL
            )
            """)
            conn.commit()

    def _seed_or_load(self):
        """Loads data from SQLite, or seeds initial statutory data if empty."""
        with self._get_conn() as conn:
            c = conn.cursor()
            c.execute("SELECT COUNT(*) as cnt FROM departments")
            if c.fetchone()["cnt"] == 0:
                self._seed_statutory_defaults()
            else:
                self._load_from_sqlite()

            c.execute("SELECT COUNT(*) as cnt FROM capex_proposals")
            if c.fetchone()["cnt"] == 0:
                self._seed_canonical_capex_proposals()

    def _seed_canonical_capex_proposals(self):
        from app.services.capex_service import CapExService
        p1 = CapExService.generate_capex_proposal("CORR-PUN-01")
        p2 = CapExService.generate_capex_proposal("CORR-PUN-02")
        self.save_capex_proposal(p1)
        self.save_capex_proposal(p2)

    def _seed_statutory_defaults(self):
        depts = [
            Department(department_id="dept-wat-01", name="Water Supply & Pumping", code="WAT", head_officer_email="ce.watersupply@punecorporation.org"),
            Department(department_id="dept-swm-02", name="Solid Waste Management (SWM)", code="SWM", head_officer_email="dmc.solidwaste@punecorporation.org"),
            Department(department_id="dept-drn-03", name="Drainage & Sewerage", code="DRN", head_officer_email="ee.drainage@punecorporation.org"),
            Department(department_id="dept-ele-04", name="Streetlighting & Electrical", code="ELE", head_officer_email="ee.electrical@punecorporation.org"),
            Department(department_id="dept-rdm-05", name="Roads & Traffic Infrastructure", code="RDM", head_officer_email="ce.roads@punecorporation.org"),
        ]
        with self._get_conn() as conn:
            c = conn.cursor()
            for d in depts:
                self.departments[d.department_id] = d
                c.execute("INSERT OR REPLACE INTO departments VALUES (?, ?, ?, ?)",
                          (d.department_id, d.name, d.code, d.head_officer_email))

            officers = [
                Officer(officer_id="off-l1-wat", department_id="dept-wat-01", name="Junior Engineer (Water Works)", designation="Ward 14 Field Responder (Water Works)", hierarchy_tier=1, ward_id="Ward-14 (Kothrud)", phone_number="+91-20-25501001", email="je.water.ward14@pmc.gov.in"),
                Officer(officer_id="off-l1-swm", department_id="dept-swm-02", name="Sanitary Inspector (SWM)", designation="Ward 14 Field Responder (Sanitation)", hierarchy_tier=1, ward_id="Ward-14 (Kothrud)", phone_number="+91-20-25501002", email="si.swm.ward14@pmc.gov.in"),
                Officer(officer_id="off-l1-drn", department_id="dept-drn-03", name="Drainage Inspector", designation="Ward 14 Field Responder (Drainage)", hierarchy_tier=1, ward_id="Ward-14 (Kothrud)", phone_number="+91-20-25501003", email="di.drainage.ward14@pmc.gov.in"),
                Officer(officer_id="off-l1-ele", department_id="dept-ele-04", name="Junior Engineer (Electrical)", designation="Ward 14 Field Responder (Streetlighting)", hierarchy_tier=1, ward_id="Ward-14 (Kothrud)", phone_number="+91-20-25501004", email="je.elec.ward14@pmc.gov.in"),
                Officer(officer_id="off-l1-rdm", department_id="dept-rdm-05", name="Junior Engineer (Civil - Roads)", designation="Ward 14 Field Responder (Roads & Traffic)", hierarchy_tier=1, ward_id="Ward-14 (Kothrud)", phone_number="+91-20-25501005", email="je.roads.ward14@pmc.gov.in"),
                Officer(officer_id="off-l2-amc", department_id="dept-wat-01", name="Assistant Municipal Commissioner (AMC)", designation="Ward 14 Administrative Officer", hierarchy_tier=2, ward_id="Ward-14 (Kothrud)", phone_number="+91-20-25502001", email="amc.kothrud@pmc.gov.in"),
                Officer(officer_id="off-l2-ee", department_id="dept-rdm-05", name="Executive Engineer (EE)", designation="Zone 3 Executive Officer", hierarchy_tier=2, ward_id="Ward-14 (Kothrud)", phone_number="+91-20-25502002", email="ee.zone3@pmc.gov.in"),
                Officer(officer_id="off-l3-dmc-eng", department_id="dept-wat-01", name="Deputy Municipal Commissioner (Engineering)", designation="DMC Engineering & Infrastructure", hierarchy_tier=3, ward_id="City Central HQ", phone_number="+91-20-25503001", email="dmc.engineering@pmc.gov.in"),
                Officer(officer_id="off-l3-dmc-swm", department_id="dept-swm-02", name="Deputy Municipal Commissioner (Solid Waste)", designation="DMC Solid Waste Management", hierarchy_tier=3, ward_id="City Central HQ", phone_number="+91-20-25503002", email="dmc.swm@pmc.gov.in"),
                Officer(officer_id="off-l4-commissioner", department_id="dept-wat-01", name="Municipal Commissioner & Appellate Authority", designation="Municipal Commissioner & Appellate Authority", hierarchy_tier=4, ward_id="PMC Main Bhavan, Shivajinagar", phone_number="+91-20-25504001", email="commissioner@punecorporation.org")
            ]
            for o in officers:
                self.officers[o.officer_id] = o
                c.execute("INSERT OR REPLACE INTO officers VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                          (o.officer_id, o.department_id, o.name, o.designation, o.hierarchy_tier, o.ward_id, o.phone_number, o.email))

            policies = [
                ("pol-p1", "dept-wat-01", "Water Supply & Pumping", "P1_CRITICAL", 6, 4, 6),
                ("pol-p2", "dept-swm-02", "Solid Waste Management", "P2_HIGH", 18, 14, 18),
                ("pol-p3", "dept-ele-04", "Streetlighting & Electrical", "P3_MEDIUM", 36, 30, 36),
                ("pol-p4", "dept-rdm-05", "Roads & Civil Works", "P4_LOW", 48, 40, 48),
            ]
            for p in policies:
                c.execute("INSERT OR REPLACE INTO sla_policies VALUES (?, ?, ?, ?, ?, ?, ?)", p)

            # Pre-seed SOP templates per PRD Section 6.2.2 & 4.6
            sop_templates_data = [
                (
                    "sop-wat-01",
                    "Water Supply & Pumping",
                    json.dumps([
                        "Dispatch emergency valve squad to isolate feeder line section",
                        "Excavate trench with JCB backhoe to expose fractured main pipeline",
                        "Fit high-pressure ductile iron repair clamp / split sleeve collar",
                        "Perform hydraulic pressure test up to 6.5 bar",
                        "Backfill trench with compacted quarry sand and reinstate bitumen road cover"
                    ]),
                    json.dumps([
                        {"item": "Ductile Iron Pipeline Collar (150mm)", "quantity": 1, "unit": "Nos"},
                        {"item": "Rubber Gasket Joint Seal Ring", "quantity": 2, "unit": "Nos"},
                        {"item": "High-Tensile Galvanized Fasteners", "quantity": 8, "unit": "Nos"},
                        {"item": "Crushed Stone Aggregates / Wet Mix", "quantity": 1.5, "unit": "Tons"}
                    ]),
                    datetime.now(timezone.utc).isoformat()
                ),
                (
                    "sop-swm-02",
                    "Solid Waste Management",
                    json.dumps([
                        "Deploy hydraulic tipper compactor truck to overflowing location",
                        "Sanitation crew mechanical shoveling and secondary waste containment",
                        "Apply disinfectant lime and sodium hypochlorite chemical wash",
                        "Capture time-stamped clean site photograph for digital audit"
                    ]),
                    json.dumps([
                        {"item": "10-Yard Refuse Compactor Vehicle", "quantity": 1, "unit": "Shift"},
                        {"item": "Hydrated Disinfectant Lime Powder", "quantity": 25, "unit": "Kg"},
                        {"item": "Sodium Hypochlorite Disinfectant Solution (5%)", "quantity": 10, "unit": "Liters"}
                    ]),
                    datetime.now(timezone.utc).isoformat()
                ),
                (
                    "sop-drn-03",
                    "Drainage & Sewerage",
                    json.dumps([
                        "Cordon off manhole hazard perimeter with reflective barricades",
                        "Deploy high-velocity sewer jetting machine and vacuum suction tanker",
                        "Remove silt and non-biodegradable blockages from chamber",
                        "Install heavy-duty SFRC manhole frame and cover",
                        "Verify free gravity flow along downstream branch"
                    ]),
                    json.dumps([
                        {"item": "Heavy-Duty SFRC Manhole Frame & Lid (Class D400)", "quantity": 1, "unit": "Set"},
                        {"item": "High-Pressure Jetting Vacuum Suction Unit", "quantity": 1, "unit": "Shift"},
                        {"item": "Quick-Setting High Early Strength Mortar", "quantity": 40, "unit": "Kg"}
                    ]),
                    datetime.now(timezone.utc).isoformat()
                ),
                (
                    "sop-ele-04",
                    "Streetlighting & Electrical",
                    json.dumps([
                        "De-energize feeder pillar circuit and lock out tag out (LOTO)",
                        "Lineman squad aerial inspection using hydraulic boom ladder",
                        "Replace damaged cable / junction box / LED driver",
                        "Check earthing resistance (<= 2 ohms)",
                        "Re-energize feeder circuit and verify light lux output"
                    ]),
                    json.dumps([
                        {"item": "Armored Underground Aluminum Cable (4-Core 16 sq mm)", "quantity": 15, "unit": "Meters"},
                        {"item": "IP67 Weatherproof Junction Enclosure Box", "quantity": 1, "unit": "Nos"},
                        {"item": "90W Outdoor Streetlight LED Driver Unit", "quantity": 1, "unit": "Nos"}
                    ]),
                    datetime.now(timezone.utc).isoformat()
                ),
                (
                    "sop-rdm-05",
                    "Roads & Civil Works",
                    json.dumps([
                        "Erect traffic safety cones and retroreflective diversion signage",
                        "Square cut pothole edges using diamond asphalt cutter to sound pavement",
                        "Blow out moisture and loose debris with compressed air",
                        "Apply rapid-curing cationic tack coat primer emulsion",
                        "Lay high-performance cold mix polymer modified bitumen patch and mechanical plate compactor roll"
                    ]),
                    json.dumps([
                        {"item": "Ready-to-use Polymer Modified Cold Bituminous Mix", "quantity": 120, "unit": "Kg"},
                        {"item": "Rapid Curing Bitumen Emulsion Tack Coat (RS-1)", "quantity": 15, "unit": "Liters"},
                        {"item": "Vibratory Plate Compactor Equipment", "quantity": 1, "unit": "Shift"}
                    ]),
                    datetime.now(timezone.utc).isoformat()
                )
            ]
            for t in sop_templates_data:
                c.execute("INSERT OR REPLACE INTO sop_templates VALUES (?, ?, ?, ?, ?)", t)

            conn.commit()

    def _load_from_sqlite(self):
        with self._get_conn() as conn:
            c = conn.cursor()
            for r in c.execute("SELECT * FROM departments"):
                self.departments[r["department_id"]] = Department(**dict(r))
            for r in c.execute("SELECT * FROM officers"):
                self.officers[r["officer_id"]] = Officer(**dict(r))
            for r in c.execute("SELECT * FROM complaints"):
                d = dict(r)
                # Parse JSON fields
                d["created_at"] = datetime.fromisoformat(d["created_at"])
                d["sla_deadline"] = datetime.fromisoformat(d["sla_deadline"])
                d["similar_ticket_ids"] = json.loads(d.pop("similar_ticket_ids_json", "[]") or "[]")
                d["sop_checklist"] = json.loads(d.pop("sop_checklist_json", "[]") or "[]")
                d["bill_of_materials"] = json.loads(d.pop("bill_of_materials_json", "[]") or "[]")
                d["agent_metrics"] = json.loads(d.pop("agent_metrics_json", "{}") or "{}")
                emb = json.loads(d.pop("embedding_json", "[]") or "[]")
                if emb:
                    self.embeddings[d["ticket_id"]] = emb
                d["is_duplicate"] = bool(d["is_duplicate"])
                d["missing_critical_info"] = bool(d["missing_critical_info"])
                d["is_breached"] = bool(d["is_breached"])
                d["closure_approved"] = bool(d["closure_approved"])
                d["status"] = TicketStatusEnum(d["status"])
                d["priority_level"] = PriorityEnum(d["priority_level"])
                ticket = MunicipalIncidentAgentState(**d)
                self.complaints[ticket.ticket_id] = ticket

    def save_complaint(self, state: MunicipalIncidentAgentState, embedding: Optional[List[float]] = None):
        """Persists complaint state into memory and SQLite database."""
        self.complaints[state.ticket_id] = state
        if embedding:
            self.embeddings[state.ticket_id] = embedding

        with self._get_conn() as conn:
            c = conn.cursor()
            c.execute("""
            INSERT OR REPLACE INTO complaints VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?
            )
            """, (
                state.ticket_id,
                state.created_at.isoformat(),
                state.raw_input_text,
                state.channel,
                state.ward_id,
                state.latitude,
                state.longitude,
                state.complainant_name,
                state.complainant_phone,
                state.detected_language,
                state.extracted_category,
                state.canonical_english_summary,
                state.landmark,
                1 if state.missing_critical_info else 0,
                state.clarification_prompt,
                1 if state.is_duplicate else 0,
                state.parent_ticket_id,
                state.cluster_size,
                json.dumps(state.similar_ticket_ids),
                state.priority_level.value,
                state.priority_score,
                state.assigned_department_id,
                state.assigned_department_name,
                state.assigned_officer_id,
                state.assigned_officer_name,
                state.assigned_officer_designation,
                state.sla_duration_hours,
                state.sla_deadline.isoformat(),
                state.status.value,
                state.escalation_level,
                1 if state.is_breached else 0,
                json.dumps(state.sop_checklist),
                json.dumps(state.bill_of_materials),
                state.closure_proof_photo_url,
                1 if state.closure_approved else 0,
                json.dumps(state.agent_metrics),
                json.dumps(embedding or self.embeddings.get(state.ticket_id, []))
            ))
            conn.commit()

    def get_complaint(self, ticket_id: str) -> Optional[MunicipalIncidentAgentState]:
        """Fetches a complaint by ticket_id from in-memory cache or SQLite database."""
        if ticket_id in self.complaints:
            return self.complaints[ticket_id]
        with self._get_conn() as conn:
            c = conn.cursor()
            c.execute("SELECT * FROM complaints WHERE ticket_id = ?", (ticket_id,))
            r = c.fetchone()
            if not r:
                return None
            d = dict(r)
            d["created_at"] = datetime.fromisoformat(d["created_at"])
            d["sla_deadline"] = datetime.fromisoformat(d["sla_deadline"])
            d["similar_ticket_ids"] = json.loads(d.pop("similar_ticket_ids_json", "[]") or "[]")
            d["sop_checklist"] = json.loads(d.pop("sop_checklist_json", "[]") or "[]")
            d["bill_of_materials"] = json.loads(d.pop("bill_of_materials_json", "[]") or "[]")
            d["agent_metrics"] = json.loads(d.pop("agent_metrics_json", "{}") or "{}")
            emb = json.loads(d.pop("embedding_json", "[]") or "[]")
            if emb:
                self.embeddings[d["ticket_id"]] = emb
            d["is_duplicate"] = bool(d["is_duplicate"])
            d["missing_critical_info"] = bool(d["missing_critical_info"])
            d["is_breached"] = bool(d["is_breached"])
            d["closure_approved"] = bool(d["closure_approved"])
            d["status"] = TicketStatusEnum(d["status"])
            d["priority_level"] = PriorityEnum(d["priority_level"])
            ticket = MunicipalIncidentAgentState(**d)
            self.complaints[ticket.ticket_id] = ticket
            return ticket

    def get_tier_officer(self, department_id: str, tier: int) -> Officer:
        if tier == 4:
            return self.officers["off-l4-commissioner"]
        if tier == 3:
            if "swm" in department_id.lower():
                return self.officers["off-l3-dmc-swm"]
            return self.officers["off-l3-dmc-eng"]
        if tier == 2:
            if "rdm" in department_id.lower() or "civil" in department_id.lower():
                return self.officers["off-l2-ee"]
            return self.officers["off-l2-amc"]
        for off in self.officers.values():
            if off.department_id == department_id and off.hierarchy_tier == 1:
                return off
        return self.officers["off-l1-wat"]

    def evaluate_all_slas(self) -> List[Dict[str, Any]]:
        now = ClockService.get_current_virtual_time()
        escalated_events = []
        for ticket in self.complaints.values():
            if ticket.status == TicketStatusEnum.RESOLVED:
                continue
            elapsed_hours = (now - ticket.created_at).total_seconds() / 3600.0
            sla_hours = max(1.0, float(ticket.sla_duration_hours))
            ratio = elapsed_hours / sla_hours

            target_tier = 1
            if ratio >= 1.5:
                target_tier = 4
                reason = "Overdue > 150% of statutory SLA. Escalated to Municipal Commissioner."
            elif ratio >= 1.0:
                target_tier = 3
                reason = "Hard statutory SLA breach reached. Escalated to DMC."
            elif ratio >= 0.8 or elapsed_hours >= 6.0:
                target_tier = 2
                reason = "Unacknowledged within 6h or 80% SLA elapsed. Escalated to AMC."

            if target_tier > ticket.escalation_level:
                prev_lvl = ticket.escalation_level
                ticket.escalation_level = target_tier
                if target_tier >= 3:
                    ticket.status = TicketStatusEnum.ESCALATED
                    ticket.is_breached = True

                new_off = self.get_tier_officer(ticket.assigned_department_id, target_tier)
                ticket.assigned_officer_id = new_off.officer_id
                ticket.assigned_officer_name = new_off.name
                ticket.assigned_officer_designation = new_off.designation

                rec = EscalationRecord(
                    ticket_id=ticket.ticket_id,
                    previous_level=prev_lvl,
                    new_level=target_tier,
                    previous_officer_name="Field Team",
                    new_officer_name=f"{new_off.name} ({new_off.designation})",
                    trigger_reason=reason,
                    hours_overdue=round(max(0.0, elapsed_hours - sla_hours), 2),
                    timestamp=now
                )
                self.escalations.append(rec)
                self.save_complaint(ticket)
                escalated_events.append({"ticket_id": ticket.ticket_id, "new_level": target_tier, "officer": new_off.name, "reason": reason})

        return escalated_events

    def save_closure_verification(self, verif: dict):
        """Inserts or updates a cryptographic closure verification record."""
        with self._get_conn() as conn:
            c = conn.cursor()
            c.execute("""
            INSERT OR REPLACE INTO closure_verifications VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                verif.get("verification_id"),
                verif.get("ticket_id"),
                verif.get("token"),
                verif.get("required_signatures", 1),
                verif.get("collected_signatures", 0),
                json.dumps(verif.get("signers", [])),
                verif.get("cv_structural_score", 0.0),
                1 if verif.get("cv_verified", True) else 0,
                verif.get("status", "PENDING_CITIZEN_SIGNOFF"),
                verif.get("created_at")
            ))
            conn.commit()

    def get_closure_verification(self, ticket_id: str) -> Optional[dict]:
        """Fetches closure verification state for a ticket."""
        with self._get_conn() as conn:
            c = conn.cursor()
            c.execute("SELECT * FROM closure_verifications WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 1", (ticket_id,))
            row = c.fetchone()
            if not row:
                return None
            d = dict(row)
            d["signers"] = json.loads(d.get("signers_json") or "[]")
            d["cv_verified"] = bool(d.get("cv_verified", 0))
            return d

    def save_capex_proposal(self, proposal: dict):
        """Saves or updates a synthesized CapEx proposal."""
        with self._get_conn() as conn:
            c = conn.cursor()
            c.execute("""
            INSERT OR REPLACE INTO capex_proposals VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal["proposal_id"],
                proposal.get("resolution_number"),
                proposal.get("corridor_id"),
                proposal["corridor_name"],
                proposal["ward_id"],
                proposal["department_id"],
                proposal.get("department_name", "Public Works"),
                proposal.get("incident_count_90d", 3),
                proposal.get("centroid_lat", 18.5074),
                proposal.get("centroid_lng", 73.8077),
                proposal.get("radius_meters", 200.0),
                proposal.get("failure_mode", "STRUCTURAL_ASSET_FAILURE"),
                proposal.get("root_cause_diagnosis", ""),
                proposal.get("recommended_action", ""),
                proposal.get("budget_head", "410-20-84"),
                proposal.get("estimated_cost_inr", 0.0),
                proposal.get("estimated_cost_lakhs", 0.0),
                json.dumps(proposal.get("dsr_items", [])),
                proposal.get("standing_committee_draft_md", ""),
                proposal.get("status", "DRAFT_PENDING_COMMITTEE"),
                proposal.get("created_at")
            ))
            conn.commit()

    def get_capex_proposals(self) -> List[dict]:
        """Returns all synthesized CapEx proposals."""
        with self._get_conn() as conn:
            c = conn.cursor()
            c.execute("SELECT * FROM capex_proposals ORDER BY created_at DESC")
            rows = c.fetchall()
            out = []
            for r in rows:
                d = dict(r)
                d["dsr_items"] = json.loads(d.get("dsr_items_json") or "[]")
                out.append(d)
            return out

    def get_capex_proposal(self, proposal_id: str) -> Optional[dict]:
        """Fetches a specific CapEx proposal by ID."""
        with self._get_conn() as conn:
            c = conn.cursor()
            c.execute("SELECT * FROM capex_proposals WHERE proposal_id = ?", (proposal_id,))
            row = c.fetchone()
            if not row:
                return None
            d = dict(row)
            d["dsr_items"] = json.loads(d.get("dsr_items_json") or "[]")
            return d

    def update_capex_proposal_status(self, proposal_id: str, status: str):
        """Updates approval status of a proposal."""
        with self._get_conn() as conn:
            c = conn.cursor()
            c.execute("UPDATE capex_proposals SET status = ? WHERE proposal_id = ?", (status, proposal_id))
            conn.commit()


# Singleton persistent database instance for backend_v2
persistent_db = PersistentCivicDatabase()
