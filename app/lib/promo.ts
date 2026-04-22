export const PROMO_CODES = {
  PIZZA20: { type: "percent", value: 0.2 },
  BURGER15: { type: "percent", value: 0.15 },
  SUSHI25: { type: "percent", value: 0.25 },
  DELIVERY5: { type: "delivery_waive", value: 0 },
  FIRSTORDER: { type: "fixed", value: 10, firstOrderOnly: true },
  WEEKDAY10: { type: "percent", value: 0.1 },
} as const;

type PromoCode = keyof typeof PROMO_CODES;

export function isPromoCodeValid(code: string): code is PromoCode {
  return Object.prototype.hasOwnProperty.call(PROMO_CODES, code);
}

export function calculatePromoDiscount(
  rawCode: string,
  subtotal: number,
  deliveryFee: number,
  options?: { isFirstOrder?: boolean }
): { valid: boolean; discount: number; error?: string } {
  const code = rawCode.trim().toUpperCase();
  if (!isPromoCodeValid(code)) {
    return { valid: false, discount: 0, error: "Invalid promo code." };
  }

  const promo = PROMO_CODES[code];
  if ("firstOrderOnly" in promo && promo.firstOrderOnly && !options?.isFirstOrder) {
    return {
      valid: false,
      discount: 0,
      error: "This promo is only valid on your first order.",
    };
  }

  if (promo.type === "percent") {
    return { valid: true, discount: Math.max(0, subtotal * promo.value) };
  }
  if (promo.type === "fixed") {
    return { valid: true, discount: Math.max(0, Math.min(subtotal, promo.value)) };
  }
  if (promo.type === "delivery_waive") {
    return { valid: true, discount: Math.max(0, deliveryFee) };
  }

  return { valid: false, discount: 0, error: "Invalid promo code." };
}
