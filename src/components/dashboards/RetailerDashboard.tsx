import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, LogOut, Store, Edit, PackageMinus } from "lucide-react";
import { toast } from "sonner";
import { SetPriceDialog } from "@/components/retailer/SetPriceDialog";
import { RetailerOrderManagement } from "@/components/retailer/RetailerOrderManagement";
import { RemoveStockDialog } from "./RemoveStockDialog";

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  purchase_price?: number;
  stock_quantity: number;
  seller_id: string;
  category_id?: string;
  image_url?: string | null;
  categories: { name: string } | null;
  profiles?: { full_name: string } | null;
};

type Category = {
  id: string;
  name: string;
};

const RetailerDashboard = () => {
  const { signOut, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [wholesalerProducts, setWholesalerProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [wholesalerLoading, setWholesalerLoading] = useState(true);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedRetailProduct, setSelectedRetailProduct] = useState<Product | null>(null);
  const [buyQuantity, setBuyQuantity] = useState("1");
  const [removeStockDialog, setRemoveStockDialog] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });

  useEffect(() => {
    if (user) {
      fetchProducts();
      fetchWholesalerProducts();
      fetchCategories();
    }
  }, [user]);


  const fetchProducts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories(name)
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWholesalerProducts = async () => {
    if (!user) return;
    setWholesalerLoading(true);
    try {
      // Get wholesaler user IDs
      const { data: wholesalerRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "wholesaler");

      if (rolesError) throw rolesError;

      const wholesalerIds = (wholesalerRoles || []).map((r) => r.user_id);

      if (wholesalerIds.length === 0) {
        setWholesalerProducts([]);
        setWholesalerLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories(name)
        `)
        .in("seller_id", wholesalerIds)
        .order("created_at", { ascending: false});

      if (error) throw error;
      
      // Fetch profiles for wholesalers
      const productsWithProfiles = data || [];
      if (productsWithProfiles.length > 0) {
        const sellerIds = [...new Set(productsWithProfiles.map(p => p.seller_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", sellerIds);
        
        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        
        const enrichedProducts = productsWithProfiles.map(product => ({
          ...product,
          profiles: profilesMap.get(product.seller_id) || null
        }));
        
        setWholesalerProducts(enrichedProducts);
      } else {
        setWholesalerProducts([]);
      }
    } catch (error: any) {
      console.error("Error fetching wholesaler products:", error);
      toast.error(error.message);
    } finally {
      setWholesalerLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };


  const handleBuyFromWholesaler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct) return;

    try {
      const quantity = parseInt(buyQuantity);
      
      // Check if wholesaler has enough stock
      if (selectedProduct.stock_quantity < quantity) {
        toast.error("Insufficient stock available");
        return;
      }

      const wholesalePrice = selectedProduct.price;
      const totalAmount = quantity * wholesalePrice;

      // Update wholesaler stock first
      const { error: stockError } = await supabase
        .from("products")
        .update({ stock_quantity: selectedProduct.stock_quantity - quantity })
        .eq("id", selectedProduct.id);

      if (stockError) throw stockError;

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          seller_id: selectedProduct.seller_id,
          total_amount: totalAmount,
          status: "completed",
          payment_method: "cod",
          payment_status: "paid",
          delivery_address: "Retailer warehouse",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order item
      const { error: itemError } = await supabase
        .from("order_items")
        .insert({
          order_id: orderData.id,
          product_id: selectedProduct.id,
          quantity: quantity,
          price: wholesalePrice,
        });

      if (itemError) throw itemError;

      // Check if retailer already has this product
      const { data: existingProduct } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .eq("name", selectedProduct.name)
        .eq("category_id", selectedProduct.category_id)
        .maybeSingle();

      const retailPrice = wholesalePrice * 1.3;

      if (existingProduct) {
        // Update existing product quantity
        const { error: updateError } = await supabase
          .from("products")
          .update({ 
            stock_quantity: existingProduct.stock_quantity + quantity,
            price: retailPrice,
            purchase_price: wholesalePrice,
          })
          .eq("id", existingProduct.id);

        if (updateError) throw updateError;
      } else {
        // Create new product entry for retailer
        const { error: productError } = await supabase
          .from("products")
          .insert({
            seller_id: user.id,
            name: selectedProduct.name,
            description: selectedProduct.description,
            price: retailPrice,
            purchase_price: wholesalePrice,
            stock_quantity: quantity,
            category_id: selectedProduct.category_id,
            image_url: selectedProduct.image_url,
          });

        if (productError) throw productError;
      }

      toast.success("Order placed and inventory updated!");
      setBuyDialogOpen(false);
      setSelectedProduct(null);
      setBuyQuantity("1");
      fetchProducts();
      fetchWholesalerProducts();
    } catch (error: any) {
      console.error("Error buying from wholesaler:", error);
      toast.error(error.message);
    }
  };

  const handleUpdatePrice = async (productId: string, newMrp: number, newPrice: number) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ 
          mrp: newMrp,
          price: newPrice 
        })
        .eq("id", productId);

      if (error) throw error;

      toast.success("Price updated successfully!");
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Retailer Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{products.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {products.reduce((sum, p) => sum + p.stock_quantity, 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inventory Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ₹{products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Net Profit/Loss</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const totalRevenue = products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0);
                const totalCost = products.reduce((sum, p) => sum + ((p.purchase_price || 0) * p.stock_quantity), 0);
                const netProfit = totalRevenue - totalCost;
                return (
                  <>
                    <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{netProfit.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {netProfit >= 0 ? 'Profit' : 'Loss'}
                    </p>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">My Products</TabsTrigger>
            <TabsTrigger value="wholesaler">Wholesaler Products</TabsTrigger>
            <TabsTrigger value="orders">Manage Orders</TabsTrigger>
          </TabsList>
          
          <TabsContent value="products">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">My Retail Products</h2>
              <p className="text-sm text-muted-foreground">Products purchased from wholesalers for retail sale</p>
            </div>

            {/* My Products Grid */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading products...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => {
                  const purchasePrice = product.purchase_price || 0;
                  const profitPerUnit = product.price - purchasePrice;
                  const totalProfit = profitPerUnit * product.stock_quantity;
                  const profitMargin = purchasePrice > 0 ? (profitPerUnit / purchasePrice * 100) : 0;

                  return (
                    <Card key={product.id}>
                      <CardHeader>
                        <CardTitle className="line-clamp-1">{product.name}</CardTitle>
                        {product.categories && (
                          <CardDescription>{product.categories.name}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {product.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Purchase Price:</span>
                            <span className="font-medium">₹{purchasePrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Retail Price:</span>
                            <span className="font-bold">₹{product.price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Profit/Unit:</span>
                            <span className={`font-bold ${profitPerUnit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{profitPerUnit.toFixed(2)} ({profitMargin.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Stock:</span>
                            <span className="font-bold">{product.stock_quantity} units</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-sm font-medium">Total Profit:</span>
                            <span className={`font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₹{totalProfit.toFixed(2)}
                            </span>
                          </div>
                          {product.stock_quantity < 10 && (
                            <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded block text-center mt-2">
                              Low Stock Alert
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setSelectedRetailProduct(product);
                              setPriceDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Set Price
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setRemoveStockDialog({ open: true, product })}
                          >
                            <PackageMinus className="mr-2 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {!loading && products.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground mb-4">No products in inventory</p>
                <p className="text-sm text-muted-foreground">Purchase products from wholesalers to start selling</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="wholesaler">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Buy from Wholesalers</h2>
              <p className="text-muted-foreground">Purchase products in bulk to add to your retail inventory</p>
            </div>

            {/* Wholesaler Products Grid */}
            {wholesalerLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading wholesaler products...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wholesalerProducts.map((product) => (
                  <Card key={product.id}>
                    {product.image_url && (
                      <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{product.name}</CardTitle>
                      <CardDescription>
                        {product.categories?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {product.description}
                      </p>
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <p className="text-2xl font-bold">₹{product.price}</p>
                          <p className="text-sm text-muted-foreground">Available: {product.stock_quantity}</p>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => {
                          setSelectedProduct(product);
                          setBuyDialogOpen(true);
                        }}
                      >
                        Buy Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!wholesalerLoading && wholesalerProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground mb-4">No wholesaler products available</p>
                <p className="text-sm text-muted-foreground">Check back later for new inventory</p>
              </div>
            )}
          </TabsContent>


          <TabsContent value="orders">
            <RetailerOrderManagement />
          </TabsContent>
        </Tabs>

        {/* Buy Dialog */}
        <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buy from Wholesaler</DialogTitle>
              <DialogDescription>
                Purchase {selectedProduct?.name} to add to your inventory
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleBuyFromWholesaler} className="space-y-4">
              <div>
                <Label>Product</Label>
                <p className="text-sm font-medium">{selectedProduct?.name}</p>
              </div>
              <div>
                <Label>Wholesale Price</Label>
                <p className="text-sm font-medium">₹{selectedProduct?.price}</p>
              </div>
              <div>
                <Label>Available Stock</Label>
                <p className="text-sm font-medium">{selectedProduct?.stock_quantity} units</p>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity to Purchase</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedProduct?.stock_quantity}
                  value={buyQuantity}
                  onChange={(e) => setBuyQuantity(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Total Amount</Label>
                <p className="text-lg font-bold">
                  ₹{((selectedProduct?.price || 0) * parseInt(buyQuantity || "1")).toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setBuyDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Confirm Purchase
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Set Price Dialog */}
        {selectedRetailProduct && (
          <SetPriceDialog
            product={selectedRetailProduct}
            open={priceDialogOpen}
            onOpenChange={setPriceDialogOpen}
            onUpdatePrice={handleUpdatePrice}
          />
        )}

        {/* Remove Stock Dialog */}
        {removeStockDialog.product && (
          <RemoveStockDialog
            open={removeStockDialog.open}
            onOpenChange={(open) => setRemoveStockDialog({ open, product: null })}
            product={removeStockDialog.product}
            onStockRemoved={fetchProducts}
          />
        )}
      </main>
    </div>
  );
};

export default RetailerDashboard;
