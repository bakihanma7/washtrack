/* ==========================================================
   WashTrack Pro — application logic
   Reads/writes DATA (js/data.js) and renders tables/lists from
   it. Filter, search, sort, and pagination state lives in a
   single `state` object that is mirrored into the URL so views
   are bookmarkable/shareable, and restored from the URL on load.
   ========================================================== */

const PAGE_SIZE = 5;

/* ---- UI state (the "active view" of whichever table is on screen) ---- */
let state = {
  view: 'dashboard',   // dashboard | carwash | maintenance | customers | inventory | packages
  status: 'all',       // status filter for the table on the current view
  q: '',                // search term
  pg: 1,                // pagination page for the table on the current view
  range: 'Today',       // dashboard time-range toggle
};

let lastFocusedBeforePanel = null;
let detailPanelDetachTrap = null;
let jobPanelDetachTrap = null;

/* ============================================================
   URL persistence
   ============================================================ */
function readStateFromURL() {
  const p = new URLSearchParams(location.search);
  return {
    view: p.get('view') || 'dashboard',
    status: p.get('status') || 'all',
    q: p.get('q') || '',
    pg: Math.max(1, parseInt(p.get('pg') || '1', 10) || 1),
    range: p.get('range') || 'Today',
  };
}

function writeStateToURL(push) {
  const p = new URLSearchParams();
  p.set('view', state.view);
  if (state.status && state.status !== 'all') p.set('status', state.status);
  if (state.q) p.set('q', state.q);
  if (state.pg && state.pg !== 1) p.set('pg', String(state.pg));
  if (state.range && state.range !== 'Today') p.set('range', state.range);
  const qs = p.toString();
  const newUrl = location.pathname + (qs ? '?' + qs : '');
  if (push) {
    history.pushState({ view: state.view }, '', newUrl);
  } else {
    history.replaceState({ view: state.view }, '', newUrl);
  }
}

/* ============================================================
   Toast notifications — queued with a max-visible cap so rapid
   or repeated actions don't pile up an unbounded stack of toasts.
   ============================================================ */
const TOAST_MAX_VISIBLE = 3;
const toastQueue = [];
let toastVisibleCount = 0;

function toast(message) {
  toastQueue.push(message);
  processToastQueue();
}

function processToastQueue() {
  while (toastVisibleCount < TOAST_MAX_VISIBLE && toastQueue.length > 0) {
    const message = toastQueue.shift();
    showToastElement(message);
  }
}

function showToastElement(message) {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = 'toast bg-on-surface text-white text-[13px] font-medium px-4 py-3 rounded-xl shadow-2xl max-w-xs';
  el.textContent = message;
  container.appendChild(el);
  toastVisibleCount++;

  setTimeout(() => {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity = '0';
    setTimeout(() => {
      el.remove();
      toastVisibleCount--;
      processToastQueue();
    }, 300);
  }, 2800);
}

/* ============================================================
   Navigation between pages
   ============================================================ */
function navigate(pageId, opts) {
  opts = opts || {};
  if (typeof currentUser === 'function') {
    const u = currentUser();
    const allowed = u && typeof ROLE_PAGES !== 'undefined' ? ROLE_PAGES[u.role] : null;
    if (allowed && !allowed.includes(pageId)) pageId = allowed[0];
  }
  state.view = pageId;
  if (!opts.keepFilters) {
    state.status = 'all';
    state.q = '';
    state.pg = 1;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.classList.add('text-on-surface-variant');
    n.removeAttribute('aria-current');
  });
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  const navItem = document.querySelector(`[data-page="${pageId}"]`);
  if (navItem) {
    navItem.classList.add('active');
    navItem.classList.remove('text-on-surface-variant');
    navItem.setAttribute('aria-current', 'page');
  }

  closeDetail();
  closeJobDetail();
  window.scrollTo({ top: 0, left: 0 });

  const search = document.getElementById('globalSearch');
  if (search) search.value = state.q;

  renderActiveView();
  writeStateToURL(!opts.replaceHistory);
}

document.querySelectorAll('[data-page]').forEach(item => {
  item.addEventListener('click', () => navigate(item.dataset.page));
});

/* Real back/forward support: popstate fires when the user uses the
   browser's Back/Forward buttons (or history.back()/forward()). Re-sync
   in-memory state and the DOM from the URL the browser just navigated
   to, but don't push a new entry — the browser already moved the
   history cursor for us. */
window.addEventListener('popstate', () => {
  state = readStateFromURL();
  const search = document.getElementById('globalSearch');
  if (search) search.value = state.q;
  syncRangeToggleUI();
  navigate(state.view, { keepFilters: true, replaceHistory: true });
  syncFilterTabUI();
  updateDashboardFinancials();
});

/* ============================================================
   Delegated action dispatcher — replaces inline onclick="..."
   attributes throughout index.html and the modal templates in
   modals.js with a single addEventListener-based handler. Markup
   just declares intent (`data-action="fn"` plus an optional
   `data-arg="value"`); this is the only place that turns that
   into a function call, which keeps behavior out of markup and
   works for CSP setups that disallow inline event handlers.
   Because it's delegated on `document`, it also covers buttons
   injected later via innerHTML (e.g. modal content) with no need
   to re-attach listeners each time a modal opens.
   ============================================================ */
const ACTIONS = {
  navigate: (arg) => navigate(arg),
  toast: (arg) => toast(arg),
  openNewJobModal: (arg) => openNewJobModal(arg || undefined),
  openAddExpenseModal: () => openAddExpenseModal(),
  openNewCustomerModal: () => openNewCustomerModal(),
  closeModal: () => closeModal(),
  closeDetail: () => closeDetail(),
  closeJobDetail: () => closeJobDetail(),
  deactivateCurrentCustomer: () => deactivateCurrentCustomer(),
  markCurrentJobComplete: () => markCurrentJobComplete(),
  cancelCurrentJob: () => cancelCurrentJob(),
  toggleTheme: () => toggleTheme(),
  openScanModal: () => openScanModal(),
  openSettingsModal: () => openSettingsModal(),
  viewCurrentCustomerQR: () => viewCurrentCustomerQR(),
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const handler = ACTIONS[el.dataset.action];
  if (!handler) return;
  handler(el.dataset.arg);
});

/* ============================================================
   Rendering: shared helpers
   ============================================================ */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* Debounce — delays invoking `fn` until `wait` ms have passed since
   the last call. Used to avoid re-filtering/re-rendering a table on
   every single keystroke in the search box. */
function debounce(fn, wait) {
  let timeoutId = null;
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), wait);
  };
}

function emptyStateRow(colspan, message) {
  return `<tr><td colspan="${colspan}" class="px-6 py-14 text-center text-on-surface-variant">
    <div class="flex flex-col items-center gap-2">
      <span class="material-symbols-outlined text-[32px] text-outline-variant" aria-hidden="true">search_off</span>
      <p class="text-[13px]">${escapeHtml(message)}</p>
    </div>
  </td></tr>`;
}

function emptyStateCard(message) {
  return `<div class="p-14 text-center text-on-surface-variant">
    <div class="flex flex-col items-center gap-2">
      <span class="material-symbols-outlined text-[32px] text-outline-variant" aria-hidden="true">search_off</span>
      <p class="text-[13px]">${escapeHtml(message)}</p>
    </div>
  </div>`;
}

function renderPagination(containerEl, totalItems, currentPage, onPageChange) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  containerEl.innerHTML = '';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'pg-prev w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant text-outline hover:bg-surface-container-lowest transition-colors';
  prev.setAttribute('aria-label', 'Previous page');
  prev.innerHTML = '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_left</span>';
  prev.disabled = page <= 1;
  prev.classList.toggle('opacity-40', prev.disabled);
  prev.classList.toggle('cursor-not-allowed', prev.disabled);
  prev.addEventListener('click', () => onPageChange(page - 1));
  containerEl.appendChild(prev);

  for (let n = 1; n <= totalPages; n++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.pageNum = String(n);
    const active = n === page;
    btn.className = 'pg-num w-8 h-8 rounded-lg flex items-center justify-center font-label-bold text-[11px] transition-colors ' +
      (active ? 'bg-primary text-white' : 'text-on-surface-variant hover:bg-surface-container-lowest');
    if (active) btn.setAttribute('aria-current', 'page');
    btn.setAttribute('aria-label', 'Page ' + n);
    btn.textContent = String(n);
    btn.addEventListener('click', () => onPageChange(n));
    containerEl.appendChild(btn);
  }

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'pg-next w-8 h-8 rounded-lg flex items-center justify-center border border-outline-variant text-outline hover:bg-surface-container-lowest transition-colors';
  next.setAttribute('aria-label', 'Next page');
  next.innerHTML = '<span class="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_right</span>';
  next.disabled = page >= totalPages;
  next.classList.toggle('opacity-40', next.disabled);
  next.classList.toggle('cursor-not-allowed', next.disabled);
  next.addEventListener('click', () => onPageChange(page + 1));
  containerEl.appendChild(next);

  return page;
}

/* ============================================================
   Customers table
   ============================================================ */
const CUSTOMER_SORTERS = {
  'Total Spend (High-Low)': (a, b) => b.spend - a.spend,
  'Last Visit': (a, b) => new Date(b.lastVisit || 0) - new Date(a.lastVisit || 0),
  'Date Added': (a, b) => new Date(b.memberSince) - new Date(a.memberSince),
};

function getCustomerSortLabel() {
  return (customerSortDropdown && customerSortDropdown.getValue()) || 'Total Spend (High-Low)';
}

function filterCustomers() {
  const q = state.q.trim().toLowerCase();
  return DATA.customers.filter(c => {
    const matchesStatus = state.status === 'all' || c.status === state.status;
    const haystack = `${c.name} ${c.email} ${c.vehicle} ${c.vehicleColor}`.toLowerCase();
    const matchesSearch = !q || haystack.includes(q);
    return matchesStatus && matchesSearch;
  });
}

function customerStatusBadge(status) {
  switch (status) {
    case 'active': return '<span class="bg-primary-container/20 text-on-primary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border border-primary-container/30">Active</span>';
    case 'vip': return '<span class="bg-secondary-container/10 text-secondary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border border-secondary-container/20">VIP</span>';
    case 'pending': return '<span class="bg-warning-container text-warning px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight">Pending</span>';
    case 'inactive': default: return '<span class="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border border-outline-variant">Inactive</span>';
  }
}

function renderCustomers() {
  const tbody = document.getElementById('customersTableBody');
  const pagContainer = document.getElementById('customersPagination');
  const label = document.getElementById('customersResultsLabel');
  if (!tbody) return;

  let rows = filterCustomers();
  const sortLabel = getCustomerSortLabel();
  rows = rows.slice().sort(CUSTOMER_SORTERS[sortLabel] || CUSTOMER_SORTERS['Total Spend (High-Low)']);

  const total = rows.length;
  const page = renderPagination(pagContainer, total, state.pg, (n) => {
    state.pg = n;
    renderCustomers();
    writeStateToURL();
  });
  state.pg = page;

  const start = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  if (label) {
    label.textContent = total === 0
      ? 'No customers match your filters'
      : `Showing ${start + 1} to ${Math.min(start + PAGE_SIZE, total)} of ${total} customers`;
  }

  if (total === 0) {
    tbody.innerHTML = emptyStateRow(6, 'No customers match your search or filter. Try clearing them.');
    return;
  }

  tbody.innerHTML = pageRows.map(c => `
    <tr class="hover:bg-surface-container-low/50 transition-colors cursor-pointer group" tabindex="0" role="button"
        data-customer-id="${c.id}" aria-label="View details for ${escapeHtml(c.name)}">
      <td class="px-6 py-4"><div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-full ${c.avatarBg} flex items-center justify-center font-bold ${c.avatarText} text-[13px] shrink-0 overflow-hidden">${c.initials}</div>
        <div class="min-w-0">
          <p class="font-label-bold text-[13px] text-on-surface truncate max-w-[180px]" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</p>
          <p class="text-[11px] text-on-surface-variant truncate max-w-[180px]" title="${escapeHtml(c.email)}">${escapeHtml(c.email)}</p>
        </div>
      </div></td>
      <td class="px-6 py-4">${customerStatusBadge(c.status)}</td>
      <td class="px-6 py-4"><p class="text-[13px] text-on-surface">${escapeHtml(c.vehicle)}</p><p class="text-[11px] text-on-surface-variant">${escapeHtml(c.vehicleColor)}</p></td>
      <td class="px-6 py-4"><p class="text-[13px] text-on-surface">${escapeHtml(c.lastVisitLabel)}</p><p class="text-[11px] text-on-surface-variant">${escapeHtml(c.lastVisitNote)}</p></td>
      <td class="px-6 py-4"><p class="font-label-bold text-[13px] text-on-surface">$${c.spend.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p><p class="text-[10px] text-primary">${escapeHtml(c.classification)}</p></td>
      <td class="px-6 py-4 text-right"><button type="button" aria-label="More actions for ${escapeHtml(c.name)}" data-more-customer="${c.id}" class="p-2 hover:bg-surface-container-high rounded-full transition-all opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"><span class="material-symbols-outlined text-on-surface-variant text-[18px]" aria-hidden="true">more_vert</span></button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr[data-customer-id]').forEach(row => {
    const id = row.dataset.customerId;
    row.addEventListener('click', () => openCustomerDetail(id));
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCustomerDetail(id); } });
  });
  tbody.querySelectorAll('[data-more-customer]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toast('Customer actions menu coming soon.'); });
  });
}

/* ============================================================
   Car Wash Jobs table
   ============================================================ */
function carwashToneClasses(tone) {
  switch (tone) {
    case 'secondary': return 'bg-secondary-container/10 text-secondary';
    case 'primary-container': return 'bg-primary-container/20 text-on-primary-container';
    case 'neutral': default: return 'bg-surface-container-high text-on-surface-variant';
  }
}
function avatarToneClasses(tone) {
  switch (tone) {
    case 'secondary': return 'bg-secondary/10 text-secondary';
    case 'tertiary': return 'bg-tertiary/10 text-tertiary';
    case 'primary': default: return 'bg-primary/10 text-primary';
  }
}
function avatarToneClassesLight(tone) {
  switch (tone) {
    case 'secondary': return 'bg-secondary/5 text-secondary';
    case 'tertiary': return 'bg-tertiary/5 text-tertiary';
    case 'primary': default: return 'bg-primary/5 text-primary';
  }
}
function initialsOf(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function filterCarwashJobs() {
  const q = state.q.trim().toLowerCase();
  return DATA.carwashJobs.filter(j => {
    const matchesStatus = state.status === 'all' || j.status === state.status;
    const haystack = `${j.customer} ${j.vehicle} ${j.service} ${j.technician}`.toLowerCase();
    const matchesSearch = !q || haystack.includes(q);
    return matchesStatus && matchesSearch;
  });
}

function carwashStatusMarkup(job) {
  if (job.status === 'in-progress') {
    return `<span class="flex items-center gap-1.5 text-primary font-bold text-[12px]"><span class="relative flex h-2 w-2" aria-hidden="true"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>In Progress</span>`;
  }
  if (job.status === 'completed') {
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-primary-container/20 text-on-primary-container"><span class="material-symbols-outlined text-[13px] mr-1 fill-icon" aria-hidden="true">check_circle</span>Completed</span>`;
  }
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-warning-container text-warning"><span class="material-symbols-outlined text-[13px] mr-1" aria-hidden="true">pause_circle</span>On Hold</span>`;
}

function renderCarwashJobs() {
  const tbody = document.getElementById('carwashTableBody');
  const pagContainer = document.getElementById('carwashPagination');
  const label = document.getElementById('carwashResultsLabel');
  if (!tbody) return;

  const rows = filterCarwashJobs();
  const total = rows.length;
  const page = renderPagination(pagContainer, total, state.pg, (n) => {
    state.pg = n;
    renderCarwashJobs();
    writeStateToURL();
  });
  state.pg = page;

  const start = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  if (label) {
    label.textContent = total === 0
      ? 'No jobs match your filters'
      : `Showing ${start + 1} to ${Math.min(start + PAGE_SIZE, total)} of ${total} results`;
  }

  if (total === 0) {
    tbody.innerHTML = emptyStateRow(7, 'No car wash jobs match your search or filter. Try clearing them.');
    return;
  }

  tbody.innerHTML = pageRows.map(j => `
    <tr class="hover:bg-surface-container-low/50 transition-colors cursor-pointer" tabindex="0" role="button"
        data-job-id="${j.id}" aria-label="View job details for ${escapeHtml(j.customer)}, ${escapeHtml(j.service)}">
      <td class="px-6 py-5"><div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-full ${avatarToneClasses(j.avatarTone)} flex items-center justify-center shrink-0 overflow-hidden"><span class="material-symbols-outlined text-[18px]" aria-hidden="true">${j.avatarIcon}</span></div>
        <div class="min-w-0">
          <p class="font-label-bold text-on-surface text-[13px] truncate max-w-[160px]" title="${escapeHtml(j.customer)}">${escapeHtml(j.customer)}</p>
          <p class="text-[11px] text-outline truncate max-w-[160px]" title="${escapeHtml(j.vehicle)}">${escapeHtml(j.vehicle)}</p>
        </div>
      </div></td>
      <td class="px-6 py-5 text-center"><span class="px-3 py-1 rounded-full ${carwashToneClasses(j.serviceTone)} text-[11px] font-bold uppercase tracking-wider">${escapeHtml(j.service)}</span></td>
      <td class="px-6 py-5">${j.technician === 'Unassigned'
        ? '<span class="text-[12px] text-outline italic">Unassigned</span>'
        : `<div class="flex items-center gap-2"><div class="w-6 h-6 rounded-full ${avatarToneClasses(j.technicianTone)} flex items-center justify-center text-[10px] font-bold overflow-hidden">${initialsOf(j.technician)}</div><span class="text-[13px] font-label-bold text-on-surface-variant">${escapeHtml(j.technician)}</span></div>`}</td>
      <td class="px-6 py-5">${carwashStatusMarkup(j)}</td>
      <td class="px-6 py-5 text-[13px] text-on-surface-variant">${escapeHtml(j.start)}</td>
      <td class="px-6 py-5 text-right font-stat-value text-[16px] text-on-surface">$${j.price.toFixed(2)}</td>
      <td class="px-6 py-5 text-right"><button type="button" aria-label="More actions for ${escapeHtml(j.customer)} job" data-more-job="${j.id}" class="p-2 hover:bg-surface-container rounded-lg transition-colors"><span class="material-symbols-outlined text-outline text-[18px]" aria-hidden="true">more_vert</span></button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('tr[data-job-id]').forEach(row => {
    const id = row.dataset.jobId;
    row.addEventListener('click', () => openJobDetail('carwash', id));
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openJobDetail('carwash', id); } });
  });
  tbody.querySelectorAll('[data-more-job]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); toast('Job actions menu coming soon.'); });
  });
}

/* ============================================================
   Maintenance Jobs list
   ============================================================ */
function maintenanceTabMatches(status, tab) {
  if (tab === 'all') return status === 'in-progress' || status === 'quality-control';
  if (tab === 'scheduled') return status === 'waitlist';
  if (tab === 'history') return status === 'completed';
  return true;
}

function filterMaintenanceJobs() {
  const q = state.q.trim().toLowerCase();
  return DATA.maintenanceJobs.filter(j => {
    const matchesStatus = maintenanceTabMatches(j.status, state.status);
    const haystack = `${j.title} ${j.vehicle} ${j.technician}`.toLowerCase();
    const matchesSearch = !q || haystack.includes(q);
    return matchesStatus && matchesSearch;
  });
}

function maintenanceStatusBadge(job) {
  if (job.statusTone === 'warning') {
    return `<span class="px-4 py-1.5 bg-warning-container text-warning rounded-full text-[11px] font-bold">${escapeHtml(job.statusLabel)}</span>`;
  }
  return `<span class="px-4 py-1.5 bg-primary-container/20 text-on-primary-container rounded-full text-[11px] font-bold border border-primary-container/30">${escapeHtml(job.statusLabel)}</span>`;
}

function renderMaintenanceJobs() {
  const container = document.getElementById('maintenanceJobList');
  if (!container) return;
  const rows = filterMaintenanceJobs();

  if (rows.length === 0) {
    container.innerHTML = emptyStateCard('No maintenance jobs match your search or filter.');
    return;
  }

  container.innerHTML = rows.map(j => `
    <div class="p-6 hover:bg-surface-container-low transition-colors cursor-pointer" tabindex="0" role="button"
         data-maint-id="${j.id}" aria-label="View job details for ${escapeHtml(j.title)}">
      <div class="flex items-start justify-between gap-4">
        <div class="flex gap-4 min-w-0">
          <div class="w-14 h-14 rounded-2xl ${avatarToneClassesLight(j.iconTone).split(' ')[0]} flex items-center justify-center shrink-0 overflow-hidden"><span class="material-symbols-outlined text-[28px] ${avatarToneClassesLight(j.iconTone).split(' ')[1]}" aria-hidden="true">${j.icon}</span></div>
          <div class="min-w-0">
            <h4 class="font-bold text-on-surface text-[14px] truncate">${escapeHtml(j.title)}</h4>
            <p class="text-[12px] text-on-surface-variant truncate">${escapeHtml(j.vehicle)}</p>
            <div class="flex items-center gap-4 mt-2 flex-wrap">
              <div class="flex items-center gap-1 text-[11px] text-on-surface-variant"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">person</span>Assigned: <span class="text-on-surface font-semibold ml-1">${escapeHtml(j.technician)}</span></div>
              <div class="flex items-center gap-1 text-[11px] text-on-surface-variant"><span class="material-symbols-outlined text-[14px]" aria-hidden="true">schedule</span>Started: <span class="text-on-surface font-semibold ml-1">${escapeHtml(j.start)}</span></div>
            </div>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2 shrink-0">
          ${maintenanceStatusBadge(j)}
          ${j.progress != null ? `<div class="w-32 h-1.5 bg-surface-variant rounded-full mt-1 relative overflow-hidden"><div class="absolute top-0 left-0 h-full bg-primary rounded-full" style="width:${j.progress}%"></div></div>` : ''}
          <p class="text-[10px] text-on-surface-variant uppercase font-bold">${escapeHtml(j.note)}</p>
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-maint-id]').forEach(row => {
    const id = row.dataset.maintId;
    row.addEventListener('click', () => openJobDetail('maintenance', id));
    row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openJobDetail('maintenance', id); } });
  });
}

/* ============================================================
   Master render dispatcher
   ============================================================ */
function renderActiveView() {
  if (state.view === 'customers') renderCustomers();
  else if (state.view === 'carwash') renderCarwashJobs();
  else if (state.view === 'maintenance') renderMaintenanceJobs();
  else if (state.view === 'myjobs' && typeof renderMyJobs === 'function') renderMyJobs();
}

/* ============================================================
   Dashboard financial stats — kept live so "Add Expense" has a
   visible effect instead of being a decorative form.
   ============================================================ */
const DASHBOARD_REVENUE = 4250;

function updateDashboardFinancials() {
  const expensesEl = document.getElementById('statExpenses');
  const profitEl = document.getElementById('statNetProfit');
  if (!expensesEl || !profitEl) return;
  const expenses = totalExpenses();
  const profit = DASHBOARD_REVENUE - expenses;
  expensesEl.textContent = '$' + expenses.toLocaleString(undefined, { minimumFractionDigits: 0 });
  profitEl.textContent = '$' + profit.toLocaleString(undefined, { minimumFractionDigits: 0 });
}

/* ============================================================
   Filter tabs
   ============================================================ */
function applyFilterTab(tableKey, status, clickedBtn) {
  state.status = status;
  state.pg = 1;

  const group = clickedBtn.closest('[role="group"]');
  group.querySelectorAll('.filter-tab').forEach(btn => {
    const active = btn === clickedBtn;
    if (tableKey === 'carwash' || tableKey === 'customers') {
      btn.classList.toggle('bg-primary-container', active);
      btn.classList.toggle('text-on-primary-container', active);
      btn.classList.toggle('text-on-surface-variant', !active);
    } else if (tableKey === 'maintenance') {
      btn.classList.toggle('bg-primary', active);
      btn.classList.toggle('text-white', active);
      btn.classList.toggle('text-on-surface-variant', !active);
    }
  });

  renderActiveView();
  writeStateToURL();
}

document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', () => applyFilterTab(btn.dataset.table, btn.dataset.status, btn));
});

function syncFilterTabUI() {
  document.querySelectorAll('.filter-tab').forEach(btn => {
    const tableKey = btn.dataset.table;
    const isCurrentTable = tableKey === state.view;
    const active = isCurrentTable && btn.dataset.status === state.status;
    if (tableKey === 'carwash' || tableKey === 'customers') {
      btn.classList.toggle('bg-primary-container', active);
      btn.classList.toggle('text-on-primary-container', active);
      btn.classList.toggle('text-on-surface-variant', !active);
    } else if (tableKey === 'maintenance') {
      btn.classList.toggle('bg-primary', active);
      btn.classList.toggle('text-white', active);
      btn.classList.toggle('text-on-surface-variant', !active);
    }
  });
}

/* ============================================================
   Customer sort dropdown (custom component, replaces native <select>)
   ============================================================ */
let customerSortDropdown = null;
const customerSortMount = document.getElementById('customerSortMount');
if (customerSortMount) {
  customerSortDropdown = createDropdown({
    options: [
      { value: 'Total Spend (High-Low)', label: 'Total Spend (High-Low)' },
      { value: 'Last Visit', label: 'Last Visit' },
      { value: 'Date Added', label: 'Date Added' },
    ],
    value: 'Total Spend (High-Low)',
    ariaLabel: 'Sort customers by',
    buttonClass: 'flex items-center justify-between gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-[12px] py-1.5 px-3 min-w-[190px] focus:ring-2 focus:ring-primary-container outline-none hover:bg-surface-container-low transition-colors',
    listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-64 overflow-y-auto',
    onChange: (value) => {
      state.pg = 1;
      renderCustomers();
      toast('Sorted by ' + value + '.');
    },
  });
  customerSortMount.appendChild(customerSortDropdown.root);
}

/* ============================================================
   Dashboard time-range toggle
   ============================================================ */
document.querySelectorAll('.range-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    state.range = btn.dataset.range;
    document.querySelectorAll('.range-toggle').forEach(b => {
      b.classList.toggle('bg-surface-container-lowest', b === btn);
      b.classList.toggle('shadow-sm', b === btn);
      b.classList.toggle('text-primary', b === btn);
      b.classList.toggle('text-outline', b !== btn);
    });
    document.getElementById('dashboardSubtitle').textContent = 'Real-time performance metrics for ' + btn.dataset.range;
    writeStateToURL();
  });
});

function syncRangeToggleUI() {
  document.querySelectorAll('.range-toggle').forEach(b => {
    const active = b.dataset.range === state.range;
    b.classList.toggle('bg-surface-container-lowest', active);
    b.classList.toggle('shadow-sm', active);
    b.classList.toggle('text-primary', active);
    b.classList.toggle('text-outline', !active);
  });
  document.getElementById('dashboardSubtitle').textContent = 'Real-time performance metrics for ' + state.range;
}

/* ============================================================
   Theme (light/dark) — the `dark` class on <html> is applied as
   early as possible by an inline script in <head> (before any
   CSS/JS loads) to avoid a flash of the wrong theme; this just
   keeps the toggle button and localStorage in sync afterward.
   ============================================================ */
const THEME_STORAGE_KEY = 'washtrackpro:theme';

function isDarkThemeActive() {
  return document.documentElement.classList.contains('dark');
}

function syncThemeToggleUI() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;
  const dark = isDarkThemeActive();
  const icon = btn.querySelector('[data-theme-icon]');
  if (icon) icon.textContent = dark ? 'light_mode' : 'dark_mode';
  btn.setAttribute('aria-pressed', String(dark));
  btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}

function toggleTheme() {
  const dark = !isDarkThemeActive();
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
  } catch (e) {
    console.warn('WashTrack: could not save theme preference.', e);
  }
  syncThemeToggleUI();
}

/* ============================================================
   Customer Detail Panel
   ============================================================ */
function openCustomerDetail(id) {
  const c = findCustomer(id);
  if (!c) return;
  lastFocusedBeforePanel = document.activeElement;

  document.getElementById('detailAvatar').textContent = c.initials;
  document.getElementById('detailName').textContent = c.name;
  document.getElementById('detailEmail').textContent = c.email;
  document.getElementById('detailPhone').textContent = c.phone;
  document.getElementById('detailStatus').textContent = c.status.charAt(0).toUpperCase() + c.status.slice(1);
  document.getElementById('detailVehicle').textContent = c.vehicle;
  document.getElementById('detailClass').textContent = c.classification;
  document.getElementById('detailSpend').textContent = '$' + c.spend.toLocaleString(undefined, { minimumFractionDigits: 2 });
  document.getElementById('detailSince').textContent = 'Member since ' + c.memberSinceLabel;

  const panel = document.getElementById('detailPanel');
  panel.dataset.customerId = id;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  document.getElementById('detailCloseBtn').focus();
  detailPanelDetachTrap = attachFocusTrap(panel);
  if (typeof renderCustomerNotes === 'function') renderCustomerNotes(id);
}

function closeDetail() {
  const panel = document.getElementById('detailPanel');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  if (detailPanelDetachTrap) { detailPanelDetachTrap(); detailPanelDetachTrap = null; }
  if (lastFocusedBeforePanel && document.body.contains(lastFocusedBeforePanel)) {
    lastFocusedBeforePanel.focus();
  }
}

function deactivateCurrentCustomer() {
  const panel = document.getElementById('detailPanel');
  const id = panel.dataset.customerId;
  const c = findCustomer(id);
  if (!c) return;
  confirmAction({
    title: 'Deactivate this customer?',
    message: `${c.name}'s account will be marked inactive. You can reactivate them later from their profile.`,
    confirmLabel: 'Deactivate',
    danger: true,
    onConfirm: () => {
      c.status = 'inactive';
      saveData();
      toast(c.name + ' has been marked inactive.');
      closeDetail();
      renderActiveView();
    },
  });
}

/* ============================================================
   Job Detail Panel (car wash + maintenance)
   ============================================================ */
function openJobDetail(kind, id) {
  const job = kind === 'carwash' ? findCarwashJob(id) : findMaintenanceJob(id);
  if (!job) return;
  lastFocusedBeforePanel = document.activeElement;

  const panel = document.getElementById('jobPanel');
  panel.dataset.jobKind = kind;
  panel.dataset.jobId = id;

  if (kind === 'carwash') {
    document.getElementById('jobTitle').textContent = job.service;
    document.getElementById('jobCustomer').textContent = job.customer;
    document.getElementById('jobVehicle').textContent = job.vehicle;
    document.getElementById('jobTechnician').textContent = job.technician;
    document.getElementById('jobStart').textContent = job.start;
    document.getElementById('jobPrice').textContent = '$' + job.price.toFixed(2);
    const statusEl = document.getElementById('jobStatus');
    const label = job.status === 'in-progress' ? 'In Progress' : job.status === 'completed' ? 'Completed' : 'On Hold';
    statusEl.textContent = label;
    statusEl.className = 'text-[12px] font-bold truncate ' + (job.status === 'on-hold' ? 'text-warning' : 'text-primary');
  } else {
    document.getElementById('jobTitle').textContent = job.title;
    document.getElementById('jobCustomer').textContent = job.technician + ' (Technician)';
    document.getElementById('jobVehicle').textContent = job.vehicle;
    document.getElementById('jobTechnician').textContent = job.technician;
    document.getElementById('jobStart').textContent = job.start;
    document.getElementById('jobPrice').textContent = job.note;
    const statusEl = document.getElementById('jobStatus');
    statusEl.textContent = job.statusLabel;
    statusEl.className = 'text-[12px] font-bold truncate ' + (job.statusTone === 'warning' ? 'text-warning' : 'text-primary');
  }

  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  document.getElementById('jobCloseBtn').focus();
  jobPanelDetachTrap = attachFocusTrap(panel);
  if (typeof renderJobNotes === 'function') renderJobNotes(kind, id);
}

function closeJobDetail() {
  const panel = document.getElementById('jobPanel');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  if (jobPanelDetachTrap) { jobPanelDetachTrap(); jobPanelDetachTrap = null; }
  if (lastFocusedBeforePanel && document.body.contains(lastFocusedBeforePanel)) {
    lastFocusedBeforePanel.focus();
  }
}

function markCurrentJobComplete() {
  const panel = document.getElementById('jobPanel');
  const kind = panel.dataset.jobKind;
  const id = panel.dataset.jobId;
  const job = kind === 'carwash' ? findCarwashJob(id) : findMaintenanceJob(id);
  if (!job) return;
  job.status = 'completed';
  if (kind === 'maintenance') {
    job.statusLabel = 'Completed';
    job.statusTone = 'primary';
    job.progress = 100;
    job.note = 'Completed just now';
  }
  saveData();
  toast('Job marked as complete.');
  closeJobDetail();
  renderActiveView();
}

function cancelCurrentJob() {
  const panel = document.getElementById('jobPanel');
  const kind = panel.dataset.jobKind;
  const id = panel.dataset.jobId;
  const job = kind === 'carwash' ? findCarwashJob(id) : findMaintenanceJob(id);
  if (!job) return;
  const label = kind === 'carwash' ? job.service + ' for ' + job.customer : job.title;
  confirmAction({
    title: 'Cancel this job?',
    message: `This will remove "${label}" from the job list. This can't be undone.`,
    confirmLabel: 'Cancel Job',
    danger: true,
    onConfirm: () => {
      if (kind === 'carwash') cancelCarwashJob(id); else cancelMaintenanceJob(id);
      toast('Job cancelled.');
      closeJobDetail();
      renderActiveView();
    },
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDetail();
    closeJobDetail();
  }
});

/* ============================================================
   Global search — live-filters the table on the active view,
   falls back to keyword-based page routing elsewhere.
   ============================================================ */
const searchInput = document.getElementById('globalSearch');

function currentViewHasTable() {
  return state.view === 'customers' || state.view === 'carwash' || state.view === 'maintenance';
}

const SEARCH_DEBOUNCE_MS = 250;
const debouncedFilterAndRender = debounce(() => {
  if (currentViewHasTable()) {
    renderActiveView();
    writeStateToURL();
  }
}, SEARCH_DEBOUNCE_MS);

searchInput.addEventListener('input', () => {
  // state.q updates immediately so the input never feels laggy;
  // only the (potentially expensive) re-filter/re-render/URL-write
  // is debounced so it doesn't run on every single keystroke.
  state.q = searchInput.value;
  state.pg = 1;
  debouncedFilterAndRender();
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    if (currentViewHasTable()) return; // already live-filtering
    const q = e.target.value.toLowerCase();
    if (q.includes('customer') || q.includes('client')) navigate('customers');
    else if (q.includes('wash') || q.includes('car')) navigate('carwash');
    else if (q.includes('maint') || q.includes('oil') || q.includes('tire')) navigate('maintenance');
    else if (q.includes('dash') || q.includes('overview')) navigate('dashboard');
  }
});

/* ============================================================
   Card hover lift
   ============================================================ */
document.querySelectorAll('.card-shadow').forEach(card => {
  card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-3px)'; card.style.transition = 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)'; });
  card.addEventListener('mouseleave', () => { card.style.transform = 'translateY(0)'; });
});

/* ============================================================
   Boot: restore state from the URL (if any) and render.
   Skipped entirely if there's no active session — js/auth.js
   renders the login/signup screen instead and calls runAppBoot()
   itself once the person logs in or signs up.
   ============================================================ */
function runAppBoot(user) {
  syncThemeToggleUI();
  state = readStateFromURL();
  if (user && typeof ROLE_PAGES !== 'undefined') {
    const allowed = ROLE_PAGES[user.role] || ROLE_PAGES.manager;
    if (!allowed.includes(state.view)) state.view = allowed[0];
  }
  const search = document.getElementById('globalSearch');
  if (search) search.value = state.q;
  syncRangeToggleUI();
  navigate(state.view, { keepFilters: true, replaceHistory: true });
  syncFilterTabUI();
  updateDashboardFinancials();
}

(function boot() {
  if (typeof isAuthenticated === 'function' && !isAuthenticated()) {
    if (typeof renderAuthScreen === 'function') renderAuthScreen();
    return;
  }
  const user = typeof currentUser === 'function' ? currentUser() : null;
  if (user) {
    if (typeof applyRoleGating === 'function') applyRoleGating(user.role);
    if (typeof updateHeaderProfile === 'function') updateHeaderProfile(user);
  }
  runAppBoot(user);
})();
