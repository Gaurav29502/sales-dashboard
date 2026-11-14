import React, { useState } from "react";
import "./login.css";

export const Login = ({ onLogin }) => {
  const [salesPersonId, setSalesPersonId] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!salesPersonId.trim()) return;
    localStorage.setItem("salesPersonId", salesPersonId.trim());
    onLogin();
  };

  return (
    <main className="loginMain">
      <section className="loginCard">
        <div className="loginBrandMark" aria-hidden="true">M</div>
        <div className="loginEyebrow">METROPOL PHARMACEUTICALS</div>
        <h1>Sales Performance</h1>
        <p>Enter your salesperson ID to continue to the FY 2026–27 dashboard.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="salesPersonId">SALESPERSON ID</label>
          <input id="salesPersonId" value={salesPersonId} onChange={(event) => setSalesPersonId(event.target.value)} placeholder="Enter your ID" autoComplete="username" />
          <button className="primaryButton" type="submit">Continue to dashboard</button>
        </form>
      </section>
    </main>
  );
};
