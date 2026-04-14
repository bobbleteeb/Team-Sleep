/**
 * Image Search Utility
 * Fetches restaurant images from online services (Google Images, Bing, Unsplash)
 */

export interface SearchResult {
  imageUrl: string;
  source: string;
  title?: string;
}

/**
 * Fetch restaurant images from Google Images via SerpAPI
 */
async function fetchFromSerpAPI(
  restaurantName: string,
  cuisine?: string
): Promise<string | null> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    console.log("⚠️ SerpAPI key not configured, skipping SerpAPI image search");
    return null;
  }

  try {
    const searchQuery = `${restaurantName}${cuisine ? " " + cuisine : ""} restaurant`;
    const url = new URL("https://serpapi.com/search");
    url.searchParams.append("q", searchQuery);
    url.searchParams.append("tbm", "isch"); // Image search
    url.searchParams.append("api_key", apiKey);
    url.searchParams.append("num", "1");
    url.searchParams.append("ijn", "0");

    const response = await fetch(url.toString(), { cache: "no-store" });

    if (!response.ok) {
      console.warn(`SerpAPI HTTP ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      images_results?: Array<{
        original: string;
        title: string;
      }>;
    };

    if (data.images_results && data.images_results.length > 0) {
      const imageUrl = data.images_results[0].original;
      console.log(
        `✓ Found restaurant image for "${restaurantName}" via SerpAPI`
      );
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.warn("SerpAPI image search error:", error);
    return null;
  }
}

/**
 * Fetch restaurant images from Bing Image Search
 */
async function fetchFromBingImages(
  restaurantName: string,
  cuisine?: string
): Promise<string | null> {
  const apiKey = process.env.BING_IMAGE_SEARCH_KEY;
  if (!apiKey) {
    console.log(
      "⚠️ Bing Image Search key not configured, skipping Bing image search"
    );
    return null;
  }

  try {
    const searchQuery = `${restaurantName}${cuisine ? " " + cuisine : ""} restaurant`;
    const url = new URL(
      "https://api.cognitive.microsoft.com/bing/v7.0/images/search"
    );
    url.searchParams.append("q", searchQuery);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.warn(`Bing Image Search HTTP ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      value?: Array<{
        contentUrl: string;
        name: string;
      }>;
    };

    if (data.value && data.value.length > 0) {
      const imageUrl = data.value[0].contentUrl;
      console.log(
        `✓ Found restaurant image for "${restaurantName}" via Bing Image Search`
      );
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.warn("Bing Image Search error:", error);
    return null;
  }
}

/**
 * Fetch high-quality stock images from Unsplash as fallback
 */
async function fetchFromUnsplash(
  restaurantName: string,
  cuisine?: string
): Promise<string | null> {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) {
    console.log("⚠️ Unsplash key not configured, skipping Unsplash image search");
    return null;
  }

  try {
    const searchQuery = `${cuisine || "restaurant"} food`;
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.append("query", searchQuery);
    url.searchParams.append("client_id", apiKey);
    url.searchParams.append("per_page", "1");
    url.searchParams.append("orientation", "landscape");

    const response = await fetch(url.toString(), { cache: "no-store" });

    if (!response.ok) {
      console.warn(`Unsplash HTTP ${response.status}`);
      return null;
    }

    const data = (await response.json()) as {
      results?: Array<{
        urls: {
          regular: string;
        };
      }>;
    };

    if (data.results && data.results.length > 0) {
      const imageUrl = data.results[0].urls.regular;
      console.log(
        `✓ Found restaurant image for "${restaurantName}" via Unsplash`
      );
      return imageUrl;
    }

    return null;
  } catch (error) {
    console.warn("Unsplash image search error:", error);
    return null;
  }
}

/**
 * Generate a high-quality placeholder image URL using DiceBear or similar service
 */
function generatePlaceholderImage(restaurantName: string): string {
  // Use a deterministic seed based on restaurant name
  const seed = restaurantName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);

  // Use multiple fallback sources
  const fallbacks = [
    `https://images.unsplash.com/photo-1618093479637-cd465c31b6f2?w=900&h=400&fit=crop&q=80`, // Fallback to generic restaurant
    `https://images.pexels.com/photos/2097090/pexels-photo-2097090.jpeg?w=900&h=400&fit=crop`, // Restaurant interior
    `https://picsum.photos/seed/${seed}/900/400`, // Deterministic placeholder
  ];

  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Main function to search for restaurant images
 * Tries multiple services in order of preference
 */
export async function searchRestaurantImage(
  restaurantName: string,
  cuisine?: string
): Promise<string> {
  console.log(
    `🖼️ Searching for image: "${restaurantName}"${cuisine ? " (" + cuisine + ")" : ""}`
  );

  // Try SerpAPI first (Google Images)
  const serpImageUrl = await fetchFromSerpAPI(restaurantName, cuisine);
  if (serpImageUrl) return serpImageUrl;

  // Try Bing Image Search
  const bingImageUrl = await fetchFromBingImages(restaurantName, cuisine);
  if (bingImageUrl) return bingImageUrl;

  // Try Unsplash (high-quality free images)
  const unsplashUrl = await fetchFromUnsplash(restaurantName, cuisine);
  if (unsplashUrl) return unsplashUrl;

  // Fallback to placeholder image
  const placeholder = generatePlaceholderImage(restaurantName);
  console.log(
    `⚠️ Using placeholder image for "${restaurantName}": ${placeholder}`
  );
  return placeholder;
}

/**
 * Search for menu item images
 */
export async function searchMenuItemImage(
  itemName: string,
  cuisine?: string
): Promise<string> {
  console.log(
    `🖼️ Searching for menu item image: "${itemName}"${cuisine ? " (" + cuisine + ")" : ""}`
  );

  // Try SerpAPI first
  const serpImageUrl = await fetchFromSerpAPI(itemName, cuisine);
  if (serpImageUrl) return serpImageUrl;

  // Try Bing Image Search
  const bingImageUrl = await fetchFromBingImages(itemName, cuisine);
  if (bingImageUrl) return bingImageUrl;

  // Try Unsplash
  const unsplashUrl = await fetchFromUnsplash(itemName, cuisine);
  if (unsplashUrl) return unsplashUrl;

  // Fallback
  return `https://picsum.photos/seed/${itemName.toLowerCase().replace(/[^a-z0-9]/g, "")}/500/500`;
}

/**
 * Batch search for restaurant images (useful for multiple restaurants)
 */
export async function searchRestaurantImagesBatch(
  restaurants: Array<{ name: string; cuisine?: string }>
): Promise<Array<{ name: string; imageUrl: string }>> {
  const results = await Promise.all(
    restaurants.map(async (restaurant) => ({
      name: restaurant.name,
      imageUrl: await searchRestaurantImage(
        restaurant.name,
        restaurant.cuisine
      ),
    }))
  );
  return results;
}
