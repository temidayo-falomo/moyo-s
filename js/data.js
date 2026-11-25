/* ==========================================================================
   data.js — FICTIONAL sample data for the prototype
   --------------------------------------------------------------------------
   IMPORTANT
   - Every name, matric number, staff ID and payment status in this file is
     invented. None of it is an actual AAUA record.
   - In the real system this file would not exist: all of this would come
     from a backend API that checks who is asking before returning anything.
   - Demo passwords live here only because there is no backend. Anything in a
     browser file can be read by anyone, so this is NOT authentication.
   ========================================================================== */

var AAUA_DATA = (function () {
  'use strict';

  var SESSION = '2026/2027';
  var DEPARTMENT = 'Computer Science';
  var FACULTY = 'Faculty of Computing';
  var UNIVERSITY = 'Adekunle Ajasin University, Akungba-Akoko';
  var DEPT_CODE = '0404'; // placeholder faculty/department code used inside matric numbers

  var FIRST_NAMES = [
    'Adebayo', 'Temitope', 'Oluwaseun', 'Funmilayo', 'Chinedu', 'Ngozi', 'Ibrahim', 'Aisha',
    'Emeka', 'Folasade', 'Babatunde', 'Yetunde', 'Chukwuma', 'Amaka', 'Olumide', 'Titilayo',
    'Segun', 'Bukola', 'Kehinde', 'Taiwo', 'Damilola', 'Ayomide', 'Opeyemi', 'Ifeoluwa',
    'Uchenna', 'Halima', 'Musa', 'Blessing', 'Samuel', 'Esther', 'Daniel', 'Precious',
    'Tobiloba', 'Morenikeji', 'Abiodun', 'Omolara', 'Gbenga', 'Zainab', 'Victor', 'Adaeze'
  ];
  var LAST_NAMES = [
    'Adeyemi', 'Ogunleye', 'Okafor', 'Balogun', 'Akinola', 'Olawale', 'Eze', 'Adegoke',
    'Akintola', 'Oyebanji', 'Nwosu', 'Lawal', 'Ajayi', 'Omotosho', 'Bello', 'Oladipo',
    'Akande', 'Ibitoye', 'Famuyiwa', 'Olorunfemi', 'Aderibigbe', 'Onyeka', 'Salami', 'Owolabi',
    'Adetunji', 'Ogundipe', 'Arowosegbe', 'Olaniyan', 'Ekundayo', 'Abubakar', 'Obi', 'Faleye',
    'Oyedele', 'Adekanmbi', 'Ilesanmi', 'Akinrinade'
  ];

  var REVIEW_NOTES = [
    'Passport photograph is unclear. Please upload a recent photograph with a plain background.',
    'The student ID card uploaded does not match your current level.',
    'School-fee receipt is unreadable. Please upload a clearer copy.'
  ];

  /* A small seeded random-number generator so that names and matric numbers
     are the same on every computer (useful for a demo and for the README). */
  function seededRandom(seed) {
    var a = seed;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Placeholder clearance reference.
     This uses the browser's random generator so references are not a simple
     sequence — but it is still ONLY a placeholder. Real verification tokens
     must be generated, stored and checked by the backend. */
  function randomRef() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters
    var values = new Uint32Array(12);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(values);
    } else {
      for (var i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 4294967296);
    }
    var out = '';
    for (var j = 0; j < values.length; j++) {
      out += alphabet[values[j] % alphabet.length];
      if (j % 4 === 3 && j < values.length - 1) out += '-';
    }
    return 'CLR-' + out;
  }

  function hoursAgo(now, hours) {
    return new Date(now - hours * 3600 * 1000).toISOString();
  }

  /* Builds the whole starting state for the demo. */
  function buildInitialState() {
    var rand = seededRandom(20262027);
    var now = Date.now();
    var entryYear = { 100: '26', 200: '25', 300: '24', 400: '23' };

    // The first four students are the demo login accounts (fixed levels).
    var levels = [300, 400, 200, 100];
    var rest = [];
    var counts = { 100: 17, 200: 17, 300: 16, 400: 16 };
    Object.keys(counts).forEach(function (lvl) {
      for (var i = 0; i < counts[lvl]; i++) rest.push(Number(lvl));
    });
    rest.sort(function () { return rand() - 0.5; });
    levels = levels.concat(rest);

    var usedNames = {};
    var usedNumbers = {};
    var usedRefs = {};
    var students = [];

    for (var i = 0; i < 70; i++) {
      // Distinct name
      var name;
      do {
        name = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)] + ' ' +
               LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
      } while (usedNames[name]);
      usedNames[name] = true;

      // Distinct, non-sequential 9-digit matric number in the AAUA style:
      // 2-digit entry year + 4-digit faculty/department code + 3-digit serial,
      // e.g. 240404317. The numbers themselves are invented for this demo.
      var number;
      do { number = 100 + Math.floor(rand() * 900); } while (usedNumbers[number]);
      usedNumbers[number] = true;
      var level = levels[i];
      var matric = entryYear[level] + DEPT_CODE + number;

      // Distinct placeholder clearance reference
      var ref;
      do { ref = randomRef(); } while (usedRefs[ref]);
      usedRefs[ref] = true;

      // SIMULATED payment status
      var r = rand();
      var feeStatus = r < 0.74 ? 'paid' : (r < 0.86 ? 'part' : 'unpaid');

      // Request status
      var status = 'none';
      var note = '';
      var r2 = rand();
      if (feeStatus === 'paid') {
        status = r2 < 0.38 ? 'pending' : (r2 < 0.68 ? 'approved' : (r2 < 0.78 ? 'needs_review' : 'none'));
        if (status === 'needs_review') note = REVIEW_NOTES[Math.floor(rand() * REVIEW_NOTES.length)];
      } else if (feeStatus === 'part') {
        status = r2 < 0.5 ? 'needs_review' : (r2 < 0.7 ? 'pending' : 'none');
        if (status === 'needs_review') note = 'Portal record shows part payment only. Full payment is required for clearance.';
      } else {
        status = r2 < 0.3 ? 'pending' : 'none';
      }

      var submittedHours = 6 + Math.floor(rand() * 200);
      var decidedHours = Math.max(1, submittedHours - 2 - Math.floor(rand() * 30));

      students.push({
        id: 's' + (i + 1 < 10 ? '0' : '') + (i + 1),
        name: name,
        matric: matric,
        level: level,
        session: SESSION,
        department: DEPARTMENT,
        faculty: FACULTY,
        feeStatus: feeStatus,
        feeCheckedAt: hoursAgo(now, 2 + Math.floor(rand() * 40)),
        request: {
          status: status,
          submittedAt: status === 'none' ? null : hoursAgo(now, submittedHours),
          decidedAt: (status === 'approved' || status === 'needs_review') ? hoursAgo(now, decidedHours) : null,
          decidedBy: (status === 'approved' || status === 'needs_review') ? 'Mrs. Abimbola Oyelaran' : null,
          note: note,
          docs: status === 'none' ? null : { receipt: 'fee-receipt.pdf', photo: 'passport-photo.jpg', idcard: 'student-id-card.jpg' }
        },
        clearance: {
          ref: ref,
          issuedAt: status === 'approved' ? hoursAgo(now, decidedHours) : null,
          revoked: false,
          revokedAt: null,
          revokeReason: ''
        }
      });
    }

    // Fixed scenarios for the four demo login accounts
    function setScenario(index, fee, status, noteText) {
      var s = students[index];
      s.feeStatus = fee;
      s.request.status = status;
      s.request.note = noteText || '';
      var has = status !== 'none';
      var decided = status === 'approved' || status === 'needs_review';
      s.request.submittedAt = has ? hoursAgo(now, 50) : null;
      s.request.decidedAt = decided ? hoursAgo(now, 20) : null;
      s.request.decidedBy = decided ? 'Mrs. Abimbola Oyelaran' : null;
      s.request.docs = has ? { receipt: 'fee-receipt.pdf', photo: 'passport-photo.jpg', idcard: 'student-id-card.jpg' } : null;
      s.clearance.issuedAt = status === 'approved' ? hoursAgo(now, 20) : null;
    }
    setScenario(0, 'paid', 'none');
    setScenario(1, 'paid', 'approved');
    setScenario(2, 'unpaid', 'none');
    setScenario(3, 'paid', 'needs_review', REVIEW_NOTES[0]);

    // Two revoked clearances so the invigilator page can show that state
    var revokedCount = 0;
    for (var k = 4; k < students.length && revokedCount < 2; k++) {
      if (students[k].request.status === 'approved') {
        students[k].clearance.revoked = true;
        students[k].clearance.revokedAt = hoursAgo(now, 5);
        students[k].clearance.revokeReason = revokedCount === 0
          ? 'Payment reversal reported by the Bursary.'
          : 'Clearance issued in error; under review by the faculty office.';
        revokedCount++;
      }
    }

    // Fictional staff accounts
    var staff = [
      { id: 'st1', staffId: 'FO-2041', name: 'Mrs. Abimbola Oyelaran', role: 'officer', active: true },
      { id: 'st2', staffId: 'INV-3317', name: 'Dr. Kolawole Adesina', role: 'invigilator', active: true },
      { id: 'st3', staffId: 'ADM-1088', name: 'Mr. Olumide Fagbemi', role: 'admin', active: true },
      { id: 'st4', staffId: 'INV-3352', name: 'Mrs. Ronke Ajibade', role: 'invigilator', active: true },
      { id: 'st5', staffId: 'INV-3390', name: 'Mr. Segun Olatunji', role: 'invigilator', active: false },
      { id: 'st6', staffId: 'FO-2077', name: 'Mr. Dele Akinwale', role: 'officer', active: true }
    ];

    // Clearance windows (one open now, one already closed)
    var day = 24 * 3600 * 1000;
    var windows = [
      {
        id: 'w1', title: 'First Semester Examination Clearance', level: 'all',
        opensAt: new Date(now - 3 * day).toISOString(),
        closesAt: new Date(now + 11 * day).toISOString(),
        deadline: new Date(now + 13 * day).toISOString(),
        createdBy: 'Mrs. Abimbola Oyelaran'
      },
      {
        id: 'w2', title: 'Early Clearance (400 Level)', level: '400',
        opensAt: new Date(now - 20 * day).toISOString(),
        closesAt: new Date(now - 10 * day).toISOString(),
        deadline: new Date(now - 9 * day).toISOString(),
        createdBy: 'Mrs. Abimbola Oyelaran'
      }
    ];

    // Seed the audit log from the generated records
    var audit = [];
    var auditId = 1;
    function log(at, actor, role, action, target, targetId, detail) {
      audit.push({ id: 'a' + (auditId++), at: at, actor: actor, role: role, action: action, target: target, targetId: targetId || '', detail: detail || '' });
    }
    students.forEach(function (s) {
      if (s.request.submittedAt) {
        log(s.request.submittedAt, s.name, 'student', 'Clearance request submitted', s.matric, s.id, 'Documents attached: 3');
      }
      if (s.request.status === 'approved') {
        log(s.request.decidedAt, s.request.decidedBy, 'officer', 'Clearance approved', s.matric, s.id, 'Clearance document issued');
      }
      if (s.request.status === 'needs_review') {
        log(s.request.decidedAt, s.request.decidedBy, 'officer', 'Marked as needs review', s.matric, s.id, s.request.note);
      }
      if (s.clearance.revoked) {
        log(s.clearance.revokedAt, 'Mrs. Abimbola Oyelaran', 'officer', 'Clearance revoked', s.matric, s.id, s.clearance.revokeReason);
      }
    });
    log(hoursAgo(now, 1.5), 'System', 'system', 'Payment status sync', 'Computer Science', '', '70 records refreshed from the portal');
    log(hoursAgo(now, 3), 'Mr. Olumide Fagbemi', 'admin', 'Staff sign-in', 'ADM-1088', '', 'Session started');
    log(hoursAgo(now, 4), 'Dr. Kolawole Adesina', 'invigilator', 'Staff sign-in', 'INV-3317', '', 'Session started');
    log(hoursAgo(now, 72), 'Mrs. Abimbola Oyelaran', 'officer', 'Clearance window created', 'First Semester Examination Clearance', '', 'All levels');
    log(hoursAgo(now, 96), 'Mr. Olumide Fagbemi', 'admin', 'Account deactivated', 'INV-3390', '', 'Mr. Segun Olatunji');
    audit.sort(function (a, b) { return a.at < b.at ? 1 : -1; });

    return { version: VERSION, createdAt: new Date(now).toISOString(), students: students, staff: staff, windows: windows, audit: audit };
  }

  // Bump this number whenever the data shape changes so old demo state is discarded.
  var VERSION = 3;

  /* DEMO SIGN-IN DETAILS — prototype only.
     Only these accounts can sign in. There is deliberately no "sign in as any
     student" shortcut. A real system verifies credentials on the server. */
  var DEMO_STUDENT_PASSWORD = 'Demo@2026';
  var DEMO_STUDENTS = [
    { studentId: 's01', label: 'Fees paid, no request yet' },
    { studentId: 's02', label: 'Clearance approved' },
    { studentId: 's03', label: 'Fees not paid (not eligible)' },
    { studentId: 's04', label: 'Request needs review' }
  ];
  var DEMO_STAFF = [
    { staffId: 'FO-2041', password: 'Officer@2026', label: 'Faculty Officer' },
    { staffId: 'INV-3317', password: 'Invig@2026', label: 'Invigilator' },
    { staffId: 'ADM-1088', password: 'Admin@2026', label: 'Administrator' }
  ];

  return {
    VERSION: VERSION,
    SESSION: SESSION,
    DEPARTMENT: DEPARTMENT,
    FACULTY: FACULTY,
    UNIVERSITY: UNIVERSITY,
    DEMO_STUDENT_PASSWORD: DEMO_STUDENT_PASSWORD,
    DEMO_STUDENTS: DEMO_STUDENTS,
    DEMO_STAFF: DEMO_STAFF,
    buildInitialState: buildInitialState,
    randomRef: randomRef
  };
})();
