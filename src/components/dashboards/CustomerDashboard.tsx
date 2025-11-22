import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LogOut, Package, Heart, Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { ProductFilters } from "@/components/customer/ProductFilters";
import { CartSheet } from "@/components/customer/CartSheet";
import { ProductCard } from "@/components/customer/ProductCard";
import { CategoryFilter } from "@/components/customer/CategoryFilter";
import { UserProfileMenu } from "@/components/customer/UserProfileMenu";
import { useNavigate, useSearchParams } from "react-router-dom";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  mrp: number | null;
  discount_percentage: number | null;
  stock_quantity: number;
  image_url: string | null;
  is_local: boolean | null;
  category_id: string | null;
  categories: { name: string } | null;
  seller_id: string;
  seller_city?: string | null;
};

type Category = {
  id: string;
  name: string;
  count: number;
};

const CustomerDashboard = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false);
  const [userCity, setUserCity] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserCity();
      fetchProducts();
      fetchCategories();
      fetchCartCount();
    }
  }, [user]);

  const fetchUserCity = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("city")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      setUserCity(data?.city || null);
    } catch (error: any) {
      console.error("Error fetching user city:", error);
    }
  };

  // Handle URL category parameter
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam && categories.length > 0) {
      const category = categories.find(c => c.name.toLowerCase() === categoryParam.toLowerCase());
      if (category) {
        setSelectedCategories([category.id]);
        setSelectedCategoryName(category.name);
      }
    }
  }, [searchParams, categories]);

  const fetchProducts = async () => {
    try {
      // Get retailer user IDs
      const { data: retailerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "retailer");

      if (rolesError) throw rolesError;

      const retailerIds = retailerRoles.map((r) => r.user_id);

      if (retailerIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories(name)
        `)
        .in("seller_id", retailerIds)
        .gt("stock_quantity", 0)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch retailer cities
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, city")
        .in("id", retailerIds);
      
      const cityMap = new Map(profilesData?.map(p => [p.id, p.city]) || []);
      
      const enrichedProducts = (data || []).map(product => {
        const sellerCity = cityMap.get(product.seller_id) || null;
        return {
          ...product,
          seller_city: sellerCity,
          is_local: userCity && sellerCity ? sellerCity.toLowerCase() === userCity.toLowerCase() : false
        };
      });
      
      setProducts(enrichedProducts);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data: categoryData, error } = await supabase
        .from("categories")
        .select("id, name");

      if (error) throw error;

      // Count products per category
      const categoriesWithCount = await Promise.all(
        (categoryData || []).map(async (cat) => {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("category_id", cat.id)
            .gt("stock_quantity", 0);

          return { ...cat, count: count || 0 };
        })
      );

      setCategories(categoriesWithCount.filter((c) => c.count > 0));
    } catch (error: any) {
      console.error(error);
    }
  };

  const fetchCartCount = async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from("cart")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;
      setCartCount(count || 0);
    } catch (error: any) {
      console.error(error);
    }
  };

  const addToCart = async (productId: string) => {
    if (!user) return;
    
    try {
      const { data: existingItem } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existingItem) {
        const { error } = await supabase
          .from("cart")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart")
          .insert({ user_id: user.id, product_id: productId, quantity: 1 });

        if (error) throw error;
      }

      toast.success("Added to cart!");
      fetchCartCount();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from("wishlist")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("wishlist")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
        toast.success("Removed from wishlist");
      } else {
        const { error } = await supabase
          .from("wishlist")
          .insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
        toast.success("Added to wishlist");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleTopCategorySelect = (categoryName: string) => {
    setSelectedCategoryName(categoryName);
    const category = categories.find(c => c.name === categoryName);
    if (category) {
      setSelectedCategories([category.id]);
      setSearchParams({ category: categoryName.toLowerCase() });
    } else {
      setSelectedCategories([]);
      setSearchParams({});
    }
  };

  const maxPrice = Math.max(...products.map((p) => p.price), 50000);

  // Initialize price range to full range when products load
  useEffect(() => {
    if (products.length > 0) {
      setPriceRange([0, maxPrice]);
    }
  }, [products, maxPrice]);

  const filteredProducts = products
    .filter((product) => {
      // Search filter
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        selectedCategories.length === 0 ||
        (product.category_id && selectedCategories.includes(product.category_id));

      // Price filter
      const matchesPrice =
        product.price >= priceRange[0] && product.price <= priceRange[1];

      // Fast delivery filter
      const matchesFastDelivery = !fastDeliveryOnly || 
        (userCity && product.seller_city?.toLowerCase() === userCity.toLowerCase());

      return matchesSearch && matchesCategory && matchesPrice && matchesFastDelivery;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "name":
          return a.name.localeCompare(b.name);
        case "newest":
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-background">
      {/* Welcome Banner */}
      <div className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to Live Mart</h1>
          <p className="text-lg opacity-90">Discover amazing products from local retailers</p>
        </div>
      </div>

      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <ShoppingBag className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Live MART</h1>
          </div>
            <div className="flex items-center gap-3">
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <UserProfileMenu />
              <Button variant="ghost" size="icon" onClick={() => navigate("/wishlist")}>
                <Heart className="h-5 w-5" />
              </Button>
              {user && (
                <CartSheet userId={user.id} cartCount={cartCount} onCartUpdate={fetchCartCount} />
              )}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <CategoryFilter 
              onCategorySelect={handleTopCategorySelect} 
              selectedCategory={selectedCategoryName}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <ProductFilters
            categories={categories}
            selectedCategories={selectedCategories}
            onCategoryChange={handleCategoryToggle}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            maxPrice={maxPrice}
            fastDeliveryOnly={fastDeliveryOnly}
            onFastDeliveryChange={setFastDeliveryOnly}
            userCity={userCity}
          />

          {/* Products Section */}
          <div className="flex-1">
            {/* Sort and Results Count */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredProducts.length} of {products.length} products
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="name">Name: A to Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const isFastDelivery = userCity && product.seller_city?.toLowerCase() === userCity.toLowerCase();
                  return (
                    <ProductCard
                      key={product.id}
                      product={{
                        ...product,
                        is_local: isFastDelivery || product.is_local
                      }}
                      onAddToCart={addToCart}
                      onToggleWishlist={toggleWishlist}
                    />
                  );
                })}
              </div>
            )}

            {!loading && filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground">No products found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your filters or search query
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;
