import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { z } from "zod";

const checkoutSchema = z.object({
  address: z.string().trim().min(10, "Address must be at least 10 characters").max(200, "Address too long"),
  city: z.string().trim().min(2, "City name too short").max(50, "City name too long"),
  state: z.string().trim().min(2, "State name too short").max(50, "State name too long"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  paymentMethod: z.enum(["cod", "online"]),
});

type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    seller_id: string;
  };
};

type CheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  totalAmount: number;
  onCheckoutComplete: () => void;
};

export const CheckoutDialog = ({
  open,
  onOpenChange,
  cartItems,
  totalAmount,
  onCheckoutComplete,
}: CheckoutDialogProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "",
    pincode: "",
    paymentMethod: "cod",
  });

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate form data
    try {
      checkoutSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    try {
      // Group items by seller
      const itemsBySeller = cartItems.reduce((acc, item) => {
        const sellerId = item.products.seller_id;
        if (!acc[sellerId]) {
          acc[sellerId] = [];
        }
        acc[sellerId].push(item);
        return acc;
      }, {} as Record<string, CartItem[]>);

      // Create orders for each seller
      for (const [sellerId, items] of Object.entries(itemsBySeller)) {
        const orderTotal = items.reduce(
          (sum, item) => sum + item.products.price * item.quantity,
          0
        );

        // Create order
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert({
            customer_id: user.id,
            seller_id: sellerId,
            total_amount: orderTotal,
            status: "pending",
            payment_method: formData.paymentMethod,
            payment_status: formData.paymentMethod === "cod" ? "pending" : "paid",
            delivery_address: formData.address,
            delivery_city: formData.city,
            delivery_state: formData.state,
            delivery_pincode: formData.pincode,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = items.map((item) => ({
          order_id: orderData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.products.price,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) throw itemsError;

        // Update stock quantities and create retailer products
        for (const item of items) {
          const { data: product } = await supabase
            .from("products")
            .select("*")
            .eq("id", item.product_id)
            .single();

          if (product) {
            // Update wholesaler stock
            await supabase
              .from("products")
              .update({ stock_quantity: product.stock_quantity - item.quantity })
              .eq("id", item.product_id);

            // Create or update retailer's product
            const { data: existingRetailerProduct } = await supabase
              .from("products")
              .select("*")
              .eq("seller_id", user.id)
              .eq("name", product.name)
              .maybeSingle();

            if (existingRetailerProduct) {
              // Update existing product stock
              await supabase
                .from("products")
                .update({ 
                  stock_quantity: existingRetailerProduct.stock_quantity + item.quantity 
                })
                .eq("id", existingRetailerProduct.id);
            } else {
              // Create new product for retailer
              await supabase
                .from("products")
                .insert({
                  seller_id: user.id,
                  name: product.name,
                  description: product.description,
                  price: product.price * 1.2, // Add 20% markup
                  purchase_price: product.price,
                  stock_quantity: item.quantity,
                  category_id: product.category_id,
                  image_url: product.image_url,
                  mrp: product.mrp,
                  is_local: product.is_local,
                });
            }
          }
        }
      }

      // Clear cart
      const { error: clearError } = await supabase
        .from("cart")
        .delete()
        .eq("user_id", user.id);

      if (clearError) throw clearError;

      toast.success("Orders placed successfully!");
      onOpenChange(false);
      onCheckoutComplete();
      setFormData({
        address: "",
        city: "",
        state: "",
        pincode: "",
        paymentMethod: "cod",
      });
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to complete checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>
            Complete your order by providing delivery details
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleCheckout} className="space-y-4">
          <div>
            <Label htmlFor="address">Delivery Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value.slice(0, 6) })}
              maxLength={6}
              required
            />
          </div>

          <div>
            <Label>Payment Method</Label>
            <RadioGroup
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cod" id="cod" />
                <Label htmlFor="cod" className="cursor-pointer">Cash on Delivery</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="online" />
                <Label htmlFor="online" className="cursor-pointer">Online Payment</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between text-lg font-bold mb-4">
              <span>Total Amount:</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : "Place Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
