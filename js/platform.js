/* ==========================================================
   WashTrack Pro — Platform & Access features
   Notes on customers/jobs, QR/barcode check-in scanning, a
   Google Calendar sync stub, an offline change queue, the
   Settings modal, and the technician "My Jobs Today" view.
   ========================================================== */

/* ============================================================
   Notes (#31) — attached to a customer or job by
   `${kind}:${id}` key, stored in DATA.notes (see js/data.js).
   ============================================================ */
function noteKey(kind, id) { return kind + ':' + id; }

function getNotes(kind, id) {
  if (!DATA.notes) DATA.notes = {};
  return DATA.notes[noteKey(kind, id)] || [];
}

function addNote(kind, id, text) {
  if (!DATA.notes) DATA.notes = {};
  const key = noteKey(kind, id);
  if (!DATA.notes[key]) DATA.notes[key] = [];
  const user = typeof currentUser === 'function' ? currentUser() : null;
  const note = {
    id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    author: user ? user.name : 'Unknown',
    authorRole: user ? user.role : null,
    text: text.trim(),
    ts: new Date().toISOString(),
  };
  DATA.notes[key].unshift(note);
  saveData();
  return note;
}

function notesListHtml(notes) {
  if (!notes.length) return `<p class="text-[12px] text-on-surface-variant italic py-1">No notes yet.</p>`;
  return notes.map(n => `
    <div class="p-3 bg-surface-container-low rounded-xl">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="text-[12px] font-label-bold text-on-surface">${escapeHtml(n.author)}</span>
        <span class="text-[10px] text-on-surface-variant">${new Date(n.ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
      </div>
      <p class="text-[12px] text-on-surface-variant whitespace-pre-wrap break-words">${escapeHtml(n.text)}</p>
    </div>`).join('');
}

function renderCustomerNotes(id) {
  const list = document.getElementById('detailNotesList');
  if (!list) return;
  list.innerHTML = notesListHtml(getNotes('customer', id));
}

function renderJobNotes(kind, id) {
  const list = document.getElementById('jobNotesList');
  if (!list) return;
  list.innerHTML = notesListHtml(getNotes(kind, id));
}

(function initNoteForms() {
  const detailForm = document.getElementById('detailNoteForm');
  if (detailForm) {
    detailForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('detailNoteInput');
      const text = input.value.trim();
      if (!text) return;
      const panel = document.getElementById('detailPanel');
      const id = panel && panel.dataset.customerId;
      if (!id) return;
      addNote('customer', id, text);
      input.value = '';
      renderCustomerNotes(id);
    });
  }
  const jobForm = document.getElementById('jobNoteForm');
  if (jobForm) {
    jobForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('jobNoteInput');
      const text = input.value.trim();
      if (!text) return;
      const panel = document.getElementById('jobPanel');
      const kind = panel && panel.dataset.jobKind;
      const id = panel && panel.dataset.jobId;
      if (!kind || !id) return;
      addNote(kind, id, text);
      input.value = '';
      renderJobNotes(kind, id);
    });
  }
})();

/* ============================================================
   QR / barcode check-in scanning (#32)
   Uses the device camera + jsQR (loaded from CDN in index.html)
   to read a customer's check-in QR code and jump straight to
   their profile. Each customer's QR can be generated on demand
   from their detail panel ("View Check-in QR").
   ============================================================ */
let scanStream = null;
let scanRAF = null;

function openScanModal() {
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Scan to Check In</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
      </button>
    </div>
    <p class="text-[12px] text-on-surface-variant mb-4">Point the camera at a customer's QR check-in code. Each customer's code is available from their profile via "View Check-in QR".</p>
    <div class="relative bg-black rounded-2xl overflow-hidden aspect-square mb-4">
      <video id="scanVideo" class="w-full h-full object-cover" playsinline muted></video>
      <canvas id="scanCanvas" class="hidden"></canvas>
      <div id="scanOverlayMsg" class="absolute inset-0 flex items-center justify-center text-white text-[12px] text-center px-6 bg-black/50 hidden"></div>
    </div>
    <button type="button" data-action="closeModal" class="w-full py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
  `;
  openModal(html, { ariaLabel: 'Scan a customer QR code', onClose: stopScan });
  startScan();
}

function setScanOverlay(message) {
  const el = document.getElementById('scanOverlayMsg');
  if (!el) return;
  if (!message) { el.classList.add('hidden'); el.textContent = ''; return; }
  el.textContent = message;
  el.classList.remove('hidden');
}

async function startScan() {
  const video = document.getElementById('scanVideo');
  const canvas = document.getElementById('scanCanvas');
  if (!video || !canvas) return;
  if (typeof jsQR === 'undefined') {
    setScanOverlay('The scanner library failed to load. Check your connection and try again.');
    return;
  }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setScanOverlay('Camera access isn\u2019t available in this browser.');
    return;
  }
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch (e) {
    setScanOverlay('Camera access was denied or is unavailable on this device.');
    return;
  }
  video.srcObject = scanStream;
  try { await video.play(); } catch (e) { /* autoplay may already be running */ }
  const ctx = canvas.getContext('2d');
  function tick() {
    if (!scanStream) return; // modal was closed mid-scan
    if (!video.videoWidth) { scanRAF = requestAnimationFrame(tick); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code && code.data) {
      handleScanResult(code.data);
      return;
    }
    scanRAF = requestAnimationFrame(tick);
  }
  scanRAF = requestAnimationFrame(tick);
}

function stopScan() {
  if (scanRAF) cancelAnimationFrame(scanRAF);
  scanRAF = null;
  if (scanStream) {
    scanStream.getTracks().forEach(t => t.stop());
    scanStream = null;
  }
}

function handleScanResult(rawText) {
  stopScan();
  let customerId = null;
  try {
    const parsed = JSON.parse(rawText);
    if (parsed && parsed.customerId) customerId = parsed.customerId;
  } catch (e) {
    // Not JSON — fall back to matching the raw text below.
  }
  let customer = customerId ? findCustomer(customerId) : null;
  if (!customer) {
    const needle = rawText.trim().toLowerCase();
    customer = DATA.customers.find(c => c.id.toLowerCase() === needle || c.vehicle.toLowerCase().includes(needle));
  }
  closeModal();
  if (customer) {
    toast('Checked in ' + customer.name + '.');
    navigate('customers', { keepFilters: false });
    setTimeout(() => openCustomerDetail(customer.id), 260);
  } else {
    toast('That QR code didn\u2019t match any known customer.');
  }
}

function openCustomerQRModal(id) {
  const c = findCustomer(id);
  if (!c) return;
  const payload = encodeURIComponent(JSON.stringify({ customerId: c.id }));
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${payload}`;
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Check-in QR</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
      </button>
    </div>
    <div class="flex flex-col items-center gap-4">
      <img src="${src}" alt="QR code for ${escapeHtml(c.name)}" class="rounded-2xl border border-outline-variant" width="220" height="220" />
      <p class="text-[12px] text-on-surface-variant text-center">${escapeHtml(c.name)} — scan this at the front desk to check in.</p>
    </div>`;
  openModal(html, { ariaLabel: 'Customer check-in QR code' });
}

function viewCurrentCustomerQR() {
  const panel = document.getElementById('detailPanel');
  const id = panel && panel.dataset.customerId;
  if (id) openCustomerQRModal(id);
}

/* ============================================================
   Google Calendar sync stub (#33)
   Genuine two-way sync needs a backend to hold OAuth tokens,
   which this static, GitHub Pages-hosted app doesn't have. This
   simulates the "connected" state in localStorage/UI only.
   ============================================================ */
const CALENDAR_SYNC_KEY = 'washtrackpro:calendarSync:v1';

function getCalendarSyncState() {
  try {
    const raw = localStorage.getItem(CALENDAR_SYNC_KEY);
    return raw ? JSON.parse(raw) : { connected: false };
  } catch (e) {
    return { connected: false };
  }
}
function setCalendarSyncState(state) {
  try { localStorage.setItem(CALENDAR_SYNC_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

/* ============================================================
   Offline change queue (#34)
   Data already saves instantly to localStorage (offline-first
   by nature), so there's no real server to sync to. This tracks
   how many saves happened while offline and "flushes" the queue
   once connectivity returns, so the UX at least matches the
   roadmap intent of visible offline queuing + sync.
   ============================================================ */
const PENDING_SYNC_KEY = 'washtrackpro:pendingSync:v1';

function getPendingSyncCount() {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.length : 0;
  } catch (e) {
    return 0;
  }
}
function queuePendingSync() {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push({ ts: new Date().toISOString() });
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(arr));
  } catch (e) { /* ignore */ }
  updateOfflineBadge();
}
function flushPendingSync() {
  const count = getPendingSyncCount();
  try { localStorage.removeItem(PENDING_SYNC_KEY); } catch (e) { /* ignore */ }
  if (count > 0 && typeof toast === 'function') {
    toast('Synced ' + count + ' pending change' + (count === 1 ? '' : 's') + '.');
  }
  updateOfflineBadge();
}

function updateOfflineBadge() {
  const badge = document.getElementById('offlineBadge');
  if (badge) badge.classList.toggle('hidden', navigator.onLine);
  const pendingEl = document.getElementById('settingsPendingCount');
  if (pendingEl) {
    const count = getPendingSyncCount();
    pendingEl.textContent = count + ' pending change' + (count === 1 ? '' : 's');
  }
}

// Wrap saveData (defined in js/data.js, loaded before this file) so
// every mutation made while offline gets queued for a later "sync".
if (typeof saveData === 'function') {
  const _originalSaveData = saveData;
  saveData = function wrappedSaveData() {
    _originalSaveData();
    if (!navigator.onLine) queuePendingSync();
  };
}

window.addEventListener('online', () => {
  flushPendingSync();
  if (typeof toast === 'function') toast('Back online.');
});
window.addEventListener('offline', () => {
  updateOfflineBadge();
  if (typeof toast === 'function') toast('You\u2019re offline — changes are saved locally and will sync later.');
});

/* Register the service worker that makes the app shell available
   offline. Registration itself doesn't touch data, just caching. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => {
      console.warn('WashTrack: service worker registration failed.', e);
    });
  });
}

/* ============================================================
   Settings modal — account info + logout, calendar sync stub,
   and offline/sync status all live here.
   ============================================================ */
function openSettingsModal() {
  const user = typeof currentUser === 'function' ? currentUser() : null;
  if (!user) return;
  const sync = getCalendarSyncState();
  const pending = getPendingSyncCount();
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Settings</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
      </button>
    </div>

    <div class="mb-6">
      <p class="font-label-bold text-[10px] text-on-surface-variant uppercase tracking-widest mb-3">Account</p>
      <div class="p-3 bg-surface-container-low rounded-xl flex items-center gap-3 mb-3">
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[12px] shrink-0">${escapeHtml(user.initials || '')}</div>
        <div class="min-w-0">
          <p class="text-[13px] font-label-bold text-on-surface truncate">${escapeHtml(user.name)}</p>
          <p class="text-[11px] text-on-surface-variant truncate">${escapeHtml(user.email)} • ${escapeHtml(ROLE_LABELS[user.role] || user.role)}</p>
        </div>
      </div>
      <button type="button" id="settingsLogoutBtn" class="w-full py-2.5 rounded-xl border border-error/30 text-error font-label-bold text-[12px] hover:bg-error-container/20 transition-colors">Log Out</button>
    </div>

    <div class="mb-6">
      <p class="font-label-bold text-[10px] text-on-surface-variant uppercase tracking-widest mb-3">Google Calendar Sync</p>
      <div class="p-3.5 bg-surface-container-low rounded-xl">
        <div class="flex items-center justify-between gap-3 mb-2">
          <span class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[18px] ${sync.connected ? 'text-primary' : 'text-on-surface-variant'}" aria-hidden="true">event</span>
            <span class="text-[12px] font-label-bold text-on-surface">${sync.connected ? 'Connected' : 'Not connected'}</span>
          </span>
          <button type="button" id="calendarSyncToggleBtn" class="text-[11px] font-label-bold px-3 py-1.5 rounded-full ${sync.connected ? 'bg-error-container/30 text-error' : 'bg-primary text-on-primary'} transition-colors">${sync.connected ? 'Disconnect' : 'Connect'}</button>
        </div>
        <p class="text-[11px] text-on-surface-variant leading-relaxed">Two-way sync needs a backend to securely hold Google OAuth tokens, which this static, GitHub Pages-hosted app doesn't have. This toggle simulates the connected state in the UI only — no real calendar events are read or written.</p>
        ${sync.connected ? `<p class="text-[10px] text-on-surface-variant mt-2">Simulated connection since ${new Date(sync.connectedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.</p>` : ''}
      </div>
    </div>

    <div>
      <p class="font-label-bold text-[10px] text-on-surface-variant uppercase tracking-widest mb-3">Offline &amp; Sync</p>
      <div class="p-3.5 bg-surface-container-low rounded-xl">
        <div class="flex items-center justify-between gap-3 mb-2">
          <span class="text-[12px] font-label-bold text-on-surface flex items-center gap-2">
            <span class="material-symbols-outlined text-[16px] ${navigator.onLine ? 'text-primary' : 'text-error'}" aria-hidden="true">${navigator.onLine ? 'wifi' : 'wifi_off'}</span>
            ${navigator.onLine ? 'Online' : 'Offline'}
          </span>
          <span id="settingsPendingCount" class="text-[11px] text-on-surface-variant">${pending} pending change${pending === 1 ? '' : 's'}</span>
        </div>
        <p class="text-[11px] text-on-surface-variant leading-relaxed">This app works offline — changes save to this browser immediately and are queued here until you're back online, since there's no server to sync to.</p>
        <button type="button" id="settingsSyncNowBtn" class="w-full mt-3 py-2 rounded-xl border border-outline-variant text-on-surface-variant font-label-bold text-[11px] hover:bg-surface-container-lowest transition-colors" ${pending === 0 ? 'disabled' : ''}>Sync Now</button>
      </div>
    </div>
  `;
  openModal(html, { ariaLabel: 'Settings' });

  document.getElementById('settingsLogoutBtn').addEventListener('click', () => { closeModal(); logout(); });
  document.getElementById('calendarSyncToggleBtn').addEventListener('click', () => {
    const current = getCalendarSyncState();
    if (current.connected) {
      setCalendarSyncState({ connected: false });
      toast('Google Calendar disconnected.');
    } else {
      setCalendarSyncState({ connected: true, connectedAt: new Date().toISOString() });
      toast('Google Calendar connected (simulated).');
    }
    openSettingsModal();
  });
  const syncBtn = document.getElementById('settingsSyncNowBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      flushPendingSync();
      openSettingsModal();
    });
  }
}

/* ============================================================
   "My Jobs Today" — technician companion view (#35)
   Filters Car Wash + Maintenance jobs assigned to the logged-in
   technician's name and lists them as simple tap targets that
   open the existing job detail panel.
   ============================================================ */
function technicianJobsToday(name) {
  const carwash = (DATA.carwashJobs || []).filter(j => j.technician === name && j.status !== 'completed');
  const maintenance = (DATA.maintenanceJobs || []).filter(j => j.technician === name && j.status !== 'completed');
  return { carwash, maintenance };
}

function renderMyJobs() {
  const container = document.getElementById('myJobsList');
  const subtitle = document.getElementById('myJobsSubtitle');
  if (!container) return;
  const user = typeof currentUser === 'function' ? currentUser() : null;
  if (!user) return;
  if (subtitle) subtitle.textContent = 'Signed in as ' + user.name;

  const { carwash, maintenance } = technicianJobsToday(user.name);
  const all = [
    ...carwash.map(j => ({ kind: 'carwash', job: j })),
    ...maintenance.map(j => ({ kind: 'maintenance', job: j })),
  ];

  if (all.length === 0) {
    container.innerHTML = `
      <div class="flex flex-col items-center gap-2 py-16 text-center bg-surface-container-lowest border border-outline-variant rounded-3xl">
        <span class="material-symbols-outlined text-[32px] text-outline-variant" aria-hidden="true">task_alt</span>
        <p class="text-on-surface-variant text-[13px] font-label-bold">No jobs assigned to "${escapeHtml(user.name)}" right now.</p>
        <p class="text-on-surface-variant text-[11px] max-w-xs px-4">Jobs assigned to your exact name in Car Wash Jobs or Maintenance Jobs will show up here.</p>
      </div>`;
    return;
  }

  container.innerHTML = all.map(({ kind, job }) => {
    const title = kind === 'carwash' ? job.service : job.title;
    const vehicle = job.vehicle;
    const statusLabel = kind === 'carwash'
      ? (job.status === 'in-progress' ? 'In Progress' : job.status === 'waitlist' ? 'Waitlist' : job.statusLabel || job.status)
      : (job.statusLabel || job.status);
    const start = job.start || '';
    return `
      <div class="bg-surface-container-lowest border border-outline-variant rounded-2xl p-4 card-shadow cursor-pointer hover:border-primary/40 transition-colors" data-myjob-kind="${kind}" data-myjob-id="${job.id}" role="button" tabindex="0" aria-label="View job ${escapeHtml(title)}">
        <div class="flex items-center justify-between gap-3 mb-1">
          <h4 class="font-label-bold text-[13px] text-on-surface truncate">${escapeHtml(title)}</h4>
          <span class="text-[10px] font-bold uppercase px-2 py-1 rounded-full shrink-0 ${kind === 'carwash' ? 'bg-secondary-container/10 text-secondary' : 'bg-primary-container/20 text-on-primary-container'}">${kind === 'carwash' ? 'Wash' : 'Maintenance'}</span>
        </div>
        <p class="text-[12px] text-on-surface-variant truncate mb-2">${escapeHtml(vehicle)}</p>
        <div class="flex items-center justify-between text-[11px] text-on-surface-variant">
          <span class="truncate">${escapeHtml(statusLabel)}</span>
          <span class="shrink-0 ml-2">${escapeHtml(start)}</span>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('[data-myjob-id]').forEach(card => {
    const kind = card.dataset.myjobKind;
    const id = card.dataset.myjobId;
    card.addEventListener('click', () => openJobDetail(kind, id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openJobDetail(kind, id); }
    });
  });
}

updateOfflineBadge();
