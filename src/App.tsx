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
import ClassDetail from "./pages/ClassDetail";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";
import Pricing from "./pages/Pricing";
import StudentAuth from "./pages/StudentAuth";
import StudentCheckin from "./pages/StudentCheckin";
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
import SctExams from "./pages/SctExams";
import SctEditor from "./pages/SctEditor";
import SctExpertPortal from "./pages/SctExpertPortal";
import SctStudentPortal from "./pages/SctStudentPortal";
import KfeExams from "./pages/KfeExams";
import KfeEditor from "./pages/KfeEditor";
import KfeStudentPortal from "./pages/KfeStudentPortal";
import ClinicalObservations from "./pages/ClinicalObservations";
import ClinicalObservationEditor from "./pages/ClinicalObservationEditor";
import ClinicalObservationEval from "./pages/ClinicalObservationEval";
import SjtExams from "./pages/SjtExams";
import SjtEditor from "./pages/SjtEditor";
import SjtStudentPortal from "./pages/SjtStudentPortal";
import ProgressTests from "./pages/ProgressTests";
import ProgressTestEditor from "./pages/ProgressTestEditor";
import ProgressTestStudentPortal from "./pages/ProgressTestStudentPortal";
import MockTrials from "./pages/MockTrials";
import MockTrialEditor from "./pages/MockTrialEditor";
import MockTrialJudge from "./pages/MockTrialJudge";
import MockTrialStudent from "./pages/MockTrialStudent";
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
import DocumentationRooms from "./pages/DocumentationRooms";
import DocumentationEditor from "./pages/DocumentationEditor";
import DocumentationJoin from "./pages/DocumentationJoin";
import DocumentationControl from "./pages/DocumentationControl";
import SimulationAggregator from "./pages/SimulationAggregator";
import NursingSimulations from "./pages/NursingSimulations";
import NursingEditor from "./pages/NursingEditor";
import NursingControl from "./pages/NursingControl";
import NursingJoin from "./pages/NursingJoin";
import NursingAggregator from "./pages/NursingAggregator";
import NutritionSimulations from "./pages/NutritionSimulations";
import NutritionEditor from "./pages/NutritionEditor";
import NutritionControl from "./pages/NutritionControl";
import NutritionJoin from "./pages/NutritionJoin";
import NutritionAggregator from "./pages/NutritionAggregator";
import DentistrySimulations from "./pages/DentistrySimulations";
import DentistryEditor from "./pages/DentistryEditor";
import DentistryControl from "./pages/DentistryControl";
import DentistryJoin from "./pages/DentistryJoin";
import DentistryAggregator from "./pages/DentistryAggregator";
import MedicineSimulations from "./pages/MedicineSimulations";
import MedicineEditor from "./pages/MedicineEditor";
import MedicineControl from "./pages/MedicineControl";
import MedicineJoin from "./pages/MedicineJoin";
import MedicineAggregator from "./pages/MedicineAggregator";
import PhysiotherapySimulations from "./pages/PhysiotherapySimulations";
import PhysiotherapyEditor from "./pages/PhysiotherapyEditor";
import PhysiotherapyControl from "./pages/PhysiotherapyControl";
import PhysiotherapyJoin from "./pages/PhysiotherapyJoin";
import PhysiotherapyAggregator from "./pages/PhysiotherapyAggregator";
import BiomedicineSimulations from "./pages/BiomedicineSimulations";
import BiomedicineEditor from "./pages/BiomedicineEditor";
import BiomedicineControl from "./pages/BiomedicineControl";
import BiomedicineJoin from "./pages/BiomedicineJoin";
import BiomedicineAggregator from "./pages/BiomedicineAggregator";
import VirtualPatients from "./pages/VirtualPatients";
import VirtualPatientChat from "./pages/VirtualPatientChat";
import VirtualPatientRoom from "./pages/VirtualPatientRoom";
import VirtualPatientFeedback from "./pages/VirtualPatientFeedback";
import VPAnalytics from "./pages/VPAnalytics";
import Features from "./pages/Features";
import PublicPricing from "./pages/PublicPricing";
import PublicContact from "./pages/PublicContact";
import PublicDocumentation from "./pages/PublicDocumentation";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CookiePolicy from "./pages/CookiePolicy";
import { CookieBanner } from "@/components/CookieBanner";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import UpdatePipeline from "./pages/UpdatePipeline";
import StudentGamification from "./pages/StudentGamification";
import StudentPortfolio from "./pages/StudentPortfolio";
import CompetencyAnalysis from "./pages/CompetencyAnalysis";
import LmsIntegration from "./pages/LmsIntegration";

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
            <Route path="/checkin/:token" element={<StudentCheckin />} />
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/exam/:sessionId" element={<StudentExam />} />
            <Route path="/student/results/:sessionId" element={<StudentResults />} />
            <Route path="/student/gamification" element={<StudentGamification />} />
            <Route path="/student/portfolio" element={<StudentPortfolio />} />

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
              path="/classes/:classId"
              element={
                <ProtectedRoute>
                  <AppLayout><ClassDetail /></AppLayout>
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
              path="/updates"
              element={
                <ProtectedRoute>
                  <AppLayout><UpdatePipeline /></AppLayout>
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
            {/* Public Documentation route */}
            <Route path="/simulation/documentation/join" element={<DocumentationJoin />} />
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
            {/* Documentation routes */}
            <Route
              path="/simulations/documentation"
              element={
                <ProtectedRoute>
                  <AppLayout><DocumentationRooms /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/simulations/documentation/editor/:roomId"
              element={
                <ProtectedRoute>
                  <AppLayout><DocumentationEditor /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/simulations/documentation/control/:roomId"
              element={
                <ProtectedRoute>
                  <AppLayout><DocumentationControl /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/simulations/aggregator"
              element={
                <ProtectedRoute>
                  <AppLayout><SimulationAggregator /></AppLayout>
                </ProtectedRoute>
              }
            />
            {/* Nursing routes */}
            <Route path="/nursing" element={<ProtectedRoute><AppLayout><NursingSimulations /></AppLayout></ProtectedRoute>} />
            <Route path="/nursing/aggregator" element={<ProtectedRoute><AppLayout><NursingAggregator /></AppLayout></ProtectedRoute>} />
            <Route path="/nursing/:moduleType/editor/:roomId" element={<ProtectedRoute><AppLayout><NursingEditor /></AppLayout></ProtectedRoute>} />
            <Route path="/nursing/:moduleType/control/:roomId" element={<ProtectedRoute><AppLayout><NursingControl /></AppLayout></ProtectedRoute>} />
            {/* Public Nursing route */}
            <Route path="/nursing/join" element={<NursingJoin />} />
            {/* Nutrition routes */}
            <Route path="/nutrition" element={<ProtectedRoute><AppLayout><NutritionSimulations /></AppLayout></ProtectedRoute>} />
            <Route path="/nutrition/aggregator" element={<ProtectedRoute><AppLayout><NutritionAggregator /></AppLayout></ProtectedRoute>} />
            <Route path="/nutrition/:moduleType/editor/:roomId" element={<ProtectedRoute><AppLayout><NutritionEditor /></AppLayout></ProtectedRoute>} />
            <Route path="/nutrition/:moduleType/control/:roomId" element={<ProtectedRoute><AppLayout><NutritionControl /></AppLayout></ProtectedRoute>} />
            <Route path="/nutrition/join" element={<NutritionJoin />} />
            {/* Dentistry routes */}
            <Route path="/dentistry" element={<ProtectedRoute><AppLayout><DentistrySimulations /></AppLayout></ProtectedRoute>} />
            <Route path="/dentistry/aggregator" element={<ProtectedRoute><AppLayout><DentistryAggregator /></AppLayout></ProtectedRoute>} />
            <Route path="/dentistry/:moduleType/editor/:roomId" element={<ProtectedRoute><AppLayout><DentistryEditor /></AppLayout></ProtectedRoute>} />
            <Route path="/dentistry/:moduleType/control/:roomId" element={<ProtectedRoute><AppLayout><DentistryControl /></AppLayout></ProtectedRoute>} />
            <Route path="/dentistry/join" element={<DentistryJoin />} />
            {/* Medicine routes */}
            <Route path="/medicine" element={<ProtectedRoute><AppLayout><MedicineSimulations /></AppLayout></ProtectedRoute>} />
            <Route path="/medicine/aggregator" element={<ProtectedRoute><AppLayout><MedicineAggregator /></AppLayout></ProtectedRoute>} />
            <Route path="/medicine/:moduleType/editor/:roomId" element={<ProtectedRoute><AppLayout><MedicineEditor /></AppLayout></ProtectedRoute>} />
            <Route path="/medicine/:moduleType/control/:roomId" element={<ProtectedRoute><AppLayout><MedicineControl /></AppLayout></ProtectedRoute>} />
            <Route path="/medicine/join" element={<MedicineJoin />} />
            {/* Physiotherapy routes */}
            <Route path="/physiotherapy" element={<ProtectedRoute><AppLayout><PhysiotherapySimulations /></AppLayout></ProtectedRoute>} />
            <Route path="/physiotherapy/aggregator" element={<ProtectedRoute><AppLayout><PhysiotherapyAggregator /></AppLayout></ProtectedRoute>} />
            <Route path="/physiotherapy/:moduleType/editor/:roomId" element={<ProtectedRoute><AppLayout><PhysiotherapyEditor /></AppLayout></ProtectedRoute>} />
            <Route path="/physiotherapy/:moduleType/control/:roomId" element={<ProtectedRoute><AppLayout><PhysiotherapyControl /></AppLayout></ProtectedRoute>} />
            <Route path="/physiotherapy/join" element={<PhysiotherapyJoin />} />
            {/* Biomedicine routes */}
            <Route path="/biomedicine" element={<ProtectedRoute><AppLayout><BiomedicineSimulations /></AppLayout></ProtectedRoute>} />
            <Route path="/biomedicine/aggregator" element={<ProtectedRoute><AppLayout><BiomedicineAggregator /></AppLayout></ProtectedRoute>} />
            <Route path="/biomedicine/:moduleType/editor/:roomId" element={<ProtectedRoute><AppLayout><BiomedicineEditor /></AppLayout></ProtectedRoute>} />
            <Route path="/biomedicine/:moduleType/control/:roomId" element={<ProtectedRoute><AppLayout><BiomedicineControl /></AppLayout></ProtectedRoute>} />
            <Route path="/biomedicine/join" element={<BiomedicineJoin />} />
            {/* Virtual Patients */}
            <Route
              path="/virtual-patients"
              element={
                <ProtectedRoute>
                  <AppLayout><VirtualPatients /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/virtual-patients/chat/:patientId"
              element={
                <ProtectedRoute>
                  <AppLayout><VirtualPatientChat /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/virtual-patients/analytics"
              element={
                <ProtectedRoute>
                  <AppLayout><VPAnalytics /></AppLayout>
                </ProtectedRoute>
              }
            />
            {/* Public Virtual Patient Room (student access via PIN) */}
            <Route path="/virtual-patients/room/:cvpId" element={<VirtualPatientRoom />} />
            <Route path="/virtual-patients/feedback/:cvpId" element={<VirtualPatientFeedback />} />
            {/* SCT Routes */}
            <Route
              path="/sct"
              element={
                <ProtectedRoute>
                  <AppLayout><SctExams /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sct/:id/edit"
              element={
                <ProtectedRoute>
                  <AppLayout><SctEditor /></AppLayout>
                </ProtectedRoute>
              }
            />
            {/* Public SCT routes */}
            <Route path="/sct/expert/:examId" element={<SctExpertPortal />} />
            <Route path="/sct/student/:examId" element={<SctStudentPortal />} />
            {/* KFE Routes */}
            <Route
              path="/kfe"
              element={
                <ProtectedRoute>
                  <AppLayout><KfeExams /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/kfe/:id/edit"
              element={
                <ProtectedRoute>
                  <AppLayout><KfeEditor /></AppLayout>
                </ProtectedRoute>
              }
            />
            {/* Public KFE route */}
            <Route path="/kfe/student/:examId" element={<KfeStudentPortal />} />
            {/* Mini-CEX/DOPS Routes */}
            <Route path="/clinical-observations" element={<ProtectedRoute><AppLayout><ClinicalObservations /></AppLayout></ProtectedRoute>} />
            <Route path="/clinical-observations/:id/edit" element={<ProtectedRoute><AppLayout><ClinicalObservationEditor /></AppLayout></ProtectedRoute>} />
            <Route path="/clinical-observations/eval/:obsId" element={<ClinicalObservationEval />} />
            {/* SJT Routes */}
            <Route path="/sjt" element={<ProtectedRoute><AppLayout><SjtExams /></AppLayout></ProtectedRoute>} />
            <Route path="/sjt/:id/edit" element={<ProtectedRoute><AppLayout><SjtEditor /></AppLayout></ProtectedRoute>} />
            <Route path="/sjt/student/:examId" element={<SjtStudentPortal />} />
            {/* Progress Test Routes */}
            <Route path="/progress-test" element={<ProtectedRoute><AppLayout><ProgressTests /></AppLayout></ProtectedRoute>} />
            <Route path="/progress-test/:id/edit" element={<ProtectedRoute><AppLayout><ProgressTestEditor /></AppLayout></ProtectedRoute>} />
            <Route path="/progress-test/student/:testId" element={<ProgressTestStudentPortal />} />
            {/* Mock Trial Routes */}
            <Route path="/mock-trials" element={<ProtectedRoute><AppLayout><MockTrials /></AppLayout></ProtectedRoute>} />
            <Route path="/mock-trials/:id/edit" element={<ProtectedRoute><AppLayout><MockTrialEditor /></AppLayout></ProtectedRoute>} />
            {/* Public Mock Trial routes — accessed via StudentAuth PIN */}
            <Route path="/mock-trial/portal/:accessCode" element={<MockTrialStudent />} />
            <Route path="/mock-trial/judge/:accessCode" element={<MockTrialJudge />} />
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
            <Route
              path="/competency-analysis"
              element={
                <ProtectedRoute>
                  <AppLayout><CompetencyAnalysis /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lms-integration"
              element={
                <ProtectedRoute>
                  <AppLayout><LmsIntegration /></AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/portfolio/:studentEmail"
              element={
                <ProtectedRoute>
                  <AppLayout><StudentPortfolio /></AppLayout>
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
