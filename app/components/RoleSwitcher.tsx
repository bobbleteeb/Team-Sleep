"use client";

import { useAuth } from "../context/AuthContext";

export default function RoleSwitcher() {
  const { user, toggleRole } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-24 left-4 z-40 md:bottom-6 md:left-6">
      <button
        onClick={toggleRole}
        className="flex items-center gap-2 rounded-full border border-orange-200 bg-gradient-to-r from-orange-500 to-red-600 px-4 py-2 text-sm font-bold text-white shadow-2xl backdrop-blur-md transition-all hover:scale-105 hover:shadow-orange-500/30 dark:border-orange-700"
      >
        <span className="text-lg">{user.role === "customer" ? "🚲" : "🛍️"}</span>
        Switch to {user.role === "customer" ? "Driver" : "Customer"}
      </button>
    </div>
  );
}
