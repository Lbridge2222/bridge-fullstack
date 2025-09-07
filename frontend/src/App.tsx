// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// Layout
import DashboardLayout from "@/components/layout/DashboardLayout";

// Core pages (loaded immediately)
import LeadsManagementPage from "@/pages/crm/Leads";
import EnquiriesPage from "@/pages/crm/Enquiries";
import Overviewpage from "@/pages/crm/Overview";
import InterviewsPage from "@/pages/crm/Interviews";
import ApplicationsBoard from "@/pages/crm/ApplicationsBoard";
import OffersPage from "@/pages/crm/Offers";  
import StudentRecordOverview from "@/pages/studentrecord/studentrecord";
import PersonDetailPage from "@/pages/people/contact-page";
import Directory from "@/pages/Directory";
import CohortAnalysisPage from "@/pages/analytics/CohortAnalysis";
import CommsHub from "./pages/CommsHub";
import Labs from "./pages/settings/Labs";
import IntegrationsPage from "@/pages/workflows/Integrations";
import WorkflowStudioPage from "@/pages/workflows/Workflowstudio";

// Lazy load heavy AI components
const ForecastingPage = lazy(() => import("@/pages/ai/Forecasting"));
const RiskScoringPage = lazy(() => import("@/pages/ai/risk-scoring"));
const NextBestActionPage = lazy(() => import("@/pages/ai/NextBestAction"));
const NaturalLanguageQueriesPage = lazy(() => import("@/pages/ai/NaturalLanguageQueries"));
const AILeadInsightsPage = lazy(() => import("@/pages/AILeadInsights"));
const AdvancedMLPage = lazy(() => import("@/pages/ai/AdvancedML"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

// import AdmissionsPipelinePage from "@/pages/crm/Admissions"; // future
// import InterviewsPage from "@/pages/crm/Interviews"; // future
// import OffersPage from "@/pages/crm/Offers"; // future

export default function App() {
  return (
    <Routes>
      {/* All app routes go through the DashboardLayout */}
      <Route element={<DashboardLayout />}>
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/analytics/dashboard" replace />} />

        {/* Admissions */}
        <Route path="admissions">
          <Route path="overview" element={<Overviewpage/>} />
          <Route path="leads" element={<LeadsManagementPage />} />
          <Route path="enquiries" element={<EnquiriesPage />} />
          <Route path="interviews" element={<InterviewsPage />} />
          <Route path="applications" element={<ApplicationsBoard />} />
          <Route path="offers" element={<OffersPage />} />
          <Route path="enrolments" element={<div>Enrolments — coming soon</div>} />
        </Route>

        {/* Directory */}
        <Route path="directory">
          <Route index element={<Directory />} />
          <Route path=":personId" element={<PersonDetailPage />} />
        </Route>

        {/* Student Records */}
        <Route path="records">
          <Route path="overview" element={<StudentRecordOverview />} />
          <Route path="progress" element={<div>Progress — coming soon</div>} />
          <Route path="compliance" element={<div>Compliance — coming soon</div>} />
          <Route path="alumni" element={<div>Alumni — coming soon</div>} />
        </Route>

        {/* Marketing & Comms */}
        <Route path="comms" element={<CommsHub />} />

        {/* Analytics & Forecast */}
        <Route path="analytics">
          <Route path="dashboard" element={<Suspense fallback={<LoadingSpinner />}><ForecastingPage /></Suspense>} />
          <Route path="admissions-overview" element={<Overviewpage/>} />
          <Route path="cohort-analysis" element={<CohortAnalysisPage />} />
          <Route path="risk-scoring" element={<Suspense fallback={<LoadingSpinner />}><RiskScoringPage /></Suspense>} />
          <Route path="source-quality" element={<div>Source Quality — coming soon</div>} />
        </Route>

        {/* Workflows */}
        <Route path="workflows">
          <Route path="studio" element={<WorkflowStudioPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
        </Route>

        {/* Settings */}
        <Route path="settings">
          <Route path="labs" element={<Labs />} />
          <Route path="ai">
            <Route path="nlq" element={<Suspense fallback={<LoadingSpinner />}><NaturalLanguageQueriesPage /></Suspense>} />
            <Route path="lead-insights" element={<Suspense fallback={<LoadingSpinner />}><AILeadInsightsPage /></Suspense>} />
            <Route path="advanced-ml" element={<Suspense fallback={<LoadingSpinner />}><AdvancedMLPage /></Suspense>} />
          </Route>
        </Route>

        {/* Keep AI routes alive (not in nav) */}
        <Route path="ai">
          <Route path="natural-language" element={<Suspense fallback={<LoadingSpinner />}><NaturalLanguageQueriesPage /></Suspense>} />
          <Route path="advanced-ml" element={<Suspense fallback={<LoadingSpinner />}><AdvancedMLPage /></Suspense>} />
        </Route>
      </Route>

      {/* Redirects for old paths */}
      <Route path="dashboard" element={<Navigate to="/analytics/dashboard" replace />} />
      <Route path="crm/Overview" element={<Navigate to="/analytics/admissions-overview" replace />} />
      <Route path="crm/leads" element={<Navigate to="/admissions/leads" replace />} />
      <Route path="crm/enquiries" element={<Navigate to="/admissions/enquiries" replace />} />
      <Route path="crm/interviews" element={<Navigate to="/admissions/interviews" replace />} />
      <Route path="crm/applications" element={<Navigate to="/admissions/applications" replace />} />
      <Route path="crm/offers" element={<Navigate to="/admissions/offers" replace />} />
      <Route path="students/overview" element={<Navigate to="/records/overview" replace />} />
      <Route path="people/:id" element={<Navigate to="/directory/:personId" replace />} />
      <Route path="communications/:rest" element={<Navigate to="/comms" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<div>Not found</div>} />
    </Routes>
  );
}