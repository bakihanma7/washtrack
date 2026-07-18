/* ==========================================================
   WashTrack Pro — accounts, sessions, and role-based access
   Client-side only (no backend): accounts and the active session
   live in localStorage. Passwords are SHA-256 hashed before being
   stored, but there is no server to keep secrets on, so this is a
   demo-grade auth layer for role-based UI gating — not a
   production security system.
   ========================================================== */

const ACCOUNTS_KEY = 'washtrackpro:accounts:v1';
const SESSION_KEY = 'washtrackpro:session:v1';
const AUTH_SALT = 'washtrackpro-demo-salt-v1';

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', technician: 'Technician' };

/* Pages each role may land on / see in the sidebar. 'myjobs' only
   exists for technicians — a stripped, mobile-friendly "my jobs
   today" list. Admins and managers use the full set of views. */
const ROLE_PAGES = {
  admin: ['dashboard', 'calendar', 'carwash', 'maintenance', 'jobboard', 'customers', 'inventory', 'packages', 'staff', 'equipment'],
  manager: ['dashboard', 'calendar', 'carwash', 'maintenance', 'jobboard', 'customers', 'inventory', 'packages', 'staff', 'equipment'],
  technician: ['myjobs', 'carwash', 'maintenance'],
};

/* ============================================================
   Account storage
   ============================================================ */
function loadAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('WashTrack: could not read accounts.', e);
    return [];
  }
}

function saveAccounts(accounts) {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('WashTrack: could not save accounts.', e);
  }
}

function findAccountByEmail(email) {
  const norm = (email || '').trim().toLowerCase();
  return loadAccounts().find(a => a.email === norm) || null;
}

function nextAccountId(accounts) {
  let n = accounts.length + 1;
  let id = 'u' + String(n).padStart(3, '0');
  while (accounts.some(a => a.id === id)) { n++; id = 'u' + String(n).padStart(3, '0'); }
  return id;
}

async function hashPassword(password) {
  const enc = new TextEncoder().encode(AUTH_SALT + ':' + password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signupAccount({ name, email, password, role }) {
  const norm = (email || '').trim().toLowerCase();
  const accounts = loadAccounts();
  if (accounts.some(a => a.email === norm)) {
    return { ok: false, error: 'An account with that email already exists. Try logging in instead.' };
  }
  const passwordHash = await hashPassword(password);
  const account = {
    id: nextAccountId(accounts),
    name: name.trim(),
    email: norm,
    passwordHash,
    role: ROLE_LABELS[role] ? role : 'technician',
    initials: initialsFromName(name.trim()),
    createdAt: new Date().toISOString(),
  };
  accounts.push(account);
  saveAccounts(accounts);
  createSession(account.id);
  return { ok: true, account };
}

async function verifyLogin(email, password) {
  const account = findAccountByEmail(email);
  if (!account) return { ok: false, error: 'No account found with that email. Sign up first.' };
  const hash = await hashPassword(password);
  if (hash !== account.passwordHash) return { ok: false, error: 'Incorrect password.' };
  createSession(account.id);
  return { ok: true, account };
}

/* ============================================================
   Session
   ============================================================ */
function createSession(accountId) {
  try { localStorage.setItem(SESSION_KEY, accountId); } catch (e) { /* ignore */ }
}
function getSessionAccountId() {
  try { return localStorage.getItem(SESSION_KEY); } catch (e) { return null; }
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
}
function currentUser() {
  const id = getSessionAccountId();
  if (!id) return null;
  return loadAccounts().find(a => a.id === id) || null;
}
function isAuthenticated() {
  return !!currentUser();
}
function logout() {
  clearSession();
  location.reload();
}

/* ============================================================
   Role gating
   ============================================================ */
function applyRoleGating(role) {
  const allowed = ROLE_PAGES[role] || ROLE_PAGES.manager;
  document.querySelectorAll('[data-page]').forEach(btn => {
    const page = btn.dataset.page;
    btn.classList.toggle('hidden', !allowed.includes(page));
  });
  const reportsBtn = document.getElementById('navReports');
  if (reportsBtn) reportsBtn.classList.toggle('hidden', role === 'technician');
  document.body.setAttribute('data-role', role);
}

function updateHeaderProfile(account) {
  const nameEl = document.getElementById('headerAccountName');
  const roleEl = document.getElementById('headerAccountRole');
  const avatarEl = document.getElementById('headerAccountAvatar');
  if (nameEl) nameEl.textContent = account.name;
  if (roleEl) roleEl.textContent = ROLE_LABELS[account.role] || account.role;
  if (avatarEl) avatarEl.textContent = account.initials || initialsFromName(account.name);
}

/* ============================================================
   Auth screen (login / signup) — rendered into #authFormMount.
   Fully self-contained: doesn't depend on script.js/modals.js,
   since it can run before the rest of the app has booted.
   ============================================================ */
function authFieldHtml({ id, label, type, placeholder, autofocus }) {
  return `
    <div data-field="${id}" class="mb-4">
      <label for="${id}" class="block text-[12px] font-label-bold text-on-surface-variant mb-1.5">${label}</label>
      <input id="${id}" name="${id}" type="${type || 'text'}" placeholder="${placeholder || ''}" ${autofocus ? 'autofocus' : ''}
        class="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-[13px] text-on-surface focus:ring-2 focus:ring-primary-container focus:border-transparent outline-none transition-all" />
    </div>`;
}

function authErrorHtml(id) {
  return `<p id="${id}" class="text-[12px] text-error mb-4 hidden" role="alert"></p>`;
}

function showAuthError(id, message) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
}

function renderAuthScreen() {
  renderLoginForm();
}

function renderLoginForm() {
  const mount = document.getElementById('authFormMount');
  if (!mount) return;
  mount.innerHTML = `
    <h2 class="font-headline-sm text-headline-sm text-on-surface mb-1">Log in</h2>
    <p class="text-[12px] text-on-surface-variant mb-5">Welcome back. Enter your details to continue.</p>
    <form id="loginForm" novalidate>
      ${authErrorHtml('loginFormError')}
      ${authFieldHtml({ id: 'loginEmail', label: 'Email', type: 'email', placeholder: 'you@example.com', autofocus: true })}
      ${authFieldHtml({ id: 'loginPassword', label: 'Password', type: 'password', placeholder: '••••••••' })}
      <button type="submit" id="loginSubmitBtn" class="w-full bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm mt-2">Log In</button>
    </form>
    <p class="text-center text-[12px] text-on-surface-variant mt-5">
      Don't have an account?
      <button type="button" id="gotoSignupBtn" class="text-primary font-label-bold hover:underline">Sign up</button>
    </p>`;

  document.getElementById('gotoSignupBtn').addEventListener('click', renderSignupForm);
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginSubmitBtn');
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if (!email.trim() || !password) {
      showAuthError('loginFormError', 'Enter your email and password.');
      return;
    }
    btn.disabled = true; btn.textContent = 'Logging in…';
    const result = await verifyLogin(email, password);
    if (!result.ok) {
      btn.disabled = false; btn.textContent = 'Log In';
      showAuthError('loginFormError', result.error);
      return;
    }
    completeAuth(result.account);
  });
}

function renderSignupForm() {
  const mount = document.getElementById('authFormMount');
  if (!mount) return;
  mount.innerHTML = `
    <h2 class="font-headline-sm text-headline-sm text-on-surface mb-1">Create your account</h2>
    <p class="text-[12px] text-on-surface-variant mb-5">Set up access to WashTrack Pro.</p>
    <form id="signupForm" novalidate>
      ${authErrorHtml('signupFormError')}
      ${authFieldHtml({ id: 'signupName', label: 'Full Name', placeholder: 'e.g. Jordan Lee', autofocus: true })}
      ${authFieldHtml({ id: 'signupEmail', label: 'Email', type: 'email', placeholder: 'you@example.com' })}
      ${authFieldHtml({ id: 'signupPassword', label: 'Password', type: 'password', placeholder: 'At least 6 characters' })}
      <div data-field="signupRole" class="mb-4">
        <label class="block text-[12px] font-label-bold text-on-surface-variant mb-1.5">Role</label>
        <div class="grid grid-cols-3 gap-2" id="signupRoleGroup" role="radiogroup" aria-label="Role">
          <button type="button" data-role-choice="admin" aria-pressed="false" class="role-choice-btn px-2 py-2.5 rounded-xl border border-outline-variant text-[11px] font-label-bold text-on-surface-variant hover:bg-surface-container-low transition-colors">Admin</button>
          <button type="button" data-role-choice="manager" aria-pressed="false" class="role-choice-btn px-2 py-2.5 rounded-xl border border-outline-variant text-[11px] font-label-bold text-on-surface-variant hover:bg-surface-container-low transition-colors">Manager</button>
          <button type="button" data-role-choice="technician" aria-pressed="true" class="role-choice-btn px-2 py-2.5 rounded-xl border border-outline-variant text-[11px] font-label-bold text-on-surface-variant hover:bg-surface-container-low transition-colors">Technician</button>
        </div>
        <p class="text-[10px] text-on-surface-variant mt-1.5">Technicians see a stripped-down "My Jobs Today" view; Admins and Managers see the full dashboard.</p>
      </div>
      <button type="submit" id="signupSubmitBtn" class="w-full bg-primary text-on-primary font-label-bold text-[12px] py-3 rounded-2xl hover:opacity-90 transition-all shadow-sm mt-2">Create Account</button>
    </form>
    <p class="text-center text-[12px] text-on-surface-variant mt-5">
      Already have an account?
      <button type="button" id="gotoLoginBtn" class="text-primary font-label-bold hover:underline">Log in</button>
    </p>`;

  let selectedRole = 'technician';
  const roleButtons = mount.querySelectorAll('[data-role-choice]');
  function syncRoleButtons() {
    roleButtons.forEach(b => {
      const active = b.dataset.roleChoice === selectedRole;
      b.classList.toggle('bg-primary-container', active);
      b.classList.toggle('text-on-primary-container', active);
      b.classList.toggle('border-primary', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }
  roleButtons.forEach(b => b.addEventListener('click', () => { selectedRole = b.dataset.roleChoice; syncRoleButtons(); }));
  syncRoleButtons();

  document.getElementById('gotoLoginBtn').addEventListener('click', renderLoginForm);
  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('signupSubmitBtn');
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    if (!name) { showAuthError('signupFormError', 'Enter your full name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthError('signupFormError', 'Enter a valid email address.'); return; }
    if (password.length < 6) { showAuthError('signupFormError', 'Password must be at least 6 characters.'); return; }
    btn.disabled = true; btn.textContent = 'Creating account…';
    const result = await signupAccount({ name, email, password, role: selectedRole });
    if (!result.ok) {
      btn.disabled = false; btn.textContent = 'Create Account';
      showAuthError('signupFormError', result.error);
      return;
    }
    completeAuth(result.account);
  });
}

/* Called after a successful login or signup: flips the app into
   the logged-in state and (re)runs script.js's app boot, which up
   to now was skipped because there was no session yet. */
function completeAuth(account) {
  document.documentElement.setAttribute('data-auth', 'in');
  applyRoleGating(account.role);
  updateHeaderProfile(account);
  if (typeof runAppBoot === 'function') runAppBoot(account);
  if (typeof toast === 'function') toast('Welcome, ' + account.name.split(' ')[0] + '.');
}
