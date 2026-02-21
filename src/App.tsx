import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SubscriptionProvider } from "@/hooks/use-subscription";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Questions from "./pages/Questions";
import Composer from "./pages/Composer";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SubscriptionProvider>
        <BrowserRouter>
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
            <Route path="/docs" element={<Documentation />} />
            <Route path="/contato" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SubscriptionProvider>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
