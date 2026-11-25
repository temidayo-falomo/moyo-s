/* ==========================================================================
   student-dashboard.js — the signed-in student's own overview
   --------------------------------------------------------------------------
   The student record is ALWAYS looked up from the session (who signed in).
   It is never taken from the URL or from a form field, so there is nothing
   on this page that could be changed to show another student.
   (In production the server enforces this; here it is only illustrated.)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var session = App.requireRole(['student']);
  if (!session) return;
  App.renderShell('student-dashboard.html');

  var student = App.findStudent(session.id);
  if (!student) { App.logout(); return; }

  var h = App.escapeHtml;
  var status = App.effectiveStatus(student);
  var eligible = student.feeStatus === 'paid';
  var openWindow = App.currentWindow(student.level);

  document.getElementById('welcome-title').textContent = 'Welcome, ' + student.name.split(' ')[0];
  document.getElementById('welcome-sub').textContent =
    student.matric + ' · ' + student.level + ' Level · ' + student.session + ' academic session';

  /* ---- Call-to-action panel ------------------------------------------------ */
  var cta = {
    none: eligible
      ? { title: 'You are eligible to request examination clearance', text: 'Your school-fee payment has been confirmed. Submit your request and required documents for review by the faculty officer.', label: 'Request Examination Clearance', href: 'clearance-request.html' }
      : { title: 'You are not yet eligible for clearance', text: 'Clearance can only be requested after full school-fee payment is confirmed on the university portal.', label: 'View eligibility details', href: 'clearance-request.html', outline: true },
    pending: { title: 'Your clearance request is pending review', text: 'A faculty officer will review your request. You will see the result here once a decision is made.', label: 'View request status', href: 'clearance-request.html' },
    needs_review: { title: 'Your request needs attention', text: 'The faculty officer asked for a correction before your clearance can be approved.', label: 'Review and resubmit', href: 'clearance-request.html' },
    rejected: { title: 'Your clearance request was rejected', text: 'Read the reason given by the faculty officer and submit a corrected request.', label: 'See reason and resubmit', href: 'clearance-request.html' },
    approved: { title: 'Your examination clearance has been issued', text: 'Open your clearance document and present it, with your student ID card, to the invigilator.', label: 'Open clearance document', href: 'clearance-preview.html' },
    revoked: { title: 'Your clearance has been revoked', text: 'Your clearance is no longer valid for examinations. Please contact the faculty office.', label: 'View details', href: 'clearance-request.html', outline: true }
  }[status];

  document.getElementById('cta-panel').innerHTML =
    '<div><h2>' + cta.title + '</h2><p>' + cta.text + '</p></div>' +
    '<a class="btn btn-lg ' + (cta.outline ? 'btn-ghost' : 'btn-gold') + '" href="' + cta.href + '">' + cta.label + '</a>';

  /* ---- Status tiles ---------------------------------------------------------- */
  var feeTone = { paid: 'green', part: 'amber', unpaid: 'red' }[student.feeStatus];
  var statusTone = { none: '', pending: 'gold', needs_review: 'amber', approved: 'green', rejected: 'red', revoked: 'red' }[status];
  var windowText = openWindow
    ? '<div class="stat-value" style="font-size:1.15rem">Open now</div><div class="stat-note">Closes ' + App.fmtDateTime(openWindow.closesAt) + '</div>'
    : '<div class="stat-value" style="font-size:1.15rem">Closed</div><div class="stat-note">No clearance window is open for your level.</div>';

  document.getElementById('status-tiles').innerHTML =
    '<div class="stat ' + feeTone + '"><div class="stat-label">School-fee payment status</div>' +
      '<div style="margin:6px 0">' + App.feeBadge(student.feeStatus) + '</div>' +
      '<div class="stat-note">Last checked ' + App.fmtDateTime(student.feeCheckedAt) + '. You cannot edit this.</div></div>' +
    '<div class="stat ' + statusTone + '"><div class="stat-label">Clearance request status</div>' +
      '<div style="margin:6px 0">' + App.statusBadge(status) + '</div>' +
      '<div class="stat-note">' + (student.request.submittedAt ? 'Submitted ' + App.fmtDateTime(student.request.submittedAt) : 'No request submitted yet.') + '</div></div>' +
    '<div class="stat"><div class="stat-label">Clearance window</div>' + windowText + '</div>';

  /* ---- Profile ---------------------------------------------------------------- */
  var rows = [
    ['Full name', student.name],
    ['Matriculation number', student.matric],
    ['Department', student.department],
    ['Faculty', student.faculty],
    ['Academic level', student.level + ' Level'],
    ['Academic session', student.session]
  ];
  document.getElementById('profile-details').innerHTML = rows.map(function (row) {
    return '<div><dt>' + row[0] + '</dt><dd>' + h(row[1]) + '</dd></div>';
  }).join('');

  /* ---- Progress stepper --------------------------------------------------------- */
  var reviewState = status === 'pending' ? 'current'
    : (status === 'needs_review' || status === 'rejected') ? 'issue'
    : (status === 'approved' || status === 'revoked') ? 'done' : '';
  var steps = [
    { title: 'Payment confirmed', note: eligible ? 'Full payment on record' : 'Awaiting full payment', cls: eligible ? 'done' : 'current' },
    { title: 'Request submitted', note: status === 'none' ? 'Not yet submitted' : 'Documents received', cls: status === 'none' ? (eligible ? 'current' : '') : 'done' },
    { title: 'Officer review', note: App.STATUS[status === 'none' ? 'none' : status].label, cls: reviewState },
    { title: 'Clearance issued', note: status === 'approved' ? 'Document available' : (status === 'revoked' ? 'Revoked' : 'Not yet issued'), cls: status === 'approved' ? 'done' : (status === 'revoked' ? 'issue' : '') }
  ];
  document.getElementById('progress-steps').innerHTML = steps.map(function (step) {
    return '<li class="' + step.cls + '"><strong>' + step.title + '</strong><span>' + step.note + '</span></li>';
  }).join('');

  /* ---- Issued documents ----------------------------------------------------------- */
  var docs = document.getElementById('issued-docs');
  if (status === 'approved' || status === 'revoked') {
    docs.innerHTML = '<ul class="list-plain"><li><div class="row row-between">' +
      '<div><strong>Examination Clearance — ' + h(student.session) + '</strong><br>' +
      '<span class="small muted">Issued ' + App.fmtDateTime(student.clearance.issuedAt) + ' · Ref <span class="mono">' + h(student.clearance.ref) + '</span></span></div>' +
      '<div class="row">' + (status === 'revoked' ? App.statusBadge('revoked') : '<span class="badge success">Valid</span>') +
      '<a class="btn btn-outline btn-sm" href="clearance-preview.html">View document</a></div>' +
      '</div></li></ul>';
  } else {
    docs.innerHTML = '<div class="empty-state"><strong>No documents issued yet</strong>' +
      'Your examination clearance document will appear here after a faculty officer approves your request.</div>';
  }

  /* ---- Recent activity (only entries about this student) ----------------------------- */
  var activity = App.state.audit.filter(function (entry) { return entry.targetId === student.id; }).slice(0, 5);
  document.getElementById('activity-list').innerHTML = activity.length
    ? activity.map(function (entry) {
        return '<li><strong>' + h(entry.action) + '</strong><br><span class="small muted">' +
          App.fmtDateTime(entry.at) + ' · ' + h(App.ROLE_LABELS[entry.role] || entry.role) + '</span></li>';
      }).join('')
    : '<li class="muted">No activity recorded yet.</li>';
});
