"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

type DriverProfile = {
  id: string;
  status: "available" | "busy" | "offline";
  rating: number;
  total_deliveries: number;
  vehicle_info?: string;
  license_number?: string;
};

const fmt = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

export default function DriverProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const res = await fetch(`/api/driver/profile?driverId=${encodeURIComponent(user.id)}`);
      const data = await res.json();
      if (res.ok && data.driver) {
        setProfile(data.driver);
        setVehicleInfo(data.driver.vehicle_info ?? "");
        setLicenseNumber(data.driver.license_number ?? "");
      }
    };
    load();
  }, [user?.id]);

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/driver/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: user.id,
          vehicleInfo,
          licenseNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setProfile(data.driver);
      setMessage("Saved changes.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleOnline = async () => {
    if (!user?.id || !profile) return;
    const nextOnline = profile.status === "offline";
    const res = await fetch("/api/driver/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        driverId: user.id,
        online: nextOnline,
      }),
    });
    const data = await res.json();
    if (res.ok && data.driver) {
      setProfile(data.driver);
    } else {
      setMessage(data.error ?? "Failed to update status");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-950 dark:to-zinc-900 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-black/90 backdrop-blur px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            ← Back
          </Button>
          <h1 className="text-2xl font-black">👤 Driver Profile</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6 space-y-6">
        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Rating</p>
              <p className="text-2xl font-black mt-2">{(profile?.rating ?? 5).toFixed(1)} ⭐</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Rides</p>
              <p className="text-2xl font-black mt-2">{profile?.total_deliveries ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Earned</p>
              <p className="text-2xl font-black mt-2">{fmt((profile?.total_deliveries ?? 0) * 8.5)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Completion</p>
              <p className="text-2xl font-black mt-2">98%</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Vehicle Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 py-5">
            <Input
              value={vehicleInfo}
              onChange={(e) => setVehicleInfo(e.target.value)}
              placeholder="Vehicle info"
            />
            <Input
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="License number"
            />
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 py-5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Currently</p>
              <Badge variant={profile?.status === "offline" ? "outline" : "default"}>
                {profile?.status === "offline" ? "⚫ Offline" : "🟢 Online"}
              </Badge>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={toggleOnline}>
                {profile?.status === "offline" ? "Go Online" : "Go Offline"}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  logout();
                  router.push("/login");
                }}
              >
                🚪 Log Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
