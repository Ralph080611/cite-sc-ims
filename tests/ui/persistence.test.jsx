import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { ThemeProvider } from '../../src/context/ThemeContext.jsx';
import { DataProvider } from '../../src/context/DataContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';

const app = (path) => <MemoryRouter initialEntries={[path]}><ThemeProvider><DataProvider><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></DataProvider></ThemeProvider></MemoryRouter>;

test('browser refresh keeps session, data and theme; logout clears the session', async () => {
  const u = userEvent.setup();
  const first = render(app('/admin/login'));
  await u.type(await screen.findByLabelText(/username/i), 'admin'); await u.type(screen.getByLabelText('Password'), 'Admin@12345');
  await u.click(screen.getByRole('button', { name: /sign in as administrator/i })); await screen.findByText('Administrator Dashboard');
  await u.click(screen.getByRole('link', { name: /categories/i })); await u.click(await screen.findByRole('button', { name: /add category/i }));
  await u.type(await screen.findByLabelText('Category Name'), 'Persistent Cat'); await u.click(screen.getByRole('button', { name: /^save$/i }));
  await screen.findByText('Persistent Cat');
  await u.click(screen.getAllByRole('button', { name: /switch to dark mode/i })[0]);

  first.unmount(); // "refresh": all React state is gone, only localStorage remains
  render(app('/admin/categories'));
  expect(await screen.findByText('Persistent Cat')).toBeInTheDocument();   // data + session survived, no redirect to login
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

  await u.click(screen.getByRole('button', { name: /logout/i }));
  expect(localStorage.getItem('citesc_session')).toBeNull();
  render(app('/admin/categories'));
  expect(await screen.findAllByText('Administrator Login')).not.toHaveLength(0); // protected route now redirects
});

test('corrupted localStorage falls back to seed data instead of crashing', async () => {
  localStorage.setItem('citesc_db', '{not json'); localStorage.setItem('citesc_session', '%%%'); localStorage.setItem('citesc_theme', '"sepia"');
  render(app('/'));
  expect(await screen.findAllByText(/Smart Inventory/)).not.toHaveLength(0);
  expect(JSON.parse(localStorage.getItem('citesc_db')).items.length).toBeGreaterThan(5);
  expect(document.documentElement.getAttribute('data-theme')).toBe('light');
});

test('logo is shown in the brand, landing hero and auth card, with alt text', async () => {
  const { unmount } = render(app('/'));
  expect((await screen.findAllByAltText('CITE-SC seal')).length).toBeGreaterThan(0);
  expect(screen.getByAltText(/official seal/i)).toBeInTheDocument();
  unmount();
  render(app('/login'));
  expect((await screen.findAllByAltText('CITE-SC seal')).length).toBe(2); // header brand + card seal
});
