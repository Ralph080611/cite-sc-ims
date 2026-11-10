import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { ThemeProvider } from '../../src/context/ThemeContext.jsx';
import { DataProvider } from '../../src/context/DataContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';

const mount = (path) => render(
  <MemoryRouter initialEntries={[path]}><ThemeProvider><DataProvider><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></DataProvider></ThemeProvider></MemoryRouter>);
const db = () => JSON.parse(localStorage.getItem('citesc_db'));
const chairs = () => db().items.find((i) => i.id === 'ITM-001');
const stat = (label) => Number(within(screen.getByText(label).closest('.stat-card')).getByText(/^\d+$/).textContent);

async function studentLogin(u) {
  await u.type(await screen.findByLabelText('ID Number'), '2024-0001');
  await u.type(screen.getByLabelText('Password'), 'Student@123');
  await u.click(screen.getByRole('button', { name: /^sign in$/i }));
  await screen.findByText(/Welcome, Demo Student/);
}
async function adminLogin(u) {
  await u.type(await screen.findByLabelText(/username/i), 'admin');
  await u.type(screen.getByLabelText('Password'), 'Admin@12345');
  await u.click(screen.getByRole('button', { name: /sign in as administrator/i }));
  await screen.findByText('Administrator Dashboard');
}

test('full request workflow: submit -> pending -> approve -> release -> stock deducted -> student sees it', async () => {
  const u = userEvent.setup(); mount('/login');
  await studentLogin(u);

  // invalid quantity is rejected and nothing is saved
  await u.click(screen.getByRole('link', { name: /browse inventory/i }));
  await u.click((await screen.findAllByRole('link', { name: /^request$/i }))[0]);
  await screen.findByText('Submit Item Request');
  await u.selectOptions(screen.getByLabelText('Select Item'), 'ITM-001');
  await u.clear(screen.getByLabelText('Requested Quantity')); await u.type(screen.getByLabelText('Requested Quantity'), '999');
  await u.type(screen.getByLabelText('Purpose'), 'Org assembly');
  await u.click(screen.getByRole('button', { name: /submit request/i }));
  expect(await screen.findByText(/only 60 pcs available/i)).toBeInTheDocument();
  expect(db().requests).toHaveLength(0);

  // valid submission
  await u.clear(screen.getByLabelText('Requested Quantity')); await u.type(screen.getByLabelText('Requested Quantity'), '10');
  await u.click(screen.getByRole('button', { name: /submit request/i }));
  await screen.findByText('My Requests', { selector: 'h1' });
  expect(db().requests).toHaveLength(1);
  expect(db().requests[0].status).toBe('Pending');
  expect(chairs().borrowedQuantity).toBe(0); // pending does not deduct or reserve
  expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);

  // admin sees it, with a pending badge
  await u.click(screen.getByRole('button', { name: /logout/i }));
  await u.click(await screen.findByRole('link', { name: /administrator login/i }));
  await adminLogin(u);
  expect(stat('Pending Requests')).toBe(1);
  expect(screen.getByLabelText('1 pending')).toBeInTheDocument();
  await u.click(screen.getByRole('link', { name: /item requests/i }));
  expect(await screen.findByText('Demo Student')).toBeInTheDocument();

  // reject requires a reason (validation) -- then approve instead
  await u.click(screen.getByRole('button', { name: /^reject REQ-/i }));
  await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^reject$/i }));
  expect((await screen.findAllByText(/rejection reason is required/i)).length).toBeGreaterThan(0);
  await u.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^cancel$/i }));
  expect(db().requests[0].status).toBe('Pending');

  await u.click(screen.getByRole('button', { name: /^approve REQ-/i }));
  await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^approve$/i }));
  await waitFor(() => expect(db().requests[0].status).toBe('Approved'));
  expect(chairs().borrowedQuantity).toBe(0); // approval does not deduct

  await u.click(screen.getByRole('button', { name: /^release REQ-/i }));
  await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^release$/i }));
  await waitFor(() => expect(db().requests[0].status).toBe('Released'));
  expect(chairs().borrowedQuantity).toBe(10); // deducted exactly once
  expect(db().borrows).toHaveLength(1);
  expect(screen.queryByRole('button', { name: /^release REQ-/i })).not.toBeInTheDocument();

  // admin dashboard reflects live data
  await u.click(screen.getByRole('link', { name: /^dashboard$/i }));
  expect(stat('Total Borrowed Items')).toBe(10);
  expect(stat('Pending Requests')).toBe(0);
  expect(stat('Total Available Stock')).toBe(db().items.reduce((a, i) => a + i.totalQuantity - i.borrowedQuantity - i.damagedQuantity - (i.lostQuantity || 0), 0));

  // student sees the update everywhere
  await u.click(screen.getByRole('button', { name: /logout/i }));
  await u.click(await screen.findByRole('link', { name: /student \/ organization sign in/i }));
  await studentLogin(u);
  expect(within(screen.getByText('Currently Borrowed').closest('.stat-card')).getByText('10')).toBeInTheDocument();
  await u.click(screen.getByRole('link', { name: /my requests/i }));
  expect(within(await screen.findByRole('table')).getByText('Released')).toBeInTheDocument();
  await u.click(screen.getByRole('link', { name: /my borrowed items/i }));
  const row = (await screen.findByText('Monobloc Chair')).closest('tr');
  expect(within(row).getByText('Active')).toBeInTheDocument();

  // transaction trail written in order
  expect(db().transactions.slice(-3).map((t) => t.type)).toEqual(['Item Request', 'Request Approved', 'Item Released']);
});

test('student can cancel a pending request; stock untouched; cannot cancel afterwards', async () => {
  const u = userEvent.setup(); mount('/login');
  await studentLogin(u);
  await u.click(screen.getByRole('link', { name: /my requests/i }));
  expect(await screen.findByText(/have not submitted any requests/i)).toBeInTheDocument();
  await u.click(screen.getByRole('link', { name: /new request/i }));
  await u.selectOptions(await screen.findByLabelText('Select Item'), 'ITM-003');
  await u.type(screen.getByLabelText('Purpose'), 'Seminar');
  await u.click(screen.getByRole('button', { name: /submit request/i }));
  await u.click(await screen.findByRole('button', { name: /^cancel REQ-/i }));
  await u.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /cancel request/i }));
  await waitFor(() => expect(db().requests[0].status).toBe('Cancelled'));
  expect(db().items.find((i) => i.id === 'ITM-003').borrowedQuantity).toBe(0);
  expect(screen.queryByRole('button', { name: /^cancel REQ-/i })).not.toBeInTheDocument();
});
