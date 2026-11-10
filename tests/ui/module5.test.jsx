import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import App from '../../src/App.jsx';
import { ThemeProvider } from '../../src/context/ThemeContext.jsx';
import { DataProvider } from '../../src/context/DataContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import { buildSeedData } from '../../src/services/seedData.js';
import * as rq from '../../src/services/requestService.js';
import { processReturn } from '../../src/services/returnService.js';
import { todayStr } from '../../src/utils/formatters.js';

const T = todayStr();
const demo = { id: 'USR-DEMO-001', role: 'student', fullName: 'Demo Student', idNumber: '2024-0001', organization: 'BSIT - CITE' };
const adm = { id: 'USR-ADMIN-001', role: 'admin', fullName: 'System Administrator' };
const mount = (p) => render(<MemoryRouter initialEntries={[p]}><ThemeProvider><DataProvider><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></DataProvider></ThemeProvider></MemoryRouter>);
const db = () => JSON.parse(localStorage.getItem('citesc_db'));

function seedActivity() {
  const d = buildSeedData();
  d.users.push({ id: 'USR-2', role: 'student', fullName: 'Other Person', idNumber: '2025-9999', organization: 'BSCS', email: 'o@x.com', passwordHash: 'x', active: true, createdAt: new Date().toISOString() });
  const r = rq.submitRequest(d, demo, { itemId: 'ITM-001', quantity: '10', purpose: 'Assembly', dateNeeded: T, expectedReturnDate: T }, T);
  rq.approveRequest(d, r.request.id, '', adm); const { borrow } = rq.releaseRequest(d, r.request.id, adm);
  processReturn(d, borrow.id, { quantity: '3', condition: 'Damaged', returnDate: T, remarks: 'cracked' }, adm, T);
  localStorage.setItem('citesc_db', JSON.stringify(d));
}
async function adminLogin(u) {
  await u.type(await screen.findByLabelText(/username/i), 'admin'); await u.type(screen.getByLabelText('Password'), 'Admin@12345');
  await u.click(screen.getByRole('button', { name: /sign in as administrator/i })); await screen.findByText('Administrator Dashboard');
}
async function studentLogin(u, pw = 'Student@123') {
  await u.type(await screen.findByLabelText('ID Number'), '2024-0001'); await u.type(screen.getByLabelText('Password'), pw);
  await u.click(screen.getByRole('button', { name: /^sign in$/i }));
}

test('dashboard charts render from live data', async () => {
  seedActivity(); const u = userEvent.setup(); mount('/admin/login'); await adminLogin(u);
  expect(await screen.findByText(/inventory overview by category/i)).toBeInTheDocument();
  expect(await screen.findByText(/request status distribution/i)).toBeInTheDocument();
  expect(await screen.findByRole('img', { name: /units released and returned per day/i })).toBeInTheDocument();
  expect(within(screen.getByText('Damaged Items').closest('.stat-card')).getByText('3')).toBeInTheDocument();
});

test('admin transaction history: filter by type, search, details; student sees only own trail', async () => {
  seedActivity(); const u = userEvent.setup(); mount('/admin/login'); await adminLogin(u);
  await u.click(screen.getByRole('link', { name: /^transaction history$/i }));
  await screen.findByRole('table');
  await u.selectOptions(screen.getByLabelText('Filter by type'), 'Item Released');
  const rows = within(screen.getByRole('table')).getAllByRole('row'); expect(rows).toHaveLength(2);
  await u.selectOptions(screen.getByLabelText('Filter by type'), '');
  await u.type(screen.getByLabelText('Search transactions'), 'cracked'.slice(0, 0) + 'Damage');
  expect(within(screen.getByRole('table')).getAllByRole('row').length).toBeGreaterThan(1);
  await u.click(within(screen.getByRole('table')).getAllByRole('button', { name: /^view TXN-/i })[0]);
  expect(await within(await screen.findByRole('dialog')).findByText('Description')).toBeInTheDocument();
  await u.keyboard('{Escape}');
  await u.click(screen.getByRole('button', { name: /logout/i }));
  await u.click(await screen.findByRole('link', { name: /student \/ organization sign in/i }));
  await studentLogin(u); await screen.findByText(/Welcome, Demo Student/);
  await u.click(screen.getByRole('link', { name: /^transaction history$/i }));
  const t = await screen.findByRole('table');
  expect(within(t).queryByText(/Other Person/)).not.toBeInTheDocument();
  expect(within(t).getAllByText(/Item Released|Damage Report|Item Request/).length).toBeGreaterThan(2);
});

test('reports: switch report, filters, CSV export and print are wired', async () => {
  seedActivity();
  const click = vi.fn(); const create = vi.fn(() => 'blob:x'); URL.createObjectURL = create; URL.revokeObjectURL = vi.fn();
  const origCreate = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag) => { const el = origCreate(tag); if (tag === 'a') el.click = click; return el; });
  window.print = vi.fn();
  const u = userEvent.setup(); mount('/admin/login'); await adminLogin(u);
  await u.click(screen.getByRole('link', { name: /reports and analytics/i }));
  expect(await screen.findByText('Inventory Summary Report', { selector: 'h2' })).toBeInTheDocument();
  await u.selectOptions(screen.getByLabelText('Report type'), 'damaged');
  expect(await screen.findByText('Damaged Items Report', { selector: 'h2' })).toBeInTheDocument();
  expect(within(screen.getByRole('table')).getByText('cracked')).toBeInTheDocument();
  await u.type(screen.getByLabelText('Search report'), 'zzzz'); expect(screen.getByText(/no records match/i)).toBeInTheDocument();
  await u.clear(screen.getByLabelText('Search report'));
  await u.click(screen.getByRole('button', { name: /export csv/i }));
  expect(create).toHaveBeenCalledTimes(1); expect(click).toHaveBeenCalled();
  const blob = create.mock.calls[0][0]; expect(await blob.text()).toContain('Report ID,Item,Borrower');
  await u.click(screen.getByRole('button', { name: /print/i })); expect(window.print).toHaveBeenCalled();
  vi.restoreAllMocks();
});

test('user management: deactivate blocks login; reactivate restores it', async () => {
  seedActivity(); const u = userEvent.setup(); mount('/admin/login'); await adminLogin(u);
  await u.click(screen.getByRole('link', { name: /user management/i }));
  await u.click(await screen.findByRole('button', { name: /^deactivate Demo Student/i }));
  await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^deactivate$/i }));
  await waitFor(() => expect(db().users.find((x) => x.id === demo.id).active).toBe(false));
  expect(db().transactions.at(-1).type).toBe('User Deactivated');
  await u.click(screen.getByRole('button', { name: /logout/i }));
  await u.click(await screen.findByRole('link', { name: /student \/ organization sign in/i }));
  await studentLogin(u); expect(await screen.findByText(/account has been deactivated/i)).toBeInTheDocument();
  // history view works
  await u.click(screen.getByRole('link', { name: /administrator/i }));
  await adminLogin(u); await u.click(screen.getByRole('link', { name: /user management/i }));
  await u.click(await screen.findByRole('button', { name: /^view Demo Student/i }));
  expect(await within(await screen.findByRole('dialog')).findByText(/Request history \(1\)/)).toBeInTheDocument();
  await u.keyboard('{Escape}');
  await u.click(screen.getByRole('button', { name: /^activate Demo Student/i }));
  await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^activate$/i }));
  await waitFor(() => expect(db().users.find((x) => x.id === demo.id).active).toBe(true));
});

test('student profile: update details, cannot change role/ID, change password then log in with it', async () => {
  const u = userEvent.setup(); mount('/login'); await studentLogin(u);
  await u.click(await screen.findByRole('link', { name: /my profile/i }));
  await screen.findByText('Account details');
  expect(screen.queryByLabelText(/role/i)).not.toBeInTheDocument(); expect(screen.queryByLabelText('ID Number')).not.toBeInTheDocument();
  await u.clear(screen.getByLabelText('Full Name')); await u.type(screen.getByLabelText('Full Name'), 'Renamed Student');
  await u.click(screen.getByRole('button', { name: /save changes/i }));
  await waitFor(() => expect(db().users.find((x) => x.id === demo.id).fullName).toBe('Renamed Student'));
  expect(await screen.findAllByText('Renamed Student')).not.toHaveLength(0);
  await u.type(screen.getByLabelText('Current Password'), 'wrong'); await u.type(screen.getByLabelText('New Password'), 'NewPassw0rd'); await u.type(screen.getByLabelText('Confirm New Password'), 'NewPassw0rd');
  await u.click(screen.getByRole('button', { name: /change password/i }));
  expect(await screen.findByText(/current password is incorrect/i)).toBeInTheDocument();
  await u.clear(screen.getByLabelText('Current Password')); await u.type(screen.getByLabelText('Current Password'), 'Student@123');
  await u.click(screen.getByRole('button', { name: /change password/i }));
  await waitFor(() => expect(db().transactions.at(-1).type).toBe('Password Changed'));
  await u.click(screen.getByRole('button', { name: /logout/i }));
  await studentLogin(u, 'Student@123'); expect(await screen.findByText(/invalid id or password/i)).toBeInTheDocument();
  await u.clear(screen.getByLabelText('Password')); await u.type(screen.getByLabelText('Password'), 'NewPassw0rd');
  await u.click(screen.getByRole('button', { name: /^sign in$/i })); expect(await screen.findByText(/Welcome, Renamed Student/)).toBeInTheDocument();
});

test('settings: validation, default low stock reaches Add Item form; reset needs typed confirmation and restores seed', async () => {
  seedActivity(); const u = userEvent.setup(); mount('/admin/login'); await adminLogin(u);
  await u.click(screen.getByRole('link', { name: /system settings/i }));
  await u.clear(await screen.findByLabelText('Application Name')); await u.click(screen.getByRole('button', { name: /save settings/i }));
  expect(await screen.findByText(/application name is required/i)).toBeInTheDocument();
  await u.type(screen.getByLabelText('Application Name'), 'My IMS');
  await u.clear(screen.getByLabelText('Default Low-Stock Threshold')); await u.type(screen.getByLabelText('Default Low-Stock Threshold'), '7');
  await u.click(screen.getByRole('button', { name: /save settings/i }));
  await waitFor(() => expect(db().settings.defaultLowStock).toBe(7)); expect(document.title).toBe('My IMS');
  await u.click(screen.getByRole('link', { name: /inventory management/i }));
  await u.click(await screen.findByRole('button', { name: /add item/i }));
  expect(within(await screen.findByRole('dialog')).getByLabelText('Minimum Stock Level')).toHaveValue(7);
  await u.keyboard('{Escape}');

  await u.click(screen.getByRole('link', { name: /system settings/i }));
  await u.click(await screen.findByRole('button', { name: /reset demo data/i }));
  const dlg = await screen.findByRole('dialog'); const go = within(dlg).getByRole('button', { name: /reset everything/i });
  expect(go).toBeDisabled(); await u.type(within(dlg).getByLabelText(/type reset/i), 'reset'); expect(go).toBeDisabled();
  await u.clear(within(dlg).getByLabelText(/type reset/i)); await u.type(within(dlg).getByLabelText(/type reset/i), 'RESET'); await u.click(go);
  await waitFor(() => expect(db().requests).toHaveLength(0));
  expect(db().borrows).toHaveLength(0); expect(db().items.find((i) => i.id === 'ITM-001')).toMatchObject({ borrowedQuantity: 0, damagedQuantity: 0 });
  expect(db().users.some((x) => x.id === 'USR-2')).toBe(false); expect(db().settings.appName).toMatch(/CITE-SC/);
  expect(db().transactions.at(-1).type).toBe('Demo Data Reset'); expect(db().transactions.at(-1).performedBy).toBe('System Administrator');
  expect(screen.getByText('System Settings', { selector: 'h1' })).toBeInTheDocument(); // admin session survives
});

test('students cannot reach reset/settings/reports routes', async () => {
  const u = userEvent.setup(); mount('/login'); await studentLogin(u); await screen.findByText(/Welcome/);
  for (const path of ['/admin/settings', '/admin/reports', '/admin/users']) {
    const { unmount } = mount(path);
    expect(await screen.findAllByText(/Welcome, Demo Student/)).not.toHaveLength(0); expect(screen.queryByText('System Settings', { selector: 'h1' })).not.toBeInTheDocument(); unmount();
  }
});
