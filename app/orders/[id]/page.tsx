"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";

type Order = {
  id: string;
  restaurant_id: string;
  items: Array<{ id: string; name: string; price: number; quantity: number; image: string }>;
  total_price: number;
  delivery_address: string;
  status: string;
  created_at: string;
  driver?: string;
  eta?: string;
};

type Message = {
  id: string;
  sender_role: "customer" | "driver";
  content: string;
  created_at: string;
};

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const orderId = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Chat
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Notification permission
  const [notifGranted, setNotifGranted] = useState(false);
  const prevStatus = useRef<string | null>(null);

  const statusSteps = ["placed", "confirmed", "preparing", "in_transit", "delivered"];

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        setNotifGranted(perm === "granted");
      });
    } else if ("Notification" in window && Notification.permission === "granted") {
      setNotifGranted(true);
    }
  }, []);

  const sendPushNotification = (title: string, body: string) => {
    if (notifGranted || Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data: Order = await res.json();
        // Fire notification if status changed
        if (prevStatus.current && prevStatus.current !== data.status) {
          const statusLabels: Record<string, string> = {
            confirmed: "Your order has been confirmed!",
            preparing: "Your food is being prepared.",
            in_transit: "Your driver is on the way!",
            delivered: "Your order has been delivered. Enjoy!",
          };
          const msg = statusLabels[data.status];
          if (msg) sendPushNotification("QuickBite Update", msg);
        }
        prevStatus.current = data.status;
        setOrder(data);
      }
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
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch chat messages
  const fetchMessages = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/messages?orderId=${orderId}&userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
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
  }, [showChat, user, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          senderRole: user.role,
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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-lg font-semibold">Loading order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <div className="text-lg font-semibold">Order not found</div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  const currentStepIndex = statusSteps.indexOf(order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-zinc-100 dark:to-zinc-950 text-foreground">
      {/* Header */}
      <header className="border-b border-orange-200 dark:border-orange-900/20 bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="text-2xl hover:opacity-70 transition-opacity"
          >
            ←
          </button>
          <h1 className="text-xl font-bold">📍 Tracking Order</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Status Stepper */}
        <div className="rounded-xl border-2 border-orange-200 dark:border-orange-900/30 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-6">
            Order Status
          </h2>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, idx) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    idx <= currentStepIndex
                      ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg"
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

            {/* Chat Panel */}
            {showChat && (
              <div className="mt-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 overflow-hidden">
                <div className="bg-blue-600 text-white px-4 py-2 text-sm font-bold">
                  💬 Chat with Driver
                </div>
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
        <div className="rounded-xl overflow-hidden border-2 border-orange-200 dark:border-orange-900/30 bg-white dark:bg-slate-800">
          <div className="px-6 py-4 border-b border-orange-100 dark:border-orange-900/20">
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500">
              🗺️ Delivery Location
            </h2>
            <p className="text-xs text-stone-500 mt-1">{order.delivery_address}</p>
          </div>
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
        </div>

        {/* Order Summary */}
        <div className="rounded-xl border-2 border-orange-200 dark:border-orange-900/30 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
            Order Summary
          </h2>
          <div className="space-y-3">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-stone-200 dark:border-stone-700">
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-stone-500">Qty: {item.quantity}</p>
                </div>
                <p className="font-bold text-orange-600 dark:text-orange-400">
                  ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-700">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-stone-600 dark:text-stone-400">Delivery to:</span>
              <span className="font-medium">{order.delivery_address}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                ${(order.total_price || 0).toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-2">
              Estimated arrival: {order.eta || "Calculating..."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
