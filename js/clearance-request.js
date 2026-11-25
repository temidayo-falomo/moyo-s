/* ==========================================================================
   clearance-request.js — the student's clearance request form and its states
   --------------------------------------------------------------------------
   States shown: not submitted, pending, approved (success), needs review,
   rejected, revoked, and "not eligible" when fees are not fully paid.

   The submit button performs a MOCK submission (a short delay, then the demo
   state changes). In production the server must re-check payment status and
   the clearance window itself — it must never trust what the browser sends.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var session = App.requireRole(['student']);
  if (!session) return;
  App.renderShell('clearance-request.html');

  // Always the signed-in student's own record (never taken from the URL).
  var student = App.findStudent(session.id);
  if (!student) { App.logout(); return; }

  var h = App.escapeHtml;
  var form = document.getElementById('request-form');
  var formCard = document.getElementById('request-form-card');
  var docInputs = {
    receipt: document.getElementById('doc-receipt'),
    photo: document.getElementById('doc-photo'),
    idcard: document.getElementById('doc-idcard')
  };
  var declaration = document.getElementById('declaration');

  document.getElementById('doc-idcard-label').textContent = 'Student ID card (' + student.level + ' Level)';

  /* ---- Profile ---------------------------------------------------------------- */
  document.getElementById('req-profile').innerHTML = [
    ['Full name', student.name],
    ['Matriculation number', student.matric],
    ['Department', student.department],
    ['Faculty', student.faculty],
    ['Academic level', student.level + ' Level'],
    ['Academic session', student.session]
  ].map(function (row) { return '<div><dt>' + row[0] + '</dt><dd>' + h(row[1]) + '</dd></div>'; }).join('');

  function statePanel(tone, icon, title, bodyHtml) {
    return '<section class="state-panel ' + tone + '"><div class="state-icon" aria-hidden="true">' + icon + '</div>' +
      '<div><h2>' + title + '</h2>' + bodyHtml + '</div></section>';
  }

  /* ---- Render everything that depends on the current status ---------------------- */
  function render() {
    var status = App.effectiveStatus(student);
    var eligible = student.feeStatus === 'paid';
    var openWindow = App.currentWindow(student.level);

    // Payment eligibility card
    var feeMessage = {
      paid: '<div class="alert success"><span class="alert-icon" aria-hidden="true">&#10003;</span><p><strong>Eligible.</strong> Full school-fee payment is on record for ' + h(student.session) + '.</p></div>',
      part: '<div class="alert warning"><span class="alert-icon" aria-hidden="true">!</span><p><strong>Not eligible yet.</strong> Only part payment is on record. Complete your payment on the university portal.</p></div>',
      unpaid: '<div class="alert danger"><span class="alert-icon" aria-hidden="true">&times;</span><p><strong>Not eligible.</strong> No school-fee payment is on record for ' + h(student.session) + '.</p></div>'
    }[student.feeStatus];
    var windowMessage = openWindow
      ? '<p class="small"><strong>Clearance window:</strong> ' + h(openWindow.title) + ' — open until ' + App.fmtDateTime(openWindow.closesAt) + '. Final deadline ' + App.fmtDateTime(openWindow.deadline) + '.</p>'
      : '<div class="alert warning"><span class="alert-icon" aria-hidden="true">!</span><p>No clearance window is currently open for ' + student.level + ' Level. Requests can only be submitted while a window is open.</p></div>';
    document.getElementById('eligibility').innerHTML =
      '<dl class="details" style="margin-bottom:14px"><div><dt>School-fee status</dt><dd>' + App.feeBadge(student.feeStatus) + '</dd></div>' +
      '<div><dt>Last checked</dt><dd>' + App.fmtDateTime(student.feeCheckedAt) + '</dd></div></dl>' +
      feeMessage + '<div style="margin-top:12px">' + windowMessage + '</div>' +
      '<p class="hint">You cannot change your payment status here. It will be checked by the server against the official university portal.</p>';

    // Big state panel
    var stateEl = document.getElementById('request-state');
    var note = student.request.note ? '<p><strong>Officer\'s note:</strong> ' + h(student.request.note) + '</p>' : '';
    if (status === 'pending') {
      stateEl.innerHTML = statePanel('pending', '&#8230;', 'Request pending review',
        '<p>Your request was submitted on ' + App.fmtDateTime(student.request.submittedAt) + ' and is waiting for a faculty officer. You do not need to visit the faculty office.</p>' +
        '<p class="small muted">Documents received: ' + h(Object.values(student.request.docs || {}).join(', ')) + '</p>');
    } else if (status === 'approved') {
      stateEl.innerHTML = statePanel('success', '&#10003;', 'Clearance approved',
        '<p>Your request was approved on ' + App.fmtDateTime(student.request.decidedAt) + '. Your examination clearance document is ready.</p>' +
        '<p><a class="btn btn-primary" href="clearance-preview.html">Open clearance document</a></p>');
    } else if (status === 'needs_review') {
      stateEl.innerHTML = statePanel('warning', '!', 'Your request needs review',
        '<p>The faculty officer could not approve your request yet. Correct the issue below and resubmit.</p>' + note);
    } else if (status === 'rejected') {
      stateEl.innerHTML = statePanel('danger', '&times;', 'Request rejected',
        '<p>Your request was rejected on ' + App.fmtDateTime(student.request.decidedAt) + '. You may correct the issue and submit a new request.</p>' + note);
    } else if (status === 'revoked') {
      stateEl.innerHTML = statePanel('danger', '&times;', 'Clearance revoked',
        '<p>Your clearance was revoked on ' + App.fmtDateTime(student.clearance.revokedAt) + ' and is no longer valid for examinations.</p>' +
        '<p><strong>Reason:</strong> ' + h(student.clearance.revokeReason) + '</p><p>Please contact the faculty office.</p>');
    } else if (!eligible) {
      stateEl.innerHTML = statePanel('neutral', 'i', 'You cannot request clearance yet',
        '<p>Clearance requests open once full school-fee payment is confirmed. After paying on the university portal, allow time for the record to update.</p>');
    } else {
      stateEl.innerHTML = '';
    }

    // The form is only available when a (re)submission makes sense
    var canFill = status === 'none' || status === 'needs_review' || status === 'rejected';
    formCard.hidden = !canFill;
    var canSubmit = canFill && eligible && !!openWindow;
    var submit = document.getElementById('submit-request');
    submit.disabled = !canSubmit;
    submit.textContent = status === 'none' ? 'Submit clearance request' : 'Resubmit clearance request';
    document.getElementById('submit-note').textContent = canSubmit ? ''
      : (!eligible ? 'Submission is disabled until full payment is confirmed.' : 'Submission is disabled because no clearance window is open.');
    Object.keys(docInputs).forEach(function (key) { docInputs[key].disabled = !canSubmit; });
    declaration.disabled = !canSubmit;
  }

  /* ---- Validation + mock submit ------------------------------------------------------ */
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var firstInvalid = null;
    var names = {};

    Object.keys(docInputs).forEach(function (key) {
      var input = docInputs[key];
      var file = input.files && input.files[0];
      var message = '';
      if (!file) message = 'Attach this document.';
      else if (file.size > 2 * 1024 * 1024) message = 'File is larger than 2 MB. Choose a smaller file.';
      App.setFieldError(input, message);
      if (message && !firstInvalid) firstInvalid = input;
      if (file) names[key] = file.name;
    });

    var declarationError = document.getElementById('declaration-error');
    if (!declaration.checked) {
      declarationError.textContent = 'You must confirm the declaration before submitting.';
      declarationError.hidden = false;
      if (!firstInvalid) firstInvalid = declaration;
    } else {
      declarationError.hidden = true;
    }

    if (firstInvalid) { firstInvalid.focus(); return; }

    var submit = document.getElementById('submit-request');
    submit.disabled = true;
    submit.textContent = 'Submitting…';

    // MOCK: stands in for a POST request to the backend.
    setTimeout(function () {
      student.request = {
        status: 'pending',
        submittedAt: new Date().toISOString(),
        decidedAt: null,
        decidedBy: null,
        note: '',
        docs: names
      };
      App.save();
      App.audit('Clearance request submitted', student.matric, 'Documents attached: 3', student.id);
      form.reset();
      render();
      App.toast('Request submitted. It is now pending review.', 'success');
      document.getElementById('request-state').scrollIntoView({ block: 'start' });
    }, 700);
  });

  render();
});
