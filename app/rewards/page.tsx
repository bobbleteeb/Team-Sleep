"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useState } from "react";

export default function RewardsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load points from localStorage (set by checkout flow)
    const storedPoints = parseInt(localStorage.getItem("quickbite_points") ?? "0", 10);
    setPoints(storedPoints);

    // Calculate streak from past orders
    const pastOrders = localStorage.getItem("quickbite_past_orders") || "[]";
    try {
      const orders = JSON.parse(pastOrders);
      if (orders.length > 0) {
        const lastOrder = orders[0];
        const lastDate = new Date(lastOrder.created_at || Date.now());
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) setStreak(Math.max(1, 7 - daysDiff));
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const handleRedeem = (option: { icon: string; label: string; points: number }) => {
    if (points < option.points) {
      setMessage(`❌ Need ${option.points - points} more points!`);
      setTimeout(() => setMessage(null), 2200);
      return;
    }
    const newPoints = points - option.points;
    setPoints(newPoints);
    localStorage.setItem("quickbite_points", String(newPoints));
    setMessage(`🎉 Redeemed ${option.label}!`);
    setTimeout(() => setMessage(null), 2200);
  };

  const badges = [
    { icon: "🎯", label: "First Order", unlocked: true },
    { icon: "🔥", label: "7 Day Streak", unlocked: streak >= 7 },
    { icon: "🍕", label: "Pizza Lover", unlocked: true },
    { icon: "🌙", label: "Night Owl", unlocked: false },
  ];

  const redeemOptions = [
    { icon: "🚚", label: "Free Delivery", points: 150 },
    { icon: "💵", label: "$5 Off", points: 500 },
    { icon: "🎁", label: "Free Item", points: 800 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-zinc-100 dark:to-zinc-950 text-foreground">
      {/* Header */}
      <header className="border-b border-orange-200 dark:border-orange-900/20 bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-2xl hover:opacity-70 transition-opacity"
          >
            ←
          </button>
          <h1 className="text-xl font-bold">🏆 Rewards</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {message && (
          <div className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-semibold">
            {message}
          </div>
        )}
        {/* Points Card */}
        <div className="rounded-xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 p-8 text-white shadow-xl">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm opacity-90 mb-2">Total Points</p>
              <p className="text-5xl font-black">{points.toLocaleString()}</p>
              <p className="text-sm opacity-90 mt-2">🔥 {streak}-day streak</p>
            </div>
            <div className="text-6xl opacity-90">🎯</div>
          </div>
        </div>

        {/* Tier Progress */}
        <div className="rounded-xl border-2 border-orange-200 dark:border-orange-900/30 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
            Tier Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🥉</span>
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-foreground">Bronze</span>
                  <span className="text-xs text-stone-500">
                    {Math.min(points, 500)} / 500
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all"
                    style={{ width: `${Math.min((points / 500) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-2xl">🥈</span>
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-foreground">Silver</span>
                  <span className="text-xs text-stone-500">
                    {Math.max(0, points - 500)} / 500
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-slate-400 to-slate-300 transition-all"
                    style={{
                      width: `${Math.min(Math.max((points - 500) / 500, 0) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400 text-center mt-4">
              {points < 500
                ? `${500 - points} points to Silver`
                : `${Math.max(0, 1000 - points)} points to Gold`}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="rounded-xl border-2 border-orange-200 dark:border-orange-900/30 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
            Badges
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.label}
                className={`p-4 rounded-lg border-2 text-center transition-all ${
                  badge.unlocked
                    ? "border-orange-200 dark:border-orange-700 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10"
                    : "border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-700/50 opacity-50"
                }`}
              >
                <p className="text-3xl mb-1">{badge.icon}</p>
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                  {badge.label}
                </p>
                {!badge.unlocked && (
                  <p className="text-xs text-stone-500 mt-1">🔒</p>
                )}
                {badge.unlocked && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    ✅
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Redeem Section */}
        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-900/30 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-4">
            Redeem Rewards
          </h2>
          <div className="space-y-3">
            {redeemOptions.map((option) => (
              <button
                key={option.label}
                onClick={() => handleRedeem(option)}
                className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group"
              >
                <div className="flex items-center gap-3 text-left">
                  <span className="text-2xl">{option.icon}</span>
                  <div>
                    <p className="font-bold text-foreground">{option.label}</p>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      {option.points} points
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                    points >= option.points
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                      : "bg-stone-200 dark:bg-stone-700 text-stone-500"
                  }`}
                >
                  Redeem →
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
