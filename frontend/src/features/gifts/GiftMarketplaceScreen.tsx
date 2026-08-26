import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Match } from "../../data";
import { colors } from "../../theme";
import type { GiftOrderQuote, GiftOrderResponse } from "./contracts/GiftModels";
import {
  buildGiftConciergePlan,
  type GiftConciergeMood,
} from "../../domain/giftConcierge";
import {
  buildGiftMarketplaceProducts,
  filterGiftMarketplace,
  formatGiftMarketMoney,
  giftMarkets,
  recommendGiftSubstitutions,
  resolveGiftMarket,
  type GiftCommerceProduct,
  type GiftCountry,
  type GiftSort,
} from "../../domain/giftCommerce";
import {
  giftMomentOptions,
  type GiftConciergeV2Plan,
  type GiftDeliverySlot,
  type GiftMomentSelection,
  type GiftReaction,
  type GiftRecipientAvailability,
} from "../../domain/giftExperience";
import type { GiftMarketplacePorts } from "./contracts/GiftMarketplacePorts";
import { type Screen } from "../../app/navigation/types";
import { ReferenceIconTile } from "../../components/premium/PremiumIcon";
import { SheetHeader } from "../../components/sheets/SheetHeader";
import {
  BottomNav,
  handleBottomNavScroll,
} from "../../components/navigation/BottomNav";
import {
  physicalGifts,
  type PhysicalGift,
} from "../../features/chat/ChatFeature";
import { giftMarketplaceStyles, chatStyles } from "../../theme/appStyles";

// 🚀 BACKGROUND IMAGE ADDED HERE
const backgroundImage = require("../../../assets/background.png");

const accessibilityHitSlop = {
  top: 12,
  right: 12,
  bottom: 12,
  left: 12,
} as const;
type GiftCheckoutStep = 1 | 2 | 3 | 4;
type GiftDeliveryWindow = "asap" | "today" | "scheduled";
type GiftCartLine = {
  gift: PhysicalGift;
  quantity: number;
};
type GiftAddressMode =
  | "recipient_supplied_private"
  | "sender_supplied_known_address";
type GiftPaymentMethod = "apple_pay" | "google_pay" | "card";
export function GiftMarketplace({
  ports,
  recipient,
  senderName,
  onBack,
  onOpenChat,
  onOrderCreated,
  navigate,
}: {
  ports: GiftMarketplacePorts;
  recipient: Match;
  senderName: string;
  onBack: () => void;
  onOpenChat: () => void;
  onOrderCreated: (
    gift: PhysicalGift,
    note: string,
    order: GiftOrderResponse,
  ) => Promise<boolean>;
  navigate: (screen: Screen) => void;
}) {
  const {
    createIdempotencyKey: createGiftIdempotencyKey,
    createOrder: createPhysicalGiftOrder,
    estimateQuote: estimateGiftOrderQuote,
    formatMoney: formatGiftMoney,
    orderingMode: physicalGiftOrderingMode,
    recordRecommendationFeedback: recordGiftRecommendationFeedback,
    requestConcierge: requestGiftConciergeV2,
  } = ports;
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const [step, setStep] = useState<GiftCheckoutStep>(1);
  const [category, setCategory] = useState("All");
  const inferredCountry: GiftCountry = /toronto|canada|\bon\b/i.test(
    recipient.city,
  )
    ? "CA"
    : /delhi|mumbai|india/i.test(recipient.city)
      ? "IN"
      : "US";
  const [marketCountry, setMarketCountry] =
    useState<GiftCountry>(inferredCountry);
  const market = resolveGiftMarket(marketCountry);
  const [marketCity, setMarketCity] = useState(
    () =>
      market.cities.find((city) =>
        recipient.city
          .toLowerCase()
          .includes(city.label.split(",")[0]!.toLowerCase()),
      )?.label ?? market.cities[0]!.label,
  );
  const [giftSearch, setGiftSearch] = useState("");
  const [giftSort, setGiftSort] = useState<GiftSort>("recommended");
  const [deliveryFilter, setDeliveryFilter] = useState<
    "all" | "asap" | "today" | "scheduled"
  >("all");
  const [inStockOnly, setInStockOnly] = useState(true);
  const [productDetail, setProductDetail] =
    useState<GiftCommerceProduct | null>(null);
  const [cart, setCart] = useState<GiftCartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState(
    "A little reminder that I’m thinking of you ❤️",
  );
  const [occasion, setOccasion] = useState("Just because");
  const [deliveryWindow, setDeliveryWindow] =
    useState<GiftDeliveryWindow>("asap");
  const [scheduledDate, setScheduledDate] = useState(() =>
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [scheduledTime, setScheduledTime] = useState("18:00");
  const [addressMode, setAddressMode] = useState<GiftAddressMode>(
    "recipient_supplied_private",
  );
  const [address, setAddress] = useState(() => {
    const [city, ...regionParts] = recipient.city.split(",");
    const parsedRegion = regionParts.join(",").trim().slice(0, 3).toUpperCase();
    return {
      recipientName: recipient.name,
      line1: "",
      line2: "",
      city: (city ?? recipient.city).trim(),
      region: parsedRegion || "CA",
      postalCode: "",
      country: inferredCountry,
      phone: "",
      instructions: "",
    };
  });
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<GiftPaymentMethod>(
    Platform.OS === "ios" ? "apple_pay" : "card",
  );
  const [card, setCard] = useState({
    name: "",
    number: "",
    expiry: "",
    cvc: "",
    postalCode: "",
  });
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<GiftOrderResponse | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    createGiftIdempotencyKey(),
  );
  const [quoteCreatedAt, setQuoteCreatedAt] = useState(() => Date.now());
  const [quoteSecondsLeft, setQuoteSecondsLeft] = useState(10 * 60);
  const [manageMode, setManageMode] = useState<
    "overview" | "cancel" | "refund" | "support"
  >("overview");
  const [managementMessage, setManagementMessage] = useState("");
  const [supportDetails, setSupportDetails] = useState("");
  const [orderCancelled, setOrderCancelled] = useState(false);
  const [orderManageOpen, setOrderManageOpen] = useState(false);
  const [conciergeMood, setConciergeMood] =
    useState<GiftConciergeMood>("romantic");
  const [conciergeBudget, setConciergeBudget] = useState("60");
  const [conciergePlan, setConciergePlan] = useState<ReturnType<
    typeof buildGiftConciergePlan
  > | null>(null);
  const [conciergePrompt, setConciergePrompt] = useState(
    `${recipient.name} upset है, ₹2,000 के अंदर आज कुछ thoughtful भेजना है।`,
  );
  const [conciergeV2Plan, setConciergeV2Plan] =
    useState<GiftConciergeV2Plan | null>(null);
  const [conciergeV2Loading, setConciergeV2Loading] = useState(false);
  const [deliverySlot, setDeliverySlot] =
    useState<GiftDeliverySlot>("recipient_choice");
  const [recipientAvailability, setRecipientAvailability] =
    useState<GiftRecipientAvailability>("confirm_before_dispatch");
  const [surpriseHideExactGift, setSurpriseHideExactGift] = useState(true);
  const [giftWrap, setGiftWrap] = useState(false);
  const [premiumCard, setPremiumCard] = useState(false);
  const [tipPercent, setTipPercent] = useState(0);
  const [moments, setMoments] = useState<GiftMomentSelection[]>(
    giftMomentOptions.map((item) => ({
      kind: item.kind,
      enabled: false,
      value: "",
    })),
  );
  const [recipientReaction, setRecipientReaction] =
    useState<GiftReaction | null>(null);
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [privatePreferenceUpdate, setPrivatePreferenceUpdate] = useState(true);
  useEffect(() => {
    setConciergePlan(null);
  }, [conciergeMood, occasion, deliveryWindow, conciergeBudget]);
  const safeSenderName = senderName.trim() || "Your match";
  const selectedGift = cart[0]?.gift ?? null;
  const cartItemCount = cart.reduce((total, line) => total + line.quantity, 0);
  const cartSubtotalCents = cart.reduce(
    (total, line) => total + line.gift.priceCents * line.quantity,
    0,
  );
  const lineItems = cart.map((line) => ({
    productId: line.gift.id,
    quantity: line.quantity,
  }));
  const marketplaceProducts = buildGiftMarketplaceProducts({
    country: marketCountry,
    city: marketCity,
  }).map((gift) => ({ ...gift, caption: gift.description }));
  const categories = [
    "All",
    ...Array.from(new Set(marketplaceProducts.map((gift) => gift.category))),
  ];
  const visibleGifts = filterGiftMarketplace(marketplaceProducts, {
    query: giftSearch,
    category,
    delivery: deliveryFilter,
    sort: giftSort,
    inStockOnly,
  });
  const marketCurrency = market.currency;
  const addOnSubtotalCents =
    (giftWrap
      ? Math.round(
          (marketCurrency === "INR" ? 14900 : 699) *
            (marketCurrency === "CAD" ? 1.36 : 1),
        )
      : 0) +
    (premiumCard
      ? Math.round(
          (marketCurrency === "INR" ? 9900 : 399) *
            (marketCurrency === "CAD" ? 1.36 : 1),
        )
      : 0);
  const tipCents = Math.round(
    ((cartSubtotalCents + addOnSubtotalCents) * tipPercent) / 100,
  );
  const quote = selectedGift
    ? estimateGiftOrderQuote(
        {
          productId: selectedGift.id,
          productName:
            cartItemCount === 1
              ? selectedGift.name
              : `${cartItemCount} romantic gifts`,
          lineItems,
          recipientId: recipient.id,
          recipientName: recipient.name,
          senderDisplayName: safeSenderName,
          senderDisplayMode: "first_name",
          recipientAddressMode: addressMode,
          occasion,
          deliveryWindow,
          deliverySlot,
          recipientAvailability,
          surpriseHideExactGift,
          deliveryCity:
            addressMode === "sender_supplied_known_address"
              ? address.city || marketCity
              : marketCity,
          deliveryDistanceMilesEstimate: 5,
          priceCents: cartSubtotalCents,
          addOnSubtotalCents,
          tipCents,
          etaHint: selectedGift.eta,
          note,
          currency: marketCurrency,
          marketCountry,
        },
        new Date(quoteCreatedAt),
      )
    : null;
  const occasions = [
    "Just because",
    "Thinking of you",
    "Date night",
    "Birthday",
    "Milestone",
  ];
  const deliveryChoices: [
    GiftDeliveryWindow,
    string,
    string,
    keyof typeof Ionicons.glyphMap,
  ][] = [
    [
      "asap",
      "As soon as possible",
      "Fastest available local window",
      "flash-outline",
    ],
    [
      "today",
      "Later today",
      "Recipient chooses a comfortable time",
      "sunny-outline",
    ],
    [
      "scheduled",
      "Schedule it",
      "Choose a future delivery window",
      "calendar-outline",
    ],
  ];
  const requestedDeliveryAt =
    deliveryWindow === "scheduled" && scheduledDate && scheduledTime
      ? `${scheduledDate}T${scheduledTime}:00`
      : undefined;
  const scheduleComplete =
    deliveryWindow !== "scheduled" ||
    (!Number.isNaN(Date.parse(requestedDeliveryAt ?? "")) &&
      Date.parse(requestedDeliveryAt ?? "") >= Date.now() + 60 * 60 * 1000);
  const progress = (step / 4) * 100;
  useEffect(() => {
    setQuoteCreatedAt(Date.now());
    setQuoteSecondsLeft(10 * 60);
  }, [
    selectedGift?.id,
    cartSubtotalCents,
    deliveryWindow,
    address.city,
    addressMode,
  ]);
  useEffect(() => {
    if (!selectedGift || order) return;
    const timer = setInterval(
      () =>
        setQuoteSecondsLeft((current) => {
          if (current > 1) return current - 1;
          setQuoteCreatedAt(Date.now());
          return 10 * 60;
        }),
      1000,
    );
    return () => clearInterval(timer);
  }, [selectedGift, order]);
  const recipientCartKey = `destinyone:gift-cart-v4:${recipient.id}:${marketCountry}:${marketCity}`;
  useEffect(() => {
    setCart([]);
    void AsyncStorage.getItem(recipientCartKey).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as Array<{
          productId: string;
          quantity: number;
        }>;
        const restored = parsed.reduce<GiftCartLine[]>((items, item) => {
          const product = marketplaceProducts.find(
            (gift) => gift.id === item.productId,
          );
          if (product)
            items.push({
              gift: { ...product, priceCents: product.localizedPriceMinor },
              quantity: Math.max(1, Math.min(5, Number(item.quantity) || 1)),
            });
          return items;
        }, []);
        setCart(restored);
      } catch {
        void AsyncStorage.removeItem(recipientCartKey);
      }
    });
  }, [recipientCartKey]);
  useEffect(() => {
    void AsyncStorage.setItem(
      recipientCartKey,
      JSON.stringify(
        cart.map((line) => ({
          productId: line.gift.id,
          quantity: line.quantity,
        })),
      ),
    ).catch(() => undefined);
  }, [cart, recipientCartKey]);
  const addToCart = (gift: PhysicalGift | GiftCommerceProduct) => {
    if (
      "availability" in gift &&
      (gift.availability === "sold_out" || gift.availability === "waitlist")
    ) {
      setError(
        `${gift.name} is not available in ${marketCity}. Choose a suggested substitute or another delivery city.`,
      );
      setProductDetail(gift);
      return;
    }
    const localizedGift = {
      ...gift,
      caption: "caption" in gift ? gift.caption : gift.description,
      priceCents:
        "localizedPriceMinor" in gift
          ? gift.localizedPriceMinor
          : gift.priceCents,
    } as PhysicalGift;
    setCart((current) => {
      const existing = current.find((line) => line.gift.id === gift.id);
      return existing
        ? current.map((line) =>
            line.gift.id === gift.id
              ? { ...line, quantity: Math.min(5, line.quantity + 1) }
              : line,
          )
        : [...current, { gift: localizedGift, quantity: 1 }];
    });
    void recordGiftRecommendationFeedback({
      productId: gift.id,
      contextKey: `${marketCountry}:${marketCity}`,
      signal: "added",
      features: { category: gift.category, deliveryWindow },
    });
    setError("");
  };
  const normalizeConciergeBudget = () => {
    const normalized = Math.max(
      25,
      Math.min(150, Number(conciergeBudget) || 60),
    );
    setConciergeBudget(String(normalized));
    return normalized;
  };
  const runGiftConcierge = () => {
    const normalizedBudget = normalizeConciergeBudget();
    setConciergePlan(
      buildGiftConciergePlan({
        budgetCents: normalizedBudget * 100,
        mood: conciergeMood,
        occasion,
        deliveryWindow,
        recipientName: recipient.name,
        city: recipient.city,
      }),
    );
  };
  const runGiftConciergeV2 = async () => {
    if (!conciergePrompt.trim()) return;
    setConciergeV2Loading(true);
    setError("");
    try {
      const plan = await requestGiftConciergeV2({
        prompt: conciergePrompt,
        products: marketplaceProducts,
        currency: marketCurrency,
        fallbackBudgetMinor: marketCurrency === "INR" ? 200000 : 6000,
        relationshipStage: "dating",
      });
      setConciergeV2Plan(plan);
      if (!plan.options.length)
        setError(
          "No delivery-ready option fits the complete budget. Try a slightly higher budget or another delivery time.",
        );
    } finally {
      setConciergeV2Loading(false);
    }
  };
  const applyConciergeV2Option = (productId: string) => {
    const product = marketplaceProducts.find((item) => item.id === productId);
    if (!product) return;
    setCart([
      {
        gift: {
          ...product,
          caption: product.description,
          priceCents: product.localizedPriceMinor,
        },
        quantity: 1,
      },
    ]);
    setConciergeV2Plan(null);
    setDeliveryWindow(/today|आज|aaj/i.test(conciergePrompt) ? "today" : "asap");
    setStep(2);
    setError("");
  };
  const applyGiftConcierge = () => {
    if (!conciergePlan) return;
    if (!conciergePlan.recommendedProductIds.length) {
      setError(
        "Increase the total budget or choose another delivery time to unlock a delivery-ready gift.",
      );
      return;
    }
    const recommended = conciergePlan.recommendedProductIds
      .map((id) => physicalGifts.find((gift) => gift.id === id))
      .filter((gift): gift is PhysicalGift => Boolean(gift));
    setCart(recommended.map((gift) => ({ gift, quantity: 1 })));
    setNote(conciergePlan.suggestedNote);
    setCategory("All");
    setConciergePlan(null);
    setError("");
  };
  const updateCartQuantity = (giftId: string, change: number) =>
    setCart((current) =>
      current.flatMap((line) =>
        line.gift.id !== giftId
          ? [line]
          : line.quantity + change <= 0
            ? []
            : [{ ...line, quantity: Math.min(5, line.quantity + change) }],
      ),
    );
  const resetOrder = () => {
    setStep(1);
    setCart([]);
    void AsyncStorage.removeItem(recipientCartKey);
    setNote("A little reminder that I’m thinking of you ❤️");
    setOccasion("Just because");
    setDeliveryWindow("asap");
    setDeliverySlot("recipient_choice");
    setRecipientAvailability("confirm_before_dispatch");
    setSurpriseHideExactGift(true);
    setGiftWrap(false);
    setPremiumCard(false);
    setTipPercent(0);
    setMoments(
      giftMomentOptions.map((item) => ({
        kind: item.kind,
        enabled: false,
        value: "",
      })),
    );
    setAddressMode("recipient_supplied_private");
    setPaymentMethod(Platform.OS === "ios" ? "apple_pay" : "card");
    setOrder(null);
    setRecipientReaction(null);
    setThankYouMessage("");
    setIdempotencyKey(createGiftIdempotencyKey());
    setError("");
    setManageMode("overview");
    setManagementMessage("");
    setOrderCancelled(false);
  };
  const addressComplete =
    addressMode === "recipient_supplied_private" ||
    Boolean(
      address.recipientName.trim() &&
      address.line1.trim() &&
      address.city.trim() &&
      address.region.trim() &&
      address.postalCode.trim(),
    );
  const paymentComplete =
    paymentMethod !== "card" ||
    Boolean(
      card.name.trim() &&
      card.number.replace(/\D/g, "").length >= 12 &&
      /^\d{2}\/\d{2}$/.test(card.expiry.trim()) &&
      card.cvc.trim().length >= 3 &&
      card.postalCode.trim(),
    );
  const placeOrder = async () => {
    if (!selectedGift || !quote) return;
    setOrdering(true);
    setError("");
    try {
      if (!addressComplete)
        throw new Error(
          "Complete the delivery address before placing this order.",
        );
      if (!scheduleComplete)
        throw new Error(
          "Choose a scheduled delivery time at least one hour from now.",
        );
      if (!paymentComplete)
        throw new Error(
          "Complete the secure payment details before placing this order.",
        );
      const created = await createPhysicalGiftOrder({
        contractVersion: "gift-checkout-v2",
        idempotencyKey,
        productId: selectedGift.id,
        productName:
          cartItemCount === 1
            ? selectedGift.name
            : `${cartItemCount} romantic gifts`,
        lineItems,
        recipientId: recipient.id,
        recipientName: recipient.name,
        senderDisplayName: safeSenderName,
        senderDisplayMode: "first_name",
        recipientAddressMode: addressMode,
        deliveryAddress:
          addressMode === "sender_supplied_known_address" ? address : undefined,
        paymentMethod,
        paymentTokenMode: "provider_token_required",
        confirmationEmail: confirmationEmail.trim() || undefined,
        occasion,
        deliveryWindow,
        deliverySlot,
        recipientAvailability,
        surpriseHideExactGift,
        requestedDeliveryAt,
        deliveryCity:
          addressMode === "sender_supplied_known_address"
            ? address.city
            : marketCity,
        deliveryDistanceMilesEstimate: quote.estimatedDistanceMiles,
        priceCents: cartSubtotalCents,
        addOnSubtotalCents,
        tipCents,
        moments: moments
          .filter((item) => item.enabled)
          .map((item) => ({ kind: item.kind, value: item.value })),
        etaHint: selectedGift.eta,
        note: note.trim(),
        marketCountry,
        currency: marketCurrency,
        allowSubstitution: true,
        maxSubstitutionPriceIncreaseMinor:
          marketCurrency === "INR" ? 50000 : 500,
      });
      setOrder(created);
      void recordGiftRecommendationFeedback({
        productId: selectedGift.id,
        contextKey: `${marketCountry}:${marketCity}`,
        signal: "purchased",
        features: { currency: marketCurrency, totalMinor: quote.totalCents },
      });
      void AsyncStorage.removeItem(recipientCartKey);
      await onOrderCreated(selectedGift, note.trim(), created);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Gift checkout is temporarily unavailable. Please try again.",
      );
    } finally {
      setOrdering(false);
    }
  };
  // 🚀 ROOT BACKGROUND CHANGED: LinearGradient → View + Image
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFDFC" }}>
      <Image
        source={backgroundImage}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <SafeAreaView
        style={[giftMarketplaceStyles.safe, { backgroundColor: "transparent" }]}
      >
        <View style={giftMarketplaceStyles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Discover"
            hitSlop={accessibilityHitSlop}
            onPress={onBack}
            style={giftMarketplaceStyles.backButton}
          >
            <Ionicons name="arrow-back" size={21} color={colors.wine} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={giftMarketplaceStyles.headerEyebrow}>
              DESTINYONE GIFTS
            </Text>
            <Text
              accessibilityRole="header"
              style={giftMarketplaceStyles.headerTitle}
            >
              Send something unforgettable
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open cart with ${cartItemCount} items`}
            onPress={() => setCartOpen(true)}
            style={giftMarketplaceStyles.cartButton}
          >
            <Ionicons name="bag-handle-outline" size={20} color={colors.wine} />
            {cartItemCount > 0 && (
              <View style={giftMarketplaceStyles.cartBadge}>
                <Text style={giftMarketplaceStyles.cartBadgeText}>
                  {cartItemCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open gift orders in chat"
            onPress={onOpenChat}
            style={giftMarketplaceStyles.chatButton}
          >
            <ReferenceIconTile
              name="chatbubble-ellipses"
              orbSize={34}
              iconSize={16}
              tilePadding={13}
            />
          </Pressable>
        </View>
        <ScrollView
          onScroll={handleBottomNavScroll}
          scrollEventThrottle={16}
          contentContainerStyle={giftMarketplaceStyles.content}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#41000D", "#8E0926", "#C61C45"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              giftMarketplaceStyles.hero,
              wide && giftMarketplaceStyles.heroWide,
            ]}
          >
            <View style={giftMarketplaceStyles.heroGlow} />
            <View style={giftMarketplaceStyles.heroCopy}>
              <Text style={giftMarketplaceStyles.heroEyebrow}>
                ROMANCE, DELIVERED BEAUTIFULLY
              </Text>
              <Text style={giftMarketplaceStyles.heroScript}>
                A little gesture can say everything.
              </Text>
              <Text style={giftMarketplaceStyles.heroBody}>
                Choose a romantic surprise for {recipient.name}. They approve
                the address privately, and the complete order stays inside
                DestinyOne.
              </Text>
              <View style={giftMarketplaceStyles.heroTrustRow}>
                {[
                  "Sender visible",
                  "Address private",
                  "No external checkout",
                ].map((label) => (
                  <View key={label} style={giftMarketplaceStyles.heroTrustPill}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#F6D87C"
                    />
                    <Text style={giftMarketplaceStyles.heroTrustText}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={giftMarketplaceStyles.heroSeal}>
              <ReferenceIconTile
                name="gift"
                orbSize={76}
                iconSize={34}
                tilePadding={27}
              />
              <Text style={giftMarketplaceStyles.heroSealText}>
                FOR {recipient.name.toUpperCase()}
              </Text>
            </View>
          </LinearGradient>

          <View
            accessibilityRole="progressbar"
            accessibilityLabel={`Gift checkout step ${step} of 4`}
            accessibilityValue={{ min: 1, max: 4, now: step }}
            style={giftMarketplaceStyles.progressCard}
          >
            <View style={giftMarketplaceStyles.progressTop}>
              <Text style={giftMarketplaceStyles.progressTitle}>
                {order ? "ORDER CREATED" : `STEP ${step} OF 4`}
              </Text>
              <Text style={giftMarketplaceStyles.progressHint}>
                {order
                  ? "Track it in Chat"
                  : [
                      "Shop & cart",
                      "Personalize",
                      "Address & delivery",
                      "Payment & review",
                    ][step - 1]}
              </Text>
            </View>
            <View style={giftMarketplaceStyles.progressTrack}>
              <LinearGradient
                colors={["#C20A3A", "#E94C6A", "#C99B32"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  giftMarketplaceStyles.progressFill,
                  { width: `${order ? 100 : progress}%` },
                ]}
              />
            </View>
            <View style={giftMarketplaceStyles.stepLabels}>
              {["Cart", "Personalize", "Address", "Pay"].map((label, index) => (
                <View key={label} style={giftMarketplaceStyles.stepLabelWrap}>
                  <View
                    style={[
                      giftMarketplaceStyles.stepCircle,
                      index + 1 <= step && giftMarketplaceStyles.stepCircleOn,
                      order && giftMarketplaceStyles.stepCircleOn,
                    ]}
                  >
                    <Text
                      style={[
                        giftMarketplaceStyles.stepCircleText,
                        (index + 1 <= step || order) &&
                          giftMarketplaceStyles.stepCircleTextOn,
                      ]}
                    >
                      {order ? "✓" : index + 1}
                    </Text>
                  </View>
                  <Text style={giftMarketplaceStyles.stepLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
          {order && <GiftDeliveryTrackingCard order={order} />}
          {order && selectedGift && (
            <GiftRecipientReactionCard
              productName={selectedGift.name}
              reaction={recipientReaction}
              setReaction={setRecipientReaction}
              thankYou={thankYouMessage}
              setThankYou={setThankYouMessage}
              privateUpdate={privatePreferenceUpdate}
              setPrivateUpdate={setPrivatePreferenceUpdate}
            />
          )}

          {order && selectedGift && quote ? (
            <View style={giftMarketplaceStyles.successCard}>
              <View style={giftMarketplaceStyles.successIcon}>
                <ReferenceIconTile
                  name="checkmark"
                  orbSize={62}
                  iconSize={28}
                  tilePadding={23}
                />
              </View>
              <Text
                accessibilityRole="header"
                style={giftMarketplaceStyles.successTitle}
              >
                Your surprise is on its way to a yes.
              </Text>
              <Text style={giftMarketplaceStyles.successBody}>
                {recipient.name} will receive a private request showing{" "}
                <Text style={giftMarketplaceStyles.successStrong}>
                  From {safeSenderName}
                </Text>
                . Payment and preparation begin only after they accept their
                delivery details.
              </Text>
              <View style={giftMarketplaceStyles.successOrder}>
                <Image
                  accessible
                  accessibilityLabel={selectedGift.name}
                  source={{ uri: selectedGift.photo }}
                  style={giftMarketplaceStyles.successPhoto}
                />
                <View style={{ flex: 1 }}>
                  <Text style={giftMarketplaceStyles.successGiftName}>
                    {selectedGift.name}
                  </Text>
                  <Text style={giftMarketplaceStyles.successMeta}>
                    Order {order.orderId} · ETA {order.quote.etaLabel}
                  </Text>
                  <Text style={giftMarketplaceStyles.successMeta}>
                    {formatGiftMoney(order.quote.totalCents)} estimated ·
                    address stays private
                  </Text>
                </View>
              </View>
              <View style={giftMarketplaceStyles.successTimeline}>
                {order.steps.map((item) => (
                  <View
                    key={item.key}
                    style={giftMarketplaceStyles.successStep}
                  >
                    <View
                      style={[
                        giftMarketplaceStyles.successDot,
                        item.status === "active" &&
                          giftMarketplaceStyles.successDotOn,
                        item.status === "done" &&
                          giftMarketplaceStyles.successDotDone,
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={giftMarketplaceStyles.successStepTitle}>
                        {item.label}
                      </Text>
                      <Text style={giftMarketplaceStyles.successStepBody}>
                        {item.body.replace(
                          order.quote.pickupPartnerName,
                          "A trusted local partner",
                        )}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={giftMarketplaceStyles.confirmationCard}>
                <View style={giftMarketplaceStyles.confirmationHeading}>
                  <Ionicons name="notifications" size={18} color="#9A7417" />
                  <View style={{ flex: 1 }}>
                    <Text style={giftMarketplaceStyles.confirmationTitle}>
                      Confirmation center
                    </Text>
                    <Text style={giftMarketplaceStyles.confirmationBody}>
                      Both people receive a private order update. Email
                      activates when the developer connects the transactional
                      email adapter.
                    </Text>
                  </View>
                </View>
                {order.confirmations.channels.map((channel) => (
                  <View
                    key={`${channel.audience}-${channel.channel}`}
                    style={giftMarketplaceStyles.confirmationRow}
                  >
                    <Ionicons
                      name={
                        channel.channel === "email"
                          ? "mail-outline"
                          : "phone-portrait-outline"
                      }
                      size={16}
                      color="#8E0A2C"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={giftMarketplaceStyles.confirmationLabel}>
                        {channel.label}
                      </Text>
                      <Text style={giftMarketplaceStyles.confirmationDetail}>
                        {channel.detail}
                      </Text>
                    </View>
                    <View
                      style={[
                        giftMarketplaceStyles.confirmationStatus,
                        channel.status === "sent" &&
                          giftMarketplaceStyles.confirmationStatusSent,
                      ]}
                    >
                      <Text
                        style={[
                          giftMarketplaceStyles.confirmationStatusText,
                          channel.status === "sent" &&
                            giftMarketplaceStyles.confirmationStatusTextSent,
                        ]}
                      >
                        {channel.status === "preview_only"
                          ? "API READY"
                          : channel.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={giftMarketplaceStyles.successActions}>
                <Pressable
                  onPress={onOpenChat}
                  style={giftMarketplaceStyles.primaryButton}
                >
                  <Ionicons name="chatbubble-ellipses" size={18} color="#FFF" />
                  <Text style={giftMarketplaceStyles.primaryButtonText}>
                    View order in Chat
                  </Text>
                </Pressable>
                <Pressable
                  onPress={resetOrder}
                  style={giftMarketplaceStyles.secondaryButton}
                >
                  <Text style={giftMarketplaceStyles.secondaryButtonText}>
                    Send another gift
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {step === 1 && (
                <GiftConciergeV2Card
                  prompt={conciergePrompt}
                  setPrompt={setConciergePrompt}
                  loading={conciergeV2Loading}
                  plan={conciergeV2Plan}
                  products={marketplaceProducts}
                  currency={marketCurrency}
                  recipientName={recipient.name}
                  onBuild={() => void runGiftConciergeV2()}
                  onUse={applyConciergeV2Option}
                />
              )}
              {step === 1 && (
                <View style={giftMarketplaceStyles.conciergeCard}>
                  <View style={giftMarketplaceStyles.conciergeHeader}>
                    <ReferenceIconTile
                      name="sparkles"
                      orbSize={54}
                      iconSize={24}
                      tilePadding={20}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={giftMarketplaceStyles.conciergeEyebrow}>
                        DESTINYONE AI CONCIERGE
                      </Text>
                      <Text
                        accessibilityRole="header"
                        style={giftMarketplaceStyles.conciergeTitle}
                      >
                        A thoughtful plan in under a minute
                      </Text>
                      <Text style={giftMarketplaceStyles.conciergeBody}>
                        Set the moment, delivery speed, feeling and complete
                        checkout budget.
                      </Text>
                    </View>
                    <Ionicons name="diamond" size={24} color="#F4D170" />
                  </View>
                  <View style={giftMarketplaceStyles.conciergeContextGrid}>
                    <View style={giftMarketplaceStyles.conciergeContextGroup}>
                      <View style={giftMarketplaceStyles.conciergeLabelRow}>
                        <Ionicons
                          name="heart-outline"
                          size={13}
                          color="#F4D170"
                        />
                        <Text style={giftMarketplaceStyles.conciergeLabel}>
                          WHAT IS THE MOMENT?
                        </Text>
                      </View>
                      <View style={giftMarketplaceStyles.conciergeMoodRow}>
                        {occasions.map((item) => (
                          <Pressable
                            accessibilityRole="radio"
                            accessibilityLabel={`Gift occasion ${item}`}
                            accessibilityState={{ checked: occasion === item }}
                            key={item}
                            onPress={() => setOccasion(item)}
                            style={[
                              giftMarketplaceStyles.conciergeMood,
                              occasion === item &&
                                giftMarketplaceStyles.conciergeMoodOn,
                            ]}
                          >
                            <Text
                              style={[
                                giftMarketplaceStyles.conciergeMoodText,
                                occasion === item &&
                                  giftMarketplaceStyles.conciergeMoodTextOn,
                              ]}
                            >
                              {item}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    <View style={giftMarketplaceStyles.conciergeContextGroup}>
                      <View style={giftMarketplaceStyles.conciergeLabelRow}>
                        <Ionicons
                          name="time-outline"
                          size={13}
                          color="#F4D170"
                        />
                        <Text style={giftMarketplaceStyles.conciergeLabel}>
                          WHEN SHOULD IT ARRIVE?
                        </Text>
                      </View>
                      <View style={giftMarketplaceStyles.conciergeMoodRow}>
                        {deliveryChoices.map(([value, label, , icon]) => (
                          <Pressable
                            accessibilityRole="radio"
                            accessibilityLabel={`Gift delivery ${label}`}
                            accessibilityState={{
                              checked: deliveryWindow === value,
                            }}
                            key={value}
                            onPress={() => setDeliveryWindow(value)}
                            style={[
                              giftMarketplaceStyles.conciergeMood,
                              giftMarketplaceStyles.conciergeDeliveryMood,
                              deliveryWindow === value &&
                                giftMarketplaceStyles.conciergeMoodOn,
                            ]}
                          >
                            <Ionicons
                              name={icon}
                              size={13}
                              color={
                                deliveryWindow === value ? "#3B1C08" : "#FBECEF"
                              }
                            />
                            <Text
                              style={[
                                giftMarketplaceStyles.conciergeMoodText,
                                deliveryWindow === value &&
                                  giftMarketplaceStyles.conciergeMoodTextOn,
                              ]}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>
                  <View style={giftMarketplaceStyles.conciergeLabelRow}>
                    <Ionicons name="happy-outline" size={13} color="#F4D170" />
                    <Text style={giftMarketplaceStyles.conciergeLabel}>
                      HOW SHOULD IT FEEL?
                    </Text>
                  </View>
                  <View style={giftMarketplaceStyles.conciergeMoodRow}>
                    {(
                      [
                        "romantic",
                        "playful",
                        "comforting",
                        "celebratory",
                      ] as GiftConciergeMood[]
                    ).map((item) => (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: conciergeMood === item }}
                        key={item}
                        onPress={() => setConciergeMood(item)}
                        style={[
                          giftMarketplaceStyles.conciergeMood,
                          conciergeMood === item &&
                            giftMarketplaceStyles.conciergeMoodOn,
                        ]}
                      >
                        <Text
                          style={[
                            giftMarketplaceStyles.conciergeMoodText,
                            conciergeMood === item &&
                              giftMarketplaceStyles.conciergeMoodTextOn,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={giftMarketplaceStyles.conciergeBudgetCard}>
                    <View style={giftMarketplaceStyles.conciergeBudgetCopy}>
                      <Text style={giftMarketplaceStyles.conciergeLabel}>
                        TOTAL CHECKOUT BUDGET
                      </Text>
                      <Text style={giftMarketplaceStyles.conciergeBudgetHint}>
                        Gift, estimated delivery fees and tax included.
                      </Text>
                    </View>
                    <View style={giftMarketplaceStyles.conciergeBudgetControls}>
                      <Text style={giftMarketplaceStyles.conciergeCurrency}>
                        $
                      </Text>
                      <TextInput
                        accessibilityLabel="AI Concierge complete checkout budget in dollars"
                        keyboardType="number-pad"
                        value={conciergeBudget}
                        onChangeText={(value) =>
                          setConciergeBudget(
                            value.replace(/\D/g, "").slice(0, 3),
                          )
                        }
                        onBlur={normalizeConciergeBudget}
                        style={giftMarketplaceStyles.conciergeBudgetInput}
                      />
                    </View>
                  </View>
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel="Quick total budget"
                    style={giftMarketplaceStyles.conciergeBudgetPresets}
                  >
                    {[40, 60, 90, 120].map((amount) => (
                      <Pressable
                        key={amount}
                        accessibilityRole="radio"
                        accessibilityLabel={`${amount} dollar total budget`}
                        accessibilityState={{
                          checked: Number(conciergeBudget) === amount,
                        }}
                        onPress={() => setConciergeBudget(String(amount))}
                        style={[
                          giftMarketplaceStyles.conciergeBudgetPreset,
                          Number(conciergeBudget) === amount &&
                            giftMarketplaceStyles.conciergeBudgetPresetOn,
                        ]}
                      >
                        <Text
                          style={[
                            giftMarketplaceStyles.conciergeBudgetPresetText,
                            Number(conciergeBudget) === amount &&
                              giftMarketplaceStyles.conciergeBudgetPresetTextOn,
                          ]}
                        >
                          ${amount}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Build AI Concierge gift plan"
                    onPress={runGiftConcierge}
                    style={giftMarketplaceStyles.conciergeButton}
                  >
                    <Ionicons name="sparkles" size={18} color="#3B1C08" />
                    <Text style={giftMarketplaceStyles.conciergeButtonText}>
                      Build my surprise
                    </Text>
                    <Ionicons name="arrow-forward" size={17} color="#3B1C08" />
                  </Pressable>
                  {conciergePlan && (
                    <View
                      accessibilityLiveRegion="polite"
                      style={giftMarketplaceStyles.conciergeResult}
                    >
                      <Text
                        style={giftMarketplaceStyles.conciergeResultEyebrow}
                      >
                        CURATED FOR {recipient.name.toUpperCase()}
                      </Text>
                      <Text style={giftMarketplaceStyles.conciergeResultTitle}>
                        {conciergePlan.headline}
                      </Text>
                      <Text style={giftMarketplaceStyles.conciergeResultBody}>
                        {conciergePlan.reason}
                      </Text>
                      <View style={giftMarketplaceStyles.conciergePicks}>
                        {conciergePlan.recommendedProductIds.map((id) => {
                          const gift = physicalGifts.find(
                            (item) => item.id === id,
                          );
                          return gift ? (
                            <View
                              key={id}
                              style={giftMarketplaceStyles.conciergePick}
                            >
                              <Image
                                accessible
                                accessibilityLabel={`${gift.name} recommended gift`}
                                source={{ uri: gift.photo }}
                                style={giftMarketplaceStyles.conciergePickPhoto}
                              />
                              <Text
                                numberOfLines={2}
                                style={giftMarketplaceStyles.conciergePickText}
                              >
                                {gift.name}
                              </Text>
                            </View>
                          ) : null;
                        })}
                      </View>
                      <View style={giftMarketplaceStyles.conciergeNote}>
                        <Ionicons name="heart" size={16} color="#F5D373" />
                        <Text style={giftMarketplaceStyles.conciergeNoteText}>
                          “{conciergePlan.suggestedNote}”
                        </Text>
                      </View>
                      <View style={giftMarketplaceStyles.premiumDiffGrid}>
                        {conciergePlan.premiumDifferentiators.map((item) => (
                          <View
                            key={item.title}
                            style={giftMarketplaceStyles.premiumDiff}
                          >
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color="#F5D373"
                            />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={giftMarketplaceStyles.premiumDiffTitle}
                              >
                                {item.title}
                              </Text>
                              <Text
                                style={giftMarketplaceStyles.premiumDiffBody}
                              >
                                {item.body}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                      {conciergePlan.recommendedProductIds.length > 0 ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Use AI Concierge gift plan"
                          onPress={applyGiftConcierge}
                          style={giftMarketplaceStyles.conciergeApply}
                        >
                          <Text
                            style={giftMarketplaceStyles.conciergeApplyText}
                          >
                            Use this concierge plan
                          </Text>
                          <Ionicons
                            name="arrow-forward"
                            size={17}
                            color="#3B1C08"
                          />
                        </Pressable>
                      ) : (
                        <Text style={giftMarketplaceStyles.conciergeResultBody}>
                          Increase the budget or choose another delivery time to
                          continue.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}
              {step === 1 && (
                <View style={giftMarketplaceStyles.section}>
                  <View style={giftMarketplaceStyles.sectionHeading}>
                    <View>
                      <Text style={giftMarketplaceStyles.sectionEyebrow}>
                        CURATED ROMANTIC PICKS
                      </Text>
                      <Text
                        accessibilityRole="header"
                        style={giftMarketplaceStyles.sectionTitle}
                      >
                        Build one beautiful surprise
                      </Text>
                    </View>
                    <Text style={giftMarketplaceStyles.sectionCount}>
                      {visibleGifts.length} gifts
                    </Text>
                  </View>
                  <View style={giftMarketplaceStyles.marketToolbar}>
                    <View style={giftMarketplaceStyles.searchBox}>
                      <Ionicons name="search" size={17} color="#8E0A2C" />
                      <TextInput
                        accessibilityLabel="Search gifts"
                        value={giftSearch}
                        onChangeText={setGiftSearch}
                        placeholder="Search flowers, date night, chocolate…"
                        placeholderTextColor="#947B82"
                        style={giftMarketplaceStyles.searchInput}
                      />
                      {!!giftSearch && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Clear gift search"
                          onPress={() => setGiftSearch("")}
                        >
                          <Ionicons
                            name="close-circle"
                            size={19}
                            color="#957D83"
                          />
                        </Pressable>
                      )}
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={giftMarketplaceStyles.marketRow}
                    >
                      {giftMarkets.map((item) => (
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{
                            checked: marketCountry === item.country,
                          }}
                          key={item.country}
                          onPress={() => {
                            setMarketCountry(item.country);
                            setMarketCity(item.cities[0]!.label);
                            setAddress((current) => ({
                              ...current,
                              country: item.country,
                              city: item.cities[0]!.label.split(",")[0] ?? "",
                              region: "",
                            }));
                            setProductDetail(null);
                          }}
                          style={[
                            giftMarketplaceStyles.marketPill,
                            marketCountry === item.country &&
                              giftMarketplaceStyles.marketPillOn,
                          ]}
                        >
                          <Text
                            style={[
                              giftMarketplaceStyles.marketPillText,
                              marketCountry === item.country &&
                                giftMarketplaceStyles.marketPillTextOn,
                            ]}
                          >
                            {item.country === "US"
                              ? "🇺🇸 US"
                              : item.country === "CA"
                                ? "🇨🇦 Canada"
                                : "🇮🇳 India"}
                          </Text>
                        </Pressable>
                      ))}
                      {market.cities.map((city) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: marketCity === city.label,
                          }}
                          key={city.key}
                          onPress={() => setMarketCity(city.label)}
                          style={[
                            giftMarketplaceStyles.cityPill,
                            marketCity === city.label &&
                              giftMarketplaceStyles.cityPillOn,
                          ]}
                        >
                          <Ionicons
                            name="location-outline"
                            size={13}
                            color={
                              marketCity === city.label ? "#FFF" : "#8E0A2C"
                            }
                          />
                          <Text
                            style={[
                              giftMarketplaceStyles.cityPillText,
                              marketCity === city.label &&
                                giftMarketplaceStyles.cityPillTextOn,
                            ]}
                          >
                            {city.label}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <View style={giftMarketplaceStyles.filterRow}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6 }}
                      >
                        {(
                          [
                            ["all", "Any delivery"],
                            ["asap", "ASAP"],
                            ["today", "Today"],
                            ["scheduled", "Scheduled"],
                          ] as const
                        ).map(([value, label]) => (
                          <Pressable
                            key={value}
                            onPress={() => setDeliveryFilter(value)}
                            style={[
                              giftMarketplaceStyles.filterPill,
                              deliveryFilter === value &&
                                giftMarketplaceStyles.filterPillOn,
                            ]}
                          >
                            <Text
                              style={[
                                giftMarketplaceStyles.filterText,
                                deliveryFilter === value &&
                                  giftMarketplaceStyles.filterTextOn,
                              ]}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        ))}
                        <Pressable
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: inStockOnly }}
                          onPress={() => setInStockOnly((value) => !value)}
                          style={[
                            giftMarketplaceStyles.filterPill,
                            inStockOnly && giftMarketplaceStyles.filterPillOn,
                          ]}
                        >
                          <Text
                            style={[
                              giftMarketplaceStyles.filterText,
                              inStockOnly && giftMarketplaceStyles.filterTextOn,
                            ]}
                          >
                            In stock
                          </Text>
                        </Pressable>
                      </ScrollView>
                      <View style={giftMarketplaceStyles.sortBox}>
                        <Ionicons
                          name="swap-vertical"
                          size={14}
                          color="#8E0A2C"
                        />
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                        >
                          {(
                            [
                              ["recommended", "Recommended"],
                              ["fastest", "Fastest"],
                              ["price_low", "Price ↑"],
                              ["price_high", "Price ↓"],
                            ] as const
                          ).map(([value, label]) => (
                            <Pressable
                              accessibilityRole="radio"
                              accessibilityState={{
                                checked: giftSort === value,
                              }}
                              key={value}
                              onPress={() => setGiftSort(value)}
                              style={giftMarketplaceStyles.sortChoice}
                            >
                              <Text
                                style={[
                                  giftMarketplaceStyles.sortText,
                                  giftSort === value &&
                                    giftMarketplaceStyles.sortTextOn,
                                ]}
                              >
                                {label}
                              </Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    </View>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={giftMarketplaceStyles.categoryRow}
                  >
                    {categories.map((item) => (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: category === item }}
                        key={item}
                        onPress={() => setCategory(item)}
                        style={[
                          giftMarketplaceStyles.categoryPill,
                          category === item &&
                            giftMarketplaceStyles.categoryPillOn,
                        ]}
                      >
                        <Text
                          style={[
                            giftMarketplaceStyles.categoryText,
                            category === item &&
                              giftMarketplaceStyles.categoryTextOn,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={giftMarketplaceStyles.catalogGrid}>
                    {visibleGifts.map((gift) => {
                      const quantity =
                        cart.find((line) => line.gift.id === gift.id)
                          ?.quantity ?? 0;
                      const active = quantity > 0;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`View ${gift.name}, ${formatGiftMarketMoney(gift.localizedPriceMinor, gift.currency)}, ${gift.availability.replace("_", " ")}`}
                          accessibilityState={{
                            selected: active,
                            disabled:
                              gift.availability === "sold_out" ||
                              gift.availability === "waitlist",
                          }}
                          key={gift.id}
                          onPress={() => {
                            setProductDetail(gift);
                            void recordGiftRecommendationFeedback({
                              productId: gift.id,
                              contextKey: `${marketCountry}:${marketCity}`,
                              signal: "viewed",
                              features: {
                                sort: giftSort,
                                query: Boolean(giftSearch),
                              },
                            });
                          }}
                          style={[
                            giftMarketplaceStyles.productCard,
                            { width: wide ? "31.8%" : "48.3%" },
                            active && giftMarketplaceStyles.productCardOn,
                            (gift.availability === "sold_out" ||
                              gift.availability === "waitlist") && {
                              opacity: 0.7,
                            },
                          ]}
                        >
                          <View style={giftMarketplaceStyles.productImageWrap}>
                            <Image
                              accessible
                              accessibilityLabel={`${gift.name} product photo`}
                              source={{ uri: gift.photo }}
                              resizeMode="cover"
                              style={giftMarketplaceStyles.productImage}
                            />
                            <LinearGradient
                              colors={["transparent", "rgba(30,0,8,.82)"]}
                              style={StyleSheet.absoluteFill}
                            />
                            <View style={giftMarketplaceStyles.productBadge}>
                              <Text
                                style={giftMarketplaceStyles.productBadgeText}
                              >
                                {gift.availability === "low_stock"
                                  ? `ONLY ${gift.availableUnits} LEFT`
                                  : gift.availability === "waitlist"
                                    ? "CITY WAITLIST"
                                    : gift.availability === "sold_out"
                                      ? "SOLD OUT"
                                      : gift.occasion}
                              </Text>
                            </View>
                            {active && (
                              <View style={giftMarketplaceStyles.productCheck}>
                                <Text
                                  style={giftMarketplaceStyles.productQuantity}
                                >
                                  {quantity}
                                </Text>
                              </View>
                            )}
                            <View
                              style={giftMarketplaceStyles.productImageText}
                            >
                              <Text style={giftMarketplaceStyles.productName}>
                                {gift.name}
                              </Text>
                              <Text
                                style={giftMarketplaceStyles.productCaption}
                                numberOfLines={2}
                              >
                                {gift.description}
                              </Text>
                            </View>
                          </View>
                          <View style={giftMarketplaceStyles.productMeta}>
                            <View>
                              <Text style={giftMarketplaceStyles.productPrice}>
                                {formatGiftMarketMoney(
                                  gift.localizedPriceMinor,
                                  gift.currency,
                                )}
                              </Text>
                              <Text style={giftMarketplaceStyles.productEta}>
                                {gift.eta} · ★ {gift.rating}
                              </Text>
                            </View>
                            <View style={giftMarketplaceStyles.addCartPill}>
                              <Ionicons
                                name="eye-outline"
                                size={14}
                                color="#FFF"
                              />
                              <Text style={giftMarketplaceStyles.addCartText}>
                                View
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  {!visibleGifts.length && (
                    <View style={giftMarketplaceStyles.emptyResults}>
                      <ReferenceIconTile
                        name="search-outline"
                        orbSize={46}
                        iconSize={20}
                        tilePadding={17}
                      />
                      <Text style={giftMarketplaceStyles.emptyCartTitle}>
                        No delivery-ready gifts match.
                      </Text>
                      <Text style={giftMarketplaceStyles.emptyCartBody}>
                        Try another city, delivery window or clear the search.
                      </Text>
                    </View>
                  )}
                  {selectedGift && quote && (
                    <View style={giftMarketplaceStyles.selectedTray}>
                      <View style={giftMarketplaceStyles.selectedTrayStack}>
                        {cart.slice(0, 3).map((line, index) => (
                          <Image
                            key={line.gift.id}
                            accessible={false}
                            source={{ uri: line.gift.photo }}
                            style={[
                              giftMarketplaceStyles.selectedTrayPhoto,
                              { marginLeft: index ? -17 : 0 },
                            ]}
                          />
                        ))}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={giftMarketplaceStyles.selectedTrayEyebrow}>
                          CART FOR {recipient.name.toUpperCase()}
                        </Text>
                        <Text style={giftMarketplaceStyles.selectedTrayTitle}>
                          {cartItemCount}{" "}
                          {cartItemCount === 1 ? "gift" : "gifts"} ·{" "}
                          {formatGiftMarketMoney(
                            cartSubtotalCents,
                            marketCurrency,
                          )}
                        </Text>
                        <Text style={giftMarketplaceStyles.selectedTrayMeta}>
                          {formatGiftMarketMoney(
                            quote.totalCents,
                            marketCurrency,
                          )}{" "}
                          estimated with delivery · ETA {quote.etaLabel}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Review gift cart"
                        onPress={() => setCartOpen(true)}
                        style={giftMarketplaceStyles.selectedTrayButton}
                      >
                        <Text
                          style={giftMarketplaceStyles.selectedTrayButtonText}
                        >
                          View cart
                        </Text>
                        <Ionicons name="bag-handle" size={16} color="#FFF" />
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {step === 2 && selectedGift && (
                <View style={giftMarketplaceStyles.checkoutPanel}>
                  <View style={giftMarketplaceStyles.checkoutTitleRow}>
                    <ReferenceIconTile
                      name="heart"
                      orbSize={48}
                      iconSize={22}
                      tilePadding={18}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={giftMarketplaceStyles.sectionEyebrow}>
                        MAKE IT YOURS
                      </Text>
                      <Text
                        accessibilityRole="header"
                        style={giftMarketplaceStyles.checkoutTitle}
                      >
                        Add the words they will remember.
                      </Text>
                    </View>
                  </View>
                  <Text style={giftMarketplaceStyles.fieldLabel}>OCCASION</Text>
                  <View style={giftMarketplaceStyles.choiceWrap}>
                    {occasions.map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setOccasion(item)}
                        style={[
                          giftMarketplaceStyles.choicePill,
                          occasion === item &&
                            giftMarketplaceStyles.choicePillOn,
                        ]}
                      >
                        <Text
                          style={[
                            giftMarketplaceStyles.choiceText,
                            occasion === item &&
                              giftMarketplaceStyles.choiceTextOn,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={giftMarketplaceStyles.fieldLabel}>
                    YOUR GIFT NOTE
                  </Text>
                  <TextInput
                    accessibilityLabel="Personal gift note"
                    value={note}
                    onChangeText={setNote}
                    multiline
                    maxLength={160}
                    placeholder="Write a short, thoughtful note…"
                    placeholderTextColor="#9A7E85"
                    style={giftMarketplaceStyles.noteInput}
                  />
                  <View style={giftMarketplaceStyles.noteFooter}>
                    <Text style={giftMarketplaceStyles.noteHint}>
                      Signed as{" "}
                      <Text style={giftMarketplaceStyles.noteStrong}>
                        {safeSenderName}
                      </Text>
                    </Text>
                    <Text style={giftMarketplaceStyles.noteCount}>
                      {note.length}/160
                    </Text>
                  </View>
                  <View style={giftMarketplaceStyles.identityCard}>
                    <ReferenceIconTile
                      name="person-circle"
                      orbSize={40}
                      iconSize={19}
                      tilePadding={15}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={giftMarketplaceStyles.identityTitle}>
                        The recipient knows it is from you
                      </Text>
                      <Text style={giftMarketplaceStyles.identityBody}>
                        Their request shows “From {safeSenderName}.” Anonymous
                        physical orders are not offered.
                      </Text>
                    </View>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#8B6B16"
                    />
                  </View>
                </View>
              )}

              {step === 2 && selectedGift && (
                <GiftMomentBuilder
                  moments={moments}
                  setMoments={setMoments}
                  giftWrap={giftWrap}
                  setGiftWrap={setGiftWrap}
                  premiumCard={premiumCard}
                  setPremiumCard={setPremiumCard}
                  currency={marketCurrency}
                />
              )}

              {step === 3 && selectedGift && quote && (
                <View style={giftMarketplaceStyles.checkoutPanel}>
                  <View style={giftMarketplaceStyles.checkoutTitleRow}>
                    <ReferenceIconTile
                      name="location"
                      orbSize={48}
                      iconSize={22}
                      tilePadding={18}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={giftMarketplaceStyles.sectionEyebrow}>
                        ADDRESS & DELIVERY
                      </Text>
                      <Text
                        accessibilityRole="header"
                        style={giftMarketplaceStyles.checkoutTitle}
                      >
                        Where should the surprise arrive?
                      </Text>
                    </View>
                  </View>
                  <View style={giftMarketplaceStyles.addressModeGrid}>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: addressMode === "recipient_supplied_private",
                      }}
                      onPress={() =>
                        setAddressMode("recipient_supplied_private")
                      }
                      style={[
                        giftMarketplaceStyles.addressModeCard,
                        addressMode === "recipient_supplied_private" &&
                          giftMarketplaceStyles.addressModeCardOn,
                      ]}
                    >
                      <ReferenceIconTile
                        name="lock-closed"
                        orbSize={38}
                        iconSize={17}
                        tilePadding={14}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={giftMarketplaceStyles.addressModeTitle}>
                          Ask {recipient.name} privately
                        </Text>
                        <Text style={giftMarketplaceStyles.addressModeBody}>
                          Recommended for dating safety. They add the exact
                          address after accepting.
                        </Text>
                      </View>
                      <Ionicons
                        name={
                          addressMode === "recipient_supplied_private"
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={21}
                        color={
                          addressMode === "recipient_supplied_private"
                            ? "#A17916"
                            : "#BDA7AC"
                        }
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked:
                          addressMode === "sender_supplied_known_address",
                      }}
                      onPress={() =>
                        setAddressMode("sender_supplied_known_address")
                      }
                      style={[
                        giftMarketplaceStyles.addressModeCard,
                        addressMode === "sender_supplied_known_address" &&
                          giftMarketplaceStyles.addressModeCardOn,
                      ]}
                    >
                      <ReferenceIconTile
                        name="home"
                        orbSize={38}
                        iconSize={17}
                        tilePadding={14}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={giftMarketplaceStyles.addressModeTitle}>
                          Use an address I already know
                        </Text>
                        <Text style={giftMarketplaceStyles.addressModeBody}>
                          For your own address or one the recipient has already
                          shared with you.
                        </Text>
                      </View>
                      <Ionicons
                        name={
                          addressMode === "sender_supplied_known_address"
                            ? "checkmark-circle"
                            : "ellipse-outline"
                        }
                        size={21}
                        color={
                          addressMode === "sender_supplied_known_address"
                            ? "#A17916"
                            : "#BDA7AC"
                        }
                      />
                    </Pressable>
                  </View>
                  {addressMode === "sender_supplied_known_address" && (
                    <View style={giftMarketplaceStyles.addressForm}>
                      <View style={giftMarketplaceStyles.fieldPair}>
                        <GiftField
                          label="Recipient name"
                          value={address.recipientName}
                          onChangeText={(value) =>
                            setAddress((current) => ({
                              ...current,
                              recipientName: value,
                            }))
                          }
                          autoComplete="name"
                        />
                        <GiftField
                          label="Phone (optional)"
                          value={address.phone}
                          onChangeText={(value) =>
                            setAddress((current) => ({
                              ...current,
                              phone: value,
                            }))
                          }
                          keyboardType="phone-pad"
                          autoComplete="tel"
                        />
                      </View>
                      <GiftField
                        label="Street address"
                        value={address.line1}
                        onChangeText={(value) =>
                          setAddress((current) => ({
                            ...current,
                            line1: value,
                          }))
                        }
                        autoComplete="street-address"
                      />
                      <GiftField
                        label="Apartment, suite (optional)"
                        value={address.line2}
                        onChangeText={(value) =>
                          setAddress((current) => ({
                            ...current,
                            line2: value,
                          }))
                        }
                      />
                      <View style={giftMarketplaceStyles.fieldPair}>
                        <GiftField
                          label="City"
                          value={address.city}
                          onChangeText={(value) =>
                            setAddress((current) => ({
                              ...current,
                              city: value,
                            }))
                          }
                          autoComplete="postal-address-locality"
                        />
                        <GiftField
                          label="State / province"
                          value={address.region}
                          onChangeText={(value) =>
                            setAddress((current) => ({
                              ...current,
                              region: value.toUpperCase().slice(0, 3),
                            }))
                          }
                          autoComplete="postal-address-region"
                        />
                      </View>
                      <View style={giftMarketplaceStyles.fieldPair}>
                        <GiftField
                          label="ZIP / postal code"
                          value={address.postalCode}
                          onChangeText={(value) =>
                            setAddress((current) => ({
                              ...current,
                              postalCode: value.toUpperCase().slice(0, 10),
                            }))
                          }
                          autoComplete="postal-code"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={giftMarketplaceStyles.inputLabel}>
                            COUNTRY
                          </Text>
                          <View style={giftMarketplaceStyles.countryRow}>
                            {(["US", "CA"] as const).map((country) => (
                              <Pressable
                                key={country}
                                onPress={() =>
                                  setAddress((current) => ({
                                    ...current,
                                    country,
                                  }))
                                }
                                style={[
                                  giftMarketplaceStyles.countryChoice,
                                  address.country === country &&
                                    giftMarketplaceStyles.countryChoiceOn,
                                ]}
                              >
                                <Text
                                  style={[
                                    giftMarketplaceStyles.countryText,
                                    address.country === country &&
                                      giftMarketplaceStyles.countryTextOn,
                                  ]}
                                >
                                  {country === "US"
                                    ? "United States"
                                    : "Canada"}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      </View>
                      <GiftField
                        label="Delivery instructions (optional)"
                        value={address.instructions}
                        onChangeText={(value) =>
                          setAddress((current) => ({
                            ...current,
                            instructions: value.slice(0, 120),
                          }))
                        }
                        placeholder="Gate code, lobby, leave with concierge…"
                      />
                    </View>
                  )}
                  <Text style={giftMarketplaceStyles.fieldLabel}>
                    WHEN SHOULD IT ARRIVE?
                  </Text>
                  <View style={giftMarketplaceStyles.deliveryGrid}>
                    {deliveryChoices.map(([value, label, body, icon]) => (
                      <Pressable
                        key={value}
                        onPress={() => setDeliveryWindow(value)}
                        style={[
                          giftMarketplaceStyles.deliveryChoice,
                          deliveryWindow === value &&
                            giftMarketplaceStyles.deliveryChoiceOn,
                        ]}
                      >
                        <ReferenceIconTile
                          name={icon}
                          orbSize={38}
                          iconSize={17}
                          tilePadding={14}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={giftMarketplaceStyles.deliveryTitle}>
                            {label}
                          </Text>
                          <Text style={giftMarketplaceStyles.deliveryBody}>
                            {body}
                          </Text>
                        </View>
                        <Ionicons
                          name={
                            deliveryWindow === value
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={21}
                          color={
                            deliveryWindow === value ? "#A17916" : "#BDA7AC"
                          }
                        />
                      </Pressable>
                    ))}
                  </View>
                  {deliveryWindow === "scheduled" && (
                    <View style={giftMarketplaceStyles.scheduleCard}>
                      <View style={giftMarketplaceStyles.scheduleHeading}>
                        <ReferenceIconTile
                          name="calendar"
                          orbSize={38}
                          iconSize={17}
                          tilePadding={14}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={giftMarketplaceStyles.scheduleTitle}>
                            Choose delivery date & time
                          </Text>
                          <Text style={giftMarketplaceStyles.scheduleBody}>
                            Available from one hour ahead, up to 90 days.
                          </Text>
                        </View>
                      </View>
                      <View style={giftMarketplaceStyles.fieldPair}>
                        <GiftField
                          label="Delivery date"
                          value={scheduledDate}
                          onChangeText={(value) =>
                            setScheduledDate(
                              value.replace(/[^0-9-]/g, "").slice(0, 10),
                            )
                          }
                          placeholder="YYYY-MM-DD"
                        />
                        <GiftField
                          label="Delivery time"
                          value={scheduledTime}
                          onChangeText={(value) =>
                            setScheduledTime(
                              value.replace(/[^0-9:]/g, "").slice(0, 5),
                            )
                          }
                          placeholder="18:00"
                        />
                      </View>
                      <View style={giftMarketplaceStyles.quickScheduleRow}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Schedule tomorrow at noon"
                          onPress={() => {
                            const value = new Date(
                              Date.now() + 24 * 60 * 60 * 1000,
                            );
                            setScheduledDate(value.toISOString().slice(0, 10));
                            setScheduledTime("12:00");
                          }}
                          style={giftMarketplaceStyles.quickScheduleButton}
                        >
                          <Text style={giftMarketplaceStyles.quickScheduleText}>
                            Tomorrow noon
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Schedule tomorrow evening"
                          onPress={() => {
                            const value = new Date(
                              Date.now() + 24 * 60 * 60 * 1000,
                            );
                            setScheduledDate(value.toISOString().slice(0, 10));
                            setScheduledTime("18:00");
                          }}
                          style={giftMarketplaceStyles.quickScheduleButton}
                        >
                          <Text style={giftMarketplaceStyles.quickScheduleText}>
                            Tomorrow evening
                          </Text>
                        </Pressable>
                      </View>
                      {!scheduleComplete && (
                        <Text
                          accessibilityRole="alert"
                          style={giftMarketplaceStyles.scheduleError}
                        >
                          Choose a valid date and time at least one hour from
                          now.
                        </Text>
                      )}
                    </View>
                  )}
                  <View
                    accessibilityLabel="Merchant inventory and courier readiness"
                    style={giftMarketplaceStyles.providerReadiness}
                  >
                    <View style={giftMarketplaceStyles.providerReadinessItem}>
                      <Ionicons name="cube-outline" size={19} color="#8E0A2C" />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={giftMarketplaceStyles.providerReadinessTitle}
                        >
                          Merchant inventory
                        </Text>
                        <Text
                          style={giftMarketplaceStyles.providerReadinessBody}
                        >
                          Checked before payment authorization
                        </Text>
                      </View>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#3B8C62"
                      />
                    </View>
                    <View style={giftMarketplaceStyles.providerReadinessItem}>
                      <Ionicons name="car-outline" size={19} color="#8E0A2C" />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={giftMarketplaceStyles.providerReadinessTitle}
                        >
                          Courier coverage
                        </Text>
                        <Text
                          style={giftMarketplaceStyles.providerReadinessBody}
                        >
                          Dispatch queued after recipient accepts
                        </Text>
                      </View>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#3B8C62"
                      />
                    </View>
                  </View>
                  <View
                    accessibilityLiveRegion="polite"
                    style={giftMarketplaceStyles.liveQuoteCard}
                  >
                    <View style={giftMarketplaceStyles.liveQuoteTop}>
                      <View style={giftMarketplaceStyles.liveDot} />
                      <Text style={giftMarketplaceStyles.liveQuoteTitle}>
                        LIVE DELIVERY ESTIMATE
                      </Text>
                      <Text style={giftMarketplaceStyles.liveQuoteTimer}>
                        {Math.floor(quoteSecondsLeft / 60)}:
                        {String(quoteSecondsLeft % 60).padStart(2, "0")}
                      </Text>
                    </View>
                    <View style={giftMarketplaceStyles.liveQuoteMain}>
                      <View>
                        <Text style={giftMarketplaceStyles.liveQuotePrice}>
                          {formatGiftMoney(quote.totalCents)}
                        </Text>
                        <Text style={giftMarketplaceStyles.liveQuoteMeta}>
                          estimated total for {quote.deliveryCity}
                        </Text>
                      </View>
                      <View style={giftMarketplaceStyles.liveEtaPill}>
                        <Ionicons
                          name="time-outline"
                          size={15}
                          color="#8E0A2C"
                        />
                        <Text style={giftMarketplaceStyles.liveEtaText}>
                          {quote.etaLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={giftMarketplaceStyles.liveQuoteFine}>
                      Gift, delivery, service, applicable rush/small-order fees
                      and estimated tax are included. The exact route refreshes
                      securely before authorization.
                    </Text>
                  </View>
                  <View style={giftMarketplaceStyles.fulfillmentNote}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={19}
                      color={colors.wine}
                    />
                    <Text style={giftMarketplaceStyles.fulfillmentText}>
                      Exact addresses are encrypted, never shown in chat and
                      sent only to the selected fulfillment provider after
                      consent.
                    </Text>
                  </View>
                </View>
              )}

              {step === 3 && selectedGift && (
                <GiftDeliveryOptionsCard
                  slot={deliverySlot}
                  setSlot={setDeliverySlot}
                  availability={recipientAvailability}
                  setAvailability={setRecipientAvailability}
                  hideExactGift={surpriseHideExactGift}
                  setHideExactGift={setSurpriseHideExactGift}
                />
              )}

              {step === 4 && selectedGift && quote && (
                <GiftFinalPreviewCard
                  product={selectedGift}
                  recipientName={recipient.name}
                  occasion={occasion}
                  note={note}
                  deliveryLabel={
                    deliveryWindow === "scheduled"
                      ? `${scheduledDate} · ${scheduledTime}`
                      : deliveryWindow === "today"
                        ? "Later today"
                        : "As soon as possible"
                  }
                  addressPrivate={addressMode === "recipient_supplied_private"}
                  hideExactGift={surpriseHideExactGift}
                  quote={quote}
                  currency={marketCurrency}
                  moments={moments}
                  onEditGift={() => setStep(1)}
                  onEditPersonalize={() => setStep(2)}
                  onEditDelivery={() => setStep(3)}
                />
              )}

              {step === 4 && selectedGift && quote && (
                <View style={giftMarketplaceStyles.checkoutPanel}>
                  <View style={giftMarketplaceStyles.checkoutTitleRow}>
                    <ReferenceIconTile
                      name="card"
                      orbSize={48}
                      iconSize={22}
                      tilePadding={18}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={giftMarketplaceStyles.sectionEyebrow}>
                        PAYMENT & REVIEW
                      </Text>
                      <Text
                        accessibilityRole="header"
                        style={giftMarketplaceStyles.checkoutTitle}
                      >
                        One clear total. No redirect.
                      </Text>
                    </View>
                  </View>
                  <View style={giftMarketplaceStyles.reviewCart}>
                    {cart.map((line) => (
                      <View
                        key={line.gift.id}
                        style={giftMarketplaceStyles.reviewCartLine}
                      >
                        <Image
                          accessible
                          accessibilityLabel={line.gift.name}
                          source={{ uri: line.gift.photo }}
                          style={giftMarketplaceStyles.reviewCartPhoto}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={giftMarketplaceStyles.reviewName}>
                            {line.gift.name}
                          </Text>
                          <Text style={giftMarketplaceStyles.reviewBody}>
                            Qty {line.quantity} · {line.gift.eta}
                          </Text>
                        </View>
                        <Text style={giftMarketplaceStyles.reviewLinePrice}>
                          {formatGiftMoney(
                            line.gift.priceCents * line.quantity,
                          )}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={giftMarketplaceStyles.reviewSummary}>
                    <View style={{ flex: 1 }}>
                      <Text style={giftMarketplaceStyles.reviewSummaryLabel}>
                        DELIVERING TO
                      </Text>
                      <Text style={giftMarketplaceStyles.reviewSummaryTitle}>
                        {addressMode === "recipient_supplied_private"
                          ? `${recipient.name} · private acceptance`
                          : address.line1}
                      </Text>
                      <Text style={giftMarketplaceStyles.reviewSummaryBody}>
                        {addressMode === "recipient_supplied_private"
                          ? `${recipient.city} · exact address requested securely`
                          : `${address.city}, ${address.region} ${address.postalCode}`}{" "}
                        · {quote.deliveryWindowLabel}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit address and delivery"
                      onPress={() => setStep(3)}
                      style={giftMarketplaceStyles.editSummary}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color="#8E0A2C"
                      />
                    </Pressable>
                  </View>
                  <View style={giftMarketplaceStyles.reviewRows}>
                    <View style={giftMarketplaceStyles.reviewLiveRow}>
                      <View style={giftMarketplaceStyles.liveDot} />
                      <Text style={giftMarketplaceStyles.reviewLiveText}>
                        LIVE ESTIMATE · REFRESHES IN{" "}
                        {Math.floor(quoteSecondsLeft / 60)}:
                        {String(quoteSecondsLeft % 60).padStart(2, "0")}
                      </Text>
                    </View>
                    <GiftPriceRowLight
                      label={`${cartItemCount} ${cartItemCount === 1 ? "gift" : "gifts"}`}
                      value={formatGiftMoney(quote.itemSubtotalCents)}
                    />
                    <GiftPriceRowLight
                      label={`Delivery${quote.distanceFeeCents ? " + route" : ""}`}
                      value={formatGiftMoney(quote.deliveryFeeCents)}
                    />
                    {quote.rushFeeCents > 0 && (
                      <GiftPriceRowLight
                        label="Fast delivery fee"
                        value={formatGiftMoney(quote.rushFeeCents)}
                      />
                    )}{" "}
                    {quote.smallOrderFeeCents > 0 && (
                      <GiftPriceRowLight
                        label="Small order fee"
                        value={formatGiftMoney(quote.smallOrderFeeCents)}
                      />
                    )}
                    <GiftPriceRowLight
                      label="DestinyOne service"
                      value={formatGiftMoney(quote.serviceFeeCents)}
                    />
                    <GiftPriceRowLight
                      label="Estimated tax"
                      value={formatGiftMoney(quote.estimatedTaxCents)}
                    />
                    {quote.discountCents > 0 && (
                      <GiftPriceRowLight
                        label="Delivery savings"
                        value={`−${formatGiftMoney(quote.discountCents)}`}
                      />
                    )}
                    <View style={giftMarketplaceStyles.reviewDivider} />
                    <GiftPriceRowLight
                      label="Estimated total"
                      value={formatGiftMoney(quote.totalCents)}
                      total
                    />
                    <Text style={giftMarketplaceStyles.reviewRouteNote}>
                      Final route and availability are verified before
                      authorization. You can cancel free before recipient
                      acceptance.
                    </Text>
                  </View>
                  <GiftPriceBreakdownCard
                    quote={quote}
                    currency={marketCurrency}
                    tipPercent={tipPercent}
                    setTipPercent={setTipPercent}
                  />
                  <Text style={giftMarketplaceStyles.fieldLabel}>
                    CHOOSE PAYMENT
                  </Text>
                  <View style={giftMarketplaceStyles.paymentGrid}>
                    {(
                      [
                        [
                          "apple_pay",
                          "logo-apple",
                          "Apple Pay",
                          "Fast biometric checkout",
                        ],
                        [
                          "google_pay",
                          "logo-google",
                          "Google Pay",
                          "Use a saved Google wallet",
                        ],
                        [
                          "card",
                          "card-outline",
                          "Credit or debit card",
                          "Visa, Mastercard, Amex",
                        ],
                      ] as const
                    ).map(([id, icon, title, body]) => (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: paymentMethod === id }}
                        key={id}
                        onPress={() => setPaymentMethod(id)}
                        style={[
                          giftMarketplaceStyles.paymentChoice,
                          paymentMethod === id &&
                            giftMarketplaceStyles.paymentChoiceOn,
                        ]}
                      >
                        <Ionicons
                          name={icon}
                          size={21}
                          color={paymentMethod === id ? "#FFF" : "#8E0A2C"}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              giftMarketplaceStyles.paymentTitle,
                              paymentMethod === id &&
                                giftMarketplaceStyles.paymentTitleOn,
                            ]}
                          >
                            {title}
                          </Text>
                          <Text
                            style={[
                              giftMarketplaceStyles.paymentBody,
                              paymentMethod === id &&
                                giftMarketplaceStyles.paymentBodyOn,
                            ]}
                          >
                            {body}
                          </Text>
                        </View>
                        <Ionicons
                          name={
                            paymentMethod === id
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={20}
                          color={paymentMethod === id ? "#F5D77B" : "#BDA7AC"}
                        />
                      </Pressable>
                    ))}
                  </View>
                  {paymentMethod === "card" && (
                    <View style={giftMarketplaceStyles.cardForm}>
                      <View style={giftMarketplaceStyles.cardFormHeader}>
                        <Ionicons
                          name="lock-closed"
                          size={16}
                          color="#8D6C16"
                        />
                        <Text style={giftMarketplaceStyles.cardFormTitle}>
                          Secure card details
                        </Text>
                        <Text style={giftMarketplaceStyles.cardFormBadge}>
                          TOKENIZED
                        </Text>
                      </View>
                      <GiftField
                        label="Name on card"
                        value={card.name}
                        onChangeText={(value) =>
                          setCard((current) => ({ ...current, name: value }))
                        }
                        autoComplete="cc-name"
                      />
                      <GiftField
                        label="Card number"
                        value={card.number}
                        onChangeText={(value) =>
                          setCard((current) => ({
                            ...current,
                            number: value
                              .replace(/\D/g, "")
                              .slice(0, 19)
                              .replace(/(.{4})/g, "$1 ")
                              .trim(),
                          }))
                        }
                        keyboardType="number-pad"
                        autoComplete="cc-number"
                        placeholder="1234 5678 9012 3456"
                      />
                      <View style={giftMarketplaceStyles.fieldPair}>
                        <GiftField
                          label="Expiry"
                          value={card.expiry}
                          onChangeText={(value) =>
                            setCard((current) => ({
                              ...current,
                              expiry: value
                                .replace(/\D/g, "")
                                .slice(0, 4)
                                .replace(/^(\d{2})(\d)/, "$1/$2"),
                            }))
                          }
                          keyboardType="number-pad"
                          autoComplete="cc-exp"
                          placeholder="MM/YY"
                        />
                        <GiftField
                          label="CVC"
                          value={card.cvc}
                          onChangeText={(value) =>
                            setCard((current) => ({
                              ...current,
                              cvc: value.replace(/\D/g, "").slice(0, 4),
                            }))
                          }
                          keyboardType="number-pad"
                          autoComplete="cc-csc"
                          placeholder="123"
                        />
                        <GiftField
                          label="Billing ZIP"
                          value={card.postalCode}
                          onChangeText={(value) =>
                            setCard((current) => ({
                              ...current,
                              postalCode: value.toUpperCase().slice(0, 10),
                            }))
                          }
                          autoComplete="postal-code"
                        />
                      </View>
                      <Text style={giftMarketplaceStyles.cardFine}>
                        Preview fields stay only in memory and are never added
                        to the order payload. Production sends a provider
                        token—not raw card data—to DestinyOne.
                      </Text>
                    </View>
                  )}
                  <GiftField
                    label="Email receipt (optional)"
                    value={confirmationEmail}
                    onChangeText={setConfirmationEmail}
                    keyboardType="email-address"
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                  <View style={giftMarketplaceStyles.reviewNoteCard}>
                    <Ionicons name="heart-outline" size={18} color="#A20B35" />
                    <View style={{ flex: 1 }}>
                      <Text style={giftMarketplaceStyles.reviewNoteLabel}>
                        YOUR NOTE
                      </Text>
                      <Text style={giftMarketplaceStyles.reviewNote}>
                        “{note.trim()}” — {safeSenderName}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Edit gift note"
                      onPress={() => setStep(2)}
                      style={giftMarketplaceStyles.editSummary}
                    >
                      <Ionicons
                        name="create-outline"
                        size={16}
                        color="#8E0A2C"
                      />
                    </Pressable>
                  </View>
                  <View style={giftMarketplaceStyles.reviewPromise}>
                    {[
                      "Recipient consent before preparation",
                      "In-app confirmation for both",
                      "Optional email receipt",
                      "No third-party checkout page",
                    ].map((item) => (
                      <View key={item} style={giftMarketplaceStyles.promiseRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={17}
                          color="#9B7517"
                        />
                        <Text style={giftMarketplaceStyles.promiseText}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    disabled={
                      ordering ||
                      physicalGiftOrderingMode === "blocked" ||
                      !paymentComplete ||
                      !addressComplete
                    }
                    onPress={() => void placeOrder()}
                    style={[
                      giftMarketplaceStyles.placeOrderButton,
                      (ordering ||
                        physicalGiftOrderingMode === "blocked" ||
                        !paymentComplete ||
                        !addressComplete) && { opacity: 0.5 },
                    ]}
                  >
                    <LinearGradient
                      pointerEvents="none"
                      colors={["#740017", "#C20A3A", "#9A062C"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                    <Ionicons name="lock-closed" size={18} color="#FFF" />
                    <Text style={giftMarketplaceStyles.placeOrderText}>
                      {physicalGiftOrderingMode === "blocked"
                        ? "Secure delivery connection required"
                        : ordering
                          ? "Creating private order…"
                          : !paymentComplete
                            ? "Complete payment details"
                            : `Place order · ${formatGiftMoney(quote.totalCents)}`}
                    </Text>
                  </Pressable>
                  <Text style={giftMarketplaceStyles.reviewFine}>
                    This preview creates a safe order request only. A production
                    payment adapter authorizes the selected method after address
                    consent and inventory confirmation.
                  </Text>
                  {!!error && (
                    <View style={giftMarketplaceStyles.errorCard}>
                      <Ionicons name="alert-circle" size={18} color="#A80028" />
                      <Text style={giftMarketplaceStyles.errorText}>
                        {error}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View style={giftMarketplaceStyles.checkoutNav}>
                {step > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Go to previous gift checkout step"
                    disabled={ordering}
                    onPress={() =>
                      setStep(
                        (current) =>
                          Math.max(1, current - 1) as GiftCheckoutStep,
                      )
                    }
                    style={giftMarketplaceStyles.backStepButton}
                  >
                    <Ionicons name="arrow-back" size={17} color={colors.wine} />
                    <Text style={giftMarketplaceStyles.backStepText}>Back</Text>
                  </Pressable>
                )}
                <View style={{ flex: 1 }} />
                {step < 4 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      step === 1
                        ? "Personalize gift cart"
                        : step === 2
                          ? "Continue to address and delivery"
                          : "Continue to payment and review"
                    }
                    disabled={
                      (step === 1 && !cart.length) ||
                      (step === 2 && !note.trim()) ||
                      (step === 3 && (!addressComplete || !scheduleComplete))
                    }
                    onPress={() =>
                      setStep(
                        (current) =>
                          Math.min(4, current + 1) as GiftCheckoutStep,
                      )
                    }
                    style={[
                      giftMarketplaceStyles.continueButton,
                      ((step === 1 && !cart.length) ||
                        (step === 2 && !note.trim()) ||
                        (step === 3 &&
                          (!addressComplete || !scheduleComplete))) && {
                        opacity: 0.45,
                      },
                    ]}
                  >
                    <Text style={giftMarketplaceStyles.continueText}>
                      {step === 1
                        ? "Personalize cart"
                        : step === 2
                          ? "Address & delivery"
                          : "Payment & review"}
                    </Text>
                    <Ionicons name="arrow-forward" size={17} color="#FFF" />
                  </Pressable>
                )}
              </View>
            </>
          )}
          <View style={giftMarketplaceStyles.safetyFooter}>
            <ReferenceIconTile
              name="shield-checkmark"
              orbSize={38}
              iconSize={17}
              tilePadding={14}
            />
            <View style={{ flex: 1 }}>
              <Text style={giftMarketplaceStyles.safetyTitle}>
                Romantic, never risky
              </Text>
              <Text style={giftMarketplaceStyles.safetyBody}>
                No home address is exchanged between members. Orders are
                rate-limited, support-visible and cancellable before recipient
                acceptance.
              </Text>
            </View>
          </View>
        </ScrollView>
        {order && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Manage gift order"
            onPress={() => setOrderManageOpen(true)}
            style={giftMarketplaceStyles.manageOrderFloating}
          >
            <Ionicons name="receipt-outline" size={18} color="#FFF" />
            <Text style={giftMarketplaceStyles.manageOrderFloatingText}>
              Manage order
            </Text>
          </Pressable>
        )}
        <GiftProductDetailSheet
          product={productDetail}
          products={marketplaceProducts}
          city={marketCity}
          onClose={() => setProductDetail(null)}
          onAdd={(gift) => {
            addToCart(gift);
            setProductDetail(null);
          }}
        />
        <GiftCartSheet
          visible={cartOpen}
          cart={cart}
          quote={quote}
          currency={marketCurrency}
          recipientName={recipient.name}
          onClose={() => setCartOpen(false)}
          onQuantity={updateCartQuantity}
          onClear={() => {
            setCart([]);
            void AsyncStorage.removeItem(recipientCartKey);
          }}
          onCheckout={() => {
            setCartOpen(false);
            setStep(2);
          }}
        />
        <GiftOrderManagementSheet
          visible={orderManageOpen}
          mode={manageMode}
          setMode={setManageMode}
          orderId={order?.orderId ?? ""}
          cancelled={orderCancelled}
          onCancel={() => {
            setOrderCancelled(true);
            setManagementMessage(
              "Cancellation confirmed. Eligible payment holds return automatically.",
            );
            setManageMode("refund");
          }}
          supportDetails={supportDetails}
          setSupportDetails={setSupportDetails}
          message={managementMessage}
          setMessage={setManagementMessage}
          onClose={() => setOrderManageOpen(false)}
        />
        <BottomNav active="gifts" navigate={navigate} light referenceIcons />
      </SafeAreaView>
    </View>
  );
}
function GiftConciergeV2Card({
  prompt,
  setPrompt,
  loading,
  plan,
  products,
  currency,
  recipientName,
  onBuild,
  onUse,
}: {
  prompt: string;
  setPrompt: (value: string) => void;
  loading: boolean;
  plan: GiftConciergeV2Plan | null;
  products: GiftCommerceProduct[];
  currency: "USD" | "CAD" | "INR";
  recipientName: string;
  onBuild: () => void;
  onUse: (id: string) => void;
}) {
  return (
    <View style={giftMarketplaceStyles.experienceCard}>
      <View style={giftMarketplaceStyles.experienceHeader}>
        <ReferenceIconTile
          name="sparkles"
          orbSize={48}
          iconSize={22}
          tilePadding={18}
        />
        <View style={{ flex: 1 }}>
          <Text style={giftMarketplaceStyles.sectionEyebrow}>
            AI GIFT CONCIERGE 2.0
          </Text>
          <Text
            accessibilityRole="header"
            style={giftMarketplaceStyles.experienceTitle}
          >
            Tell us what happened—in your own words.
          </Text>
          <Text style={giftMarketplaceStyles.experienceBody}>
            Only this text, consented preferences and gift history are used.
            Private chats are never read.
          </Text>
        </View>
      </View>
      <TextInput
        accessibilityLabel="Describe the gift moment for AI Concierge"
        value={prompt}
        onChangeText={(value) => setPrompt(value.slice(0, 500))}
        multiline
        placeholder={`${recipientName} needs cheering up, complete budget…`}
        placeholderTextColor="#9A7E85"
        style={giftMarketplaceStyles.aiPrompt}
      />
      <View style={giftMarketplaceStyles.noteFooter}>
        <Text style={giftMarketplaceStyles.noteHint}>
          Hindi, Hinglish or English
        </Text>
        <Text style={giftMarketplaceStyles.noteCount}>{prompt.length}/500</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={loading || !prompt.trim()}
        onPress={onBuild}
        style={[
          giftMarketplaceStyles.primaryButton,
          (loading || !prompt.trim()) && { opacity: 0.5 },
        ]}
      >
        <Ionicons name="sparkles" size={18} color="#FFF" />
        <Text style={giftMarketplaceStyles.primaryButtonText}>
          {loading
            ? "Building thoughtful options…"
            : "Find my best three gifts"}
        </Text>
      </Pressable>
      {plan && (
        <View
          accessibilityLiveRegion="polite"
          style={giftMarketplaceStyles.aiResults}
        >
          <View style={giftMarketplaceStyles.aiResultMeta}>
            <Text style={giftMarketplaceStyles.aiResultMetaText}>
              {plan.inferredMood.toUpperCase()} ·{" "}
              {plan.inferredDelivery.toUpperCase()} · COMPLETE BUDGET{" "}
              {formatGiftMarketMoney(plan.budgetMinor, currency)}
            </Text>
            <Text style={giftMarketplaceStyles.aiMode}>
              {plan.mode === "live_ai" ? "LIVE AI" : "PRIVATE SMART MATCH"}
            </Text>
          </View>
          {plan.options.map((option, index) => {
            const product = products.find(
              (item) => item.id === option.productId,
            );
            if (!product) return null;
            return (
              <View
                key={option.productId}
                style={giftMarketplaceStyles.aiOption}
              >
                <Image
                  accessible
                  accessibilityLabel={product.name}
                  source={{ uri: product.photo }}
                  style={giftMarketplaceStyles.aiOptionPhoto}
                />
                <View style={{ flex: 1 }}>
                  <Text style={giftMarketplaceStyles.aiOptionRank}>
                    #{index + 1} · {option.deliveryConfidence.toUpperCase()}{" "}
                    DELIVERY CONFIDENCE
                  </Text>
                  <Text style={giftMarketplaceStyles.aiOptionTitle}>
                    {product.name}
                  </Text>
                  <Text style={giftMarketplaceStyles.aiOptionReason}>
                    {option.reason}
                  </Text>
                  <Text style={giftMarketplaceStyles.aiOptionCaution}>
                    Boundary check: {option.caution}
                  </Text>
                  <View style={giftMarketplaceStyles.aiOptionBottom}>
                    <Text style={giftMarketplaceStyles.aiOptionTotal}>
                      {formatGiftMarketMoney(
                        option.estimatedTotalMinor,
                        currency,
                      )}{" "}
                      expected total
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${product.name}`}
                      onPress={() => onUse(product.id)}
                      style={giftMarketplaceStyles.smallWineButton}
                    >
                      <Text style={giftMarketplaceStyles.smallWineButtonText}>
                        Choose
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
          <Text style={giftMarketplaceStyles.experienceFine}>
            {plan.privacyNote} Previous gifts are excluded when history is
            available.
          </Text>
        </View>
      )}
    </View>
  );
}
function GiftMomentBuilder({
  moments,
  setMoments,
  giftWrap,
  setGiftWrap,
  premiumCard,
  setPremiumCard,
  currency,
}: {
  moments: GiftMomentSelection[];
  setMoments: (items: GiftMomentSelection[]) => void;
  giftWrap: boolean;
  setGiftWrap: (value: boolean) => void;
  premiumCard: boolean;
  setPremiumCard: (value: boolean) => void;
  currency: "USD" | "CAD" | "INR";
}) {
  const toggle = (kind: GiftMomentSelection["kind"]) =>
    setMoments(
      moments.map((item) =>
        item.kind === kind ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  const update = (kind: GiftMomentSelection["kind"], value: string) =>
    setMoments(
      moments.map((item) => (item.kind === kind ? { ...item, value } : item)),
    );
  const addOns: Array<{
    active: boolean;
    setActive: (value: boolean) => void;
    label: string;
    price: number;
    icon: keyof typeof Ionicons.glyphMap;
  }> = [
    {
      active: giftWrap,
      setActive: setGiftWrap,
      label: "Gift wrap",
      price: currency === "INR" ? 14900 : currency === "CAD" ? 949 : 699,
      icon: "gift-outline",
    },
    {
      active: premiumCard,
      setActive: setPremiumCard,
      label: "Premium printed card",
      price: currency === "INR" ? 9900 : currency === "CAD" ? 549 : 399,
      icon: "mail-outline",
    },
  ];
  return (
    <View style={giftMarketplaceStyles.experienceCard}>
      <View style={giftMarketplaceStyles.experienceHeader}>
        <ReferenceIconTile
          name="heart-circle"
          orbSize={48}
          iconSize={22}
          tilePadding={18}
        />
        <View style={{ flex: 1 }}>
          <Text style={giftMarketplaceStyles.sectionEyebrow}>
            MAKE IT A MOMENT
          </Text>
          <Text
            accessibilityRole="header"
            style={giftMarketplaceStyles.experienceTitle}
          >
            Turn delivery into a shared memory.
          </Text>
          <Text style={giftMarketplaceStyles.experienceBody}>
            Add only what feels natural. Every extra appears in the final
            preview.
          </Text>
        </View>
      </View>
      <View style={giftMarketplaceStyles.addonRow}>
        {addOns.map(({ active, setActive, label, price, icon }) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: active }}
            key={label}
            onPress={() => setActive(!active)}
            style={[
              giftMarketplaceStyles.addonChoice,
              active ? giftMarketplaceStyles.addonChoiceOn : undefined,
            ]}
          >
            <Ionicons
              name={icon}
              size={18}
              color={active ? "#FFF" : "#8E0A2C"}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  giftMarketplaceStyles.addonTitle,
                  active ? { color: "#FFF" } : undefined,
                ]}
              >
                {label}
              </Text>
              <Text
                style={[
                  giftMarketplaceStyles.addonPrice,
                  active ? { color: "#F8D9DF" } : undefined,
                ]}
              >
                + {formatGiftMarketMoney(price, currency)}
              </Text>
            </View>
            <Ionicons
              name={active ? "checkmark-circle" : "ellipse-outline"}
              size={19}
              color={active ? "#F5D77B" : "#BDA7AC"}
            />
          </Pressable>
        ))}
      </View>
      <View style={giftMarketplaceStyles.momentGrid}>
        {giftMomentOptions.map((option) => {
          const selected = moments.find((item) => item.kind === option.kind)!;
          return (
            <View
              key={option.kind}
              style={[
                giftMarketplaceStyles.momentChoice,
                selected.enabled && giftMarketplaceStyles.momentChoiceOn,
              ]}
            >
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected.enabled }}
                accessibilityLabel={option.label}
                onPress={() => toggle(option.kind)}
                style={giftMarketplaceStyles.momentChoiceTop}
              >
                <Ionicons
                  name={option.icon as keyof typeof Ionicons.glyphMap}
                  size={19}
                  color={selected.enabled ? "#FFF" : "#8E0A2C"}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      giftMarketplaceStyles.momentTitle,
                      selected.enabled && { color: "#FFF" },
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      giftMarketplaceStyles.momentBody,
                      selected.enabled && { color: "#F5DDE2" },
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
                <Ionicons
                  name={
                    selected.enabled ? "checkmark-circle" : "add-circle-outline"
                  }
                  size={20}
                  color={selected.enabled ? "#F5D77B" : "#9B6C76"}
                />
              </Pressable>
              {selected.enabled && (
                <TextInput
                  accessibilityLabel={`${option.label} details`}
                  value={selected.value ?? ""}
                  onChangeText={(value) =>
                    update(option.kind, value.slice(0, 300))
                  }
                  placeholder={
                    option.kind === "playlist"
                      ? "Paste a playlist link…"
                      : option.kind === "scheduled_message"
                        ? "Write the arrival message…"
                        : "Add optional details…"
                  }
                  placeholderTextColor="#CFAFB7"
                  style={giftMarketplaceStyles.momentInput}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
function GiftDeliveryOptionsCard({
  slot,
  setSlot,
  availability,
  setAvailability,
  hideExactGift,
  setHideExactGift,
}: {
  slot: GiftDeliverySlot;
  setSlot: (value: GiftDeliverySlot) => void;
  availability: GiftRecipientAvailability;
  setAvailability: (value: GiftRecipientAvailability) => void;
  hideExactGift: boolean;
  setHideExactGift: (value: boolean) => void;
}) {
  return (
    <View style={giftMarketplaceStyles.experienceCard}>
      <View style={giftMarketplaceStyles.experienceHeader}>
        <ReferenceIconTile
          name="time"
          orbSize={48}
          iconSize={22}
          tilePadding={18}
        />
        <View style={{ flex: 1 }}>
          <Text style={giftMarketplaceStyles.sectionEyebrow}>
            DELIVERY DETAILS
          </Text>
          <Text
            accessibilityRole="header"
            style={giftMarketplaceStyles.experienceTitle}
          >
            Choose a comfortable delivery window.
          </Text>
        </View>
      </View>
      <Text style={giftMarketplaceStyles.fieldLabel}>DELIVERY WINDOW</Text>
      <View style={giftMarketplaceStyles.choiceWrap}>
        {(
          [
            ["recipient_choice", "Recipient chooses"],
            ["morning", "Morning · 9–12"],
            ["afternoon", "Afternoon · 12–5"],
            ["evening", "Evening · 5–9"],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: slot === value }}
            key={value}
            onPress={() => setSlot(value)}
            style={[
              giftMarketplaceStyles.choicePill,
              slot === value && giftMarketplaceStyles.choicePillOn,
            ]}
          >
            <Text
              style={[
                giftMarketplaceStyles.choiceText,
                slot === value && giftMarketplaceStyles.choiceTextOn,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={giftMarketplaceStyles.fieldLabel}>
        RECIPIENT AVAILABILITY
      </Text>
      <View style={giftMarketplaceStyles.choiceWrap}>
        {(
          [
            ["confirm_before_dispatch", "Confirm before dispatch"],
            ["available", "Available"],
            ["not_sure", "Not sure yet"],
          ] as const
        ).map(([value, label]) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: availability === value }}
            key={value}
            onPress={() => setAvailability(value)}
            style={[
              giftMarketplaceStyles.choicePill,
              availability === value && giftMarketplaceStyles.choicePillOn,
            ]}
          >
            <Text
              style={[
                giftMarketplaceStyles.choiceText,
                availability === value && giftMarketplaceStyles.choiceTextOn,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: hideExactGift }}
        onPress={() => setHideExactGift(!hideExactGift)}
        style={giftMarketplaceStyles.privacyToggle}
      >
        <View style={{ flex: 1 }}>
          <Text style={giftMarketplaceStyles.privacyToggleTitle}>
            Surprise mode
          </Text>
          <Text style={giftMarketplaceStyles.privacyToggleBody}>
            {hideExactGift
              ? "Recipient sees that a surprise is waiting, but not the exact gift."
              : "Recipient can see the exact gift before accepting."}
          </Text>
        </View>
        <View
          style={[
            giftMarketplaceStyles.switchTrack,
            hideExactGift && giftMarketplaceStyles.switchTrackOn,
          ]}
        >
          <View
            style={[
              giftMarketplaceStyles.switchThumb,
              hideExactGift && giftMarketplaceStyles.switchThumbOn,
            ]}
          />
        </View>
      </Pressable>
    </View>
  );
}
function GiftFinalPreviewCard({
  product,
  recipientName,
  occasion,
  note,
  deliveryLabel,
  addressPrivate,
  hideExactGift,
  quote,
  currency,
  moments,
  onEditGift,
  onEditPersonalize,
  onEditDelivery,
}: {
  product: PhysicalGift;
  recipientName: string;
  occasion: string;
  note: string;
  deliveryLabel: string;
  addressPrivate: boolean;
  hideExactGift: boolean;
  quote: GiftOrderQuote;
  currency: "USD" | "CAD" | "INR";
  moments: GiftMomentSelection[];
  onEditGift: () => void;
  onEditPersonalize: () => void;
  onEditDelivery: () => void;
}) {
  const activeMoments = moments.filter((item) => item.enabled);
  return (
    <View style={giftMarketplaceStyles.previewCard}>
      <LinearGradient
        colors={["#FFF9F5", "#FCE7EA"]}
        style={giftMarketplaceStyles.previewHero}
      >
        <Image
          accessible
          accessibilityLabel={`${product.name} final gift preview`}
          source={{ uri: product.photo }}
          style={giftMarketplaceStyles.previewPhoto}
        />
        <View style={{ flex: 1 }}>
          <Text style={giftMarketplaceStyles.previewEyebrow}>
            FINAL GIFT PREVIEW
          </Text>
          <Text
            accessibilityRole="header"
            style={giftMarketplaceStyles.previewTitle}
          >
            {hideExactGift ? "A private surprise for " : ""}
            {recipientName}
          </Text>
          <Text style={giftMarketplaceStyles.previewProduct}>
            {product.name}
          </Text>
          <Text style={giftMarketplaceStyles.previewPrice}>
            {formatGiftMarketMoney(quote.finalPayableCents, currency)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit selected gift"
          onPress={onEditGift}
          style={giftMarketplaceStyles.editSummary}
        >
          <Ionicons name="create-outline" size={16} color="#8E0A2C" />
        </Pressable>
      </LinearGradient>
      <View style={giftMarketplaceStyles.previewDetails}>
        {[
          ["Recipient", recipientName],
          ["Occasion", occasion],
          ["Delivery", deliveryLabel],
          [
            "Address privacy",
            addressPrivate ? "Recipient enters privately" : "Known address",
          ],
          [
            "Surprise mode",
            hideExactGift
              ? "Exact gift hidden until acceptance"
              : "Gift visible before acceptance",
          ],
        ].map(([label, value]) => (
          <View key={label} style={giftMarketplaceStyles.previewDetail}>
            <Text style={giftMarketplaceStyles.previewDetailLabel}>
              {label}
            </Text>
            <Text style={giftMarketplaceStyles.previewDetailValue}>
              {value}
            </Text>
          </View>
        ))}
      </View>
      <View style={giftMarketplaceStyles.reviewNoteCard}>
        <Ionicons name="heart-outline" size={18} color="#A20B35" />
        <View style={{ flex: 1 }}>
          <Text style={giftMarketplaceStyles.reviewNoteLabel}>
            PERSONAL NOTE
          </Text>
          <Text style={giftMarketplaceStyles.reviewNote}>“{note}”</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit personal note and moment"
          onPress={onEditPersonalize}
          style={giftMarketplaceStyles.editSummary}
        >
          <Ionicons name="create-outline" size={16} color="#8E0A2C" />
        </Pressable>
      </View>
      {activeMoments.length > 0 && (
        <View style={giftMarketplaceStyles.previewMoments}>
          <Text style={giftMarketplaceStyles.previewDetailLabel}>
            MAKE IT A MOMENT
          </Text>
          <View style={giftMarketplaceStyles.choiceWrap}>
            {activeMoments.map((item) => (
              <View
                key={item.kind}
                style={giftMarketplaceStyles.previewMomentPill}
              >
                <Ionicons name="checkmark-circle" size={14} color="#8B6B16" />
                <Text style={giftMarketplaceStyles.previewMomentText}>
                  {
                    giftMomentOptions.find(
                      (option) => option.kind === item.kind,
                    )?.label
                  }
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={onEditDelivery}
        style={giftMarketplaceStyles.previewEditDelivery}
      >
        <Ionicons name="calendar-outline" size={16} color="#8E0A2C" />
        <Text style={giftMarketplaceStyles.previewEditDeliveryText}>
          Edit delivery & privacy
        </Text>
      </Pressable>
    </View>
  );
}
function GiftPriceBreakdownCard({
  quote,
  currency,
  tipPercent,
  setTipPercent,
}: {
  quote: GiftOrderQuote;
  currency: "USD" | "CAD" | "INR";
  tipPercent: number;
  setTipPercent: (value: number) => void;
}) {
  return (
    <View style={giftMarketplaceStyles.breakdownCard}>
      <Text style={giftMarketplaceStyles.sectionEyebrow}>
        COMPLETE PRICE BREAKDOWN
      </Text>
      <GiftPriceRowLight
        label="Product subtotal"
        value={formatGiftMarketMoney(quote.itemSubtotalCents, currency)}
      />
      <GiftPriceRowLight
        label="Add-ons"
        value={formatGiftMarketMoney(quote.addOnSubtotalCents, currency)}
      />
      <GiftPriceRowLight
        label="Delivery"
        value={formatGiftMarketMoney(
          quote.deliveryFeeCents +
            quote.rushFeeCents +
            quote.smallOrderFeeCents,
          currency,
        )}
      />
      <GiftPriceRowLight
        label="Service fee"
        value={formatGiftMarketMoney(quote.serviceFeeCents, currency)}
      />
      <GiftPriceRowLight
        label={currency === "INR" ? "Tax / GST" : "Estimated tax"}
        value={formatGiftMarketMoney(quote.estimatedTaxCents, currency)}
      />
      <GiftPriceRowLight
        label="Discount"
        value={
          quote.discountCents
            ? `−${formatGiftMarketMoney(quote.discountCents, currency)}`
            : formatGiftMarketMoney(0, currency)
        }
      />
      <Text style={giftMarketplaceStyles.fieldLabel}>OPTIONAL COURIER TIP</Text>
      <View
        accessibilityRole="radiogroup"
        style={giftMarketplaceStyles.choiceWrap}
      >
        {[0, 5, 10, 15].map((value) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: tipPercent === value }}
            key={value}
            onPress={() => setTipPercent(value)}
            style={[
              giftMarketplaceStyles.choicePill,
              tipPercent === value && giftMarketplaceStyles.choicePillOn,
            ]}
          >
            <Text
              style={[
                giftMarketplaceStyles.choiceText,
                tipPercent === value && giftMarketplaceStyles.choiceTextOn,
              ]}
            >
              {value ? `${value}%` : "No tip"}
            </Text>
          </Pressable>
        ))}
      </View>
      <GiftPriceRowLight
        label="Tip"
        value={formatGiftMarketMoney(quote.tipCents, currency)}
      />
      <View style={giftMarketplaceStyles.reviewDivider} />
      <GiftPriceRowLight
        label="Refundable authorization"
        value={formatGiftMarketMoney(
          quote.refundableAuthorizationCents,
          currency,
        )}
      />
      <GiftPriceRowLight
        label="Final payable total"
        value={formatGiftMarketMoney(quote.finalPayableCents, currency)}
        total
      />
      <Text style={giftMarketplaceStyles.experienceFine}>
        The authorization remains refundable until recipient acceptance and
        verified inventory. No hidden fee is added after this screen without
        approval.
      </Text>
    </View>
  );
}
function GiftRecipientReactionCard({
  productName,
  reaction,
  setReaction,
  thankYou,
  setThankYou,
  privateUpdate,
  setPrivateUpdate,
}: {
  productName: string;
  reaction: GiftReaction | null;
  setReaction: (value: GiftReaction) => void;
  thankYou: string;
  setThankYou: (value: string) => void;
  privateUpdate: boolean;
  setPrivateUpdate: (value: boolean) => void;
}) {
  const [saved, setSaved] = useState(false);
  return (
    <View style={giftMarketplaceStyles.reactionCard}>
      <View style={giftMarketplaceStyles.experienceHeader}>
        <ReferenceIconTile
          name="happy"
          orbSize={44}
          iconSize={20}
          tilePadding={16}
        />
        <View style={{ flex: 1 }}>
          <Text style={giftMarketplaceStyles.sectionEyebrow}>
            AFTER DELIVERY · RECIPIENT PREVIEW
          </Text>
          <Text
            accessibilityRole="header"
            style={giftMarketplaceStyles.experienceTitle}
          >
            How did {productName} feel?
          </Text>
          <Text style={giftMarketplaceStyles.experienceBody}>
            This appears to the recipient after proof of delivery.
          </Text>
        </View>
      </View>
      <View style={giftMarketplaceStyles.reactionGrid}>
        {(
          [
            ["loved_it", "Loved it", "heart"],
            ["thoughtful", "Thoughtful", "sparkles"],
            ["made_me_smile", "Made me smile", "happy"],
            ["not_my_style", "Not my style", "options"],
          ] as const
        ).map(([value, label, icon]) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: reaction === value }}
            key={value}
            onPress={() => {
              setReaction(value);
              setSaved(false);
            }}
            style={[
              giftMarketplaceStyles.reactionChoice,
              reaction === value && giftMarketplaceStyles.reactionChoiceOn,
            ]}
          >
            <Ionicons
              name={icon}
              size={19}
              color={reaction === value ? "#FFF" : "#8E0A2C"}
            />
            <Text
              style={[
                giftMarketplaceStyles.reactionText,
                reaction === value && { color: "#FFF" },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        accessibilityLabel="Optional thank-you message"
        value={thankYou}
        onChangeText={(value) => {
          setThankYou(value.slice(0, 500));
          setSaved(false);
        }}
        multiline
        placeholder="Send a private thank-you message…"
        placeholderTextColor="#9A7E85"
        style={giftMarketplaceStyles.aiPrompt}
      />
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: privateUpdate }}
        onPress={() => setPrivateUpdate(!privateUpdate)}
        style={giftMarketplaceStyles.privacyToggle}
      >
        <View style={{ flex: 1 }}>
          <Text style={giftMarketplaceStyles.privacyToggleTitle}>
            Privately improve future recommendations
          </Text>
          <Text style={giftMarketplaceStyles.privacyToggleBody}>
            Preference learning stays private; the sender never sees “Not my
            style.”
          </Text>
        </View>
        <View
          style={[
            giftMarketplaceStyles.switchTrack,
            privateUpdate && giftMarketplaceStyles.switchTrackOn,
          ]}
        >
          <View
            style={[
              giftMarketplaceStyles.switchThumb,
              privateUpdate && giftMarketplaceStyles.switchThumbOn,
            ]}
          />
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={!reaction}
        onPress={() => setSaved(true)}
        style={[
          giftMarketplaceStyles.primaryButton,
          !reaction && { opacity: 0.45 },
        ]}
      >
        <Text style={giftMarketplaceStyles.primaryButtonText}>
          {saved ? "Feedback saved privately ✓" : "Save reaction & send thanks"}
        </Text>
      </Pressable>
    </View>
  );
}
function GiftProductDetailSheet({
  product,
  products,
  city,
  onClose,
  onAdd,
}: {
  product: GiftCommerceProduct | null;
  products: GiftCommerceProduct[];
  city: string;
  onClose: () => void;
  onAdd: (product: GiftCommerceProduct) => void;
}) {
  if (!product) return null;
  const unavailable =
    product.availability === "sold_out" || product.availability === "waitlist";
  const substitutions = recommendGiftSubstitutions(
    products,
    product.id,
    product.currency === "INR" ? 50000 : 500,
    3,
  );
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView
        style={[chatStyles.sheet, giftMarketplaceStyles.productDetailSheet]}
      >
        <SheetHeader
          title={product.name}
          subtitle={`${product.category} · available in ${city}`}
          onClose={onClose}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={giftMarketplaceStyles.productDetailContent}
        >
          <Image
            accessible
            accessibilityLabel={`${product.name} professional product photo`}
            source={{ uri: product.photo }}
            resizeMode="cover"
            style={giftMarketplaceStyles.productDetailPhoto}
          />
          <View style={giftMarketplaceStyles.productDetailTop}>
            <View style={{ flex: 1 }}>
              <Text style={giftMarketplaceStyles.productDetailPrice}>
                {formatGiftMarketMoney(
                  product.localizedPriceMinor,
                  product.currency,
                )}
              </Text>
              <Text style={giftMarketplaceStyles.productDetailMeta}>
                {product.eta} · ★ {product.rating} ({product.reviewCount})
              </Text>
            </View>
            <View
              style={[
                giftMarketplaceStyles.stockPill,
                unavailable && giftMarketplaceStyles.stockPillOff,
              ]}
            >
              <Ionicons
                name={unavailable ? "alert-circle" : "checkmark-circle"}
                size={15}
                color={unavailable ? "#A20B35" : "#36734C"}
              />
              <Text
                style={[
                  giftMarketplaceStyles.stockText,
                  unavailable && { color: "#A20B35" },
                ]}
              >
                {product.availability === "low_stock"
                  ? `${product.availableUnits} left`
                  : unavailable
                    ? "Unavailable"
                    : "Live inventory"}
              </Text>
            </View>
          </View>
          <Text style={giftMarketplaceStyles.productDetailDescription}>
            {product.description}
          </Text>
          <View style={giftMarketplaceStyles.merchantCard}>
            <ReferenceIconTile
              name="storefront-outline"
              orbSize={38}
              iconSize={17}
              tilePadding={14}
            />
            <View style={{ flex: 1 }}>
              <Text style={giftMarketplaceStyles.merchantTitle}>
                Verified local merchant
              </Text>
              <Text style={giftMarketplaceStyles.merchantBody}>
                {product.pickupPartnerName} · inventory refreshed securely
              </Text>
            </View>
            <Ionicons name="shield-checkmark" size={21} color="#9A7417" />
          </View>
          {unavailable && (
            <View style={giftMarketplaceStyles.substitutionCard}>
              <Text style={giftMarketplaceStyles.substitutionTitle}>
                Best available substitutes
              </Text>
              <Text style={giftMarketplaceStyles.substitutionBody}>
                Nothing changes without your approval. Price difference is shown
                before replacement.
              </Text>
              {substitutions.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Choose substitute ${item.name}`}
                  key={item.id}
                  onPress={() => onAdd(item)}
                  style={giftMarketplaceStyles.substitutionRow}
                >
                  <Image
                    source={{ uri: item.photo }}
                    style={giftMarketplaceStyles.substitutionPhoto}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={giftMarketplaceStyles.substitutionName}>
                      {item.name}
                    </Text>
                    <Text style={giftMarketplaceStyles.substitutionMeta}>
                      {formatGiftMarketMoney(
                        item.localizedPriceMinor,
                        item.currency,
                      )}{" "}
                      · {item.eta}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={17} color="#8E0A2C" />
                </Pressable>
              ))}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${product.name} to cart`}
            disabled={unavailable}
            onPress={() => onAdd(product)}
            style={[
              giftMarketplaceStyles.placeOrderButton,
              unavailable && { opacity: 0.42 },
            ]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={["#740017", "#C20A3A", "#9A062C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="bag-add-outline" size={18} color="#FFF" />
            <Text style={giftMarketplaceStyles.placeOrderText}>
              {unavailable
                ? "Choose a substitute"
                : `Add to cart · ${formatGiftMarketMoney(product.localizedPriceMinor, product.currency)}`}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function GiftDeliveryTrackingCard({ order }: { order: GiftOrderResponse }) {
  const delivered = order.status === "delivered";
  return (
    <View
      accessibilityLabel={`Gift delivery tracking, ${order.status.replaceAll("_", " ")}`}
      style={giftMarketplaceStyles.trackingCard}
    >
      <View style={giftMarketplaceStyles.trackingHeader}>
        <ReferenceIconTile
          name="navigate-circle-outline"
          orbSize={42}
          iconSize={19}
          tilePadding={15}
        />
        <View style={{ flex: 1 }}>
          <Text style={giftMarketplaceStyles.trackingEyebrow}>
            LIVE DELIVERY
          </Text>
          <Text style={giftMarketplaceStyles.trackingTitle}>
            {delivered
              ? "Delivered with proof"
              : "Private route activates after pickup"}
          </Text>
          <Text style={giftMarketplaceStyles.trackingBody}>
            {order.courierDisplayName
              ? `${order.courierDisplayName} · ${order.courierVehicleSummary ?? "verified courier"}`
              : "Merchant and courier adapters are ready for live status webhooks."}
          </Text>
        </View>
        <View style={giftMarketplaceStyles.liveEtaPill}>
          <View style={giftMarketplaceStyles.liveDot} />
          <Text style={giftMarketplaceStyles.liveEtaText}>
            {delivered ? "DONE" : "LIVE"}
          </Text>
        </View>
      </View>
      <View style={giftMarketplaceStyles.trackingMap}>
        <View style={giftMarketplaceStyles.mapRoadOne} />
        <View style={giftMarketplaceStyles.mapRoadTwo} />
        <View
          style={[giftMarketplaceStyles.mapPin, { left: "12%", top: "58%" }]}
        >
          <Ionicons name="storefront" size={14} color="#FFF" />
        </View>
        <View style={giftMarketplaceStyles.mapRoute} />
        <View style={giftMarketplaceStyles.courierPin}>
          <Ionicons name="car" size={15} color="#FFF" />
        </View>
        <View
          style={[giftMarketplaceStyles.mapPin, { right: "11%", top: "22%" }]}
        >
          <Ionicons name="gift" size={14} color="#FFF" />
        </View>
      </View>
      <View style={giftMarketplaceStyles.proofRow}>
        <Ionicons
          name={delivered ? "checkmark-done-circle" : "camera-outline"}
          size={19}
          color="#8E0A2C"
        />
        <View style={{ flex: 1 }}>
          <Text style={giftMarketplaceStyles.proofTitle}>
            {delivered
              ? "Proof of delivery secured"
              : "Proof of delivery required"}
          </Text>
          <Text style={giftMarketplaceStyles.proofBody}>
            {delivered
              ? `${order.proofMethod ?? "Photo or recipient confirmation"} · private retention policy applied`
              : "Courier must submit photo, PIN or recipient confirmation before completion."}
          </Text>
        </View>
        <Text style={giftMarketplaceStyles.proofStatus}>
          {order.proofStatus ?? "PENDING"}
        </Text>
      </View>
    </View>
  );
}
function GiftCartSheet({
  visible,
  cart,
  quote,
  currency,
  recipientName,
  onClose,
  onQuantity,
  onClear,
  onCheckout,
}: {
  visible: boolean;
  cart: GiftCartLine[];
  quote: GiftOrderQuote | null;
  currency: "USD" | "CAD" | "INR";
  recipientName: string;
  onClose: () => void;
  onQuantity: (giftId: string, change: number) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  const itemCount = cart.reduce((total, line) => total + line.quantity, 0);
  const subtotal = cart.reduce(
    (total, line) => total + line.gift.priceCents * line.quantity,
    0,
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, giftMarketplaceStyles.cartSheet]}>
        <SheetHeader
          title="Your gift cart"
          subtitle={`${itemCount} ${itemCount === 1 ? "item" : "items"} for ${recipientName} · private to this recipient`}
          onClose={onClose}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={giftMarketplaceStyles.cartScroll}
        >
          {cart.length ? (
            <>
              <View style={giftMarketplaceStyles.cartLines}>
                {cart.map((line) => (
                  <View
                    key={line.gift.id}
                    style={giftMarketplaceStyles.cartLine}
                  >
                    <Image
                      accessible
                      accessibilityLabel={line.gift.name}
                      source={{ uri: line.gift.photo }}
                      style={giftMarketplaceStyles.cartLinePhoto}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={giftMarketplaceStyles.cartLineTitle}>
                        {line.gift.name}
                      </Text>
                      <Text style={giftMarketplaceStyles.cartLineMeta}>
                        {line.gift.eta} ·{" "}
                        {formatGiftMarketMoney(line.gift.priceCents, currency)}{" "}
                        each
                      </Text>
                      <View style={giftMarketplaceStyles.quantityControl}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Remove one ${line.gift.name}`}
                          hitSlop={accessibilityHitSlop}
                          onPress={() => onQuantity(line.gift.id, -1)}
                          style={giftMarketplaceStyles.quantityButton}
                        >
                          <Ionicons
                            name={
                              line.quantity === 1 ? "trash-outline" : "remove"
                            }
                            size={15}
                            color="#8E0A2C"
                          />
                        </Pressable>
                        <Text
                          accessibilityLabel={`Quantity ${line.quantity}`}
                          style={giftMarketplaceStyles.quantityValue}
                        >
                          {line.quantity}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Add one ${line.gift.name}`}
                          hitSlop={accessibilityHitSlop}
                          disabled={line.quantity >= 5}
                          onPress={() => onQuantity(line.gift.id, 1)}
                          style={[
                            giftMarketplaceStyles.quantityButton,
                            line.quantity >= 5 && { opacity: 0.4 },
                          ]}
                        >
                          <Ionicons name="add" size={15} color="#8E0A2C" />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={giftMarketplaceStyles.cartLinePrice}>
                      {formatGiftMarketMoney(
                        line.gift.priceCents * line.quantity,
                        currency,
                      )}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={giftMarketplaceStyles.cartTotals}>
                <GiftPriceRowLight
                  label="Gift subtotal"
                  value={formatGiftMarketMoney(subtotal, currency)}
                />
                {quote && (
                  <>
                    <GiftPriceRowLight
                      label="Estimated delivery & fees"
                      value={formatGiftMarketMoney(
                        quote.totalCents - quote.itemSubtotalCents,
                        currency,
                      )}
                    />
                    <View style={giftMarketplaceStyles.reviewDivider} />
                    <GiftPriceRowLight
                      label="Estimated total"
                      value={formatGiftMarketMoney(quote.totalCents, currency)}
                      total
                    />
                  </>
                )}
              </View>
              <View style={giftMarketplaceStyles.cartTrust}>
                <Ionicons name="shield-checkmark" size={19} color="#9B7517" />
                <Text style={giftMarketplaceStyles.cartTrustText}>
                  This cart belongs only to {recipientName}. It clears after
                  checkout or when you switch recipients.
                </Text>
              </View>
              <View style={giftMarketplaceStyles.cartActionRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Clear gift cart for ${recipientName}`}
                  onPress={onClear}
                  style={giftMarketplaceStyles.clearCartButton}
                >
                  <Ionicons name="trash-outline" size={17} color="#8E0A2C" />
                  <Text style={giftMarketplaceStyles.clearCartText}>
                    Clear cart
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue to personalize gift cart"
                  onPress={onCheckout}
                  style={[
                    giftMarketplaceStyles.placeOrderButton,
                    { flex: 1, marginTop: 0 },
                  ]}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={["#740017", "#C20A3A", "#9A062C"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={giftMarketplaceStyles.placeOrderText}>
                    Checkout {itemCount}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </Pressable>
              </View>
            </>
          ) : (
            <View style={giftMarketplaceStyles.emptyCart}>
              <ReferenceIconTile
                name="bag-handle-outline"
                orbSize={62}
                iconSize={28}
                tilePadding={23}
              />
              <Text style={giftMarketplaceStyles.emptyCartTitle}>
                Your cart is waiting for something lovely.
              </Text>
              <Text style={giftMarketplaceStyles.emptyCartBody}>
                Add flowers, chocolates, keepsakes or a cozy date-night surprise
                for {recipientName}.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Browse gifts"
                onPress={onClose}
                style={giftMarketplaceStyles.secondaryButton}
              >
                <Text style={giftMarketplaceStyles.secondaryButtonText}>
                  Browse gifts
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function GiftOrderManagementSheet({
  visible,
  mode,
  setMode,
  orderId,
  cancelled,
  onCancel,
  supportDetails,
  setSupportDetails,
  message,
  setMessage,
  onClose,
}: {
  visible: boolean;
  mode: "overview" | "cancel" | "refund" | "support";
  setMode: (mode: "overview" | "cancel" | "refund" | "support") => void;
  orderId: string;
  cancelled: boolean;
  onCancel: () => void;
  supportDetails: string;
  setSupportDetails: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView
        style={[chatStyles.sheet, giftMarketplaceStyles.manageSheet]}
      >
        <SheetHeader
          title="Manage gift order"
          subtitle={`Order ${orderId || "preview"} · help stays inside DestinyOne`}
          onClose={onClose}
        />
        <View
          accessibilityRole="tablist"
          style={giftMarketplaceStyles.manageTabs}
        >
          {(["overview", "cancel", "refund", "support"] as const).map(
            (item) => (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === item }}
                onPress={() => {
                  setMode(item);
                  setMessage("");
                }}
                style={[
                  giftMarketplaceStyles.manageTab,
                  mode === item && giftMarketplaceStyles.manageTabOn,
                ]}
              >
                <Text
                  style={[
                    giftMarketplaceStyles.manageTabText,
                    mode === item && giftMarketplaceStyles.manageTabTextOn,
                  ]}
                >
                  {item[0]!.toUpperCase() + item.slice(1)}
                </Text>
              </Pressable>
            ),
          )}
        </View>
        <ScrollView contentContainerStyle={giftMarketplaceStyles.manageContent}>
          {mode === "overview" && (
            <>
              <View style={giftMarketplaceStyles.manageHero}>
                <ReferenceIconTile
                  name="receipt-outline"
                  orbSize={52}
                  iconSize={23}
                  tilePadding={19}
                />
                <View style={{ flex: 1 }}>
                  <Text style={giftMarketplaceStyles.manageTitle}>
                    Order control center
                  </Text>
                  <Text style={giftMarketplaceStyles.manageBody}>
                    Track recipient consent, merchant inventory and courier
                    handoff.
                  </Text>
                </View>
              </View>
              <View style={giftMarketplaceStyles.providerReadiness}>
                <View style={giftMarketplaceStyles.providerReadinessItem}>
                  <Ionicons name="cube-outline" size={19} color="#8E0A2C" />
                  <View style={{ flex: 1 }}>
                    <Text style={giftMarketplaceStyles.providerReadinessTitle}>
                      Merchant inventory
                    </Text>
                    <Text style={giftMarketplaceStyles.providerReadinessBody}>
                      Reserved after acceptance
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={18} color="#3B8C62" />
                </View>
                <View style={giftMarketplaceStyles.providerReadinessItem}>
                  <Ionicons name="car-outline" size={19} color="#8E0A2C" />
                  <View style={{ flex: 1 }}>
                    <Text style={giftMarketplaceStyles.providerReadinessTitle}>
                      Courier dispatch
                    </Text>
                    <Text style={giftMarketplaceStyles.providerReadinessBody}>
                      Live tracking begins after pickup
                    </Text>
                  </View>
                  <Ionicons name="time-outline" size={18} color="#9A7417" />
                </View>
              </View>
            </>
          )}
          {mode === "cancel" && (
            <View style={giftMarketplaceStyles.manageHero}>
              <ReferenceIconTile
                name="close-circle-outline"
                orbSize={52}
                iconSize={23}
                tilePadding={19}
              />
              <View style={{ flex: 1 }}>
                <Text style={giftMarketplaceStyles.manageTitle}>
                  {cancelled ? "Order cancelled" : "Cancel this order?"}
                </Text>
                <Text style={giftMarketplaceStyles.manageBody}>
                  {cancelled
                    ? "Inventory and courier holds were released."
                    : "Free before recipient acceptance. Any later fee must be shown before confirmation."}
                </Text>
                <Pressable
                  disabled={cancelled}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm gift order cancellation"
                  onPress={onCancel}
                  style={[
                    giftMarketplaceStyles.cancelOrderButton,
                    cancelled && { opacity: 0.45 },
                  ]}
                >
                  <Text style={giftMarketplaceStyles.cancelOrderText}>
                    {cancelled ? "Cancelled" : "Confirm cancellation"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          {mode === "refund" && (
            <View style={giftMarketplaceStyles.manageHero}>
              <ReferenceIconTile
                name="refresh"
                orbSize={52}
                iconSize={23}
                tilePadding={19}
              />
              <View style={{ flex: 1 }}>
                <Text style={giftMarketplaceStyles.manageTitle}>
                  Refund center
                </Text>
                <Text style={giftMarketplaceStyles.manageBody}>
                  {cancelled
                    ? "Queued to the original payment method · estimated 3–5 business days."
                    : "Refund review opens after cancellation, delivery failure, or an item problem."}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Request gift refund review"
                  onPress={() =>
                    setMessage(
                      "Refund review requested. Updates will appear in Chat and email.",
                    )
                  }
                  style={giftMarketplaceStyles.secondaryButton}
                >
                  <Text style={giftMarketplaceStyles.secondaryButtonText}>
                    Request review
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          {mode === "support" && (
            <View style={giftMarketplaceStyles.manageHero}>
              <ReferenceIconTile
                name="headset-outline"
                orbSize={52}
                iconSize={23}
                tilePadding={19}
              />
              <View style={{ flex: 1 }}>
                <Text style={giftMarketplaceStyles.manageTitle}>
                  Gift support
                </Text>
                <Text style={giftMarketplaceStyles.manageBody}>
                  Tell us about delivery, item, address, payment, cancellation
                  or refund problems.
                </Text>
                <GiftField
                  label="Support details"
                  value={supportDetails}
                  onChangeText={(value) =>
                    setSupportDetails(value.slice(0, 500))
                  }
                  placeholder="Tell us what happened…"
                />
                <Pressable
                  disabled={supportDetails.trim().length < 10}
                  accessibilityRole="button"
                  accessibilityLabel="Create gift support case"
                  onPress={() =>
                    setMessage(
                      `Support case GFT-${Date.now().toString(36).toUpperCase()} created · response target within 2 hours.`,
                    )
                  }
                  style={[
                    giftMarketplaceStyles.primaryButton,
                    supportDetails.trim().length < 10 && { opacity: 0.45 },
                  ]}
                >
                  <Ionicons name="headset-outline" size={17} color="#FFF" />
                  <Text style={giftMarketplaceStyles.primaryButtonText}>
                    Create support case
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
          {!!message && (
            <Text
              accessibilityLiveRegion="polite"
              style={giftMarketplaceStyles.managementMessage}
            >
              {message}
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function GiftField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoComplete?: React.ComponentProps<typeof TextInput>["autoComplete"];
}) {
  return (
    <View style={giftMarketplaceStyles.inputWrap}>
      <Text style={giftMarketplaceStyles.inputLabel}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#A08A90"
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        style={giftMarketplaceStyles.input}
      />
    </View>
  );
}
function GiftPriceRowLight({
  label,
  value,
  total = false,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  return (
    <View style={giftMarketplaceStyles.reviewRow}>
      <Text
        style={[
          giftMarketplaceStyles.reviewLabel,
          total && giftMarketplaceStyles.reviewTotalLabel,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          giftMarketplaceStyles.reviewValue,
          total && giftMarketplaceStyles.reviewTotalValue,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
