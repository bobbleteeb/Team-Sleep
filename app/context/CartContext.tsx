"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  restaurantId: number;
  restaurantName: string;
  image: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  saveOrder: (restaurantId: number, deliveryAddress: string) => Promise<void>;
  isLoading: boolean;
  restaurantId: number | null;
  setRestaurantId: (id: number) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string>("");
  const [restaurantId, setRestaurantId] = useState<number | null>(null);

  // Initialize customer and load cart from Supabase
  useEffect(() => {
    const initCart = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Get customer record for this user
        const { data: customer, error } = await supabase
          .from("customers")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (error && error.code === "PGRST116") {
          // Customer doesn't exist yet, create it
          const { data: newCustomer, error: createError } = await supabase
            .from("customers")
            .insert([{ user_id: user.id }])
            .select("id")
            .single();

          if (createError) {
            console.warn("Could not create customer, continuing without persistence:", createError);
            setIsLoading(false);
            return;
          }

          if (newCustomer?.id) {
            setCustomerId(newCustomer.id);
          }
        } else if (error) {
          console.warn("Could not fetch customer, continuing without persistence:", error);
          setIsLoading(false);
          return;
        } else if (customer?.id) {
          setCustomerId(customer.id);

          // Load cart from Supabase
          try {
            const response = await fetch(`/api/cart?customerId=${customer.id}`);
            if (response.ok) {
              const data = (await response.json()) as { items?: CartItem[] };
              if (data.items && data.items.length > 0) {
                setItems(data.items);
                // Set restaurant from first item
                if (data.items[0]) {
                  setRestaurantId(data.items[0].restaurantId);
                }
              }
            }
          } catch (cartErr) {
            console.warn("Could not load cart from DB:", cartErr);
          }
        }
      } catch (err) {
        console.warn("Error initializing cart (app will work without persistence):", err);
      } finally {
        setIsLoading(false);
      }
    };

    initCart();
  }, [user]);

  // Save cart to Supabase whenever items change
  useEffect(() => {
    if (!customerId || !restaurantId) return;

    const saveCart = async () => {
      try {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId, restaurantId, items }),
        });
      } catch (err) {
        console.error("Error saving cart:", err);
      }
    };

    const timer = setTimeout(saveCart, 500);
    return () => clearTimeout(timer);
  }, [items, customerId, restaurantId]);

  const addItem = (newItem: Omit<CartItem, "quantity">) => {
    // Warn if switching restaurants
    if (restaurantId && restaurantId !== newItem.restaurantId) {
      const confirmSwitch = window.confirm(
        `You have items from "${restaurantId}". Switch to "${newItem.restaurantName}"? This will clear your cart.`
      );
      if (confirmSwitch) {
        setItems([{ ...newItem, quantity: 1 }]);
        setRestaurantId(newItem.restaurantId);
      }
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

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: number, quantity: number) => {
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

  const saveOrder = async (restaurantId: number, deliveryAddress: string) => {
    if (!customerId || items.length === 0) return;

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          restaurantId,
          items,
          totalPrice,
          deliveryAddress,
        }),
      });

      if (response.ok) {
        clearCart();
        // Delete the cart from DB
        await fetch(`/api/cart?customerId=${customerId}`, { method: "DELETE" });
      }
    } catch (err) {
      console.error("Error saving order:", err);
    }
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
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
