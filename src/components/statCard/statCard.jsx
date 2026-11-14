import React from "react";
import "./statCard.css";

export const StatCard = ({ label, value, detail, icon, tone = "blue", onClick, hint }) => {
  const CardTag = onClick ? "button" : "div";
  return (
    <CardTag className={`statCard statCard${tone} ${onClick ? "statCardClickable" : ""}`} onClick={onClick}>
      <div className="statCardTopline">
        <span className="statCardIcon" aria-hidden="true">{icon}</span>
        <span className="statCardLabel">{label}</span>
        {onClick && <span className="statCardArrow" aria-hidden="true">↗</span>}
      </div>
      <div className="statCardValue">{value}</div>
      <div className="statCardDetail">{detail}</div>
      {hint && <span className="statCardHint">{hint}</span>}
    </CardTag>
  );
};
