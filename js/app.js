/* ==========================================================================
   app.js — shared helpers used by every page (PROTOTYPE)
   --------------------------------------------------------------------------
   Provides one global object, `App`, with:
     - demo state (kept in localStorage — temporary demo data, NOT a database)
     - demo session + page guards (a UX convenience, NOT real security)
     - header / navigation / footer rendering
     - small UI helpers: toasts, modals, tabs, pager, badges, formatting

   SECURITY NOTE
   Everything in this file runs in the visitor's browser, so a visitor can
   read or change all of it. In the real system every check below (who is
   signed in, what they may see, payment status, approvals) must be enforced
   by the backend. This file only demonstrates how the screens will behave.
   ========================================================================== */

var App = (function () {
  'use strict';

  var STATE_KEY = 'aaua_demo_state';
  var SESSION_KEY = 'aaua_demo_session';

  /* ---- Storage (falls back to memory if localStorage is blocked) -------- */
  var memoryStore = {};
  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return memoryStore[key] || null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { memoryStore[key] = value; }
  }
  function storageRemove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { delete memoryStore[key]; }
  }

  /* ---- Demo state -------------------------------------------------------- */
  function loadState() {
    var raw = storageGet(STATE_KEY);
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === AAUA_DATA.VERSION) return parsed;
      } catch (e) { /* fall through and rebuild */ }
    }
    var fresh = AAUA_DATA.buildInitialState();
    storageSet(STATE_KEY, JSON.stringify(fresh));
    return fresh;
  }

  var state = loadState();

  function save() {
    storageSet(STATE_KEY, JSON.stringify(state));
  }

  function resetDemo() {
    storageRemove(STATE_KEY);
    storageRemove(SESSION_KEY);
    window.location.href = 'index.html';
  }

  /* ---- Lookups ----------------------------------------------------------- */
  function findStudent(id) {
    return state.students.find(function (s) { return s.id === id; }) || null;
  }
  function findStudentByMatric(matric) {
    var wanted = String(matric || '').trim().toUpperCase();
    return state.students.find(function (s) { return s.matric.toUpperCase() === wanted; }) || null;
  }
  function findStaff(staffId) {
    var wanted = String(staffId || '').trim().toUpperCase();
    return state.staff.find(function (s) { return s.staffId.toUpperCase() === wanted; }) || null;
  }

  /* "Effective" status adds the revoked state on top of the request status. */
  function effectiveStatus(student) {
    if (student.request.status === 'approved' && student.clearance.revoked) return 'revoked';
    return student.request.status;
  }

  /* Returns the clearance window that is open right now for a level. */
  function windowStatus(win) {
    var now = Date.now();
    if (now < new Date(win.opensAt).getTime()) return 'upcoming';
    if (now > new Date(win.closesAt).getTime()) return 'closed';
    return 'open';
  }
  function currentWindow(level) {
    return state.windows.find(function (w) {
      return windowStatus(w) === 'open' && (w.level === 'all' || String(w.level) === String(level));
    }) || null;
  }

  /* ---- Demo session ------------------------------------------------------ */
  var ROLE_LABELS = { student: 'Student', officer: 'Faculty Officer', invigilator: 'Invigilator', admin: 'Administrator', system: 'System' };
  var ROLE_HOME = { student: 'student-dashboard.html', officer: 'officer-dashboard.html', invigilator: 'verification.html', admin: 'admin-dashboard.html' };

  function getSession() {
    var raw = storageGet(SESSION_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function setSession(session) {
    storageSet(SESSION_KEY, JSON.stringify(session));
  }
  function logout() {
    var session = getSession();
    if (session) audit('Signed out', session.ref, 'Session ended');
    storageRemove(SESSION_KEY);
    window.location.href = 'index.html';
  }

  /* Page guard for the demo. It keeps the walkthrough tidy by sending people
     to the right page — it does NOT protect any data. Real protection is the
     backend refusing to return records the caller is not allowed to see. */
  function requireRole(roles) {
    var session = getSession();
    if (!session) {
      var staffPage = roles.indexOf('student') === -1;
      window.location.replace(staffPage ? 'login.html?role=staff' : 'login.html');
      return null;
    }
    if (roles.indexOf(session.role) === -1) {
      window.location.replace(ROLE_HOME[session.role] || 'index.html');
      return null;
    }
    return session;
  }

  /* ---- Audit log ---------------------------------------------------------- */
  function audit(action, target, detail, targetId) {
    var session = getSession();
    state.audit.unshift({
      id: 'a' + Date.now() + Math.floor(Math.random() * 1000),
      at: new Date().toISOString(),
      actor: session ? session.name : 'Anonymous visitor',
      role: session ? session.role : 'system',
      action: action,
      target: target || '',
      targetId: targetId || '',
      detail: detail || ''
    });
    save();
  }

  /* ---- Formatting helpers ------------------------------------------------ */
  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  var STATUS = {
    none: { label: 'Not requested', cls: '' },
    pending: { label: 'Pending review', cls: 'info' },
    needs_review: { label: 'Needs review', cls: 'warning' },
    approved: { label: 'Approved', cls: 'success' },
    rejected: { label: 'Rejected', cls: 'danger' },
    revoked: { label: 'Revoked', cls: 'danger' }
  };
  var FEE = {
    paid: { label: 'Paid', cls: 'success' },
    part: { label: 'Part payment', cls: 'warning' },
    unpaid: { label: 'Not paid', cls: 'danger' }
  };
  function statusBadge(status) {
    var s = STATUS[status] || STATUS.none;
    return '<span class="badge ' + s.cls + '">' + s.label + '</span>';
  }
  function feeBadge(fee) {
    var f = FEE[fee] || FEE.unpaid;
    return '<span class="badge ' + f.cls + '">' + f.label + '</span>';
  }

  /* ---- Branding ---------------------------------------------------------- */
  /* The AAUA logo (supplied by the project owner) lives in assets/. */
  function logoImg(size, alt) {
    var s = size || 40;
    return '<img class="logo" src="assets/aaua-logo.jpg" width="' + s + '" height="' + s + '" alt="' + (alt || '') + '">';
  }

  /* Decorative QR-style placeholder. The pattern is derived from the
     reference so each one looks different, but it is NOT a real, scannable
     QR code. Real codes will encode a secure token issued by the backend. */
  function qrPlaceholderSvg(ref) {
    var hash = 2166136261;
    for (var i = 0; i < ref.length; i++) { hash ^= ref.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    function next() { hash ^= hash << 13; hash ^= hash >>> 17; hash ^= hash << 5; return (hash >>> 0) / 4294967296; }
    var n = 21, cells = '';
    function inFinder(x, y) { return (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12); }
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (!inFinder(x, y) && next() > 0.52) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
      }
    }
    function finder(x, y) {
      return '<rect x="' + x + '" y="' + y + '" width="7" height="7"/>' +
        '<rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/>' +
        '<rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3"/>';
    }
    return '<svg viewBox="-2 -2 25 25" role="img" aria-label="QR code placeholder (not scannable)" shape-rendering="crispEdges">' +
      '<rect x="-2" y="-2" width="25" height="25" fill="#fff"/><g fill="#09090b">' + cells +
      finder(0, 0) + finder(14, 0) + finder(0, 14) + '</g></svg>';
  }

  /* ---- Header, navigation and footer ------------------------------------- */
  var NAV = {
    public: [['index.html', 'Home'], ['login.html', 'Student Login'], ['login.html?role=staff', 'Staff Login']],
    student: [['student-dashboard.html', 'Dashboard'], ['clearance-request.html', 'Request Clearance'], ['clearance-preview.html', 'My Clearance Document']],
    officer: [['officer-dashboard.html', 'Clearance Requests']],
    invigilator: [['verification.html', 'Verify Clearance']],
    admin: [['admin-dashboard.html', 'Administration'], ['officer-dashboard.html', 'Clearance Requests']]
  };

  /* activeHref: the nav link to highlight, e.g. 'student-dashboard.html' */
  function renderShell(activeHref) {
    var session = getSession();
    var links = NAV[session ? session.role : 'public'] || NAV.public;

    var items = links.map(function (link) {
      var current = link[0] === activeHref ? ' aria-current="page"' : '';
      return '<li><a href="' + link[0] + '"' + current + '>' + link[1] + '</a></li>';
    }).join('');

    var user = '';
    if (session) {
      user = '<div class="nav-user">' +
        '<div class="nav-user-info"><strong>' + escapeHtml(session.name) + '</strong><span>' + ROLE_LABELS[session.role] + '</span></div>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="logout-button">Sign out</button></div>';
    }

    var header = document.getElementById('site-header');
    if (header) {
      header.innerHTML =
        '<div class="header-bar"><div class="container header-inner">' +
          '<a class="brand" href="index.html" aria-label="AAUA Secure Examination Clearance — home">' + logoImg(40) +
            '<span class="brand-text"><strong>AAUA</strong><span>Secure Examination Clearance</span></span></a>' +
          '<button type="button" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="primary-nav">Menu</button>' +
          '<nav class="primary-nav" id="primary-nav" aria-label="Primary"><ul>' + items + '</ul>' + user + '</nav>' +
        '</div></div>';

      var toggle = document.getElementById('nav-toggle');
      var nav = document.getElementById('primary-nav');
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.textContent = open ? 'Close' : 'Menu';
      });
      var logoutButton = document.getElementById('logout-button');
      if (logoutButton) logoutButton.addEventListener('click', logout);
    }

    var footer = document.getElementById('site-footer');
    if (footer) {
      footer.className = 'site-footer';
      footer.innerHTML = '<div class="container">' +
        '<p>AAUA Secure Examination Clearance System · Department of Computer Science, Faculty of Computing</p>' +
        '<p><button type="button" class="link-button" id="reset-demo">Reset data</button></p></div>';
      document.getElementById('reset-demo').addEventListener('click', function () {
        confirmDialog({
          title: 'Reset data?',
          message: 'This restores all records to their starting state and signs you out.',
          confirmLabel: 'Reset',
          danger: true,
          onConfirm: resetDemo
        });
      });
    }
  }

  /* ---- Toasts -------------------------------------------------------------- */
  function toast(message, type) {
    var region = document.getElementById('toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-region';
      region.className = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = message;
    region.appendChild(el);
    setTimeout(function () { el.remove(); }, 4500);
  }

  /* ---- Modals --------------------------------------------------------------
     Markup: <div class="modal" id="x" role="dialog" aria-modal="true" hidden>
     Any element with [data-close-modal] inside a modal closes it. */
  var lastFocus = null;
  function openModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    var target = modal.querySelector('[autofocus], input, select, textarea, button');
    if (target) target.focus();
  }
  function closeModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    modal.hidden = true;
    if (!document.querySelector('.modal:not([hidden])')) document.body.classList.remove('modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('click', function (event) {
    var closer = event.target.closest('[data-close-modal]');
    if (closer) { closeModal(closer.closest('.modal').id); return; }
    if (event.target.classList && event.target.classList.contains('modal')) closeModal(event.target.id);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var open = document.querySelectorAll('.modal:not([hidden])');
    if (open.length) closeModal(open[open.length - 1].id);
  });

  /* Reusable confirmation dialog (created the first time it is needed). */
  function confirmDialog(options) {
    var modal = document.getElementById('app-confirm');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'modal';
      modal.id = 'app-confirm';
      modal.hidden = true;
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'app-confirm-title');
      modal.innerHTML = '<div class="modal-card"><div class="modal-head"><h2 id="app-confirm-title"></h2>' +
        '<button type="button" class="modal-close" data-close-modal aria-label="Close">&times;</button></div>' +
        '<div class="modal-body"><p id="app-confirm-message" class="mb-0"></p></div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-outline" data-close-modal>Cancel</button>' +
        '<button type="button" class="btn" id="app-confirm-yes"></button></div></div>';
      document.body.appendChild(modal);
    }
    document.getElementById('app-confirm-title').textContent = options.title;
    document.getElementById('app-confirm-message').textContent = options.message;
    var yes = document.getElementById('app-confirm-yes');
    yes.textContent = options.confirmLabel || 'Confirm';
    yes.className = 'btn ' + (options.danger ? 'btn-danger' : 'btn-primary');
    yes.onclick = function () { closeModal('app-confirm'); options.onConfirm(); };
    openModal('app-confirm');
  }

  /* ---- Tabs ------------------------------------------------------------------
     Markup: <div class="tabs" role="tablist"> <button class="tab" role="tab"
     data-tab="panel-id"> ... and <section id="panel-id" role="tabpanel">.
     The selected tab is mirrored in the URL hash so links can open a tab. */
  function initTabs(tablist, onChange) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    function select(panelId, updateHash) {
      tabs.forEach(function (tab) {
        var isSelected = tab.dataset.tab === panelId;
        tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        tab.tabIndex = isSelected ? 0 : -1;
        document.getElementById(tab.dataset.tab).hidden = !isSelected;
      });
      if (updateHash && window.history.replaceState) window.history.replaceState(null, '', '#' + panelId);
      if (onChange) onChange(panelId);
    }
    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { select(tab.dataset.tab, true); });
      tab.addEventListener('keydown', function (event) {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        var nextIndex = (index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
        tabs[nextIndex].focus();
        select(tabs[nextIndex].dataset.tab, true);
      });
    });
    var fromHash = window.location.hash.replace('#', '');
    var initial = tabs.some(function (t) { return t.dataset.tab === fromHash; }) ? fromHash : tabs[0].dataset.tab;
    select(initial, false);
    return { select: select };
  }

  /* ---- Pager ---------------------------------------------------------------- */
  function paginate(items, page, size) {
    var totalPages = Math.max(1, Math.ceil(items.length / size));
    var safePage = Math.min(Math.max(1, page), totalPages);
    var start = (safePage - 1) * size;
    return { page: safePage, totalPages: totalPages, total: items.length, start: start, items: items.slice(start, start + size) };
  }
  function renderPager(container, info, onChange) {
    var from = info.total === 0 ? 0 : info.start + 1;
    var to = info.start + info.items.length;
    container.innerHTML = '<span>Showing ' + from + '–' + to + ' of ' + info.total + '</span>' +
      '<div class="pager-buttons">' +
      '<button type="button" class="btn btn-outline btn-sm" data-page="prev"' + (info.page <= 1 ? ' disabled' : '') + '>Previous</button>' +
      '<span class="btn btn-sm" aria-current="true" style="cursor:default">Page ' + info.page + ' of ' + info.totalPages + '</span>' +
      '<button type="button" class="btn btn-outline btn-sm" data-page="next"' + (info.page >= info.totalPages ? ' disabled' : '') + '>Next</button></div>';
    container.querySelector('[data-page="prev"]').onclick = function () { onChange(info.page - 1); };
    container.querySelector('[data-page="next"]').onclick = function () { onChange(info.page + 1); };
  }

  /* ---- Form helpers ---------------------------------------------------------- */
  function setFieldError(input, message) {
    var errorEl = document.getElementById(input.id + '-error');
    if (message) {
      input.setAttribute('aria-invalid', 'true');
      if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }
    } else {
      input.removeAttribute('aria-invalid');
      if (errorEl) { errorEl.textContent = ''; errorEl.hidden = true; }
    }
  }

  return {
    state: state,
    save: save,
    resetDemo: resetDemo,
    findStudent: findStudent,
    findStudentByMatric: findStudentByMatric,
    findStaff: findStaff,
    effectiveStatus: effectiveStatus,
    windowStatus: windowStatus,
    currentWindow: currentWindow,
    ROLE_LABELS: ROLE_LABELS,
    ROLE_HOME: ROLE_HOME,
    getSession: getSession,
    setSession: setSession,
    logout: logout,
    requireRole: requireRole,
    audit: audit,
    escapeHtml: escapeHtml,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    STATUS: STATUS,
    FEE: FEE,
    statusBadge: statusBadge,
    feeBadge: feeBadge,
    logoImg: logoImg,
    qrPlaceholderSvg: qrPlaceholderSvg,
    renderShell: renderShell,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    confirm: confirmDialog,
    initTabs: initTabs,
    paginate: paginate,
    renderPager: renderPager,
    setFieldError: setFieldError
  };
})();
