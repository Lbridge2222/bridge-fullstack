// src/pages/Dashboard.tsx
import React from "react";

export default function CollegeHealthOverview() {
  return (
    <div className="card-elevated p-6">
      <h2 className="text-xl font-semibold text-card-foreground">College Health (All‑Up)</h2>
      <p className="text-muted-foreground">
        Roll‑up KPIs across CRM, Student Record, and Communications.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="card-base p-4">
          <div className="text-sm font-medium text-card-foreground">CRM summary</div>
          <div className="text-xs text-muted-foreground">Offers, accepts, forecast</div>
        </div>
        <div className="card-base p-4">
          <div className="text-sm font-medium text-card-foreground">Student Record</div>
          <div className="text-xs text-muted-foreground">Retention & risk</div>
        </div>
        <div className="card-base p-4">
          <div className="text-sm font-medium text-card-foreground">Comms</div>
          <div className="text-xs text-muted-foreground">Upcoming broadcasts</div>
        </div>
      </div>
    </div>
  );
}