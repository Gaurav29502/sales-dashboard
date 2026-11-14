import React, { useCallback, useEffect, useMemo, useState } from "react";
import { expenseData } from "../../../data/financeData.js";
import "./expenses.css";
import { TablePagination, useTablePagination } from "../../../components/tablePagination/tablePagination.jsx";

const initialFilters = { dateFrom: expenseData.period.from, dateTo: expenseData.period.to };
const formatCr = (value) => `₹${Number(value || 0).toFixed(2)} Cr`;
const monthDateRange = (index) => {
  const year = index < 9 ? 2024 : 2025;
  const month = (index + 3) % 12 + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return { start: `${year}-${String(month).padStart(2, "0")}-01`, end: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}` };
};

export const Expenses = ({ registerFilterHandler }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [dateError, setDateError] = useState("");
  const totalExpenses = useMemo(() => expenseData.groups.reduce((sum, group) => sum + group.amount, 0), []);
  const totalActual = totalExpenses / expenseData.netSales * 100;
  const overLimitGroups = expenseData.groups.filter((group) => group.actual > group.limit);
  const largestVariance = Math.max(...expenseData.groups.map((group) => group.actual - group.limit));
  const monthlyRows = useMemo(() => expenseData.monthly.filter((row, index) => {
    const { start, end } = monthDateRange(index);
    return end >= activeFilters.dateFrom && start <= activeFilters.dateTo;
  }), [activeFilters]);
  const sortedGroups = useMemo(() => [...expenseData.groups].sort((a, b) => (b.actual - b.limit) - (a.actual - a.limit)), []);
  const expensePagination = useTablePagination(expenseData.groups);
  const openFilters = useCallback(() => { setDraftFilters(activeFilters); setDateError(""); setIsFilterOpen(true); }, [activeFilters]);
  useEffect(() => { registerFilterHandler(openFilters); return () => registerFilterHandler(null); }, [openFilters, registerFilterHandler]);
  const applyFilters = () => {
    if (draftFilters.dateFrom > draftFilters.dateTo) { setDateError("Date from must be on or before Date to."); return; }
    setActiveFilters(draftFilters); setDateError(""); setIsFilterOpen(false);
  };
  const clearFilters = () => { setDraftFilters(initialFilters); setDateError(""); };

  return (
    <main className="expensesMain">
      <div className="expensesIntroRow"><div><div className="expensesEyebrow"><span /> PROFITABILITY MONITOR</div><h1>Expense Control</h1><p>Balance-sheet expense groups monitored as a percentage of sales</p></div><div className="expensesOverLimitBadge">{overLimitGroups.length} of {expenseData.groups.length} groups above limit</div></div>

      <section className="expenseMetricGrid" aria-label="Expense control summary">
        <ExpenseMetric icon="₹" label="Net sales" value={formatCr(expenseData.netSales)} detail="Percentage calculation base" tone="blue" />
        <ExpenseMetric icon="EX" label="Tracked expenses" value={formatCr(totalExpenses)} detail={`${totalActual.toFixed(1)}% of net sales`} tone="purple" />
        <ExpenseMetric icon="%" label="Control limit" value="75.5%" detail={`${(totalActual - 75.5).toFixed(1)} pp current variance`} tone="green" />
        <ExpenseMetric icon="AL" label="Groups over limit" value={`${overLimitGroups.length} / ${expenseData.groups.length}`} detail="Highlighted below" tone="red" />
        <ExpenseMetric icon="∆" label="Largest variance" value={`+${largestVariance.toFixed(1)} pp`} detail="Against group threshold" tone="amber" />
      </section>

      <div className="expenseControlGrid">
        <section className="expensesPanel expenseGroupsPanel"><PanelHeading title="Expense groups vs control limit" tag="% of sales" /><div className="expenseTableScroll"><table className="expenseGroupsTable"><thead><tr><th>Expense group</th><th>Amount</th><th>Actual</th><th>Limit</th><th>Variance</th><th>Status</th></tr></thead><tbody>{expensePagination.pageRows.map((group) => { const variance = group.actual - group.limit; const over = variance > 0; return <tr key={group.name} className={over ? "expenseRowOver" : "expenseRowWithin"}><td><b>{group.name}</b><small>{group.description}</small></td><td>{formatCr(group.amount)}</td><td className={over ? "expenseActualOver" : "expenseActualWithin"}>{group.actual.toFixed(1)}%</td><td>{group.limit.toFixed(1)}%</td><td className={over ? "expenseVarianceOver" : "expenseVarianceWithin"}>{variance > 0 ? "+" : ""}{variance.toFixed(1)} pp</td><td><span className={over ? "expenseStatus expenseStatusOver" : "expenseStatus expenseStatusWithin"}>{over ? "Above limit" : "Within limit"}</span></td></tr>; })}</tbody><tfoot><tr><th>Total tracked expenses</th><th>{formatCr(totalExpenses)}</th><th>{totalActual.toFixed(1)}%</th><th>75.5%</th><th>+{(totalActual - 75.5).toFixed(1)} pp</th><th /></tr></tfoot></table></div><TablePagination pagination={expensePagination} csvColumns={["Expense group", "Description", "Amount", "Actual %", "Limit %", "Variance pp", "Status"]} csvRows={expenseData.groups.map((row) => [row.name, row.description, row.amount, row.actual, row.limit, row.actual - row.limit, row.actual > row.limit ? "Above limit" : "Within limit"])} fileName="expense-control.csv" /></section>

        <section className="expensesPanel expenseControlSummary"><PanelHeading title="Control summary" tag="Action required" /><p className="expenseSummaryIntro">Groups are ranked by variance to their approved percentage-of-sales ceiling.</p><div className="expenseVarianceList">{sortedGroups.map((group) => { const over = group.actual > group.limit; return <div className="expenseVarianceItem" key={group.name}><div className="expenseVarianceLabel"><b>{group.name}</b><strong className={over ? "expenseVarianceLabelOver" : "expenseVarianceLabelWithin"}>{group.actual.toFixed(1)}%</strong></div><div className={`expenseVarianceTrack ${over ? "expenseVarianceTrackOver" : "expenseVarianceTrackWithin"}`}><span style={{ width: `${Math.min(group.actual / 46 * 100, 100)}%` }} /></div><small>Limit {group.limit.toFixed(1)}% · Prior year {group.prior.toFixed(1)}%</small></div>; })}</div></section>
      </div>

      <section className="expensesPanel expenseMonthlyPanel"><PanelHeading title="Monthly expense ratio" tag="Actual vs approved limit" /><div className="expenseChartLegend"><span><i className="expenseLegendActual" />Actual expense ratio</span><span><i className="expenseLegendLimit" />Approved limit</span></div><ExpenseRatioChart rows={monthlyRows} /></section>
      {isFilterOpen && <ExpenseFilterDrawer filters={draftFilters} onUpdate={(key, value) => { setDraftFilters((current) => ({ ...current, [key]: value })); setDateError(""); }} onClear={clearFilters} onClose={() => setIsFilterOpen(false)} onApply={applyFilters} error={dateError} />}
    </main>
  );
};

const ExpenseMetric = ({ icon, label, value, detail, tone }) => <article className={`expenseMetric expenseMetric${tone}`}><div><i>{icon}</i><span>{label}</span></div><b>{value}</b><small>{detail}</small></article>;
const PanelHeading = ({ title, tag }) => <div className="expensePanelHeading"><h2>{title}</h2><span>{tag}</span></div>;

const ExpenseRatioChart = ({ rows }) => {
  const y = (value) => 198 - (value - 70) / 9 * 164;
  const points = rows.map((row, index) => ({ ...row, x: 44 + index * 826 / Math.max(rows.length - 1, 1) }));
  const actualPath = points.map((point, index) => `${index ? "L" : "M"}${point.x},${y(point.actual)}`).join(" ");
  const limitPath = points.length ? `M${points[0].x},${y(points[0].limit)} L${points[points.length - 1].x},${y(points[points.length - 1].limit)}` : "";
  return <svg className="expenseRatioChart" viewBox="0 0 920 250" role="img" aria-label="Monthly expense ratio compared with the approved limit"><g className="expenseChartGrid">{[70, 73, 76, 79].map((tick) => <g key={tick}><line x1="42" x2="882" y1={y(tick)} y2={y(tick)} /><text x="0" y={y(tick) + 4}>{tick}%</text></g>)}</g>{limitPath && <path className="expenseLimitPath" d={limitPath} />}{actualPath && <path className="expenseActualPath" d={actualPath} />}{points.map((point) => <g key={point.month}><circle className="expenseActualPoint" cx={point.x} cy={y(point.actual)} r="3.6" /><text className="expenseMonthLabel" x={point.x} y="224" textAnchor="middle">{point.month}</text></g>)}</svg>;
};

const ExpenseFilterDrawer = ({ filters, onUpdate, onClear, onClose, onApply, error }) => (
  <div className="expenseFilterOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="expenseFilterDrawer" role="dialog" aria-modal="true" aria-labelledby="expenseFilterTitle"><div className="expenseFilterHeader"><div><span>REFINE EXPENSE VIEW</span><h2 id="expenseFilterTitle">Filter data</h2><p>Choose a date range for the monthly ratio</p></div><button onClick={onClose} aria-label="Close filters">×</button></div><div className="expenseFilterFields"><label><span>Date from</span><input type="date" value={filters.dateFrom} onChange={(event) => onUpdate("dateFrom", event.target.value)} /></label><label><span>Date to</span><input type="date" value={filters.dateTo} onChange={(event) => onUpdate("dateTo", event.target.value)} /></label></div>{error && <p className="expenseFilterError" role="alert">{error}</p>}<div className="expenseFilterActions"><button className="expenseFilterClear" onClick={onClear}>Clear all</button><button className="expenseFilterCancel" onClick={onClose}>Cancel</button><button className="expenseFilterApply" onClick={onApply}>Apply filters →</button></div></section></div>
);
