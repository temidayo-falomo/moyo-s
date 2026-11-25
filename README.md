# AAUA Secure Examination Clearance System — Frontend Prototype

A frontend-first prototype of an online examination clearance system for
Adekunle Ajasin University, Akungba-Akoko (AAUA). The pilot scope is the
**Department of Computer Science, Faculty of Computing**.

> **This is a prototype, not a production system.**
> - All students, staff, matric numbers and payment statuses are **fictional**.
> - It is **not connected** to the AAUA portal, the Bursary or any university system.
> - Sign-in, payment checks, approvals and QR verification are **simulated in the browser**.
> - Frontend code cannot secure anything. Every rule shown here must be enforced by a backend.
> - The AAUA logo (`assets/aaua-logo.jpg`) is used for branding only; this is still not an official university service.

## How to run

No build step and no dependencies — it is plain HTML, CSS and JavaScript.

**Option 1 — open the file.** Double-click `index.html`.

**Option 2 — local server (recommended).** From the project folder:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

**Replit.** Create an "HTML, CSS, JS" Repl, upload the files keeping the same
folder layout, and press Run. `index.html` is the entry page.

## Demo accounts

The login page lists these under "Demo student accounts" / "Demo staff
accounts", with a **Fill** button for each.

| Role | Sign-in ID | Password | What it shows |
| --- | --- | --- | --- |
| Student | first matric number listed on the login page | `Demo@2026` | Fees paid, no request yet (submit a request) |
| Student | second | `Demo@2026` | Clearance approved (open the document) |
| Student | third | `Demo@2026` | Fees not paid (not eligible) |
| Student | fourth | `Demo@2026` | Request returned as "needs review" |
| Faculty Officer | `FO-2041` | `Officer@2026` | Requests, batch approval, clearance windows |
| Invigilator | `INV-3317` | `Invig@2026` | QR / manual verification |
| Administrator | `ADM-1088` | `Admin@2026` | Records, payments, audit log, roles |

Only these accounts can sign in. There is deliberately no "sign in as any
student" shortcut. These passwords are demo values stored in `js/data.js`;
that is not authentication.

Use **Reset demo data** in the footer to return to the starting state.

## Suggested walkthrough

1. Sign in as the first demo student → **Request Examination Clearance** → attach any three small files, tick the declaration, submit. Status becomes *Pending review*.
2. Sign out, sign in as the Faculty Officer → search/filter, tick eligible rows, **Approve selected**. Open **Review** on a row to reject, return for review or revoke. Try the **Clearance windows** tab.
3. Sign in as the student again → open the clearance document and print it.
4. Sign in as the Invigilator → run each demo scan scenario (valid, revoked, invalid, mismatch), or type a reference from a clearance document into manual verification.
5. Sign in as the Administrator → browse records, simulated payments, the audit log and roles.

## Project structure

```
index.html               Landing page
login.html               Student and staff sign-in (mock)
student-dashboard.html   Student overview
clearance-request.html   Clearance request form and states
officer-dashboard.html   Faculty officer: requests, batch approval, scheduling
verification.html        Invigilator: QR scan (simulated) and manual check
clearance-preview.html   Printable clearance document
admin-dashboard.html     Records, payment verification, audit log, roles
assets/
  aaua-logo.jpg          AAUA logo used in the header and on the clearance document
css/
  styles.css             One shared stylesheet (tokens, components, responsive, print)
js/
  data.js                Fictional sample data generator (70 students) + demo accounts
  app.js                 Shared helpers: demo state, session, navigation, modals, tabs, toasts
  login.js               Page script for login.html
  student-dashboard.js   Page script for student-dashboard.html
  clearance-request.js   Page script for clearance-request.html
  officer-dashboard.js   Page script for officer-dashboard.html
  verification.js        Page script for verification.html
  clearance-preview.js   Page script for clearance-preview.html
  admin-dashboard.js     Page script for admin-dashboard.html
```

Every page loads `data.js`, then `app.js`, then its own page script.
`App.renderShell()` draws the shared header, navigation and footer so all
pages stay consistent.

## How the demo data works

- `js/data.js` generates 70 fictional students the first time the site opens.
  Names and matric numbers come from a seeded generator so they are the same
  on every computer. Each student has a distinct matric number and a distinct
  placeholder clearance reference.
- The state is saved in `localStorage` (`aaua_demo_state`) so changes survive
  moving between pages. This is **temporary demo state only** — it is not a
  trusted store for payments, approvals or sessions.
- Placeholder references look like `CLR-XXXX-XXXX-XXXX` and are random, but
  they are still placeholders. The QR graphic on the document is decorative
  and **cannot be scanned**.

## Intended security design (to be built on the backend)

| Rule | Shown in the prototype as | Backend must |
| --- | --- | --- |
| Students access only their own record | Student pages read the signed-in student only; URL values are ignored | Authorize every request against the session's student ID |
| Students cannot change payment status | Payment status is read-only for students | Never accept payment status from the client |
| Payment eligibility comes from the official portal | Read-only status and a re-check action | Query the university portal/Bursary server-to-server |
| Clearance approval must be authorized | Only the officer role sees approval controls | Check role and permission on each approval; re-check payment |
| Unique, unpredictable verification token | Random placeholder reference | Generate tokens with a cryptographically secure generator; store server-side |
| QR verification uses the authoritative record | Verification result comes from a mock lookup, not the document | Look the token up in the database; return current status |
| Full verification details only for authorized staff | Verification page restricted to the invigilator role | Require an invigilator session; return minimal data otherwise |
| Audit logging | Audit log tab and per-student activity | Write append-only audit entries on the server |

## What remains for backend development

- Real authentication (hashed passwords or university SSO), secure sessions, rate limiting, password reset.
- Server-side role-based access control for every endpoint.
- Database for students, requests, clearances, windows, staff and audit entries.
- Integration with the official AAUA portal for student records and school-fee payment status.
- Secure document upload and storage (type/size checks, virus scanning), and document viewing for officers.
- Secure token generation and real QR code rendering; a verification API; revocation.
- Real camera-based QR scanning on the invigilator page.
- Server-enforced clearance windows and deadlines.
- Tamper-resistant audit logging, monitoring and data-protection (NDPA) review.
- Server-generated PDF of the clearance document, notifications (email/SMS).
- Automated tests, accessibility audit and security testing before any live use.
