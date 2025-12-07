import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Repairs from "./pages/Repairs";
import Claims from "./pages/Claims";
import PaymentPortal from "./pages/PaymentPortal";
import AdminVehicles from "./pages/AdminVehicles";
import AdminReports from "./pages/AdminReports";
import AdminPayments from "./pages/AdminPayments";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/repairs" element={<Repairs />} />
          <Route path="/claims" element={<Claims />} />
          <Route path="/payments" element={<PaymentPortal />} />
          <Route path="/admin/vehicles" element={<AdminVehicles />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
