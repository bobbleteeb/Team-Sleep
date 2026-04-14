"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

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
          <button onClick={() => router.back()} className="text-sm font-semibold">← Back</button>
          <h1 className="text-2xl font-black">👤 Driver Profile</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6 space-y-6">
        {message && <div className="rounded-lg border border-zinc-300 dark:border-zinc-700 p-3 text-sm font-semibold">{message}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Rating</p>
            <p className="text-2xl font-black mt-2">{(profile?.rating ?? 5).toFixed(1)} ⭐</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Rides</p>
            <p className="text-2xl font-black mt-2">{profile?.total_deliveries ?? 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Total Earned</p>
            <p className="text-2xl font-black mt-2">{fmt((profile?.total_deliveries ?? 0) * 8.5)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Completion</p>
            <p className="text-2xl font-black mt-2">98%</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
          <h2 className="text-lg font-bold">Vehicle Info</h2>
          <input
            value={vehicleInfo}
            onChange={(e) => setVehicleInfo(e.target.value)}
            placeholder="Vehicle info"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          />
          <input
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="License number"
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
          />
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-black text-white px-4 py-2 text-sm font-bold dark:bg-white dark:text-black disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3">
          <p className="font-semibold">Currently: {profile?.status === "offline" ? "⚫ Offline" : "🟢 Online"}</p>
          <button
            onClick={toggleOnline}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-sm font-bold"
          >
            {profile?.status === "offline" ? "Go Online" : "Go Offline"}
          </button>
          <button
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white"
          >
            🚪 Log Out
          </button>
        </div>
      </main>
    </div>
  );
}
