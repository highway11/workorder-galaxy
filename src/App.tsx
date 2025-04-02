import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { GroupProvider } from "./contexts/GroupContext";

// Pages
import Dashboard from "./pages/Index";
import WorkOrders from "./pages/WorkOrders";
import WorkOrderDetail from "./components/workorders/WorkOrderDetail";
import Locations from "./pages/Locations";
import Users from "./pages/Users";
import UserEdit from "./pages/UserEdit";
import UserCreate from "./pages/UserCreate";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { useAuth } from "./contexts/AuthContext";

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { profile, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (profile?.role !== 'admin') {
    return <Navigate to="/" />;
  }
  
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

const App = () => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GroupProvider>
        <AnimatePresence mode="wait">
          <Routes>
            {/* Public Routes */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/workorders" element={
              <ProtectedRoute>
                <WorkOrders />
              </ProtectedRoute>
            } />
            <Route path="/workorders/:id" element={
              <ProtectedRoute>
                <WorkOrderDetail />
              </ProtectedRoute>
            } />
            <Route path="/locations" element={
              <ProtectedRoute>
                <Locations />
              </ProtectedRoute>
            } />
            
            {/* Admin-only Routes */}
            <Route path="/users" element={
              <AdminProtectedRoute>
                <Users />
              </AdminProtectedRoute>
            } />
            <Route path="/users/new" element={
              <AdminProtectedRoute>
                <UserCreate />
              </AdminProtectedRoute>
            } />
            <Route path="/users/:id" element={
              <AdminProtectedRoute>
                <UserEdit />
              </AdminProtectedRoute>
            } />
            <Route path="/settings" element={
              <AdminProtectedRoute>
                <Settings />
              </AdminProtectedRoute>
            } />
            
            {/* Other Routes */}
            <Route path="/logout" element={<Navigate to="/auth" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AnimatePresence>
      </GroupProvider>
    </TooltipProvider>
  );
};

export default App;
