/* ==========================================================================
   JOB TRACKER DASHBOARD — app.js
   --------------------------------------------------------------------------
   Sections in this file (search for the headers below when explaining code):
     1. CONSTANTS & STATE
     2. LOCALSTORAGE HELPERS
     3. SEED DATA
     4. AUTH (frontend-only)
     5. THEME (dark mode)
     6. TOASTS
     7. RENDERING (stats cards + job cards)
     8. DERIVED LIST (search + filter + sort pipeline)
     9. CRUD (create / edit / delete)
     10. EVENT WIRING
   ========================================================================== */

/* ---------------------------------------------------------------------- *
 * 1. CONSTANTS & STATE
 * ---------------------------------------------------------------------- */
const STORAGE_KEY = 'jobtracker_jobs';       // where job records live in localStorage
const AUTH_KEY = 'jobtracker_auth';          // holds the "logged in" flag + fake user email
const THEME_KEY = 'jobtracker_theme';        // 'light' | 'dark'

// In-memory copy of everything. We always read from here for rendering,
// and we always write back to localStorage after mutating it — that pairing
// (mutate state -> persist -> re-render) is the core loop of this app.
let jobs = [];

// Tracks which job (if any) is currently open in the edit modal / delete modal.
let editingJobId = null;
let deletingJobId = null;

/* ---------------------------------------------------------------------- *
 * 2. LOCALSTORAGE HELPERS
 *    Small wrapper functions so the rest of the app never touches
 *    localStorage/JSON.parse directly — keeps persistence in one place.
 * ---------------------------------------------------------------------- */
function loadJobs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Corrupted job data in localStorage, ignoring.', e);
    return null;
  }
}

function saveJobs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

/* ---------------------------------------------------------------------- *
 * 3. SEED DATA
 *    First-run only: gives the dashboard something to show instead of a
 *    blank slate, which makes the empty-state / stats logic easy to demo.
 * ---------------------------------------------------------------------- */
function seedJobs() {
  const today = new Date();
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };

  return [
    { id: crypto.randomUUID(), company: 'Google', role: 'Frontend Engineer Intern', status: 'Interview', date: daysAgo(3), location: 'Bengaluru, India', url: '', notes: 'Recruiter screen done, technical round scheduled next week.' },
    { id: crypto.randomUUID(), company: 'Zomato', role: 'SDE-1', status: 'Applied', date: daysAgo(7), location: 'Gurugram, India', url: '', notes: 'Applied via referral from college senior.' },
    { id: crypto.randomUUID(), company: 'Razorpay', role: 'Frontend Developer', status: 'Offer', date: daysAgo(20), location: 'Remote', url: '', notes: 'Offer received, negotiating start date.' },
    { id: crypto.randomUUID(), company: 'Freshworks', role: 'Associate Software Engineer', status: 'Rejected', date: daysAgo(30), location: 'Chennai, India', url: '', notes: 'Rejected after final round.' },
    { id: crypto.randomUUID(), company: 'Swiggy', role: 'React Developer', status: 'Applied', date: daysAgo(1), location: 'Bengaluru, India', url: '', notes: '' },
  ];
}

/* ---------------------------------------------------------------------- *
 * 4. AUTH (frontend-only demo)
 *    There is no backend, so "auth" just means: store a flag + email in
 *    localStorage and gate which of the two top-level sections is visible.
 *    This is exactly what an interviewer will probe — be upfront that it's
 *    UI-only and explain how a real JWT/session flow would replace it.
 * ---------------------------------------------------------------------- */
function isLoggedIn() {
  return !!localStorage.getItem(AUTH_KEY);
}

function login(email) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ email }));
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  showLogin();
}

function showLogin() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
  document.getElementById('userLabel').textContent = auth.email ? `Signed in as ${auth.email}` : '';
  renderAll();
}

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');

  // Only validation that exists client-side: non-empty email + 4+ char password.
  if (!email || password.length < 4) {
    errorEl.textContent = 'Enter a valid email and a password of 4+ characters.';
    errorEl.classList.remove('hidden');
    return;
  }
  errorEl.classList.add('hidden');
  login(email);
  showApp();
  showToast(`Welcome back, ${email.split('@')[0]}!`, 'success');
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  showToast('Logged out.', 'info');
  setTimeout(logout, 300);
});

/* ---------------------------------------------------------------------- *
 * 5. THEME (dark mode)
 *    Tailwind's class-based dark mode: toggling `dark` on <html> flips
 *    every `dark:` utility class at once. We persist the choice so it
 *    survives a page reload.
 * ---------------------------------------------------------------------- */
function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.getElementById('themeIconSun').classList.toggle('hidden', isDark);
  document.getElementById('themeIconMoon').classList.toggle('hidden', !isDark);
  localStorage.setItem(THEME_KEY, theme);
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ---------------------------------------------------------------------- *
 * 6. TOASTS
 *    A tiny, dependency-free toast system: push a div into the fixed
 *    container, animate it in, auto-remove after a delay.
 * ---------------------------------------------------------------------- */
function showToast(message, type = 'info') {
  const styles = {
    success: 'bg-emerald-600',
    error: 'bg-rose-600',
    info: 'bg-slate-800 dark:bg-slate-700',
  };
  const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast-in ${styles[type]} text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;

  const container = document.getElementById('toastContainer');
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('toast-in');
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 2800);
}

/* ---------------------------------------------------------------------- *
 * 7. RENDERING
 * ---------------------------------------------------------------------- */
function renderAll() {
  renderStats();
  renderJobs();
}

function renderStats() {
  const counts = { Applied: 0, Interview: 0, Offer: 0, Rejected: 0 };
  jobs.forEach((j) => { counts[j.status] = (counts[j.status] || 0) + 1; });

  const cards = [
    { label: 'Total', value: jobs.length, color: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800' },
    { label: 'Applied', value: counts.Applied, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950' },
    { label: 'Interview', value: counts.Interview, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950' },
    { label: 'Offer', value: counts.Offer, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950' },
    { label: 'Rejected', value: counts.Rejected, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950' },
  ];

  document.getElementById('statsGrid').innerHTML = cards.map((c) => `
    <div class="rounded-2xl p-4 ${c.bg} border border-slate-200/60 dark:border-slate-800">
      <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">${c.label}</p>
      <p class="text-2xl font-bold ${c.color}">${c.value}</p>
    </div>
  `).join('');
}

function statusBadgeClasses(status) {
  const map = {
    Applied: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
    Interview: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    Offer: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    Rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  };
  return map[status] || map.Applied;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderJobs() {
  const list = getVisibleJobs();
  const grid = document.getElementById('jobGrid');
  const empty = document.getElementById('emptyState');

  if (list.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    empty.classList.add('show');
    return;
  }
  empty.classList.add('hidden');
  empty.classList.remove('show');

  grid.innerHTML = list.map((job) => `
    <div class="card-in status-${job.status} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="font-semibold truncate">${escapeHtml(job.role)}</h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 truncate">${escapeHtml(job.company)}</p>
        </div>
        <span class="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadgeClasses(job.status)}">${job.status}</span>
      </div>

      <div class="text-xs text-slate-500 dark:text-slate-400 space-y-1">
        <p>📅 Applied: ${formatDate(job.date)}</p>
        ${job.location ? `<p>📍 ${escapeHtml(job.location)}</p>` : ''}
      </div>

      ${job.notes ? `<p class="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">${escapeHtml(job.notes)}</p>` : ''}

      <div class="flex gap-2 mt-auto pt-1">
        <button data-edit="${job.id}" class="flex-1 text-xs font-semibold py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Edit</button>
        <button data-delete="${job.id}" class="flex-1 text-xs font-semibold py-2 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors">Delete</button>
      </div>
    </div>
  `).join('');
}

// Prevents any stored text (e.g. a note) from being interpreted as HTML.
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/* ---------------------------------------------------------------------- *
 * 8. DERIVED LIST
 *    The visible list is never mutated or stored — it's recomputed from
 *    `jobs` + the current search/filter/sort controls every render.
 *    This keeps `jobs` as the single source of truth.
 * ---------------------------------------------------------------------- */
function getVisibleJobs() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const sort = document.getElementById('sortSelect').value;

  let result = jobs.filter((j) => {
    const matchesQuery = !query ||
      j.company.toLowerCase().includes(query) ||
      j.role.toLowerCase().includes(query);
    const matchesStatus = status === 'all' || j.status === status;
    return matchesQuery && matchesStatus;
  });

  result.sort((a, b) => {
    switch (sort) {
      case 'dateAsc': return new Date(a.date) - new Date(b.date);
      case 'companyAsc': return a.company.localeCompare(b.company);
      case 'companyDesc': return b.company.localeCompare(a.company);
      case 'dateDesc':
      default: return new Date(b.date) - new Date(a.date);
    }
  });

  return result;
}

/* ---------------------------------------------------------------------- *
 * 9. CRUD
 * ---------------------------------------------------------------------- */
function openJobModal(job = null) {
  editingJobId = job ? job.id : null;
  document.getElementById('modalTitle').textContent = job ? 'Edit Job Application' : 'Add Job Application';
  document.getElementById('jobId').value = job ? job.id : '';
  document.getElementById('companyInput').value = job ? job.company : '';
  document.getElementById('roleInput').value = job ? job.role : '';
  document.getElementById('statusInput').value = job ? job.status : 'Applied';
  document.getElementById('dateInput').value = job ? job.date : new Date().toISOString().slice(0, 10);
  document.getElementById('locationInput').value = job ? job.location : '';
  document.getElementById('urlInput').value = job ? job.url : '';
  document.getElementById('notesInput').value = job ? job.notes : '';

  const overlay = document.getElementById('jobModalOverlay');
  overlay.classList.remove('hidden');
  overlay.querySelector('.bg-white, .dark\\:bg-slate-900').classList.add('modal-pop');
}

function closeJobModal() {
  document.getElementById('jobModalOverlay').classList.add('hidden');
  editingJobId = null;
}

document.getElementById('jobForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const payload = {
    company: document.getElementById('companyInput').value.trim(),
    role: document.getElementById('roleInput').value.trim(),
    status: document.getElementById('statusInput').value,
    date: document.getElementById('dateInput').value,
    location: document.getElementById('locationInput').value.trim(),
    url: document.getElementById('urlInput').value.trim(),
    notes: document.getElementById('notesInput').value.trim(),
  };

  if (editingJobId) {
    // UPDATE: find the record and merge new fields into it.
    jobs = jobs.map((j) => (j.id === editingJobId ? { ...j, ...payload } : j));
    showToast('Application updated.', 'success');
  } else {
    // CREATE: new record gets a fresh UUID.
    jobs.push({ id: crypto.randomUUID(), ...payload });
    showToast('Application added.', 'success');
  }

  saveJobs();
  closeJobModal();
  renderAll();
});

function openDeleteModal(id) {
  deletingJobId = id;
  document.getElementById('deleteModalOverlay').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteModalOverlay').classList.add('hidden');
  deletingJobId = null;
}

document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
  jobs = jobs.filter((j) => j.id !== deletingJobId);
  saveJobs();
  closeDeleteModal();
  renderAll();
  showToast('Application deleted.', 'info');
});

/* ---------------------------------------------------------------------- *
 * 10. EVENT WIRING
 * ---------------------------------------------------------------------- */
document.getElementById('addJobBtn').addEventListener('click', () => openJobModal());
document.getElementById('emptyAddBtn').addEventListener('click', () => openJobModal());
document.getElementById('closeModalBtn').addEventListener('click', closeJobModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeJobModal);
document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);

// Event delegation: one listener on the grid handles Edit/Delete for every
// card, including ones added after the initial render.
document.getElementById('jobGrid').addEventListener('click', (e) => {
  const editId = e.target.closest('[data-edit]')?.dataset.edit;
  const deleteId = e.target.closest('[data-delete]')?.dataset.delete;
  if (editId) openJobModal(jobs.find((j) => j.id === editId));
  if (deleteId) openDeleteModal(deleteId);
});

// Re-render on every control change (debounced for the text input so we
// aren't re-rendering on literally every keystroke's frame).
let searchDebounce;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(renderJobs, 150);
});
document.getElementById('statusFilter').addEventListener('change', renderJobs);
document.getElementById('sortSelect').addEventListener('change', renderJobs);

// Click outside modal content closes it.
document.getElementById('jobModalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'jobModalOverlay') closeJobModal();
});
document.getElementById('deleteModalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'deleteModalOverlay') closeDeleteModal();
});

/* ---------------------------------------------------------------------- *
 * INIT
 * ---------------------------------------------------------------------- */
(function init() {
  // Theme: default to system preference on first visit.
  const savedTheme = localStorage.getItem(THEME_KEY) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  applyTheme(savedTheme);

  // Jobs: load from storage, or seed with demo data on first run.
  const stored = loadJobs();
  if (stored) {
    jobs = stored;
  } else {
    jobs = seedJobs();
    saveJobs();
  }

  // Auth gate.
  if (isLoggedIn()) {
    showApp();
  } else {
    showLogin();
  }
})();
