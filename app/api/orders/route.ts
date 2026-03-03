import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import type { CartItem } from "../../context/CartContext";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    customerId?: string;
    restaurantId?: string;
    items?: CartItem[];
    totalPrice?: number;
    deliveryAddress?: string;
  };
  const { customerId, restaurantId, items, totalPrice, deliveryAddress } = body;

  if (!customerId || !restaurantId || !items || !deliveryAddress) {
    return NextResponse.json(
      { error: "customerId, restaurantId, items, and deliveryAddress required" },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase.from("orders").insert({
      customer_id: customerId,
      restaurant_id: restaurantId,
      items,
      total_price: totalPrice ?? 0,
      delivery_fee: 2.5, // Default fee, should come from request
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

  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
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
