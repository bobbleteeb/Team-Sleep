import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import type { CartItem } from "../../context/CartContext";
import { calculatePromoDiscount } from "../../lib/promo";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    userId?: string;
    customerId?: string;
    restaurantId?: string | number;
    items?: CartItem[];
    totalPrice?: number;
    deliveryFee?: number;
    tip?: number;
    promoCode?: string;
    deliveryAddress?: string;
  };
  const {
    userId,
    customerId,
    restaurantId,
    items,
    totalPrice,
    deliveryFee,
    tip,
    promoCode,
    deliveryAddress,
  } = body;

  if (!userId || !customerId || !restaurantId || !items || !deliveryAddress) {
    return NextResponse.json(
      { error: "userId, customerId, restaurantId, items, and deliveryAddress required" },
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

    const subtotal = Number.isFinite(totalPrice) ? Number(totalPrice) : 0;
    const normalizedDeliveryFee = Number.isFinite(deliveryFee) ? Number(deliveryFee) : 2.5;
    const normalizedTip = Number.isFinite(tip) ? Number(tip) : 0;

    let promoDiscount = 0;
    if (promoCode?.trim()) {
      const { count, error: countError } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", customerId);
      if (countError) throw countError;

      const promoResult = calculatePromoDiscount(promoCode, subtotal, normalizedDeliveryFee, {
        isFirstOrder: (count ?? 0) === 0,
      });
      if (!promoResult.valid) {
        return NextResponse.json({ error: promoResult.error ?? "Invalid promo code." }, { status: 400 });
      }
      promoDiscount = promoResult.discount;
    }

    const finalTotal = Math.max(0, subtotal + normalizedDeliveryFee + normalizedTip - promoDiscount);

    const { error } = await supabase.from("orders").insert({
      customer_id: customerId,
      restaurant_id: String(restaurantId),
      items,
      total_price: finalTotal,
      delivery_fee: normalizedDeliveryFee,
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

  if (!resolvedCustomerId || !userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", resolvedCustomerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!customer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
