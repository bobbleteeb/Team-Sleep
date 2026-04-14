"use client";

import { useAuth } from "../context/AuthContext";

export default function RoleSwitcher() {
  const { user, toggleRole } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999]">
      <button
        onClick={toggleRole}
        className="flex items-center gap-2 rounded-full bg-slate-900/90 dark:bg-orange-600/90 px-4 py-2 text-sm font-bold text-white shadow-2xl backdrop-blur-md hover:scale-105 transition-all border border-white/20"
      >
        <span className="text-lg">{user.role === "customer" ? "🚲" : "🛍️"}</span>
        Switch to {user.role === "customer" ? "Driver" : "Customer"}
      </button>
    </div>
  );
}
