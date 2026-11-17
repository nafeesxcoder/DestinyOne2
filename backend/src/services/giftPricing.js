const path = require("path");
const catalog = require(
  path.join(__dirname, "../../../frontend/shared/gift-catalog.json"),
);

// Same constants as frontend/src/domain/giftCommerce.ts — keep these in sync if that file changes.
const rates = { USD: 1, CAD: 1.36, INR: 17.5 };
const giftMarkets = [
  { country: "US", currency: "USD", taxRate: 0.0875 },
  { country: "CA", currency: "CAD", taxRate: 0.13 },
  { country: "IN", currency: "INR", taxRate: 0.18 },
];
const ALLOWED_CURRENCIES = new Set(["USD", "CAD", "INR"]);

// Business rules ? keep these in sync with frontend/src/domain/giftCommerce.ts.
// Platform margin: how much we keep per order, on top of item + delivery + fees.
const PLATFORM_MARGIN_RATE = 0.08; // 8%
// Stripe processing fee per currency (percent + fixed, in cents of that currency).
const STRIPE_FEE = {
  USD: { percent: 0.029, fixedCents: 30 },
  CAD: { percent: 0.029, fixedCents: 30 },
  INR: { percent: 0.02, fixedCents: 300 }, // ~?3 fixed (Stripe India)
};

const fallbackRule = {
  name: "Curated Gift",
  priceCents: 0,
  serviceLevel: "same_day",
  deliveryFeeCents: 799,
  cutoffHour: 20,
};

const productRules = Object.fromEntries(
  catalog
    .filter((p) => p.active)
    .map((p) => [
      p.id,
      {
        name: p.name,
        priceCents: p.priceCents,
        serviceLevel: p.serviceLevel,
        deliveryFeeCents: p.deliveryFeeCents,
        cutoffHour: p.cutoffHour,
      },
    ]),
);

function convertGiftMinor(amountMinor, currency) {
  return Math.round(amountMinor * (rates[currency] || 1));
}

function localizeGiftPrice(priceCents, currency) {
  const converted = convertGiftMinor(priceCents, currency);
  return currency === "INR" ? Math.max(69900, converted) : converted;
}

function resolveGiftMarket(country) {
  return giftMarkets.find((m) => m.country === country) || giftMarkets[0];
}

/**
 * Computes the authoritative order total server-side, mirroring
 * frontend/src/features/gifts/adapters/previewGiftRuntime.ts's estimateGiftOrderQuote().
 * Client-supplied totalCents is NEVER trusted for the actual charge.
 */
function computeGiftOrderTotal(input) {
  const rule = productRules[input.productId] || fallbackRule;
  const currency = ALLOWED_CURRENCIES.has(
    String(input.currency || "USD").toUpperCase(),
  )
    ? String(input.currency).toUpperCase()
    : "USD";

  const basePriceCents = rule.priceCents;
  const priceCents = localizeGiftPrice(basePriceCents, currency);

  const deliveryWindow = input.deliveryWindow || "asap";
  // Delivery distance is unknown at order-creation time (address is only collected after the
  // recipient accepts), so we always use the safe default of 5 included miles → no surcharge.
  const distanceFeeCents = 0;

  const rushFeeCents = convertGiftMinor(
    deliveryWindow === "asap" && rule.serviceLevel !== "scheduled" ? 299 : 0,
    currency,
  );
  const smallOrderFeeCents =
    basePriceCents > 0 && basePriceCents < 2500
      ? convertGiftMinor(199, currency)
      : 0;
  const discountCents =
    basePriceCents >= 6000
      ? convertGiftMinor(Math.min(499, rule.deliveryFeeCents), currency)
      : 0;

  const deliveryFeeCents =
    convertGiftMinor(rule.deliveryFeeCents, currency) + distanceFeeCents;
  const serviceFeeCents = Math.max(
    convertGiftMinor(199, currency),
    Math.round(priceCents * 0.065),
  );
  const addOnSubtotalCents = 0;
  const tipCents = Math.max(0, Math.round(Number(input.tipCents) || 0));

  // Platform margin on the item subtotal (not on tax, delivery or tips).
  const platformMarginCents = Math.round(priceCents * PLATFORM_MARGIN_RATE);

  const subtotalBeforeFees =
    priceCents +
    addOnSubtotalCents +
    deliveryFeeCents +
    rushFeeCents +
    smallOrderFeeCents +
    serviceFeeCents +
    platformMarginCents -
    discountCents;

  // Stripe fee pass-through. Compute on the gross amount so that after Stripe
  // takes its cut we still net exactly the subtotal. Solves:
  //   net = total - (total * percent + fixed) = subtotal
  //   total = (subtotal + fixed) / (1 - percent)
  const stripeRule = STRIPE_FEE[currency] || STRIPE_FEE.USD;
  const stripeFeeRecoveryCents = Math.round(
    (subtotalBeforeFees + stripeRule.fixedCents) / (1 - stripeRule.percent) - subtotalBeforeFees,
  );

  const taxableCents = subtotalBeforeFees + stripeFeeRecoveryCents;

  const market = resolveGiftMarket(
    input.marketCountry ||
      (currency === "CAD" ? "CA" : currency === "INR" ? "IN" : "US"),
  );
  const estimatedTaxCents = Math.max(
    0,
    Math.round(taxableCents * market.taxRate),
  );
  const totalCents = taxableCents + estimatedTaxCents + tipCents;

  return {
    productName: rule.name,
    currency,
    totalCents,
    itemSubtotalCents: priceCents,
    deliveryFeeCents,
    serviceFeeCents,
    platformMarginCents,
    stripeFeeRecoveryCents,
    estimatedTaxCents,
    discountCents,
    rushFeeCents,
    smallOrderFeeCents,
    tipCents,
  };
}

// ---- Anti-abuse limits (checked in giftService.createOrder) ------------------------
// The gift flow touches real money and addresses, so a single account must not be
// able to flood orders, spam the same recipient, or spend an unbounded amount.
const GIFT_LIMITS = {
  // Hard cap per single gift, in cents of the order currency (INR has its own floor
  // in localizeGiftPrice, so this only matters for USD/CAD).
  maxGiftTotalCents: 50000,
  // Orders waiting for the recipient/sender (not yet paid and not finished).
  maxOpenUnpaidOrders: 5,
  // Orders created by one sender in the last 24 hours.
  maxOrdersPerDay: 10,
  // Orders one sender can send to the SAME recipient in the last 24 hours.
  maxOrdersPerRecipientPerDay: 3,
  // Accounts younger than this are treated as "new" and get a tighter daily cap.
  newAccountHours: 24,
  newAccountMaxOrdersPerDay: 2,
};

module.exports = { computeGiftOrderTotal, productRules, GIFT_LIMITS };
