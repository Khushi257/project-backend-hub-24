import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  phone: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
  paymentMethod: z.enum(["cod", "upi", "card"]),
});

interface CartItem {
  id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    price: number;
    seller_id: string;
  };
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  total: number;
  userId: string;
  onSuccess: () => void;
}

const CheckoutDialog = ({
  open,
  onOpenChange,
  cartItems,
  total,
  userId,
  onSuccess,
}: CheckoutDialogProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    paymentMethod: "cod",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleContinue = () => {
    try {
      checkoutSchema.parse(formData);
      setStep(2);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    }
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      // Validate form data
      checkoutSchema.parse(formData);
      
      // Check stock availability for all items
      for (const item of cartItems) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.products.id)
          .single();
        
        if (!product || product.stock_quantity < item.quantity) {
          toast.error(`Insufficient stock for ${item.products.name}. Available: ${product?.stock_quantity || 0}`);
          setLoading(false);
          return;
        }
      }
      
      // Group items by seller
      const itemsBySeller = cartItems.reduce((acc, item) => {
        const sellerId = item.products.seller_id;
        if (!acc[sellerId]) {
          acc[sellerId] = [];
        }
        acc[sellerId].push(item);
        return acc;
      }, {} as Record<string, CartItem[]>);

      // Create order for each seller
      for (const [sellerId, items] of Object.entries(itemsBySeller)) {
        const orderTotal = items.reduce(
          (sum, item) => sum + item.products.price * item.quantity,
          0
        );

        const estimatedDeliveryDate = new Date();
        estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);

        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            customer_id: userId,
            seller_id: sellerId,
            total_amount: orderTotal,
            delivery_address: formData.address,
            delivery_city: formData.city,
            delivery_state: formData.state,
            delivery_pincode: formData.pincode,
            payment_method: formData.paymentMethod,
            payment_status: formData.paymentMethod === "cod" ? "pending" : "paid",
            status: "pending",
            estimated_delivery_date: estimatedDeliveryDate.toISOString(),
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = items.map((item) => ({
          order_id: order.id,
          product_id: item.products.id,
          quantity: item.quantity,
          price: item.products.price,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      // Clear cart
      const { error: cartError } = await supabase
        .from("cart")
        .delete()
        .eq("user_id", userId);

      if (cartError) throw cartError;

      toast.success("Order placed successfully!");
      onSuccess();
      onOpenChange(false);
      setStep(1);
      navigate("/orders");
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error("Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Delivery Address" : "Payment Method"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Street address"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  maxLength={6}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  maxLength={10}
                />
              </div>
            </div>
            <Button onClick={handleContinue} className="w-full">
              Continue to Payment
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup
              value={formData.paymentMethod}
              onValueChange={(value) =>
                setFormData({ ...formData, paymentMethod: value })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cod" id="cod" />
                <Label htmlFor="cod">Cash on Delivery</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upi" id="upi" />
                <Label htmlFor="upi">UPI</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card">Credit/Debit Card</Label>
              </div>
            </RadioGroup>

            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span>Total Amount:</span>
                <span className="font-bold">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button onClick={handlePlaceOrder} disabled={loading} className="flex-1">
                {loading ? "Processing..." : "Place Order"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
