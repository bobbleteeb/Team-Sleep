"use client";

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

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<DriverOrder | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [stats, setStats] = useState<DriverStats>({
    todayEarnings: 0,
    totalEarnings: 0,
    completedDeliveries: 0,
    activeDeliveries: 0,
  });
  const [canAccept, setCanAccept] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<Record<string, boolean>>({});
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [dismissedOrders, setDismissedOrders] = useState<string[]>([]);

  const [vehicleInfo, setVehicleInfo] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [shiftStartedAt, setShiftStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const [proofNote, setProofNote] = useState("");
  const [proofPhotoUrl, setProofPhotoUrl] = useState("");

  const [copilotText, setCopilotText] = useState("");
  const [copilotPrompt, setCopilotPrompt] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  const shiftStorageKey = `driverShiftStart:${user?.id ?? "unknown"}`;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    const raw = localStorage.getItem(shiftStorageKey);
    if (!raw) return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      setShiftStartedAt(parsed);
    }
  }, [shiftStorageKey, user]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/driver/orders?driverId=${encodeURIComponent(user.id)}`);
      const data = (await res.json()) as DriverOrdersResponse;

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch driver orders");
      }

      const fetchedOrders = Array.isArray(data.orders) ? data.orders : [];
      setOrders(fetchedOrders);
      setActiveOrder(data.activeOrder ?? null);
      setDriver(data.driver ?? null);
      setStats(
        data.stats ?? {
          todayEarnings: 0,
          totalEarnings: 0,
          completedDeliveries: 0,
          activeDeliveries: 0,
        }
      );
      setCanAccept(Boolean(data.canAccept));

      if (data.driver) {
        setVehicleInfo(data.driver.vehicle_info ?? "");
        setLicenseNumber(data.driver.license_number ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const toggleOnline = async () => {
    if (!user || !driver) return;

    const goOnline = driver.status === "offline";

    setSavingProfile(true);
    setError(null);

    try {
      const res = await fetch("/api/driver/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: user.id,
          online: goOnline,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to update online status");
      }

      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update online status");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;

    setSavingProfile(true);
    setError(null);

    try {
      const res = await fetch("/api/driver/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: user.id,
          vehicleInfo,
          licenseNumber,
        }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile");
      }

      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const startShift = () => {
    const startedAt = Date.now();
    setShiftStartedAt(startedAt);
    localStorage.setItem(shiftStorageKey, String(startedAt));
  };

  const endShift = () => {
    setShiftStartedAt(null);
    localStorage.removeItem(shiftStorageKey);
  };

  const acceptOrder = async (orderId: string) => {
    if (!user || accepting[orderId] || !canAccept) return;

    setAccepting((prev) => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch("/api/driver/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, driverId: user.id }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to accept order");
      }

      await fetchOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not accept order");
    } finally {
      setAccepting((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const declineOrder = (orderId: string) => {
    setDismissedOrders((prev) => (prev.includes(orderId) ? prev : [...prev, orderId]));
  };

  const updateActiveOrderStatus = async (status: "in_transit" | "delivered" | "cancelled") => {
    if (!user || !activeOrder || updatingStatus) return;

    if (status === "delivered" && !proofNote.trim() && !proofPhotoUrl.trim()) {
      alert("Add at least a proof note or proof photo URL before completing dropoff.");
      return;
    }

    setUpdatingStatus(true);

    try {
      const res = await fetch("/api/driver/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeOrder.id,
          driverId: user.id,
          status,
          proofNote,
          proofPhotoUrl,
        }),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to update order status");
      }

      if (status === "delivered") {
        setProofNote("");
        setProofPhotoUrl("");
      }

      await fetchOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const generateDriverMessage = async (intent: DriverCopilotIntent) => {
    if (!activeOrder && intent !== "custom") {
      setCopilotError("Accept an order first to generate this type of message.");
      return;
    }

    setCopilotLoading(true);
    setCopilotError(null);

    try {
      const res = await fetch("/api/driver/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          driverName: user?.name,
          customPrompt: copilotPrompt,
          activeOrder,
        }),
      });

      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate message");
      }

      setCopilotText(data.message || "");
    } catch (err) {
      setCopilotError(err instanceof Error ? err.message : "Failed to generate message");
    } finally {
      setCopilotLoading(false);
    }
  };

  const copyCopilotText = async () => {
    if (!copilotText) return;

    try {
      await navigator.clipboard.writeText(copilotText);
    } catch {
      setCopilotError("Could not copy message automatically. Please copy manually.");
    }
  };

  const displayedOrders = useMemo(
    () => orders.filter((order) => !dismissedOrders.includes(order.id)),
    [dismissedOrders, orders]
  );

  if (user?.role !== "driver") {
    return null;
  }

  const isOnline = driver?.status !== "offline";
  const shiftDuration = shiftStartedAt ? formatDuration(now - shiftStartedAt) : "Not started";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-black/10 p-6 dark:border-white/20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">QuickBite Driver</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Welcome, {user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchOrders} className="text-sm text-zinc-600 hover:underline">
              Refresh
            </button>
            <button
              onClick={toggleOnline}
              disabled={savingProfile}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                isOnline
                  ? "bg-green-600 text-white"
                  : "bg-zinc-700 text-white"
              } disabled:opacity-60`}
            >
              {isOnline ? "Go Offline" : "Go Online"}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-8 p-6">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/20">
            <p className="text-sm text-zinc-500">Today Earnings</p>
            <p className="text-2xl font-semibold">{formatCurrency(stats.todayEarnings)}</p>
          </div>
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/20">
            <p className="text-sm text-zinc-500">Total Earnings</p>
            <p className="text-2xl font-semibold">{formatCurrency(stats.totalEarnings)}</p>
          </div>
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/20">
            <p className="text-sm text-zinc-500">Completed</p>
            <p className="text-2xl font-semibold">{stats.completedDeliveries}</p>
          </div>
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/20">
            <p className="text-sm text-zinc-500">Rating</p>
            <p className="text-2xl font-semibold">{Number(driver?.rating ?? 5).toFixed(1)} ⭐</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/20">
            <h2 className="text-lg font-semibold">Vehicle / Profile Setup</h2>
            <input
              value={vehicleInfo}
              onChange={(e) => setVehicleInfo(e.target.value)}
              placeholder="Vehicle info (e.g., Toyota Prius - Blue)"
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            />
            <input
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="License number"
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            />
            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>

          <div className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/20">
            <h2 className="text-lg font-semibold">Shift</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Current shift: {shiftDuration}</p>
            <div className="flex gap-2">
              <button
                onClick={startShift}
                disabled={Boolean(shiftStartedAt)}
                className="rounded border border-black/10 px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
              >
                Start Shift
              </button>
              <button
                onClick={endShift}
                disabled={!shiftStartedAt}
                className="rounded border border-black/10 px-3 py-2 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
              >
                End Shift
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-black/10 p-4 dark:border-white/20">
          <h2 className="text-xl font-semibold">Current Delivery</h2>
          {!activeOrder ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No active delivery. Accept an order below.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Order #{activeOrder.id}</p>
              <p className="font-medium">Deliver to: {activeOrder.delivery_address}</p>
              <p className="text-sm text-zinc-500">Status: {activeOrder.status ?? "confirmed"}</p>
              <p className="text-sm text-zinc-500">Total: {formatCurrency(activeOrder.total_price)}</p>
              <ul className="list-disc pl-5 text-sm text-zinc-700">
                {activeOrder.items?.map((it, idx) => (
                  <li key={`${activeOrder.id}-${idx}`}>
                    {it.qty ?? it.quantity ?? 1} x {it.name}
                  </li>
                ))}
              </ul>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <input
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="Proof note (e.g., left at front door)"
                  className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
                />
                <input
                  value={proofPhotoUrl}
                  onChange={(e) => setProofPhotoUrl(e.target.value)}
                  placeholder="Proof photo URL (optional for demo)"
                  className="rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => updateActiveOrderStatus("in_transit")}
                  disabled={updatingStatus || activeOrder.status === "in_transit"}
                  className="rounded border border-black/10 px-3 py-1 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
                >
                  Confirm Pickup
                </button>
                <button
                  onClick={() => updateActiveOrderStatus("delivered")}
                  disabled={updatingStatus}
                  className="rounded bg-foreground px-3 py-1 text-sm font-medium text-background disabled:opacity-60"
                >
                  Confirm Dropoff
                </button>
                <button
                  onClick={() => updateActiveOrderStatus("cancelled")}
                  disabled={updatingStatus}
                  className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  Report Issue / Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        <OrderMessagePanel
          title="Customer Chat"
          orderId={activeOrder?.id ?? null}
          userId={user.id}
          role="driver"
        />

        <section className="space-y-4 rounded-xl border border-black/10 p-4 dark:border-white/20">
          <h2 className="text-xl font-semibold">Driver Copilot</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Generate ready-to-send customer updates with one tap.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => generateDriverMessage("eta_update")}
              disabled={copilotLoading}
              className="rounded border border-black/10 px-3 py-1 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
            >
              ETA Update
            </button>
            <button
              onClick={() => generateDriverMessage("arrival_message")}
              disabled={copilotLoading}
              className="rounded border border-black/10 px-3 py-1 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
            >
              Arrival Message
            </button>
            <button
              onClick={() => generateDriverMessage("cannot_reach_customer")}
              disabled={copilotLoading}
              className="rounded border border-black/10 px-3 py-1 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
            >
              Cannot Reach Customer
            </button>
            <button
              onClick={() => generateDriverMessage("delay_notice")}
              disabled={copilotLoading}
              className="rounded border border-black/10 px-3 py-1 text-sm hover:bg-black/5 disabled:opacity-60 dark:border-white/20 dark:hover:bg-white/10"
            >
              Delay Notice
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Custom Request</label>
            <textarea
              value={copilotPrompt}
              onChange={(e) => setCopilotPrompt(e.target.value)}
              rows={3}
              placeholder="Example: Ask customer for gate code and mention I am 8 minutes away"
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            />
            <button
              onClick={() => generateDriverMessage("custom")}
              disabled={copilotLoading || !copilotPrompt.trim()}
              className="rounded bg-foreground px-3 py-1 text-sm font-medium text-background disabled:opacity-60"
            >
              {copilotLoading ? "Generating..." : "Generate Custom Message"}
            </button>
          </div>

          {copilotError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {copilotError}
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
    </div>
  );
}
