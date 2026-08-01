const DEMO_WORKFLOW_ID = '11111111-2222-4333-8444-555555555555';
const DEMO_LEAD_ID = 'a0eebc99-9c0b-4ef8-bb6d-8b6d6bb9bd38';

let currentPage = 1;
let currentLimit = 20;
let currentSort = 'desc';
let currentEngine = '';
let currentSearch = '';

const PRESETS = {
  lead_created: {
    engine: 'LEAD_CAPTURE',
    eventType: 'LEAD_CREATED',
    title: 'Lead Created',
    description: 'Prospect submitted web enquiry form via Google Search Ad',
    actorType: 'System',
  },
  brochure_sent: {
    engine: 'RESPONSE',
    eventType: 'BROCHURE_SHARED',
    title: 'Brochure Shared',
    description: 'Sent 2026 Executive Course Curriculum PDF via WhatsApp',
    actorType: 'Bot',
  },
  meeting_booked: {
    engine: 'MEETING',
    eventType: 'MEETING_SCHEDULED',
    title: 'Meeting Scheduled',
    description: 'Booked 1-on-1 counseling demo with Senior Advisor',
    actorType: 'Admin',
  },
  call_done: {
    engine: 'MEETING',
    eventType: 'CALL_COMPLETED',
    title: 'Call Completed',
    description: 'Admissions counseling call finished (Duration: 24 mins)',
    actorType: 'User',
  },
};

const ENGINE_EVENTS_MAP = {
  LEAD_CAPTURE: [
    { type: 'LEAD_CREATED', title: 'Lead Created', desc: 'New lead enquiry captured' },
    { type: 'LEAD_UPDATED', title: 'Lead Updated', desc: 'Lead profile updated' },
    { type: 'LEAD_SOURCE_IDENTIFIED', title: 'Lead Source Identified', desc: 'Attributed to campaign' },
  ],
  RESPONSE: [
    { type: 'MESSAGE_SENT', title: 'Message Sent', desc: 'Automated WhatsApp message delivered' },
    { type: 'BROCHURE_SHARED', title: 'Brochure Shared', desc: 'Course brochure PDF delivered' },
    { type: 'FEE_STRUCTURE_SHARED', title: 'Fee Structure Shared', desc: 'Tuition fee document shared' },
    { type: 'COURSE_DETAILS_SHARED', title: 'Course Details Shared', desc: 'Syllabus details delivered' },
  ],
  WORKFLOW: [
    { type: 'WORKFLOW_STARTED', title: 'Workflow Started', desc: 'Nurture workflow initialized' },
    { type: 'WORKFLOW_PAUSED', title: 'Workflow Paused', desc: 'Automation paused' },
    { type: 'WORKFLOW_RESUMED', title: 'Workflow Resumed', desc: 'Automation resumed' },
    { type: 'WORKFLOW_CLOSED', title: 'Workflow Closed', desc: 'Workflow closed' },
    { type: 'STATE_CHANGED', title: 'State Changed', desc: 'Stage moved from New to Contacted' },
  ],
  SCHEDULER: [
    { type: 'REMINDER_SCHEDULED', title: 'Reminder Scheduled', desc: 'Follow-up task scheduled' },
    { type: 'REMINDER_CANCELLED', title: 'Reminder Cancelled', desc: 'Task cancelled' },
    { type: 'REMINDER_EXECUTED', title: 'Reminder Executed', desc: 'Automated ping executed' },
  ],
  FOLLOW_UP: [
    { type: 'FOLLOWUP_SENT', title: 'Follow-up Sent', desc: 'Automated follow-up ping sent' },
    { type: 'RECOVERY_INITIATED', title: 'Recovery Initiated', desc: 'Re-engagement sequence started' },
  ],
  MEETING: [
    { type: 'CALL_COMPLETED', title: 'Call Completed', desc: 'Phone call finished' },
    { type: 'MEETING_SCHEDULED', title: 'Meeting Scheduled', desc: 'Counselor demo booked' },
    { type: 'MEETING_UPDATED', title: 'Meeting Updated', desc: 'Meeting time updated' },
    { type: 'MEETING_COMPLETED', title: 'Meeting Completed', desc: 'Counseling session completed' },
  ],
  NOTIFICATION: [
    { type: 'NOTIFICATION_SENT', title: 'Notification Sent', desc: 'SMS alert sent' },
  ],
  ADMIN: [
    { type: 'INTERNAL_NOTE_ADDED', title: 'Internal Note Added', desc: 'Counselor internal note attached' },
    { type: 'LEAD_ASSIGNED', title: 'Lead Assigned', desc: 'Lead assigned to counselor' },
    { type: 'DOCUMENT_UPLOADED', title: 'Document Uploaded', desc: 'Document attached to record' },
  ],
};

document.addEventListener('DOMContentLoaded', () => {
  initEngineOptions();
  refreshAutoDedupKey();
  fetchStats();
  loadTimeline();

  document.getElementById('simEngine').addEventListener('change', () => {
    initEngineOptions();
    refreshAutoDedupKey();
  });

  document.getElementById('simEventType').addEventListener('change', () => {
    const engine = document.getElementById('simEngine').value;
    const evType = document.getElementById('simEventType').value;
    const found = (ENGINE_EVENTS_MAP[engine] || []).find((e) => e.type === evType);
    if (found) {
      document.getElementById('simTitle').value = found.title;
      document.getElementById('simDescription').value = found.desc;
    }
  });

  document.querySelectorAll('.preset-chip').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const key = btn.getAttribute('data-preset');
      const p = PRESETS[key];
      if (p) {
        document.getElementById('simEngine').value = p.engine;
        initEngineOptions();
        document.getElementById('simEventType').value = p.eventType;
        document.getElementById('simTitle').value = p.title;
        document.getElementById('simDescription').value = p.description;
        document.getElementById('simActorType').value = p.actorType;
        refreshAutoDedupKey();
      }
    });
  });

  document.getElementById('simulatorForm').addEventListener('submit', handlePublishEvent);

  document.getElementById('searchInput').addEventListener('input', debounce((e) => {
    currentSearch = e.target.value;
    currentPage = 1;
    loadTimeline();
  }, 300));

  document.querySelectorAll('#engineFilterChips .filter-tag').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('#engineFilterChips .filter-tag').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentEngine = chip.getAttribute('data-engine');
      currentPage = 1;
      loadTimeline();
    });
  });

  document.getElementById('btnSortOrder').addEventListener('click', () => {
    currentSort = currentSort === 'desc' ? 'asc' : 'desc';
    document.getElementById('sortText').textContent = currentSort === 'desc' ? 'Newest First' : 'Oldest First';
    loadTimeline();
  });

  document.getElementById('btnRefresh').addEventListener('click', () => {
    fetchStats();
    loadTimeline();
  });

  const noteModal = document.getElementById('noteModal');
  document.getElementById('btnQuickNote').addEventListener('click', () => noteModal.classList.remove('hidden'));
  document.getElementById('btnCloseModal').addEventListener('click', () => noteModal.classList.add('hidden'));
  document.getElementById('btnCancelModal').addEventListener('click', () => noteModal.classList.add('hidden'));
  document.getElementById('noteForm').addEventListener('submit', handleAddNote);

  document.getElementById('btnPrevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadTimeline();
    }
  });

  document.getElementById('btnNextPage').addEventListener('click', () => {
    currentPage++;
    loadTimeline();
  });
});

function initEngineOptions() {
  const engine = document.getElementById('simEngine').value;
  const eventSelect = document.getElementById('simEventType');
  const events = ENGINE_EVENTS_MAP[engine] || [];

  eventSelect.innerHTML = events.map((ev) => `<option value="${ev.type}">${ev.title}</option>`).join('');

  if (events.length > 0) {
    document.getElementById('simTitle').value = events[0].title;
    document.getElementById('simDescription').value = events[0].desc;
  }
}

function refreshAutoDedupKey() {
  const key = `key_${Date.now().toString(36)}_${Math.random().toString(36).substring(7)}`;
  document.getElementById('simDedup').value = key;
}

async function fetchStats() {
  try {
    const res = await fetch('/api/v1/engines/stats');
    const json = await res.json();
    if (json.success) {
      const stats = json.data;
      document.getElementById('statTotalEvents').textContent = stats.totalEvents || 0;
      document.getElementById('statActiveWorkflows').textContent = stats.activeWorkflows || 0;
      document.getElementById('statLeadEvents').textContent = stats.eventsByEngine?.LEAD_CAPTURE || 0;
      document.getElementById('statMeetingEvents').textContent = stats.eventsByEngine?.MEETING || 0;
    }
  } catch (err) {}
}

async function loadTimeline() {
  const container = document.getElementById('timelineContainer');
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>Loading conversation timeline...</span>
    </div>
  `;

  const params = new URLSearchParams({ page: currentPage, limit: currentLimit, sort: currentSort });
  if (currentEngine) params.append('sourceEngine', currentEngine);
  if (currentSearch) params.append('search', currentSearch);

  try {
    const url = `/api/v1/workflows/${DEMO_WORKFLOW_ID}/timeline?${params.toString()}`;
    const res = await fetch(url);
    const result = await res.json();

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `<div class="loading-state"><span>No timeline events match filter.</span></div>`;
      updatePagination(0, 1, 1);
      return;
    }

    renderTimelineCards(result.data);
    updatePagination(result.total, result.page, result.totalPages);
  } catch (err) {
    container.innerHTML = `<div class="loading-state"><span>Error connecting to Timeline API.</span></div>`;
  }
}

function renderTimelineCards(events) {
  const container = document.getElementById('timelineContainer');
  container.innerHTML = events
    .map((evt) => {
      const formattedTime = new Date(evt.occurredAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
      const metaId = `meta_${evt.id}`;
      const jsonString = JSON.stringify(evt.metadata, null, 2);

      return `
        <div class="feed-item-card engine-${evt.sourceEngine}">
          <div class="feed-node"></div>
          <div class="item-header">
            <span class="engine-pill">${evt.sourceEngine.replace(/_/g, ' ')}</span>
            <span class="item-time">${formattedTime}</span>
          </div>
          <div class="item-title">${escapeHtml(evt.title)}</div>
          <div class="item-desc">${escapeHtml(evt.description)}</div>
          <div class="item-footer">
            <span>Actor: <strong>${evt.actorType}</strong></span>
            <button class="btn-toggle-json" onclick="toggleJson('${metaId}')">{ } View Metadata JSON</button>
          </div>
          <div id="${metaId}" class="json-tray hidden">${escapeHtml(jsonString)}</div>
        </div>
      `;
    })
    .join('');
}

function toggleJson(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden');
}

function updatePagination(total, page, totalPages) {
  const start = total === 0 ? 0 : (page - 1) * currentLimit + 1;
  const end = Math.min(page * currentLimit, total);
  document.getElementById('pageInfo').textContent = `Showing ${start} to ${end} of ${total} events`;

  document.getElementById('btnPrevPage').disabled = page <= 1;
  document.getElementById('btnNextPage').disabled = page >= totalPages;
}

async function handlePublishEvent(e) {
  e.preventDefault();

  const payload = {
    workflowId: DEMO_WORKFLOW_ID,
    leadId: DEMO_LEAD_ID,
    eventType: document.getElementById('simEventType').value,
    sourceEngine: document.getElementById('simEngine').value,
    actorType: document.getElementById('simActorType').value,
    title: document.getElementById('simTitle').value,
    description: document.getElementById('simDescription').value,
    metadata: {
      timestamp: new Date().toISOString(),
      simulated: true,
      origin: 'PERC Dashboard Hub',
    },
    deduplicationKey: document.getElementById('simDedup').value,
  };

  try {
    const res = await fetch('/api/v1/events/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (json.success) {
      refreshAutoDedupKey();
      fetchStats();
      loadTimeline();
    } else {
      alert(`Validation error: ${json.message}`);
    }
  } catch (err) {
    alert(`Failed to publish event: ${err.message}`);
  }
}

async function handleAddNote(e) {
  e.preventDefault();

  const payload = {
    leadId: DEMO_LEAD_ID,
    title: document.getElementById('noteTitle').value,
    description: document.getElementById('noteDescription').value,
  };

  try {
    const res = await fetch(`/api/v1/workflows/${DEMO_WORKFLOW_ID}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (json.success) {
      document.getElementById('noteModal').classList.add('hidden');
      document.getElementById('noteForm').reset();
      fetchStats();
      loadTimeline();
    }
  } catch (err) {
    alert(`Failed to save note: ${err.message}`);
  }
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
