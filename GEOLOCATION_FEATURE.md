# Enhanced Geolocation & Nearest Restaurant Discovery

This feature automatically discovers the user's location using browser geolocation API and fetches the closest restaurants using Google Maps integration and multiple data sources.

## Features

### 1. **Automatic Location Detection**
- Gets user's GPS coordinates with 10-second timeout protection
- Falls back to New York (default location) if unavailable
- Caches location for 5 minutes to reduce permission prompts
- SSR-safe implementation for Next.js

### 2. **Nearby Restaurant Discovery**
- Automatically fetches restaurants near user using Google Places API
- Falls back to Overpass API (OpenStreetMap) for coverage
- Distances calculated using Haversine formula
- Results cached for 30 minutes (invalidated if user moves >1km)

### 3. **AI Image Search for Restaurants**
- Searches for real restaurant images from Google Images, Bing, Unsplash
- Automatically fills restaurant images when discovered
- Multiple fallback sources ensure images always load

### 4. **Cuisine Support**
New support added for 40+ cuisine types including:
- **African**: Somali, Ethiopian, Moroccan
- **Asian**: Vietnamese, Thai, Korean, Japanese, Chinese, Pakistani, Bangladeshi, Sri Lankan, Afghan, Burmese, Laotian, Cambodian, Indonesian, Malaysian, Singaporean
- **Middle Eastern**: Lebanese, Turkish, Kebab, Israeli, Jewish
- **European**: Spanish, Portuguese, Italian, French, Greek, German, British, Irish, Polish, Czech, Hungarian, Romanian, Russian, Ukrainian, Dutch, Belgian, Swiss, Austrian, Scandinavian, Cypriot, Croatian, Serbian, Bosnian, Albanian, Maltese, Bulgarian, Macedonian
- **Americas**: American, Brazilian, Argentinian, Peruvian, Mexican
- **Other**: BBQ, Burger, Vegan, Seafood

### 5. **Header Display**
Shows user's current location (lat/lng) and number of nearby restaurants:
```
🍽️ QuickBite
Welcome back, John
📍 40.71, -74.01  🎯 8 restaurants near you
```

### 6. **Smart Sorting**
- Restaurants automatically sorted by distance (closest first)
- Closest restaurant automatically selected on app load
- Distance displayed on each restaurant card

## API Functions

### `getUserLocation(): Promise<Location>`
Gets user's current GPS location with caching.

```typescript
const location = await getUserLocation();
console.log(location); // { latitude: 40.7128, longitude: -74.006 }
```

### `getUserLocationAndNearbyRestaurants(): Promise<{location, restaurants}>`
**Main function** - Gets location AND automatically fetches 10 closest restaurants.

```typescript
const { location, restaurants } = await getUserLocationAndNearbyRestaurants();
console.log(`Found ${restaurants.length} restaurants`);
// Restaurants sorted by distance, each with distance property
```

### `getClosestRestaurants(limit?: number): Promise<Restaurant[]>`
Gets top N closest restaurants (default: 5).

```typescript
const topFive = await getClosestRestaurants(5);
```

### `searchRestaurantsByCuisine(cuisine: string): Promise<Restaurant[]>`
Finds restaurants of specific cuisine type, sorted by distance.

```typescript
const somaliFood = await searchRestaurantsByCuisine('Somali');
const pizza = await searchRestaurantsByCuisine('Italian');
```

### `getClosestRestaurant(): Promise<Restaurant | null>`
Gets the single closest restaurant to user.

```typescript
const closest = await getClosestRestaurant();
console.log(`Closest: ${closest?.name}`);
```

## Data Flow

```
1. User opens app
   ↓
2. queryUserLocationAndNearbyRestaurants() called
   ↓
3a. Browser geolocation API     3b. Check cached location
    └─→ Get GPS coords          └─→ Valid? Return cached
   ↓
4. Fetch nearby restaurants from:
   - Google Places API (primary)
   - Overpass API (fallback)
   ↓
5. AI searches for restaurant images
   ↓
6. Calculate distance to each using Haversine formula
   ↓
7. Sort by distance
   ↓
8. Display closest restaurants, auto-select first
   ↓
9. Show location & restaurant count in header
```

## Caching Strategy

### Location Cache
- **Duration**: 5 minutes
- **Key**: `quickbite_location`
- **Contents**: `{ location: {lat, lng}, timestamp }`

### Restaurants Cache
- **Duration**: 30 minutes
- **Key**: `quickbite_restaurants`
- **Invalidation**: If user moves >1km from cached location
- **Contents**: `{ restaurants: [...], timestamp, latitude, longitude }`

## Performance

- **Geolocation**: 1-3 seconds (with timeout fallback)
- **Restaurant Discovery**: 2-5 seconds (parallel API calls)
- **Image Search**: 1-2 seconds per restaurant (parallel/cached)
- **Total**: ~5-7 seconds on first load, <1 second with cache

## Browser Support

- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (may require HTTPS)
- ✅ Mobile: Full support (iOS/Android)

## Permission Handling

The app handles geolocation permission states:
```
Allowed   → Get location → Show closest restaurants ✓
Denied    → Use default location (New York)
No HTTPS  → Falls back to default location
Timeout   → Falls back to default location
No browser API → Falls back gracefully
```

## Distance Calculation

Uses Haversine formula (great-circle distance):
```
R = 6371 km (Earth's radius)
δσ = 2 × atan2(√a, √(1−a))
d = R × δσ

Where:
a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
φ = latitude, λ = longitude
```

## Configuration

Modify defaults in `app/lib/geolocation.ts`:
```typescript
const CACHE_DURATION = 5 * 60 * 1000;           // Location cache: 5 min
const RESTAURANTS_CACHE_DURATION = 30 * 60 * 1000; // Restaurants: 30 min
const GEOLOCATION_TIMEOUT = 10000;              // Timeout: 10 sec
const DEFAULT_LOCATION = {                       // Fallback: NYC
  latitude: 40.7128,
  longitude: -74.006,
};
```

## Troubleshooting

### No restaurants found
- Check Google Maps / Overpass API keys
- Verify geolocation didn't fail silently
- Check browser console for errors

### Always showing default location (NYC)
- Verify browser geolocation permission is allowed
- Check if using HTTPS (required on production)
- Try requesting permission again or use different browser

### Restaurants not updating when moving
- Cache lasts 30 minutes or until you move >1km
- Clear cache: `localStorage.removeItem('quickbite_restaurants')`
- Refresh page to force new fetch

### Location displayed as 40.71, -74.01
- This is correct! Coordinates displayed to 2 decimal places
- Approximately 1.1km precision per 0.01 degrees
- Full precision used for distance calculations

## Future Enhancements

- [ ] Live location tracking (continuous updates)
- [ ] Restaurant filtering by rating/reviews
- [ ] Estimated delivery time based on real traffic
- [ ] Favorite restaurants location bookmarking
- [ ] Address autocomplete for delivery
- [ ] Multi-location support (work/home)
- [ ] Geofencing for promotional notifications

## API Requirements

The following need to be configured in `.env.local`:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_MAPS_API_KEY

# For images (at least one)
SERPAPI_KEY
BING_IMAGE_SEARCH_KEY
UNSPLASH_ACCESS_KEY
```

## Example Usage in Components

```typescript
import { 
  getUserLocationAndNearbyRestaurants,
  searchRestaurantsByCuisine,
  getClosestRestaurants 
} from "@/app/lib/geolocation";

// In useEffect:
useEffect(() => {
  const load = async () => {
    // Get location + restaurants
    const { location, restaurants } = 
      await getUserLocationAndNearbyRestaurants();
    
    setUserLocation(location);
    setNearbyRestaurants(restaurants);
    
    // Show user they're at this location
    console.log(`📍 You are at: ${location.latitude}, ${location.longitude}`);
    console.log(`🎯 ${restaurants.length} restaurants found`);
  };
  load();
}, []);

// Search for specific cuisine
const findSomali = async () => {
  const results = await searchRestaurantsByCuisine('Somali');
  console.log(`Found ${results.length} Somali restaurants`);
};
```

## Monitoring & Logging

Console output includes helpful logs:
```
📍 Got user location: 40.7128, -74.0060
🔍 Fetching user location and nearby restaurants...
📡 Fetching nearby restaurants from API...
✨ Found 8 nearby restaurants, closest is Mario's Pizzeria
📍 Using cached location
✓ Found 8 restaurants in Supabase
✓ Using 8 cached restaurants
🤖 Fetching images for 3 new restaurants...
✨ Inserting 3 restaurants with AI-fetched images
```

Monitor these to debug location/restaurant discovery issues.
