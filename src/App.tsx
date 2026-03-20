import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionProvider } from "@/hooks/use-subscription";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Questions from "./pages/Questions";
import Composer from "./pages/Composer";
import Exams from "./pages/Exams";
import ExamEditor from "./pages/ExamEditor";
import ExamView from "./pages/ExamView";
import Classes from "./pages/Classes";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Pricing from "./pages/Pricing";
import StudentAuth from "./pages/StudentAuth";
import StudentDashboard from "./pages/StudentDashboard";
import StudentExam from "./pages/StudentExam";
import StudentResults from "./pages/StudentResults";
import ExamMonitoring from "./pages/ExamMonitoring";
import ExamCalendar from "./pages/ExamCalendar";
import NotFound from "./pages/NotFound";
import Documentation from "./pages/Documentation";
import Settings from "./pages/Settings";
import Contact from "./pages/Contact";
import Trash from "./pages/Trash";
import ResetPassword from "./pages/ResetPassword";
import Marketplace from "./pages/Marketplace";
import OsceExams from "./pages/OsceExams";
import OsceEditor from "./pages/OsceEditor";
import OsceCircuitControl from "./pages/OsceCircuitControl";
import OsceEvaluator from "./pages/OsceEvaluator";
import OsceResults from "./pages/OsceResults";
import OsceVirtualPatient from "./pages/OsceVirtualPatient";
import OsceStudentPortal from "./pages/OsceStudentPortal";
import Simulations from "./pages/Simulations";
import SimulationEditor from "./pages/SimulationEditor";
import SimulationControl from "./pages/SimulationControl";
import SimulationJoin from "./pages/SimulationJoin";
import SoapRooms from "./pages/SoapRooms";
import SoapEditor from "./pages/SoapEditor";
import SoapJoin from "./pages/SoapJoin";
import SoapControl from "./pages/SoapControl";
import ReconciliationRooms from "./pages/ReconciliationRooms";
import ReconciliationEditor from "./pages/ReconciliationEditor";
import ReconciliationJoin from "./pages/ReconciliationJoin";
import ReconciliationControl from "./pages/ReconciliationControl";
import Features from "./pages/Features";
import PublicPricing from "./pages/PublicPricing";
import PublicContact from "./pages/PublicContact";
import PublicDocumentation from "./pages/PublicDocumentation";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import { CookieBanner } from "@/components/CookieBanner";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SubscriptionProvider>
        <BrowserRouter>
          <AnalyticsProvider />
          <CookieBanner />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Student routes */}
            <Route path="/student/auth" element={<StudentAuth />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/exam/:sessionId" element={<StudentExam />} />
            <Route path="/student/results/:sessionId" element={<StudentResults />} />

            {/* Teacher routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayout><Admin /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout><Dashboard /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/questions"
              element={
                <ProtectedRoute>
                  <AppLayout><Questions /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/composer"
              element={
                <ProtectedRoute>
                  <AppLayout><Composer /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams"
              element={
                <ProtectedRoute>
                  <AppLayout><Exams /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams/:examId"
              element={
                <ProtectedRoute>
                  <AppLayout><ExamView /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams/:examId/edit"
              element={
                <ProtectedRoute>
                  <AppLayout><ExamEditor /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/classes"
              element={
                <ProtectedRoute>
                  <AppLayout><Classes /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AppLayout><Analytics /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <AppLayout><ExamCalendar /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/pricing"
              element={
                <ProtectedRoute>
                  <AppLayout><Pricing /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/monitoring/:publicationId"
              element={
                <ProtectedRoute>
                  <AppLayout><ExamMonitoring /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout><Settings /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/trash"
              element={
                <ProtectedRoute>
                  <AppLayout><Trash /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketplace"
              element={
                <ProtectedRoute>
                  <AppLayout><Marketplace /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/osce"
              element={
                <ProtectedRoute>
                  <AppLayout><OsceExams /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/osce/:id/edit"
              element={
                <ProtectedRoute>
                  <AppLayout><OsceEditor /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/osce/:circuitId/control"
              element={
                <ProtectedRoute>
                  <AppLayout><OsceCircuitControl /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/osce/:id/results"
              element={
                <ProtectedRoute>
                  <AppLayout><OsceResults /></AppLayout>
                </ProtectedRoute>
              }
            />
            {/* Simulation routes */}
            <Route
              path="/simulations"
              element={
                <ProtectedRoute>
                  <AppLayout><Simulations /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/simulations/:roomId/edit"
              element={
                <ProtectedRoute>
                  <AppLayout><SimulationEditor /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/simulations/:roomId/control"
              element={
                <ProtectedRoute>
                  <AppLayout><SimulationControl /></AppLayout>
                </ProtectedRoute>
              }
            />
            {/* SOAP routes */}
            <Route
              path="/simulations/soap"
              element={
                <ProtectedRoute>
                  <AppLayout><SoapRooms /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/simulations/soap/editor/:roomId"
              element={
                <ProtectedRoute>
                  <AppLayout><SoapEditor /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/simulations/soap/control/:roomId"
              element={
                <ProtectedRoute>
                  <AppLayout><SoapControl /></AppLayout>
                </ProtectedRoute>
              }
            />
            {/* Public OSCE routes (no auth required) */}
            <Route path="/osce/evaluate/:accessCode" element={<OsceEvaluator />} />
            <Route path="/osce/patient/:stationId" element={<OsceVirtualPatient />} />
            <Route path="/osce/student/:accessCode" element={<OsceStudentPortal />} />
            {/* Public Simulation route */}
            <Route path="/simulation/join" element={<SimulationJoin />} />
            {/* Public SOAP route */}
            <Route path="/simulation/soap/join" element={<SoapJoin />} />
            {/* Public Reconciliation route */}
            <Route path="/simulation/reconciliation/join" element={<ReconciliationJoin />} />
            {/* Reconciliation routes */}
            <Route
              path="/simulations/reconciliation"
              element={
                <ProtectedRoute>
                  <AppLayout><ReconciliationRooms /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/simulations/reconciliation/editor/:roomId"
              element={
                <ProtectedRoute>
                  <AppLayout><ReconciliationEditor /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/simulations/reconciliation/control/:roomId"
              element={
                <ProtectedRoute>
                  <AppLayout><ReconciliationControl /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/docs" element={<Documentation />} />
            <Route path="/funcionalidades" element={<Features />} />
            <Route path="/planos" element={<PublicPricing />} />
            <Route path="/contato-publico" element={<PublicContact />} />
            <Route path="/documentacao" element={<PublicDocumentation />} />
            <Route path="/termos" element={<TermsOfService />} />
            <Route path="/privacidade" element={<PrivacyPolicy />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route
              path="/contato"
              element={
                <ProtectedRoute>
                  <AppLayout><Contact /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SubscriptionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
