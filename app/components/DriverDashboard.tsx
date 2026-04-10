"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";

type DriverProfile = {
  id: string;
  status: "available" | "busy" | "offline";
  rating: number;
  total_deliveries: number;
  vehicle_info?: string;
  license_number?: string;
};

type DriverOrder = {
  id: string;
  delivery_address: string;
  items: Array<{ name: string; quantity?: number; qty?: number; price?: number }>;
  total_price: number;
  status: string;
  created_at: string;
};

type DriverStats = {
  todayEarnings: number;
  totalEarnings: number;
  completedDeliveries: number;
  activeDeliveries: number;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [isOnline, setIsOnline] = useState(true);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<DriverOrder | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [stats, setStats] = useState<DriverStats>({
    todayEarnings: 0,
    totalEarnings: 0,
    completedDeliveries: 0,
    activeDeliveries: 0,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [intent, setIntent] = useState<
    "eta_update" | "cannot_reach_customer" | "arrival_message" | "delay_notice"
  >("eta_update");
  const [copilotText, setCopilotText] = useState("");
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [showEarningsPanel, setShowEarningsPanel] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const isBusy = useMemo(() => activeOrder != null, [activeOrder]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const fetchDriverData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/driver/orders?driverId=${encodeURIComponent(user.id)}`);
      if (!res.ok) throw new Error("Could not load driver data");
      const data = await res.json();
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setActiveOrder((data.activeOrder as DriverOrder | null) ?? null);
      setDriver((data.driver as DriverProfile | null) ?? null);
      setStats(
        (data.stats as DriverStats) ?? {
          todayEarnings: 0,
          totalEarnings: 0,
          completedDeliveries: 0,
          activeDeliveries: 0,
        }
      );
      if (data.driver?.status) {
        setIsOnline(data.driver.status !== "offline");
      }
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load driver data");
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    fetchDriverData();
  }, [user?.id, fetchDriverData]);

  useEffect(() => {
    if (!user?.id || !isOnline) return;
    const timer = setInterval(fetchDriverData, 15000);
    return () => clearInterval(timer);
  }, [user?.id, isOnline, fetchDriverData]);

  const handleToggleOnline = async () => {
    if (!user?.id || loadingToggle) return;
    const nextOnline = !isOnline;
    try {
      setLoadingToggle(true);
      setErrorMessage(null);
      const res = await fetch("/api/driver/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: user.id, online: nextOnline }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Unable to update status");
      }
      setIsOnline(nextOnline);
      setDriver((prev) => (prev ? { ...prev, status: nextOnline ? "available" : "offline" } : prev));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to update status");
    } finally {
      setLoadingToggle(false);
    }
  };

  const acceptOrder = async (orderId: string) => {
    if (!user?.id) return;
    try {
      setUpdatingOrder(true);
      setErrorMessage(null);
      const res = await fetch("/api/driver/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, driverId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Unable to accept order");
      }
      await fetchDriverData();
      setSuccessMessage("Delivery accepted. Navigate to customer now.");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to accept order");
    } finally {
      setUpdatingOrder(false);
    }
  };

  const updateOrderStatus = async (status: "in_transit" | "delivered" | "cancelled") => {
    if (!user?.id || !activeOrder?.id) return;
    try {
      setUpdatingOrder(true);
      setErrorMessage(null);
      const res = await fetch("/api/driver/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: activeOrder.id, driverId: user.id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Unable to update order");
      }
      setConfirmCancel(false);
      await fetchDriverData();
      if (status === "delivered") {
        setSuccessMessage("Order delivered. Great job!");
        setTimeout(() => setSuccessMessage(null), 2500);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to update order");
    } finally {
      setUpdatingOrder(false);
    }
  };

  const generateDriverMessage = async () => {
    if (!user?.name) return;
    try {
      setGeneratingMessage(true);
      const res = await fetch("/api/driver/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          driverName: user.name,
          activeOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate message");
      setCopilotText(data.message ?? "");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to generate message");
    } finally {
      setGeneratingMessage(false);
    }
  };

  const copyCopilotText = async () => {
    if (!copilotText.trim()) return;
    await navigator.clipboard.writeText(copilotText);
    setSuccessMessage("Message copied to clipboard");
    setTimeout(() => setSuccessMessage(null), 2200);
  };

  if (user?.role !== "driver") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-950 dark:to-zinc-900 pb-32 text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-black/90 backdrop-blur px-6 py-5">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">QuickBite Driver</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Welcome, {user?.name}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              className="h-10 w-10 rounded-full border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-lg"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              onClick={handleToggleOnline}
              disabled={loadingToggle}
              className={`rounded-full px-6 py-2.5 text-sm font-bold text-white transition-all ${
                isOnline ? "bg-emerald-600 hover:bg-emerald-700" : "bg-zinc-500 hover:bg-zinc-600"
              } disabled:opacity-60`}
            >
              {loadingToggle ? "Updating..." : isOnline ? "🟢 Online" : "⚫ Offline"}
            </button>

            <button
              onClick={handleLogout}
              className="rounded-full border-2 border-zinc-300 dark:border-zinc-700 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
        {errorMessage && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            {successMessage}
          </div>
        )}

        {activeOrder ? (
          <div className="rounded-2xl border-2 border-emerald-300/70 dark:border-emerald-900/50 bg-white dark:bg-zinc-950 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 font-bold mb-2">🧾 Active Delivery</p>
            <p className="text-lg font-bold">Order #{activeOrder.id.slice(0, 8)}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">📍 {activeOrder.delivery_address}</p>
            <p className="text-sm mt-2 text-zinc-600 dark:text-zinc-400">
              Items: {(activeOrder.items || []).map((it) => `${it.quantity ?? it.qty ?? 1}× ${it.name}`).join(", ") || "N/A"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => updateOrderStatus("in_transit")}
                disabled={updatingOrder || activeOrder.status === "in_transit"}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                🚗 Mark En Route
              </button>
              <button
                onClick={() => updateOrderStatus("delivered")}
                disabled={updatingOrder}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                ✅ Mark Delivered
              </button>
              <button
                onClick={() => setConfirmCancel(true)}
                disabled={updatingOrder}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                ❌ Cancel
              </button>
              <a
                href={`https://maps.google.com?q=${encodeURIComponent(activeOrder.delivery_address)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-bold dark:border-zinc-700"
              >
                🗺️ Open in Maps
              </a>
            </div>
            {confirmCancel && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-900/20">
                <p className="font-semibold">Cancel this delivery?</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => updateOrderStatus("cancelled")}
                    className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Yes, cancel
                  </button>
                  <button
                    onClick={() => setConfirmCancel(false)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-bold dark:border-zinc-700"
                  >
                    Keep order
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-40 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center justify-center">
            <p className="text-zinc-500">No active order yet. Accept one below.</p>
          </div>
        )}

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">📋 Available Deliveries</h2>
          {!isOnline && (
            <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-5 text-sm font-semibold">
              You are offline. Go online to receive deliveries.
            </div>
          )}
          {isOnline && orders.length === 0 && (
            <div className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-5 text-sm font-semibold">
              Waiting for new orders...
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
                <p className="font-bold">Order #{order.id.slice(0, 8)}</p>
                <p className="text-xs text-zinc-500 mt-1">📍 {order.delivery_address}</p>
                <p className="text-lg font-black mt-2">{fmt(Number(order.total_price ?? 0))}</p>
                <button
                  onClick={() => acceptOrder(order.id)}
                  disabled={updatingOrder || isBusy || !isOnline}
                  className="mt-3 w-full rounded-lg bg-black hover:bg-zinc-800 py-2 text-sm font-bold text-white disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  Accept Delivery
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">💰 Earnings</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="status">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Today</p>
              <p className="text-2xl font-black mt-2">{fmt(stats.todayEarnings)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">This Week</p>
              <p className="text-2xl font-black mt-2">{fmt(stats.totalEarnings)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Rating</p>
              <p className="text-2xl font-black mt-2">{(driver?.rating ?? 5).toFixed(1)} ⭐</p>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Rides</p>
              <p className="text-2xl font-black mt-2">{stats.completedDeliveries}</p>
            </div>
          </div>

          {showEarningsPanel && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-sm">
              <p>Average per delivery: {fmt(stats.completedDeliveries > 0 ? stats.totalEarnings / stats.completedDeliveries : 0)}</p>
              <p className="mt-1">Active deliveries: {stats.activeDeliveries}</p>
            </div>
          )}

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3">
            <label className="block text-sm font-bold uppercase tracking-wider text-zinc-500">Driver Copilot</label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={intent}
                onChange={(e) => setIntent(e.target.value as typeof intent)}
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              >
                <option value="eta_update">ETA Update</option>
                <option value="cannot_reach_customer">Cannot Reach Customer</option>
                <option value="arrival_message">Arrival Message</option>
                <option value="delay_notice">Delay Notice</option>
              </select>
              <button
                onClick={generateDriverMessage}
                disabled={generatingMessage}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-black"
              >
                {generatingMessage ? "Generating..." : "Generate Message"}
              </button>
            </div>
            <textarea
              value={copilotText}
              onChange={(e) => setCopilotText(e.target.value)}
              rows={4}
              placeholder="Generated message appears here..."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-sm"
            />
            <button
              onClick={copyCopilotText}
              disabled={!copilotText.trim()}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-bold disabled:opacity-50"
            >
              Copy Message
            </button>
          </div>
        </section>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-black/90 backdrop-blur p-4">
        <div className="mx-auto flex max-w-6xl justify-around gap-3">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex-1 rounded-lg bg-black text-white py-2.5 font-bold dark:bg-white dark:text-black"
          >
            🏠 Home
          </button>
          <button
            onClick={() => setShowEarningsPanel((prev) => !prev)}
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 py-2 font-semibold"
          >
            💸 Earnings
          </button>
          <button
            onClick={() => router.push("/driver/profile")}
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 py-2 font-semibold"
          >
            👤 Profile
          </button>
        </div>
      </nav>
    </div>
  );
}
