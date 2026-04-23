"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

type DriverOrder = {
  id: string;
  delivery_address: string;
  items: Array<{ name: string; quantity?: number; qty?: number }>;
  total_price: number;
  status: string;
  created_at: string;
  eta?: string;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

export default function DriverOrdersPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeOrder, setActiveOrder] = useState<DriverOrder | null>(null);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/driver/orders/history?userId=${encodeURIComponent(user.id)}`);
        const data = (await res.json().catch(() => null)) as
          | { orders?: DriverOrder[]; activeOrder?: DriverOrder | null; error?: string }
          | null;
        if (!res.ok) throw new Error(data?.error ?? "Failed to load driver orders");
        setActiveOrder((data?.activeOrder as DriverOrder | null) ?? null);
        setOrders(Array.isArray(data?.orders) ? (data?.orders as DriverOrder[]) : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load driver orders");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const grouped = useMemo(() => {
    return {
      delivered: orders.filter((o) => o.status === "delivered"),
      cancelled: orders.filter((o) => o.status === "cancelled"),
    };
  }, [orders]);

  if (user?.role !== "driver") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-950 dark:to-zinc-900 pb-24 text-zinc-900 dark:text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-black/90 backdrop-blur px-6 py-4">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.back()}>
              ← Back
            </Button>
            <h1 className="text-2xl font-black">📦 Driver Orders</h1>
          </div>
          <Button variant="outline" onClick={() => router.push("/driver/profile")}>
            👤 Profile
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-6 p-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Loading orders...
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-emerald-500/30">
              <CardHeader className="border-b">
                <CardTitle>Active delivery</CardTitle>
              </CardHeader>
              <CardContent className="py-4">
                {!activeOrder ? (
                  <p className="text-sm text-muted-foreground">No active delivery right now.</p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          Order #{activeOrder.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          📍 {activeOrder.delivery_address}
                        </p>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {activeOrder.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <Button onClick={() => router.push("/")}>Open dashboard</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">History</h2>
                <div className="flex gap-2">
                  <Badge variant="outline">Delivered: {grouped.delivered.length}</Badge>
                  <Badge variant="outline">Cancelled: {grouped.cancelled.length}</Badge>
                </div>
              </div>

              {orders.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    No completed deliveries yet.
                  </CardContent>
                </Card>
              ) : (
                <ScrollArea className="h-[60vh] rounded-xl border bg-background/40">
                  <div className="space-y-3 p-4">
                    {orders.map((o) => (
                      <Card key={o.id}>
                        <CardHeader className="border-b py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <CardTitle className="text-base">
                                Order #{o.id.slice(0, 8)}
                              </CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {new Date(o.created_at).toLocaleString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                📍 {o.delivery_address}
                              </p>
                            </div>
                            <Badge
                              variant={o.status === "delivered" ? "default" : "outline"}
                              className="capitalize"
                            >
                              {o.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="py-4 space-y-2">
                          <p className="text-sm font-black">{fmt(Number(o.total_price ?? 0))}</p>
                          <p className="text-xs text-muted-foreground">
                            Items:{" "}
                            {(o.items || [])
                              .map((it) => `${it.quantity ?? it.qty ?? 1}× ${it.name}`)
                              .join(", ") || "N/A"}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

