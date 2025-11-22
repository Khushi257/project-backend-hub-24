import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PackageMinus } from "lucide-react";

type RemoveStockDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    stock_quantity: number;
  };
  onStockRemoved: () => void;
};

export const RemoveStockDialog = ({ open, onOpenChange, product, onStockRemoved }: RemoveStockDialogProps) => {
  const [removeQuantity, setRemoveQuantity] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleRemoveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantityToRemove = parseInt(removeQuantity);
    if (isNaN(quantityToRemove) || quantityToRemove <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (quantityToRemove > product.stock_quantity) {
      toast.error("Cannot remove more than available stock");
      return;
    }

    setUpdating(true);
    try {
      const newStockQuantity = product.stock_quantity - quantityToRemove;
      
      const { error } = await supabase
        .from("products")
        .update({ stock_quantity: newStockQuantity })
        .eq("id", product.id);

      if (error) throw error;

      toast.success(`Removed ${quantityToRemove} units from ${product.name}`);
      setRemoveQuantity("");
      onOpenChange(false);
      onStockRemoved();
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
          <DialogTitle>Remove Stock</DialogTitle>
          <DialogDescription>
            Remove units from {product.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRemoveStock} className="space-y-4">
          <div>
            <Label htmlFor="current-stock">Current Stock</Label>
            <Input
              id="current-stock"
              value={`${product.stock_quantity} units`}
              disabled
            />
          </div>
          <div>
            <Label htmlFor="remove-quantity">Quantity to Remove</Label>
            <Input
              id="remove-quantity"
              type="number"
              min="1"
              max={product.stock_quantity}
              value={removeQuantity}
              onChange={(e) => setRemoveQuantity(e.target.value)}
              placeholder="Enter quantity to remove"
              required
            />
          </div>
          {removeQuantity && !isNaN(parseInt(removeQuantity)) && parseInt(removeQuantity) > 0 && parseInt(removeQuantity) <= product.stock_quantity && (
            <div className="p-3 bg-destructive/10 rounded-md">
              <p className="text-sm">
                New Total Stock: <span className="font-bold">{product.stock_quantity - parseInt(removeQuantity)} units</span>
              </p>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={updating} variant="destructive">
            <PackageMinus className="mr-2 h-4 w-4" />
            {updating ? "Removing Stock..." : "Remove Stock"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
