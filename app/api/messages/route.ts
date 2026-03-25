import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

type OrderParty = {
  customerUserId: string | null;
  driverUserId: string | null;
};

async function getOrderParty(orderId: string): Promise<OrderParty | null> {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, customer_id, driver_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) return null;

  let customerUserId: string | null = null;
  let driverUserId: string | null = null;

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("user_id")
    .eq("id", order.customer_id)
    .maybeSingle();

  if (customerError) throw customerError;
  customerUserId = customer?.user_id ?? null;

  if (order.driver_id) {
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("user_id")
      .eq("id", order.driver_id)
      .maybeSingle();

    if (driverError) throw driverError;
    driverUserId = driver?.user_id ?? null;
  }

  return { customerUserId, driverUserId };
}

function canAccessOrder(party: OrderParty | null, userId: string): boolean {
  if (!party) return false;
  return party.customerUserId === userId || party.driverUserId === userId;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const userId = searchParams.get("userId");

    if (!orderId || !userId) {
      return NextResponse.json({ error: "orderId and userId are required" }, { status: 400 });
    }

    const party = await getOrderParty(orderId);
    if (!canAccessOrder(party, userId)) {
      return NextResponse.json({ error: "You cannot access messages for this order" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("order_messages")
      .select("id, order_id, sender_user_id, sender_role, content, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ messages: data ?? [] });
  } catch (err) {
    console.error("Error fetching order messages:", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      orderId?: string;
      userId?: string;
      senderRole?: "customer" | "driver";
      content?: string;
    };

    const orderId = body.orderId?.trim();
    const userId = body.userId?.trim();
    const senderRole = body.senderRole;
    const content = body.content?.trim();

    if (!orderId || !userId || !senderRole || !content) {
      return NextResponse.json(
        { error: "orderId, userId, senderRole and content are required" },
        { status: 400 }
      );
    }

    if (!["customer", "driver"].includes(senderRole)) {
      return NextResponse.json({ error: "Invalid senderRole" }, { status: 400 });
    }

    const party = await getOrderParty(orderId);
    if (!party) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!canAccessOrder(party, userId)) {
      return NextResponse.json({ error: "You cannot message for this order" }, { status: 403 });
    }

    const roleMatches =
      (senderRole === "customer" && party.customerUserId === userId) ||
      (senderRole === "driver" && party.driverUserId === userId);

    if (!roleMatches) {
      return NextResponse.json({ error: "Sender role does not match this order" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("order_messages")
      .insert({
        order_id: orderId,
        sender_user_id: userId,
        sender_role: senderRole,
        content,
      })
      .select("id, order_id, sender_user_id, sender_role, content, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, message: data });
  } catch (err) {
    console.error("Error creating order message:", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
