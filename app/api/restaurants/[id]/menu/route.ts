import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

type MenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
};

function fallbackMenuForCuisine(cuisine: string): MenuItem[] {
  const menus: Record<string, Array<{ name: string; price: number }>> = {
    Italian: [
      { name: "Margherita Pizza", price: 12.99 },
      { name: "Pepperoni Pizza", price: 14.99 },
      { name: "Pasta Carbonara", price: 13.99 },
    ],
    Japanese: [
      { name: "California Roll", price: 13.99 },
      { name: "Spicy Tuna Roll", price: 14.99 },
      { name: "Tempura Combo", price: 16.99 },
    ],
    Burger: [
      { name: "Classic Burger", price: 9.99 },
      { name: "Cheeseburger", price: 10.99 },
      { name: "Double Burger", price: 12.99 },
    ],
    Chinese: [
      { name: "Kung Pao Chicken", price: 11.99 },
      { name: "Fried Rice", price: 10.99 },
      { name: "Lo Mein Noodles", price: 10.99 },
    ],
    Thai: [
      { name: "Pad Thai", price: 11.99 },
      { name: "Green Curry", price: 12.99 },
      { name: "Spring Rolls", price: 8.99 },
    ],
    Mexican: [
      { name: "Beef Tacos", price: 9.99 },
      { name: "Burrito", price: 11.99 },
      { name: "Quesadilla", price: 9.99 },
    ],
    Indian: [
      { name: "Butter Chicken", price: 13.99 },
      { name: "Tikka Masala", price: 12.99 },
      { name: "Naan Bread", price: 4.99 },
    ],
    Restaurant: [
      { name: "House Special", price: 12.99 },
      { name: "Chef's Choice", price: 14.99 },
      { name: "Popular Combo", price: 11.99 },
    ],
  };

  const source = menus[cuisine] || menus.Restaurant;
  return source.map((item, idx) => ({
    id: idx + 1,
    name: item.name,
    price: item.price,
    image: `https://picsum.photos/seed/menu-fallback-${idx + 1}/500/500`,
  }));
}

async function persistFallbackMenu(
  supabase: ReturnType<typeof createClient> | any,
  restaurantId: string,
  items: MenuItem[]
): Promise<void> {
  const { error: flatError } = await supabase.from("menus").insert(
    items.map((item) => ({
      restaurant_id: restaurantId,
      name: item.name,
      price: item.price,
    }))
  );

  if (!flatError) return;

  await supabase.from("menus").insert({
    restaurant_id: restaurantId,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
    })),
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase is not configured" },
        { status: 500 }
      );
    }

    const { id } = await context.params;

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, cuisine")
      .eq("id", id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const { data: menuRows, error: menuError } = await supabase
      .from("menus")
      .select("*")
      .eq("restaurant_id", id);

    if (menuError) {
      return NextResponse.json({ error: menuError.message }, { status: 500 });
    }

    const normalizedMenu: MenuItem[] = (menuRows || []).flatMap((row, rowIdx) => {
      if (typeof row.name === "string" && row.price !== undefined) {
        const parsedPrice = Number(row.price);
        return [
          {
            id: row.id || rowIdx + 1,
            name: row.name,
            price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
            image: `https://picsum.photos/seed/menu-${id}-${rowIdx + 1}/500/500`,
          },
        ];
      }

      if (Array.isArray(row.items)) {
        return row.items
          .filter(
            (item: { name?: unknown }) => typeof item.name === "string"
          )
          .map(
            (
              item: { id?: number; name?: string; price?: number | string },
              itemIdx: number
            ) => {
              const parsedPrice = Number(item.price);
            return {
              id: item.id || itemIdx + 1,
              name: item.name,
              price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
              image: `https://picsum.photos/seed/menu-${id}-${itemIdx + 1}/500/500`,
            };
            }
          );
      }

      return [];
    });

    if (normalizedMenu.length > 0) {
      return NextResponse.json(normalizedMenu);
    }

    const generatedMenu = fallbackMenuForCuisine(restaurant.cuisine || "Restaurant");
    await persistFallbackMenu(supabase, String(restaurant.id), generatedMenu);
    return NextResponse.json(generatedMenu);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch menu", details: String(error) },
      { status: 500 }
    );
  }
}
