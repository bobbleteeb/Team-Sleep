# Production Demo Setup

Your app now supports **real restaurants from a database** instead of just mocks!

## 📊 Architecture:

1. **Supabase** - Stores real restaurants + menus
2. **API Fallback Chain:**
   - ✅ Try Supabase (real restaurants from database)
   - 🌐 Try Overpass API (OpenStreetMap live data)
   - 📦 Fall back to mock restaurants (if both fail)

## 🚀 Setup Instructions:

### Step 1: Seed Real Restaurant Data
Run this command to add 18 real restaurants from NY, LA, Chicago, and SF:

```bash
npm run seed
```

This adds:
- **8 restaurants in New York**
- **4 restaurants in Los Angeles** 
- **3 restaurants in Chicago**
- **2 restaurants in San Francisco**
- Plus menus for each restaurant (4-5 items per restaurant)

### Step 2: Test with NYC Coordinates
When you test the app with these coordinates, you'll see **real restaurants**:
- Latitude: `40.7128`
- Longitude: `-74.0060`

The area around NYC will now show REAL restaurants like:
- Joe's Pizza
- Shake Shack Madison Square Park
- Jing Fong
- Sushi Nakamura
- Taj Tribeca
- Thai Spice
- And more!

### Step 3: Run Dev Server
```bash
npm run dev
```

Then go to http://localhost:3001

## 🎯 What Works Now:

✅ **Real restaurant locations** from major US cities
✅ **Clickable restaurant cards** - click to switch menus
✅ **Separate menus** - each restaurant has different items
✅ **AI ordering** - Chat can add items from any restaurant
✅ **Full demo functionality** - no payment needed yet

## 🔄 How to Add More Restaurants:

Edit `scripts/seed-restaurants.js` and add to the `realRestaurants` array:

```javascript
{
  name: "Your Restaurant Name",
  cuisine: "YourCuisine",
  latitude: 40.7128,
  longitude: -74.0060,
  address: "123 Main St, City, ST",
  phone: "(555) 123-4567",
}
```

Then run `npm run seed` again.

## 💡 Notes:

- The seed script will **replace** old data with new data each time
- You can test different locations by changing the coordinates in the app
- Menu items are auto-generated based on cuisine type
- This is demo data - in production, you'd connect to real restaurant APIs (Yelp, Google Places, etc.)

---

Enjoy! Now you have a working food delivery app with **real restaurant locations**! 🍕🍔🍜
