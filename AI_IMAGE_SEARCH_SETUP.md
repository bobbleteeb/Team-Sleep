# AI Image Search for Restaurants

This feature automatically fetches real restaurant images from online sources when discovering new restaurant locations. When the app finds a new restaurant (via Google Places or Overpass API), it uses AI-powered image search to find authentic photos of that restaurant.

## How It Works

1. **Restaurant Discovery**: When a user searches for restaurants nearby, the app discovers new restaurants via:
   - Google Places API
   - Overpass API (OpenStreetMap)

2. **Image Fetching**: For each new restaurant found, the system automatically searches for images using these services (in order):
   - **SerpAPI** - Google Images search API
   - **Bing Image Search** - Microsoft's image search API
   - **Unsplash** - High-quality stock photos of food/restaurants
   - **Fallback** - Deterministic placeholder images if all else fails

3. **Storage**: Images are stored with the restaurant record in the database for quick loading.

## Setup Instructions

### Environment Variables

Add these API keys to your `.env.local` file:

```bash
# For Google Images search (recommended)
SERPAPI_KEY=your_serpapi_key_here

# For Bing Images search (alternative)
BING_IMAGE_SEARCH_KEY=your_bing_key_here

# For Unsplash stock images (fallback)
UNSPLASH_ACCESS_KEY=your_unsplash_key_here

# Existing APIs
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Getting API Keys

#### SerpAPI (Recommended)
1. Visit [https://serpapi.com/](https://serpapi.com/)
2. Sign up for a free account (includes free tier for testing)
3. Get your API key from the dashboard
4. Add to `.env.local` as `SERPAPI_KEY`

**Free tier**: 100 searches/month

#### Bing Image Search
1. Visit [https://www.microsoft.com/en-us/bing/apis/bing-image-search-api](https://www.microsoft.com/en-us/bing/apis/bing-image-search-api)
2. Create a Cognitive Services account
3. Get your API key
4. Add to `.env.local` as `BING_IMAGE_SEARCH_KEY`

#### Unsplash
1. Visit [https://unsplash.com/developers](https://unsplash.com/developers)
2. Create an application
3. Get your Access Key
4. Add to `.env.local` as `UNSPLASH_ACCESS_KEY`

## Features

### Real Restaurant Images
- AI searches for actual photos of each restaurant found
- Falls back gracefully if a service is unavailable
- Caches results for better performance

### Menu Item Images (Optional)
The `searchMenuItemImage` function can also search for images of specific menu items:

```typescript
import { searchMenuItemImage } from '@/app/lib/imageSearch';

const imageUrl = await searchMenuItemImage('Margherita Pizza', 'Italian');
```

### Batch Processing
For processing multiple restaurants at once:

```typescript
import { searchRestaurantImagesBatch } from '@/app/lib/imageSearch';

const results = await searchRestaurantImagesBatch([
  { name: 'Mario\'s Pizzeria', cuisine: 'Italian' },
  { name: 'Jade Dragon', cuisine: 'Chinese' },
]);
```

## Troubleshooting

### Images Not Loading
1. Check that at least one API key is configured
2. Review the server logs for image search errors
3. The fallback placeholder images will always be used

### Rate Limiting
- **SerpAPI**: 100 searches/month on free tier
- **Bing**: Depends on your subscription
- **Unsplash**: 50 requests/hour for free accounts

Consider upgrading to paid tiers if you exceed limits.

### Performance
- Image searches may take 1-3 seconds per restaurant
- Results are cached in the database for subsequent requests
- Consider implementing image caching headers for better performance

## API Reference

### `searchRestaurantImage(name: string, cuisine?: string): Promise<string>`
Searches for a restaurant image and returns the URL.

**Parameters:**
- `name` (string): Restaurant name
- `cuisine` (optional): Cuisine type for better results

**Returns:** Promise resolving to image URL string

### `searchMenuItemImage(name: string, cuisine?: string): Promise<string>`
Searches for a menu item image.

**Parameters:**
- `name` (string): Menu item name
- `cuisine` (optional): Cuisine type

**Returns:** Promise resolving to image URL string

### `searchRestaurantImagesBatch(restaurants: Array): Promise<Array>`
Batch search for multiple restaurants.

**Parameters:**
- `restaurants`: Array of `{ name: string; cuisine?: string }`

**Returns:** Promise resolving to array of `{ name: string; imageUrl: string }`

## Integration Points

### Automatic Integration
The image search is automatically used when:
1. New restaurants are discovered via Google Places API
2. New restaurants are found via Overpass API
3. Restaurants are manually added to the database

### Manual Integration
To use in other parts of the app:

```typescript
import { searchRestaurantImage } from '@/app/lib/imageSearch';

// In a component or API route
const imageUrl = await searchRestaurantImage('Restaurant Name', 'Cuisine');
```

## Performance Tips

1. **Concurrent Requests**: Multiple restaurant images are fetched in parallel for faster loading
2. **Caching**: Images are stored permanently with restaurants to avoid re-searching
3. **Timeouts**: Each search has reasonable timeouts to avoid hanging requests
4. **Fallbacks**: Multiple image sources ensure at least some result is always returned

## Future Enhancements

- [ ] Image quality scoring and filtering
- [ ] Multi-image support per restaurant
- [ ] AI-powered image categorization
- [ ] Admin dashboard for image management
- [ ] OCR for menu item detection in images

## Support

For issues or questions about the image search feature:
1. Check the troubleshooting section
2. Review server console logs in development
3. Verify API keys are correctly configured
4. Test individual API services independently
