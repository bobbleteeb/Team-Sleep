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
    await saveOrder(restaurantId || selectedRestaurantId, deliveryAddress);
    setOrderSuccess(true);
    setDeliveryAddress("");
    setTimeout(() => setOrderSuccess(false), 3000);
  };

  return (
    <ChatKitWrapper>
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

        <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 p-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {restaurants.map((restaurant) => {
                const isSelected = restaurant.id === selectedRestaurant.id;

                return (
                  <button
                    key={restaurant.id}
                    onClick={() => setSelectedRestaurantId(restaurant.id)}
                    className={`overflow-hidden rounded-xl border text-left transition ${
                      isSelected
                        ? "border-foreground"
                        : "border-black/10 dark:border-white/20"
                    }`}
                  >
                    <Image
                      src={restaurant.image}
                      alt={restaurant.name}
                      width={900}
                      height={360}
                      className="h-36 w-full object-cover"
                    />
                    <div className="space-y-1 p-4">
                      <h2 className="font-semibold">{restaurant.name}</h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {restaurant.cuisine} • {restaurant.eta}
                      </p>
                      <p className="text-sm">
                        Delivery {formatCurrency(restaurant.deliveryFee)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <section className="space-y-4">
              <h3 className="text-xl font-semibold">{selectedRestaurant.name} Menu</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {loadingMenu ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Loading menu...
                  </p>
                ) : selectedMenu.length === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No menu items found for this restaurant.
                  </p>
                ) : (
                  selectedMenu.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-xl border border-black/10 p-4 dark:border-white/20"
                    >
                      <Image
                        src={item.image}
                        alt={item.name}
                        width={900}
                        height={400}
                        className="mb-3 h-40 w-full rounded-lg object-cover"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {formatCurrency(item.price)}
                          </p>
                        </div>
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
                          className="rounded-full border border-black/10 px-4 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                        >
                          Add
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>

          <aside
            className={`rounded-xl border border-black/10 p-4 dark:border-white/20 ${
              isOpen ? "block" : "hidden lg:block"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Your Cart</h3>
              {!!items.length && (
                <button
                  onClick={clearCart}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  Clear
                </button>
              )}
            </div>

            {orderSuccess && (
              <div className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
                ✓ Order placed successfully!
              </div>
            )}

            {!items.length ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No items yet. Add something tasty.
              </p>
            ) : (
              <div className="space-y-4">
                <ul className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <li key={item.id} className="rounded-lg border border-black/10 p-3 dark:border-white/20">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {formatCurrency(item.price)} each
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="h-7 w-7 rounded-full border border-black/10 text-sm dark:border-white/20"
                          >
                            -
                          </button>
                          <span className="text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="h-7 w-7 rounded-full border border-black/10 text-sm dark:border-white/20"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-sm font-medium">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your delivery address"
                    className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
                  />
                </div>

                <div className="space-y-1 border-t border-black/10 pt-3 text-sm dark:border-white/20">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Delivery</span>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(orderTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isLoading || items.length === 0 || !deliveryAddress.trim()}
                  className="w-full rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
                >
                  {isLoading ? "Processing..." : "Checkout"}
                </button>
              </div>
            )}
          </aside>
        </main>
      </div>
    </ChatKitWrapper>
  );
}
