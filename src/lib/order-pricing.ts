import "server-only";

export const MAX_PAYMENT_DISCOUNT_PCT = 30;

export function effectiveListingPrice(listing: { price: number; offerPrice: number | null }): number {
  return listing.offerPrice != null && listing.offerPrice < listing.price
    ? listing.offerPrice
    : listing.price;
}

export function computeSellerOrderTotals(input: {
  items: Array<{ unitPrice: number; quantity: number }>;
  coupon: { type: "PERCENT" | "FIXED"; value: number } | null;
  /** Descuento por método de pago (%), ya resuelto desde la configuración global. */
  paymentDiscountPct: number;
  shipCost: number;
}) {
  const subtotal = input.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);

  let couponDiscount = 0;
  if (input.coupon) {
    couponDiscount =
      input.coupon.type === "PERCENT"
        ? Math.round((subtotal * input.coupon.value) / 100)
        : input.coupon.value;
    couponDiscount = Math.max(0, Math.min(couponDiscount, subtotal));
  }

  const afterCoupon = subtotal - couponDiscount;
  const paymentDiscountPct = Math.max(
    0,
    Math.min(MAX_PAYMENT_DISCOUNT_PCT, Math.round(input.paymentDiscountPct))
  );
  const paymentDiscount = Math.round(afterCoupon * (paymentDiscountPct / 100));

  const discount = couponDiscount + paymentDiscount;
  const total = subtotal - discount + input.shipCost;

  return { subtotal, couponDiscount, paymentDiscount, paymentDiscountPct, discount, total };
}
