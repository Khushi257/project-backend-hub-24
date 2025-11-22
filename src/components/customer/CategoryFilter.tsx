import { Button } from "@/components/ui/button";
import { Home, Laptop, Sparkles, Shirt, Dumbbell } from "lucide-react";

type CategoryFilterProps = {
  onCategorySelect: (category: string) => void;
  selectedCategory: string;
};

const categories = [
  { name: "Home", icon: Home },
  { name: "Electronics", icon: Laptop },
  { name: "Fashion", icon: Shirt },
  { name: "Beauty", icon: Sparkles },
  { name: "Sports", icon: Dumbbell },
];

export const CategoryFilter = ({ onCategorySelect, selectedCategory }: CategoryFilterProps) => {
  return (
    <div className="flex items-center gap-2">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <Button
            key={category.name}
            variant={selectedCategory === category.name ? "default" : "ghost"}
            size="sm"
            onClick={() => onCategorySelect(category.name)}
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            {category.name}
          </Button>
        );
      })}
    </div>
  );
};
