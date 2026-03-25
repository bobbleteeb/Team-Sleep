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

export async function POST(request: Request) {
  const body = (await request.json()) as {
    message?: string;
    menuData?: Restaurant[];
    currentCart?: Array<{ name: string; quantity: number; price: number }>;
    messages?: Array<{ role: string; content: string }>;
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
