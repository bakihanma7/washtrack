/* ==========================================================
   WashTrack Pro — data layer
   Seed dataset + localStorage persistence.

   This is the single source of truth for customers and jobs.
   script.js reads from `DATA`, mutates it through the helper
   functions below, and calls saveData() after any change so
   state survives a page refresh.
   ========================================================== */

const STORAGE_KEY = 'washtrackpro:data:v1';

/* Returns an ISO date (YYYY-MM-DD) offset from today by `days` (may be
   negative). Used for seed data — jobs, equipment service dates, etc. —
   so the demo dataset stays meaningful (some overdue, some upcoming)
   no matter when the app is actually opened, instead of hardcoding
   dates that go stale. */
function seedDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
    { id: 'w01', customer: 'Marcus Holloway', customerId: null, vehicle: 'Tesla Model 3 • Midnight Silver',
      service: 'Premium Detail', serviceTone: 'secondary', technician: 'Felix J.', technicianTone: 'primary',
      status: 'in-progress', start: '09:45 AM', date: seedDateOffset(0), price: 85.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w02', customer: 'Sarah Jenkins', customerId: 'c04', vehicle: 'Range Rover • Fuji White',
      service: 'Deluxe Wash', serviceTone: 'primary-container', technician: 'Oliver W.', technicianTone: 'secondary',
      status: 'completed', start: '08:30 AM', date: seedDateOffset(0), price: 45.00, avatarIcon: 'airport_shuttle', avatarTone: 'secondary' },

    { id: 'w03', customer: 'David Chen', customerId: null, vehicle: 'Toyota Camry • Celestial Silver',
      service: 'Basic Wash', serviceTone: 'neutral', technician: 'Leo M.', technicianTone: 'tertiary',
      status: 'in-progress', start: '10:15 AM', date: seedDateOffset(0), price: 25.00, avatarIcon: 'directions_car', avatarTone: 'tertiary' },

    { id: 'w04', customer: 'Emily Rose', customerId: null, vehicle: 'BMW X5 • Carbon Black',
      service: 'Premium Detail', serviceTone: 'secondary', technician: 'Sarah P.', technicianTone: 'primary',
      status: 'completed', start: '07:50 AM', date: seedDateOffset(-1), price: 120.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w05', customer: 'Jordan Smith', customerId: 'c06', vehicle: 'Ford Mustang • Race Red',
      service: 'Deluxe Wash', serviceTone: 'primary-container', technician: 'Unassigned', technicianTone: null,
      status: 'on-hold', start: '--:--', date: seedDateOffset(0), price: 55.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w06', customer: 'Aaliyah Brooks', customerId: 'c10', vehicle: 'Mazda CX-5 • Soul Red',
      service: 'Deluxe Wash', serviceTone: 'primary-container', technician: 'Oliver W.', technicianTone: 'secondary',
      status: 'in-progress', start: '10:40 AM', date: seedDateOffset(0), price: 45.00, avatarIcon: 'directions_car', avatarTone: 'secondary' },

    { id: 'w07', customer: 'Grace Kim', customerId: 'c12', vehicle: 'Lexus RX350 • Nori Green',
      service: 'Premium Detail', serviceTone: 'secondary', technician: 'Sarah P.', technicianTone: 'primary',
      status: 'in-progress', start: '11:05 AM', date: seedDateOffset(1), price: 95.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w08', customer: 'Robert Vance', customerId: 'c09', vehicle: 'Mercedes G-Wagon • Obsidian Black',
      service: 'Premium Detail', serviceTone: 'secondary', technician: 'Felix J.', technicianTone: 'primary',
      status: 'completed', start: '06:55 AM', date: seedDateOffset(-2), price: 140.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w09', customer: 'Natasha Volkov', customerId: 'c14', vehicle: 'Bentley Continental • Onyx',
      service: 'Premium Detail', serviceTone: 'secondary', technician: 'Sarah P.', technicianTone: 'primary',
      status: 'completed', start: '07:10 AM', date: seedDateOffset(-2), price: 180.00, avatarIcon: 'directions_car', avatarTone: 'primary' },

    { id: 'w10', customer: 'Tyler Osei', customerId: 'c13', vehicle: 'Chevy Camaro • Riverside Blue',
      service: 'Basic Wash', serviceTone: 'neutral', technician: 'Leo M.', technicianTone: 'tertiary',
      status: 'completed', start: '08:05 AM', date: seedDateOffset(-3), price: 25.00, avatarIcon: 'directions_car', avatarTone: 'tertiary' },

    { id: 'w11', customer: 'Carlos Mendoza', customerId: 'c11', vehicle: 'Subaru WRX • WR Blue Pearl',
      service: 'Basic Wash', serviceTone: 'neutral', technician: 'Unassigned', technicianTone: null,
      status: 'on-hold', start: '--:--', date: seedDateOffset(2), price: 25.00, avatarIcon: 'directions_car', avatarTone: 'tertiary' },

    { id: 'w12', customer: 'Mei Lin', customerId: 'c08', vehicle: 'Honda Civic • Sonic Gray',
      service: 'Deluxe Wash', serviceTone: 'primary-container', technician: 'Unassigned', technicianTone: null,
      status: 'on-hold', start: '--:--', date: seedDateOffset(3), price: 45.00, avatarIcon: 'directions_car', avatarTone: 'secondary' },
  ],

  maintenanceJobs: [
    { id: 'm01', title: 'Premium Synthetic Oil Change', customerId: 'c01', vehicle: 'Tesla Model S • Silver Frost • TX-2024',
      technician: 'Marcus Thorne', status: 'in-progress', statusLabel: 'In Progress', statusTone: 'primary',
      start: '09:15 AM', date: seedDateOffset(0), note: 'ETA: 20 MINS', progress: 65, price: 65.00, icon: 'directions_car', iconTone: 'primary' },

    { id: 'm02', title: 'Tire Rotation & Alignment', customerId: null, vehicle: 'Range Rover Sport • Arctic White • LUX-77',
      technician: 'Elena Vance', status: 'waitlist', statusLabel: 'Waitlist', statusTone: 'warning',
      start: '09:40 AM', date: seedDateOffset(0), note: 'Starting at 10:15 AM', progress: null, price: 65.00, icon: 'airport_shuttle', iconTone: 'secondary' },

    { id: 'm03', title: 'Comprehensive Battery Diagnostic', customerId: null, vehicle: 'Porsche 911 Carrera • GT Grey • FAST-911',
      technician: 'Sam Rivers', status: 'quality-control', statusLabel: 'Quality Control', statusTone: 'primary',
      start: '08:30 AM', date: seedDateOffset(0), note: 'Finishing Shortly', progress: 95, price: 120.00, icon: 'car_repair', iconTone: 'tertiary' },

    { id: 'm04', title: 'Brake Pad Replacement', customerId: 'c04', vehicle: 'Audi RS6 • Nardo Gray • AUD-552',
      technician: 'Marcus Thorne', status: 'waitlist', statusLabel: 'Waitlist', statusTone: 'warning',
      start: '10:50 AM', date: seedDateOffset(1), note: 'Starting at 11:00 AM', progress: null, price: 180.00, icon: 'directions_car', iconTone: 'primary' },

    { id: 'm05', title: 'Transmission Fluid Flush', customerId: null, vehicle: 'BMW X5 • Carbon Black • BMX-219',
      technician: 'Sam Rivers', status: 'in-progress', statusLabel: 'In Progress', statusTone: 'primary',
      start: '10:05 AM', date: seedDateOffset(0), note: 'ETA: 45 MINS', progress: 40, price: 150.00, icon: 'car_repair', iconTone: 'tertiary' },

    { id: 'm06', title: 'Full Synthetic Oil Change', customerId: 'c07', vehicle: 'Toyota Camry • Celestial Silver • TC-330',
      technician: 'Elena Vance', status: 'completed', statusLabel: 'Completed', statusTone: 'primary',
      start: '01:45 PM', date: seedDateOffset(-1), note: 'Completed 2:30 PM', progress: 100, price: 65.00, icon: 'directions_car', iconTone: 'primary' },

    { id: 'm07', title: 'Wheel Alignment', customerId: 'c10', vehicle: 'Mazda CX-5 • Soul Red • MZ-771',
      technician: 'Marcus Thorne', status: 'completed', statusLabel: 'Completed', statusTone: 'primary',
      start: '10:30 AM', date: seedDateOffset(-2), note: 'Completed 11:15 AM', progress: 100, price: 65.00, icon: 'airport_shuttle', iconTone: 'secondary' },

    { id: 'm08', title: 'Battery Replacement', customerId: 'c08', vehicle: 'Honda Civic • Sonic Gray • HC-118',
      technician: 'Sam Rivers', status: 'completed', statusLabel: 'Completed', statusTone: 'primary',
      start: '09:10 AM', date: seedDateOffset(-3), note: 'Completed 9:50 AM', progress: 100, price: 120.00, icon: 'car_repair', iconTone: 'tertiary' },
  ],

  expenses: [
    { id: 'e01', description: 'Car shampoo & wax supplies', category: 'Supplies', amount: 320.00, date: '2023-12-14' },
    { id: 'e02', description: 'Technician overtime pay', category: 'Labor', amount: 410.00, date: '2023-12-15' },
    { id: 'e03', description: 'Pressure washer nozzle replacement', category: 'Equipment', amount: 120.00, date: '2023-12-16' },
  ],

  /* Notes are keyed by `${kind}:${id}` (e.g. "customer:c01",
     "carwash:w01", "maintenance:m01") -> array of note objects,
     newest first. See js/platform.js for the reader/writer helpers. */
  notes: {},

  inventory: [
    { id: 'i01', name: 'Premium Car Shampoo (5 gal)', category: 'Chemicals', sku: 'CHM-1001',
      supplierName: 'CleanPro Supply Co.', supplierContact: 'orders@cleanprosupply.com',
      quantity: 4, unit: 'jugs', reorderThreshold: 5, unitCost: 42.50, lastRestocked: seedDateOffset(-9) },
    { id: 'i02', name: 'Microfiber Towels (pack of 50)', category: 'Supplies', sku: 'SUP-2044',
      supplierName: 'Textile Wholesale Direct', supplierContact: 'sales@textilewholesale.com',
      quantity: 8, unit: 'packs', reorderThreshold: 10, unitCost: 28.00, lastRestocked: seedDateOffset(-14) },
    { id: 'i03', name: 'Synthetic 5W-30 Motor Oil (case)', category: 'Maintenance Parts', sku: 'PRT-5530',
      supplierName: 'AutoParts Direct', supplierContact: 'b2b@autopartsdirect.com',
      quantity: 3, unit: 'cases', reorderThreshold: 6, unitCost: 96.00, lastRestocked: seedDateOffset(-6) },
    { id: 'i04', name: 'Ceramic Coating Kit', category: 'Chemicals', sku: 'CHM-3390',
      supplierName: 'CleanPro Supply Co.', supplierContact: 'orders@cleanprosupply.com',
      quantity: 12, unit: 'kits', reorderThreshold: 4, unitCost: 65.00, lastRestocked: seedDateOffset(-2) },
    { id: 'i05', name: 'Tire Shine Spray (case of 12)', category: 'Chemicals', sku: 'CHM-1155',
      supplierName: 'CleanPro Supply Co.', supplierContact: 'orders@cleanprosupply.com',
      quantity: 14, unit: 'cases', reorderThreshold: 5, unitCost: 54.00, lastRestocked: seedDateOffset(-20) },
    { id: 'i06', name: 'Air Filters (universal, box of 10)', category: 'Maintenance Parts', sku: 'PRT-7710',
      supplierName: 'AutoParts Direct', supplierContact: 'b2b@autopartsdirect.com',
      quantity: 6, unit: 'boxes', reorderThreshold: 4, unitCost: 38.00, lastRestocked: seedDateOffset(-11) },
    { id: 'i07', name: 'Vacuum Bags (universal, pack of 20)', category: 'Equipment Parts', sku: 'EQP-4402',
      supplierName: 'Wash Bay Equipment Supply', supplierContact: 'parts@washbayequip.com',
      quantity: 2, unit: 'packs', reorderThreshold: 3, unitCost: 22.00, lastRestocked: seedDateOffset(-30) },
    { id: 'i08', name: 'Brake Pad Sets (front, universal fit)', category: 'Maintenance Parts', sku: 'PRT-8820',
      supplierName: 'AutoParts Direct', supplierContact: 'b2b@autopartsdirect.com',
      quantity: 9, unit: 'sets', reorderThreshold: 4, unitCost: 74.00, lastRestocked: seedDateOffset(-5) },
  ],

  packages: [
    { id: 'p01', name: 'Basic Wash', category: 'wash', price: 25.00, active: true,
      description: 'A quick exterior rinse and dry — great for a routine clean.',
      includes: ['Exterior rinse', 'Foam wash', 'Hand dry'] },
    { id: 'p02', name: 'Deluxe Wash', category: 'wash', price: 45.00, active: true,
      description: 'Our most popular wash — interior and exterior, done right.',
      includes: ['Everything in Basic Wash', 'Interior vacuum', 'Window cleaning', 'Tire shine'] },
    { id: 'p03', name: 'Premium Detail', category: 'wash', price: 95.00, active: true,
      description: 'A full detail for owners who want their car showroom-fresh.',
      includes: ['Everything in Deluxe Wash', 'Clay bar treatment', 'Wax & polish', 'Interior deep clean'] },
    { id: 'p04', name: 'Full Ceramic Coating', category: 'wash', price: 350.00, active: true,
      description: 'Long-lasting ceramic protection with a showroom-glass finish.',
      includes: ['Paint correction', 'Ceramic coating application', '2-year protection warranty'] },
    { id: 'p05', name: 'Standard Oil Change', category: 'maintenance', price: 45.00, active: true,
      description: 'Synthetic oil and filter change with a multi-point inspection.',
      includes: ['Synthetic oil & filter', 'Multi-point inspection', 'Fluid top-off'] },
    { id: 'p06', name: 'Tire Rotation & Alignment', category: 'maintenance', price: 65.00, active: true,
      description: 'Even out tire wear and keep the car tracking straight.',
      includes: ['4-wheel rotation', 'Alignment check & adjustment', 'Tire pressure check'] },
    { id: 'p07', name: 'Battery Diagnostic & Replacement', category: 'maintenance', price: 120.00, active: false,
      description: 'Full battery health check with replacement if needed.',
      includes: ['Battery load test', 'Terminal cleaning', 'Replacement (if needed)'] },
  ],

  /* Staff roster is independent of login accounts (js/auth.js) — a
     technician's name here is what's referenced by carwashJobs /
     maintenanceJobs `technician` fields and the Job Board assignment
     flow, regardless of whether that person has ever signed in. */
  staff: [
    { id: 's01', name: 'Felix J.', role: 'Technician', email: 'felix.j@washtrackpro.demo', phone: '+1 (555) 201-4471',
      certifications: ['IDA Detailing Certified'], status: 'active', hireDate: seedDateOffset(-540),
      shiftSchedule: { mon: '8:00 AM–4:00 PM', tue: '8:00 AM–4:00 PM', wed: '8:00 AM–4:00 PM', thu: '8:00 AM–4:00 PM', fri: '8:00 AM–4:00 PM', sat: 'Off', sun: 'Off' } },
    { id: 's02', name: 'Oliver W.', role: 'Technician', email: 'oliver.w@washtrackpro.demo', phone: '+1 (555) 201-9902',
      certifications: [], status: 'active', hireDate: seedDateOffset(-320),
      shiftSchedule: { mon: '10:00 AM–6:00 PM', tue: '10:00 AM–6:00 PM', wed: 'Off', thu: '10:00 AM–6:00 PM', fri: '10:00 AM–6:00 PM', sat: '9:00 AM–3:00 PM', sun: 'Off' } },
    { id: 's03', name: 'Leo M.', role: 'Technician', email: 'leo.m@washtrackpro.demo', phone: '+1 (555) 201-3387',
      certifications: ['Ceramic Coating Certified'], status: 'active', hireDate: seedDateOffset(-210),
      shiftSchedule: { mon: 'Off', tue: '8:00 AM–4:00 PM', wed: '8:00 AM–4:00 PM', thu: '8:00 AM–4:00 PM', fri: '8:00 AM–4:00 PM', sat: '9:00 AM–3:00 PM', sun: 'Off' } },
    { id: 's04', name: 'Sarah P.', role: 'Senior Technician', email: 'sarah.p@washtrackpro.demo', phone: '+1 (555) 201-6675',
      certifications: ['IDA Detailing Certified', 'Ceramic Coating Certified'], status: 'active', hireDate: seedDateOffset(-980),
      shiftSchedule: { mon: '7:00 AM–3:00 PM', tue: '7:00 AM–3:00 PM', wed: '7:00 AM–3:00 PM', thu: '7:00 AM–3:00 PM', fri: 'Off', sat: 'Off', sun: 'Off' } },
    { id: 's05', name: 'Marcus Thorne', role: 'Maintenance Technician', email: 'marcus.t@washtrackpro.demo', phone: '+1 (555) 201-7743',
      certifications: ['ASE Certified'], status: 'active', hireDate: seedDateOffset(-760),
      shiftSchedule: { mon: '8:00 AM–4:00 PM', tue: '8:00 AM–4:00 PM', wed: '8:00 AM–4:00 PM', thu: 'Off', fri: '8:00 AM–4:00 PM', sat: 'Off', sun: 'Off' } },
    { id: 's06', name: 'Elena Vance', role: 'Maintenance Technician', email: 'elena.v@washtrackpro.demo', phone: '+1 (555) 201-5528',
      certifications: ['ASE Certified'], status: 'active', hireDate: seedDateOffset(-430),
      shiftSchedule: { mon: '9:00 AM–5:00 PM', tue: '9:00 AM–5:00 PM', wed: 'Off', thu: '9:00 AM–5:00 PM', fri: '9:00 AM–5:00 PM', sat: 'Off', sun: 'Off' } },
    { id: 's07', name: 'Sam Rivers', role: 'Senior Maintenance Technician', email: 'sam.r@washtrackpro.demo', phone: '+1 (555) 201-8814',
      certifications: ['ASE Certified', 'EV Systems Certified'], status: 'active', hireDate: seedDateOffset(-1120),
      shiftSchedule: { mon: '7:00 AM–3:00 PM', tue: '7:00 AM–3:00 PM', wed: '7:00 AM–3:00 PM', thu: '7:00 AM–3:00 PM', fri: '7:00 AM–3:00 PM', sat: 'Off', sun: 'Off' } },
    { id: 's08', name: 'Priya Anand', role: 'Shift Manager', email: 'priya.a@washtrackpro.demo', phone: '+1 (555) 201-2290',
      certifications: [], status: 'active', hireDate: seedDateOffset(-1400),
      shiftSchedule: { mon: '8:00 AM–5:00 PM', tue: '8:00 AM–5:00 PM', wed: '8:00 AM–5:00 PM', thu: '8:00 AM–5:00 PM', fri: '8:00 AM–5:00 PM', sat: 'Off', sun: 'Off' } },
  ],

  timeClock: [
    { id: 't01', staffId: 's01', date: seedDateOffset(0), clockIn: '07:58 AM', clockOut: null },
    { id: 't02', staffId: 's04', date: seedDateOffset(0), clockIn: '06:55 AM', clockOut: null },
    { id: 't03', staffId: 's05', date: seedDateOffset(0), clockIn: '07:59 AM', clockOut: null },
    { id: 't04', staffId: 's02', date: seedDateOffset(-1), clockIn: '10:02 AM', clockOut: '06:05 PM' },
    { id: 't05', staffId: 's03', date: seedDateOffset(-1), clockIn: '07:57 AM', clockOut: '04:10 PM' },
    { id: 't06', staffId: 's07', date: seedDateOffset(-1), clockIn: '07:01 AM', clockOut: '03:02 PM' },
  ],

  equipment: [
    { id: 'q01', name: 'Automatic Rollover Wash Unit #1', type: 'Wash Bay Equipment', location: 'Bay 1',
      status: 'operational', lastServiceDate: seedDateOffset(-25), serviceIntervalDays: 90, nextServiceDue: seedDateOffset(65),
      notes: 'Running normally, brushes replaced last service.' },
    { id: 'q02', name: 'Industrial Vacuum Station #2', type: 'Vacuum Station', location: 'Bay 2',
      status: 'needs-service', lastServiceDate: seedDateOffset(-95), serviceIntervalDays: 90, nextServiceDue: seedDateOffset(-5),
      notes: 'Suction noticeably weaker — filter replacement overdue.' },
    { id: 'q03', name: 'Pressure Washer Unit A', type: 'Pressure Washer', location: 'Detail Bay', 
      status: 'operational', lastServiceDate: seedDateOffset(-14), serviceIntervalDays: 60, nextServiceDue: seedDateOffset(46),
      notes: 'New nozzle installed.' },
    { id: 'q04', name: 'Undercarriage Wash System', type: 'Wash Bay Equipment', location: 'Bay 1',
      status: 'down', lastServiceDate: seedDateOffset(-140), serviceIntervalDays: 90, nextServiceDue: seedDateOffset(-50),
      notes: 'Pump failure — parts on order, unit offline until repaired.' },
    { id: 'q05', name: 'Air Compressor Unit', type: 'Shop Equipment', location: 'Maintenance Bay',
      status: 'operational', lastServiceDate: seedDateOffset(-40), serviceIntervalDays: 120, nextServiceDue: seedDateOffset(80),
      notes: '' },
    { id: 'q06', name: 'Two-Post Vehicle Lift #1', type: 'Shop Equipment', location: 'Maintenance Bay',
      status: 'operational', lastServiceDate: seedDateOffset(-60), serviceIntervalDays: 180, nextServiceDue: seedDateOffset(120),
      notes: 'Annual safety inspection passed.' },
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
        if (!parsed.notes || typeof parsed.notes !== 'object') {
          // Migrate data saved before the notes feature existed.
          parsed.notes = {};
        }
        if (!Array.isArray(parsed.inventory)) parsed.inventory = JSON.parse(JSON.stringify(SEED_DATA.inventory));
        if (!Array.isArray(parsed.packages)) parsed.packages = JSON.parse(JSON.stringify(SEED_DATA.packages));
        if (!Array.isArray(parsed.staff)) parsed.staff = JSON.parse(JSON.stringify(SEED_DATA.staff));
        if (!Array.isArray(parsed.timeClock)) parsed.timeClock = JSON.parse(JSON.stringify(SEED_DATA.timeClock));
        if (!Array.isArray(parsed.equipment)) parsed.equipment = JSON.parse(JSON.stringify(SEED_DATA.equipment));
        // Backfill `date`/`customerId` on jobs saved before the
        // Calendar/Job Board/Service History features existed.
        [parsed.carwashJobs, parsed.maintenanceJobs].forEach((jobs) => {
          (jobs || []).forEach((job) => {
            if (!job.date) job.date = todayISO();
            if (job.customerId === undefined) job.customerId = null;
          });
        });
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
function createCarwashJob({ customer, customerId, vehicle, service, technician, price, status, start, date }) {
  const toneByService = { 'Basic Wash': 'neutral', 'Deluxe Wash': 'primary-container', 'Premium Detail': 'secondary' };
  const job = {
    id: nextId('w', DATA.carwashJobs),
    customer, customerId: customerId || null, vehicle,
    service, serviceTone: toneByService[service] || 'neutral',
    technician: technician || 'Unassigned',
    technicianTone: technician ? 'primary' : null,
    status: status || 'in-progress',
    start: start || '--:--',
    date: date || todayISO(),
    price: Number(price) || 0,
    avatarIcon: 'directions_car', avatarTone: 'primary',
  };
  DATA.carwashJobs.unshift(job);
  saveData();
  return job;
}

/* ---- Create: Maintenance Job ---- */
function createMaintenanceJob({ title, customerId, vehicle, technician, status, start, date, note, price }) {
  const labelByStatus = { 'in-progress': 'In Progress', 'waitlist': 'Waitlist', 'quality-control': 'Quality Control', 'completed': 'Completed' };
  const toneByStatus = { 'in-progress': 'primary', 'waitlist': 'warning', 'quality-control': 'primary', 'completed': 'primary' };
  const job = {
    id: nextId('m', DATA.maintenanceJobs),
    title, customerId: customerId || null, vehicle,
    technician,
    status: status || 'in-progress',
    statusLabel: labelByStatus[status] || 'In Progress',
    statusTone: toneByStatus[status] || 'primary',
    start: start || '--:--',
    date: date || todayISO(),
    note: note || '',
    progress: status === 'completed' ? 100 : (status === 'in-progress' ? 10 : null),
    price: Number(price) || 0,
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

/* ============================================================
   Calendar + Job Board helpers
   ============================================================ */

/* All carwash + maintenance jobs on a given ISO date, tagged with
   `kind` so callers can tell which array (and which detail panel)
   each one came from. */
function jobsForDate(dateISO) {
  const carwash = DATA.carwashJobs.filter(j => j.date === dateISO).map(j => ({ kind: 'carwash', job: j }));
  const maintenance = DATA.maintenanceJobs.filter(j => j.date === dateISO).map(j => ({ kind: 'maintenance', job: j }));
  return [...carwash, ...maintenance];
}

/* Which Job Board column a job currently belongs in. */
function jobBoardColumn(kind, job) {
  if (kind === 'carwash') {
    if (job.status === 'completed') return 'done';
    if (job.status === 'on-hold') return 'unassigned';
    return 'in-progress';
  }
  // maintenance
  if (job.status === 'completed') return 'done';
  if (job.status === 'waitlist') return 'unassigned';
  return 'in-progress';
}

/* Moves a job to a new Job Board column, updating its underlying
   status (and technician, for carwash jobs) to match. Assigning a
   technician when moving into "in-progress" is handled by the
   caller (js/operations.js prompts for one first if needed) — this
   function just applies whatever technician name it's given. */
function moveJobToColumn(kind, id, column, technicianName) {
  const list = kind === 'carwash' ? DATA.carwashJobs : DATA.maintenanceJobs;
  const job = list.find(j => j.id === id);
  if (!job) return null;

  if (kind === 'carwash') {
    if (column === 'unassigned') {
      job.status = 'on-hold';
      job.technician = 'Unassigned';
      job.technicianTone = null;
      job.start = '--:--';
    } else if (column === 'in-progress') {
      job.status = 'in-progress';
      if (technicianName) { job.technician = technicianName; job.technicianTone = 'primary'; }
      if (job.start === '--:--') job.start = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (column === 'done') {
      job.status = 'completed';
    }
  } else {
    if (column === 'unassigned') {
      job.status = 'waitlist';
      job.statusLabel = 'Waitlist';
      job.statusTone = 'warning';
      job.progress = null;
    } else if (column === 'in-progress') {
      job.status = 'in-progress';
      job.statusLabel = 'In Progress';
      job.statusTone = 'primary';
      job.progress = job.progress || 10;
      if (technicianName) job.technician = technicianName;
    } else if (column === 'done') {
      job.status = 'completed';
      job.statusLabel = 'Completed';
      job.statusTone = 'primary';
      job.progress = 100;
    }
  }
  saveData();
  return job;
}

/* ---- Vehicle service history for a customer (Core Operations #5) ----
   Combines carwash + maintenance jobs linked by customerId, newest
   date first. Jobs created before this feature existed (or created
   without picking a customer) won't have a customerId and simply
   won't appear here — see js/data.js SEED_DATA comments. */
function serviceHistoryForCustomer(customerId) {
  const carwash = DATA.carwashJobs.filter(j => j.customerId === customerId).map(j => ({ kind: 'carwash', job: j }));
  const maintenance = DATA.maintenanceJobs.filter(j => j.customerId === customerId).map(j => ({ kind: 'maintenance', job: j }));
  return [...carwash, ...maintenance].sort((a, b) => (b.job.date || '').localeCompare(a.job.date || ''));
}

/* ============================================================
   Inventory (Core Operations #1)
   ============================================================ */
function findInventoryItem(id) { return DATA.inventory.find(i => i.id === id) || null; }

function createInventoryItem({ name, category, sku, supplierName, supplierContact, quantity, unit, reorderThreshold, unitCost }) {
  const item = {
    id: nextId('i', DATA.inventory),
    name, category: category || 'Supplies', sku: sku || '',
    supplierName: supplierName || '', supplierContact: supplierContact || '',
    quantity: Number(quantity) || 0, unit: unit || 'units',
    reorderThreshold: Number(reorderThreshold) || 0,
    unitCost: Number(unitCost) || 0,
    lastRestocked: todayISO(),
  };
  DATA.inventory.unshift(item);
  saveData();
  return item;
}
function updateInventoryItem(id, patch) {
  const item = findInventoryItem(id);
  if (!item) return null;
  Object.assign(item, patch);
  saveData();
  return item;
}
function restockInventoryItem(id, addQuantity) {
  const item = findInventoryItem(id);
  if (!item) return null;
  item.quantity += Number(addQuantity) || 0;
  item.lastRestocked = todayISO();
  saveData();
  return item;
}
function deleteInventoryItem(id) {
  DATA.inventory = DATA.inventory.filter(i => i.id !== id);
  saveData();
}

/* ============================================================
   Service Packages (Core Operations #2)
   ============================================================ */
function findPackage(id) { return DATA.packages.find(p => p.id === id) || null; }

function createPackage({ name, category, price, description, includes, active }) {
  const pkg = {
    id: nextId('p', DATA.packages),
    name, category: category || 'wash',
    price: Number(price) || 0,
    description: description || '',
    includes: Array.isArray(includes) ? includes : String(includes || '').split('\n').map(s => s.trim()).filter(Boolean),
    active: active !== false,
  };
  DATA.packages.unshift(pkg);
  saveData();
  return pkg;
}
function updatePackage(id, patch) {
  const pkg = findPackage(id);
  if (!pkg) return null;
  Object.assign(pkg, patch);
  saveData();
  return pkg;
}
function deletePackage(id) {
  DATA.packages = DATA.packages.filter(p => p.id !== id);
  saveData();
}

/* ============================================================
   Staff directory (Core Operations #6) — independent of the
   auth/login accounts in js/auth.js by design (see roadmap note).
   ============================================================ */
function findStaff(id) { return DATA.staff.find(s => s.id === id) || null; }

function createStaffMember({ name, role, email, phone, certifications, shiftSchedule }) {
  const member = {
    id: nextId('s', DATA.staff),
    name, role: role || 'Technician', email: email || '', phone: phone || '',
    certifications: Array.isArray(certifications) ? certifications : String(certifications || '').split(',').map(s => s.trim()).filter(Boolean),
    status: 'active',
    hireDate: todayISO(),
    shiftSchedule: shiftSchedule || { mon: 'Off', tue: 'Off', wed: 'Off', thu: 'Off', fri: 'Off', sat: 'Off', sun: 'Off' },
  };
  DATA.staff.unshift(member);
  saveData();
  return member;
}
function updateStaffMember(id, patch) {
  const member = findStaff(id);
  if (!member) return null;
  Object.assign(member, patch);
  saveData();
  return member;
}
function deactivateStaffMember(id) {
  const member = findStaff(id);
  if (!member) return null;
  member.status = member.status === 'active' ? 'inactive' : 'active';
  saveData();
  return member;
}

/* ============================================================
   Time clock (Core Operations #7)
   ============================================================ */
function openTimeClockEntry(staffId) {
  return DATA.timeClock.find(t => t.staffId === staffId && !t.clockOut) || null;
}
function clockIn(staffId) {
  if (openTimeClockEntry(staffId)) return null; // already clocked in
  const entry = {
    id: nextId('t', DATA.timeClock),
    staffId,
    date: todayISO(),
    clockIn: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    clockOut: null,
  };
  DATA.timeClock.unshift(entry);
  saveData();
  return entry;
}
function clockOut(staffId) {
  const entry = openTimeClockEntry(staffId);
  if (!entry) return null;
  entry.clockOut = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  saveData();
  return entry;
}
/* Parses this app's own "h:mm AM/PM" strings back into minutes since
   midnight, purely to compute a shift's duration for display. */
function timeStringToMinutes(str) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((str || '').trim());
  if (!m) return null;
  let hours = parseInt(m[1], 10) % 12;
  if (/PM/i.test(m[3])) hours += 12;
  return hours * 60 + parseInt(m[2], 10);
}
function timeClockHoursLabel(entry) {
  if (!entry.clockOut) return 'In progress';
  const start = timeStringToMinutes(entry.clockIn);
  const end = timeStringToMinutes(entry.clockOut);
  if (start === null || end === null) return '—';
  const mins = Math.max(0, end - start);
  const hrs = mins / 60;
  return hrs.toFixed(1) + ' hrs';
}

/* ============================================================
   Equipment maintenance (Core Operations #8)
   ============================================================ */
function findEquipment(id) { return DATA.equipment.find(e => e.id === id) || null; }

function createEquipmentItem({ name, type, location, serviceIntervalDays, notes }) {
  const interval = Number(serviceIntervalDays) || 90;
  const item = {
    id: nextId('q', DATA.equipment),
    name, type: type || 'Shop Equipment', location: location || '',
    status: 'operational',
    lastServiceDate: todayISO(),
    serviceIntervalDays: interval,
    nextServiceDue: seedDateOffset(interval),
    notes: notes || '',
  };
  DATA.equipment.unshift(item);
  saveData();
  return item;
}
function updateEquipmentItem(id, patch) {
  const item = findEquipment(id);
  if (!item) return null;
  Object.assign(item, patch);
  saveData();
  return item;
}
function logEquipmentService(id) {
  const item = findEquipment(id);
  if (!item) return null;
  item.lastServiceDate = todayISO();
  item.nextServiceDue = seedDateOffset(item.serviceIntervalDays || 90);
  item.status = 'operational';
  saveData();
  return item;
}
function deleteEquipmentItem(id) {
  DATA.equipment = DATA.equipment.filter(e => e.id !== id);
  saveData();
}
