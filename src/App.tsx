import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import BottomNav from "./components/layout/BottomNav";
import SplashScreen from "./components/layout/SplashScreen";
import Index from "./pages/Index";
import Access from "./pages/Access";
import UserLogin from "./pages/UserLogin";
import UserSignup from "./pages/UserSignup";
import VendorLogin from "./pages/VendorLogin";
import VendorDashboard from "./pages/VendorDashboard";
import VendorSetup from "./pages/VendorSetup";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Products from "./pages/Products";
import Businesses from "./pages/Businesses";
import BusinessDetail from "./pages/BusinessDetail";
import Messages from "./pages/Messages";
import Cart from "./pages/Cart";
import Profile from "./pages/Profile";
import ProfileEdit from "./pages/ProfileEdit";
import Orders from "./pages/Orders";
import OrderConfirmation from "./pages/OrderConfirmation";
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Ratings from "./pages/Ratings";
import VendorReviews from "./pages/VendorReviews";
import { useAuth } from "./context/AuthContext";

const queryClient = new QueryClient();

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
        {splashDone && (
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isVendorShell = location.pathname.startsWith("/vendor") || location.pathname.startsWith("/login/vendor");
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {!isAdmin && !isVendorShell && <Navbar />}
      <main>
        <Routes>
                  <Route path="/" element={<LoggedOutRoute><Access /></LoggedOutRoute>} />
                  <Route path="/home" element={<Index />} />
                  <Route path="/login/user" element={<LoggedOutRoute><UserLogin /></LoggedOutRoute>} />
                  <Route path="/signup/user" element={<LoggedOutRoute><UserSignup /></LoggedOutRoute>} />
                  <Route path="/login/vendor" element={<LoggedOutRoute><VendorLogin /></LoggedOutRoute>} />
                  <Route path="/vendor" element={<ProtectedRoute requireRole="vendor"><VendorDashboard /></ProtectedRoute>} />
                  <Route path="/vendor/setup" element={<ProtectedRoute><VendorSetup /></ProtectedRoute>} />
                  {/* Admin */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/businesses" element={<Businesses />} />
                  <Route path="/vendors" element={<Businesses />} />
                  <Route path="/business/:id" element={<BusinessDetail />} />
                  <Route path="/business/:id/reviews" element={<VendorReviews />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/profile/edit" element={<ProfileEdit />} />
                  <Route path="/ratings" element={<ProtectedRoute><Ratings /></ProtectedRoute>} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/order/confirmation" element={<OrderConfirmation />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdmin && !isVendorShell && <BottomNav />}
    </div>
  );
}

function LoggedOutRoute({ children }: { children: JSX.Element }) {
  const { session, loading, profile } = useAuth();
  if (loading) return null;
  if (session) {
    const role = (profile?.role || '').toLowerCase();
    if (role === 'vendor') return <Navigate to="/vendor" replace />;
    return <Navigate to="/home" replace />;
  }
  return children;
}

export default App;
