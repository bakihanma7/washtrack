/* ==========================================================
   WashTrack Pro — modal system
   A single generic centered-overlay modal (#modalRoot in index.html)
   that different builder functions render content into: New Job,
   Register New Customer, Add Expense, and a generic confirmation
   dialog used for destructive actions (Deactivate Account, Cancel
   Job).
   ========================================================== */

/* ============================================================
   Shared focus trap — used by the modal and by the two side
   panels (customer/job detail) in script.js.
   ============================================================ */
function attachFocusTrap(container) {
  function getFocusable() {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input:not([disabled]), select:not([disabled]), [role="option"], [tabindex]:not([tabindex="-1"])'
    )).filter(el => el.offsetParent !== null);
  }
  function handleKeydown(e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
  container.addEventListener('keydown', handleKeydown);
  return function detach() { container.removeEventListener('keydown', handleKeydown); };
}

/* ============================================================
   Generic modal shell
   ============================================================ */
let modalLastFocused = null;
let modalDetachTrap = null;
let modalOnCloseCallback = null;

function openModal(html, opts) {
  opts = opts || {};
  const root = document.getElementById('modalRoot');
  const panel = document.getElementById('modalPanel');
  modalLastFocused = document.activeElement;
  modalOnCloseCallback = opts.onClose || null;

  panel.innerHTML = html;
  panel.setAttribute('aria-label', opts.ariaLabel || 'Dialog');
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden', 'false');
  document.body.classList.add('overflow-hidden');

  modalDetachTrap = attachFocusTrap(panel);

  const autofocusEl = panel.querySelector('[data-autofocus]') || panel.querySelector('input, select, button, textarea');
  if (autofocusEl) autofocusEl.focus();

  const overlay = document.getElementById('modalOverlay');
  overlay.onclick = () => closeModal();
}

function closeModal() {
  const root = document.getElementById('modalRoot');
  if (root.classList.contains('hidden')) return;
  root.classList.add('hidden');
  root.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('overflow-hidden');
  document.getElementById('modalPanel').innerHTML = '';

  if (modalDetachTrap) { modalDetachTrap(); modalDetachTrap = null; }
  if (modalLastFocused && document.body.contains(modalLastFocused)) modalLastFocused.focus();

  const cb = modalOnCloseCallback;
  modalOnCloseCallback = null;
  if (cb) cb();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const root = document.getElementById('modalRoot');
    if (root && !root.classList.contains('hidden')) closeModal();
  }
});

/* ============================================================
   Form validation helpers
   ============================================================ */
function fieldError(inputEl, message) {
  const wrapper = inputEl.closest('[data-field]');
  if (!wrapper) return;
  inputEl.classList.add('border-error', 'focus:ring-error');
  inputEl.setAttribute('aria-invalid', 'true');
  let err = wrapper.querySelector('.field-error-msg');
  if (!err) {
    err = document.createElement('p');
    err.className = 'field-error-msg text-[11px] text-error mt-1';
    wrapper.appendChild(err);
  }
  err.textContent = message;
  inputEl.setAttribute('aria-describedby', (wrapper.dataset.field || '') + '-error');
  err.id = (wrapper.dataset.field || '') + '-error';
}

function clearFieldError(inputEl) {
  const wrapper = inputEl.closest('[data-field]');
  inputEl.classList.remove('border-error', 'focus:ring-error');
  inputEl.removeAttribute('aria-invalid');
  if (!wrapper) return;
  const err = wrapper.querySelector('.field-error-msg');
  if (err) err.remove();
}

function validateRequired(inputEl, label) {
  const val = (inputEl.value || '').trim();
  if (!val) {
    fieldError(inputEl, (label || 'This field') + ' is required.');
    return false;
  }
  clearFieldError(inputEl);
  return true;
}

function validateEmail(inputEl) {
  const val = (inputEl.value || '').trim();
  if (!val) {
    fieldError(inputEl, 'Email is required.');
    return false;
  }
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(val)) {
    fieldError(inputEl, 'Enter a valid email address.');
    return false;
  }
  clearFieldError(inputEl);
  return true;
}

function validatePositiveNumber(inputEl, label) {
  const val = parseFloat(inputEl.value);
  if (isNaN(val) || val <= 0) {
    fieldError(inputEl, (label || 'This value') + ' must be a number greater than 0.');
    return false;
  }
  clearFieldError(inputEl);
  return true;
}

/* Like validatePositiveNumber, but allows 0 — for fields like stock
   quantity where hitting zero is a legitimate, common state. */
function validateNonNegativeNumber(inputEl, label) {
  const val = parseFloat(inputEl.value);
  if (isNaN(val) || val < 0) {
    fieldError(inputEl, (label || 'This value') + ' must be a number of 0 or more.');
    return false;
  }
  clearFieldError(inputEl);
  return true;
}

/* ============================================================
   Shared field markup helper
   ============================================================ */
function textFieldHtml({ id, label, placeholder, type, required, autofocus }) {
  return `
    <div data-field="${id}" class="mb-4">
      <label for="${id}" class="block text-[12px] font-label-bold text-on-surface-variant mb-1.5">${escapeHtml(label)}${required ? ' <span class="text-error">*</span>' : ''}</label>
      <input id="${id}" name="${id}" type="${type || 'text'}" placeholder="${escapeHtml(placeholder || '')}"
        ${autofocus ? 'data-autofocus' : ''}
        class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] text-on-surface focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all" />
    </div>`;
}

function dropdownFieldHtml({ id, label, required }) {
  return `
    <div data-field="${id}" class="mb-4">
      <label id="${id}-fieldlabel" class="block text-[12px] font-label-bold text-on-surface-variant mb-1.5">${escapeHtml(label)}${required ? ' <span class="text-error">*</span>' : ''}</label>
      <div id="${id}-mount"></div>
    </div>`;
}

/* ============================================================
   New Job modal (Car Wash / Maintenance toggle)
   Integrates with Core Operations: the Service Type / Package
   dropdown is driven by DATA.packages (so a package selection sets
   price automatically), Technician is drawn from the DATA.staff
   roster instead of free text, and a customer can optionally be
   linked (customerId) so it shows up in that customer's Service
   History. Everything stays optional/free-text-friendly since not
   every job has a matching package, staff member, or customer yet.
   ============================================================ */
function openNewJobModal(defaultType) {
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">New Job</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
      </button>
    </div>
    <div class="flex gap-2 mb-6 bg-surface-container-low p-1 rounded-xl" role="group" aria-label="Job type">
      <button type="button" id="jobTypeCarwash" class="job-type-btn flex-1 px-4 py-2 rounded-lg font-label-bold text-[12px] transition-colors">Car Wash</button>
      <button type="button" id="jobTypeMaintenance" class="job-type-btn flex-1 px-4 py-2 rounded-lg font-label-bold text-[12px] transition-colors">Maintenance</button>
    </div>
    <form id="newJobForm" novalidate>
      ${dropdownFieldHtml({ id: 'njCustomerLink', label: 'Link to Customer (optional)' })}
      <div id="newJobFields"></div>
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Create Job</button>
      </div>
    </form>
  `;
  openModal(html, { ariaLabel: 'Create a new job' });

  let currentType = defaultType || 'carwash';
  let statusDropdown = null;
  let serviceDropdown = null;
  let technicianDropdown = null;

  const activeStaffOptions = () => {
    const opts = [{ value: '', label: 'Unassigned' }];
    DATA.staff.filter(s => s.status === 'active').forEach(s => opts.push({ value: s.name, label: s.name + ' — ' + s.role }));
    return opts;
  };

  const customerLinkDropdown = createDropdown({
    options: [{ value: '', label: '— No linked customer —' }, ...DATA.customers.map(c => ({ value: c.id, label: c.name }))],
    value: '', ariaLabel: 'Link to customer',
    buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
    listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
    onChange: (customerId) => {
      const customer = customerId ? findCustomer(customerId) : null;
      if (!customer) return;
      if (currentType === 'carwash') {
        const nameEl = document.getElementById('njCustomerName');
        const vehicleEl = document.getElementById('njVehicle');
        if (nameEl && !nameEl.value.trim()) nameEl.value = customer.name;
        if (vehicleEl && !vehicleEl.value.trim()) vehicleEl.value = customer.vehicle + ' • ' + customer.vehicleColor;
      } else {
        const vehicleEl = document.getElementById('njVehicle');
        if (vehicleEl && !vehicleEl.value.trim()) vehicleEl.value = customer.vehicle + ' • ' + customer.vehicleColor;
      }
    },
  });
  document.getElementById('njCustomerLink-mount').appendChild(customerLinkDropdown.root);

  function renderFields() {
    const fieldsEl = document.getElementById('newJobFields');
    document.getElementById('jobTypeCarwash').className = 'job-type-btn flex-1 px-4 py-2 rounded-lg font-label-bold text-[12px] transition-colors ' +
      (currentType === 'carwash' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-outline hover:bg-surface-container-high');
    document.getElementById('jobTypeMaintenance').className = 'job-type-btn flex-1 px-4 py-2 rounded-lg font-label-bold text-[12px] transition-colors ' +
      (currentType === 'maintenance' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-outline hover:bg-surface-container-high');

    if (currentType === 'carwash') {
      fieldsEl.innerHTML =
        textFieldHtml({ id: 'njCustomerName', label: 'Customer Name', placeholder: 'e.g. Marcus Holloway', required: true, autofocus: true }) +
        textFieldHtml({ id: 'njVehicle', label: 'Vehicle', placeholder: 'e.g. Tesla Model 3 • Midnight Silver', required: true }) +
        dropdownFieldHtml({ id: 'njService', label: 'Service / Package', required: true }) +
        dropdownFieldHtml({ id: 'njTechnician', label: 'Technician' }) +
        textFieldHtml({ id: 'njPrice', label: 'Price ($)', placeholder: 'e.g. 45.00', type: 'number', required: true }) +
        dropdownFieldHtml({ id: 'njStatus', label: 'Status', required: true }) +
        textFieldHtml({ id: 'njStart', label: 'Start Time', placeholder: 'e.g. 09:45 AM' }) +
        textFieldHtml({ id: 'njDate', label: 'Date', type: 'date' });

      const washPackages = DATA.packages.filter(p => p.category === 'wash' && p.active);
      const serviceOptions = washPackages.length
        ? washPackages.map(p => ({ value: p.name, label: p.name + ' — $' + p.price.toFixed(2) }))
        : [{ value: 'Basic Wash', label: 'Basic Wash' }, { value: 'Deluxe Wash', label: 'Deluxe Wash' }, { value: 'Premium Detail', label: 'Premium Detail' }];
      serviceDropdown = createDropdown({
        options: serviceOptions,
        value: serviceOptions[0].value, ariaLabel: 'Service / package',
        buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
        listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
        onChange: (serviceName) => {
          const pkg = washPackages.find(p => p.name === serviceName);
          if (pkg) { const priceEl = document.getElementById('njPrice'); if (priceEl) priceEl.value = pkg.price.toFixed(2); }
        },
      });
      document.getElementById('njService-mount').appendChild(serviceDropdown.root);
      const firstPkg = washPackages.find(p => p.name === serviceOptions[0].value);
      if (firstPkg) document.getElementById('njPrice').value = firstPkg.price.toFixed(2);

      technicianDropdown = createDropdown({
        options: activeStaffOptions(), value: '', ariaLabel: 'Technician',
        buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
        listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
      });
      document.getElementById('njTechnician-mount').appendChild(technicianDropdown.root);

      statusDropdown = createDropdown({
        options: [
          { value: 'in-progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
          { value: 'on-hold', label: 'On Hold' },
        ],
        value: 'in-progress', ariaLabel: 'Job status',
        buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
        listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
      });
      document.getElementById('njStatus-mount').appendChild(statusDropdown.root);
    } else {
      fieldsEl.innerHTML =
        dropdownFieldHtml({ id: 'njPackage', label: 'Package (optional)' }) +
        textFieldHtml({ id: 'njTitle', label: 'Job Title', placeholder: 'e.g. Full Synthetic Oil Change', required: true, autofocus: true }) +
        textFieldHtml({ id: 'njVehicle', label: 'Vehicle', placeholder: 'e.g. Audi RS6 • Nardo Gray • AUD-552', required: true }) +
        dropdownFieldHtml({ id: 'njTechnician', label: 'Technician' }) +
        textFieldHtml({ id: 'njPrice', label: 'Price ($)', placeholder: 'e.g. 65.00', type: 'number', required: true }) +
        dropdownFieldHtml({ id: 'njStatus', label: 'Status', required: true }) +
        textFieldHtml({ id: 'njStart', label: 'Start Time', placeholder: 'e.g. 09:15 AM' }) +
        textFieldHtml({ id: 'njDate', label: 'Date', type: 'date' }) +
        textFieldHtml({ id: 'njNote', label: 'Note / ETA', placeholder: 'e.g. ETA: 30 MINS' });

      const maintPackages = DATA.packages.filter(p => p.category === 'maintenance' && p.active);
      const packageDropdown = createDropdown({
        options: [{ value: '', label: '— Custom (set title below) —' }, ...maintPackages.map(p => ({ value: p.name, label: p.name + ' — $' + p.price.toFixed(2) }))],
        value: '', ariaLabel: 'Package',
        buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
        listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
        onChange: (name) => {
          if (!name) return;
          document.getElementById('njTitle').value = name;
          const pkg = maintPackages.find(p => p.name === name);
          if (pkg) { const priceEl = document.getElementById('njPrice'); if (priceEl) priceEl.value = pkg.price.toFixed(2); }
        },
      });
      document.getElementById('njPackage-mount').appendChild(packageDropdown.root);

      technicianDropdown = createDropdown({
        options: activeStaffOptions().filter(o => o.value !== '' || true), value: '', ariaLabel: 'Technician',
        buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
        listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
      });
      document.getElementById('njTechnician-mount').appendChild(technicianDropdown.root);

      statusDropdown = createDropdown({
        options: [
          { value: 'in-progress', label: 'In Progress' },
          { value: 'waitlist', label: 'Waitlist' },
          { value: 'quality-control', label: 'Quality Control' },
          { value: 'completed', label: 'Completed' },
        ],
        value: 'in-progress', ariaLabel: 'Job status',
        buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
        listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
      });
      document.getElementById('njStatus-mount').appendChild(statusDropdown.root);
    }
    const dateEl = document.getElementById('njDate');
    if (dateEl) dateEl.value = todayISO();
  }

  renderFields();
  document.getElementById('jobTypeCarwash').addEventListener('click', () => { currentType = 'carwash'; renderFields(); });
  document.getElementById('jobTypeMaintenance').addEventListener('click', () => { currentType = 'maintenance'; renderFields(); });

  document.getElementById('newJobForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const customerId = customerLinkDropdown.getValue() || null;
    if (currentType === 'carwash') {
      const nameEl = document.getElementById('njCustomerName');
      const vehicleEl = document.getElementById('njVehicle');
      const priceEl = document.getElementById('njPrice');
      const okName = validateRequired(nameEl, 'Customer name');
      const okVehicle = validateRequired(vehicleEl, 'Vehicle');
      const okPrice = validatePositiveNumber(priceEl, 'Price');
      if (!okName || !okVehicle || !okPrice) return;

      const job = createCarwashJob({
        customer: nameEl.value.trim(),
        customerId,
        vehicle: vehicleEl.value.trim(),
        service: serviceDropdown.getValue(),
        technician: technicianDropdown.getValue(),
        price: priceEl.value,
        status: statusDropdown.getValue(),
        start: document.getElementById('njStart').value.trim() || '--:--',
        date: document.getElementById('njDate').value || todayISO(),
      });
      closeModal();
      toast('New car wash job created for ' + job.customer + '.');
      navigate('carwash');
    } else {
      const titleEl = document.getElementById('njTitle');
      const vehicleEl = document.getElementById('njVehicle');
      const priceEl = document.getElementById('njPrice');
      const okTitle = validateRequired(titleEl, 'Job title');
      const okVehicle = validateRequired(vehicleEl, 'Vehicle');
      const okPrice = validatePositiveNumber(priceEl, 'Price');
      if (!okTitle || !okVehicle || !okPrice) return;

      const job = createMaintenanceJob({
        title: titleEl.value.trim(),
        customerId,
        vehicle: vehicleEl.value.trim(),
        technician: technicianDropdown.getValue() || 'Unassigned',
        status: statusDropdown.getValue(),
        start: document.getElementById('njStart').value.trim() || '--:--',
        date: document.getElementById('njDate').value || todayISO(),
        note: document.getElementById('njNote').value.trim(),
        price: priceEl.value,
      });
      closeModal();
      toast('New maintenance job created: ' + job.title + '.');
      navigate('maintenance');
    }
  });
}

/* ============================================================
   Register New Customer modal
   ============================================================ */
function openNewCustomerModal() {
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Register New Customer</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
      </button>
    </div>
    <form id="newCustomerForm" novalidate>
      ${textFieldHtml({ id: 'custName', label: 'Full Name', placeholder: 'e.g. Priya Nandakumar', required: true, autofocus: true })}
      ${textFieldHtml({ id: 'custEmail', label: 'Email', placeholder: 'e.g. priya@example.com', type: 'email', required: true })}
      ${textFieldHtml({ id: 'custPhone', label: 'Phone', placeholder: 'e.g. +1 (555) 123-4567', required: true })}
      ${textFieldHtml({ id: 'custVehicle', label: 'Vehicle', placeholder: 'e.g. 2023 Range Rover Velar', required: true })}
      ${textFieldHtml({ id: 'custVehicleColor', label: 'Vehicle Color', placeholder: 'e.g. Santorini Black' })}
      ${dropdownFieldHtml({ id: 'custStatus', label: 'Status' })}
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Register Customer</button>
      </div>
    </form>
  `;
  openModal(html, { ariaLabel: 'Register a new customer' });

  const statusDropdown = createDropdown({
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'active', label: 'Active' },
      { value: 'vip', label: 'VIP' },
      { value: 'inactive', label: 'Inactive' },
    ],
    value: 'pending', ariaLabel: 'Customer status',
    buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
    listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
  });
  document.getElementById('custStatus-mount').appendChild(statusDropdown.root);

  document.getElementById('newCustomerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('custName');
    const emailEl = document.getElementById('custEmail');
    const phoneEl = document.getElementById('custPhone');
    const vehicleEl = document.getElementById('custVehicle');

    const okName = validateRequired(nameEl, 'Full name');
    const okEmail = validateEmail(emailEl);
    const okPhone = validateRequired(phoneEl, 'Phone');
    const okVehicle = validateRequired(vehicleEl, 'Vehicle');
    if (!okName || !okEmail || !okPhone || !okVehicle) return;

    const customer = createCustomer({
      name: nameEl.value.trim(),
      email: emailEl.value.trim(),
      phone: phoneEl.value.trim(),
      vehicle: vehicleEl.value.trim(),
      vehicleColor: document.getElementById('custVehicleColor').value.trim(),
      status: statusDropdown.getValue(),
    });
    closeModal();
    toast(customer.name + ' has been registered.');
    navigate('customers', { keepFilters: false });
  });
}

/* ============================================================
   Add Expense modal
   ============================================================ */
function openAddExpenseModal() {
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Add Expense</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all">
        <span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
      </button>
    </div>
    <form id="newExpenseForm" novalidate>
      ${textFieldHtml({ id: 'expDescription', label: 'Description', placeholder: 'e.g. Microfiber towel restock', required: true, autofocus: true })}
      ${textFieldHtml({ id: 'expAmount', label: 'Amount ($)', placeholder: 'e.g. 85.00', type: 'number', required: true })}
      ${dropdownFieldHtml({ id: 'expCategory', label: 'Category' })}
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Add Expense</button>
      </div>
    </form>
  `;
  openModal(html, { ariaLabel: 'Add an expense' });

  const categoryDropdown = createDropdown({
    options: [
      { value: 'Supplies', label: 'Supplies' },
      { value: 'Labor', label: 'Labor' },
      { value: 'Equipment', label: 'Equipment' },
      { value: 'Marketing', label: 'Marketing' },
      { value: 'Other', label: 'Other' },
    ],
    value: 'Supplies', ariaLabel: 'Expense category',
    buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
    listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
  });
  document.getElementById('expCategory-mount').appendChild(categoryDropdown.root);

  document.getElementById('newExpenseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const descEl = document.getElementById('expDescription');
    const amountEl = document.getElementById('expAmount');
    const okDesc = validateRequired(descEl, 'Description');
    const okAmount = validatePositiveNumber(amountEl, 'Amount');
    if (!okDesc || !okAmount) return;

    const expense = createExpense({
      description: descEl.value.trim(),
      category: categoryDropdown.getValue(),
      amount: amountEl.value,
    });
    closeModal();
    toast('Expense of $' + expense.amount.toFixed(2) + ' added.');
    updateDashboardFinancials();
  });
}

/* ============================================================
   Generic confirmation modal (destructive actions)
   ============================================================ */
function confirmAction({ title, message, confirmLabel, cancelLabel, danger, onConfirm }) {
  const html = `
    <div class="text-center">
      <div class="w-14 h-14 mx-auto rounded-2xl ${danger ? 'bg-error-container text-error' : 'bg-primary-container/20 text-primary'} flex items-center justify-center mb-4">
        <span class="material-symbols-outlined text-[28px]" aria-hidden="true">${danger ? 'warning' : 'help'}</span>
      </div>
      <h3 class="font-headline-sm text-headline-sm text-on-surface mb-2">${escapeHtml(title)}</h3>
      <p class="text-[13px] text-on-surface-variant mb-6">${escapeHtml(message)}</p>
      <div class="flex gap-3">
        <button type="button" id="confirmCancelBtn" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">${escapeHtml(cancelLabel || 'Cancel')}</button>
        <button type="button" id="confirmOkBtn" data-autofocus class="flex-1 font-label-bold text-[12px] py-3 rounded-2xl transition-all shadow-sm ${danger ? 'bg-error text-white hover:opacity-90' : 'bg-primary text-on-primary hover:opacity-90'}">${escapeHtml(confirmLabel || 'Confirm')}</button>
      </div>
    </div>
  `;
  openModal(html, { ariaLabel: title });
  document.getElementById('confirmCancelBtn').addEventListener('click', () => closeModal());
  document.getElementById('confirmOkBtn').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}
