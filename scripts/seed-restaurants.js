/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const projectRoot = path.resolve(__dirname, "..");
loadEnvFile(path.join(projectRoot, ".env.local"));
loadEnvFile(path.join(projectRoot, ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials. Set these env vars:");
  console.error("  NEXT_PUBLIC_SUPABASE_URL");
  console.error("  SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const realRestaurants = [
  // NYC Restaurants
  {
    name: "Joe's Pizza",
    cuisine: "Italian",
    latitude: 40.7308,
    longitude: -73.9897,
    address: "124 Fulton St, New York, NY 10038",
    phone: "(212) 233-2444",
  },
  {
    name: "Shake Shack Madison Square Park",
    cuisine: "Burger",
    latitude: 40.7446,
    longitude: -73.9865,
    address: "Madison Square Park, New York, NY",
    phone: "(212) 889-6600",
  },
  {
    name: "Jing Fong",
    cuisine: "Chinese",
    latitude: 40.7155,
    longitude: -73.9965,
    address: "27 Division St, New York, NY 10002",
    phone: "(212) 964-5256",
  },
  {
    name: "Sushi Nakamura",
    cuisine: "Japanese",
    latitude: 40.7614,
    longitude: -73.9776,
    address: "524 E 74th St, New York, NY",
    phone: "(212) 988-2288",
  },
  {
    name: "Taj Tribeca",
    cuisine: "Indian",
    latitude: 40.7191,
    longitude: -74.0064,
    address: "1 Hudson St, New York, NY 10013",
    phone: "(212) 966-5374",
  },
  {
    name: "Thai Spice",
    cuisine: "Thai",
    latitude: 40.7505,
    longitude: -73.9934,
    address: "402 W 43rd St, New York, NY",
    phone: "(212) 265-4900",
  },
  {
    name: "Taqueria Coatzingo",
    cuisine: "Mexican",
    latitude: 40.7163,
    longitude: -73.9211,
    address: "53 Eldridge St, New York, NY",
    phone: "(212) 925-5262",
  },
  {
    name: "Dinosaur Bar-B-Que",
    cuisine: "BBQ",
    latitude: 40.7489,
    longitude: -74.001,
    address: "99 E 125th St, New York, NY",
    phone: "(646) 370-3030",
  },

  // LA Restaurants
  {
    name: "Gjelina",
    cuisine: "American",
    latitude: 34.0195,
    longitude: -118.4645,
    address: "1429 Abbot Kinney Blvd, Venice, CA",
    phone: "(310) 450-1429",
  },
  {
    name: "Goro Ramen",
    cuisine: "Japanese",
    latitude: 34.0611,
    longitude: -118.2427,
    address: "123 Astronaut E.S. Onizuka St, Los Angeles, CA",
    phone: "(213) 629-4476",
  },
  {
    name: "The Ivy",
    cuisine: "American",
    latitude: 34.0749,
    longitude: -118.3963,
    address: "113 N Robertson Blvd, Los Angeles, CA",
    phone: "(310) 274-8303",
  },
  {
    name: "Republique",
    cuisine: "French",
    latitude: 34.0791,
    longitude: -118.2979,
    address: "624 S La Brea Ave, Los Angeles, CA",
    phone: "(323) 939-7955",
  },

  // Chicago Restaurants
  {
    name: "Alinea",
    cuisine: "French",
    latitude: 41.909,
    longitude: -87.6501,
    address: "1723 N Halsted St, Chicago, IL",
    phone: "(312) 867-0110",
  },
  {
    name: "Xococlatl",
    cuisine: "Mexican",
    latitude: 41.8819,
    longitude: -87.6278,
    address: "1445 W Taylor St, Chicago, IL",
    phone: "(312) 455-8114",
  },
  {
    name: "Au Chavel",
    cuisine: "Burger",
    latitude: 41.8819,
    longitude: -87.6537,
    address: "800 W Randolph St, Chicago, IL",
    phone: "(312) 929-4580",
  },

  // San Francisco Restaurants
  {
    name: "Zazu",
    cuisine: "American",
    latitude: 37.7749,
    longitude: -122.4194,
    address: "522 Filbert St, San Francisco, CA",
    phone: "(415) 775-2898",
  },
  {
    name: "Kin Khao",
    cuisine: "Thai",
    latitude: 37.7885,
    longitude: -122.3995,
    address: "55 Cyril Magnin St, San Francisco, CA",
    phone: "(415) 362-7456",
  },
];

function generateMenuForCuisine(cuisine) {
  const menus = {
    Italian: [
      { name: "Margherita Pizza", price: 16.99 },
      { name: "Pepperoni Pizza", price: 18.99 },
      { name: "Spaghetti Carbonara", price: 14.99 },
      { name: "Fettuccine Alfredo", price: 13.99 },
    ],
    Japanese: [
      { name: "California Roll", price: 13.99 },
      { name: "Spicy Tuna Roll", price: 14.99 },
      { name: "Rainbow Roll", price: 18.99 },
      { name: "Salmon Sashimi", price: 15.99 },
    ],
    Burger: [
      { name: "Classic Burger", price: 11.99 },
      { name: "Double Cheeseburger", price: 13.99 },
      { name: "Bacon Burger", price: 12.99 },
      { name: "Mushroom Burger", price: 12.49 },
    ],
    Chinese: [
      { name: "Kung Pao Chicken", price: 12.99 },
      { name: "Fried Rice", price: 10.99 },
      { name: "Lo Mein", price: 10.99 },
      { name: "Sweet and Sour Pork", price: 12.99 },
    ],
    Thai: [
      { name: "Pad Thai", price: 12.99 },
      { name: "Green Curry", price: 13.99 },
      { name: "Tom Yum Soup", price: 10.99 },
      { name: "Spring Rolls", price: 8.99 },
    ],
    Indian: [
      { name: "Butter Chicken", price: 13.99 },
      { name: "Tikka Masala", price: 12.99 },
      { name: "Naan", price: 4.99 },
      { name: "Saag Paneer", price: 12.99 },
    ],
    Mexican: [
      { name: "Beef Tacos", price: 9.99 },
      { name: "Burrito", price: 11.99 },
      { name: "Enchilada", price: 10.99 },
      { name: "Quesadilla", price: 9.99 },
    ],
    BBQ: [
      { name: "Pulled Pork", price: 13.99 },
      { name: "BBQ Ribs", price: 15.99 },
      { name: "Brisket Sandwich", price: 14.99 },
      { name: "Smoked Chicken", price: 12.99 },
    ],
    French: [
      { name: "Coq au Vin", price: 18.99 },
      { name: "Beef Bourguignon", price: 19.99 },
      { name: "French Onion Soup", price: 9.99 },
      { name: "Escargot", price: 12.99 },
    ],
    American: [
      { name: "Grilled Steak", price: 22.99 },
      { name: "Fried Chicken", price: 13.99 },
      { name: "Mac and Cheese", price: 11.99 },
      { name: "Apple Pie", price: 6.99 },
    ],
  };

  return menus[cuisine] || menus["American"];
}

async function seedRestaurants() {
  try {
    console.log("🌱 Starting restaurant seed...\n");

    // Clear existing data first
    const { error: deleteError } = await supabase
      .from("menus")
      .delete()
      .not("id", "is", null);

    if (deleteError && deleteError.code !== "PGRST116") {
      console.warn("⚠️  Could not clear existing menus (might be empty)");
    }

    const { error: deleteRestError } = await supabase
      .from("restaurants")
      .delete()
      .not("id", "is", null);

    if (deleteRestError && deleteRestError.code !== "PGRST116") {
      console.warn("⚠️  Could not clear existing restaurants (might be empty)");
    }

    // Insert restaurants
    const { data, error } = await supabase
      .from("restaurants")
      .insert(
        realRestaurants.map((r, idx) => ({
          name: r.name,
          cuisine: r.cuisine,
          latitude: r.latitude,
          longitude: r.longitude,
          address: r.address,
          phone: r.phone,
          website: null,
          delivery_fee: 3.99 + (idx % 3) * 0.5,
          eta: `${15 + (idx % 20)} mins`,
          image: `https://picsum.photos/seed/restaurant-${idx + 1}/900/400`,
        }))
      )
      .select();

    if (error) {
      console.error("❌ Error inserting restaurants:", error);
      process.exit(1);
    }

    console.log(`✅ Successfully inserted ${data?.length || 0} restaurants!\n`);

    // For each restaurant, add sample menu items
    let totalMenuItems = 0;
    for (const restaurant of data || []) {
      const menuItems = generateMenuForCuisine(restaurant.cuisine);

      const { error: flatMenuError } = await supabase.from("menus").insert(
        menuItems.map((item) => ({
          restaurant_id: restaurant.id,
          name: item.name,
          price: item.price,
        }))
      );

      if (!flatMenuError) {
        console.log(`  ✅ ${restaurant.name} - ${menuItems.length} menu items`);
        totalMenuItems += menuItems.length;
        continue;
      }

      const { error: jsonMenuError } = await supabase.from("menus").insert({
        restaurant_id: restaurant.id,
        items: menuItems.map((item, idx) => ({
          id: idx + 1,
          name: item.name,
          price: item.price,
        })),
      });

      if (!jsonMenuError) {
        console.log(`  ✅ ${restaurant.name} - ${menuItems.length} menu items`);
        totalMenuItems += menuItems.length;
      } else {
        console.error(
          `  ❌ Error adding menu for ${restaurant.name}:`,
          jsonMenuError.message
        );
      }
    }

    console.log(`\n✨ Seed complete! Total menu items: ${totalMenuItems}`);
    console.log(`\n📍 Restaurants added to these cities:`);
    console.log("   • New York, NY");
    console.log("   • Los Angeles, CA");
    console.log("   • Chicago, IL");
    console.log("   • San Francisco, CA");
    process.exit(0);
  } catch (error) {
    console.error("🚨 Seed failed:", error);
    process.exit(1);
  }
}

seedRestaurants();
