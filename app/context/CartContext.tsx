"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

const formatError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return { message: String(error ?? "Unknown error") };
  }

  const err = error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
    status?: number;
    name?: string;
  };

  return {
    name: err.name,
    code: err.code,
    status: err.status,
    message: err.message,
    details: err.details,
    hint: err.hint,
  };
};

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  restaurantName: string;
  image: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  pendingSwitch: {
    currentName: string;
    newName: string;
  } | null;
  confirmRestaurantSwitch: () => void;
  cancelRestaurantSwitch: () => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  saveOrder: (
    restaurantId: string,
    deliveryAddress: string,
    extras?: {
      deliveryFee?: number;
      tip?: number;
      promoCode?: string;
    }
  ) => Promise<void>;
  isLoading: boolean;
  restaurantId: string | null;
  setRestaurantId: (id: string) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string>("");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<{
    currentName: string;
    newName: string;
    item: Omit<CartItem, "quantity">;
  } | null>(null);

  // Initialize customer and load cart from Supabase
  useEffect(() => {
    const initCart = async () => {
      if (!user) {
        setItems([]);
        setRestaurantId(null);
        setCustomerId("");
        setIsLoading(false);
        return;
      }

      try {
        const customerResponse = await fetch(
          `/api/cart/customer?userId=${encodeURIComponent(user.id)}`
        );

        if (!customerResponse.ok) {
          const errText = await customerResponse.text();
          throw new Error(errText || "Could not fetch customer");
        }

        const customerData = (await customerResponse.json()) as {
          customerId?: string;
        };

        if (!customerData.customerId) {
          throw new Error("Customer ID missing from response");
        }

        setCustomerId(customerData.customerId);

        // Load cart from API
        try {
          const response = await fetch(
            `/api/cart?customerId=${customerData.customerId}&userId=${encodeURIComponent(user.id)}`
          );
          if (response.ok) {
            const data = (await response.json()) as { items?: CartItem[] };
            const normalizedItems = Array.isArray(data.items) ? data.items : [];
            setItems(normalizedItems);
            if (normalizedItems[0]) {
              setRestaurantId(String(normalizedItems[0].restaurantId));
            } else {
              setRestaurantId(null);
            }
          }
        } catch (cartErr) {
          console.error("Could not load cart from DB:", formatError(cartErr));
        }
      } catch (err) {
        console.error(
          "Error initializing cart (app will work without persistence):",
          formatError(err)
        );
      } finally {
        setIsLoading(false);
      }
    };

    initCart();
  }, [user]);

  // Save cart to Supabase whenever items change
  useEffect(() => {
    if (!customerId || !restaurantId) return;
    if (!user?.id) return;
    const userId = user.id;

    const saveCart = async () => {
      try {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId, userId, restaurantId, items }),
        });
      } catch (err) {
        console.error("Error saving cart:", err);
      }
    };

    const timer = setTimeout(saveCart, 500);
    return () => clearTimeout(timer);
  }, [items, customerId, restaurantId, user]);

  const addItem = (newItem: Omit<CartItem, "quantity">) => {
    // Queue a switch confirmation if cart contains another restaurant.
    if (restaurantId && restaurantId !== newItem.restaurantId) {
      const currentName = items[0]?.restaurantName ?? restaurantId;
      setPendingSwitch({
        currentName,
        newName: newItem.restaurantName,
        item: newItem,
      });
      return;
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id);
      if (existing) {
        return prev.map((i) =>
          i.id === newItem.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });

    if (!restaurantId) {
      setRestaurantId(newItem.restaurantId);
    }
    setIsOpen(true);
  };

  const confirmRestaurantSwitch = () => {
    if (!pendingSwitch) return;
    setItems([{ ...pendingSwitch.item, quantity: 1 }]);
    setRestaurantId(pendingSwitch.item.restaurantId);
    setPendingSwitch(null);
    setIsOpen(true);
  };

  const cancelRestaurantSwitch = () => {
    setPendingSwitch(null);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
  };

  const saveOrder = async (
    restaurantId: string,
    deliveryAddress: string,
    extras?: {
      deliveryFee?: number;
      tip?: number;
      promoCode?: string;
    }
  ) => {
    if (!customerId) {
      throw new Error("Account not ready. Please refresh and try again.");
    }
    if (!user) {
      throw new Error("You must be logged in to place an order.");
    }
    if (items.length === 0) return;

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          customerId,
          restaurantId,
          items,
          totalPrice,
          deliveryFee: extras?.deliveryFee,
          tip: extras?.tip,
          promoCode: extras?.promoCode,
          deliveryAddress,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Could not place order. Please try again.");
      }

      clearCart();
      // Delete the cart from DB
      await fetch(
        `/api/cart?customerId=${customerId}&userId=${encodeURIComponent(user.id)}`,
        { method: "DELETE" }
      );
    } catch (err) {
      console.error("Error saving order:", err);
      if (err instanceof Error) throw err;
      throw new Error("Could not place order. Please try again.");
    }
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        pendingSwitch: pendingSwitch
          ? {
              currentName: pendingSwitch.currentName,
              newName: pendingSwitch.newName,
            }
          : null,
        confirmRestaurantSwitch,
        cancelRestaurantSwitch,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isOpen,
        setIsOpen,
        saveOrder,
        isLoading,
        restaurantId,
        setRestaurantId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
