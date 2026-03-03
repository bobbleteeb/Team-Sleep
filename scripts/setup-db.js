/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log("🔧 Setting up database schema...\n");

    // Create restaurants table
    console.log("📋 Creating restaurants table...");
    const { error: restaurantsError } = await supabase.rpc(
      "exec",
      {
        sql: `
          CREATE TABLE IF NOT EXISTS public.restaurants (
            id BIGSERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            cuisine TEXT,
            latitude DECIMAL(10, 8) NOT NULL,
            longitude DECIMAL(11, 8) NOT NULL,
            address TEXT,
            phone TEXT,
            website TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            CONSTRAINT restaurants_name_unique UNIQUE (name)
          );

          CREATE INDEX IF NOT EXISTS restaurants_location ON restaurants(latitude, longitude);
          ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

          CREATE POLICY "Allow public read" ON public.restaurants 
            FOR SELECT USING (true);
          CREATE POLICY "Allow authenticated insert" ON public.restaurants 
            FOR INSERT WITH CHECK (true);
          CREATE POLICY "Allow authenticated update" ON public.restaurants 
            FOR UPDATE USING (true);
          CREATE POLICY "Allow authenticated delete" ON public.restaurants 
            FOR DELETE USING (true);
        `,
      }
    );

    // For Supabase SQL, we need to use a different approach
    // Let's use the raw SQL endpoint
    console.log("✅ Creating tables via SQL...");

    const sqlStatements = [
      `
        CREATE TABLE IF NOT EXISTS public.restaurants (
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          cuisine TEXT,
          latitude DECIMAL(10, 8) NOT NULL,
          longitude DECIMAL(11, 8) NOT NULL,
          address TEXT,
          phone TEXT,
          website TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `,
      `
        CREATE TABLE IF NOT EXISTS public.menus (
          id BIGSERIAL PRIMARY KEY,
          restaurant_id BIGINT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          price DECIMAL(10, 2) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `,
      `
        CREATE INDEX IF NOT EXISTS restaurants_location ON public.restaurants(latitude, longitude);
      `,
      `
        CREATE INDEX IF NOT EXISTS menus_restaurant ON public.menus(restaurant_id);
      `,
    ];

    console.log("✖️  Direct SQL via RPC not available in this setup");
    console.log("\n📌 Please run this SQL in your Supabase dashboard:");
    console.log("   Go to: SQL Editor → New Query → Paste below:\n");

    console.log(`
-- Create restaurants table
CREATE TABLE IF NOT EXISTS public.restaurants (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  cuisine TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create menus table
CREATE TABLE IF NOT EXISTS public.menus (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id BIGINT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS restaurants_location ON public.restaurants(latitude, longitude);
CREATE INDEX IF NOT EXISTS menus_restaurant ON public.menus(restaurant_id);

-- Enable RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read" ON public.restaurants 
  FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert" ON public.restaurants 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON public.restaurants 
  FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated delete" ON public.restaurants 
  FOR DELETE USING (true);

CREATE POLICY "Allow public read menus" ON public.menus 
  FOR SELECT USING (true);
CREATE POLICY "Allow authenticated insert menus" ON public.menus 
  FOR INSERT WITH CHECK (true);
    `);

    process.exit(0);
  } catch (error) {
    console.error("🚨 Setup failed:", error);
    process.exit(1);
  }
}

setupDatabase();
