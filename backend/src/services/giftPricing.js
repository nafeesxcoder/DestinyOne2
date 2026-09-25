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

  const taxableCents =
    priceCents +
    addOnSubtotalCents +
    deliveryFeeCents +
    rushFeeCents +
    smallOrderFeeCents +
    serviceFeeCents -
    discountCents;

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
    estimatedTaxCents,
    discountCents,
    rushFeeCents,
    smallOrderFeeCents,
    tipCents,
  };
}

module.exports = { computeGiftOrderTotal, productRules };
