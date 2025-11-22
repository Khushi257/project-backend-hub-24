import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Package, Truck, CheckCircle, PackageX } from "lucide-react";
import { ReturnProductDialog } from "@/components/customer/ReturnProductDialog";

interface Order {
  id: string;
  seller_id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_status: string;
  estimated_delivery_date: string;
  delivery_address: string;
  order_items: {
    product_id: string;
    quantity: number;
    price: number;
    products: {
      name: string;
      image_url: string;
    };
  }[];
}

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [returnDialog, setReturnDialog] = useState<{
    open: boolean;
    orderItem: any;
  }>({
    open: false,
    orderItem: null,
  });

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            product_id,
            quantity,
            price,
            products (name, image_url)
          )
        `)
        .eq("customer_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Package className="h-5 w-5" />;
      case "shipped":
        return <Truck className="h-5 w-5" />;
      case "delivered":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "confirmed":
        return "default";
      case "shipped":
        return "default";
      case "delivered":
        return "default";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl font-semibold mb-2">No orders yet</p>
            <p className="text-muted-foreground mb-4">Start shopping to see your orders here</p>
            <Button onClick={() => navigate("/")}>Continue Shopping</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(order.status)}
                      <Badge variant={getStatusColor(order.status) as any}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Order ID: {order.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Placed on: {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    {order.estimated_delivery_date && (
                      <p className="text-sm text-muted-foreground">
                        Est. Delivery: {new Date(order.estimated_delivery_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">₹{order.total_amount}</p>
                    <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                      {order.payment_status}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-2">Items:</p>
                  <div className="space-y-2">
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <img
                          src={item.products?.image_url || "/placeholder.svg"}
                          alt={item.products?.name}
                          className="h-12 w-12 rounded object-cover"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.products?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity} × ₹{item.price}
                          </p>
                        </div>
                        {order.status === "delivered" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setReturnDialog({
                                open: true,
                                orderItem: {
                                  order_id: order.id,
                                  product_id: item.product_id,
                                  quantity: item.quantity,
                                  product_name: item.products?.name,
                                  seller_id: order.seller_id,
                                },
                              })
                            }
                          >
                            <PackageX className="h-4 w-4 mr-2" />
                            Return
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Delivery Address: {order.delivery_address}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {returnDialog.orderItem && (
        <ReturnProductDialog
          open={returnDialog.open}
          onOpenChange={(open) => setReturnDialog({ open, orderItem: null })}
          orderItem={returnDialog.orderItem}
          onReturnSubmitted={fetchOrders}
        />
      )}
    </div>
  );
};

export default Orders;
