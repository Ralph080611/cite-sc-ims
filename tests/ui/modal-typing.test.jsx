import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../src/App.jsx';
import { ThemeProvider } from '../../src/context/ThemeContext.jsx';
import { DataProvider } from '../../src/context/DataContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';

// Regression: modals whose form state lives in the parent page must keep focus while typing.
test('typing multiple characters in parent-state modals keeps every character', async () => {
  const u = userEvent.setup();
  render(<MemoryRouter initialEntries={['/admin/login']}><ThemeProvider><DataProvider><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></DataProvider></ThemeProvider></MemoryRouter>);
  await u.type(await screen.findByLabelText(/username/i), 'admin'); await u.type(screen.getByLabelText('Password'), 'Admin@12345');
  await u.click(screen.getByRole('button', { name: /sign in as administrator/i }));
  await screen.findByText('Administrator Dashboard');

  await u.click(screen.getByRole('link', { name: /categories/i }));
  await u.click(await screen.findByRole('button', { name: /add category/i }));
  const dlg = await screen.findByRole('dialog');
  await u.type(within(dlg).getByLabelText('Category Name'), 'Sports Equipment');
  expect(within(dlg).getByLabelText('Category Name')).toHaveValue('Sports Equipment');
  await u.type(within(dlg).getByLabelText('Description'), 'Balls and nets');
  expect(within(dlg).getByLabelText('Description')).toHaveValue('Balls and nets');
  await u.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

  await u.click(screen.getByRole('link', { name: /inventory management/i }));
  await u.click((await screen.findAllByRole('button', { name: /^adjust stock of/i }))[0]);
  const adj = await screen.findByRole('dialog');
  await u.type(within(adj).getByLabelText('Change in quantity'), '-12');
  await u.type(within(adj).getByLabelText('Reason'), 'Lost in storage');
  expect(within(adj).getByLabelText('Change in quantity')).toHaveValue(-12);
  expect(within(adj).getByLabelText('Reason')).toHaveValue('Lost in storage');
});
