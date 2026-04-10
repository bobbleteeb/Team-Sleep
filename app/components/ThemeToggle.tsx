"use client";

import { useTheme } from "../context/ThemeContext";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        disabled
        className="rounded-full border-2 border-orange-200 dark:border-orange-700 w-10 h-10 flex items-center justify-center text-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 shadow-md"
      >
        🌙
      </button>
    );
  }

  return (
    <button onClick={toggleTheme} aria-label="Toggle dark mode"
      className="rounded-full border-2 border-orange-200 dark:border-orange-700 w-10 h-10 flex items-center justify-center text-lg bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/40 dark:hover:to-red-900/40 shadow-md hover:shadow-lg transition-all">
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
