import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { ThemeProvider } from '../../src/context/ThemeContext.jsx';
import { DataProvider } from '../../src/context/DataContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import { buildSeedData } from '../../src/services/seedData.js';
import * as rq from '../../src/services/requestService.js';
import { computeAvailable } from '../../src/utils/calculations.js';
import { todayStr } from '../../src/utils/formatters.js';

const demo = { id: 'USR-DEMO-001', role: 'student', fullName: 'Demo Student', idNumber: '2024-0001', organization: 'BSIT - CITE' };
const adm = { id: 'USR-ADMIN-001', role: 'admin', fullName: 'System Administrator' };

function seedReleased() {
  const db = buildSeedData(); const t = todayStr();
  const r = rq.submitRequest(db, demo, { itemId: 'ITM-001', quantity: '10', purpose: 'Assembly', dateNeeded: t, expectedReturnDate: t }, t);
  rq.approveRequest(db, r.request.id, '', adm); rq.releaseRequest(db, r.request.id, adm);
  localStorage.setItem('citesc_db', JSON.stringify(db));
}
const mount = (p) => render(<MemoryRouter initialEntries={[p]}><ThemeProvider><DataProvider><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></DataProvider></ThemeProvider></MemoryRouter>);
const db = () => JSON.parse(localStorage.getItem('citesc_db'));
const chairs = () => db().items.find((i) => i.id === 'ITM-001');

async function adminLogin(u) {
  await u.type(await screen.findByLabelText(/username/i), 'admin'); await u.type(screen.getByLabelText('Password'), 'Admin@12345');
  await u.click(screen.getByRole('button', { name: /sign in as administrator/i })); await screen.findByText('Administrator Dashboard');
}
async function processReturn(u, qty, condition, remarks) {
  await u.click(await screen.findByRole('button', { name: /^process return BRW-/i }));
  const dlg = await screen.findByRole('dialog');
  await u.clear(within(dlg).getByLabelText('Quantity Being Returned')); await u.type(within(dlg).getByLabelText('Quantity Being Returned'), String(qty));
  await u.selectOptions(within(dlg).getByLabelText('Item Condition'), condition);
  if (remarks) await u.type(within(dlg).getByLabelText(/remarks/i), remarks);
  await u.click(within(dlg).getByRole('button', { name: /record return/i }));
  return dlg;
}

test('returns workflow: excess blocked, partial good, damaged needs remarks, repair restores stock, student sees history', async () => {
  seedReleased();
  const u = userEvent.setup(); mount('/admin/login');
  await adminLogin(u);
  expect(chairs().borrowedQuantity).toBe(10);
  await u.click(screen.getByRole('link', { name: /return management/i }));

  // excessive quantity rejected, nothing changes
  const dlg = await processReturn(u, 11, 'Good');
  expect(await within(dlg).findByText(/cannot exceed the outstanding quantity \(10\)/i)).toBeInTheDocument();
  expect(db().returns).toHaveLength(0);
  await u.click(within(dlg).getByRole('button', { name: /^cancel$/i }));

  // partial good return 6 -> 4 outstanding
  await processReturn(u, 6, 'Good');
  await waitFor(() => expect(db().returns).toHaveLength(1));
  expect(chairs().borrowedQuantity).toBe(4); expect(computeAvailable(chairs())).toBe(56);
  expect(db().requests[0].status).toBe('Partially Returned');

  // damaged return of 3 requires remarks, then succeeds and is NOT available
  const d2 = await processReturn(u, 3, 'Damaged');
  expect(await within(d2).findByText(/describe the damage/i)).toBeInTheDocument();
  await u.type(within(d2).getByLabelText(/remarks/i), 'Cracked seats');
  await u.click(within(d2).getByRole('button', { name: /record return/i }));
  await waitFor(() => expect(db().damageReports).toHaveLength(1));
  expect(chairs()).toMatchObject({ borrowedQuantity: 1, damagedQuantity: 3 });
  expect(computeAvailable(chairs())).toBe(56);

  // lost return of the last 1 completes the borrow
  await processReturn(u, 1, 'Lost', 'Left at venue');
  await waitFor(() => expect(db().requests[0].status).toBe('Returned'));
  expect(chairs()).toMatchObject({ borrowedQuantity: 0, damagedQuantity: 3, lostQuantity: 1 });
  expect(computeAvailable(chairs())).toBe(56);
  expect(screen.getByText(/nothing is waiting to be returned/i)).toBeInTheDocument();

  // borrowing management shows completed
  await u.click(screen.getByRole('link', { name: /borrowing management/i }));
  expect(await screen.findByText('Completed', { selector: '.status-badge' })).toBeInTheDocument();

  // damage page: repair needs a decision, then restores availability exactly once
  await u.click(screen.getByRole('link', { name: /damage reports/i }));
  await u.click(await screen.findByRole('button', { name: /^manage DMG-/i }));
  const m = await screen.findByRole('dialog');
  await u.selectOptions(within(m).getByLabelText('Update status'), 'Repaired');
  await u.click(within(m).getByRole('button', { name: /save update/i }));
  expect(await within(m).findByText(/record the repair/i)).toBeInTheDocument();
  await u.type(within(m).getByLabelText(/remarks/i), 'Reupholstered');
  await u.click(within(m).getByRole('button', { name: /save update/i }));
  await waitFor(() => expect(db().damageReports[0].status).toBe('Repaired'));
  expect(chairs().damagedQuantity).toBe(0); expect(computeAvailable(chairs())).toBe(59); // 60 - 1 lost

  // student's return history, then admin dashboard consistency
  await u.click(screen.getByRole('button', { name: /logout/i }));
  await u.click(await screen.findByRole('link', { name: /student \/ organization sign in/i }));
  await u.type(await screen.findByLabelText('ID Number'), '2024-0001'); await u.type(screen.getByLabelText('Password'), 'Student@123');
  await u.click(screen.getByRole('button', { name: /^sign in$/i }));
  await u.click(await screen.findByRole('link', { name: /return history/i }));
  const table = await screen.findByRole('table');
  expect(within(table).getAllByRole('row')).toHaveLength(4); // header + 3 returns
  expect(within(table).getByText('Left at venue')).toBeInTheDocument();
  expect(db().transactions.map((t) => t.type)).toEqual(expect.arrayContaining(['Partial Return', 'Damage Report', 'Item Lost', 'Item Repaired']));
});

test('admin dashboard shows overdue alert and live damaged count', async () => {
  const d = buildSeedData(); const t = todayStr();
  const r = rq.submitRequest(d, demo, { itemId: 'ITM-002', quantity: '2', purpose: 'Old', dateNeeded: t, expectedReturnDate: t }, t);
  rq.approveRequest(d, r.request.id, '', adm); rq.releaseRequest(d, r.request.id, adm);
  d.borrows[0].expectedReturnDate = '2020-01-01'; // force overdue
  localStorage.setItem('citesc_db', JSON.stringify(d));
  const u = userEvent.setup(); mount('/admin/login'); await adminLogin(u);
  const card = screen.getByText('Overdue Items').closest('.stat-card');
  expect(within(card).getByText('1')).toBeInTheDocument();
  expect(screen.getByText(/was due/i)).toBeInTheDocument();
});
