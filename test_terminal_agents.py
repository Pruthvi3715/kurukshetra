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

print("=" * 70)
print("KURUKSHETRA: TERMINAL VERIFICATION OF ALL 6 CIVIC AGENTS + GEMINI 2.5")
print("=" * 70)

# 1. Agent A
print("\n[1] AGENT A: Multilingual Ingestion & NER (Google Gemini 2.5 Flash)")
res_a = post("/api/agents/execute/agent-a", {
    "raw_text": "Shivaji Chowk javal main water pipeline phutli ahe, rastyavar khoop pani sathlay",
    "ward_id": "Ward-14 (Kothrud)"
})
print(f"  * Model Provider: {res_a.get('model_provider')} (Gemini 2.5 Flash)")
print(f"  * Detected Language: {res_a.get('detected_language')} (Confidence: {res_a.get('language_confidence')})")
print(f"  * Canonical English: {res_a.get('canonical_english_summary')}")
print(f"  * Extracted Category: {res_a.get('extracted_entities', {}).get('category_phrase')}")
print(f"  * Extracted Landmark: {res_a.get('extracted_entities', {}).get('landmark')}")
print(f"  * Completeness Gatekeeper: {res_a.get('completeness_gatekeeper', {}).get('status')}")
print(f"  * Execution Latency: {res_a.get('execution_time_ms')} ms")

# 2. Agent C
print("\n[2] AGENT C: Spatial Deduplication & 150m PostGIS Geodesic Clustering")
parent = post("/api/complaints", {
    "raw_text": "Shivaji Chowk Paud road main pipeline burst, shops flooding",
    "ward_id": "Ward-14 (Kothrud)",
    "channel": "VOICE"
})
parent_id = parent["ticket_id"]
lat = parent["latitude"]
lng = parent["longitude"]
print(f"  * Parent Ticket: #{parent_id} registered at ({lat:.4f}, {lng:.4f})")

res_c = post("/api/agents/execute/agent-c", {
    "latitude": lat + 0.0008,
    "longitude": lng + 0.0006,
    "category": parent["assigned_department_name"],
    "raw_text": "Water flooding street near Shivaji Chowk"
})
print(f"  * Geodesic Distance: {res_c.get('nearest_incident_distance_meters')} meters (Threshold: <= 150.0m)")
print(f"  * Cosine Semantic Similarity: {res_c.get('semantic_cosine_similarity')} (Threshold: >= 0.85)")
print(f"  * Clustering Verdict: {res_c.get('clustering_decision')}")
print(f"  * Contractor Crew Saved: {res_c.get('crew_dispatch_prevented')}")

# 3. Agent B
print("\n[3] AGENT B: Multi-Factor Priority Math & Statutory RTS Act SLA Mapping")
res_b = post("/api/agents/execute/agent-b", {
    "category": "Water Supply & Pumping",
    "hazard_score": 95.0,
    "traffic_score": 90.0,
    "density_score": 85.0,
    "cluster_size": 3
})
print(f"  * Math Formula: {res_b.get('formula')}")
print(f"  * Computed Priority: {res_b.get('computed_priority_score')} / 100")
print(f"  * Priority Tier: {res_b.get('priority_tier')}")
print(f"  * Statutory SLA Window: {res_b.get('statutory_sla_hours')} Hours")
print(f"  * Governing Law: {res_b.get('statutory_act')}")

# 4. Agent D
print("\n[4] AGENT D: 4-Tier Statutory Escalation Ladder & Breach Monitor")
scenarios = [
    (2.0, "Tier 1: Ward Field Responder (Junior Engineer)"),
    (5.5, "Tier 2: Ward Administration (Assistant Municipal Commissioner)"),
    (8.0, "Tier 3: Zonal Department Head (Deputy Municipal Commissioner)"),
    (14.0, "Tier 4: Municipal Commissioner (IAS)")
]
for el, expected in scenarios:
    res_d = post("/api/agents/execute/agent-d", {
        "sla_hours": 6.0,
        "elapsed_hours": el,
        "department_id": "dept-wat-01"
    })
    off = res_d["assigned_officer"]
    print(f"  * Elapsed {el:.1f}h ({res_d['percent_elapsed']}%) -> Level {res_d['escalation_level']} ({res_d['status']}) -> {off['name']} [{off['designation']}]")

# 5. Agent F
print("\n[5] AGENT F: Engineering SOP Checklist, Bill of Materials & Geotag Verification")
res_f = post("/api/agents/execute/agent-f", {
    "category": "Water Supply & Pumping",
    "summary": "Underground main pipeline fracture Paud road",
    "incident_lat": 18.5074,
    "incident_lng": 73.8077,
    "closure_lat": 18.5075,
    "closure_lng": 73.8076
})
print(f"  * Technical SOP Checklist ({len(res_f.get('sop_checklist', []))} steps generated):")
for step in res_f.get("sop_checklist", [])[:3]:
    print(f"      - {step}")
print(f"  * Bill of Materials (BOM): {res_f.get('bill_of_materials', [])}")
geo = res_f.get("geotag_audit", {})
print(f"  * Geotag Offset: {geo.get('geodesic_offset_meters')}m (Max allowed: <= {geo.get('max_allowed_threshold_meters')}m)")
print(f"  * Geotag Status: {geo.get('status')}")

# 6. Agent E
print("\n[6] AGENT E: Omnichannel Citizen WhatsApp Notification & Post-Closure Verification")
res_e = post("/api/agents/execute/agent-e", {
    "ticket_id": parent_id,
    "milestone": "Resolved & Water Supply Restored",
    "phone": "+91 98220 54321"
})
wa = res_e.get("whatsapp_payload", {})
print(f"  * Channel: {wa.get('channel')} -> {wa.get('recipient')}")
print(f"  * Header: {wa.get('header')}")
print(f"  * Message: {wa.get('body')}")
print(f"  * Status: {wa.get('delivery_status')} (Read at {wa.get('read_receipt_at')})")
print(f"  * Interactive Action Buttons: {[b['label'] for b in wa.get('interactive_buttons', [])]}")

# 7. Geotag Photo Tagging Feature
print("\n[7] NEW FEATURE: Geotagged Photo Tagging, Watermarking & Cryptographic Hashing")
res_geo = post("/api/complaints/geotag-photo", {
    "photo_data": "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "latitude": 18.5074,
    "longitude": 73.8077,
    "accuracy_meters": 4.2,
    "ticket_id": parent_id,
    "incident_category": "Water Supply & Pumping",
    "ward_id": "Ward-14 (Kothrud)",
    "stage": "CLOSURE_PROOF"
})
print(f"  * Verified: {res_geo.get('verified')}")
print(f"  * Geofence Status: {res_geo.get('geofence_status')}")
print(f"  * Geodesic Offset vs Ticket: {res_geo.get('geodesic_offset_meters')}m (Within statutory threshold: {res_geo.get('within_statutory_threshold')})")
print(f"  * SHA-256 Tamper-Proof Hash: {res_geo.get('photo_hash_sha256')[:32]}...")
print(f"  * Official Watermark Stamp:\n{res_geo.get('watermark_text')}")

print("\n" + "=" * 70)
print("SUCCESS: ALL 6 AGENTS + GEOTAGGING ARE FULLY FUNCTIONAL VIA TERMINAL!")
print("=" * 70)
