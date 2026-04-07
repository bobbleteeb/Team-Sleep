"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import OrderMessagePanel from "./OrderMessagePanel";

type OrderItem = {
  name: string;
  qty?: number;
  quantity?: number;
};

type DriverOrder = {
  id: string;
  delivery_address: string;
  items?: OrderItem[];
  total_price?: number;
  status?: string;
  created_at?: string;
  notes?: string;
};

type DriverProfile = {
  id: string;
  status: "available" | "busy" | "offline";
  rating?: number;
  total_deliveries?: number;
  vehicle_info?: string;
  license_number?: string;
};

type DriverStats = {
  todayEarnings: number;
  totalEarnings: number;
  completedDeliveries: number;
  activeDeliveries: number;
};

type DriverOrdersResponse = {
  orders?: DriverOrder[];
  activeOrder?: DriverOrder | null;
  canAccept?: boolean;
  driver?: DriverProfile | null;
  stats?: DriverStats;
  error?: string;
};

type DriverCopilotIntent =
  | "eta_update"
  | "cannot_reach_customer"
  | "arrival_message"
  | "delay_notice"
  | "custom";

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value ?? 0
  );

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

type Order = {
  id: number;
  restaurant: string;
  distance: string;
  payout: string;
};

const RESTAURANTS = [
  "McDonald's",
  "Chipotle",
  "Wendy's",
  "Subway",
  "Chick-fil-A",
];

function generateFakeOrder(id: number): Order {
  return {
    id,
    restaurant:
      RESTAURANTS[Math.floor(Math.random() * RESTAURANTS.length)],
    distance: (Math.random() * 3 + 0.5).toFixed(1),
    payout: (Math.random() * 10 + 5).toFixed(2),
  };
}

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [isOnline, setIsOnline] = useState<boolean>(true);

  const [orders, setOrders] = useState<Order[]>([]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  useEffect(() => {
    if (!isOnline) return;

    let orderId = 1;

    const interval = setInterval(() => {
      const newOrder = generateFakeOrder(orderId++);

      setOrders((prev) => [newOrder, ...prev].slice(0, 5)); // limit to 5

      setTimeout(() => {
        setOrders((prev) => prev.filter((o) => o.id !== newOrder.id));
      }, 15000);
    }, 5000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const acceptOrder = (id: number) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  if (user?.role !== "driver") return null;

  const isOnline = driver?.status !== "offline";
  const shiftDuration = shiftStartedAt ? formatDuration(now - shiftStartedAt) : "Not started";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* HEADER */}
      <header className="border-b border-black/10 p-4 dark:border-white/20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">QuickByte</h1>
            <p className="text-sm text-zinc-500">Driver Mode</p>
          </div>

          <div className="flex items-center gap-3">
            {/* STATUS TOGGLE */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`rounded-full px-5 py-2 text-sm font-semibold text-white shadow-md transition ${
                isOnline
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-zinc-400 hover:bg-zinc-500"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </button>

            <button
              onClick={handleLogout}
              className="rounded-full border px-3 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4">
        {/* MAP PLACEHOLDER */}
        <div className="h-48 rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
          <p className="text-sm text-zinc-500">Map View (Coming Soon)</p>
        </div>

        {/* AVAILABLE DELIVERIES */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Available Deliveries</h2>

          {!isOnline && (
            <div className="rounded-xl border p-6 text-center text-zinc-500">
              You are offline. Go online to receive deliveries.
            </div>
          )}

          {isOnline && orders.length === 0 && (
            <div className="text-sm text-zinc-500">
              Waiting for new orders...
            </div>
          )}

          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-2xl border border-black/10 p-4 shadow-sm transition hover:shadow-md hover:scale-[1.01] animate-in fade-in slide-in-from-bottom-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{order.restaurant}</p>
                    <p className="text-sm text-zinc-500">
                      {order.distance} miles • ${order.payout}
                    </p>
                  </div>

                  <button
                    onClick={() => acceptOrder(order.id)}
                    className="rounded-full bg-black px-4 py-2 text-sm text-white"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* EARNINGS */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Earnings</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-black p-4 text-white">
              <p className="text-sm opacity-70">Today</p>
              <p className="text-2xl font-bold">$0.00</p>
            </div>

            <div className="rounded-2xl border border-black/10 p-4">
              <p className="text-sm text-zinc-500">This Week</p>
              <p className="text-2xl font-bold">$0.00</p>
            </div>

            <div className="rounded-2xl border border-black/10 p-4 col-span-2">
              <p className="text-sm text-zinc-500">Rating</p>
              <p className="text-xl font-bold">5.0 ⭐</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium">Generated Message</label>
            <textarea
              value={copilotText}
              onChange={(e) => setCopilotText(e.target.value)}
              rows={4}
              placeholder="Your generated customer message will appear here"
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            />
            <button
              onClick={copyCopilotText}
              disabled={!copilotText.trim()}
              className="rounded border border-black/10 px-3 py-1 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
            >
              Copy Message
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Order Offers</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isOnline
              ? "You are online and receiving offers."
              : "You are offline. Go online to receive new order offers."}
          </p>

          {loading ? (
            <div className="rounded-xl border border-black/10 p-8 text-center text-zinc-600 dark:border-white/20 dark:text-zinc-400">
              <p>Loading available deliveries...</p>
            </div>
          ) : displayedOrders.length === 0 ? (
            <div className="rounded-xl border border-black/10 p-8 text-center text-zinc-600 dark:border-white/20 dark:text-zinc-400">
              <p>No pending orders right now.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {displayedOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-black/10 p-4 dark:border-white/20">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">Order #{order.id}</p>
                      <p className="font-medium">{order.delivery_address}</p>
                      <p className="text-sm text-zinc-500">Items: {order.items?.length ?? 0}</p>
                      <p className="text-sm text-zinc-500">Total: {formatCurrency(order.total_price)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => acceptOrder(order.id)}
                        disabled={!canAccept || !isOnline || !!accepting[order.id]}
                        className="rounded bg-foreground px-3 py-1 text-sm font-medium text-background disabled:opacity-60"
                        title={!canAccept ? "Finish current delivery first" : "Accept this order"}
                      >
                        {accepting[order.id] ? "Accepting..." : "Accept"}
                      </button>
                      <button
                        onClick={() => declineOrder(order.id)}
                        className="rounded border border-black/10 px-3 py-1 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-black/10 bg-white p-3 dark:border-white/20 dark:bg-black">
        <div className="mx-auto flex max-w-6xl justify-around text-sm">
          <button className="font-medium">Home</button>
          <button className="text-zinc-500">Earnings</button>
          <button className="text-zinc-500">Profile</button>
        </div>
      </nav>
    </div>
  );
}
