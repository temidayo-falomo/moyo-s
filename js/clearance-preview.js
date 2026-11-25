/* ==========================================================================
   clearance-preview.js — printable examination clearance document
   --------------------------------------------------------------------------
   Who sees which document (demo rules, to be enforced by the backend):
     - A student ALWAYS sees their own document. Any "?student=" value in the
       address bar is ignored for students.
     - A faculty officer or administrator may open a student's document from
       the review screen using "?student=<internal id>".

   The QR graphic is a decorative placeholder and cannot be scanned. A real
   QR code will encode a secure, unpredictable token issued by the backend.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var session = App.requireRole(['student', 'officer', 'admin']);
  if (!session) return;
  App.renderShell(session.role === 'student' ? 'clearance-preview.html' : 'officer-dashboard.html');

  var h = App.escapeHtml;
  var container = document.getElementById('doc-container');
  var printButton = document.getElementById('print-button');
  var student;

  if (session.role === 'student') {
    student = App.findStudent(session.id); // own record only
  } else {
    student = App.findStudent(new URLSearchParams(window.location.search).get('student'));
    document.getElementById('back-link').href = 'officer-dashboard.html';
  }

  printButton.addEventListener('click', function () { window.print(); });

  function showMessage(title, text, linkHref, linkLabel) {
    printButton.hidden = true;
    document.getElementById('doc-warning').hidden = true;
    container.innerHTML = '<div class="card" style="max-width:820px;margin:0 auto"><div class="empty-state">' +
      '<strong>' + title + '</strong>' + text +
      (linkHref ? '<p style="margin:16px 0 0"><a class="btn btn-primary" href="' + linkHref + '">' + linkLabel + '</a></p>' : '') +
      '</div></div>';
  }

  if (!student) {
    showMessage('No document selected', 'Open a clearance document from the request review screen.', 'officer-dashboard.html', 'Go to clearance requests');
    return;
  }

  var status = App.effectiveStatus(student);
  if (status !== 'approved' && status !== 'revoked') {
    if (session.role === 'student') {
      showMessage('No clearance document has been issued yet',
        'Your document will be available here once a faculty officer approves your clearance request.',
        'clearance-request.html', 'Go to clearance request');
    } else {
      showMessage('No clearance document has been issued for this student', 'The request has not been approved.', 'officer-dashboard.html', 'Go to clearance requests');
    }
    return;
  }

  var revoked = status === 'revoked';
  if (revoked) {
    printButton.disabled = true;
    printButton.title = 'A revoked clearance cannot be printed';
  }

  container.innerHTML =
    '<article class="doc" aria-label="Examination clearance document">' +
      (revoked ? '<div class="doc-stamp">REVOKED</div>' : '') +

      '<header class="doc-header">' + App.logoImg(96, 'Adekunle Ajasin University logo') +
        '<h1>' + h(AAUA_DATA.UNIVERSITY) + '</h1>' +
        '<p>Ondo State, Nigeria</p>' +
        '<p>' + h(student.faculty) + ' · Department of ' + h(student.department) + '</p>' +
      '</header>' +

      '<h2 class="doc-title">Examination Clearance</h2>' +

      '<div class="doc-grid">' +
        '<dl class="doc-fields">' +
          '<div><dt>Student name</dt><dd>' + h(student.name) + '</dd></div>' +
          '<div><dt>Matric number</dt><dd class="mono">' + h(student.matric) + '</dd></div>' +
          '<div><dt>Department</dt><dd>' + h(student.department) + '</dd></div>' +
          '<div><dt>Faculty</dt><dd>' + h(student.faculty) + '</dd></div>' +
          '<div><dt>Level</dt><dd>' + student.level + ' Level</dd></div>' +
          '<div><dt>Academic session</dt><dd>' + h(student.session) + '</dd></div>' +
          '<div><dt>Issue date</dt><dd>' + App.fmtDateTime(student.clearance.issuedAt) + '</dd></div>' +
          '<div><dt>Reference</dt><dd class="mono">' + h(student.clearance.ref) + '</dd></div>' +
        '</dl>' +
        '<div class="doc-side">' +
          '<div class="photo-box">Passport photograph</div>' +
          '<div class="qr-box">' + App.qrPlaceholderSvg(student.clearance.ref) +
            '<p class="qr-caption">Verification code</p></div>' +
        '</div>' +
      '</div>' +

      '<p class="doc-statement">This is to record that the student named above has been cleared by the ' + h(student.faculty) +
        ' to sit for examinations in the ' + h(student.session) + ' academic session, subject to verification of this clearance against the university record at the examination hall.</p>' +

      '<section class="doc-instructions">' +
        '<h3>Verification instructions</h3>' +
        '<ol>' +
          '<li>The invigilator scans the QR code, or enters the reference above, on the official verification page.</li>' +
          '<li>The system retrieves the student\'s current record from the university server. That record — not this document — decides whether the student is cleared.</li>' +
          '<li>The student must present a student ID card whose name and matric number match the server record.</li>' +
          '<li>This clearance can be revoked at any time. A printed copy, PDF, screenshot or QR image is not tamper-proof and is not proof of clearance by itself.</li>' +
        '</ol>' +
      '</section>' +

      '<div class="doc-sign">' +
        '<div>' + h(student.request.decidedBy || 'Faculty Officer') + '<br><span class="muted">Faculty Officer, ' + h(student.faculty) + '</span></div>' +
        '<div>Approved electronically<br><span class="muted">' + App.fmtDate(student.request.decidedAt) + '</span></div>' +
      '</div>' +
    '</article>';

  // Record that the document was opened (the backend would log this itself).
  App.audit('Clearance document viewed', student.matric, session.role === 'student' ? 'Viewed by owner' : 'Viewed by staff', student.id);
});
