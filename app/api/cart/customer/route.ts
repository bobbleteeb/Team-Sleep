import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const { data: customer, error } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (customer?.id) {
      return NextResponse.json({ customerId: customer.id });
    }

    const { data: newCustomer, error: createError } = await supabase
      .from("customers")
      .upsert([{ user_id: userId }], { onConflict: "user_id" })
      .select("id")
      .single();

    if (createError) {
      throw createError;
    }

    return NextResponse.json({ customerId: newCustomer?.id ?? null });
  } catch (err) {
    console.error("Error resolving customer:", err);
    return NextResponse.json(
      {
        error: "Failed to resolve customer",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
