/* ==========================================================
   WashTrack Pro — Reporting & Intelligence (Roadmap #25–28)
   Real charts (revenue trend, job volume, service mix,
   technician performance) computed from live DATA, plus two
   forecasting panels:
     - Predictive inventory reordering: a heuristic consumption
       model driven by recent booking volume, not a true
       demand-sensing backend (this is a static, GitHub
       Pages-hosted app — there's nowhere to run real usage
       tracking). The model and its assumptions are stated
       in the UI, not just here.
     - Demand forecasting: weekday-average job volume projected
       forward, compared against currently scheduled staff.
       Accuracy improves as more real jobs accumulate; the seed
       dataset alone is thin (a handful of days), so early
       numbers are a rough signal, not a guarantee.
   Export: CSV downloads per table (genuinely Excel-openable),
   and a Print Report button that opens the browser print dialog
   against a dedicated print stylesheet — the standard static-site
   route to a real PDF (via the browser's "Save as PDF"), since a
   backend-driven PDF export isn't available here.
   ========================================================== */

/* ============================================================
   Date helpers
   Reuses dateFromISO / isoFromDate / addDaysISO from
   js/operations.js (the calendar feature) rather than redefining
   them here, to avoid two competing global `addDaysISO`s.
   ============================================================ */
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function weekdayIndexFromISO(iso) {
  return dateFromISO(iso).getDay();
}
function shortDateLabel(iso) {
  return dateFromISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function lastNDaysISO(n) {
  const today = todayISO();
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDaysISO(today, -i));
  return out;
}

/* ============================================================
   State: selected reporting range (days), shared by the
   Revenue Trend and Job Volume charts.
   ============================================================ */
let reportsRangeDays = 30;
let reportsRangeDropdown = null;

/* ============================================================
   Core data aggregation
   ============================================================ */
function reportsAllJobEvents() {
  const wash = DATA.carwashJobs.map(j => ({
    date: j.date, amount: Number(j.price) || 0, technician: j.technician,
    kind: 'wash', label: j.service, status: j.status,
  }));
  const maintenance = DATA.maintenanceJobs.map(j => ({
    date: j.date, amount: Number(j.price) || 0, technician: j.technician,
    kind: 'maintenance', label: j.title, status: j.status,
  }));
  return wash.concat(maintenance);
}

function reportsRevenueTrend(days) {
  const dates = lastNDaysISO(days);
  const events = reportsAllJobEvents();
  const byDate = {};
  events.forEach(e => { (byDate[e.date] || (byDate[e.date] = [])).push(e); });
  return dates.map(date => {
    const dayEvents = byDate[date] || [];
    const washRevenue = dayEvents.filter(e => e.kind === 'wash').reduce((s, e) => s + e.amount, 0);
    const maintenanceRevenue = dayEvents.filter(e => e.kind === 'maintenance').reduce((s, e) => s + e.amount, 0);
    return {
      date, label: shortDateLabel(date),
      washRevenue, maintenanceRevenue,
      total: washRevenue + maintenanceRevenue,
      jobCount: dayEvents.length,
      washCount: dayEvents.filter(e => e.kind === 'wash').length,
      maintenanceCount: dayEvents.filter(e => e.kind === 'maintenance').length,
    };
  });
}

function reportsServiceMixSummary() {
  const events = reportsAllJobEvents();
  const wash = events.filter(e => e.kind === 'wash');
  const maintenance = events.filter(e => e.kind === 'maintenance');
  const washRevenue = wash.reduce((s, e) => s + e.amount, 0);
  const maintenanceRevenue = maintenance.reduce((s, e) => s + e.amount, 0);
  const totalCount = events.length || 1;
  return {
    washCount: wash.length, maintenanceCount: maintenance.length,
    washRevenue, maintenanceRevenue,
    washPct: Math.round((wash.length / totalCount) * 100),
    maintenancePct: Math.round((maintenance.length / totalCount) * 100),
  };
}

function reportsServiceBreakdown() {
  const events = reportsAllJobEvents();
  const map = {};
  events.forEach(e => {
    const key = e.kind + '::' + e.label;
    if (!map[key]) map[key] = { label: e.label, kind: e.kind, count: 0, revenue: 0 };
    map[key].count++;
    map[key].revenue += e.amount;
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

function reportsTechnicianPerformance() {
  const events = reportsAllJobEvents().filter(e => e.technician && e.technician !== 'Unassigned');
  const map = {};
  events.forEach(e => {
    if (!map[e.technician]) map[e.technician] = { technician: e.technician, jobs: 0, revenue: 0, washJobs: 0, maintenanceJobs: 0 };
    const row = map[e.technician];
    row.jobs++;
    row.revenue += e.amount;
    if (e.kind === 'wash') row.washJobs++; else row.maintenanceJobs++;
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

/* ============================================================
   Predictive inventory reordering (heuristic — see file header)
   Consumption-per-job rates below are stated assumptions, not
   measured usage: WashTrack Pro doesn't track which parts/supplies
   a given job actually consumes, so this projects from category
   and recent booking volume instead. Treat the output as a
   directional early-warning signal, not an exact countdown.
   ============================================================ */
const REPORTS_CONSUMPTION_MODEL = {
  'Chemicals': { perWashJob: 0.09, perMaintenanceJob: 0 },
  'Supplies': { perWashJob: 0.06, perMaintenanceJob: 0.02 },
  'Maintenance Parts': { perWashJob: 0, perMaintenanceJob: 0.18 },
  'Equipment Parts': { perWashJob: 0.015, perMaintenanceJob: 0.02 },
};
const REPORTS_CONSUMPTION_WINDOW_DAYS = 14;

function reportsInventoryForecast() {
  const dates = lastNDaysISO(REPORTS_CONSUMPTION_WINDOW_DAYS);
  const events = reportsAllJobEvents().filter(e => dates.includes(e.date));
  const washPerDay = events.filter(e => e.kind === 'wash').length / REPORTS_CONSUMPTION_WINDOW_DAYS;
  const maintenancePerDay = events.filter(e => e.kind === 'maintenance').length / REPORTS_CONSUMPTION_WINDOW_DAYS;

  return DATA.inventory.map(item => {
    const rate = REPORTS_CONSUMPTION_MODEL[item.category] || { perWashJob: 0.03, perMaintenanceJob: 0.03 };
    const dailyConsumption = (washPerDay * rate.perWashJob) + (maintenancePerDay * rate.perMaintenanceJob);
    const unitsAboveThreshold = item.quantity - item.reorderThreshold;
    let daysUntilReorder;
    if (dailyConsumption <= 0) daysUntilReorder = Infinity;
    else if (unitsAboveThreshold <= 0) daysUntilReorder = 0;
    else daysUntilReorder = unitsAboveThreshold / dailyConsumption;

    let urgency = 'ok';
    if (daysUntilReorder <= 7) urgency = 'urgent';
    else if (daysUntilReorder <= 21) urgency = 'soon';

    return {
      item, dailyConsumption, daysUntilReorder, urgency,
      projectedReorderDate: isFinite(daysUntilReorder) ? addDaysISO(todayISO(), Math.floor(daysUntilReorder)) : null,
    };
  }).sort((a, b) => a.daysUntilReorder - b.daysUntilReorder);
}

const REPORTS_URGENCY_LABEL = { urgent: 'Reorder Soon', soon: 'Watch', ok: 'Healthy' };
const REPORTS_URGENCY_CLASS = {
  urgent: 'bg-error-container/40 text-on-error-container',
  soon: 'bg-amber-100 text-amber-700',
  ok: 'bg-primary-container/20 text-on-primary-container',
};

/* ============================================================
   Demand forecasting (heuristic — see file header)
   ============================================================ */
const REPORTS_JOBS_PER_TECH_PER_DAY = 4;

function reportsWeekdayAverages() {
  const events = reportsAllJobEvents();
  const perDate = {};
  events.forEach(e => { perDate[e.date] = (perDate[e.date] || 0) + 1; });
  const buckets = [[], [], [], [], [], [], []];
  Object.keys(perDate).forEach(date => { buckets[weekdayIndexFromISO(date)].push(perDate[date]); });
  const avgByWeekday = buckets.map(arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const allCounts = Object.values(perDate);
  const overallAvg = allCounts.length ? allCounts.reduce((a, b) => a + b, 0) / allCounts.length : 0;
  return { avgByWeekday, overallAvg, sampleDays: allCounts.length };
}

function reportsDemandForecast(daysAhead) {
  const { avgByWeekday, overallAvg, sampleDays } = reportsWeekdayAverages();
  const today = todayISO();
  const out = [];
  for (let i = 1; i <= daysAhead; i++) {
    const date = addDaysISO(today, i);
    const wd = weekdayIndexFromISO(date);
    const predicted = avgByWeekday[wd] != null ? avgByWeekday[wd] : overallAvg;
    const recommendedTechs = predicted > 0 ? Math.max(1, Math.ceil(predicted / REPORTS_JOBS_PER_TECH_PER_DAY)) : 0;
    const scheduledTechs = DATA.staff.filter(s => {
      if (s.status !== 'active') return false;
      const shift = s.shiftSchedule && s.shiftSchedule[WEEKDAY_KEYS[wd]];
      return shift && shift !== 'Off';
    }).length;
    out.push({
      date, weekdayLabel: WEEKDAY_NAMES[wd],
      predictedJobs: Math.round(predicted * 10) / 10,
      recommendedTechs, scheduledTechs,
      gap: recommendedTechs - scheduledTechs,
    });
  }
  return { forecast: out, sampleDays };
}

/* ============================================================
   Lightweight SVG chart builders
   ============================================================ */
function reportsLineAreaChart(points, opts) {
  opts = opts || {};
  const width = opts.width || 640;
  const height = opts.height || 220;
  const padding = { top: 16, right: 12, bottom: 28, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const values = points.map(p => p.value);
  const max = Math.max(1, ...values);
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: padding.left + stepX * i,
    y: padding.top + innerH - (p.value / max) * innerH,
    ...p,
  }));
  const linePath = coords.map((c, i) => (i === 0 ? 'M' : 'L') + c.x.toFixed(1) + ' ' + c.y.toFixed(1)).join(' ');
  const areaPath = linePath +
    ' L ' + coords[coords.length - 1].x.toFixed(1) + ' ' + (padding.top + innerH) +
    ' L ' + coords[0].x.toFixed(1) + ' ' + (padding.top + innerH) + ' Z';
  const gradId = 'reportsAreaGrad' + Math.random().toString(36).slice(2, 8);
  const showEvery = Math.ceil(points.length / 10) || 1;

  return `
  <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto" role="img" aria-label="${opts.ariaLabel || 'Line chart'}">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(var(--color-primary))" stop-opacity="0.25" />
        <stop offset="100%" stop-color="rgb(var(--color-primary))" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path d="${areaPath}" fill="url(#${gradId})" stroke="none" />
    <path d="${linePath}" fill="none" stroke="rgb(var(--color-primary))" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    ${coords.map((c, i) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2.5" fill="rgb(var(--color-primary))"><title>${escapeHtml(c.label)}: ${escapeHtml(opts.formatValue ? opts.formatValue(c.value) : String(c.value))}</title></circle>`).join('')}
    ${coords.map((c, i) => i % showEvery === 0 ? `<text x="${c.x.toFixed(1)}" y="${height - 8}" font-size="10" text-anchor="middle" fill="rgb(var(--color-on-surface-variant))">${escapeHtml(c.label)}</text>` : '').join('')}
  </svg>`;
}

function reportsDonutChart(segments, opts) {
  opts = opts || {};
  const size = opts.size || 160;
  const stroke = opts.stroke || 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;
  const cx = size / 2, cy = size / 2;
  const arcs = segments.map(seg => {
    const fraction = seg.value / total;
    const dash = fraction * circumference;
    const gap = circumference - dash;
    const rotation = (offset / total) * 360 - 90;
    offset += seg.value;
    return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${seg.color}" stroke-width="${stroke}"
      stroke-dasharray="${dash.toFixed(1)} ${gap.toFixed(1)}" transform="rotate(${rotation.toFixed(1)} ${cx} ${cy})">
      <title>${escapeHtml(seg.label)}: ${Math.round(fraction * 100)}%</title>
    </circle>`;
  }).join('');
  return `
  <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${opts.ariaLabel || 'Donut chart'}">
    ${arcs}
  </svg>`;
}

/* ============================================================
   CSV export
   ============================================================ */
function reportsCsvEscape(val) {
  const s = String(val == null ? '' : val);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function reportsDownloadCsv(filename, headers, rows) {
  const lines = [headers.map(reportsCsvEscape).join(',')]
    .concat(rows.map(row => row.map(reportsCsvEscape).join(',')));
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ============================================================
   Rendering
   ============================================================ */
function renderReports() {
  const root = document.getElementById('page-reports');
  if (!root) return;

  const printDateEl = document.getElementById('reportsPrintDate');
  if (printDateEl) {
    printDateEl.textContent = 'Generated ' + new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) +
      ' • Range: last ' + reportsRangeDays + ' days (revenue/volume charts)';
  }

  renderReportsRangeControl();
  renderReportsRevenueAndVolume();
  renderReportsServiceMix();
  renderReportsTechnicianPerformance();
  renderReportsInventoryForecast();
  renderReportsDemandForecast();
}

function renderReportsRangeControl() {
  const mount = document.getElementById('reportsRangeMount');
  if (!mount) return;
  if (!reportsRangeDropdown) {
    mount.innerHTML = '';
    reportsRangeDropdown = createDropdown({
      options: [
        { value: '7', label: 'Last 7 days' },
        { value: '30', label: 'Last 30 days' },
        { value: '90', label: 'Last 90 days' },
      ],
      value: String(reportsRangeDays),
      ariaLabel: 'Report date range',
      buttonClass: 'flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-xl text-[12px] py-2 px-3.5 focus:ring-2 focus:ring-primary-container outline-none hover:bg-surface-container-low transition-colors',
      listboxClass: 'hidden absolute z-20 mt-1 min-w-full w-max bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1',
      onChange: (v) => { reportsRangeDays = Number(v); renderReportsRevenueAndVolume(); },
    });
    mount.appendChild(reportsRangeDropdown.root);
  }
}

function renderReportsRevenueAndVolume() {
  const trend = reportsRevenueTrend(reportsRangeDays);

  const chartMount = document.getElementById('reportsRevenueChart');
  if (chartMount) {
    chartMount.innerHTML = reportsLineAreaChart(
      trend.map(t => ({ value: t.total, label: t.label })),
      { ariaLabel: 'Daily revenue trend', formatValue: (v) => formatMoney(v) }
    );
  }

  const totalRevenue = trend.reduce((s, t) => s + t.total, 0);
  const avgPerDay = trend.length ? totalRevenue / trend.length : 0;
  const totalEl = document.getElementById('reportsRevenueTotal');
  const avgEl = document.getElementById('reportsRevenueAvg');
  if (totalEl) totalEl.textContent = formatMoney(totalRevenue);
  if (avgEl) avgEl.textContent = formatMoney(avgPerDay) + ' / day';

  const volumeMount = document.getElementById('reportsJobVolumeChart');
  if (volumeMount) {
    const maxCount = Math.max(1, ...trend.map(t => t.jobCount));
    const showEvery = Math.ceil(trend.length / 14) || 1;
    volumeMount.innerHTML = `
      <div class="flex items-end gap-1 h-40">
        ${trend.map((t, i) => `
          <div class="flex-1 flex flex-col items-center justify-end h-full group" title="${escapeHtml(t.label)}: ${t.jobCount} job${t.jobCount === 1 ? '' : 's'}">
            <div class="w-full rounded-t-sm flex flex-col justify-end" style="height:${Math.max(2, (t.jobCount / maxCount) * 100)}%">
              <div class="w-full bg-secondary-container/70 rounded-t-sm" style="height:${t.maintenanceCount ? (t.maintenanceCount / (t.jobCount || 1)) * 100 : 0}%"></div>
              <div class="w-full bg-primary-container" style="height:${t.washCount ? (t.washCount / (t.jobCount || 1)) * 100 : 0}%"></div>
            </div>
            ${i % showEvery === 0 ? `<span class="text-[9px] text-on-surface-variant mt-1 whitespace-nowrap">${escapeHtml(t.label)}</span>` : ''}
          </div>`).join('')}
      </div>
      <div class="flex items-center gap-4 mt-3 text-[11px] text-on-surface-variant">
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-primary-container"></span> Car Wash</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-secondary-container/70"></span> Maintenance</span>
      </div>`;
  }

  const csvBtn = document.getElementById('reportsRevenueExportBtn');
  if (csvBtn) {
    csvBtn.onclick = () => reportsDownloadCsv(
      'washtrackpro-revenue-trend-' + reportsRangeDays + 'd.csv',
      ['Date', 'Car Wash Revenue', 'Maintenance Revenue', 'Total Revenue', 'Job Count'],
      trend.map(t => [t.date, t.washRevenue.toFixed(2), t.maintenanceRevenue.toFixed(2), t.total.toFixed(2), t.jobCount])
    );
  }
}

function renderReportsServiceMix() {
  const summary = reportsServiceMixSummary();
  const donutMount = document.getElementById('reportsServiceMixDonut');
  if (donutMount) {
    donutMount.innerHTML = reportsDonutChart([
      { label: 'Car Wash', value: summary.washCount, color: 'rgb(var(--color-primary-container))' },
      { label: 'Maintenance', value: summary.maintenanceCount, color: 'rgb(var(--color-secondary-container))' },
    ], { ariaLabel: 'Car wash vs maintenance job share' });
  }
  const legendMount = document.getElementById('reportsServiceMixLegend');
  if (legendMount) {
    legendMount.innerHTML = `
      <div class="flex justify-between items-center p-3 rounded-lg bg-surface-container-low">
        <span class="flex items-center gap-2 font-label-bold text-on-surface"><span class="w-3 h-3 rounded-full bg-primary-container"></span> Car Wash</span>
        <span class="text-right"><span class="font-bold text-on-surface">${summary.washPct}%</span> <span class="text-[11px] text-on-surface-variant">(${summary.washCount} jobs • ${formatMoney(summary.washRevenue)})</span></span>
      </div>
      <div class="flex justify-between items-center p-3 rounded-lg bg-surface-container-low mt-2">
        <span class="flex items-center gap-2 font-label-bold text-on-surface"><span class="w-3 h-3 rounded-full bg-secondary-container"></span> Maintenance</span>
        <span class="text-right"><span class="font-bold text-on-surface">${summary.maintenancePct}%</span> <span class="text-[11px] text-on-surface-variant">(${summary.maintenanceCount} jobs • ${formatMoney(summary.maintenanceRevenue)})</span></span>
      </div>`;
  }

  const breakdown = reportsServiceBreakdown();
  const breakdownMount = document.getElementById('reportsServiceBreakdownList');
  if (breakdownMount) {
    const maxRevenue = Math.max(1, ...breakdown.map(b => b.revenue));
    breakdownMount.innerHTML = breakdown.length === 0
      ? `<p class="text-on-surface-variant text-[13px] text-center py-6">No service data yet.</p>`
      : breakdown.map(b => `
        <div class="mb-3 last:mb-0">
          <div class="flex justify-between text-[12px] mb-1">
            <span class="font-label-bold text-on-surface">${escapeHtml(b.label)}</span>
            <span class="text-on-surface-variant">${b.count} jobs • ${formatMoney(b.revenue)}</span>
          </div>
          <div class="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
            <div class="h-full rounded-full ${b.kind === 'wash' ? 'bg-primary-container' : 'bg-secondary-container'}" style="width:${(b.revenue / maxRevenue) * 100}%"></div>
          </div>
        </div>`).join('');
  }

  const csvBtn = document.getElementById('reportsServiceMixExportBtn');
  if (csvBtn) {
    csvBtn.onclick = () => reportsDownloadCsv(
      'washtrackpro-service-mix.csv',
      ['Service', 'Category', 'Job Count', 'Revenue'],
      breakdown.map(b => [b.label, b.kind === 'wash' ? 'Car Wash' : 'Maintenance', b.count, b.revenue.toFixed(2)])
    );
  }
}

function renderReportsTechnicianPerformance() {
  const rows = reportsTechnicianPerformance();
  const body = document.getElementById('reportsTechTableBody');
  if (body) {
    const maxRevenue = Math.max(1, ...rows.map(r => r.revenue));
    body.innerHTML = rows.length === 0
      ? `<tr><td colspan="4" class="px-4 py-8 text-center text-on-surface-variant text-[13px]">No technician-assigned jobs yet.</td></tr>`
      : rows.map(r => `
        <tr class="border-b border-outline-variant/30 last:border-0">
          <td class="px-4 py-3">
            <p class="font-label-bold text-on-surface text-[13px]">${escapeHtml(r.technician)}</p>
            <div class="h-1.5 w-32 bg-surface-container-low rounded-full mt-1.5 overflow-hidden">
              <div class="h-full bg-primary rounded-full" style="width:${(r.revenue / maxRevenue) * 100}%"></div>
            </div>
          </td>
          <td class="px-4 py-3 text-[13px] text-on-surface-variant">${r.jobs} <span class="text-[11px]">(${r.washJobs} wash / ${r.maintenanceJobs} maint.)</span></td>
          <td class="px-4 py-3 text-[13px] font-bold text-on-surface">${formatMoney(r.revenue)}</td>
          <td class="px-4 py-3 text-[13px] text-on-surface-variant">${formatMoney(r.revenue / r.jobs)}</td>
        </tr>`).join('');
  }

  const csvBtn = document.getElementById('reportsTechExportBtn');
  if (csvBtn) {
    csvBtn.onclick = () => reportsDownloadCsv(
      'washtrackpro-technician-performance.csv',
      ['Technician', 'Jobs Completed', 'Car Wash Jobs', 'Maintenance Jobs', 'Revenue Generated', 'Avg Revenue / Job'],
      rows.map(r => [r.technician, r.jobs, r.washJobs, r.maintenanceJobs, r.revenue.toFixed(2), (r.revenue / r.jobs).toFixed(2)])
    );
  }
}

function renderReportsInventoryForecast() {
  const forecast = reportsInventoryForecast();
  const body = document.getElementById('reportsInventoryForecastBody');
  if (body) {
    body.innerHTML = forecast.map(f => `
      <tr class="border-b border-outline-variant/30 last:border-0">
        <td class="px-4 py-3">
          <p class="font-label-bold text-on-surface text-[13px]">${escapeHtml(f.item.name)}</p>
          <p class="text-[11px] text-on-surface-variant">${escapeHtml(f.item.category)} • ${f.item.quantity} ${escapeHtml(f.item.unit)} on hand</p>
        </td>
        <td class="px-4 py-3 text-[13px] text-on-surface-variant">${isFinite(f.daysUntilReorder) ? Math.round(f.daysUntilReorder) + ' days' : 'No recent usage'}</td>
        <td class="px-4 py-3 text-[13px] text-on-surface-variant">${f.projectedReorderDate ? formatDateLabel(f.projectedReorderDate) : '—'}</td>
        <td class="px-4 py-3 text-right">
          <span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${REPORTS_URGENCY_CLASS[f.urgency]}">${REPORTS_URGENCY_LABEL[f.urgency]}</span>
        </td>
      </tr>`).join('');
  }

  const csvBtn = document.getElementById('reportsInventoryExportBtn');
  if (csvBtn) {
    csvBtn.onclick = () => reportsDownloadCsv(
      'washtrackpro-inventory-forecast.csv',
      ['Item', 'Category', 'Qty On Hand', 'Reorder Threshold', 'Est. Days Until Reorder', 'Projected Reorder Date', 'Status'],
      forecast.map(f => [f.item.name, f.item.category, f.item.quantity, f.item.reorderThreshold,
        isFinite(f.daysUntilReorder) ? Math.round(f.daysUntilReorder) : 'n/a',
        f.projectedReorderDate || 'n/a', REPORTS_URGENCY_LABEL[f.urgency]])
    );
  }
}

function renderReportsDemandForecast() {
  const { forecast, sampleDays } = reportsDemandForecast(7);
  const body = document.getElementById('reportsDemandForecastBody');
  if (body) {
    body.innerHTML = forecast.map(f => `
      <tr class="border-b border-outline-variant/30 last:border-0">
        <td class="px-4 py-3 text-[13px] text-on-surface">${formatDateLabel(f.date)}</td>
        <td class="px-4 py-3 text-[13px] text-on-surface-variant">${f.weekdayLabel}</td>
        <td class="px-4 py-3 text-[13px] text-on-surface-variant">${f.predictedJobs}</td>
        <td class="px-4 py-3 text-[13px] text-on-surface-variant">${f.recommendedTechs}</td>
        <td class="px-4 py-3 text-[13px] text-on-surface-variant">${f.scheduledTechs}</td>
        <td class="px-4 py-3 text-right">
          ${f.gap > 0
            ? `<span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error-container/40 text-on-error-container">Understaffed</span>`
            : `<span class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary-container/20 text-on-primary-container">On Track</span>`}
        </td>
      </tr>`).join('');
  }
  const noteEl = document.getElementById('reportsDemandForecastNote');
  if (noteEl) {
    noteEl.textContent = sampleDays < 14
      ? 'Based on only ' + sampleDays + ' day(s) of booking history so far — projections will sharpen as more jobs are logged.'
      : 'Based on ' + sampleDays + ' days of booking history.';
  }

  const csvBtn = document.getElementById('reportsDemandExportBtn');
  if (csvBtn) {
    csvBtn.onclick = () => reportsDownloadCsv(
      'washtrackpro-demand-forecast.csv',
      ['Date', 'Weekday', 'Predicted Jobs', 'Recommended Techs', 'Scheduled Techs', 'Status'],
      forecast.map(f => [f.date, f.weekdayLabel, f.predictedJobs, f.recommendedTechs, f.scheduledTechs, f.gap > 0 ? 'Understaffed' : 'On Track'])
    );
  }
}

/* ============================================================
   Print report ("Save as PDF" via the browser print dialog —
   see file header for why this is the honest static-site route
   to an exportable PDF).
   ============================================================ */
function reportsPrint() {
  renderReports();
  window.print();
}
