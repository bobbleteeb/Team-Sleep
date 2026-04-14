# Food Images for QuickBite

This folder contains restaurant and menu item images for the QuickBite food delivery app.

## Folder Structure

```
food-images/
├── restaurant.jpg              # Default restaurant image
├── pizza.jpg                   # Pizza/pizzeria restaurants
├── burger.jpg                  # Burger restaurants
├── sushi.jpg                   # Sushi/Japanese restaurants
├── chinese.jpg                 # Chinese restaurants
├── thai.jpg                    # Thai restaurants
├── indian.jpg                  # Indian restaurants
├── mexican.jpg                 # Mexican restaurants
├── bbq.jpg                     # BBQ restaurants
├── seafood.jpg                 # Seafood restaurants
├── chicken.jpg                 # Fried chicken/chicken restaurants
├── sandwich.jpg                # Sandwich/deli
├── pasta.jpg                   # Pasta/Italian restaurants
├── korean.jpg                  # Korean restaurants
├── vietnamese.jpg              # Vietnamese restaurants
├── mediterranean.jpg           # Mediterranean/Greek/Middle Eastern
├── vegan.jpg                   # Vegan/vegetarian restaurants
├── salad.jpg                   # Salad restaurants
├── steak.jpg                   # Steakhouse
├── american.jpg                # American diner/general
│
└── menu/
    ├── dish.jpg                # Default menu item image
    ├── pizza-slice.jpg         # Pizza slices
    ├── burger.jpg              # Burgers
    ├── sushi.jpg               # Sushi
    ├── chicken.jpg             # Chicken dishes
    ├── noodles.jpg             # Noodles/pasta
    ├── rice.jpg                # Rice dishes
    ├── tacos.jpg               # Tacos
    ├── burrito.jpg             # Burritos/wraps
    ├── sandwich.jpg            # Sandwiches
    ├── salad.jpg               # Salads
    ├── soup.jpg                # Soups
    ├── seafood.jpg             # Seafood dishes
    └── dessert.jpg             # Desserts
```

## Image Requirements

- **Format:** JPG, PNG (JPG recommended for better compression)
- **Resolution:** 
  - Restaurant images: 900px × 400px (landscape)
  - Menu item images: 400px × 400px (square)
- **Quality:** High quality, appetizing food photography
- **File size:** Keep under 500KB per image

## How to Find Free Images

### Using Unsplash, Pexels, or Pixabay:
1. Search for "pizza restaurant" → download and save as `pizza.jpg`
2. Search for "burger fast food" → download and save as `burger.jpg`
3. Continue for each cuisine type

### Using Google Images:
1. Search for the specific food type
2. Use "Tools" → "Usage Rights" → filter for Reuse rights
3. Download high-res images

### Services to Consider:
- **Unsplash** (unsplash.com) - Free, high quality
- **Pexels** (pexels.com) - Free stock photos
- **Pixabay** (pixabay.com) - Free images
- **Istock** (istockphoto.com) - Paid but affordable

## Setup Instructions

1. **Download images** for each cuisine type and menu item
2. **Resize** images to the dimensions specified above
3. **Save images** to this folder with the exact filenames listed
4. **Compress** images for faster loading (use TinyPNG.com or similar)
5. **Test** by refreshing the app - images will automatically load

## Image Selection Logic

The app automatically selects images based on:

1. **Exact restaurant name match** (e.g., "Luigi's Pizza" → pizza.jpg)
2. **Cuisine keyword match** (e.g., "Japanese" cuisine → sushi.jpg)
3. **Menu item name match** (e.g., "Margherita Pizza" → pizza-slice.jpg)
4. **Fallback to defaults** if no match is found

## Adding New Cuisines

To add new cuisine types:

1. Add image file to `food-images/` folder
2. Update `app/lib/imageMapping.ts`:
   ```typescript
   const restaurantImageMapping: { [key: string]: string } = {
     // ... existing entries ...
     new_cuisine: "/food-images/new_cuisine.jpg",  // Add this line
   };
   ```
3. Refresh and test

## Performance Tips

- Use JPG format for photos (better compression than PNG)
- Optimize images before uploading using TinyPNG.com
- Aim for images under 300KB each
- Use descriptive, high-quality food photography for best UX

## Troubleshooting

**Images not showing?**
- Check file names match exactly (case-sensitive on Linux/Mac)
- Verify file format is JPG or PNG
- Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)

**Images look blurry?**
- Ensure image resolution matches requirements
- Use high-quality source images
- Check image compression isn't too aggressive

## Dynamic Image Loading

The system automatically:
- ✅ Detects cuisine type from restaurant data
- ✅ Matches restaurant names to cuisine types
- ✅ Selects best available image
- ✅ Falls back to defaults if no match
- ✅ Loads images from local `/food-images/` folder
- ✅ Shows cached images for fast performance
