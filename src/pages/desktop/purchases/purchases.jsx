import React, { useCallback, useEffect, useMemo, useState } from "react";
import { purchaseData } from "../../../data/financeData.js";
import "./purchases.css";
import { TablePagination, useTablePagination } from "../../../components/tablePagination/tablePagination.jsx";

const initialFilters = { dateFrom: purchaseData.period.from, dateTo: purchaseData.period.to, supplier: "— All Suppliers —", category: "— All Categories —" };
const formatCr = (value) => `₹${Number(value || 0).toFixed(2)} Cr`;
const monthDateRange = (index) => {
  const year = index < 9 ? 2024 : 2025;
  const month = (index + 3) % 12 + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return { start: `${year}-${String(month).padStart(2, "0")}-01`, end: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}` };
};

export const Purchases = ({ registerFilterHandler }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [dateError, setDateError] = useState("");
  const openFilters = useCallback(() => { setDraftFilters(activeFilters); setDateError(""); setIsFilterOpen(true); }, [activeFilters]);
  useEffect(() => { registerFilterHandler(openFilters); return () => registerFilterHandler(null); }, [openFilters, registerFilterHandler]);

  const monthlyRows = useMemo(() => purchaseData.monthly.filter((row, index) => {
    const { start, end } = monthDateRange(index);
    return end >= activeFilters.dateFrom && start <= activeFilters.dateTo;
  }), [activeFilters.dateFrom, activeFilters.dateTo]);
  const supplierRows = useMemo(() => purchaseData.suppliers.filter((supplier) =>
    (activeFilters.supplier === "— All Suppliers —" || supplier.name === activeFilters.supplier)
    && (activeFilters.category === "— All Categories —" || supplier.category === activeFilters.category)), [activeFilters]);
  const monthlyPagination = useTablePagination(monthlyRows);
  const supplierPagination = useTablePagination(supplierRows);
  const applyFilters = () => {
    if (draftFilters.dateFrom > draftFilters.dateTo) { setDateError("Date from must be on or before Date to."); return; }
    setActiveFilters(draftFilters); setDateError(""); setIsFilterOpen(false);
  };
  const clearFilters = () => { setDraftFilters(initialFilters); setDateError(""); };

  return (
    <main className="purchasesMain">
      <div className="purchasesIntroRow">
        <div><div className="purchasesEyebrow"><span /> SUPPLIER LIABILITIES</div><h1>Purchase &amp; Payment Control</h1><p>Supplier liabilities and forward payment planning · {purchaseData.period.label}</p></div>
        <div className="purchasesPositionBadge"><span>POSITION AS OF</span><b>{purchaseData.period.position}</b></div>
      </div>

      <section className="purchaseMetricGrid" aria-label="Purchase and payment summary">
        <PurchaseMetric icon="PO" label="Total purchases" value={formatCr(purchaseData.summary.purchases)} detail="Booked during FY 2024–25" tone="blue" />
        <PurchaseMetric icon="₹" label="Paid to date" value={formatCr(purchaseData.summary.paid)} detail="74.8% of purchases" tone="green" />
        <PurchaseMetric icon="OS" label="Outstanding" value={formatCr(purchaseData.summary.outstanding)} detail="25.2% of purchases" tone="amber" />
        <PurchaseMetric icon="OD" label="Overdue" value={formatCr(purchaseData.summary.overdue)} detail="29.0% of outstanding" tone="red" />
        <PurchaseMetric icon="7D" label="Due this week" value={formatCr(purchaseData.summary.dueThisWeek)} detail="31 Mar–6 Apr" tone="purple" />
      </section>

      <section className="purchasesPanel monthlyPurchasesPanel">
        <SectionHeader title="Monthly purchase summary" tag="Apr 2024–Mar 2025" subtitle={`${monthlyRows.length} months in selected date range`} />
        <div className="purchasesMonthlyGrid"><PurchaseMonthlyChart rows={monthlyRows} /><div className="purchaseMonthTableBlock"><div className="purchaseMonthTableScroll"><table className="purchaseMonthTable"><thead><tr><th>Month</th><th>Purchases</th><th>Payments</th><th>Closing O/S</th><th>Overdue</th></tr></thead><tbody>{monthlyPagination.pageRows.map((row) => <tr key={row.month}><td><b>{row.month}</b></td><td>{formatCr(row.purchases)}</td><td className="purchasePaidCell">{formatCr(row.payments)}</td><td className="purchaseOwingCell">{formatCr(row.outstanding)}</td><td className="purchaseOverdueCell">{formatCr(row.overdue)}</td></tr>)}{monthlyRows.length === 0 && <tr><td colSpan="5" className="purchaseEmptyCell">No months match the selected dates.</td></tr>}</tbody><tfoot><tr><th>Selected view</th><th>{formatCr(monthlyRows.reduce((sum, row) => sum + row.purchases, 0))}</th><th>{formatCr(monthlyRows.reduce((sum, row) => sum + row.payments, 0))}</th><th>{monthlyRows.length ? formatCr(monthlyRows[monthlyRows.length - 1].outstanding) : "—"}</th><th>{monthlyRows.length ? formatCr(monthlyRows[monthlyRows.length - 1].overdue) : "—"}</th></tr></tfoot></table></div><TablePagination pagination={monthlyPagination} csvColumns={["Month", "Purchases", "Payments", "Closing O/S", "Overdue"]} csvRows={monthlyRows.map((row) => [row.month, row.purchases, row.payments, row.outstanding, row.overdue])} fileName="monthly-purchases.csv" /></div></div>
      </section>

      <section className="purchasesPanel paymentProfilePanel">
        <SectionHeader title="8-week payment profile" tag="Overdues shown separately" subtitle="Planned cash against the near-term supplier demand" />
        <div className="paymentProfileLayout"><PaymentProfileChart /><aside className="paymentFocusCard"><span className="paymentFocusEyebrow">PAYMENT FOCUS</span><div><span>Opening overdue</span><b>{formatCr(1.38)}</b></div><div><span>W1 total demand</span><b>{formatCr(purchaseData.paymentFocus.demand)}</b></div><div><span>W1 planned payment</span><b>{formatCr(purchaseData.paymentFocus.planned)}</b></div><div className="paymentGapRow"><span>Immediate funding gap</span><b>{formatCr(purchaseData.paymentFocus.gap)}</b></div><p>Overdue carry-forward assumes planned payments are applied to oldest invoices first.</p></aside></div>
      </section>

      <section className="purchasesPanel supplierPayablesPanel">
        <SectionHeader title="Supplier-wise payables" tag={`${supplierRows.length} supplier group${supplierRows.length === 1 ? "" : "s"}`} subtitle="Outstanding and upcoming payments by supplier" />
        <div className="supplierTableScroll"><table className="supplierPayablesTable"><thead><tr><th>Supplier</th><th>Category</th><th>Purchases</th><th>Outstanding</th><th>Overdue</th><th>Due this week</th><th>Terms</th><th>Risk</th></tr></thead><tbody>{supplierPagination.pageRows.map((supplier) => <tr key={supplier.name}><td><b>{supplier.name}</b></td><td><span className="supplierCategoryTag">{supplier.category}</span></td><td>{formatCr(supplier.purchases)}</td><td className="purchaseOwingCell">{formatCr(supplier.outstanding)}</td><td className="purchaseOverdueCell">{formatCr(supplier.overdue)}</td><td>{formatCr(supplier.dueThisWeek)}</td><td>{supplier.terms} d</td><td><RiskBadge value={supplier.risk} /></td></tr>)}{supplierRows.length === 0 && <tr><td colSpan="8" className="purchaseEmptyCell">No suppliers match the selected filters.</td></tr>}</tbody></table></div><TablePagination pagination={supplierPagination} csvColumns={["Supplier", "Category", "Purchases", "Outstanding", "Overdue", "Due this week", "Terms", "Risk"]} csvRows={supplierRows.map((row) => [row.name, row.category, row.purchases, row.outstanding, row.overdue, row.dueThisWeek, row.terms, row.risk])} fileName="supplier-payables.csv" />
      </section>
      {isFilterOpen && <PurchaseFilterDrawer filters={draftFilters} onUpdate={(key, value) => { setDraftFilters((current) => ({ ...current, [key]: value })); setDateError(""); }} onClear={clearFilters} onClose={() => setIsFilterOpen(false)} onApply={applyFilters} error={dateError} />}
    </main>
  );
};

const PurchaseMetric = ({ icon, label, value, detail, tone }) => <article className={`purchaseMetric purchaseMetric${tone}`}><div><i>{icon}</i><span>{label}</span></div><b>{value}</b><small>{detail}</small></article>;
const SectionHeader = ({ title, tag, subtitle }) => <div className="purchaseSectionHeader"><div><h2>{title}</h2><p>{subtitle}</p></div>{tag && <span>{tag}</span>}</div>;
const RiskBadge = ({ value }) => <span className={`supplierRiskBadge ${value >= 35 ? "supplierRiskHigh" : value >= 20 ? "supplierRiskMedium" : "supplierRiskLow"}`}>{value.toFixed(1)}%</span>;

const PurchaseMonthlyChart = ({ rows }) => {
  const maxValue = 8;
  const chartRows = rows.length ? rows : [];
  const points = chartRows.map((row, index) => ({ ...row, x: 42 + (index * 826 / Math.max(chartRows.length - 1, 1)) }));
  const y = (value) => 202 - value / maxValue * 170;
  return <div className="purchaseChartWrap"><div className="purchaseChartLegend"><span><i className="purchaseLegendOutstanding" />Month-end outstanding</span><span><i className="purchaseLegendOverdue" />Overdue</span><span><i className="purchaseLegendPayments" />Payments</span><span><i className="purchaseLegendPurchases" />Purchases</span></div><svg className="purchaseMonthlyChart" viewBox="0 0 920 260" role="img" aria-label="Monthly purchases, payments, outstanding, and overdue chart"><g className="purchaseChartGrid">{[0, 2, 4, 6, 8].map((tick) => <g key={tick}><line x1="42" x2="878" y1={y(tick)} y2={y(tick)} /><text x="3" y={y(tick) + 4}>₹{tick}Cr</text></g>)}</g>{points.map((point, index) => { const slot = chartRows.length > 1 ? 826 / chartRows.length : 80; const barWidth = Math.min(25, slot * 0.27); return <g key={point.month}><rect className="purchaseBarPurchase" x={point.x - barWidth} y={y(point.purchases)} width={barWidth} height={202 - y(point.purchases)} rx="3" /><rect className="purchaseBarPayment" x={point.x + 2} y={y(point.payments)} width={barWidth} height={202 - y(point.payments)} rx="3" /><circle className="purchasePointOverdue" cx={point.x} cy={y(point.overdue)} r="3.5" /><text className="purchaseChartMonth" x={point.x} y="226" textAnchor="middle">{point.month}</text>{index < points.length - 1 && <line className="purchaseOutstandingLine" x1={point.x} y1={y(point.outstanding)} x2={points[index + 1].x} y2={y(points[index + 1].outstanding)} />}</g>; })}{points.map((point) => <circle key={`out-${point.month}`} className="purchaseOutstandingPoint" cx={point.x} cy={y(point.outstanding)} r="3.2" />)}</svg></div>;
};

const PaymentProfileChart = () => <div className="paymentChartWrap"><div className="paymentChartLegend"><span><i className="paymentLegendCarry" />Overdue carry-forward</span><span><i className="paymentLegendPlanned" />Planned / paid</span><span><i className="paymentLegendScheduled" />Scheduled</span></div><svg className="paymentProfileChart" viewBox="0 0 780 230" role="img" aria-label="Eight-week payment demand and plan"><g className="purchaseChartGrid">{[0, 0.6, 1.2, 1.8, 2.4].map((tick) => { const y = 184 - tick / 2.4 * 150; return <g key={tick}><line x1="46" x2="760" y1={y} y2={y} /><text x="0" y={y + 4}>₹{tick}Cr</text></g>; })}</g>{purchaseData.weeks.map((week, index) => { const x = 78 + index * 86; const barWidth = 20; const y = (value) => 184 - value / 2.4 * 150; return <g key={week.week}><rect className="paymentBarCarry" x={x - 23} y={y(week.carryForward)} width={barWidth} height={184 - y(week.carryForward)} rx="3" /><rect className="paymentBarPlanned" x={x} y={y(week.planned)} width={barWidth} height={184 - y(week.planned)} rx="3" /><rect className="paymentBarScheduled" x={x + 23} y={y(week.scheduled)} width={barWidth} height={184 - y(week.scheduled)} rx="3" /><text className="paymentChartWeek" x={x + 10} y="210" textAnchor="middle">{week.week}</text></g>; })}</svg></div>;

const PurchaseFilterDrawer = ({ filters, onUpdate, onClear, onClose, onApply, error }) => (
  <div className="purchaseFilterOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="purchaseFilterDrawer" role="dialog" aria-modal="true" aria-labelledby="purchaseFilterTitle"><div className="purchaseFilterHeader"><div><span>REFINE PAYABLES</span><h2 id="purchaseFilterTitle">Filter data</h2><p>Filter the monthly and supplier views</p></div><button onClick={onClose} aria-label="Close filters">×</button></div><div className="purchaseFilterFields"><label><span>Date from</span><input type="date" value={filters.dateFrom} onChange={(event) => onUpdate("dateFrom", event.target.value)} /></label><label><span>Date to</span><input type="date" value={filters.dateTo} onChange={(event) => onUpdate("dateTo", event.target.value)} /></label><label><span>Supplier category</span><select value={filters.category} onChange={(event) => onUpdate("category", event.target.value)}><option>— All Categories —</option>{purchaseData.categories.map((category) => <option key={category}>{category}</option>)}</select></label><label><span>Supplier</span><select value={filters.supplier} onChange={(event) => onUpdate("supplier", event.target.value)}><option>— All Suppliers —</option>{purchaseData.suppliers.map((supplier) => <option key={supplier.name}>{supplier.name}</option>)}</select></label></div>{error && <p className="purchaseFilterError" role="alert">{error}</p>}<div className="purchaseFilterActions"><button className="purchaseFilterClear" onClick={onClear}>Clear all</button><button className="purchaseFilterCancel" onClick={onClose}>Cancel</button><button className="purchaseFilterApply" onClick={onApply}>Apply filters →</button></div></section></div>
);
