"""
db_seed.py — NagrikSewa AI (PS17)
Reference seed data for all statutory reference tables.

Covers:
  1.  departments         — 5 PMC departments
  2.  officers            — Full 4-tier hierarchy across 5 wards + City HQ
  3.  sla_policies        — Statutory SLA windows per category/priority (RTS Act 2015)
  4.  priority_weights    — Agent B scoring weights per category
  5.  sop_templates       — Agent F checklists + Bill of Materials per category
  6.  officer_accounts    — Login credentials for every officer (bcrypt hashes)

All IDs are deterministic strings so re-running seed is idempotent (INSERT OR IGNORE).
Passwords are bcrypt hashes of 'NagrikSewa@<tier>' per tier — change before production.
"""

import json
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

_NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# 1. DEPARTMENTS
# ---------------------------------------------------------------------------

DEPARTMENTS: list[dict] = [
    {
        "department_id": "dept-wat-01",
        "name": "Water Supply & Pumping",
        "code": "WAT",
        "head_officer_email": "ce.watersupply@punecorporation.org",
        "created_at": _NOW,
    },
    {
        "department_id": "dept-swm-02",
        "name": "Solid Waste Management (SWM)",
        "code": "SWM",
        "head_officer_email": "dmc.solidwaste@punecorporation.org",
        "created_at": _NOW,
    },
    {
        "department_id": "dept-drn-03",
        "name": "Drainage & Sewerage",
        "code": "DRN",
        "head_officer_email": "ee.drainage@punecorporation.org",
        "created_at": _NOW,
    },
    {
        "department_id": "dept-ele-04",
        "name": "Streetlighting & Electrical",
        "code": "ELE",
        "head_officer_email": "ee.electrical@punecorporation.org",
        "created_at": _NOW,
    },
    {
        "department_id": "dept-rdm-05",
        "name": "Roads & Traffic Infrastructure",
        "code": "RDM",
        "head_officer_email": "ce.roads@punecorporation.org",
        "created_at": _NOW,
    },
]

# ---------------------------------------------------------------------------
# 2. OFFICERS  (4 tiers × 5 wards + city-HQ tiers 3 & 4)
#
# Wards covered:
#   Ward-14 (Kothrud)     — primary demo ward
#   Ward-08 (Aundh)
#   Ward-11 (Hadapsar)
#   Ward-03 (Shivajinagar)
#   Ward-07 (Sinhagad Road)
# ---------------------------------------------------------------------------

_WARDS = [
    "Ward-14 (Kothrud)",
    "Ward-08 (Aundh)",
    "Ward-11 (Hadapsar)",
    "Ward-03 (Shivajinagar)",
    "Ward-07 (Sinhagad Road)",
]

# Department → (short_code, dept_id)
_DEPT_MAP = {
    "WAT": "dept-wat-01",
    "SWM": "dept-swm-02",
    "DRN": "dept-drn-03",
    "ELE": "dept-ele-04",
    "RDM": "dept-rdm-05",
}

# Ward short codes for officer ID generation
_WARD_SHORT = {
    "Ward-14 (Kothrud)":      "w14",
    "Ward-08 (Aundh)":        "w08",
    "Ward-11 (Hadapsar)":     "w11",
    "Ward-03 (Shivajinagar)": "w03",
    "Ward-07 (Sinhagad Road)":"w07",
}

# Phone block offsets so every number is unique
_WARD_PHONE_BASE = {
    "Ward-14 (Kothrud)":      "+91-20-2550",
    "Ward-08 (Aundh)":        "+91-20-2551",
    "Ward-11 (Hadapsar)":     "+91-20-2552",
    "Ward-03 (Shivajinagar)": "+91-20-2553",
    "Ward-07 (Sinhagad Road)":"+91-20-2554",
}

# Department → Tier-1 designation + email fragment
_TIER1_INFO = {
    "WAT": ("Junior Engineer (Water Works)",    "je.water"),
    "SWM": ("Sanitary Inspector (SWM)",         "si.swm"),
    "DRN": ("Drainage Inspector",               "di.drainage"),
    "ELE": ("Junior Engineer (Electrical)",     "je.elec"),
    "RDM": ("Junior Engineer (Civil - Roads)",  "je.roads"),
}

# Department → phone suffix (within base block)
_DEPT_PHONE_SUFFIX = {"WAT": "1", "SWM": "2", "DRN": "3", "ELE": "4", "RDM": "5"}


def _build_tier1_officers() -> list[dict]:
    officers = []
    for ward in _WARDS:
        ws = _WARD_SHORT[ward]
        pb = _WARD_PHONE_BASE[ward]
        for dept_code, dept_id in _DEPT_MAP.items():
            desig, email_prefix = _TIER1_INFO[dept_code]
            suffix = _DEPT_PHONE_SUFFIX[dept_code]
            ward_lower = ward.lower().replace(" ", "").replace("(", "").replace(")", "")
            email_ward = ward.split(" ")[0].lower() + ward.split("(")[1].rstrip(")").lower()
            officers.append({
                "officer_id":      f"off-l1-{dept_code.lower()}-{ws}",
                "department_id":   dept_id,
                "name":            f"{desig} — {ward}",
                "designation":     desig,
                "hierarchy_tier":  1,
                "ward_id":         ward,
                "phone_number":    f"{pb}{suffix}001",
                "email":           f"{email_prefix}.{email_ward}@pmc.gov.in",
                "created_at":      _NOW,
            })
    return officers


# Tier-2: One AMC + one EE per ward
def _build_tier2_officers() -> list[dict]:
    officers = []
    for ward in _WARDS:
        ws = _WARD_SHORT[ward]
        pb = _WARD_PHONE_BASE[ward]
        ward_tag = ward.split("(")[1].rstrip(")").lower()
        officers += [
            {
                "officer_id":     f"off-l2-amc-{ws}",
                "department_id":  "dept-wat-01",     # AMC covers all depts in a ward
                "name":           f"Assistant Municipal Commissioner — {ward}",
                "designation":    "Assistant Municipal Commissioner (AMC)",
                "hierarchy_tier": 2,
                "ward_id":        ward,
                "phone_number":   f"{pb}6001",
                "email":          f"amc.{ward_tag}@pmc.gov.in",
                "created_at":     _NOW,
            },
            {
                "officer_id":     f"off-l2-ee-{ws}",
                "department_id":  "dept-rdm-05",
                "name":           f"Executive Engineer — {ward}",
                "designation":    "Executive Engineer (EE)",
                "hierarchy_tier": 2,
                "ward_id":        ward,
                "phone_number":   f"{pb}6002",
                "email":          f"ee.{ward_tag}@pmc.gov.in",
                "created_at":     _NOW,
            },
        ]
    return officers


# Tier-3: City-level DMCs (one per relevant dept cluster)
TIER3_OFFICERS: list[dict] = [
    {
        "officer_id":     "off-l3-dmc-eng",
        "department_id":  "dept-wat-01",
        "name":           "Deputy Municipal Commissioner — Engineering & Infrastructure",
        "designation":    "Deputy Municipal Commissioner (DMC - Engineering)",
        "hierarchy_tier": 3,
        "ward_id":        "City Central HQ",
        "phone_number":   "+91-20-25560001",
        "email":          "dmc.engineering@pmc.gov.in",
        "created_at":     _NOW,
    },
    {
        "officer_id":     "off-l3-dmc-swm",
        "department_id":  "dept-swm-02",
        "name":           "Deputy Municipal Commissioner — Solid Waste Management",
        "designation":    "Deputy Municipal Commissioner (DMC - Solid Waste)",
        "hierarchy_tier": 3,
        "ward_id":        "City Central HQ",
        "phone_number":   "+91-20-25560002",
        "email":          "dmc.swm@pmc.gov.in",
        "created_at":     _NOW,
    },
    {
        "officer_id":     "off-l3-dmc-drn",
        "department_id":  "dept-drn-03",
        "name":           "Deputy Municipal Commissioner — Drainage & Sanitation",
        "designation":    "Deputy Municipal Commissioner (DMC - Drainage)",
        "hierarchy_tier": 3,
        "ward_id":        "City Central HQ",
        "phone_number":   "+91-20-25560003",
        "email":          "dmc.drainage@pmc.gov.in",
        "created_at":     _NOW,
    },
]

# Tier-4: Municipal Commissioner (single apex authority)
TIER4_OFFICERS: list[dict] = [
    {
        "officer_id":     "off-l4-commissioner",
        "department_id":  "dept-wat-01",   # FK placeholder — Commissioner covers all
        "name":           "Municipal Commissioner & Appellate Authority",
        "designation":    "Municipal Commissioner (IAS) & Appellate Authority",
        "hierarchy_tier": 4,
        "ward_id":        "PMC Main Bhavan, Shivajinagar",
        "phone_number":   "+91-20-25570001",
        "email":          "commissioner@punecorporation.org",
        "created_at":     _NOW,
    },
]


def build_all_officers() -> list[dict]:
    return (
        _build_tier1_officers()
        + _build_tier2_officers()
        + TIER3_OFFICERS
        + TIER4_OFFICERS
    )


OFFICERS: list[dict] = build_all_officers()

# ---------------------------------------------------------------------------
# 3. SLA POLICIES (RTS Act 2015 statutory windows)
# ---------------------------------------------------------------------------

SLA_POLICIES: list[dict] = [
    # Water Supply — P1 Critical (burst mains, contamination)
    {
        "policy_id":             "pol-wat-p1",
        "department_id":         "dept-wat-01",
        "category":              "Water Supply & Pumping",
        "priority_tier":         "P1_CRITICAL",
        "resolution_sla_hours":  6,
        "l2_escalation_hours":   4,    # 80% of 6h → warn + L2 trigger
        "l3_escalation_hours":   6,    # hard breach → L3
        "created_at":            _NOW,
    },
    # Drainage — P1 Critical (open manhole, major sewer backup)
    {
        "policy_id":             "pol-drn-p1",
        "department_id":         "dept-drn-03",
        "category":              "Drainage & Sewerage",
        "priority_tier":         "P1_CRITICAL",
        "resolution_sla_hours":  6,
        "l2_escalation_hours":   4,
        "l3_escalation_hours":   6,
        "created_at":            _NOW,
    },
    # Water Supply — P2 High (low pressure, minor valve leak)
    {
        "policy_id":             "pol-wat-p2",
        "department_id":         "dept-wat-01",
        "category":              "Water Supply & Pumping",
        "priority_tier":         "P2_HIGH",
        "resolution_sla_hours":  18,
        "l2_escalation_hours":   14,
        "l3_escalation_hours":   18,
        "created_at":            _NOW,
    },
    # SWM — P2 High (overflowing bins, missed collection)
    {
        "policy_id":             "pol-swm-p2",
        "department_id":         "dept-swm-02",
        "category":              "Solid Waste Management (SWM)",
        "priority_tier":         "P2_HIGH",
        "resolution_sla_hours":  18,
        "l2_escalation_hours":   14,
        "l3_escalation_hours":   18,
        "created_at":            _NOW,
    },
    # Drainage — P2 High (blocked storm drain, choked underground sewer)
    {
        "policy_id":             "pol-drn-p2",
        "department_id":         "dept-drn-03",
        "category":              "Drainage & Sewerage",
        "priority_tier":         "P2_HIGH",
        "resolution_sla_hours":  24,
        "l2_escalation_hours":   19,
        "l3_escalation_hours":   24,
        "created_at":            _NOW,
    },
    # Electrical — P2 High (live exposed cable, main road blackout)
    {
        "policy_id":             "pol-ele-p2",
        "department_id":         "dept-ele-04",
        "category":              "Streetlighting & Electrical",
        "priority_tier":         "P2_HIGH",
        "resolution_sla_hours":  24,
        "l2_escalation_hours":   19,
        "l3_escalation_hours":   24,
        "created_at":            _NOW,
    },
    # Electrical — P3 Medium (alley lights out, minor fault)
    {
        "policy_id":             "pol-ele-p3",
        "department_id":         "dept-ele-04",
        "category":              "Streetlighting & Electrical",
        "priority_tier":         "P3_MEDIUM",
        "resolution_sla_hours":  36,
        "l2_escalation_hours":   29,
        "l3_escalation_hours":   36,
        "created_at":            _NOW,
    },
    # Roads — P3 Medium (potholes on arterial road)
    {
        "policy_id":             "pol-rdm-p3",
        "department_id":         "dept-rdm-05",
        "category":              "Roads & Traffic Infrastructure",
        "priority_tier":         "P3_MEDIUM",
        "resolution_sla_hours":  48,
        "l2_escalation_hours":   38,
        "l3_escalation_hours":   48,
        "created_at":            _NOW,
    },
    # Roads — P4 Low (minor paver damage, garden pruning)
    {
        "policy_id":             "pol-rdm-p4",
        "department_id":         "dept-rdm-05",
        "category":              "Roads & Traffic Infrastructure",
        "priority_tier":         "P4_LOW",
        "resolution_sla_hours":  72,
        "l2_escalation_hours":   58,
        "l3_escalation_hours":   72,
        "created_at":            _NOW,
    },
    # SWM — P4 Low (carcass removal, general sanitation)
    {
        "policy_id":             "pol-swm-p4",
        "department_id":         "dept-swm-02",
        "category":              "Solid Waste Management (SWM)",
        "priority_tier":         "P4_LOW",
        "resolution_sla_hours":  48,
        "l2_escalation_hours":   38,
        "l3_escalation_hours":   48,
        "created_at":            _NOW,
    },
]

# ---------------------------------------------------------------------------
# 4. PRIORITY WEIGHTS  (Agent B — configurable per PRD §6.3 assumption)
#
# Formula: P = (w_hazard × S_hazard) + (w_traffic × S_traffic)
#              + (w_pop_density × S_density) + (cluster_delta × (cluster_size - 1))
# ---------------------------------------------------------------------------

PRIORITY_WEIGHTS: list[dict] = [
    {
        "weight_id":                "pw-wat",
        "category":                 "Water Supply & Pumping",
        "w_hazard":                 0.45,
        "w_traffic":                0.20,
        "w_pop_density":            0.25,
        "base_hazard_score":        88.0,   # burst mains → public health hazard
        "base_traffic_score":       40.0,
        "base_density_score":       60.0,
        "cluster_delta_per_report": 3.0,    # each duplicate boosts score by 3
        "updated_at":               _NOW,
    },
    {
        "weight_id":                "pw-swm",
        "category":                 "Solid Waste Management (SWM)",
        "w_hazard":                 0.35,
        "w_traffic":                0.25,
        "w_pop_density":            0.30,
        "base_hazard_score":        65.0,
        "base_traffic_score":       35.0,
        "base_density_score":       55.0,
        "cluster_delta_per_report": 2.5,
        "updated_at":               _NOW,
    },
    {
        "weight_id":                "pw-drn",
        "category":                 "Drainage & Sewerage",
        "w_hazard":                 0.45,
        "w_traffic":                0.25,
        "w_pop_density":            0.20,
        "base_hazard_score":        80.0,   # open manhole → accident risk
        "base_traffic_score":       50.0,
        "base_density_score":       45.0,
        "cluster_delta_per_report": 3.0,
        "updated_at":               _NOW,
    },
    {
        "weight_id":                "pw-ele",
        "category":                 "Streetlighting & Electrical",
        "w_hazard":                 0.40,
        "w_traffic":                0.30,
        "w_pop_density":            0.20,
        "base_hazard_score":        72.0,
        "base_traffic_score":       55.0,
        "base_density_score":       40.0,
        "cluster_delta_per_report": 2.0,
        "updated_at":               _NOW,
    },
    {
        "weight_id":                "pw-rdm",
        "category":                 "Roads & Traffic Infrastructure",
        "w_hazard":                 0.35,
        "w_traffic":                0.35,
        "w_pop_density":            0.20,
        "base_hazard_score":        55.0,
        "base_traffic_score":       65.0,
        "base_density_score":       40.0,
        "cluster_delta_per_report": 2.5,
        "updated_at":               _NOW,
    },
]

# ---------------------------------------------------------------------------
# 5. SOP TEMPLATES  (Agent F — checklist + Bill of Materials per category)
# ---------------------------------------------------------------------------

SOP_TEMPLATES: list[dict] = [
    {
        "template_id": "sop-wat-01",
        "category":    "Water Supply & Pumping",
        "checklist_items_json": json.dumps([
            "Dispatch emergency valve squad to isolate affected feeder line section",
            "Erect safety barricades and diversion signage around excavation zone",
            "Excavate trench with JCB backhoe to expose fractured main pipeline",
            "Fit high-pressure ductile iron repair clamp / split sleeve collar (150mm)",
            "Apply joint sealant compound and torque all fasteners to 85 N·m",
            "Perform hydraulic pressure test at 6.5 bar for minimum 30 minutes",
            "Flush flushed water through fire hydrant until TDS < 500 ppm",
            "Backfill trench with compacted quarry sand in 150mm layers",
            "Reinstate bitumen road cover with polymer modified cold mix",
            "Capture before/after geotagged photographs for cryptographic audit",
        ]),
        "bill_of_materials_json": json.dumps([
            {"item": "Ductile Iron Pipeline Collar (150mm)", "quantity": 1,   "unit": "Nos"},
            {"item": "Rubber Gasket Joint Seal Ring",        "quantity": 2,   "unit": "Nos"},
            {"item": "High-Tensile Galvanized Fasteners",    "quantity": 8,   "unit": "Nos"},
            {"item": "Joint Sealant Compound (500g)",        "quantity": 1,   "unit": "Tin"},
            {"item": "Crushed Stone Aggregates / Wet Mix",   "quantity": 1.5, "unit": "Tons"},
            {"item": "Polymer Modified Cold Bituminous Mix", "quantity": 80,  "unit": "Kg"},
        ]),
        "created_at": _NOW,
    },
    {
        "template_id": "sop-swm-02",
        "category":    "Solid Waste Management (SWM)",
        "checklist_items_json": json.dumps([
            "Deploy hydraulic tipper compactor truck to overflowing bin location",
            "Sanitation crew mechanical shoveling and secondary waste containment",
            "Remove all primary and secondary waste within 5m perimeter",
            "Apply hydrated disinfectant lime powder across affected area",
            "Spray sodium hypochlorite solution (5%) for pathogen neutralisation",
            "Install temporary overflow bin if permanent bin requires repair",
            "Coordinate with Mukadam for next-day scheduled pickup enforcement",
            "Capture timestamped clean site geotagged photograph for digital audit",
        ]),
        "bill_of_materials_json": json.dumps([
            {"item": "10-Yard Refuse Compactor Vehicle",               "quantity": 1,  "unit": "Shift"},
            {"item": "Hydrated Disinfectant Lime Powder",              "quantity": 25, "unit": "Kg"},
            {"item": "Sodium Hypochlorite Disinfectant Solution (5%)", "quantity": 10, "unit": "Liters"},
            {"item": "Disposable PPE Kit (Gloves + Mask + Boots)",     "quantity": 4,  "unit": "Sets"},
        ]),
        "created_at": _NOW,
    },
    {
        "template_id": "sop-drn-03",
        "category":    "Drainage & Sewerage",
        "checklist_items_json": json.dumps([
            "Cordon off manhole or sewer hazard zone with reflective barricades",
            "Place retroreflective warning signs 50m upstream and downstream",
            "Deploy high-velocity sewer jetting machine to break blockage",
            "Deploy vacuum suction tanker to evacuate sludge and debris",
            "Remove silt, sand, and non-biodegradable blockages from chamber",
            "Inspect chamber walls for structural cracks using CCTV camera unit",
            "Repair chamber cracks with rapid-setting polymer-modified mortar",
            "Install heavy-duty SFRC manhole frame and D400 cover if damaged",
            "Verify free gravity flow along downstream branch post-clearance",
            "Capture before/after geotagged photographs and upload to audit trail",
        ]),
        "bill_of_materials_json": json.dumps([
            {"item": "Heavy-Duty SFRC Manhole Frame & Lid (Class D400)", "quantity": 1,  "unit": "Set"},
            {"item": "High-Pressure Jetting + Vacuum Suction Unit",      "quantity": 1,  "unit": "Shift"},
            {"item": "Quick-Setting High Early Strength Mortar",         "quantity": 40, "unit": "Kg"},
            {"item": "Reflective Traffic Barricades",                    "quantity": 8,  "unit": "Nos"},
            {"item": "CCTV Pipe Inspection Camera",                      "quantity": 1,  "unit": "Shift"},
        ]),
        "created_at": _NOW,
    },
    {
        "template_id": "sop-ele-04",
        "category":    "Streetlighting & Electrical",
        "checklist_items_json": json.dumps([
            "De-energise feeder pillar circuit breaker immediately on despatch",
            "Apply Lock-Out Tag-Out (LOTO) on feeder panel",
            "Lineman squad aerial inspection using hydraulic boom ladder truck",
            "Test for residual voltage with calibrated non-contact voltage tester",
            "Replace damaged underground cable section or junction box",
            "Replace faulty 90W outdoor LED driver unit if failed",
            "Check earthing resistance at distribution pole (must be ≤ 2 Ohms)",
            "Re-energise feeder circuit and verify lamp lux output (≥ 15 lux)",
            "Log repair on SCADA streetlight management portal",
            "Capture before/after geotagged photographs for closure audit",
        ]),
        "bill_of_materials_json": json.dumps([
            {"item": "Armored Underground Aluminum Cable 4-Core 16mm²", "quantity": 15, "unit": "Meters"},
            {"item": "IP67 Weatherproof Junction Enclosure Box",        "quantity": 1,  "unit": "Nos"},
            {"item": "90W Outdoor Streetlight LED Driver Unit",         "quantity": 1,  "unit": "Nos"},
            {"item": "Earth Electrode + Copper Bond Wire",              "quantity": 1,  "unit": "Set"},
            {"item": "Non-Contact Voltage Tester (Calibrated)",         "quantity": 1,  "unit": "Nos"},
        ]),
        "created_at": _NOW,
    },
    {
        "template_id": "sop-rdm-05",
        "category":    "Roads & Traffic Infrastructure",
        "checklist_items_json": json.dumps([
            "Erect traffic safety cones 50m upstream and retroreflective diversion signage",
            "Square cut pothole edges using diamond blade asphalt cutter to sound pavement",
            "Blow moisture, dust, and loose debris with compressed air lance",
            "Apply rapid-curing cationic bitumen emulsion tack coat (RS-1)",
            "Lay high-performance polymer modified cold mix bituminous patch",
            "Compact patch with vibratory plate compactor (≥ 3 passes)",
            "Verify patch level within ±3mm of adjacent road surface",
            "Remove safety cones and restore normal traffic flow",
            "Capture before/after geotagged photographs for infrastructure audit",
        ]),
        "bill_of_materials_json": json.dumps([
            {"item": "Polymer Modified Cold Bituminous Mix",          "quantity": 120, "unit": "Kg"},
            {"item": "Rapid Curing Bitumen Emulsion Tack Coat RS-1",  "quantity": 15,  "unit": "Liters"},
            {"item": "Vibratory Plate Compactor Equipment",           "quantity": 1,   "unit": "Shift"},
            {"item": "Diamond Blade Asphalt Cutter",                  "quantity": 1,   "unit": "Shift"},
            {"item": "Compressed Air Lance + Compressor",             "quantity": 1,   "unit": "Shift"},
            {"item": "Retroreflective Traffic Safety Cones",          "quantity": 10,  "unit": "Nos"},
        ]),
        "created_at": _NOW,
    },
]

# ---------------------------------------------------------------------------
# 6. OFFICER ACCOUNTS
#
# Passwords are bcrypt hashes stored as plain strings here.
# Pattern: NagrikSewa@<tier><dept_short>   e.g. NagrikSewa@1WAT
#
# These are PRE-HASHED using bcrypt with cost factor 12. The hash below is
# for the string "NagrikSewa2026" for ALL accounts — change per-account in
# production via the admin panel or a management command.
#
# Hash: bcrypt("NagrikSewa2026", rounds=12)
# ---------------------------------------------------------------------------

# Single demo password hash — bcrypt of "NagrikSewa2026" with 12 rounds
_DEMO_HASH = "$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36zLr4Z8F7yqiUoWGqXpRi."

# Build accounts for every seeded officer
def build_officer_accounts() -> list[dict]:
    accounts = []
    for off in OFFICERS:
        oid   = off["officer_id"]
        # Username: officer_id with dashes → underscores, trimmed
        uname = oid.replace("-", "_")
        accounts.append({
            "account_id":    f"acct-{oid}",
            "officer_id":    oid,
            "username":      uname,
            "password_hash": _DEMO_HASH,
            "last_login_at": None,
            "is_active":     1,
            "created_at":    _NOW,
        })
    return accounts


OFFICER_ACCOUNTS: list[dict] = build_officer_accounts()

# ---------------------------------------------------------------------------
# Convenience: all seed groups in insertion order
# ---------------------------------------------------------------------------

ALL_SEED_GROUPS: list[tuple[str, str, list[dict]]] = [
    # (table_name, primary_key_column, rows)
    ("departments",     "department_id",  DEPARTMENTS),
    ("officers",        "officer_id",     OFFICERS),
    ("sla_policies",    "policy_id",      SLA_POLICIES),
    ("priority_weights","weight_id",       PRIORITY_WEIGHTS),
    ("sop_templates",   "template_id",    SOP_TEMPLATES),
    ("officer_accounts","account_id",     OFFICER_ACCOUNTS),
]
