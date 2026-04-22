import { NextResponse } from "next/server";
import { runOpenAIChat } from "../../lib/openai";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  image: string;
}

interface Restaurant {
  id: number;
  name: string;
  cuisine?: string;
  latitude: number;
  longitude: number;
  menu: MenuItem[];
  deliveryFee: number;
  eta: string;
  image: string;
}

type FoodSearchResult = {
  name: string;
  address?: string;
  rating?: number;
  latitude: number;
  longitude: number;
  distanceMiles: number;
};

function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
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

function extractFoodQuery(message: string): string | null {
  const text = message.toLowerCase();
  const patterns = [
    /(?:find|search|look for|show me|get me)\s+([a-z\s]+?)(?:\s+(?:near me|nearby|close|around here))?$/i,
    /(?:any|where can i get|i want)\s+([a-z\s]+?)(?:\s+(?:near me|nearby|close|around here))?$/i,
    /([a-z\s]+?)\s+(?:near me|nearby|close|around here)$/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return match[1].trim().toLowerCase();
    }
  }

  if (text.includes("near me") || text.includes("nearby") || text.includes("close")) {
    const words = text.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
    const stopWords = new Set([
      "find",
      "search",
      "look",
      "for",
      "show",
      "me",
      "get",
      "any",
      "where",
      "can",
      "i",
      "want",
      "near",
      "nearby",
      "close",
      "around",
      "here",
      "food",
      "place",
      "places",
      "restaurant",
      "restaurants",
    ]);
    const filtered = words.filter((word) => !stopWords.has(word));
    return filtered.length > 0 ? filtered.join(" ") : null;
  }

  return null;
}

function hasMenuMatches(menuData: Restaurant[], foodQuery: string): boolean {
  const needle = foodQuery.toLowerCase();
  return menuData.some(
    (restaurant) =>
      restaurant.cuisine?.toLowerCase().includes(needle) ||
      restaurant.name.toLowerCase().includes(needle) ||
      restaurant.menu.some((item) => item.name.toLowerCase().includes(needle))
  );
}

async function searchGoogleFoodPlaces(
  foodQuery: string,
  latitude: number,
  longitude: number
): Promise<FoodSearchResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return [];

  const radii = [5000, 15000];
  for (const radius of radii) {
    const endpoint =
      "https://maps.googleapis.com/maps/api/place/textsearch/json" +
      `?query=${encodeURIComponent(`${foodQuery} restaurants`)}` +
      `&location=${latitude},${longitude}` +
      `&radius=${radius}` +
      `&key=${apiKey}`;

    const response = await fetch(endpoint, { cache: "no-store" });
    if (!response.ok) continue;

    const data = (await response.json()) as {
      status?: string;
      results?: Array<{
        name?: string;
        formatted_address?: string;
        rating?: number;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    };

    if (data.status && !["OK", "ZERO_RESULTS"].includes(data.status)) continue;

    const matches = (data.results || [])
      .filter(
        (result) =>
          typeof result.name === "string" &&
          typeof result.geometry?.location?.lat === "number" &&
          typeof result.geometry?.location?.lng === "number"
      )
      .map((result) => {
        const lat = result.geometry?.location?.lat as number;
        const lon = result.geometry?.location?.lng as number;
        return {
          name: result.name as string,
          address: result.formatted_address,
          rating: result.rating,
          latitude: lat,
          longitude: lon,
          distanceMiles: calculateDistanceMiles(latitude, longitude, lat, lon),
        };
      })
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, 5);

    if (matches.length > 0) {
      return matches;
    }
  }

  return [];
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    message?: string;
    menuData?: Restaurant[];
    currentCart?: Array<{ name: string; quantity: number; price: number }>;
    messages?: Array<{ role: string; content: string }>;
    userLocation?: { latitude?: number; longitude?: number } | null;
  };

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  // Build menu context from provided data
  const menuData = body.menuData || [];
  const menuContext = menuData
    .map(
      (restaurant) =>
        `${restaurant.name} (${restaurant.cuisine || "Restaurant"}): ${restaurant.menu
          .map((item) => `${item.name} - $${item.price.toFixed(2)}`)
          .join(", ")}`
    )
    .join("\n");

  const cartSummary = body.currentCart
    ? body.currentCart.map((item) => `${item.quantity}x ${item.name}`).join(", ")
    : "empty";

  const foodQuery = extractFoodQuery(message);
  const hasLocalFoodMatches =
    foodQuery && menuData.length > 0 ? hasMenuMatches(menuData, foodQuery) : false;
  const lat = body.userLocation?.latitude;
  const lon = body.userLocation?.longitude;

  if (
    foodQuery &&
    !hasLocalFoodMatches &&
    typeof lat === "number" &&
    typeof lon === "number"
  ) {
    const nearbyMatches = await searchGoogleFoodPlaces(foodQuery, lat, lon);
    if (nearbyMatches.length > 0) {
      const lines = nearbyMatches.map((place, index) => {
        const ratingText =
          typeof place.rating === "number" ? ` • ⭐ ${place.rating.toFixed(1)}` : "";
        const addressText = place.address ? ` • ${place.address}` : "";
        return `${index + 1}. ${place.name} (${place.distanceMiles.toFixed(1)} mi${ratingText})${addressText}`;
      });

      return NextResponse.json({
        reply:
          `I could not find "${foodQuery}" in nearby QuickBite menus, so I rechecked your location and found these closest options:\n` +
          `${lines.join("\n")}\n` +
          "Tap a card to open directions, or ask me to find a similar item available in QuickBite.",
        fallbackPlaces: nearbyMatches,
      });
    }
  }

  const systemPrompt = `You are a helpful food delivery assistant for QuickBite.

INSTRUCTIONS:
1. Understand user intent quickly - if they mention pizza, burger, etc., they want to add that item
2. When user confirms they want to add something (yes, okay, add it, sure, etc.) - extract the item and restaurant and RESPOND WITH ONLY the JSON action
3. Always confirm the item name and restaurant before adding to cart
4. Match item names EXACTLY as they appear in the menus below

ACTION RESPONSES (respond ONLY with JSON when adding items or placing orders):
- Add to cart: {"action":"add_to_cart","restaurant":"<exact restaurant name>","items":[{"name":"<exact item name>","quantity":<number>}]}
- Place order: {"action":"place_order","delivery_address":"<confirmed address>"}

CONVERSATION FLOW:
1. User mentions food -> Show them options from the available menus
2. User confirms they want an item -> Return ONLY the JSON action (no other text)
3. System will confirm success with "✓ Added X items to cart!"

Available Menus:
${menuContext}

Current Cart: ${cartSummary}`;

  try {
    const reply = await runOpenAIChat({
      modelFallback: "gpt-4",
      temperature: 0.7,
      maxTokens: 300,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...(body.messages || []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user",
          content: message,
        },
      ],
    });

    // Try to extract JSON action from response
    let action = null;
    try {
      // Look for JSON object in the response
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        action = JSON.parse(jsonStr);
        // If this is an action response, only return the action (no user-friendly text)
        if (action?.action === "add_to_cart" || action?.action === "place_order") {
          return NextResponse.json({ reply: "", action });
        }
      }
    } catch (err) {
      // JSON parse failed, continue with regular reply
      console.error("JSON parse error:", err);
    }

    return NextResponse.json({ reply, action });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat", details: String(error) },
      { status: 500 }
    );
  }
}
