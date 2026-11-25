/* ==========================================================================
   login.js — student and staff sign-in (MOCK)
   --------------------------------------------------------------------------
   This compares what was typed with demo credentials stored in data.js.
   That is NOT real authentication: a real system sends the credentials to
   the server over HTTPS, and the server decides.

   There is intentionally no "sign in as another student" option. A student
   session is always created from the matric number + password entered here,
   and student pages only ever read the signed-in student's own record.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var wantsStaff = params.get('role') === 'staff';
  App.renderShell(wantsStaff ? 'login.html?role=staff' : 'login.html');

  // Already signed in? Go straight to the right dashboard.
  var existing = App.getSession();
  if (existing) {
    window.location.replace(App.ROLE_HOME[existing.role]);
    return;
  }

  var tabs = App.initTabs(document.getElementById('login-tabs'));
  if (wantsStaff) tabs.select('panel-staff', false);

  /* ---- Show / hide password ---------------------------------------------- */
  document.querySelectorAll('[data-toggle-password]').forEach(function (button) {
    button.addEventListener('click', function () {
      var input = document.getElementById(button.dataset.togglePassword);
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.textContent = show ? 'Hide' : 'Show';
      button.setAttribute('aria-pressed', show ? 'true' : 'false');
      button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  });

  /* ---- Forgot password (visual only) ------------------------------------- */
  document.querySelectorAll('[data-forgot]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      App.openModal('forgot-modal');
    });
  });

  /* ---- Demo account lists ------------------------------------------------- */
  document.getElementById('demo-student-password').textContent = AAUA_DATA.DEMO_STUDENT_PASSWORD;
  document.getElementById('demo-student-rows').innerHTML = AAUA_DATA.DEMO_STUDENTS.map(function (demo) {
    var student = App.findStudent(demo.studentId);
    return '<tr><td class="mono">' + App.escapeHtml(student.matric) + '</td><td>' + demo.label + '</td>' +
      '<td><button type="button" class="btn btn-outline btn-sm" data-fill-student="' + student.matric + '">Fill</button></td></tr>';
  }).join('');
  document.getElementById('demo-staff-rows').innerHTML = AAUA_DATA.DEMO_STAFF.map(function (demo) {
    return '<tr><td>' + demo.label + '</td><td class="mono">' + demo.staffId + '</td><td class="mono">' + demo.password + '</td>' +
      '<td><button type="button" class="btn btn-outline btn-sm" data-fill-staff="' + demo.staffId + '">Fill</button></td></tr>';
  }).join('');

  document.addEventListener('click', function (event) {
    var studentFill = event.target.closest('[data-fill-student]');
    if (studentFill) {
      document.getElementById('matric').value = studentFill.dataset.fillStudent;
      document.getElementById('student-password').value = AAUA_DATA.DEMO_STUDENT_PASSWORD;
      document.getElementById('matric').focus();
    }
    var staffFill = event.target.closest('[data-fill-staff]');
    if (staffFill) {
      var demo = AAUA_DATA.DEMO_STAFF.find(function (d) { return d.staffId === staffFill.dataset.fillStaff; });
      document.getElementById('staff-id').value = demo.staffId;
      document.getElementById('staff-password').value = demo.password;
      document.getElementById('staff-id').focus();
    }
  });

  function showFormError(id, message) {
    var box = document.getElementById(id);
    box.textContent = message;
    box.hidden = !message;
  }

  /* ---- Student sign-in ---------------------------------------------------- */
  var MATRIC_PATTERN = /^\d{9}$/; // nine digits, e.g. 220404323

  document.getElementById('student-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var matricInput = document.getElementById('matric');
    var passwordInput = document.getElementById('student-password');
    var matric = matricInput.value.trim();
    var password = passwordInput.value;
    var valid = true;
    showFormError('student-form-error', '');

    if (!matric) {
      App.setFieldError(matricInput, 'Enter your matriculation number.'); valid = false;
    } else if (!MATRIC_PATTERN.test(matric)) {
      App.setFieldError(matricInput, 'A matriculation number is 9 digits, for example 220404323.'); valid = false;
    } else {
      App.setFieldError(matricInput, '');
    }
    if (!password) {
      App.setFieldError(passwordInput, 'Enter your password.'); valid = false;
    } else {
      App.setFieldError(passwordInput, '');
    }
    if (!valid) {
      (matricInput.getAttribute('aria-invalid') ? matricInput : passwordInput).focus();
      return;
    }

    // MOCK credential check. The same message is shown whether the matric
    // number or the password is wrong, so the form does not reveal which
    // matric numbers exist.
    var student = App.findStudentByMatric(matric);
    var isDemoAccount = student && AAUA_DATA.DEMO_STUDENTS.some(function (d) { return d.studentId === student.id; });
    if (!isDemoAccount || password !== AAUA_DATA.DEMO_STUDENT_PASSWORD) {
      showFormError('student-form-error', 'Incorrect matriculation number or password.');
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }

    App.setSession({ role: 'student', id: student.id, name: student.name, ref: student.matric, at: new Date().toISOString() });
    App.audit('Student sign-in', student.matric, 'Session started', student.id);
    window.location.href = 'student-dashboard.html';
  });

  /* ---- Staff sign-in ------------------------------------------------------- */
  document.getElementById('staff-form').addEventListener('submit', function (event) {
    event.preventDefault();
    var idInput = document.getElementById('staff-id');
    var passwordInput = document.getElementById('staff-password');
    var staffId = idInput.value.trim();
    var password = passwordInput.value;
    var valid = true;
    showFormError('staff-form-error', '');

    if (!staffId) { App.setFieldError(idInput, 'Enter your staff ID.'); valid = false; } else { App.setFieldError(idInput, ''); }
    if (!password) { App.setFieldError(passwordInput, 'Enter your password.'); valid = false; } else { App.setFieldError(passwordInput, ''); }
    if (!valid) {
      (idInput.getAttribute('aria-invalid') ? idInput : passwordInput).focus();
      return;
    }

    var demo = AAUA_DATA.DEMO_STAFF.find(function (d) { return d.staffId.toUpperCase() === staffId.toUpperCase(); });
    var staff = App.findStaff(staffId);
    if (!demo || !staff || demo.password !== password) {
      showFormError('staff-form-error', 'Incorrect staff ID or password.');
      passwordInput.value = '';
      passwordInput.focus();
      return;
    }
    if (!staff.active) {
      showFormError('staff-form-error', 'This staff account has been deactivated by an administrator.');
      return;
    }

    // The role comes from the staff record (which an administrator manages),
    // never from something the person signing in chooses.
    App.setSession({ role: staff.role, id: staff.id, name: staff.name, ref: staff.staffId, at: new Date().toISOString() });
    App.audit('Staff sign-in', staff.staffId, 'Session started');
    window.location.href = App.ROLE_HOME[staff.role];
  });
});
