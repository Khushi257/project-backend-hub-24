import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import CustomerDashboard from "@/components/dashboards/CustomerDashboard";
import RetailerDashboard from "@/components/dashboards/RetailerDashboard";
import WholesalerDashboard from "@/components/dashboards/WholesalerDashboard";

const Index = () => {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/");
      } else {
        // If already on dashboard, stay here
        // Otherwise this component should only be accessed when logged in
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show appropriate dashboard based on user role
  if (roles.includes("customer")) {
    return <CustomerDashboard />;
  }

  if (roles.includes("retailer")) {
    return <RetailerDashboard />;
  }

  if (roles.includes("wholesaler")) {
    return <WholesalerDashboard />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">No role assigned. Please contact support.</p>
    </div>
  );
};

export default Index;
