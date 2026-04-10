import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRestaurantImage, getMenuItemImage } from "@/app/lib/imageMapping";

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

// Haversine formula to calculate distance between two points in MILES
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in MILES (was 6371 km)
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
                image: getMenuItemImage(m.name, r.cuisine || "Restaurant"),
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
                  image: getMenuItemImage(item.name as string, r.cuisine || "Restaurant"),
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
        image: getRestaurantImage(r.name, r.cuisine || "Restaurant"),
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
  somali: "Somali",
  ethiopian: "Ethiopian",
  greek: "Greek",
  turkish: "Turkish",
  spanish: "Spanish",
  portuguese: "Portuguese",
  brazilian: "Brazilian",
  argentinian: "Argentinian",
  peruvian: "Peruvian",
  lebanese: "Lebanese",
  moroccan: "Moroccan",
  jewish: "Jewish",
  israeli: "Israeli",
  afghan: "Afghan",
  pakistani: "Pakistani",
  bangladeshi: "Bangladeshi",
  sri_lankan: "Sri Lankan",
  burmese: "Burmese",
  laotian: "Laotian",
  cambodian: "Cambodian",
  indonesian: "Indonesian",
  malaysian: "Malaysian",
  singaporean: "Singaporean",
  american: "American",
  british: "British",
  irish: "Irish",
  scandinavian: "Scandinavian",
  german: "German",
  austrian: "Austrian",
  swiss: "Swiss",
  dutch: "Dutch",
  belgian: "Belgian",
  polish: "Polish",
  czech: "Czech",
  hungarian: "Hungarian",
  romanian: "Romanian",
  russian: "Russian",
  ukrainian: "Ukrainian",
  belarusian: "Belarusian",
  italian: "Italian",
  cypriot: "Cypriot",
  croatian: "Croatian",
  serbian: "Serbian",
  bosnian: "Bosnian",
  albanian: "Albanian",
  maltese: "Maltese",
  bulgarian: "Bulgarian",
  macedonian: "Macedonian",
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
    Somali: [
      { name: "Camel Meat Stew", price: 14.99 },
      { name: "Sambusas (Beef)", price: 7.99 },
      { name: "Canjeero Bread", price: 3.99 },
      { name: "Xalwo (Sesame Brittle)", price: 5.99 },
      { name: "Shaah (Somali Tea)", price: 3.99 },
      { name: "Bariis Iyo Hilib (Rice & Meat)", price: 12.99 },
    ],
    Ethiopian: [
      { name: "Injera Platter", price: 13.99 },
      { name: "Doro Wat (Chicken Stew)", price: 12.99 },
      { name: "Misir Wat (Red Lentil)", price: 10.99 },
      { name: "Gomen (Collard Greens)", price: 9.99 },
    ],
    Greek: [
      { name: "Moussaka", price: 13.99 },
      { name: "Souvlaki", price: 12.99 },
      { name: "Greek Salad", price: 10.99 },
      { name: "Spanakopita", price: 11.99 },
    ],
    Turkish: [
      { name: "Kebab Plate", price: 13.99 },
      { name: "Pide", price: 11.99 },
      { name: "Hummus", price: 8.99 },
      { name: "Baklava", price: 6.99 },
    ],
    Spanish: [
      { name: "Paella", price: 14.99 },
      { name: "Tapas Platter", price: 12.99 },
      { name: "Gazpacho", price: 9.99 },
      { name: "Jamón Ibérico", price: 15.99 },
    ],
    Portuguese: [
      { name: "Bacalao à Brás", price: 13.99 },
      { name: "Caldo Verde", price: 9.99 },
      { name: "Pastéis de Nata", price: 7.99 },
      { name: "Sardines Grilled", price: 12.99 },
    ],
    Brazilian: [
      { name: "Feijoada", price: 13.99 },
      { name: "Pão de Queijo", price: 8.99 },
      { name: "Acarajé", price: 10.99 },
      { name: "Brigadeiro", price: 5.99 },
    ],
    Korean: [
      { name: "Bibimbap", price: 12.99 },
      { name: "Korean BBQ", price: 15.99 },
      { name: "Kimchi Jjigae", price: 11.99 },
      { name: "Hotteok", price: 8.99 },
    ],
    Vietnamese: [
      { name: "Pho", price: 11.99 },
      { name: "Banh Mi", price: 9.99 },
      { name: "Spring Rolls", price: 8.99 },
      { name: "Bun Cha", price: 11.99 },
    ],
    Lebanese: [
      { name: "Shawarma", price: 12.99 },
      { name: "Fattoush Salad", price: 10.99 },
      { name: "Kibbeh", price: 11.99 },
      { name: "Hummus", price: 8.99 },
    ],
    Moroccan: [
      { name: "Tagine", price: 13.99 },
      { name: "Couscous", price: 11.99 },
      { name: "Harira Soup", price: 9.99 },
      { name: "Pastilla", price: 12.99 },
    ],
    Pakistani: [
      { name: "Biryani", price: 12.99 },
      { name: "Karahi", price: 12.99 },
      { name: "Samosa", price: 7.99 },
      { name: "Naan", price: 4.99 },
    ],
    Bangladeshi: [
      { name: "Biryani", price: 11.99 },
      { name: "Curry Rice", price: 10.99 },
      { name: "Shingara", price: 7.99 },
      { name: "Fuchka", price: 6.99 },
    ],
    "Sri Lankan": [
      { name: "Curry & Rice", price: 11.99 },
      { name: "Kottu Roti", price: 10.99 },
      { name: "Lamprais", price: 12.99 },
      { name: "Hoppers", price: 9.99 },
    ],
    American: [
      { name: "Classic Burger", price: 10.99 },
      { name: "Chicken Wings", price: 11.99 },
      { name: "BBQ Ribs", price: 14.99 },
      { name: "Mac & Cheese", price: 10.99 },
    ],
    Seafood: [
      { name: "Grilled Salmon", price: 16.99 },
      { name: "Shrimp Scampi", price: 14.99 },
      { name: "Fish & Chips", price: 12.99 },
      { name: "Lobster Roll", price: 15.99 },
    ],
    Vegan: [
      { name: "Buddha Bowl", price: 11.99 },
      { name: "Veggie Burger", price: 10.99 },
      { name: "Chickpea Curry", price: 10.99 },
      { name: "Kale Salad", price: 9.99 },
    ],
    "Middle Eastern": [
      { name: "Hummus", price: 8.99 },
      { name: "Falafel", price: 9.99 },
      { name: "Shawarma", price: 12.99 },
      { name: "Tabbouleh", price: 10.99 },
    ],
    French: [
      { name: "Coq au Vin", price: 15.99 },
      { name: "Beef Bourguignon", price: 16.99 },
      { name: "Ratatouille", price: 12.99 },
      { name: "Crème Brûlée", price: 8.99 },
    ],
  };

  const menuItems = menus[cuisine] || menus["Restaurant"] || menus["American"];
  return menuItems.map((item, idx) => ({
    id: idx + 1,
    name: item.name,
    price: item.price,
    image: getMenuItemImage(item.name, cuisine),
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

    const newRestaurants = results
      .filter((place) => !existingByName.has((place.name || "").toLowerCase()));

    // Use local images for new restaurants
    console.log(`🖼️ Using local images for ${newRestaurants.length} new restaurants...`);
    const toInsert = await Promise.all(
      newRestaurants.map(async (place, idx) => {
        const cuisine = normalizeCuisineFromGoogleTypes(place.types);
        
        // Use local image mapping based on restaurant name and cuisine
        const restaurantImage = getRestaurantImage(
          place.name as string,
          cuisine
        );

        return {
          name: place.name as string,
          cuisine: cuisine,
          address: place.vicinity || "",
          phone: null as string | null,
          website: null as string | null,
          latitude: place.geometry?.location?.lat as number,
          longitude: place.geometry?.location?.lng as number,
          delivery_fee: 3.99 + (idx % 3) * 0.5,
          eta: `${20 + (idx % 15)} mins`,
          image: restaurantImage,
        };
      })
    );

    if (toInsert.length > 0) {
      console.log(
        `✨ Inserting ${toInsert.length} restaurants with local images`
      );
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
    // Calculate bounding box with LARGER radius (0.15 degrees ≈ 16.5 km)
    const bbox = {
      south: lat - 0.15,
      west: lon - 0.15,
      north: lat + 0.15,
      east: lon + 0.15,
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

    let restaurants: RestaurantFromOSM[] = [];
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
          
          // Collect valid restaurant data
          const validElements = [];
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

            validElements.push({
              element,
              name,
              elemLat,
              elemLon,
              cuisine,
            });
            idSet.add(name);
          }

          if (validElements.length > 0) {
            // Use local images for all valid restaurants
            console.log(
              `🖼️ Using local images for ${validElements.length} restaurants from Overpass...`
            );
            
            const restaurantsWithImages = await Promise.all(
              validElements.map(async (item) => {
                const menu = generateMenuForCuisine(item.cuisine);
                const restaurantImage = getRestaurantImage(
                  item.name,
                  item.cuisine
                );

                return {
                  id: item.element.id,
                  name: item.name,
                  latitude: item.elemLat,
                  longitude: item.elemLon,
                  cuisine: item.cuisine,
                  address: item.element.tags?.addr,
                  phone: item.element.tags?.phone,
                  website: item.element.tags?.website,
                  menu,
                  deliveryFee: Math.random() * 2 + 2.99,
                  eta: Math.floor(Math.random() * 15 + 15) + " mins",
                  image: restaurantImage,
                };
              })
            );

            restaurants = restaurants.concat(restaurantsWithImages);
            console.log(
              `✓ Successfully fetched ${restaurantsWithImages.length} restaurants with local images`
            );
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

    // 1. Try Overpass API first (best for local real restaurants)
    console.log("📡 Trying Overpass API for local real restaurants...");
    const overpassRestaurants = await fetchFromOverpass(lat, lon);
    if (overpassRestaurants && overpassRestaurants.length > 0) {
      const sorted = overpassRestaurants
        .sort(
          (a, b) =>
            calculateDistance(lat, lon, a.latitude, a.longitude) -
            calculateDistance(lat, lon, b.latitude, b.longitude)
        );
      console.log(`✅ Returning ${sorted.length} REAL restaurants from Overpass API (NOT hardcoded)`);
      return NextResponse.json(sorted); // Return ALL restaurants found
    }

    // 2. Google Places by user location, then save to Supabase
    console.log("🌐 Trying Google Places API...");
    const googleSuccess = await fetchFromGooglePlacesAndSave(lat, lon);
    if (googleSuccess) {
      console.log("✅ Google Places found restaurants, checking Supabase...");
    }

    // 3. Return restaurants from Supabase
    const supabaseRestaurants = await fetchFromSupabase();
    if (supabaseRestaurants && supabaseRestaurants.length > 0) {
      // Filter to only include restaurants within ~15.5 miles (25 km) radius
      const searchRadiusMiles = 15.5;
      const nearby = supabaseRestaurants.filter(
        (r) => calculateDistance(lat, lon, r.latitude, r.longitude) <= searchRadiusMiles
      );
      
      const sorted = nearby
        .map((r) => ({
          ...r,
          distance: calculateDistance(lat, lon, r.latitude, r.longitude),
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      console.log(`✅ Returning ${sorted.length} restaurants from Supabase (filtered to ${searchRadiusMiles} mile radius)`);
      return NextResponse.json(sorted); // Return ALL restaurants within range
    }

    // 4. No fallback: return empty list so client shows proper state.
    console.log("✅ No restaurants found in any API. Returning empty list.");
    return NextResponse.json([]);
  } catch (error) {
    console.error("🚨 Error in /api/restaurants/nearby:", error);
    return NextResponse.json([], { status: 500 });
  }
}
