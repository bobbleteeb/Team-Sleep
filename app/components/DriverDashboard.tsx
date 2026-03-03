"use client";

import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

export default function DriverDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (user?.role !== "driver") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-black/10 p-6 dark:border-white/20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">QuickBite Driver</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Welcome, {user.name}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-8 p-6">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Available Deliveries</h2>
          <div className="rounded-xl border border-black/10 p-8 text-center text-zinc-600 dark:border-white/20 dark:text-zinc-400">
            <p>No active deliveries at the moment.</p>
            <p className="text-sm">Check back soon for new orders!</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Your Stats</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-black/10 p-4 dark:border-white/20">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Total Deliveries</p>
              <p className="text-2xl font-bold">0</p>
            </div>
            <div className="rounded-xl border border-black/10 p-4 dark:border-white/20">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Rating</p>
              <p className="text-2xl font-bold">5.0 ⭐</p>
            </div>
            <div className="rounded-xl border border-black/10 p-4 dark:border-white/20">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Status</p>
              <p className="text-2xl font-bold text-green-600">Available</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
