# CITE-SC Inventory Management System

**Web-Based Inventory Management System of the College of Information Technology Education Student Council** — a capstone demonstration prototype.

React 18 · Vite · Bootstrap 5 · React Router · Recharts · Lucide icons. **No backend and no database: all data lives in browser localStorage.**

## Run it
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 46 service tests (node:test) + 21 UI tests (vitest + jsdom)
npm run build      # production build into dist/
```

## Demo accounts
| Role | Sign in at | ID / Username | Password |
|---|---|---|---|
| Administrator | `/admin/login` | `admin` | `Admin@12345` |
| Demo student | `/login` | `2024-0001` | `Student@123` |

Register more students at `/register`. Registration can only ever create student/organization accounts; there is no way to create an administrator from the UI.

## Using the system
**Student / organization**
1. Browse Inventory → search/filter → **Request** (or My Requests → New Request).
2. Pick item, quantity (must not exceed available stock), purpose, dates. The request is saved as **Pending**; pending requests never reserve stock.
3. Track status and admin remarks in **My Requests**; cancel while Pending.
4. Once released, items appear in **My Borrowed Items**; returns appear in **Return History**; **Transaction History** shows your own activity trail; **My Profile** edits name/organization/email and password (role and ID number cannot be changed).

**Administrator**
1. **Item Requests**: approve (optional remarks) or reject (reason required). Approval does not touch stock.
2. **Release** an approved request: stock is re-checked and deducted exactly once.
3. **Return Management**: record Good / Damaged / Lost returns, partial returns allowed. Damaged returns create a **Damage Report**; lost units are recorded.
4. **Damage Reports**: Reported → Under Repair → Repaired (units return to available stock) or Disposed (removed from total). Closed reports are final.
5. **Inventory / Categories**: add, edit, adjust stock (with reason), archive/restore, delete only items with no history; categories in use cannot be deleted.
6. **Users**: search, filter, view request/borrow history, activate/deactivate students (admins cannot be changed or deactivate themselves).
7. **Transaction History**, **Reports and Analytics** (9 reports, date/category filters, search, sort, CSV export, print), **System Settings**.

### Reset demo data
Admin → System Settings → **Reset Demo Data** → type `RESET` to confirm. Everything returns to the seed data (including removing registered students); the reset itself is logged. Students never see this control, and the route is admin-only.

## Business rules (enforced in `src/services`, covered by tests)
`available = total − borrowed − damaged − lost`, never negative.
- Pending, approved, rejected and cancelled requests never change stock.
- Release deducts once; repeat release is refused; stock is re-validated at release.
- Good returns restore stock. Damaged and lost units never become available until a damage report is **Repaired**.
- Return quantity ≤ outstanding quantity. Partial returns supported.
- Deleting items/categories cannot orphan history; the transaction log is append-only.

## Architecture
```
src/
  context/     DataContext (single source of truth), AuthContext, ThemeContext, ToastContext
  services/    storageService (ONLY file touching localStorage), seedData, authService, inventoryService,
               requestService, returnService, damageService, userService, settingsService,
               reportService, transactionService   <- pure business logic, UI-independent
  utils/       validation, calculations, formatters, idGenerator, crypto
  assets/      logo.png (CITE-SC seal; favicons are in public/)
  components/  common (layout, modal, forms, tables), charts
  pages/       landing, auth, student, admin
  styles/      variables.css (all theme tokens), global.css
tests/         service tests + tests/ui (end-to-end flows)
```
**localStorage keys (three only):** `citesc_db` (entire database: users, categories, items, requests, borrows, returns, damageReports, transactions, settings), `citesc_session`, `citesc_theme`.
Pages read `db` from `DataContext` and change it only through `update(fn)`; services return `{ ok, error(s) }` and nothing is saved when `ok === false`. Because services are pure functions over a db object, a future backend can replace `storageService` / `DataContext` without rewriting the pages.

## Testing results (actually run)
Run with `npm test` on Node 22: **46 service tests + 21 UI tests passed**, `npm run build` succeeded, and the dev server was confirmed to start (HTTP 200).
- Service tests: login/registration rules, role separation, duplicates, stock formula, inventory/category rules, request lifecycle, release-once, competing requests, returns (good/damaged/lost/partial/excess), repair/disposal, reports, CSV escaping, user and settings rules, transaction-ID uniqueness, and a **randomized 400-step run** asserting borrowed/damaged/lost counts match records and available stock never goes negative.
- UI tests (simulated browser): protected routes and role redirects, student→admin→student request workflow with stock checks, returns and repair workflow, dashboard stats and charts, reports/CSV/print wiring, user deactivation blocking login, profile and password change, settings and reset (typed confirmation), refresh persistence, corrupted-storage recovery, theme persistence.

**Checked in real Chromium (screenshots, not just jsdom):** landing page (light, dark and a 390px phone width), student sign-in, and the student dashboard shell; no console errors or broken images; filled buttons measured at 10:1 contrast or better in both themes (this caught and fixed an invisible-button-text bug in dark mode).

**Not yet visually verified:** the admin pages (inventory tables, charts, modals), the reports print preview, the actual CSV download, other browsers (Firefox/Safari) and keyboard/screen-reader behaviour beyond labelled controls. Please check these manually before the demonstration.

## Security limitations (read before presenting)
- localStorage is per-browser and per-device; nothing syncs between devices or users. There is no real-time multi-user synchronization.
- Anyone using the browser can view, edit or clear storage, including the stored password hashes and the session.
- Passwords are salted SHA-256 hashes computed in the browser. This avoids storing plaintext but is **not production-secure** authentication (the salt is constant and the hash is readable).
- Role checks happen in client code and are not a substitute for server-side authorization.
- No concurrent transaction control: two browsers/tabs editing at once can overwrite each other.
- This prototype must not be described as production-secure.

## Known limitations
- Dates use the browser's local clock; "overdue" is computed on page load/render.
- CSV export neutralizes leading `= + - @` in text cells (prefixes `'`) to prevent spreadsheet formula injection.
- Charts (Recharts) are lazy-loaded so the landing and login pages stay light.
