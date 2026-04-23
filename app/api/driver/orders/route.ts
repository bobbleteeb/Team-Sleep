import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { getSupabaseServiceClient } from "../../../lib/supabaseService";

const ACTIVE_DRIVER_STATUSES = [
  "confirmed",
  "preparing",
  "ready",
  "arrived_at_restaurant",
  "picked_up",
  "in_transit",
  "arrived_at_customer",
];

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function getDriverByUserId(userId: string) {
  const client = getSupabaseServiceClient() ?? supabase;
  const { data: driver, error } = await client
    .from("drivers")
    .select("id, status, rating, total_deliveries, vehicle_info, license_number")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return driver;
}

// GET: /api/driver/orders -> list pending/unassigned orders
export async function GET(request: Request) {
  try {
    const client = getSupabaseServiceClient() ?? supabase;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    if (!isUuid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    let activeOrder: Record<string, unknown> | null = null;
    let driver: Record<string, unknown> | null = null;
    let stats = {
      todayEarnings: 0,
      totalEarnings: 0,
      completedDeliveries: 0,
      activeDeliveries: 0,
    };

    const driverData = await getDriverByUserId(userId);
    if (driverData?.id) {
      driver = driverData;

      const { data: activeOrderRows, error: activeError } = await client
        .from("orders")
        .select("id, delivery_address, items, total_price, status, created_at, eta, notes")
        .eq("driver_id", driverData.id)
        .in("status", ACTIVE_DRIVER_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1);

      if (activeError) throw activeError;
      activeOrder = activeOrderRows?.[0] ?? null;

      const { data: deliveredRows, error: deliveredError } = await client
        .from("orders")
        .select("total_price, created_at")
        .eq("driver_id", driverData.id)
        .eq("status", "delivered");

      if (deliveredError) throw deliveredError;

      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const delivered = deliveredRows ?? [];
      const totalEarnings = delivered.reduce(
        (sum, row) => sum + Number(row.total_price ?? 0),
        0
      );
      const todayEarnings = delivered.reduce((sum, row) => {
        const createdAt = row.created_at ? new Date(row.created_at) : null;
        if (createdAt && createdAt >= todayStart) {
          return sum + Number(row.total_price ?? 0);
        }
        return sum;
      }, 0);

      stats = {
        todayEarnings,
        totalEarnings,
        completedDeliveries: delivered.length,
        activeDeliveries: activeOrder ? 1 : 0,
      };
    }

    const { data, error } = await client
      .from("orders")
      .select("id, delivery_address, items, total_price, status, created_at, eta")
      .eq("status", "pending")
      .is("driver_id", null)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      orders: data ?? [],
      activeOrder,
      driver,
      stats,
      canAccept: activeOrder == null && (driver ? driver.status !== "offline" : true),
    });
  } catch (err) {
    console.error("Error fetching driver orders:", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

// POST: /api/driver/orders/accept -> body: { orderId, driverId (user id) }
export async function POST(request: Request) {
  try {
    const client = getSupabaseServiceClient() ?? supabase;
    const body = await request.json();
    const { orderId, userId } = body as { orderId?: string; userId?: string };
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    if (!isUuid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const driverData = await getDriverByUserId(userId);

    const driverUuid = driverData?.id;
    if (!driverUuid) {
      return NextResponse.json({ error: "No driver profile found for this user" }, { status: 400 });
    }

    if (driverData.status === "offline") {
      return NextResponse.json(
        { error: "Go online before accepting orders" },
        { status: 409 }
      );
    }

    // One-order-at-a-time: block accepts while this driver still has an active order.
    const { data: activeRows, error: activeError } = await client
      .from("orders")
      .select("id, status")
      .eq("driver_id", driverUuid)
      .in("status", ACTIVE_DRIVER_STATUSES)
      .limit(1);

    if (activeError) throw activeError;

    if (activeRows && activeRows.length > 0) {
      return NextResponse.json(
        { error: "Complete your current delivery before accepting another order" },
        { status: 409 }
      );
    }

    // Claim only pending/unassigned orders and move them to a valid next status.
    const { data, error } = await client
      .from("orders")
      .update({ driver_id: driverUuid, status: "confirmed" })
      .eq("id", orderId)
      .eq("status", "pending")
      .is("driver_id", null)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Order was already accepted or is no longer pending" },
        { status: 409 }
      );
    }

    await client
      .from("drivers")
      .update({ status: "busy", updated_at: new Date().toISOString() })
      .eq("id", driverUuid);

    return NextResponse.json({ success: true, order: data?.[0] ?? null });
  } catch (err) {
    console.error("Error accepting order:", err);
    return NextResponse.json({ error: "Failed to accept order" }, { status: 500 });
  }
}

// PATCH: /api/driver/orders -> body: { orderId, driverId, status }
export async function PATCH(request: Request) {
  try {
    const client = getSupabaseServiceClient() ?? supabase;
    const body = await request.json();
    const { orderId, userId, status } = body as {
      orderId?: string;
      userId?: string;
      status?: string;
      eta?: string;
      proofNote?: string;
      proofPhotoUrl?: string;
    };
    const eta = typeof body.eta === "string" ? body.eta.trim() : "";
    const proofNote = typeof body.proofNote === "string" ? body.proofNote.trim() : "";
    const proofPhotoUrl =
      typeof body.proofPhotoUrl === "string" ? body.proofPhotoUrl.trim() : "";

    if (!orderId || !userId || !status) {
      return NextResponse.json(
        { error: "orderId, userId, and status are required" },
        { status: 400 }
      );
    }
    if (!isUuid(userId)) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (
      ![
        "in_transit",
        "delivered",
        "cancelled",
        "arrived_at_restaurant",
        "picked_up",
        "arrived_at_customer",
      ].includes(status)
    ) {
      return NextResponse.json(
        { error: "Unsupported status transition" },
        { status: 400 }
      );
    }

    const { data: driverForUpdate, error: driverForUpdateError } = await client
      .from("drivers")
      .select("id, total_deliveries, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (driverForUpdateError) throw driverForUpdateError;

    const driverUuid = driverForUpdate?.id;
    if (!driverUuid) {
      return NextResponse.json({ error: "No driver profile found for this user" }, { status: 400 });
    }

    const notesParts = [
      proofNote ? `Proof note: ${proofNote}` : "",
      proofPhotoUrl ? `Proof photo URL: ${proofPhotoUrl}` : "",
      status === "delivered" ? `Delivered at: ${new Date().toISOString()}` : "",
    ].filter(Boolean);

    const updatePayload: { status: string; notes?: string; eta?: string } = { status };
    if (notesParts.length > 0) {
      updatePayload.notes = notesParts.join("\n");
    }
    if (eta) {
      updatePayload.eta = eta;
    }

    const { data, error } = await client
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .eq("driver_id", driverUuid)
      .select()
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Order not found for this driver" },
        { status: 404 }
      );
    }

    if (status === "delivered") {
      await client
        .from("drivers")
        .update({
          status: "available",
          total_deliveries: Number(driverForUpdate?.total_deliveries ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", driverUuid);
    }

    if (status === "cancelled") {
      await client
        .from("drivers")
        .update({ status: "available", updated_at: new Date().toISOString() })
        .eq("id", driverUuid);
    }

    return NextResponse.json({ success: true, order: data[0] });
  } catch (err) {
    console.error("Error updating driver order:", err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
