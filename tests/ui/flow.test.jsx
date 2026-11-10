import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { ThemeProvider } from '../../src/context/ThemeContext.jsx';
import { DataProvider } from '../../src/context/DataContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';

const mount = (path = '/') => render(
  <MemoryRouter initialEntries={[path]}><ThemeProvider><DataProvider><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></DataProvider></ThemeProvider></MemoryRouter>);

async function adminLogin(u) {
  await u.type(screen.getByLabelText(/username/i), 'admin');
  await u.type(screen.getByLabelText('Password'), 'Admin@12345');
  await u.click(screen.getByRole('button', { name: /sign in as administrator/i }));
  await screen.findByText('Administrator Dashboard');
}

test('unauthenticated access to protected routes redirects to the right login', async () => {
  mount('/admin/inventory');
  expect(await screen.findByText('Administrator Login', { selector: 'h1' })).toBeInTheDocument();
});
test('student cannot open admin routes', async () => {
  const u = userEvent.setup(); mount('/login');
  await u.type(screen.getByLabelText('ID Number'), '2024-0001');
  await u.type(screen.getByLabelText('Password'), 'Student@123');
  await u.click(screen.getByRole('button', { name: /^sign in$/i }));
  await screen.findByText(/Welcome, Demo Student/);
});
test('invalid admin login shows error', async () => {
  const u = userEvent.setup(); mount('/admin/login');
  await u.type(screen.getByLabelText(/username/i), 'admin');
  await u.type(screen.getByLabelText('Password'), 'bad');
  await u.click(screen.getByRole('button', { name: /sign in as administrator/i }));
  expect(await screen.findByText(/invalid id or password/i)).toBeInTheDocument();
});
test('admin adds an item; dashboard stats update; student then sees it in Browse Inventory', async () => {
  const u = userEvent.setup(); mount('/admin/login');
  await adminLogin(u);
  const before = Number(within(screen.getByText('Total Inventory Items').closest('.stat-card')).getByText(/^\d+$/).textContent);
  await u.click(screen.getByRole('link', { name: /inventory management/i }));
  await u.click(await screen.findByRole('button', { name: /add item/i }));
  const dlg = await screen.findByRole('dialog');
  await u.type(within(dlg).getByLabelText('Item Name'), 'Test Laptop');
  await u.clear(within(dlg).getByLabelText('Total Quantity')); await u.type(within(dlg).getByLabelText('Total Quantity'), '4');
  await u.click(within(dlg).getByRole('button', { name: /add item/i }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(screen.getByText('Test Laptop')).toBeInTheDocument();
  await u.click(screen.getByRole('link', { name: /^dashboard$/i }));
  const after = Number(within(screen.getByText('Total Inventory Items').closest('.stat-card')).getByText(/^\d+$/).textContent);
  expect(after).toBe(before + 1);
  // same db, student view (logout then student login)
  await u.click(screen.getByRole('button', { name: /logout/i }));
  await u.click(await screen.findByRole('link', { name: /student \/ organization sign in/i }));
  await u.type(await screen.findByLabelText('ID Number'), '2024-0001');
  await u.type(screen.getByLabelText('Password'), 'Student@123');
  await u.click(screen.getByRole('button', { name: /^sign in$/i }));
  await u.click(await screen.findByRole('link', { name: /browse inventory/i }));
  await u.type(screen.getByLabelText('Search items'), 'Test Laptop');
  expect(await screen.findByText('Test Laptop')).toBeInTheDocument();
});
test('registration creates student, duplicate ID rejected in UI', async () => {
  const u = userEvent.setup(); mount('/register');
  const fill = async (id, email) => {
    await u.clear(screen.getByLabelText('Full Name')); await u.type(screen.getByLabelText('Full Name'), 'New Person');
    await u.clear(screen.getByLabelText('ID Number')); await u.type(screen.getByLabelText('ID Number'), id);
    await u.clear(screen.getByLabelText(/organization/i)); await u.type(screen.getByLabelText(/organization/i), 'BSIT');
    await u.clear(screen.getByLabelText('Email Address')); await u.type(screen.getByLabelText('Email Address'), email);
    await u.clear(screen.getByLabelText('Password')); await u.type(screen.getByLabelText('Password'), 'Passw0rdX');
    await u.clear(screen.getByLabelText('Confirm Password')); await u.type(screen.getByLabelText('Confirm Password'), 'Passw0rdX');
    await u.click(screen.getByRole('button', { name: /create account/i }));
  };
  await fill('2024-0001', 'fresh@x.com');
  expect(await screen.findByText(/ID number is already registered/i)).toBeInTheDocument();
  await fill('2030-7777', 'fresh@x.com');
  expect(await screen.findByText(/registration successful/i)).toBeInTheDocument();
});
test('theme choice persists to localStorage', async () => {
  const u = userEvent.setup(); mount('/');
  await u.click(screen.getAllByRole('button', { name: /switch to dark mode/i })[0]);
  expect(JSON.parse(localStorage.getItem('citesc_theme'))).toBe('dark');
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
});
