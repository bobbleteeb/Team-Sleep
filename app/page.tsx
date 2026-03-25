"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatKitWrapper from "./components/ChatKitWrapper";
import DriverDashboard from "./components/DriverDashboard";
import { useCart } from "./context/CartContext";
import { useAuth } from "./context/AuthContext";
import { getUserLocation } from "./lib/geolocation";

interface MenuItem {
  id: number;
  name: string;
  price: number;
  image: string;
}

interface Restaurant {
  id: number;
  name: string;
  cuisine?: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  menu: MenuItem[];
  deliveryFee: number;
  eta: string;
  image: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );

export default function Home() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(
    null
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [aiView, setAiView] = useState<"none" | "restaurants" | "menu">("none");
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    totalPrice,
    isOpen,
    setIsOpen,
    saveOrder,
    isLoading,
    restaurantId,
  } = useCart();

  const handleAIResponse = (data: any) => {
    if (!data) return;

    if (data.intent === "show_restaurants") {
      setAiView("restaurants");

      if (data.filters?.spicy) {
        const spicy = restaurants.filter(r =>
          r.name.toLowerCase().includes("spicy") ||
          r.cuisine?.toLowerCase().includes("spicy")
        );
        setFilteredRestaurants(spicy);
      } else {
        setFilteredRestaurants(restaurants);
      }
    }

    if (data.intent === "show_menu") {
      setAiView("menu");
      setSelectedRestaurantId(data.restaurantId);
    }
  };

  // Fetch nearby restaurants on mount
  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        setLoadingRestaurants(true);
        const location = await getUserLocation();

        const response = await fetch(
          `/api/restaurants/nearby?latitude=${location.latitude}&longitude=${location.longitude}`
        );

        if (!response.ok) throw new Error("Failed to fetch restaurants");

        const data = await response.json();

        // Transform API data to our Restaurant format
        interface OSMRestaurant {
          id: number;
          name: string;
          cuisine?: string;
          latitude: number;
          longitude: number;
          address?: string;
          phone?: string;
          website?: string;
          menu?: MenuItem[];
          deliveryFee?: number;
          eta?: string;
          image?: string;
        }
        const transformedRestaurants: Restaurant[] = data.map(
          (r: OSMRestaurant, idx: number) => {
            return {
              id: r.id,
              name: r.name,
              cuisine: r.cuisine || "Restaurant",
              latitude: r.latitude,
              longitude: r.longitude,
              address: r.address,
              phone: r.phone,
              website: r.website,
              menu: Array.isArray(r.menu) ? r.menu : [],
              deliveryFee: r.deliveryFee ?? 3.99 + (idx % 3) * 0.5,
              eta: r.eta ?? `${20 + (idx % 15)} mins`,
              image: r.image || `https://picsum.photos/seed/restaurant-${idx + 1}/900/400`,
            };
          }
        );

        setRestaurants(transformedRestaurants);
        if (transformedRestaurants.length > 0) {
          setSelectedRestaurantId(transformedRestaurants[0].id);
        }
        setLocationError(null);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
        setLocationError(
          "Could not load restaurants. Please check your location and try again."
        );
      } finally {
        setLoadingRestaurants(false);
      }
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    const fetchSelectedMenu = async () => {
      if (!selectedRestaurantId) {
        setSelectedMenu([]);
        return;
      }

      try {
        setLoadingMenu(true);
        const response = await fetch(
          `/api/restaurants/${encodeURIComponent(String(selectedRestaurantId))}/menu`
        );

        if (!response.ok) throw new Error("Failed to fetch menu");

        const data = (await response.json()) as MenuItem[];
        setSelectedMenu(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching menu:", error);
        const fallbackRestaurant = restaurants.find(
          (restaurant) => restaurant.id === selectedRestaurantId
        );
        setSelectedMenu(fallbackRestaurant?.menu || []);
      } finally {
        setLoadingMenu(false);
      }
    };

    fetchSelectedMenu();
  }, [selectedRestaurantId, restaurants]);

  const selectedRestaurant = useMemo(
    () =>
      restaurants.find((r) => r.id === selectedRestaurantId) ?? restaurants[0],
    [selectedRestaurantId, restaurants]
  );

  const deliveryFee = items.length ? selectedRestaurant.deliveryFee : 0;
  const orderTotal = totalPrice + deliveryFee;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Show driver dashboard if user is a driver
  if (user?.role === "driver") {
    return <DriverDashboard />;
  }

  // Show loading or nothing while auth is loading
  if (authLoading || !user) {
    return null;
  }

  if (loadingRestaurants) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-foreground"></div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Loading restaurants near you...
          </p>
        </div>
      </div>
    );
  }

  if (locationError || restaurants.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {locationError || "No restaurants found in your area"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-red-600 hover:underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleCheckout = async () => {
    if (!deliveryAddress.trim()) {
      alert("Please enter a delivery address");
      return;
    }
    const id = restaurantId ?? selectedRestaurantId;
    if (!id) return;

    await saveOrder(id, deliveryAddress);
    setOrderSuccess(true);
    setDeliveryAddress("");
    setTimeout(() => setOrderSuccess(false), 3000);
  };

  return (
    <ChatKitWrapper onAIResponse={handleAIResponse}>
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-black/10 p-6 dark:border-white/20">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">QuickBite</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {user ? `Welcome, ${user.name}` : "Food delivery in your neighborhood"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
              >
                Cart ({totalItems})
              </button>
              <button
                onClick={handleLogout}
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="flex h-[calc(100vh-100px)]">

          {/* Sidebar */}
          <aside className="w-64 border-r p-4 hidden md:block">
            <h2 className="font-semibold mb-4">Favorites</h2>
            <div className="space-y-2 text-sm">
              <p className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">Past Orders</p>
              <p className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">Saved Meals</p>
              <p className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">Recently Viewed</p>
            </div>
          </aside>

          {/* Main Chat UI */}
          <div className="flex-1 flex flex-col">

            {/* Chat Content */}
            <div className="flex-1 overflow-y-auto flex justify-center p-6">
              <div className="w-full max-w-3xl space-y-6">

                {/* Heading */}
                <h2 className="text-2xl font-semibold text-center">
                  What are you craving today?
                </h2>

                {/* 🧠 AI → Restaurants */}
                {aiView === "restaurants" && (
                  <div className="grid md:grid-cols-3 gap-4">
                    {(filteredRestaurants.length ? filteredRestaurants : restaurants).map((restaurant) => (
                      <div
                        key={restaurant.id}
                        className="bg-white dark:bg-neutral-900 p-3 rounded-xl shadow"
                      >
                        <Image
                          src={restaurant.image}
                          alt={restaurant.name}
                          width={300}
                          height={200}
                          className="rounded-lg mb-2"
                        />
                        <h3 className="font-semibold">{restaurant.name}</h3>
                        <p className="text-sm text-zinc-500">{restaurant.eta}</p>

                        <button
                          onClick={() => {
                            setSelectedRestaurantId(restaurant.id);
                            setAiView("menu");
                          }}
                          className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg"
                        >
                          View Menu
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 🍔 AI → Menu */}
                {aiView === "menu" && selectedRestaurant && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">
                      {selectedRestaurant.name}
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedMenu.map((item) => (
                        <div key={item.id} className="p-4 border rounded-xl">
                          <Image
                            src={item.image}
                            alt={item.name}
                            width={300}
                            height={200}
                            className="rounded-lg mb-2"
                          />
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm">{formatCurrency(item.price)}</p>

                          <button
                            onClick={() =>
                              addItem({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                restaurantId: selectedRestaurant.id,
                                restaurantName: selectedRestaurant.name,
                                image: item.image,
                              })
                            }
                            className="mt-2 px-3 py-2 bg-foreground text-background rounded-lg"
                          >
                            Add to Cart
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Input Bar (UI only, your real chat still works) */}
            <div className="border-t p-4 bg-background">
              <div className="max-w-3xl mx-auto flex gap-3">
                <input
                  placeholder="Ask for food..."
                  className="flex-1 p-3 rounded-full border"
                />
                <button className="bg-blue-600 text-white px-4 rounded-full">
                  ➤
                </button>
              </div>
            </div>

          </div>

        </main>
      </div>
    </ChatKitWrapper>
  );
}
