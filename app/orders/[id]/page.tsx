"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function OrderRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  useEffect(() => {
    if (!orderId) return;
    router.replace(`/?orderId=${encodeURIComponent(orderId)}&view=tracking`);
  }, [orderId, router]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-sm text-muted-foreground">Redirecting to tracking…</div>
    </div>
  );
}

