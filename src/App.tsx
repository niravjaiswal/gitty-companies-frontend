import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SessionPage from "./pages/SessionPage";
import Dashboard from "./pages/Dashboard";
import CreateAssessment from "./pages/CreateAssessment";
import SendAssessment from "./pages/SendAssessment";
import AssessmentResults from "./pages/AssessmentResults";
import CandidateResult from "./pages/CandidateResult";
import AssessmentEditor from "./pages/AssessmentEditor";
import AssessmentGeneration from "./pages/AssessmentGeneration";
import CandidatesPage from "./pages/CandidatesPage";
import TalentDiscovery from "./pages/TalentDiscovery";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/candidates" element={<CandidatesPage />} />

            {/* Candidate routes (protected) */}
            <Route
              path="/candidate"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/session/:id"
              element={
                <ProtectedRoute>
                  <SessionPage />
                </ProtectedRoute>
              }
            />

            {/* Company dashboard routes (protected) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/create"
              element={
                <ProtectedRoute>
                  <CreateAssessment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/send/:id"
              element={
                <ProtectedRoute>
                  <SendAssessment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/assessments/:id/editor"
              element={
                <ProtectedRoute>
                  <AssessmentEditor />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/assessments/:id/generation"
              element={
                <ProtectedRoute>
                  <AssessmentGeneration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/assessments/:assessmentId/results"
              element={
                <ProtectedRoute>
                  <AssessmentResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/results/:sessionId"
              element={
                <ProtectedRoute>
                  <CandidateResult />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/talent"
              element={
                <ProtectedRoute>
                  <TalentDiscovery />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
