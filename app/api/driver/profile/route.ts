import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

const ACTIVE_DRIVER_STATUSES = ["confirmed", "preparing", "ready", "in_transit"];

async function getDriverByUserId(userId: string) {
  const { data: driver, error } = await supabase
    .from("drivers")
    .select("id, user_id, vehicle_info, license_number, status, rating, total_deliveries")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return driver;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get("driverId");

    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }

    const driver = await getDriverByUserId(driverId);

    if (!driver) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    return NextResponse.json({ driver });
  } catch (err) {
    console.error("Error fetching driver profile:", err);
    return NextResponse.json({ error: "Failed to fetch driver profile" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      driverId?: string;
      online?: boolean;
      vehicleInfo?: string;
      licenseNumber?: string;
    };

    const { driverId, online, vehicleInfo, licenseNumber } = body;

    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }

    const driver = await getDriverByUserId(driverId);

    if (!driver) {
      return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    }

    if (online === false) {
      // Prevent going offline while currently delivering.
      const { data: activeRows, error: activeError } = await supabase
        .from("orders")
        .select("id")
        .eq("driver_id", driver.id)
        .in("status", ACTIVE_DRIVER_STATUSES)
        .limit(1);

      if (activeError) throw activeError;

      if (activeRows && activeRows.length > 0) {
        return NextResponse.json(
          { error: "Complete your active delivery before going offline" },
          { status: 409 }
        );
      }
    }

    const payload: {
      status?: "available" | "offline";
      vehicle_info?: string;
      license_number?: string;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (typeof online === "boolean") {
      payload.status = online ? "available" : "offline";
    }

    if (typeof vehicleInfo === "string") {
      payload.vehicle_info = vehicleInfo.trim();
    }

    if (typeof licenseNumber === "string") {
      payload.license_number = licenseNumber.trim();
    }

    const { data, error } = await supabase
      .from("drivers")
      .update(payload)
      .eq("id", driver.id)
      .select("id, user_id, vehicle_info, license_number, status, rating, total_deliveries")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, driver: data });
  } catch (err) {
    console.error("Error updating driver profile:", err);
    return NextResponse.json({ error: "Failed to update driver profile" }, { status: 500 });
  }
}
