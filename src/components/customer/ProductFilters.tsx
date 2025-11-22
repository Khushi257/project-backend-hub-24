import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

type Category = {
  id: string;
  name: string;
  count: number;
};

type FilterProps = {
  categories: Category[];
  selectedCategories: string[];
  onCategoryChange: (categoryId: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  maxPrice: number;
  fastDeliveryOnly: boolean;
  onFastDeliveryChange: (checked: boolean) => void;
  userCity: string | null;
};

export const ProductFilters = ({
  categories,
  selectedCategories,
  onCategoryChange,
  priceRange,
  onPriceRangeChange,
  maxPrice,
  fastDeliveryOnly,
  onFastDeliveryChange,
  userCity,
}: FilterProps) => {
  return (
    <div className="w-64 space-y-6 pr-6 border-r">
      <div>
        <h2 className="text-lg font-bold mb-4">FILTERS</h2>
      </div>

      {/* Categories */}
      <div>
        <h3 className="font-semibold mb-3 flex items-center justify-between">
          CATEGORIES
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={category.id}
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => onCategoryChange(category.id)}
              />
              <label
                htmlFor={category.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
              >
                {category.name} ({category.count})
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-semibold mb-3">PRICE</h3>
        <div className="space-y-4">
          <Slider
            min={0}
            max={maxPrice}
            step={100}
            value={[priceRange[0], priceRange[1]]}
            onValueChange={(value) => onPriceRangeChange(value as [number, number])}
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              ₹{priceRange[0].toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              ₹{priceRange[1].toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Fast Delivery Filter */}
      {userCity && (
        <div>
          <h3 className="font-semibold mb-3">DELIVERY</h3>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="fast-delivery"
              checked={fastDeliveryOnly}
              onCheckedChange={onFastDeliveryChange}
            />
            <label
              htmlFor="fast-delivery"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Fast Delivery (1 day)
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
