
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ProtectedRoute from "./components/auth/ProtectedRoute";

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

const App = () => {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
          <Route path="/users" element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="/users/new" element={
            <ProtectedRoute>
              <UserCreate />
            </ProtectedRoute>
          } />
          <Route path="/users/:id" element={
            <ProtectedRoute>
              <UserEdit />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          
          {/* Other Routes */}
          <Route path="/logout" element={<Navigate to="/auth" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </TooltipProvider>
  );
};

export default App;
