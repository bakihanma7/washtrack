/* ==========================================================
   WashTrack Pro — Core Operations features
   Inventory, Service Packages, Calendar (week/month), Job Board
   (Kanban dispatch), Staff directory + Time Clock, Equipment
   maintenance tracking, and per-customer Vehicle Service History.
   ========================================================== */

/* ============================================================
   Shared small helpers
   ============================================================ */
function formatMoney(n) { return '$' + Number(n || 0).toFixed(2); }
function formatDateLabel(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ============================================================
   Inventory (Core Operations #1)
   ============================================================ */
function renderInventory() {
  const body = document.getElementById('inventoryTableBody');
  if (!body) return;
  if (DATA.inventory.length === 0) {
    body.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-on-surface-variant text-[13px]">No inventory items yet.</td></tr>`;
    return;
  }
  body.innerHTML = DATA.inventory.map(item => {
    const low = item.quantity <= item.reorderThreshold;
    const critical = item.quantity <= item.reorderThreshold / 2;
    const stockClass = critical ? 'text-error' : (low ? 'text-warning' : 'text-on-surface');
    return `
    <tr class="hover:bg-surface-container-low/50 transition-colors">
      <td class="px-6 py-4">
        <p class="font-label-bold text-on-surface text-[13px]">${escapeHtml(item.name)}</p>
        <p class="text-[11px] text-on-surface-variant">${escapeHtml(item.category)} • ${escapeHtml(item.sku || '—')}</p>
      </td>
      <td class="px-6 py-4">
        <p class="text-[13px] text-on-surface">${escapeHtml(item.supplierName || '—')}</p>
        <p class="text-[11px] text-on-surface-variant">${escapeHtml(item.supplierContact || '')}</p>
      </td>
      <td class="px-6 py-4">
        <p class="font-bold text-[13px] ${stockClass}">${item.quantity} ${escapeHtml(item.unit)}</p>
        <p class="text-[11px] text-on-surface-variant">Reorder at ${item.reorderThreshold}${low ? ' <span class="text-error font-bold">• Low stock</span>' : ''}</p>
      </td>
      <td class="px-6 py-4 text-[13px] text-on-surface">${formatMoney(item.unitCost)}</td>
      <td class="px-6 py-4 text-[13px] text-on-surface-variant">${formatDateLabel(item.lastRestocked)}</td>
      <td class="px-6 py-4 text-right">
        <div class="flex items-center justify-end gap-1">
          <button type="button" data-inv-restock="${item.id}" title="Restock" aria-label="Restock ${escapeHtml(item.name)}" class="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
            <span class="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">add_box</span>
          </button>
          <button type="button" data-inv-edit="${item.id}" title="Edit" aria-label="Edit ${escapeHtml(item.name)}" class="p-2 hover:bg-surface-container-high rounded-lg transition-colors">
            <span class="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden="true">edit</span>
          </button>
          <button type="button" data-inv-delete="${item.id}" title="Delete" aria-label="Delete ${escapeHtml(item.name)}" class="p-2 hover:bg-error-container/20 rounded-lg transition-colors">
            <span class="material-symbols-outlined text-[18px] text-error" aria-hidden="true">delete</span>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  body.querySelectorAll('[data-inv-restock]').forEach(btn => btn.addEventListener('click', () => openRestockModal(btn.dataset.invRestock)));
  body.querySelectorAll('[data-inv-edit]').forEach(btn => btn.addEventListener('click', () => openEditInventoryModal(btn.dataset.invEdit)));
  body.querySelectorAll('[data-inv-delete]').forEach(btn => btn.addEventListener('click', () => confirmDeleteInventoryItem(btn.dataset.invDelete)));
}

const INVENTORY_CATEGORIES = ['Chemicals', 'Supplies', 'Maintenance Parts', 'Equipment Parts', 'Other'];

function inventoryFormFieldsHtml() {
  return (
    textFieldHtml({ id: 'invName', label: 'Item Name', placeholder: 'e.g. Premium Car Shampoo (5 gal)', required: true, autofocus: true }) +
    dropdownFieldHtml({ id: 'invCategory', label: 'Category', required: true }) +
    textFieldHtml({ id: 'invSku', label: 'SKU', placeholder: 'e.g. CHM-1001' }) +
    textFieldHtml({ id: 'invSupplierName', label: 'Supplier', placeholder: 'e.g. CleanPro Supply Co.' }) +
    textFieldHtml({ id: 'invSupplierContact', label: 'Supplier Contact', placeholder: 'e.g. orders@supplier.com' }) +
    textFieldHtml({ id: 'invQuantity', label: 'Quantity', type: 'number', placeholder: 'e.g. 10', required: true }) +
    textFieldHtml({ id: 'invUnit', label: 'Unit', placeholder: 'e.g. jugs, packs, cases', required: true }) +
    textFieldHtml({ id: 'invThreshold', label: 'Reorder Threshold', type: 'number', placeholder: 'e.g. 5', required: true }) +
    textFieldHtml({ id: 'invUnitCost', label: 'Unit Cost ($)', type: 'number', placeholder: 'e.g. 42.50', required: true })
  );
}

function mountInventoryCategoryDropdown(initial) {
  const dd = createDropdown({
    options: INVENTORY_CATEGORIES.map(c => ({ value: c, label: c })),
    value: initial || INVENTORY_CATEGORIES[0], ariaLabel: 'Category',
    buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
    listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
  });
  document.getElementById('invCategory-mount').appendChild(dd.root);
  return dd;
}

function openNewInventoryModal() {
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Add Inventory Item</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span></button>
    </div>
    <form id="inventoryForm" novalidate>
      ${inventoryFormFieldsHtml()}
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Add Item</button>
      </div>
    </form>`;
  openModal(html, { ariaLabel: 'Add inventory item' });
  const categoryDropdown = mountInventoryCategoryDropdown();

  document.getElementById('inventoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('invName');
    const qtyEl = document.getElementById('invQuantity');
    const unitEl = document.getElementById('invUnit');
    const threshEl = document.getElementById('invThreshold');
    const costEl = document.getElementById('invUnitCost');
    const okName = validateRequired(nameEl, 'Item name');
    const okQty = validateNonNegativeNumber(qtyEl, 'Quantity');
    const okUnit = validateRequired(unitEl, 'Unit');
    const okThresh = validatePositiveNumber(threshEl, 'Reorder threshold');
    const okCost = validatePositiveNumber(costEl, 'Unit cost');
    if (!okName || !okQty || !okUnit || !okThresh || !okCost) return;

    createInventoryItem({
      name: nameEl.value.trim(), category: categoryDropdown.getValue(),
      sku: document.getElementById('invSku').value.trim(),
      supplierName: document.getElementById('invSupplierName').value.trim(),
      supplierContact: document.getElementById('invSupplierContact').value.trim(),
      quantity: qtyEl.value, unit: unitEl.value.trim(),
      reorderThreshold: threshEl.value, unitCost: costEl.value,
    });
    closeModal();
    toast('Inventory item added.');
    renderInventory();
  });
}

function openEditInventoryModal(id) {
  const item = findInventoryItem(id);
  if (!item) return;
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Edit Inventory Item</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span></button>
    </div>
    <form id="inventoryForm" novalidate>
      ${inventoryFormFieldsHtml()}
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Save Changes</button>
      </div>
    </form>`;
  openModal(html, { ariaLabel: 'Edit inventory item' });
  const categoryDropdown = mountInventoryCategoryDropdown(item.category);
  document.getElementById('invName').value = item.name;
  document.getElementById('invSku').value = item.sku || '';
  document.getElementById('invSupplierName').value = item.supplierName || '';
  document.getElementById('invSupplierContact').value = item.supplierContact || '';
  document.getElementById('invQuantity').value = item.quantity;
  document.getElementById('invUnit').value = item.unit;
  document.getElementById('invThreshold').value = item.reorderThreshold;
  document.getElementById('invUnitCost').value = item.unitCost;

  document.getElementById('inventoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('invName');
    const qtyEl = document.getElementById('invQuantity');
    const unitEl = document.getElementById('invUnit');
    const threshEl = document.getElementById('invThreshold');
    const costEl = document.getElementById('invUnitCost');
    const okName = validateRequired(nameEl, 'Item name');
    const okQty = validateNonNegativeNumber(qtyEl, 'Quantity');
    const okUnit = validateRequired(unitEl, 'Unit');
    const okThresh = validatePositiveNumber(threshEl, 'Reorder threshold');
    const okCost = validatePositiveNumber(costEl, 'Unit cost');
    if (!okName || !okQty || !okUnit || !okThresh || !okCost) return;

    updateInventoryItem(id, {
      name: nameEl.value.trim(), category: categoryDropdown.getValue(),
      sku: document.getElementById('invSku').value.trim(),
      supplierName: document.getElementById('invSupplierName').value.trim(),
      supplierContact: document.getElementById('invSupplierContact').value.trim(),
      quantity: Number(qtyEl.value), unit: unitEl.value.trim(),
      reorderThreshold: Number(threshEl.value), unitCost: Number(costEl.value),
    });
    closeModal();
    toast('Inventory item updated.');
    renderInventory();
  });
}

function openRestockModal(id) {
  const item = findInventoryItem(id);
  if (!item) return;
  const suggested = Math.max(item.reorderThreshold * 2 - item.quantity, 1);
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Restock “${escapeHtml(item.name)}”</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span></button>
    </div>
    <p class="text-[12px] text-on-surface-variant mb-4">Currently ${item.quantity} ${escapeHtml(item.unit)} in stock.</p>
    <form id="restockForm" novalidate>
      ${textFieldHtml({ id: 'restockQty', label: 'Add Quantity', type: 'number', placeholder: 'e.g. ' + suggested, required: true, autofocus: true })}
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Restock</button>
      </div>
    </form>`;
  openModal(html, { ariaLabel: 'Restock inventory item' });
  document.getElementById('restockQty').value = suggested;
  document.getElementById('restockForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const qtyEl = document.getElementById('restockQty');
    if (!validatePositiveNumber(qtyEl, 'Quantity')) return;
    restockInventoryItem(id, qtyEl.value);
    closeModal();
    toast('Restocked ' + item.name + '.');
    renderInventory();
  });
}

function confirmDeleteInventoryItem(id) {
  const item = findInventoryItem(id);
  if (!item) return;
  confirmAction({
    title: 'Delete Inventory Item',
    message: 'Remove "' + item.name + '" from inventory? This can\u2019t be undone.',
    confirmLabel: 'Delete', danger: true,
    onConfirm: () => { deleteInventoryItem(id); toast('Inventory item deleted.'); renderInventory(); },
  });
}

/* ============================================================
   Service Packages (Core Operations #2)
   ============================================================ */
function renderPackages() {
  const grid = document.getElementById('packagesGrid');
  if (!grid) return;
  if (DATA.packages.length === 0) {
    grid.innerHTML = `<p class="text-on-surface-variant text-[13px] col-span-full text-center py-10">No service packages yet.</p>`;
    return;
  }
  grid.innerHTML = DATA.packages.map(pkg => `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 card-shadow flex flex-col ${pkg.active ? '' : 'opacity-60'}">
      <div class="flex items-start justify-between gap-2 mb-2">
        <span class="text-[10px] font-bold uppercase px-2 py-1 rounded-full ${pkg.category === 'wash' ? 'bg-secondary-container/10 text-secondary' : 'bg-primary-container/20 text-on-primary-container'}">${pkg.category === 'wash' ? 'Car Wash' : 'Maintenance'}</span>
        <span class="text-[10px] font-bold uppercase px-2 py-1 rounded-full ${pkg.active ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}">${pkg.active ? 'Active' : 'Inactive'}</span>
      </div>
      <h3 class="font-headline-sm text-headline-sm text-on-surface mb-1">${escapeHtml(pkg.name)}</h3>
      <p class="font-stat-value text-[22px] text-primary mb-2">${formatMoney(pkg.price)}</p>
      <p class="text-[12px] text-on-surface-variant mb-3">${escapeHtml(pkg.description)}</p>
      <ul class="text-[12px] text-on-surface-variant space-y-1 mb-4 flex-1">
        ${pkg.includes.map(inc => `<li class="flex items-start gap-1.5"><span class="material-symbols-outlined text-[14px] text-primary mt-0.5" aria-hidden="true">check</span>${escapeHtml(inc)}</li>`).join('')}
      </ul>
      <div class="flex gap-2 pt-2 border-t border-outline-variant">
        <button type="button" data-pkg-toggle="${pkg.id}" class="flex-1 py-2 rounded-xl border border-outline-variant text-on-surface font-label-bold text-[11px] hover:bg-surface-container-low transition-colors">${pkg.active ? 'Deactivate' : 'Activate'}</button>
        <button type="button" data-pkg-edit="${pkg.id}" class="p-2 rounded-xl border border-outline-variant hover:bg-surface-container-low transition-colors" aria-label="Edit ${escapeHtml(pkg.name)}"><span class="material-symbols-outlined text-[16px] text-on-surface-variant" aria-hidden="true">edit</span></button>
        <button type="button" data-pkg-delete="${pkg.id}" class="p-2 rounded-xl border border-outline-variant hover:bg-error-container/20 transition-colors" aria-label="Delete ${escapeHtml(pkg.name)}"><span class="material-symbols-outlined text-[16px] text-error" aria-hidden="true">delete</span></button>
      </div>
    </div>`).join('');

  grid.querySelectorAll('[data-pkg-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const pkg = findPackage(btn.dataset.pkgToggle);
    if (!pkg) return;
    updatePackage(pkg.id, { active: !pkg.active });
    toast(pkg.name + (pkg.active ? ' deactivated.' : ' activated.'));
    renderPackages();
  }));
  grid.querySelectorAll('[data-pkg-edit]').forEach(btn => btn.addEventListener('click', () => openEditPackageModal(btn.dataset.pkgEdit)));
  grid.querySelectorAll('[data-pkg-delete]').forEach(btn => btn.addEventListener('click', () => confirmDeletePackage(btn.dataset.pkgDelete)));
}

function packageFormFieldsHtml() {
  return (
    textFieldHtml({ id: 'pkgName', label: 'Package Name', placeholder: 'e.g. Deluxe Wash', required: true, autofocus: true }) +
    dropdownFieldHtml({ id: 'pkgCategory', label: 'Category', required: true }) +
    textFieldHtml({ id: 'pkgPrice', label: 'Price ($)', type: 'number', placeholder: 'e.g. 45.00', required: true }) +
    `<div data-field="pkgDescription" class="mb-4">
      <label for="pkgDescription" class="block text-[12px] font-label-bold text-on-surface-variant mb-1.5">Description</label>
      <textarea id="pkgDescription" rows="2" class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] text-on-surface focus:ring-2 focus:ring-primary-container outline-none resize-none"></textarea>
    </div>` +
    `<div data-field="pkgIncludes" class="mb-4">
      <label for="pkgIncludes" class="block text-[12px] font-label-bold text-on-surface-variant mb-1.5">Includes (one per line)</label>
      <textarea id="pkgIncludes" rows="3" placeholder="Exterior rinse&#10;Foam wash&#10;Hand dry" class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] text-on-surface focus:ring-2 focus:ring-primary-container outline-none resize-none"></textarea>
    </div>`
  );
}

function mountPackageCategoryDropdown(initial) {
  const dd = createDropdown({
    options: [{ value: 'wash', label: 'Car Wash' }, { value: 'maintenance', label: 'Maintenance' }],
    value: initial || 'wash', ariaLabel: 'Category',
    buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
    listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
  });
  document.getElementById('pkgCategory-mount').appendChild(dd.root);
  return dd;
}

function openNewPackageModal() {
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Add Service Package</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span></button>
    </div>
    <form id="packageForm" novalidate>
      ${packageFormFieldsHtml()}
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Add Package</button>
      </div>
    </form>`;
  openModal(html, { ariaLabel: 'Add service package' });
  const categoryDropdown = mountPackageCategoryDropdown();
  document.getElementById('packageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('pkgName');
    const priceEl = document.getElementById('pkgPrice');
    const okName = validateRequired(nameEl, 'Package name');
    const okPrice = validatePositiveNumber(priceEl, 'Price');
    if (!okName || !okPrice) return;
    createPackage({
      name: nameEl.value.trim(), category: categoryDropdown.getValue(), price: priceEl.value,
      description: document.getElementById('pkgDescription').value.trim(),
      includes: document.getElementById('pkgIncludes').value,
      active: true,
    });
    closeModal();
    toast('Service package added.');
    renderPackages();
  });
}

function openEditPackageModal(id) {
  const pkg = findPackage(id);
  if (!pkg) return;
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Edit Service Package</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span></button>
    </div>
    <form id="packageForm" novalidate>
      ${packageFormFieldsHtml()}
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Save Changes</button>
      </div>
    </form>`;
  openModal(html, { ariaLabel: 'Edit service package' });
  const categoryDropdown = mountPackageCategoryDropdown(pkg.category);
  document.getElementById('pkgName').value = pkg.name;
  document.getElementById('pkgPrice').value = pkg.price;
  document.getElementById('pkgDescription').value = pkg.description;
  document.getElementById('pkgIncludes').value = pkg.includes.join('\n');

  document.getElementById('packageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('pkgName');
    const priceEl = document.getElementById('pkgPrice');
    const okName = validateRequired(nameEl, 'Package name');
    const okPrice = validatePositiveNumber(priceEl, 'Price');
    if (!okName || !okPrice) return;
    updatePackage(id, {
      name: nameEl.value.trim(), category: categoryDropdown.getValue(), price: Number(priceEl.value),
      description: document.getElementById('pkgDescription').value.trim(),
      includes: document.getElementById('pkgIncludes').value.split('\n').map(s => s.trim()).filter(Boolean),
    });
    closeModal();
    toast('Service package updated.');
    renderPackages();
  });
}

function confirmDeletePackage(id) {
  const pkg = findPackage(id);
  if (!pkg) return;
  confirmAction({
    title: 'Delete Service Package',
    message: 'Delete "' + pkg.name + '"? Jobs already created with this service won\u2019t be affected.',
    confirmLabel: 'Delete', danger: true,
    onConfirm: () => { deletePackage(id); toast('Service package deleted.'); renderPackages(); },
  });
}

/* ============================================================
   Calendar — week & month booking view (Core Operations #3)
   ============================================================ */
let calendarState = { view: 'week', anchor: todayISO(), selected: todayISO() };

function dateFromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function isoFromDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDaysISO(iso, n) {
  const d = dateFromISO(iso);
  d.setDate(d.getDate() + n);
  return isoFromDate(d);
}
function mondayOfWeek(iso) {
  const d = dateFromISO(iso);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return isoFromDate(d);
}

function setCalendarView(view) {
  calendarState.view = view;
  renderCalendar();
}
function calendarStep(delta) {
  if (calendarState.view === 'week') {
    calendarState.anchor = addDaysISO(calendarState.anchor, 7 * delta);
  } else {
    const d = dateFromISO(calendarState.anchor);
    d.setMonth(d.getMonth() + delta);
    calendarState.anchor = isoFromDate(d);
  }
  renderCalendar();
}
function calendarToday() {
  calendarState.anchor = todayISO();
  calendarState.selected = todayISO();
  renderCalendar();
}

function calendarJobChipHtml(kind, job) {
  const label = kind === 'carwash' ? job.service : job.title;
  const dotClass = kind === 'carwash' ? 'bg-secondary' : 'bg-primary';
  return `<button type="button" data-cal-kind="${kind}" data-cal-id="${job.id}" class="w-full text-left flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-surface-container-high transition-colors">
    <span class="w-1.5 h-1.5 rounded-full ${dotClass} shrink-0" aria-hidden="true"></span>
    <span class="text-[10px] text-on-surface truncate">${escapeHtml(label)}</span>
  </button>`;
}

function renderCalendarDayDetail(dateISO) {
  const container = document.getElementById('calendarDayDetail');
  if (!container) return;
  calendarState.selected = dateISO;
  const items = jobsForDate(dateISO).sort((a, b) => (a.job.start || '').localeCompare(b.job.start || ''));
  const heading = dateFromISO(dateISO).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  if (items.length === 0) {
    container.innerHTML = `<h3 class="font-headline-sm text-headline-sm text-on-surface mb-2">${heading}</h3><p class="text-on-surface-variant text-[13px]">No jobs scheduled.</p>`;
    return;
  }
  container.innerHTML = `<h3 class="font-headline-sm text-headline-sm text-on-surface mb-4">${heading}</h3>` +
    `<div class="space-y-2">` +
    items.map(({ kind, job }) => `
      <button type="button" data-cal-kind="${kind}" data-cal-id="${job.id}" class="w-full flex items-center justify-between gap-3 p-3 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors text-left">
        <div class="flex items-center gap-3 min-w-0">
          <span class="w-2 h-2 rounded-full shrink-0 ${kind === 'carwash' ? 'bg-secondary' : 'bg-primary'}" aria-hidden="true"></span>
          <div class="min-w-0">
            <p class="text-[13px] font-label-bold text-on-surface truncate">${escapeHtml(kind === 'carwash' ? job.service : job.title)}</p>
            <p class="text-[11px] text-on-surface-variant truncate">${escapeHtml(job.vehicle)} • ${escapeHtml(job.technician)}</p>
          </div>
        </div>
        <span class="text-[11px] text-on-surface-variant shrink-0">${escapeHtml(job.start || '--:--')}</span>
      </button>`).join('') +
    `</div>`;
  container.querySelectorAll('[data-cal-kind]').forEach(btn => btn.addEventListener('click', () => openJobDetail(btn.dataset.calKind, btn.dataset.calId)));
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const rangeLabel = document.getElementById('calendarRangeLabel');
  const weekBtn = document.getElementById('calendarViewWeekBtn');
  const monthBtn = document.getElementById('calendarViewMonthBtn');
  if (!grid) return;

  const activeCls = 'px-4 py-2 rounded-lg font-label-bold text-[12px] transition-colors bg-surface-container-lowest shadow-sm text-primary';
  const inactiveCls = 'px-4 py-2 rounded-lg font-label-bold text-[12px] transition-colors text-outline hover:bg-surface-container-high';
  if (weekBtn) weekBtn.className = calendarState.view === 'week' ? activeCls : inactiveCls;
  if (monthBtn) monthBtn.className = calendarState.view === 'month' ? activeCls : inactiveCls;

  let days = [];
  if (calendarState.view === 'week') {
    const monday = mondayOfWeek(calendarState.anchor);
    for (let i = 0; i < 7; i++) days.push(addDaysISO(monday, i));
    if (rangeLabel) {
      rangeLabel.textContent = dateFromISO(days[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' – ' + dateFromISO(days[6]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } else {
    const first = dateFromISO(calendarState.anchor);
    first.setDate(1);
    const gridStart = dateFromISO(mondayOfWeek(isoFromDate(first)));
    const lastOfMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const gridEnd = dateFromISO(mondayOfWeek(isoFromDate(lastOfMonth)));
    gridEnd.setDate(gridEnd.getDate() + 6);
    for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) days.push(isoFromDate(d));
    if (rangeLabel) rangeLabel.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const todayIso = todayISO();
  const currentMonth = dateFromISO(calendarState.anchor).getMonth();
  const chipLimit = calendarState.view === 'week' ? 6 : 3;

  grid.innerHTML = days.map(dateISO => {
    const items = jobsForDate(dateISO);
    const isToday = dateISO === todayIso;
    const inMonth = calendarState.view === 'week' || dateFromISO(dateISO).getMonth() === currentMonth;
    const dayNum = dateFromISO(dateISO).getDate();
    const shown = items.slice(0, chipLimit);
    const overflow = items.length - shown.length;
    return `
      <div data-cal-day="${dateISO}" class="bg-surface-container-lowest border ${isToday ? 'border-primary' : 'border-outline-variant'} rounded-2xl p-2 min-h-[110px] cursor-pointer hover:border-primary/40 transition-colors ${inMonth ? '' : 'opacity-40'}">
        <div class="flex items-center justify-between mb-1 px-1">
          ${calendarState.view === 'month' ? '' : `<span class="text-[10px] font-bold uppercase text-on-surface-variant">${dateFromISO(dateISO).toLocaleDateString('en-US', { weekday: 'short' })}</span>`}
          <span class="text-[12px] font-bold ${isToday ? 'text-primary' : 'text-on-surface'} ml-auto">${dayNum}</span>
        </div>
        <div class="space-y-0.5">
          ${shown.map(({ kind, job }) => calendarJobChipHtml(kind, job)).join('')}
          ${overflow > 0 ? `<p class="text-[10px] text-on-surface-variant px-1.5">+${overflow} more</p>` : ''}
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-cal-day]').forEach(cell => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('[data-cal-kind]')) return; // chip click handled separately below
      renderCalendarDayDetail(cell.dataset.calDay);
    });
  });
  grid.querySelectorAll('[data-cal-kind]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openJobDetail(btn.dataset.calKind, btn.dataset.calId);
  }));

  renderCalendarDayDetail(calendarState.selected && days.includes(calendarState.selected) ? calendarState.selected : (days.includes(todayIso) ? todayIso : days[0]));
}

/* ============================================================
   Job Board — Kanban dispatch board (Core Operations #4)
   ============================================================ */
function jobBoardCardHtml(kind, job) {
  const title = kind === 'carwash' ? job.service : job.title;
  return `
    <div class="kanban-card bg-surface-container-lowest border border-outline-variant rounded-2xl p-3 card-shadow cursor-grab active:cursor-grabbing" draggable="true" data-kanban-kind="${kind}" data-kanban-id="${job.id}">
      <div class="flex items-center justify-between gap-2 mb-1">
        <p class="text-[12px] font-label-bold text-on-surface truncate">${escapeHtml(title)}</p>
        <span class="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0 ${kind === 'carwash' ? 'bg-secondary-container/10 text-secondary' : 'bg-primary-container/20 text-on-primary-container'}">${kind === 'carwash' ? 'Wash' : 'Maint.'}</span>
      </div>
      <p class="text-[11px] text-on-surface-variant truncate mb-1.5">${escapeHtml(job.vehicle)}</p>
      <div class="flex items-center justify-between text-[10px] text-on-surface-variant">
        <span class="truncate">${escapeHtml(job.technician || 'Unassigned')}</span>
        <button type="button" data-kanban-view="${kind}:${job.id}" class="text-primary hover:underline shrink-0 ml-2">View</button>
      </div>
    </div>`;
}

function renderJobBoard() {
  const colUnassigned = document.getElementById('kanbanColUnassigned');
  const colInProgress = document.getElementById('kanbanColInProgress');
  const colDone = document.getElementById('kanbanColDone');
  if (!colUnassigned) return;

  const today = todayISO();
  const items = jobsForDate(today);
  const buckets = { unassigned: [], 'in-progress': [], done: [] };
  items.forEach(({ kind, job }) => buckets[jobBoardColumn(kind, job)].push({ kind, job }));

  const emptyMsg = '<p class="text-[11px] text-on-surface-variant text-center py-6">No jobs</p>';
  colUnassigned.innerHTML = buckets.unassigned.length ? buckets.unassigned.map(({ kind, job }) => jobBoardCardHtml(kind, job)).join('') : emptyMsg;
  colInProgress.innerHTML = buckets['in-progress'].length ? buckets['in-progress'].map(({ kind, job }) => jobBoardCardHtml(kind, job)).join('') : emptyMsg;
  colDone.innerHTML = buckets.done.length ? buckets.done.map(({ kind, job }) => jobBoardCardHtml(kind, job)).join('') : emptyMsg;

  document.getElementById('kanbanCountUnassigned').textContent = buckets.unassigned.length;
  document.getElementById('kanbanCountInProgress').textContent = buckets['in-progress'].length;
  document.getElementById('kanbanCountDone').textContent = buckets.done.length;

  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ kind: card.dataset.kanbanKind, id: card.dataset.kanbanId }));
      card.classList.add('opacity-50');
    });
    card.addEventListener('dragend', () => card.classList.remove('opacity-50'));
  });
  document.querySelectorAll('[data-kanban-view]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const [kind, id] = btn.dataset.kanbanView.split(':');
    openJobDetail(kind, id);
  }));

  document.querySelectorAll('[data-kanban-column]').forEach(col => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('ring-2', 'ring-primary/40'); });
    col.addEventListener('dragleave', () => col.classList.remove('ring-2', 'ring-primary/40'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('ring-2', 'ring-primary/40');
      let payload;
      try { payload = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
      if (!payload || !payload.kind || !payload.id) return;
      handleJobBoardDrop(payload.kind, payload.id, col.dataset.kanbanColumn);
    });
  });
}

function handleJobBoardDrop(kind, id, column) {
  const list = kind === 'carwash' ? DATA.carwashJobs : DATA.maintenanceJobs;
  const job = list.find(j => j.id === id);
  if (!job) return;
  if (column === 'in-progress' && (!job.technician || job.technician === 'Unassigned')) {
    openAssignTechnicianModal(kind, id, column);
    return;
  }
  moveJobToColumn(kind, id, column);
  renderJobBoard();
}

function openAssignTechnicianModal(kind, id, column) {
  const activeStaff = DATA.staff.filter(s => s.status === 'active');
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Assign Technician</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span></button>
    </div>
    <p class="text-[12px] text-on-surface-variant mb-4">Pick a technician before moving this job to In Progress.</p>
    <form id="assignTechForm" novalidate>
      <div class="mb-4">
        <label for="assignTechSelect" class="block text-[12px] font-label-bold text-on-surface-variant mb-1.5">Technician</label>
        <select id="assignTechSelect" class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none">
          ${activeStaff.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} — ${escapeHtml(s.role)}</option>`).join('')}
        </select>
      </div>
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Assign & Move</button>
      </div>
    </form>`;
  openModal(html, { ariaLabel: 'Assign technician' });
  document.getElementById('assignTechForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('assignTechSelect').value;
    moveJobToColumn(kind, id, column, name);
    closeModal();
    toast('Assigned ' + name + '.');
    renderJobBoard();
  });
}

/* ============================================================
   Staff directory + Time Clock (Core Operations #6 & #7)
   ============================================================ */
let staffTab = 'directory';

function setStaffTab(tab) {
  staffTab = tab;
  const dirView = document.getElementById('staffDirectoryView');
  const clockView = document.getElementById('staffTimeclockView');
  const dirBtn = document.getElementById('staffTabDirectoryBtn');
  const clockBtn = document.getElementById('staffTabTimeclockBtn');
  const activeCls = 'px-4 py-2 rounded-lg font-label-bold text-[12px] transition-colors bg-surface-container-lowest shadow-sm text-primary';
  const inactiveCls = 'px-4 py-2 rounded-lg font-label-bold text-[12px] transition-colors text-outline hover:bg-surface-container-high';
  if (dirView) dirView.classList.toggle('hidden', tab !== 'directory');
  if (clockView) clockView.classList.toggle('hidden', tab !== 'timeclock');
  if (dirBtn) dirBtn.className = tab === 'directory' ? activeCls : inactiveCls;
  if (clockBtn) clockBtn.className = tab === 'timeclock' ? activeCls : inactiveCls;
  if (tab === 'timeclock') renderTimeClock();
}

function renderStaffPage() {
  renderStaffDirectory();
  setStaffTab(staffTab);
}

function shiftScheduleSummary(schedule) {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return days.map((d, i) => {
    const on = schedule && schedule[d] && schedule[d] !== 'Off';
    return `<span class="w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${on ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}" title="${labels[i]}: ${escapeHtml((schedule && schedule[d]) || 'Off')}">${labels[i]}</span>`;
  }).join('');
}

function renderStaffDirectory() {
  const grid = document.getElementById('staffDirectoryView');
  if (!grid) return;
  if (DATA.staff.length === 0) {
    grid.innerHTML = `<p class="text-on-surface-variant text-[13px] col-span-full text-center py-10">No staff members yet.</p>`;
    return;
  }
  grid.innerHTML = DATA.staff.map(s => `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 card-shadow ${s.status === 'active' ? '' : 'opacity-60'}">
      <div class="flex items-start justify-between gap-2 mb-3">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[13px] shrink-0">${escapeHtml(initialsFromName(s.name))}</div>
          <div class="min-w-0">
            <p class="font-label-bold text-[13px] text-on-surface truncate">${escapeHtml(s.name)}</p>
            <p class="text-[11px] text-on-surface-variant truncate">${escapeHtml(s.role)}</p>
          </div>
        </div>
        <span class="text-[9px] font-bold uppercase px-2 py-1 rounded-full shrink-0 ${s.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'}">${s.status}</span>
      </div>
      <div class="space-y-1.5 mb-3 text-[12px] text-on-surface-variant">
        <p class="truncate">${escapeHtml(s.email || '—')}</p>
        <p>${escapeHtml(s.phone || '—')}</p>
      </div>
      ${s.certifications.length ? `<div class="flex flex-wrap gap-1.5 mb-3">${s.certifications.map(c => `<span class="text-[10px] bg-secondary-container/10 text-secondary px-2 py-1 rounded-full">${escapeHtml(c)}</span>`).join('')}</div>` : ''}
      <div class="flex items-center gap-1 mb-4">${shiftScheduleSummary(s.shiftSchedule)}</div>
      <div class="flex gap-2 pt-3 border-t border-outline-variant">
        <button type="button" data-staff-edit="${s.id}" class="flex-1 py-2 rounded-xl border border-outline-variant text-on-surface font-label-bold text-[11px] hover:bg-surface-container-low transition-colors">Edit</button>
        <button type="button" data-staff-toggle="${s.id}" class="flex-1 py-2 rounded-xl border border-outline-variant text-error font-label-bold text-[11px] hover:bg-error-container/20 transition-colors">${s.status === 'active' ? 'Deactivate' : 'Reactivate'}</button>
      </div>
    </div>`).join('');

  grid.querySelectorAll('[data-staff-edit]').forEach(btn => btn.addEventListener('click', () => openEditStaffModal(btn.dataset.staffEdit)));
  grid.querySelectorAll('[data-staff-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const member = findStaff(btn.dataset.staffToggle);
    if (!member) return;
    confirmAction({
      title: (member.status === 'active' ? 'Deactivate' : 'Reactivate') + ' Staff Member',
      message: (member.status === 'active' ? 'Deactivate' : 'Reactivate') + ' ' + member.name + '? ' + (member.status === 'active' ? 'They\u2019ll no longer appear as an option when assigning jobs.' : ''),
      confirmLabel: member.status === 'active' ? 'Deactivate' : 'Reactivate', danger: member.status === 'active',
      onConfirm: () => { deactivateStaffMember(member.id); toast(member.name + ' ' + (member.status === 'active' ? 'deactivated' : 'reactivated') + '.'); renderStaffPage(); },
    });
  }));
}

const SHIFT_DAYS = [['mon', 'Mon'], ['tue', 'Tue'], ['wed', 'Wed'], ['thu', 'Thu'], ['fri', 'Fri'], ['sat', 'Sat'], ['sun', 'Sun']];

function staffFormFieldsHtml() {
  return (
    textFieldHtml({ id: 'stfName', label: 'Full Name', placeholder: 'e.g. Jamie Rodriguez', required: true, autofocus: true }) +
    textFieldHtml({ id: 'stfRole', label: 'Role', placeholder: 'e.g. Technician', required: true }) +
    textFieldHtml({ id: 'stfEmail', label: 'Email', type: 'email', placeholder: 'e.g. jamie.r@washtrackpro.demo' }) +
    textFieldHtml({ id: 'stfPhone', label: 'Phone', placeholder: 'e.g. +1 (555) 201-0000' }) +
    textFieldHtml({ id: 'stfCerts', label: 'Certifications (comma-separated)', placeholder: 'e.g. IDA Detailing Certified' }) +
    `<div class="mb-4">
      <label class="block text-[12px] font-label-bold text-on-surface-variant mb-1.5">Shift Schedule</label>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        ${SHIFT_DAYS.map(([key, label]) => `
          <div>
            <label for="stfShift-${key}" class="block text-[10px] text-on-surface-variant mb-1">${label}</label>
            <input id="stfShift-${key}" placeholder="Off" class="w-full bg-surface-container-low border border-outline-variant rounded-lg px-2.5 py-2 text-[11px] text-on-surface focus:ring-2 focus:ring-primary-container outline-none" />
          </div>`).join('')}
      </div>
    </div>`
  );
}

function readShiftScheduleFromForm() {
  const schedule = {};
  SHIFT_DAYS.forEach(([key]) => { schedule[key] = document.getElementById('stfShift-' + key).value.trim() || 'Off'; });
  return schedule;
}

function openNewStaffModal() {
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Add Staff Member</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span></button>
    </div>
    <form id="staffForm" novalidate>
      ${staffFormFieldsHtml()}
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Add Staff</button>
      </div>
    </form>`;
  openModal(html, { ariaLabel: 'Add staff member' });
  document.getElementById('staffForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('stfName');
    const roleEl = document.getElementById('stfRole');
    const okName = validateRequired(nameEl, 'Full name');
    const okRole = validateRequired(roleEl, 'Role');
    if (!okName || !okRole) return;
    createStaffMember({
      name: nameEl.value.trim(), role: roleEl.value.trim(),
      email: document.getElementById('stfEmail').value.trim(),
      phone: document.getElementById('stfPhone').value.trim(),
      certifications: document.getElementById('stfCerts').value,
      shiftSchedule: readShiftScheduleFromForm(),
    });
    closeModal();
    toast('Staff member added.');
    renderStaffPage();
  });
}

function openEditStaffModal(id) {
  const member = findStaff(id);
  if (!member) return;
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Edit Staff Member</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span></button>
    </div>
    <form id="staffForm" novalidate>
      ${staffFormFieldsHtml()}
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Save Changes</button>
      </div>
    </form>`;
  openModal(html, { ariaLabel: 'Edit staff member' });
  document.getElementById('stfName').value = member.name;
  document.getElementById('stfRole').value = member.role;
  document.getElementById('stfEmail').value = member.email || '';
  document.getElementById('stfPhone').value = member.phone || '';
  document.getElementById('stfCerts').value = member.certifications.join(', ');
  SHIFT_DAYS.forEach(([key]) => { document.getElementById('stfShift-' + key).value = (member.shiftSchedule && member.shiftSchedule[key] !== 'Off') ? member.shiftSchedule[key] : ''; });

  document.getElementById('staffForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('stfName');
    const roleEl = document.getElementById('stfRole');
    const okName = validateRequired(nameEl, 'Full name');
    const okRole = validateRequired(roleEl, 'Role');
    if (!okName || !okRole) return;
    updateStaffMember(id, {
      name: nameEl.value.trim(), role: roleEl.value.trim(),
      email: document.getElementById('stfEmail').value.trim(),
      phone: document.getElementById('stfPhone').value.trim(),
      certifications: document.getElementById('stfCerts').value.split(',').map(s => s.trim()).filter(Boolean),
      shiftSchedule: readShiftScheduleFromForm(),
    });
    closeModal();
    toast('Staff member updated.');
    renderStaffPage();
  });
}

function renderTimeClock() {
  const select = document.getElementById('timeClockStaffSelect');
  const body = document.getElementById('timeClockTableBody');
  if (!select || !body) return;

  const active = DATA.staff.filter(s => s.status === 'active');
  select.innerHTML = active.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');

  const entries = [...DATA.timeClock].sort((a, b) => (b.date + (b.clockIn || '')).localeCompare(a.date + (a.clockIn || '')));
  body.innerHTML = entries.length ? entries.map(entry => {
    const staffMember = findStaff(entry.staffId);
    return `
      <tr>
        <td class="px-6 py-3 text-[13px] text-on-surface">${escapeHtml(staffMember ? staffMember.name : 'Unknown')}</td>
        <td class="px-6 py-3 text-[12px] text-on-surface-variant">${formatDateLabel(entry.date)}</td>
        <td class="px-6 py-3 text-[12px] text-on-surface-variant">${escapeHtml(entry.clockIn)}</td>
        <td class="px-6 py-3 text-[12px] text-on-surface-variant">${entry.clockOut ? escapeHtml(entry.clockOut) : '<span class="text-primary font-bold">In progress</span>'}</td>
        <td class="px-6 py-3 text-[12px] text-on-surface text-right">${timeClockHoursLabel(entry)}</td>
      </tr>`;
  }).join('') : `<tr><td colspan="5" class="px-6 py-10 text-center text-on-surface-variant text-[13px]">No time clock entries yet.</td></tr>`;

  const clockInBtn = document.getElementById('clockInBtn');
  const clockOutBtn = document.getElementById('clockOutBtn');
  if (clockInBtn && !clockInBtn.dataset.wired) {
    clockInBtn.dataset.wired = '1';
    clockInBtn.addEventListener('click', () => {
      const staffId = select.value;
      if (!staffId) return;
      const result = clockIn(staffId);
      if (!result) { toast('That staff member is already clocked in.'); return; }
      toast('Clocked in.');
      renderTimeClock();
    });
  }
  if (clockOutBtn && !clockOutBtn.dataset.wired) {
    clockOutBtn.dataset.wired = '1';
    clockOutBtn.addEventListener('click', () => {
      const staffId = select.value;
      if (!staffId) return;
      const result = clockOut(staffId);
      if (!result) { toast('That staff member isn\u2019t currently clocked in.'); return; }
      toast('Clocked out.');
      renderTimeClock();
    });
  }
}

/* ============================================================
   Equipment maintenance tracking (Core Operations #8)
   ============================================================ */
const EQUIPMENT_STATUS_LABEL = { operational: 'Operational', 'needs-service': 'Needs Service', down: 'Down' };
const EQUIPMENT_STATUS_CLASS = { operational: 'bg-primary/10 text-primary', 'needs-service': 'bg-warning-container text-warning', down: 'bg-error-container text-error' };

function renderEquipment() {
  const grid = document.getElementById('equipmentGrid');
  if (!grid) return;
  if (DATA.equipment.length === 0) {
    grid.innerHTML = `<p class="text-on-surface-variant text-[13px] col-span-full text-center py-10">No equipment on record yet.</p>`;
    return;
  }
  const today = todayISO();
  grid.innerHTML = DATA.equipment.map(eq => {
    const overdue = eq.nextServiceDue < today;
    return `
    <div class="bg-surface-container-lowest border border-outline-variant rounded-3xl p-6 card-shadow">
      <div class="flex items-start justify-between gap-2 mb-3">
        <div class="min-w-0">
          <p class="font-label-bold text-[13px] text-on-surface truncate">${escapeHtml(eq.name)}</p>
          <p class="text-[11px] text-on-surface-variant truncate">${escapeHtml(eq.type)} • ${escapeHtml(eq.location)}</p>
        </div>
        <span class="text-[9px] font-bold uppercase px-2 py-1 rounded-full shrink-0 ${EQUIPMENT_STATUS_CLASS[eq.status] || ''}">${EQUIPMENT_STATUS_LABEL[eq.status] || eq.status}</span>
      </div>
      <div class="space-y-1.5 text-[12px] text-on-surface-variant mb-3">
        <p>Last serviced: ${formatDateLabel(eq.lastServiceDate)}</p>
        <p class="${overdue ? 'text-error font-bold' : ''}">Next due: ${formatDateLabel(eq.nextServiceDue)}${overdue ? ' • Overdue' : ''}</p>
      </div>
      ${eq.notes ? `<p class="text-[12px] text-on-surface-variant mb-3 bg-surface-container-low rounded-xl p-3">${escapeHtml(eq.notes)}</p>` : ''}
      <div class="flex gap-2 pt-3 border-t border-outline-variant">
        <button type="button" data-eq-log="${eq.id}" class="flex-1 py-2 rounded-xl border border-outline-variant text-primary font-label-bold text-[11px] hover:bg-primary/5 transition-colors">Log Service</button>
        <button type="button" data-eq-edit="${eq.id}" class="p-2 rounded-xl border border-outline-variant hover:bg-surface-container-low transition-colors" aria-label="Edit ${escapeHtml(eq.name)}"><span class="material-symbols-outlined text-[16px] text-on-surface-variant" aria-hidden="true">edit</span></button>
        <button type="button" data-eq-delete="${eq.id}" class="p-2 rounded-xl border border-outline-variant hover:bg-error-container/20 transition-colors" aria-label="Delete ${escapeHtml(eq.name)}"><span class="material-symbols-outlined text-[16px] text-error" aria-hidden="true">delete</span></button>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('[data-eq-log]').forEach(btn => btn.addEventListener('click', () => {
    const eq = findEquipment(btn.dataset.eqLog);
    logEquipmentService(btn.dataset.eqLog);
    toast('Service logged for ' + (eq ? eq.name : 'equipment') + '.');
    renderEquipment();
  }));
  grid.querySelectorAll('[data-eq-edit]').forEach(btn => btn.addEventListener('click', () => openEditEquipmentModal(btn.dataset.eqEdit)));
  grid.querySelectorAll('[data-eq-delete]').forEach(btn => btn.addEventListener('click', () => confirmDeleteEquipment(btn.dataset.eqDelete)));
}

function equipmentFormFieldsHtml() {
  return (
    textFieldHtml({ id: 'eqName', label: 'Equipment Name', placeholder: 'e.g. Automatic Rollover Wash Unit #1', required: true, autofocus: true }) +
    textFieldHtml({ id: 'eqType', label: 'Type', placeholder: 'e.g. Wash Bay Equipment', required: true }) +
    textFieldHtml({ id: 'eqLocation', label: 'Location', placeholder: 'e.g. Bay 1' }) +
    textFieldHtml({ id: 'eqInterval', label: 'Service Interval (days)', type: 'number', placeholder: 'e.g. 90', required: true }) +
    `<div data-field="eqNotes" class="mb-4">
      <label for="eqNotes" class="block text-[12px] font-label-bold text-on-surface-variant mb-1.5">Notes</label>
      <textarea id="eqNotes" rows="2" class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] text-on-surface focus:ring-2 focus:ring-primary-container outline-none resize-none"></textarea>
    </div>`
  );
}

function openNewEquipmentModal() {
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Add Equipment</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span></button>
    </div>
    <form id="equipmentForm" novalidate>
      ${equipmentFormFieldsHtml()}
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Add Equipment</button>
      </div>
    </form>`;
  openModal(html, { ariaLabel: 'Add equipment' });
  document.getElementById('equipmentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('eqName');
    const typeEl = document.getElementById('eqType');
    const intervalEl = document.getElementById('eqInterval');
    const okName = validateRequired(nameEl, 'Equipment name');
    const okType = validateRequired(typeEl, 'Type');
    const okInterval = validatePositiveNumber(intervalEl, 'Service interval');
    if (!okName || !okType || !okInterval) return;
    createEquipmentItem({
      name: nameEl.value.trim(), type: typeEl.value.trim(),
      location: document.getElementById('eqLocation').value.trim(),
      serviceIntervalDays: intervalEl.value,
      notes: document.getElementById('eqNotes').value.trim(),
    });
    closeModal();
    toast('Equipment added.');
    renderEquipment();
  });
}

function openEditEquipmentModal(id) {
  const eq = findEquipment(id);
  if (!eq) return;
  const html = `
    <div class="flex items-center justify-between mb-6">
      <h3 class="font-headline-sm text-headline-sm text-on-surface">Edit Equipment</h3>
      <button type="button" data-action="closeModal" aria-label="Close" class="p-2 hover:bg-surface-container-high rounded-full transition-all"><span class="material-symbols-outlined text-[20px]" aria-hidden="true">close</span></button>
    </div>
    <form id="equipmentForm" novalidate>
      ${equipmentFormFieldsHtml()}
      ${dropdownFieldHtml({ id: 'eqStatus', label: 'Status', required: true })}
      <div class="pt-2 flex gap-3">
        <button type="button" data-action="closeModal" class="flex-1 py-3 rounded-2xl border border-outline-variant text-on-surface-variant font-label-bold text-[12px] hover:bg-surface-container-low transition-colors">Cancel</button>
        <button type="submit" class="flex-1 bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm">Save Changes</button>
      </div>
    </form>`;
  openModal(html, { ariaLabel: 'Edit equipment' });
  document.getElementById('eqName').value = eq.name;
  document.getElementById('eqType').value = eq.type;
  document.getElementById('eqLocation').value = eq.location;
  document.getElementById('eqInterval').value = eq.serviceIntervalDays;
  document.getElementById('eqNotes').value = eq.notes;
  const statusDropdown = createDropdown({
    options: [{ value: 'operational', label: 'Operational' }, { value: 'needs-service', label: 'Needs Service' }, { value: 'down', label: 'Down' }],
    value: eq.status, ariaLabel: 'Status',
    buttonClass: 'w-full flex items-center justify-between gap-2 bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary-container outline-none',
    listboxClass: 'hidden absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto',
  });
  document.getElementById('eqStatus-mount').appendChild(statusDropdown.root);

  document.getElementById('equipmentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameEl = document.getElementById('eqName');
    const typeEl = document.getElementById('eqType');
    const intervalEl = document.getElementById('eqInterval');
    const okName = validateRequired(nameEl, 'Equipment name');
    const okType = validateRequired(typeEl, 'Type');
    const okInterval = validatePositiveNumber(intervalEl, 'Service interval');
    if (!okName || !okType || !okInterval) return;
    updateEquipmentItem(id, {
      name: nameEl.value.trim(), type: typeEl.value.trim(),
      location: document.getElementById('eqLocation').value.trim(),
      serviceIntervalDays: Number(intervalEl.value),
      notes: document.getElementById('eqNotes').value.trim(),
      status: statusDropdown.getValue(),
    });
    closeModal();
    toast('Equipment updated.');
    renderEquipment();
  });
}

function confirmDeleteEquipment(id) {
  const eq = findEquipment(id);
  if (!eq) return;
  confirmAction({
    title: 'Delete Equipment',
    message: 'Remove "' + eq.name + '" from the equipment list?',
    confirmLabel: 'Delete', danger: true,
    onConfirm: () => { deleteEquipmentItem(id); toast('Equipment deleted.'); renderEquipment(); },
  });
}

/* ============================================================
   Dashboard: Critical Stock widget (backed by real inventory data
   now that Core Operations #1 exists — see js/script.js boot)
   ============================================================ */
function renderCriticalStock() {
  const container = document.getElementById('criticalStockList');
  if (!container) return;
  const low = DATA.inventory.filter(i => i.quantity <= i.reorderThreshold).sort((a, b) => a.quantity - b.quantity);
  if (low.length === 0) {
    container.innerHTML = `<p class="text-[12px] text-on-surface-variant italic py-2">All stock levels are healthy.</p>`;
    return;
  }
  container.innerHTML = low.slice(0, 4).map(item => {
    const critical = item.quantity <= item.reorderThreshold / 2;
    return `
      <div class="flex justify-between items-center p-3 ${critical ? 'bg-error-container/20' : 'bg-surface-container-low'} rounded-xl">
        <div class="flex items-center gap-2"><div class="w-2 h-2 rounded-full ${critical ? 'bg-error' : 'bg-warning'}" aria-hidden="true"></div><span class="font-label-bold text-[12px]">${escapeHtml(item.name)}</span></div>
        <span class="${critical ? 'text-error' : 'text-on-surface-variant'} font-bold text-[12px]">${item.quantity} ${escapeHtml(item.unit)} left</span>
      </div>`;
  }).join('');
}

/* ============================================================
   Vehicle Service History (Core Operations #5)
   Rendered inside the customer detail panel — see js/script.js
   openCustomerDetail().
   ============================================================ */
function renderCustomerServiceHistory(customerId) {
  const container = document.getElementById('detailServiceHistoryList');
  if (!container) return;
  const items = serviceHistoryForCustomer(customerId);
  if (items.length === 0) {
    container.innerHTML = `<p class="text-[12px] text-on-surface-variant italic py-1">No linked service history yet. Jobs created for this customer going forward will show up here.</p>`;
    return;
  }
  container.innerHTML = items.map(({ kind, job }) => {
    const title = kind === 'carwash' ? job.service : job.title;
    const statusLabel = kind === 'carwash'
      ? (job.status === 'completed' ? 'Completed' : job.status === 'in-progress' ? 'In Progress' : 'On Hold')
      : (job.statusLabel || job.status);
    return `
      <button type="button" data-history-kind="${kind}" data-history-id="${job.id}" class="w-full text-left p-3 bg-surface-container-low rounded-xl hover:bg-surface-container-high transition-colors">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="text-[12px] font-label-bold text-on-surface truncate">${escapeHtml(title)}</span>
          <span class="text-[10px] text-on-surface-variant shrink-0">${formatDateLabel(job.date)}</span>
        </div>
        <div class="flex items-center justify-between gap-2 text-[11px] text-on-surface-variant">
          <span class="truncate">${escapeHtml(statusLabel)}</span>
          ${kind === 'carwash' ? `<span class="shrink-0">${formatMoney(job.price)}</span>` : ''}
        </div>
      </button>`;
  }).join('');
  container.querySelectorAll('[data-history-kind]').forEach(btn => btn.addEventListener('click', () => openJobDetail(btn.dataset.historyKind, btn.dataset.historyId)));
}
