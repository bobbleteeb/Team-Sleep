import { NextResponse } from "next/server";
import { runOpenAIChat } from "../../../lib/openai";

type DriverOrder = {
  id: string;
  delivery_address: string;
  items?: Array<{ name: string; qty?: number; quantity?: number }>;
  total_price?: number;
  status?: string;
};

const ALLOWED_INTENTS = [
  "eta_update",
  "cannot_reach_customer",
  "arrival_message",
  "delay_notice",
  "custom",
] as const;

type Intent = (typeof ALLOWED_INTENTS)[number];

export async function POST(request: Request) {
  const body = (await request.json()) as {
    intent?: string;
    driverName?: string;
    customPrompt?: string;
    activeOrder?: DriverOrder | null;
  };

  const rawIntent = body.intent?.trim() as Intent | undefined;
  const intent: Intent = rawIntent && ALLOWED_INTENTS.includes(rawIntent) ? rawIntent : "custom";
  const driverName = body.driverName?.trim() || "your driver";
  const customPrompt = body.customPrompt?.trim() || "";
  const activeOrder = body.activeOrder;

  const orderSummary = activeOrder
    ? `Order ID: ${activeOrder.id}\nAddress: ${activeOrder.delivery_address}\nStatus: ${activeOrder.status ?? "confirmed"}\nItems: ${(activeOrder.items || [])
        .map((it) => `${it.qty ?? it.quantity ?? 1}x ${it.name}`)
        .join(", ") || "N/A"}`
    : "No active order selected";

  const intentGuide: Record<Intent, string> = {
    eta_update: "Create a short customer message with a realistic ETA update.",
    cannot_reach_customer: "Create a polite message saying you are trying to reach them and asking for quick contact.",
    arrival_message: "Create a short arrival message asking them to meet or confirm dropoff preference.",
    delay_notice: "Create a clear apology and delay reason with revised ETA.",
    custom: "Create a concise and professional delivery-related message based on the custom prompt.",
  };

  const userPrompt = [
    `Driver Name: ${driverName}`,
    `Intent: ${intent}`,
    `Intent Goal: ${intentGuide[intent]}`,
    `Order Context:\n${orderSummary}`,
    customPrompt ? `Custom Notes: ${customPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `You are a delivery driver copilot assistant for QuickBite.

Rules:
1. Write one ready-to-send message for a customer.
2. Keep it concise (1-3 sentences).
3. Tone must be polite, clear, and professional.
4. Do not invent sensitive facts.
5. Return plain text only. No JSON, no markdown, no quotes around the whole message.`;

  try {
    const message = await runOpenAIChat({
      modelFallback: "gpt-4.1",
      temperature: 0.4,
      maxTokens: 180,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate driver message" },
      { status: 500 }
    );
  }
}
