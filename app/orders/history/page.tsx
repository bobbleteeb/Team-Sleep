"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect } from "react";
import Image from "next/image";

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  restaurantId: string;
  restaurantName: string;
};

type PastOrder = {
  id: string;
  restaurant_id: string;
  items: OrderItem[];
  total_price: number;
  delivery_address: string;
  status: string;
  created_at: string;
};

type Rating = {
  orderId: string;
  stars: number;
  comment: string;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

export default function OrderHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [orders, setOrders] = useState<PastOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState<{ orderId: string; restaurantName: string } | null>(null);
  const [starHover, setStarHover] = useState(0);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [submitted, setSubmitted] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    const stored = localStorage.getItem("quickbite_ratings");
    if (stored) setRatings(JSON.parse(stored));
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/orders?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const submitRating = () => {
    if (!ratingModal || stars === 0) return;
    const newRating: Rating = { orderId: ratingModal.orderId, stars, comment };
    const updated = { ...ratings, [ratingModal.orderId]: newRating };
    setRatings(updated);
    localStorage.setItem("quickbite_ratings", JSON.stringify(updated));
    setSubmitted(true);
    setTimeout(() => {
      setRatingModal(null);
      setStars(0);
      setComment("");
      setSubmitted(false);
    }, 1500);
  };

  const filteredOrders = orders.filter((o) =>
    filterStatus === "all" ? true : o.status === filterStatus
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-300 border-t-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-zinc-100 dark:to-zinc-950 text-foreground">
      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm mx-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-2xl">
            <button
              onClick={() => { setRatingModal(null); setStars(0); setComment(""); }}
              aria-label="Close"
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl"
            >
              ✕
            </button>
            {submitted ? (
              <div className="text-center space-y-3">
                <p className="text-4xl">🎉</p>
                <p className="text-lg font-black">Thanks for the review!</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-1">Rate your order</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">{ratingModal.restaurantName}</p>
                {/* Stars */}
                <div className="flex gap-2 justify-center mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setStarHover(s)}
                      onMouseLeave={() => setStarHover(0)}
                      onClick={() => setStars(s)}
                      className="text-4xl transition-transform hover:scale-125"
                    >
                      {s <= (starHover || stars) ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Leave a comment (optional)..."
                  rows={3}
                  className="w-full rounded-lg border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none transition-all"
                />
                <button
                  onClick={submitRating}
                  disabled={stars === 0}
                  className="w-full mt-4 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 text-sm font-bold disabled:opacity-40"
                >
                  Submit Review
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-orange-200 dark:border-orange-900/20 bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} aria-label="Go back" className="text-2xl hover:opacity-70 transition-opacity">
            ←
          </button>
          <h1 className="text-xl font-bold">🧾 Order History</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["all", "delivered", "in_transit", "preparing", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                filterStatus === s
                  ? "bg-gradient-to-r from-orange-500 to-red-600 text-white border-transparent"
                  : "border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300"
              }`}
            >
              {s === "all" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-orange-200 dark:border-orange-900/30 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 p-16 text-center">
            <p className="text-4xl mb-3">🧾</p>
            <p className="font-semibold text-gray-600 dark:text-gray-400">No orders found</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const existingRating = ratings[order.id];
            return (
              <div
                key={order.id}
                className="rounded-xl border-2 border-orange-200/50 dark:border-orange-900/30 bg-gradient-to-br from-white to-orange-50 dark:from-slate-800 dark:to-slate-900 p-5 space-y-3 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-lg">{order.items[0]?.restaurantName ?? "Restaurant"}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      {new Date(order.created_at).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric", year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">📍 {order.delivery_address}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      order.status === "delivered"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                        : order.status === "cancelled"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    }`}
                  >
                    {order.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>

                {/* Items */}
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-orange-200/30 dark:border-orange-900/30 bg-white dark:bg-slate-700 px-2.5 py-1.5"
                    >
                      <Image src={item.image} alt={item.name} width={24} height={24} className="rounded object-cover" />
                      <span className="text-xs font-medium">{item.quantity}× {item.name}</span>
                    </div>
                  ))}
                </div>

                {/* Rating display */}
                {existingRating && (
                  <div className="flex items-center gap-2 text-xs text-stone-500 bg-amber-50 dark:bg-amber-900/10 rounded-lg px-3 py-2">
                    <span>{"⭐".repeat(existingRating.stars)}</span>
                    {existingRating.comment && <span className="italic">&ldquo;{existingRating.comment}&rdquo;</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-orange-100 dark:border-orange-900/20">
                  <p className="font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    {fmt(order.total_price)}
                  </p>
                  <div className="flex gap-2">
                    {["pending", "confirmed", "preparing", "in_transit"].includes(order.status) && (
                      <a
                        href={`/orders/${order.id}`}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300"
                      >
                        📍 Track
                      </a>
                    )}
                    {order.status === "delivered" && !existingRating && (
                      <button
                        onClick={() =>
                          setRatingModal({
                            orderId: order.id,
                            restaurantName: order.items[0]?.restaurantName ?? "Restaurant",
                          })
                        }
                        className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300"
                      >
                        ⭐ Rate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
