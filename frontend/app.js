/* ──────────────────────────────────────────────────────────
   CRAG — app.js  |  Frontend logic (Firebase/Firestore Edition)
   ────────────────────────────────────────────────────────── */

// db is initialized in index.html before this script loads
console.log('[CRAG] app.js loaded successfully (Firebase Edition)');

// ── DOM Refs ─────────────────────────────────────────────
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const navBtns = $$('.nav-btn');
const panes = $$('.pane');
const pageTitle = $('#page-title');
// Elements
let clockElement, liveIndicator, vendorForm, vendorTbody, vendorLive, alertList, alertCountEl, auditTbody, sidebar, sidebarToggle, sidebarOverlay;

// Auth DOM Refs
let landingPage, loginModal, appShell, loginForm, loginUser, loginPass, loginError, roleBtnAdmin, roleBtnVendor, loggedInAs, btnResetAlerts, btnResetAudit, engineToggle;

function initDOMRefs() {
    clockElement = document.getElementById('clock');
    liveIndicator = document.getElementById('engine-status');
    vendorForm = $('#vendor-form');
    vendorTbody = document.getElementById('vendor-tbody');
    vendorLive = document.getElementById('vendor-live-list');
    alertList = document.getElementById('alerts-list');
    alertCountEl = document.getElementById('alert-count');
    auditTbody = document.getElementById('audit-log-body');
    sidebar = $('#sidebar');
    sidebarToggle = $('#sidebar-toggle');
    sidebarOverlay = $('#sidebar-overlay');

    landingPage = document.getElementById('landing-page');
    loginModal = document.getElementById('login-modal');
    appShell = document.getElementById('app-shell');
    loginForm = document.getElementById('login-form');
    loginUser = document.getElementById('login-user');
    loginPass = document.getElementById('login-pass');
    loginError = document.getElementById('login-error');
    roleBtnAdmin = $('#role-admin');
    roleBtnVendor = $('#role-vendor');
    loggedInAs = $('#logged-in-as');
    btnResetAlerts = $('#btn-reset-alerts');
    btnResetAudit = $('#btn-reset-audit');
    engineToggle = $('#engine-toggle');
}

let riskChart = null;
let previousAlertCount = 0;

// ── Auth & Session Management ────────────────────────────
const CREDENTIALS = {
    'admin': { pass: 'crag2026', role: 'Admin', name: 'System Administrator' },
    'acme': { pass: 'vendor123', role: 'Vendor', vendorId: 2, name: 'Acme Cloud Services' },
    'securepay': { pass: 'vendor123', role: 'Vendor', vendorId: 3, name: 'SecurePay Inc' },
    'dataminds': { pass: 'vendor123', role: 'Vendor', vendorId: 4, name: 'DataMinds Analytics' },
    'progvision': { pass: 'vendor123', role: 'Vendor', vendorId: 5, name: 'ProgVision' },
    'cybershield': { pass: 'vendor123', role: 'Vendor', vendorId: 6, name: 'CyberShield Pro' }
};

let currentRole = 'admin'; // active role toggle in login
let currentUser = JSON.parse(sessionStorage.getItem('crag_user') || 'null');

function setLoginRole(role) {
    currentRole = role;
    const ra = roleBtnAdmin || $('#role-admin');
    const rv = roleBtnVendor || $('#role-vendor');
    if (ra) ra.classList.toggle('active', role === 'admin');
    if (rv) rv.classList.toggle('active', role === 'vendor');
    const hints = $('#login-hints');
    if (hints) hints.innerHTML = role === 'admin'
        ? '<small><strong>Demo:</strong> admin / crag2026</small>'
        : '<small><strong>Demo:</strong> acme / vendor123</small>';
}

function showLogin() {
    const modal = loginModal || document.getElementById('login-modal');
    const errEl = loginError || document.getElementById('login-error');
    const userEl = loginUser || document.getElementById('login-user');
    const passEl = loginPass || document.getElementById('login-pass');
    if (!modal) return;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    if (errEl) errEl.style.display = 'none';
    if (userEl) userEl.value = '';
    if (passEl) passEl.value = '';
    if (userEl) userEl.focus();
}

function closeLogin() {
    const modal = loginModal || document.getElementById('login-modal');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

function showLanding() {
    const lp = landingPage || document.getElementById('landing-page');
    const as = appShell || document.getElementById('app-shell');
    if (lp) lp.style.display = 'block';
    if (as) as.style.display = 'none';
    document.body.style.overflowY = 'auto';
}

function showApp() {
    closeLogin();
    const lp = landingPage || document.getElementById('landing-page');
    const as = appShell || document.getElementById('app-shell');
    if (lp) lp.style.display = 'none';
    if (as) as.style.display = 'flex';

    // UI adjustments based on role
    const lia = loggedInAs || $('#logged-in-as');
    if (lia && currentUser) {
        lia.textContent = currentUser.role === 'Admin' ? 'System Admin' : currentUser.name;
    }

    const titleEl = $('#page-title');
    if (titleEl && currentUser && currentUser.role === 'Vendor') {
        titleEl.textContent = `Dashboard — ${currentUser.name}`;
    }

    if (currentUser.role === 'Vendor') {
        $('.sidebar-brand').style.background = 'linear-gradient(135deg, var(--accent), var(--low))';
        $('.sidebar-brand').style.padding = '15px';
        $('.sidebar-brand').style.borderRadius = '8px';
        $('.sidebar-brand').style.margin = '10px';

        // Hide Admin-only features
        $('#nav-vendors').style.display = 'none';
        $('#nav-audit').style.display = 'none';

        const navVendorsAdd = $('#nav-vendors-add');
        if (navVendorsAdd) navVendorsAdd.style.display = 'none';

        if (btnResetAlerts) btnResetAlerts.style.display = 'none';
        if (btnResetAudit) btnResetAudit.style.display = 'none';
        if (engineToggle) engineToggle.style.display = 'none';

        // Redirect to dashboard if on forbidden page
        if (['vendors', 'audit'].includes($('.nav-btn.active').dataset.pane)) {
            $('#nav-dashboard').click();
        }
    } else {
        // Admin View
        $('#nav-vendors').style.display = 'flex';
        $('#nav-audit').style.display = 'flex';

        const navVendorsAdd = $('#nav-vendors-add');
        if (navVendorsAdd) navVendorsAdd.style.display = 'block';

        if (btnResetAlerts) btnResetAlerts.style.display = 'block';
        if (btnResetAudit) btnResetAudit.style.display = 'block';
        if (engineToggle) engineToggle.style.display = 'flex';
    }

    refreshAll();
    syncEngineStatus();
}

function handleLogin(e) {
    e.preventDefault();
    const userEl = loginUser || document.getElementById('login-user');
    const passEl = loginPass || document.getElementById('login-pass');
    const errEl = loginError || document.getElementById('login-error');
    const formEl = loginForm || document.getElementById('login-form');
    if (!userEl || !passEl) return;
    const user = userEl.value.toLowerCase();
    const pass = passEl.value;

    if (CREDENTIALS[user] && CREDENTIALS[user].pass === pass) {
        currentUser = { ...CREDENTIALS[user], username: user };
        sessionStorage.setItem('crag_user', JSON.stringify(currentUser));
        showApp();
        toast(`Welcome back, ${currentUser.name}!`);
    } else {
        if (errEl) errEl.style.display = 'block';
        if (formEl) formEl.classList.add('shake');
        if (formEl) setTimeout(() => formEl.classList.remove('shake'), 400);
    }
}

function doLogout() {
    if (!confirm('Are you sure you want to logout?')) return;
    sessionStorage.removeItem('crag_user');
    currentUser = null;
    showLanding();
}

// (loginForm listener is attached inside attachGlobalEvents after DOMContentLoaded)

function checkInitialAuth() {
    if (currentUser) {
        showApp();
    } else {
        showLanding();
    }
}

// Initial check
document.addEventListener('DOMContentLoaded', () => {
    initDOMRefs();
    initChatRefs();
    initVendorForm();
    attachGlobalEvents();
    checkInitialAuth();

    // Seed Firestore with initial vendors if empty
    seedFirestoreIfEmpty();
});

function attachGlobalEvents() {
    // Navigation
    const navButtons = $$('.nav-btn');
    const panesList = $$('.pane');
    const titleEl = $('#page-title');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.pane;
            if (target) switchView(target);
        });
    });

    // Header Alerts click
    const headerAlerts = $('#header-alerts');
    if (headerAlerts) {
        headerAlerts.addEventListener('click', () => switchView('alerts'));
    }

    // Sidebar Toggle (Mobile)
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (sidebar) sidebar.classList.add('active');
            if (sidebarOverlay) sidebarOverlay.classList.add('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            if (sidebar) sidebar.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        });
    }

    // Auth
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (loginModal) {
        loginModal.addEventListener('click', (e) => {
            if (e.target === loginModal) closeLogin();
        });
    }

    // Admin Controls
    if (btnResetAlerts) {
        btnResetAlerts.addEventListener('click', async () => {
            if (!confirm('Reset all alerts? This action cannot be undone.')) return;
            try {
                await resetCollection('alerts');
                toast('All alerts have been cleared');
                refreshAll();
            } catch (e) { toast('Failed to reset alerts', 'error'); }
        });
    }

    if (btnResetAudit) {
        btnResetAudit.addEventListener('click', async () => {
            if (!confirm('Reset the entire audit log? This action cannot be undone.')) return;
            try {
                await resetCollection('audit_log');
                toast('Audit log has been cleared');
                refreshAll();
            } catch (e) { toast('Failed to reset audit log', 'error'); }
        });
    }

    if (engineToggle) {
        engineToggle.addEventListener('click', async () => {
            const newState = !enginePaused;
            // Optimistic UI update
            enginePaused = newState;
            updateEngineUI(enginePaused);
            toast(enginePaused ? '⏸ Risk engine paused' : '▶ Risk engine activated');
            // Sync globally
            try {
                await db.collection('system').doc('engine').set({ paused: newState });
            } catch (e) { console.error('Failed to sync engine state'); }
        });
    }
}
window.setLoginRole = setLoginRole;
window.showLogin = showLogin;
window.showLanding = showLanding;
window.doLogout = doLogout;
window.showApp = showApp;
window.openVendorModal = openVendorModal;
window.deleteVendor = deleteVendor;

// (Navigation, Sidebar, and Admin Controls are handled in attachGlobalEvents above)

// ── Clock ────────────────────────────────────────────────
function tickClock() {
    const el = clockElement || document.getElementById('clock');
    if (el) {
        el.textContent = new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZone: 'Asia/Kolkata'
        });
    }
}
setInterval(tickClock, 1000);
tickClock();

// ── Toast Notifications ──────────────────────────────────
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ══════════════════════════════════════════════════════════
//  FIRESTORE DATA LAYER (replaces REST API)
// ══════════════════════════════════════════════════════════

// ── Helper: Get all docs from a collection ───────────────
async function getCollection(name, orderByField, orderDir = 'desc', limitCount = 500) {
    let ref = db.collection(name);
    if (orderByField) ref = ref.orderBy(orderByField, orderDir);
    if (limitCount) ref = ref.limit(limitCount);
    const snap = await ref.get();
    return snap.docs.map(d => ({ id: d.id, _numId: d.data().numId || 0, ...d.data() }));
}

// ── Helper: Delete all docs in a collection ──────────────
async function resetCollection(name) {
    const snap = await db.collection(name).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
}

// ── Helper: Get next numeric ID ──────────────────────────
async function getNextId(collectionName) {
    const snap = await db.collection(collectionName).orderBy('numId', 'desc').limit(1).get();
    if (snap.empty) return 1;
    return (snap.docs[0].data().numId || 0) + 1;
}

// ── Seed Firestore with initial vendors if empty ─────────
async function seedFirestoreIfEmpty() {
    try {
        const snap = await db.collection('vendors').limit(1).get();
        if (!snap.empty) return; // already seeded

        console.log('[CRAG] Seeding Firestore with initial vendors...');
        const vendors = [
            { name: "Acme Cloud Services", category: "Cloud Provider", criticality: "High", status: "Active" },
            { name: "SecurePay Inc", category: "Payment Processor", criticality: "Critical", status: "Active" },
            { name: "DataMinds Analytics", category: "Data Analytics", criticality: "Medium", status: "Active" },
            { name: "ProgVision", category: "Consulting", criticality: "Low", status: "Active" },
            { name: "CyberShield Pro", category: "Security Vendor", criticality: "Critical", status: "Active" },
        ];

        const batch = db.batch();
        vendors.forEach((v, i) => {
            const numId = i + 2; // start from 2 to match original IDs
            const initialScore = Math.round((Math.random() * 50 + 5) * 10) / 10;
            const level = initialScore <= 40 ? "Low" : (initialScore <= 70 ? "Medium" : "High");
            const now = new Date().toISOString();
            const ref = db.collection('vendors').doc();
            batch.set(ref, {
                numId,
                name: v.name,
                category: v.category,
                criticality: v.criticality,
                status: v.status,
                risk_score: initialScore,
                risk_level: level,
                created_at: now,
                updated_at: now,
            });
        });
        await batch.commit();

        // Add audit entries for seeded vendors
        const vendorSnap = await db.collection('vendors').get();
        const auditBatch = db.batch();
        let auditId = 1;
        vendorSnap.docs.forEach(d => {
            const v = d.data();
            const ref = db.collection('audit_log').doc();
            auditBatch.set(ref, {
                numId: auditId++,
                vendor_id: v.numId,
                vendor_name: v.name,
                action: "VENDOR_CREATED",
                details: `Category: ${v.category}, Criticality: ${v.criticality}`,
                timestamp: new Date().toISOString(),
            });
        });
        await auditBatch.commit();
        console.log('[CRAG] Firestore seeded successfully!');

        // Refresh after seeding
        if (currentUser) refreshAll();
    } catch (e) {
        console.error('[CRAG] Seed error:', e);
    }
}

// ── Format Helpers ───────────────────────────────────────
function fmtTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

function riskColor(level) {
    if (level === 'Low') return 'var(--low)';
    if (level === 'Medium') return 'var(--med)';
    return 'var(--high)';
}

function riskClass(level) {
    return level.toLowerCase();
}

// ── Vendor Verification Simulator ────────────────────────
function simulateOSINTVerification(name, domain) {
    // Basic heuristics for a fake "AI/OSINT scan"
    const isSuspiciousName = name.length < 3 || /^[0-9]+$/.test(name) || /^[a-z]\1{3,}$/i.test(name);
    const validDomain = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain);

    if (isSuspiciousName || !validDomain) {
        return {
            status: 'Unverified',
            ssl: 'Invalid/Missing',
            ports: '22, 3389 (Exposed)',
            breach: 'Unknown entities',
            domainAge: '< 30 days',
        };
    }

    // "Legit" mock data
    const hasBreach = Math.random() < 0.2; // 20% chance
    const ports = Math.random() < 0.5 ? '443, 80' : '443';
    return {
        status: 'Verified',
        ssl: 'Valid (RSA 2048)',
        ports: ports,
        breach: hasBreach ? '1 known (2021)' : 'None found',
        domainAge: `${Math.floor(Math.random() * 10 + 2)} years`,
    };
}

// ── Vendor Form Submit ───────────────────────────────────
function initVendorForm() {
    const vf = vendorForm || $('#vendor-form');
    if (!vf) return;
    vf.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: $('#v-name').value.trim(),
            category: $('#v-category').value,
            domain: $('#v-domain').value.trim(),
            criticality: $('#v-criticality').value,
            status: $('#v-status').value,
        };

        // Basic name validation
        if (!payload.name || payload.name.length < 3 || /^[0-9]+$/.test(payload.name)) {
            toast('Please enter a valid, descriptive vendor name.', 'error');
            return;
        }

        if (!payload.domain || !payload.category || !payload.criticality) return;

        try {
            const numId = await getNextId('vendors');
            const initialScore = Math.round((Math.random() * 50 + 5) * 10) / 10;
            const level = initialScore <= 40 ? "Low" : (initialScore <= 70 ? "Medium" : "High");
            const now = new Date().toISOString();

            const osintData = simulateOSINTVerification(payload.name, payload.domain);

            await db.collection('vendors').add({
                numId,
                name: payload.name,
                domain: payload.domain,
                category: payload.category,
                criticality: payload.criticality,
                status: payload.status,
                risk_score: initialScore,
                risk_level: level,
                verification: osintData.status,
                osint: osintData,
                created_at: now,
                updated_at: now,
            });

            // Audit log
            const auditId = await getNextId('audit_log');
            await db.collection('audit_log').add({
                numId: auditId,
                vendor_id: numId,
                vendor_name: payload.name,
                action: "VENDOR_CREATED",
                details: `Category: ${payload.category}, Criticality: ${payload.criticality}`,
                timestamp: now,
            });

            vf.reset();
            toast(`${payload.name} onboarded successfully!`);
            refreshAll();
        } catch (err) {
            console.error(err);
            toast('Failed to add vendor', 'error');
        }
    });
}

// ── Delete Vendor ────────────────────────────────────────
async function deleteVendor(numId, name) {
    if (!confirm(`Delete vendor "${name}"?`)) return;
    try {
        // Find the Firestore doc by numId
        const snap = await db.collection('vendors').where('numId', '==', numId).get();
        if (snap.empty) { toast('Vendor not found', 'error'); return; }
        const batch = db.batch();
        snap.docs.forEach(d => batch.delete(d.ref));

        // Audit log
        const auditId = await getNextId('audit_log');
        const auditRef = db.collection('audit_log').doc();
        batch.set(auditRef, {
            numId: auditId,
            vendor_id: numId,
            vendor_name: name,
            action: "VENDOR_DELETED",
            details: `Removed vendor ${name}`,
            timestamp: new Date().toISOString(),
        });

        await batch.commit();
        toast(`${name} removed`);
        refreshAll();
    } catch (err) {
        console.error(err);
        toast('Delete failed', 'error');
    }
}

// ── Render: Vendor Table ─────────────────────────────────
function renderVendorTable(vendors) {
    if (!vendors.length) {
        vendorTbody.innerHTML = '<tr><td colspan="8" class="empty-state">No vendors registered yet.</td></tr>';
        return;
    }
    const isAdmin = currentUser && currentUser.role === 'Admin';
    vendorTbody.innerHTML = vendors.map(v => {
        const vbadge = v.verification === 'Verified' ? '<span class="badge-verified">✔ Verified</span>' : '<span class="badge-unverified">⚠ Unverified</span>';

        return `
    <tr>
      <td>${v.numId || v.id}</td>
      <td style="color:var(--text);font-weight:600">${v.name}</td>
      <td>${v.category}</td>
      <td>${vbadge}</td>
      <td>${v.criticality}</td>
      <td>${v.status}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="score-bar-wrap">
            <div class="score-bar"><div class="score-bar-fill" style="width:${v.risk_score}%;background:${riskColor(v.risk_level)}"></div></div>
          </div>
          <span style="font-weight:700;color:${riskColor(v.risk_level)};font-size:.82rem">${v.risk_score}</span>
        </div>
      </td>
      <td><span class="risk-pill ${riskClass(v.risk_level)}">${v.risk_level}</span></td>
      <td>
        ${isAdmin ? `<button class="btn btn-danger" onclick="deleteVendor(${v.numId || 0},'${v.name.replace(/'/g, "\\'")}')">✕ Remove</button>` : `<button class="btn btn-outline" onclick="openVendorModal(${v.numId || 0})">View Details</button>`}
      </td>
    </tr>`;
    }).join('');
}

// ── Render: Live Vendor Cards ────────────────────────────
function renderLiveVendors(vendors) {
    if (!vendors.length) {
        vendorLive.innerHTML = '<p class="empty-state">No vendors yet — add one in the Vendors tab.</p>';
        return;
    }
    vendorLive.innerHTML = vendors.map(v => {
        const cls = v.risk_level === 'High' ? 'risk-high' : v.risk_level === 'Medium' ? 'risk-medium' : '';
        const badge = v.risk_level === 'High' ? '<span class="high-badge">⚠ High Risk Vendor</span>' : '';
        return `
      <div class="vendor-live-item ${cls}">
        <div>
          <div class="v-name">${v.name} ${badge}</div>
          <div class="v-cat">${v.category} · ${v.criticality}</div>
        </div>
        <div class="score-bar-wrap">
          <div class="score-bar"><div class="score-bar-fill" style="width:${v.risk_score}%;background:${riskColor(v.risk_level)}"></div></div>
        </div>
        <span class="risk-pill ${riskClass(v.risk_level)}">${v.risk_score}</span>
      </div>`;
    }).join('');
}

// ── Render: Chart ────────────────────────────────────────
function renderChart(stats) {
    const canvas = document.getElementById('riskChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const data = [stats.low, stats.medium, stats.high];

    if (riskChart) {
        riskChart.data.datasets[0].data = data;
        riskChart.update('none');
        return;
    }

    riskChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Low', 'Medium', 'High'],
            datasets: [{
                data,
                backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
                borderColor: '#111827',
                borderWidth: 3,
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9ca3af',
                        font: { family: 'Inter', size: 12, weight: 600 },
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 10,
                    }
                },
                tooltip: {
                    backgroundColor: '#1a2234',
                    titleFont: { family: 'Inter', weight: 700 },
                    bodyFont: { family: 'Inter' },
                    borderColor: 'rgba(255,255,255,.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                }
            },
            animation: { animateRotate: true, duration: 800 }
        }
    });
}

// ── Render: Alerts ───────────────────────────────────────
function renderAlerts(alerts) {
    // Update badge
    const highCount = alerts.length;
    const headerAlertCountEl = document.getElementById('header-alert-count');
    if (highCount > 0) {
        if (alertCountEl) {
            alertCountEl.style.display = 'inline-block';
            alertCountEl.textContent = highCount > 99 ? '99+' : highCount;
        }
        if (headerAlertCountEl) {
            headerAlertCountEl.style.display = 'inline-block';
            headerAlertCountEl.textContent = highCount > 99 ? '99+' : highCount;
        }
    } else {
        if (alertCountEl) alertCountEl.style.display = 'none';
        if (headerAlertCountEl) headerAlertCountEl.style.display = 'none';
    }

    if (!alerts.length) {
        alertList.innerHTML = '<p class="empty-state">No alerts triggered yet.</p>';
        return;
    }
    alertList.innerHTML = alerts.slice(0, 100).map(a => `
        < div class="alert-item clickable-row" style = "cursor:pointer" onclick = "openVendorModal(${a.vendor_id || 0})" >
      <div class="alert-icon">🔴</div>
      <div class="alert-body">
        <div class="alert-msg">${a.message}</div>
        <div class="alert-meta">
          <span>Vendor: ${a.vendor_name}</span>
          <span>Score: ${a.risk_score}</span>
          <span>${fmtTime(a.created_at)}</span>
        </div>
      </div>
    </div >
        `).join('');
}

// ── Render: Audit Log ────────────────────────────────────
function renderAuditLog(logs) {
    if (!logs.length) {
        auditTbody.innerHTML = '<tr><td colspan="5" class="empty-state">No audit entries yet.</td></tr>';
        return;
    }
    auditTbody.innerHTML = logs.slice(0, 150).map(l => `
        < tr >
      <td>${l.numId || l.id}</td>
      <td style="font-variant-numeric:tabular-nums">${fmtTime(l.timestamp)}</td>
      <td style="font-weight:600;color:var(--text)">${l.vendor_name}</td>
      <td><span style="color:var(--accent);font-weight:600">${l.action}</span></td>
      <td>${l.details || '—'}</td>
    </tr >
        `).join('');
}

// ── KPI Update ───────────────────────────────────────────
function updateKPIs(stats) {
    $('#total-vendors').textContent = stats.total;
    $('#low-risk-count').textContent = stats.low;
    $('#med-risk-count').textContent = stats.medium;
    $('#high-risk-count').textContent = stats.high;
}

// ── Compute Stats from Vendors ───────────────────────────
function computeStats(vendors) {
    const low = vendors.filter(v => v.risk_level === 'Low').length;
    const medium = vendors.filter(v => v.risk_level === 'Medium').length;
    const high = vendors.filter(v => v.risk_level === 'High').length;
    return { low, medium, high, total: vendors.length };
}

// ── Refresh All Data ─────────────────────────────────────
async function refreshAll() {
    if (!currentUser) return;
    try {
        let vendors = await getCollection('vendors', 'updated_at', 'desc');
        let alerts = await getCollection('alerts', 'created_at', 'desc', 200);
        let logs = await getCollection('audit_log', 'timestamp', 'desc', 300);

        // Role-based filtering (Frontend simulation for Prototype)
        if (currentUser.role === 'Vendor') {
            vendors = vendors.filter(v => v.numId === currentUser.vendorId);
            alerts = alerts.filter(a => a.vendor_id === currentUser.vendorId);
            logs = logs.filter(l => l.vendor_id === currentUser.vendorId);
        }

        const stats = computeStats(vendors);

        renderVendorTable(vendors);
        renderLiveVendors(vendors);
        updateKPIs(stats);
        renderChart(stats);
        renderAlerts(alerts);
        renderAuditLog(logs);
    } catch (err) { console.error('Refresh fail:', err); }
}

// ══════════════════════════════════════════════════════════
//  CLIENT-SIDE RISK ENGINE (replaces Python APScheduler)
// ══════════════════════════════════════════════════════════

let enginePaused = false;

function classifyRisk(score) {
    if (score <= 40) return 'Low';
    if (score <= 70) return 'Medium';
    return 'High';
}

async function updateAllRiskScores() {
    if (enginePaused) return;
    if (currentUser && currentUser.role !== 'Admin') return; // Only Admin drives the simulation
    try {
        const snap = await db.collection('vendors').where('status', '==', 'Active').get();
        if (snap.empty) return;

        const batch = db.batch();
        const now = new Date().toISOString();
        const auditEntries = [];
        const alertEntries = [];

        for (const doc of snap.docs) {
            const v = doc.data();
            // Weighted random walk: drift ±8, biased slightly toward center
            const drift = (Math.random() * 16) - 8;
            // Mean-reversion pull toward 50
            const pull = (50 - v.risk_score) * 0.05;
            const newScore = Math.round(Math.max(0, Math.min(100, v.risk_score + drift + pull)) * 10) / 10;
            const oldLevel = v.risk_level;
            const newLevel = classifyRisk(newScore);

            batch.update(doc.ref, {
                risk_score: newScore,
                risk_level: newLevel,
                updated_at: now,
            });

            // Audit log entry — ONLY when risk level changes (optimization)
            if (oldLevel !== newLevel) {
                auditEntries.push({
                    vendor_id: v.numId,
                    vendor_name: v.name,
                    action: "RISK_LEVEL_CHANGE",
                    details: `${oldLevel} → ${newLevel} (Score: ${newScore})`,
                    timestamp: now,
                });
            }

            // Alert ONLY when score newly crosses into High territory
            if (newScore > 70 && oldLevel !== 'High') {
                alertEntries.push({
                    vendor_id: v.numId,
                    vendor_name: v.name,
                    risk_score: newScore,
                    message: `⚠ ${v.name} risk score surged to ${newScore} — classified HIGH RISK`,
                    created_at: now,
                });
            }
        }

        await batch.commit();

        // Write audit entries (in batches)
        if (auditEntries.length > 0) {
            let nextAuditId = await getNextId('audit_log');
            const auditBatch = db.batch();
            for (const entry of auditEntries) {
                const ref = db.collection('audit_log').doc();
                auditBatch.set(ref, { numId: nextAuditId++, ...entry });
            }
            await auditBatch.commit();
        }

        // Write alert entries
        if (alertEntries.length > 0) {
            let nextAlertId = await getNextId('alerts');
            const alertBatch = db.batch();
            for (const entry of alertEntries) {
                const ref = db.collection('alerts').doc();
                alertBatch.set(ref, { numId: nextAlertId++, ...entry });
            }
            await alertBatch.commit();
        }

    } catch (e) {
        console.error('[CRAG] Risk engine error:', e);
    }
}

// ── Engine Status ────────────────────────────────────────
const engineDot = $('#engine-dot');
const engineLabel = $('#engine-label');

// Listen to global engine state
db.collection('system').doc('engine').onSnapshot(doc => {
    if (doc.exists) {
        enginePaused = doc.data().paused === true;
        updateEngineUI(enginePaused);
    }
});

function syncEngineStatus() {
    updateEngineUI(enginePaused);
}

function updateEngineUI(paused) {
    const emoji = $('#engine-emoji');
    const toggle = engineToggle || $('#engine-toggle');
    const label = engineLabel || $('#engine-label');

    if (paused) {
        if (toggle) toggle.classList.add('paused');
        if (label) label.textContent = 'Engine Paused';
        if (emoji) emoji.textContent = '🔴';
    } else {
        if (toggle) toggle.classList.remove('paused');
        if (label) label.textContent = 'Engine Active';
        if (emoji) emoji.textContent = '🟢';
    }
}

function switchView(paneId) {
    const navButtons = $$('.nav-btn');
    const panesList = $$('.pane');
    const titleEl = $('#page-title');

    navButtons.forEach(b => b.classList.toggle('active', b.dataset.pane === paneId));
    panesList.forEach(p => p.classList.toggle('active', p.id === `pane-${paneId}`));

    // Update title
    const targetBtn = Array.from(navButtons).find(b => b.dataset.pane === paneId);
    if (titleEl && targetBtn) {
        if (currentUser && currentUser.role === 'Vendor' && paneId === 'dashboard') {
            titleEl.textContent = `Dashboard — ${currentUser.name}`;
        } else {
            titleEl.textContent = targetBtn.textContent.trim();
        }
    }

    if (window.scrollTo) window.scrollTo(0, 0);
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    if (sidebar) sidebar.classList.remove('active');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
}


// ══════════════════════════════════════════════════════════
//  VENDOR DETAIL MODAL
// ══════════════════════════════════════════════════════════

const modal = $('#vendor-modal');
const modalClose = $('#modal-close');

// Category icons for the modal header
const catIcons = {
    'Cloud Provider': '☁️',
    'SaaS Vendor': '💻',
    'Payment Processor': '💳',
    'IT Infrastructure': '🖥️',
    'Consulting': '📋',
    'Data Analytics': '📈',
    'Security Vendor': '🔒',
    'Other': '🏢',
};

// ── Open Modal ───────────────────────────────────────────
async function openVendorModal(vendorNumId) {
    try {
        // Find vendor by numId
        const vendorSnap = await db.collection('vendors').where('numId', '==', vendorNumId).get();
        if (vendorSnap.empty) { toast('Vendor not found', 'error'); return; }
        const vendorDoc = vendorSnap.docs[0];
        const vendor = { id: vendorDoc.id, ...vendorDoc.data() };

        // Get alerts for this vendor
        const alertSnap = await db.collection('alerts')
            .where('vendor_id', '==', vendorNumId)
            .orderBy('created_at', 'desc')
            .limit(20).get();
        const alerts = alertSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Get audit logs for this vendor
        const logSnap = await db.collection('audit_log')
            .where('vendor_id', '==', vendorNumId)
            .orderBy('timestamp', 'desc')
            .limit(30).get();
        const audit_log = logSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        populateModal({ vendor, alerts, audit_log });
        modal.classList.add('active');
        // reset to overview tab
        document.querySelectorAll('.modal-tab').forEach((t, i) => {
            t.classList.toggle('active', i === 0);
        });
        document.querySelectorAll('.modal-pane').forEach((p, i) => {
            p.classList.toggle('active', i === 0);
        });
    } catch (e) {
        console.error(e);
        toast('Could not load vendor details', 'error');
    }
}

// ── Close Modal ──────────────────────────────────────────
if (modalClose) modalClose.addEventListener('click', () => modal.classList.remove('active'));
if (modal) modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal) modal.classList.remove('active');
});

// ── Modal Tab Navigation ─────────────────────────────────
document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.mtab;
        document.querySelectorAll('.modal-pane').forEach(p => {
            p.classList.toggle('active', p.id === `mtab-${target}`);
        });
    });
});

// ── Populate Modal Content ───────────────────────────────
function populateModal(data) {
    const v = data.vendor;
    const alerts = data.alerts;
    const logs = data.audit_log;

    // Header
    $('#modal-icon').textContent = catIcons[v.category] || '🏢';
    $('#modal-name').textContent = v.name;
    $('#modal-cat').textContent = `${v.category} · ${v.criticality} Criticality`;

    const rp = $('#modal-risk-pill');
    rp.textContent = `${v.risk_score} — ${v.risk_level}`;
    rp.className = `risk-pill ${riskClass(v.risk_level)}`;

    // Overview — info grid
    $('#modal-id').textContent = `#${v.numId || v.id}`;
    $('#modal-category').textContent = v.category;
    $('#modal-criticality').textContent = v.criticality;
    $('#modal-status').textContent = v.status;
    $('#modal-created').textContent = v.created_at ? fmtTime(v.created_at) : '—';
    $('#modal-updated').textContent = v.updated_at ? fmtTime(v.updated_at) : '—';

    // Vendor Intelligence
    if (v.osint) {
        $('#modal-domain').innerHTML = `<a href="https://${v.domain}" target="_blank" style="color:var(--accent);text-decoration:none">${v.domain}</a>`;
        $('#modal-ssl').textContent = v.osint.ssl;

        const isExposed = v.osint.ports.includes('22');
        $('#modal-ports').innerHTML = `<span style="color:${isExposed ? 'var(--high)' : 'var(--text)'}">${v.osint.ports}</span>`;

        const isBreached = v.osint.breach !== 'None found' && v.osint.breach !== 'Unknown entities';
        $('#modal-breach').innerHTML = `<span style="color:${isBreached ? 'var(--high)' : 'var(--text)'}">${v.osint.breach}</span>`;
    } else {
        // Fallback for seeded/legacy vendors
        $('#modal-domain').textContent = 'Legacy Vendor';
        $('#modal-ssl').textContent = '—';
        $('#modal-ports').textContent = '—';
        $('#modal-breach').textContent = '—';
    }

    // Risk Gauge
    const score = v.risk_score;
    const arc = $('#gauge-arc');
    const totalLen = 157; // approx half-circle arc length
    const offset = totalLen - (score / 100) * totalLen;
    arc.style.strokeDashoffset = offset;
    arc.style.stroke = score <= 40 ? 'var(--low)' : score <= 70 ? 'var(--med)' : 'var(--high)';
    arc.style.transition = 'stroke-dashoffset .8s ease, stroke .5s ease';

    const gs = $('#gauge-score');
    gs.textContent = score;
    gs.style.color = score <= 40 ? 'var(--low)' : score <= 70 ? 'var(--med)' : 'var(--high)';
    $('#gauge-label').textContent = `${v.risk_level} Risk`;

    // Risk explanation
    let explanation = '';
    if (v.risk_level === 'High') {
        explanation = `⚠ ${v.name} is classified as HIGH RISK.Immediate review and mitigation actions are recommended.This vendor's risk score of ${score} exceeds the critical threshold of 70.`;
    } else if (v.risk_level === 'Medium') {
        explanation = `${v.name} is at MEDIUM RISK with a score of ${score}. Continue monitoring — this vendor may escalate to high risk if conditions deteriorate.`;
    } else {
        explanation = `${v.name} is currently LOW RISK with a score of ${score}. No immediate action required. The system continues to monitor this vendor automatically.`;
    }
    $('#risk-explanation').textContent = explanation;

    // Risk Analysis tab
    $('#rf-score').textContent = score;
    $('#rf-score').style.color = riskColor(v.risk_level);
    const rfLevel = $('#rf-level');
    rfLevel.textContent = v.risk_level;
    rfLevel.style.color = riskColor(v.risk_level);
    $('#rf-crit').textContent = v.criticality;
    $('#rf-alerts').textContent = alerts.length;

    // Alert History tab
    const mal = $('#modal-alert-list');
    if (!alerts.length) {
        mal.innerHTML = '<p class="empty-state">No alerts triggered for this vendor yet.</p>';
    } else {
        mal.innerHTML = alerts.map(a => `
      <div class="alert-item">
        <div class="alert-icon">🔴</div>
        <div class="alert-body">
          <div class="alert-msg">${a.message}</div>
          <div class="alert-meta">
            <span>Score: ${a.risk_score}</span>
            <span>${a.created_at ? fmtTime(a.created_at) : '—'}</span>
          </div>
        </div>
      </div>
    `).join('');
    }

    // Audit Trail tab
    const matb = $('#modal-audit-tbody');
    if (!logs.length) {
        matb.innerHTML = '<tr><td colspan="4" class="empty-state">No audit entries.</td></tr>';
    } else {
        matb.innerHTML = logs.map(l => `
      <tr>
        <td>${l.numId || l.id}</td>
        <td style="font-variant-numeric:tabular-nums">${l.timestamp ? fmtTime(l.timestamp) : '—'}</td>
        <td><span style="color:var(--accent);font-weight:600">${l.action}</span></td>
        <td>${l.details || '—'}</td>
      </tr>
    `).join('');
    }
}

// ── Make Vendor Table Rows Clickable ─────────────────────
const _origRenderVendorTable = renderVendorTable;
renderVendorTable = function (vendors) {
    _origRenderVendorTable(vendors);
    vendorTbody.querySelectorAll('tr').forEach((tr, i) => {
        if (vendors[i]) {
            tr.classList.add('clickable-row');
            tr.addEventListener('click', (e) => {
                if (e.target.closest('.btn-danger')) return;
                openVendorModal(vendors[i].numId || 0);
            });
        }
    });
};

// ── Make Dashboard Vendor Cards Clickable ─────────────────
const _origRenderLiveVendors = renderLiveVendors;
renderLiveVendors = function (vendors) {
    _origRenderLiveVendors(vendors);
    vendorLive.querySelectorAll('.vendor-live-item').forEach((card, i) => {
        if (vendors[i]) {
            card.addEventListener('click', () => openVendorModal(vendors[i].numId || 0));
        }
    });
};

// ══════════════════════════════════════════════════════════
//  CHATBOT — CRAG Assistant
// ══════════════════════════════════════════════════════════

let chatFab, chatWindow, chatCloseBtn, chatBody, chatInput, chatSend;

function initChatRefs() {
    chatFab = $('#chat-fab');
    chatWindow = $('#chat-window');
    chatCloseBtn = $('#chat-close');
    chatBody = $('#chat-body');
    chatInput = $('#chat-input');
    chatSend = $('#chat-send');

    if (chatFab) {
        chatFab.addEventListener('click', () => {
            chatWindow.classList.toggle('open');
            chatFab.style.display = chatWindow.classList.contains('open') ? 'none' : 'flex';
            if (chatWindow.classList.contains('open')) chatInput.focus();
        });
    }
    if (chatCloseBtn) {
        chatCloseBtn.addEventListener('click', () => {
            chatWindow.classList.remove('open');
            chatFab.style.display = 'flex';
        });
    }
    if (chatSend) chatSend.addEventListener('click', sendChat);
    if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
}

function addChatMsg(text, who = 'bot') {
    const div = document.createElement('div');
    div.className = `chat-msg ${who}`;
    div.innerHTML = `<div class="chat-bubble">${text}</div>`;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg bot';
    div.id = 'typing-indicator';
    div.innerHTML = `<div class="chat-bubble"><span class="typing-dots">Thinking</span></div>`;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
}
function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

// Knowledge base
const chatResponses = [
    {
        keys: ['what is crag', 'about crag', 'crag mean', 'what does crag'],
        answer: '🛡️ <strong>CRAG</strong> stands for <strong>Cognitive Resilience and Automated Governance</strong>. It is an AI-powered framework for continuous third-party vendor cybersecurity risk monitoring. Instead of periodic manual assessments, CRAG automates risk scoring, dashboards, alerting, and audit logging in real-time.'
    },

    {
        keys: ['risk scor', 'how does risk', 'scoring work', 'risk engine', 'algorithm'],
        answer: '📊 The risk engine uses a <strong>weighted random-walk algorithm</strong> with mean-reversion. Every 10 seconds, each vendor\'s score shifts by ±3–8 points with a tendency to revert to a mean. Scores are classified as:<br>• <span style="color:var(--low)">Low (0–40)</span><br>• <span style="color:var(--med)">Medium (41–70)</span><br>• <span style="color:var(--high)">High (71–100)</span>'
    },

    {
        keys: ['feature', 'what can', 'capabilities', 'modules'],
        answer: '🚀 CRAG includes 5 core modules:<br>1. <strong>Vendor Onboarding</strong> — register vendors with name, category, criticality<br>2. <strong>Live Dashboard</strong> — KPI cards, doughnut chart, live vendor monitor<br>3. <strong>Risk Scoring Engine</strong> — AI-simulated scores every 10s<br>4. <strong>Automated Alerts</strong> — triggered when score > 70<br>5. <strong>Audit Log</strong> — append-only trail for governance'
    },

    {
        keys: ['alert', 'high risk', 'notification', 'threshold'],
        answer: '🔔 Alerts are <strong>automatically triggered</strong> whenever a vendor\'s risk score exceeds <strong>70</strong> (High Risk). Each alert records the vendor name, score, timestamp, and a descriptive message. View all alerts on the Alerts page or per-vendor in the detail modal.'
    },

    {
        keys: ['audit', 'log', 'trail', 'governance', 'compliance', 'tamper'],
        answer: '📜 The audit log is an <strong>append-only ledger</strong> that records every system event — vendor creation, risk score updates, alert generation, deletions. It\'s designed to be tamper-resistant for regulatory compliance. Phase-2 will add blockchain for immutability.'
    },

    {
        keys: ['tech', 'stack', 'architecture', 'built with', 'framework'],
        answer: '⚙️ CRAG is built with:<br>• <strong>Backend:</strong> Firebase Firestore (Cloud Database)<br>• <strong>Frontend:</strong> Vanilla HTML/CSS/JS, Chart.js<br>• <strong>Hosting:</strong> Firebase Hosting<br>• <strong>Engine:</strong> Client-side risk simulation with Firestore persistence'
    },

    {
        keys: ['dashboard', 'monitor', 'kpi', 'chart'],
        answer: '📈 The dashboard provides real-time visibility with:<br>• <strong>KPI Cards</strong> — total, low, medium, high risk counts<br>• <strong>Doughnut Chart</strong> — visual risk distribution<br>• <strong>Live Vendor Monitor</strong> — color-coded cards with score bars<br>Data refreshes every 10 seconds!'
    },

    {
        keys: ['vendor', 'onboard', 'add vendor', 'register'],
        answer: '🏢 To onboard a vendor:<br>1. Click <strong>Vendors</strong> in sidebar<br>2. Fill in: Name, Category, Criticality, Status<br>3. Click <strong>+ Add Vendor</strong><br>They get an initial risk score and monitoring starts immediately!'
    },

    {
        keys: ['phase 2', 'future', 'roadmap', 'blockchain', 'ml model', 'phase 3'],
        answer: '🗺️ <strong>Roadmap:</strong><br>• <strong>Phase 1 ✅</strong> — Functional prototype (current)<br>• <strong>Phase 2</strong> — Real ML models, NLP threat intelligence<br>• <strong>Phase 3</strong> — Blockchain audit trail, smart contracts'
    },

    {
        keys: ['hello', 'hi', 'hey', 'good'],
        answer: '👋 Hello! I can help you understand vendor risk monitoring, the dashboard, risk scoring, alerts, and more. What would you like to know?'
    },

    {
        keys: ['thank', 'thanks', 'awesome', 'great'],
        answer: '🙌 You\'re welcome! If you have more questions about CRAG, feel free to ask!'
    },

    {
        keys: ['help', 'how to use', 'guide', 'tutorial'],
        answer: '📋 How to use CRAG:<br>1. <strong>Onboard</strong> vendors on the Vendors page<br>2. <strong>Monitor</strong> them on the Dashboard<br>3. <strong>Click</strong> any vendor for detailed risk popup<br>4. <strong>Check Alerts</strong> for high-risk events<br>5. <strong>Review Audit Log</strong> for compliance<br>💡 Tip: Click Help in the sidebar for full docs!'
    },

    {
        keys: ['developer', 'who made', 'who built', 'creator', 'author'],
        answer: '👨‍💻 CRAG was developed by <strong>P Ganesh Krishna Reddy</strong>, a Full-Stack Developer & Cybersecurity Researcher. Check out the Developer page in the sidebar!'
    },

    {
        keys: ['contact', 'email', 'support'],
        answer: '✉️ Reach us at <strong>crag@progvision.in</strong>. Or use the Contact page in the sidebar to send a message!'
    },
];

const chatFallback = '🤔 I\'m not sure about that. Try asking about: <strong>risk scoring</strong>, <strong>features</strong>, <strong>alerts</strong>, <strong>audit log</strong>, <strong>how to use</strong>, or <strong>architecture</strong>.';

function getChatResponse(input) {
    const lower = input.toLowerCase();
    for (const r of chatResponses) {
        if (r.keys.some(k => lower.includes(k))) return r.answer;
    }
    return chatFallback;
}

function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;
    addChatMsg(text, 'user');
    chatInput.value = '';
    showTyping();
    setTimeout(() => {
        removeTyping();
        addChatMsg(getChatResponse(text), 'bot');
    }, 600 + Math.random() * 600);
}

// (chatSend and chatInput listeners are attached inside initChatRefs)
window.chatQuick = function (q) {
    if (chatInput) { chatInput.value = q; sendChat(); }
};

// ══════════════════════════════════════════════════════════
//  CONTACT FORM
// ══════════════════════════════════════════════════════════

const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('c-name').value.trim();
        toast(`Thanks ${name}! Your message has been sent. We'll respond within 24 hours.`);
        contactForm.reset();
    });
}


// ── Auto Refresh + Risk Engine ───────────────────────────
// Risk engine runs every 15 seconds (optimized from 10s to reduce Firestore writes)
setInterval(async () => {
    try {
        await updateAllRiskScores();
        await refreshAll();
    } catch (e) { }
}, 15000);
// Initial refresh is handled in checkInitialAuth -> showApp -> refreshAll
