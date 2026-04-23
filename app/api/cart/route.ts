import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const userId = searchParams.get("userId");

  if (!customerId || !userId) {
    return NextResponse.json({ error: "customerId and userId required" }, { status: 400 });
  }

  try {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!customer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("carts")
      .select("items")
      .eq("customer_id", customerId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({ items: data?.items ?? [] });
  } catch (err) {
    console.error("Error fetching cart:", err);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    customerId?: string;
    userId?: string;
    restaurantId?: string;
    items?: unknown[];
  };
  const { customerId, userId, restaurantId, items } = body;

  if (!customerId || !userId || !restaurantId) {
    return NextResponse.json(
      { error: "customerId, userId and restaurantId required" },
      { status: 400 }
    );
  }

  try {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!customer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.from("carts").upsert(
      {
        customer_id: customerId,
        restaurant_id: restaurantId,
        items: items ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "customer_id" }
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error saving cart:", err);
    return NextResponse.json(
      { error: "Failed to save cart" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const userId = searchParams.get("userId");

  if (!customerId || !userId) {
    return NextResponse.json({ error: "customerId and userId required" }, { status: 400 });
  }

  try {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!customer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("carts")
      .delete()
      .eq("customer_id", customerId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting cart:", err);
    return NextResponse.json(
      { error: "Failed to delete cart" },
      { status: 500 }
    );
  }
}
