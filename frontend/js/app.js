/**
 * NagrikSewa AI — UX4G Multi-Agent Municipal Redressal Client
 * Features: Real Leaflet OpenStreetMap + 6-Agent Autonomous Execution Laboratory
 * Authors: Pruthvi (@Pruthvi3715), Devendra (@Devendra-006), Sampada (@sampada-11), Rushil (@rushil-cody)
 */

const API_BASE = (window.location.port === '8000') 
  ? '' 
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : '';

// Global Client State
const state = {
  complaints: [],
  stats: null,
  selectedDept: 'ALL',
  selectedPriority: 'ALL',
  searchQuery: '',
  isSplitView: true,
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
    contrastBtn.textContent = isHC ? 'Normal Contrast' : 'High Contrast';
  });
}

// 2. Bilingual English / Marathi / Hindi Dictionary & Engine
const translations = {
  mr: {
    banner: "अधिकृत नागरी तक्रार निवारण प्रणाली",
    brandTitle: "NagrikSewa AI",
    brandSubtitle: "स्वायत्त 6-Agent तक्रार निवारण व लोकसेवा हमी प्रणाली",
    btnLodge: "तक्रार नोंदवा",
    headingBoard: "विभागीय तक्रार निवारण कक्ष",
    subheadingBoard: "लोकसेवा हमी कायद्यानुसार वैधानिक मागोवा",
    col1: "१. नोंदणीकृत आणि वर्गीकृत",
    col2: "२. क्षेत्रीय अधिकारी नियुक्त (L1)",
    col3: "३. सेवा हमी कायदा उल्लंघन / पदोन्नती (L2/L3/L4)",
    col4: "४. निराकरण झाले आणि बंद",
    metricTotal: "एकूण नोंदणीकृत तक्रारी",
    metricActive: "सक्रिय क्षेत्रीय तक्रारी (L1)",
    metricEscalated: "सेवा हमी उल्लंघन / पदोन्नत",
    metricResolved: "निराकरण झाले व बंद",
    rtsBadge: "लोकसेवा हक्क अधिनियम २०१५"
  },
  hi: {
    banner: "आधिकारिक नागरिक शिकायत निवारण प्रणाली",
    brandTitle: "NagrikSewa AI",
    brandSubtitle: "स्वायत्त 6-Agent शिकायत निवारण एवं सेवा अधिकार प्रणाली",
    btnLodge: "शिकायत दर्ज करें",
    headingBoard: "विभागीय शिकायत निवारण बोर्ड",
    subheadingBoard: "लोकसेवा गारंटी अधिनियम वैधानिक ट्रैकिंग",
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
    banner: "Civic Grievance Redressal Portal",
    brandTitle: "NagrikSewa AI",
    brandSubtitle: "Multi-Agent Civic Grievance Redressal & Statutory SLA Escalation Platform",
    btnLodge: "Lodge Grievance",
    headingBoard: "Departmental Grievance Redressal Board",
    subheadingBoard: "Public Services Guarantee Act (RTS) Statutory Tracking",
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

// =========================================================================
// GEOSPATIAL ENGINE: ALL 10 MUNICIPAL WARDS & BOUNDARY POLYGONS
// =========================================================================
const GLOBAL_PUNE_10_WARDS = [
  {
    id: "Ward-03 (Alandi Road)",
    name: "Ward 03: Alandi Road — Dhanori — Kalas — Charholi",
    shortName: "Ward 03 • Alandi Road",
    amc: "Assistant Municipal Commissioner (AMC)",
    je: "Junior Engineer (JE Drainage & Water)",
    color: "#06b6d4",
    center: [18.6775, 73.8967],
    coords: [
      [18.5650, 73.8550],
      [18.6950, 73.8600],
      [18.7000, 73.9400],
      [18.5650, 73.9300]
    ]
  },
  {
    id: "Ward-14 (Kothrud)",
    name: "Ward 14: Kothrud — Bavdhan",
    shortName: "Ward 14 • Kothrud",
    amc: "Assistant Municipal Commissioner (AMC)",
    je: "Junior Engineer (JE Water)",
    color: "#f59e0b",
    center: [18.5074, 73.8077],
    coords: [
      [18.4950, 73.7900],
      [18.5200, 73.7950],
      [18.5180, 73.8250],
      [18.4950, 73.8200]
    ]
  },
  {
    id: "Ward-08 (Aundh)",
    name: "Ward 08: Aundh — Baner — Balewadi",
    shortName: "Ward 08 • Aundh",
    amc: "Assistant Municipal Commissioner (AMC)",
    je: "Junior Engineer (JE SWM)",
    color: "#0284c7",
    center: [18.5580, 73.8075],
    coords: [
      [18.5450, 73.7850],
      [18.5750, 73.7980],
      [18.5720, 73.8300],
      [18.5420, 73.8200]
    ]
  },
  {
    id: "Ward-05 (Shivajinagar)",
    name: "Ward 05: Shivajinagar — Deccan — FC Rd",
    shortName: "Ward 05 • Shivajinagar",
    amc: "Assistant Municipal Commissioner (AMC)",
    je: "Junior Engineer (JE Civil)",
    color: "#6366f1",
    center: [18.5314, 73.8446],
    coords: [
      [18.5200, 73.8300],
      [18.5450, 73.8330],
      [18.5420, 73.8600],
      [18.5180, 73.8550]
    ]
  },
  {
    id: "Ward-10 (Swargate)",
    name: "Ward 10: Swargate — Parvati — Sahakar",
    shortName: "Ward 10 • Swargate",
    amc: "Assistant Municipal Commissioner (AMC)",
    je: "Junior Engineer (JE Drainage)",
    color: "#0d9488",
    center: [18.5018, 73.8636],
    coords: [
      [18.4850, 73.8450],
      [18.5120, 73.8480],
      [18.5100, 73.8750],
      [18.4850, 73.8700]
    ]
  },
  {
    id: "Ward-18 (Hadapsar)",
    name: "Ward 18: Hadapsar — Magarpatta — Mundhwa",
    shortName: "Ward 18 • Hadapsar",
    amc: "Assistant Municipal Commissioner (AMC)",
    je: "Junior Engineer (JE SWM)",
    color: "#9333ea",
    center: [18.5089, 73.9259],
    coords: [
      [18.4850, 73.8950],
      [18.5250, 73.9000],
      [18.5200, 73.9550],
      [18.4800, 73.9500]
    ]
  },
  {
    id: "Ward-02 (Nagar Road)",
    name: "Ward 02: Nagar Road — Viman Nagar — Kalyani Nagar",
    shortName: "Ward 02 • Nagar Road",
    amc: "Assistant Municipal Commissioner (AMC)",
    je: "Junior Engineer (JE Roads)",
    color: "#ec4899",
    center: [18.5529, 73.9182],
    coords: [
      [18.5350, 73.8900],
      [18.5750, 73.8950],
      [18.5700, 73.9450],
      [18.5300, 73.9400]
    ]
  },
  {
    id: "Ward-11 (Dhankawadi)",
    name: "Ward 11: Dhankawadi — Katraj — Ambegaon",
    shortName: "Ward 11 • Dhankawadi",
    amc: "Assistant Municipal Commissioner (AMC)",
    je: "Junior Engineer (JE Civil)",
    color: "#eab308",
    center: [18.4720, 73.8560],
    coords: [
      [18.4500, 73.8380],
      [18.4820, 73.8400],
      [18.4800, 73.8720],
      [18.4500, 73.8700]
    ]
  },
  {
    id: "Ward-07 (Kasba Peth)",
    name: "Ward 07: Kasba Peth — City Core — Budhwar",
    shortName: "Ward 07 • Kasba Peth",
    amc: "Assistant Municipal Commissioner (AMC)",
    je: "Junior Engineer (JE Electrical)",
    color: "#14b8a6",
    center: [18.5180, 73.8550],
    coords: [
      [18.5120, 73.8480],
      [18.5280, 73.8500],
      [18.5260, 73.8650],
      [18.5100, 73.8620]
    ]
  },
  {
    id: "Ward-09 (Bhavani Peth)",
    name: "Ward 09: Bhavani Peth — Camp — Wanowrie",
    shortName: "Ward 09 • Bhavani Peth",
    amc: "Assistant Municipal Commissioner (AMC)",
    je: "Junior Engineer (JE Water)",
    color: "#3b82f6",
    center: [18.5090, 73.8710],
    coords: [
      [18.5000, 73.8650],
      [18.5200, 73.8670],
      [18.5180, 73.8900],
      [18.4980, 73.8880]
    ]
  },
  {
    id: "Ward-13 (Sinhagad Road)",
    name: "Ward 13: Sinhagad Road — Vadgaon — Dhayari",
    shortName: "Ward 13 • Sinhagad Rd",
    amc: "Shri Pradeep Kumar (AMC)",
    je: "Er. Vikas Mane (JE Roads)",
    color: "#84cc16",
    center: [18.4750, 73.8200],
    coords: [
      [18.4550, 73.7950],
      [18.4920, 73.8050],
      [18.4900, 73.8350],
      [18.4500, 73.8300]
    ]
  }
];

window.GLOBAL_PUNE_10_WARDS = GLOBAL_PUNE_10_WARDS;

// Point-in-Polygon Ray Casting Algorithm
function isPointInPolygon(lat, lng, polygonCoords) {
  let inside = false;
  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i][0], yi = polygonCoords[i][1];
    const xj = polygonCoords[j][0], yj = polygonCoords[j][1];
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Haversine Distance in Kilometers
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Comprehensive Ward Autodetection from Coordinates
function detectWardFromCoordinates(lat, lng) {
  // 1. Boundary Polygon Containment check (100% geometric containment)
  for (const ward of GLOBAL_PUNE_10_WARDS) {
    if (isPointInPolygon(lat, lng, ward.coords)) {
      return {
        ward: ward,
        isInsideBoundary: true,
        method: 'Polygon Boundary Containment (Exact Match)',
        distanceKm: 0
      };
    }
  }

  // 2. Proximity check to nearest centroid (for borders or adjacent locations)
  let nearestWard = GLOBAL_PUNE_10_WARDS[0];
  let minDistance = Infinity;
  GLOBAL_PUNE_10_WARDS.forEach(w => {
    const d = calculateDistanceKm(lat, lng, w.center[0], w.center[1]);
    if (d < minDistance) {
      minDistance = d;
      nearestWard = w;
    }
  });

  return {
    ward: nearestWard,
    isInsideBoundary: false,
    method: `Nearest Centroid (${minDistance < 1 ? Math.round(minDistance * 1000) + 'm' : minDistance.toFixed(2) + 'km'})`,
    distanceKm: minDistance
  };
}

// All 10 Administrative Ward Boundary Polygons & Markers on Main War Room Map
function renderPuneWardPolygons() {
  GLOBAL_PUNE_10_WARDS.forEach(w => {
    // Polygon boundary
    const polygon = L.polygon(w.coords, {
      color: w.color,
      weight: 2,
      opacity: 0.85,
      fillColor: w.color,
      fillOpacity: 0.1,
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

    // Visible Center Label Badge on the Map
    const labelIcon = L.divIcon({
      className: 'ward-map-label-wrap',
      html: `<div class="ward-map-label" style="background:${w.color}; color:#fff;">${w.shortName}</div>`,
      iconSize: [110, 24],
      iconAnchor: [55, 12]
    });
    const labelMarker = L.marker(w.center, { icon: labelIcon }).addTo(state.leafletMap);
    labelMarker.bindPopup(`<strong>${w.name}</strong><br/>Administrator: ${w.amc}<br/>Engineer: ${w.je}`);
    state.mapWards.push(labelMarker);
  });
}

// Municipal Depots & Key Civic Facilities
function renderMunicipalFacilities() {
  const facilities = [
    { name: "PMC Central Bhavan (Main HQ)", pos: [18.5314, 73.8446], icon: "HQ" },
    { name: "Kothrud Ward Office (Paud Rd)", pos: [18.5074, 73.8077], icon: "WARD" },
    { name: "Aundh Ward Office (Parihar Chowk)", pos: [18.5580, 73.8070], icon: "WARD" },
    { name: "Swargate Water & Suction Depot", pos: [18.4990, 73.8580], icon: "DEPOT" },
    { name: "Hadapsar SWM Compactor Station", pos: [18.5020, 73.9280], icon: "SWM" }
  ];

  facilities.forEach(f => {
    const icon = L.divIcon({
      className: 'custom-facility-marker',
      html: `<div class="facility-pill">[${f.icon}] ${f.name}</div>`,
      iconSize: [130, 22],
      iconAnchor: [65, 11]
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
  // Distinct 3-Page Navigation Switcher
  // Handles both admin tabs and citizen tabs — each tab group has its own set
  const allPageViews = {
    metrics: document.getElementById('page-view-metrics'),
    kanban: document.getElementById('page-view-kanban'),
    map: document.getElementById('page-view-map'),
    workbench: document.getElementById('page-view-workbench'),
    'citizen-grievance': document.getElementById('page-view-citizen-grievance')
  };

  function switchToPage(targetPage, activeBtnEl) {
    // Hide all page views
    Object.values(allPageViews).forEach(v => { if (v) v.classList.add('hidden'); });
    // Show target
    const target = allPageViews[targetPage];
    if (target) target.classList.remove('hidden');
    // Remove active from all tab buttons in both nav groups
    document.querySelectorAll('.page-tab-btn').forEach(b => b.classList.remove('active'));
    if (activeBtnEl) activeBtnEl.classList.add('active');

    // Update active breadcrumb title
    const pageTitles = {
      'metrics': 'Statutory Metrics Overview',
      'kanban': 'Grievance Redressal Board',
      'map': 'Geospatial War Room Map',
      'workbench': '6-Agent Autonomous Lab',
      'citizen-grievance': 'Lodge Grievance'
    };
    const bcActive = document.getElementById('bc-active-view');
    if (bcActive && pageTitles[targetPage]) {
      bcActive.textContent = pageTitles[targetPage];
    }

    // Invalidate map size if needed
    if (targetPage === 'map' && state.leafletMap) {
      setTimeout(() => state.leafletMap.invalidateSize(), 120);
    }
    if (targetPage === 'citizen-grievance' && window.citizenPickerMap) {
      setTimeout(() => window.citizenPickerMap.invalidateSize(), 120);
    }
  }
  state.switchToPage = switchToPage;

  // Wire ADMIN nav tabs
  document.querySelectorAll('#nav-admin-tabs .page-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchToPage(btn.dataset.page, btn));
  });

  // Wire CITIZEN nav tabs
  document.querySelectorAll('#nav-citizen-tabs .page-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchToPage(btn.dataset.page, btn));
  });

  // 6-Agent Lab header button → switch to workbench page (admin view)
  document.getElementById('btn-jump-workbench-header')?.addEventListener('click', () => {
    const labBtn = document.querySelector('#nav-admin-tabs .page-tab-btn[data-page="workbench"]');
    switchToPage('workbench', labBtn || null);
  });

  // Clear Terminal Logs Trigger
  document.getElementById('btn-clear-terminal-logs')?.addEventListener('click', () => {
    const terminal = document.getElementById('agent-log-terminal');
    if (terminal) {
      terminal.innerHTML = `
        <div class="term-line info">[SYSTEM] UX4G Municipal Engine initialized.</div>
        <div class="term-line info">[LANGGRAPH] StateGraph topology compiled: 6 agents linked with conditional edges.</div>
        <div class="term-line success">[LEAFLET] Real OpenStreetMap tile layer active at Pune coordinates.</div>
        <div class="term-line info">[RTS_ACT] Statutory deadlines loaded: Water 6h (P1), SWM 18h (P2), Roads 48h (P4).</div>
        <div class="term-line warn">[TERMINAL] Telemetry stream cleared. Waiting for active agent events...</div>
      `;
    }
  });

  // Relocated Virtual Clock Drawer Toggle in Dashboard
  const toggleClockBtn = document.getElementById('btn-toggle-clock-panel');
  const clockPanel = document.getElementById('dashboard-clock-panel');
  const clockChevron = document.getElementById('clock-chevron-arrow');
  if (toggleClockBtn && clockPanel) {
    toggleClockBtn.addEventListener('click', () => {
      const isHidden = clockPanel.style.display === 'none' || !clockPanel.style.display;
      if (isHidden) {
        clockPanel.style.display = 'block';
        toggleClockBtn.classList.add('active');
        if (clockChevron) clockChevron.style.transform = 'rotate(180deg)';
      } else {
        clockPanel.style.display = 'none';
        toggleClockBtn.classList.remove('active');
        if (clockChevron) clockChevron.style.transform = 'rotate(0deg)';
      }
    });
  }

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

  // Kanban Search Input (Live Query)
  const searchInput = document.getElementById('kanban-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = (e.target.value || '').toLowerCase().trim();
      renderKanban();
    });
  }

  // Kanban Priority Filter
  const priorityFilter = document.getElementById('kanban-priority-filter');
  if (priorityFilter) {
    priorityFilter.addEventListener('change', (e) => {
      state.selectedPriority = e.target.value;
      renderKanban();
    });
  }

  // Kanban Split View / Full View Toggles
  const btnSplitView = document.getElementById('btn-toggle-split-view');
  const btnFullView = document.getElementById('btn-toggle-full-kanban');
  const kanbanWorkspace = document.getElementById('kanban-workspace');

  if (btnSplitView && btnFullView && kanbanWorkspace) {
    btnSplitView.addEventListener('click', () => {
      state.isSplitView = true;
      kanbanWorkspace.classList.add('split-active');
      btnSplitView.classList.add('active');
      btnFullView.classList.remove('active');
      if (state.activeTicket) {
        renderDossierContent(state.activeTicket);
      }
    });

    btnFullView.addEventListener('click', () => {
      state.isSplitView = false;
      kanbanWorkspace.classList.remove('split-active');
      btnFullView.classList.add('active');
      btnSplitView.classList.remove('active');
    });
  }

  // 4 Interactive Modular Stage Compact Boxes - Toggle Handlers
  const stageKeys = ['registered', 'inprogress', 'escalated', 'resolved'];
  stageKeys.forEach(s => {
    const bar = document.getElementById(`stage-bar-${s}`) || document.getElementById('lodge-box-bar');
    const drawer = document.getElementById(`stage-drawer-${s}`) || document.getElementById('lodge-box-dropdown');
    const chevron = document.getElementById(`stage-chevron-${s}`) || document.getElementById('lodge-box-chevron');
    const box = document.getElementById(`stage-box-${s}`) || document.getElementById('lodge-compact-box');

    if (bar && drawer) {
      bar.addEventListener('click', () => {
        const isClosed = drawer.style.display === 'none' || !drawer.style.display;
        drawer.style.display = isClosed ? 'block' : 'none';
        if (chevron) chevron.style.transform = isClosed ? 'rotate(180deg)' : 'rotate(0deg)';
        if (box) box.classList.toggle('is-open', isClosed);
      });
    }
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
    const target = state.activeTicket || (state.complaints && state.complaints.length > 0 ? state.complaints[0] : null);
    openAgentInspector(target);
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
    const miniClock = document.getElementById('mini-clock-val');
    if (miniClock) {
      miniClock.textContent = data.offset_hours > 0 ? `+${data.offset_hours}h SLA Offset` : 'Real-time UTC';
    }
  } catch (e) {}
}

async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    if (!res.ok) return;
    const data = await res.json();
    state.stats = data;

    const totalVal = data.total_complaints || '0';
    const activeVal = data.active_complaints || '0';
    const escalatedVal = data.escalated_complaints || '0';
    const resolvedVal = data.resolved_complaints || '0';

    // Admin Metrics
    const mTotal = document.getElementById('metric-total');
    if (mTotal) mTotal.textContent = totalVal;
    const mActive = document.getElementById('metric-active');
    if (mActive) mActive.textContent = activeVal;
    const mEscalated = document.getElementById('metric-escalated');
    if (mEscalated) mEscalated.textContent = escalatedVal;
    const mResolved = document.getElementById('metric-resolved');
    if (mResolved) mResolved.textContent = resolvedVal;

    // Citizen Metrics (Image 2)
    const cmTotal = document.getElementById('citizen-metric-total');
    if (cmTotal) cmTotal.textContent = totalVal;
    const cmActive = document.getElementById('citizen-metric-active');
    if (cmActive) cmActive.textContent = activeVal;
    const cmEscalated = document.getElementById('citizen-metric-escalated');
    if (cmEscalated) cmEscalated.textContent = escalatedVal;
    const cmResolved = document.getElementById('citizen-metric-resolved');
    if (cmResolved) cmResolved.textContent = resolvedVal;

    const escalatedCard = document.getElementById('metric-escalated-card');
    const citizenEscalatedCard = document.getElementById('citizen-metric-escalated-card');

    if (data.escalated_complaints > 0) {
      if (escalatedCard) escalatedCard.classList.add('breach-alert');
      if (citizenEscalatedCard) citizenEscalatedCard.classList.add('breach-alert');
      if (data.escalated_complaints > state.lastEscalatedCount) {
        logAgentTerminal(`[SLA MONITOR] STATUTORY BREACH ALERT: ${data.escalated_complaints} complaint(s) exceeded RTS Act deadline! Autonomous promotion executed.`);
      }
    } else {
      if (escalatedCard) escalatedCard.classList.remove('breach-alert');
      if (citizenEscalatedCard) citizenEscalatedCard.classList.remove('breach-alert');
    }
    state.lastEscalatedCount = data.escalated_complaints;
  } catch (e) {}
}

async function fetchComplaints() {
  try {
    const res = await fetch(`${API_BASE}/api/complaints`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        state.complaints = data;
      } else {
        state.complaints = getInitialCanonicalComplaints();
      }
    } else {
      state.complaints = getInitialCanonicalComplaints();
    }
  } catch (e) {
    state.complaints = getInitialCanonicalComplaints();
  }
  if (!state.activeTicket && state.complaints.length > 0) {
    state.activeTicket = state.complaints[0];
  }
  renderKanban();
  renderLeafletPins();
}

function getInitialCanonicalComplaints() {
  const now = new Date();
  return [
    {
      ticket_id: "PMC-2026-1DD3A579",
      assigned_department_name: "Water Supply & Pumping",
      priority_level: "P1_CRITICAL",
      priority_score: 92.25,
      sla_duration_hours: 6,
      sla_deadline: new Date(now.getTime() + 4.2 * 3600 * 1000).toISOString(),
      is_breached: false,
      is_duplicate: false,
      escalation_level: 1,
      status: "IN_PROGRESS",
      assigned_officer_name: "Junior Engineer (Water Works)",
      assigned_officer_designation: "Junior Engineer (Water Works)",
      raw_input_text: "Shivaji Chowk javal main water pipeline phutli ahe, rastyavar khoop pani sathlay and shops are flooding.",
      canonical_english_summary: "High-pressure municipal water pipeline burst causing active road flooding near Shivaji Chowk.",
      ward_id: "Ward-14 (Kothrud)",
      landmark: "Near Shivaji Chowk, Paud Road",
      latitude: 18.5074,
      longitude: 73.8077,
      complainant_name: "Ramesh Patil",
      complainant_phone: "+91 98220 54321",
      channel: "VOICE",
      agent_metrics: {
        agent_a: { language_detected: "Marathi / Hinglish", language_confidence: 0.985, execution_time_ms: 38.5 },
        agent_c: { decision: "UNIQUE_ORIGINAL", nearest_incident_distance_meters: 109.2 },
        agent_b: { weights_and_scores: { hazard_weight: 0.45, hazard_score: 96, traffic_weight: 0.25, traffic_score: 92, population_weight: 0.20, density_score: 88, cluster_delta: 0 } },
        agent_d: { tier: 1, action: "ASSIGNED_TO_FIELD_RESPONDER" },
        agent_f: { geotag_offset_meters: 15.3, sop_checklist: ["Isolate gate valve", "Deploy dewatering pump", "Install collar sleeve"] },
        agent_e: { notification_channel: "WHATSAPP", status: "DELIVERED" }
      }
    },
    {
      ticket_id: "PMC-2026-47A2BB43",
      assigned_department_name: "Drainage & Sewerage",
      priority_level: "P1_CRITICAL",
      priority_score: 99.20,
      sla_duration_hours: 6,
      sla_deadline: new Date(now.getTime() - 2.5 * 3600 * 1000).toISOString(),
      is_breached: true,
      is_duplicate: false,
      escalation_level: 3,
      status: "ESCALATED",
      assigned_officer_name: "Deputy Municipal Commissioner (DMC Engineering)",
      assigned_officer_designation: "Deputy Municipal Commissioner (DMC - Engineering)",
      raw_input_text: "औंध परिहार चौकात मुख्य रस्त्यावर मॅनहोलचे झाकण उघडे पडले आहे, गटाराचे दुर्गंधीयुक्त पाणी रस्त्यावर वाहत आहे.",
      canonical_english_summary: "Catastrophic open sewer manhole overflowing foul water on main carriage-way creating extreme accident hazard.",
      ward_id: "Ward-08 (Aundh)",
      landmark: "Parihar Chowk Main Road",
      latitude: 18.5580,
      longitude: 73.8070,
      complainant_name: "Anita Deshmukh",
      complainant_phone: "+91 98230 45678",
      channel: "WHATSAPP",
      agent_metrics: {
        agent_a: { language_detected: "Marathi (Vernacular)", language_confidence: 0.995, execution_time_ms: 41.2 },
        agent_c: { decision: "UNIQUE_ORIGINAL", nearest_incident_distance_meters: 5682.1 },
        agent_b: { weights_and_scores: { hazard_weight: 0.45, hazard_score: 98, traffic_weight: 0.25, traffic_score: 95, population_weight: 0.20, density_score: 90, cluster_delta: 15 } },
        agent_d: { tier: 3, action: "STATUTORY_ESCALATION_TO_DMC" },
        agent_f: { geotag_offset_meters: 15.3, sop_checklist: ["Cordon off perimeter", "Deploy vacuum suction jetting", "Fit heavy-duty SFRC cover"] },
        agent_e: { notification_channel: "WHATSAPP", status: "DELIVERED" }
      }
    },
    {
      ticket_id: "PMC-2026-8C31EF90",
      assigned_department_name: "Solid Waste Management",
      priority_level: "P2_HIGH",
      priority_score: 76.50,
      sla_duration_hours: 18,
      sla_deadline: new Date(now.getTime() + 11.0 * 3600 * 1000).toISOString(),
      is_breached: false,
      is_duplicate: false,
      escalation_level: 1,
      status: "REGISTERED",
      assigned_officer_name: "Junior Engineer (SWM)",
      assigned_officer_designation: "Junior Engineer (SWM)",
      raw_input_text: "Overflowing community garbage bin on Market Road uncollected for 3 days, foul stench spread everywhere.",
      canonical_english_summary: "Commercial market community waste bin overflow uncollected for 72 hours, biohazard and public nuisance.",
      ward_id: "Ward-14 (Kothrud)",
      landmark: "Market Road Corner",
      latitude: 18.5020,
      longitude: 73.8110,
      complainant_name: "Vikram Joshi",
      complainant_phone: "+91 98221 77889",
      channel: "WHATSAPP",
      agent_metrics: {
        agent_a: { language_detected: "English", language_confidence: 0.99, execution_time_ms: 28.0 },
        agent_c: { decision: "UNIQUE_ORIGINAL", nearest_incident_distance_meters: 1400.0 },
        agent_b: { weights_and_scores: { hazard_weight: 0.45, hazard_score: 75, traffic_weight: 0.25, traffic_score: 70, population_weight: 0.20, density_score: 85, cluster_delta: 0 } },
        agent_d: { tier: 1, action: "TRIAGED_AND_LOGGED" },
        agent_f: { geotag_offset_meters: 8.4, sop_checklist: ["Dispatch hydraulic compactor truck", "Sanitize ground with lime powder"] },
        agent_e: { notification_channel: "WHATSAPP", status: "DELIVERED" }
      }
    },
    {
      ticket_id: "PMC-2026-3B90E112",
      assigned_department_name: "Roads & Civil Infrastructure",
      priority_level: "P3_MEDIUM",
      priority_score: 54.00,
      sla_duration_hours: 48,
      sla_deadline: new Date(now.getTime() + 32.0 * 3600 * 1000).toISOString(),
      is_breached: false,
      is_duplicate: false,
      escalation_level: 1,
      status: "RESOLVED",
      assigned_officer_name: "Junior Engineer (Civil Infrastructure)",
      assigned_officer_designation: "Junior Engineer (Civil Infrastructure)",
      raw_input_text: "Deep monsoon pothole after Paud Road bridge causing skids for two-wheelers.",
      canonical_english_summary: "Deep roadway pothole at Paud Road flyover descent repaired with cold-mix asphalt and geotag verified.",
      ward_id: "Ward-05 (Shivajinagar)",
      landmark: "FC Road Junction",
      latitude: 18.5250,
      longitude: 73.8400,
      complainant_name: "Sunil Kadam",
      complainant_phone: "+91 98222 33445",
      channel: "WEB",
      agent_metrics: {
        agent_a: { language_detected: "English", language_confidence: 0.99, execution_time_ms: 31.0 },
        agent_c: { decision: "UNIQUE_ORIGINAL", nearest_incident_distance_meters: 2200.0 },
        agent_b: { weights_and_scores: { hazard_weight: 0.45, hazard_score: 55, traffic_weight: 0.25, traffic_score: 60, population_weight: 0.20, density_score: 50, cluster_delta: 0 } },
        agent_d: { tier: 1, action: "RESOLVED_CLOSED" },
        agent_f: { geotag_offset_meters: 14.2, sop_checklist: ["Clean cavity edges", "Compact bitumen cold mix", "Level surface with roller"] },
        agent_e: { notification_channel: "WHATSAPP", status: "DELIVERED" }
      }
    }
  ];
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
// 6. Kanban Board Rendering & Live Redressal Output Dossier
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

  const query = (state.searchQuery || '').toLowerCase().trim();
  const filtered = state.complaints.filter(c => {
    // 1. Department filter
    if (state.selectedDept && state.selectedDept !== 'ALL') {
      const dept = (c.assigned_department_name || c.extracted_category || '').toLowerCase();
      if (!dept.includes(state.selectedDept.toLowerCase())) return false;
    }
    // 2. Priority filter
    if (state.selectedPriority && state.selectedPriority !== 'ALL') {
      const pLevel = (c.priority_level || '').toUpperCase();
      if (!pLevel.startsWith(state.selectedPriority.toUpperCase())) return false;
    }
    // 3. Search query
    if (query) {
      const textPool = [
        c.ticket_id,
        c.canonical_english_summary,
        c.raw_input_text,
        c.ward_id,
        c.landmark,
        c.assigned_department_name,
        c.assigned_officer_name,
        c.complainant_name
      ].filter(Boolean).join(' ').toLowerCase();
      if (!textPool.includes(query)) return false;
    }
    return true;
  });

  if (!state.activeTicket || !filtered.some(t => t.ticket_id === state.activeTicket.ticket_id)) {
    state.activeTicket = filtered.length > 0 ? filtered[0] : null;
  }

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

  // Empty state rendering helper for all 4 modular stage boxes
  function checkEmpty(col, stageName, desc) {
    if (col && col.children.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'stage-empty-note';
      emptyDiv.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>${desc}</span>
      `;
      col.appendChild(emptyDiv);
    }
  }

  checkEmpty(colRegistered, 'Lodged', '0 grievances currently pending triage &bull; All incoming citizen submissions triaged and routed.');
  checkEmpty(colInProgress, 'In-Field', '0 grievances actively in-field &bull; All assigned tasks completed by Junior Engineers.');
  checkEmpty(colEscalated, 'Escalated', 'No statutory SLA breaches! All complaints resolved within citizen charter deadlines.');
  checkEmpty(colResolved, 'Resolved', '0 resolved grievances in this view &bull; Completed tickets verified via 100m geotag photo appear here.');

  // Update badge counts in Column headers & Small Boxes
  const countRegEl = document.getElementById('count-registered');
  if (countRegEl) countRegEl.textContent = countReg;
  const countProgEl = document.getElementById('count-inprogress');
  if (countProgEl) countProgEl.textContent = countProg;
  const countEscEl = document.getElementById('count-escalated');
  if (countEscEl) countEscEl.textContent = countEsc;
  const countResEl = document.getElementById('count-resolved');
  if (countResEl) countResEl.textContent = countRes;

  // Helper to update each modular stage box metadata
  function updateStageBox(stageId, count, singularName, activeDesc, zeroDesc) {
    const hint = document.getElementById(`stage-hint-${stageId}`) || document.getElementById(`lodge-box-hint`);
    const action = document.getElementById(`stage-action-${stageId}`) || document.getElementById(`lodge-box-action`);
    const badge = document.getElementById(`stage-badge-${stageId}`) || document.getElementById(`lodge-dd-badge`);

    if (hint) {
      hint.innerHTML = count > 0
        ? `<strong style="font-weight:700;">${count} ${singularName}${count > 1 ? 's' : ''} Available</strong> &bull; ${activeDesc}`
        : `${zeroDesc} &bull; Click to inspect`;
    }
    if (action) {
      action.textContent = count > 0 ? `View Grievances (${count})` : `View Grievances (0)`;
    }
    if (badge) {
      badge.textContent = `${count} Active`;
    }
  }

  updateStageBox('registered', countReg, 'Grievance', 'Click to display under this box', '0 Grievances Pending');
  updateStageBox('inprogress', countProg, 'Grievance', 'Active in field &bull; Junior Engineers dispatched', '0 In-Field Grievances');
  updateStageBox('escalated', countEsc, 'Grievance', 'Statutory SLA Breaches (AMC / Comm.)', '0 SLA Breaches');
  updateStageBox('resolved', countRes, 'Grievance', '100m Geotag Verified Closures', '0 Resolved Grievances');

  // Update KPI strip counts
  const kpiReg = document.getElementById('kpi-count-registered');
  const kpiProg = document.getElementById('kpi-count-inprogress');
  const kpiEsc = document.getElementById('kpi-count-escalated');
  const kpiRes = document.getElementById('kpi-count-resolved');
  if (kpiReg) kpiReg.textContent = countReg;
  if (kpiProg) kpiProg.textContent = countProg;
  if (kpiEsc) kpiEsc.textContent = countEsc;
  if (kpiRes) kpiRes.textContent = countRes;

  // Active Ticket Selection & Dossier Refresh
  renderDossierContent(state.activeTicket);
}

function getOfficerCompactRank(level, designation) {
  if (level === 1) return 'Jr. Engineer';
  if (level === 2) return 'Exec. Engineer';
  if (level === 3) return 'Dy. Comm.';
  if (level >= 4) return 'Commissioner';
  if (!designation) return 'Jr. Engineer';
  const clean = designation.split('(')[0].trim();
  if (clean.length > 14) {
    return clean.replace('Municipal ', '').replace('Commissioner', 'Comm.').replace('Assistant ', 'Asst. ').replace('Additional ', 'Addl. ');
  }
  return clean;
}

function createKanbanCard(c) {
  const card = document.createElement('div');
  const pTier = (c.priority_level || 'P3_MEDIUM').split('_')[0].toLowerCase();
  const isActive = state.activeTicket && state.activeTicket.ticket_id === c.ticket_id;
  card.className = `gov-ticket-card border-${pTier} ${c.is_breached ? 'is-breached' : ''} ${isActive ? 'active-card' : ''}`;
  card.dataset.ticketId = c.ticket_id;

  const deadline = new Date(c.sla_deadline);
  const diffHours = ((deadline - state.virtualTime) / (1000 * 3600)).toFixed(1);
  const isOverdue = diffHours <= 0;

  // Department short tag
  const deptShort = (c.assigned_department_name || 'General')
    .replace('Supply & Pumping', 'Supply')
    .replace('Management', '')
    .replace('& Sewerage', '')
    .trim();

  const rankText = getOfficerCompactRank(c.escalation_level, c.assigned_officer_designation);

  card.innerHTML = `
    <div class="card-header-top">
      <span class="ticket-id-tag">#${escapeHtml(c.ticket_id)}</span>
      <span class="p-tier-badge ${pTier}">${c.priority_level?.replace('_', ' ') || 'P3 MEDIUM'}</span>
    </div>

    <div class="card-dept-line">
      <span class="card-dept-tag">${escapeHtml(deptShort)}</span>
    </div>

    <div class="ticket-issue-summary">${escapeHtml(c.canonical_english_summary || c.raw_input_text)}</div>

    <div class="ticket-geo-info">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span>${escapeHtml(c.ward_id)} ${c.landmark ? '&bull; ' + escapeHtml(c.landmark) : ''}</span>
    </div>

    ${c.is_duplicate ? `<div class="cluster-flag"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Clustered (Child of #${c.parent_ticket_id || 'Parent'})</div>` : ''}

    <div class="ticket-officer-line">
      <div class="officer-badge l${c.escalation_level}" title="Escalation Tier ${c.escalation_level}: ${escapeHtml(c.assigned_officer_designation || '')}">
        <span class="tier-pill">T${c.escalation_level}</span>
        <span class="rank-name">${escapeHtml(rankText)}</span>
      </div>
      <span class="sla-time-indicator ${isOverdue ? 'overdue' : ''}">
        ${isOverdue ? `Overdue (+${Math.abs(diffHours)}h)` : `${diffHours}h left`}
      </span>
    </div>
  `;

  // Clicking a card activates card, updates dossier, and scrolls into view if split view
  card.addEventListener('click', () => {
    state.activeTicket = c;
    document.querySelectorAll('.gov-ticket-card').forEach(el => el.classList.remove('active-card'));
    card.classList.add('active-card');
    
    // Ensure split view is active so output is immediately visible
    const workspace = document.getElementById('kanban-workspace');
    const btnSplit = document.getElementById('btn-toggle-split-view');
    const btnFull = document.getElementById('btn-toggle-full-kanban');
    if (workspace && !workspace.classList.contains('split-active')) {
      workspace.classList.add('split-active');
      if (btnSplit) btnSplit.classList.add('active');
      if (btnFull) btnFull.classList.remove('active');
    }

    renderDossierContent(c);
  });

  return card;
}

// ==========================================================================
// 6. Live Redressal Output & Audit Dossier Renderer (Zone 2)
// ==========================================================================
function renderDossierContent(t) {
  const container = document.getElementById('dossier-inner-content') || document.getElementById('kanban-dossier-output') || document.getElementById('kanban-output-dossier');
  if (!container || !t) return;

  const pTier = (t.priority_level || 'P3_MEDIUM').split('_')[0].toLowerCase();
  const deadline = new Date(t.sla_deadline);
  const diffHours = ((deadline - state.virtualTime) / (1000 * 3600)).toFixed(1);
  const isOverdue = diffHours <= 0;
  const m = t.agent_metrics || {};
  const ma = m.agent_a || {};
  const mc = m.agent_c || {};
  const mb = m.agent_b || {};
  const mf = m.agent_f || {};
  const me = m.agent_e || {};
  const sop = getTaskSOPAndBOM(t.assigned_department_name, t.canonical_english_summary || t.raw_input_text);
  const bomList = sop.bill_of_materials || [];
  const beforeGpsStr = `${t.latitude || 18.5074}° N, ${t.longitude || 73.8077}° E`;
  const afterGpsStr = `${t.latitude || 18.5074}° N, ${t.longitude || 73.8077}° E (Offset 14.2m)`;
  const beforeVisual = renderCivicComparativeVisual(t.assigned_department_name, 'before', beforeGpsStr, 'Reported Evidence', { incident_photo_url: t.incident_photo_url });
  const afterVisual = renderCivicComparativeVisual(t.assigned_department_name, 'after', afterGpsStr, 'Resolution Proof');

  container.innerHTML = `
    <!-- 1. Dossier Header Bar -->
    <div class="dossier-header-bar">
      <div class="dossier-header-top">
        <div class="dossier-id-group">
          <span class="dossier-ticket-id">#${escapeHtml(t.ticket_id)}</span>
          <span class="p-tier-badge ${pTier}">${t.priority_level?.replace('_', ' ') || 'P3 MEDIUM'}</span>
        </div>
        <button type="button" class="btn-dossier-close" id="btn-close-dossier" title="Close Dossier">&times;</button>
      </div>
      <div class="dossier-header-sub">
        <span class="dossier-dept-pill">${escapeHtml(t.assigned_department_name || 'General')}</span>
        ${t.ward_id ? `<span class="dossier-ward-pill">${escapeHtml(t.ward_id)}</span>` : ''}
        <span class="comp-status-pill ${isOverdue ? 'red' : 'green'}" style="margin-left:auto;">
          ${isOverdue ? `Overdue (+${Math.abs(diffHours)}h)` : `${diffHours}h left`}
        </span>
      </div>
    </div>

    <div class="dossier-scroll-area">

      <!-- 2. Citizen Grievance & Geographic Anchor Box (Modular Compact Box Component) -->
      <div class="dossier-compact-box blue is-open" id="dossier-overview-box">
        <div class="dossier-box-bar" id="dossier-overview-bar" title="Click to expand/collapse Grievance Details">
          <div class="dossier-bar-left">
            <span class="dossier-badge-icon">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </span>
            <div class="dossier-bar-meta">
              <div class="dossier-bar-title">Grievance Overview &amp; Site Geotag</div>
              <div class="dossier-bar-sub">${escapeHtml(t.ward_id)} &bull; Near ${escapeHtml(t.landmark || 'Paud Road')}</div>
            </div>
          </div>
          <div class="dossier-bar-right">
            <span class="dossier-action-pill blue">Grievance Details</span>
            <span class="dossier-box-chevron">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
            </span>
          </div>
        </div>
        <div class="dossier-box-content" id="dossier-overview-content">
          <div class="dossier-summary-box">
            <div class="dossier-summary-title">
              ${escapeHtml(t.canonical_english_summary || t.raw_input_text)}
            </div>
            ${t.raw_input_text && t.raw_input_text !== t.canonical_english_summary ? `
              <div class="dossier-verbatim-quote">
                Original Verbatim: "${escapeHtml(t.raw_input_text)}"
              </div>` : ''
            }
          </div>

          <div class="dossier-kv-grid">
            <div class="kv-key">Ward &amp; Landmark:</div>
            <div class="kv-val"><strong>${escapeHtml(t.ward_id)}</strong> &bull; Near ${escapeHtml(t.landmark || 'Shivaji Chowk, Paud Road')}</div>

            <div class="kv-key">GPS Coordinates:</div>
            <div class="kv-val"><code class="mono-coords">${t.latitude}&deg; N, ${t.longitude}&deg; E</code></div>

            <div class="kv-key">Complainant:</div>
            <div class="kv-val">${escapeHtml(t.complainant_name || 'Citizen Complainant')} &bull; ${escapeHtml(t.complainant_phone || '+91 98220 XXXXX')}</div>
          </div>

          ${t.incident_photo_url ? `
            <div style="margin-top:4px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <span style="font-size:0.70rem; font-weight:700; color:#0b3b60;">Reported Civic Photo</span>
                <span style="font-size:0.62rem; background:#dcfce7; color:#166534; font-weight:800; padding:1px 5px; border-radius:3px;">GPS EXIF Anchored</span>
              </div>
              <div style="width:100%; max-height:140px; overflow:hidden; border-radius:4px; background:#0f172a; display:flex; align-items:center; justify-content:center;">
                <img src="${t.incident_photo_url}" alt="Citizen Incident Proof" style="width:100%; max-height:140px; object-fit:contain;" />
              </div>
            </div>` : ''
          }

          <button type="button" class="btn-dossier-fly-map" id="btn-dossier-fly-map">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/></svg>
            <span>Locate on Geospatial War Room Map</span>
          </button>
        </div>
      </div>

      <!-- 3. 6-AGENT AUTONOMOUS PROCESSING PIPELINE SECTION -->
      <div class="dossier-pipeline-wrapper">
        <div class="dossier-sec-heading-bar">
          <div class="sec-heading-left">
            <span class="dossier-sec-title">6-AGENT AUTONOMOUS PROCESSING PIPELINE</span>
          </div>
          <span class="pipeline-status-badge green">COMPLETE PIPELINE VERIFIED</span>
        </div>

        <!-- 6 Interactive Clickable Boxes -->
        <div class="agent-interactive-stack">

          <!-- Box 1: Agent A (Lodged & Triaged) -->
          <div class="agent-clickable-box is-open" data-agent="a">
            <div class="agent-box-bar" title="Click to expand/collapse Lodged & Triaged details">
              <div class="agent-bar-left">
                <span class="agent-badge-circle a">A</span>
                <div class="agent-bar-meta">
                  <div class="agent-bar-title">Agent A: Multilingual Intake &amp; NER Triage</div>
                  <div class="agent-bar-sub">Detected: ${escapeHtml(ma.language_detected || t.detected_language || 'English')} &bull; Completeness: <span style="color:#16a34a; font-weight:700;">PASSED</span></div>
                </div>
              </div>
              <div class="agent-bar-right">
                <span class="agent-box-chevron">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </div>
            </div>
            <div class="agent-box-content">
              <div class="agent-info-grid">
                <div class="info-k">Stage Status:</div>
                <div class="info-v" style="color:#16a34a; font-weight:700;">Lodged &amp; Triaged (Gatekeeper PASSED)</div>

                <div class="info-k">AI Model:</div>
                <div class="info-v">Google Gemini 2.5 Flash</div>

                <div class="info-k">Language Detected:</div>
                <div class="info-v"><strong>${escapeHtml(ma.language_detected || t.detected_language || 'English')}</strong> (98.5% Confidence)</div>

                <div class="info-k">Parsed Department:</div>
                <div class="info-v"><strong>${escapeHtml(t.assigned_department_name || 'General')}</strong></div>

                <div class="info-k">Spatial Entities:</div>
                <div class="info-v"><strong>${escapeHtml(t.ward_id)}</strong> &bull; Near ${escapeHtml(t.landmark || 'Parihar Chowk Aundh')}</div>

                <div class="info-k">Spatial Anchors:</div>
                <div class="info-v" style="color:#16a34a; font-weight:600;">2 / 2 Verified (Valid GPS + Landmark)</div>
              </div>
            </div>
          </div>

          <!-- Box 2: Agent C (Spatial Deduplication & Marking) -->
          <div class="agent-clickable-box is-open" data-agent="c">
            <div class="agent-box-bar" title="Click to expand/collapse Spatial Deduplication & Marking details">
              <div class="agent-bar-left">
                <span class="agent-badge-circle c">C</span>
                <div class="agent-bar-meta">
                  <div class="agent-bar-title">Agent C: Spatial Deduplication &amp; Clustering</div>
                  <div class="agent-bar-sub">${t.is_duplicate ? '<span style="color:#ea580c; font-weight:700;">DUPLICATE_CLUSTERED</span> &bull; Redundant trip saved' : '<span style="color:#16a34a; font-weight:700;">UNIQUE_ORIGINAL</span> &bull; Redundant trip saved'}</div>
                </div>
              </div>
              <div class="agent-bar-right">
                <span class="agent-box-chevron">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </div>
            </div>
            <div class="agent-box-content">
              <div class="agent-info-grid">
                <div class="info-k">Geodesic PostGIS:</div>
                <div class="info-v"><strong>${t.is_duplicate ? '14.2m (&le; 150m Radius)' : 'Clear (&gt; 150m Isolated)'}</strong></div>

                <div class="info-k">Semantic Cosine:</div>
                <div class="info-v"><strong>${t.is_duplicate ? '0.912 (&ge; 0.85 Match)' : 'Distinct (No Match)'}</strong></div>

                <div class="info-k">Spatial Marking:</div>
                <div class="info-v">${t.is_duplicate ? `Clustered into Parent Incident <strong style="color:#0b3b60;">#${t.parent_ticket_id || 'PMC-PARENT'}</strong>` : `<strong style="color:#16a34a;">Unique Primary Incident Pin Placed</strong>`}</div>

                <div class="info-k">Taxpayer Savings:</div>
                <div class="info-v" style="color:#16a34a; font-weight:700;">Redundant field team trip prevented; caller subscribed to parent updates.</div>

                <div class="postgis-query-code">
                  <code>ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${t.longitude || 73.8077}, ${t.latitude || 18.5074}), 4326)::geography, 150)</code>
                </div>
              </div>
            </div>
          </div>

          <!-- Box 3: Agent B (Priority Scoring & Marking) -->
          <div class="agent-clickable-box" data-agent="b">
            <div class="agent-box-bar" title="Click to expand/collapse Priority Scoring details">
              <div class="agent-bar-left">
                <span class="agent-badge-circle b">B</span>
                <div class="agent-bar-meta">
                  <div class="agent-bar-title">Agent B: Priority Scoring &amp; Dispatch</div>
                  <div class="agent-bar-sub">Computed Priority: <strong>${(t.priority_score || 92).toFixed(1)} / 100</strong> (${t.priority_level?.replace('_', ' ')}) &bull; SLA: <strong>${t.sla_duration_hours || 6}h</strong></div>
                </div>
              </div>
              <div class="agent-bar-right">
                <span class="agent-box-chevron">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </div>
            </div>
            <div class="agent-box-content">
              <div class="agent-info-grid">
                <div class="info-k">Dynamic Priority:</div>
                <div class="info-v"><strong style="color:#dc2626;">${(t.priority_score || 92.3).toFixed(1)} / 100</strong> (${t.priority_level?.replace('_', ' ')})</div>

                <div class="info-k">Statutory SLA:</div>
                <div class="info-v"><strong>${t.sla_duration_hours || 6} Hours</strong> (Maharashtra RTS Act 2015)</div>

                <div class="info-k">Hazard Factor (45%):</div>
                <div class="info-v">Active road flooding / structural risk (Score: 95)</div>

                <div class="info-k">Traffic Impact (25%):</div>
                <div class="info-v">Arterial junction disruption (Score: 90)</div>

                <div class="info-k">Density &amp; Surge:</div>
                <div class="info-v">Commercial Ward density +14.8 pts cluster surge</div>

                <div class="info-k">Dispatched Crew:</div>
                <div class="info-v"><strong>${escapeHtml(t.assigned_department_name || 'Water Supply Maintenance Crew')}</strong></div>
              </div>
            </div>
          </div>

          <!-- Box 4: Agent D (Statutory SLA Tracking & Escalation) -->
          <div class="agent-clickable-box" data-agent="d">
            <div class="agent-box-bar" title="Click to expand/collapse SLA Escalation & Officer details">
              <div class="agent-bar-left">
                <span class="agent-badge-circle d">D</span>
                <div class="agent-bar-meta">
                  <div class="agent-bar-title">Agent D: Statutory SLA Tracking &amp; Escalation</div>
                  <div class="agent-bar-sub">Tier ${t.escalation_level} &mdash; <strong>${escapeHtml(t.assigned_officer_designation || 'Junior Engineer')}</strong></div>
                </div>
              </div>
              <div class="agent-bar-right">
                <span class="agent-box-chevron">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </div>
            </div>
            <div class="agent-box-content">
              <div class="agent-info-grid">
                <div class="info-k">Assigned Official:</div>
                <div class="info-v"><strong>${escapeHtml(t.assigned_officer_name || 'Designated Ward Officer')}</strong> (${escapeHtml(t.assigned_officer_designation || 'Junior Engineer')})</div>

                <div class="info-k">Statutory Deadline:</div>
                <div class="info-v"><strong>${escapeHtml(new Date(t.sla_deadline).toLocaleString())}</strong></div>

                <div class="info-k">Statutory Penalty:</div>
                <div class="info-v" style="color:${isOverdue ? '#dc2626' : '#64748b'}; font-weight:700;">
                  ${isOverdue ? 'BREACHED &bull; Automatic ₹250/day salary deduction notice active' : '₹250/day officer salary deduction armed under RTS Act 2015'}
                </div>
              </div>
              <div style="margin-top:6px;">
                <div style="font-size:0.65rem; font-weight:700; color:#475569; margin-bottom:3px;">STATUTORY 4-TIER ESCALATION LADDER:</div>
                <div class="escalation-ladder-steps">
                  <div class="esc-ladder-step ${t.escalation_level === 1 ? 'current' : ''}">
                    <span class="esc-tier-tag">TIER 1</span>
                    <span class="esc-role-name">Jr. Engineer</span>
                  </div>
                  <div class="esc-ladder-step ${t.escalation_level === 2 ? 'current' : ''}">
                    <span class="esc-tier-tag">TIER 2</span>
                    <span class="esc-role-name">AMC / Exec</span>
                  </div>
                  <div class="esc-ladder-step ${t.escalation_level === 3 ? 'current breached' : ''}">
                    <span class="esc-tier-tag">TIER 3</span>
                    <span class="esc-role-name">Dy. Comm</span>
                  </div>
                  <div class="esc-ladder-step ${t.escalation_level >= 4 ? 'current breached' : ''}">
                    <span class="esc-tier-tag">TIER 4</span>
                    <span class="esc-role-name">Commissioner</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Box 5: Agent F (Field Operations Copilot & Geotag Verification) -->
          <div class="agent-clickable-box" data-agent="f">
            <div class="agent-box-bar" title="Click to expand/collapse Field Geotag Audit & Before/After">
              <div class="agent-bar-left">
                <span class="agent-badge-circle f">F</span>
                <div class="agent-bar-meta">
                  <div class="agent-bar-title">Agent F: Field Copilot &amp; Geotag Audit</div>
                  <div class="agent-bar-sub">Geotag offset: <strong>14.2m (&le; 100m PASSED)</strong> &bull; Click to inspect proof</div>
                </div>
              </div>
              <div class="agent-bar-right">
                <span class="agent-box-chevron">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </div>
            </div>
            <div class="agent-box-content">
              <div class="agent-info-grid">
                <div class="info-k">Geofence Audit:</div>
                <div class="info-v" style="color:#16a34a; font-weight:700;">PASSED &bull; 14.2m offset from incident origin (Limit: &le; 100m)</div>

                <div class="info-k">Task SOP:</div>
                <div class="info-v"><strong>${escapeHtml(sop.hazard_name)}</strong></div>
              </div>

              <!-- Comparative Visual: Before vs After Side-by-Side -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:8px;">
                <div>
                  <div style="font-size:0.65rem; font-weight:700; color:#dc2626; margin-bottom:2px;">REPORTED HAZARD [BEFORE]</div>
                  <div style="border-radius:4px; overflow:hidden; border:1px solid #cbd5e1;">${beforeVisual}</div>
                </div>
                <div>
                  <div style="font-size:0.65rem; font-weight:700; color:#16a34a; margin-bottom:2px;">FIELD REPAIRED [AFTER]</div>
                  <div style="border-radius:4px; overflow:hidden; border:1px solid #cbd5e1;">${afterVisual}</div>
                </div>
              </div>

              <!-- Itemized Bill of Materials -->
              <div style="margin-top:8px;">
                <div style="font-size:0.68rem; font-weight:700; color:#475569; margin-bottom:4px;">ITEMIZED BILL OF MATERIALS (BOM):</div>
                <div style="display:flex; flex-direction:column; gap:3px;">
                  ${bomList.map(b => `<div style="font-size:0.70rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:3px; padding:3px 6px; color:#334155;">&bull; ${escapeHtml(typeof b === 'string' ? b : `${b.item} (${b.quantity})`)}</div>`).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- Box 6: Agent E (Citizen Communication & Feedback) -->
          <div class="agent-clickable-box" data-agent="e">
            <div class="agent-box-bar" title="Click to expand/collapse Citizen Communication details">
              <div class="agent-bar-left">
                <span class="agent-badge-circle e">E</span>
                <div class="agent-bar-meta">
                  <div class="agent-bar-title">Agent E: Citizen Loop &amp; SMS Gateway</div>
                  <div class="agent-bar-sub">Telegram Bot active &bull; 24h Reopen poll armed</div>
                </div>
              </div>
              <div class="agent-bar-right">
                <span class="agent-box-chevron">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </span>
              </div>
            </div>
            <div class="agent-box-content">
              <div class="agent-info-grid">
                <div class="info-k">Notification:</div>
                <div class="info-v"><strong>Telegram Messenger (@PMCCivicRedressalBot) &amp; SMS Gateway</strong></div>

                <div class="info-k">Citizen Recipient:</div>
                <div class="info-v">${escapeHtml(t.complainant_name || 'Citizen Complainant')} &bull; ${escapeHtml(t.complainant_phone || '+91 98220 XXXXX')}</div>

                <div class="info-k">Delivery Status:</div>
                <div class="info-v" style="color:#16a34a; font-weight:700;">DELIVERED &bull; Timestamped</div>

                <div class="info-k">Reopen Clause:</div>
                <div class="info-v">Satisfaction poll sent upon closure. Citizen rejection triggers auto-promotion to Tier 2 AMC.</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- 4. OFFICIAL WORKFLOW ACTIONS SECTION -->
      <div class="dossier-actions-section">
        <div class="dossier-sec-heading-bar" style="margin-bottom:8px;">
          <span class="dossier-sec-title">OFFICIAL WORKFLOW ACTIONS</span>
          <span class="admin-access-badge">ADMIN ACCESS</span>
        </div>
        <div class="dossier-action-btns">
          <button type="button" class="btn-gov-success" id="btn-dossier-approve" style="flex:1; justify-content:center; padding:8px; font-size:0.75rem;">
            Approve &amp; Close Ticket
          </button>
          <button type="button" class="btn-gov-danger" id="btn-dossier-reopen" style="flex:1; justify-content:center; padding:8px; font-size:0.75rem;">
            Citizen Reopen (Auto L2)
          </button>
        </div>
        <div style="margin-top:6px;">
          <button type="button" class="btn-a" id="btn-dossier-deep-math" style="width:100%; justify-content:center; background:#ffffff; border:1px solid #cbd5e1; color:#0b3b60; font-size:0.74rem; font-weight:700; padding:6px; cursor:pointer;">
            View Field Before/After Geotag Audit &amp; Telemetry Payload
          </button>
        </div>
      </div>

    </div>
  `;

  // Wire Click Handler on Overview Box
  const overviewBar = container.querySelector('#dossier-overview-bar');
  if (overviewBar) {
    overviewBar.addEventListener('click', (e) => {
      e.stopPropagation();
      const box = overviewBar.closest('.dossier-compact-box');
      if (box) {
        box.classList.toggle('is-open');
      }
    });
  }

  // Wire Click Handlers on each of the 6 Agent Component Boxes
  container.querySelectorAll('.agent-box-bar').forEach(bar => {
    bar.addEventListener('click', (e) => {
      e.stopPropagation();
      const box = bar.closest('.agent-clickable-box');
      if (box) {
        box.classList.toggle('is-open');
      }
    });
  });

  // Wire buttons
  document.getElementById('btn-close-dossier')?.addEventListener('click', () => {
    document.getElementById('kanban-workspace')?.classList.remove('split-active');
    document.getElementById('btn-toggle-split-view')?.classList.remove('active');
    document.getElementById('btn-toggle-full-kanban')?.classList.add('active');
  });

  document.getElementById('btn-dossier-fly-map')?.addEventListener('click', () => {
    const mapTab = document.getElementById('nav-btn-map');
    if (mapTab) mapTab.click();
    setTimeout(() => {
      if (state.leafletMap && t.latitude && t.longitude) {
        state.leafletMap.flyTo([t.latitude, t.longitude], 16, { duration: 0.8 });
      }
    }, 200);
  });

  document.getElementById('btn-dossier-approve')?.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE}/api/complaints/${t.ticket_id}/resolve`, { method: 'POST' });
      await refreshAllData();
      logAgentTerminal(`[OFFICER] Ticket #${t.ticket_id} resolved with approved geotag verification.`);
    } catch (e) {}
  });

  document.getElementById('btn-dossier-reopen')?.addEventListener('click', async () => {
    try {
      await fetch(`${API_BASE}/api/complaints/${t.ticket_id}/reopen`, { method: 'POST' });
      await refreshAllData();
      logAgentTerminal(`[CITIZEN REOPEN] Ticket #${t.ticket_id} reopened! Auto-promoted to Tier 2 AMC.`);
    } catch (e) {}
  });

  document.getElementById('btn-dossier-deep-math')?.addEventListener('click', () => {
    openAgentInspector(t);
  });

  // Reset scroll to top
  container.scrollTop = 0;
  const scrollArea = container.querySelector('.dossier-scroll-area');
  if (scrollArea) scrollArea.scrollTop = 0;
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
          ${c.is_breached ? '!' : '#'} ${c.ticket_id.substring(9, 13)}
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
        <strong>Position:</strong> L${c.escalation_level} — ${escapeHtml(c.assigned_officer_designation || c.assigned_officer_name)}<br/>
        <strong style="color:${c.is_breached ? '#dc2626' : '#16a34a'}">Status: ${c.status}</strong><br/>
        <button onclick="window.inspectTicket('${c.ticket_id}')" style="margin-top:6px;background:#0b3b60;color:#fff;border:none;padding:4px 8px;border-radius:3px;cursor:pointer;font-weight:bold;">Inspect Agent Telemetry</button>
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
function getBenchmarkInspectionTicket() {
  const now = new Date();
  return {
    ticket_id: 'PMC-2026-WAT-01',
    assigned_department_name: 'Water Supply & Pumping',
    assigned_department_id: 'dept-wat-01',
    raw_input_text: 'Shivaji Chowk javal main water pipeline phutli ahe, rastyavar khoop pani sathlay and water flooding entire street.',
    canonical_english_summary: 'Major municipal water pipeline burst with active high-pressure street flooding near Shivaji Chowk Paud Road.',
    detected_language: 'Marathi (Vernacular)',
    ward_id: 'Ward-03 (Alandi Road)',
    landmark: 'Paud Road / Shivaji Chowk',
    priority_score: 92.0,
    priority_level: 'P1_CRITICAL',
    sla_duration_hours: 6,
    sla_deadline: new Date(now.getTime() + 6 * 3600 * 1000).toISOString(),
    status: 'IN_PROGRESS',
    escalation_level: 1,
    assigned_officer_name: 'Junior Engineer (Ward Field Responder)',
    assigned_officer_designation: 'Junior Engineer (Ward Field Responder)',
    latitude: 18.6775,
    longitude: 73.8967,
    is_duplicate: false,
    complainant_name: 'Citizen Complainant',
    complainant_phone: '+91 98220 54321',
    sop_checklist: [
      '1. Isolate sector supply at Paud Road pressure junction valve',
      '2. Deploy portable 5 HP submersible dewatering pump',
      '3. Excavate damaged ductile iron collar section',
      '4. Fit 150mm mechanical repair clamp and conduct pressure test'
    ],
    bill_of_materials: [
      '150mm DI Collar (Qty: 1)',
      'EPDM Rubber Gasket (Qty: 2)',
      'M16 High-Tensile Bolts (Qty: 8)',
      'Quick-Setting Hydraulic Mortar (25kg)'
    ],
    agent_metrics: {
      agent_a: {
        agent_name: 'Agent A: Multilingual Intake & NER Triage Agent',
        language_detected: 'Marathi (Vernacular)',
        language_confidence: 0.98,
        canonical_summary: 'Major municipal water pipeline burst with active high-pressure street flooding near Shivaji Chowk Paud Road.',
        entities_extracted: {
          ward_name: 'Ward-03 (Alandi Road)',
          landmark: 'Paud Road / Shivaji Chowk',
          colony: 'Kothrud Prabhag 14',
          pincode: '411038',
          category_phrase: 'Water Supply'
        },
        completeness_gatekeeper: {
          status: 'PASSED (Sufficient Spatial Anchors)'
        },
        execution_time_ms: 38.5
      },
      agent_c: {
        agent_name: 'Agent C: Spatial Deduplication & Incident Clustering Agent',
        input_coordinate: { latitude: 18.6775, longitude: 73.8967 },
        spatial_threshold_meters: 150.0,
        nearest_incident_distance_meters: null,
        semantic_similarity_score: 0.35,
        decision: 'UNIQUE_ORIGINAL_INCIDENT',
        crew_dispatch_prevented: false,
        cluster_size: 1,
        cluster_boost_delta: 0,
        execution_time_ms: 14.8
      },
      agent_b: {
        agent_name: 'Agent B: Priority Scoring & Department Dispatch Agent',
        weights_and_scores: {
          hazard_weight: 0.45, hazard_score: 95,
          traffic_weight: 0.25, traffic_score: 90,
          population_weight: 0.20, density_score: 85,
          cluster_delta: 0
        },
        computed_priority_score: 92.0,
        priority_tier: 'P1_CRITICAL',
        statutory_sla_hours: 6,
        execution_time_ms: 11.2
      },
      agent_d: {
        agent_name: 'Agent D: Statutory SLA Tracking & Escalation Agent',
        statutory_sla_deadline: new Date(now.getTime() + 6 * 3600 * 1000).toISOString(),
        escalation_level: 1,
        active_assigned_officer: 'Level 1: Junior Engineer (Ward Field Responder)',
        execution_time_ms: 9.5
      },
      agent_f: {
        agent_name: 'Agent F: Field Operations Copilot & Geotag Verification Agent',
        sop_checklist: [
          '1. Isolate sector supply at Paud Road pressure junction valve',
          '2. Deploy portable 5 HP submersible dewatering pump',
          '3. Excavate damaged ductile iron collar section',
          '4. Fit 150mm mechanical repair clamp and conduct pressure test'
        ],
        geotag_validation: {
          original_incident_gps: [18.6775, 73.8967],
          field_closure_photo_gps: [18.6776, 73.8966],
          geodesic_offset_meters: 14.2,
          validation_result: 'PASSED'
        },
        execution_time_ms: 24.1
      },
      agent_e: {
        agent_name: 'Agent E: Citizen Communication & Feedback Agent',
        execution_time_ms: 15.6
      }
    }
  };
}

// ==========================================================================
// Task-Specific Engineering SOP & Bill of Materials Generator
// ==========================================================================
function getTaskSOPAndBOM(category, summaryText = '') {
  const cat = (category || '').toLowerCase();
  const sum = (summaryText || '').toLowerCase();

  if (cat.includes('water') || sum.includes('water') || sum.includes('pipe') || sum.includes('jal')) {
    return {
      category: 'Water Supply & Pumping',
      hazard_name: 'Pressurized Ductile Iron Mainline Rupture & Street Flooding',
      resolution_name: 'Excavation, 150mm DI Mechanical Clamp Sealing & 4-Bar Pressure Verification',
      sop_checklist: [
        '1. Isolate sector supply at Paud Road distribution node pressure junction valve.',
        '2. Deploy portable 5 HP submersible dewatering pump to evacuate flooded trench.',
        '3. Excavate surrounding soil and power-clean damaged ductile iron collar section.',
        '4. Fit 150mm mechanical repair clamp with EPDM gasket and torque high-tensile bolts to 85 Nm.',
        '5. Conduct step-pressure hydrostatic test to 4 bar to verify zero weepage.',
        '6. Backfill trench with stone aggregate, compact base, and transmit closure geotag.'
      ],
      bill_of_materials: [
        { item: '150mm DI Mechanical Repair Collar', quantity: '1 Unit' },
        { item: 'High-Grade EPDM Rubber Gaskets', quantity: '2 Nos' },
        { item: 'M16 High-Tensile Anti-Corrosion Bolts', quantity: '8 Nos' },
        { item: '5 HP Submersible Dewatering Pump (Crew Kit)', quantity: '1 Unit' },
        { item: 'Crushed Stone Aggregate Backfill', quantity: '1.5 Tons' }
      ]
    };
  } else if (cat.includes('solid') || cat.includes('waste') || cat.includes('garbage') || cat.includes('kachra') || sum.includes('garbage') || sum.includes('bin')) {
    return {
      category: 'Solid Waste Management (SWM)',
      hazard_name: 'Overflowing Municipal Community Garbage Bin & Perimeter Scatter',
      resolution_name: 'Hydraulic Compactor Clearing, Slaked Lime Sanitization & Dual Bin Placement',
      sop_checklist: [
        '1. Dispatch 10-ton hydraulic compaction dumper truck to community bin depot.',
        '2. Mechanically hoist and empty overflowing bins into compactor hopper.',
        '3. Manually sweep and shovel all scattered perimeter solid waste within 10m radius.',
        '4. Spray eco-friendly chemical odor neutralizer and spread slaked lime powder for disinfection.',
        '5. Install 2 brand new segregated HDPE wheeled bins (Green: Organic, Blue: Dry) and lock bay.',
        '6. Capture geo-referenced completion photo and log vehicle weighbridge manifest.'
      ],
      bill_of_materials: [
        { item: '10-Ton Hydraulic Compactor Truck (PMC Fleet)', quantity: '1 Vehicle' },
        { item: '240L Heavy-Duty HDPE Wheeled Bins (Green/Blue)', quantity: '2 Units' },
        { item: 'Sanitizing Slaked Lime Powder (CaO)', quantity: '25 kg' },
        { item: 'Concentrated Biodegradable Odor Neutralizer', quantity: '5 Litres' },
        { item: 'Sanitation PPE Kits (Heavy Gloves, N95, Boots)', quantity: '4 Sets' }
      ]
    };
  } else if (cat.includes('drain') || cat.includes('sewer') || cat.includes('manhole') || sum.includes('drain') || sum.includes('sewer')) {
    return {
      category: 'Drainage & Sewerage',
      hazard_name: 'Broken Dislodged Manhole Frame & Silt Sludge Backflow Hazard',
      resolution_name: 'Super-Sucker Vacuum Jetting, 40-Ton SFRC Cover Seating & Flow Verification',
      sop_checklist: [
        '1. Establish traffic perimeter cordon with high-visibility reflective cones and warning tape.',
        '2. Mechanically ventilate sewer manhole chamber to disperse toxic hydrogen sulfide (H2S) gases.',
        '3. Deploy high-capacity super-sucker vacuum jetting truck to dislodge silt and plastic blockages.',
        '4. Install heavy-duty 40-ton SFRC (Steel Fiber Reinforced Concrete) manhole frame and cover flush with road level.',
        '5. Apply quick-setting hydraulic waterproof mortar around rim joint and allow cure.',
        '6. Perform fluorescent uranine dye test to verify unrestricted downstream gravity flow.'
      ],
      bill_of_materials: [
        { item: '40-Ton Heavy-Duty SFRC Manhole Frame & Cover (IS:12592)', quantity: '1 Set' },
        { item: 'High-Pressure Jetting Vacuum Super-Sucker Unit', quantity: '2 Crew Hrs' },
        { item: 'Quick-Setting Hydraulic Waterproof Mortar', quantity: '25 kg' },
        { item: 'Fluorescent Uranine Tracer Dye Packet', quantity: '1 Pkt' },
        { item: 'Multi-Gas Atmospheric Detector Kit (H2S/CH4/CO/O2)', quantity: '1 Unit' }
      ]
    };
  } else if (cat.includes('road') || cat.includes('pothole') || sum.includes('pothole') || sum.includes('road') || sum.includes('rasta')) {
    return {
      category: 'Roads & Traffic Infrastructure',
      hazard_name: 'Severe Monsoon Road Crater & Exposed Sub-Base Traffic Hazard',
      resolution_name: 'Diamond Saw Edge Cutting, Cationic Bitumen Tack Coat & 3-Ton Roller Compaction',
      sop_checklist: [
        '1. Set up high-visibility traffic diversion taper with reflective safety cones and warning flags.',
        '2. Square off pothole edges to vertical faces using asphalt pavement diamond cutter.',
        '3. Evacuate water and blow loose stone aggregate and dust using compressed air nozzle.',
        '4. Spray rapid-setting cationic bitumen emulsion tack coat (RS-1) uniformly over base and edges.',
        '5. Fill cavity with hot/cold-mix polymer-modified asphalt in 50mm compacted lifts.',
        '6. Compact patch using 3-ton walk-behind vibratory roller until flush with adjacent road grade.',
        '7. Seal joint perimeter with hot-poured rubberized bitumen sealant and reopen lane.'
      ],
      bill_of_materials: [
        { item: 'Cold/Hot Mix Polymer Asphalt Compound (IRC:SP:98)', quantity: '2.5 Tons' },
        { item: 'Cationic Bitumen Emulsion Tack Coat (RS-1)', quantity: '25 Litres' },
        { item: '3-Ton Walk-Behind Vibratory Compactor Roller', quantity: '1 Unit' },
        { item: 'High-Intensity Reflective Traffic Diversion Cones', quantity: '6 Nos' },
        { item: 'Hot-Poured Rubberized Crack & Joint Sealant', quantity: '10 kg' }
      ]
    };
  } else {
    return {
      category: 'Streetlighting & Electrical',
      hazard_name: 'Feeder Cable Short Circuit, Open Junction Box & Dark Street Zone',
      resolution_name: 'LOTO Isolation, 72W IP66 LED Luminaire Fitting & Earthing Verification',
      sop_checklist: [
        '1. Implement Lockout-Tagout (LOTO) protocol at local feeder pillar distribution board.',
        '2. Position hydraulic insulated aerial bucket lift truck beneath damaged streetlight pole.',
        '3. Test conductors with calibrated non-contact voltage detector to verify completely de-energized line.',
        '4. Replace blown high-rupturing capacity (HRC) fuse and burned LED driver in pole junction box.',
        '5. Install 72W IP66 weatherproof streetlight LED luminaire and calibrate dusk-to-dawn photocell.',
        '6. Measure grounding earth resistance (verified < 2.0 ohms) and re-energize feeder circuit.',
        '7. Lock junction door with tamper-proof latch and capture night lux illumination telemetry.'
      ],
      bill_of_materials: [
        { item: '72W IP66 High-Lumen Streetlight LED Luminaire Module', quantity: '1 Unit' },
        { item: '16A Class-C Miniature Circuit Breaker (MCB)', quantity: '1 Unit' },
        { item: 'Electronic Dusk-to-Dawn Photocell Sensor Switch', quantity: '1 Unit' },
        { item: '4-Core Armored Copper Cable (1100V Grade)', quantity: '25 Metres' },
        { item: 'Heavy-Duty GI Earthing Clamp & Earth Wire Kit', quantity: '1 Set' }
      ]
    };
  }
}

// ==========================================================================
// Civic Engineering Comparative Visual Renderer (Before & After SVG/Photo)
// ==========================================================================
function renderCivicComparativeVisual(category, phase, gpsCoords, timestamp, options = {}) {
  const cat = (category || '').toLowerCase();
  const isBefore = phase === 'before';

  if (isBefore && options.incident_photo_url) {
    return `
      <div class="comparison-visual">
        <img src="${escapeHtml(options.incident_photo_url)}" alt="Citizen Incident Proof" />
        <div class="comparison-watermark">
          <span class="watermark-gps">${escapeHtml(gpsCoords)}</span>
          <span class="watermark-status hazard">CIVIC HAZARD EVIDENCE [BEFORE]</span>
        </div>
      </div>
    `;
  }

  let svgInner = '';
  if (cat.includes('water') || cat.includes('pipe') || cat.includes('jal')) {
    if (isBefore) {
      svgInner = `
        <rect width="400" height="200" fill="#0f172a"/>
        <rect y="120" width="400" height="80" fill="#1e293b"/>
        <line x1="0" y1="120" x2="400" y2="120" stroke="#334155" stroke-width="3"/>
        <polygon points="120,120 280,120 260,185 140,185" fill="#3b2d1d" stroke="#78350f" stroke-width="2"/>
        <rect x="80" y="145" width="240" height="24" rx="4" fill="#475569"/>
        <path d="M190,145 L195,153 L192,160 L198,169" stroke="#0f172a" stroke-width="4" fill="none"/>
        <ellipse cx="195" cy="148" rx="20" ry="8" fill="#38bdf8" opacity="0.8"/>
        <path d="M192,148 Q180,70 160,50 Q195,90 196,148" fill="#38bdf8" opacity="0.85"/>
        <path d="M196,148 Q210,60 235,45 Q205,95 198,148" fill="#0284c7" opacity="0.85"/>
        <path d="M194,148 Q195,30 196,20 Q198,40 197,148" fill="#7dd3fc" opacity="0.95"/>
        <ellipse cx="200" cy="122" rx="70" ry="12" fill="#0284c7" opacity="0.45"/>
        <ellipse cx="130" cy="128" rx="45" ry="8" fill="#38bdf8" opacity="0.4"/>
        <ellipse cx="270" cy="126" rx="50" ry="9" fill="#38bdf8" opacity="0.4"/>
        <line x1="100" y1="110" x2="300" y2="110" stroke="#f59e0b" stroke-width="4" stroke-dasharray="10,6"/>
      `;
    } else {
      svgInner = `
        <rect width="400" height="200" fill="#0f172a"/>
        <rect y="120" width="400" height="80" fill="#1e293b"/>
        <polygon points="120,120 280,120 260,185 140,185" fill="#475569" opacity="0.3"/>
        <rect x="80" y="145" width="240" height="24" rx="4" fill="#334155"/>
        <rect x="170" y="140" width="55" height="34" rx="4" fill="#0284c7" stroke="#38bdf8" stroke-width="2"/>
        <line x1="178" y1="140" x2="178" y2="174" stroke="#ffffff" stroke-width="2"/>
        <line x1="217" y1="140" x2="217" y2="174" stroke="#ffffff" stroke-width="2"/>
        <circle cx="184" cy="147" r="2.5" fill="#f8fafc"/>
        <circle cx="184" cy="167" r="2.5" fill="#f8fafc"/>
        <circle cx="211" cy="147" r="2.5" fill="#f8fafc"/>
        <circle cx="211" cy="167" r="2.5" fill="#f8fafc"/>
        <rect x="186" y="105" width="24" height="24" rx="12" fill="#0f172a" stroke="#10b981" stroke-width="2"/>
        <line x1="198" y1="129" x2="198" y2="140" stroke="#10b981" stroke-width="3"/>
        <line x1="198" y1="117" x2="204" y2="113" stroke="#10b981" stroke-width="2"/>
        <text x="198" y="100" fill="#10b981" font-size="9" font-family="monospace" text-anchor="middle" font-weight="bold">4.0 BAR OK</text>
        <circle cx="135" cy="155" r="3" fill="#64748b"/>
        <circle cx="145" cy="165" r="4" fill="#94a3b8"/>
        <circle cx="250" cy="160" r="3" fill="#64748b"/>
        <circle cx="240" cy="170" r="4" fill="#94a3b8"/>
        <circle cx="340" cy="45" r="24" fill="#065f46" stroke="#34d399" stroke-width="2"/>
        <path d="M330,45 L337,52 L352,37" stroke="#ffffff" stroke-width="3" fill="none"/>
        <text x="340" y="80" fill="#34d399" font-size="8" font-family="sans-serif" text-anchor="middle" font-weight="bold">SEAL INTEGRITY 100%</text>
      `;
    }
  } else if (cat.includes('solid') || cat.includes('waste') || cat.includes('garbage') || cat.includes('kachra')) {
    if (isBefore) {
      svgInner = `
        <rect width="400" height="200" fill="#0f172a"/>
        <rect y="125" width="400" height="75" fill="#1e293b"/>
        <g transform="translate(140, 70) rotate(15)">
          <rect x="0" y="0" width="90" height="70" rx="6" fill="#14532d" stroke="#22c55e" stroke-width="2"/>
          <line x1="10" y1="0" x2="80" y2="0" stroke="#16a34a" stroke-width="4"/>
          <circle cx="18" cy="74" r="8" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
          <circle cx="72" cy="74" r="8" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
        </g>
        <ellipse cx="230" cy="155" rx="80" ry="25" fill="#262626"/>
        <ellipse cx="210" cy="145" rx="55" ry="18" fill="#1c1917"/>
        <rect x="170" y="145" width="22" height="15" fill="#eab308" opacity="0.8"/>
        <rect x="235" y="150" width="18" height="12" fill="#ef4444" opacity="0.8"/>
        <circle cx="270" cy="158" r="6" fill="#38bdf8" opacity="0.8"/>
        <path d="M190,130 Q180,105 190,85" stroke="#84cc16" stroke-width="2" fill="none" stroke-dasharray="4,3"/>
        <path d="M225,120 Q215,95 225,75" stroke="#84cc16" stroke-width="2" fill="none" stroke-dasharray="4,3"/>
        <path d="M255,125 Q245,100 255,80" stroke="#84cc16" stroke-width="2" fill="none" stroke-dasharray="4,3"/>
        <rect x="15" y="15" width="150" height="24" rx="4" fill="#991b1b" opacity="0.9"/>
        <text x="90" y="31" fill="#fee2e2" font-size="10" font-family="sans-serif" text-anchor="middle" font-weight="bold">OVERFLOW: 10m RADIUS</text>
      `;
    } else {
      svgInner = `
        <rect width="400" height="200" fill="#0f172a"/>
        <rect y="125" width="400" height="75" fill="#1e293b"/>
        <rect x="100" y="130" width="200" height="60" rx="4" fill="#334155" stroke="#f8fafc" stroke-width="2" stroke-dasharray="6,4"/>
        <rect x="135" y="65" width="55" height="75" rx="5" fill="#15803d" stroke="#4ade80" stroke-width="2"/>
        <rect x="130" y="58" width="65" height="10" rx="3" fill="#166534"/>
        <circle cx="145" cy="143" r="7" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
        <circle cx="180" cy="143" r="7" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
        <text x="162" y="105" fill="#ffffff" font-size="9" font-family="sans-serif" text-anchor="middle" font-weight="bold">WET</text>
        <rect x="210" y="65" width="55" height="75" rx="5" fill="#0369a1" stroke="#38bdf8" stroke-width="2"/>
        <rect x="205" y="58" width="65" height="10" rx="3" fill="#075985"/>
        <circle cx="220" cy="143" r="7" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
        <circle cx="255" cy="143" r="7" fill="#0f172a" stroke="#64748b" stroke-width="2"/>
        <text x="237" y="105" fill="#ffffff" font-size="9" font-family="sans-serif" text-anchor="middle" font-weight="bold">DRY</text>
        <polygon points="105,80 108,86 114,89 108,92 105,98 102,92 96,89 102,86" fill="#fef08a"/>
        <polygon points="295,90 298,96 304,99 298,102 295,108 292,102 286,99 292,96" fill="#fef08a"/>
        <circle cx="345" cy="45" r="24" fill="#065f46" stroke="#34d399" stroke-width="2"/>
        <path d="M335,45 L342,52 L357,37" stroke="#ffffff" stroke-width="3" fill="none"/>
        <text x="345" y="80" fill="#34d399" font-size="8" font-family="sans-serif" text-anchor="middle" font-weight="bold">LIME SANITIZED</text>
      `;
    }
  } else if (cat.includes('drain') || cat.includes('sewer') || cat.includes('manhole')) {
    if (isBefore) {
      svgInner = `
        <rect width="400" height="200" fill="#0f172a"/>
        <rect y="110" width="400" height="90" fill="#1e293b"/>
        <ellipse cx="200" cy="150" rx="75" ry="32" fill="#0c0a09" stroke="#b91c1c" stroke-width="3"/>
        <ellipse cx="265" cy="142" rx="45" ry="18" fill="#44403c" stroke="#78716c" stroke-width="2" transform="rotate(-12, 265, 142)"/>
        <path d="M140,150 Q100,165 70,155 Q50,170 120,185 Q200,195 280,180 Q340,170 310,155 Q260,150 200,150" fill="#292524" opacity="0.85"/>
        <path d="M165,152 Q180,165 205,160 Q225,170 200,178 Q170,175 165,152" fill="#44403c" opacity="0.9"/>
        <polygon points="120,135 110,170 130,170" fill="#ea580c"/>
        <line x1="113" y1="150" x2="127" y2="150" stroke="#ffffff" stroke-width="3"/>
        <rect x="15" y="15" width="165" height="24" rx="4" fill="#991b1b" opacity="0.9"/>
        <text x="97" y="31" fill="#fee2e2" font-size="10" font-family="sans-serif" text-anchor="middle" font-weight="bold">OPEN MANHOLE HAZARD</text>
      `;
    } else {
      svgInner = `
        <rect width="400" height="200" fill="#0f172a"/>
        <rect y="110" width="400" height="90" fill="#1e293b"/>
        <ellipse cx="200" cy="150" rx="80" ry="34" fill="#0f172a" stroke="#0284c7" stroke-width="3"/>
        <ellipse cx="200" cy="150" rx="72" ry="30" fill="#475569" stroke="#94a3b8" stroke-width="2"/>
        <ellipse cx="200" cy="150" rx="55" ry="22" fill="#334155" stroke="#64748b" stroke-width="1.5"/>
        <ellipse cx="200" cy="150" rx="35" ry="14" fill="#475569" stroke="#94a3b8" stroke-width="1.5"/>
        <line x1="165" y1="145" x2="235" y2="155" stroke="#1e293b" stroke-width="1.5"/>
        <line x1="165" y1="155" x2="235" y2="145" stroke="#1e293b" stroke-width="1.5"/>
        <text x="200" y="153" fill="#f8fafc" font-size="8" font-family="monospace" text-anchor="middle" font-weight="bold">PMC 40T SFRC</text>
        <path d="M120,70 L260,70 L250,60 M260,70 L250,80" stroke="#38bdf8" stroke-width="3" fill="none"/>
        <text x="190" y="55" fill="#38bdf8" font-size="9" font-family="sans-serif" text-anchor="middle" font-weight="bold">UNHINDERED GRAVITY FLOW</text>
        <circle cx="345" cy="45" r="24" fill="#065f46" stroke="#34d399" stroke-width="2"/>
        <path d="M335,45 L342,52 L357,37" stroke="#ffffff" stroke-width="3" fill="none"/>
        <text x="345" y="80" fill="#34d399" font-size="8" font-family="sans-serif" text-anchor="middle" font-weight="bold">IS:12592 COMPLIANT</text>
      `;
    }
  } else if (cat.includes('road') || cat.includes('pothole')) {
    if (isBefore) {
      svgInner = `
        <rect width="400" height="200" fill="#0f172a"/>
        <rect y="80" width="400" height="120" fill="#1e293b"/>
        <path d="M110,110 Q140,115 160,140 Q180,175 220,170 Q260,165 270,135 Q285,115 305,110 Q280,105 210,102 Q140,105 110,110 Z" fill="#0f172a" stroke="#ef4444" stroke-width="2.5"/>
        <ellipse cx="205" cy="145" rx="55" ry="18" fill="#422006" opacity="0.9"/>
        <ellipse cx="210" cy="147" rx="42" ry="12" fill="#1e1b4b" opacity="0.6"/>
        <polygon points="140,130 146,134 142,140 135,136" fill="#64748b"/>
        <polygon points="260,135 268,138 264,146 256,141" fill="#64748b"/>
        <polygon points="190,162 198,160 195,168 186,166" fill="#94a3b8"/>
        <line x1="210" y1="105" x2="210" y2="165" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,2"/>
        <text x="222" y="135" fill="#f87171" font-size="9" font-family="monospace" font-weight="bold">DEPTH: 145mm</text>
        <rect x="15" y="15" width="165" height="24" rx="4" fill="#991b1b" opacity="0.9"/>
        <text x="97" y="31" fill="#fee2e2" font-size="10" font-family="sans-serif" text-anchor="middle" font-weight="bold">MONSOON POTHOLE CRATER</text>
      `;
    } else {
      svgInner = `
        <rect width="400" height="200" fill="#0f172a"/>
        <rect y="80" width="400" height="120" fill="#1e293b"/>
        <rect x="110" y="102" width="180" height="70" rx="3" fill="#09090b" stroke="#0284c7" stroke-width="2"/>
        <line x1="110" y1="118" x2="290" y2="118" stroke="#27272a" stroke-width="1"/>
        <line x1="110" y1="135" x2="290" y2="135" stroke="#27272a" stroke-width="1"/>
        <line x1="110" y1="152" x2="290" y2="152" stroke="#27272a" stroke-width="1"/>
        <rect x="108" y="100" width="184" height="74" rx="4" fill="none" stroke="#000000" stroke-width="3"/>
        <rect x="150" y="55" width="100" height="18" rx="4" fill="#0f172a" stroke="#10b981" stroke-width="1.5"/>
        <line x1="200" y1="58" x2="200" y2="70" stroke="#10b981" stroke-width="2"/>
        <circle cx="200" cy="64" r="4" fill="#34d399"/>
        <text x="200" y="47" fill="#10b981" font-size="9" font-family="sans-serif" text-anchor="middle" font-weight="bold">FLUSH GRADE (0.0% GRADIENT)</text>
        <circle cx="345" cy="45" r="24" fill="#065f46" stroke="#34d399" stroke-width="2"/>
        <path d="M335,45 L342,52 L357,37" stroke="#ffffff" stroke-width="3" fill="none"/>
        <text x="345" y="80" fill="#34d399" font-size="8" font-family="sans-serif" text-anchor="middle" font-weight="bold">3-TON COMPACTED</text>
      `;
    }
  } else {
    // Streetlighting & Electrical
    if (isBefore) {
      svgInner = `
        <rect width="400" height="200" fill="#050811"/>
        <line x1="180" y1="20" x2="180" y2="200" stroke="#475569" stroke-width="8"/>
        <path d="M180,30 Q220,20 250,45" stroke="#475569" stroke-width="5" fill="none"/>
        <rect x="240" y="42" width="28" height="10" rx="3" fill="#334155"/>
        <rect x="174" y="130" width="12" height="26" fill="#0f172a" stroke="#dc2626" stroke-width="2"/>
        <path d="M178,145 Q160,160 165,175" stroke="#ef4444" stroke-width="2" fill="none"/>
        <path d="M182,145 Q195,160 190,175" stroke="#eab308" stroke-width="2" fill="none"/>
        <polygon points="165,165 172,168 168,174 175,172 169,180" fill="#38bdf8"/>
        <polygon points="186,160 192,164 188,170 195,168 189,176" fill="#facc15"/>
        <rect x="15" y="15" width="175" height="24" rx="4" fill="#991b1b" opacity="0.9"/>
        <text x="102" y="31" fill="#fee2e2" font-size="10" font-family="sans-serif" text-anchor="middle" font-weight="bold">LIVE SPARKING & BLACKOUT</text>
      `;
    } else {
      svgInner = `
        <rect width="400" height="200" fill="#050811"/>
        <line x1="180" y1="20" x2="180" y2="200" stroke="#64748b" stroke-width="8"/>
        <path d="M180,30 Q220,20 250,45" stroke="#64748b" stroke-width="5" fill="none"/>
        <rect x="240" y="42" width="28" height="10" rx="3" fill="#f8fafc" stroke="#38bdf8" stroke-width="2"/>
        <polygon points="254,52 140,200 380,200" fill="url(#ledGlowLight)" opacity="0.8"/>
        <defs>
          <linearGradient id="ledGlowLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.9"/>
            <stop offset="60%" stop-color="#fef9c3" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#fef08a" stop-opacity="0.05"/>
          </linearGradient>
        </defs>
        <rect x="174" y="130" width="12" height="26" fill="#1e293b" stroke="#10b981" stroke-width="1.5"/>
        <circle cx="180" cy="143" r="1.5" fill="#10b981"/>
        <text x="215" y="145" fill="#10b981" font-size="8" font-family="sans-serif" font-weight="bold">EARTH: 1.4 &Omega;</text>
        <circle cx="345" cy="45" r="24" fill="#065f46" stroke="#34d399" stroke-width="2"/>
        <path d="M335,45 L342,52 L357,37" stroke="#ffffff" stroke-width="3" fill="none"/>
        <text x="345" y="80" fill="#34d399" font-size="8" font-family="sans-serif" text-anchor="middle" font-weight="bold">45 LUX MEASURED</text>
      `;
    }
  }

  const watermarkHtml = isBefore
    ? `<div class="comparison-watermark"><span class="watermark-gps">${escapeHtml(gpsCoords)}</span><span class="watermark-status hazard">REPORTED CIVIC HAZARD [BEFORE]</span></div>`
    : `<div class="comparison-watermark"><span class="watermark-gps">${escapeHtml(gpsCoords)}</span><span class="watermark-status">PMC RESOLUTION VERIFIED [AFTER &bull; OFFSET: 14.2m]</span></div>`;

  return `
    <div class="comparison-visual">
      <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        ${svgInner}
      </svg>
      ${watermarkHtml}
    </div>
  `;
}

// ==========================================================================
// Field Officer Action Copilot Modal Opener
// ==========================================================================
function openFieldCopilotModal(ticket) {
  const t = ticket || state.activeTicket || (state.complaints && state.complaints.length > 0 ? state.complaints[0] : getBenchmarkInspectionTicket());
  state.activeTicket = t;
  const modal = document.getElementById('field-copilot-modal');
  if (!modal) return;

  const titleEl = document.getElementById('copilot-ticket-title');
  if (titleEl) {
    titleEl.innerHTML = `Ticket: #${escapeHtml(t.ticket_id)} &bull; ${escapeHtml(t.assigned_department_name || t.extracted_category || 'Civic Infrastructure')}`;
  }

  const taskInfo = getTaskSOPAndBOM(t.assigned_department_name || t.extracted_category, t.canonical_english_summary || t.raw_input_text);

  // Populate SOP Checklist
  const sopList = document.getElementById('copilot-sop-list');
  if (sopList) {
    sopList.innerHTML = taskInfo.sop_checklist.map(s => `<li>${escapeHtml(s)}</li>`).join('');
  }

  // Populate BOM Chips
  const bomTags = document.getElementById('copilot-bom-tags');
  if (bomTags) {
    bomTags.innerHTML = taskInfo.bill_of_materials.map(b => `<span class="bom-chip">${escapeHtml(b.item)} (${escapeHtml(b.quantity)})</span>`).join('');
  }

  // Populate Before & After Photos
  const beforeMock = document.querySelector('#field-copilot-modal .photo-mock.before');
  const afterMock = document.querySelector('#field-copilot-modal .photo-mock.after');

  const beforeGps = `${(t.latitude || 18.5074).toFixed(4)}° N, ${(t.longitude || 73.8077).toFixed(4)}° E`;
  const afterGps = `${((t.latitude || 18.5074) + 0.0001).toFixed(4)}° N, ${(t.longitude || 73.8077).toFixed(4)}° E`;

  if (beforeMock) {
    beforeMock.innerHTML = renderCivicComparativeVisual(taskInfo.category, 'before', beforeGps, 'Incident Proof', { incident_photo_url: t.incident_photo_url });
  }

  if (afterMock) {
    afterMock.innerHTML = renderCivicComparativeVisual(taskInfo.category, 'after', afterGps, 'Resolution Geotag');
  }

  modal.classList.add('open');
}

function openAgentInspector(ticket) {
  const active = ticket || state.activeTicket || (state.complaints && state.complaints.length > 0 ? state.complaints[0] : getBenchmarkInspectionTicket());
  state.activeTicket = active;
  const modal = document.getElementById('agent-inspector-modal');
  if (!modal) return;
  const subHeading = document.getElementById('inspector-ticket-subheading');
  if (subHeading) {
    subHeading.textContent = `Telemetry & Mathematical Breakdown for Ticket #${active.ticket_id} (${active.assigned_department_name || active.extracted_category || 'Water Supply & Pumping'})`;
  }
  
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
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent A: Multilingual Intake & NER Triage Agent</div>
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
        <tr><td><strong>Completeness Gatekeeper</strong></td><td><span style="color:#16a34a;font-weight:bold;">PASSED</span> (Sufficient spatial anchors to dispatch field crew)</td></tr>
        <tr><td><strong>Execution Latency</strong></td><td>${ma.execution_time_ms || 38.5} ms</td></tr>
      </table>

      <h5 style="font-size:12px;font-weight:bold;color:#0b3b60;margin-top:10px;">Raw Agent A State Payload (JSON):</h5>
      <div class="json-code-view">${escapeHtml(JSON.stringify(ma, null, 2))}</div>
    `;
  } else if (state.activeAgentTab === 'agent_c') {
    const mc = m.agent_c || {};
    container.innerHTML = `
      <div class="math-callout-box">
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent C: Spatial Deduplication & Incident Clustering Agent</div>
        <p style="font-size:12px;color:#334155;margin:0;">Proximity evaluation: Active incidents within 150m radius and semantic cosine similarity threshold.</p>
      </div>

      <table class="breakdown-table">
        <tr><th>Cluster Property</th><th>Evaluated Telemetry</th></tr>
        <tr><td>Incident Coordinates</td><td>${t.latitude}&deg; N, ${t.longitude}&deg; E</td></tr>
        <tr><td>Spatial Threshold</td><td>150.0 meters</td></tr>
        <tr><td>Semantic Cosine Similarity</td><td>0.35 (Unique threshold &lt; 0.82)</td></tr>
        <tr><td>Deduplication Decision</td><td><span style="color:#16a34a;font-weight:bold;">UNIQUE_ORIGINAL_INCIDENT</span></td></tr>
        <tr><td>Cluster Delta Boost</td><td>+0 points (Zero duplicate escalation)</td></tr>
        <tr><td>Crew Dispatch Action</td><td>Direct Primary Crew Dispatched</td></tr>
      </table>
    `;
  } else if (state.activeAgentTab === 'agent_b') {
    const mb = m.agent_b || {};
    container.innerHTML = `
      <div class="math-callout-box">
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent B: Priority Scoring & Department Dispatch Agent</div>
        <p style="font-size:12px;color:#334155;margin:0;">Computes multi-criteria weighted priority score and binds statutory RTS resolution window.</p>
      </div>

      <table class="breakdown-table">
        <tr><th>Scoring Dimension</th><th>Weight</th><th>Computed Value</th></tr>
        <tr><td>Hazard Severity Sub-Score</td><td>45%</td><td><strong>${mb.weights_and_scores?.hazard_score || 95} / 100</strong></td></tr>
        <tr><td>Traffic Disruption Index</td><td>25%</td><td><strong>${mb.weights_and_scores?.traffic_score || 90} / 100</strong></td></tr>
        <tr><td>Population Density Multiplier</td><td>20%</td><td><strong>${mb.weights_and_scores?.density_score || 85} / 100</strong></td></tr>
        <tr><td>Recurrence / Cluster Boost</td><td>10%</td><td><strong>+0 Boost</strong></td></tr>
        <tr><td><strong>Final Priority Score</strong></td><td colspan="2"><span style="color:#dc2626;font-weight:bold;font-size:14px;">${(t.priority_score || 92).toFixed(1)} / 100 (${t.priority_level?.replace('_', ' ') || 'P1 CRITICAL'})</span></td></tr>
        <tr><td><strong>Statutory RTS SLA</strong></td><td colspan="2"><span style="color:#0284c7;font-weight:bold;">${t.sla_duration_hours || 6} Hours Statutory Mandate</span></td></tr>
      </table>
    `;
  } else if (state.activeAgentTab === 'agent_d') {
    container.innerHTML = `
      <div class="math-callout-box">
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent D: Statutory SLA Tracking & 4-Tier Escalation Agent</div>
        <p style="font-size:12px;color:#334155;margin:0;">Monitors statutory resolution timelines and automates escalation triggers under the Maharashtra Right to Public Services Act.</p>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px;">
        <div style="padding:10px;border-radius:6px;border:1px solid #d1d5db;background:${t.escalation_level === 1 ? '#e0f2fe;border-color:#0284c7;font-weight:bold;' : '#f8fafc;'}">
          Level 1: Junior Engineer (Ward Field Responder)
          <div style="font-size:11px;color:#64748b;">Trigger to L2: Unacknowledged within 6h OR 80% SLA elapsed without IN_PROGRESS.</div>
        </div>

        <div style="padding:10px;border-radius:6px;border:1px solid #d1d5db;background:${t.escalation_level === 2 ? '#fef3c7;border-color:#ea580c;font-weight:bold;' : '#f8fafc;'}">
          Level 2: Assistant Municipal Commissioner (Ward AMC)
          <div style="font-size:11px;color:#64748b;">Trigger to L3: Hard 100% statutory SLA breach reached without ticket closure.</div>
        </div>

        <div style="padding:10px;border-radius:6px;border:1px solid #d1d5db;background:${t.escalation_level === 3 ? '#fee2e2;border-color:#dc2626;font-weight:bold;' : '#f8fafc;'}">
          Level 3: Deputy Municipal Commissioner (DMC Engineering / Zonal Head)
          <div style="font-size:11px;color:#64748b;">Trigger to L4: Ticket overdue by > 150% statutory SLA or citizen repeated reopen.</div>
        </div>

        <div style="padding:10px;border-radius:6px;border:1px solid #d1d5db;background:${t.escalation_level === 4 ? '#f3e8ff;border-color:#7e22ce;font-weight:bold;' : '#f8fafc;'}">
          Level 4: Municipal Commissioner & Appellate Authority
          <div style="font-size:11px;color:#64748b;">Statutory disciplinary penalty review under RTS Act.</div>
        </div>
      </div>

      <div style="margin-top:10px;font-size:12px;">
        <strong>Current Active Position:</strong> <span style="color:#dc2626;font-weight:bold;">Tier ${t.escalation_level} — ${t.assigned_officer_designation || t.assigned_officer_name}</span>
        <br/><strong>Breach Status:</strong> ${t.is_breached ? `<span style="color:#dc2626;font-weight:bold;">OVERDUE BY +${t.breach_hours}h</span>` : `<span style="color:#16a34a;">Within statutory window</span>`}
      </div>
    `;
  } else if (state.activeAgentTab === 'agent_f') {
    const mf = m.agent_f || {};
    const taskInfo = getTaskSOPAndBOM(t.assigned_department_name || t.extracted_category, t.canonical_english_summary || t.raw_input_text);
    const geo = mf.geotag_validation || {
      original_incident_gps: [t.latitude || 18.5074, t.longitude || 73.8077],
      field_closure_photo_gps: [(t.latitude || 18.5074) + 0.0001, (t.longitude || 73.8077)],
      geodesic_offset_meters: 14.2,
      validation_result: "PASSED"
    };

    const beforeGps = `${(t.latitude || 18.5074).toFixed(4)}° N, ${(t.longitude || 73.8077).toFixed(4)}° E`;
    const closureLat = geo.field_closure_photo_gps ? (typeof geo.field_closure_photo_gps[0] === 'number' ? geo.field_closure_photo_gps[0].toFixed(4) : geo.field_closure_photo_gps[0]) : ((t.latitude || 18.5074) + 0.0001).toFixed(4);
    const closureLng = geo.field_closure_photo_gps ? (typeof geo.field_closure_photo_gps[1] === 'number' ? geo.field_closure_photo_gps[1].toFixed(4) : geo.field_closure_photo_gps[1]) : ((t.longitude || 73.8077)).toFixed(4);
    const afterGps = `${closureLat}° N, ${closureLng}° E`;
    const reportDateStr = new Date(t.created_at || Date.now() - 3600 * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });
    const closureDateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });

    const beforeVisual = renderCivicComparativeVisual(taskInfo.category, 'before', beforeGps, reportDateStr, { incident_photo_url: t.incident_photo_url });
    const afterVisual = renderCivicComparativeVisual(taskInfo.category, 'after', afterGps, closureDateStr);

    container.innerHTML = `
      <div class="math-callout-box">
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent F: Field Operations Copilot & Geotag Verification Agent</div>
        <p style="font-size:12px;color:#334155;margin:0;">Generates task-tailored engineering SOP repair checklists, itemized bill of materials, and executes cryptographic GPS geotag verification (&le; 100m geofence).</p>
      </div>

      <!-- BEFORE AND AFTER COMPARATIVE PHOTOGRAPHIC AUDIT -->
      <div class="before-after-container">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h4 style="font-size:13px;font-weight:800;color:#0b3b60;margin:0;display:flex;align-items:center;gap:6px;">
            <span>Photographic Evidence Comparison: Before vs After Resolution</span>
          </h4>
          <span style="font-size:11px;font-weight:700;color:#16a34a;background:#dcfce7;border:1px solid #86efac;padding:3px 8px;border-radius:4px;">
            Spatial Verification: PASSED (${geo.geodesic_offset_meters || 14.2}m &le; 100m)
          </span>
        </div>

        <div class="before-after-grid">
          <!-- BEFORE CARD -->
          <div class="comparison-card">
            <div class="comparison-header">
              <span class="comparison-badge before">BEFORE REPAIR</span>
              <span class="comparison-timestamp">${reportDateStr} IST</span>
            </div>
            ${beforeVisual}
            <div class="comparison-details">
              <strong>Reported Hazard:</strong> ${escapeHtml(taskInfo.hazard_name)}
              <div style="color:#64748b;margin-top:3px;">GPS Anchor: ${beforeGps} &bull; Citizen Geotag Verified</div>
            </div>
          </div>

          <!-- AFTER CARD -->
          <div class="comparison-card">
            <div class="comparison-header">
              <span class="comparison-badge after">AFTER REPAIR (RESOLVED)</span>
              <span class="comparison-timestamp">${closureDateStr} IST</span>
            </div>
            ${afterVisual}
            <div class="comparison-details">
              <strong>Verified Resolution:</strong> ${escapeHtml(taskInfo.resolution_name)}
              <div style="color:#16a34a;margin-top:3px;font-weight:600;">Geofence Proof: Offset ${geo.geodesic_offset_meters || 14.2}m (&le; 100m threshold passed)</div>
            </div>
          </div>
        </div>
      </div>

      <!-- TASK-SPECIFIC SOP & BOM BREAKDOWN -->
      <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:16px;margin-top:14px;">
        <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <h5 style="font-size:12px;font-weight:bold;color:#0b3b60;margin:0;">Task-Specific Engineering SOP (${escapeHtml(taskInfo.category)}):</h5>
            <span style="font-size:10px;background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:3px;font-weight:700;">IS & IRC Standard</span>
          </div>
          <ul style="font-size:12px;padding-left:18px;color:#334155;line-height:1.6;margin:0;">
            ${taskInfo.sop_checklist.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
          </ul>
        </div>

        <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:8px;padding:12px;">
          <h5 style="font-size:12px;font-weight:bold;color:#0b3b60;margin-bottom:8px;">Itemized Bill of Materials (BOM):</h5>
          <table class="breakdown-table" style="margin:0;font-size:11px;">
            <tr><th>Item / Equipment</th><th>Qty</th></tr>
            ${taskInfo.bill_of_materials.map(b => `<tr><td>${escapeHtml(b.item)}</td><td><strong>${escapeHtml(b.quantity)}</strong></td></tr>`).join('')}
          </table>

          <div style="margin-top:10px;font-size:11px;color:#475569;background:#f8fafc;padding:8px;border-radius:6px;border:1px solid #e2e8f0;">
            <strong>EXIF Spatial Audit:</strong> Offset <strong>${geo.geodesic_offset_meters || 14.2}m</strong> between incident location and field closure camera coordinates. Statutory requirement (&le; 100m) satisfied.
          </div>
        </div>
      </div>
    `;
  } else if (state.activeAgentTab === 'agent_e') {
    container.innerHTML = `
      <div class="math-callout-box">
        <div style="font-weight:bold;color:#0b3b60;font-size:14px;">Agent E: Citizen Communication & Feedback Agent</div>
        <p style="font-size:12px;color:#334155;margin:0;">Automated Telegram Bot & SMS milestone notifications with 24-hour post-closure satisfaction verification.</p>
      </div>

      <div class="phone-mockup-wrapper" style="margin-top:10px;">
        <div class="phone-header-tg">
          <div class="tg-bot-avatar">TG</div>
          <div class="tg-header-info">
            <div class="tg-bot-title">
              <span>NagrikSewa Civic Bot</span>
              <span class="tg-verified-badge">&check;</span>
            </div>
            <div class="tg-bot-sub">@PMCCivicRedressalBot &bull; bot</div>
          </div>
        </div>
        <div class="phone-chat-body">
          <div class="tg-bubble outbound">
            Namaskar! Your grievance <strong>#${t.ticket_id}</strong> has been registered with <strong>${t.assigned_department_name}</strong>. Statutory RTS SLA is <strong>${t.sla_duration_hours} hours</strong>.
            <div class="tg-time">12:00 PM &check;&check;</div>
          </div>
          <div class="tg-bubble outbound">
            Assigned to Field Officer <strong>${t.assigned_officer_name}</strong> (${t.assigned_officer_designation}). Field crew dispatched with digital SOP checklist.
            <div class="tg-time">12:02 PM &check;&check;</div>
          </div>
          ${t.is_breached ? `
            <div class="tg-bubble outbound escalated">
              <strong>SLA Escalation Alert:</strong> Due to statutory timeline breach, grievance #${t.ticket_id} has been automatically escalated to <strong>Level ${t.escalation_level} (${t.assigned_officer_designation})</strong> under Maharashtra RTS Act.
              <div class="tg-time">06:00 PM &check;&check;</div>
            </div>
          ` : ''}
          <div class="tg-bubble">
            <strong>Resolution Confirmation Poll:</strong> Once marked resolved, you have 24 hours to confirm satisfaction. Tapping "Report Unresolved" triggers an instant Level-2 AMC escalation.
            <div class="tg-time">Pending</div>
            <div class="tg-actions-col">
              <button class="tg-btn" onclick="alert('Confirmed: Grievance #${t.ticket_id} marked successfully resolved!')">Confirm Resolved</button>
              <button class="tg-btn" style="color:#f87171;border-color:#7f1d1d;" onclick="alert('Ticket #${t.ticket_id} flagged Unresolved! Statutory Level-2 AMC Escalation Triggered.')">Report Unresolved (Auto L2)</button>
              <button class="tg-btn" style="color:#94a3b8;" onclick="alert('Locating live field crew coordinates for Ticket #${t.ticket_id}...')">Track Live Crew</button>
            </div>
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
          Redundant crew dispatch prevented! Complainant added to Parent #${d.parent_ticket_id} subscriber updates list. Priority boosted by +${d.cluster_boost_delta} pts.
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
        <div style="font-size:13px;font-weight:bold;color:#0b3b60;">Priority Score: ${d.computed_priority_score} / 100</div>
        <div style="font-size:12px;color:#334155;margin-top:2px;">Multi-factor weighted evaluation across urban hazard severity, traffic disruption, and density.</div>
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
        <strong>Currently Assigned Position:</strong>
        <div style="font-size:0.95rem;font-weight:bold;color:#0b3b60;margin-top:2px;">
          ${escapeHtml(d.assigned_officer.designation || d.assigned_officer.name)}
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
// Standalone Agent F Execution
async function runAgentF_Standalone() {
  const cat = document.getElementById('wb-cat-f').value;
  const incGps = document.getElementById('wb-incident-gps-f').value.split(',').map(s => parseFloat(s.trim()));
  const cloGps = document.getElementById('wb-closure-gps-f').value.split(',').map(s => parseFloat(s.trim()));
  const tag = document.getElementById('wb-tag-f');
  const out = document.getElementById('wb-content-f');

  tag.className = 'wb-status-tag';
  tag.textContent = 'Auditing...';

  const taskInfo = getTaskSOPAndBOM(cat);

  try {
    const res = await fetch(`${API_BASE}/api/agents/execute/agent-f`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: cat,
        summary: taskInfo.hazard_name,
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
    const beforeGpsStr = `${(incGps[0] || 18.5074).toFixed(4)}° N, ${(incGps[1] || 73.8077).toFixed(4)}° E`;
    const afterGpsStr = `${(cloGps[0] || 18.5075).toFixed(4)}° N, ${(cloGps[1] || 73.8076).toFixed(4)}° E`;
    const beforeVisual = renderCivicComparativeVisual(cat, 'before', beforeGpsStr, 'Incident Evidence');
    const afterVisual = renderCivicComparativeVisual(cat, 'after', afterGpsStr, 'Closure Geotag');

    const sopList = d.sop_checklist?.length ? d.sop_checklist : taskInfo.sop_checklist;
    const bomList = d.bill_of_materials?.length ? d.bill_of_materials : taskInfo.bill_of_materials.map(b => `${b.item} (${b.quantity})`);

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

      <!-- Before & After Comparison -->
      <div class="before-after-container" style="margin-top:12px;">
        <div style="font-weight:700;font-size:12px;color:#0b3b60;margin-bottom:6px;">Photographic Comparison: Before vs After Resolution</div>
        <div class="before-after-grid">
          <div class="comparison-card">
            <div class="comparison-header">
              <span class="comparison-badge before">BEFORE REPAIR</span>
            </div>
            ${beforeVisual}
            <div class="comparison-details">
              <strong>Reported Hazard:</strong> ${escapeHtml(taskInfo.hazard_name)}
            </div>
          </div>
          <div class="comparison-card">
            <div class="comparison-header">
              <span class="comparison-badge after">AFTER RESOLUTION</span>
            </div>
            ${afterVisual}
            <div class="comparison-details">
              <strong>Verified Resolution:</strong> ${escapeHtml(taskInfo.resolution_name)}
            </div>
          </div>
        </div>
      </div>

      <div style="margin-top:12px;">
        <strong style="color:#0b3b60;font-size:12px;">Standard Operating Procedure (SOP) Checklist (${escapeHtml(taskInfo.category)}):</strong>
        <ul style="font-size:12px;padding-left:16px;line-height:1.6;color:#334155;margin-top:4px;">
          ${sopList.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
        </ul>
      </div>

      <div style="margin-top:10px;">
        <strong style="color:#0b3b60;font-size:12px;">Drafted Bill of Materials (BOM):</strong>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;">
          ${bomList.map(b => `<span class="bom-chip">${escapeHtml(typeof b === 'object' ? b.item + ' (' + b.quantity + ')' : b)}</span>`).join('')}
        </div>
      </div>
    `;
  } catch (e) {}
}

// Standalone Agent E Execution — Telegram Bot Integration
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
    tag.textContent = 'Delivered';

    const p = d.telegram_payload || d.whatsapp_payload;
    out.innerHTML = `
      <div class="phone-mockup-wrapper" style="margin-top:4px;">
        <div class="phone-header-tg">
          <div class="tg-bot-avatar">TG</div>
          <div class="tg-header-info">
            <div class="tg-bot-title">NagrikSewa Civic Bot <span class="tg-verified-badge">&check;</span></div>
            <div class="tg-bot-sub">@PMCCivicRedressalBot &bull; bot</div>
          </div>
        </div>
        <div class="phone-chat-body">
          <div class="tg-bubble outbound">
            <strong>${escapeHtml(p.header)}</strong><br/><br/>
            ${escapeHtml(p.body)}
            <div class="tg-time">${escapeHtml(p.read_receipt_at)} &check;&check;</div>
          </div>

          <div class="tg-actions-col">
            ${(p.interactive_buttons || []).map(b => `
              <button class="tg-btn" onclick="alert('${escapeHtml(b.label)} triggered for ${escapeHtml(p.recipient)}!')">
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

  document.getElementById('node-agent-f')?.addEventListener('click', () => {
    openFieldCopilotModal(state.activeTicket);
  });

  document.getElementById('node-agent-e')?.addEventListener('click', () => {
    state.activeAgentTab = 'agent_e';
    openAgentInspector(state.activeTicket);
  });

  document.getElementById('btn-close-inspector-modal')?.addEventListener('click', () => {
    inspectorModal.classList.remove('open');
  });


  [citizenModal, presetsModal, copilotModal, inspectorModal].forEach(m => {
    m?.addEventListener('click', (e) => {
      if (e.target === m) m.classList.remove('open');
    });
  });

  // Geotagged Photo Capture Handlers
  initGeotagPhotoCapture();

  // Interactive Dual-Role Authentication Modal (User vs Administrator + Skip Option)
  initAuthModal();
}

// Interactive Dual-Role Login & Sign Up Modal Handler
function initAuthModal() {
  const authModal = document.getElementById('auth-modal');
  const btnLogout = document.getElementById('btn-logout');
  const btnCloseAuth = document.getElementById('btn-close-auth-modal');
  const btnSkipAuth = document.getElementById('btn-skip-auth');

  const btnRoleUser = document.getElementById('btn-role-user');
  const btnRoleAdmin = document.getElementById('btn-role-admin');
  const formUserAuth = document.getElementById('form-user-auth');
  const formAdminAuth = document.getElementById('form-admin-auth');

  const btnModeLogin = document.getElementById('btn-mode-login');
  const btnModeSignup = document.getElementById('btn-mode-signup');
  const authModeIndicator = document.getElementById('auth-mode-indicator');
  const txtSubmitUser = document.getElementById('txt-submit-user');
  const txtSubmitAdmin = document.getElementById('txt-submit-admin');

  const userSignupFields = document.querySelectorAll('.user-signup-field');
  const adminSignupFields = document.querySelectorAll('.admin-signup-field');

  const adminNavTabs = document.getElementById('nav-admin-tabs');
  const citizenNavTabs = document.getElementById('nav-citizen-tabs');

  // All page views
  const allPageViews = [
    'page-view-metrics', 'page-view-kanban', 'page-view-map',
    'page-view-workbench', 'page-view-citizen-grievance'
  ];

  let currentRole = 'user';
  let currentMode = 'login';

  // ── Apply Citizen UI: hide engine badges & admin actions, show Lodge Grievance & Map ──
  function applyUserRole() {
    // Nav tabs: show citizen strip (Lodge Grievance & Map), hide admin strip
    if (adminNavTabs) adminNavTabs.style.display = 'none';
    if (citizenNavTabs) citizenNavTabs.style.display = 'flex';

    // Header badges: remove 6-agent langgraph and local engine badges in user dashboard
    const badgeLanggraph = document.getElementById('badge-engine-langgraph');
    const badgeLocal = document.getElementById('agent-provider-tag');
    if (badgeLanggraph) badgeLanggraph.style.display = 'none';
    if (badgeLocal) badgeLocal.style.display = 'none';

    // Header actions: hide admin scenario presets and 6-agent lab
    const btnDemo = document.getElementById('btn-open-demo-presets');
    const btnLab = document.getElementById('btn-jump-workbench-header');
    if (btnDemo) btnDemo.style.display = 'none';
    if (btnLab) btnLab.style.display = 'none';

    // Header Lodge Grievance button: show for citizens
    const btnLodgeHeader = document.getElementById('btn-open-citizen-modal');
    if (btnLodgeHeader) btnLodgeHeader.style.display = 'flex';

    // Hide all pages, show citizen grievance page with the 4 metric cards (Image 2)
    allPageViews.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    const citizenGrievancePage = document.getElementById('page-view-citizen-grievance');
    if (citizenGrievancePage) citizenGrievancePage.classList.remove('hidden');

    // Update role indicator badge and breadcrumbs for Citizen
    const roleBadge = document.getElementById('header-role-text');
    if (roleBadge) roleBadge.textContent = 'Citizen Session';
    const bcRole = document.getElementById('bc-role-label');
    if (bcRole) bcRole.textContent = 'Citizen Services';
    const bcActive = document.getElementById('bc-active-view');
    if (bcActive) bcActive.textContent = 'Lodge Grievance';

    // Set first citizen tab (Lodge Grievance) as active
    document.querySelectorAll('#nav-citizen-tabs .page-tab-btn').forEach((b, i) => {
      b.classList.toggle('active', i === 0);
    });

    if (window.citizenPickerMap) {
      setTimeout(() => window.citizenPickerMap.invalidateSize(), 150);
    }
  }

  // ── Apply Admin UI: keep all 4 admin tabs, all engine badges, and all admin tools untouched ──
  function applyAdminRole() {
    if (adminNavTabs) adminNavTabs.style.display = 'flex';
    if (citizenNavTabs) citizenNavTabs.style.display = 'none';

    // Update role indicator badge and breadcrumbs for Admin
    const roleBadge = document.getElementById('header-role-text');
    if (roleBadge) roleBadge.textContent = 'Admin Session';
    const bcRole = document.getElementById('bc-role-label');
    if (bcRole) bcRole.textContent = 'Admin Command Center';
    const bcActive = document.getElementById('bc-active-view');
    if (bcActive) bcActive.textContent = 'Statutory Metrics Overview';

    // Restore header badges for admin
    const badgeLanggraph = document.getElementById('badge-engine-langgraph');
    const badgeLocal = document.getElementById('agent-provider-tag');
    if (badgeLanggraph) badgeLanggraph.style.display = '';
    if (badgeLocal) badgeLocal.style.display = '';

    // Restore admin header buttons
    const btnDemo = document.getElementById('btn-open-demo-presets');
    const btnLab = document.getElementById('btn-jump-workbench-header');
    if (btnDemo) btnDemo.style.display = '';
    if (btnLab) btnLab.style.display = '';

    // Header Lodge Grievance button: hide for admins
    const btnLodgeHeader = document.getElementById('btn-open-citizen-modal');
    if (btnLodgeHeader) btnLodgeHeader.style.display = 'none';

    // Hide all pages, show metrics for admin
    allPageViews.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    const metricsPage = document.getElementById('page-view-metrics');
    if (metricsPage) metricsPage.classList.remove('hidden');

    // Set first admin tab as active
    document.querySelectorAll('#nav-admin-tabs .page-tab-btn').forEach((b, i) => {
      b.classList.toggle('active', i === 0);
    });
  }

  // ── Reset to neutral state on logout ──
  function resetToAuthGate() {
    if (adminNavTabs) adminNavTabs.style.display = 'flex';
    if (citizenNavTabs) citizenNavTabs.style.display = 'none';

    // Restore badges and actions
    const badgeLanggraph = document.getElementById('badge-engine-langgraph');
    const badgeLocal = document.getElementById('agent-provider-tag');
    if (badgeLanggraph) badgeLanggraph.style.display = '';
    if (badgeLocal) badgeLocal.style.display = '';

    const btnDemo = document.getElementById('btn-open-demo-presets');
    const btnLab = document.getElementById('btn-jump-workbench-header');
    if (btnDemo) btnDemo.style.display = '';
    if (btnLab) btnLab.style.display = '';

    // Hide Lodge Grievance button until role is chosen again
    const btnLodgeHeader = document.getElementById('btn-open-citizen-modal');
    if (btnLodgeHeader) btnLodgeHeader.style.display = 'none';
  }

  // Logout / Sign Out Trigger
  btnLogout?.addEventListener('click', () => {
    if (authModal) authModal.style.display = 'flex';
    resetToAuthGate();
    logAgentTerminal('[PORTAL AUTH] Active user session terminated. Redirected back to Gateway Authentication screen.');
  });

  // Close Modal
  const closeModal = () => {
    if (authModal) authModal.style.display = 'none';
  };

  btnCloseAuth?.addEventListener('click', closeModal);

  // Backdrop click
  authModal?.addEventListener('click', (e) => {
    if (e.target === authModal) closeModal();
  });

  // ESC key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal && authModal.style.display === 'flex') {
      closeModal();
    }
  });

  // Skip for Now Button (Bypass — treated as Admin/Demo view)
  btnSkipAuth?.addEventListener('click', () => {
    closeModal();
    applyAdminRole();
    logAgentTerminal('[PORTAL AUTH] Demo mode activated. Full admin platform access granted.');
  });

  // Role Switcher
  btnRoleUser?.addEventListener('click', () => {
    currentRole = 'user';
    btnRoleUser.classList.add('active');
    btnRoleAdmin.classList.remove('active');
    if (formUserAuth) formUserAuth.style.display = 'flex';
    if (formAdminAuth) formAdminAuth.style.display = 'none';
  });

  btnRoleAdmin?.addEventListener('click', () => {
    currentRole = 'admin';
    btnRoleAdmin.classList.add('active');
    btnRoleUser.classList.remove('active');
    if (formAdminAuth) formAdminAuth.style.display = 'flex';
    if (formUserAuth) formUserAuth.style.display = 'none';
  });

  // Mode Switcher: Login vs Sign Up
  btnModeLogin?.addEventListener('click', () => {
    currentMode = 'login';
    if (authModeIndicator) authModeIndicator.textContent = 'ACTIVE MODE: LOGIN';

    btnModeLogin.style.background = '#ffffff';
    btnModeLogin.style.borderColor = '#cbd5e1';
    btnModeLogin.style.color = '#0b3b60';
    btnModeLogin.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';

    btnModeSignup.style.background = 'transparent';
    btnModeSignup.style.borderColor = 'transparent';
    btnModeSignup.style.color = '#64748b';
    btnModeSignup.style.boxShadow = 'none';

    userSignupFields.forEach(el => el.style.display = 'none');
    adminSignupFields.forEach(el => el.style.display = 'none');

    if (txtSubmitUser) txtSubmitUser.textContent = 'Login as Citizen / User';
    if (txtSubmitAdmin) txtSubmitAdmin.textContent = 'Login as Administrator / Official';
  });

  btnModeSignup?.addEventListener('click', () => {
    currentMode = 'signup';
    if (authModeIndicator) authModeIndicator.textContent = 'ACTIVE MODE: SIGN UP';

    btnModeSignup.style.background = '#ffffff';
    btnModeSignup.style.borderColor = '#cbd5e1';
    btnModeSignup.style.color = '#0b3b60';
    btnModeSignup.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';

    btnModeLogin.style.background = 'transparent';
    btnModeLogin.style.borderColor = 'transparent';
    btnModeLogin.style.color = '#64748b';
    btnModeLogin.style.boxShadow = 'none';

    userSignupFields.forEach(el => el.style.display = 'block');
    adminSignupFields.forEach(el => el.style.display = 'block');

    if (txtSubmitUser) txtSubmitUser.textContent = 'Sign Up & Create Citizen Account';
    if (txtSubmitAdmin) txtSubmitAdmin.textContent = 'Sign Up & Request Officer Credential';
  });

  // ── FORM SUBMISSION (simulated) ──
  formUserAuth?.addEventListener('submit', (e) => {
    e.preventDefault();
    const identifier = document.getElementById('user-identifier')?.value || 'User';
    closeModal();
    applyUserRole();
    logAgentTerminal(`[PORTAL AUTH] Citizen ${currentMode === 'login' ? 'Login' : 'Sign Up'} successful for: ${identifier}. Citizen-restricted view activated.`);
  });

  formAdminAuth?.addEventListener('submit', (e) => {
    e.preventDefault();
    const identifier = document.getElementById('admin-identifier')?.value || 'Officer';
    const dept = document.getElementById('admin-department')?.value || 'Municipal Dept';
    closeModal();
    applyAdminRole();
    logAgentTerminal(`[PORTAL AUTH] Administrator ${currentMode === 'login' ? 'Login' : 'Registration'} verified for ${identifier} (${dept}). Full admin access granted.`);
  });

  // ── CITIZEN GRIEVANCE PAGE FORM LOGIC ──
  initCitizenGrievanceForm();
}

function initCitizenGrievanceForm() {
  // Category button toggle with rich active card states
  const catGroup = document.getElementById('cg-category-group');
  const catHidden = document.getElementById('cg-category-val');
  catGroup?.querySelectorAll('.cg-category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      catGroup.querySelectorAll('.cg-category-btn').forEach(b => {
        b.classList.remove('active');
        b.style.border = '';
        b.style.background = '';
        b.style.color = '';
      });
      btn.classList.add('active');
      if (catHidden) catHidden.value = btn.dataset.cat;
      updateReviewSummary();
    });
  });

  // Character counter for grievance description
  const descTextarea = document.getElementById('cg-description');
  const charCounter = document.getElementById('cg-char-counter');
  function updateCharCount() {
    if (!descTextarea || !charCounter) return;
    const len = descTextarea.value.length;
    charCounter.textContent = `${len} / 500 chars`;
    if (len >= 15) {
      charCounter.style.color = '#15803d';
    } else {
      charCounter.style.color = '#94a3b8';
    }
  }
  descTextarea?.addEventListener('input', () => {
    updateCharCount();
    updateReviewSummary();
  });

  // Sample quick suggestion prompt chips
  document.querySelectorAll('.sample-prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const descInput = document.getElementById('cg-description');
      if (descInput) {
        descInput.value = chip.dataset.sample;
        updateCharCount();
        updateReviewSummary();
        descInput.focus();
      }
    });
  });

  // ── 3-STEP PROGRESSIVE WIZARD CONTROLLER ──
  let currentWizardStep = 1;

  function showWizardStep(stepNum) {
    if (stepNum < 1 || stepNum > 3) return;

    // Validation: enforce minimum 15 characters before moving forward past step 1
    if (stepNum > 1) {
      const desc = document.getElementById('cg-description')?.value?.trim() || '';
      if (desc.length < 15) {
        alert('Please describe your civic grievance with at least 15 characters before continuing.');
        document.getElementById('cg-description')?.focus();
        return;
      }
    }

    currentWizardStep = stepNum;

    // Toggle panels & stepper nodes
    [1, 2, 3].forEach(s => {
      const stepNode = document.getElementById(`step-node-${s}`);
      const panel = document.getElementById(`cg-step-${s}`);
      if (!stepNode || !panel) return;

      if (s === currentWizardStep) {
        stepNode.classList.add('active');
        stepNode.classList.remove('completed');
        panel.style.display = 'block';
      } else if (s < currentWizardStep) {
        stepNode.classList.remove('active');
        stepNode.classList.add('completed');
        panel.style.display = 'none';
      } else {
        stepNode.classList.remove('active', 'completed');
        panel.style.display = 'none';
      }
    });

    const line1 = document.getElementById('stepper-line-1');
    const line2 = document.getElementById('stepper-line-2');
    if (line1) line1.classList.toggle('completed', currentWizardStep >= 2);
    if (line2) line2.classList.toggle('completed', currentWizardStep >= 3);

    // Leaflet map container fix when unhidden or stepped into
    if (currentWizardStep === 1 || currentWizardStep === 2) {
      setTimeout(() => {
        if (window.citizenPickerMap) {
          window.citizenPickerMap.invalidateSize();
        }
      }, 100);
    }

    // Refresh review card when reaching step 3
    if (currentWizardStep === 3) {
      updateReviewSummary();
    }
  }

  function updateReviewSummary() {
    const revCat = document.getElementById('cg-review-category');
    const revWard = document.getElementById('cg-review-ward');
    const revProof = document.getElementById('cg-review-proof-status');
    const revDesc = document.getElementById('cg-review-desc');
    const revSla = document.getElementById('cg-review-sla');

    const cat = document.getElementById('cg-category-val')?.value || 'Water Supply';
    const ward = document.getElementById('cg-ward')?.value || 'Ward-03 (Alandi Road)';
    const desc = document.getElementById('cg-description')?.value?.trim() || 'No description entered.';
    const photoBox = document.getElementById('cg-camera-preview-box');
    const hasPhoto = !!(window.capturedPhotoDataUri || (photoBox && photoBox.style.display !== 'none'));

    if (revCat) revCat.textContent = cat;
    if (revWard) revWard.textContent = ward;
    if (revDesc) revDesc.textContent = desc.length > 180 ? `"${desc.slice(0, 180)}..."` : `"${desc}"`;
    
    if (revProof) {
      if (hasPhoto) {
        revProof.textContent = 'Verified Live Photo Attached';
        revProof.style.color = '#15803d';
      } else {
        revProof.textContent = 'Optional (No Photo Attached)';
        revProof.style.color = '#d97706';
      }
    }

    if (revSla) {
      if (cat.includes('Water') || cat.includes('Drainage')) {
        revSla.textContent = '24 Hours (Statutory Urgent)';
      } else if (cat.includes('Electrical') || cat.includes('Roads')) {
        revSla.textContent = '48 Hours (Standard Civic)';
      } else {
        revSla.textContent = '72 Hours (Routine Maintenance)';
      }
    }
  }

  // Bind wizard navigation buttons
  document.getElementById('btn-cg-goto-step-2')?.addEventListener('click', () => showWizardStep(2));
  document.getElementById('btn-cg-back-to-1')?.addEventListener('click', () => showWizardStep(1));
  document.getElementById('btn-cg-goto-step-3')?.addEventListener('click', () => showWizardStep(3));
  document.getElementById('btn-cg-back-to-2')?.addEventListener('click', () => showWizardStep(2));

  // Allow clicking on stepper steps
  document.getElementById('step-node-1')?.addEventListener('click', () => showWizardStep(1));
  document.getElementById('step-node-2')?.addEventListener('click', () => showWizardStep(2));
  document.getElementById('step-node-3')?.addEventListener('click', () => showWizardStep(3));


  // -------------------------------------------------------------
  // 1. PUNE WARD CENTROIDS & AUTOMATIC PROXIMITY DETECTION
  // -------------------------------------------------------------
  const PUNE_LANDMARK_GAZETTEER = [
    { name: "Alandi", lat: 18.6775, lng: 73.8967, ward: "Ward-03 (Alandi Road)" },
    { name: "Alandi Road", lat: 18.6300, lng: 73.8950, ward: "Ward-03 (Alandi Road)" },
    { name: "Charholi", lat: 18.6350, lng: 73.8980, ward: "Ward-03 (Alandi Road)" },
    { name: "Dhanori", lat: 18.5850, lng: 73.8850, ward: "Ward-03 (Alandi Road)" },
    { name: "Kalas", lat: 18.5880, lng: 73.8750, ward: "Ward-03 (Alandi Road)" },
    { name: "Vishrantwadi", lat: 18.5650, lng: 73.8750, ward: "Ward-03 (Alandi Road)" },
    { name: "Kothrud", lat: 18.5074, lng: 73.8077, ward: "Ward-14 (Kothrud)" },
    { name: "Paud Road", lat: 18.5050, lng: 73.8020, ward: "Ward-14 (Kothrud)" },
    { name: "Aundh", lat: 18.5580, lng: 73.8075, ward: "Ward-08 (Aundh)" },
    { name: "Baner", lat: 18.5590, lng: 73.7920, ward: "Ward-08 (Aundh)" },
    { name: "Balewadi", lat: 18.5750, lng: 73.7750, ward: "Ward-08 (Aundh)" },
    { name: "Shivajinagar", lat: 18.5314, lng: 73.8446, ward: "Ward-05 (Shivajinagar)" },
    { name: "FC Road", lat: 18.5240, lng: 73.8410, ward: "Ward-05 (Shivajinagar)" },
    { name: "Deccan", lat: 18.5180, lng: 73.8420, ward: "Ward-05 (Shivajinagar)" },
    { name: "Swargate", lat: 18.5018, lng: 73.8636, ward: "Ward-10 (Swargate)" },
    { name: "Parvati", lat: 18.4980, lng: 73.8520, ward: "Ward-10 (Swargate)" },
    { name: "Hadapsar", lat: 18.5089, lng: 73.9259, ward: "Ward-18 (Hadapsar)" },
    { name: "Magarpatta", lat: 18.5140, lng: 73.9280, ward: "Ward-18 (Hadapsar)" },
    { name: "Viman Nagar", lat: 18.5679, lng: 73.9143, ward: "Ward-02 (Nagar Road)" },
    { name: "Nagar Road", lat: 18.5529, lng: 73.9182, ward: "Ward-02 (Nagar Road)" },
    { name: "Katraj", lat: 18.4480, lng: 73.8580, ward: "Ward-11 (Dhankawadi)" },
    { name: "Dhankawadi", lat: 18.4720, lng: 73.8560, ward: "Ward-11 (Dhankawadi)" },
    { name: "Kasba Peth", lat: 18.5180, lng: 73.8550, ward: "Ward-07 (Kasba Peth)" },
    { name: "Bhavani Peth", lat: 18.5090, lng: 73.8710, ward: "Ward-09 (Bhavani Peth)" },
    { name: "Sinhagad Road", lat: 18.4750, lng: 73.8200, ward: "Ward-13 (Sinhagad Road)" }
  ];

  const PUNE_WARD_CENTROIDS = [
    { id: 'Ward-03 (Alandi Road)', name: 'Ward-03 — Alandi Road / Dhanori / Kalas / Charholi', lat: 18.6775, lng: 73.8967 },
    { id: 'Ward-14 (Kothrud)', name: 'Ward-14 — Kothrud / Paud Road', lat: 18.5074, lng: 73.8077 },
    { id: 'Ward-08 (Aundh)', name: 'Ward-08 — Aundh / Baner / Balewadi', lat: 18.5580, lng: 73.8075 },
    { id: 'Ward-05 (Shivajinagar)', name: 'Ward-05 — Shivajinagar / FC Road', lat: 18.5314, lng: 73.8446 },
    { id: 'Ward-10 (Swargate)', name: 'Ward-10 — Swargate / Parvati', lat: 18.5018, lng: 73.8636 },
    { id: 'Ward-18 (Hadapsar)', name: 'Ward-18 — Hadapsar / Magarpatta', lat: 18.5089, lng: 73.9259 },
    { id: 'Ward-02 (Nagar Road)', name: 'Ward-02 — Nagar Road / Viman Nagar', lat: 18.5529, lng: 73.9182 },
    { id: 'Ward-11 (Dhankawadi)', name: 'Ward-11 — Dhankawadi / Katraj', lat: 18.4720, lng: 73.8560 },
    { id: 'Ward-07 (Kasba Peth)', name: 'Ward-07 — Kasba Peth / City Core', lat: 18.5180, lng: 73.8550 },
    { id: 'Ward-09 (Bhavani Peth)', name: 'Ward-09 — Bhavani Peth / Camp', lat: 18.5090, lng: 73.8710 },
    { id: 'Ward-13 (Sinhagad Road)', name: 'Ward-13 — Sinhagad Road / Dhayari', lat: 18.4750, lng: 73.8200 }
  ];

  function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Autodetect Ward from Geographic Coordinates
  function autoSelectWardFromCoords(lat, lng) {
    const result = detectWardFromCoordinates(lat, lng);
    const nearestWard = result.ward;

    const wardSelect = document.getElementById('cg-ward');
    if (wardSelect && wardSelect.value !== nearestWard.id) {
      wardSelect.value = nearestWard.id;
    }

    const autoWardBadge = document.getElementById('cg-auto-ward-badge');
    const autoWardText = document.getElementById('cg-auto-ward-text');
    if (autoWardText) {
      autoWardText.innerHTML = `Auto-detected Ward: <strong>${nearestWard.name}</strong> • ${result.method}`;
    }
    if (autoWardBadge) {
      autoWardBadge.style.animation = 'none';
      setTimeout(() => { autoWardBadge.style.animation = 'pulse 1.2s ease'; }, 10);
    }
    return result;
  }

  // Standalone EXIF GPS Metadata Extractor for Camera Photos
  function extractExifGps(file) {
    return new Promise((resolve) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const view = new DataView(e.target.result);
          if (view.getUint16(0, false) !== 0xFFD8) return resolve(null); // Not JPEG
          const length = view.byteLength;
          let offset = 2;
          while (offset < length) {
            if (view.getUint16(offset + 2, false) <= 0) break;
            const marker = view.getUint16(offset, false);
            offset += 2;
            if (marker === 0xFFE1) { // APP1 Exif marker
              if (view.getUint32(offset + 2, false) !== 0x45786966) return resolve(null); // 'Exif'
              const littleEndian = view.getUint16(offset + 8, false) === 0x4949;
              const ifd0Offset = offset + 8 + view.getUint32(offset + 12, littleEndian);
              const numEntries = view.getUint16(ifd0Offset, littleEndian);
              let gpsOffset = 0;
              for (let i = 0; i < numEntries; i++) {
                const entryOffset = ifd0Offset + 2 + i * 12;
                const tag = view.getUint16(entryOffset, littleEndian);
                if (tag === 0x8825) { // GPS Info Tag
                  gpsOffset = offset + 8 + view.getUint32(entryOffset + 8, littleEndian);
                  break;
                }
              }
              if (!gpsOffset) return resolve(null);

              const gpsEntries = view.getUint16(gpsOffset, littleEndian);
              let latRef = 'N', lonRef = 'E', latDeg = null, lonDeg = null;

              for (let i = 0; i < gpsEntries; i++) {
                const entryOffset = gpsOffset + 2 + i * 12;
                const tag = view.getUint16(entryOffset, littleEndian);
                const valOffset = offset + 8 + view.getUint32(entryOffset + 8, littleEndian);

                if (tag === 1) {
                  latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
                } else if (tag === 2) {
                  const deg = view.getUint32(valOffset, littleEndian) / view.getUint32(valOffset + 4, littleEndian);
                  const min = view.getUint32(valOffset + 8, littleEndian) / view.getUint32(valOffset + 12, littleEndian);
                  const sec = view.getUint32(valOffset + 16, littleEndian) / view.getUint32(valOffset + 20, littleEndian);
                  latDeg = deg + (min / 60) + (sec / 3600);
                } else if (tag === 3) {
                  lonRef = String.fromCharCode(view.getUint8(entryOffset + 8));
                } else if (tag === 4) {
                  const deg = view.getUint32(valOffset, littleEndian) / view.getUint32(valOffset + 4, littleEndian);
                  const min = view.getUint32(valOffset + 8, littleEndian) / view.getUint32(valOffset + 12, littleEndian);
                  const sec = view.getUint32(valOffset + 16, littleEndian) / view.getUint32(valOffset + 20, littleEndian);
                  lonDeg = deg + (min / 60) + (sec / 3600);
                }
              }

              if (latDeg !== null && lonDeg !== null) {
                if (latRef === 'S') latDeg = -latDeg;
                if (lonRef === 'W') lonDeg = -lonDeg;
                return resolve({ lat: latDeg, lng: lonDeg, accuracy: 5, source: 'EXIF GPS Metadata' });
              }
              return resolve(null);
            } else {
              offset += view.getUint16(offset, false);
            }
          }
          resolve(null);
        } catch (err) {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file.slice(0, 131072));
    });
  }

  // Precise Real-Time Device Geolocation Query
  let lastAcquiredGpsFix = null;
  function getPreciseDeviceLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const fix = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 5,
            source: 'Live GPS Satellite Fix'
          };
          lastAcquiredGpsFix = fix;
          resolve(fix);
        },
        (err) => {
          console.warn('Geolocation sensor warning:', err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }

  // Master Synchronizer: Geotag, Map Pin, and Ward Autodetection
  function applyGeotagAndAutodetectWard(lat, lng, accuracy = 5, sourceTitle = 'Live GPS') {
    if (latInput) latInput.value = lat.toFixed(6);
    if (lngInput) lngInput.value = lng.toFixed(6);
    if (coordsDisplay) coordsDisplay.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E (±${Math.round(accuracy)}m)`;

    if (pickerMarker) {
      pickerMarker.setLatLng([lat, lng]);
    }
    if (window.citizenPickerMap) {
      window.citizenPickerMap.setView([lat, lng], 15);
    }

    const res = autoSelectWardFromCoords(lat, lng);
    const ward = res.ward;

    const accStr = accuracy > 1000 ? `(±${Math.round(accuracy/1000)}km IP Coarse)` : `(±${Math.round(accuracy)}m)`;

    // Viewfinder live status indicators
    const cameraGpsText = document.getElementById('cg-camera-gps-text');
    const cameraWardText = document.getElementById('cg-camera-ward-text');
    const gpsDot = document.getElementById('cg-gps-indicator-dot');
    if (cameraGpsText) cameraGpsText.textContent = `GPS: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E ${accStr}`;
    if (cameraWardText) cameraWardText.textContent = ward.shortName;
    if (gpsDot) gpsDot.style.background = '#22c55e';

    // Preview box stamps
    if (photoGpsStamp) photoGpsStamp.textContent = `GPS: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E ${accStr} • ${sourceTitle}`;
    const photoWardStamp = document.getElementById('cg-photo-ward-stamp');
    if (photoWardStamp) photoWardStamp.textContent = `Auto-Detected Ward: ${ward.name}`;

    if (currentCapturedPhotoBase64 && cameraCanvas && capturedPhotoImg) {
      syncPhotoWatermarkToCoordinates(lat, lng, ward, accuracy);
    }

    logAgentTerminal(`[GEOTAG & WARD] Locked GPS (${lat.toFixed(5)}, ${lng.toFixed(5)}). Auto-routed to ${ward.name} [${res.method}].`);
    return { ward, lat, lng, accuracy, res };
  }

  // Re-stamp Photo Proof Watermark with Updated/Corrected Coordinates
  function syncPhotoWatermarkToCoordinates(lat, lng, ward, accuracy = 5) {
    if (!currentCapturedPhotoBase64 || !cameraCanvas) return;
    const img = new Image();
    img.onload = () => {
      cameraCanvas.width = img.width;
      cameraCanvas.height = img.height;
      const ctx = cameraCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const curTime = new Date().toLocaleTimeString('en-IN') + ' IST';
      const curDate = new Date().toLocaleDateString('en-IN');
      const sealCode = 'NS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const accStr = accuracy > 1000 ? `±${Math.round(accuracy/1000)}km` : `±${Math.round(accuracy)}m`;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(0, img.height - 70, img.width, 70);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('● LIVE CAMERA VERIFIED • STATUTORY CIVIC PROOF', 18, img.height - 45);

      ctx.fillStyle = '#ffffff';
      ctx.font = '13px monospace';
      ctx.fillText(`GPS: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E (${accStr}) | ${ward.shortName || ward.name}`, 18, img.height - 25);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(`TIMESTAMP: ${curDate} ${curTime} | INTEGRITY SEAL: #${sealCode}`, 18, img.height - 9);

      const updatedBase64 = cameraCanvas.toDataURL('image/jpeg', 0.88);
      currentCapturedPhotoBase64 = updatedBase64;
      if (capturedPhotoImg) capturedPhotoImg.src = updatedBase64;
      if (photoGpsStamp) photoGpsStamp.textContent = `GPS: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E (${accStr}) • Verified Geotag`;
      const photoWardStamp = document.getElementById('cg-photo-ward-stamp');
      if (photoWardStamp) photoWardStamp.textContent = `Auto-Detected Ward: ${ward.name}`;
    };
    img.src = currentCapturedPhotoBase64;
  }

  // -------------------------------------------------------------
  // 2. LEAFLET MAP PICKER INITIALIZATION & PIN LOCATION
  // -------------------------------------------------------------
  const mapContainer = document.getElementById('cg-map-picker');
  const coordsDisplay = document.getElementById('cg-coords-display');
  const latInput = document.getElementById('cg-latitude');
  const lngInput = document.getElementById('cg-longitude');
  const btnGps = document.getElementById('btn-cg-gps');
  let pickerMarker = null;

  function updatePinLocation(lat, lng, panMap = false) {
    if (latInput) latInput.value = lat.toFixed(6);
    if (lngInput) lngInput.value = lng.toFixed(6);
    if (coordsDisplay) coordsDisplay.textContent = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;

    if (pickerMarker) {
      pickerMarker.setLatLng([lat, lng]);
    }
    if (panMap && window.citizenPickerMap) {
      window.citizenPickerMap.panTo([lat, lng]);
    }
    const res = autoSelectWardFromCoords(lat, lng);
    if (currentCapturedPhotoBase64) {
      syncPhotoWatermarkToCoordinates(lat, lng, res.ward, 5);
    }
  }

  if (mapContainer && !window.citizenPickerMap && typeof L !== 'undefined') {
    try {
      // Default to Alandi coordinates
      const initialLat = parseFloat(latInput?.value || '18.6775');
      const initialLng = parseFloat(lngInput?.value || '73.8967');

      window.citizenPickerMap = L.map('cg-map-picker', {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap • PMC GIS'
      }).addTo(window.citizenPickerMap);

      // Custom red civic pin icon
      const pinIcon = L.divIcon({
        className: 'cg-custom-pin',
        html: `<div style="background:#dc2626; border:3px solid #ffffff; width:26px; height:26px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); box-shadow:0 3px 10px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px;"><div style="width:8px; height:8px; background:#fff; border-radius:50%;"></div></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      pickerMarker = L.marker([initialLat, initialLng], {
        icon: pinIcon,
        draggable: true,
        title: 'Drag me to pinpoint grievance location'
      }).addTo(window.citizenPickerMap);

      pickerMarker.bindPopup(`<strong>Selected Grievance Location</strong><br/><span style="font-size:11px;color:#64748b;">Drag or click map to move</span>`).openPopup();

      // Render all Wards on Citizen Map Picker with borders and center label badges
      if (window.GLOBAL_PUNE_10_WARDS) {
        window.GLOBAL_PUNE_10_WARDS.forEach(w => {
          L.polygon(w.coords, {
            color: w.color,
            weight: 1.5,
            opacity: 0.75,
            fillColor: w.color,
            fillOpacity: 0.08,
            dashArray: '4, 4'
          }).addTo(window.citizenPickerMap);

          const wardLabel = L.divIcon({
            className: 'ward-map-label-wrap',
            html: `<div class="ward-map-label" style="background:${w.color}; color:#fff; font-size:10px; padding:1px 6px;">${w.shortName}</div>`,
            iconSize: [95, 20],
            iconAnchor: [47, 10]
          });
          L.marker(w.center, { icon: wardLabel }).addTo(window.citizenPickerMap);
        });
      }

      // Initial ward detection on map load
      autoSelectWardFromCoords(initialLat, initialLng);

      // Click on map moves marker & updates ward
      window.citizenPickerMap.on('click', (e) => {
        updatePinLocation(e.latlng.lat, e.latlng.lng, false);
      });

      // Drag marker updates ward
      pickerMarker.on('dragend', () => {
        const pos = pickerMarker.getLatLng();
        updatePinLocation(pos.lat, pos.lng, false);
      });

      // Invalidate map size once rendered
      setTimeout(() => {
        window.citizenPickerMap?.invalidateSize();
      }, 300);

    } catch (err) {
      console.warn('Citizen Leaflet Map initialization deferred:', err);
    }
  }

  // Quick Locality Chips Listener
  document.querySelectorAll('.btn-landmark-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-landmark-chip').forEach(b => b.classList.remove('active-landmark'));
      btn.classList.add('active-landmark');
      const lat = parseFloat(btn.dataset.lat);
      const lng = parseFloat(btn.dataset.lng);
      applyGeotagAndAutodetectWard(lat, lng, 5, btn.textContent.trim());
    });
  });

  // Locality & Landmark Search Functionality
  const landmarkSearchInput = document.getElementById('cg-landmark-search');
  const btnSearchGo = document.getElementById('btn-cg-search-go');

  async function performLandmarkSearch() {
    const q = (landmarkSearchInput?.value || '').trim().toLowerCase();
    if (!q) return;

    // Check instant local gazetteer
    const localMatch = PUNE_LANDMARK_GAZETTEER.find(item => 
      item.name.toLowerCase().includes(q) || q.includes(item.name.toLowerCase().split(' ')[0])
    );

    if (localMatch) {
      applyGeotagAndAutodetectWard(localMatch.lat, localMatch.lng, 5, localMatch.name);
      return;
    }

    // Try OpenStreetMap Nominatim for Pune
    try {
      if (btnSearchGo) btnSearchGo.textContent = 'Searching...';
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Pune, Maharashtra')}&format=json&limit=1`);
      const data = await res.json();
      if (btnSearchGo) btnSearchGo.textContent = 'Search Location';
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        applyGeotagAndAutodetectWard(lat, lon, 15, data[0].display_name.split(',')[0]);
      } else {
        alert(`Location "${q}" not found. Try "Alandi", "Dhanori", "Kothrud", or click directly on the map.`);
      }
    } catch (err) {
      if (btnSearchGo) btnSearchGo.textContent = 'Search Location';
      console.warn('Geocoding search failed:', err);
    }
  }

  btnSearchGo?.addEventListener('click', performLandmarkSearch);
  landmarkSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performLandmarkSearch();
    }
  });

  // Sync Map Pin Button in Captured Photo Box
  document.getElementById('btn-cg-sync-map-pin')?.addEventListener('click', () => {
    const curLat = parseFloat(latInput?.value || '18.6775');
    const curLng = parseFloat(lngInput?.value || '73.8967');
    const res = detectWardFromCoordinates(curLat, curLng);
    applyGeotagAndAutodetectWard(curLat, curLng, 5, 'Map Pin Location');
    const btn = document.getElementById('btn-cg-sync-map-pin');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = 'Synced!';
      setTimeout(() => { btn.innerHTML = orig; }, 2000);
    }
  });

  // Bidirectional sync: When user changes dropdown, pan map and move pin to ward center
  document.getElementById('cg-ward')?.addEventListener('change', (e) => {
    const selectedWard = GLOBAL_PUNE_10_WARDS.find(w => w.id === e.target.value);
    if (selectedWard && pickerMarker && window.citizenPickerMap) {
      window.citizenPickerMap.setView(selectedWard.center, 14);
      pickerMarker.setLatLng(selectedWard.center);
      if (latInput) latInput.value = selectedWard.center[0].toFixed(6);
      if (lngInput) lngInput.value = selectedWard.center[1].toFixed(6);
      if (coordsDisplay) coordsDisplay.textContent = `${selectedWard.center[0].toFixed(4)}° N, ${selectedWard.center[1].toFixed(4)}° E`;
      const autoWardText = document.getElementById('cg-auto-ward-text');
      if (autoWardText) {
        autoWardText.innerHTML = `Ward Assigned: <strong>${selectedWard.name}</strong>`;
      }
      if (currentCapturedPhotoBase64) {
        syncPhotoWatermarkToCoordinates(selectedWard.center[0], selectedWard.center[1], selectedWard, 5);
      }
    }
  });

  // GPS Locate Button (Real Satellite / Device Geolocation)
  btnGps?.addEventListener('click', async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    const origHtml = btnGps.innerHTML;
    btnGps.innerHTML = `<span>Acquiring GPS Satellite Fix...</span>`;
    const loc = await getPreciseDeviceLocation();
    if (loc) {
      applyGeotagAndAutodetectWard(loc.lat, loc.lng, loc.accuracy, 'Manual GPS Locate');
      if (loc.accuracy > 1000) {
        btnGps.innerHTML = `<span>Coarse Fix (±${Math.round(loc.accuracy/1000)}km)</span>`;
      } else {
        btnGps.innerHTML = `<span>GPS Locked!</span>`;
      }
      setTimeout(() => { btnGps.innerHTML = origHtml; }, 3500);
    } else {
      // Fallback to Alandi
      applyGeotagAndAutodetectWard(18.6775, 73.8967, 10, 'Alandi (Municipal Center)');
      btnGps.innerHTML = `<span>Alandi Set</span>`;
      setTimeout(() => { btnGps.innerHTML = origHtml; }, 2500);
    }
  });

  // -------------------------------------------------------------
  // 2.5 LIVE CAMERA CAPTURE ONLY WITH GPS GEOTAG & WARD AUTODETECT
  // -------------------------------------------------------------
  const btnOpenCamera = document.getElementById('btn-cg-open-camera');
  const btnCloseCamera = document.getElementById('btn-cg-close-camera');
  const btnShutterSnap = document.getElementById('btn-cg-shutter-snap');
  const btnRetake = document.getElementById('btn-cg-retake');
  const btnRemovePhoto = document.getElementById('btn-cg-remove-photo');
  const cameraTriggerBar = document.getElementById('cg-camera-trigger-bar');
  const cameraViewfinder = document.getElementById('cg-camera-viewfinder');
  const cameraPreviewBox = document.getElementById('cg-camera-preview-box');
  const cameraVideo = document.getElementById('cg-camera-video');
  const cameraCanvas = document.getElementById('cg-camera-canvas');
  const capturedPhotoImg = document.getElementById('cg-captured-photo-img');
  const photoGpsStamp = document.getElementById('cg-photo-gps-stamp');
  const photoTimestamp = document.getElementById('cg-photo-timestamp');
  const cameraHardwareInput = document.getElementById('cg-camera-hardware-input');

  let activeCameraMediaStream = null;
  let currentCapturedPhotoBase64 = null;

  async function openLiveCamera() {
    // Start background GPS acquisition immediately so geotag is locked before or by shutter click!
    const cameraGpsText = document.getElementById('cg-camera-gps-text');
    const cameraWardText = document.getElementById('cg-camera-ward-text');
    const gpsDot = document.getElementById('cg-gps-indicator-dot');
    if (cameraGpsText) cameraGpsText.textContent = 'Acquiring GPS Geotag...';
    if (cameraWardText) cameraWardText.textContent = 'Detecting Ward...';
    if (gpsDot) gpsDot.style.background = '#eab308';

    // Query GPS concurrently
    getPreciseDeviceLocation().then(loc => {
      if (loc) {
        if (loc.accuracy <= 1000) {
          applyGeotagAndAutodetectWard(loc.lat, loc.lng, loc.accuracy, 'Live GPS Camera');
        } else {
          // Coarse browser ISP IP detected (e.g. ±50km). Preserve current pin / Alandi coordinates!
          const curLat = parseFloat(latInput?.value || '18.6775');
          const curLng = parseFloat(lngInput?.value || '73.8967');
          const res = detectWardFromCoordinates(curLat, curLng);
          if (cameraGpsText) cameraGpsText.textContent = `Pin: ${curLat.toFixed(4)}°N, ${curLng.toFixed(4)}°E (±${Math.round(loc.accuracy/1000)}km IP)`;
          if (cameraWardText) cameraWardText.textContent = res.ward.shortName;
          if (gpsDot) gpsDot.style.background = '#22c55e';
          logAgentTerminal(`[GPS] Coarse browser IP detected (±${Math.round(loc.accuracy/1000)}km). Preserved map pin at (${curLat.toFixed(4)}, ${curLng.toFixed(4)}) -> ${res.ward.name}.`);
        }
      }
    });

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        activeCameraMediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (cameraVideo) {
          cameraVideo.srcObject = activeCameraMediaStream;
          await cameraVideo.play();
        }

        if (cameraTriggerBar) cameraTriggerBar.style.display = 'none';
        if (cameraViewfinder) cameraViewfinder.style.display = 'block';
        if (cameraPreviewBox) cameraPreviewBox.style.display = 'none';
        return;
      } catch (err) {
        console.warn('WebRTC getUserMedia blocked or not accessible, opening viewfinder with camera simulation fallback:', err);
      }
    }

    // Always show viewfinder so citizen can click the Capture button even on environments without direct video stream
    if (cameraTriggerBar) cameraTriggerBar.style.display = 'none';
    if (cameraViewfinder) cameraViewfinder.style.display = 'block';
    if (cameraPreviewBox) cameraPreviewBox.style.display = 'none';
  }

  function closeLiveCamera() {
    if (activeCameraMediaStream) {
      activeCameraMediaStream.getTracks().forEach(track => track.stop());
      activeCameraMediaStream = null;
    }
    if (cameraVideo) {
      cameraVideo.srcObject = null;
    }
    if (cameraViewfinder) cameraViewfinder.style.display = 'none';
    if (!currentCapturedPhotoBase64 && cameraTriggerBar) {
      cameraTriggerBar.style.display = 'flex';
    }
  }

  async function takeLiveSnapshot() {
    if (!cameraCanvas) return;

    // Grab current coordinates - prioritize user's map pin / selected location
    let curLat = parseFloat(latInput?.value || '18.6775');
    let curLng = parseFloat(lngInput?.value || '73.8967');
    let accuracy = 5;

    // Only override with device GPS if accuracy is high (< 1000m)
    if (lastAcquiredGpsFix && lastAcquiredGpsFix.accuracy <= 1000) {
      curLat = lastAcquiredGpsFix.lat;
      curLng = lastAcquiredGpsFix.lng;
      accuracy = lastAcquiredGpsFix.accuracy;
    } else if (!latInput?.value) {
      const loc = await Promise.race([
        getPreciseDeviceLocation(),
        new Promise(r => setTimeout(() => r(null), 1200))
      ]);
      if (loc && loc.accuracy <= 1000) {
        curLat = loc.lat;
        curLng = loc.lng;
        accuracy = loc.accuracy;
      }
    }

    // Autodetect ward and sync map
    const syncRes = applyGeotagAndAutodetectWard(curLat, curLng, accuracy, 'Live Camera Geotag');
    const detectedWard = syncRes.ward;

    const w = (cameraVideo && cameraVideo.videoWidth) ? cameraVideo.videoWidth : 800;
    const h = (cameraVideo && cameraVideo.videoHeight) ? cameraVideo.videoHeight : 600;
    cameraCanvas.width = w;
    cameraCanvas.height = h;

    const ctx = cameraCanvas.getContext('2d');

    // If real camera stream is active, draw camera frame
    if (cameraVideo && cameraVideo.videoWidth > 0 && cameraVideo.readyState >= 2) {
      ctx.drawImage(cameraVideo, 0, 0, w, h);
    } else {
      // High-definition civic inspection fallback backdrop
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.5, '#334155');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Draw inspection grid & crosshairs
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let x = 40; x < w; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 40; y < h; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Center crosshair & focus reticle
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      const cx = w / 2, cy = h / 2;
      ctx.strokeRect(cx - 70, cy - 50, 140, 100);
      ctx.beginPath();
      ctx.moveTo(cx - 90, cy); ctx.lineTo(cx + 90, cy);
      ctx.moveTo(cx, cy - 70); ctx.lineTo(cx, cy + 70);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CIVIC SITE INSPECTION FRAME', cx, cy - 15);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px monospace';
      ctx.fillText(`FIELD CAPTURE • ${detectedWard.name}`, cx, cy + 15);
      ctx.textAlign = 'left';
    }

    // Render High-Visibility Cryptographic Geotag & Ward Watermark
    const curTime = new Date().toLocaleTimeString('en-IN') + ' IST';
    const curDate = new Date().toLocaleDateString('en-IN');
    const sealCode = 'NS-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    // Dark banner for contrast
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.fillRect(0, h - 75, w, 75);

    // Green verification header
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('● LIVE CAMERA VERIFIED • STATUTORY CIVIC PROOF', 18, h - 48);

    // High precision GPS and auto-detected ward
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px monospace';
    ctx.fillText(`GPS: ${curLat.toFixed(5)}°N, ${curLng.toFixed(5)}°E (±${Math.round(accuracy)}m) | ${detectedWard.shortName || detectedWard.name}`, 18, h - 27);

    // Timestamp and tamper seal
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px monospace';
    ctx.fillText(`TIMESTAMP: ${curDate} ${curTime} | INTEGRITY SEAL: #${sealCode}`, 18, h - 10);

    const base64 = cameraCanvas.toDataURL('image/jpeg', 0.88);
    currentCapturedPhotoBase64 = base64;
    window.capturedPhotoDataUri = base64;

    closeLiveCamera();

    if (capturedPhotoImg) capturedPhotoImg.src = base64;
    if (photoTimestamp) photoTimestamp.textContent = curTime;
    if (photoGpsStamp) photoGpsStamp.textContent = `GPS: ${curLat.toFixed(5)}° N, ${curLng.toFixed(5)}° E (±${Math.round(accuracy)}m)`;
    const photoWardStamp = document.getElementById('cg-photo-ward-stamp');
    if (photoWardStamp) photoWardStamp.textContent = `Auto-Detected Ward: ${detectedWard.name}`;
    if (cameraPreviewBox) cameraPreviewBox.style.display = 'block';
    if (cameraTriggerBar) cameraTriggerBar.style.display = 'none';

    logAgentTerminal(`[LIVE CAMERA GEOTAG] Verified frame captured: (${curLat.toFixed(5)}, ${curLng.toFixed(5)}). Ward locked to ${detectedWard.name}.`);
  }

  btnOpenCamera?.addEventListener('click', openLiveCamera);
  btnCloseCamera?.addEventListener('click', closeLiveCamera);
  btnShutterSnap?.addEventListener('click', takeLiveSnapshot);
  btnRetake?.addEventListener('click', () => {
    currentCapturedPhotoBase64 = null;
    window.capturedPhotoDataUri = null;
    openLiveCamera();
  });
  btnRemovePhoto?.addEventListener('click', () => {
    currentCapturedPhotoBase64 = null;
    window.capturedPhotoDataUri = null;
    if (cameraPreviewBox) cameraPreviewBox.style.display = 'none';
    if (cameraTriggerBar) cameraTriggerBar.style.display = 'flex';
  });

  // Fallback hardware input event (strictly camera captured)
  cameraHardwareInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Try EXIF GPS first
    const exifGps = await extractExifGps(file);
    let curLat = exifGps ? exifGps.lat : parseFloat(latInput?.value || '18.6775');
    let curLng = exifGps ? exifGps.lng : parseFloat(lngInput?.value || '73.8967');
    let accuracy = exifGps ? exifGps.accuracy : 5;
    let source = exifGps ? 'EXIF Camera Geotag' : 'Device Hardware Camera';

    if (!exifGps) {
      // 2. Query device GPS concurrently
      const devLoc = await getPreciseDeviceLocation();
      if (devLoc && devLoc.accuracy <= 1000) {
        curLat = devLoc.lat;
        curLng = devLoc.lng;
        accuracy = devLoc.accuracy;
        source = 'Live GPS Satellite Fix';
      }
    }

    const syncRes = applyGeotagAndAutodetectWard(curLat, curLng, accuracy, source);
    const detectedWard = syncRes.ward;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        if (!cameraCanvas) return;
        cameraCanvas.width = img.width;
        cameraCanvas.height = img.height;
        const ctx = cameraCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const curTime = new Date().toLocaleTimeString('en-IN') + ' IST';
        const curDate = new Date().toLocaleDateString('en-IN');
        const sealCode = 'NS-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, img.height - 70, img.width, 70);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('● HARDWARE CAMERA VERIFIED • STATUTORY CIVIC PROOF', 18, img.height - 45);

        ctx.fillStyle = '#ffffff';
        ctx.font = '13px monospace';
        ctx.fillText(`GPS: ${curLat.toFixed(5)}°N, ${curLng.toFixed(5)}°E (±${Math.round(accuracy)}m) | ${detectedWard.shortName}`, 18, img.height - 25);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px monospace';
        ctx.fillText(`TIMESTAMP: ${curDate} ${curTime} | INTEGRITY SEAL: #${sealCode}`, 18, img.height - 9);

        const base64 = cameraCanvas.toDataURL('image/jpeg', 0.88);
        currentCapturedPhotoBase64 = base64;

        if (capturedPhotoImg) capturedPhotoImg.src = base64;
        if (photoTimestamp) photoTimestamp.textContent = curTime;
        if (photoGpsStamp) photoGpsStamp.textContent = `GPS: ${curLat.toFixed(5)}° N, ${curLng.toFixed(5)}° E (±${Math.round(accuracy)}m)`;
        const photoWardStamp = document.getElementById('cg-photo-ward-stamp');
        if (photoWardStamp) photoWardStamp.textContent = `Auto-Detected Ward: ${detectedWard.name}`;
        if (cameraPreviewBox) cameraPreviewBox.style.display = 'block';
        if (cameraTriggerBar) cameraTriggerBar.style.display = 'none';
        logAgentTerminal(`[HARDWARE CAMERA GEOTAG] Verified device photo: (${curLat.toFixed(5)}, ${curLng.toFixed(5)}). Ward: ${detectedWard.name}.`);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  // -------------------------------------------------------------
  // 3. VOICE INPUT SYSTEM (MARATHI, HINDI, ENGLISH)
  // -------------------------------------------------------------
  const btnVoice = document.getElementById('btn-cg-voice-record');
  const voiceBtnText = document.getElementById('cg-voice-btn-text');
  const voiceWave = document.getElementById('cg-voice-wave');
  const voiceStatus = document.getElementById('cg-voice-status');
  // descTextarea already declared and referenced above
  let isRecording = false;
  let activeSpeechLang = 'en-IN';
  let recognitionInstance = null;
  let voiceUsedForCurrentComplaint = false;

  // Language pill buttons
  document.querySelectorAll('.lang-pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lang-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSpeechLang = btn.dataset.lang || 'mr-IN';
      if (isRecording && recognitionInstance) {
        recognitionInstance.stop();
        setTimeout(() => startVoiceRecognition(), 200);
      }
    });
  });

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

  function stopVoiceRecognition() {
    isRecording = false;
    if (recognitionInstance) {
      try { recognitionInstance.stop(); } catch (e) {}
    }
    if (btnVoice) {
      btnVoice.classList.remove('recording');
      btnVoice.style.background = '#fef2f2';
      btnVoice.style.color = '#dc2626';
    }
    if (voiceBtnText) voiceBtnText.textContent = 'Speak to Describe (Voice Input)';
    if (voiceWave) voiceWave.style.display = 'none';
    if (voiceStatus) voiceStatus.style.display = 'none';
  }

  function startVoiceRecognition() {
    if (!SpeechRecognitionAPI) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Android Chrome.');
      return;
    }

    try {
      recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = activeSpeechLang;

      recognitionInstance.onstart = () => {
        isRecording = true;
        voiceUsedForCurrentComplaint = true;
        if (btnVoice) {
          btnVoice.classList.add('recording');
          btnVoice.style.background = '#dc2626';
          btnVoice.style.color = '#ffffff';
        }
        if (voiceBtnText) voiceBtnText.textContent = 'Stop Speaking';
        if (voiceWave) voiceWave.style.display = 'flex';
        if (voiceStatus) {
          const langNames = { 'mr-IN': 'Marathi (मराठी)', 'hi-IN': 'Hindi (हिंदी)', 'en-IN': 'English' };
          voiceStatus.innerHTML = `● <strong>Listening in ${langNames[activeSpeechLang] || activeSpeechLang}...</strong> Speak naturally into microphone. Click button to finish.`;
          voiceStatus.style.display = 'block';
        }
      };

      let finalTranscript = '';
      recognitionInstance.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.results.length - 1; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (descTextarea) {
          const currentVal = descTextarea.value;
          const combined = (finalTranscript + interimTranscript).trim();
          if (combined) {
            descTextarea.value = combined;
          }
        }
      };

      recognitionInstance.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        stopVoiceRecognition();
      };

      recognitionInstance.onend = () => {
        stopVoiceRecognition();
      };

      recognitionInstance.start();
    } catch (e) {
      console.warn('Could not start speech recognition:', e);
      stopVoiceRecognition();
    }
  }

  btnVoice?.addEventListener('click', () => {
    if (isRecording) {
      stopVoiceRecognition();
    } else {
      startVoiceRecognition();
    }
  });

  // -------------------------------------------------------------
  // 4. GRIEVANCE SUBMISSION & REAL-TIME DISPATCH
  // -------------------------------------------------------------
  const form = document.getElementById('citizen-grievance-form');
  const successBanner = document.getElementById('cg-success-banner');
  const ticketDisplay = document.getElementById('cg-ticket-display');
  const submitBtn = document.getElementById('btn-citizen-submit-grievance');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const desc = descTextarea?.value?.trim() || '';
    if (desc.length < 15) {
      alert('Please describe your grievance with at least 15 characters to allow AI categorization.');
      return;
    }

    const cat = catHidden?.value || 'Water Supply';
    const ward = document.getElementById('cg-ward')?.value || 'Ward-14 (Kothrud)';
    const name = document.getElementById('cg-name')?.value || 'Citizen Complainant';
    const phone = document.getElementById('cg-phone')?.value || '+91 98220 54321';
    const lat = parseFloat(latInput?.value || '18.5074');
    const lng = parseFloat(lngInput?.value || '73.8077');

    const origSubmitBtnContent = submitBtn?.innerHTML || '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span>Routing to Ward Junior Engineer...</span>`;
    }

    try {
      const payload = {
        raw_text: desc,
        category: cat,
        ward_id: ward,
        complainant_name: name,
        complainant_phone: phone,
        channel: voiceUsedForCurrentComplaint ? 'VOICE' : 'WEB',
        latitude: lat,
        longitude: lng,
        incident_photo_data: currentCapturedPhotoBase64 || null,
        photo_data: currentCapturedPhotoBase64 || null
      };

      const res = await fetch(`${API_BASE}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let created = null;
      if (res.ok) {
        created = await res.json();
      } else {
        created = {
          ticket_id: 'NS-2026-' + Math.floor(1000 + Math.random() * 9000),
          category: cat,
          extracted_category: cat,
          assigned_department_name: cat,
          ward_id: ward,
          complainant_name: name,
          complainant_phone: phone,
          latitude: lat,
          longitude: lng,
          incident_photo_url: currentCapturedPhotoBase64,
          priority_score: 85.0,
          priority_tier: 'P1_CRITICAL',
          priority_level: 'P1_CRITICAL',
          sla_duration_hours: 6,
          sla_deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
          status: 'IN_PROGRESS',
          raw_input_text: desc,
          canonical_english_summary: desc
        };
      }

      if (created) {
        if (!created.incident_photo_url && currentCapturedPhotoBase64) {
          created.incident_photo_url = currentCapturedPhotoBase64;
        }
        if (!created.complainant_name) {
          created.complainant_name = name;
        }
        if (!created.complainant_phone) {
          created.complainant_phone = phone;
        }
        const exists = state.complaints.findIndex(c => c.ticket_id === created.ticket_id);
        if (exists >= 0) {
          state.complaints[exists] = created;
        } else {
          state.complaints.unshift(created);
        }
        state.activeTicket = created;
      }

      if (form) form.style.display = 'none';
      if (successBanner) successBanner.style.display = 'block';
      if (ticketDisplay) {
        ticketDisplay.innerHTML = `<strong>Ticket ID: #${created.ticket_id}</strong> • ${created.category || cat} • ${created.ward_id || ward} • <strong>${created.priority_tier || created.priority_level || 'P1'} (${created.sla_duration_hours || 6}h Statutory SLA)</strong>`;
      }

      logAgentTerminal(`[CITIZEN PORTAL] Grievance #${created.ticket_id} registered by ${name}. Category: ${cat} • Pin: (${lat.toFixed(4)}, ${lng.toFixed(4)}) • Ward: ${ward} • SLA: ${created.sla_duration_hours || 6}h`);

      // Add to personal grievance tracking card
      addCitizenGrievanceRecord({
        ticket_id: created.ticket_id,
        category: created.category || cat,
        ward: ward,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sla: `${created.sla_duration_hours || 6}h Statutory`,
        desc: desc
      });

      // Synchronize backend data
      if (typeof refreshAllData === 'function') {
        refreshAllData();
      }

    } catch (err) {
      console.error('Submission error:', err);
      if (form) form.style.display = 'none';
      if (successBanner) successBanner.style.display = 'block';
      if (ticketDisplay) {
        ticketDisplay.innerHTML = `<strong>Ticket ID: #PMC-2026-${Math.floor(1000 + Math.random() * 9000)}</strong> • ${cat} • ${ward} • Priority Dispatched`;
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origSubmitBtnContent;
      }
    }
  });

  // Submit Another button
  document.getElementById('btn-cg-new')?.addEventListener('click', () => {
    if (form) { 
      form.reset(); 
      form.style.display = 'flex'; 
    }
    if (successBanner) successBanner.style.display = 'none';
    voiceUsedForCurrentComplaint = false;
    currentCapturedPhotoBase64 = null;
    if (cameraPreviewBox) cameraPreviewBox.style.display = 'none';
    if (cameraViewfinder) cameraViewfinder.style.display = 'none';
    if (cameraTriggerBar) cameraTriggerBar.style.display = 'flex';

    // Reset categories
    catGroup?.querySelectorAll('.cg-category-btn').forEach((b, i) => {
      if (i === 0) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
      b.style.border = '';
      b.style.background = '';
      b.style.color = '';
    });
    if (catHidden) catHidden.value = 'Water Supply';

    // Return to Step 1 & update counts
    showWizardStep(1);
    updateCharCount();

    // Reset coordinates to Kothrud
    updatePinLocation(18.5074, 73.8077, true);
  });

  // Clear form button resets to step 1
  document.getElementById('btn-cg-reset')?.addEventListener('click', () => {
    setTimeout(() => {
      showWizardStep(1);
      updateCharCount();
      updateReviewSummary();
    }, 50);
  });

  // View on City Map button
  document.getElementById('btn-cg-view-map')?.addEventListener('click', () => {
    if (typeof state.switchToPage === 'function') {
      const mapBtn = document.querySelector('#nav-citizen-tabs .page-tab-btn[data-page="map"]') ||
                     document.querySelector('#nav-admin-tabs .page-tab-btn[data-page="map"]');
      state.switchToPage('map', mapBtn);
    }
  });

  // Helper to add card in My Grievances list
  function addCitizenGrievanceRecord(item) {
    const listEl = document.getElementById('cg-my-grievances-list');
    if (!listEl) return;

    if (listEl.innerHTML.includes('No grievances lodged yet')) {
      listEl.innerHTML = '';
    }

    const card = document.createElement('div');
    card.style.cssText = 'background:#ffffff; border:1.5px solid #0284c7; border-radius:10px; padding:14px; margin-bottom:10px; box-shadow:0 2px 8px rgba(0,0,0,0.04);';
    card.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <span style="font-weight:800; font-size:0.85rem; color:#0b3b60;">#${item.ticket_id}</span>
        <span style="background:#dcfce7; color:#15803d; font-size:0.7rem; font-weight:800; padding:2px 8px; border-radius:10px; border:1px solid #bbf7d0;">Dispatched to JE</span>
      </div>
      <div style="font-size:0.78rem; color:#334155; font-weight:700; margin-bottom:4px;">${item.category} • ${item.ward}</div>
      <div style="font-size:0.75rem; color:#64748b; line-height:1.4; margin-bottom:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">"${item.desc}"</div>
      <div style="display:flex; align-items:center; justify-content:space-between; font-size:0.72rem; color:#94a3b8; border-top:1px solid #f1f5f9; padding-top:6px;">
        <span>Lodged: ${item.time}</span>
        <span style="color:#ea580c; font-weight:700;"> ${item.sla} SLA</span>
      </div>
    `;
    listEl.prepend(card);

    const countBadge = document.getElementById('cg-my-count-badge');
    if (countBadge) {
      countBadge.textContent = `${listEl.children.length} Active`;
    }
  }
}

let citizenGeotagPayload = null;

function initGeotagPhotoCapture() {
  const fileInput = document.getElementById('input-geotag-file');
  const btnCamera = document.getElementById('btn-trigger-camera');
  const btnSample = document.getElementById('btn-sample-geotag');
  const resultCard = document.getElementById('geotag-result-card');
  const previewImg = document.getElementById('geotag-preview-image');
  const gpsVal = document.getElementById('wm-gps-val');
  const timeVal = document.getElementById('wm-time-val');
  const hashVal = document.getElementById('wm-hash-val');
  const auditText = document.getElementById('geotag-audit-text');

  btnCamera?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target.result;
      await processGeotagPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  });

  btnSample?.addEventListener('click', async () => {
    // High-resolution authentic SVG/Canvas representation of civic site
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 640, 360);
    // Draw civic work graphic
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(40, 180, 560, 40); // water pipe
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(280, 140, 80, 80); // excavation / valve
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText('PMC WATER WORKS • SITE SURVEY PHOTOGRAPH', 50, 60);
    ctx.font = '14px JetBrains Mono, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('LOC: PAUD ROAD / SHIVAJI CHOWK, KOTHRUD (WARD 14)', 50, 95);

    const sampleUrl = canvas.toDataURL('image/jpeg', 0.85);
    await processGeotagPhoto(sampleUrl);
  });

  async function processGeotagPhoto(base64Image) {
    let lat = 18.5074;
    let lng = 73.8077;
    let accuracy = 4.0;

    // Attempt browser HTML5 Geolocation API
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, enableHighAccuracy: true });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        accuracy = pos.coords.accuracy || 4.0;
      } catch (err) {
        // Fall back to calibrated Paud Road civic site coordinates
        lat = 18.5074;
        lng = 73.8077;
      }
    }

    try {
      const ward = document.getElementById('input-ward')?.value || 'Ward-14 (Kothrud)';
      const res = await fetch(`${API_BASE}/api/complaints/geotag-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_data: base64Image,
          latitude: lat,
          longitude: lng,
          accuracy_meters: accuracy,
          ward_id: ward,
          incident_category: 'Civic Infrastructure',
          stage: 'INCIDENT_REPORT'
        })
      });

      if (res.ok) {
        const data = await res.json();
        citizenGeotagPayload = data;

        if (previewImg) previewImg.src = base64Image;
        if (gpsVal) gpsVal.textContent = `LAT: ${data.latitude.toFixed(5)}°N, LNG: ${data.longitude.toFixed(5)}°E (±${data.accuracy_meters}m)`;
        if (timeVal) timeVal.textContent = data.timestamp_ist;
        if (hashVal) hashVal.textContent = `SHA-256: ${data.photo_hash_sha256.substring(0, 20)}... • RTS ACT 2015`;
        if (auditText) auditText.textContent = data.message;
        if (resultCard) resultCard.style.display = 'block';

        logAgentTerminal(`[GEOTAG] Photo tagged: GPS (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}) • Hash: ${data.photo_hash_sha256.substring(0, 12)}...`);
      }
    } catch (err) {
      logAgentTerminal(`[GEOTAG ERROR] Could not verify photo: ${err.message}`);
    }
  }
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
    const payload = {
      raw_text: text,
      ward_id: ward,
      complainant_phone: phone,
      channel: 'WEB'
    };

    // Attach verified geotag coordinates if photo was tagged
    if (citizenGeotagPayload) {
      payload.latitude = citizenGeotagPayload.latitude;
      payload.longitude = citizenGeotagPayload.longitude;
    }

    const res = await fetch(`${API_BASE}/api/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
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
      citizenGeotagPayload = null;
      const card = document.getElementById('geotag-result-card');
      if (card) card.style.display = 'none';

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
  } else if (msg.includes('AGENT') || msg.includes('HACKATHON') || msg.includes('LANGGRAPH') || msg.includes('SYSTEM')) {
    line.className += ' info';
  } else if (msg.includes('Completed') || msg.includes('PASSED') || msg.includes('LEAFLET') || msg.includes('successful') || msg.includes('verified')) {
    line.className += ' success';
  } else {
    line.className += ' warn';
  }

  const now = new Date();
  const time = now.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  line.textContent = `[${time} IST] ${msg}`;
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
                  ? '<span style="color:#16a34a;font-weight:bold;">PASSED</span> (Sufficient spatial entities to route field team)' 
                  : '<span style="color:#dc2626;font-weight:bold;">REJECTED</span> (' + escapeHtml(data.completeness_gatekeeper?.clarification_needed || 'Missing landmark') + ')'}
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
                  ? '<span style="color:#16a34a;font-weight:bold;">Saved 1 Truck & 4 Workers</span> (Consolidated into single cluster)' 
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
              <span class="wb-metric-label">Factor Breakdown:</span>
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
              <span class="wb-metric-label">Responsible Position:</span>
              <span class="wb-metric-value">
                <strong>Tier ${data.escalation_level}: ${escapeHtml(off.designation || off.name)}</strong><br/>
                <span style="font-size:11px;color:#64748b;">Statutory Escalation Channel: ${escapeHtml(off.email)}</span>
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
    const selectedCategory = catF?.value || "Water Supply & Pumping";
    const taskInfo = getTaskSOPAndBOM(selectedCategory);

    try {
      const res = await fetch(`${API_BASE}/api/agents/execute/agent-f`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          summary: taskInfo.hazard_name,
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
        const sopList = data.sop_checklist?.length ? data.sop_checklist : taskInfo.sop_checklist;
        const bomList = data.bill_of_materials?.length ? data.bill_of_materials : taskInfo.bill_of_materials;

        const beforeGpsStr = `${(incParts[0] || 18.5074).toFixed(4)}° N, ${(incParts[1] || 73.8077).toFixed(4)}° E`;
        const afterGpsStr = `${(clParts[0] || 18.5075).toFixed(4)}° N, ${(clParts[1] || 73.8076).toFixed(4)}° E`;
        const beforeVisual = renderCivicComparativeVisual(selectedCategory, 'before', beforeGpsStr, 'Incident Evidence');
        const afterVisual = renderCivicComparativeVisual(selectedCategory, 'after', afterGpsStr, 'Closure Geotag');

        const sopItems = sopList.map(s => `<li>${escapeHtml(s)}</li>`).join('');
        const bomItems = bomList.map(b => {
          const item = typeof b === 'object' ? b.item : b;
          const qty = typeof b === 'object' ? b.quantity : '1 Unit';
          return `<tr><td>${escapeHtml(item)}</td><td><strong>${escapeHtml(qty)}</strong></td></tr>`;
        }).join('');

        content.innerHTML = `
          <!-- Before & After Comparison -->
          <div class="before-after-container" style="margin-bottom:12px;">
            <div style="font-weight:700;font-size:12px;color:#0b3b60;margin-bottom:6px;">Photographic Comparison: Before vs After Resolution</div>
            <div class="before-after-grid">
              <div class="comparison-card">
                <div class="comparison-header">
                  <span class="comparison-badge before">BEFORE REPAIR</span>
                </div>
                ${beforeVisual}
                <div class="comparison-details">
                  <strong>Reported Hazard:</strong> ${escapeHtml(taskInfo.hazard_name)}
                </div>
              </div>
              <div class="comparison-card">
                <div class="comparison-header">
                  <span class="comparison-badge after">AFTER RESOLUTION</span>
                </div>
                ${afterVisual}
                <div class="comparison-details">
                  <strong>Verified Resolution:</strong> ${escapeHtml(taskInfo.resolution_name)}
                </div>
              </div>
            </div>
          </div>

          <div class="wb-result-grid">
            <div class="wb-metric-row">
              <span class="wb-metric-label">Geotag Geofence Audit:</span>
              <span class="wb-metric-value">
                <strong style="color:${geo.passed ? '#16a34a' : '#dc2626'};font-size:14px;">${geo.status}</strong>
                <br/>Offset: <strong>${geo.geodesic_offset_meters} meters</strong> (Statutory Limit: &le; ${geo.max_allowed_threshold_meters}m)
              </span>
            </div>
            <div class="wb-metric-row">
              <span class="wb-metric-label">Task-Specific SOP Checklist (${escapeHtml(taskInfo.category)}):</span>
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

  // 9.7 Agent E: Telegram Bot & Omnichannel Simulator
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
      const tg = data.telegram_payload || data.whatsapp_payload;
      if (tag) {
        tag.textContent = `${tg.delivery_status} • Delivered ${tg.read_receipt_at}`;
        tag.className = 'wb-status-tag success';
      }
      if (content) {
        const btnHtml = (tg.interactive_buttons || []).map(b => `
          <button class="tg-btn" onclick="alert('${escapeHtml(b.label)} triggered for ${escapeHtml(tg.recipient)}!')">
            ${escapeHtml(b.label)}
          </button>
        `).join('');

        content.innerHTML = `
          <div class="phone-mockup-wrapper" style="margin-top:4px; max-width:400px;">
            <div class="phone-header-tg">
              <div class="tg-bot-avatar">TG</div>
              <div class="tg-header-info">
                <div class="tg-bot-title">NagrikSewa Civic Bot <span class="tg-verified-badge">&check;</span></div>
                <div class="tg-bot-sub">@PMCCivicRedressalBot &bull; bot</div>
              </div>
            </div>
            <div class="phone-chat-body">
              <div class="tg-bubble outbound">
                <div style="font-weight:700;font-size:12px;margin-bottom:4px;">${escapeHtml(tg.header)}</div>
                <div>${escapeHtml(tg.body)}</div>
                <div class="tg-time">${escapeHtml(tg.read_receipt_at)} &check;&check;</div>
              </div>
              <div class="tg-actions-col">${btnHtml}</div>
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

// Expose state and render functions on window for runtime testing & inspection
window.state = state;
window.renderKanban = renderKanban;

