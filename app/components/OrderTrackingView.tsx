"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Order = {
  id: string;
  restaurant_id: string;
  items: Array<{ id: string; name: string; price: number; quantity: number; image: string }>;
  total_price: number;
  tip?: number;
  delivery_address: string;
  dropoffInstructions?: string | null;
  status: string;
  created_at: string;
  driver?: string | null;
  eta?: string | null;
  notes?: string | null;
};

type Message = {
  id: string;
  sender_role: "customer" | "driver";
  content: string;
  created_at: string;
};

const statusSteps = [
  "placed",
  "confirmed",
  "preparing",
  "arrived_at_restaurant",
  "picked_up",
  "in_transit",
  "arrived_at_customer",
  "delivered",
];

export function OrderTrackingView({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Chat
  const [showChat, setShowChat] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadFromDriver, setUnreadFromDriver] = useState(0);
  const [chatToast, setChatToast] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSeenMessageId = useRef<string | null>(null);

  // Status + tip
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [tipDraft, setTipDraft] = useState<number>(0);
  const [savingTip, setSavingTip] = useState(false);
  const prevStatus = useRef<string | null>(null);

  // Notification permission (demo)
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => setNotifGranted(perm === "granted"));
    } else if ("Notification" in window && Notification.permission === "granted") {
      setNotifGranted(true);
    }
  }, []);

  const sendPushNotification = (title: string, body: string) => {
    if (!("Notification" in window)) return;
    if (notifGranted || Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };

  const currentStepIndex = useMemo(() => {
    if (!order) return -1;
    return statusSteps.indexOf(order.status);
  }, [order]);

  const fetchOrder = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/orders/${orderId}?userId=${encodeURIComponent(user.id)}`);
      if (!res.ok) return;
      const data: Order = await res.json();
      setTipDraft(Number.isFinite(data.tip) ? Number(data.tip) : 0);

      if (prevStatus.current && prevStatus.current !== data.status) {
        const statusLabels: Record<string, string> = {
          confirmed: "Your order has been confirmed!",
          preparing: "Your food is being prepared.",
          picked_up: "Your driver picked up your order.",
          in_transit: "Your driver is on the way!",
          arrived_at_customer: "Your driver has arrived.",
          delivered: "Your order has been delivered. Enjoy!",
        };
        const msg = statusLabels[data.status];
        if (msg) {
          sendPushNotification("QuickBite Update", msg);
          setStatusToast(msg);
          setTimeout(() => setStatusToast(null), 4500);
        }
      }

      prevStatus.current = data.status;
      setOrder(data);
    } catch (e) {
      console.error("Failed to fetch order:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, user?.id]);

  const saveTip = async () => {
    if (!user || !order || savingTip) return;
    if (order.status === "delivered" || order.status === "cancelled") return;
    setSavingTip(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, tip: tipDraft }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const nextTotal = Number(data?.order?.total_price ?? order.total_price);
      const nextTip = Number(data?.order?.tip ?? tipDraft);
      setOrder((prev) => (prev ? { ...prev, total_price: nextTotal, tip: nextTip } : prev));
      setStatusToast("Tip updated");
      setTimeout(() => setStatusToast(null), 3000);
    } catch (e) {
      console.error("Failed to update tip:", e);
    } finally {
      setSavingTip(false);
    }
  };

  const fetchMessages = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/messages?orderId=${orderId}&userId=${user.id}`);
      if (!res.ok) return;
      const data = await res.json();
      const nextMessages = (data.messages ?? []) as Message[];
      setMessages(nextMessages);

      const lastSeen = lastSeenMessageId.current;
      const lastIndex = lastSeen ? nextMessages.findIndex((m) => m.id === lastSeen) : -1;
      const newSlice = lastIndex >= 0 ? nextMessages.slice(lastIndex + 1) : nextMessages;
      const newDriverMessages = newSlice.filter((m) => m.sender_role === "driver");

      if (newDriverMessages.length > 0) {
        if (!showChat) {
          setUnreadFromDriver((prev) => prev + newDriverMessages.length);
          const latest = newDriverMessages[newDriverMessages.length - 1];
          setChatToast(`New message from your driver: "${latest.content}"`);
          setTimeout(() => setChatToast(null), 4500);
        }
        if ("Notification" in window && Notification.permission === "granted") {
          const latest = newDriverMessages[newDriverMessages.length - 1];
          new Notification("QuickBite Driver", { body: latest.content, icon: "/favicon.ico" });
        }
      }

      if (showChat && nextMessages.length > 0) {
        lastSeenMessageId.current = nextMessages[nextMessages.length - 1]?.id ?? null;
        setUnreadFromDriver(0);
      } else if (lastSeenMessageId.current == null && nextMessages.length > 0) {
        lastSeenMessageId.current = nextMessages[nextMessages.length - 1]?.id ?? null;
      }
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  };

  useEffect(() => {
    if (!showChat || !user) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChat, user?.id, orderId]);

  useEffect(() => {
    if (showChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showChat]);

  const sendMessage = async () => {
    if (!chatInput.trim() || !user || sendingMsg) return;
    setSendingMsg(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          userId: user.id,
          senderRole: "customer",
          content: chatInput.trim(),
        }),
      });
      setChatInput("");
      await fetchMessages();
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setSendingMsg(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-background text-foreground flex items-center justify-center">
        <div className="text-lg font-semibold">Loading order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <div className="text-lg font-semibold">Order not found</div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-background to-zinc-100 dark:to-zinc-950 text-foreground">
      {statusToast && (
        <div className="fixed top-5 right-5 z-50 max-w-sm rounded-xl border-2 border-orange-200 dark:border-orange-900/30 bg-white dark:bg-slate-900 p-4 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-orange-700 dark:text-orange-300 mb-1">
            Order update
          </p>
          <p className="text-sm font-semibold">{statusToast}</p>
        </div>
      )}
      {chatToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border-2 border-blue-200 dark:border-blue-900/30 bg-white dark:bg-slate-900 p-4 shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300 mb-1">
            New message
          </p>
          <p className="text-sm font-semibold">{chatToast}</p>
          <button
            onClick={() => {
              setShowChat(true);
              setChatToast(null);
            }}
            className="mt-3 w-full rounded-lg bg-blue-600 hover:bg-blue-700 py-2 text-xs font-bold text-white"
          >
            Open chat
          </button>
        </div>
      )}

      <header className="border-b border-orange-200 dark:border-orange-900/20 bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={onClose}
            aria-label="Go back"
            className="text-2xl hover:opacity-70 transition-opacity"
          >
            ←
          </button>
          <h1 className="text-xl font-bold">📍 Tracking Order</h1>
          <div className="ml-auto flex items-center gap-2">
            {unreadFromDriver > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-black text-white">
                {unreadFromDriver}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Status Stepper */}
        <div className="rounded-xl border-2 border-orange-200 dark:border-orange-900/30 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-6">
            📦 Order Status
          </h2>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, idx) => (
              <div key={step} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${
                      idx <= currentStepIndex
                        ? "bg-gradient-to-r from-orange-500 to-red-600 text-white"
                        : "bg-stone-200 dark:bg-stone-700 text-stone-500"
                    }`}
                  >
                    {idx < currentStepIndex ? "✓" : idx}
                  </div>
                  <p className="text-xs mt-2 capitalize font-medium text-center">
                    {step.replace("_", " ")}
                  </p>
                  {idx < statusSteps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-2 mt-6 ${
                        idx < currentStepIndex
                          ? "bg-gradient-to-r from-orange-500 to-red-600"
                          : "bg-stone-200 dark:bg-stone-700"
                      }`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Driver Card */}
        {order.driver && (
          <div className="rounded-xl border-2 border-blue-200 dark:border-blue-900/30 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300 mb-4">
              🚗 Driver Assigned
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-lg font-black shadow-lg">
                {order.driver[0]?.toUpperCase() || "D"}
              </div>
              <div>
                <p className="font-bold text-lg text-foreground">{order.driver}</p>
                <p className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                  ⭐ 4.8 rating • Toyota Camry ABC-1234
                </p>
              </div>
              <button
                onClick={() => setShowChat((v) => !v)}
                className="ml-auto px-4 py-2 rounded-lg border-2 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 font-semibold transition-all"
              >
                💬 {showChat ? "Hide Chat" : "Message"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-200">
              <span className="rounded-full bg-white/70 dark:bg-black/20 px-3 py-1">
                ⏱ ETA: {order.eta || "Updating..."}
              </span>
              <span className="rounded-full bg-white/70 dark:bg-black/20 px-3 py-1 capitalize">
                Status: {order.status.replaceAll("_", " ")}
              </span>
            </div>

            {showChat && (
              <div className="mt-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="bg-blue-600 text-white px-4 py-2 text-sm font-bold">💬 Chat</div>
                <div className="h-48 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 ? (
                    <p className="text-xs text-stone-400 text-center py-6">
                      No messages yet. Say hi to your driver!
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_role === "customer" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs rounded-2xl px-3 py-2 text-xs font-medium ${
                            msg.sender_role === "customer"
                              ? "bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-tr-sm"
                              : "bg-stone-100 dark:bg-stone-700 text-foreground rounded-tl-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-blue-100 dark:border-blue-900 p-2 flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 rounded-full border border-stone-200 dark:border-stone-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sendingMsg || !chatInput.trim()}
                    className="px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Map */}
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">🗺️ Delivery location</CardTitle>
              <Badge variant="secondary" className="max-w-full whitespace-normal">
                {order.delivery_address}
              </Badge>
            </div>
            <a
              className={buttonVariants({ variant: "outline" })}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                order.delivery_address
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in Maps
            </a>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-64 w-full">
              <iframe
                title="Delivery location map"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(order.delivery_address)}&output=embed&z=15`}
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>

        {/* Dropoff Instructions */}
        {order.dropoffInstructions && (
          <div className="rounded-xl border-2 border-blue-200 dark:border-blue-900/30 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 p-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-blue-700 dark:text-blue-300 mb-2">
              📝 Dropoff Instructions
            </h2>
            <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">
              {order.dropoffInstructions}
            </p>
          </div>
        )}

        {/* Tip */}
        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-1">
                💸 Tip
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                You can adjust tip until delivery is completed.
              </p>
            </div>
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
              Current: ${Number(order.tip ?? 0).toFixed(2)}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {[0, 1, 2, 3, 5].map((amt) => (
              <button
                key={amt}
                onClick={() => setTipDraft(amt)}
                className={`rounded-lg px-4 py-2 text-xs font-bold border-2 transition-all ${
                  tipDraft === amt
                    ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-transparent"
                    : "border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-white/70 dark:bg-black/20"
                }`}
              >
                {amt === 0 ? "None" : `$${amt}`}
              </button>
            ))}
            <button
              onClick={saveTip}
              disabled={savingTip || order.status === "delivered" || order.status === "cancelled"}
              className="ml-auto rounded-lg bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {savingTip ? "Saving..." : "Save tip"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

