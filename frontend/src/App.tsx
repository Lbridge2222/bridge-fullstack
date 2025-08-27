// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import DashboardLayout from "@/components/layout/DashboardLayout";

// Pages
import Dashboard from "@/pages/Dashboard";
import LeadsManagementPage from "@/pages/crm/Leads";
import Overviewpage from "@/pages/crm/Overview";
import EnquiriesPage from "@/pages/crm/Enquiries"
import InterviewsPage from "@/pages/crm/Interviews";
import ApplicationsBoard from "@/pages/crm/ApplicationsBoard";
import OffersPage from "@/pages/crm/Offers";  
import StudentRecordOverview from "@/pages/studentrecord/studentrecord";
import EmailsPage from "@/pages/Communications/Emails"
import SMSPage from "@/pages/Communications/SMS";
import CallLogs from "@/pages/Communications/Calls";
import WorkflowsStudio from "@/pages/workflows/Workflowstudio";
import Integrations from "@/pages/workflows/Integrations";
import ForecastingPage from "@/pages/ai/Forecasting";
import RiskScoringPage from "@/pages/ai/risk-scoring";
import NextBestActionPage from "@/pages/ai/NextBestAction";
import AICommunicationsPage from "@/pages/ai/Communications";
import NaturalLanguageQueriesPage from "@/pages/ai/NaturalLanguageQueries";
import AdvancedMLPage from "@/pages/ai/AdvancedML";
import PersonDetailPage from "@/pages/people/contact-page";
import CohortAnalysisPage from "@/pages/analytics/CohortAnalysis";

// import AdmissionsPipelinePage from "@/pages/crm/Admissions"; // future
// import InterviewsPage from "@/pages/crm/Interviews"; // future
// import OffersPage from "@/pages/crm/Offers"; // future

export default function App() {
  return (
    <Routes>
      {/* All app routes go through the DashboardLayout */}
      <Route element={<DashboardLayout />}>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard */}
        <Route path="dashboard" element={<Dashboard />} />

        {/* CRM Section */}
        <Route path="crm">
          <Route index element={<Navigate to="leads" replace />} />
          <Route path="Overview" element={<Overviewpage/>} />
          <Route path="leads" element={<LeadsManagementPage />} />
          <Route path="enquiries" element={<EnquiriesPage />} />
          <Route path="interviews" element={<InterviewsPage />} />
          <Route path="applications" element={<ApplicationsBoard />} />
          <Route path="offers" element={<OffersPage />} />
          {/* <Route path="admissions" element={<AdmissionsPipelinePage />} /> */}
          {/* <Route path="interviews" element={<InterviewsPage />} /> */}
          {/* <Route path="offers" element={<OffersPage />} /> */}
        </Route>

        {/* Student Record Section */}
        <Route path="students">
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<StudentRecordOverview />} />
        </Route>

        {/* People Section */}
        <Route path="people">
          <Route path=":id" element={<PersonDetailPage />} />
        </Route>

        {/* Communications Section */}
        <Route path="communications">
          <Route path="emails" element={<EmailsPage />} />
          <Route path="sms" element={<SMSPage />} />
          <Route path="calls" element={<CallLogs />} />
        </Route>

        {/* Workflows Section */}
        <Route path="workflows">
          <Route path="workflowstudio" element={<WorkflowsStudio />} />
          <Route path="integrations" element={<Integrations />} />
        </Route>

        {/* Analytics & Reporting */}
        <Route path="analytics">
          <Route path="cohort-analysis" element={<CohortAnalysisPage />} />
        </Route>

        {/* AI Section */}
        <Route path="ai">
          <Route path="forecasting" element={<ForecastingPage />} />
          <Route path="riskscoring" element={<RiskScoringPage />} />
          <Route path="ai-comms" element={<AICommunicationsPage />} />
          <Route path="actions" element={<NextBestActionPage />} />
          <Route path="natural-language" element={<NaturalLanguageQueriesPage />} />
        <Route path="advanced-ml" element={<AdvancedMLPage />} />
        </Route>
      </Route>

      {/* Catch-all for unknown routes */}
      <Route path="*" element={<div>Not found</div>} />
    </Routes>
  );
}