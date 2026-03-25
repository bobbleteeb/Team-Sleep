import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export interface RestaurantFromOSM {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  cuisine?: string;
  address?: string;
  phone?: string;
  website?: string;
  menu: Array<{
    id: number;
    name: string;
    price: number;
    image: string;
  }>;
  deliveryFee: number;
  eta: string;
  image: string;
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fetch restaurants from Supabase database
async function fetchFromSupabase(): Promise<RestaurantFromOSM[] | null> {
  try {
    console.log("📦 Querying Supabase for real restaurants...");

    // Fetch all restaurants from Supabase
    const { data: restaurants, error } = await supabase
      .from("restaurants")
      .select("*, menus(*)")
      .returns<Array<{
        id: number;
        name: string;
        latitude: number;
        longitude: number;
        cuisine?: string;
        address?: string;
        phone?: string;
        website?: string;
        menus: Array<{
          id?: number;
          name?: string;
          price?: number | string;
          items?: Array<{ id?: number; name?: string; price?: number | string }>;
        }>;
      }>>();

    if (error) {
      console.warn("Supabase query error:", error.message);
      return null;
    }

    if (!restaurants || restaurants.length === 0) {
      console.log("No restaurants in Supabase yet");
      return null;
    }

    console.log(`✓ Found ${restaurants.length} restaurants in Supabase`);

    // Transform to RestaurantFromOSM format
    const transformed: RestaurantFromOSM[] = restaurants.map((r, idx) => {
      const normalizedMenu =
        r.menus?.flatMap((m, mIdx) => {
          if (typeof m.name === "string" && m.price !== undefined) {
            const parsedPrice = Number(m.price);
            return [
              {
                id: m.id || mIdx + 1,
                name: m.name,
                price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
                image: `https://picsum.photos/seed/menu-${r.id}-${mIdx + 1}/500/500`,
              },
            ];
          }

          if (Array.isArray(m.items)) {
            return m.items
              .filter((item) => typeof item.name === "string")
              .map((item, itemIdx) => {
                const parsedPrice = Number(item.price);
                return {
                  id: item.id || itemIdx + 1,
                  name: item.name as string,
                  price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
                  image: `https://picsum.photos/seed/menu-${r.id}-${itemIdx + 1}/500/500`,
                };
              });
          }

          return [];
        }) || [];

      return {
        id: r.id,
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        cuisine: r.cuisine || "Restaurant",
        address: r.address,
        phone: r.phone,
        website: r.website,
        menu: normalizedMenu,
        deliveryFee: 3.99 + (idx % 3) * 0.5,
        eta: `${15 + (idx % 20)} mins`,
        image: `https://picsum.photos/seed/restaurant-${r.id}/900/400`,
      };
    });

    return transformed;
  } catch (error) {
    console.warn("Supabase error:", error);
    return null;
  }
}

// Map cuisines for better restaurant type detection
const cuisineMap: { [key: string]: string } = {
  pizza: "Italian",
  sushi: "Japanese",
  burger: "Burger",
  burger_king: "Burger",
  mcdonalds: "Burger",
  chinese: "Chinese",
  thai: "Thai",
  indian: "Indian",
  mexican: "Mexican",
  bbq: "BBQ",
  bbq_grill: "BBQ",
  kebab: "Middle Eastern",
  vegan: "Vegan",
  seafood: "Seafood",
  korean: "Korean",
  vietnamese: "Vietnamese",
  french: "French",
};

// Generate menu items based on cuisine type
function generateMenuForCuisine(cuisine: string): Array<{
  id: number;
  name: string;
  price: number;
  image: string;
}> {
  const menus: { [key: string]: Array<{ name: string; price: number }> } = {
    Italian: [
      { name: "Margherita Pizza", price: 12.99 },
      { name: "Pepperoni Pizza", price: 14.99 },
      { name: "Pasta Carbonara", price: 13.99 },
      { name: "Fettuccine Alfredo", price: 12.99 },
    ],
    Japanese: [
      { name: "California Roll", price: 13.99 },
      { name: "Spicy Tuna Roll", price: 14.99 },
      { name: "Salmon Sashimi", price: 15.99 },
      { name: "Tempura Combo", price: 16.99 },
    ],
    Burger: [
      { name: "Classic Burger", price: 9.99 },
      { name: "Cheeseburger", price: 10.99 },
      { name: "Double Burger", price: 12.99 },
      { name: "Bacon Burger", price: 11.99 },
    ],
    Chinese: [
      { name: "Kung Pao Chicken", price: 11.99 },
      { name: "Fried Rice", price: 10.99 },
      { name: "Lo Mein Noodles", price: 10.99 },
      { name: "Sweet and Sour Pork", price: 12.99 },
    ],
    Thai: [
      { name: "Pad Thai", price: 11.99 },
      { name: "Green Curry", price: 12.99 },
      { name: "Tom Yum Soup", price: 10.99 },
      { name: "Spring Rolls", price: 8.99 },
    ],
    Indian: [
      { name: "Butter Chicken", price: 13.99 },
      { name: "Tikka Masala", price: 12.99 },
      { name: "Naan Bread", price: 4.99 },
      { name: "Saag Paneer", price: 12.99 },
    ],
    Mexican: [
      { name: "Beef Tacos", price: 9.99 },
      { name: "Burrito", price: 11.99 },
      { name: "Enchilada", price: 10.99 },
      { name: "Quesadilla", price: 9.99 },
    ],
    BBQ: [
      { name: "Pulled Pork", price: 13.99 },
      { name: "BBQ Ribs", price: 15.99 },
      { name: "Brisket Sandwich", price: 14.99 },
      { name: "Smoked Chicken", price: 12.99 },
    ],
  };

  const menuItems = menus[cuisine] || menus["Burger"];
  return menuItems.map((item, idx) => ({
    id: idx + 1,
    name: item.name,
    price: item.price,
    image: `https://images.unsplash.com/photo-${1000000 + idx}?w=500&h=500&fit=crop`,
  }));
}

type GooglePlacesResponse = {
  status?: string;
  error_message?: string;
  results?: Array<{
    name?: string;
    vicinity?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    types?: string[];
  }>;
};

function normalizeCuisineFromGoogleTypes(types?: string[]): string {
  if (!types || types.length === 0) return "Restaurant";
  const cuisineType = types.find(
    (t) => t !== "restaurant" && t !== "food" && t !== "point_of_interest"
  );
  if (!cuisineType) return "Restaurant";

  const normalized = cuisineMap[cuisineType.toLowerCase()];
  if (normalized) return normalized;

  return cuisineType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function insertMenusForRestaurant(
  restaurantId: number | string,
  cuisine: string
): Promise<void> {
  const menuItems = generateMenuForCuisine(cuisine);

  const { error: flatError } = await supabase.from("menus").insert(
    menuItems.map((item) => ({
      restaurant_id: restaurantId,
      name: item.name,
      price: item.price,
    }))
  );

  if (!flatError) return;

  await supabase.from("menus").insert({
    restaurant_id: restaurantId,
    items: menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
    })),
  });
}

async function fetchFromGooglePlacesAndSave(
  lat: number,
  lon: number
): Promise<boolean> {
  const googleApiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  if (!googleApiKey) {
    console.log("⚠️ Google Places API key missing. Skipping Google fetch.");
    return false;
  }

  try {
    const endpoint =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lon}&radius=5000&type=restaurant&key=${googleApiKey}`;

    const response = await fetch(endpoint, { cache: "no-store" });

    if (!response.ok) {
      console.warn(`Google Places HTTP ${response.status}`);
      return false;
    }

    const places = (await response.json()) as GooglePlacesResponse;

    if (places.status && !["OK", "ZERO_RESULTS"].includes(places.status)) {
      console.warn("Google Places API error:", places.status, places.error_message);
      return false;
    }

    const results = (places.results || []).filter(
      (place) =>
        typeof place.name === "string" &&
        typeof place.geometry?.location?.lat === "number" &&
        typeof place.geometry?.location?.lng === "number"
    );

    if (results.length === 0) {
      console.log("No Google Places restaurants found for this location.");
      return false;
    }

    const { data: existingRows } = await supabase
      .from("restaurants")
      .select("id, name")
      .returns<Array<{ id: number | string; name: string }>>();

    const existingByName = new Map(
      (existingRows || []).map((r) => [r.name.toLowerCase(), r.id])
    );

    const toInsert = results
      .filter((place) => !existingByName.has((place.name || "").toLowerCase()))
      .map((place, idx) => ({
        name: place.name as string,
        cuisine: normalizeCuisineFromGoogleTypes(place.types),
        address: place.vicinity || "",
        phone: null as string | null,
        website: null as string | null,
        latitude: place.geometry?.location?.lat as number,
        longitude: place.geometry?.location?.lng as number,
        delivery_fee: 3.99 + (idx % 3) * 0.5,
        eta: `${20 + (idx % 15)} mins`,
        image: `https://picsum.photos/seed/google-restaurant-${idx + 1}/900/400`,
      }));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("restaurants")
        .insert(toInsert);

      if (insertError) {
        console.warn("Could not insert Google Places restaurants:", insertError.message);
      }
    }

    const targetNames = results
      .map((place) => place.name?.trim())
      .filter((value): value is string => Boolean(value));

    if (targetNames.length === 0) return false;

    const { data: targetRestaurants, error: targetError } = await supabase
      .from("restaurants")
      .select("id, name, cuisine")
      .in("name", targetNames)
      .returns<Array<{ id: number | string; name: string; cuisine?: string }>>();

    if (targetError || !targetRestaurants) {
      return false;
    }

    const restaurantIds = targetRestaurants.map((r) => r.id);
    const { data: existingMenus } = await supabase
      .from("menus")
      .select("restaurant_id")
      .in("restaurant_id", restaurantIds)
      .returns<Array<{ restaurant_id: number | string }>>();

    const hasMenu = new Set((existingMenus || []).map((m) => String(m.restaurant_id)));

    for (const restaurant of targetRestaurants) {
      if (hasMenu.has(String(restaurant.id))) continue;
      await insertMenusForRestaurant(restaurant.id, restaurant.cuisine || "Restaurant");
    }

    console.log(`✅ Saved ${targetRestaurants.length} Google Places restaurants to Supabase`);
    return targetRestaurants.length > 0;
  } catch (error) {
    console.warn("Google Places fetch/save error:", error);
    return false;
  }
}

// Fetch restaurants from Overpass API with fallback to mock restaurants
async function fetchFromOverpass(
  lat: number,
  lon: number
): Promise<RestaurantFromOSM[] | null> {
  try {
    // Calculate bounding box with LARGER radius (0.1 degrees ≈ 11 km)
    const bbox = {
      south: lat - 0.1,
      west: lon - 0.1,
      north: lat + 0.1,
      east: lon + 0.1,
    };

    // Try multiple overpass endpoints to handle rate limiting
    const endpoints = [
      "https://overpass-api.de/api/interpreter",
      "https://z.overpass-api.de/api/interpreter",
      "https://overpass.openstreetmap.ru/cgi/interpreter",
    ];

    // Query for restaurants with a broader search
    const query = `[timeout:6];(
      node["amenity"="restaurant"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["amenity"="restaurant"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["amenity"="cafe"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["amenity"="cafe"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      node["amenity"="fast_food"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
      way["amenity"="fast_food"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    );out center;`;

    const restaurants: RestaurantFromOSM[] = [];
    const idSet = new Set<string>();

    // Try each endpoint until one succeeds
    for (const endpoint of endpoints) {
      try {
        const response = await Promise.race([
          fetch(endpoint, {
            method: "POST",
            body: query,
            headers: { "Content-Type": "application/osm3s" },
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 6000)
          ),
        ]) as Response;

        // Check response status
        if (!response.ok) {
          console.log(`Endpoint ${endpoint} returned status ${response.status}`);
          continue;
        }

        // Check content type to avoid JSON parsing errors
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          console.log(`Endpoint ${endpoint} returned non-JSON: ${contentType}`);
          continue;
        }

        const data = await response.json() as { elements?: Array<{
          id: number;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: {
            name?: string;
            cuisine?: string;
            addr?: string;
            phone?: string;
            website?: string;
          };
        }> };

        if (data.elements && data.elements.length > 0) {
          console.log(`✓ Found ${data.elements.length} places from ${endpoint}`);
          
          for (const element of data.elements) {
            const name = element.tags?.name;
            if (!name) continue;
            if (idSet.has(name)) continue;

            const elemLat = element.center?.lat ?? element.lat;
            const elemLon = element.center?.lon ?? element.lon;
            if (!elemLat || !elemLon) continue;

            const cuisine = element.tags?.cuisine
              ? cuisineMap[element.tags.cuisine.toLowerCase()] ||
                element.tags.cuisine
              : "Restaurant";

            const menu = generateMenuForCuisine(cuisine);

            restaurants.push({
              id: element.id,
              name,
              latitude: elemLat,
              longitude: elemLon,
              cuisine,
              address: element.tags?.addr,
              phone: element.tags?.phone,
              website: element.tags?.website,
              menu,
              deliveryFee: Math.random() * 2 + 2.99,
              eta: Math.floor(Math.random() * 15 + 15) + " mins",
              image: `https://images.unsplash.com/photo-${Math.abs(
                element.id
              )}?w=900&h=400&fit=crop`,
            });
            idSet.add(name);
          }

          if (restaurants.length > 0) {
            console.log(`✓ Successfully fetched ${restaurants.length} restaurants`);
            return restaurants;
          }
        }
      } catch (err) {
        console.log(`Endpoint ${endpoint} failed:`, String(err).slice(0, 50));
        continue;
      }
    }

    console.log("✗ All Overpass endpoints failed or returned no restaurants");
    return null;
  } catch (error) {
    console.warn("Overpass API error:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const latitude = request.nextUrl.searchParams.get("latitude");
    const longitude = request.nextUrl.searchParams.get("longitude");

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: "latitude and longitude required" },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    console.log(`🔍 Searching for restaurants near ${lat}, ${lon}`);

    // 1. Google Places by user location, then save to Supabase
    await fetchFromGooglePlacesAndSave(lat, lon);

    // 2. Return restaurants from Supabase
    const supabaseRestaurants = await fetchFromSupabase();
    if (supabaseRestaurants && supabaseRestaurants.length > 0) {
      const sorted = supabaseRestaurants
        .sort(
          (a, b) =>
            calculateDistance(lat, lon, a.latitude, a.longitude) -
            calculateDistance(lat, lon, b.latitude, b.longitude)
        )
        .slice(0, 10);
      console.log(`✅ Returning ${sorted.length} restaurants from Supabase`);
      return NextResponse.json(sorted);
    }

    // 3. Overpass fallback
    const overpassRestaurants = await fetchFromOverpass(lat, lon);
    if (overpassRestaurants && overpassRestaurants.length > 0) {
      const sorted = overpassRestaurants
        .sort(
          (a, b) =>
            calculateDistance(lat, lon, a.latitude, a.longitude) -
            calculateDistance(lat, lon, b.latitude, b.longitude)
        )
        .slice(0, 10);
      console.log(`✅ Returning ${sorted.length} restaurants from Overpass API`);
      return NextResponse.json(sorted);
    }

    // 4. No demo/mock fallback: return empty list so client can show proper state.
    return NextResponse.json([]);
  } catch (error) {
    console.error("🚨 Error in /api/restaurants/nearby:", error);
    return NextResponse.json([], { status: 500 });
  }
}
