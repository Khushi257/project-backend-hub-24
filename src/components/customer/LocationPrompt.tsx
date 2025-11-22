import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, X } from "lucide-react";
import { toast } from "sonner";

type LocationPromptProps = {
  onLocationSet: () => void;
};

export const LocationPrompt = ({ onLocationSet }: LocationPromptProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetLocation = async () => {
    if (!user || !city.trim()) {
      toast.error("Please enter a city");
      return;
    }

    setLoading(true);
    try {
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("profiles")
          .update({ city: city.trim(), updated_at: new Date().toISOString() })
          .eq("id", user.id);
        if (error) throw error;
      } else {
        // Insert new profile
        const { error } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || "User",
            city: city.trim()
          });
        if (error) throw error;
      }

      toast.success("Location saved! Fast delivery filter is now available.");
      setIsOpen(false);
      onLocationSet();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Alert className="border-primary bg-primary/5 mb-6 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={() => setIsOpen(false)}
      >
        <X className="h-4 w-4" />
      </Button>
      <MapPin className="h-5 w-5 text-primary" />
      <AlertDescription className="mt-2">
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-semibold text-lg mb-1">🚀 Unlock Fast Delivery!</p>
            <p className="text-sm text-muted-foreground">
              Set your city to see products with same-day delivery from local retailers
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter your city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSetLocation()}
              className="max-w-xs"
            />
            <Button onClick={handleSetLocation} disabled={loading}>
              {loading ? "Saving..." : "Save Location"}
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};