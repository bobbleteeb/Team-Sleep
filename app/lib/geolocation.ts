export interface Location {
  latitude: number;
  longitude: number;
}

export interface Restaurant {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  cuisine?: string;
  address?: string;
  phone?: string;
  website?: string;
  menu: Array<{
    id: number;
    name: string;
    price: number;
    image: string;
  }>;
  deliveryFee: number;
  eta: string;
  image: string;
  distance?: number; // Distance in miles from user
}

const CACHE_KEY = "quickbite_location";
const RESTAURANTS_CACHE_KEY = "quickbite_restaurants";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RESTAURANTS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for restaurants
const GEOLOCATION_TIMEOUT = 10000; // 10 seconds
const DEFAULT_LOCATION: Location = {
  latitude: 40.7128,
  longitude: -74.006,
}; // New York

interface CachedLocation {
  location: Location;
  timestamp: number;
}

interface CachedRestaurants {
  restaurants: Restaurant[];
  timestamp: number;
  latitude: number;
  longitude: number;
}

function getCachedLocation(): Location | null {
  if (typeof window === "undefined") return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { location, timestamp } = JSON.parse(cached) as CachedLocation;
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return location;
  } catch {
    return null;
  }
}

function cacheLocation(location: Location): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ location, timestamp: Date.now() })
    );
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

function getCachedRestaurants(latitude: number, longitude: number): Restaurant[] | null {
  if (typeof window === "undefined") return null;
  
  try {
    const cached = localStorage.getItem(RESTAURANTS_CACHE_KEY);
    if (!cached) return null;
    
    const { restaurants, timestamp, latitude: cachedLat, longitude: cachedLon } = JSON.parse(cached) as CachedRestaurants;
    
    // Check if cache is still valid
    if (Date.now() - timestamp > RESTAURANTS_CACHE_DURATION) {
      localStorage.removeItem(RESTAURANTS_CACHE_KEY);
      return null;
    }
    
    // Check if location hasn't changed much (within 0.6 miles / 1km)
    const distance = calculateDistance(latitude, longitude, cachedLat, cachedLon);
    if (distance > 0.6) {
      // Location changed significantly, invalidate cache
      localStorage.removeItem(RESTAURANTS_CACHE_KEY);
      return null;
    }
    
    return restaurants;
  } catch {
    return null;
  }
}

function cacheRestaurants(restaurants: Restaurant[], latitude: number, longitude: number): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(
      RESTAURANTS_CACHE_KEY,
      JSON.stringify({ restaurants, timestamp: Date.now(), latitude, longitude })
    );
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula in MILES
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in MILES (was 6371 km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fallback geolocation using IP-based service
async function getLocationFromIP(): Promise<Location | null> {
  try {
    console.log("📡 Trying IP-based geolocation fallback...");
    const response = await fetch("https://ipapi.co/json/", { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.latitude && data.longitude) {
      console.log(`✅ Got location from IP: ${data.city}, ${data.country_code}`);
      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
      };
    }
  } catch {
    // Silently fail
  }
  return null;
}

export async function getUserLocation(): Promise<Location> {
  // Check cache first
  const cached = getCachedLocation();
  if (cached) {
    console.log("✓ Using cached location");
    return cached;
  }

  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      console.warn("⚠️ Geolocation not available, trying IP-based geolocation...");
      getLocationFromIP().then((ipLoc) => {
        if (ipLoc) {
          cacheLocation(ipLoc);
          resolve(ipLoc);
        } else {
          console.warn("⚠️ IP geolocation also failed, using NYC default");
          cacheLocation(DEFAULT_LOCATION);
          resolve(DEFAULT_LOCATION);
        }
      });
      return;
    }

    console.log("🔍 Requesting browser geolocation permission...");

    // Set timeout to prevent hanging
    const timeoutId = setTimeout(async () => {
      clearTimeout(timeoutId);
      console.warn("⚠️ Geolocation timeout (10s), trying IP-based fallback...");
      const ipLoc = await getLocationFromIP();
      if (ipLoc) {
        cacheLocation(ipLoc);
        resolve(ipLoc);
      } else {
        console.warn("⚠️ Using NYC default location");
        cacheLocation(DEFAULT_LOCATION);
        resolve(DEFAULT_LOCATION);
      }
    }, GEOLOCATION_TIMEOUT);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        console.log("✅ GOT YOUR REAL GPS LOCATION:", location);
        console.log(`   Accuracy: ±${position.coords.accuracy.toFixed(0)}m`);
        cacheLocation(location);
        resolve(location);
      },
      async (error) => {
        clearTimeout(timeoutId);
        const errorMsg = error.message || `Error code ${error.code}`;
        console.warn(
          `⚠️ GPS denied/failed (${errorMsg}). Trying IP-based geolocation...`
        );
        const ipLoc = await getLocationFromIP();
        if (ipLoc) {
          cacheLocation(ipLoc);
          resolve(ipLoc);
        } else {
          console.log("   💡 Install/enable location services for better results");
          cacheLocation(DEFAULT_LOCATION);
          resolve(DEFAULT_LOCATION);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Get user location and automatically fetch nearby restaurants
 * Returns both location and closest restaurant options
 */
export async function getUserLocationAndNearbyRestaurants(): Promise<{
  location: Location;
  restaurants: Restaurant[];
}> {
  console.log("🔍 Fetching user location and nearby restaurants...");
  
  // Get user location
  const location = await getUserLocation();
  console.log(`📍 Your coordinates: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`);
  
  // Check if we have cached restaurants for this location
  const cachedRestaurants = getCachedRestaurants(location.latitude, location.longitude);
  if (cachedRestaurants && cachedRestaurants.length > 0) {
    console.log(`✓ Using ${cachedRestaurants.length} cached restaurants`);
    console.log("🏪 Cached restaurants:", cachedRestaurants.map(r => `${r.name} (${r.cuisine})`).join(", "));
    return { location, restaurants: cachedRestaurants };
  }

  // Fetch nearby restaurants from API
  try {
    console.log("📡 Fetching nearby restaurants from API...");
    const response = await fetch(
      `/api/restaurants/nearby?latitude=${location.latitude}&longitude=${location.longitude}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const restaurants = (await response.json()) as Restaurant[];
    console.log(`✨ API returned ${restaurants.length} restaurants`);

    // Add distance calculation to each restaurant
    const restaurantsWithDistance = restaurants.map((restaurant) => ({
      ...restaurant,
      distance: calculateDistance(
        location.latitude,
        location.longitude,
        restaurant.latitude,
        restaurant.longitude
      ),
    }));

    // Sort by distance (closest first)
    restaurantsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    console.log(`🎯 Sorted by distance. Closest restaurant: ${restaurantsWithDistance[0]?.name} (${restaurantsWithDistance[0]?.distance?.toFixed(1)} miles away)`);
    console.log("📍 All nearby restaurants:");
    restaurantsWithDistance.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${r.name} (${r.cuisine}) - ${r.distance?.toFixed(1)} miles away - ${r.address || 'Address N/A'}`);
    });

    // Cache the restaurants
    cacheRestaurants(restaurantsWithDistance, location.latitude, location.longitude);

    return {
      location,
      restaurants: restaurantsWithDistance,
    };
  } catch (error) {
    console.error("❌ Error fetching nearby restaurants:", error);
    return {
      location,
      restaurants: [],
    };
  }
}

/**
 * Get closest restaurants to user (sorted by distance)
 */
export async function getClosestRestaurants(limit: number = 5): Promise<Restaurant[]> {
  const { restaurants } = await getUserLocationAndNearbyRestaurants();
  return restaurants.slice(0, limit);
}

/**
 * Search for restaurants by cuisine type (closest first)
 */
export async function searchRestaurantsByCuisine(cuisine: string): Promise<Restaurant[]> {
  const { restaurants } = await getUserLocationAndNearbyRestaurants();
  return restaurants
    .filter(
      (r) =>
        r.cuisine &&
        r.cuisine.toLowerCase().includes(cuisine.toLowerCase())
    )
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));
}

/**
 * Get the single closest restaurant
 */
export async function getClosestRestaurant(): Promise<Restaurant | null> {
  const restaurants = await getClosestRestaurants(1);
  return restaurants.length > 0 ? restaurants[0] : null;
}
