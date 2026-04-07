import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import type { CartItem } from "../../context/CartContext";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    customerId?: string;
    restaurantId?: string | number;
    items?: CartItem[];
    totalPrice?: number;
    deliveryFee?: number;
    deliveryAddress?: string;
  };
  const { customerId, restaurantId, items, totalPrice, deliveryFee, deliveryAddress } = body;

  if (!customerId || !restaurantId || !items || !deliveryAddress) {
    return NextResponse.json(
      { error: "customerId, restaurantId, items, and deliveryAddress required" },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase.from("orders").insert({
      customer_id: customerId,
      restaurant_id: String(restaurantId),
      items,
      total_price: totalPrice ?? 0,
      delivery_fee: deliveryFee ?? 2.5,
      status: "pending",
      delivery_address: deliveryAddress,
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error creating order:", err);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const userId = searchParams.get("userId");

  let resolvedCustomerId = customerId;

  if (!resolvedCustomerId && userId) {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (customerError) {
      console.error("Error resolving customer by user id:", customerError);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 }
      );
    }

    resolvedCustomerId = customer?.id ?? null;
  }

  if (!resolvedCustomerId) {
    return NextResponse.json({ error: "customerId or userId required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", resolvedCustomerId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ orders: data ?? [] });
  } catch (err) {
    console.error("Error fetching orders:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
