/* ==========================================================================
   verification.js — invigilator verification (MOCK server lookup)
   --------------------------------------------------------------------------
   Key idea shown on this page: a QR code only carries a reference. The
   result (valid / revoked / invalid / mismatch) comes from looking that
   reference up in the AUTHORITATIVE record — never from what is printed on
   the student's document.

   `mockServerLookup` stands in for a backend call such as
       POST /api/verify  { token, presentedMatric }
   The real endpoint must require an authorized invigilator session.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Only invigilators may open the verification screen.
  var session = App.requireRole(['invigilator']);
  if (!session) return;
  App.renderShell('verification.html');

  var h = App.escapeHtml;
  var resultEl = document.getElementById('verify-result');
  var scanner = document.getElementById('scanner');
  var scannerText = document.getElementById('scanner-text');
  var scanButton = document.getElementById('scan-button');
  var manualButton = document.getElementById('manual-button');
  var recent = []; // verifications made since this page was opened

  /* ---- MOCK server lookup ------------------------------------------------------ */
  function mockServerLookup(ref, presentedMatric) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var wanted = String(ref || '').trim().toUpperCase();
        var student = App.state.students.find(function (s) { return s.clearance.ref.toUpperCase() === wanted; });

        // Unknown reference, or a reference whose clearance was never issued
        if (!student || student.request.status !== 'approved') { resolve({ state: 'invalid' }); return; }
        if (student.clearance.revoked) { resolve({ state: 'revoked', student: student }); return; }
        if (presentedMatric && presentedMatric.trim().toUpperCase() !== student.matric.toUpperCase()) {
          resolve({ state: 'mismatch', student: student, presentedMatric: presentedMatric.trim() });
          return;
        }
        resolve({ state: 'valid', student: student });
      }, 800);
    });
  }

  /* ---- Result rendering ----------------------------------------------------------- */
  var STATES = {
    valid: { icon: '&#10003;', title: 'VALID — CLEARED', text: 'Clearance confirmed against the server record.' },
    revoked: { icon: '&times;', title: 'REVOKED — DO NOT ADMIT', text: 'This clearance was withdrawn after it was issued.' },
    invalid: { icon: '?', title: 'INVALID — NO RECORD FOUND', text: 'This reference does not match any issued clearance.' },
    mismatch: { icon: '!', title: 'MISMATCH — DO NOT ADMIT', text: 'The clearance belongs to a different student.' }
  };

  function studentDetails(student) {
    return '<dl class="details">' +
      '<div><dt>Student name</dt><dd>' + h(student.name) + '</dd></div>' +
      '<div><dt>Matric number</dt><dd class="mono">' + h(student.matric) + '</dd></div>' +
      '<div><dt>Department</dt><dd>' + h(student.department) + '</dd></div>' +
      '<div><dt>Faculty</dt><dd>' + h(student.faculty) + '</dd></div>' +
      '<div><dt>Level</dt><dd>' + student.level + ' Level</dd></div>' +
      '<div><dt>Clearance status</dt><dd>' + App.statusBadge(App.effectiveStatus(student)) + '</dd></div>' +
      '<div><dt>Issued</dt><dd>' + App.fmtDateTime(student.clearance.issuedAt) + '</dd></div>' +
      '</dl>';
  }

  function renderResult(result, ref) {
    var info = STATES[result.state];
    var body = '';

    if (result.state === 'valid') {
      body = studentDetails(result.student) +
        '<div class="alert success" style="margin-top:14px"><span class="alert-icon" aria-hidden="true">&#10003;</span>' +
        '<p><strong>Next step:</strong> confirm the name and matric number above match the student\'s ID card and face before admitting them.</p></div>';
    } else if (result.state === 'revoked') {
      body = studentDetails(result.student) +
        '<div class="alert danger" style="margin-top:14px"><span class="alert-icon" aria-hidden="true">&times;</span>' +
        '<p><strong>Revoked ' + App.fmtDateTime(result.student.clearance.revokedAt) + '.</strong> ' + h(result.student.clearance.revokeReason) +
        ' Refer the student to the faculty office.</p></div>';
    } else if (result.state === 'mismatch') {
      body = '<div class="alert warning" style="margin-bottom:14px"><span class="alert-icon" aria-hidden="true">!</span>' +
        '<p>The ID card presented shows <strong class="mono">' + h(result.presentedMatric) + '</strong>, but the server record for this clearance belongs to the student below. Do not admit; report to the chief invigilator.</p></div>' +
        '<h3>Server record for this clearance</h3>' + studentDetails(result.student);
    } else {
      body = '<p>No issued clearance exists for reference <strong class="mono">' + h(ref) + '</strong>.</p>' +
        '<ul class="checklist small"><li>Check the reference was typed correctly.</li>' +
        '<li>The QR code may be forged, altered or from another system.</li>' +
        '<li>Do not admit the student on the strength of the printed document. Refer them to the faculty office.</li></ul>';
    }

    resultEl.innerHTML = '<div class="verify-result ' + result.state + '">' +
      '<div class="verify-banner"><div class="state-icon" aria-hidden="true">' + info.icon + '</div>' +
      '<div><h2>' + info.title + '</h2><p>' + info.text + '</p></div></div>' +
      '<div class="verify-body">' + body +
      '<p class="hint" style="margin-top:14px">Source: server record · checked ' + App.fmtDateTime(new Date().toISOString()) +
      ' · reference <span class="mono">' + h(ref) + '</span></p></div></div>';
  }

  function renderRecent() {
    var labels = { valid: ['Valid', 'success'], revoked: ['Revoked', 'danger'], invalid: ['Invalid', ''], mismatch: ['Mismatch', 'warning'] };
    document.getElementById('recent-count').textContent = recent.length ? recent.length + ' checked' : '';
    document.getElementById('recent-rows').innerHTML = recent.length ? recent.map(function (item) {
      var label = labels[item.state];
      return '<tr><td data-label="Time" class="nowrap">' + item.time + '</td>' +
        '<td data-label="Reference" class="mono">' + h(item.ref) + '</td>' +
        '<td data-label="Result"><span class="badge ' + label[1] + '">' + label[0] + '</span></td></tr>';
    }).join('') : '<tr><td colspan="3" class="empty-cell muted">No verifications yet.</td></tr>';
  }

  /* ---- Run one verification (used by both scan and manual entry) -------------------- */
  function verify(ref, presentedMatric, method) {
    scanButton.disabled = true;
    manualButton.disabled = true;
    resultEl.innerHTML = '<div class="verify-idle"><strong style="display:block;color:var(--foreground);font-weight:600">Checking the server record…</strong>Please wait.</div>';

    return mockServerLookup(ref, presentedMatric).then(function (result) {
      renderResult(result, ref);
      recent.unshift({ time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), ref: ref, state: result.state });
      recent = recent.slice(0, 8);
      renderRecent();
      App.audit('Clearance verification: ' + result.state, result.student ? result.student.matric : ref,
        method + ' check', result.student ? result.student.id : '');
      scanButton.disabled = false;
      manualButton.disabled = false;
      resultEl.scrollIntoView({ block: 'nearest' });
    });
  }

  /* ---- Simulated scan ------------------------------------------------------------------ */
  // Builds the content of the pretend QR code for the chosen scenario.
  function scenarioPayload(kind) {
    var issued = App.state.students.filter(function (s) { return s.request.status === 'approved'; });
    var valid = issued.filter(function (s) { return !s.clearance.revoked; });
    var revoked = issued.filter(function (s) { return s.clearance.revoked; });
    var pick = function (list) { return list[Math.floor(Math.random() * list.length)]; };

    if (kind === 'valid' && valid.length) { var v = pick(valid); return { ref: v.clearance.ref, matric: v.matric }; }
    if (kind === 'revoked' && revoked.length) { var r = pick(revoked); return { ref: r.clearance.ref, matric: r.matric }; }
    if (kind === 'mismatch' && valid.length) {
      var owner = pick(valid);
      var other = pick(App.state.students.filter(function (s) { return s.id !== owner.id; }));
      return { ref: owner.clearance.ref, matric: other.matric };
    }
    // Unknown reference (also the fallback if the demo data has no match)
    return { ref: AAUA_DATA.randomRef(), matric: '' };
  }

  scanButton.addEventListener('click', function () {
    var payload = scenarioPayload(document.getElementById('scenario').value);
    scanner.classList.add('scanning');
    scannerText.textContent = 'Scanning…';
    scanButton.disabled = true;
    setTimeout(function () {
      scanner.classList.remove('scanning');
      scannerText.innerHTML = 'Code read. Reference sent to the server.<br>Ready for the next scan.';
      verify(payload.ref, payload.matric, 'QR scan');
    }, 1000);
  });

  /* ---- Manual entry ---------------------------------------------------------------------- */
  document.getElementById('manual-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var refInput = document.getElementById('manual-ref');
    var ref = refInput.value.trim().toUpperCase();
    if (!ref) {
      App.setFieldError(refInput, 'Enter the clearance reference printed under the QR code.');
      refInput.focus();
      return;
    }
    if (ref.length < 8) {
      App.setFieldError(refInput, 'That reference is too short. Check the document and try again.');
      refInput.focus();
      return;
    }
    App.setFieldError(refInput, '');
    verify(ref, document.getElementById('manual-matric').value, 'Manual reference');
  });

  renderRecent();
});
