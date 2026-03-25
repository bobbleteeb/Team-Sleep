"use client";

import React from "react";

type DriverOrder = {
  id: string;
  delivery_address: string;
  items?: Array<{ name: string; qty?: number; quantity?: number }>;
  total_price?: number;
  eta?: string;
};

export default function DriverOrderCard({ order, onAccept }: { order: DriverOrder; onAccept: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Order #{order.id}</p>
          <p className="font-medium">{order.delivery_address}</p>
          <p className="text-sm text-zinc-500">Items: {order.items?.length ?? 0}</p>
          <p className="text-sm text-zinc-500">Total: ${order.total_price?.toFixed(2) ?? "0.00"}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-sm text-zinc-500">ETA: {order.eta ?? "—"}</p>
          <button
            onClick={() => onAccept(order.id)}
            className="rounded bg-foreground px-3 py-1 text-sm font-medium text-background"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
