import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import type { CartItem } from "../../context/CartContext";
import { calculatePromoDiscount } from "../../lib/promo";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    userId?: string;
    customerId?: string;
    restaurantId?: string | number;
    restaurantSnapshot?: {
      name?: string;
      cuisine?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      deliveryFee?: number;
      eta?: string;
      image?: string;
    };
    items?: CartItem[];
    totalPrice?: number;
    deliveryFee?: number;
    tip?: number;
    promoCode?: string;
    deliveryAddress?: string;
    dropoffInstructions?: string;
  };
  const {
    userId,
    customerId,
    restaurantId,
    restaurantSnapshot,
    items,
    totalPrice,
    deliveryFee,
    tip,
    promoCode,
    deliveryAddress,
    dropoffInstructions,
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

    // Ensure restaurant_id is a UUID. If the client passed a non-UUID (e.g. OSM numeric id),
    // resolve/create a restaurant row using the provided snapshot.
    let resolvedRestaurantId = String(restaurantId);
    if (!isUuid(resolvedRestaurantId)) {
      const name = restaurantSnapshot?.name?.trim();
      if (!name) {
        return NextResponse.json(
          { error: "Invalid restaurantId (UUID required) and restaurantSnapshot.name missing" },
          { status: 400 }
        );
      }

      const { data: existing, error: existingError } = await supabase
        .from("restaurants")
        .select("id")
        .ilike("name", name)
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing?.id) {
        resolvedRestaurantId = String(existing.id);
      } else {
        const cuisine = restaurantSnapshot?.cuisine?.trim() || "Restaurant";
        const address = restaurantSnapshot?.address?.trim() || "Unknown address";
        const etaText = restaurantSnapshot?.eta?.trim() || "30-45 mins";
        const deliveryFeeValue = Number.isFinite(restaurantSnapshot?.deliveryFee)
          ? Number(restaurantSnapshot?.deliveryFee)
          : normalizedDeliveryFee;

        const { data: inserted, error: insertError } = await supabase
          .from("restaurants")
          .insert({
            name,
            cuisine,
            address,
            latitude: Number.isFinite(restaurantSnapshot?.latitude)
              ? Number(restaurantSnapshot?.latitude)
              : null,
            longitude: Number.isFinite(restaurantSnapshot?.longitude)
              ? Number(restaurantSnapshot?.longitude)
              : null,
            delivery_fee: deliveryFeeValue,
            eta: etaText,
            image: restaurantSnapshot?.image ?? null,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        resolvedRestaurantId = String(inserted.id);
      }
    }

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

    const baseInsert = {
      customer_id: customerId,
      restaurant_id: resolvedRestaurantId,
      items,
      total_price: finalTotal,
      delivery_fee: normalizedDeliveryFee,
      status: "pending",
      delivery_address: deliveryAddress,
    } as const;

    // Newer schema: persist tip + dropoff instructions.
    // Backward-compatible fallback: if DB hasn't been migrated yet (missing columns),
    // retry without the new fields so checkout still works.
    const insertWithExtras = {
      ...baseInsert,
      tip: normalizedTip,
      dropoff_instructions: dropoffInstructions?.trim() || null,
    };

    let created: { id: string } | null = null;

    const attempt1 = await supabase
      .from("orders")
      .insert(insertWithExtras)
      .select("id")
      .single();

    if (!attempt1.error) {
      created = attempt1.data ?? null;
    } else {
      const msg = String((attempt1.error as { message?: unknown })?.message ?? "");
      const isMissingColumn =
        msg.includes('column "tip"') ||
        msg.includes('column "dropoff_instructions"') ||
        msg.includes("does not exist");

      if (!isMissingColumn) {
        throw attempt1.error;
      }

      const attempt2 = await supabase
        .from("orders")
        .insert(baseInsert)
        .select("id")
        .single();

      if (attempt2.error) throw attempt2.error;
      created = attempt2.data ?? null;
    }

    return NextResponse.json({ success: true, orderId: created?.id ?? null });
  } catch (err) {
    console.error("Error creating order:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create order" },
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
