/* ==========================================================
   WashTrack Pro — data layer
   Seed dataset + localStorage persistence.

   This is the single source of truth for customers and jobs.
   script.js reads from `DATA`, mutates it through the helper
   functions below, and calls saveData() after any change so
   state survives a page refresh.
   ========================================================== */

const STORAGE_KEY = 'washtrackpro:data:v1';

/* ---- Seed dataset (used on first run, or if storage is cleared) ---- */
const SEED_DATA = {
  customers: [
    { id: 'c01', initials: 'MW', avatarBg: 'bg-surface-variant',   avatarText: 'text-primary',
      name: 'Marcus Wright', email: 'marcus.w@example.com', phone: '+1 (555) 234-8901',
      status: 'active', vehicle: '2023 Tesla Model S', vehicleColor: 'Deep Blue Metallic',
      lastVisit: '2023-10-12', lastVisitLabel: 'Oct 12, 2023', lastVisitNote: 'Premium Detail',
      spend: 1240.00, classification: 'Top 5% Spender',
      memberSince: '2022-01-15', memberSinceLabel: 'Jan 2022' },

    { id: 'c02', initials: 'ER', avatarBg: 'bg-secondary/10', avatarText: 'text-secondary',
      name: 'Elena Rodriguez', email: 'e.rod@provider.net', phone: '+1 (555) 891-0032',
      status: 'vip', vehicle: '2021 BMW X5', vehicleColor: 'Alpine White',
      lastVisit: '2023-11-04', lastVisitLabel: 'Nov 04, 2023', lastVisitNote: 'Exterior Wash',
      spend: 3850.50, classification: 'Fleet Client',
      memberSince: '2020-03-02', memberSinceLabel: 'Mar 2020' },

    { id: 'c03', initials: 'TC', avatarBg: 'bg-surface-container-high', avatarText: 'text-on-surface-variant',
      name: 'Thomas Chen', email: 'thomas.chen@corp.com', phone: '+1 (555) 442-7893',
      status: 'inactive', vehicle: '2019 Porsche 911', vehicleColor: 'Guards Red',
      lastVisit: '2023-08-22', lastVisitLabel: 'Aug 22, 2023', lastVisitNote: 'Full Ceramic Coating',
      spend: 540.00, classification: 'Single Service',
      memberSince: '2019-06-11', memberSinceLabel: 'Jun 2019' },

    { id: 'c04', initials: 'SJ', avatarBg: 'bg-primary/10', avatarText: 'text-primary',
      name: 'Sarah Jenkins', email: 's.jenkins@webmail.com', phone: '+1 (555) 709-2214',
      status: 'active', vehicle: '2024 Audi RS6', vehicleColor: 'Nardo Gray',
      lastVisit: '2023-12-21', lastVisitLabel: 'Just Now', lastVisitNote: 'In Service Area',
      spend: 2100.25, classification: 'Recurring Client',
      memberSince: '2021-02-19', memberSinceLabel: 'Feb 2021' },

    { id: 'c05', initials: 'PN', avatarBg: 'bg-secondary/10', avatarText: 'text-secondary',
      name: 'Priya Nandakumar', email: 'priya.n@mailbox.com', phone: '+1 (555) 312-9087',
      status: 'vip', vehicle: '2023 Range Rover Velar', vehicleColor: 'Santorini Black',
      lastVisit: '2023-12-01', lastVisitLabel: 'Dec 01, 2023', lastVisitNote: 'Full Ceramic Coating',
      spend: 4920.00, classification: 'Platinum Member',
      memberSince: '2019-05-08', memberSinceLabel: 'May 2019' },

    { id: 'c06', initials: 'JS', avatarBg: 'bg-warning-container', avatarText: 'text-warning',
      name: 'Jordan Smith', email: 'jordan.smith@mail.com', phone: '+1 (555) 600-1182',
      status: 'pending', vehicle: '2022 Ford Mustang', vehicleColor: 'Race Red',
      lastVisit: null, lastVisitLabel: '—', lastVisitNote: 'Awaiting first visit',
      spend: 0, classification: 'New Signup',
      memberSince: '2023-12-18', memberSinceLabel: 'Dec 2023' },

    { id: 'c07', initials: 'DO', avatarBg: 'bg-tertiary/10', avatarText: 'text-tertiary',
      name: 'David Okafor', email: 'd.okafor@example.com', phone: '+1 (555) 884-2201',
      status: 'active', vehicle: '2020 Toyota Camry', vehicleColor: 'Celestial Silver',
      lastVisit: '2023-09-30', lastVisitLabel: 'Sep 30, 2023', lastVisitNote: 'Basic Wash',
      spend: 610.75, classification: 'Loyal Customer',
      memberSince: '2022-07-04', memberSinceLabel: 'Jul 2022' },

    { id: 'c08', initials: 'ML', avatarBg: 'bg-surface-container-high', avatarText: 'text-on-surface-variant',
      name: 'Mei Lin', email: 'mei.lin@webmail.com', phone: '+1 (555) 220-7765',
      status: 'inactive', vehicle: '2021 Honda Civic', vehicleColor: 'Sonic Gray',
      lastVisit: '2023-04-02', lastVisitLabel: 'Apr 02, 2023', lastVisitNote: 'Deluxe Wash',
      spend: 215.00, classification: 'Trial Customer',
      memberSince: '2023-01-09', memberSinceLabel: 'Jan 2023' },

    { id: 'c09', initials: 'RV', avatarBg: 'bg-secondary/10', avatarText: 'text-secondary',
      name: 'Robert Vance', email: 'r.vance@corp.com', phone: '+1 (555) 718-3340',
      status: 'vip', vehicle: '2023 Mercedes G-Wagon', vehicleColor: 'Obsidian Black',
      lastVisit: '2023-12-10', lastVisitLabel: 'Dec 10, 2023', lastVisitNote: 'Premium Detail',
      spend: 6430.00, classification: 'Founding Member',
      memberSince: '2018-11-23', memberSinceLabel: 'Nov 2018' },

    { id: 'c10', initials: 'AB', avatarBg: 'bg-primary/10', avatarText: 'text-primary',
      name: 'Aaliyah Brooks', email: 'aaliyah.b@mailbox.com', phone: '+1 (555) 401-5567',
      status: 'active', vehicle: '2022 Mazda CX-5', vehicleColor: 'Soul Red',
      lastVisit: '2023-11-28', lastVisitLabel: 'Nov 28, 2023', lastVisitNote: 'Deluxe Wash',
      spend: 980.40, classification: 'Regular',
      memberSince: '2021-08-17', memberSinceLabel: 'Aug 2021' },

    { id: 'c11', initials: 'CM', avatarBg: 'bg-warning-container', avatarText: 'text-warning',
      name: 'Carlos Mendoza', email: 'c.mendoza@mail.com', phone: '+1 (555) 552-9943',
      status: 'pending', vehicle: '2023 Subaru WRX', vehicleColor: 'WR Blue Pearl',
      lastVisit: null, lastVisitLabel: '—', lastVisitNote: 'Awaiting first visit',
      spend: 0, classification: 'New Signup',
      memberSince: '2023-12-20', memberSinceLabel: 'Dec 2023' },

    { id: 'c12', initials: 'GK', avatarBg: 'bg-primary/10', avatarText: 'text-primary',
      name: 'Grace Kim', email: 'grace.kim@webmail.com', phone: '+1 (555) 309-6628',
      status: 'active', vehicle: '2023 Lexus RX350', vehicleColor: 'Nori Green',
      lastVisit: '2023-12-05', lastVisitLabel: 'Dec 05, 2023', lastVisitNote: 'Premium Detail',
      spend: 1560.00, classification: 'Recurring Client',
      memberSince: '2022-02-27', memberSinceLabel: 'Feb 2022' },

    { id: 'c13', initials: 'TO', avatarBg: 'bg-surface-container-high', avatarText: 'text-on-surface-variant',
      name: 'Tyler Osei', email: 't.osei@example.com', phone: '+1 (555) 667-1129',
      status: 'inactive', vehicle: '2019 Chevy Camaro', vehicleColor: 'Riverside Blue',
      lastVisit: '2023-06-14', lastVisitLabel: 'Jun 14, 2023', lastVisitNote: 'Basic Wash',
      spend: 320.00, classification: 'Lapsed',
      memberSince: '2022-10-03', memberSinceLabel: 'Oct 2022' },

    { id: 'c14', initials: 'NV', avatarBg: 'bg-secondary/10', avatarText: 'text-secondary',
      name: 'Natasha Volkov', email: 'n.volkov@corp.com', phone: '+1 (555) 870-4456',
      status: 'vip', vehicle: '2023 Bentley Continental', vehicleColor: 'Onyx',
      lastVisit: '2023-12-15', lastVisitLabel: 'Dec 15, 2023', lastVisitNote: 'Premium Detail',
      spend: 9800.00, classification: 'Founding Member',
      memberSince: '2018-01-30', memberSinceLabel: 'Jan 2018' },
  ],

  carwashJobs: [
    { id: 'w01', customer: 'Marcus Holloway', vehicle: 'Tesla Model 3 • Midnight Silver',
      service: 'Premium Detail', serviceTone: 'secondary', technician: 'Felix J.', technicianTone: 'primary',
      status: 'in-progress', start: '09:45 AM', price: 85.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w02', customer: 'Sarah Jenkins', vehicle: 'Range Rover • Fuji White',
      service: 'Deluxe Wash', serviceTone: 'primary-container', technician: 'Oliver W.', technicianTone: 'secondary',
      status: 'completed', start: '08:30 AM', price: 45.00, avatarIcon: 'airport_shuttle', avatarTone: 'secondary' },

    { id: 'w03', customer: 'David Chen', vehicle: 'Toyota Camry • Celestial Silver',
      service: 'Basic Wash', serviceTone: 'neutral', technician: 'Leo M.', technicianTone: 'tertiary',
      status: 'in-progress', start: '10:15 AM', price: 25.00, avatarIcon: 'directions_car', avatarTone: 'tertiary' },

    { id: 'w04', customer: 'Emily Rose', vehicle: 'BMW X5 • Carbon Black',
      service: 'Premium Detail', serviceTone: 'secondary', technician: 'Sarah P.', technicianTone: 'primary',
      status: 'completed', start: '07:50 AM', price: 120.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w05', customer: 'Jordan Smith', vehicle: 'Ford Mustang • Race Red',
      service: 'Deluxe Wash', serviceTone: 'primary-container', technician: 'Unassigned', technicianTone: null,
      status: 'on-hold', start: '--:--', price: 55.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w06', customer: 'Aaliyah Brooks', vehicle: 'Mazda CX-5 • Soul Red',
      service: 'Deluxe Wash', serviceTone: 'primary-container', technician: 'Oliver W.', technicianTone: 'secondary',
      status: 'in-progress', start: '10:40 AM', price: 45.00, avatarIcon: 'directions_car', avatarTone: 'secondary' },

    { id: 'w07', customer: 'Grace Kim', vehicle: 'Lexus RX350 • Nori Green',
      service: 'Premium Detail', serviceTone: 'secondary', technician: 'Sarah P.', technicianTone: 'primary',
      status: 'in-progress', start: '11:05 AM', price: 95.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w08', customer: 'Robert Vance', vehicle: 'Mercedes G-Wagon • Obsidian Black',
      service: 'Premium Detail', serviceTone: 'secondary', technician: 'Felix J.', technicianTone: 'primary',
      status: 'completed', start: '06:55 AM', price: 140.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w09', customer: 'Natasha Volkov', vehicle: 'Bentley Continental • Onyx',
      service: 'Premium Detail', serviceTone: 'secondary', technician: 'Sarah P.', technicianTone: 'primary',
      status: 'completed', start: '07:10 AM', price: 180.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w10', customer: 'Tyler Osei', vehicle: 'Chevy Camaro • Riverside Blue',
      service: 'Basic Wash', serviceTone: 'neutral', technician: 'Leo M.', technicianTone: 'tertiary',
      status: 'completed', start: '08:05 AM', price: 25.00, avatarIcon: 'directions_car', avatarTone: 'tertiary' },

    { id: 'w11', customer: 'Carlos Mendoza', vehicle: 'Subaru WRX • WR Blue Pearl',
      service: 'Basic Wash', serviceTone: 'neutral', technician: 'Unassigned', technicianTone: null,
      status: 'on-hold', start: '--:--', price: 25.00, avatarIcon: 'directions_car', avatarTone: 'tertiary' },

    { id: 'w12', customer: 'Mei Lin', vehicle: 'Honda Civic • Sonic Gray',
      service: 'Deluxe Wash', serviceTone: 'primary-container', technician: 'Unassigned', technicianTone: null,
      status: 'on-hold', start: '--:--', price: 45.00, avatarIcon: 'directions_car', avatarTone: 'secondary' },
  ],

  maintenanceJobs: [
    { id: 'm01', title: 'Premium Synthetic Oil Change', vehicle: 'Tesla Model S • Silver Frost • TX-2024',
      technician: 'Marcus Thorne', status: 'in-progress', statusLabel: 'In Progress', statusTone: 'primary',
      start: '09:15 AM', note: 'ETA: 20 MINS', progress: 65, icon: 'directions_car', iconTone: 'primary' },

    { id: 'm02', title: 'Tire Rotation & Alignment', vehicle: 'Range Rover Sport • Arctic White • LUX-77',
      technician: 'Elena Vance', status: 'waitlist', statusLabel: 'Waitlist', statusTone: 'warning',
      start: '09:40 AM', note: 'Starting at 10:15 AM', progress: null, icon: 'airport_shuttle', iconTone: 'secondary' },

    { id: 'm03', title: 'Comprehensive Battery Diagnostic', vehicle: 'Porsche 911 Carrera • GT Grey • FAST-911',
      technician: 'Sam Rivers', status: 'quality-control', statusLabel: 'Quality Control', statusTone: 'primary',
      start: '08:30 AM', note: 'Finishing Shortly', progress: 95, icon: 'car_repair', iconTone: 'tertiary' },

    { id: 'm04', title: 'Brake Pad Replacement', vehicle: 'Audi RS6 • Nardo Gray • AUD-552',
      technician: 'Marcus Thorne', status: 'waitlist', statusLabel: 'Waitlist', statusTone: 'warning',
      start: '10:50 AM', note: 'Starting at 11:00 AM', progress: null, icon: 'directions_car', iconTone: 'primary' },

    { id: 'm05', title: 'Transmission Fluid Flush', vehicle: 'BMW X5 • Carbon Black • BMX-219',
      technician: 'Sam Rivers', status: 'in-progress', statusLabel: 'In Progress', statusTone: 'primary',
      start: '10:05 AM', note: 'ETA: 45 MINS', progress: 40, icon: 'car_repair', iconTone: 'tertiary' },

    { id: 'm06', title: 'Full Synthetic Oil Change', vehicle: 'Toyota Camry • Celestial Silver • TC-330',
      technician: 'Elena Vance', status: 'completed', statusLabel: 'Completed', statusTone: 'primary',
      start: '01:45 PM', note: 'Completed 2:30 PM', progress: 100, icon: 'directions_car', iconTone: 'primary' },

    { id: 'm07', title: 'Wheel Alignment', vehicle: 'Mazda CX-5 • Soul Red • MZ-771',
      technician: 'Marcus Thorne', status: 'completed', statusLabel: 'Completed', statusTone: 'primary',
      start: '10:30 AM', note: 'Completed 11:15 AM', progress: 100, icon: 'airport_shuttle', iconTone: 'secondary' },

    { id: 'm08', title: 'Battery Replacement', vehicle: 'Honda Civic • Sonic Gray • HC-118',
      technician: 'Sam Rivers', status: 'completed', statusLabel: 'Completed', statusTone: 'primary',
      start: '09:10 AM', note: 'Completed 9:50 AM', progress: 100, icon: 'car_repair', iconTone: 'tertiary' },
  ],

  expenses: [
    { id: 'e01', description: 'Car shampoo & wax supplies', category: 'Supplies', amount: 320.00, date: '2023-12-14' },
    { id: 'e02', description: 'Technician overtime pay', category: 'Labor', amount: 410.00, date: '2023-12-15' },
    { id: 'e03', description: 'Pressure washer nozzle replacement', category: 'Equipment', amount: 120.00, date: '2023-12-16' },
  ],
};

/* ---- Persistence ---- */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.customers) && Array.isArray(parsed.carwashJobs) && Array.isArray(parsed.maintenanceJobs)) {
        if (!Array.isArray(parsed.expenses)) {
          // Migrate data saved before the expenses feature existed.
          parsed.expenses = JSON.parse(JSON.stringify(SEED_DATA.expenses));
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn('WashTrack: could not read saved data, falling back to seed data.', e);
  }
  return JSON.parse(JSON.stringify(SEED_DATA));
}

let DATA = loadData();

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
  } catch (e) {
    console.warn('WashTrack: could not save data to localStorage.', e);
  }
}

function resetSeedData() {
  DATA = JSON.parse(JSON.stringify(SEED_DATA));
  saveData();
  return DATA;
}

/* ---- Small lookup helpers used by script.js ---- */
function findCustomer(id) { return DATA.customers.find(c => c.id === id) || null; }
function findCarwashJob(id) { return DATA.carwashJobs.find(j => j.id === id) || null; }
function findMaintenanceJob(id) { return DATA.maintenanceJobs.find(j => j.id === id) || null; }

/* ---- ID generation ---- */
function nextId(prefix, list) {
  let n = list.length + 1;
  let id = prefix + String(n).padStart(2, '0');
  while (list.some(item => item.id === id)) {
    n++;
    id = prefix + String(n).padStart(2, '0');
  }
  return id;
}

/* ---- Avatar palette (cycled for new customers so colors stay varied) ---- */
const AVATAR_PALETTE = [
  { bg: 'bg-primary/10', text: 'text-primary' },
  { bg: 'bg-secondary/10', text: 'text-secondary' },
  { bg: 'bg-tertiary/10', text: 'text-tertiary' },
  { bg: 'bg-warning-container', text: 'text-warning' },
  { bg: 'bg-surface-container-high', text: 'text-on-surface-variant' },
];

function initialsFromName(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

/* ---- Create: Customer ---- */
function createCustomer({ name, email, phone, vehicle, vehicleColor, status }) {
  const palette = AVATAR_PALETTE[DATA.customers.length % AVATAR_PALETTE.length];
  const customer = {
    id: nextId('c', DATA.customers),
    initials: initialsFromName(name),
    avatarBg: palette.bg,
    avatarText: palette.text,
    name, email, phone,
    status: status || 'pending',
    vehicle, vehicleColor: vehicleColor || '—',
    lastVisit: null, lastVisitLabel: '—', lastVisitNote: 'Awaiting first visit',
    spend: 0, classification: 'New Signup',
    memberSince: todayISO(), memberSinceLabel: todayLabel(),
  };
  DATA.customers.unshift(customer);
  saveData();
  return customer;
}

/* ---- Create: Car Wash Job ---- */
function createCarwashJob({ customer, vehicle, service, technician, price, status, start }) {
  const toneByService = { 'Basic Wash': 'neutral', 'Deluxe Wash': 'primary-container', 'Premium Detail': 'secondary' };
  const job = {
    id: nextId('w', DATA.carwashJobs),
    customer, vehicle,
    service, serviceTone: toneByService[service] || 'neutral',
    technician: technician || 'Unassigned',
    technicianTone: technician ? 'primary' : null,
    status: status || 'in-progress',
    start: start || '--:--',
    price: Number(price) || 0,
    avatarIcon: 'directions_car', avatarTone: 'primary',
  };
  DATA.carwashJobs.unshift(job);
  saveData();
  return job;
}

/* ---- Create: Maintenance Job ---- */
function createMaintenanceJob({ title, vehicle, technician, status, start, note }) {
  const labelByStatus = { 'in-progress': 'In Progress', 'waitlist': 'Waitlist', 'quality-control': 'Quality Control', 'completed': 'Completed' };
  const toneByStatus = { 'in-progress': 'primary', 'waitlist': 'warning', 'quality-control': 'primary', 'completed': 'primary' };
  const job = {
    id: nextId('m', DATA.maintenanceJobs),
    title, vehicle,
    technician,
    status: status || 'in-progress',
    statusLabel: labelByStatus[status] || 'In Progress',
    statusTone: toneByStatus[status] || 'primary',
    start: start || '--:--',
    note: note || '',
    progress: status === 'completed' ? 100 : (status === 'in-progress' ? 10 : null),
    icon: 'directions_car', iconTone: 'primary',
  };
  DATA.maintenanceJobs.unshift(job);
  saveData();
  return job;
}

/* ---- Create: Expense ---- */
function createExpense({ description, category, amount }) {
  const expense = {
    id: nextId('e', DATA.expenses),
    description, category: category || 'Other',
    amount: Number(amount) || 0,
    date: todayISO(),
  };
  DATA.expenses.unshift(expense);
  saveData();
  return expense;
}

function totalExpenses() {
  return DATA.expenses.reduce((sum, e) => sum + e.amount, 0);
}

/* ---- Delete: Job cancellation ---- */
function cancelCarwashJob(id) {
  DATA.carwashJobs = DATA.carwashJobs.filter(j => j.id !== id);
  saveData();
}
function cancelMaintenanceJob(id) {
  DATA.maintenanceJobs = DATA.maintenanceJobs.filter(j => j.id !== id);
  saveData();
}
