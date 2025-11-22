import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CheckoutDialog } from "./RetailerCheckout";

type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    stock_quantity: number;
    seller_id: string;
  };
};

type RetailerCartProps = {
  userId: string;
  cartCount: number;
  onCartUpdate: () => void;
};

export const RetailerCart = ({ userId, cartCount, onCartUpdate }: RetailerCartProps) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchCartItems();
    }
  }, [userId, cartCount]);

  const fetchCartItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cart")
        .select(`
          *,
          products (
            id,
            name,
            price,
            image_url,
            stock_quantity,
            seller_id
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;
      setCartItems(data || []);
    } catch (error: any) {
      console.error("Error fetching cart:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number, price: number) => {
    if (newQuantity < 1) return;

    // Calculate minimum based on price
    let minQuantity = 1;
    if (price < 100) {
      minQuantity = 100;
    } else if (price < 800) {
      minQuantity = 50;
    } else if (price < 1200) {
      minQuantity = 20;
    } else if (price < 2000) {
      minQuantity = 10;
    } else if (price < 7000) {
      minQuantity = 5;
    }

    if (newQuantity < minQuantity) {
      toast.error(`Minimum order quantity for this product is ${minQuantity}`);
      return;
    }

    try {
      const { error } = await supabase
        .from("cart")
        .update({ quantity: newQuantity })
        .eq("id", itemId);

      if (error) throw error;
      fetchCartItems();
      onCartUpdate();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("cart")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      fetchCartItems();
      onCartUpdate();
      toast.success("Item removed from cart");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + (item.products.price * item.quantity),
    0
  );

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Wholesale Cart</SheetTitle>
          </SheetHeader>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 border-b pb-4">
                    <img
                      src={item.products.image_url || "/placeholder.svg"}
                      alt={item.products.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.products.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.products.price}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity - 1, item.products.price)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => updateQuantity(item.id, item.quantity + 1, item.products.price)}
                          disabled={item.quantity >= item.products.stock_quantity}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 ml-auto"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setCheckoutOpen(true)}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cartItems={cartItems}
        totalAmount={totalAmount}
        onCheckoutComplete={() => {
          fetchCartItems();
          onCartUpdate();
        }}
      />
    </>
  );
};
