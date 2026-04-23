import { NextResponse } from "next/server";
import { supabase } from "../../../../lib/supabase";
import { getSupabaseServiceClient } from "../../../../lib/supabaseService";

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

export async function GET(request: Request) {
  try {
    const client = getSupabaseServiceClient() ?? supabase;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    if (!isUuid(userId)) return NextResponse.json({ error: "Invalid userId" }, { status: 400 });

    const driver = await getDriverByUserId(userId);
    if (!driver?.id) {
      return NextResponse.json({ error: "No driver profile found for this user" }, { status: 400 });
    }

    const driverId = driver.id as string;

    const { data: activeRows, error: activeError } = await client
      .from("orders")
      .select("id, delivery_address, items, total_price, status, created_at, eta, notes")
      .eq("driver_id", driverId)
      .in("status", ACTIVE_DRIVER_STATUSES)
      .order("created_at", { ascending: false })
      .limit(1);
    if (activeError) throw activeError;
    const activeOrder = activeRows?.[0] ?? null;

    const { data: historyRows, error: historyError } = await client
      .from("orders")
      .select("id, delivery_address, items, total_price, status, created_at, eta, notes")
      .eq("driver_id", driverId)
      .in("status", ["delivered", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (historyError) throw historyError;

    return NextResponse.json({
      driver,
      activeOrder,
      orders: historyRows ?? [],
    });
  } catch (err) {
    console.error("Error fetching driver order history:", err);
    return NextResponse.json({ error: "Failed to fetch driver orders" }, { status: 500 });
  }
}

