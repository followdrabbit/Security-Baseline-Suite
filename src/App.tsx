import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { I18nProvider } from "@/contexts/I18nContext";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import NewProject from "@/pages/NewProject";
import SourceLibrary from "@/pages/SourceLibrary";
import RulesTemplates from "@/pages/RulesTemplates";
import AIWorkspace from "@/pages/AIWorkspace";
import BaselineEditor from "@/pages/BaselineEditor";
import Traceability from "@/pages/Traceability";
import HistoryPage from "@/pages/HistoryPage";
import ExportImport from "@/pages/ExportImport";
import Settings from "@/pages/Settings";
import AIIntegrations from "@/pages/AIIntegrations";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/new-project" element={<NewProject />} />
                <Route path="/sources" element={<SourceLibrary />} />
                <Route path="/rules" element={<RulesTemplates />} />
                <Route path="/workspace" element={<AIWorkspace />} />
                <Route path="/editor" element={<BaselineEditor />} />
                <Route path="/traceability" element={<Traceability />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/export-import" element={<ExportImport />} />
                <Route path="/ai-integrations" element={<AIIntegrations />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
