"""
sqlite_db.py — NagrikSewa AI (PS17)
PersistentCivicDatabase — full CRUD layer over SQLite for all 16 PRD tables.

All heavy schema DDL lives in backend/app/db/db_schema.py.
All seed data lives in backend/app/db/db_seed.py.
This module is the single runtime access object used by FastAPI routes and agents.

Design choices:
  - Every write goes straight through to SQLite (no deferred flush).
  - An in-memory dict cache is kept for complaints + reference tables to avoid
    repeated SELECT round-trips for hot paths (agent pipeline).
  - JSON columns are serialised/deserialised transparently inside this class.
  - FK enforcement is enabled on every connection via PRAGMA.
  - Thread safety: sqlite3 connections are opened per-call (not shared across
    threads) to avoid "SQLite objects created in a thread can only be used in
    that same thread" errors under uvicorn multi-worker mode.
"""

import json
import os
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.models.schemas import (
    AuditLogRecord,
    Department,
    EscalationRecord,
    MunicipalIncidentAgentState,
    Officer,
    PriorityEnum,
    SlaPolicy,
    TicketStatusEnum,
)
from app.core.clock import ClockService


# ---------------------------------------------------------------------------
# Connection helper
# ---------------------------------------------------------------------------

def _get_conn(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA temp_store = MEMORY")
    return conn


# ---------------------------------------------------------------------------
# JSON helpers
# ---------------------------------------------------------------------------

def _jdump(obj: Any) -> str:
    if obj is None:
        return "[]"
    return json.dumps(obj)


def _jload(s: Optional[str], default=None):
    if not s:
        return default if default is not None else []
    try:
        return json.loads(s)
    except (ValueError, TypeError):
        return default if default is not None else []


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_dt(s: Optional[str]) -> datetime:
    if not s:
        return datetime.now(timezone.utc)
    # Accept both with and without timezone suffix
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S"):
        try:
            dt = datetime.strptime(s, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# PersistentCivicDatabase
# ---------------------------------------------------------------------------

class PersistentCivicDatabase:
    """
    Thread-safe persistent SQLite civic store.
    Schema is applied + reference data seeded on first instantiation.
    """

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = self._resolve_path(db_path)

        # In-memory caches (hot-path lookups)
        self.departments:  Dict[str, Department]                  = {}
        self.officers:     Dict[str, Officer]                     = {}
        self.sla_policies: Dict[str, SlaPolicy]                   = {}
        self.complaints:   Dict[str, MunicipalIncidentAgentState] = {}
        self.escalations:  List[EscalationRecord]                 = []
        self.audit_logs:   List[AuditLogRecord]                   = []
        self.embeddings:   Dict[str, List[float]]                 = {}

        self._bootstrap()

    # ------------------------------------------------------------------
    # Initialisation
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_path(override: Optional[str]) -> str:
        if override:
            return override
        env = os.getenv("DATABASE_PATH")
        if env:
            return env
        # Serverless environments write only to /tmp
        if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
            return "/tmp/kurkshetra.db"
        base = Path(__file__).resolve().parent.parent / "data"
        base.mkdir(parents=True, exist_ok=True)
        return str(base / "kurkshetra.db")

    def _bootstrap(self) -> None:
        """Apply schema + seed reference data if the DB is empty."""
        import sys
        # Allow import from either installed package or direct script run
        try:
            from backend.app.db.db_schema import apply_schema
            from backend.app.db.db_seed   import ALL_SEED_GROUPS
        except ModuleNotFoundError:
            root = Path(__file__).resolve().parents[3]
            if str(root) not in sys.path:
                sys.path.insert(0, str(root))
            from backend.app.db.db_schema import apply_schema   # type: ignore
            from backend.app.db.db_seed   import ALL_SEED_GROUPS  # type: ignore

        conn = _get_conn(self.db_path)
        apply_schema(conn)

        # Seed only if reference tables are empty
        cur = conn.execute("SELECT COUNT(*) AS cnt FROM departments")
        if cur.fetchone()["cnt"] == 0:
            for table, pk_col, rows in ALL_SEED_GROUPS:
                for row in rows:
                    cols    = list(row.keys())
                    ph      = ", ".join(["?"] * len(cols))
                    col_str = ", ".join(cols)
                    vals    = [row[c] for c in cols]
                    try:
                        conn.execute(
                            f"INSERT OR IGNORE INTO {table} ({col_str}) VALUES ({ph})",
                            vals,
                        )
                    except sqlite3.Error:
                        pass
            conn.commit()

        conn.close()
        self._load_reference_tables()
        self._load_complaints_from_db()

    def _load_reference_tables(self) -> None:
        conn = _get_conn(self.db_path)
        for row in conn.execute("SELECT * FROM departments"):
            d = dict(row)
            self.departments[d["department_id"]] = Department(**d)
        for row in conn.execute("SELECT * FROM officers"):
            o = dict(row)
            self.officers[o["officer_id"]] = Officer(**o)
        for row in conn.execute("SELECT * FROM sla_policies"):
            r = dict(row)
            self.sla_policies[r["policy_id"]] = SlaPolicy(
                policy_id           = r["policy_id"],
                department_id       = r["department_id"],
                category            = r["category"],
                priority_tier       = PriorityEnum(r["priority_tier"]),
                resolution_sla_hours= r["resolution_sla_hours"],
                l2_escalation_hours = r["l2_escalation_hours"],
                l3_escalation_hours = r["l3_escalation_hours"],
            )
        conn.close()

    def _load_complaints_from_db(self) -> None:
        conn = _get_conn(self.db_path)
        for row in conn.execute("SELECT * FROM complaints"):
            try:
                ticket = self._row_to_complaint(dict(row))
                self.complaints[ticket.ticket_id] = ticket
            except Exception:
                pass  # Skip malformed legacy rows
        conn.close()

    # ------------------------------------------------------------------
    # Internal: row ↔ complaint conversion
    # ------------------------------------------------------------------

    @staticmethod
    def _complaint_to_row(state: MunicipalIncidentAgentState,
                          embedding: Optional[List[float]] = None) -> tuple:
        return (
            state.ticket_id,
            getattr(state, "ticket_number", state.ticket_id),
            state.parent_ticket_id,
            state.raw_input_text,
            state.canonical_english_summary or "",
            state.detected_language or "en",
            state.extracted_category or "",
            state.priority_level.value,
            float(state.priority_score),
            state.status.value,
            state.channel,
            state.complainant_name,
            state.complainant_phone,
            state.ward_id or "",
            getattr(state, "location_address", ""),
            state.landmark,
            state.latitude,
            state.longitude,
            state.cluster_size,
            1 if state.is_duplicate else 0,
            state.assigned_department_id or "",
            state.assigned_officer_id or "",
            state.escalation_level,
            state.sla_duration_hours,
            state.sla_deadline.isoformat() if state.sla_deadline else _now_iso(),
            1 if state.is_breached else 0,
            float(state.breach_hours),
            1 if state.missing_critical_info else 0,
            state.clarification_prompt,
            _jdump(state.sop_checklist),
            _jdump(state.bill_of_materials),
            state.closure_proof_photo_url,
            1 if state.closure_approved else 0,
            float(getattr(state, "cv_structural_score", 0.0)),
            1 if getattr(state, "cv_verified", False) else 0,
            getattr(state, "closure_verification_id", None),
            1 if getattr(state, "closure_dual_signed", False) else 0,
            _jdump(embedding or []),
            _jdump(state.agent_metrics),
            state.resolved_at.isoformat() if getattr(state, "resolved_at", None) else None,
            state.created_at.isoformat() if state.created_at else _now_iso(),
        )

    @staticmethod
    def _row_to_complaint(d: dict) -> MunicipalIncidentAgentState:
        return MunicipalIncidentAgentState(
            ticket_id                 = d["ticket_id"],
            parent_ticket_id          = d.get("parent_ticket_id"),
            created_at                = _parse_dt(d.get("created_at")),
            raw_input_text            = d.get("raw_text") or d.get("raw_input_text", ""),
            canonical_english_summary = d.get("canonical_text") or d.get("canonical_english_summary", ""),
            detected_language         = d.get("detected_language", "en"),
            channel                   = d.get("channel", "WEB"),
            complainant_name          = d.get("complainant_name"),
            complainant_phone         = d.get("complainant_phone"),
            ward_id                   = d.get("ward_id", ""),
            landmark                  = d.get("landmark"),
            latitude                  = float(d["latitude"]) if d.get("latitude") else 18.5074,
            longitude                 = float(d["longitude"]) if d.get("longitude") else 73.8077,
            extracted_category        = d.get("category") or d.get("extracted_category", ""),
            priority_level            = PriorityEnum(d.get("priority", "P3_MEDIUM")),
            priority_score            = float(d.get("priority_score", 50.0)),
            status                    = TicketStatusEnum(d.get("status", "REGISTERED")),
            cluster_size              = int(d.get("cluster_size", 1)),
            is_duplicate              = bool(int(d.get("is_duplicate", 0))),
            assigned_department_id    = d.get("assigned_department_id", ""),
            assigned_officer_id       = d.get("assigned_officer_id", ""),
            assigned_department_name  = d.get("assigned_department_name", ""),
            assigned_officer_name     = d.get("assigned_officer_name", ""),
            assigned_officer_designation = d.get("assigned_officer_designation", ""),
            escalation_level          = int(d.get("escalation_level", 1)),
            sla_duration_hours        = int(d.get("sla_duration_hours", 24)),
            sla_deadline              = _parse_dt(d.get("sla_deadline")),
            is_breached               = bool(int(d.get("is_breached", 0))),
            breach_hours              = float(d.get("breach_hours", 0.0)),
            missing_critical_info     = bool(int(d.get("missing_critical_info", 0))),
            clarification_prompt      = d.get("clarification_prompt"),
            sop_checklist             = _jload(d.get("sop_checklist_json"), []),
            bill_of_materials         = _jload(d.get("bill_of_materials_json"), []),
            closure_proof_photo_url   = d.get("closure_proof_photo_url"),
            closure_approved          = bool(int(d.get("closure_approved", 0))),
            cv_structural_score       = float(d.get("cv_structural_score", 0.0)),
            cv_verified               = bool(int(d.get("cv_verified", 0))),
            closure_verification_id   = d.get("closure_verification_id"),
            closure_dual_signed       = bool(int(d.get("closure_dual_signed", 0))),
            agent_metrics             = _jload(d.get("agent_metrics_json"), {}),
        )

    # ------------------------------------------------------------------
    # COMPLAINTS — create / read / update
    # ------------------------------------------------------------------

    def save_complaint(self,
                       state: MunicipalIncidentAgentState,
                       embedding: Optional[List[float]] = None) -> None:
        """Upserts a complaint into memory cache and SQLite."""
        self.complaints[state.ticket_id] = state
        if embedding:
            self.embeddings[state.ticket_id] = embedding

        row = self._complaint_to_row(state, embedding)
        conn = _get_conn(self.db_path)
        conn.execute("""
            INSERT OR REPLACE INTO complaints (
                ticket_id, ticket_number, parent_ticket_id,
                raw_text, canonical_text, detected_language,
                category, priority, priority_score, status,
                channel, complainant_name, complainant_phone,
                ward_id, location_address, landmark, latitude, longitude,
                cluster_size, is_duplicate,
                assigned_department_id, assigned_officer_id,
                escalation_level, sla_duration_hours, sla_deadline,
                is_breached, breach_hours,
                missing_critical_info, clarification_prompt,
                sop_checklist_json, bill_of_materials_json,
                closure_proof_photo_url, closure_approved,
                cv_structural_score, cv_verified,
                closure_verification_id, closure_dual_signed,
                embedding_json, agent_metrics_json,
                resolved_at, created_at
            ) VALUES (
                ?,?,?,?,?,?,?,?,?,?,
                ?,?,?,?,?,?,?,?,?,?,
                ?,?,?,?,?,?,?,?,?,?,
                ?,?,?,?,?,?,?,?,?,?,
                ?,?
            )
        """, row)
        conn.commit()
        conn.close()

    def get_complaint(self, ticket_id: str) -> Optional[MunicipalIncidentAgentState]:
        """Returns complaint from cache; falls back to SQLite."""
        if ticket_id in self.complaints:
            return self.complaints[ticket_id]
        conn = _get_conn(self.db_path)
        row = conn.execute(
            "SELECT * FROM complaints WHERE ticket_id = ?", (ticket_id,)
        ).fetchone()
        conn.close()
        if not row:
            return None
        ticket = self._row_to_complaint(dict(row))
        self.complaints[ticket_id] = ticket
        return ticket

    def list_complaints(self,
                        status: Optional[str]          = None,
                        department_id: Optional[str]   = None,
                        ward_id: Optional[str]          = None,
                        priority: Optional[str]         = None,
                        escalation_level: Optional[int] = None,
                        limit: int                      = 200) -> List[MunicipalIncidentAgentState]:
        """Filtered list of complaints for Kanban / map views."""
        wheres, vals = [], []
        if status:
            wheres.append("status = ?"); vals.append(status)
        if department_id:
            wheres.append("assigned_department_id = ?"); vals.append(department_id)
        if ward_id:
            wheres.append("ward_id = ?"); vals.append(ward_id)
        if priority:
            wheres.append("priority = ?"); vals.append(priority)
        if escalation_level is not None:
            wheres.append("escalation_level = ?"); vals.append(escalation_level)

        where_sql = ("WHERE " + " AND ".join(wheres)) if wheres else ""
        sql = f"SELECT * FROM complaints {where_sql} ORDER BY sla_deadline ASC LIMIT ?"
        vals.append(limit)

        conn = _get_conn(self.db_path)
        rows = conn.execute(sql, vals).fetchall()
        conn.close()
        results = []
        for r in rows:
            try:
                results.append(self._row_to_complaint(dict(r)))
            except Exception:
                pass
        return results

    def update_complaint_status(self, ticket_id: str,
                                 new_status: TicketStatusEnum,
                                 resolved_at: Optional[datetime] = None) -> bool:
        ticket = self.get_complaint(ticket_id)
        if not ticket:
            return False
        ticket.status = new_status
        if resolved_at:
            ticket.resolved_at = resolved_at
        self.save_complaint(ticket)
        return True

    # ------------------------------------------------------------------
    # ESCALATIONS — append / read
    # ------------------------------------------------------------------

    def save_escalation(self, rec: EscalationRecord) -> None:
        """Appends an escalation record (immutable — INSERT OR IGNORE)."""
        self.escalations.append(rec)
        conn = _get_conn(self.db_path)
        conn.execute("""
            INSERT OR IGNORE INTO escalations (
                escalation_id, ticket_id,
                from_officer_id, to_officer_id,
                from_officer_name, to_officer_name,
                previous_level, new_level,
                breach_hours_overdue, trigger_reason, escalated_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (
            rec.escalation_id,
            rec.ticket_id,
            rec.from_officer_id,
            rec.to_officer_id,
            rec.from_officer_name,
            rec.to_officer_name,
            rec.previous_level,
            rec.new_level,
            float(rec.breach_hours_overdue),
            rec.trigger_reason,
            rec.escalated_at.isoformat() if rec.escalated_at else _now_iso(),
        ))
        conn.commit()
        conn.close()

    def get_escalations_for_ticket(self, ticket_id: str) -> List[dict]:
        conn = _get_conn(self.db_path)
        rows = conn.execute(
            "SELECT * FROM escalations WHERE ticket_id = ? ORDER BY escalated_at ASC",
            (ticket_id,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # AUDIT LOGS — append / read
    # ------------------------------------------------------------------

    def save_audit_log(self, rec: AuditLogRecord) -> None:
        """Appends an audit log entry (immutable — INSERT OR IGNORE)."""
        self.audit_logs.append(rec)
        conn = _get_conn(self.db_path)
        conn.execute("""
            INSERT OR IGNORE INTO audit_logs (
                log_id, ticket_id, acting_agent, action_type,
                payload_snapshot, created_at
            ) VALUES (?,?,?,?,?,?)
        """, (
            rec.log_id,
            rec.ticket_id,
            rec.acting_agent,
            rec.action_type,
            json.dumps(rec.payload_snapshot) if rec.payload_snapshot else "{}",
            rec.created_at.isoformat() if rec.created_at else _now_iso(),
        ))
        conn.commit()
        conn.close()

    def get_audit_trail(self, ticket_id: str) -> List[dict]:
        conn = _get_conn(self.db_path)
        rows = conn.execute(
            "SELECT * FROM audit_logs WHERE ticket_id = ? ORDER BY created_at ASC",
            (ticket_id,)
        ).fetchall()
        conn.close()
        results = []
        for r in rows:
            d = dict(r)
            d["payload_snapshot"] = _jload(d.get("payload_snapshot"), {})
            results.append(d)
        return results

    # ------------------------------------------------------------------
    # CITIZENS — upsert / read
    # ------------------------------------------------------------------

    def upsert_citizen(self, phone_number: str,
                       display_name: Optional[str] = None,
                       preferred_language: str = "auto") -> str:
        """Creates or returns citizen_id for the given phone number."""
        conn = _get_conn(self.db_path)
        row = conn.execute(
            "SELECT citizen_id FROM citizens WHERE phone_number = ?", (phone_number,)
        ).fetchone()
        if row:
            conn.close()
            return row["citizen_id"]
        cid = str(uuid.uuid4())
        conn.execute("""
            INSERT INTO citizens (citizen_id, phone_number, display_name, preferred_language, created_at)
            VALUES (?,?,?,?,?)
        """, (cid, phone_number, display_name, preferred_language, _now_iso()))
        conn.commit()
        conn.close()
        return cid

    def get_citizen_by_phone(self, phone_number: str) -> Optional[dict]:
        conn = _get_conn(self.db_path)
        row = conn.execute(
            "SELECT * FROM citizens WHERE phone_number = ?", (phone_number,)
        ).fetchone()
        conn.close()
        return dict(row) if row else None

    # ------------------------------------------------------------------
    # COMPLAINT SUBSCRIBERS — link / read
    # ------------------------------------------------------------------

    def add_complaint_subscriber(self, complaint_id: str,
                                  citizen_id: str,
                                  is_original_filer: bool = False) -> None:
        conn = _get_conn(self.db_path)
        conn.execute("""
            INSERT OR IGNORE INTO complaint_subscribers
                (complaint_id, citizen_id, is_original_filer, subscribed_at)
            VALUES (?,?,?,?)
        """, (complaint_id, citizen_id, 1 if is_original_filer else 0, _now_iso()))
        conn.commit()
        conn.close()

    def get_complaint_subscribers(self, complaint_id: str) -> List[dict]:
        conn = _get_conn(self.db_path)
        rows = conn.execute("""
            SELECT cs.*, c.phone_number, c.display_name, c.preferred_language
            FROM complaint_subscribers cs
            JOIN citizens c ON c.citizen_id = cs.citizen_id
            WHERE cs.complaint_id = ?
        """, (complaint_id,)).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # NOTIFICATION LOG — insert / read
    # ------------------------------------------------------------------

    def log_notification(self,
                          ticket_id: str,
                          channel: str,
                          direction: str,
                          message_body: str,
                          milestone: Optional[str]       = None,
                          citizen_id: Optional[str]      = None,
                          delivery_status: str           = "PENDING",
                          provider_message_id: Optional[str] = None) -> str:
        nid = str(uuid.uuid4())
        conn = _get_conn(self.db_path)
        conn.execute("""
            INSERT INTO notification_log (
                notification_id, ticket_id, citizen_id, channel, direction,
                milestone, message_body, delivery_status, provider_message_id, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (nid, ticket_id, citizen_id, channel, direction,
              milestone, message_body, delivery_status, provider_message_id, _now_iso()))
        conn.commit()
        conn.close()
        return nid

    def update_notification_status(self, notification_id: str, status: str,
                                    provider_message_id: Optional[str] = None) -> None:
        conn = _get_conn(self.db_path)
        if provider_message_id:
            conn.execute(
                "UPDATE notification_log SET delivery_status=?, provider_message_id=? WHERE notification_id=?",
                (status, provider_message_id, notification_id)
            )
        else:
            conn.execute(
                "UPDATE notification_log SET delivery_status=? WHERE notification_id=?",
                (status, notification_id)
            )
        conn.commit()
        conn.close()

    def get_notifications_for_ticket(self, ticket_id: str) -> List[dict]:
        conn = _get_conn(self.db_path)
        rows = conn.execute(
            "SELECT * FROM notification_log WHERE ticket_id = ? ORDER BY created_at ASC",
            (ticket_id,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # FEEDBACK POLLS — create / respond
    # ------------------------------------------------------------------

    def create_feedback_poll(self, ticket_id: str) -> str:
        pid  = str(uuid.uuid4())
        now  = datetime.now(timezone.utc)
        expires = (now + timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ")
        conn = _get_conn(self.db_path)
        conn.execute("""
            INSERT INTO feedback_polls (poll_id, ticket_id, sent_at, expires_at)
            VALUES (?,?,?,?)
        """, (pid, ticket_id, now.strftime("%Y-%m-%dT%H:%M:%SZ"), expires))
        conn.commit()
        conn.close()
        return pid

    def record_poll_response(self, ticket_id: str, response: str) -> bool:
        """Records citizen poll response ('RESOLVED_CONFIRMED' or 'UNRESOLVED')."""
        conn = _get_conn(self.db_path)
        cur = conn.execute("""
            UPDATE feedback_polls
            SET response = ?, responded_at = ?
            WHERE ticket_id = ? AND response IS NULL
        """, (response, _now_iso(), ticket_id))
        conn.commit()
        conn.close()
        return cur.rowcount > 0

    def get_poll_for_ticket(self, ticket_id: str) -> Optional[dict]:
        conn = _get_conn(self.db_path)
        row = conn.execute(
            "SELECT * FROM feedback_polls WHERE ticket_id = ? ORDER BY sent_at DESC LIMIT 1",
            (ticket_id,)
        ).fetchone()
        conn.close()
        return dict(row) if row else None

    # ------------------------------------------------------------------
    # MEDIA ASSETS — save / read
    # ------------------------------------------------------------------

    def save_media_asset(self,
                          ticket_id: str,
                          asset_type: str,
                          storage_url: str,
                          geotag_lat: Optional[float]        = None,
                          geotag_lng: Optional[float]        = None,
                          geotag_valid: Optional[bool]       = None,
                          sha256_hash: Optional[str]         = None,
                          uploaded_by_officer_id: Optional[str] = None) -> str:
        mid = str(uuid.uuid4())
        gv  = None if geotag_valid is None else (1 if geotag_valid else 0)
        conn = _get_conn(self.db_path)
        conn.execute("""
            INSERT INTO media_assets (
                media_id, ticket_id, asset_type, storage_url,
                geotag_lat, geotag_lng, geotag_valid, sha256_hash,
                uploaded_by_officer_id, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (mid, ticket_id, asset_type, storage_url,
              geotag_lat, geotag_lng, gv, sha256_hash,
              uploaded_by_officer_id, _now_iso()))
        conn.commit()
        conn.close()
        return mid

    def get_media_for_ticket(self, ticket_id: str) -> List[dict]:
        conn = _get_conn(self.db_path)
        rows = conn.execute(
            "SELECT * FROM media_assets WHERE ticket_id = ? ORDER BY created_at ASC",
            (ticket_id,)
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # SOP TEMPLATES — read
    # ------------------------------------------------------------------

    def get_sop_template(self, category: str) -> Optional[dict]:
        conn = _get_conn(self.db_path)
        row = conn.execute(
            "SELECT * FROM sop_templates WHERE category = ?", (category,)
        ).fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["checklist_items"]     = _jload(d.get("checklist_items_json"), [])
        d["bill_of_materials"]   = _jload(d.get("bill_of_materials_json"), [])
        return d

    def list_sop_templates(self) -> List[dict]:
        conn = _get_conn(self.db_path)
        rows = conn.execute("SELECT * FROM sop_templates ORDER BY category").fetchall()
        conn.close()
        results = []
        for r in rows:
            d = dict(r)
            d["checklist_items"]   = _jload(d.get("checklist_items_json"), [])
            d["bill_of_materials"] = _jload(d.get("bill_of_materials_json"), [])
            results.append(d)
        return results

    # ------------------------------------------------------------------
    # PRIORITY WEIGHTS — read (Agent B)
    # ------------------------------------------------------------------

    def get_priority_weights(self, category: str) -> Optional[dict]:
        conn = _get_conn(self.db_path)
        row = conn.execute(
            "SELECT * FROM priority_weights WHERE category = ?", (category,)
        ).fetchone()
        conn.close()
        return dict(row) if row else None

    def list_priority_weights(self) -> List[dict]:
        conn = _get_conn(self.db_path)
        rows = conn.execute("SELECT * FROM priority_weights ORDER BY category").fetchall()
        conn.close()
        return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # CLOSURE VERIFICATIONS — save / read / update
    # ------------------------------------------------------------------

    def save_closure_verification(self, verif: dict) -> None:
        conn = _get_conn(self.db_path)
        conn.execute("""
            INSERT OR REPLACE INTO closure_verifications (
                verification_id, ticket_id, token,
                required_signatures, collected_signatures, signers_json,
                cv_structural_score, cv_verified, status, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (
            verif.get("verification_id"),
            verif.get("ticket_id"),
            verif.get("token"),
            int(verif.get("required_signatures", 1)),
            int(verif.get("collected_signatures", 0)),
            json.dumps(verif.get("signers", [])),
            float(verif.get("cv_structural_score", 0.0)),
            1 if verif.get("cv_verified", False) else 0,
            verif.get("status", "PENDING_CITIZEN_SIGNOFF"),
            verif.get("created_at") or _now_iso(),
        ))
        conn.commit()
        conn.close()

    def get_closure_verification(self, ticket_id: str) -> Optional[dict]:
        conn = _get_conn(self.db_path)
        row = conn.execute(
            "SELECT * FROM closure_verifications WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 1",
            (ticket_id,)
        ).fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["signers"]     = _jload(d.get("signers_json"), [])
        d["cv_verified"] = bool(d.get("cv_verified", 0))
        return d

    def get_closure_verification_by_token(self, token: str) -> Optional[dict]:
        conn = _get_conn(self.db_path)
        row = conn.execute(
            "SELECT * FROM closure_verifications WHERE token = ?", (token,)
        ).fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["signers"]     = _jload(d.get("signers_json"), [])
        d["cv_verified"] = bool(d.get("cv_verified", 0))
        return d

    # ------------------------------------------------------------------
    # CAPEX PROPOSALS — save / read / update
    # ------------------------------------------------------------------

    def save_capex_proposal(self, proposal: dict) -> None:
        conn = _get_conn(self.db_path)
        conn.execute("""
            INSERT OR REPLACE INTO capex_proposals (
                proposal_id, resolution_number, corridor_id, corridor_name,
                ward_id, department_id, department_name,
                incident_count_90d, centroid_lat, centroid_lng, radius_meters,
                failure_mode, root_cause_diagnosis, recommended_action,
                budget_head, estimated_cost_inr, estimated_cost_lakhs,
                dsr_items_json, standing_committee_draft_md, status, created_at
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            proposal["proposal_id"],
            proposal.get("resolution_number"),
            proposal.get("corridor_id"),
            proposal["corridor_name"],
            proposal["ward_id"],
            proposal["department_id"],
            proposal.get("department_name", ""),
            int(proposal.get("incident_count_90d", 0)),
            float(proposal.get("centroid_lat", 18.5074)),
            float(proposal.get("centroid_lng", 73.8077)),
            float(proposal.get("radius_meters", 200.0)),
            proposal.get("failure_mode", ""),
            proposal.get("root_cause_diagnosis", ""),
            proposal.get("recommended_action", ""),
            proposal.get("budget_head", ""),
            float(proposal.get("estimated_cost_inr", 0.0)),
            float(proposal.get("estimated_cost_lakhs", 0.0)),
            json.dumps(proposal.get("dsr_items", [])),
            proposal.get("standing_committee_draft_md", ""),
            proposal.get("status", "DRAFT_PENDING_COMMITTEE"),
            proposal.get("created_at") or _now_iso(),
        ))
        conn.commit()
        conn.close()

    def get_capex_proposals(self) -> List[dict]:
        conn = _get_conn(self.db_path)
        rows = conn.execute(
            "SELECT * FROM capex_proposals ORDER BY created_at DESC"
        ).fetchall()
        conn.close()
        results = []
        for r in rows:
            d = dict(r)
            d["dsr_items"] = _jload(d.get("dsr_items_json"), [])
            results.append(d)
        return results

    def get_capex_proposal(self, proposal_id: str) -> Optional[dict]:
        conn = _get_conn(self.db_path)
        row = conn.execute(
            "SELECT * FROM capex_proposals WHERE proposal_id = ?", (proposal_id,)
        ).fetchone()
        conn.close()
        if not row:
            return None
        d = dict(row)
        d["dsr_items"] = _jload(d.get("dsr_items_json"), [])
        return d

    def update_capex_proposal_status(self, proposal_id: str, status: str) -> None:
        conn = _get_conn(self.db_path)
        conn.execute(
            "UPDATE capex_proposals SET status = ? WHERE proposal_id = ?",
            (status, proposal_id)
        )
        conn.commit()
        conn.close()

    # ------------------------------------------------------------------
    # OFFICER LOOKUP HELPERS (used by Agent D + escalation)
    # ------------------------------------------------------------------

    def get_tier_officer(self, department_id: str, tier: int) -> Officer:
        """Returns the designated officer for a given department + tier."""
        # Tier 4 — always the Municipal Commissioner
        if tier >= 4:
            return self.officers["off-l4-commissioner"]

        # Tier 3 — DMC per department cluster
        if tier == 3:
            if "swm" in department_id.lower():
                return self.officers.get("off-l3-dmc-swm", self.officers["off-l4-commissioner"])
            if "drn" in department_id.lower():
                return self.officers.get("off-l3-dmc-drn", self.officers["off-l3-dmc-eng"])
            return self.officers.get("off-l3-dmc-eng", self.officers["off-l4-commissioner"])

        # Tier 2 — AMC (default) or EE (roads/civil)
        if tier == 2:
            if "rdm" in department_id.lower():
                return self.officers.get("off-l2-ee-w14", self.officers.get("off-l2-amc-w14"))
            return self.officers.get("off-l2-amc-w14", list(self.officers.values())[0])

        # Tier 1 — ward field responder matching department
        for off in self.officers.values():
            if off.department_id == department_id and off.hierarchy_tier == 1:
                return off

        # Fallback
        return self.officers.get("off-l1-wat-w14", list(self.officers.values())[0])

    def get_officer(self, officer_id: str) -> Optional[Officer]:
        return self.officers.get(officer_id)

    def list_officers(self, department_id: Optional[str] = None,
                      hierarchy_tier: Optional[int] = None,
                      ward_id: Optional[str] = None) -> List[Officer]:
        result = list(self.officers.values())
        if department_id:
            result = [o for o in result if o.department_id == department_id]
        if hierarchy_tier is not None:
            result = [o for o in result if o.hierarchy_tier == hierarchy_tier]
        if ward_id:
            result = [o for o in result if o.ward_id == ward_id]
        return result

    def list_departments(self) -> List[Department]:
        return list(self.departments.values())

    def list_sla_policies(self) -> List[SlaPolicy]:
        return list(self.sla_policies.values())

    # ------------------------------------------------------------------
    # SLA EVALUATION (Agent D — virtual clock sweep)
    # ------------------------------------------------------------------

    def evaluate_all_slas(self) -> List[Dict[str, Any]]:
        """
        Evaluates every non-resolved ticket against the current virtual clock.
        Enforces the 4-tier RTS Act 2015 escalation ladder:
          - 80% elapsed or 6h unacknowledged  → L2  (AMC/EE)
          - 100% elapsed (hard breach)         → L3  (DMC)
          - 150% elapsed or repeated reopen    → L4  (Commissioner)

        Inserts EscalationRecord + AuditLogRecord for each promotion.
        Returns list of escalation event dicts for WebSocket broadcast.
        """
        now              = ClockService.get_current_virtual_time()
        escalated_events: List[Dict[str, Any]] = []

        for ticket in list(self.complaints.values()):
            if ticket.status in (TicketStatusEnum.RESOLVED,):
                continue

            sla_hours  = max(1.0, float(ticket.sla_duration_hours))
            elapsed_h  = (now - ticket.created_at).total_seconds() / 3600.0
            ratio      = elapsed_h / sla_hours

            # Determine target escalation tier
            if ratio >= 1.5:
                target  = 4
                reason  = (f"Ticket overdue by {ratio:.1f}× statutory SLA "
                           f"({elapsed_h:.1f}h elapsed vs {sla_hours}h SLA). "
                           f"Escalated to Municipal Commissioner per RTS Act 2015 §12.")
            elif ratio >= 1.0:
                target  = 3
                reason  = (f"Hard 100% SLA breach — {elapsed_h:.1f}h elapsed vs {sla_hours}h SLA. "
                           f"Escalated to DMC per RTS Act 2015 §10.")
            elif ratio >= 0.8 or elapsed_h >= 6.0:
                target  = 2
                reason  = (f"Ticket unacknowledged for {elapsed_h:.1f}h "
                           f"({ratio*100:.0f}% SLA elapsed). "
                           f"Escalated to AMC per RTS Act 2015 §8.")
            else:
                continue  # Within safe window — no action

            if target <= ticket.escalation_level:
                continue  # Already at or above this tier

            prev_level     = ticket.escalation_level
            prev_officer_id = ticket.assigned_officer_id
            prev_officer_name = ticket.assigned_officer_name

            # Promote
            ticket.escalation_level = target
            if target >= 3:
                ticket.status     = TicketStatusEnum.ESCALATED
                ticket.is_breached = True
                ticket.breach_hours = max(0.0, round(elapsed_h - sla_hours, 2))

            new_officer = self.get_tier_officer(ticket.assigned_department_id, target)
            ticket.assigned_officer_id          = new_officer.officer_id
            ticket.assigned_officer_name        = new_officer.name
            ticket.assigned_officer_designation = new_officer.designation

            # Persist escalation ledger row
            breach_over = max(0.0, round(elapsed_h - sla_hours, 2))
            esc = EscalationRecord(
                ticket_id         = ticket.ticket_id,
                from_officer_id   = prev_officer_id,
                from_officer_name = prev_officer_name,
                to_officer_id     = new_officer.officer_id,
                to_officer_name   = new_officer.name,
                previous_level    = prev_level,
                new_level         = target,
                breach_hours_overdue = breach_over,
                trigger_reason    = reason,
                escalated_at      = now,
            )
            self.save_escalation(esc)

            # Immutable audit log entry
            audit = AuditLogRecord(
                ticket_id     = ticket.ticket_id,
                acting_agent  = "Agent:SLA_Orchestrator",
                action_type   = f"AUTO_ESCALATED_L{prev_level}_TO_L{target}",
                payload_snapshot = {
                    "previous_level":    prev_level,
                    "new_level":         target,
                    "elapsed_hours":     round(elapsed_h, 2),
                    "sla_hours":         sla_hours,
                    "breach_hours_overdue": breach_over,
                    "new_officer":       new_officer.name,
                    "new_designation":   new_officer.designation,
                    "trigger_reason":    reason,
                    "virtual_time":      now.isoformat(),
                },
                created_at = now,
            )
            self.save_audit_log(audit)
            self.save_complaint(ticket)

            escalated_events.append({
                "ticket_id":   ticket.ticket_id,
                "old_level":   prev_level,
                "new_level":   target,
                "elapsed_hours": round(elapsed_h, 2),
                "breach_hours":  breach_over,
                "assigned_to": f"{new_officer.name} ({new_officer.designation})",
                "reason":      reason,
            })

        return escalated_events

    # ------------------------------------------------------------------
    # EMBEDDINGS (Agent C — semantic cosine deduplication)
    # ------------------------------------------------------------------

    def get_all_embeddings(self) -> Dict[str, List[float]]:
        """Returns {ticket_id: embedding_vector} for all active tickets."""
        if self.embeddings:
            return self.embeddings
        conn = _get_conn(self.db_path)
        rows = conn.execute(
            "SELECT ticket_id, embedding_json FROM complaints WHERE embedding_json != '[]'"
        ).fetchall()
        conn.close()
        result = {}
        for r in rows:
            emb = _jload(r["embedding_json"], [])
            if emb:
                result[r["ticket_id"]] = emb
                self.embeddings[r["ticket_id"]] = emb
        return result

    # ------------------------------------------------------------------
    # DASHBOARD STATS
    # ------------------------------------------------------------------

    def get_dashboard_stats(self) -> dict:
        conn = _get_conn(self.db_path)
        stats: Dict[str, Any] = {}

        for row in conn.execute("""
            SELECT status, COUNT(*) AS cnt FROM complaints GROUP BY status
        """):
            stats[f"status_{row['status'].lower()}"] = row["cnt"]

        for row in conn.execute("""
            SELECT priority, COUNT(*) AS cnt FROM complaints GROUP BY priority
        """):
            stats[f"priority_{row['priority'].lower()}"] = row["cnt"]

        stats["total_complaints"] = conn.execute(
            "SELECT COUNT(*) AS cnt FROM complaints"
        ).fetchone()["cnt"]

        stats["total_escalations"] = conn.execute(
            "SELECT COUNT(*) AS cnt FROM escalations"
        ).fetchone()["cnt"]

        stats["active_breaches"] = conn.execute(
            "SELECT COUNT(*) AS cnt FROM complaints WHERE is_breached = 1 AND status != 'RESOLVED'"
        ).fetchone()["cnt"]

        stats["total_citizens"] = conn.execute(
            "SELECT COUNT(*) AS cnt FROM citizens"
        ).fetchone()["cnt"]

        stats["pending_polls"] = conn.execute(
            "SELECT COUNT(*) AS cnt FROM feedback_polls WHERE response IS NULL"
        ).fetchone()["cnt"]

        conn.close()
        return stats


# ---------------------------------------------------------------------------
# Singleton instance  (imported by FastAPI routes and agents)
# ---------------------------------------------------------------------------

persistent_db = PersistentCivicDatabase()
