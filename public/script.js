/* ============================================================
   PLANNER – SHARED JAVASCRIPT
   Handles: Auth, Navbar, Toast, API helpers, Page protection
   ============================================================ */

// Empty string = same origin. All apiRequest calls use relative paths like /api/login
const API_BASE = "";

/* ─── TOKEN HELPERS ─────────────────────────────────────── */
function getToken() { return localStorage.getItem('planner_token'); }
function setToken(t) { localStorage.setItem('planner_token', t); }
function getUser() { return JSON.parse(localStorage.getItem('planner_user') || 'null'); }
function setUser(u) { localStorage.setItem('planner_user', JSON.stringify(u)); }

function logout() {
    localStorage.removeItem('planner_token');
    localStorage.removeItem('planner_user');
    window.location.href = 'index.html';
}

/* ─── API HELPER ────────────────────────────────────────── */
async function apiRequest(endpoint, method = 'GET', body = null, multipart = false) {
    const headers = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!multipart) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = multipart ? body : JSON.stringify(body);

    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

/* ─── TOAST ─────────────────────────────────────────────── */
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; toast.style.transition = '0.3s ease'; setTimeout(() => toast.remove(), 350); }, 3000);
}

/* ─── NAVBAR ─────────────────────────────────────────────── */
function initNavbar() {
    const user = getUser();
    const rightContainer = document.querySelector('.navbar-right');
    const hamburgerHTML = `<button class="hamburger" id="hamburger"><span></span><span></span><span></span></button>`;

    if (user && rightContainer) {
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        // profileImage is now a base64 data URL – use directly as img src
        const imgUrl = user.profileImage || null;

        const avatarHtml = imgUrl
            ? `<img src="${imgUrl}" alt="${user.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
         <span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;">${initials}</span>`
            : `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;">${initials}</span>`;

        rightContainer.innerHTML = `
      <div class="nav-profile-wrap" id="nav-profile-wrap">
        <div class="nav-profile-btn" id="nav-profile-btn" title="${user.name}">
          ${avatarHtml}
        </div>
        <div class="nav-dropdown" id="nav-dropdown">
          <a href="profile.html">👤 View Profile</a>
          <button id="nav-logout-btn">🚪 Logout</button>
        </div>
      </div>
      ${hamburgerHTML}
    `;

        document.getElementById('nav-profile-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('nav-profile-wrap').classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            const wrap = document.getElementById('nav-profile-wrap');
            if (wrap && !wrap.contains(e.target)) {
                wrap.classList.remove('open');
            }
        });

        document.getElementById('nav-logout-btn').addEventListener('click', logout);
    } else if (rightContainer) {
        rightContainer.innerHTML = hamburgerHTML;
    }

    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
    }

    // Active nav link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.navbar-nav a').forEach(a => {
        if (a.getAttribute('href') === currentPage || (currentPage === '' && a.getAttribute('href') === 'index.html')) {
            a.classList.add('active');
        }
    });
}

/* ─── AUTH MODAL ────────────────────────────────────────── */
function initAuthModal() {
    const isProtected = document.body.dataset.protected === 'true';
    if (!isProtected) return;

    if (!getToken()) {
        openAuthModal();
    }

    const overlay = document.getElementById('auth-modal');
    const loginTab = document.getElementById('tab-login');
    const regTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');

    if (!overlay) return;

    function switchTab(tab) {
        loginTab.classList.toggle('active', tab === 'login');
        regTab.classList.toggle('active', tab === 'register');
        loginForm.style.display = tab === 'login' ? 'block' : 'none';
        regForm.style.display = tab === 'register' ? 'block' : 'none';
    }

    loginTab.addEventListener('click', () => switchTab('login'));
    regTab.addEventListener('click', () => switchTab('register'));

    // Login submit
    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errEl = document.getElementById('login-error');
        try {
            const data = await apiRequest('/api/login', 'POST', { email, password });
            setToken(data.token);
            setUser(data.user);
            closeAuthModal();
            initNavbar();
            showToast(`Welcome back, ${data.user.name}!`, 'success');
            if (typeof onAuthSuccess === 'function') onAuthSuccess();
        } catch (err) {
            errEl.textContent = err.message;
        }
    });

    // Register submit
    regForm.addEventListener('submit', async e => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const errEl = document.getElementById('reg-error');
        try {
            const data = await apiRequest('/api/register', 'POST', { name, email, password });
            setToken(data.token);
            setUser(data.user);
            closeAuthModal();
            initNavbar();
            showToast(`Welcome, ${data.user.name}! 🎉`, 'success');
            if (typeof onAuthSuccess === 'function') onAuthSuccess();
        } catch (err) {
            errEl.textContent = err.message;
        }
    });
}

function openAuthModal() {
    const overlay = document.getElementById('auth-modal');
    if (overlay) overlay.classList.add('open');
}

function closeAuthModal() {
    const overlay = document.getElementById('auth-modal');
    if (overlay) overlay.classList.remove('open');
}

/* ─── AUTH MODAL HTML SNIPPET (injected per page) ────────── */
function createAuthModalHTML() {
    return `
  <div class="modal-overlay auth-modal" id="auth-modal">
    <div class="modal" style="max-width:420px">
      <div class="modal-header">
        <h2>🗓️ Welcome to Planner</h2>
      </div>
      <div class="modal-body">
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-login">Login</button>
          <button class="auth-tab" id="tab-register">Register</button>
        </div>
        <form id="login-form">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="login-email" placeholder="your@email.com" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="login-password" placeholder="••••••••" required>
          </div>
          <p id="login-error" style="color:#dc2626;font-size:0.85rem;margin-bottom:0.75rem;"></p>
          <button type="submit" class="btn btn-primary btn-full">Login</button>
        </form>
        <form id="register-form" style="display:none">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="reg-name" placeholder="John Doe" required>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="reg-email" placeholder="your@email.com" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="reg-password" placeholder="Min. 6 characters" required minlength="6">
          </div>
          <p id="reg-error" style="color:#dc2626;font-size:0.85rem;margin-bottom:0.75rem;"></p>
          <button type="submit" class="btn btn-primary btn-full">Create Account</button>
        </form>
      </div>
    </div>
  </div>`;
}

/* ─── GLOBAL PLANNER MODAL ────────────────────────────── */
async function openPlanner(id) {
    let modal = document.getElementById('global-view-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'global-view-modal';
        modal.innerHTML = `
      <div class="modal" style="max-width:680px">
          <div class="modal-header">
              <h2 id="global-modal-date-title">Planner</h2>
              <button class="modal-close" id="global-close-view">&times;</button>
          </div>
          <div class="modal-body" id="global-modal-body"></div>
      </div>
    `;
        document.body.appendChild(modal);

        document.getElementById('global-close-view').addEventListener('click', () => {
            modal.classList.remove('open');
        });
        modal.addEventListener('click', e => {
            if (e.target === modal) modal.classList.remove('open');
        });
    }

    try {
        const p = await apiRequest(`/api/planner/${id}`);
        const dateLabel = new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('global-modal-date-title').textContent = `📅 ${dateLabel}`;

        const escapeHtml = (text) => {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        };

        const scheduleSections = (p.schedule || []).filter(s => s.task).map(s =>
            `<div class="schedule-block"><span class="time-label">${s.time}</span><span style="font-size:0.88rem">${escapeHtml(s.task)}</span></div>`
        ).join('');

        const todosSection = (p.todos || []).map(t =>
            `<div class="todo-item" style="pointer-events:none">
          <input type="checkbox" ${t.done ? 'checked' : ''} style="width:16px;height:16px;" disabled />
          <span style="font-size:0.88rem;${t.done ? 'text-decoration:line-through;color:#888' : ''}">${escapeHtml(t.text)}</span>
        </div>`
        ).join('');

        document.getElementById('global-modal-body').innerHTML = `
      ${scheduleSections ? `<div class="card-header" style="margin-bottom:0.75rem">⏰ Schedule</div>${scheduleSections}` : ''}
      ${p.priorities?.length ? `<div class="card-header" style="margin-top:1.25rem;margin-bottom:0.5rem">🏆 Priorities</div>
        ${p.priorities.map((pr, i) => `<div class="priority-item"><div class="priority-badge">${i + 1}</div><span style="font-size:0.88rem">${escapeHtml(pr)}</span></div>`).join('')}` : ''}
      ${todosSection ? `<div class="card-header" style="margin-top:1.25rem;margin-bottom:0.5rem">✅ To-Do List</div>${todosSection}` : ''}
      ${p.note ? `<div class="card-header" style="margin-top:1.25rem;margin-bottom:0.5rem">📝 Note</div><p style="font-size:0.88rem;color:var(--text-mid);white-space:pre-line">${escapeHtml(p.note)}</p>` : ''}
      ${p.tomorrow ? `<div class="card-header" style="margin-top:1.25rem;margin-bottom:0.5rem">🌅 For Tomorrow</div><p style="font-size:0.88rem;color:var(--text-mid);white-space:pre-line">${escapeHtml(p.tomorrow)}</p>` : ''}
    `;
        modal.classList.add('open');
    } catch (e) {
        showToast(e.message, 'error');
    }
}

/* ─── INIT ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initAuthModal();
});
