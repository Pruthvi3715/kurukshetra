"""
db_schema.py — NagrikSewa AI (PS17)
Full SQLite schema for all 13 PRD-specified tables + indices.
Mirrors PRD Part 6.2.1 (core) and Part 6.2.2 (extended supporting schema).

SQLite adaptations vs. PRD PostgreSQL spec:
  - UUID columns → TEXT (SQLite has no native UUID type)
  - GEOMETRY(Point,4326) → lat REAL + lng REAL columns (PostGIS not available in SQLite)
  - vector(1536) → TEXT (JSON-serialised float list; cosine similarity computed in Python)
  - TIMESTAMPTZ → TEXT (ISO-8601 UTC strings, e.g. '2026-09-12T08:00:00+00:00')
  - JSONB → TEXT (JSON-serialised strings)
  - BOOLEAN → INTEGER (0/1 per SQLite convention)
  - All FK constraints enabled via PRAGMA foreign_keys = ON at connection time.
"""

# ---------------------------------------------------------------------------
# Table definitions (in dependency order — referenced tables first)
# ---------------------------------------------------------------------------

TABLES: list[tuple[str, str]] = [

    # ── 1. Municipal Departments ──────────────────────────────────────────
    ("departments", """
    CREATE TABLE IF NOT EXISTS departments (
        department_id   TEXT PRIMARY KEY,
        name            TEXT NOT NULL UNIQUE,
        code            TEXT NOT NULL UNIQUE,       -- 'WAT', 'SWM', 'DRN', 'ELE', 'RDM'
        head_officer_email TEXT NOT NULL,
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 2. Administrative Officers (4-tier hierarchy) ─────────────────────
    ("officers", """
    CREATE TABLE IF NOT EXISTS officers (
        officer_id      TEXT PRIMARY KEY,
        department_id   TEXT NOT NULL REFERENCES departments(department_id),
        name            TEXT NOT NULL,
        designation     TEXT NOT NULL,             -- 'Junior Engineer', 'AMC', 'DMC', 'Municipal Commissioner'
        hierarchy_tier  INTEGER NOT NULL           -- 1=Field, 2=Ward Admin, 3=Zonal Head, 4=Commissioner
                            CHECK(hierarchy_tier BETWEEN 1 AND 4),
        ward_id         TEXT NOT NULL,             -- e.g. 'Ward-14 (Kothrud)'
        phone_number    TEXT NOT NULL,
        email           TEXT NOT NULL,
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 3. Statutory SLA Policies (configurable, not hardcoded) ──────────
    ("sla_policies", """
    CREATE TABLE IF NOT EXISTS sla_policies (
        policy_id               TEXT PRIMARY KEY,
        department_id           TEXT NOT NULL REFERENCES departments(department_id),
        category                TEXT NOT NULL,
        priority_tier           TEXT NOT NULL       -- 'P1_CRITICAL','P2_HIGH','P3_MEDIUM','P4_LOW'
                                    CHECK(priority_tier IN ('P1_CRITICAL','P2_HIGH','P3_MEDIUM','P4_LOW')),
        resolution_sla_hours    INTEGER NOT NULL,
        l2_escalation_hours     INTEGER NOT NULL,   -- trigger L1→L2 after this many hours
        l3_escalation_hours     INTEGER NOT NULL,   -- trigger L2→L3 (hard SLA breach)
        created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 4. Priority Weight Config (Agent B — configurable weights per PRD §6.3) ──
    ("priority_weights", """
    CREATE TABLE IF NOT EXISTS priority_weights (
        weight_id           TEXT PRIMARY KEY,
        category            TEXT NOT NULL UNIQUE,
        w_hazard            REAL NOT NULL DEFAULT 0.45,   -- hazard sub-score weight
        w_traffic           REAL NOT NULL DEFAULT 0.25,   -- traffic impact weight
        w_pop_density       REAL NOT NULL DEFAULT 0.20,   -- population density weight
        base_hazard_score   REAL NOT NULL DEFAULT 50.0,   -- baseline S_hazard for category
        base_traffic_score  REAL NOT NULL DEFAULT 30.0,
        base_density_score  REAL NOT NULL DEFAULT 40.0,
        cluster_delta_per_report REAL NOT NULL DEFAULT 2.5, -- Δ_cluster boost per duplicate
        updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 5. Citizens (repeat-complainant tracking, cluster subscriber lists) ──
    ("citizens", """
    CREATE TABLE IF NOT EXISTS citizens (
        citizen_id          TEXT PRIMARY KEY,
        phone_number        TEXT NOT NULL UNIQUE,
        display_name        TEXT,
        preferred_language  TEXT NOT NULL DEFAULT 'auto',   -- 'auto','en','hi','mr'
        created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 6. Complaints Master Table ────────────────────────────────────────
    ("complaints", """
    CREATE TABLE IF NOT EXISTS complaints (
        ticket_id                   TEXT PRIMARY KEY,
        ticket_number               TEXT NOT NULL UNIQUE,  -- 'PMC-2026-WAT-0492'
        parent_ticket_id            TEXT REFERENCES complaints(ticket_id) ON DELETE SET NULL,

        -- Raw & normalised input
        raw_text                    TEXT NOT NULL,
        canonical_text              TEXT NOT NULL DEFAULT '',
        detected_language           TEXT NOT NULL DEFAULT 'en',

        -- Classification
        category                    TEXT NOT NULL DEFAULT '',
        priority                    TEXT NOT NULL DEFAULT 'P3_MEDIUM'
                                        CHECK(priority IN ('P1_CRITICAL','P2_HIGH','P3_MEDIUM','P4_LOW')),
        priority_score              REAL NOT NULL DEFAULT 50.0,
        status                      TEXT NOT NULL DEFAULT 'REGISTERED'
                                        CHECK(status IN (
                                            'REGISTERED','PENDING_INFO','ASSIGNED',
                                            'IN_PROGRESS','ESCALATED','RESOLVED','REOPENED'
                                        )),

        -- Channel & citizen
        channel                     TEXT NOT NULL DEFAULT 'WEB'
                                        CHECK(channel IN ('WEB','WHATSAPP','VOICE')),
        complainant_name            TEXT,
        complainant_phone           TEXT,

        -- Spatial
        ward_id                     TEXT NOT NULL DEFAULT '',
        location_address            TEXT NOT NULL DEFAULT '',
        landmark                    TEXT,
        latitude                    REAL,
        longitude                   REAL,

        -- Clustering / deduplication
        cluster_size                INTEGER NOT NULL DEFAULT 1,
        is_duplicate                INTEGER NOT NULL DEFAULT 0,

        -- Routing
        assigned_department_id      TEXT REFERENCES departments(department_id),
        assigned_officer_id         TEXT REFERENCES officers(officer_id),

        -- SLA & escalation
        escalation_level            INTEGER NOT NULL DEFAULT 1
                                        CHECK(escalation_level BETWEEN 1 AND 4),
        sla_duration_hours          INTEGER NOT NULL DEFAULT 24,
        sla_deadline                TEXT NOT NULL,
        is_breached                 INTEGER NOT NULL DEFAULT 0,
        breach_hours                REAL NOT NULL DEFAULT 0.0,

        -- Completeness gating (Agent A)
        missing_critical_info       INTEGER NOT NULL DEFAULT 0,
        clarification_prompt        TEXT,

        -- Agent F outputs
        sop_checklist_json          TEXT NOT NULL DEFAULT '[]',   -- JSON array of strings
        bill_of_materials_json      TEXT NOT NULL DEFAULT '[]',   -- JSON array of {item,qty,unit}

        -- Closure
        closure_proof_photo_url     TEXT,
        closure_approved            INTEGER NOT NULL DEFAULT 0,
        cv_structural_score         REAL NOT NULL DEFAULT 0.0,
        cv_verified                 INTEGER NOT NULL DEFAULT 0,
        closure_verification_id     TEXT,
        closure_dual_signed         INTEGER NOT NULL DEFAULT 0,

        -- Semantic embedding (Agent C — JSON-serialised float list)
        embedding_json              TEXT NOT NULL DEFAULT '[]',

        -- Per-agent execution telemetry (JSON dict)
        agent_metrics_json          TEXT NOT NULL DEFAULT '{}',

        resolved_at                 TEXT,
        created_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 7. Complaint ↔ Citizen linkage ────────────────────────────────────
    ("complaint_subscribers", """
    CREATE TABLE IF NOT EXISTS complaint_subscribers (
        complaint_id        TEXT NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
        citizen_id          TEXT NOT NULL REFERENCES citizens(citizen_id) ON DELETE CASCADE,
        is_original_filer   INTEGER NOT NULL DEFAULT 0,
        subscribed_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        PRIMARY KEY (complaint_id, citizen_id)
    )
    """),

    # ── 8. Escalations Ledger (immutable append-only) ─────────────────────
    ("escalations", """
    CREATE TABLE IF NOT EXISTS escalations (
        escalation_id       TEXT PRIMARY KEY,
        ticket_id           TEXT NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
        from_officer_id     TEXT REFERENCES officers(officer_id),
        to_officer_id       TEXT REFERENCES officers(officer_id),
        from_officer_name   TEXT,
        to_officer_name     TEXT,
        previous_level      INTEGER NOT NULL,
        new_level           INTEGER NOT NULL,
        breach_hours_overdue REAL NOT NULL DEFAULT 0.0,
        trigger_reason      TEXT NOT NULL,
        escalated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 9. Comprehensive Audit Logs (immutable append-only) ───────────────
    ("audit_logs", """
    CREATE TABLE IF NOT EXISTS audit_logs (
        log_id              TEXT PRIMARY KEY,
        ticket_id           TEXT NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
        acting_agent        TEXT NOT NULL,   -- 'Agent:Ingestion', 'Agent:Router', 'Agent:SLA_Orchestrator'
        action_type         TEXT NOT NULL,   -- 'TICKET_CREATED', 'PRIORITY_SCORED', 'AUTO_ESCALATED_L1_TO_L2'
        payload_snapshot    TEXT NOT NULL DEFAULT '{}',   -- JSON snapshot of agent state at this transition
        created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 10. Notification Log (Agent E outbound/inbound message audit) ──────
    ("notification_log", """
    CREATE TABLE IF NOT EXISTS notification_log (
        notification_id     TEXT PRIMARY KEY,
        ticket_id           TEXT NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
        citizen_id          TEXT REFERENCES citizens(citizen_id),
        channel             TEXT NOT NULL CHECK(channel IN ('WHATSAPP','SMS','WEB_CHAT','TELEGRAM')),
        direction           TEXT NOT NULL CHECK(direction IN ('OUTBOUND','INBOUND')),
        milestone           TEXT,   -- 'TICKET_REGISTERED','ASSIGNED_TO_OFFICER','ESCALATED','RESOLVED', NULL=freeform
        message_body        TEXT NOT NULL,
        delivery_status     TEXT NOT NULL DEFAULT 'PENDING'
                                CHECK(delivery_status IN ('PENDING','SENT','DELIVERED','FAILED')),
        provider_message_id TEXT,
        created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 11. Feedback / Reopen Polls ───────────────────────────────────────
    ("feedback_polls", """
    CREATE TABLE IF NOT EXISTS feedback_polls (
        poll_id         TEXT PRIMARY KEY,
        ticket_id       TEXT NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
        sent_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        expires_at      TEXT NOT NULL,                      -- sent_at + 24h
        response        TEXT CHECK(response IN ('RESOLVED_CONFIRMED','UNRESOLVED', NULL)),
        responded_at    TEXT
    )
    """),

    # ── 12. SOP Templates (library backing Agent F checklist generation) ───
    ("sop_templates", """
    CREATE TABLE IF NOT EXISTS sop_templates (
        template_id             TEXT PRIMARY KEY,
        category                TEXT NOT NULL UNIQUE,
        checklist_items_json    TEXT NOT NULL DEFAULT '[]',   -- JSON ordered array of task strings
        bill_of_materials_json  TEXT NOT NULL DEFAULT '[]',   -- JSON array of {item,quantity,unit}
        created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 13. Media Assets (before/after/closure photos, voice originals) ────
    ("media_assets", """
    CREATE TABLE IF NOT EXISTS media_assets (
        media_id                TEXT PRIMARY KEY,
        ticket_id               TEXT NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
        asset_type              TEXT NOT NULL
                                    CHECK(asset_type IN (
                                        'VOICE_ORIGINAL','PHOTO_BEFORE','PHOTO_AFTER',
                                        'PHOTO_CLOSURE','PHOTO_INCIDENT'
                                    )),
        storage_url             TEXT NOT NULL,
        geotag_lat              REAL,
        geotag_lng              REAL,
        geotag_valid            INTEGER,                  -- 1=within 100m, 0=outside, NULL=not checked
        sha256_hash             TEXT,                     -- cryptographic integrity stamp
        uploaded_by_officer_id  TEXT REFERENCES officers(officer_id),
        created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 14. Admin / Officer Auth Accounts ────────────────────────────────
    ("officer_accounts", """
    CREATE TABLE IF NOT EXISTS officer_accounts (
        account_id      TEXT PRIMARY KEY,
        officer_id      TEXT NOT NULL UNIQUE REFERENCES officers(officer_id) ON DELETE CASCADE,
        username        TEXT NOT NULL UNIQUE,
        password_hash   TEXT NOT NULL,
        last_login_at   TEXT,
        is_active       INTEGER NOT NULL DEFAULT 1,
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 15. Closure Verifications (cryptographic zero-trust audit) ─────────
    ("closure_verifications", """
    CREATE TABLE IF NOT EXISTS closure_verifications (
        verification_id         TEXT PRIMARY KEY,
        ticket_id               TEXT NOT NULL REFERENCES complaints(ticket_id) ON DELETE CASCADE,
        token                   TEXT NOT NULL UNIQUE,       -- HMAC-SHA256 challenge token
        required_signatures     INTEGER NOT NULL DEFAULT 1,
        collected_signatures    INTEGER NOT NULL DEFAULT 0,
        signers_json            TEXT NOT NULL DEFAULT '[]', -- [{signer_phone, decision, signed_at}, ...]
        cv_structural_score     REAL NOT NULL DEFAULT 0.0,
        cv_verified             INTEGER NOT NULL DEFAULT 0,
        status                  TEXT NOT NULL DEFAULT 'PENDING_CITIZEN_SIGNOFF'
                                    CHECK(status IN (
                                        'PENDING_CITIZEN_SIGNOFF','CONFIRMED','FRAUD_FLAGGED',
                                        'MANUALLY_OVERRIDDEN'
                                    )),
        created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),

    # ── 16. CapEx Proposals (spatial recurrence → capital expenditure) ─────
    ("capex_proposals", """
    CREATE TABLE IF NOT EXISTS capex_proposals (
        proposal_id                 TEXT PRIMARY KEY,
        resolution_number           TEXT,
        corridor_id                 TEXT,
        corridor_name               TEXT NOT NULL,
        ward_id                     TEXT NOT NULL,
        department_id               TEXT NOT NULL REFERENCES departments(department_id),
        department_name             TEXT NOT NULL,
        incident_count_90d          INTEGER NOT NULL DEFAULT 0,
        centroid_lat                REAL NOT NULL,
        centroid_lng                REAL NOT NULL,
        radius_meters               REAL NOT NULL DEFAULT 200.0,
        failure_mode                TEXT NOT NULL,
        root_cause_diagnosis        TEXT NOT NULL,
        recommended_action          TEXT NOT NULL,
        budget_head                 TEXT NOT NULL,
        estimated_cost_inr          REAL NOT NULL DEFAULT 0.0,
        estimated_cost_lakhs        REAL NOT NULL DEFAULT 0.0,
        dsr_items_json              TEXT NOT NULL DEFAULT '[]',
        standing_committee_draft_md TEXT NOT NULL DEFAULT '',
        status                      TEXT NOT NULL DEFAULT 'DRAFT_PENDING_COMMITTEE'
                                        CHECK(status IN (
                                            'DRAFT_PENDING_COMMITTEE','SUBMITTED',
                                            'APPROVED','REJECTED','EXECUTED'
                                        )),
        created_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
    """),
]

# ---------------------------------------------------------------------------
# Index definitions (performance-critical lookups per PRD §5.2.2)
# ---------------------------------------------------------------------------

INDICES: list[str] = [
    # complaints — status-based Kanban filtering
    "CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)",
    # complaints — SLA monitoring sweep (Agent D evaluates by deadline)
    "CREATE INDEX IF NOT EXISTS idx_complaints_sla_deadline ON complaints(sla_deadline)",
    # complaints — spatial clustering lookup (latitude/longitude range scan as PostGIS proxy)
    "CREATE INDEX IF NOT EXISTS idx_complaints_lat ON complaints(latitude)",
    "CREATE INDEX IF NOT EXISTS idx_complaints_lng ON complaints(longitude)",
    # complaints — parent/child cluster tree traversal
    "CREATE INDEX IF NOT EXISTS idx_complaints_parent ON complaints(parent_ticket_id)",
    # complaints — department-scoped Kanban filtering
    "CREATE INDEX IF NOT EXISTS idx_complaints_dept ON complaints(assigned_department_id)",
    # complaints — ward-scoped map view
    "CREATE INDEX IF NOT EXISTS idx_complaints_ward ON complaints(ward_id)",
    # complaints — priority-sorted dispatch queue
    "CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority, status)",
    # complaints — escalation level drill-down
    "CREATE INDEX IF NOT EXISTS idx_complaints_escalation ON complaints(escalation_level)",
    # escalations — per-ticket escalation history retrieval
    "CREATE INDEX IF NOT EXISTS idx_escalations_ticket ON escalations(ticket_id)",
    # audit_logs — per-ticket audit trail retrieval
    "CREATE INDEX IF NOT EXISTS idx_audit_ticket ON audit_logs(ticket_id)",
    # audit_logs — agent-level analytics
    "CREATE INDEX IF NOT EXISTS idx_audit_agent ON audit_logs(acting_agent)",
    # notification_log — per-ticket message history
    "CREATE INDEX IF NOT EXISTS idx_notif_ticket ON notification_log(ticket_id)",
    # notification_log — delivery retry queue (failed + pending)
    "CREATE INDEX IF NOT EXISTS idx_notif_status ON notification_log(delivery_status)",
    # feedback_polls — per-ticket poll lookup
    "CREATE INDEX IF NOT EXISTS idx_polls_ticket ON feedback_polls(ticket_id)",
    # feedback_polls — expiry sweep (auto-close unanswered polls)
    "CREATE INDEX IF NOT EXISTS idx_polls_expires ON feedback_polls(expires_at)",
    # media_assets — per-ticket media gallery
    "CREATE INDEX IF NOT EXISTS idx_media_ticket ON media_assets(ticket_id)",
    # media_assets — geotag validation queue
    "CREATE INDEX IF NOT EXISTS idx_media_geotag ON media_assets(geotag_valid)",
    # complaint_subscribers — per-citizen subscriptions
    "CREATE INDEX IF NOT EXISTS idx_subs_citizen ON complaint_subscribers(citizen_id)",
    # officers — tier-based dispatch lookup
    "CREATE INDEX IF NOT EXISTS idx_officers_tier ON officers(hierarchy_tier, department_id)",
    # officers — ward-scoped officer lookup
    "CREATE INDEX IF NOT EXISTS idx_officers_ward ON officers(ward_id, hierarchy_tier)",
    # sla_policies — category + priority lookup for Agent B
    "CREATE INDEX IF NOT EXISTS idx_sla_cat ON sla_policies(category, priority_tier)",
    # priority_weights — category lookup for Agent B scoring
    "CREATE INDEX IF NOT EXISTS idx_pw_category ON priority_weights(category)",
    # capex_proposals — ward + department reporting
    "CREATE INDEX IF NOT EXISTS idx_capex_ward ON capex_proposals(ward_id, department_id)",
    # capex_proposals — status dashboard filter
    "CREATE INDEX IF NOT EXISTS idx_capex_status ON capex_proposals(status)",
    # closure_verifications — per-ticket lookup
    "CREATE INDEX IF NOT EXISTS idx_cv_ticket ON closure_verifications(ticket_id)",
    # closure_verifications — token challenge lookup
    "CREATE INDEX IF NOT EXISTS idx_cv_token ON closure_verifications(token)",
    # citizens — phone number lookup (upsert path)
    "CREATE INDEX IF NOT EXISTS idx_citizens_phone ON citizens(phone_number)",
]

# ---------------------------------------------------------------------------
# Schema application helper
# ---------------------------------------------------------------------------

def apply_schema(conn) -> None:
    """
    Creates all tables and indices in the supplied sqlite3 connection.
    Safe to call on an existing database — uses IF NOT EXISTS everywhere.
    FK enforcement is enabled for the lifetime of this connection.

    Index resilience: if an index references a column that doesn't exist
    in a legacy table (migration scenario), the index creation is skipped
    with a warning rather than aborting the entire schema application.
    Resolve stale schemas fully by running db_init.py with --reset.
    """
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")      # better concurrent read performance
    conn.execute("PRAGMA synchronous = NORMAL")    # safe with WAL
    conn.execute("PRAGMA temp_store = MEMORY")

    for _table_name, ddl in TABLES:
        conn.execute(ddl)

    import sqlite3 as _sqlite3
    for idx_ddl in INDICES:
        try:
            conn.execute(idx_ddl)
        except _sqlite3.OperationalError as exc:
            # Likely a column-not-found on a legacy table — warn and continue.
            # Run `db_init.py --reset` to fully migrate a stale database.
            print(f"  [schema] skipped index (legacy column?): {exc}")

    conn.commit()
