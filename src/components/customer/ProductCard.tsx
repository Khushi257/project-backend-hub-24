import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, Star, Heart } from "lucide-react";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    mrp: number | null;
    discount_percentage: number | null;
    stock_quantity: number;
    image_url: string | null;
    is_local: boolean | null;
    categories: { name: string } | null;
  };
  onAddToCart: (productId: string) => void;
  onToggleWishlist?: (productId: string) => void;
};

export const ProductCard = ({ product, onAddToCart, onToggleWishlist }: ProductCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const discount = product.discount_percentage || 0;

  useEffect(() => {
    if (user) {
      checkWishlistStatus();
    }
    fetchAverageRating();
  }, [user, product.id]);

  const checkWishlistStatus = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("wishlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();
      
      setIsInWishlist(!!data);
    } catch (error) {
      console.error("Error checking wishlist:", error);
    }
  };

  const fetchAverageRating = async () => {
    try {
      const { data, error } = await supabase
        .from("feedback")
        .select("rating")
        .eq("product_id", product.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
        const avg = sum / data.length;
        setAverageRating(avg);
        setTotalReviews(data.length);
      } else {
        setAverageRating(0);
        setTotalReviews(0);
      }
    } catch (error) {
      console.error("Error fetching ratings:", error);
    }
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(product.id);
      setIsInWishlist(!isInWishlist);
    }
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div className="aspect-[3/4] bg-muted relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-20 w-20 text-muted-foreground" />
          </div>
        )}
        {discount > 0 && (
          <Badge className="absolute top-2 left-2 bg-red-500">
            {discount}% OFF
          </Badge>
        )}
        {product.is_local && (
          <Badge className="absolute top-2 left-2 bg-green-500 text-white" style={{ marginTop: discount > 0 ? '32px' : '0' }}>
            Fast Delivery
          </Badge>
        )}
        {onToggleWishlist && (
          <div className="absolute top-2 right-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/80 hover:bg-background h-8 w-8"
              onClick={handleToggleWishlist}
            >
              <Heart 
                className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} 
              />
            </Button>
          </div>
        )}
        {product.stock_quantity < 10 && (
          <Badge className="absolute bottom-2 right-2 bg-orange-500">
            Only {product.stock_quantity} Left!
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="mb-2">
          {product.categories && (
            <p className="text-xs font-bold uppercase text-muted-foreground">
              {product.categories.name}
            </p>
          )}
        </div>
        
        <h3 className="font-medium line-clamp-2 min-h-[2.5rem] mb-2">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-2">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`h-3 w-3 ${
                  i < Math.round(averageRating) 
                    ? 'fill-orange-400 text-orange-400' 
                    : 'fill-muted text-muted-foreground'
                }`} 
              />
            ))}
          </div>
          {totalReviews > 0 ? (
            <span className="text-xs text-muted-foreground ml-1">
              | {averageRating.toFixed(1)} ({totalReviews})
            </span>
          ) : (
            <span className="text-xs text-muted-foreground ml-1">| No reviews</span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold">₹{product.price.toFixed(0)}</span>
          {product.mrp && product.mrp > product.price && (
            <>
              <span className="text-sm text-muted-foreground line-through">
                ₹{product.mrp.toFixed(0)}
              </span>
              <span className="text-sm text-red-500 font-medium">
                ({Math.round(discount)}% OFF)
              </span>
            </>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product.id);
          }}
          disabled={product.stock_quantity === 0}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {product.stock_quantity === 0 ? "Out of Stock" : "Add to Cart"}
        </Button>
      </CardFooter>
    </Card>
  );
};
