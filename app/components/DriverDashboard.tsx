"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

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
  eta?: string;
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
  const [sortMode, setSortMode] = useState<"oldest" | "newest" | "highest_pay">("oldest");

  const [updatingOrder, setUpdatingOrder] = useState(false);
  // Earnings details panel removed (tabs now show summary)
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [proofNote, setProofNote] = useState("");
  const [proofPhotoUrl, setProofPhotoUrl] = useState("");
  const [proofFileName, setProofFileName] = useState("");
  const proofFileInputRef = useRef<HTMLInputElement>(null);
  const [eta, setEta] = useState("");
  const [showOrderChat, setShowOrderChat] = useState(false);
  const [orderMessages, setOrderMessages] = useState<
    Array<{ id: string; sender_role: "customer" | "driver"; content: string; created_at: string }>
  >([]);
  const [orderChatInput, setOrderChatInput] = useState("");
  const [sendingOrderMsg, setSendingOrderMsg] = useState(false);

  const isBusy = useMemo(() => activeOrder != null, [activeOrder]);
  const sortedOrders = useMemo(() => {
    const copy = [...orders];
    if (sortMode === "newest") {
      copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortMode === "highest_pay") {
      copy.sort((a, b) => Number(b.total_price ?? 0) - Number(a.total_price ?? 0));
    } else {
      copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
    return copy;
  }, [orders, sortMode]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const fetchDriverData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/driver/orders?userId=${encodeURIComponent(user.id)}`);
      const data = (await res.json().catch(() => null)) as
        | {
            orders?: unknown;
            activeOrder?: unknown;
            driver?: unknown;
            stats?: unknown;
            error?: string;
          }
        | null;
      if (!res.ok) throw new Error(data?.error ?? "Could not load driver data");
      const payload = data ?? {};
      setOrders(Array.isArray(payload.orders) ? (payload.orders as DriverOrder[]) : []);
      setActiveOrder((payload.activeOrder as DriverOrder | null) ?? null);
      setDriver((payload.driver as DriverProfile | null) ?? null);
      setStats(
        (payload.stats as DriverStats) ?? {
          todayEarnings: 0,
          totalEarnings: 0,
          completedDeliveries: 0,
          activeDeliveries: 0,
        }
      );
      const driverStatus = (payload.driver as DriverProfile | null)?.status;
      if (driverStatus) {
        setIsOnline(driverStatus !== "offline");
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
    const timer = setInterval(fetchDriverData, isBusy ? 8000 : 15000);
    return () => clearInterval(timer);
  }, [user?.id, isOnline, isBusy, fetchDriverData]);

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
        body: JSON.stringify({ orderId, userId: user.id }),
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

  const updateOrderStatus = async (
    status:
      | "arrived_at_restaurant"
      | "picked_up"
      | "arrived_at_customer"
      | "in_transit"
      | "delivered"
      | "cancelled"
  ) => {
    if (!user?.id || !activeOrder?.id) return;
    try {
      setUpdatingOrder(true);
      setErrorMessage(null);
      const res = await fetch("/api/driver/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeOrder.id,
          userId: user.id,
          status,
          eta: eta.trim() || undefined,
          proofNote: proofNote.trim() || undefined,
          proofPhotoUrl: proofPhotoUrl.trim() || undefined,
        }),
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

  useEffect(() => {
    if (!activeOrder) return;
    const anyOrder = activeOrder as unknown as { eta?: string; notes?: string };
    setEta(typeof anyOrder.eta === "string" ? anyOrder.eta : "");
    if (typeof anyOrder.notes === "string") {
      const noteMatch = anyOrder.notes.match(/Proof note:\s*(.*)/i);
      const photoMatch = anyOrder.notes.match(/Proof photo URL:\s*(.*)/i);
      setProofNote(noteMatch?.[1]?.trim() ?? "");
      setProofPhotoUrl(photoMatch?.[1]?.trim() ?? "");
    } else {
      setProofNote("");
      setProofPhotoUrl("");
    }
  }, [activeOrder]);


  const fetchOrderMessages = useCallback(async () => {
    if (!user?.id || !activeOrder?.id) return;
    try {
      const res = await fetch(
        `/api/messages?orderId=${encodeURIComponent(activeOrder.id)}&userId=${encodeURIComponent(
          user.id
        )}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as { messages?: typeof orderMessages };
      setOrderMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      // Ignore transient fetch errors for chat polling
    }
  }, [user?.id, activeOrder?.id]);

  useEffect(() => {
    if (!showOrderChat) return;
    fetchOrderMessages();
    const timer = setInterval(fetchOrderMessages, 5000);
    return () => clearInterval(timer);
  }, [showOrderChat, fetchOrderMessages]);

  const sendOrderMessage = async () => {
    if (!user?.id || !activeOrder?.id) return;
    if (!orderChatInput.trim() || sendingOrderMsg) return;
    try {
      setSendingOrderMsg(true);
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeOrder.id,
          userId: user.id,
          senderRole: "driver",
          content: orderChatInput.trim(),
        }),
      });
      setOrderChatInput("");
      await fetchOrderMessages();
    } finally {
      setSendingOrderMsg(false);
    }
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
            <Button
              onClick={toggleTheme}
              aria-label="Toggle dark mode"
              variant="outline"
              size="icon"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </Button>
            <Button
              onClick={handleToggleOnline}
              disabled={loadingToggle}
              className="rounded-full px-6"
              variant={isOnline ? "default" : "secondary"}
            >
              {loadingToggle ? "Updating..." : isOnline ? "🟢 Online" : "⚫ Offline"}
            </Button>

            <Button
              onClick={handleLogout}
              variant="outline"
              className="rounded-full px-5"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        {successMessage && (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="deliveries" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="deliveries" className="space-y-6">
            {activeOrder ? (
              <Card className="border-emerald-500/30">
                <CardHeader className="border-b">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle>🧾 Active delivery</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Order #{activeOrder.id.slice(0, 8)} • {activeOrder.delivery_address}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge variant="secondary" className="capitalize">
                          {String(activeOrder.status).replaceAll("_", " ")}
                        </Badge>
                        {eta.trim() && (
                          <Badge variant="outline">ETA: {eta.trim()}</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(
                          `https://maps.google.com?q=${encodeURIComponent(activeOrder.delivery_address)}`,
                          "_blank",
                          "noreferrer"
                        )
                      }
                    >
                      Open Maps
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Items:{" "}
                    {(activeOrder.items || [])
                      .map((it) => `${it.quantity ?? it.qty ?? 1}× ${it.name}`)
                      .join(", ") || "N/A"}
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Customer ETA
                      </p>
                      <Input
                        value={eta}
                        onChange={(e) => setEta(e.target.value)}
                        placeholder="e.g. 8-12 min"
                      />
                      <p className="text-xs text-muted-foreground">
                        Saved when you press any status update.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Proof of delivery
                      </p>
                      <Input
                        value={proofNote}
                        onChange={(e) => setProofNote(e.target.value)}
                        placeholder="Proof note (optional)"
                      />
                      <Input
                        value={proofPhotoUrl}
                        onChange={(e) => setProofPhotoUrl(e.target.value)}
                        placeholder="Proof photo URL (optional)"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={proofFileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            setProofFileName(file?.name ?? "");
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => proofFileInputRef.current?.click()}
                        >
                          📸 Take photo (demo)
                        </Button>
                        {proofFileName ? (
                          <span className="text-xs text-muted-foreground truncate">
                            Selected: {proofFileName}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Customer chat
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOrderChat((v) => !v)}
                      >
                        {showOrderChat ? "Hide" : "Open"}
                      </Button>
                    </div>

                    {showOrderChat && (
                      <div className="space-y-2">
                        <ScrollArea className="h-48 rounded-lg border bg-muted/30 p-3">
                          <div className="space-y-2 pr-2">
                            {orderMessages.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-6">
                                No messages yet. Send an update to your customer.
                              </p>
                            ) : (
                              orderMessages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`flex ${
                                    msg.sender_role === "driver"
                                      ? "justify-end"
                                      : "justify-start"
                                  }`}
                                >
                                  <div
                                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs font-medium ${
                                      msg.sender_role === "driver"
                                        ? "bg-emerald-600 text-white rounded-tr-sm"
                                        : "bg-background border rounded-tl-sm"
                                    }`}
                                  >
                                    {msg.content}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                        <div className="flex gap-2">
                          <Input
                            value={orderChatInput}
                            onChange={(e) => setOrderChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendOrderMessage()}
                            placeholder="Type a message..."
                          />
                          <Button
                            onClick={sendOrderMessage}
                            disabled={sendingOrderMsg || !orderChatInput.trim()}
                          >
                            Send
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => updateOrderStatus("arrived_at_restaurant")}
                      disabled={updatingOrder || activeOrder.status === "arrived_at_restaurant"}
                    >
                      🏪 Arrived restaurant
                    </Button>
                    <Button
                      onClick={() => updateOrderStatus("picked_up")}
                      disabled={updatingOrder || activeOrder.status === "picked_up"}
                    >
                      📦 Picked up
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => updateOrderStatus("in_transit")}
                      disabled={updatingOrder || activeOrder.status === "in_transit"}
                    >
                      🚗 En route
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => updateOrderStatus("arrived_at_customer")}
                      disabled={updatingOrder || activeOrder.status === "arrived_at_customer"}
                    >
                      📍 Arrived customer
                    </Button>
                    <Button
                      onClick={() => updateOrderStatus("delivered")}
                      disabled={updatingOrder}
                    >
                      ✅ Delivered
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmCancel(true)}
                      disabled={updatingOrder}
                    >
                      ❌ Cancel
                    </Button>
                  </div>

                  {confirmCancel && (
                    <Alert>
                      <AlertDescription>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold">
                            Cancel this delivery?
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => updateOrderStatus("cancelled")}
                            >
                              Yes, cancel
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmCancel(false)}
                            >
                              Keep
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No active order yet. Accept one below.
                </CardContent>
              </Card>
            )}

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-bold">📋 Available deliveries</h2>
                <Badge variant={isOnline ? "default" : "outline"}>
                  {isOnline ? "Online" : "Offline"}
                </Badge>
              </div>

              {!isOnline && (
                <Alert>
                  <AlertDescription>
                    You are offline. Go online to receive deliveries.
                  </AlertDescription>
                </Alert>
              )}

              {isOnline && sortedOrders.length === 0 && (
                <Card>
                  <CardContent className="py-6 text-sm text-muted-foreground">
                    Waiting for new orders...
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sort
                </span>
                <Button
                  variant={sortMode === "oldest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortMode("oldest")}
                >
                  Oldest
                </Button>
                <Button
                  variant={sortMode === "newest" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortMode("newest")}
                >
                  Newest
                </Button>
                <Button
                  variant={sortMode === "highest_pay" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortMode("highest_pay")}
                >
                  Highest pay
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sortedOrders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader className="border-b">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
                          <p className="text-xs text-muted-foreground">
                            📍 {order.delivery_address}
                          </p>
                        </div>
                        {order.eta ? (
                          <Badge variant="outline">ETA: {order.eta}</Badge>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-lg font-black">{fmt(Number(order.total_price ?? 0))}</div>
                      <Button
                        onClick={() => acceptOrder(order.id)}
                        disabled={updatingOrder || isBusy || !isOnline}
                        className="w-full"
                      >
                        Accept delivery
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="earnings" className="space-y-4">
            <h2 className="text-2xl font-bold">💰 Earnings</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4" role="status">
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today</p>
                  <p className="mt-2 text-2xl font-black">{fmt(stats.todayEarnings)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">This Week</p>
                  <p className="mt-2 text-2xl font-black">{fmt(stats.totalEarnings)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rating</p>
                  <p className="mt-2 text-2xl font-black">{(driver?.rating ?? 5).toFixed(1)} ⭐</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rides</p>
                  <p className="mt-2 text-2xl font-black">{stats.completedDeliveries}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-black/90 backdrop-blur p-4">
        <div className="mx-auto flex max-w-6xl justify-around gap-3">
          <Button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex-1"
          >
            🏠 Home
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/driver/orders")}
            className="flex-1"
          >
            📦 Orders
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/driver/profile")}
            className="flex-1"
          >
            👤 Profile
          </Button>
        </div>
      </nav>
    </div>
  );
}
