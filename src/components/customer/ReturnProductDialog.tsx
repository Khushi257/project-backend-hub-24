import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PackageX, Upload, X } from "lucide-react";

type ReturnProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderItem: {
    order_id: string;
    product_id: string;
    quantity: number;
    product_name: string;
    seller_id: string;
  };
  onReturnSubmitted: () => void;
};

export const ReturnProductDialog = ({ open, onOpenChange, orderItem, onReturnSubmitted }: ReturnProductDialogProps) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error("Please enter a reason for the return");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `returns/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from("returns")
        .insert({
          order_id: orderItem.order_id,
          product_id: orderItem.product_id,
          customer_id: user.id,
          retailer_id: orderItem.seller_id,
          quantity: orderItem.quantity,
          reason: reason.trim(),
          image_url: imageUrl,
          status: "pending"
        });

      if (error) throw error;

      toast.success("Return request submitted successfully", {
        description: "Your money will be refunded within 2 business days after approval."
      });
      setReason("");
      setImageFile(null);
      setImagePreview(null);
      onOpenChange(false);
      onReturnSubmitted();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return Product</DialogTitle>
          <DialogDescription>
            Submit a return request for {orderItem.product_name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmitReturn} className="space-y-4">
          <div>
            <Label htmlFor="quantity">Quantity to Return</Label>
            <p className="text-sm text-muted-foreground mt-1">{orderItem.quantity} units</p>
          </div>
          <div>
            <Label htmlFor="reason">Reason for Return *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please describe why you want to return this product..."
              rows={4}
              required
            />
          </div>
          <div>
            <Label htmlFor="image">Product Photo (Optional)</Label>
            <div className="mt-2">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Return product"
                    className="h-32 w-32 object-cover rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={removeImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-border rounded-md p-6 hover:border-primary transition-colors flex flex-col items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload product photo
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Max size: 5MB
                    </span>
                  </div>
                  <Input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm text-muted-foreground">
              💰 Your refund will be processed within 2 business days after the return is approved.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            <PackageX className="mr-2 h-4 w-4" />
            {submitting ? "Submitting..." : "Submit Return Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
