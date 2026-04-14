import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    email?: string;
    password?: string;
    name?: string;
    role?: string;
  };
  const { action, email, password, name, role } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );
  }

  if (action === "signup") {
    if (!name || !role || !["customer", "driver"].includes(role)) {
      return NextResponse.json(
        { error: "Name and valid role (customer/driver) required" },
        { status: 400 }
      );
    }

    try {
      // Create user
      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          email,
          password_hash: await bcrypt.hash(password, 12),
          name,
          role,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create customer or driver profile
      if (role === "customer") {
        await supabase.from("customers").insert({
          user_id: user.id,
        });
      } else if (role === "driver") {
        await supabase.from("drivers").insert({
          user_id: user.id,
        });
      }

      const { password_hash, ...safeUser } = user;
      void password_hash;
      return NextResponse.json({ user: safeUser, success: true }, { status: 201 });
    } catch (err) {
      console.error("Signup error:", err);
      return NextResponse.json({ error: "Signup failed" }, { status: 500 });
    }
  } else if (action === "login") {
    try {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        );
      }

      const { password_hash, ...safeUser } = user;
      void password_hash;
      return NextResponse.json({ user: safeUser, success: true });
    } catch (err) {
      console.error("Login error:", err);
      return NextResponse.json({ error: "Login failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
