import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { TourProvider } from "@/contexts/TourContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TourOverlay } from "@/components/TourOverlay";
import ErrorBoundary from "@/components/ErrorBoundary";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

// Lazy load pages for code splitting with prefetch
const Index = lazy(() => import("./pages/Index"));
const Approvals = lazy(() => import("./pages/Approvals"));
const UserManagement = lazy(() => import("./pages/UserManagement"));

// Prefetch likely next pages
const prefetchPages = () => {
  // Prefetch main pages after initial load
  setTimeout(() => {
    import("./pages/Index");
    import("./pages/Approvals");
  }, 2000);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // garbage collection after 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Loading fallback for lazy-loaded routes
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Component to handle invite/recovery token redirects
const TokenRedirectHandler = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check URL hash for invite or recovery tokens
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      const accessToken = hashParams.get('access_token');
      
      // If this is an invite or recovery link, redirect to /auth with the hash preserved
      if ((type === 'invite' || type === 'recovery') && accessToken && location.pathname !== '/auth') {
        navigate('/auth' + hash, { replace: true });
      }
    }
  }, [navigate, location.pathname]);

  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  // Prefetch pages after app loads
  useEffect(() => {
    prefetchPages();
  }, []);

  return (
    <ErrorBoundary>
const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AuthProvider>
              <TourProvider>
                <TourOverlay />
                <TokenRedirectHandler>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/auth" element={<Auth />} />
                      <Route
                        path="/"
                        element={
                          <ProtectedRoute>
                            <Index />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/approvals"
                        element={
                          <ProtectedRoute>
                            <Approvals />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/users"
                        element={
                          <ProtectedRoute>
                            <UserManagement />
                          </ProtectedRoute>
                        }
                      />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </TokenRedirectHandler>
              </TourProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
