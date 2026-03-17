import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PublicFicha from "./pages/PublicFicha";
import NotFound from "./pages/NotFound";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

const AuthLoadingScreen = () => {
  const totalTiles = 12;
  const [step, setStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => setReducedMotion(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const timeout = window.setTimeout(() => {
      if (step < totalTiles) {
        setStep(step + 1);
        return;
      }

      if (step === totalTiles) {
        setStep(totalTiles + 1);
        return;
      }

      setStep(0);
    }, step < totalTiles ? 70 : step === totalTiles ? 180 : 260);

    return () => window.clearTimeout(timeout);
  }, [reducedMotion, step]);

  const filledTiles = reducedMotion ? Math.floor(totalTiles * 0.66) : Math.min(step, totalTiles);
  const showCheck = !reducedMotion && step > totalTiles;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite" aria-label="Cargando sesión">
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg border border-border/50 bg-card/50">
          {Array.from({ length: totalTiles }).map((_, index) => {
            const isFilled = index < filledTiles;

            return (
              <div
                key={index}
                className={`h-2.5 w-2.5 rounded-[3px] transition-all duration-200 ease-out ${
                  isFilled
                    ? "bg-muted-foreground/55 opacity-100 translate-y-0"
                    : "bg-muted/70 opacity-35 translate-y-1"
                } ${showCheck && index === totalTiles - 1 ? "scale-105" : "scale-100"}`}
              >
                {showCheck && index === totalTiles - 1 && (
                  <span className="flex h-full w-full items-center justify-center rounded-[3px] bg-primary text-primary-foreground animate-pulse">
                    <Check className="h-2 w-2" strokeWidth={3} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <span className="text-[11px] text-muted-foreground/75">Cargando…</span>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
            <Route path="/f/:slug" element={<PublicFicha />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
