/* ==========================================================
   WashTrack Pro — application logic
   ========================================================== */

// ── Toast notifications ──
  function toast(message) {
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast bg-on-surface text-white text-[13px] font-medium px-4 py-3 rounded-xl shadow-2xl max-w-xs';
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.3s ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 2800);
  }

  // ── Navigation ──
  let lastFocusedBeforePanel = null;

  function navigate(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.remove('active');
      n.classList.add('text-on-surface-variant');
      n.removeAttribute('aria-current');
    });
    const page = document.getElementById('page-' + pageId);
    if (page) { page.classList.add('active'); }
    const navItem = document.querySelector(`[data-page="${pageId}"]`);
    if (navItem) {
      navItem.classList.add('active');
      navItem.classList.remove('text-on-surface-variant');
      navItem.setAttribute('aria-current', 'page');
    }
    closeDetail();
    closeJobDetail();
    // Fix: actually reset the document scroll position (was setting scrollTop on
    // a non-scrolling div before, which silently did nothing)
    window.scrollTo({ top: 0, left: 0 });
    // Clear any in-progress search/filter state so pages don't show stale filters
    const search = document.getElementById('globalSearch');
    if (search) search.value = '';
    resetFilters();
  }

  document.querySelectorAll('[data-page]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.page));
  });

  // ── Customer Detail Panel ──
  function openCustomerDetail(initials, name, email, phone, status, vehicle, cls, spend, since) {
    lastFocusedBeforePanel = document.activeElement;
    document.getElementById('detailAvatar').textContent = initials;
    document.getElementById('detailName').textContent = name;
    document.getElementById('detailEmail').textContent = email;
    document.getElementById('detailPhone').textContent = phone;
    document.getElementById('detailStatus').textContent = status;
    document.getElementById('detailVehicle').textContent = vehicle;
    document.getElementById('detailClass').textContent = cls;
    document.getElementById('detailSpend').textContent = spend;
    document.getElementById('detailSince').textContent = 'Member since ' + since;
    const panel = document.getElementById('detailPanel');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.getElementById('detailCloseBtn').focus();
  }

  function closeDetail() {
    const panel = document.getElementById('detailPanel');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    if (lastFocusedBeforePanel && document.body.contains(lastFocusedBeforePanel)) {
      lastFocusedBeforePanel.focus();
    }
  }

  // ── Job Detail Panel ──
  function openJobDetail(job) {
    lastFocusedBeforePanel = document.activeElement;
    document.getElementById('jobTitle').textContent = job.title;
    document.getElementById('jobCustomer').textContent = job.customer;
    document.getElementById('jobVehicle').textContent = job.vehicle;
    document.getElementById('jobTechnician').textContent = job.technician;
    document.getElementById('jobStart').textContent = job.start;
    document.getElementById('jobPrice').textContent = job.price;
    const statusEl = document.getElementById('jobStatus');
    statusEl.textContent = job.status;
    statusEl.className = 'text-[12px] font-bold truncate ' + (job.statusClass === 'warning' ? 'text-warning' : 'text-primary');
    const panel = document.getElementById('jobPanel');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.getElementById('jobCloseBtn').focus();
  }

  function closeJobDetail() {
    const panel = document.getElementById('jobPanel');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    if (lastFocusedBeforePanel && document.body.contains(lastFocusedBeforePanel)) {
      lastFocusedBeforePanel.focus();
    }
  }

  // Close panels with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDetail();
      closeJobDetail();
    }
  });

  // ── Filter tabs (status filtering, real functionality) ──
  function resetFilters() {
    document.querySelectorAll('.filter-tab').forEach(btn => {
      const isAll = btn.dataset.status === 'all';
      btn.classList.toggle('bg-primary-container', isAll && btn.dataset.table === 'carwash');
      btn.classList.toggle('bg-primary', isAll && btn.dataset.table === 'maintenance');
    });
    document.querySelectorAll('.table-row').forEach(row => row.hidden = false);
  }

  function applyFilter(tableKey, status, clickedBtn) {
    // Update active tab styling within this tab group
    const group = clickedBtn.closest('[role="group"]');
    group.querySelectorAll('.filter-tab').forEach(btn => {
      const active = btn === clickedBtn;
      if (tableKey === 'carwash') {
        btn.classList.toggle('bg-primary-container', active);
        btn.classList.toggle('text-on-primary-container', active);
        btn.classList.toggle('text-on-surface-variant', !active);
      } else if (tableKey === 'maintenance') {
        btn.classList.toggle('bg-primary', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('text-on-surface-variant', !active);
      } else if (tableKey === 'customers') {
        btn.classList.toggle('bg-primary-container', active);
        btn.classList.toggle('text-on-primary-container', active);
        btn.classList.toggle('text-on-surface-variant', !active);
      }
    });

    const scope = tableKey === 'carwash' ? document.getElementById('carwashTable')
                : tableKey === 'maintenance' ? document.getElementById('maintenanceJobList')
                : document.getElementById('customersTable');
    if (!scope) return;
    scope.querySelectorAll('.table-row').forEach(row => {
      const matchesStatus = status === 'all' || row.dataset.status === status;
      const searchTerm = (document.getElementById('globalSearch').value || '').toLowerCase().trim();
      const matchesSearch = !searchTerm || (row.dataset.search || '').includes(searchTerm);
      row.hidden = !(matchesStatus && matchesSearch);
    });
  }

  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => applyFilter(btn.dataset.table, btn.dataset.status, btn));
  });

  // ── Dashboard time-range toggle ──
  document.querySelectorAll('.range-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-toggle').forEach(b => {
        b.classList.toggle('bg-surface-container-lowest', b === btn);
        b.classList.toggle('shadow-sm', b === btn);
        b.classList.toggle('text-primary', b === btn);
        b.classList.toggle('text-outline', b !== btn);
      });
      document.getElementById('dashboardSubtitle').textContent = 'Real-time performance metrics for ' + btn.dataset.range;
    });
  });

  // ── Pagination (functional state, demo data) ──
  document.querySelectorAll('.pagination').forEach(pag => {
    const numBtns = Array.from(pag.querySelectorAll('.pg-num'));
    const prevBtn = pag.querySelector('.pg-prev');
    const nextBtn = pag.querySelector('.pg-next');
    const totalPages = numBtns.length;

    function setActivePage(num) {
      numBtns.forEach(b => {
        const active = Number(b.dataset.pageNum) === num;
        b.classList.toggle('bg-primary', active);
        b.classList.toggle('text-white', active);
        b.classList.toggle('text-on-surface-variant', !active);
        if (active) { b.setAttribute('aria-current', 'page'); } else { b.removeAttribute('aria-current'); }
      });
      prevBtn.disabled = num <= 1;
      nextBtn.disabled = num >= totalPages;
      prevBtn.classList.toggle('opacity-40', prevBtn.disabled);
      prevBtn.classList.toggle('cursor-not-allowed', prevBtn.disabled);
      nextBtn.classList.toggle('opacity-40', nextBtn.disabled);
      nextBtn.classList.toggle('cursor-not-allowed', nextBtn.disabled);
    }

    numBtns.forEach(b => b.addEventListener('click', () => setActivePage(Number(b.dataset.pageNum))));
    prevBtn.addEventListener('click', () => {
      const current = numBtns.findIndex(b => b.getAttribute('aria-current') === 'page') + 1;
      if (current > 1) setActivePage(current - 1);
    });
    nextBtn.addEventListener('click', () => {
      const current = numBtns.findIndex(b => b.getAttribute('aria-current') === 'page') + 1;
      if (current < totalPages) setActivePage(current + 1);
    });
    setActivePage(1);
  });

  // ── Global search: live-filters the table on the active page, falls back
  //    to page-routing when the active page has no table to filter ──
  const searchInput = document.getElementById('globalSearch');

  function currentPageTableKey() {
    if (document.getElementById('page-customers').classList.contains('active')) return 'customers';
    if (document.getElementById('page-carwash').classList.contains('active')) return 'carwash';
    if (document.getElementById('page-maintenance').classList.contains('active')) return 'maintenance';
    return null;
  }

  searchInput.addEventListener('input', () => {
    const tableKey = currentPageTableKey();
    if (!tableKey) return;
    const activeTab = document.querySelector(`#${tableKey}FilterTabs .filter-tab.bg-primary, #${tableKey}FilterTabs .filter-tab.bg-primary-container`)
                    || document.querySelector(`[data-table="${tableKey}"][data-status="all"]`);
    const status = activeTab ? activeTab.dataset.status : 'all';
    applyFilter(tableKey, status, activeTab || document.querySelector(`[data-table="${tableKey}"]`));
  });

  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      const tableKey = currentPageTableKey();
      if (tableKey) return; // already live-filtering this page, nothing more to do
      const q = e.target.value.toLowerCase();
      if (q.includes('customer') || q.includes('client')) navigate('customers');
      else if (q.includes('wash') || q.includes('car')) navigate('carwash');
      else if (q.includes('maint') || q.includes('oil') || q.includes('tire')) navigate('maintenance');
      else if (q.includes('dash') || q.includes('overview')) navigate('dashboard');
    }
  });

  // ── Card hover lift ──
  document.querySelectorAll('.card-shadow').forEach(card => {
    card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-3px)'; card.style.transition = 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)'; });
    card.addEventListener('mouseleave', () => { card.style.transform = 'translateY(0)'; });
  });
