import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

type CategoryNavProps = {
  onCategorySelect: (categoryId: string) => void;
};

export const CategoryNav = ({ onCategorySelect }: CategoryNavProps) => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  const mainCategories = categories.filter((c) => !c.parent_id);
  const getSubcategories = (parentId: string) => 
    categories.filter((c) => c.parent_id === parentId);

  return (
    <NavigationMenu>
      <NavigationMenuList className="flex gap-2">
        {mainCategories.map((category) => {
          const subcategories = getSubcategories(category.id);
          
          if (subcategories.length > 0) {
            return (
              <NavigationMenuItem key={category.id}>
                <NavigationMenuTrigger className="text-sm font-medium">
                  {category.name.toUpperCase()}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[200px] gap-2 p-4">
                    <li>
                      <NavigationMenuLink
                        className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer"
                        onClick={() => onCategorySelect(category.id)}
                      >
                        All {category.name}
                      </NavigationMenuLink>
                    </li>
                    {subcategories.map((sub) => (
                      <li key={sub.id}>
                        <NavigationMenuLink
                          className="block select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground cursor-pointer"
                          onClick={() => onCategorySelect(sub.id)}
                        >
                          {sub.name}
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            );
          }

          return (
            <NavigationMenuItem key={category.id}>
              <NavigationMenuLink
                className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                onClick={() => onCategorySelect(category.id)}
              >
                {category.name.toUpperCase()}
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
};
