import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { Toaster } from "sonner";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import RunAgent from "./pages/RunAgent";
import Leads from "./pages/Leads";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/SettingsPage";
import PageNotFound from "./lib/PageNotFound";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC]">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-200 animate-float mb-6">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <h2 className="text-2xl font-outfit font-bold text-slate-800 tracking-tight">LeadPilot</h2>
          <div className="mt-4 flex gap-1">
             <motion.div 
               animate={{ scale: [1, 1.5, 1] }} 
               transition={{ repeat: Infinity, duration: 1, delay: 0 }}
               className="w-1.5 h-1.5 rounded-full bg-blue-600" 
             />
             <motion.div 
               animate={{ scale: [1, 1.5, 1] }} 
               transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
               className="w-1.5 h-1.5 rounded-full bg-blue-600" 
             />
             <motion.div 
               animate={{ scale: [1, 1.5, 1] }} 
               transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
               className="w-1.5 h-1.5 rounded-full bg-blue-600" 
             />
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="run" element={<RunAgent />} />
        <Route path="leads" element={<Leads />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors expand={false} />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
