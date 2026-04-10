"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

type Deal = {
  id: string;
  code: string;
  discount: string;
  description: string;
  emoji: string;
  expiresIn: number;
  usage: number;
  usageLimit: number;
};

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [mounted, setMounted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const initialDeals: Deal[] = [
      {
        id: "1",
        code: "PIZZA20",
        discount: "20% off",
        description: "20% off pizza orders",
        emoji: "🍕",
        expiresIn: 150,
        usage: 78,
        usageLimit: 100,
      },
      {
        id: "2",
        code: "BURGER15",
        discount: "15% off",
        description: "15% off burger orders",
        emoji: "🍔",
        expiresIn: 240,
        usage: 45,
        usageLimit: 100,
      },
      {
        id: "3",
        code: "SUSHI25",
        discount: "25% off",
        description: "25% off sushi orders",
        emoji: "🍣",
        expiresIn: 89,
        usage: 92,
        usageLimit: 100,
      },
      {
        id: "4",
        code: "DELIVERY5",
        discount: "$5 off",
        description: "Delivery fee waived",
        emoji: "🚚",
        expiresIn: 310,
        usage: 22,
        usageLimit: 50,
      },
      {
        id: "5",
        code: "FIRSTORDER",
        discount: "$10 off",
        description: "First order discount",
        emoji: "🎉",
        expiresIn: 420,
        usage: 180,
        usageLimit: 200,
      },
      {
        id: "6",
        code: "WEEKDAY10",
        discount: "10% off",
        description: "Weekday special",
        emoji: "📅",
        expiresIn: 560,
        usage: 55,
        usageLimit: 150,
      },
    ];
    setDeals(initialDeals);
  }, []);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
    return `${Math.floor(minutes / 1440)}d`;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setMessage(`✅ Code "${code}" copied to clipboard!`);
      setTimeout(() => setMessage(null), 2200);
    });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-lg font-semibold">Loading deals...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-zinc-100 dark:to-zinc-950 text-foreground">
      {/* Header */}
      <header className="border-b border-orange-200 dark:border-orange-900/20 bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-2xl hover:opacity-70 transition-opacity"
          >
            ←
          </button>
          <h1 className="text-xl font-bold">🔥 Deals & Promos</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {message && (
          <div className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm font-semibold">
            {message}
          </div>
        )}
        {/* Apply Promo Code Section */}
        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 mb-4">
            Enter Promo Code
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter promo code..."
              className="flex-1 rounded-lg border-2 border-emerald-200 dark:border-emerald-700 px-4 py-3 dark:bg-slate-800 outline-none focus:border-emerald-500 transition-colors"
            />
            <button className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold shadow-lg hover:shadow-xl transition-shadow">
              Apply
            </button>
          </div>
        </div>

        {/* Deals Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="rounded-xl border-2 border-orange-200 dark:border-orange-900/30 bg-white dark:bg-slate-800 p-6 hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{deal.emoji}</span>
                  <div>
                    <p className="font-bold text-lg text-orange-600 dark:text-orange-400">
                      {deal.discount}
                    </p>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      {deal.code}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-foreground mb-4">{deal.description}</p>

              {/* Countdown */}
              <div className="mb-4">
                <p className="text-xs text-stone-600 dark:text-stone-400 mb-2">
                  Ends in {formatTime(deal.expiresIn)}
                </p>
                <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all"
                    style={{
                      width: `${(deal.expiresIn / 600) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Usage Bar */}
              <div className="mb-4">
                <p className="text-xs text-stone-600 dark:text-stone-400 mb-2">
                  {deal.usage}/{deal.usageLimit} used
                </p>
                <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-600"
                    style={{
                      width: `${(deal.usage / deal.usageLimit) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Button */}
              <button
                onClick={() => handleCopyCode(deal.code)}
                className="w-full py-2 rounded-lg border-2 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 font-bold hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
              >
                📋 Copy Code
              </button>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-900/30 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 p-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">
            💡 How to use promo codes:
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>✓ Copy the code you want to use</li>
            <li>✓ Add items to your cart</li>
            <li>✓ Paste the code at checkout</li>
            <li>✓ Enjoy your discount!</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
