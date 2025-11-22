import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

type Order = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_status: string;
  delivery_address: string;
  profiles: { full_name: string } | null;
  order_items: {
    quantity: number;
    price: number;
    products: { name: string; id: string };
  }[];
  has_return?: boolean;
};

const ORDER_STATUSES = [
  "pending",
  "order placed",
  "shipped",
  "on the way",
  "out for delivery",
  "delivered",
  "cancelled"
];

export const RetailerOrderManagement = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(
            quantity,
            price,
            products(name, id)
          )
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false});

      if (error) throw error;
      
      // Fetch customer names and check for returns
      const ordersWithProfiles = await Promise.all(
        (data || []).map(async (order) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", order.customer_id)
            .single();
          
          // Check if any product in this order has a return
          const productIds = order.order_items.map((item: any) => item.products.id);
          const { data: returns } = await supabase
            .from("returns")
            .select("id")
            .eq("order_id", order.id)
            .in("product_id", productIds);
          
          return {
            ...order,
            profiles: profile || { full_name: "Unknown" },
            has_return: returns && returns.length > 0
          };
        })
      );
      
      setOrders(ordersWithProfiles as any);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      
      toast.success("Order status updated");
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "delivered":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      case "shipped":
      case "on the way":
      case "out for delivery":
        return "bg-blue-500";
      default:
        return "bg-yellow-500";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Manage Customer Orders</h3>
      {orders.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No orders yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">
                      Order #{order.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(order.created_at), "PPpp")}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {order.has_return && (
                      <Badge variant="destructive">Product Returned</Badge>
                    )}
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Customer: {order.profiles?.full_name || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground">Address: {order.delivery_address}</p>
                  <p className="text-sm font-medium">Total: ₹{order.total_amount.toFixed(2)}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Items:</p>
                  {order.order_items.map((item, idx) => (
                    <p key={idx} className="text-sm text-muted-foreground">
                      {item.products.name} × {item.quantity} @ ₹{item.price}
                    </p>
                  ))}
                </div>

                <div>
                  <label className="text-sm font-medium">Update Status:</label>
                  <Select
                    value={order.status}
                    onValueChange={(value) => updateOrderStatus(order.id, value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
