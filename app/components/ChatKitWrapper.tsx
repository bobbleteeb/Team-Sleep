"use client";

import { useState, useRef, useEffect } from "react";
import { useCart } from "@/app/context/CartContext";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

type MenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
};

type Restaurant = {
  id: number;
  name: string;
  cuisine?: string;
  latitude: number;
  longitude: number;
  menu: MenuItem[];
  deliveryFee: number;
  eta: string;
  image: string;
};

type OrderAction = {
  action: "add_to_cart" | "place_order";
  restaurant?: string;
  items?: Array<{ name: string; quantity: number }>;
  delivery_address?: string;
};

type ChatResponse = {
  reply: string;
  action?: OrderAction;
};

interface ChatKitWrapperProps {
  children: React.ReactNode;
  onAIResponse?: (data: any) => void;
}

export default function ChatKitWrapper({
  children,
  onAIResponse,
}: ChatKitWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content: "Hi! 👋 I can help you order food. Try saying 'show me pizza places' or 'add pizza to my cart'",
    },
  ]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { items, addItem, saveOrder } = useCart();
  const lastId = messages[messages.length - 1]?.id ?? 1;

  // Load restaurants on mount
  useEffect(() => {
    const loadRestaurants = async () => {
      try {
        const response = await fetch("/api/restaurants/nearby?latitude=40.7128&longitude=-74.006");
        if (response.ok) {
          const data = await response.json();
          setRestaurants(data);
        }
      } catch (error) {
        console.error("Error loading restaurants:", error);
      }
    };
    loadRestaurants();
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = { id: lastId + 1, role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          menuData: restaurants,
          currentCart: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

      const data: ChatResponse = await response.json();
      const { reply, action } = data;

      if (action && onAIResponse) {
        onAIResponse(action);
      }

      // FALLBACK: try parsing reply
      else {
        try {
          const parsed = JSON.parse(reply);
          if (onAIResponse) {
            onAIResponse(parsed);
          }
        } catch (e) {
          // normal text → ignore
        }
      }

      // Handle actions from the chat
      if (action) {
        if (action.action === "add_to_cart" && action.restaurant && action.items) {
          const selectedRestaurant = restaurants.find(
            (r) => r.name.toLowerCase() === action.restaurant?.toLowerCase()
          );
          if (selectedRestaurant) {
            let addedCount = 0;
            if (action.items) {
              for (const orderItem of action.items) {
                const menuItem = selectedRestaurant.menu.find(
                  (m) => m.name.toLowerCase() === orderItem.name.toLowerCase()
                );
                if (menuItem) {
                  for (let i = 0; i < orderItem.quantity; i++) {
                    addItem({
                      id: menuItem.id,
                      name: menuItem.name,
                      price: menuItem.price,
                      restaurantId: selectedRestaurant.id,
                      restaurantName: selectedRestaurant.name,
                      image: menuItem.image,
                    });
                  }
                  addedCount += orderItem.quantity;
                }
              }
            }
            if (addedCount > 0) {
              setStatusMessage(`✓ Added ${addedCount} items to cart!`);
              // Add system confirmation message
              const confirmMessage: ChatMessage = {
                id: lastId + 2,
                role: "assistant",
                content: `✓ Added ${action.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")} from ${action.restaurant} to your cart!`,
              };
              setMessages((prev) => [...prev, confirmMessage]);
              return;
            }
          }
        } else if (action.action === "place_order" && action.delivery_address) {
          if (items.length > 0) {
            const restaurantId = items[0].restaurantId || 1;
            await saveOrder(restaurantId, action.delivery_address);
            setStatusMessage("✓ Order placed successfully! 🎉");
            const confirmMessage: ChatMessage = {
              id: lastId + 2,
              role: "assistant",
              content: "✓ Order placed successfully! Your food is being prepared and will be delivered to " + action.delivery_address,
            };
            setMessages((prev) => [...prev, confirmMessage]);
            return;
          } else {
            setStatusMessage("⚠️ Cannot place order - cart is empty");
          }
        }
      }

      // If no action was taken, show the reply
      const aiMessage: ChatMessage = {
        id: lastId + 2,
        role: "assistant",
        content: reply || "I couldn't generate a response.",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const fallbackMessage: ChatMessage = {
        id: lastId + 2,
        role: "assistant",
        content: "Sorry, I couldn't reach the AI right now. Please try again.",
      };
      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {children}

      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
        {statusMessage && (
          <div className="rounded-lg bg-green-100 px-4 py-2 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
            {statusMessage}
          </div>
        )}

        {isOpen && (
          <div className="w-[340px] rounded-xl border border-black/10 bg-background shadow-lg dark:border-white/20">
            <div className="border-b border-black/10 px-4 py-3 dark:border-white/20">
              <p className="text-sm font-semibold">AI Food Assistant</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">Order food with AI</p>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto p-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.role === "assistant"
                      ? "bg-zinc-100 dark:bg-zinc-900"
                      : "bg-foreground text-background"
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-2">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce"></div>
                      <div className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="h-2 w-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-black/10 p-3 dark:border-white/20">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Order food..."
                  className="w-full rounded-full border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground dark:border-white/20"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  className="rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:opacity-60"
                >
                  {isLoading ? "..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-lg hover:scale-110 transition-transform"
        >
          {isOpen ? "Close" : "🤖 Order"}
        </button>
      </div>
    </>
  );
}
