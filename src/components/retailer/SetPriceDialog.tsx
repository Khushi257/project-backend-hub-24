import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
  mrp?: number;
  purchase_price?: number;
};

type SetPriceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onUpdatePrice: (productId: string, newMrp: number, newPrice: number) => Promise<void>;
};

export const SetPriceDialog = ({
  open,
  onOpenChange,
  product,
  onUpdatePrice,
}: SetPriceDialogProps) => {
  const [mrp, setMrp] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");

  useEffect(() => {
    if (product) {
      setMrp(product.mrp?.toString() || product.price.toString());
      setSellingPrice(product.price.toString());
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const newMrp = parseFloat(mrp);
    const newPrice = parseFloat(sellingPrice);
    
    if (isNaN(newMrp) || isNaN(newPrice) || newMrp <= 0 || newPrice <= 0) {
      return;
    }

    if (newPrice > newMrp) {
      return;
    }

    await onUpdatePrice(product.id, newMrp, newPrice);
    onOpenChange(false);
  };

  const purchasePrice = product?.purchase_price || 0;
  const newMrp = parseFloat(mrp) || 0;
  const newSellingPrice = parseFloat(sellingPrice) || 0;
  const profitPerUnit = newSellingPrice - purchasePrice;
  const profitMargin = purchasePrice > 0 ? (profitPerUnit / purchasePrice) * 100 : 0;
  const discount = newMrp > 0 ? ((newMrp - newSellingPrice) / newMrp) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Retail Price</DialogTitle>
          <DialogDescription>
            Update the selling price for {product?.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Product</Label>
            <p className="text-sm font-medium">{product?.name}</p>
          </div>
          <div>
            <Label>Purchase Price</Label>
            <p className="text-sm font-medium">₹{purchasePrice.toFixed(2)}</p>
          </div>
          <div>
            <Label htmlFor="mrp">MRP (₹)</Label>
            <Input
              id="mrp"
              type="number"
              step="0.01"
              min={purchasePrice}
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="selling-price">Selling Price (₹)</Label>
            <Input
              id="selling-price"
              type="number"
              step="0.01"
              min={purchasePrice}
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              required
            />
            {newSellingPrice < purchasePrice && (
              <p className="text-xs text-destructive mt-1">
                Selling price should be higher than purchase price
              </p>
            )}
            {newSellingPrice > newMrp && (
              <p className="text-xs text-destructive mt-1">
                Selling price cannot be higher than MRP
              </p>
            )}
          </div>
          {newSellingPrice > 0 && newMrp > 0 && (
            <div className="bg-muted p-3 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Discount:</span>
                <span className="font-bold text-green-600">
                  {discount.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Profit per unit:</span>
                <span className={profitPerUnit >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                  ₹{profitPerUnit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Profit margin:</span>
                <span className={profitMargin >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                  {profitMargin.toFixed(1)}%
                </span>
              </div>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={newSellingPrice < purchasePrice || newSellingPrice > newMrp}>
            Update Price
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
