import React, { useCallback, useEffect, useMemo, useState } from "react";
import { dashboardData } from "../../../data/dashboardData.js";
import "./ageingAnalysis.css";
import { TablePagination, useTablePagination } from "../../../components/tablePagination/tablePagination.jsx";

const AS_OF = dashboardData.period.to;
const ALL_CLIENTS = "— All Clients —";
const currencyFor = (invoice) => invoice.currency === "INR" ? "Local" : "Export";
const toDate = (value) => new Date(`${value}T00:00:00`);
const dayCount = (from, to) => Math.max(0, Math.floor((toDate(to) - toDate(from)) / 86400000));
const amountInCr = (amount) => (Number(amount) || 0) / 10000000;
const formatCr = (amount) => `₹${amountInCr(amount).toFixed(2)} Cr`;
const formatBucket = (amount) => amount > 0 ? formatCr(amount) : "—";

const ageBucket = (days) => {
  if (days <= 0) return "notDue";
  if (days <= 30) return "days0to30";
  if (days <= 60) return "days31to60";
  if (days <= 90) return "days61to90";
  return "days90plus";
};

const getAgeingRows = (invoices, groupBy = "client") => {
  const groups = new Map();
  invoices.forEach((invoice) => {
    const groupName = invoice[groupBy];
    const current = groups.get(groupName) || {
      name: groupName,
      total: 0,
      notDue: 0,
      days0to30: 0,
      days31to60: 0,
      days61to90: 0,
      days90plus: 0,
      weightedDays: 0,
      overdue: 0,
      invoices: [],
    };
    const daysOverdue = Math.max(0, dayCount(invoice.dueDate, AS_OF));
    const bucket = ageBucket(daysOverdue);
    current.total += invoice.pending;
    current[bucket] += invoice.pending;
    if (daysOverdue > 0) {
      current.weightedDays += invoice.pending * daysOverdue;
      current.overdue += invoice.pending;
    }
    current.invoices.push({ ...invoice, daysOverdue });
    groups.set(groupName, current);
  });

  return Array.from(groups.values())
    .map((row) => ({
      ...row,
      wado: row.overdue ? row.weightedDays / row.overdue : 0,
      overduePercent: row.total ? row.overdue / row.total * 100 : 0,
    }))
    .sort((left, right) => right.total - left.total);
};

const summarizeRows = (rows) => {
  const summary = rows.reduce((total, row) => {
    ["total", "notDue", "days0to30", "days31to60", "days61to90", "days90plus", "weightedDays", "overdue"].forEach((key) => {
      total[key] += row[key];
    });
    return total;
  }, { total: 0, notDue: 0, days0to30: 0, days31to60: 0, days61to90: 0, days90plus: 0, weightedDays: 0, overdue: 0 });
  summary.wado = summary.overdue ? summary.weightedDays / summary.overdue : 0;
  summary.overduePercent = summary.total ? summary.overdue / summary.total * 100 : 0;
  return summary;
};

const earliestInvoiceDate = dashboardData.invoices.reduce((earliest, invoice) => invoice.billDate < earliest ? invoice.billDate : earliest, AS_OF);
const initialFilters = { dateFrom: earliestInvoiceDate, dateTo: AS_OF, salesType: "All", client: ALL_CLIENTS };

const countryForClient = (client, currency) => {
  if (currency === "INR") return "INDIA";
  const exportCountries = dashboardData.countries.filter((row) => row.exportSales > 0).map((row) => row.name);
  const hash = Array.from(client).reduce((total, letter) => (total * 31 + letter.charCodeAt(0)) >>> 0, 7);
  return exportCountries[hash % exportCountries.length] || "Other";
};

export const AgeingAnalysis = ({ onNavigate, registerFilterHandler }) => {
  const [salesType, setSalesType] = useState("Export");
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [dateError, setDateError] = useState("");
  const [clientSearch, setClientSearch] = useState("");

  const invoicesWithCountry = useMemo(() => dashboardData.invoices.map((invoice) => ({ ...invoice, country: countryForClient(invoice.client, invoice.currency) })), []);
  const filteredInvoices = useMemo(() => invoicesWithCountry.filter((invoice) => {
    if (activeFilters.salesType !== "All" && currencyFor(invoice) !== activeFilters.salesType) return false;
    if (activeFilters.client !== ALL_CLIENTS && invoice.client !== activeFilters.client) return false;
    return invoice.billDate >= activeFilters.dateFrom && invoice.billDate <= activeFilters.dateTo;
  }), [activeFilters, invoicesWithCountry]);

  const visibleInvoices = useMemo(() => filteredInvoices.filter((invoice) => currencyFor(invoice) === salesType), [filteredInvoices, salesType]);
  const bucketInvoices = useMemo(() => selectedBucket ? visibleInvoices.filter((invoice) => ageBucket(Math.max(0, dayCount(invoice.dueDate, AS_OF))) === selectedBucket) : visibleInvoices, [visibleInvoices, selectedBucket]);
  const clientRows = useMemo(() => getAgeingRows(visibleInvoices), [visibleInvoices]);
  const countryRows = useMemo(() => getAgeingRows(bucketInvoices, "country"), [bucketInvoices]);
  const partyRows = useMemo(() => getAgeingRows(bucketInvoices), [bucketInvoices]);
  const summary = useMemo(() => summarizeRows(clientRows), [clientRows]);
  const shownCountryRows = useMemo(() => selectedCountry ? getAgeingRows(bucketInvoices.filter((invoice) => invoice.country === selectedCountry)) : [], [bucketInvoices, selectedCountry]);
  const shownPartyRows = selectedCountry ? shownCountryRows : partyRows;
  const searchedPartyRows = useMemo(() => shownPartyRows.filter((row) => row.name.toLowerCase().includes(clientSearch.toLowerCase())), [shownPartyRows, clientSearch]);
  const invoiceRows = useMemo(() => (selectedClient ? shownPartyRows.find((row) => row.name === selectedClient)?.invoices || [] : []).slice().sort((a, b) => b.pending - a.pending), [shownPartyRows, selectedClient]);
  const countryPagination = useTablePagination(countryRows);
  const partyPagination = useTablePagination(searchedPartyRows);
  const invoicePagination = useTablePagination(invoiceRows);
  const availableClients = useMemo(() => Array.from(new Set(invoicesWithCountry.map((invoice) => invoice.client))).sort((a, b) => a.localeCompare(b)), [invoicesWithCountry]);

  const openFilters = useCallback(() => {
    setDraftFilters(activeFilters);
    setDateError("");
    setIsFilterOpen(true);
  }, [activeFilters]);
  useEffect(() => {
    registerFilterHandler(openFilters);
    return () => registerFilterHandler(null);
  }, [openFilters, registerFilterHandler]);
  const updateDraft = (key, value) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
    setDateError("");
  };
  const selectSalesView = (type) => {
    setSalesType(type);
    setSelectedCountry(null);
    setSelectedClient(null);
    setSelectedBucket(null);
    setActiveFilters((current) => ({ ...current, salesType: "All", client: ALL_CLIENTS }));
    setDraftFilters((current) => ({ ...current, salesType: "All", client: ALL_CLIENTS }));
  };
  const applyFilters = () => {
    if (draftFilters.dateFrom > draftFilters.dateTo) {
      setDateError("Date from must be on or before Date to.");
      return;
    }
    setActiveFilters(draftFilters);
    const clientInvoice = draftFilters.client !== ALL_CLIENTS
      ? dashboardData.invoices.find((invoice) => invoice.client === draftFilters.client)
      : null;
    setSalesType(draftFilters.salesType !== "All" ? draftFilters.salesType : clientInvoice ? currencyFor(clientInvoice) : salesType);
    setSelectedCountry(null);
    setSelectedClient(null);
    setDateError("");
    setIsFilterOpen(false);
  };
  const clearFilters = () => {
    setDraftFilters(initialFilters);
    setDateError("");
  };

  const selectAgeingBucket = (bucket) => {
    setSelectedBucket(bucket);
    setSelectedCountry(null);
    setSelectedClient(null);
    setClientSearch("");
  };

  return (
    <main className="ageingMain">
      <div className="ageingPageIntro">
        <div>
          <div className="ageingEyebrow"><span className="ageingLiveIndicator" /> RECEIVABLES MONITOR</div>
          <h1>Ageing Analysis</h1>
          <p>Outstanding balances by overdue period · As of {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(toDate(AS_OF))}</p>
        </div>

      </div>

      <div className="ageingControlRow">
        <div className="ageingSalesTabs" role="tablist" aria-label="Sales type">
          <button className={salesType === "Local" ? "ageingSalesTab ageingSalesTabActive" : "ageingSalesTab"} role="tab" aria-selected={salesType === "Local"} onClick={() => selectSalesView("Local")}><span>▣</span> Local Sales</button>
          <button className={salesType === "Export" ? "ageingSalesTab ageingSalesTabActive" : "ageingSalesTab"} role="tab" aria-selected={salesType === "Export"} onClick={() => selectSalesView("Export")}><span>✈</span> Export Sales</button>
        </div>
        {(selectedClient || selectedCountry || selectedBucket) && <button className="ageingBackButton" onClick={() => {
          if (selectedClient) setSelectedClient(null);
          else { setSelectedCountry(null); setSelectedBucket(null); setClientSearch(""); }
        }}>{selectedClient ? `← ${selectedCountry ? selectedCountry : selectedBucket ? "All Parties" : "Countries"}` : selectedCountry ? "← All Countries" : "← Country view"}</button>}
        {selectedBucket && <span className="ageingActiveBucket">Showing {bucketLabel(selectedBucket)} balances</span>}
        <div className="ageingAsOfBadge"><span>REPORTING DATE</span><b>{AS_OF}</b></div>
      </div>

      <section className="ageingSummaryGrid" aria-label="Outstanding by ageing bucket">
        <AgeingMetric label="Total O/S" value={formatCr(summary.total)} tone="blue" icon="◷" active={selectedBucket === "all"} onClick={() => selectAgeingBucket(null)} />
        <AgeingMetric label="Not yet due" value={formatCr(summary.notDue)} tone="green" icon="✓" active={selectedBucket === "notDue"} onClick={() => selectAgeingBucket("notDue")} />
        <AgeingMetric label="0–30 days" value={formatCr(summary.days0to30)} tone="cyan" icon="◷" active={selectedBucket === "days0to30"} onClick={() => selectAgeingBucket("days0to30")} />
        <AgeingMetric label="31–60 days" value={formatCr(summary.days31to60)} tone="amber" icon="◷" active={selectedBucket === "days31to60"} onClick={() => selectAgeingBucket("days31to60")} />
        <AgeingMetric label="61–90 days" value={formatCr(summary.days61to90)} tone="orange" icon="◷" active={selectedBucket === "days61to90"} onClick={() => selectAgeingBucket("days61to90")} />
        <AgeingMetric label="90+ days" value={formatCr(summary.days90plus)} tone="red" icon="!" active={selectedBucket === "days90plus"} onClick={() => selectAgeingBucket("days90plus")} />
      </section>

      <section className="ageingTablePanel">
        <div className="ageingTableHeader">
          <div>
            <h2>{selectedClient ? `Invoices — ${selectedClient}` : selectedCountry ? `Ageing Analysis — ${selectedCountry} — Party-wise` : selectedBucket ? `Parties with ${bucketLabel(selectedBucket)} outstanding` : `Ageing Analysis — ${salesType} — Country-wise`}</h2>
            <p>{selectedClient ? "Open invoice balances and due dates" : selectedCountry ? `${shownPartyRows.length} parties · Select a party to see invoices` : selectedBucket ? `${searchedPartyRows.length} parties with balances in this bucket` : `${countryRows.length} countries · Select a country to see parties`}</p>
          </div>
          <div className="ageingLegend" aria-label="Ageing bucket legend">
            <span><i className="ageingLegendNotDue" />Not yet due</span>
            <span><i className="ageingLegend0to30" />0–30 days</span>
            <span><i className="ageingLegend31to60" />31–60 days</span>
            <span><i className="ageingLegend61to90" />61–90 days</span>
            <span><i className="ageingLegend90plus" />90+ days</span>
          </div>
        </div>
        {!selectedClient && (selectedCountry || selectedBucket) && shownPartyRows.length > 0 && <label className="ageingSearchBox"><SearchIcon /><input value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Search parties" aria-label="Search parties" /></label>}
        <div className="ageingTableScroll">
          {selectedClient ? (
            <InvoiceTable rows={invoicePagination.pageRows} totalsRows={invoiceRows} />
          ) : selectedCountry || selectedBucket ? (
            <ClientTable rows={partyPagination.pageRows} totalsRows={searchedPartyRows} onSelect={setSelectedClient} rowLabel="Party" actionLabel="Invoices" />
          ) : (
            <ClientTable rows={countryPagination.pageRows} totalsRows={countryRows} onSelect={setSelectedCountry} rowLabel="Country" actionLabel="Parties" />
          )}
        </div>
        {selectedClient ? <TablePagination pagination={invoicePagination} csvColumns={["Invoice no.", "Invoice date", "Due date", "Currency", "Client", "Open balance", "Days overdue", "Age bucket"]} csvRows={invoiceRows.map((row) => [row.bill, row.billDate, row.dueDate, row.currency, row.client, formatCr(row.pending), row.daysOverdue, bucketLabel(ageBucket(row.daysOverdue))])} fileName="ageing-invoices.csv" /> : selectedCountry || selectedBucket ? <TablePagination pagination={partyPagination} csvColumns={["Party", "Total O/S", "Not due", "0–30 days", "31–60 days", "61–90 days", "90+ days", "WADO", "Overdue %"]} csvRows={searchedPartyRows.map((row) => [row.name, formatCr(row.total), formatCr(row.notDue), formatCr(row.days0to30), formatCr(row.days31to60), formatCr(row.days61to90), formatCr(row.days90plus), `${row.wado.toFixed(1)} days`, `${row.overduePercent.toFixed(1)}%`])} fileName="ageing-parties.csv" /> : <TablePagination pagination={countryPagination} csvColumns={["Country", "Total O/S", "Not due", "0–30 days", "31–60 days", "61–90 days", "90+ days", "WADO", "Overdue %"]} csvRows={countryRows.map((row) => [row.name, formatCr(row.total), formatCr(row.notDue), formatCr(row.days0to30), formatCr(row.days31to60), formatCr(row.days61to90), formatCr(row.days90plus), `${row.wado.toFixed(1)} days`, `${row.overduePercent.toFixed(1)}%`])} fileName="ageing-countries.csv" />}
        {!selectedClient && <div className="ageingTableFootnote"><span>WADO</span> Weighted Average Days Overdue — calculated on overdue balances only.</div>}
      </section>

      <footer className="ageingFooter">FY 2026–27 · METROPOL PHARMACEUTICALS <button onClick={() => onNavigate("/landing")}>← Back to Dashboard</button></footer>

      {isFilterOpen && <AgeingFilterDrawer filters={draftFilters} clients={availableClients} error={dateError} onUpdate={updateDraft} onClear={clearFilters} onClose={() => setIsFilterOpen(false)} onApply={applyFilters} />}
    </main>
  );
};

const AgeingMetric = ({ label, value, tone, icon, active, onClick }) => (
  <button type="button" className={`ageingMetric ageingMetric${tone} ${active ? "ageingMetricActive" : ""}`} aria-pressed={Boolean(active)} onClick={onClick}><div className="ageingMetricTop"><span>{label}</span><i>{icon}</i></div><b>{value}</b></button>
);

const ClientTable = ({ rows, totalsRows, onSelect, rowLabel = "Party", actionLabel = "Invoices" }) => {
  const totals = summarizeRows(totalsRows);
  return (
    <table className="ageingTable">
      <thead><tr><th>{rowLabel}</th><th>Total O/S</th><th>Not due</th><th>0–30d</th><th>31–60d</th><th>61–90d</th><th>90+d</th><th>WADO</th><th>Overdue %</th><th>Action</th></tr></thead>
      <tbody>
        {rows.map((row) => <tr key={row.name} className="ageingClientRow" onClick={() => onSelect(row.name)}>
          <td><b>{row.name}</b></td><td className="ageingAmountCell">{formatCr(row.total)}</td><td>{formatBucket(row.notDue)}</td><td>{formatBucket(row.days0to30)}</td><td>{formatBucket(row.days31to60)}</td><td>{formatBucket(row.days61to90)}</td><td className="ageingOldBalance">{formatBucket(row.days90plus)}</td><td><WadoBadge value={row.wado} /></td><td>{row.overduePercent.toFixed(1)}%</td><td><button className="ageingRowAction" onClick={(event) => { event.stopPropagation(); onSelect(row.name); }}>{actionLabel} →</button></td>
        </tr>)}
        {rows.length === 0 && <tr><td className="ageingEmptyCell" colSpan="10">No parties match the current filters.</td></tr>}
      </tbody>
      <tfoot><tr><th>Total</th><th>{formatCr(totals.total)}</th><th>{formatBucket(totals.notDue)}</th><th>{formatBucket(totals.days0to30)}</th><th>{formatBucket(totals.days31to60)}</th><th>{formatBucket(totals.days61to90)}</th><th>{formatBucket(totals.days90plus)}</th><th><WadoBadge value={totals.wado} /></th><th>{totals.overduePercent.toFixed(1)}%</th><th /></tr></tfoot>
    </table>
  );
};

const InvoiceTable = ({ rows, totalsRows }) => (
  <table className="ageingTable invoiceAgeingTable">
    <thead><tr><th>Invoice no.</th><th>Invoice date</th><th>Due date</th><th>Currency</th><th>Open balance</th><th>Days overdue</th><th>Age bucket</th></tr></thead>
    <tbody>{rows.map((row) => <tr key={`${row.bill}-${row.billDate}`}>
      <td><b>{row.bill}</b></td><td>{row.billDate}</td><td>{row.dueDate}</td><td>{row.currency}</td><td className="ageingAmountCell">{formatCr(row.pending)}</td><td>{row.daysOverdue > 0 ? `${row.daysOverdue} d` : "Not due"}</td><td><span className={`ageingBucketBadge ageingBucketBadge${ageBucket(row.daysOverdue)}`}>{bucketLabel(ageBucket(row.daysOverdue))}</span></td>
    </tr>)}{rows.length === 0 && <tr><td className="ageingEmptyCell" colSpan="7">No open invoices match the selected dates.</td></tr>}</tbody>
    <tfoot><tr><th colSpan="4">Total open balance</th><th>{formatCr(totalsRows.reduce((total, row) => total + row.pending, 0))}</th><th colSpan="2">{totalsRows.length} invoices</th></tr></tfoot>
  </table>
);

const bucketLabel = (bucket) => ({ notDue: "Not yet due", days0to30: "0–30 days", days31to60: "31–60 days", days61to90: "61–90 days", days90plus: "90+ days" })[bucket];
const WadoBadge = ({ value }) => <span className={`wadoBadge ${value < 30 ? "wadoBadgeGreen" : value <= 60 ? "wadoBadgeAmber" : "wadoBadgeRed"}`}>{value.toFixed(1)} d</span>;
const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;

const AgeingFilterDrawer = ({ filters, clients, error, onUpdate, onClear, onClose, onApply }) => (
  <div className="ageingFilterOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="ageingFilterDrawer" role="dialog" aria-modal="true" aria-labelledby="ageingFilterTitle">
      <div className="ageingFilterHead"><div><span>REFINE RECEIVABLES</span><h2 id="ageingFilterTitle">Filter data</h2><p>Filter invoice ageing records</p></div><button className="ageingFilterClose" onClick={onClose} aria-label="Close filters">×</button></div>
      <div className="ageingFilterFields">
        <label className="ageingFilterField"><span>Invoice date from</span><input type="date" value={filters.dateFrom} onChange={(event) => onUpdate("dateFrom", event.target.value)} /></label>
        <label className="ageingFilterField"><span>Invoice date to</span><input type="date" value={filters.dateTo} onChange={(event) => onUpdate("dateTo", event.target.value)} /></label>
        <label className="ageingFilterField"><span>Sales type</span><select value={filters.salesType} onChange={(event) => onUpdate("salesType", event.target.value)}><option value="All">All sales types</option><option value="Local">Local</option><option value="Export">Export</option></select></label>
        <label className="ageingFilterField"><span>Client</span><select value={filters.client} onChange={(event) => onUpdate("client", event.target.value)}><option value={ALL_CLIENTS}>{ALL_CLIENTS}</option>{clients.map((client) => <option value={client} key={client}>{client}</option>)}</select></label>
      </div>
      <p className="ageingFilterNote">Zone, country, and product filters aren’t available because the invoice sheet has no matching fields.</p>
      {error && <p className="ageingFilterError" role="alert">{error}</p>}
      <div className="ageingFilterActions"><button className="ageingClearButton" onClick={onClear}>Clear all</button><button className="ageingCancelButton" onClick={onClose}>Cancel</button><button className="ageingApplyButton" onClick={onApply}>Apply filters →</button></div>
    </section>
  </div>
);
