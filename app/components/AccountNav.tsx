"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type SidebarView =
  | "none"
  | "active-orders"
  | "past-orders"
  | "saved-meals"
  | "recently-viewed";

type Props = {
  userName?: string | null;
  sidebarView: SidebarView;
  onSelectView: (view: Exclude<SidebarView, "none">) => void;
  onClosePanel?: () => void;
  className?: string;
};

const panelItems: Array<{ view: Exclude<SidebarView, "none">; label: string; icon: string }> = [
  { view: "active-orders", label: "Active Orders", icon: "🚗" },
  { view: "past-orders", label: "Past Orders", icon: "🧾" },
  { view: "saved-meals", label: "Saved Meals", icon: "❤️" },
  { view: "recently-viewed", label: "Recently Viewed", icon: "🕐" },
];

export function AccountNav({ userName, sidebarView, onSelectView, onClosePanel, className }: Props) {
  return (
    <div className={cn("p-6", className)}>
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-white text-lg font-black shadow-lg mx-auto mb-3">
        {userName?.[0]?.toUpperCase() || "U"}
      </div>
      <p className="text-center font-bold text-sm truncate text-foreground mb-4">
        {userName || "User"}
      </p>

      <p className="mb-4 text-xs font-bold uppercase tracking-widest bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
        🔥 My Account
      </p>

      <div className="space-y-2">
        {panelItems.map(({ view, label, icon }) => {
          const isActive = sidebarView === view;
          return (
            <Button
              key={view}
              type="button"
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 rounded-lg px-4 py-6 text-sm font-medium",
                isActive &&
                  "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30 hover:from-orange-600 hover:to-red-700"
              )}
              onClick={() => {
                onSelectView(view);
                onClosePanel?.();
              }}
            >
              <span className="text-lg">{icon}</span>
              {label}
            </Button>
          );
        })}
      </div>

      <div className="mt-4">
        <Separator className="my-4" />

        <div className="space-y-2">
          <Link
            href="/orders/history"
            onClick={onClosePanel}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-muted transition-all"
          >
            🧾 Order History
          </Link>
          <Link
            href="/rewards"
            onClick={onClosePanel}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-muted transition-all"
          >
            🏆 Rewards
          </Link>
          <Link
            href="/deals"
            onClick={onClosePanel}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-muted transition-all"
          >
            🎟 Deals
          </Link>
          <Link
            href="/profile"
            onClick={onClosePanel}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium hover:bg-muted transition-all"
          >
            ⚙️ Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

