// Map cuisines and restaurant names to local food images
// Images stored in /public/food-images/ folder

const restaurantImageMapping: { [key: string]: string } = {
  // Pizza places
  pizza: "/food-images/pizza.jpg",
  pizzeria: "/food-images/pizza.jpg",
  "pizza hut": "/food-images/pizza.jpg",
  dominos: "/food-images/pizza.jpg",
  "little caesars": "/food-images/pizza.jpg",

  // Burgers
  burger: "/food-images/burger.jpg",
  burgers: "/food-images/burger.jpg",
  "burger king": "/food-images/burger.jpg",
  mcdonalds: "/food-images/burger.jpg",
  "five guys": "/food-images/burger.jpg",
  "in-n-out": "/food-images/burger.jpg",
  wendys: "/food-images/burger.jpg",

  // Sushi & Japanese
  sushi: "/food-images/sushi.jpg",
  japanese: "/food-images/sushi.jpg",
  ramen: "/food-images/sushi.jpg",
  hibachi: "/food-images/sushi.jpg",

  // Chinese
  chinese: "/food-images/chinese.jpg",
  dim_sum: "/food-images/chinese.jpg",

  // Thai
  thai: "/food-images/thai.jpg",

  // Indian
  indian: "/food-images/indian.jpg",
  curry: "/food-images/indian.jpg",

  // Mexican
  mexican: "/food-images/mexican.jpg",
  tacos: "/food-images/mexican.jpg",
  "taco bell": "/food-images/mexican.jpg",
  chipotle: "/food-images/mexican.jpg",
  qdoba: "/food-images/mexican.jpg",

  // BBQ
  bbq: "/food-images/bbq.jpg",
  barbecue: "/food-images/bbq.jpg",

  // Seafood
  seafood: "/food-images/seafood.jpg",
  sushi_bar: "/food-images/seafood.jpg",
  "fish and chips": "/food-images/seafood.jpg",

  // Chicken
  fried_chicken: "/food-images/chicken.jpg",
  chicken: "/food-images/chicken.jpg",
  kfc: "/food-images/chicken.jpg",
  popeyes: "/food-images/chicken.jpg",

  // Sandwiches & Subs
  sandwich: "/food-images/sandwich.jpg",
  sandwiches: "/food-images/sandwich.jpg",
  deli: "/food-images/sandwich.jpg",
  "subway": "/food-images/sandwich.jpg",
  "jimmy johns": "/food-images/sandwich.jpg",

  // Pasta & Italian
  italian: "/food-images/pasta.jpg",
  pasta: "/food-images/pasta.jpg",

  // Korean
  korean: "/food-images/korean.jpg",
  bbq_korean: "/food-images/korean.jpg",

  // Vietnamese
  vietnamese: "/food-images/vietnamese.jpg",
  pho: "/food-images/vietnamese.jpg",

  // Middle Eastern / Mediterranean
  mediterranean: "/food-images/mediterranean.jpg",
  greek: "/food-images/mediterranean.jpg",
  middle_eastern: "/food-images/mediterranean.jpg",
  kebab: "/food-images/mediterranean.jpg",
  gyro: "/food-images/mediterranean.jpg",

  // Vegetarian / Vegan
  vegan: "/food-images/vegan.jpg",
  vegetarian: "/food-images/vegan.jpg",

  // Salads
  salad: "/food-images/salad.jpg",

  // Steak
  steakhouse: "/food-images/steak.jpg",
  steak: "/food-images/steak.jpg",

  // American Diner
  american: "/food-images/american.jpg",
  diner: "/food-images/american.jpg",
};

const menuItemImageMapping: { [key: string]: string } = {
  // Pizzas
  pizza: "/food-images/menu/pizza-slice.jpg",
  margherita: "/food-images/menu/pizza-slice.jpg",
  pepperoni: "/food-images/menu/pizza-slice.jpg",
  "pizza carbonara": "/food-images/menu/pizza-slice.jpg",
  "fettuccine alfredo": "/food-images/menu/pasta.jpg",
  "pasta carbonara": "/food-images/menu/pasta.jpg",

  // Burgers
  burger: "/food-images/menu/burger.jpg",
  cheeseburger: "/food-images/menu/burger.jpg",
  "double burger": "/food-images/menu/burger.jpg",
  "bacon burger": "/food-images/menu/burger.jpg",

  // Sushi
  roll: "/food-images/menu/sushi.jpg",
  "california roll": "/food-images/menu/sushi.jpg",
  "spicy tuna roll": "/food-images/menu/sushi.jpg",
  sashimi: "/food-images/menu/sushi.jpg",

  // Chicken
  chicken: "/food-images/menu/chicken.jpg",
  "kung pao chicken": "/food-images/menu/chicken.jpg",
  "butter chicken": "/food-images/menu/chicken.jpg",
  wings: "/food-images/menu/chicken.jpg",

  // Noodles
  "pad thai": "/food-images/menu/noodles.jpg",
  noodles: "/food-images/menu/noodles.jpg",
  "lo mein": "/food-images/menu/noodles.jpg",
  ramen: "/food-images/menu/noodles.jpg",

  // Rice
  rice: "/food-images/menu/rice.jpg",
  "fried rice": "/food-images/menu/rice.jpg",
  biryani: "/food-images/menu/rice.jpg",

  // Tacos
  tacos: "/food-images/menu/tacos.jpg",
  "beef tacos": "/food-images/menu/tacos.jpg",

  // Wraps & Burritos
  burrito: "/food-images/menu/burrito.jpg",
  wrap: "/food-images/menu/burrito.jpg",

  // Sandwiches
  sandwich: "/food-images/menu/sandwich.jpg",
  sub: "/food-images/menu/sandwich.jpg",

  // Salads
  salad: "/food-images/menu/salad.jpg",

  // Soups
  soup: "/food-images/menu/soup.jpg",

  // Seafood
  salmon: "/food-images/menu/seafood.jpg",
  shrimp: "/food-images/menu/seafood.jpg",
  fish: "/food-images/menu/seafood.jpg",

  // Desserts
  cake: "/food-images/menu/dessert.jpg",
  brownie: "/food-images/menu/dessert.jpg",
  "ice cream": "/food-images/menu/dessert.jpg",
};

export function getRestaurantImage(restaurantName: string, cuisine: string): string {
  const searchName = restaurantName.toLowerCase().trim();
  const searchCuisine = cuisine.toLowerCase().trim();

  // Try exact match in restaurant mapping
  if (restaurantImageMapping[searchName]) {
    return restaurantImageMapping[searchName];
  }

  // Try partial match
  for (const [key, value] of Object.entries(restaurantImageMapping)) {
    if (searchName.includes(key) || key.includes(searchName.split(" ")[0])) {
      return value;
    }
  }

  // Try cuisine match
  if (restaurantImageMapping[searchCuisine]) {
    return restaurantImageMapping[searchCuisine];
  }

  // Default fallback - use SVG if JPG not available
  return "/food-images/restaurant.svg";
}

export function getMenuItemImage(itemName: string, cuisine: string): string {
  const searchName = itemName.toLowerCase().trim();

  // Try exact match
  if (menuItemImageMapping[searchName]) {
    return menuItemImageMapping[searchName];
  }

  // Try partial match
  for (const [key, value] of Object.entries(menuItemImageMapping)) {
    if (searchName.includes(key) || key.includes(searchName.split(" ")[0])) {
      return value;
    }
  }

  // Try cuisine-based defaults
  const cuisineLower = cuisine.toLowerCase();
  if (cuisineLower.includes("pizza")) return "/food-images/menu/pizza-slice.jpg";
  if (cuisineLower.includes("burger")) return "/food-images/menu/burger.jpg";
  if (cuisineLower.includes("sushi") || cuisineLower.includes("japanese")) return "/food-images/menu/sushi.jpg";
  if (cuisineLower.includes("chicken") || cuisineLower.includes("fried")) return "/food-images/menu/chicken.jpg";
  if (cuisineLower.includes("thai") || cuisineLower.includes("noodle")) return "/food-images/menu/noodles.jpg";
  if (cuisineLower.includes("mexican") || cuisineLower.includes("taco")) return "/food-images/menu/tacos.jpg";
  if (cuisineLower.includes("salad")) return "/food-images/menu/salad.jpg";
  if (cuisineLower.includes("sandwich")) return "/food-images/menu/sandwich.jpg";

  // Default menu item image - use SVG if JPG not available
  return "/food-images/menu/dish.svg";
}
