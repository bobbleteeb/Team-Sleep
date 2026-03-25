import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const ACTIVE_DRIVER_STATUSES = ["confirmed", "preparing", "ready", "in_transit"];

// GET: /api/driver/orders -> list pending/unassigned orders
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverUserId = searchParams.get("driverId");

    let activeOrder: Record<string, unknown> | null = null;
    let driver: Record<string, unknown> | null = null;
    let stats = {
      todayEarnings: 0,
      totalEarnings: 0,
      completedDeliveries: 0,
      activeDeliveries: 0,
    };

    if (driverUserId) {
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, status, rating, total_deliveries, vehicle_info, license_number")
        .eq("user_id", driverUserId)
        .maybeSingle();

      if (driverError) throw driverError;

      if (driverData?.id) {
        driver = driverData;

        const { data: activeOrderRows, error: activeError } = await supabase
          .from("orders")
          .select("id, delivery_address, items, total_price, status, created_at")
          .eq("driver_id", driverData.id)
          .in("status", ACTIVE_DRIVER_STATUSES)
          .order("created_at", { ascending: false })
          .limit(1);

        if (activeError) throw activeError;
        activeOrder = activeOrderRows?.[0] ?? null;

        const { data: deliveredRows, error: deliveredError } = await supabase
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
    }

    const { data, error } = await supabase
      .from("orders")
      .select("id, delivery_address, items, total_price, status, created_at")
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
    const body = await request.json();
    const { orderId, driverId } = body as { orderId?: string; driverId?: string };
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    if (!driverId) {
      return NextResponse.json({ error: "driverId (your user id) required in this demo" }, { status: 400 });
    }

    // Find the driver record that matches the provided user id
    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select("id, status")
      .eq("user_id", driverId)
      .maybeSingle();

    if (driverError) throw driverError;

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
    const { data: activeRows, error: activeError } = await supabase
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
    const { data, error } = await supabase
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

    await supabase
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
    const body = await request.json();
    const { orderId, driverId, status } = body as {
      orderId?: string;
      driverId?: string;
      status?: string;
      proofNote?: string;
      proofPhotoUrl?: string;
    };
    const proofNote = typeof body.proofNote === "string" ? body.proofNote.trim() : "";
    const proofPhotoUrl =
      typeof body.proofPhotoUrl === "string" ? body.proofPhotoUrl.trim() : "";

    if (!orderId || !driverId || !status) {
      return NextResponse.json(
        { error: "orderId, driverId, and status are required" },
        { status: 400 }
      );
    }

    if (!["in_transit", "delivered", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Unsupported status transition" },
        { status: 400 }
      );
    }

    const { data: driverData, error: driverError } = await supabase
      .from("drivers")
      .select("id, total_deliveries")
      .eq("user_id", driverId)
      .maybeSingle();

    if (driverError) throw driverError;

    const driverUuid = driverData?.id;
    if (!driverUuid) {
      return NextResponse.json({ error: "No driver profile found for this user" }, { status: 400 });
    }

    const notesParts = [
      proofNote ? `Proof note: ${proofNote}` : "",
      proofPhotoUrl ? `Proof photo URL: ${proofPhotoUrl}` : "",
      status === "delivered" ? `Delivered at: ${new Date().toISOString()}` : "",
    ].filter(Boolean);

    const updatePayload: { status: string; notes?: string } = { status };
    if (notesParts.length > 0) {
      updatePayload.notes = notesParts.join("\n");
    }

    const { data, error } = await supabase
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
      await supabase
        .from("drivers")
        .update({
          status: "available",
          total_deliveries: Number(driverData.total_deliveries ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", driverUuid);
    }

    if (status === "cancelled") {
      await supabase
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
