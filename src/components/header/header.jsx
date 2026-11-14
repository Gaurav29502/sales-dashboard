import React from "react";
import "./header.css";

const navigationItems = [
  { label: "Dashboard", path: "/landing", icon: "▦" },
  { label: "Ageing Analysis", path: "/ageing-analysis", icon: "◷" },
  { label: "Purchases", path: "/purchases", icon: "↗" },
  { label: "Expenses", path: "/expenses", icon: "◈" },
];

export const Header = ({ activePage, onNavigate, onOpenFilters }) => {
  const usesAlternatePeriod = activePage === "/purchases" || activePage === "/expenses";
  const handleLogout = () => {
    localStorage.removeItem("salesPersonId");
    window.history.replaceState({}, "", "/login");
    onNavigate("/login");
  };

  return (
    <header className="dashboardHeader">
      <div className="headerBrand">
        <div className="brandMark" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="brandCopy">
          <div className="brandName">METROPOL</div>
          <div className="brandCaption">PHARMACEUTICALS</div>
        </div>
      </div>

      <div className="headerDivider" />

      <div className="headerTitleBlock">
        <div className="headerTitle">SALES PERFORMANCE DASHBOARD</div>
        <div className="headerSubtitle">{usesAlternatePeriod ? <>Financial Year 2024–25 <span>·</span> April 2024 – March 2025</> : <>Financial Year 2026–27 <span>·</span> April – October 2026</>}</div>
      </div>

      <nav className="headerNavigation" aria-label="Main navigation">
        {navigationItems.map((item) => (
          <button
            className={`headerNavItem ${activePage === item.path ? "headerNavItemActive" : ""}`}
            key={item.path}
            onClick={() => onNavigate(item.path)}
          >
            <span className="headerNavIcon" aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="headerCredentials">
        <span>GSTIN <b>27AAMCM4512B1ZQ</b></span>
        <span>DRUG LIC. <b>MH-MUM-8821-2024</b></span>
        <span className="credentialBadge">ISO 9001:2015 <i /> WHO-GMP</span>
      </div>

      <button className="headerFilterButton" onClick={onOpenFilters} aria-label="Open filters">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4" /><circle cx="9" cy="6" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="13" cy="18" r="1.5" /></svg>
        Filters
      </button>
      <button className="headerLogoutButton" onClick={handleLogout} aria-label="Log out" title="Log out">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3m9-8h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></svg>
      </button>
    </header>
  );
};
