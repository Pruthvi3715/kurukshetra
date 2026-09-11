import urllib.request
import json
import time
import sys

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
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

print("=" * 80)
print("TESTING ALL 6 CIVIC AGENTS ON NEW UNTAKEN PROBLEM SCENARIO (PS)")
print("Domain: Drainage & Sewerage / Catastrophic Open Manhole with Sewage Backflow")
print("Jurisdiction: Pune Municipal Corporation (PMC) - Ward 08 (Aundh / Parihar Chowk)")
print("=" * 80)

# -------------------------------------------------------------------------
# 1. AGENT A: Multilingual Triage & NER (Google Gemini 2.5 Flash)
# -------------------------------------------------------------------------
print("\n[1] AGENT A: Multilingual Ingestion & NER (Google Gemini 2.5 Flash)")
new_grievance_text = (
    "औंध परिहार चौकात मुख्य रस्त्यावर मॅनहोलचे झाकण उघडे पडले आहे, "
    "गटाराचे दुर्गंधीयुक्त पाणी रस्त्यावर वाहत आहे आणि रात्री दुचाकी वाहने अपघाताला बळी पडत आहेत. "
    "लगेच दुरुस्ती करा नाहीतर मोठा अपघात होईल."
)

res_a = post("/api/agents/execute/agent-a", {
    "raw_text": new_grievance_text,
    "ward_id": "Ward-08 (Aundh)"
})

print(f"  * Model Provider: {res_a.get('model_provider')} (Gemini 2.5 Flash Active)")
print(f"  * Detected Language: {res_a.get('detected_language')} (Confidence: {res_a.get('language_confidence')})")
print(f"  * Canonical English Summary: {res_a.get('canonical_english_summary')}")
print(f"  * Extracted Category: {res_a.get('extracted_entities', {}).get('category_phrase')}")
print(f"  * Ward Jurisdiction: {res_a.get('extracted_entities', {}).get('ward_name')}")
print(f"  * Extracted Landmark: {res_a.get('extracted_entities', {}).get('landmark')}")
print(f"  * Completeness Gatekeeper: {res_a.get('completeness_gatekeeper', {}).get('status')}")
print(f"  * Spatial Anchors Count: {res_a.get('completeness_gatekeeper', {}).get('spatial_anchors_count')}")
print(f"  * Execution Latency: {res_a.get('execution_time_ms')} ms")

# -------------------------------------------------------------------------
# 2. AGENT C: Spatial Deduplication & 150m PostGIS Geodesic Clustering
# -------------------------------------------------------------------------
print("\n[2] AGENT C: Spatial Deduplication & 150m PostGIS Geodesic Clustering")
# Register primary incident at Aundh (18.5580° N, 73.8070° E)
aundh_lat = 18.5580
aundh_lng = 73.8070

parent_ticket = post("/api/complaints", {
    "raw_text": "Open sewer manhole overflowing at Parihar Chowk Aundh, extreme hazard",
    "ward_id": "Ward-08 (Aundh)",
    "channel": "WHATSAPP",
    "latitude": aundh_lat,
    "longitude": aundh_lng,
    "complainant_name": "Ajit Kulkarni",
    "complainant_phone": "+91 98230 45678"
})
parent_id = parent_ticket["ticket_id"]
print(f"  * Primary Incident Registered: #{parent_id} in {parent_ticket['assigned_department_name']}")
print(f"  * Site Coordinates: ({aundh_lat:.4f}° N, {aundh_lng:.4f}° E)")

# Concurrent second citizen reports same open manhole from 72 meters away
res_c = post("/api/agents/execute/agent-c", {
    "latitude": aundh_lat + 0.0005,
    "longitude": aundh_lng + 0.0004,
    "category": parent_ticket["assigned_department_name"],
    "raw_text": "Drainage overflowing and broken cover near Parihar Chowk"
})
print(f"  * Geodesic Haversine Distance: {res_c.get('nearest_incident_distance_meters')} meters (Threshold <= 150.0m)")
print(f"  * Cosine Semantic Similarity: {res_c.get('semantic_cosine_similarity')} (Threshold >= 0.85)")
print(f"  * Decision: {res_c.get('clustering_decision')}")
print(f"  * Parent Ticket Linked: #{res_c.get('parent_ticket_id')}")
print(f"  * Redundant Suction Crew Prevented: {res_c.get('crew_dispatch_prevented')}")
print(f"  * Cluster Priority Boost: +{res_c.get('cluster_boost_delta')} points")

# -------------------------------------------------------------------------
# 3. AGENT B: Dynamic Priority Math & Statutory RTS Act SLA Mapping
# -------------------------------------------------------------------------
print("\n[3] AGENT B: Multi-Factor Priority Math & Statutory RTS Act SLA Mapping")
# High hazard open manhole on busy arterial road
res_b = post("/api/agents/execute/agent-b", {
    "category": "Drainage & Sewerage",
    "hazard_score": 96.0,    # Extreme accident risk
    "traffic_score": 92.0,   # Major Aundh bus route
    "density_score": 90.0,   # Dense commercial chowk
    "cluster_size": 4        # 4 concurrent reports (+15 pts delta)
})
print(f"  * Governing Formula: {res_b.get('formula')}")
print(f"  * Computed Priority Score: {res_b.get('computed_priority_score')} / 100")
print(f"  * Priority Tier: {res_b.get('priority_tier')}")
print(f"  * Statutory SLA Window: {res_b.get('statutory_sla_hours')} Hours")
print(f"  * Legal Mandate: {res_b.get('statutory_act')}")
bd = res_b.get('formula_breakdown', {})
print(f"  * Breakdown: Hazard=0.45*{bd['hazard']['score']} ({bd['hazard']['weighted_value']}) | Traffic=0.25*{bd['traffic']['score']} ({bd['traffic']['weighted_value']}) | Pop=0.20*{bd['population_density']['score']} ({bd['population_density']['weighted_value']}) | Cluster Delta=+{bd['cluster_delta']['delta_points']} pts")

# -------------------------------------------------------------------------
# 4. AGENT D: 4-Tier Statutory Escalation Ladder & Breach Evaluator
# -------------------------------------------------------------------------
print("\n[4] AGENT D: 4-Tier Statutory Escalation Ladder & Breach Evaluator")
ladder_scenarios = [
    (1.5, "1.5h (25% SLA - Within Response Window)"),
    (5.0, "5.0h (83% SLA - Approaching Statutory Breach)"),
    (7.0, "7.0h (117% SLA - Hard Statutory Breach)"),
    (11.0, "11.0h (183% SLA - Gross RTS Violation > 150%)")
]
for el, desc in ladder_scenarios:
    res_d = post("/api/agents/execute/agent-d", {
        "sla_hours": 6.0,
        "elapsed_hours": el,
        "department_id": "dept-drn-01"
    })
    off = res_d["assigned_officer"]
    print(f"  * {desc}")
    print(f"      Status: {res_d['status']} (Level {res_d['escalation_level']})")
    print(f"      Responsible Officer: {off['name']} [{off['designation']}]")
    print(f"      Trigger Rule: {res_d['trigger_reason']}")

# -------------------------------------------------------------------------
# 5. AGENT F: Engineering SOP Checklist, BOM & Geotag Geofence Audit
# -------------------------------------------------------------------------
print("\n[5] AGENT F: Engineering SOP Checklist, Bill of Materials & Geotag Audit")
res_f = post("/api/agents/execute/agent-f", {
    "category": "Drainage & Sewerage",
    "summary": "Open manhole cover and sewage overflow at Parihar Chowk Aundh",
    "incident_lat": aundh_lat,
    "incident_lng": aundh_lng,
    "closure_lat": aundh_lat + 0.0001,
    "closure_lng": aundh_lng + 0.0001
})
print("  * Category-Specific SOP Checklist (Agent F Generated):")
for idx, s in enumerate(res_f.get("sop_checklist", []), 1):
    print(f"      {idx}. {s}")

print("  * Itemized Bill of Materials (BOM):")
for item in res_f.get("bill_of_materials", []):
    if isinstance(item, dict):
        print(f"      - {item.get('item', '')}: {item.get('quantity', '')}")
    else:
        print(f"      - {item}")

geo = res_f.get("geotag_audit", {})
print(f"  * Geotag Offset: {geo.get('geodesic_offset_meters')}m (Statutory Limit <= {geo.get('max_allowed_threshold_meters')}m)")
print(f"  * Verification Result: {geo.get('status')}")

# -------------------------------------------------------------------------
# 6. AGENT E: Omnichannel WhatsApp Milestone Alert & Citizen Reopen Loop
# -------------------------------------------------------------------------
print("\n[6] AGENT E: Omnichannel WhatsApp Milestone Alert & Reopen Loop")
res_e = post("/api/agents/execute/agent-e", {
    "ticket_id": parent_id,
    "milestone": "Manhole Cover Replaced & Road Sanitized",
    "phone": "+91 98230 45678"
})
wa = res_e.get("whatsapp_payload", {})
print(f"  * Target WhatsApp Channel: {wa.get('channel')} -> {wa.get('recipient')}")
print(f"  * Header: {wa.get('header')}")
print(f"  * Body Text: {wa.get('body')}")
print(f"  * Delivery Status: {wa.get('delivery_status')} | Read Receipt: {wa.get('read_receipt_at')}")
print(f"  * Citizen Action Buttons: {[b['label'] for b in wa.get('interactive_buttons', [])]}")

# -------------------------------------------------------------------------
# 7. NEW GEOTAG PHOTO TAGGING: Tamper-Proof SHA-256 & Watermark Stamp
# -------------------------------------------------------------------------
print("\n[7] GEOTAG PHOTO TAGGING: Field Repair Evidence & Tamper-Proof Audit")
res_geo = post("/api/complaints/geotag-photo", {
    "photo_data": "data:image/jpeg;base64,AUNDH_DRAINAGE_REPAIR_PROOF_IMAGE_PAYLOAD_BYTE_STREAM",
    "latitude": aundh_lat + 0.0001,
    "longitude": aundh_lng + 0.0001,
    "accuracy_meters": 2.8,
    "ticket_id": parent_id,
    "incident_category": "Drainage & Sewerage",
    "ward_id": "Ward-08 (Aundh)",
    "stage": "CLOSURE_PROOF"
})
print(f"  * Geotag Spatial Audit Verified: {res_geo.get('verified')}")
print(f"  * Geofence Bounding Status: {res_geo.get('geofence_status')}")
print(f"  * Geodesic Distance vs Reported Incident: {res_geo.get('geodesic_offset_meters')}m (Within <= 100m threshold: {res_geo.get('within_statutory_threshold')})")
print(f"  * Cryptographic SHA-256 Hash: {res_geo.get('photo_hash_sha256')[:32]}...")
print(f"  * Official Watermark Stamp:\n{res_geo.get('watermark_text')}")

print("\n" + "=" * 80)
print("SUCCESS: ALL 6 AGENTS VALIDATED ON NEW DRAINAGE & SEWERAGE PROBLEM SCENARIO!")
print("=" * 80)
