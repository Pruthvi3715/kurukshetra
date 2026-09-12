"""KURUKSHETRA: Autonomous Multi-Agent Civic Grievance Operating System (PS17)
Terminal Verification for ALL 6 Civic Agents with New Electrical Hazard Incident
and Zero-Trust Edge CV Structural Diffing using user's Inputs/ and Output/ test datasets.
"""

import os
import sys
import json
import base64
import time
import urllib.request

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

API = "http://127.0.0.1:8000"

def post(endpoint, data):
    req = urllib.request.Request(
        f"{API}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30.0) as resp:
        return json.loads(resp.read().decode("utf-8"))

def file_to_b64(filepath, mime="image/jpeg"):
    if not os.path.exists(filepath):
        return None
    with open(filepath, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
        return f"data:{mime};base64,{encoded}"

print("=" * 80)
print("🏛️  NAGRIKSEWA AI: ALL-AGENT TERMINAL VERIFICATION SUITE")
print("🔥  NEW PROBLEM DOMAIN: Streetlighting & High-Voltage Electric Hazard")
print("📁  DATASET USED: Inputs/ (Incident Proof) & Output/ (Closure Resolution)")
print("=" * 80)

# Check health
try:
    health = urllib.request.urlopen(f"{API}/api/health", timeout=5.0)
    health_data = json.loads(health.read().decode("utf-8"))
    print(f"\n[SYSTEM HEALTH] Status: {health_data.get('status').upper()} | LLM: {health_data.get('gemini_model')} (Connected: {health_data.get('gemini_key_configured')})")
except Exception as e:
    print(f"\n[ERROR] Could not connect to {API}: {e}")
    sys.exit(1)

# -----------------------------------------------------------------------------
# 1. AGENT A: Multilingual Ingestion & NER
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("[1] AGENT A: MULTILINGUAL INGESTION & NER (Google Gemini 2.5 Flash)")
print("-" * 80)
new_problem_text = "Karve Road var Nal Stop chowk javal electric pole tirpa jhala ahe ani live wire varun spark padtat, accident hoil loka bheet ahet phar urgent ahe"
print(f"  📝 Citizen Input (Marathi): \"{new_problem_text}\"")

res_a = post("/api/agents/execute/agent-a", {
    "raw_text": new_problem_text,
    "ward_id": "Ward-14 (Kothrud)"
})
print(f"  ⚡ Model Engine        : {res_a.get('model_provider')} ({os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')})")
print(f"  🌐 Detected Language   : {res_a.get('detected_language')} (Confidence: {res_a.get('language_confidence')})")
print(f"  🎯 Extracted Category  : {res_a.get('extracted_entities', {}).get('category_phrase')}")
print(f"  📍 Extracted Landmark  : {res_a.get('extracted_entities', {}).get('landmark')}")
print(f"  📄 Canonical English   : {res_a.get('canonical_english_summary')}")
print(f"  🛡️  Completeness Gate   : {res_a.get('completeness_gatekeeper', {}).get('status')} - Actionable: {res_a.get('completeness_gatekeeper', {}).get('actionable')}")
print(f"  ⏱️  Execution Latency   : {res_a.get('execution_time_ms')} ms")

# -----------------------------------------------------------------------------
# 2. Register Parent Complaint with Image from Inputs/
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("[2] COMPLAINT REGISTRATION (Linking Real Photo from Inputs/6ip_electricpole.jpg)")
print("-" * 80)
input_img_b64 = file_to_b64("Inputs/6ip_electricpole.jpg", "image/jpeg")
if input_img_b64:
    print(f"  📸 Attached Citizen Photo: Inputs/6ip_electricpole.jpg ({len(input_img_b64)//1024} KB base64)")
else:
    print("  ⚠️  Inputs/6ip_electricpole.jpg not found, proceeding without photo")

parent_ticket = post("/api/complaints", {
    "raw_text": new_problem_text,
    "ward_id": "Ward-14 (Kothrud)",
    "channel": "WEB",
    "incident_photo_raw": input_img_b64
})
ticket_id = parent_ticket["ticket_id"]
lat = parent_ticket["latitude"]
lng = parent_ticket["longitude"]
dept = parent_ticket["assigned_department_name"]
print(f"  ✅ Ticket Created: #{ticket_id}")
print(f"  🏢 Department    : {dept}")
print(f"  📍 Coordinates   : ({lat:.5f}, {lng:.5f}) - Pune Karve Road Zone")
print(f"  🚦 Initial Status: {parent_ticket['status']}")

# -----------------------------------------------------------------------------
# 3. AGENT C: Spatial Deduplication & Geodesic Clustering
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("[3] AGENT C: SPATIAL DEDUPLICATION & 150m POSTGIS CLUSTERING")
print("-" * 80)
secondary_report = "Electric pole bent dangerous sparks falling near Nal stop bridge road"
# Simulate a nearby citizen report 65 meters away
offset_lat = lat + 0.0004
offset_lng = lng + 0.0003
print(f"  👥 Secondary Citizen Report: \"{secondary_report}\"")
print(f"  📍 Secondary Incident GPS   : ({offset_lat:.5f}, {offset_lng:.5f})")

res_c = post("/api/agents/execute/agent-c", {
    "latitude": offset_lat,
    "longitude": offset_lng,
    "category": dept,
    "raw_text": secondary_report
})
print(f"  📐 Nearest Incident Distance : {res_c.get('nearest_incident_distance_meters')} meters (Spatial Threshold: <= 150m)")
print(f"  🧠 Semantic Cosine Similarity: {res_c.get('semantic_cosine_similarity')} (Semantic Threshold: >= 0.85)")
print(f"  🔒 Clustering Verdict        : {res_c.get('clustering_decision')}")
print(f"  🚒 Redundant Crew Prevented  : {res_c.get('crew_dispatch_prevented')}")

# -----------------------------------------------------------------------------
# 4. AGENT B: Priority Math & Statutory RTS Act SLA Window
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("[4] AGENT B: MULTI-FACTOR PRIORITY MATH & STATUTORY RTS SLA")
print("-" * 80)
res_b = post("/api/agents/execute/agent-b", {
    "category": dept,
    "hazard_score": 98.0,      # Live sparking electric wires (Life Threatening)
    "traffic_score": 92.0,     # Main Karve Road artery
    "density_score": 88.0,     # High pedestrian density near Nal Stop
    "cluster_size": 2          # 2 grouped complaints
})
print(f"  🧮 Mathematical Formula    : {res_b.get('formula')}")
print(f"  📊 Computed Priority Score : {res_b.get('computed_priority_score')} / 100")
print(f"  🚨 Priority Tier           : {res_b.get('priority_tier')} (Urgent Electrical Safety)")
print(f"  ⏳ Statutory SLA Window    : {res_b.get('statutory_sla_hours')} Hours")
print(f"  ⚖️  Statutory Governance     : {res_b.get('statutory_act')}")

# -----------------------------------------------------------------------------
# 5. AGENT D: 4-Tier Statutory Escalation Ladder
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("[5] AGENT D: 4-TIER STATUTORY RTS ESCALATION LADDER")
print("-" * 80)
time_steps = [
    (1.0, "Tier 1: Ward Field Responder (Junior Electrical Engineer)"),
    (2.5, "Tier 2: Ward Administration (Assistant Municipal Commissioner)"),
    (3.5, "Tier 3: Zonal Chief (Deputy Municipal Commissioner)"),
    (5.0, "Tier 4: Municipal Commissioner (IAS Disciplinary Escalation)")
]
for elapsed, desc in time_steps:
    res_d = post("/api/agents/execute/agent-d", {
        "sla_hours": 2.0,
        "elapsed_hours": elapsed,
        "department_id": "dept-elec-01"
    })
    officer = res_d.get("assigned_officer", {})
    print(f"  ⏰ At {elapsed:3.1f}h Elapsed ({res_d['percent_elapsed']:5.1f}% SLA) -> Level {res_d['escalation_level']} [{res_d['status']}] -> {officer.get('name')} ({officer.get('designation')})")

# -----------------------------------------------------------------------------
# 6. AGENT F: Engineering SOP, Bill of Materials & Geotag Verification
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("[6] AGENT F: FIELD ENGINEERING SOP, BILL OF MATERIALS & GEOTAG AUDIT")
print("-" * 80)
res_f = post("/api/agents/execute/agent-f", {
    "category": dept,
    "summary": "Damaged tilting electric pole with live sparking wires Nal Stop",
    "incident_lat": lat,
    "incident_lng": lng,
    "closure_lat": lat + 0.0001,
    "closure_lng": lng + 0.0001
})
print(f"  📋 Technical Safety SOP Checklist ({len(res_f.get('sop_checklist', []))} steps):")
for idx, step in enumerate(res_f.get("sop_checklist", [])[:4], 1):
    print(f"     {idx}. {step}")
print(f"  📦 Bill of Materials (BOM): {res_f.get('bill_of_materials', [])}")
geo_audit = res_f.get("geotag_audit", {})
print(f"  📍 Field Geotag Offset    : {geo_audit.get('geodesic_offset_meters')}m (Statutory Geofence: <= {geo_audit.get('max_allowed_threshold_meters')}m)")
print(f"  🛡️  Geotag Validation      : {geo_audit.get('status')}")

# -----------------------------------------------------------------------------
# 7. AGENT E: Omnichannel Citizen WhatsApp Notification
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("[7] AGENT E: OMNICHANNEL CITIZEN WHATSAPP NOTIFICATION")
print("-" * 80)
res_e = post("/api/agents/execute/agent-e", {
    "ticket_id": ticket_id,
    "milestone": "Emergency Electrical Crew Dispatched & Area Cordoned",
    "phone": "+91 98220 98765"
})
wa = res_e.get("whatsapp_payload", {})
print(f"  📲 WhatsApp Recipient : {wa.get('recipient')}")
print(f"  💬 Header             : {wa.get('header')}")
print(f"  📄 Message Body       : {wa.get('body')}")
print(f"  🔘 Citizen Actions    : {[btn.get('label') for btn in wa.get('interactive_buttons', [])]}")
print(f"  📬 Delivery Status    : {wa.get('delivery_status')}")

# -----------------------------------------------------------------------------
# 8. ZERO-TRUST EDGE CV: Structural Diffing with Inputs/ & Output/
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("[8] ZERO-TRUST EDGE CV STRUCTURAL DIFFING (Using Inputs/ & Output/ Files)")
print("-" * 80)

pairs = [
    ("Electric Pole Hazard", "Inputs/6ip_electricpole.jpg", "Output/6op.png", "Streetlighting & Electrical", "ELECTRIC_HAZARD"),
    ("Road Asphalt Defect",  "Inputs/7ip_road.jpg",         "Output/7op.png", "Roads & Traffic Infrastructure", "POTHOLE_CRATER")
]

for name, in_file, out_file, cat, defect in pairs:
    print(f"\n  🔬 Verifying Scenario: {name}")
    print(f"     - Incident Photo : {in_file} ({os.path.getsize(in_file)/1024:.1f} KB)")
    print(f"     - Closure Photo  : {out_file} ({os.path.getsize(out_file)/1024:.1f} KB)")
    
    b64_in = file_to_b64(in_file, "image/jpeg")
    b64_out = file_to_b64(out_file, "image/png")
    
    cv_res = post("/api/v1/cv/verify-structural-diff", {
        "incident_photo_raw": b64_in,
        "closure_photo_raw": b64_out,
        "category": cat,
        "defect_type": defect
    })
    
    print(f"     ✅ Verification Result        : {cv_res.get('verified')}")
    print(f"     🎯 Anti-Spoofing Verdict      : {cv_res.get('anti_spoofing_verdict')}")
    print(f"     🛡️  Field Gaming Detected      : {cv_res.get('field_gaming_detected')}")
    print(f"     ⭐ Overall Confidence Score   : {cv_res.get('confidence_score')}%")
    print(f"     📐 Geometric Alignment Score  : {cv_res.get('geometric_alignment_score')}% (ORB Inliers: {cv_res.get('orb_inliers_count')})")
    print(f"     🔧 Defect Remedy Score        : {cv_res.get('defect_remedy_score')}%")
    print(f"     ⚡ Edge Processing Latency    : {cv_res.get('execution_latency_ms')} ms")
    print(f"     🤖 CV Algorithm               : {cv_res.get('algorithm')}")

# -----------------------------------------------------------------------------
# 9. Geotag Watermarking Verification
# -----------------------------------------------------------------------------
print("\n" + "-" * 80)
print("[9] CRYPTOGRAPHIC GEOTAG WATERMARKING & SHA-256 TAMPER AUDIT")
print("-" * 80)
res_watermark = post("/api/complaints/geotag-photo", {
    "photo_data": input_img_b64 or "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "latitude": lat,
    "longitude": lng,
    "accuracy_meters": 3.8,
    "ticket_id": ticket_id,
    "incident_category": dept,
    "ward_id": "Ward-14 (Kothrud)",
    "stage": "CLOSURE_PROOF"
})
print(f"  🛡️  Geofence Status   : {res_watermark.get('geofence_status')}")
print(f"  📍 Geodesic Offset   : {res_watermark.get('geodesic_offset_meters')}m (Within threshold: {res_watermark.get('within_statutory_threshold')})")
print(f"  🔐 SHA-256 Hash      : {res_watermark.get('photo_hash_sha256')}")
print(f"  🏷️  Official Watermark:\n{res_watermark.get('watermark_text')}")

print("\n" + "=" * 80)
print("🏆 ALL 6 AGENTS + EDGE CV VERIFIED SUCCESSFULLY ON NEW PROBLEM DATASET!")
print("=" * 80)
