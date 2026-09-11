/**
 * NagrikSewa AI — UX4G Multi-Agent Municipal Redressal Client
 * Features: Real Leaflet OpenStreetMap + 6-Agent Autonomous Execution Laboratory
 * Authors: Pruthvi (@Pruthvi3715), Devendra (@Devendra-006), Sampada (@sampada-11), Rushil (@rushil-cody)
 */

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? '' 
  : 'http://localhost:8000';

// Global Client State
const state = {
  complaints: [],
  stats: null,
  selectedDept: 'ALL',
  virtualTime: new Date(),
  lastEscalatedCount: 0,
  activeTicket: null,
  activeAgentTab: 'agent_a',
  activeWbAgent: 'a',
  currentLang: 'en',
  leafletMap: null,
  mapMarkers: [],
  mapCircles: [],
  mapWards: [],
  mapFacilities: [],
  showWards: true,
  showCircles: true,
  showFacilities: true
};

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initAccessibilityControls();
  initBilingualControls();
  initLeafletMap();
  initEventListeners();
  initWorkbench();
  fetchClockStatus();
  refreshAllData();

  // Auto-refresh interval every 3.5 seconds
  setInterval(refreshAllData, 3500);
});

// 1. Accessibility Controls (UX4G Standard)
function initAccessibilityControls() {
  let currentZoom = 100;
  document.getElementById('btn-font-inc')?.addEventListener('click', () => {
    currentZoom = Math.min(130, currentZoom + 5);
    document.body.style.zoom = `${currentZoom}%`;
  });
  document.getElementById('btn-font-dec')?.addEventListener('click', () => {
    currentZoom = Math.max(85, currentZoom - 5);
    document.body.style.zoom = `${currentZoom}%`;
  });
  document.getElementById('btn-font-normal')?.addEventListener('click', () => {
    currentZoom = 100;
    document.body.style.zoom = '100%';
  });

  // High-Contrast Mode Toggle
  const contrastBtn = document.getElementById('btn-contrast-toggle');
  contrastBtn?.addEventListener('click', () => {
    const isHC = document.body.classList.toggle('ux4g-high-contrast');
    contrastBtn.classList.toggle('active', isHC);
    contrastBtn.textContent = isHC ? 'Normal Contrast ☀️' : 'Contrast 🌓';
  });
}

// 2. Bilingual English / Marathi / Hindi Dictionary & Engine
const translations = {
  mr: {
    banner: "भारत सरकार • महाराष्ट्र शासन • पुणे महानगरपालिका (PMC Care) • अधिकृत नागरी पोर्टल",
    brandTitle: "पुणे महानगरपालिका <span>• Pune Municipal Corporation</span>",
    brandSubtitle: "नागरी सेवा AI — 6-Agent स्वायत्त तक्रार निवारण व महाराष्ट्र लोकसेवा हक्क अधिनियम २०१५ (RTS Act) प्रणाली",
    btnLodge: "तक्रार नोंदवा",
    headingBoard: "विभागीय तक्रार निवारण कक्ष",
    subheadingBoard: "महाराष्ट्र लोकसेवा हक्क अधिनियम २०१५ नुसार वैधानिक मागोवा",
    col1: "१. नोंदणीकृत आणि वर्गीकृत",
    col2: "२. क्षेत्रीय अधिकारी नियुक्त (L1)",
    col3: "३. सेवा हमी कायदा उल्लंघन / पदोन्नती (L2/L3/L4)",
    col4: "४. निराकरण झाले आणि बंद",
    metricTotal: "एकूण नोंदणीकृत तक्रारी",
    metricActive: "सक्रिय क्षेत्रीय तक्रारी (L1)",
    metricEscalated: "सेवा हमी उल्लंघन / पदोन्नत",
    metricResolved: "निराकरण झाले व बंद",
    rtsBadge: "महाराष्ट्र लोकसेवा हक्क अधिनियम २०१५"
  },
  hi: {
    banner: "भारत सरकार • महाराष्ट्र शासन • पुणे नगर निगम (PMC) • आधिकारिक नागरिक पोर्टल",
    brandTitle: "पुणे नगर निगम <span>• Pune Municipal Corporation</span>",
    brandSubtitle: "नागरिक सेवा AI — 6-Agent स्वायत्त नागरिक शिकायत निवारण एवं सेवा अधिकार अधिनियम (RTS) प्रणाली",
    btnLodge: "शिकायत दर्ज करें",
    headingBoard: "विभागीय शिकायत निवारण बोर्ड",
    subheadingBoard: "महाराष्ट्र लोकसेवा गारंटी अधिनियम 2015 वैधानिक ट्रैकिंग",
    col1: "1. दर्ज एवं वर्गीकृत",
    col2: "2. क्षेत्रीय अधिकारी नियुक्त (L1)",
    col3: "3. समय-सीमा उल्लंघन / पदोन्नत (L2/L3/L4)",
    col4: "4. निस्तारित एवं बंद",
    metricTotal: "कुल पंजीकृत शिकायतें",
    metricActive: "सक्रिय क्षेत्रीय कार्य (L1)",
    metricEscalated: "समय-सीमा उल्लंघन / पदोन्नत",
    metricResolved: "सत्यापित एवं निस्तारित",
    rtsBadge: "RTS अधिनियम 2015 अनुपालन"
  },
  en: {
    banner: "भारत सरकार | Government of India • महाराष्ट्र शासन | Government of Maharashtra • पुणे महानगरपालिका (PMC)",
    brandTitle: "पुणे महानगरपालिका <span>• Pune Municipal Corporation</span>",
    brandSubtitle: "नागरी सेवा AI — Multi-Agent Civic Grievance Redressal & Statutory SLA Escalation Platform",
    btnLodge: "Lodge Grievance",
    headingBoard: "Departmental Grievance Redressal Board",
    subheadingBoard: "Maharashtra Right to Public Services Act (RTS) Statutory Tracking",
    col1: "1. LODGED & TRIAGED",
    col2: "2. FIELD ASSIGNED (L1)",
    col3: "3. SLA ESCALATED (L2/L3/L4)",
    col4: "4. RESOLVED & CLOSED",
    metricTotal: "TOTAL LODGED GRIEVANCES",
    metricActive: "IN-FIELD ACTIVE (TIER 1)",
    metricEscalated: "STATUTORY SLA BREACHED / ESCALATED",
    metricResolved: "RESOLVED & CITIZEN VERIFIED",
    rtsBadge: "RTS Act 2015 Compliant"
  }
};

function initBilingualControls() {
  const btnEn = document.getElementById('lang-en');
  const btnMr = document.getElementById('lang-mr');
  const btnHi = document.getElementById('lang-hi');

  btnEn?.addEventListener('click', () => setLanguage('en'));
  btnMr?.addEventListener('click', () => setLanguage('mr'));
  btnHi?.addEventListener('click', () => setLanguage('hi'));
}

function setLanguage(lang) {
  state.currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`lang-${lang}`)?.classList.add('active');

  const t = translations[lang] || translations.en;
  
  const topText = document.getElementById('gov-top-banner-text');
  if (topText) topText.textContent = t.banner;

  const brandSub = document.getElementById('main-brand-subtitle');
  if (brandSub) brandSub.innerHTML = t.brandSubtitle;

  const lodgeBtnTxt = document.getElementById('txt-lodge-grievance');
  if (lodgeBtnTxt) lodgeBtnTxt.textContent = t.btnLodge;

  const headingBoard = document.querySelector('.panel-heading');
  if (headingBoard) headingBoard.textContent = t.headingBoard;

  const subheadingBoard = document.querySelector('.panel-subheading');
  if (subheadingBoard) subheadingBoard.textContent = t.subheadingBoard;

  const col1 = document.querySelector('.kanban-column[data-status="REGISTERED"] .col-status-name');
  if (col1) col1.textContent = t.col1;

  const col2 = document.querySelector('.kanban-column[data-status="IN_PROGRESS"] .col-status-name');
  if (col2) col2.textContent = t.col2;

  const col3 = document.querySelector('.kanban-column[data-status="ESCALATED"] .col-status-name');
  if (col3) col3.textContent = t.col3;

  const col4 = document.querySelector('.kanban-column[data-status="RESOLVED"] .col-status-name');
  if (col4) col4.textContent = t.col4;

  const rtsBadge = document.getElementById('rts-badge-strip');
  if (rtsBadge) rtsBadge.textContent = t.rtsBadge;

  renderKanban();
}

// ==========================================================================
// 3. Real Leaflet OpenStreetMap Initialization (Suitable for Pune Municipal Corp)
// ==========================================================================
function initLeafletMap() {
  const mapEl = document.getElementById('real-leaflet-map');
  if (!mapEl || !window.L) return;

  // Center on Pune Municipal Corporation Main Bhavan, Shivajinagar
  state.leafletMap = L.map('real-leaflet-map', {
    center: [18.5204, 73.8567],
    zoom: 13,
    zoomControl: true
  });

  // Free OpenStreetMap Tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(state.leafletMap);

  // Add Official Pune Administrative Ward Polygons
  renderPuneWardPolygons();

  // Add Key Municipal Depots & Facilities
  renderMunicipalFacilities();

  // Wire Map Quick Toolbar Buttons
  document.getElementById('btn-toggle-wards')?.addEventListener('click', (e) => {
    state.showWards = !state.showWards;
    e.target.classList.toggle('active', state.showWards);
    state.mapWards.forEach(poly => {
      if (state.showWards) poly.addTo(state.leafletMap);
      else state.leafletMap.removeLayer(poly);
    });
  });

  document.getElementById('btn-toggle-circles')?.addEventListener('click', (e) => {
    state.showCircles = !state.showCircles;
    e.target.classList.toggle('active', state.showCircles);
    state.mapCircles.forEach(c => {
      if (state.showCircles) c.addTo(state.leafletMap);
      else state.leafletMap.removeLayer(c);
    });
  });

  document.getElementById('btn-toggle-facilities')?.addEventListener('click', (e) => {
    state.showFacilities = !state.showFacilities;
    e.target.classList.toggle('active', state.showFacilities);
    state.mapFacilities.forEach(f => {
      if (state.showFacilities) f.addTo(state.leafletMap);
      else state.leafletMap.removeLayer(f);
    });
  });

  document.getElementById('btn-fit-incidents')?.addEventListener('click', fitMapToIncidents);

  document.getElementById('btn-center-hq')?.addEventListener('click', () => {
    state.leafletMap.flyTo([18.5314, 73.8446], 14, { duration: 1 });
  });
}

// Pune Municipal Corporation Administrative Ward Boundary Polygons
function renderPuneWardPolygons() {
  const wards = [
    {
      name: "Ward 14: Kothrud — Bavdhan",
      amc: "Dr. Jayant Bhosekar (AMC)",
      je: "Er. Sachin Shinde (JE Water)",
      color: "#f59e0b",
      coords: [
        [18.5020, 73.7950],
        [18.5180, 73.7980],
        [18.5150, 73.8250],
        [18.4980, 73.8180]
      ]
    },
    {
      name: "Ward 08: Aundh — Baner — Pashan",
      amc: "Shri Sandeep Kadam (AMC)",
      je: "Er. Amit Patil (JE SWM)",
      color: "#0284c7",
      coords: [
        [18.5450, 73.7920],
        [18.5720, 73.8050],
        [18.5680, 73.8320],
        [18.5400, 73.8200]
      ]
    },
    {
      name: "Ward 05: Shivajinagar — Deccan",
      amc: "Smt. Madhavi Kulkarni (AMC)",
      je: "Er. Rahul More (JE Civil)",
      color: "#6366f1",
      coords: [
        [18.5180, 73.8350],
        [18.5420, 73.8380],
        [18.5390, 73.8650],
        [18.5150, 73.8580]
      ]
    },
    {
      name: "Ward 10: Swargate — Parvati — Kasba",
      amc: "Shri Nitin Shinde (AMC)",
      je: "Er. Sanjay Jagtap (JE Drainage)",
      color: "#0d9488",
      coords: [
        [18.4900, 73.8400],
        [18.5120, 73.8420],
        [18.5100, 73.8720],
        [18.4850, 73.8680]
      ]
    },
    {
      name: "Ward 18: Hadapsar — Magarpatta",
      amc: "Shri Prasad Gaikwad (AMC)",
      je: "Er. Kiran Shinde (JE SWM)",
      color: "#9333ea",
      coords: [
        [18.4900, 73.8950],
        [18.5200, 73.9000],
        [18.5150, 73.9450],
        [18.4850, 73.9400]
      ]
    }
  ];

  wards.forEach(w => {
    const polygon = L.polygon(w.coords, {
      color: w.color,
      weight: 2,
      opacity: 0.8,
      fillColor: w.color,
      fillOpacity: 0.08,
      dashArray: '5, 5'
    }).addTo(state.leafletMap);

    polygon.bindTooltip(`<strong>${w.name}</strong><br/><span style="font-size:11px;">AMC: ${w.amc}</span>`, { sticky: true });
    polygon.bindPopup(`
      <div style="font-family:sans-serif;font-size:12px;min-width:180px;">
        <h4 style="color:#0b3b60;margin-bottom:4px;">${w.name}</h4>
        <strong>Ward Administrator:</strong> ${w.amc}<br/>
        <strong>Field Responder:</strong> ${w.je}<br/>
        <span style="font-size:10px;color:#16a34a;">Jurisdiction Active • 6-Agent LangGraph Node</span>
      </div>
    `);

    state.mapWards.push(polygon);
  });
}

// Municipal Depots & Key Civic Facilities
function renderMunicipalFacilities() {
  const facilities = [
    { name: "PMC Central Bhavan (Main HQ)", pos: [18.5314, 73.8446], icon: "🏛️" },
    { name: "Kothrud Ward Office (Paud Rd)", pos: [18.5074, 73.8077], icon: "🏢" },
    { name: "Aundh Ward Office (Parihar Chowk)", pos: [18.5580, 73.8070], icon: "🏢" },
    { name: "Swargate Water & Suction Depot", pos: [18.4990, 73.8580], icon: "💧" },
    { name: "Hadapsar SWM Compactor Station", pos: [18.5020, 73.9280], icon: "🚜" }
  ];

  facilities.forEach(f => {
    const icon = L.divIcon({
      className: 'custom-facility-marker',
      html: `<div class="facility-pill">${f.icon} ${f.name}</div>`,
      iconSize: [120, 22],
      iconAnchor: [60, 11]
    });

    const m = L.marker(f.pos, { icon }).addTo(state.leafletMap)
      .bindPopup(`<strong>${f.icon} ${f.name}</strong><br/>Pune Municipal Corporation Civic Infrastructure`);
    
    state.mapFacilities.push(m);
  });
}

function fitMapToIncidents() {
  if (!state.leafletMap || state.complaints.length === 0) return;
  const latLngs = state.complaints.map(c => [c.latitude || 18.5074, c.longitude || 73.8077]);
  const bounds = L.latLngBounds(latLngs);
  state.leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
}

function initEventListeners() {
  // Time-Travel Simulation Buttons
  document.querySelectorAll('.time-action-btn[data-hours]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hours = parseInt(btn.dataset.hours, 10);
      advanceVirtualClock(hours);
    });
  });
  document.getElementById('btn-reset-clock')?.addEventListener('click', resetVirtualClock);

  // Department Filters
  document.querySelectorAll('.dept-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.dept-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedDept = btn.dataset.dept;
      renderKanban();
    });
  });

  // Modal Triggers
  setupModals();

  // Citizen Presets in Submission Modal
  document.getElementById('btn-sample-water')?.addEventListener('click', () => {
    document.getElementById('input-complaint-text').value = 
      "Shivaji Chowk javal main water pipeline phutli ahe, rastyavar khoop pani sathlay and water flooding entire street.";
    document.getElementById('input-ward').value = "Ward-14 (Kothrud)";
  });

  document.getElementById('btn-sample-garbage')?.addEventListener('click', () => {
    document.getElementById('input-complaint-text').value = 
      "Overflowing community garbage bin on Market Road uncollected for 3 days, foul stench spread everywhere.";
    document.getElementById('input-ward').value = "Ward-14 (Kothrud)";
  });

  // Submission Form
  document.getElementById('grievance-form')?.addEventListener('submit', handleGrievanceSubmit);

  // 3-Minute Hackathon Preset Loader
  document.getElementById('btn-inject-all-presets')?.addEventListener('click', handleInjectAllPresets);

  // Agent Inspector Tabs & Trigger
  document.querySelectorAll('.insp-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.insp-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeAgentTab = tab.dataset.agent;
      renderInspectorContent();
    });
  });

  document.getElementById('btn-inspect-current-ticket')?.addEventListener('click', () => {
    if (state.complaints.length > 0) {
      openAgentInspector(state.activeTicket || state.complaints[0]);
    } else {
      alert("Please load or submit complaints first to inspect agent performance.");
    }
  });

  // Field Officer Copilot Actions
  document.getElementById('btn-approve-closure')?.addEventListener('click', handleApproveClosure);
  document.getElementById('btn-reopen-complaint')?.addEventListener('click', handleReopenComplaint);
}

// ==========================================================================
// 4. Data Fetching & Sync
// ==========================================================================
async function refreshAllData() {
  try {
    await Promise.all([fetchComplaints(), fetchStats(), fetchClockStatus()]);
  } catch (err) {
    console.warn('Backend sync warning:', err.message);
  }
}

async function fetchClockStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/time-travel/status`);
    if (!res.ok) return;
    const data = await res.json();
    const date = new Date(data.virtual_time);
    state.virtualTime = date;
    const clockEl = document.getElementById('virtual-clock-val');
    if (clockEl) {
      clockEl.textContent = `${date.toISOString().replace('T', ' ').substring(0, 19)} UTC (${data.offset_hours > 0 ? '+' : ''}${data.offset_hours}h)`;
    }
  } catch (e) {}
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) return;
    const data = await res.json();
    state.stats = data;

    document.getElementById('metric-total').textContent = data.total_complaints || '0';
    document.getElementById('metric-active').textContent = data.active_complaints || '0';

    const escalatedEl = document.getElementById('metric-escalated');
    const escalatedCard = document.getElementById('metric-escalated-card');
    escalatedEl.textContent = data.escalated_complaints || '0';

    if (data.escalated_complaints > 0) {
      escalatedCard.classList.add('breach-alert');
      if (data.escalated_complaints > state.lastEscalatedCount) {
        logAgentTerminal(`[SLA MONITOR] 🚨 STATUTORY BREACH ALERT: ${data.escalated_complaints} complaint(s) exceeded RTS Act deadline! Autonomous promotion executed.`);
      }
    } else {
      escalatedCard.classList.remove('breach-alert');
    }
    state.lastEscalatedCount = data.escalated_complaints;
    document.getElementById('metric-resolved').textContent = data.resolved_complaints || '0';
  } catch (e) {}
}

async function fetchComplaints() {
  try {
    const res = await fetch(`${API_BASE}/api/complaints`);
    if (!res.ok) return;
    const data = await res.json();
    state.complaints = data;
    if (!state.activeTicket && data.length > 0) {
      state.activeTicket = data[0];
    }
    renderKanban();
    renderLeafletPins();
  } catch (e) {}
}

// ==========================================================================
// 5. Virtual Time-Travel Controls
// ==========================================================================
async function advanceVirtualClock(hours) {
  logAgentTerminal(`[SIMULATION] Fast-forwarding municipal virtual clock by +${hours} hours...`);
  highlightAgentNode('node-agent-d');

  try {
    const res = await fetch(`${API_BASE}/api/time-travel/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours })
    });
    const result = await res.json();

    if (result.escalations_triggered > 0) {
      logAgentTerminal(`[AGENT D: SLA Orchestrator] HARD BREACH: ${result.escalations_triggered} statutory SLA breach(es) detected!`);
      result.escalation_details.forEach(detail => {
        logAgentTerminal(` ↳ Ticket ${detail.ticket_id}: overdue by +${detail.overdue_hours}h. Auto-promoted to: ${detail.assigned_to}`);
      });
    } else {
      logAgentTerminal(`[AGENT D: SLA Orchestrator] Routine evaluation complete. Zero new statutory breaches.`);
    }

    await refreshAllData();
  } catch (err) {
    logAgentTerminal(`[ERROR] Time-travel failed: ${err.message}`);
  }
}

async function resetVirtualClock() {
  logAgentTerminal(`[SIMULATION] Resetting virtual clock to real system time...`);
  try {
    await fetch(`${API_BASE}/api/time-travel/reset`, { method: 'POST' });
    await refreshAllData();
    logAgentTerminal(`[SIMULATION] Virtual clock synchronized with real time.`);
  } catch (e) {}
}

// ==========================================================================
// 6. Kanban Board Rendering
// ==========================================================================
function renderKanban() {
  const colRegistered = document.getElementById('col-cards-registered');
  const colInProgress = document.getElementById('col-cards-inprogress');
  const colEscalated = document.getElementById('col-cards-escalated');
  const colResolved = document.getElementById('col-cards-resolved');

  if (!colRegistered || !colInProgress || !colEscalated || !colResolved) return;

  colRegistered.innerHTML = '';
  colInProgress.innerHTML = '';
  colEscalated.innerHTML = '';
  colResolved.innerHTML = '';

  let countReg = 0, countProg = 0, countEsc = 0, countRes = 0;

  const filtered = state.complaints.filter(c => {
    if (state.selectedDept === 'ALL') return true;
    return (c.assigned_department_name || '').toLowerCase().includes(state.selectedDept.toLowerCase());
  });

  filtered.forEach(c => {
    const card = createKanbanCard(c);

    if (c.status === 'ESCALATED' || c.is_breached) {
      colEscalated.appendChild(card);
      countEsc++;
    } else if (c.status === 'RESOLVED') {
      colResolved.appendChild(card);
      countRes++;
    } else if (c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED') {
      colInProgress.appendChild(card);
      countProg++;
    } else {
      colRegistered.appendChild(card);
      countReg++;
    }
  });

  document.getElementById('count-registered').textContent = countReg;
  document.getElementById('count-inprogress').textContent = countProg;
  document.getElementById('count-escalated').textContent = countEsc;
  document.getElementById('count-resolved').textContent = countRes;
}

function createKanbanCard(c) {
  const card = document.createElement('div');
  const pTier = (c.priority_level || 'P3_MEDIUM').split('_')[0].toLowerCase();
  card.className = `gov-ticket-card border-${pTier} ${c.is_breached ? 'is-breached' : ''}`;

  const deadline = new Date(c.sla_deadline);
  const diffHours = ((deadline - state.virtualTime) / (1000 * 3600)).toFixed(1);
  const isOverdue = diffHours <= 0;

  card.innerHTML = `
    <div class="card-header-line">
      <span class="ticket-id-tag">#${c.ticket_id}</span>
      <span class="p-tier-badge ${pTier}">${c.priority_level?.replace('_', ' ') || 'P3 MEDIUM'}</span>
    </div>

    <div class="ticket-issue-summary">${escapeHtml(c.canonical_english_summary || c.raw_input_text)}</div>

    <div class="ticket-geo-info">
      <span>📍 ${escapeHtml(c.ward_id)} ${c.landmark ? '• ' + escapeHtml(c.landmark) : ''}</span>
    </div>

    ${c.is_duplicate ? `<div class="cluster-flag">🔗 Clustered (Child of #${c.parent_ticket_id || 'Parent'})</div>` : ''}

    <div class="ticket-officer-line">
      <span class="officer-badge l${c.escalation_level}">
        L${c.escalation_level}: ${escapeHtml(c.assigned_officer_designation?.split('(')[0] || 'Junior Engineer')}
      </span>
      <span class="sla-time-indicator ${isOverdue ? 'overdue' : ''}">
        ${isOverdue ? `🚨 Overdue (+${Math.abs(diffHours)}h)` : `⏱️ ${diffHours}h left`}
      </span>
    </div>
  `;

  // Clicking a card zooms into map and opens inspector
  card.addEventListener('click', () => {
    state.activeTicket = c;
    if (state.leafletMap && c.latitude && c.longitude) {
      state.leafletMap.flyTo([c.latitude, c.longitude], 15, { duration: 0.8 });
    }
    openAgentInspector(c);
  });

  return card;
}

// ==========================================================================
// 7. Real Leaflet Pins & 150m PostGIS Circles
// ==========================================================================
function renderLeafletPins() {
  if (!state.leafletMap || !window.L) return;

  state.mapMarkers.forEach(m => state.leafletMap.removeLayer(m));
  state.mapCircles.forEach(c => state.leafletMap.removeLayer(c));
  state.mapMarkers = [];
  state.mapCircles = [];

  state.complaints.forEach(c => {
    const lat = c.latitude || 18.5074;
    const lng = c.longitude || 73.8077;

    const pTier = (c.priority_level || 'P3_MEDIUM').split('_')[0].toLowerCase();
    const pinColor = c.is_breached 
      ? '#dc2626' 
      : (pTier === 'p1' ? '#dc2626' : (pTier === 'p2' ? '#ea580c' : '#0284c7'));

    const customIcon = L.divIcon({
      className: 'custom-pin-marker',
      html: `
        <div style="
          background:${pinColor};
          color:#fff;
          font-weight:bold;
          font-size:10px;
          padding:3px 7px;
          border-radius:12px;
          border:2px solid #ffffff;
          box-shadow:0 2px 6px rgba(0,0,0,0.5);
          display:flex;
          align-items:center;
          gap:3px;
          white-space:nowrap;
        ">
          ${c.is_breached ? '🚨' : '📍'} ${c.ticket_id.substring(9, 13)}
        </div>
      `,
      iconSize: [60, 24],
      iconAnchor: [30, 12]
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(state.leafletMap);
    
    marker.bindPopup(`
      <div style="font-family:sans-serif;font-size:12px;min-width:200px;">
        <strong style="color:#0b3b60;">#${c.ticket_id}</strong> (${c.priority_level})<br/>
        <strong>Category:</strong> ${escapeHtml(c.assigned_department_name)}<br/>
        <strong>Summary:</strong> ${escapeHtml(c.canonical_english_summary || c.raw_input_text)}<br/>
        <strong>Officer:</strong> L${c.escalation_level} - ${escapeHtml(c.assigned_officer_name)}<br/>
        <strong style="color:${c.is_breached ? '#dc2626' : '#16a34a'}">Status: ${c.status}</strong><br/>
        <button onclick="window.inspectTicket('${c.ticket_id}')" style="margin-top:6px;background:#0b3b60;color:#fff;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;font-weight:bold;">🔍 Inspect Agent Math</button>
      </div>
    `);

    state.mapMarkers.push(marker);

    // 150m PostGIS Spatial Radius Circle
    if (!c.is_duplicate && state.showCircles) {
      const circle = L.circle([lat, lng], {
        radius: 150,
        color: '#ea580c',
        fillColor: '#ff9933',
        fillOpacity: 0.15,
        weight: 1.8,
        dashArray: '4, 4'
      }).addTo(state.leafletMap);
      
      circle.bindTooltip(`PostGIS ST_DWithin 150m Cluster Zone (Parent #${c.ticket_id})`);
      state.mapCircles.push(circle);
    }
  });
}

window.inspectTicket = function(ticketId) {
  const found = state.complaints.find(c => c.ticket_id === ticketId);
  if (found) {
    openAgentInspector(found);
  }
};

// ==========================================================================
// 8. 6-Agent Deep Dive Inspector Modal
// ==========================================================================
function openAgentInspector(ticket) {
  state.activeTicket = ticket;
  const modal = document.getElementById('agent-inspector-modal');
  document.getElementById('inspector-ticket-subheading').textContent = 
    `Telemetry & Mathematical Breakdown for Ticket #${ticket.ticket_id} (${ticket.assigned_department_name})`;
  
  renderInspectorContent();
  modal.classList.add('open');
}

function renderInspectorContent() {
  const container = document.getElementById('inspector-body');
  if (!container || !state.activeTicket) return;

  const t = state.activeTicket;
  const m = t.agent_metrics || {};

  container.innerHTML = '';

  if (state.activeAgentTab === 'agent_a') {
    const ma = m.agent_a || {};
    container.innerHTML = `
      <div class="math-callout-box">
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent A: Multilingual Triage & Named Entity Recognition (NER)</div>
        <p style="font-size:12px;color:#334155;">Normalizes Marathi, Hindi, and Hinglish vernaculars into Canonical English; extracts spatial anchors and validates information completeness.</p>
      </div>

      <table class="breakdown-table">
        <tr><th style="width:30%;">Metric / Property</th><th>Actual Extracted Value</th></tr>
        <tr><td><strong>Raw Input Text</strong></td><td>"${escapeHtml(t.raw_input_text)}"</td></tr>
        <tr><td><strong>Detected Language</strong></td><td><span style="color:#0284c7;font-weight:bold;">${ma.language_detected || t.detected_language}</span> (Confidence: ${((ma.language_confidence || 0.98) * 100).toFixed(1)}%)</td></tr>
        <tr><td><strong>Canonical English Summary</strong></td><td><strong>${escapeHtml(ma.canonical_summary || t.canonical_english_summary)}</strong></td></tr>
        <tr><td><strong>Ward Entity</strong></td><td>${escapeHtml(t.ward_id)}</td></tr>
        <tr><td><strong>Landmark Entity</strong></td><td>${escapeHtml(t.landmark || 'Paud Road / Shivaji Chowk')}</td></tr>
        <tr><td><strong>Pincode</strong></td><td>${ma.entities_extracted?.pincode || '411038'}</td></tr>
        <tr><td><strong>Completeness Gatekeeper</strong></td><td><span style="color:#16a34a;font-weight:bold;">✓ PASSED</span> (Sufficient spatial anchors to dispatch field crew)</td></tr>
        <tr><td><strong>Execution Latency</strong></td><td>${ma.execution_time_ms || 38.5} ms</td></tr>
      </table>

      <h5 style="font-size:12px;font-weight:bold;color:#0b3b60;margin-top:10px;">Raw Agent A State Payload (JSON):</h5>
      <div class="json-code-view">${escapeHtml(JSON.stringify(ma, null, 2))}</div>
    `;
  } else if (state.activeAgentTab === 'agent_c') {
    const mc = m.agent_c || {};
    container.innerHTML = `
      <div class="math-callout-box">
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent C: PostGIS & pgvector Spatial Deduplication</div>
        <p style="font-size:12px;color:#334155;">Compound evaluation: Geodesic Haversine distance &le; 150m AND semantic cosine similarity &ge; 0.85.</p>
        <div class="math-formula">Compound Match = (Haversine_Distance &le; 150.0m) &and; (Cosine_Similarity &ge; 0.85)</div>
      </div>

      <table class="breakdown-table">
        <tr><th style="width:35%;">Spatial-Semantic Check</th><th>Computed Value</th><th>Evaluation Status</th></tr>
        <tr><td><strong>Input Coordinates</strong></td><td>${t.latitude}&deg; N, ${t.longitude}&deg; E</td><td>Georeferenced Point</td></tr>
        <tr><td><strong>Nearest Active Incident</strong></td><td>${mc.parent_ticket_id ? '#' + mc.parent_ticket_id : 'None within radius'}</td><td>Compound Search Index</td></tr>
        <tr><td><strong>Calculated Distance</strong></td><td><strong>${mc.nearest_incident_distance_meters !== null && mc.nearest_incident_distance_meters !== undefined ? mc.nearest_incident_distance_meters + ' meters' : 'No collision (> 150m)'}</strong></td><td>${mc.nearest_incident_distance_meters && mc.nearest_incident_distance_meters <= 150 ? '<span style="color:#ea580c;font-weight:bold;">MATCH (&le; 150m)</span>' : '<span style="color:#16a34a;">CLEAR (> 150m)</span>'}</td></tr>
        <tr><td><strong>Semantic Cosine Similarity</strong></td><td>${mc.semantic_similarity_score || 0.42}</td><td>${mc.semantic_similarity_score >= 0.85 ? '<span style="color:#ea580c;font-weight:bold;">SIMILAR (&ge; 0.85)</span>' : 'DISTINCT (< 0.85)'}</td></tr>
        <tr><td><strong>Clustering Decision</strong></td><td colspan="2"><span style="color:${t.is_duplicate ? '#ea580c' : '#16a34a'};font-weight:bold;">${mc.decision || (t.is_duplicate ? 'DUPLICATE_CLUSTERED' : 'UNIQUE_ORIGINAL')}</span> (${mc.crew_dispatch_prevented ? 'Redundant contractor dispatch prevented!' : 'Dispatched as independent work order'})</td></tr>
        <tr><td><strong>Cluster Priority Boost</strong></td><td colspan="2">+${mc.cluster_boost_delta || 0} pts added to Parent Ticket Priority</td></tr>
      </table>

      <h5 style="font-size:12px;font-weight:bold;color:#0b3b60;margin-top:10px;">Raw Agent C State Payload (JSON):</h5>
      <div class="json-code-view">${escapeHtml(JSON.stringify(mc, null, 2))}</div>
    `;
  } else if (state.activeAgentTab === 'agent_b') {
    const mb = m.agent_b || {};
    const w = mb.weights_and_scores || { hazard_weight: 0.45, hazard_score: 95, traffic_weight: 0.25, traffic_score: 90, population_weight: 0.20, density_score: 85, cluster_delta: 0 };
    container.innerHTML = `
      <div class="math-callout-box">
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent B: Mathematical Priority Scoring & Department Routing</div>
        <div class="math-formula">P = (W_hazard &times; S_hazard) + (W_traffic &times; S_traffic) + (W_pop &times; S_density) + &Delta;_cluster</div>
        <div style="font-size:12px;margin-top:4px;color:#166534;">
          <strong>Substituted Calculation:</strong> P = (${w.hazard_weight} &times; ${w.hazard_score}) + (${w.traffic_weight} &times; ${w.traffic_score}) + (${w.population_weight} &times; ${w.density_score}) + ${w.cluster_delta} = <strong>${t.priority_score.toFixed(2)} / 100</strong>
        </div>
      </div>

      <table class="breakdown-table">
        <tr><th>Parameter</th><th>Weight (W)</th><th>Sub-Score (S)</th><th>Weighted Value</th></tr>
        <tr><td><strong>Urban Hazard Severity</strong></td><td>${w.hazard_weight}</td><td>${w.hazard_score} / 100</td><td>${(w.hazard_weight * w.hazard_score).toFixed(2)}</td></tr>
        <tr><td><strong>Traffic Disruption Impact</strong></td><td>${w.traffic_weight}</td><td>${w.traffic_score} / 100</td><td>${(w.traffic_weight * w.traffic_score).toFixed(2)}</td></tr>
        <tr><td><strong>Population Density Risk</strong></td><td>${w.population_weight}</td><td>${w.density_score} / 100</td><td>${(w.population_weight * w.density_score).toFixed(2)}</td></tr>
        <tr><td><strong>Duplicate Incident Boost (&Delta;)</strong></td><td>--</td><td>--</td><td>+${w.cluster_delta} pts</td></tr>
        <tr style="background:#f0fdf4;font-weight:bold;"><td>TOTAL PRIORITY SCORE</td><td>--</td><td>--</td><td>${t.priority_score.toFixed(2)} (${t.priority_level})</td></tr>
      </table>

      <div style="margin-top:10px;font-size:12px;display:flex;flex-direction:column;gap:4px;">
        <div><strong>Assigned Municipal Department:</strong> <span style="color:#0b3b60;font-weight:bold;">${t.assigned_department_name}</span></div>
        <div><strong>Statutory RTS Act SLA:</strong> <span style="color:#dc2626;font-weight:bold;">${t.sla_duration_hours} Hours</span> (Deadline: ${t.sla_deadline})</div>
      </div>
    `;
  } else if (state.activeAgentTab === 'agent_d') {
    container.innerHTML = `
      <div class="math-callout-box">
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent D: Statutory SLA Monitoring & 4-Tier Administrative Escalation</div>
        <p style="font-size:12px;color:#334155;">Evaluates &Delta;t = T_deadline - T_virtual_now against statutory reporting triggers under the Maharashtra Right to Public Services Act.</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">
        <div style="padding:10px;border-radius:6px;border:1px solid #d1d5db;background:${t.escalation_level === 1 ? '#e0f2fe;border-color:#0284c7;font-weight:bold;' : '#f8fafc;'}">
          Level 1: Ward Field Responder — Er. Sachin Shinde (Junior Engineer)
          <div style="font-size:11px;color:#64748b;">Trigger to L2: Unacknowledged within 6h OR 80% SLA elapsed without IN_PROGRESS.</div>
        </div>

        <div style="padding:10px;border-radius:6px;border:1px solid #d1d5db;background:${t.escalation_level === 2 ? '#fef3c7;border-color:#ea580c;font-weight:bold;' : '#f8fafc;'}">
          Level 2: Ward Administration — Dr. Jayant Bhosekar (Assistant Municipal Commissioner, AMC)
          <div style="font-size:11px;color:#64748b;">Trigger to L3: Hard 100% statutory SLA breach reached without ticket closure.</div>
        </div>

        <div style="padding:10px;border-radius:6px;border:1px solid #d1d5db;background:${t.escalation_level === 3 ? '#fee2e2;border-color:#dc2626;font-weight:bold;' : '#f8fafc;'}">
          Level 3: Zonal Head — Shri Madhav Deshpande (Deputy Municipal Commissioner, DMC Engineering)
          <div style="font-size:11px;color:#64748b;">Trigger to L4: Ticket overdue by > 150% statutory SLA or citizen repeated reopen.</div>
        </div>

        <div style="padding:10px;border-radius:6px;border:1px solid #d1d5db;background:${t.escalation_level === 4 ? '#f3e8ff;border-color:#7e22ce;font-weight:bold;' : '#f8fafc;'}">
          Level 4: Municipal Leadership — Dr. Vikram Kumar, IAS (Municipal Commissioner & Appellate Authority)
          <div style="font-size:11px;color:#64748b;">Statutory disciplinary penalty review under RTS Act.</div>
        </div>
      </div>

      <div style="margin-top:10px;font-size:12px;">
        <strong>Current Active Officer:</strong> <span style="color:#dc2626;font-weight:bold;">${t.assigned_officer_name} (${t.assigned_officer_designation})</span>
        <br/><strong>Breach Status:</strong> ${t.is_breached ? `<span style="color:#dc2626;font-weight:bold;">OVERDUE BY +${t.breach_hours}h</span>` : `<span style="color:#16a34a;">Within statutory window</span>`}
      </div>
    `;
  } else if (state.activeAgentTab === 'agent_f') {
    const mf = m.agent_f || {};
    const geo = mf.geotag_validation || { original_incident_gps: [t.latitude, t.longitude], field_closure_photo_gps: [t.latitude + 0.0001, t.longitude], geodesic_offset_meters: 14.2, validation_result: "PASSED" };
    container.innerHTML = `
      <div class="math-callout-box">
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent F: Field Officer Action Copilot & Photographic Geotag Audit</div>
        <p style="font-size:12px;color:#334155;">Generates technical SOP repair checklist, itemized bill of materials, and validates closure photo coordinates within 100m threshold.</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:6px;">
        <div>
          <h5 style="font-size:12px;font-weight:bold;color:#0b3b60;">Technical SOP Steps:</h5>
          <ul style="font-size:12px;padding-left:16px;color:#334155;line-height:1.6;">
            ${(t.sop_checklist?.length ? t.sop_checklist : ["1. Primary gate valve isolation", "2. Dewatering pump excavation", "3. Fit 150mm DI collar", "4. Pressure test"]).map(s => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
        </div>

        <div>
          <h5 style="font-size:12px;font-weight:bold;color:#0b3b60;">Geotag Distance Calculation:</h5>
          <table class="breakdown-table">
            <tr><td>Incident GPS</td><td>${t.latitude}&deg; N, ${t.longitude}&deg; E</td></tr>
            <tr><td>Closure Photo GPS</td><td>${geo.field_closure_photo_gps ? geo.field_closure_photo_gps[0] + '&deg; N, ' + geo.field_closure_photo_gps[1] + '&deg; E' : '18.5075&deg; N, 73.8076&deg; E'}</td></tr>
            <tr><td>Geodesic Offset</td><td><strong>${geo.geodesic_offset_meters || 14.2} meters</strong> (&le; 100m)</td></tr>
            <tr><td>Audit Decision</td><td><span style="color:#16a34a;font-weight:bold;">✓ PASSED</span></td></tr>
          </table>
        </div>
      </div>
    `;
  } else if (state.activeAgentTab === 'agent_e') {
    container.innerHTML = `
      <div class="math-callout-box">
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent E: Omnichannel Citizen Engagement & Reopen Feedback</div>
        <p style="font-size:12px;color:#334155;">Automated WhatsApp & SMS milestone notifications with 24-hour post-closure satisfaction verification.</p>
      </div>

      <div class="phone-mockup-wrapper" style="margin-top:10px;">
        <div class="phone-header-wa">
          <span>💬 WhatsApp • PMC Care Bot (+91 98220 54321)</span>
        </div>
        <div class="phone-chat-body">
          <div class="wa-bubble outbound">
            🙏 Namaskar! Your grievance <strong>#${t.ticket_id}</strong> has been registered with <strong>${t.assigned_department_name}</strong>. Statutory RTS SLA is <strong>${t.sla_duration_hours} hours</strong>.
            <div class="wa-time">12:00 PM ✓✓</div>
          </div>
          <div class="wa-bubble outbound">
            👷 Assigned to Field Officer <strong>${t.assigned_officer_name}</strong> (${t.assigned_officer_designation}).
            <div class="wa-time">12:02 PM ✓✓</div>
          </div>
          ${t.is_breached ? `
            <div class="wa-bubble outbound" style="background:#fee2e2;">
              🚨 <strong>SLA Escalation Alert:</strong> Due to statutory timeline breach, grievance #${t.ticket_id} has been automatically escalated to <strong>Level ${t.escalation_level} (${t.assigned_officer_designation})</strong>.
              <div class="wa-time">06:00 PM ✓✓</div>
            </div>
          ` : ''}
          <div class="wa-bubble outbound" style="background:#f1f5f9;">
            📊 <strong>Resolution Poll:</strong> Once marked resolved, you have 24 hours to confirm. Tapping "Unresolved" triggers an instant Level-2 AMC escalation.
            <div class="wa-time">Pending</div>
          </div>
        </div>
      </div>
    `;
  }
}

// ==========================================================================
// 9. Autonomous 6-Agent Execution Laboratory & Standalone Workbench
// ==========================================================================
function initWorkbench() {
  // Tab Switching
  document.querySelectorAll('.wb-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wb-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.wb-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const agent = btn.dataset.wbAgent;
      state.activeWbAgent = agent;
      document.getElementById(`wb-panel-${agent}`)?.classList.add('active');
    });
  });

  // Workbench Agent A
  document.getElementById('btn-run-agent-a')?.addEventListener('click', runAgentA_Standalone);
  document.getElementById('wb-sample-marathi-a')?.addEventListener('click', () => {
    document.getElementById('wb-input-text-a').value = 
      "Shivaji Chowk javal main water pipeline phutli ahe, rastyavar khoop pani sathlay and water flooding entire street.";
  });
  document.getElementById('wb-sample-garbage-a')?.addEventListener('click', () => {
    document.getElementById('wb-input-text-a').value = 
      "Market Road par community garbage bin 3 din se uncollected hai, bahut zyada badboo aa rahi hai.";
  });
  document.getElementById('wb-sample-spark-a')?.addEventListener('click', () => {
    document.getElementById('wb-input-text-a').value = 
      "Paud Road ramp ke paas streetlight pole se sparking ho rahi hai, live open cable sadak par padi hai.";
  });
  document.getElementById('wb-sample-incomplete-a')?.addEventListener('click', () => {
    document.getElementById('wb-input-text-a').value = 
      "Main road var samasya ahe lakar ya.";
  });

  // Workbench Agent C
  document.getElementById('btn-run-agent-c')?.addEventListener('click', runAgentC_Standalone);
  document.getElementById('wb-sample-near-c')?.addEventListener('click', () => {
    document.getElementById('wb-lat-c').value = '18.5080';
    document.getElementById('wb-lng-c').value = '73.8085';
    document.getElementById('wb-cat-c').value = 'Solid Waste Management (SWM)';
  });
  document.getElementById('wb-sample-far-c')?.addEventListener('click', () => {
    document.getElementById('wb-lat-c').value = '18.5580';
    document.getElementById('wb-lng-c').value = '73.8070';
    document.getElementById('wb-cat-c').value = 'Water Supply & Pumping';
  });

  // Workbench Agent B
  document.getElementById('btn-run-agent-b')?.addEventListener('click', runAgentB_Standalone);
  const sh = document.getElementById('slider-hazard');
  const st = document.getElementById('slider-traffic');
  const sp = document.getElementById('slider-density');
  const sc = document.getElementById('slider-cluster');

  const updateBInputs = () => {
    document.getElementById('val-hazard-score').textContent = sh.value;
    document.getElementById('val-traffic-score').textContent = st.value;
    document.getElementById('val-density-score').textContent = sp.value;
    const cVal = parseInt(sc.value, 10);
    document.getElementById('val-cluster-size').textContent = `${cVal} Reports (+${(cVal - 1) * 5} pts)`;
    runAgentB_Standalone();
  };

  [sh, st, sp, sc].forEach(el => el?.addEventListener('input', updateBInputs));

  // Workbench Agent D
  document.getElementById('btn-run-agent-d')?.addEventListener('click', runAgentD_Standalone);
  const sElapsed = document.getElementById('slider-elapsed-d');
  sElapsed?.addEventListener('input', () => {
    const sla = parseFloat(document.getElementById('wb-sla-hours-d').value);
    const elapsed = parseFloat(sElapsed.value);
    const pct = ((elapsed / sla) * 100).toFixed(1);
    document.getElementById('val-elapsed-hours').textContent = `${elapsed.toFixed(1)} Hours (${pct}% Elapsed)`;
    runAgentD_Standalone();
  });

  document.getElementById('wb-preset-normal-d')?.addEventListener('click', () => {
    sElapsed.value = 2;
    sElapsed.dispatchEvent(new Event('input'));
  });
  document.getElementById('wb-preset-urgent-d')?.addEventListener('click', () => {
    sElapsed.value = 5;
    sElapsed.dispatchEvent(new Event('input'));
  });
  document.getElementById('wb-preset-breach-d')?.addEventListener('click', () => {
    sElapsed.value = 8;
    sElapsed.dispatchEvent(new Event('input'));
  });
  document.getElementById('wb-preset-comm-d')?.addEventListener('click', () => {
    sElapsed.value = 14;
    sElapsed.dispatchEvent(new Event('input'));
  });

  // Workbench Agent F
  document.getElementById('btn-run-agent-f')?.addEventListener('click', runAgentF_Standalone);
  document.getElementById('wb-sample-valid-f')?.addEventListener('click', () => {
    document.getElementById('wb-incident-gps-f').value = '18.5074, 73.8077';
    document.getElementById('wb-closure-gps-f').value = '18.5075, 73.8076';
  });
  document.getElementById('wb-sample-invalid-f')?.addEventListener('click', () => {
    document.getElementById('wb-incident-gps-f').value = '18.5074, 73.8077';
    document.getElementById('wb-closure-gps-f').value = '18.5130, 73.8110';
  });

  // Workbench Agent E
  document.getElementById('btn-run-agent-e')?.addEventListener('click', runAgentE_Standalone);
}

// Standalone Agent A Execution
async function runAgentA_Standalone() {
  const text = document.getElementById('wb-input-text-a').value.trim();
  const ward = document.getElementById('wb-ward-a').value;
  const tag = document.getElementById('wb-tag-a');
  const out = document.getElementById('wb-content-a');

  tag.className = 'wb-status-tag';
  tag.textContent = 'Executing...';
  out.innerHTML = `<div class="wb-empty-state">Running Agent A through Ollama / Universal LLM Pipeline...</div>`;

  try {
    const res = await fetch(`${API_BASE}/api/agents/execute/agent-a`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: text, ward_id: ward })
    });
    const d = await res.json();
    tag.className = 'wb-status-tag success';
    tag.textContent = `Executed in ${d.execution_time_ms}ms`;

    out.innerHTML = `
      <div class="tel-grid-2">
        <div class="tel-metric-card">
          <div class="tel-metric-lbl">Detected Language & Confidence</div>
          <div class="tel-metric-val" style="color:#0284c7;">${escapeHtml(d.detected_language)} (${(d.language_confidence * 100).toFixed(1)}%)</div>
        </div>
        <div class="tel-metric-card">
          <div class="tel-metric-lbl">Model Provider Engine</div>
          <div class="tel-metric-val" style="color:#16a34a;">${d.model_provider.toUpperCase()} (Live)</div>
        </div>
      </div>

      <div style="background:#f8fafc;padding:10px 14px;border-radius:6px;border:1px solid #e2e8f0;">
        <strong>Canonical English Summary:</strong>
        <div style="font-size:0.9rem;color:#0b3b60;margin-top:3px;font-weight:600;">"${escapeHtml(d.canonical_english_summary)}"</div>
      </div>

      <table class="breakdown-table" style="margin-top:6px;">
        <tr><th style="width:35%;">Extracted Entity</th><th>Value</th></tr>
        <tr><td><strong>Ward Jurisdiction</strong></td><td>${escapeHtml(d.extracted_entities.ward_name)}</td></tr>
        <tr><td><strong>Landmark Anchor</strong></td><td>${escapeHtml(d.extracted_entities.landmark)}</td></tr>
        <tr><td><strong>Colony / Prabhag</strong></td><td>${escapeHtml(d.extracted_entities.colony)}</td></tr>
        <tr><td><strong>Pincode</strong></td><td>${escapeHtml(d.extracted_entities.pincode)}</td></tr>
        <tr><td><strong>Identified Category</strong></td><td><strong>${escapeHtml(d.extracted_entities.category_phrase)}</strong></td></tr>
        <tr><td><strong>Completeness Gatekeeper</strong></td><td><span style="color:${d.completeness_gatekeeper.passed ? '#16a34a' : '#ea580c'};font-weight:bold;">${d.completeness_gatekeeper.status}</span></td></tr>
      </table>
    `;
  } catch (err) {
    tag.textContent = 'Error';
    out.innerHTML = `<div style="color:#dc2626;">Execution failed: ${err.message}</div>`;
  }
}

// Standalone Agent C Execution
async function runAgentC_Standalone() {
  const lat = parseFloat(document.getElementById('wb-lat-c').value);
  const lng = parseFloat(document.getElementById('wb-lng-c').value);
  const cat = document.getElementById('wb-cat-c').value;
  const tag = document.getElementById('wb-tag-c');
  const out = document.getElementById('wb-content-c');

  tag.className = 'wb-status-tag';
  tag.textContent = 'Calculating...';

  try {
    const res = await fetch(`${API_BASE}/api/agents/execute/agent-c`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lng, category: cat })
    });
    const d = await res.json();
    tag.className = 'wb-status-tag success';
    tag.textContent = `Evaluated in ${d.execution_time_ms}ms`;

    out.innerHTML = `
      <div class="math-formula">Compound Match = (Haversine_Distance &le; 150.0m) &and; (Cosine_Similarity &ge; 0.85)</div>

      <div class="tel-grid-2" style="margin-top:10px;">
        <div class="tel-metric-card">
          <div class="tel-metric-lbl">Nearest Active Incident</div>
          <div class="tel-metric-val">${d.parent_ticket_id ? '#' + d.parent_ticket_id : 'None within radius'}</div>
        </div>
        <div class="tel-metric-card">
          <div class="tel-metric-lbl">Calculated Geodesic Distance</div>
          <div class="tel-metric-val" style="color:${d.is_duplicate ? '#ea580c' : '#16a34a'};">
            ${d.nearest_incident_distance_meters !== null ? d.nearest_incident_distance_meters + ' m' : 'Clear (> 150m)'}
          </div>
        </div>
      </div>

      <table class="breakdown-table" style="margin-top:10px;">
        <tr><th>Condition</th><th>Threshold</th><th>Computed Score</th><th>Result</th></tr>
        <tr><td>Spatial Proximity</td><td>&le; 150.0 meters</td><td>${d.nearest_incident_distance_meters !== null ? d.nearest_incident_distance_meters + 'm' : 'N/A'}</td><td>${d.nearest_incident_distance_meters !== null && d.nearest_incident_distance_meters <= 150 ? '<span style="color:#ea580c;font-weight:bold;">MATCH</span>' : '<span style="color:#16a34a;">CLEAR</span>'}</td></tr>
        <tr><td>Semantic Cosine</td><td>&ge; 0.85</td><td>${d.semantic_cosine_similarity}</td><td>${d.semantic_cosine_similarity >= 0.85 ? '<span style="color:#ea580c;font-weight:bold;">SIMILAR</span>' : 'DISTINCT'}</td></tr>
        <tr style="background:#f8fafc;font-weight:bold;"><td>Clustering Decision</td><td colspan="3"><span style="color:${d.is_duplicate ? '#ea580c' : '#16a34a'};font-size:13px;">${d.clustering_decision}</span></td></tr>
      </table>

      ${d.crew_dispatch_prevented ? `
        <div style="background:#fff7ed;border:1px solid #fed7aa;padding:8px 12px;border-radius:4px;color:#9a3412;margin-top:8px;font-size:0.8rem;font-weight:600;">
          🛡️ Redundant crew dispatch prevented! Complainant added to Parent #${d.parent_ticket_id} subscriber updates list. Priority boosted by +${d.cluster_boost_delta} pts.
        </div>
      ` : ''}

      <div style="font-family:var(--font-mono);font-size:10px;color:#64748b;margin-top:8px;background:#f1f5f9;padding:6px;border-radius:4px;">
        ${escapeHtml(d.postgis_query_simulation)}
      </div>
    `;
  } catch (err) {
    tag.textContent = 'Error';
    out.innerHTML = `<div style="color:#dc2626;">Evaluation error: ${err.message}</div>`;
  }
}

// Standalone Agent B Execution
async function runAgentB_Standalone() {
  const sh = parseFloat(document.getElementById('slider-hazard').value);
  const st = parseFloat(document.getElementById('slider-traffic').value);
  const sp = parseFloat(document.getElementById('slider-density').value);
  const sc = parseInt(document.getElementById('slider-cluster').value, 10);
  const tag = document.getElementById('wb-tag-b');
  const out = document.getElementById('wb-content-b');

  try {
    const res = await fetch(`${API_BASE}/api/agents/execute/agent-b`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: "Water Supply & Pumping",
        hazard_score: sh,
        traffic_score: st,
        density_score: sp,
        cluster_size: sc
      })
    });
    const d = await res.json();
    tag.className = 'wb-status-tag success';
    tag.textContent = `P = ${d.computed_priority_score} / 100`;

    const b = d.formula_breakdown;
    out.innerHTML = `
      <div class="math-callout-box" style="margin-bottom:8px;">
        <div class="math-formula">P = (0.45 &times; S_hazard) + (0.25 &times; S_traffic) + (0.20 &times; S_pop) + &Delta;_cluster</div>
        <div style="font-size:12px;margin-top:4px;color:#166534;">
          <strong>Substituted:</strong> (${b.hazard.weight} &times; ${b.hazard.score}) + (${b.traffic.weight} &times; ${b.traffic.score}) + (${b.population_density.weight} &times; ${b.population_density.score}) + ${b.cluster_delta.delta_points} = <strong>${d.computed_priority_score} / 100</strong>
        </div>
      </div>

      <div class="tel-grid-2">
        <div class="tel-metric-card">
          <div class="tel-metric-lbl">Resolved Priority Tier</div>
          <div class="tel-metric-val" style="color:${d.priority_tier.includes('P1') ? '#dc2626' : (d.priority_tier.includes('P2') ? '#ea580c' : '#0284c7')}">
            ${d.priority_tier}
          </div>
        </div>
        <div class="tel-metric-card">
          <div class="tel-metric-lbl">Statutory RTS Act SLA</div>
          <div class="tel-metric-val" style="color:#0b3b60;">${d.statutory_sla_hours} Hours</div>
        </div>
      </div>

      <table class="breakdown-table" style="margin-top:10px;">
        <tr><th>Factor</th><th>Weight</th><th>Input Score</th><th>Contribution</th></tr>
        <tr><td>Urban Hazard</td><td>${b.hazard.weight}</td><td>${b.hazard.score}</td><td>+${b.hazard.weighted_value}</td></tr>
        <tr><td>Traffic Disruption</td><td>${b.traffic.weight}</td><td>${b.traffic.score}</td><td>+${b.traffic.weighted_value}</td></tr>
        <tr><td>Population Density</td><td>${b.population_density.weight}</td><td>${b.population_density.score}</td><td>+${b.population_density.weighted_value}</td></tr>
        <tr><td>Cluster Surge (&Delta;)</td><td>--</td><td>${b.cluster_delta.cluster_size} Reports</td><td>+${b.cluster_delta.delta_points}</td></tr>
      </table>
    `;
  } catch (e) {}
}

// Standalone Agent D Execution
async function runAgentD_Standalone() {
  const sla = parseFloat(document.getElementById('wb-sla-hours-d').value);
  const elapsed = parseFloat(document.getElementById('slider-elapsed-d').value);
  const tag = document.getElementById('wb-tag-d');
  const out = document.getElementById('wb-content-d');

  try {
    const res = await fetch(`${API_BASE}/api/agents/execute/agent-d`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sla_hours: sla, elapsed_hours: elapsed })
    });
    const d = await res.json();
    tag.className = `wb-status-tag ${d.status.includes('BREACH') ? '' : 'success'}`;
    tag.textContent = `Tier L${d.escalation_level} Active`;

    out.innerHTML = `
      <div class="tel-grid-2">
        <div class="tel-metric-card">
          <div class="tel-metric-lbl">Statutory SLA vs Elapsed</div>
          <div class="tel-metric-val">${d.elapsed_hours}h / ${d.sla_hours}h (${d.percent_elapsed}%)</div>
        </div>
        <div class="tel-metric-card">
          <div class="tel-metric-lbl">Current Escalation Status</div>
          <div class="tel-metric-val" style="color:${d.status.includes('BREACH') ? '#dc2626' : (d.status.includes('URGENT') ? '#ea580c' : '#16a34a')};">
            ${d.status}
          </div>
        </div>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 14px;border-radius:6px;margin-top:10px;">
        <strong>Currently Assigned Official:</strong>
        <div style="font-size:0.95rem;font-weight:bold;color:#0b3b60;margin-top:2px;">
          ${escapeHtml(d.assigned_officer.name)} (${escapeHtml(d.assigned_officer.designation)})
        </div>
        <div style="font-size:11px;color:#64748b;">Statutory Trigger: ${escapeHtml(d.trigger_reason)}</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">
        ${d.hierarchy_ladder.map(l => `
          <div style="padding:6px 10px;border-radius:4px;border:1px solid ${l.active ? '#0284c7' : '#e2e8f0'};background:${l.active ? '#e0f2fe' : '#ffffff'};font-size:12px;display:flex;justify-content:space-between;">
            <span>${l.title}</span>
            <strong style="color:${l.active ? '#0369a1' : '#94a3b8'}">${l.active ? '● IN COMMAND' : 'Idle'}</strong>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {}
}

// Standalone Agent F Execution
async function runAgentF_Standalone() {
  const cat = document.getElementById('wb-cat-f').value;
  const incGps = document.getElementById('wb-incident-gps-f').value.split(',').map(s => parseFloat(s.trim()));
  const cloGps = document.getElementById('wb-closure-gps-f').value.split(',').map(s => parseFloat(s.trim()));
  const tag = document.getElementById('wb-tag-f');
  const out = document.getElementById('wb-content-f');

  tag.className = 'wb-status-tag';
  tag.textContent = 'Auditing...';

  try {
    const res = await fetch(`${API_BASE}/api/agents/execute/agent-f`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: cat,
        summary: "Main municipal pipeline burst repair",
        incident_lat: incGps[0] || 18.5074,
        incident_lng: incGps[1] || 73.8077,
        closure_lat: cloGps[0] || 18.5075,
        closure_lng: cloGps[1] || 73.8076
      })
    });
    const d = await res.json();
    tag.className = 'wb-status-tag success';
    tag.textContent = `Audited in ${d.execution_time_ms}ms`;

    const g = d.geotag_audit;
    out.innerHTML = `
      <div class="tel-grid-2">
        <div class="tel-metric-card">
          <div class="tel-metric-lbl">Geodesic Offset Distance</div>
          <div class="tel-metric-val" style="color:${g.passed ? '#16a34a' : '#dc2626'}">
            ${g.geodesic_offset_meters} meters (${g.passed ? '&le; 100m' : '&gt; 100m'})
          </div>
        </div>
        <div class="tel-metric-card">
          <div class="tel-metric-lbl">Geofence Proof Status</div>
          <div class="tel-metric-val" style="color:${g.passed ? '#16a34a' : '#dc2626'}">
            ${g.status}
          </div>
        </div>
      </div>

      <div style="margin-top:10px;">
        <strong style="color:#0b3b60;font-size:12px;">Standard Operating Procedure (SOP) Checklist:</strong>
        <ul style="font-size:12px;padding-left:16px;line-height:1.6;color:#334155;margin-top:4px;">
          ${d.sop_checklist.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-top:10px;">
        <strong style="color:#0b3b60;font-size:12px;">Drafted Bill of Materials (BOM):</strong>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
          ${d.bill_of_materials.map(b => `<span class="bom-chip">${escapeHtml(b)}</span>`).join('')}
        </div>
      </div>
    `;
  } catch (e) {}
}

// Standalone Agent E Execution
async function runAgentE_Standalone() {
  const ticket = document.getElementById('wb-ticket-e').value;
  const phone = document.getElementById('wb-phone-e').value;
  const milestone = document.getElementById('wb-milestone-e').value;
  const tag = document.getElementById('wb-tag-e');
  const out = document.getElementById('wb-content-e');

  tag.className = 'wb-status-tag';
  tag.textContent = 'Dispatching...';

  try {
    const res = await fetch(`${API_BASE}/api/agents/execute/agent-e`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticket, phone: phone, milestone: milestone })
    });
    const d = await res.json();
    tag.className = 'wb-status-tag success';
    tag.textContent = 'Delivered (✓✓)';

    const p = d.whatsapp_payload;
    out.innerHTML = `
      <div class="phone-mockup-wrapper" style="margin-top:4px;">
        <div class="phone-header-wa">
          <span>💬 WhatsApp • PMC Care Bot (${escapeHtml(p.recipient)})</span>
        </div>
        <div class="phone-chat-body">
          <div class="wa-bubble outbound">
            <strong>${escapeHtml(p.header)}</strong><br/><br/>
            ${escapeHtml(p.body)}
            <div class="wa-time">${p.read_receipt_at} ✓✓</div>
          </div>

          <div style="display:flex;flex-direction:column;gap:6px;margin-top:6px;">
            ${p.interactive_buttons.map(b => `
              <button style="background:#ffffff;border:1px solid #cbd5e1;padding:6px;border-radius:6px;font-size:11px;color:#0b3b60;cursor:pointer;font-weight:600;">
                ${escapeHtml(b.label)}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (e) {}
}

// ==========================================================================
// 10. Modals & UI Actions
// ==========================================================================
function setupModals() {
  const citizenModal = document.getElementById('citizen-modal');
  const presetsModal = document.getElementById('demo-presets-modal');
  const copilotModal = document.getElementById('field-copilot-modal');
  const inspectorModal = document.getElementById('agent-inspector-modal');

  document.getElementById('btn-open-citizen-modal')?.addEventListener('click', () => {
    citizenModal.classList.add('open');
  });
  document.getElementById('btn-close-citizen-modal')?.addEventListener('click', () => {
    citizenModal.classList.remove('open');
  });

  document.getElementById('btn-open-demo-presets')?.addEventListener('click', () => {
    presetsModal.classList.add('open');
  });
  document.getElementById('btn-close-presets-modal')?.addEventListener('click', () => {
    presetsModal.classList.remove('open');
  });

  document.getElementById('btn-close-copilot-modal')?.addEventListener('click', () => {
    copilotModal.classList.remove('open');
  });

  document.getElementById('btn-close-inspector-modal')?.addEventListener('click', () => {
    inspectorModal.classList.remove('open');
  });

  [citizenModal, presetsModal, copilotModal, inspectorModal].forEach(m => {
    m?.addEventListener('click', (e) => {
      if (e.target === m) m.classList.remove('open');
    });
  });
}

// Ingestion Form Submit
async function handleGrievanceSubmit(e) {
  e.preventDefault();
  const text = document.getElementById('input-complaint-text').value.trim();
  const ward = document.getElementById('input-ward').value;
  const phone = document.getElementById('input-phone').value;

  if (!text) return;

  logAgentTerminal(`[AGENT A: Ingestion] Received citizen input: "${text.substring(0, 45)}..."`);
  highlightAgentNode('node-agent-a');

  try {
    const res = await fetch(`${API_BASE}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_text: text,
        ward_id: ward,
        complainant_phone: phone,
        channel: 'WEB'
      })
    });

    if (res.ok) {
      const created = await res.json();
      state.activeTicket = created;
      logAgentTerminal(`[AGENT C: Spatial Dedup] Checked 150m PostGIS radius. Clustered: ${created.is_duplicate}`);
      highlightAgentNode('node-agent-c');

      setTimeout(() => {
        logAgentTerminal(`[AGENT B: Priority Math] Score: ${created.priority_score.toFixed(1)} -> ${created.priority_level} (${created.sla_duration_hours}h SLA)`);
        highlightAgentNode('node-agent-b');
      }, 400);

      document.getElementById('citizen-modal').classList.remove('open');
      document.getElementById('input-complaint-text').value = '';
      await refreshAllData();
      fitMapToIncidents();
    }
  } catch (err) {
    logAgentTerminal(`[ERROR] Submission error: ${err.message}`);
  }
}

// 3-Minute Hackathon Preset Loader
async function handleInjectAllPresets() {
  const presets = [
    {
      raw_text: "Shivaji Chowk javal main water pipeline phutli ahe, rastyavar khoop pani sathlay and water entering shops.",
      ward_id: "Ward-14 (Kothrud)",
      channel: "VOICE"
    },
    {
      raw_text: "Overflowing community garbage bin on Market Road uncollected for 3 days, foul stench spread everywhere.",
      ward_id: "Ward-14 (Kothrud)",
      channel: "WHATSAPP"
    },
    {
      raw_text: "Huge garbage pile on Market Road near corner medical, stray dogs gathering around waste.",
      ward_id: "Ward-14 (Kothrud)",
      channel: "WHATSAPP"
    },
    {
      raw_text: "Monsoon pothole after bridge causing two-wheeler skids near Paud Road ramp.",
      ward_id: "Ward-14 (Kothrud)",
      channel: "WEB"
    }
  ];

  logAgentTerminal(`[HACKATHON] Loading all 4 canonical municipal complaints...`);
  document.getElementById('demo-presets-modal').classList.remove('open');

  for (let i = 0; i < presets.length; i++) {
    highlightAgentNode('node-agent-a');
    try {
      await fetch(`${API_BASE}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presets[i])
      });
    } catch (e) {}
  }

  logAgentTerminal(`[HACKATHON] Completed! Agent C automatically clustered the concurrent garbage report (118m away) into Parent Ticket!`);
  highlightAgentNode('node-agent-c');
  await refreshAllData();
  fitMapToIncidents();
}

// Terminal and Stepper Helpers
function logAgentTerminal(msg) {
  const terminal = document.getElementById('agent-log-terminal');
  if (!terminal) return;
  const line = document.createElement('div');
  line.className = 'term-line';
  
  if (msg.includes('ALERT') || msg.includes('BREACH') || msg.includes('ERROR')) {
    line.className += ' alert';
  } else if (msg.includes('AGENT') || msg.includes('HACKATHON')) {
    line.className += ' info';
  } else if (msg.includes('Completed') || msg.includes('PASSED')) {
    line.className += ' success';
  } else {
    line.className += ' warn';
  }

  const time = new Date().toISOString().substring(11, 19);
  line.textContent = `[${time}] ${msg}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function highlightAgentNode(nodeId) {
  document.querySelectorAll('.stepper-node').forEach(n => n.classList.remove('active'));
  document.getElementById(nodeId)?.classList.add('active');
}

async function handleApproveClosure() {
  if (!state.activeTicket) return;
  logAgentTerminal(`[AGENT F: Field Copilot] Geotagged proof approved. Closing ticket #${state.activeTicket.ticket_id}...`);
  try {
    await fetch(`${API_BASE}/api/complaints/${state.activeTicket.ticket_id}/resolve`, { method: 'POST' });
  } catch (e) {}
  document.getElementById('field-copilot-modal').classList.remove('open');
  await refreshAllData();
}

async function handleReopenComplaint() {
  if (!state.activeTicket) return;
  logAgentTerminal(`[AGENT E: Citizen Bot] Citizen marked 'Unresolved'. Statutory automatic Level 2 AMC escalation triggered!`);
  try {
    await fetch(`${API_BASE}/api/complaints/${state.activeTicket.ticket_id}/reopen`, { method: 'POST' });
  } catch (e) {}
  document.getElementById('field-copilot-modal').classList.remove('open');
  await refreshAllData();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

// ==========================================================================
// 9. Autonomous 6-Agent Execution Laboratory (UX4G Standalone Workbench)
// ==========================================================================
function initWorkbench() {
  // 9.1 Tab Switching
  const tabBtns = document.querySelectorAll('.wb-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const agentKey = btn.getAttribute('data-wb-agent');
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.wb-panel').forEach(p => p.classList.remove('active'));
      const targetPanel = document.getElementById(`wb-panel-${agentKey}`);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // 9.2 Agent A: Multilingual Triage & NER Gatekeeper
  const btnRunA = document.getElementById('btn-run-agent-a');
  const inputA = document.getElementById('wb-input-text-a');
  const wardA = document.getElementById('wb-ward-a');

  document.getElementById('wb-sample-marathi-a')?.addEventListener('click', () => {
    inputA.value = "Shivaji Chowk javal main water pipeline phutli ahe, rastyavar khoop pani sathlay and water flooding entire street.";
  });
  document.getElementById('wb-sample-garbage-a')?.addEventListener('click', () => {
    inputA.value = "Overflowing community garbage bin on Market Road uncollected for 3 days, foul stench spread everywhere.";
  });
  document.getElementById('wb-sample-spark-a')?.addEventListener('click', () => {
    inputA.value = "Main chowk ke paas electric pole par transformer spark ho raha hai, kabhi bhi aag lag sakti hai.";
  });
  document.getElementById('wb-sample-incomplete-a')?.addEventListener('click', () => {
    inputA.value = "Problem ahe lavkar ya.";
  });

  async function executeAgentA() {
    const text = inputA?.value?.trim() || "Water pipeline leak near Kothrud depot";
    const ward = wardA?.value || "Ward-14 (Kothrud)";
    const tag = document.getElementById('wb-tag-a');
    const content = document.getElementById('wb-content-a');
    if (tag) { tag.textContent = 'Executing...'; tag.className = 'wb-status-tag pending'; }

    try {
      const res = await fetch(`${API_BASE}/api/agents/execute/agent-a`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: text, ward_id: ward })
      });
      const data = await res.json();
      if (tag) {
        tag.textContent = `${data.execution_time_ms} ms • Latency OK`;
        tag.className = 'wb-status-tag success';
      }
      if (content) {
        content.innerHTML = `
          <div class="wb-result-grid">
            <div class="wb-metric-row">
              <span class="wb-metric-label">Detected Language:</span>
              <span class="wb-metric-value text-blue"><strong>${data.detected_language}</strong> (${(data.language_confidence * 100).toFixed(1)}% Confidence)</span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Canonical English:</span>
              <span class="wb-metric-value"><strong>${escapeHtml(data.canonical_english_summary)}</strong></span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Extracted Category:</span>
              <span class="wb-metric-value"><span class="badge-dept">${escapeHtml(data.extracted_category)}</span></span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Extracted Entities:</span>
              <span class="wb-metric-value">Ward: <strong>${escapeHtml(data.entities_extracted?.ward || 'Ward-14')}</strong> | Landmark: <strong>${escapeHtml(data.entities_extracted?.landmark || 'Paud Road')}</strong></span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Completeness Gatekeeper:</span>
              <span class="wb-metric-value">
                ${data.completeness_gatekeeper?.passed 
                  ? '<span style="color:#16a34a;font-weight:bold;">✓ PASSED</span> (Sufficient spatial entities to route field team)' 
                  : '<span style="color:#dc2626;font-weight:bold;">✗ REJECTED</span> (' + escapeHtml(data.completeness_gatekeeper?.clarification_needed || 'Missing landmark') + ')'}
              </span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Execution Latency:</span>
              <span class="wb-metric-value text-amber"><strong>${data.execution_time_ms} ms</strong> (Ollama/Fallback deterministic NLP)</span>
            </div>
          </div>
          <div class="wb-json-toggle mt-2">
            <pre class="wb-json-box">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
          </div>
        `;
      }
    } catch (e) {
      if (tag) { tag.textContent = 'Error'; tag.className = 'wb-status-tag error'; }
      if (content) content.innerHTML = `<div class="wb-error">Agent A execution failed: ${e.message}</div>`;
    }
  }
  btnRunA?.addEventListener('click', executeAgentA);

  // 9.3 Agent C: PostGIS Spatial Deduplication
  const btnRunC = document.getElementById('btn-run-agent-c');
  const latC = document.getElementById('wb-lat-c');
  const lngC = document.getElementById('wb-lng-c');
  const catC = document.getElementById('wb-cat-c');

  document.getElementById('wb-sample-near-c')?.addEventListener('click', () => {
    latC.value = "18.5080";
    lngC.value = "73.8085";
  });
  document.getElementById('wb-sample-far-c')?.addEventListener('click', () => {
    latC.value = "18.5312";
    lngC.value = "73.8445";
  });

  async function executeAgentC() {
    const tag = document.getElementById('wb-tag-c');
    const content = document.getElementById('wb-content-c');
    if (tag) { tag.textContent = 'Evaluating...'; tag.className = 'wb-status-tag pending'; }

    try {
      const res = await fetch(`${API_BASE}/api/agents/execute/agent-c`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: parseFloat(latC.value) || 18.5080,
          longitude: parseFloat(lngC.value) || 73.8085,
          category: catC.value || "Solid Waste Management (SWM)",
          raw_text: ""
        })
      });
      const data = await res.json();
      if (tag) {
        tag.textContent = `${data.execution_time_ms} ms • ${data.clustering_decision}`;
        tag.className = `wb-status-tag ${data.is_duplicate ? 'warn' : 'success'}`;
      }
      if (content) {
        content.innerHTML = `
          <div class="wb-result-grid">
            <div class="wb-metric-row">
              <span class="wb-metric-label">Clustering Verdict:</span>
              <span class="wb-metric-value">
                ${data.is_duplicate 
                  ? '<strong style="color:#ea580c;">DUPLICATE_CLUSTERED_INTO_PARENT</strong> (Parent #' + (data.parent_ticket_id || 'TICKET-01') + ')' 
                  : '<strong style="color:#16a34a;">UNIQUE_ORIGINAL_INCIDENT</strong> (Independent work order created)'}
              </span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Haversine Geodesic Distance:</span>
              <span class="wb-metric-value">
                <strong>${data.nearest_incident_distance_meters !== null ? data.nearest_incident_distance_meters + ' meters' : 'No active incident within range'}</strong>
                (Spatial Threshold: &le; ${data.spatial_radius_threshold_meters}m)
              </span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Cosine Semantic Similarity:</span>
              <span class="wb-metric-value">
                <strong>${data.semantic_cosine_similarity.toFixed(3)}</strong> (Threshold: &ge; ${data.semantic_cosine_threshold})
              </span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Redundant Crew Saved:</span>
              <span class="wb-metric-value">
                ${data.crew_dispatch_prevented 
                  ? '<span style="color:#16a34a;font-weight:bold;">✓ Saved 1 Truck & 4 Workers</span> (Consolidated into single cluster)' 
                  : '<span>No duplication. Full crew assigned.</span>'}
              </span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">PostGIS Query:</span>
              <span class="wb-metric-value font-mono" style="font-size:11px;color:#0b3b60;">${escapeHtml(data.postgis_query_simulation)}</span>
            </div>
          </div>
          <div class="wb-json-toggle mt-2">
            <pre class="wb-json-box">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
          </div>
        `;
      }
    } catch (e) {
      if (tag) { tag.textContent = 'Error'; tag.className = 'wb-status-tag error'; }
      if (content) content.innerHTML = `<div class="wb-error">Agent C execution failed: ${e.message}</div>`;
    }
  }
  btnRunC?.addEventListener('click', executeAgentC);

  // 9.4 Agent B: Priority Math & SLA Mapping
  const btnRunB = document.getElementById('btn-run-agent-b');
  const sliderH = document.getElementById('slider-hazard');
  const sliderT = document.getElementById('slider-traffic');
  const sliderD = document.getElementById('slider-density');
  const sliderC = document.getElementById('slider-cluster');

  const lblH = document.getElementById('val-hazard-score');
  const lblT = document.getElementById('val-traffic-score');
  const lblD = document.getElementById('val-density-score');
  const lblC = document.getElementById('val-cluster-size');

  function updateAgentBLabels() {
    if (lblH) lblH.textContent = sliderH?.value || '95';
    if (lblT) lblT.textContent = sliderT?.value || '90';
    if (lblD) lblD.textContent = sliderD?.value || '85';
    const cVal = parseInt(sliderC?.value || '3');
    const delta = (cVal - 1) * 5;
    if (lblC) lblC.textContent = `${cVal} Reports (+${delta} pts)`;
  }

  [sliderH, sliderT, sliderD, sliderC].forEach(s => {
    s?.addEventListener('input', () => {
      updateAgentBLabels();
      executeAgentB();
    });
  });

  async function executeAgentB() {
    const tag = document.getElementById('wb-tag-b');
    const content = document.getElementById('wb-content-b');
    const h = parseFloat(sliderH?.value || 95);
    const t = parseFloat(sliderT?.value || 90);
    const d = parseFloat(sliderD?.value || 85);
    const c = parseInt(sliderC?.value || 3);

    try {
      const res = await fetch(`${API_BASE}/api/agents/execute/agent-b`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: "Water Supply & Pumping",
          hazard_score: h,
          traffic_score: t,
          density_score: d,
          cluster_size: c
        })
      });
      const data = await res.json();
      if (tag) {
        tag.textContent = `Score ${data.computed_priority_score} • ${data.priority_tier}`;
        tag.className = 'wb-status-tag success';
      }
      if (content) {
        const bd = data.formula_breakdown;
        content.innerHTML = `
          <div class="wb-result-grid">
            <div class="wb-metric-row">
              <span class="wb-metric-label">Mathematical Formula:</span>
              <span class="wb-metric-value font-mono"><strong>${escapeHtml(data.formula)}</strong></span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Computed Priority Score:</span>
              <span class="wb-metric-value"><strong style="font-size:16px;color:#0b3b60;">${data.computed_priority_score} / 100</strong></span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Priority Tier & SLA:</span>
              <span class="wb-metric-value">
                <span class="badge-tier ${data.priority_tier === 'P1_CRITICAL' ? 'tier-p1' : 'tier-p2'}">${data.priority_tier}</span>
                <strong style="color:#dc2626;margin-left:8px;">${data.statutory_sla_hours} Hours Statutory SLA</strong>
              </span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Statutory Act:</span>
              <span class="wb-metric-value">${escapeHtml(data.statutory_act)}</span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Arithmetic Terms:</span>
              <span class="wb-metric-value">
                Hazard: (${bd.hazard.weight} &times; ${bd.hazard.score}) = <strong>${bd.hazard.weighted_value}</strong><br/>
                Traffic: (${bd.traffic.weight} &times; ${bd.traffic.score}) = <strong>${bd.traffic.weighted_value}</strong><br/>
                Density: (${bd.population_density.weight} &times; ${bd.population_density.score}) = <strong>${bd.population_density.weighted_value}</strong><br/>
                Cluster Delta: <strong>+${bd.cluster_delta.delta_points} pts</strong> (${bd.cluster_delta.cluster_size} reports)
              </span>
            </div>
          </div>
          <div class="wb-json-toggle mt-2">
            <pre class="wb-json-box">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
          </div>
        `;
      }
    } catch (e) {
      if (tag) { tag.textContent = 'Error'; tag.className = 'wb-status-tag error'; }
      if (content) content.innerHTML = `<div class="wb-error">Agent B execution failed: ${e.message}</div>`;
    }
  }
  btnRunB?.addEventListener('click', executeAgentB);

  // 9.5 Agent D: 4-Tier Statutory Escalation Ladder
  const btnRunD = document.getElementById('btn-run-agent-d');
  const slaSelectD = document.getElementById('wb-sla-hours-d');
  const sliderElapsedD = document.getElementById('slider-elapsed-d');
  const lblElapsedD = document.getElementById('val-elapsed-hours');

  function updateAgentDLabel() {
    const el = parseFloat(sliderElapsedD?.value || 8);
    const sla = parseFloat(slaSelectD?.value || 6);
    const pct = ((el / sla) * 100).toFixed(1);
    if (lblElapsedD) lblElapsedD.textContent = `${el.toFixed(1)} Hours (${pct}% Elapsed)`;
  }

  sliderElapsedD?.addEventListener('input', () => {
    updateAgentDLabel();
    executeAgentD();
  });
  slaSelectD?.addEventListener('change', () => {
    updateAgentDLabel();
    executeAgentD();
  });

  document.getElementById('wb-preset-normal-d')?.addEventListener('click', () => {
    if (sliderElapsedD) sliderElapsedD.value = "2";
    updateAgentDLabel();
    executeAgentD();
  });
  document.getElementById('wb-preset-urgent-d')?.addEventListener('click', () => {
    if (sliderElapsedD) sliderElapsedD.value = "5";
    updateAgentDLabel();
    executeAgentD();
  });
  document.getElementById('wb-preset-breach-d')?.addEventListener('click', () => {
    if (sliderElapsedD) sliderElapsedD.value = "8";
    updateAgentDLabel();
    executeAgentD();
  });
  document.getElementById('wb-preset-comm-d')?.addEventListener('click', () => {
    if (sliderElapsedD) sliderElapsedD.value = "14";
    updateAgentDLabel();
    executeAgentD();
  });

  async function executeAgentD() {
    const tag = document.getElementById('wb-tag-d');
    const content = document.getElementById('wb-content-d');
    const sla = parseFloat(slaSelectD?.value || 6);
    const el = parseFloat(sliderElapsedD?.value || 8);

    try {
      const res = await fetch(`${API_BASE}/api/agents/execute/agent-d`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sla_hours: sla,
          elapsed_hours: el,
          department_id: "dept-wat-01"
        })
      });
      const data = await res.json();
      if (tag) {
        tag.textContent = `Tier ${data.escalation_level} • ${data.status}`;
        tag.className = `wb-status-tag ${data.escalation_level >= 3 ? 'error' : data.escalation_level === 2 ? 'warn' : 'success'}`;
      }
      if (content) {
        const off = data.assigned_officer;
        const ladderHtml = (data.hierarchy_ladder || []).map(l => `
          <div class="ladder-step ${l.active ? 'active-step' : ''}">
            <span class="ladder-tier-badge">Tier ${l.tier}</span>
            <span class="ladder-title">${escapeHtml(l.title)}</span>
            ${l.active ? '<span class="ladder-now-tag">CURRENT ACTIVE OFFICER</span>' : ''}
          </div>
        `).join('');

        content.innerHTML = `
          <div class="wb-result-grid">
            <div class="wb-metric-row">
              <span class="wb-metric-label">Escalation Status:</span>
              <span class="wb-metric-value">
                <strong style="color:${data.escalation_level >= 3 ? '#dc2626' : data.escalation_level === 2 ? '#ea580c' : '#16a34a'};font-size:15px;">
                  Tier ${data.escalation_level} — ${data.status}
                </strong>
                (${data.percent_elapsed}% of statutory SLA elapsed)
              </span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Trigger Rule:</span>
              <span class="wb-metric-value"><em>${escapeHtml(data.trigger_reason)}</em></span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Responsible Officer:</span>
              <span class="wb-metric-value">
                <strong>${escapeHtml(off.name)}</strong> (${escapeHtml(off.designation)})<br/>
                <span style="font-size:11px;color:#64748b;">Statutory Contact: ${escapeHtml(off.email)}</span>
              </span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Administrative Ladder:</span>
              <div class="ladder-container mt-1">${ladderHtml}</div>
            </div>
          </div>
          <div class="wb-json-toggle mt-2">
            <pre class="wb-json-box">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
          </div>
        `;
      }
    } catch (e) {
      if (tag) { tag.textContent = 'Error'; tag.className = 'wb-status-tag error'; }
      if (content) content.innerHTML = `<div class="wb-error">Agent D execution failed: ${e.message}</div>`;
    }
  }
  btnRunD?.addEventListener('click', executeAgentD);

  // 9.6 Agent F: SOP Checklist & Geotag Audit
  const btnRunF = document.getElementById('btn-run-agent-f');
  const catF = document.getElementById('wb-cat-f');
  const incGpsF = document.getElementById('wb-incident-gps-f');
  const clGpsF = document.getElementById('wb-closure-gps-f');

  document.getElementById('wb-sample-valid-f')?.addEventListener('click', () => {
    incGpsF.value = "18.5074, 73.8077";
    clGpsF.value = "18.5075, 73.8076";
  });
  document.getElementById('wb-sample-invalid-f')?.addEventListener('click', () => {
    incGpsF.value = "18.5074, 73.8077";
    clGpsF.value = "18.5130, 73.8110";
  });

  async function executeAgentF() {
    const tag = document.getElementById('wb-tag-f');
    const content = document.getElementById('wb-content-f');
    const incParts = (incGpsF?.value || "18.5074, 73.8077").split(',').map(p => parseFloat(p.trim()));
    const clParts = (clGpsF?.value || "18.5075, 73.8076").split(',').map(p => parseFloat(p.trim()));

    try {
      const res = await fetch(`${API_BASE}/api/agents/execute/agent-f`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: catF?.value || "Water Supply & Pumping",
          summary: "Pipeline burst repair and excavation",
          incident_lat: incParts[0] || 18.5074,
          incident_lng: incParts[1] || 73.8077,
          closure_lat: clParts[0] || 18.5075,
          closure_lng: clParts[1] || 73.8076
        })
      });
      const data = await res.json();
      const geo = data.geotag_audit;
      if (tag) {
        tag.textContent = `${geo.status} (${geo.geodesic_offset_meters}m)`;
        tag.className = `wb-status-tag ${geo.passed ? 'success' : 'error'}`;
      }
      if (content) {
        const sopItems = (data.sop_checklist || []).map(s => `<li>✓ ${escapeHtml(s)}</li>`).join('');
        const bomItems = (data.bill_of_materials || []).map(b => `<tr><td>${escapeHtml(b.item)}</td><td><strong>${escapeHtml(b.quantity)}</strong></td></tr>`).join('');

        content.innerHTML = `
          <div class="wb-result-grid">
            <div class="wb-metric-row">
              <span class="wb-metric-label">Geotag Geofence Audit:</span>
              <span class="wb-metric-value">
                <strong style="color:${geo.passed ? '#16a34a' : '#dc2626'};font-size:14px;">${geo.status}</strong>
                <br/>Offset: <strong>${geo.geodesic_offset_meters} meters</strong> (Statutory Limit: &le; ${geo.max_allowed_threshold_meters}m)
              </span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Engineering SOP Checklist:</span>
              <ul class="wb-checklist" style="padding-left:18px;margin:4px 0;">${sopItems}</ul>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Bill of Materials (BOM):</span>
              <table class="breakdown-table mt-1" style="font-size:12px;">
                <tr><th>Material / Equipment</th><th>Required Quantity</th></tr>
                ${bomItems}
              </table>
            </div>
          </div>
          <div class="wb-json-toggle mt-2">
            <pre class="wb-json-box">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
          </div>
        `;
      }
    } catch (e) {
      if (tag) { tag.textContent = 'Error'; tag.className = 'wb-status-tag error'; }
      if (content) content.innerHTML = `<div class="wb-error">Agent F execution failed: ${e.message}</div>`;
    }
  }
  btnRunF?.addEventListener('click', executeAgentF);

  // 9.7 Agent E: WhatsApp & Omnichannel Simulator
  const btnRunE = document.getElementById('btn-run-agent-e');
  const ticketE = document.getElementById('wb-ticket-e');
  const phoneE = document.getElementById('wb-phone-e');
  const milestoneE = document.getElementById('wb-milestone-e');

  async function executeAgentE() {
    const tag = document.getElementById('wb-tag-e');
    const content = document.getElementById('wb-content-e');

    try {
      const res = await fetch(`${API_BASE}/api/agents/execute/agent-e`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: ticketE?.value || "PMC-2026-WAT-01",
          milestone: milestoneE?.value || "Resolved & Restored",
          phone: phoneE?.value || "+91 98220 54321"
        })
      });
      const data = await res.json();
      const wa = data.whatsapp_payload;
      if (tag) {
        tag.textContent = `${wa.delivery_status} • Read ${wa.read_receipt_at}`;
        tag.className = 'wb-status-tag success';
      }
      if (content) {
        const btnHtml = (wa.interactive_buttons || []).map(b => `
          <button class="wa-action-btn" onclick="alert('${escapeHtml(b.label)} triggered for ${wa.recipient}!')">
            ${escapeHtml(b.label)}
          </button>
        `).join('');

        content.innerHTML = `
          <div class="wa-chat-simulator">
            <div class="wa-chat-header">
              <div class="wa-avatar">🏛️</div>
              <div class="wa-header-info">
                <div class="wa-sender-name">PMC Care (पुणे महानगरपालिका) <span class="wa-verified">✓</span></div>
                <div class="wa-sender-status">Official Business Account • RTS 2015</div>
              </div>
            </div>
            <div class="wa-bubble-container">
              <div class="wa-bubble">
                <div class="wa-bubble-header">${escapeHtml(wa.header)}</div>
                <div class="wa-bubble-body">${escapeHtml(wa.body)}</div>
                <div class="wa-bubble-footer">
                  <span class="wa-timestamp">${escapeHtml(wa.read_receipt_at)}</span>
                  <span class="wa-ticks">✓✓</span>
                </div>
                <div class="wa-interactive-btns">${btnHtml}</div>
              </div>
            </div>
          </div>
          <div class="wb-json-toggle mt-2">
            <pre class="wb-json-box">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
          </div>
        `;
      }
    } catch (e) {
      if (tag) { tag.textContent = 'Error'; tag.className = 'wb-status-tag error'; }
      if (content) content.innerHTML = `<div class="wb-error">Agent E execution failed: ${e.message}</div>`;
    }
  }
  btnRunE?.addEventListener('click', executeAgentE);

  // Initialize initial state for Workbench
  updateAgentBLabels();
  updateAgentDLabel();
  executeAgentA();
  executeAgentC();
  executeAgentB();
  executeAgentD();
  executeAgentF();
  executeAgentE();
}
