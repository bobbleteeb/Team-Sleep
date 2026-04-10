"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import DriverDashboard from "./components/DriverDashboard";
import { useCart } from "./context/CartContext";
import { useAuth } from "./context/AuthContext";
import { useTheme } from "./context/ThemeContext";
import { 
  getUserLocationAndNearbyRestaurants, 
  type Location
} from "./lib/geolocation";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  menu: MenuItem[];
  deliveryFee: number;
  eta: string;
  image: string;
  distance?: number; // Distance in miles from user
}

type ChatCard = {
  type: "restaurant" | "item";
  id: string | number;
  name: string;
  image: string;
  subtitle?: string;
  restaurantId?: number;
  restaurantName?: string;
  itemData?: MenuItem;
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  cards?: ChatCard[];
};

type OrderAction = {
  action: "add_to_cart" | "place_order";
  restaurant?: string;
  items?: Array<{ name: string; quantity: number }>;
  delivery_address?: string;
};

type ChatResponse = { reply: string; action?: OrderAction };

type SavedMeal = {
  id: string;
  name: string;
  price: number;
  image: string;
  restaurantId: string;
  restaurantName: string;
};

type RecentRestaurant = {
  id: number;
  name: string;
  image: string;
  cuisine?: string;
  eta: string;
};

type PastOrder = {
  id: string;
  restaurant_id: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    restaurantId: string;
    restaurantName: string;
  }>;
  total_price: number;
  delivery_address: string;
  status: string;
  created_at: string;
};

type SidebarView = "none" | "past-orders" | "saved-meals" | "recently-viewed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

function findCards(reply: string, restaurants: Restaurant[]): ChatCard[] {
  const lower = reply.toLowerCase();
  const cards: ChatCard[] = [];
  const seen = new Set<string>();

  for (const r of restaurants) {
    const rKey = `r:${r.id}`;
    if (!seen.has(rKey) && lower.includes(r.name.toLowerCase())) {
      seen.add(rKey);
      cards.push({
        type: "restaurant",
        id: r.id,
        name: r.name,
        image: r.image,
        subtitle: `${r.cuisine ?? "Restaurant"} · ${r.eta}`,
        restaurantId: r.id,
      });
    }
    for (const item of r.menu) {
      const iKey = `i:${r.id}:${item.id}`;
      if (!seen.has(iKey) && lower.includes(item.name.toLowerCase())) {
        seen.add(iKey);
        cards.push({
          type: "item",
          id: item.id,
          name: item.name,
          image: item.image,
          subtitle: fmt(item.price),
          restaurantId: r.id,
          restaurantName: r.name,
          itemData: item,
        });
      }
    }
  }

  return cards.slice(0, 6);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Home() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  // Location
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  // Restaurant / menu
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [aiView, setAiView] = useState<"none" | "restaurants" | "menu">("none");

  // Sidebar
  const [sidebarView, setSidebarView] = useState<SidebarView>("none");

  // Past orders
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Saved meals (localStorage)
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);

  // Recently viewed (localStorage)
  const [recentRestaurants, setRecentRestaurants] = useState<RecentRestaurant[]>([]);

  // Cart
  const {
    items, addItem, removeItem, updateQuantity, clearCart,
    totalItems, totalPrice, isOpen, setIsOpen, saveOrder, restaurantId,
    pendingSwitch, confirmRestaurantSwitch, cancelRestaurantSwitch,
  } = useCart();

  // Checkout
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [tip, setTip] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [scheduledTime, setScheduledTime] = useState("");
  const [splitCount, setSplitCount] = useState(1);
  const [savedAddresses, setSavedAddresses] = useState<Array<{ id: string; name: string; address: string }>>([]);

  // Favorites & filters
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [dietaryFilter, setDietaryFilter] = useState<string>("All");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: Date.now(),
      role: "assistant",
      content: "Hi! 👋 I can help you order food. Try asking 'show me pizza places' or 'add a burger to my cart'",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Load from localStorage ───────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem("quickbite_saved_meals");
    if (saved) setSavedMeals(JSON.parse(saved) as SavedMeal[]);
    const recent = localStorage.getItem("quickbite_recent");
    if (recent) setRecentRestaurants(JSON.parse(recent) as RecentRestaurant[]);
    const favs = localStorage.getItem("quickbite_favorites");
    if (favs) setFavoriteIds(new Set(JSON.parse(favs) as number[]));
    const addrs = localStorage.getItem("quickbite_addresses");
    if (addrs) setSavedAddresses(JSON.parse(addrs));
  }, []);

  // ─── Track recently viewed ────────────────────────────────────────────────

  useEffect(() => {
    if (aiView !== "menu" || !selectedRestaurantId) return;
    const r = restaurants.find((x) => x.id === selectedRestaurantId);
    if (!r) return;
    setRecentRestaurants((prev) => {
      const without = prev.filter((x) => x.id !== r.id);
      const next = [
        { id: r.id, name: r.name, image: r.image, cuisine: r.cuisine, eta: r.eta },
        ...without,
      ].slice(0, 5);
      localStorage.setItem("quickbite_recent", JSON.stringify(next));
      return next;
    });
  }, [aiView, selectedRestaurantId, restaurants]);

  // ─── Auto-scroll chat ─────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ─── Fetch restaurants ────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingRestaurants(true);
        
        // Get user location and automatically fetch nearby restaurants
        const { location, restaurants: nearbyRestaurants } = 
          await getUserLocationAndNearbyRestaurants();
        
        setUserLocation(location);
        
        const transformed: Restaurant[] = nearbyRestaurants.map((r, i) => ({
          id: r.id || i,
          name: r.name,
          cuisine: r.cuisine,
          latitude: r.latitude,
          longitude: r.longitude,
          address: r.address,
          menu: Array.isArray(r.menu) ? r.menu : [],
          deliveryFee: r.deliveryFee ?? 3.99 + (i % 3) * 0.5,
          eta: r.eta ?? `${20 + (i % 15)} mins`,
          image: r.image ?? "/food-images/restaurant.svg",
          distance: r.distance,
        }));
        
        setRestaurants(transformed);
        if (transformed.length > 0) {
          setSelectedRestaurantId(transformed[0].id);
          // Show all restaurants by default
          setAiView("restaurants");
        }
        setLocationError(null);
      } catch (error) {
        console.error("Error loading restaurants:", error);
        setLocationError("Could not load restaurants. Please check your location.");
      } finally {
        setLoadingRestaurants(false);
      }
    };
    load();
  }, []);

  // ─── Fetch menu ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedRestaurantId) { setSelectedMenu([]); return; }
    const load = async () => {
      try {
        setLoadingMenu(true);
        const res = await fetch(
          `/api/restaurants/${encodeURIComponent(String(selectedRestaurantId))}/menu`
        );
        if (!res.ok) throw new Error();
        const data = (await res.json()) as MenuItem[];
        setSelectedMenu(Array.isArray(data) ? data : []);
      } catch {
        setSelectedMenu(restaurants.find((r) => r.id === selectedRestaurantId)?.menu ?? []);
      } finally {
        setLoadingMenu(false);
      }
    };
    load();
  }, [selectedRestaurantId, restaurants]);

  // ─── Auth redirect ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const selectedRestaurant = useMemo(
    () => restaurants.find((r) => r.id === selectedRestaurantId) ?? restaurants[0],
    [selectedRestaurantId, restaurants]
  );
  const deliveryFee = items.length > 0 ? (selectedRestaurant?.deliveryFee ?? 0) : 0;
  const orderTotal = Math.max(0, totalPrice + deliveryFee + tip - promoDiscount);

  // ─── Saved meals ──────────────────────────────────────────────────────────

  const toggleSavedMeal = (item: MenuItem, restaurant: Restaurant) => {
    const id = `${restaurant.id}:${item.id}`;
    setSavedMeals((prev) => {
      const next = prev.some((m) => m.id === id)
        ? prev.filter((m) => m.id !== id)
        : [
            ...prev,
            {
              id, name: item.name, price: item.price, image: item.image,
              restaurantId: String(restaurant.id), restaurantName: restaurant.name,
            },
          ];
      localStorage.setItem("quickbite_saved_meals", JSON.stringify(next));
      return next;
    });
  };

  const isSaved = (item: MenuItem, restaurant: Restaurant) =>
    savedMeals.some((m) => m.id === `${restaurant.id}:${item.id}`);

  // ─── Favorites ────────────────────────────────────────────────────────────

  const toggleFavorite = (rId: number) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(rId)) next.delete(rId);
      else next.add(rId);
      localStorage.setItem("quickbite_favorites", JSON.stringify([...next]));
      return next;
    });
  };

  // ─── Promo codes ──────────────────────────────────────────────────────────

  const PROMO_CODES: Record<string, number> = {
    PIZZA20: 0.20, BURGER15: 0.15, SUSHI25: 0.25,
    DELIVERY5: 5, FIRSTORDER: 10, WEEKDAY10: 0.10,
  };

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    const discount = PROMO_CODES[code];
    if (!discount) {
      setPromoError("Invalid promo code.");
      setPromoDiscount(0);
      return;
    }
    setPromoError(null);
    setPromoDiscount(discount < 1 ? totalPrice * discount : discount);
    setStatusMessage(`✅ Promo "${code}" applied!`);
  };

  // ─── Past orders ──────────────────────────────────────────────────────────

  const loadPastOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setPastOrders(Array.isArray(data.orders) ? data.orders : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  };

  // ─── Sidebar toggle ───────────────────────────────────────────────────────

  const toggleSidebar = (view: SidebarView) => {
    const next = sidebarView === view ? "none" : view;
    setSidebarView(next);
    if (next === "past-orders") loadPastOrders();
  };

  // ─── Reorder ──────────────────────────────────────────────────────────────

  const reorder = (order: PastOrder) => {
    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        addItem({
          id: item.id, name: item.name, price: item.price,
          restaurantId: item.restaurantId, restaurantName: item.restaurantName,
          image: item.image,
        });
      }
    }
    setIsOpen(true);
    setSidebarView("none");
  };

  // ─── Chat ─────────────────────────────────────────────────────────────────

  const addAssistantMessage = (content: string, cards?: ChatCard[]) => {
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "assistant", content, cards },
    ]);
  };

  const handleSendMessage = async (presetText?: string) => {
    const text = (presetText ?? chatInput).trim();
    if (!text || chatLoading) return;

    setChatMessages((prev) => [...prev, { id: Date.now(), role: "user", content: text }]);
    setChatInput("");
    setChatLoading(true);
    setStatusMessage(null);
    // Switch back to chat view when user sends a message
    setSidebarView("none");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          menuData: restaurants,
          currentCart: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
          messages: chatMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error();
      const data: ChatResponse = await res.json();
      const { reply, action } = data;

      if (action?.action === "add_to_cart" && action.restaurant && action.items) {
        const target = restaurants.find(
          (r) => r.name.toLowerCase() === action.restaurant?.toLowerCase()
        );
        if (target) {
          let addedCount = 0;
          const addedCards: ChatCard[] = [];
          for (const orderItem of action.items) {
            const menuItem = target.menu.find(
              (m) => m.name.toLowerCase() === orderItem.name.toLowerCase()
            );
            if (menuItem) {
              for (let i = 0; i < orderItem.quantity; i++) {
                addItem({
                  id: `${target.id}:${menuItem.id}`, name: menuItem.name,
                  price: menuItem.price, restaurantId: String(target.id),
                  restaurantName: target.name, image: menuItem.image,
                });
              }
              addedCount += orderItem.quantity;
              addedCards.push({
                type: "item", id: menuItem.id, name: menuItem.name,
                image: menuItem.image, subtitle: fmt(menuItem.price),
                restaurantId: target.id, restaurantName: target.name, itemData: menuItem,
              });
            }
          }
          if (addedCount > 0) {
            setStatusMessage(`✓ Added ${addedCount} item${addedCount > 1 ? "s" : ""} to cart.`);
            addAssistantMessage(
              `✓ Added ${action.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")} from ${action.restaurant} to your cart!`,
              addedCards
            );
            return;
          }
        }
      } else if (action?.action === "place_order" && action.delivery_address) {
        if (items.length === 0) {
          setStatusMessage("⚠️ Cart is empty");
        } else {
          const rId = items[0]?.restaurantId;
          if (!rId) { setStatusMessage("⚠️ Invalid restaurant"); return; }
          await saveOrder(rId, action.delivery_address);
          setStatusMessage("🚗 Your order is confirmed and on the way.");
          addAssistantMessage(`✅ Order confirmed! Your driver is heading to ${action.delivery_address}.`);
          return;
        }
      }

      const cards = findCards(reply, restaurants);
      addAssistantMessage(
        reply || "I couldn't generate a response.",
        cards.length > 0 ? cards : undefined
      );
    } catch {
      addAssistantMessage("Sorry, couldn't reach the AI. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  // ─── Checkout ─────────────────────────────────────────────────────────────

  const handleCheckout = async () => {
    if (!deliveryAddress.trim()) {
      setCheckoutError("Please enter a delivery address.");
      return;
    }
    const id = restaurantId ?? String(selectedRestaurantId);
    if (!id) return;
    try {
      setCheckoutError(null);
      await saveOrder(id, deliveryAddress);

      // Award reward points
      const earned = 100 + Math.floor(orderTotal);
      const existing = parseInt(localStorage.getItem("quickbite_points") ?? "0", 10);
      localStorage.setItem("quickbite_points", String(existing + earned));
      const prevOrders = JSON.parse(localStorage.getItem("quickbite_past_orders") ?? "[]");
      localStorage.setItem("quickbite_past_orders", JSON.stringify([{ created_at: new Date().toISOString(), total: orderTotal }, ...prevOrders]));

      setOrderSuccess(true);
      const timeNote = scheduledTime ? ` Scheduled for ${new Date(scheduledTime).toLocaleString()}.` : "";
      setStatusMessage(`🚗 Order confirmed!${timeNote} +${earned} pts earned!`);
      setDeliveryAddress("");
      setPromoCode("");
      setPromoDiscount(0);
      setScheduledTime("");
      setSplitCount(1);
      setTimeout(() => setOrderSuccess(false), 4000);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Could not place order. Please try again."
      );
    }
  };

  // ─── Guards ───────────────────────────────────────────────────────────────

  if (user?.role === "driver") return <DriverDashboard />;
  if (authLoading || !user) return null;

  if (loadingRestaurants) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-background to-zinc-100 dark:to-zinc-950">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 p-1">
            <div className="h-full w-full rounded-full bg-background dark:bg-slate-900" />
          </div>
          <p className="text-lg font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Loading restaurants near you...</p>
        </div>
      </div>
    );
  }

  if (locationError || restaurants.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-background to-zinc-100 dark:to-zinc-950">
        <div className="space-y-4 rounded-xl border-2 border-red-200 dark:border-red-900/30 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 p-8 text-center">
          <p className="text-4xl">🚨</p>
          <p className="font-bold text-lg text-red-800 dark:text-red-200">
            {locationError ?? "No restaurants found"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 px-6 py-2 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-zinc-100 dark:to-zinc-950 text-foreground">
      {/* Header */}
      <header className="relative overflow-hidden border-b border-orange-200 dark:border-orange-900/20 bg-gradient-to-r from-white via-orange-50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-6 py-5 shadow-lg">
        <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-orange-400/10 via-red-400/10 to-purple-400/10 dark:from-orange-500/5 dark:to-purple-500/5 pointer-events-none" />
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 relative z-10">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-orange-600 via-red-600 to-purple-600 bg-clip-text text-transparent">🍽️ QuickBite</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Welcome back, {user.name}</p>
              {userLocation && (
                <span className="inline-flex items-center gap-1 text-xs bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full font-medium">
                  📍 Near You
                </span>
              )}
              {restaurants.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full font-medium">
                  🎯 {restaurants.length} restaurants near you
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} aria-label="Toggle dark mode"
              className="rounded-full border-2 border-orange-200 dark:border-orange-700 w-10 h-10 flex items-center justify-center text-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/40 dark:hover:to-red-900/40 shadow-md hover:shadow-lg transition-all">
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Open cart"
              className="relative rounded-full border-2 border-orange-200 dark:border-orange-700 px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/40 dark:hover:to-red-900/40 shadow-md hover:shadow-lg transition-all"
            >
              <span className="inline-flex items-center gap-2">
                🛒 Cart
                <span className="inline-flex items-center justify-center w-6 h-6 bg-gradient-to-br from-red-500 to-orange-600 text-white text-xs font-bold rounded-full">
                  {totalItems}
                </span>
              </span>
            </button>
            <button
              onClick={() => { logout(); router.push("/login"); }}
              className="rounded-full bg-gradient-to-r from-orange-600 via-red-600 to-red-700 hover:from-orange-700 hover:via-red-700 hover:to-red-800 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:shadow-red-500/30 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-73px)]">
        {/* ── Sidebar ── */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-orange-200 dark:border-orange-900/20 bg-gradient-to-b from-white via-orange-50/50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 md:flex shadow-lg">
          <div className="p-6">
            {/* User Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-white text-lg font-black shadow-lg mx-auto mb-3">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <p className="text-center font-bold text-sm truncate text-foreground mb-4">{user?.name || "User"}</p>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              🔥 My Account
            </p>
            <div className="space-y-2">
              {(
                [
                  { view: "past-orders", label: "Past Orders", icon: "🧾" },
                  { view: "saved-meals", label: "Saved Meals", icon: "❤️" },
                  { view: "recently-viewed", label: "Recently Viewed", icon: "🕐" },
                ] as { view: SidebarView; label: string; icon: string }[]
              ).map(({ view, label, icon }) => (
                <button
                  key={view}
                  onClick={() => toggleSidebar(view)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                    sidebarView === view
                      ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30"
                      : "hover:bg-gradient-to-r hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/30 dark:hover:to-red-900/30"
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-orange-200 dark:border-orange-900/20 pt-4">
              <Link
                href="/orders/history"
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/30 dark:hover:to-red-900/30 transition-all"
              >
                🧾 Order History
              </Link>
              <Link
                href="/rewards"
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/30 dark:hover:to-red-900/30 transition-all"
              >
                🏆 Rewards
              </Link>
              <Link
                href="/deals"
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/30 dark:hover:to-red-900/30 transition-all"
              >
                🎟 Deals
              </Link>
              <Link
                href="/profile"
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-gradient-to-r hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/30 dark:hover:to-red-900/30 transition-all"
              >
                ⚙️ Settings
              </Link>
            </div>
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-3xl space-y-6">

              {/* Past Orders */}
              {sidebarView === "past-orders" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSidebarView("none")}
                      className="text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors"
                    >
                      ← Back
                    </button>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">🧾 Past Orders</h2>
                  </div>
                  {loadingOrders ? (
                    <div className="flex justify-center py-12">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-orange-300 border-t-orange-600" />
                    </div>
                  ) : pastOrders.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-orange-200 dark:border-orange-900/30 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 p-12 text-center">
                      <p className="mb-2 text-4xl">🧾</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-300">No past orders yet</p>
                    </div>
                  ) : (
                    pastOrders.map((order) => (
                      <div
                        key={order.id}
                        className="space-y-3 rounded-xl border-2 border-orange-200/50 dark:border-orange-900/30 bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-slate-900 p-4 hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-bold text-lg text-gray-900 dark:text-white">
                              {order.items[0]?.restaurantName ?? "Restaurant"}
                            </p>
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              {new Date(order.created_at).toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                              })}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              order.status === "delivered"
                                ? "bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-400"
                                : order.status === "cancelled"
                                ? "bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/40 dark:to-orange-900/40 text-red-700 dark:text-red-400"
                                : "bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 text-blue-700 dark:text-blue-400"
                            }`}
                          >
                            {order.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {order.items.map((item, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 rounded-lg border border-orange-200/30 dark:border-orange-900/30 bg-white dark:bg-slate-700 px-2.5 py-1.5 shadow-sm"
                            >
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={28}
                                height={28}
                                className="rounded object-cover"
                              />
                              <span className="text-xs font-medium text-gray-900 dark:text-white">
                                {item.quantity}× {item.name}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-orange-200/50 dark:border-orange-900/30 pt-3">
                          <p className="text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">{fmt(order.total_price)}</p>
                          <div className="flex items-center gap-2">
                            {[
                              "pending",
                              "confirmed",
                              "preparing",
                              "ready",
                              "in_transit",
                            ].includes(order.status) && (
                              <Link
                                href={`/orders/${order.id}`}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300"
                              >
                                📍 Track Order
                              </Link>
                            )}
                            {order.status === "delivered" && (
                              <Link
                                href="/orders/history"
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300"
                              >
                                ⭐ Rate
                              </Link>
                            )}
                            <button
                              onClick={() => reorder(order)}
                              className="rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all"
                            >
                              Reorder
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Saved Meals */}
              {sidebarView === "saved-meals" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSidebarView("none")}
                      className="text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors"
                    >
                      ← Back
                    </button>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">❤️ Saved Meals</h2>
                  </div>
                  {savedMeals.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-pink-200 dark:border-pink-900/30 bg-gradient-to-br from-pink-50 to-red-50 dark:from-pink-900/10 dark:to-red-900/10 p-12 text-center">
                      <p className="mb-2 text-4xl">❤️</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-300">
                        No saved meals yet — tap ♡ on any menu item
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {savedMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className="flex flex-col gap-3 rounded-xl border-2 border-pink-200/50 dark:border-pink-900/30 bg-gradient-to-br from-white to-pink-50 dark:from-slate-800 dark:to-slate-900 p-3 hover:shadow-lg transition-all"
                        >
                          <Image
                            src={meal.image}
                            alt={meal.name}
                            width={64}
                            height={64}
                            className="rounded-lg object-cover w-full h-32"
                          />
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 dark:text-white mb-0.5">{meal.name}</p>
                            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-2">{meal.restaurantName}</p>
                            <p className="text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">{fmt(meal.price)}</p>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-pink-200/50 dark:border-pink-900/30">
                            <button
                              onClick={() =>
                                addItem({
                                  id: meal.id, name: meal.name, price: meal.price,
                                  restaurantId: meal.restaurantId,
                                  restaurantName: meal.restaurantName,
                                  image: meal.image,
                                })
                              }
                              className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 px-3 py-1.5 text-xs font-bold text-white transition-all"
                            >
                              Add
                            </button>
                            <button
                              onClick={() =>
                                setSavedMeals((prev) => {
                                  const next = prev.filter((m) => m.id !== meal.id);
                                  localStorage.setItem(
                                    "quickbite_saved_meals",
                                    JSON.stringify(next)
                                  );
                                  return next;
                                })
                              }
                              className="px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-red-500 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recently Viewed */}
              {sidebarView === "recently-viewed" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSidebarView("none")}
                      className="text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors"
                    >
                      ← Back
                    </button>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">🕐 Recently Viewed</h2>
                  </div>
                  {recentRestaurants.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-900/30 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 p-12 text-center">
                      <p className="mb-2 text-4xl">🕐</p>
                      <p className="font-semibold text-gray-700 dark:text-gray-300">No recently viewed restaurants yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {recentRestaurants.map((r) => (
                        <div
                          key={r.id}
                          className="group overflow-hidden rounded-xl border-2 border-purple-200/50 dark:border-purple-900/30 bg-gradient-to-br from-white to-purple-50 dark:from-slate-800 dark:to-slate-900 shadow-md hover:shadow-lg transition-all"
                        >
                          <div className="relative overflow-hidden h-28">
                            <Image
                              src={r.image}
                              alt={r.name}
                              width={400}
                              height={160}
                              className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                            />
                          </div>
                          <div className="p-3">
                            <p className="font-bold text-gray-900 dark:text-white mb-1">{r.name}</p>
                            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-3">
                              {r.cuisine} · ⏱️ {r.eta}
                            </p>
                            <button
                              onClick={() => {
                                setSelectedRestaurantId(r.id);
                                setAiView("menu");
                                setSidebarView("none");
                              }}
                              className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 py-2 text-xs font-bold text-white transition-all"
                            >
                              View Menu →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Default: chat + AI views */}
              {sidebarView === "none" && (
                <>
                  <h2 className="text-center text-4xl font-black bg-gradient-to-r from-orange-600 via-red-600 to-purple-600 bg-clip-text text-transparent">
                    What are you craving today?
                  </h2>

                  {/* Chat messages */}
                  <div className="space-y-4">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={msg.role === "user" ? "flex justify-end" : "flex flex-col gap-3"}
                      >
                        <div
                          className={`max-w-lg rounded-2xl px-5 py-3 text-sm font-medium shadow-md ${
                            msg.role === "assistant"
                              ? "rounded-tl-sm bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-gray-100"
                              : "rounded-tr-sm bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30"
                          }`}
                        >
                          {msg.content}
                        </div>

                        {/* Image cards */}
                        {msg.cards && msg.cards.length > 0 && (
                          <div className="flex gap-3 overflow-x-auto pb-2 pt-1">
                            {msg.cards.map((card, ci) => (
                              <div
                                key={ci}
                                className="w-40 shrink-0 overflow-hidden rounded-xl border-2 border-orange-200 dark:border-orange-900/30 bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-slate-900 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 group"
                              >
                                <div className="relative overflow-hidden h-28">
                                  <Image
                                    src={card.image}
                                    alt={card.name}
                                    width={144}
                                    height={96}
                                    className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                                  />
                                </div>
                                <div className="p-3">
                                  <p className="truncate text-xs font-bold text-gray-900 dark:text-white mb-0.5">{card.name}</p>
                                  <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mb-2">{card.subtitle}</p>
                                  {card.type === "restaurant" ? (
                                    <button
                                      onClick={() => {
                                        setSelectedRestaurantId(card.id as number);
                                        setAiView("menu");
                                      }}
                                      className="w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 py-1.5 text-xs font-bold text-white transition-all"
                                    >
                                      View Menu
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        if (!card.itemData || card.restaurantId == null) return;
                                        const r = restaurants.find(
                                          (x) => x.id === card.restaurantId
                                        );
                                        if (r && card.itemData) {
                                          addItem({
                                            id: `${r.id}:${card.itemData.id}`,
                                            name: card.itemData.name,
                                            price: card.itemData.price,
                                            restaurantId: String(r.id),
                                            restaurantName: r.name,
                                            image: card.itemData.image,
                                          });
                                        }
                                      }}
                                      className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 py-1.5 text-xs font-bold text-white transition-all"
                                    >
                                      Add to Cart
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex gap-2 px-4 py-3">
                        <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-gradient-to-r from-orange-400 to-red-500" />
                        <div
                          className="h-2.5 w-2.5 animate-bounce rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="h-2.5 w-2.5 animate-bounce rounded-full bg-gradient-to-r from-orange-400 to-red-500"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                    )}

                    {chatMessages.length === 1 && !chatLoading && (
                      <div className="flex flex-wrap gap-2 px-1">
                        {["🍕 Pizza near me", "🍔 Show burgers", "🌮 Mexican food", "🍣 Sushi"].map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => handleSendMessage(prompt)}
                            className="rounded-full border-2 border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 transition-all hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* AI restaurant grid - DoorDash/Uber style with many columns */}
                  {aiView === "restaurants" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-orange-600">🏪 All Restaurants ({restaurants.length})</h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">Sorted by distance</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {restaurants.map((r, idx) => (
                          <div
                            key={r.id}
                            className="group overflow-hidden rounded-xl border border-orange-200/50 dark:border-orange-900/30 bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-slate-900 shadow-md hover:shadow-2xl hover:shadow-orange-500/20 transition-all hover:-translate-y-1 cursor-pointer"
                          >
                            <div className="relative overflow-hidden h-32">
                              <Image
                                src={r.image}
                                alt={r.name}
                                width={300}
                                height={150}
                                className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              <div className="absolute top-2 right-2 bg-orange-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                                #{idx + 1}
                              </div>
                            </div>
                            <div className="p-3">
                              <h3 className="font-bold text-sm mb-1 text-gray-900 dark:text-white line-clamp-2">{r.name}</h3>
                              <div className="flex flex-col gap-1.5 mb-2">
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/40 dark:to-red-900/40 text-orange-700 dark:text-orange-300 font-semibold">
                                    {r.cuisine}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 font-medium">
                                  <span>⏱️ {r.eta}</span>
                                  <span>💵 {fmt(r.deliveryFee)} delivery</span>
                                </div>
                                {r.distance !== undefined && (
                                  <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                    📍 {r.distance.toFixed(2)} miles away
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedRestaurantId(r.id);
                                  setAiView("menu");
                                }}
                                className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 py-2 text-xs font-bold text-white shadow-lg hover:shadow-xl transition-all"
                              >
                                Menu →
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI menu grid */}
                  {aiView === "menu" && selectedRestaurant && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => setAiView("restaurants")}
                          className="mt-1 text-sm font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors"
                        >
                          ← All Restaurants
                        </button>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedRestaurant.name}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/40 dark:to-red-900/40 text-orange-700 dark:text-orange-300">
                              {selectedRestaurant.cuisine}
                            </span>
                            <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/40 dark:to-cyan-900/40 text-blue-700 dark:text-blue-300">
                              ⏱️ {selectedRestaurant.eta}
                            </span>
                            <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 text-purple-700 dark:text-purple-300">
                              🚚 {fmt(selectedRestaurant.deliveryFee)} delivery
                            </span>
                          </div>
                        </div>
                      </div>
                      {loadingMenu ? (
                        <div className="flex justify-center py-16 col-span-full">
                          <div className="space-y-3 text-center">
                            <div className="mx-auto h-8 w-8 animate-spin rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 p-1">
                              <div className="h-full w-full rounded-full bg-background dark:bg-slate-900" />
                            </div>
                            <p className="font-semibold text-orange-600 dark:text-orange-400">Loading menu...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-5 md:grid-cols-2">
                          {selectedMenu.map((item) => (
                            <div
                              key={item.id}
                              className="group overflow-hidden rounded-xl border border-orange-200/50 dark:border-orange-900/30 bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-slate-900 shadow-md hover:shadow-2xl hover:shadow-orange-500/20 transition-all hover:-translate-y-1"
                            >
                              <div className="relative overflow-hidden h-48">
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={400}
                                  height={200}
                                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <div className="flex flex-col justify-between gap-3 p-4">
                                <div>
                                  <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{item.name}</h4>
                                  <p className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                                    {fmt(item.price)}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    onClick={() => toggleSavedMeal(item, selectedRestaurant)}
                                    aria-label={isSaved(item, selectedRestaurant) ? "Remove from saved" : "Save meal"}
                                    className="text-3xl hover:scale-125 transition-transform"
                                    title={isSaved(item, selectedRestaurant) ? "Unsave" : "Save"}
                                  >
                                    {isSaved(item, selectedRestaurant) ? "❤️" : "🤍"}
                                  </button>
                                  <button
                                    onClick={() =>
                                      addItem({
                                        id: String(item.id),
                                        name: item.name,
                                        price: item.price,
                                        restaurantId: String(selectedRestaurant.id),
                                        restaurantName: selectedRestaurant.name,
                                        image: item.image,
                                      })
                                    }
                                    className="flex-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
                                  >
                                    + Add
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Status banner */}
          {statusMessage && (
            <div className="px-6 pb-3">
              <div className="mx-auto max-w-3xl rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 px-4 py-3 text-sm font-semibold text-green-800 dark:text-green-300 shadow-lg">
                {statusMessage}
              </div>
            </div>
          )}

          {pendingSwitch && (
            <div className="px-6 pb-3">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-lg border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
                <p className="font-semibold">
                  Your cart has items from &quot;{pendingSwitch.currentName}&quot;. Switch to &quot;{pendingSwitch.newName}&quot;?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={confirmRestaurantSwitch}
                    className="rounded-md bg-gradient-to-r from-orange-500 to-red-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Yes
                  </button>
                  <button
                    onClick={cancelRestaurantSwitch}
                    className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chat input bar */}
          <div className="border-t border-orange-200 dark:border-orange-900/20 bg-gradient-to-r from-white via-orange-50/50 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 shadow-lg">
            <div className="mx-auto flex max-w-3xl gap-3">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask for food, e.g., 'Pizza near me' or 'Add burger to cart'"
                disabled={chatLoading}
                className="flex-1 rounded-full border-2 border-orange-200 dark:border-orange-700 bg-white dark:bg-slate-800 px-5 py-3 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-300/50 dark:focus:border-orange-600 dark:focus:ring-orange-400/30 disabled:opacity-50 transition-all shadow-md"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={chatLoading || !chatInput.trim()}
                aria-label="Send message"
                className="rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 px-6 py-3 text-lg font-bold text-white disabled:opacity-50 shadow-lg hover:shadow-xl transition-all hover:shadow-orange-500/30"
              >
                ➤
              </button>
            </div>
          </div>
        </div>

        {/* ── Cart panel ── */}
        {isOpen && (
          <div className="flex w-96 shrink-0 flex-col border-l-2 border-orange-200 dark:border-orange-900/20 bg-gradient-to-b from-white via-orange-50/30 to-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-orange-200 dark:border-orange-900/20 bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4 text-white shadow-lg">
              <h2 className="text-lg font-bold">🛒 Your Cart</h2>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/20 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {items.length === 0 ? (
                <div className="mt-12 text-center space-y-3">
                  <p className="text-4xl">🍕</p>
                  <p className="text-sm text-zinc-500 font-medium">Your cart is empty</p>
                  <p className="text-xs text-zinc-400">Start adding items from restaurants</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-orange-200/50 dark:border-orange-900/30 bg-gradient-to-r from-white to-orange-50 dark:from-slate-800 dark:to-slate-900 p-3 hover:shadow-md transition-all">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={48}
                      height={48}
                      className="rounded-lg object-cover w-12 h-12"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-xs font-bold text-orange-600 dark:text-orange-400">{fmt(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        className="flex h-5 w-5 items-center justify-center text-xs font-bold hover:bg-white/50 rounded transition-all leading-none"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                        className="flex h-5 w-5 items-center justify-center text-xs font-bold hover:bg-white/50 rounded transition-all leading-none"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-xs text-zinc-400 hover:text-red-500 font-bold transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="space-y-4 border-t-2 border-orange-200 dark:border-orange-900/20 bg-gradient-to-r from-orange-50 to-red-50 dark:from-slate-800 dark:to-slate-900 p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-700 dark:text-gray-300">Subtotal</span>
                    <span className="text-gray-900 dark:text-white font-bold">{fmt(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-gray-700 dark:text-gray-300">Delivery</span>
                    <span className="text-gray-900 dark:text-white font-bold">{fmt(deliveryFee)}</span>
                  </div>
                  {tip > 0 && (
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-700 dark:text-gray-300">Tip</span>
                      <span className="text-gray-900 dark:text-white font-bold">{fmt(tip)}</span>
                    </div>
                  )}
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-emerald-600 dark:text-emerald-400">Promo</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">-{fmt(promoDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-orange-200 dark:border-orange-900/30 pt-2 text-lg font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    <span>Total</span>
                    <span>{fmt(Math.max(0, orderTotal))}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {/* Tip */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Add a tip</p>
                    <div className="flex gap-2">
                      {[0, 1, 2, 3, 5].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setTip(amt)}
                          className={`flex-1 rounded-lg py-2 text-sm font-bold border-2 transition-all ${
                            tip === amt
                              ? "bg-gradient-to-r from-orange-500 to-red-600 text-white border-transparent"
                              : "border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300"
                          }`}
                        >
                          {amt === 0 ? "None" : `$${amt}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Promo Code */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Promo Code</p>
                    <div className="flex gap-2">
                      <input
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null); }}
                        placeholder="Enter code..."
                        className="flex-1 rounded-lg border-2 border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
                      />
                      <button onClick={applyPromo} className="px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold">
                        Apply
                      </button>
                    </div>
                    {promoError && <p className="text-xs text-red-500 font-semibold">{promoError}</p>}
                    {promoDiscount > 0 && <p className="text-xs text-emerald-600 font-semibold">✅ -{fmt(promoDiscount)} discount applied</p>}
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Delivery Address</p>
                    {savedAddresses.length > 0 && (
                      <select
                        onChange={(e) => { if (e.target.value) setDeliveryAddress(e.target.value); }}
                        className="w-full rounded-lg border-2 border-orange-200 dark:border-orange-700 bg-white dark:bg-slate-700 px-3 py-2 text-xs font-medium outline-none focus:border-orange-500 transition-all"
                      >
                        <option value="">— Saved addresses —</option>
                        {savedAddresses.map((a) => (
                          <option key={a.id} value={a.address}>{a.name}: {a.address}</option>
                        ))}
                      </select>
                    )}
                    <input
                      value={deliveryAddress}
                      onChange={(e) => { setDeliveryAddress(e.target.value); if (checkoutError) setCheckoutError(null); }}
                      placeholder="Or type a delivery address..."
                      className="w-full rounded-lg border-2 border-orange-200 dark:border-orange-700 bg-white dark:bg-slate-700 p-3 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-300/50 dark:focus:border-orange-600 dark:focus:ring-orange-400/30 transition-all"
                    />
                  </div>

                  {/* Scheduled Delivery */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Schedule Delivery</p>
                    <input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      min={new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16)}
                      className="w-full rounded-lg border-2 border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-700 px-3 py-2 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                    />
                    <p className="text-xs text-stone-400">{scheduledTime ? `Delivering at ${new Date(scheduledTime).toLocaleString()}` : "Leave blank for ASAP"}</p>
                  </div>

                  {/* Split Payment */}
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Split Payment</p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 border-2 border-purple-200 dark:border-purple-700 rounded-lg px-3 py-2">
                        <button onClick={() => setSplitCount(Math.max(1, splitCount - 1))} className="text-purple-600 font-bold text-sm w-5">−</button>
                        <span className="text-sm font-bold w-4 text-center">{splitCount}</span>
                        <button onClick={() => setSplitCount(Math.min(10, splitCount + 1))} className="text-purple-600 font-bold text-sm w-5">+</button>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-stone-400">
                        {splitCount > 1
                          ? <span className="font-bold text-purple-600 dark:text-purple-400">{fmt(orderTotal / splitCount)} per person</span>
                          : "Split with friends"}
                      </p>
                    </div>
                  </div>

                  {checkoutError && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{checkoutError}</p>}
                  {orderSuccess && (
                    <p className="text-center text-sm font-bold text-green-600 dark:text-green-400 animate-pulse">✓ Order placed! 🎉</p>
                  )}
                  <button
                    onClick={handleCheckout}
                    className="w-full rounded-lg bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all hover:shadow-orange-500/30"
                  >
                    ✓ Place Order {scheduledTime ? "📅" : "🚗"}
                  </button>
                  <button onClick={clearCart} className="w-full text-xs font-semibold text-zinc-500 hover:text-red-600 transition-colors py-2">
                    Clear cart
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
