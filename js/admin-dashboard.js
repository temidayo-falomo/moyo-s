/* ==========================================================================
   admin-dashboard.js — administration: records, payments, audit, roles
   --------------------------------------------------------------------------
   Everything here is a MOCK. In particular:
     - Payment statuses are simulated and are not from the AAUA portal.
     - Role changes only alter demo state in this browser.
     - The audit log shown is demo data, not a tamper-resistant server log.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var session = App.requireRole(['admin']);
  if (!session) return;
  App.renderShell('admin-dashboard.html');

  var h = App.escapeHtml;
  var PAGE_SIZE = 10;
  var students = App.state.students;

  function byName(a, b) { return a.name.localeCompare(b.name); }
  function emptyRow(cols, text) {
    return '<tr><td colspan="' + cols + '" class="empty-cell"><div class="empty-state"><strong>Nothing to show</strong>' + text + '</div></td></tr>';
  }

  /* ---- Summary tiles ------------------------------------------------------------ */
  function renderStats() {
    var paid = students.filter(function (s) { return s.feeStatus === 'paid'; }).length;
    var issued = students.filter(function (s) { return App.effectiveStatus(s) === 'approved'; }).length;
    var activeStaff = App.state.staff.filter(function (s) { return s.active; }).length;
    var tiles = [
      ['Student records', students.length, '', 'Computer Science'],
      ['Fees paid in full', paid, 'green', 'Eligible for clearance'],
      ['Clearances issued', issued, 'gold', 'Currently valid'],
      ['Active staff accounts', activeStaff, '', App.state.staff.length + ' accounts in total']
    ];
    document.getElementById('admin-stats').innerHTML = tiles.map(function (t) {
      return '<div class="stat ' + t[2] + '"><div class="stat-label">' + t[0] + '</div><div class="stat-value">' + t[1] + '</div><div class="stat-note">' + t[3] + '</div></div>';
    }).join('');
  }

  /* ---- Student records ------------------------------------------------------------ */
  var studentPage = 1;
  function renderStudents() {
    var q = document.getElementById('student-search').value.trim().toLowerCase();
    var level = document.getElementById('student-level').value;
    var status = document.getElementById('student-status').value;
    var list = students.filter(function (s) {
      if (q && s.name.toLowerCase().indexOf(q) === -1 && s.matric.toLowerCase().indexOf(q) === -1) return false;
      if (level !== 'all' && String(s.level) !== level) return false;
      if (status !== 'all' && App.effectiveStatus(s) !== status) return false;
      return true;
    }).sort(byName);
    var info = App.paginate(list, studentPage, PAGE_SIZE);
    studentPage = info.page;
    document.getElementById('student-rows').innerHTML = info.items.map(function (s) {
      return '<tr><td data-label="Student name"><strong>' + h(s.name) + '</strong></td>' +
        '<td data-label="Matric number" class="mono nowrap">' + h(s.matric) + '</td>' +
        '<td data-label="Level">' + s.level + '</td>' +
        '<td data-label="Payment">' + App.feeBadge(s.feeStatus) + '</td>' +
        '<td data-label="Clearance">' + App.statusBadge(App.effectiveStatus(s)) + '</td>' +
        '<td data-label="Action"><button type="button" class="btn btn-outline btn-sm" data-record="' + s.id + '">View record</button></td></tr>';
    }).join('') || emptyRow(6, 'No student records match your search.');
    App.renderPager(document.getElementById('student-pager'), info, function (p) { studentPage = p; renderStudents(); });
  }
  document.getElementById('student-filters').addEventListener('input', function () { studentPage = 1; renderStudents(); });
  document.getElementById('student-filters').addEventListener('submit', function (e) { e.preventDefault(); });

  document.getElementById('student-rows').addEventListener('click', function (event) {
    var button = event.target.closest('[data-record]');
    if (!button) return;
    var s = App.findStudent(button.dataset.record);
    var status = App.effectiveStatus(s);
    var issued = status === 'approved' || status === 'revoked';
    document.getElementById('record-body').innerHTML =
      '<dl class="details">' +
        '<div><dt>Full name</dt><dd>' + h(s.name) + '</dd></div>' +
        '<div><dt>Matric number</dt><dd class="mono">' + h(s.matric) + '</dd></div>' +
        '<div><dt>Department</dt><dd>' + h(s.department) + '</dd></div>' +
        '<div><dt>Faculty</dt><dd>' + h(s.faculty) + '</dd></div>' +
        '<div><dt>Level</dt><dd>' + s.level + ' Level</dd></div>' +
        '<div><dt>Academic session</dt><dd>' + h(s.session) + '</dd></div>' +
        '<div><dt>Payment status</dt><dd>' + App.feeBadge(s.feeStatus) + '</dd></div>' +
        '<div><dt>Clearance status</dt><dd>' + App.statusBadge(status) + '</dd></div>' +
        '<div><dt>Request submitted</dt><dd>' + App.fmtDateTime(s.request.submittedAt) + '</dd></div>' +
        '<div><dt>Clearance reference</dt><dd class="mono">' + (issued ? h(s.clearance.ref) : 'Not issued') + '</dd></div>' +
      '</dl>' +
      (issued ? '<p style="margin:16px 0 0"><a class="btn btn-outline btn-sm" href="clearance-preview.html?student=' + s.id + '">View clearance document</a></p>' : '');
    App.audit('Student record viewed', s.matric, 'Viewed by administrator', s.id);
    App.openModal('record-modal');
  });

  /* ---- Payment verification (SIMULATED) ------------------------------------------------ */
  var paymentPage = 1;
  var paymentStudent = null;

  function renderPayments() {
    var counts = { paid: 0, part: 0, unpaid: 0 };
    students.forEach(function (s) { counts[s.feeStatus]++; });
    document.getElementById('payment-stats').innerHTML =
      '<div class="stat green"><div class="stat-label">Paid in full</div><div class="stat-value">' + counts.paid + '</div><div class="stat-note">Eligible to request clearance</div></div>' +
      '<div class="stat amber"><div class="stat-label">Part payment</div><div class="stat-value">' + counts.part + '</div><div class="stat-note">Not eligible until completed</div></div>' +
      '<div class="stat red"><div class="stat-label">Not paid</div><div class="stat-value">' + counts.unpaid + '</div><div class="stat-note">Not eligible</div></div>';

    var filter = document.getElementById('payment-filter').value;
    var list = students.filter(function (s) { return filter === 'all' || s.feeStatus === filter; }).sort(byName);
    var info = App.paginate(list, paymentPage, PAGE_SIZE);
    paymentPage = info.page;
    document.getElementById('payment-rows').innerHTML = info.items.map(function (s) {
      return '<tr><td data-label="Student name"><strong>' + h(s.name) + '</strong></td>' +
        '<td data-label="Matric number" class="mono nowrap">' + h(s.matric) + '</td>' +
        '<td data-label="Level">' + s.level + '</td>' +
        '<td data-label="Payment status">' + App.feeBadge(s.feeStatus) + '</td>' +
        '<td data-label="Last checked" class="nowrap">' + App.fmtDateTime(s.feeCheckedAt) + '</td>' +
        '<td data-label="Action"><button type="button" class="btn btn-outline btn-sm" data-recheck="' + s.id + '">Re-check</button></td></tr>';
    }).join('') || emptyRow(6, 'No students with this payment status.');
    App.renderPager(document.getElementById('payment-pager'), info, function (p) { paymentPage = p; renderPayments(); });
  }
  document.getElementById('payment-filter').addEventListener('change', function () { paymentPage = 1; renderPayments(); });

  document.getElementById('payment-rows').addEventListener('click', function (event) {
    var button = event.target.closest('[data-recheck]');
    if (!button) return;
    paymentStudent = App.findStudent(button.dataset.recheck);
    document.getElementById('payment-student').innerHTML = 'Student: <strong>' + h(paymentStudent.name) + '</strong> (<span class="mono">' + h(paymentStudent.matric) + '</span>)';
    document.getElementById('payment-result').value = paymentStudent.feeStatus;
    App.openModal('payment-modal');
  });

  document.getElementById('payment-apply').addEventListener('click', function () {
    if (!paymentStudent) return;
    var result = document.getElementById('payment-result').value;
    var before = paymentStudent.feeStatus;
    paymentStudent.feeStatus = result;
    paymentStudent.feeCheckedAt = new Date().toISOString();
    App.save();
    App.audit('Payment re-check', paymentStudent.matric,
      'Portal response: ' + App.FEE[result].label + (before !== result ? ' (was ' + App.FEE[before].label + ')' : ''), paymentStudent.id);
    App.closeModal('payment-modal');
    renderAll();
    App.toast('Payment status updated for ' + paymentStudent.name + '.');
  });

  document.getElementById('sync-all').addEventListener('click', function () {
    var button = this;
    button.disabled = true;
    button.textContent = 'Syncing…';
    // MOCK: pretends to call the portal. Statuses are not changed.
    setTimeout(function () {
      var now = new Date().toISOString();
      students.forEach(function (s) { s.feeCheckedAt = now; });
      App.save();
      App.audit('Payment status sync', 'Computer Science', students.length + ' records refreshed from the portal');
      button.disabled = false;
      button.textContent = 'Sync all with portal';
      renderPayments();
      renderAudit();
      App.toast('Payment sync complete.');
    }, 900);
  });

  /* ---- Audit log ---------------------------------------------------------------------- */
  var auditPage = 1;
  function filteredAudit() {
    var q = document.getElementById('audit-search').value.trim().toLowerCase();
    var role = document.getElementById('audit-role').value;
    return App.state.audit.filter(function (entry) {
      if (role !== 'all' && entry.role !== role) return false;
      if (!q) return true;
      return (entry.actor + ' ' + entry.action + ' ' + entry.target + ' ' + entry.detail).toLowerCase().indexOf(q) !== -1;
    });
  }
  function renderAudit() {
    var info = App.paginate(filteredAudit(), auditPage, 12);
    auditPage = info.page;
    document.getElementById('audit-rows').innerHTML = info.items.map(function (entry) {
      return '<tr><td data-label="Time" class="nowrap">' + App.fmtDateTime(entry.at) + '</td>' +
        '<td data-label="Actor">' + h(entry.actor) + '</td>' +
        '<td data-label="Role">' + h(App.ROLE_LABELS[entry.role] || entry.role) + '</td>' +
        '<td data-label="Action"><strong>' + h(entry.action) + '</strong></td>' +
        '<td data-label="Target" class="mono">' + h(entry.target) + '</td>' +
        '<td data-label="Detail" class="small">' + h(entry.detail || '—') + '</td></tr>';
    }).join('') || emptyRow(6, 'No audit entries match your search.');
    App.renderPager(document.getElementById('audit-pager'), info, function (p) { auditPage = p; renderAudit(); });
  }
  document.getElementById('audit-filters').addEventListener('input', function () { auditPage = 1; renderAudit(); });
  document.getElementById('audit-filters').addEventListener('submit', function (e) { e.preventDefault(); });

  // Builds a CSV file in the browser from the filtered entries.
  document.getElementById('export-audit').addEventListener('click', function () {
    function cell(value) {
      var text = String(value || '');
      if (/^[=+\-@]/.test(text)) text = "'" + text; // stop spreadsheets treating text as a formula
      return '"' + text.replace(/"/g, '""') + '"';
    }
    var lines = [['Time', 'Actor', 'Role', 'Action', 'Target', 'Detail'].map(cell).join(',')];
    filteredAudit().forEach(function (e) {
      lines.push([e.at, e.actor, App.ROLE_LABELS[e.role] || e.role, e.action, e.target, e.detail].map(cell).join(','));
    });
    var blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'aaua-clearance-audit-log.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    App.toast('Audit log exported.');
  });

  /* ---- Roles & access -------------------------------------------------------------------- */
  function renderStaff() {
    document.getElementById('staff-rows').innerHTML = App.state.staff.map(function (member) {
      var isSelf = member.id === session.id;
      var options = ['officer', 'invigilator', 'admin'].map(function (role) {
        return '<option value="' + role + '"' + (member.role === role ? ' selected' : '') + '>' + App.ROLE_LABELS[role] + '</option>';
      }).join('');
      return '<tr><td data-label="Name"><strong>' + h(member.name) + '</strong>' + (isSelf ? ' <span class="tag">You</span>' : '') + '</td>' +
        '<td data-label="Staff ID" class="mono">' + h(member.staffId) + '</td>' +
        '<td data-label="Role"><select class="input" style="min-height:36px;padding:5px 8px;width:auto" data-role-for="' + h(member.id) + '" aria-label="Role for ' + h(member.name) + '"' + (isSelf ? ' disabled' : '') + '>' + options + '</select></td>' +
        '<td data-label="Access">' + (member.active ? '<span class="badge success">Active</span>' : '<span class="badge">Deactivated</span>') + '</td>' +
        '<td data-label="Action"><button type="button" class="btn btn-outline btn-sm" data-toggle-staff="' + h(member.id) + '"' + (isSelf ? ' disabled title="You cannot deactivate your own account"' : '') + '>' +
          (member.active ? 'Deactivate' : 'Reactivate') + '</button></td></tr>';
    }).join('');
  }

  function staffById(id) {
    return App.state.staff.find(function (m) { return m.id === id; });
  }

  document.getElementById('staff-rows').addEventListener('change', function (event) {
    var id = event.target.dataset.roleFor;
    if (!id) return;
    var member = staffById(id);
    var before = member.role;
    member.role = event.target.value;
    App.save();
    App.audit('Staff role changed', member.staffId, App.ROLE_LABELS[before] + ' → ' + App.ROLE_LABELS[member.role]);
    renderAudit();
    App.toast(member.name + ' is now ' + App.ROLE_LABELS[member.role] + '.');
  });

  document.getElementById('staff-rows').addEventListener('click', function (event) {
    var button = event.target.closest('[data-toggle-staff]');
    if (!button) return;
    var member = staffById(button.dataset.toggleStaff);
    function apply() {
      member.active = !member.active;
      App.save();
      App.audit(member.active ? 'Account reactivated' : 'Account deactivated', member.staffId, member.name);
      renderAll();
      App.toast(member.name + (member.active ? ' reactivated.' : ' deactivated.'));
    }
    if (member.active) {
      App.confirm({
        title: 'Deactivate staff account?',
        message: member.name + ' (' + member.staffId + ') will no longer be able to sign in.',
        confirmLabel: 'Deactivate', danger: true, onConfirm: apply
      });
    } else {
      apply();
    }
  });

  document.getElementById('add-staff').addEventListener('click', function () {
    document.getElementById('staff-form').reset();
    App.setFieldError(document.getElementById('new-staff-name'), '');
    App.setFieldError(document.getElementById('new-staff-id'), '');
    App.openModal('staff-modal');
  });

  document.getElementById('staff-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var nameInput = document.getElementById('new-staff-name');
    var idInput = document.getElementById('new-staff-id');
    var name = nameInput.value.trim();
    var staffId = idInput.value.trim().toUpperCase();
    var nameError = name.length < 3 ? 'Enter the staff member\'s full name.' : '';
    var idError = !/^[A-Z]{2,4}-\d{3,5}$/.test(staffId) ? 'Use the format ABC-1234, for example INV-3401.'
      : (App.findStaff(staffId) ? 'A staff account with this ID already exists.' : '');
    App.setFieldError(nameInput, nameError);
    App.setFieldError(idInput, idError);
    if (nameError) { nameInput.focus(); return; }
    if (idError) { idInput.focus(); return; }

    var role = document.getElementById('new-staff-role').value;
    App.state.staff.push({ id: 'st' + Date.now(), staffId: staffId, name: name, role: role, active: true });
    App.save();
    App.audit('Staff account created', staffId, name + ' · ' + App.ROLE_LABELS[role]);
    App.closeModal('staff-modal');
    renderAll();
    App.toast('Staff account added.', 'success');
  });

  // What each role may do in the intended system
  var MATRIX = [
    ['View own profile and clearance status', 1, 0, 0, 0],
    ['Submit own clearance request', 1, 0, 0, 0],
    ['Change payment status', 0, 0, 0, 0],
    ['View clearance requests for the faculty', 0, 1, 0, 1],
    ['Approve, reject or revoke clearance', 0, 1, 0, 0],
    ['Schedule clearance windows', 0, 1, 0, 0],
    ['Verify clearance at the examination hall', 0, 0, 1, 0],
    ['See full verification details', 0, 0, 1, 0],
    ['View all student records', 0, 0, 0, 1],
    ['View audit log', 0, 0, 0, 1],
    ['Manage staff roles and access', 0, 0, 0, 1]
  ];
  document.getElementById('matrix-rows').innerHTML = MATRIX.map(function (row) {
    return '<tr><td data-label="Capability">' + row[0] + '</td>' + ['Student', 'Faculty Officer', 'Invigilator', 'Administrator'].map(function (label, i) {
      return '<td data-label="' + label + '">' + (row[i + 1] ? '<span class="yes">&#10003;<span class="visually-hidden"> Allowed</span></span>' : '<span class="no">—<span class="visually-hidden"> Not allowed</span></span>') + '</td>';
    }).join('') + '</tr>';
  }).join('') +
    '<tr><td colspan="5" class="empty-cell small muted" style="text-align:left">Payment status has no tick for any role: it is read from the official university portal by the server and is never edited by hand.</td></tr>';

  /* ---- Start ------------------------------------------------------------------------------- */
  function renderAll() { renderStats(); renderStudents(); renderPayments(); renderAudit(); renderStaff(); }
  App.initTabs(document.getElementById('admin-tabs'));
  renderAll();
});
