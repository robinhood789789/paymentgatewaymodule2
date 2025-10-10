import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useCSRF } from "@/hooks/useCSRF";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Payments from "./pages/Payments";
import Refunds from "./pages/Refunds";
import Customers from "./pages/Customers";
import WebhookEvents from "./pages/WebhookEvents";
import Settlements from "./pages/Settlements";
import Links from "./pages/Links";
import Reports from "./pages/Reports";
import AdminUsers from "./pages/AdminUsers";
import Status from "./pages/Status";
import NotFound from "./pages/NotFound";
import PayLink from "./pages/PayLink";
import PayLinkSuccess from "./pages/PayLinkSuccess";
import Docs from "./pages/Docs";
import GoLive from "./pages/GoLive";
import DepositList from "./pages/DepositList";
import WithdrawalList from "./pages/WithdrawalList";

const queryClient = new QueryClient();

function AppContent() {
  useCSRF(); // Initialize CSRF protection

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth/sign-in" element={<SignIn />} />
      <Route path="/auth/sign-up" element={<SignUp />} />
      <Route path="/auth" element={<Navigate to="/auth/sign-in" replace />} />
      
      <Route path="/status" element={<Status />} />
      
      <Route path="/pay/:slug" element={<PayLink />} />
      <Route path="/pay/:slug/success" element={<PayLinkSuccess />} />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <Payments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/refunds"
        element={
          <ProtectedRoute>
            <Refunds />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Customers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/webhook-events"
        element={
          <ProtectedRoute>
            <WebhookEvents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settlements"
        element={
          <ProtectedRoute>
            <Settlements />
          </ProtectedRoute>
        }
      />
      <Route
        path="/links"
        element={
          <ProtectedRoute>
            <Links />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/docs"
        element={
          <ProtectedRoute>
            <Docs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/go-live"
        element={
          <ProtectedRoute>
            <GoLive />
          </ProtectedRoute>
        }
      />
      <Route
        path="/deposit-list"
        element={
          <ProtectedRoute>
            <DepositList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/withdrawal-list"
        element={
          <ProtectedRoute>
            <WithdrawalList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute requireAdmin>
            <AdminUsers />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
