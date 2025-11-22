import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";

type AddStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    stock_quantity: number;
  };
  onStockAdded: () => void;
};

export const AddStockDialog = ({ open, onOpenChange, product, onStockAdded }: AddStockDialogProps) => {
  const [additionalStock, setAdditionalStock] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const stockToAdd = parseInt(additionalStock);
    if (isNaN(stockToAdd) || stockToAdd <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setUpdating(true);
    try {
      const newStockQuantity = product.stock_quantity + stockToAdd;
      
      const { error } = await supabase
        .from("products")
        .update({ stock_quantity: newStockQuantity })
        .eq("id", product.id);

      if (error) throw error;

      toast.success(`Added ${stockToAdd} units to ${product.name}`);
      setAdditionalStock("");
      onOpenChange(false);
      onStockAdded();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add More Stock</DialogTitle>
          <DialogDescription>
            Add more units to {product.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddStock} className="space-y-4">
          <div>
            <Label htmlFor="current-stock">Current Stock</Label>
            <Input
              id="current-stock"
              value={`${product.stock_quantity} units`}
              disabled
            />
          </div>
          <div>
            <Label htmlFor="additional-stock">Additional Stock Quantity</Label>
            <Input
              id="additional-stock"
              type="number"
              min="1"
              value={additionalStock}
              onChange={(e) => setAdditionalStock(e.target.value)}
              placeholder="Enter quantity to add"
              required
            />
          </div>
          {additionalStock && !isNaN(parseInt(additionalStock)) && parseInt(additionalStock) > 0 && (
            <div className="p-3 bg-primary/10 rounded-md">
              <p className="text-sm">
                New Total Stock: <span className="font-bold">{product.stock_quantity + parseInt(additionalStock)} units</span>
              </p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={updating}>
            <PackagePlus className="mr-2 h-4 w-4" />
            {updating ? "Adding Stock..." : "Add Stock"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
