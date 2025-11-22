import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Laptop, Sparkles, Shirt, Dumbbell, Home as HomeIcon } from "lucide-react";

const categories = [
  { name: "Home", icon: HomeIcon, color: "bg-blue-500" },
  { name: "Electronics", icon: Laptop, color: "bg-purple-500" },
  { name: "Beauty", icon: Sparkles, color: "bg-pink-500" },
  { name: "Fashion", icon: Shirt, color: "bg-green-500" },
  { name: "Sports", icon: Dumbbell, color: "bg-orange-500" },
];

const Home = () => {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();

  // Redirect non-customers to appropriate pages
  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      // Not logged in - redirect to auth
      navigate("/auth");
      return;
    }
    
    // Logged in - check roles
    if (roles.includes("retailer") || roles.includes("wholesaler")) {
      // Retailers and wholesalers go to dashboard
      navigate("/dashboard");
    } else if (!roles.includes("customer")) {
      // No customer role - redirect to auth
      navigate("/auth");
    }
    // If customer role exists, stay on this page
  }, [user, roles, loading, navigate]);

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/dashboard?category=${categoryName.toLowerCase()}`);
  };

  const handleGetStarted = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Live Mart</h1>
          </div>
          {user && (
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          )}
          {!user && (
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold mb-4">Welcome to Live Mart</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Your one-stop shop for everything you need
          </p>
          <Button size="lg" onClick={handleGetStarted}>
            {user ? "Start Shopping" : "Get Started"}
          </Button>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">Shop by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Card
                key={category.name}
                className="p-6 cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={() => handleCategoryClick(category.name)}
              >
                <div className="flex flex-col items-center gap-4">
                  <div className={`${category.color} p-4 rounded-full`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="font-semibold text-center">{category.name}</h4>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Discounts Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Hot Deals & Discounts</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-gradient-to-br from-red-500/10 to-orange-500/10">
              <h4 className="text-2xl font-bold mb-2">Up to 50% OFF</h4>
              <p className="text-muted-foreground mb-4">On Electronics</p>
              <Button onClick={() => handleCategoryClick("Electronics")}>Shop Now</Button>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <h4 className="text-2xl font-bold mb-2">Fashion Sale</h4>
              <p className="text-muted-foreground mb-4">New Arrivals</p>
              <Button onClick={() => handleCategoryClick("Fashion")}>Explore</Button>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-pink-500/10 to-purple-500/10">
              <h4 className="text-2xl font-bold mb-2">Beauty Essentials</h4>
              <p className="text-muted-foreground mb-4">Premium Products</p>
              <Button onClick={() => handleCategoryClick("Beauty")}>Discover</Button>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
