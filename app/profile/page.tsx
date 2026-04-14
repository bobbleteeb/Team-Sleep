"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect } from "react";
import { useTheme } from "@/app/context/ThemeContext";

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [saved_addresses, setSavedAddresses] = useState<
    Array<{ id: string; name: string; address: string }>
  >([]);
  const [newAddress, setNewAddress] = useState({ name: "", address: "" });

  useEffect(() => {
    setMounted(true);
    setName(user?.name || "");
    // Load addresses from localStorage
    const stored = localStorage.getItem("quickbite_addresses");
    if (stored) setSavedAddresses(JSON.parse(stored));
  }, [user]);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    // In a real app, this would call an API
    setIsEditing(false);
  };

  const addAddress = () => {
    if (!newAddress.name.trim() || !newAddress.address.trim()) return;
    const updated = [
      ...saved_addresses,
      { id: Date.now().toString(), ...newAddress },
    ];
    setSavedAddresses(updated);
    localStorage.setItem("quickbite_addresses", JSON.stringify(updated));
    setNewAddress({ name: "", address: "" });
  };

  const removeAddress = (id: string) => {
    const updated = saved_addresses.filter((a) => a.id !== id);
    setSavedAddresses(updated);
    localStorage.setItem("quickbite_addresses", JSON.stringify(updated));
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-lg font-semibold">Loading profile...</div>
      </div>
    );
  }

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
          <h1 className="text-xl font-bold">👤 My Profile</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Avatar Section */}
        <div className="rounded-xl border-2 border-orange-200 dark:border-orange-900/30 bg-white dark:bg-slate-800 p-8 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-white text-4xl font-black shadow-lg mx-auto mb-6">
            {user.name[0]?.toUpperCase() || "U"}
          </div>
          <div className="space-y-4">
            <div>
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 rounded-lg border-2 border-orange-200 dark:border-orange-700 px-3 py-2 text-center font-bold dark:bg-slate-700"
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold"
                  >
                    ✓
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-bold">{name}</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-lg hover:opacity-70"
                  >
                    ✏️
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              {user.email}
            </p>
            <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 px-4 py-2 rounded-full">
              <span>🛒</span>
              <span className="font-semibold">Customer</span>
            </div>
          </div>
        </div>

        {/* Saved Addresses */}
        <div className="rounded-xl border-2 border-orange-200 dark:border-orange-900/30 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
            📍 Saved Addresses
          </h2>
          <div className="space-y-3 mb-4">
            {saved_addresses.map((addr) => (
              <div
                key={addr.id}
                className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-all"
              >
                <div>
                  <p className="font-semibold text-foreground">{addr.name}</p>
                  <p className="text-sm text-stone-600 dark:text-stone-400">
                    {addr.address}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 text-lg hover:opacity-70">
                    ✏️
                  </button>
                  <button
                    onClick={() => removeAddress(addr.id)}
                    className="px-2 py-1 text-lg hover:opacity-70"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-3 p-3 rounded-lg border-2 border-dashed border-orange-200 dark:border-orange-700">
            <input
              type="text"
              placeholder="Address name (e.g., Home, Work)"
              value={newAddress.name}
              onChange={(e) =>
                setNewAddress({ ...newAddress, name: e.target.value })
              }
              className="w-full rounded-lg border border-stone-200 dark:border-stone-700 px-3 py-2 dark:bg-slate-700"
            />
            <input
              type="text"
              placeholder="Full address"
              value={newAddress.address}
              onChange={(e) =>
                setNewAddress({ ...newAddress, address: e.target.value })
              }
              className="w-full rounded-lg border border-stone-200 dark:border-stone-700 px-3 py-2 dark:bg-slate-700"
            />
            <button
              onClick={addAddress}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold"
            >
              + Add Address
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-xl border-2 border-orange-200 dark:border-orange-900/30 bg-white dark:bg-slate-800 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 mb-4">
            ⚙️ Preferences
          </h2>
          <div className="space-y-3">
            {mounted && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-700">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🌙</span>
                  <span className="font-medium">Dark Mode</span>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full transition-all ${
                    theme === "dark"
                      ? "bg-gradient-to-r from-orange-500 to-red-600"
                      : "bg-stone-300 dark:bg-stone-600"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      theme === "dark" ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 dark:border-stone-700">
              <div className="flex items-center gap-3">
                <span className="text-lg">🔔</span>
                <span className="font-medium">Notifications</span>
              </div>
              <button className="w-12 h-6 rounded-full bg-gradient-to-r from-orange-500 to-red-600 transition-all">
                <div className="w-5 h-5 rounded-full bg-white translate-x-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="rounded-xl border-2 border-rose-200 dark:border-rose-900/30 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-900/10 dark:to-red-900/10 p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-rose-700 dark:text-rose-300 mb-4">
            🔒 Account
          </h2>
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold shadow-lg hover:shadow-xl transition-shadow"
          >
            🚪 Log Out
          </button>
        </div>
      </main>
    </div>
  );
}
