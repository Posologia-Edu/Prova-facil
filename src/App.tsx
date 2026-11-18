import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SubscriptionProvider } from "@/hooks/use-subscription";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import { CookieBanner } from "@/components/CookieBanner";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";

const SystemRoutes = lazy(() => import("./SystemRoutes"));
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

            <Route path="*" element={
              <Suspense fallback={
                <div className="grid min-h-screen place-items-center" aria-busy="true">
                  <span className="font-heading text-2xl">ProvaFácil</span>
                </div>
              }>
                <SystemRoutes />
              </Suspense>
            } />
          </Routes>
        </BrowserRouter>
      </SubscriptionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
