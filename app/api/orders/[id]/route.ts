import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabase } from "../../../lib/supabase";

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

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("user_id")
    .eq("id", order.customer_id)
    .maybeSingle();
  if (customerError) throw customerError;

  let driverUserId: string | null = null;
  if (order.driver_id) {
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("user_id")
      .eq("id", order.driver_id)
      .maybeSingle();
    if (driverError) throw driverError;
    driverUserId = driver?.user_id ?? null;
  }

  return { customerUserId: customer?.user_id ?? null, driverUserId };
}

function canAccessOrder(party: OrderParty | null, userId: string): boolean {
  if (!party) return false;
  return party.customerUserId === userId || party.driverUserId === userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const party = await getOrderParty(orderId);
    if (!canAccessOrder(party, userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, restaurant_id, items, total_price, delivery_address, status, created_at, eta, notes, driver_id, tip, dropoff_instructions"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let driverName: string | null = null;
    if (order.driver_id) {
      const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .select("id, user_id")
        .eq("id", order.driver_id)
        .maybeSingle();
      if (driverError) throw driverError;

      if (driver?.user_id) {
        const { data: userRow, error: userError } = await supabase
          .from("users")
          .select("name")
          .eq("id", driver.user_id)
          .maybeSingle();
        if (userError) throw userError;
        driverName = userRow?.name ?? null;
      }
    }

    return NextResponse.json({
      id: order.id,
      restaurant_id: String(order.restaurant_id),
      items: order.items ?? [],
      total_price: Number(order.total_price ?? 0),
      delivery_address: order.delivery_address,
      status: order.status,
      created_at: order.created_at,
      driver: driverName,
      eta: order.eta ?? null,
      notes: order.notes ?? null,
      tip: Number(order.tip ?? 0),
      dropoffInstructions: order.dropoff_instructions ?? null,
    });
  } catch (err) {
    console.error("Error fetching order by id:", err);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      userId?: string;
      tip?: number;
      dropoffInstructions?: string;
    };

    const userId = body.userId?.trim();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const party = await getOrderParty(orderId);
    if (!party) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (party.customerUserId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total_price, tip, status")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (order.status === "delivered" || order.status === "cancelled") {
      return NextResponse.json({ error: "Order can no longer be updated" }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if (typeof body.tip !== "undefined") {
      const nextTip = Number.isFinite(body.tip) ? Math.max(0, Number(body.tip)) : 0;
      const prevTip = Number.isFinite(order.tip) ? Number(order.tip) : 0;
      const prevTotal = Number.isFinite(order.total_price) ? Number(order.total_price) : 0;
      const nextTotal = Math.max(0, prevTotal - prevTip + nextTip);
      patch.tip = nextTip;
      patch.total_price = nextTotal;
    }

    if (typeof body.dropoffInstructions !== "undefined") {
      patch.dropoff_instructions = body.dropoffInstructions?.trim() || null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update(patch)
      .eq("id", orderId)
      .select("id, total_price, tip, dropoff_instructions")
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      order: {
        id: updated.id,
        total_price: Number(updated.total_price ?? 0),
        tip: Number(updated.tip ?? 0),
        dropoffInstructions: updated.dropoff_instructions ?? null,
      },
    });
  } catch (err) {
    console.error("Error updating order:", err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
