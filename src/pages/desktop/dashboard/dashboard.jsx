import React, { useCallback, useEffect, useMemo, useState } from "react";
import { dashboardData } from "../../../data/dashboardData.js";
import { StatCard } from "../../../components/statCard/statCard.jsx";
import { TablePagination, useTablePagination } from "../../../components/tablePagination/tablePagination.jsx";
import "./dashboard.css";

const initialFilters = {
  dateFrom: dashboardData.period.from,
  dateTo: dashboardData.period.to,
  salesType: "All",
  geography: "— All —",
  client: "— All Clients —",
  category: "— All Categories —",
  product: "— All Products —",
};

const colorByCategory = {
  API: "#51a8ff",
  Formulation: "#42c6d7",
  Machinery: "#50d1a1",
  "Packing Material": "#f0b454",
  Intermediate: "#a18af5",
};

const croreValue = (value) => (Number(value) || 0) / 10000000;
const formatCr = (value) => `₹${croreValue(value).toFixed(2)} Cr`;
const formatPercent = (value) => `${(Number(value) || 0).toFixed(2)}%`;

const getProductCategory = (name) => {
  const label = (name || "").toUpperCase();
  if (/MACHINE|MACHINERY|EQUIPMENT|PASSBOX|REACTOR|TANK|MIXER|PUMP|PRESS|CONVEYOR|GRANULATOR|AUTOCLAVE|DRYER|COMPRESSOR|FILLING/.test(label)) return "Machinery";
  if (/BOTTLE|FOIL|CARTON|BLISTER|LABEL|CLOSURE|PACKAGING|SHRINK|PVC|ALU|LAMINATE|CAP /.test(label)) return "Packing Material";
  if (/INTERMEDIATE|IMPURITY|STARTING MATERIAL|PRECURSOR/.test(label)) return "Intermediate";
  if (/TABLET|CAPSULE|SYRUP|SUSPENSION|INJECTION|INJECTABLE|CREAM|OINTMENT|DROPS|ORAL|DOSAGE|FORMULATION|CAPLET|INHALER|SACHET|SUPPOSITORY/.test(label)) return "Formulation";
  return "API";
};

const statGroups = (summary) => ({
  overall: [
    { label: "TOTAL SALES", value: formatCr(summary.TotalSales), detail: "Recorded sales", icon: "▥", tone: "blue" },
    { label: "TOTAL PROFIT", value: formatCr(summary.TotalProfit), detail: "Recorded profit", icon: "₹", tone: "green" },
    { label: "GROSS PROFIT %", value: formatPercent(summary.OverallGP), detail: "Gross profit margin", icon: "↗", tone: "cyan" },
    { label: "RECEIVABLES", value: formatCr(summary.Receivables), detail: "Current balance", icon: "◷", tone: "amber" },
    { label: "OVERDUE", value: formatCr(summary.Overdue), detail: "Current balance", icon: "!", tone: "red" },
  ],
  local: [
    { label: "SALES", value: formatCr(summary.LocalSales), detail: "Local sales", icon: "▣", tone: "blue" },
    { label: "PROFIT", value: formatCr(summary.LocalProfit), detail: "Local profit", icon: "₹", tone: "green" },
    { label: "GROSS PROFIT %", value: formatPercent(summary.LocalGP), detail: "Gross profit margin", icon: "↗", tone: "cyan" },
    { label: "RECEIVABLES", value: formatCr(summary.LocalReceivables), detail: "Current balance", icon: "◷", tone: "amber" },
    { label: "OVERDUE", value: formatCr(summary.LocalOverdue), detail: "Current balance", icon: "!", tone: "red" },
  ],
  export: [
    { label: "SALES", value: formatCr(summary.ExportSales), detail: "Export sales", icon: "✈", tone: "blue" },
    { label: "PROFIT", value: formatCr(summary.ExportProfit), detail: "Export profit", icon: "₹", tone: "green" },
    { label: "GROSS PROFIT %", value: formatPercent(summary.ExportGP), detail: "Gross profit margin", icon: "↗", tone: "cyan" },
    { label: "RECEIVABLES", value: formatCr(summary.ExportReceivables), detail: "Current balance", icon: "◷", tone: "amber" },
    { label: "OVERDUE", value: formatCr(summary.ExportOverDue), detail: "Current balance", icon: "!", tone: "red" },
  ],
});

const formatFilterDate = (value) => {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
};

const getMonthDate = (row) => `${row.year}-${String(row.month).padStart(2, "0")}-01`;
const getMonthEndDate = (row) => `${row.year}-${String(row.month).padStart(2, "0")}-${String(new Date(row.year, row.month, 0).getDate()).padStart(2, "0")}`;

export const Dashboard = ({ registerFilterHandler }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [dateError, setDateError] = useState("");
  const [selectedSalesType, setSelectedSalesType] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [hoveredMonth, setHoveredMonth] = useState(null);

  const groups = useMemo(() => statGroups(dashboardData.summary), []);

  const appliedLabels = useMemo(() => {
    const items = [];
    if (activeFilters.salesType !== "All") items.push(activeFilters.salesType);
    if (activeFilters.geography !== "— All —") items.push(activeFilters.geography);
    if (activeFilters.client !== "— All Clients —") items.push(activeFilters.client);
    if (activeFilters.category !== "— All Categories —") items.push(activeFilters.category);
    if (activeFilters.product !== "— All Products —") items.push(activeFilters.product);
    if (activeFilters.dateFrom !== initialFilters.dateFrom || activeFilters.dateTo !== initialFilters.dateTo) {
      items.push(`${formatFilterDate(activeFilters.dateFrom)} – ${formatFilterDate(activeFilters.dateTo)}`);
    }
    return items;
  }, [activeFilters]);

  const monthRows = useMemo(() => dashboardData.monthly
    .filter((row) => getMonthEndDate(row) >= activeFilters.dateFrom && getMonthDate(row) <= activeFilters.dateTo)
    .map((row) => ({
      month: `${row.label} ${String(row.year).slice(-2)}`,
      sales: row[activeFilters.salesType === "Local" ? "localSales" : activeFilters.salesType === "Export" ? "exportSales" : "sales"],
      profit: row[activeFilters.salesType === "Local" ? "localProfit" : activeFilters.salesType === "Export" ? "exportProfit" : "profit"],
      outstanding: row[activeFilters.salesType === "Local" ? "localReceivables" : activeFilters.salesType === "Export" ? "exportReceivables" : "receivables"],
      overdue: row[activeFilters.salesType === "Local" ? "localOverdue" : activeFilters.salesType === "Export" ? "exportOverdue" : "overdue"],
    })), [activeFilters]);

  const categoryRows = useMemo(() => {
    let rows;
    if (activeFilters.product !== "— All Products —") {
      const product = dashboardData.products.find((item) => item.name === activeFilters.product);
      rows = product ? [{
        name: product.name,
        sales: product[activeFilters.salesType === "Local" ? "localSales" : activeFilters.salesType === "Export" ? "exportSales" : "sales"],
        productCount: 1,
      }] : [];
    } else {
      rows = dashboardData.categories
        .filter((item) => activeFilters.category === "— All Categories —" || item.name === activeFilters.category)
        .map((item) => ({
          ...item,
          sales: item[activeFilters.salesType === "Local" ? "localSales" : activeFilters.salesType === "Export" ? "exportSales" : "sales"],
        }));
    }
    const total = rows.reduce((sum, item) => sum + item.sales, 0);
    return rows.map((item) => ({
      ...item,
      amount: croreValue(item.sales),
      share: total > 0 ? item.sales / total * 100 : 0,
      color: colorByCategory[item.name] || "#8ca3bd",
    }));
  }, [activeFilters]);

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
    setDateError("");
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const applyFilters = () => {
    if (draftFilters.dateFrom && draftFilters.dateTo && draftFilters.dateFrom > draftFilters.dateTo) {
      setDateError("Date from must be on or before Date to.");
      return;
    }
    setActiveFilters(draftFilters);
    setDateError("");
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    setDraftFilters(initialFilters);
    setDateError("");
  };

  const selectSalesType = (type) => {
    setSelectedSalesType(type);
    setSelectedEntity(null);
  };

  return (
    <main className="dashboardMain">
      {!selectedSalesType ? (
        <>
          <div className="dashboardIntroRow">
            <div>
              <div className="dashboardEyebrow"><span className="liveIndicator" /> {dashboardData.period.label.toUpperCase()}</div>
              <h1>Sales overview <span>·</span> {dashboardData.period.label}</h1>
              <p className="dashboardIntroText">Sales performance across April through October 2026.</p>
            </div>
            <div className="dashboardIntroActions">
              <div className="updatedBadge"><span className="updatedDot" /> Data through <b>31 Oct 2026</b></div>

            </div>
          </div>

          {appliedLabels.length > 0 && (
            <div className="appliedFiltersRow" aria-label="Active filters">
              <span className="appliedFiltersLabel">FILTERS APPLIED</span>
              {appliedLabels.map((label) => <span className="filterChip" key={label}>{label}</span>)}
              <button className="clearAppliedButton" onClick={() => { setActiveFilters(initialFilters); setDraftFilters(initialFilters); }}>Clear all</button>
            </div>
          )}

          <section className="performanceSection">
            <div className="sectionHeadingRow">
              <div className="sectionHeadingGroup"><span className="sectionAccent" /><div><h2>Overall performance</h2><p>{dashboardData.period.label}</p></div></div>
            </div>
            <div className="statCardGrid overallStatsGrid">{groups.overall.map((item) => <StatCard key={item.label} {...item} />)}</div>
          </section>

          <div className="salesGroupsGrid">
            {(activeFilters.salesType === "All" || activeFilters.salesType === "Local") && <SalesGroup title="Local sales" subtitle="Domestic · Click any card to drill down" icon="▣" stats={groups.local} onCardClick={() => selectSalesType("Local")} />}
            {(activeFilters.salesType === "All" || activeFilters.salesType === "Export") && <SalesGroup title="Export sales" subtitle="International · Click any card to drill down" icon="✈" stats={groups.export} onCardClick={() => selectSalesType("Export")} />}
          </div>

          <div className="dashboardChartsGrid">
            <section className="dashboardPanel monthlyPanel">
              <PanelTitle title="Month-wise sales, profit, outstanding & overdue" subtitle={activeFilters.salesType === "All" ? "All sales types" : `${activeFilters.salesType} sales`} right={<span className="chartUnit">₹ CRORE</span>} />
              <div className="chartLegend"><LegendItem color="#3a536f" label="Outstanding" /><LegendItem color="#f0b454" label="Overdue" /><LegendItem color="#44d3a2" label="Profit" /><LegendItem color="#4b9cff" label="Sales" /></div>
              <MonthlyChart rows={monthRows} hoveredMonth={hoveredMonth} setHoveredMonth={setHoveredMonth} />
            </section>
            <CategorySalesPanel rows={categoryRows} subtitle={activeFilters.salesType === "All" ? "All sales types" : `${activeFilters.salesType} sales`} />
          </div>
          <DashboardFooter />
        </>
      ) : (
        <SalesBreakdown
          salesType={selectedSalesType}
          selectedEntity={selectedEntity}
          filters={activeFilters}
          onBack={() => { setSelectedSalesType(null); setSelectedEntity(null); }}
          onSelectEntity={setSelectedEntity}
          onOpenFilters={openFilters}
          activeFilterCount={appliedLabels.length}
          categoryRows={categoryRows}
        />
      )}

      {isFilterOpen && <FilterDrawer filters={draftFilters} dateError={dateError} onUpdate={updateDraft} onClose={() => setIsFilterOpen(false)} onClear={clearFilters} onApply={applyFilters} />}
    </main>
  );
};

const SalesGroup = ({ title, subtitle, icon, stats, onCardClick }) => (
  <section className="salesGroup">
    <div className="salesGroupHeader"><span className="salesGroupIcon">{icon}</span><div><h2>{title}</h2><p>{subtitle}</p></div><span className="salesGroupArrow">↗</span></div>
    <div className="statCardGrid salesStatsGrid">{stats.map((item) => <StatCard key={item.label} {...item} onClick={onCardClick} />)}</div>
  </section>
);

const PanelTitle = ({ title, subtitle, right }) => <div className="panelTitleRow"><div><h3>{title}</h3><p>{subtitle}</p></div>{right}</div>;
const LegendItem = ({ color, label }) => <span className="legendItem"><i style={{ background: color }} />{label}</span>;

const MonthlyChart = ({ rows, hoveredMonth, setHoveredMonth }) => {
  const chartTop = 24;
  const chartBottom = 217;
  const chartHeight = chartBottom - chartTop;
  const maxValue = Math.max(1, Math.ceil(Math.max(...rows.map((row) => croreValue(row.sales)), 0) / 20) * 20);
  const plotStart = 58;
  const plotEnd = 925;
  const stepX = rows.length > 1 ? (plotEnd - plotStart) / (rows.length - 1) : 0;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * maxValue);
  const monthAtPointer = (event) => {
    if (!rows.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 940;
    const index = rows.length > 1 ? Math.round((x - plotStart) / stepX) : 0;
    setHoveredMonth(index >= 0 && index < rows.length ? index : null);
  };
  const hovered = hoveredMonth === null ? null : rows[hoveredMonth];
  const linePoints = rows.map((row, index) => `${plotStart + index * stepX},${chartBottom - (croreValue(row.sales) / maxValue) * chartHeight}`).join(" L ");

  return (
    <div className="monthlyChartWrap" onMouseLeave={() => setHoveredMonth(null)}>
      {hovered && <div className="chartTooltip" style={{ left: `${6 + (hoveredMonth / Math.max(rows.length - 1, 1)) * 88}%` }}>
        <b>{hovered.month}</b>
        <span><i className="tooltipBlue" /> Sales <strong>{formatCr(hovered.sales)}</strong></span>
        <span><i className="tooltipGreen" /> Profit <strong>{formatCr(hovered.profit)}</strong></span>
        <span><i className="tooltipAmber" /> Overdue <strong>{formatCr(hovered.overdue)}</strong></span>
      </div>}
      <svg className="monthlyChart" viewBox="0 0 940 270" role="img" aria-label="Filtered monthly sales, profit, outstanding and overdue chart" onMouseMove={monthAtPointer}>
        <defs><linearGradient id="salesFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4b9cff" stopOpacity="0.19" /><stop offset="1" stopColor="#4b9cff" stopOpacity="0" /></linearGradient></defs>
        {ticks.map((tick) => {
          const y = chartBottom - (tick / maxValue) * chartHeight;
          return <g key={tick}><line x1="51" x2="925" y1={y} y2={y} stroke="#25374d" strokeDasharray="3 5" /><text x="0" y={y + 4} className="chartAxisLabel">₹{tick.toFixed(0)}Cr</text></g>;
        })}
        {rows.length > 1 && <path d={`M ${linePoints} L ${plotEnd},${chartBottom} L ${plotStart},${chartBottom} Z`} fill="url(#salesFill)" />}
        {rows.map((row, index) => {
          const x = plotStart + index * stepX;
          const salesHeight = (croreValue(row.sales) / maxValue) * chartHeight;
          const outstandingHeight = (croreValue(row.outstanding) / maxValue) * chartHeight;
          const overdueHeight = (croreValue(row.overdue) / maxValue) * chartHeight;
          const profitHeight = Math.max(row.profit ? 3 : 0, Math.abs(croreValue(row.profit) / maxValue) * chartHeight);
          return <g key={row.month}>
            <rect x={x - 18} y={chartBottom - outstandingHeight} width="36" height={outstandingHeight} rx="4" fill="#405b7b" opacity="0.52" />
            <rect x={x - 13} y={chartBottom - overdueHeight} width="8" height={overdueHeight} rx="3" fill="#f0b454" />
            <rect x={x - 3} y={chartBottom - profitHeight} width="8" height={profitHeight} rx="3" fill={row.profit < 0 ? "#ff727f" : "#44d3a2"} />
            <rect x={x + 7} y={chartBottom - salesHeight} width="11" height={salesHeight} rx="4" fill="#4b9cff" />
            <text x={x} y="244" textAnchor="middle" className={`chartMonthLabel ${hoveredMonth === index ? "chartMonthActive" : ""}`}>{row.month.split(" ")[0]}</text>
          </g>;
        })}
      </svg>
      {rows.length === 0 && <div className="emptyChartMessage">No monthly records match this date range.</div>}
      <div className="chartPointerLayer" onMouseMove={monthAtPointer} aria-hidden="true" />
      {hovered && <div className="chartHoverLine" style={{ left: `${6 + (hoveredMonth / Math.max(rows.length - 1, 1)) * 88}%` }} />}
    </div>
  );
};

const CategoryChart = ({ rows }) => {
  const maximum = Math.max(...rows.map((item) => item.amount), 1);
  const tickValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => maximum * ratio);
  return (
    <div className="categoryChart" role="img" aria-label="Filtered product category sales bar chart">
      <div className="categoryAxis">{tickValues.map((tick, index) => <span key={index}>₹{tick.toFixed(0)}Cr</span>)}</div>
      {rows.map((item) => <div className="categoryBarRow" key={item.name}>
        <span className="categoryBarLabel" title={item.name}>{item.name}</span>
        <div className="categoryBarTrack"><span style={{ width: `${item.amount / maximum * 100}%`, background: `linear-gradient(90deg, ${item.color}cc, ${item.color})` }} /></div>
        <b>{item.amount.toFixed(2)}</b>
      </div>)}
    </div>
  );
};

const CategorySalesPanel = ({ rows, subtitle, title = "Product category-wise sales" }) => {
  const total = rows.reduce((sum, item) => sum + item.amount, 0);
  return (
    <section className="dashboardPanel categoryPanel">
      <PanelTitle title={title} subtitle={subtitle} right={<span className="chartUnit">₹ CRORE</span>} />
      <CategoryChart rows={rows} />
      <div className="categoryShareTitle"><span /> Category sales share</div>
      <div className="categoryShareList">
        {rows.map((item) => <div className="categoryShareRow" key={item.name}>
          <span className="categoryShareDot" style={{ background: item.color }} />
          <span className="categoryShareName">{item.name}</span>
          <b>₹{item.amount.toFixed(2)} Cr</b>
          <div className="categoryShareTrack"><span style={{ width: `${item.share}%`, background: item.color }} /></div>
          <span className="categorySharePercent">{item.share.toFixed(1)}%</span>
        </div>)}
        {rows.length === 0 && <p className="emptyFilterMessage">No products match the selected filters.</p>}
      </div>
      <div className="categoryTotalRow"><span>Filtered total</span><b>₹{total.toFixed(2)} Cr</b><b>{rows.length ? "100%" : "0%"}</b></div>
    </section>
  );
};

const scaleCategoryRows = (rows, totalSales) => {
  const totalCategorySales = rows.reduce((sum, row) => sum + row.sales, 0);
  return rows.map((row) => {
    const amount = totalCategorySales ? (Number(totalSales) || 0) * row.sales / totalCategorySales : 0;
    return { ...row, amount: croreValue(amount), share: Number(totalSales) > 0 ? amount / totalSales * 100 : 0, color: colorByCategory[row.name] || "#8ca3bd" };
  });
};

const FilterDrawer = ({ filters, dateError, onUpdate, onClose, onClear, onApply }) => {
  const productOptions = dashboardData.products.filter((product) => filters.category === "— All Categories —" || getProductCategory(product.name) === filters.category);
  const selectOptions = {
    geography: ["— All —", ...dashboardData.countries.map((row) => row.name)],
    client: ["— All Clients —", ...dashboardData.clients.map((row) => row.name)],
    category: ["— All Categories —", ...dashboardData.categories.map((row) => row.name)],
    product: ["— All Products —", ...productOptions.map((row) => row.name)],
  };

  return (
    <div className="filterOverlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="filterDrawer" role="dialog" aria-modal="true" aria-labelledby="filterDrawerTitle">
        <div className="filterDrawerHeader"><div><div className="filterDrawerEyebrow">REFINE DASHBOARD</div><h2 id="filterDrawerTitle">Filter data</h2><p>Select values to update the dashboard</p></div><button className="filterCloseButton" onClick={onClose} aria-label="Close filters">×</button></div>
        <div className="filterDrawerBody">
          <div className="filterFieldPair"><FilterField label="Date from"><input type="date" value={filters.dateFrom} onChange={(event) => onUpdate("dateFrom", event.target.value)} /></FilterField><FilterField label="Date to"><input type="date" value={filters.dateTo} onChange={(event) => onUpdate("dateTo", event.target.value)} /></FilterField></div>
          {dateError && <div className="filterValidationMessage" role="alert">{dateError}</div>}
          <FilterField label="Sales type"><div className="filterSegmentedControl">{["All", "Local", "Export"].map((type) => <button key={type} className={filters.salesType === type ? "filterSegmentActive" : ""} onClick={() => onUpdate("salesType", type)}>{type}</button>)}</div></FilterField>
          <FilterSelect label="Country" value={filters.geography} options={selectOptions.geography} onChange={(value) => onUpdate("geography", value)} />
          <FilterSelect label="Client" value={filters.client} options={selectOptions.client} onChange={(value) => onUpdate("client", value)} />
          <FilterSelect label="Product category" value={filters.category} options={selectOptions.category} onChange={(value) => { onUpdate("category", value); onUpdate("product", "— All Products —"); }} />
          <FilterSelect label="Product" value={filters.product} options={selectOptions.product} onChange={(value) => onUpdate("product", value)} />
        </div>
        <div className="filterDrawerFooter"><button className="filterClearButton" onClick={onClear}>Clear all</button><div><button className="filterCancelButton" onClick={onClose}>Cancel</button><button className="filterApplyButton" onClick={onApply}>Apply filters <span>→</span></button></div></div>
      </aside>
    </div>
  );
};

const FilterField = ({ label, children }) => <label className="filterField"><span>{label}</span>{children}</label>;
const FilterSelect = ({ label, value, options, onChange }) => <FilterField label={label}><span className="filterSelectWrap"><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select><span>⌄</span></span></FilterField>;

const SalesBreakdown = ({ salesType, selectedEntity, filters, onBack, onSelectEntity, onOpenFilters, activeFilterCount, categoryRows }) => {
  const localRows = useMemo(() => dashboardData.clients.filter((row) => row.localSales > 0), []);
  const exportRows = useMemo(() => dashboardData.countries.filter((row) => row.exportSales > 0), []);
  const rows = useMemo(() => {
    let filteredRows = salesType === "Local" ? localRows : exportRows;
    if (salesType === "Export" && filters.geography !== "— All —") filteredRows = filteredRows.filter((row) => row.name === filters.geography);
    if (filters.client !== "— All Clients —") filteredRows = filteredRows.filter((row) => row.name === filters.client);
    return filteredRows;
  }, [salesType, filters, localRows, exportRows]);

  const categoryTitle = salesType === "Local" ? "Local client" : "Export country";
  const amountKey = salesType === "Local" ? "localSales" : "exportSales";
  const profitKey = salesType === "Local" ? "localProfit" : "exportProfit";
  const receivableKey = salesType === "Local" ? "localReceivables" : "exportReceivables";
  const overdueKey = salesType === "Local" ? "localOverdue" : "exportOverdue";
  const summary = salesType === "Local"
    ? [{ label: "LOCAL SALES", value: formatCr(dashboardData.summary.LocalSales) }, { label: "LOCAL PROFIT", value: formatCr(dashboardData.summary.LocalProfit) }, { label: "GROSS PROFIT %", value: formatPercent(dashboardData.summary.LocalGP) }, { label: "RECEIVABLES", value: formatCr(dashboardData.summary.LocalReceivables) }]
    : [{ label: "EXPORT SALES", value: formatCr(dashboardData.summary.ExportSales) }, { label: "EXPORT PROFIT", value: formatCr(dashboardData.summary.ExportProfit) }, { label: "GROSS PROFIT %", value: formatPercent(dashboardData.summary.ExportGP) }, { label: "RECEIVABLES", value: formatCr(dashboardData.summary.ExportReceivables) }];

  const invoiceRows = useMemo(() => selectedEntity && salesType === "Local"
    ? dashboardData.invoices.filter((row) => row.client.toUpperCase() === selectedEntity.name.toUpperCase())
    : [], [selectedEntity, salesType]);
  const invoicePagination = useTablePagination(invoiceRows);
  const rowPagination = useTablePagination(rows);

  if (selectedEntity) {
    return (
      <div className="breakdownPage">
        <div className="breakdownIntroRow"><div><div className="breakdownBreadcrumb"><button onClick={onBack}>Dashboard</button><span>›</span><button onClick={() => onSelectEntity(null)}>{salesType} Sales</button><span>›</span><b>{selectedEntity.name}</b></div><h1>{salesType === "Local" ? "Client details" : "Country details"}</h1><p>{dashboardData.period.label}</p></div><button className="filterOpenButton" onClick={onOpenFilters}>Filters {activeFilterCount > 0 && <span className="filterCount">{activeFilterCount}</span>}</button></div>
        <div className="breakdownKpiGrid breakdownClientKpis">{[{ label: "NAME", value: selectedEntity.name }, { label: "SALES", value: formatCr(selectedEntity[amountKey]) }, { label: "PROFIT", value: formatCr(selectedEntity[profitKey]) }, { label: "GROSS PROFIT %", value: formatPercent(selectedEntity.gp) }].map((item) => <div className="breakdownKpiCard" key={item.label}><span>{item.label}</span><b>{item.value}</b></div>)}</div>
        <section className="dashboardPanel breakdownTablePanel">
          <PanelTitle title={salesType === "Local" ? "Invoice-wise outstanding" : "Country summary"} subtitle={salesType === "Local" ? `${invoiceRows.length} invoices` : "Country sales overview"} />
          {salesType === "Local" && invoiceRows.length > 0 ? <><div className="tableScroll"><table className="dashboardTable"><thead><tr>{["BILL NO.", "BILL DATE", "DUE DATE", "PENDING", "CURRENCY", "CREDIT DAYS", "OVERDUE DAYS"].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{invoicePagination.pageRows.map((row) => <tr key={`${row.bill}-${row.billDate}-${row.pending}`}><td className="tableLink">{row.bill}</td><td>{row.billDate}</td><td>{row.dueDate}</td><td>{formatCr(row.pending)}</td><td>{row.currency}</td><td>{row.creditDays}</td><td>{row.overdueDays}</td></tr>)}</tbody></table></div><TablePagination pagination={invoicePagination} csvColumns={["Invoice no.", "Invoice date", "Due date", "Pending", "Currency", "Credit days", "Overdue days"]} csvRows={invoiceRows.map((row) => [row.bill, row.billDate, row.dueDate, formatCr(row.pending), row.currency, row.creditDays, row.overdueDays])} fileName="client-invoices.csv" /></> : null}
        </section>
        <CategorySalesPanel rows={scaleCategoryRows(categoryRows, selectedEntity[amountKey])} subtitle={selectedEntity.name} />
        <DashboardFooter />
      </div>
    );
  }

  return (
    <div className="breakdownPage">
      <div className="breakdownIntroRow"><div><div className="breakdownBreadcrumb"><button onClick={onBack}>Dashboard</button><span>›</span><b>{salesType} Sales</b></div><h1>{salesType} sales breakdown</h1><p>{salesType === "Local" ? "Client-wise domestic performance" : "Country-wise international performance"} · {dashboardData.period.label}</p></div><button className="filterOpenButton" onClick={onOpenFilters}>Filters {activeFilterCount > 0 && <span className="filterCount">{activeFilterCount}</span>}</button></div>
      <div className="breakdownKpiGrid breakdownClientKpis">{summary.map((item) => <div className="breakdownKpiCard" key={item.label}><span>{item.label}</span><b>{item.value}</b></div>)}</div>
      <section className="dashboardPanel breakdownTablePanel">
        <PanelTitle title={`${salesType} sales — ${salesType === "Local" ? "Client-wise" : "Country-wise"} breakdown`} subtitle={`${rows.length} matching records · click a row for detail`} right={<span className="tableCountBadge">{rows.length} records</span>} />
        <div className="tableScroll"><table className="dashboardTable"><thead><tr>{[categoryTitle, "SALES", "PROFIT", "GROSS PROFIT %", "RECEIVABLES", "OVERDUE", "TOTAL PURCHASE", "ACTION"].map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{rowPagination.pageRows.map((row) => <tr key={row.name} onClick={() => onSelectEntity(row)}><td className="tablePrimaryCell">{row.name}</td><td>{formatCr(row[amountKey])}</td><td>{formatCr(row[profitKey])}</td><td><span className={row.gp < 0 ? "warningText" : "positiveText"}>{formatPercent(row.gp)}</span></td><td>{formatCr(row[receivableKey])}</td><td><span className="warningText">{formatCr(row[overdueKey])}</span></td><td>{formatCr(row.purchase)}</td><td><button className="tableActionButton" onClick={(event) => { event.stopPropagation(); onSelectEntity(row); }}>View <span>→</span></button></td></tr>)}</tbody></table></div>
        {rows.length > 0 && <TablePagination pagination={rowPagination} csvColumns={[categoryTitle, "Sales", "Profit", "Gross profit %", "Receivables", "Overdue", "Total purchase"]} csvRows={rows.map((row) => [row.name, formatCr(row[amountKey]), formatCr(row[profitKey]), formatPercent(row.gp), formatCr(row[receivableKey]), formatCr(row[overdueKey]), formatCr(row.purchase)])} fileName={salesType === "Local" ? "client-sales.csv" : "country-sales.csv"} />}
        {rows.length === 0 && <div className="tableHelper"><span>ⓘ</span> No records match the selected filters.</div>}
      </section>
      <CategorySalesPanel rows={categoryRows} subtitle={`${salesType} sales`} />
      <DashboardFooter />
    </div>
  );
};

const DashboardFooter = () => <footer className="dashboardFooter"><span>Sales performance</span><span>{dashboardData.period.label} <i /> Metropol Pharmaceuticals</span></footer>;
