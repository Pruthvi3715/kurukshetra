/**
 * NagrikSewa AI — Multi-Agent Municipal Redressal Client
 * Author: Sampada (@sampada-11) & Rushil (@rushil-cody)
 */

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? '' 
  : 'http://localhost:8000';

// Application State
const state = {
  complaints: [],
  stats: null,
  selectedDept: 'ALL',
  virtualTime: new Date(),
  lastEscalatedCount: 0,
  selectedTicket: null
};

// Ward Coordinate Mapping for SVG Map View (viewBox 0 0 600 380)
const WARD_COORDINATES = {
  'Ward-14 (Kothrud)': { x: 130, y: 170 },
  'Ward-08 (Aundh)': { x: 280, y: 110 },
  'Ward-05 (Shivajinagar)': { x: 330, y: 210 },
  'Ward-10 (Swargate)': { x: 230, y: 310 },
  'Ward-18 (Hadapsar)': { x: 480, y: 280 }
};

// Web Audio API Breach Chime
function playBreachAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.log('Audio alert suppressed by browser policy until interaction.');
  }
}

// ==========================================================================
// Initialization & Polling
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  fetchClockStatus();
  refreshAllData();
  
  // Auto-refresh interval every 3.5 seconds
  setInterval(refreshAllData, 3500);
});

function initEventListeners() {
  // Time Travel Buttons
  document.querySelectorAll('.btn-advance').forEach(btn => {
    btn.addEventListener('click', () => {
      const hours = parseInt(btn.dataset.hours, 10);
      advanceVirtualClock(hours);
    });
  });

  document.getElementById('btn-reset-clock')?.addEventListener('click', resetVirtualClock);

  // Department Filters
  document.querySelectorAll('.dept-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.dept-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.selectedDept = pill.dataset.dept;
      renderKanban();
    });
  });

  // Modals
  setupModals();

  // Citizen Presets in Submission Modal
  document.getElementById('btn-sample-water')?.addEventListener('click', () => {
    document.getElementById('input-complaint-text').value = 
      "Shivaji Chowk javal main water pipeline phutli ahe, rastyavar khoop pani sathlay and drinking water contaminated!";
    document.getElementById('input-ward').value = "Ward-14 (Kothrud)";
  });

  document.getElementById('btn-sample-garbage')?.addEventListener('click', () => {
    document.getElementById('input-complaint-text').value = 
      "Overflowing community garbage bin on Market Road uncollected for 3 days, foul stench spread everywhere.";
    document.getElementById('input-ward').value = "Ward-14 (Kothrud)";
  });

  // Complaint Submission Form
  document.getElementById('grievance-form')?.addEventListener('submit', handleGrievanceSubmit);

  // Hackathon Live Presets Injection
  document.getElementById('btn-inject-all-presets')?.addEventListener('click', handleInjectAllPresets);

  // Field Copilot Actions
  document.getElementById('btn-approve-closure')?.addEventListener('click', handleApproveClosure);
  document.getElementById('btn-reopen-complaint')?.addEventListener('click', handleReopenComplaint);
}

// ==========================================================================
// Data Fetching & Sync
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
        playBreachAlertSound();
        logAgentTerminal(`[SLA MONITOR] ALERT: ${data.escalated_complaints} complaint(s) breached statutory SLA! Promoted up administrative hierarchy.`);
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
    renderKanban();
    renderMapPins();
  } catch (e) {}
}

// ==========================================================================
// Virtual Time-Travel Controls
// ==========================================================================
async function advanceVirtualClock(hours) {
  logAgentTerminal(`[SIMULATION] Advancing municipal virtual clock by +${hours} hours...`);
  animateAgentStep('step-agent-d');

  try {
    const res = await fetch(`${API_BASE}/api/time-travel/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours })
    });
    const result = await res.json();
    
    if (result.escalations_triggered > 0) {
      logAgentTerminal(`[AGENT:SLA_Orchestrator] CRITICAL: ${result.escalations_triggered} SLA breach(es) detected. Executing multi-tier promotions!`);
      result.escalation_details.forEach(detail => {
        logAgentTerminal(` -> Ticket ${detail.ticket_id} overdue by +${detail.overdue_hours}h. Reassigned to: ${detail.assigned_to}`);
      });
      playBreachAlertSound();
    } else {
      logAgentTerminal(`[AGENT:SLA_Orchestrator] SLA evaluation pass complete. Zero new breaches.`);
    }

    await refreshAllData();
  } catch (err) {
    logAgentTerminal(`[ERROR] Time-travel request failed: ${err.message}`);
  }
}

async function resetVirtualClock() {
  logAgentTerminal(`[SIMULATION] Resetting virtual clock to real system time...`);
  try {
    await fetch(`${API_BASE}/api/time-travel/reset`, { method: 'POST' });
    await refreshAllData();
    logAgentTerminal(`[SIMULATION] Clock synchronized with UTC real time.`);
  } catch (e) {}
}

// ==========================================================================
// Kanban Rendering
// ==========================================================================
function renderKanban() {
  const colRegistered = document.getElementById('col-cards-registered');
  const colInProgress = document.getElementById('col-cards-inprogress');
  const colEscalated = document.getElementById('col-cards-escalated');
  const colResolved = document.getElementById('col-cards-resolved');

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
    const card = createIncidentCard(c);

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

function createIncidentCard(c) {
  const card = document.createElement('div');
  const pClass = (c.priority_level || 'P3_MEDIUM').toLowerCase().replace('_', '-');
  card.className = `incident-card ${pClass}-card ${c.is_breached ? 'is-breached' : ''}`;
  
  // Calculate remaining or overdue hours
  const deadline = new Date(c.sla_deadline);
  const diffHours = ((deadline - state.virtualTime) / (1000 * 3600)).toFixed(1);
  const isOverdue = diffHours <= 0;

  card.innerHTML = `
    <div class="card-top-row">
      <span class="ticket-number">${c.ticket_id.substring(0, 8).toUpperCase()}</span>
      <span class="priority-badge ${pClass.split('-')[0]}">${c.priority_level?.replace('_', ' ') || 'P3 MEDIUM'}</span>
    </div>

    <div class="incident-summary">${escapeHtml(c.canonical_english_summary || c.raw_input_text)}</div>

    <div class="incident-location-row">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <span>${escapeHtml(c.ward_id || 'Ward 14')} ${c.landmark ? '• ' + escapeHtml(c.landmark) : ''}</span>
    </div>

    ${c.is_duplicate ? `<div class="cluster-tag">🔗 Clustered (Child Ticket)</div>` : ''}

    <div class="incident-officer-row">
      <span class="officer-tier-pill tier-${c.escalation_level}">
        L${c.escalation_level}: ${escapeHtml(c.assigned_officer_designation?.split('(')[0] || 'Junior Engineer')}
      </span>
      <span class="sla-countdown-pill ${isOverdue ? 'breached' : ''}">
        ${isOverdue ? `⚠️ Overdue (+${Math.abs(diffHours)}h)` : `⏱️ ${diffHours}h left`}
      </span>
    </div>
  `;

  card.addEventListener('click', () => openFieldCopilotModal(c));
  return card;
}

// ==========================================================================
// Interactive Vector Ward Map View
// ==========================================================================
function renderMapPins() {
  const pinsLayer = document.getElementById('map-pins-layer');
  if (!pinsLayer) return;
  pinsLayer.innerHTML = '';

  state.complaints.forEach(c => {
    const coords = WARD_COORDINATES[c.ward_id] || { x: 150, y: 180 };
    // Add slight spatial jitter for multi-ticket differentiation
    const hash = c.ticket_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const jitterX = ((hash % 40) - 20);
    const jitterY = (((hash * 3) % 40) - 20);
    const pinX = coords.x + jitterX;
    const pinY = coords.y + jitterY;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'map-pin');
    g.setAttribute('transform', `translate(${pinX}, ${pinY})`);

    const color = c.status === 'RESOLVED' 
      ? '#10b981' 
      : (c.is_breached ? '#ef4444' : (c.priority_level === 'P1_CRITICAL' ? '#f43f5e' : '#0ea5e9'));

    g.innerHTML = `
      <circle cx="0" cy="0" r="14" fill="${color}" fill-opacity="0.2"/>
      <circle cx="0" cy="0" r="6" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
      ${c.is_breached ? `<circle cx="0" cy="0" r="18" fill="none" stroke="#f43f5e" stroke-width="1.5"><animate attributeName="r" values="6;22" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.5s" repeatCount="indefinite"/></circle>` : ''}
    `;

    g.addEventListener('mouseenter', (e) => showMapTooltip(e, c, pinX, pinY));
    g.addEventListener('mouseleave', hideMapTooltip);
    g.addEventListener('click', () => openFieldCopilotModal(c));

    pinsLayer.appendChild(g);
  });
}

function showMapTooltip(e, ticket, x, y) {
  const tooltip = document.getElementById('map-tooltip');
  if (!tooltip) return;
  tooltip.style.display = 'block';
  tooltip.style.left = `${(x / 600) * 100}%`;
  tooltip.style.top = `${(y / 380) * 100}%`;
  tooltip.innerHTML = `
    <strong>${ticket.ticket_id.substring(0, 8).toUpperCase()}</strong> (${ticket.priority_level})<br/>
    ${escapeHtml(ticket.canonical_english_summary || ticket.raw_input_text).substring(0, 60)}...<br/>
    <span style="color: ${ticket.is_breached ? '#f43f5e' : '#06b6d4'}">Status: ${ticket.status} (Tier ${ticket.escalation_level})</span>
  `;
}

function hideMapTooltip() {
  const tooltip = document.getElementById('map-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

// ==========================================================================
// Agent Stepper & Terminal Log Animation
// ==========================================================================
function logAgentTerminal(message) {
  const terminal = document.getElementById('agent-log-terminal');
  if (!terminal) return;
  const line = document.createElement('div');
  line.className = 'terminal-line';
  
  if (message.includes('CRITICAL') || message.includes('ALERT')) {
    line.className += ' text-rose';
  } else if (message.includes('AGENT:')) {
    line.className += ' text-cyan';
  } else if (message.includes('SUCCESS') || message.includes('PASSED')) {
    line.className += ' text-emerald';
  } else {
    line.className += ' text-muted';
  }

  const time = new Date().toISOString().substring(11, 19);
  line.textContent = `[${time}] ${message}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function animateAgentStep(stepId) {
  document.querySelectorAll('.agent-step-item').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(stepId);
  if (el) el.classList.add('active');
}

// ==========================================================================
// Modals & User Actions
// ==========================================================================
function setupModals() {
  const citizenModal = document.getElementById('citizen-modal');
  const presetsModal = document.getElementById('demo-presets-modal');
  const copilotModal = document.getElementById('field-copilot-modal');

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

  // Close modals on backdrop click
  [citizenModal, presetsModal, copilotModal].forEach(m => {
    m?.addEventListener('click', (e) => {
      if (e.target === m) m.classList.remove('open');
    });
  });
}

// Submitting a Grievance
async function handleGrievanceSubmit(e) {
  e.preventDefault();
  const text = document.getElementById('input-complaint-text').value.trim();
  const ward = document.getElementById('input-ward').value;
  const phone = document.getElementById('input-phone').value;

  if (!text) return;

  logAgentTerminal(`[AGENT:Ingestion] Received citizen input: "${text.substring(0, 45)}..."`);
  animateAgentStep('step-agent-a');

  // Submit to backend
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
      logAgentTerminal(`[AGENT:SpatialCluster] Deduplication check completed. Clustered: ${created.is_duplicate}`);
      animateAgentStep('step-agent-c');
      
      setTimeout(() => {
        logAgentTerminal(`[AGENT:Router] Assigned to ${created.assigned_department_name} with Priority ${created.priority_level} (${created.sla_duration_hours}h SLA)`);
        animateAgentStep('step-agent-b');
      }, 500);

      document.getElementById('citizen-modal').classList.remove('open');
      document.getElementById('input-complaint-text').value = '';
      await refreshAllData();
    }
  } catch (err) {
    logAgentTerminal(`[ERROR] Submission error: ${err.message}`);
  }
}

// Inject All 4 Hackathon Presets (Matching Section 7 of PRD)
async function handleInjectAllPresets() {
  const presets = [
    {
      raw_text: "Shivaji Chowk javal main water pipeline phutli ahe, rastyavar khoop pani sathlay and water flooding entire street.",
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

  logAgentTerminal(`[HACKATHON] Injecting all 4 canonical complaints simultaneously...`);
  document.getElementById('demo-presets-modal').classList.remove('open');

  for (let i = 0; i < presets.length; i++) {
    animateAgentStep('step-agent-a');
    try {
      await fetch(`${API_BASE}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presets[i])
      });
    } catch (e) {}
  }

  logAgentTerminal(`[HACKATHON] Ingestion complete. Spatial deduplication clustered duplicate garbage report into parent ticket.`);
  animateAgentStep('step-agent-c');
  await refreshAllData();
}

// Field Officer Copilot Modal
function openFieldCopilotModal(ticket) {
  state.selectedTicket = ticket;
  const modal = document.getElementById('field-copilot-modal');
  document.getElementById('copilot-ticket-title').textContent = `Ticket: ${ticket.ticket_id} • ${ticket.assigned_department_name}`;

  // Populate SOP
  const sopList = document.getElementById('copilot-sop-list');
  sopList.innerHTML = '';
  const sops = ticket.sop_checklist?.length ? ticket.sop_checklist : [
    "1. Isolate primary gate valve at distribution node 4.",
    "2. Deploy submersible dewatering pump.",
    "3. Mount repair collar clamp with EPDM gasket.",
    "4. Conduct hydraulic pressure leak test before backfilling."
  ];
  sops.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    sopList.appendChild(li);
  });

  // Populate BOM
  const bomTags = document.getElementById('copilot-bom-tags');
  bomTags.innerHTML = '';
  const boms = ticket.bill_of_materials?.length ? ticket.bill_of_materials : [
    "1x 150mm Cast Iron Collar Sleeve",
    "2x EPDM Gaskets",
    "1.5 Ton Stone Aggregate"
  ];
  boms.forEach(b => {
    const span = document.createElement('span');
    span.className = 'bom-tag';
    span.textContent = b;
    bomTags.appendChild(span);
  });

  modal.classList.add('open');
}

async function handleApproveClosure() {
  if (!state.selectedTicket) return;
  logAgentTerminal(`[AGENT:FieldCopilot] Field repair proof verified. Closing ticket ${state.selectedTicket.ticket_id}...`);
  
  try {
    await fetch(`${API_BASE}/api/complaints/${state.selectedTicket.ticket_id}/resolve`, {
      method: 'POST'
    });
  } catch (e) {}

  document.getElementById('field-copilot-modal').classList.remove('open');
  await refreshAllData();
}

async function handleReopenComplaint() {
  if (!state.selectedTicket) return;
  logAgentTerminal(`[AGENT:CitizenEngagement] Citizen marked 'Unresolved'. Statutory automatic Level 2 escalation triggered!`);
  
  try {
    await fetch(`${API_BASE}/api/complaints/${state.selectedTicket.ticket_id}/reopen`, {
      method: 'POST'
    });
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
