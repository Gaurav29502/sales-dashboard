import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';
import { useMemo } from 'react';
import { TablePagination, useTablePagination } from './components/tablePagination/tablePagination';

const setPath = (path) => window.history.replaceState({}, '', path);

beforeEach(() => {
  localStorage.clear();
  setPath('/login');
});

test('login continues into the sales dashboard', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText(/salesperson id/i), { target: { value: 'sample-user' } });
  fireEvent.click(screen.getByRole('button', { name: /continue to dashboard/i }));
  expect(screen.getByRole('heading', { name: /sales overview/i })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/landing');
});

test('Dashboard filter applies Local view and keeps the monthly chart above category sales', () => {
  localStorage.setItem('salesPersonId', 'sample-user');
  setPath('/landing');
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /open filters/i }));
  const dialog = screen.getByRole('dialog', { name: /filter data/i });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Local', exact: true }));
  fireEvent.click(within(dialog).getByRole('button', { name: /apply filters/i }));
  expect(screen.getByLabelText(/active filters/i)).toHaveTextContent('Local');
  const headings = screen.getAllByRole('heading');
  const monthlyIndex = headings.findIndex((heading) => /month-wise sales/i.test(heading.textContent));
  const categoryIndex = headings.findIndex((heading) => /product category-wise sales/i.test(heading.textContent));
  expect(monthlyIndex).toBeGreaterThan(-1);
  expect(categoryIndex).toBeGreaterThan(monthlyIndex);
});

test('sales breakdown retains the category chart after country drilldown', () => {
  localStorage.setItem('salesPersonId', 'sample-user');
  setPath('/landing');
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /SALES .*Export sales/i }));
  expect(screen.getByRole('heading', { name: /product category-wise sales/i })).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: /view/i })[0]);
  expect(screen.getByRole('heading', { name: /country details/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /product category-wise sales/i })).toBeInTheDocument();
});

test('Ageing starts country-wise and drills into parties and invoices', () => {
  localStorage.setItem('salesPersonId', 'sample-user');
  setPath('/ageing-analysis');
  render(<App />);
  expect(screen.getByRole('heading', { name: /country-wise/i })).toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: /export csv/i })).toHaveLength(1);
  fireEvent.click(screen.getAllByRole('button', { name: /parties/i })[0]);
  expect(screen.getByRole('heading', { name: /party-wise/i })).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: /invoices/i })[0]);
  expect(screen.getByRole('columnheader', { name: /invoice date/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: /due date/i })).toBeInTheDocument();
});

test('Ageing bucket labels filter the party list', () => {
  localStorage.setItem('salesPersonId', 'sample-user');
  setPath('/ageing-analysis');
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /90\+ days/i }));
  expect(screen.getByRole('heading', { name: /parties with 90\+ days outstanding/i })).toBeInTheDocument();
  expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
});

test('Purchases filter narrows supplier rows and selected date months', () => {
  localStorage.setItem('salesPersonId', 'sample-user');
  setPath('/purchases');
  render(<App />);
  expect(screen.getAllByRole('button', { name: /export csv/i })).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: /open filters/i }));
  const dialog = screen.getByRole('dialog', { name: /filter data/i });
  fireEvent.change(within(dialog).getByLabelText(/supplier category/i), { target: { value: 'Machinery' } });
  fireEvent.change(within(dialog).getByLabelText('Date from'), { target: { value: '2024-08-15' } });
  fireEvent.change(within(dialog).getByLabelText('Date to'), { target: { value: '2024-09-15' } });
  fireEvent.click(within(dialog).getByRole('button', { name: /apply filters/i }));
  expect(screen.getByText('2 months in selected date range')).toBeInTheDocument();
  expect(screen.getByText('1 supplier group')).toBeInTheDocument();
  expect(screen.getByText('Gansons Engineering')).toBeInTheDocument();
});

test('Expenses rejects an inverted range and filters the monthly trend', () => {
  localStorage.setItem('salesPersonId', 'sample-user');
  setPath('/expenses');
  render(<App />);
  expect(screen.getAllByRole('button', { name: /export csv/i })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: /open filters/i }));
  const dialog = screen.getByRole('dialog', { name: /filter data/i });
  fireEvent.change(within(dialog).getByLabelText('Date from'), { target: { value: '2024-11-01' } });
  fireEvent.change(within(dialog).getByLabelText('Date to'), { target: { value: '2024-09-30' } });
  fireEvent.click(within(dialog).getByRole('button', { name: /apply filters/i }));
  expect(within(dialog).getByRole('alert')).toHaveTextContent(/date from must be on or before date to/i);
  fireEvent.change(within(dialog).getByLabelText('Date from'), { target: { value: '2024-06-15' } });
  fireEvent.change(within(dialog).getByLabelText('Date to'), { target: { value: '2024-07-15' } });
  fireEvent.click(within(dialog).getByRole('button', { name: /apply filters/i }));
  expect(screen.getByText('Jun')).toBeInTheDocument();
  expect(screen.getByText('Jul')).toBeInTheDocument();
  expect(screen.queryByText('May')).not.toBeInTheDocument();
});


const PaginationHarness = () => {
  const rows = useMemo(() => Array.from({ length: 125 }, (_, index) => `Record ${index + 1}`), []);
  const pagination = useTablePagination(rows);
  return <><ul>{pagination.pageRows.map((row) => <li key={row}>{row}</li>)}</ul><TablePagination pagination={pagination} /></>;
};

test('table pagination defaults to 100 rows and supports page size changes', () => {
  render(<PaginationHarness />);
  expect(screen.getAllByRole('listitem')).toHaveLength(100);
  expect(screen.getByLabelText('Rows per page')).toHaveValue('100');
  fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '10' } });
  expect(screen.getAllByRole('listitem')).toHaveLength(10);
  fireEvent.click(screen.getByRole('button', { name: /next page/i }));
  expect(screen.getByText(/Page\s+2\s+of\s+13/)).toBeInTheDocument();
  expect(screen.getByText('Record 11')).toBeInTheDocument();
});
