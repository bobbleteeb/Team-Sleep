"use client";

import { useEffect, useState } from "react";

type OrderMessage = {
  id: string;
  sender_user_id: string;
  sender_role: "customer" | "driver";
  content: string;
  created_at: string;
};

type OrderMessagePanelProps = {
  orderId: string | null;
  userId: string;
  role: "customer" | "driver";
  title: string;
};

export default function OrderMessagePanel({ orderId, userId, role, title }: OrderMessagePanelProps) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    if (!orderId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/messages?orderId=${encodeURIComponent(orderId)}&userId=${encodeURIComponent(userId)}`
      );
      const data = (await res.json()) as { messages?: OrderMessage[]; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch messages");
      }

      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, userId]);

  const sendMessage = async () => {
    const content = input.trim();
    if (!orderId || !content || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          userId,
          senderRole: role,
          content,
        }),
      });

      const data = (await res.json()) as {
        message?: OrderMessage;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      const createdMessage = data.message;
      if (createdMessage) {
        setMessages((prev) => [...prev, createdMessage]);
      }
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/20">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button onClick={fetchMessages} className="text-sm text-zinc-600 hover:underline">
          Refresh
        </button>
      </div>

      {!orderId ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No active order available for chat.</p>
      ) : loading ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading messages...</p>
      ) : (
        <div className="space-y-3">
          <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-black/10 p-3 dark:border-white/20">
            {messages.length === 0 ? (
              <p className="text-sm text-zinc-500">No messages yet.</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.sender_role === role
                      ? "ml-8 bg-foreground text-background"
                      : "mr-8 bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className="mt-1 text-[11px] opacity-70">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Type a message..."
              className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/20"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={sending || !input.trim()}
              className="rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
