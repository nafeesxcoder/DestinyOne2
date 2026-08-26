import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button, shared } from "../../components";
import { colors } from "../../theme";
import { track } from "../../lib/telemetry";
import {
  annualSavingsLabel,
  billingPeriodLabel,
  buildRestorePreview,
  checkoutSteps,
  executivePlan,
  formatMoney,
  membershipPlans,
  membershipPriceLabel,
  sparkPacks,
  type BillingCycle,
  type ProductKind,
} from "../../domain/monetization";
import {
  executiveStoreProduct,
  membershipStoreProduct,
  sparkStoreProduct,
  storePlatformForOperatingSystem,
  type StoreProductSelection,
} from "../../domain/storeCatalog";
import type { PricingPorts } from "./contracts/PricingPorts";
import {
  MiniPremiumIcon,
  PremiumIcon,
} from "../../components/premium/PremiumIcon";
import { SheetHeader } from "../../components/sheets/SheetHeader";
import {
  styles,
  referralStyles,
  pricingStyles,
  aiStyles,
  launchStyles,
  chatStyles,
} from "../../theme/appStyles";

// 🚀 BACKGROUND IMAGE ADDED HERE (correct path)
const backgroundImage = require("../../../assets/background.png");

type CheckoutPlan = {
  name: string;
  price: string;
  period: string;
  tag: string;
  features: string[];
  kind: ProductKind;
  executive?: boolean;
  sparkAmount?: number;
  storeProduct?:
    | {
        type: "membership";
        planId: "base" | "plus" | "elite";
        billing: BillingCycle;
      }
    | {
        type: "spark";
        packId: "spark_5" | "spark_15" | "spark_40";
      }
    | {
        type: "executive";
      };
};
export function Pricing({
  ports,
  back,
  onInvite,
  onBuyRoses,
}: {
  ports: PricingPorts;
  back: () => void;
  onInvite: () => void;
  onBuyRoses: (amount?: number) => void;
}) {
  const storeBilling = ports.storeBilling;
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [restoreStatus, setRestoreStatus] = useState(buildRestorePreview([]));
  const [restoring, setRestoring] = useState(false);
  const [billingHelp, setBillingHelp] = useState(false);
  const [sparksOpen, setSparksOpen] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutPlan | null>(null);
  const planAccent: Record<string, string> = {
    Base: "#B43A4B",
    Plus: colors.gold,
    Elite: "#FF6E80",
  };
  const restorePurchases = async () => {
    setRestoring(true);
    track("restore_started", { platform: Platform.OS });
    try {
      const result =
        ports.serverMode && Platform.OS !== "web"
          ? await storeBilling.restore()
          : await ports.restorePreviewPurchases();
      const restored = result.map((item) => item.key);
      setRestoreStatus(
        restored.length
          ? buildRestorePreview(restored)
          : "No active store-verified purchases were found for this account.",
      );
      track("restore_completed", {
        count_bucket: restored.length > 3 ? "4+" : String(restored.length),
        platform: Platform.OS,
      });
    } catch (error) {
      setRestoreStatus(
        error instanceof Error
          ? error.message
          : "Secure restore is unavailable. No entitlement was changed.",
      );
      track("restore_failed", {
        error_code: "restore_unavailable",
        platform: Platform.OS,
      });
    } finally {
      setRestoring(false);
    }
  };
  const purchaseStoreProduct = async (plan: NonNullable<typeof checkout>) => {
    const platform = storePlatformForOperatingSystem(Platform.OS);
    if (!platform)
      throw new Error(
        "Membership purchases are available only through the signed iOS or Android app.",
      );
    let selection: StoreProductSelection;
    if (plan.storeProduct?.type === "membership")
      selection = membershipStoreProduct(
        plan.storeProduct.planId,
        plan.storeProduct.billing,
        platform,
      );
    else if (plan.storeProduct?.type === "spark")
      selection = sparkStoreProduct(plan.storeProduct.packId, platform);
    else selection = executiveStoreProduct(platform);
    return storeBilling.buy(selection);
  };
  // 🚀 ROOT VIEW + IMAGE BACKGROUND (matching other screens)
  return (
    <View style={{ flex: 1 }}>
      <Image
        source={backgroundImage}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <SafeAreaView style={[shared.safe, { backgroundColor: "transparent" }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close pricing"
          onPress={back}
          style={{ paddingVertical: 10 }}
        >
          <PremiumIcon name="close" tone="dark" size={42} iconSize={20} />
        </Pressable>
        <ScrollView
          contentContainerStyle={{ gap: 20, paddingBottom: 30 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              pricingStyles.hero,
              {
                backgroundColor: "rgba(255,253,252,.92)",
                borderRadius: 24,
                padding: 24,
              },
            ]}
          >
            <PremiumIcon name="diamond" tone="gold" size={62} iconSize={29} />
            <Text style={launchStyles.scriptHero}>Memberships</Text>
            <Text style={[shared.h1, { textAlign: "center" }]}>
              Pay for quality,{`\n`}not for noise.
            </Text>
            <Text style={[shared.body, { textAlign: "center" }]}>
              Clear plans for serious dating with privacy, safety and real
              curation built in.
            </Text>
          </View>
          <View
            style={[
              pricingStyles.billingToggle,
              { backgroundColor: "rgba(255,253,252,.92)" },
            ]}
          >
            <Pressable
              onPress={() => setBilling("monthly")}
              style={[
                pricingStyles.billingOption,
                billing === "monthly" && pricingStyles.billingOptionOn,
              ]}
            >
              <Text
                style={[
                  pricingStyles.billingText,
                  billing === "monthly" && { color: colors.ivory },
                ]}
              >
                Monthly
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setBilling("annual")}
              style={[
                pricingStyles.billingOption,
                billing === "annual" && pricingStyles.billingOptionOn,
              ]}
            >
              <Text
                style={[
                  pricingStyles.billingText,
                  billing === "annual" && { color: colors.ivory },
                ]}
              >
                Annual
              </Text>
              <View style={pricingStyles.saveBadge}>
                <Text style={pricingStyles.saveText}>Save</Text>
              </View>
            </Pressable>
          </View>
          <View style={pricingStyles.promiseGrid}>
            <PricingPromise
              icon="shield-checkmark"
              title="Verified-first"
              body="Profiles, reports and blocks stay safety-led."
            />
            <PricingPromise
              icon="card"
              title="Store billing"
              body="Restore purchase and cancel through app stores."
            />
            <PricingPromise
              icon="heart"
              title="No fake scores"
              body="Matches use labels and explanations only."
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Destiny Pass referral offer"
            onPress={onInvite}
            style={[
              referralStyles.pricingBanner,
              {
                backgroundColor: "rgba(255,253,252,.92)",
                borderColor: "rgba(229,9,47,.2)",
                borderWidth: 1,
              },
            ]}
          >
            <PremiumIcon name="gift" tone="gold" size={48} iconSize={22} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.kicker, { color: colors.wine }]}>
                DESTINY PASS
              </Text>
              <Text style={[styles.cardTitle, { color: "#2B171D" }]}>
                Invite a verified friend. Get Base free for 7 days.
              </Text>
              <Text style={[styles.helper, { color: "#5A5557" }]}>
                Tap to share your private link. The pass begins after profile
                verification and referral checks.
              </Text>
            </View>
            <MiniPremiumIcon
              name="chevron-forward"
              tone="dark"
              size={30}
              iconSize={14}
            />
          </Pressable>
          {membershipPlans.map((plan) => {
            const price = membershipPriceLabel(plan, billing);
            const period = billingPeriodLabel(billing);
            const accent = planAccent[plan.name];
            return (
              <View
                key={plan.id}
                style={[
                  pricingStyles.planCard,
                  {
                    borderColor: accent,
                    backgroundColor: plan.recommended
                      ? "rgba(25,22,15,.96)"
                      : "rgba(32,7,13,.96)",
                  },
                ]}
              >
                <View style={shared.row}>
                  <PremiumIcon
                    name={
                      plan.name === "Base"
                        ? "heart"
                        : plan.name === "Plus"
                          ? "sparkles"
                          : "diamond"
                    }
                    tone={plan.recommended ? "gold" : "ruby"}
                    size={46}
                    iconSize={22}
                  />
                  <View style={{ flex: 1, marginLeft: 11 }}>
                    <Text style={[styles.kicker, { color: colors.gold }]}>
                      DESTINYONE {plan.name.toUpperCase()}
                    </Text>
                    <Text style={[pricingStyles.planFor, { color: "#5A5557" }]}>
                      {plan.forLabel}
                    </Text>
                  </View>
                  <View style={[styles.popular, { backgroundColor: accent }]}>
                    <Text
                      style={[
                        styles.popularText,
                        plan.recommended && { color: "#2A1205" },
                      ]}
                    >
                      {plan.tag.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={pricingStyles.priceRow}>
                  <Text style={[styles.price, { color: colors.wine }]}>
                    {price}
                  </Text>
                  <Text style={[styles.per, { color: "#5A5557" }]}>
                    {period}
                  </Text>
                  {billing === "annual" && (
                    <Text style={pricingStyles.annualNote}>
                      {annualSavingsLabel(plan)}
                    </Text>
                  )}
                </View>
                {plan.features.slice(0, 4).map((x) => (
                  <View key={x} style={pricingStyles.featureRow}>
                    <MiniPremiumIcon
                      name="checkmark-circle"
                      tone="gold"
                      size={30}
                      iconSize={14}
                    />
                    <Text
                      style={[
                        shared.body,
                        { color: colors.ivory, marginLeft: 10, flex: 1 },
                      ]}
                    >
                      {x}
                    </Text>
                  </View>
                ))}
                <Button
                  label={plan.cta}
                  variant={plan.recommended ? "gold" : "secondary"}
                  icon={Platform.OS === "ios" ? "logo-apple" : "card-outline"}
                  onPress={() => {
                    track("checkout_started", {
                      item_key: `membership_${plan.id}_${billing}`,
                      platform: Platform.OS,
                    });
                    setCheckout({
                      name: `DestinyOne ${plan.name}`,
                      price,
                      period,
                      tag: plan.tag,
                      features: plan.features,
                      kind: "membership",
                      storeProduct: {
                        type: "membership",
                        planId: plan.id,
                        billing,
                      },
                    });
                  }}
                />
                <View style={launchStyles.secureRow}>
                  <MiniPremiumIcon
                    name="lock-closed"
                    tone="gold"
                    size={24}
                    iconSize={11}
                  />
                  <Text style={[launchStyles.secureText, { color: "#C9B8BD" }]}>
                    Restore anytime · Cancel in store settings
                  </Text>
                </View>
              </View>
            );
          })}
          <View
            style={[
              pricingStyles.executiveCard,
              {
                backgroundColor: "rgba(32,7,13,.96)",
                borderColor: "rgba(212,175,55,.4)",
                borderWidth: 1,
              },
            ]}
          >
            <LinearGradient
              colors={["rgba(245,212,106,.20)", "rgba(229,9,47,.08)"]}
              style={StyleSheet.absoluteFill}
            />
            <View style={shared.row}>
              <PremiumIcon
                name="briefcase"
                tone="gold"
                size={54}
                iconSize={25}
              />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.kicker, { color: colors.gold }]}>
                  {executivePlan.tag.toUpperCase()}
                </Text>
                <Text
                  style={[
                    pricingStyles.executiveTitle,
                    { color: colors.ivory },
                  ]}
                >
                  {executivePlan.name}
                </Text>
                <Text style={[pricingStyles.planFor, { color: "#C9B8BD" }]}>
                  {executivePlan.forLabel}
                </Text>
              </View>
            </View>
            <View style={pricingStyles.priceRow}>
              <Text style={[styles.price, { color: colors.gold }]}>
                {formatMoney(executivePlan.priceCents)}
              </Text>
              <Text style={[styles.per, { color: "#C9B8BD" }]}>
                {executivePlan.period}
              </Text>
            </View>
            {executivePlan.features.slice(0, 3).map((x) => (
              <View key={x} style={pricingStyles.featureRow}>
                <MiniPremiumIcon
                  name="checkmark-circle"
                  tone="gold"
                  size={30}
                  iconSize={14}
                />
                <Text
                  style={[
                    shared.body,
                    { color: colors.ivory, marginLeft: 10, flex: 1 },
                  ]}
                >
                  {x}
                </Text>
              </View>
            ))}
            <Button
              label={executivePlan.cta}
              variant="gold"
              icon="briefcase"
              onPress={() => {
                track("checkout_started", {
                  item_key: "executive_annual",
                  platform: Platform.OS,
                });
                setCheckout({
                  name: executivePlan.name,
                  price: formatMoney(executivePlan.priceCents),
                  period: executivePlan.period,
                  tag: executivePlan.tag,
                  features: executivePlan.features,
                  executive: true,
                  kind: "executive_application",
                  storeProduct: { type: "executive" },
                });
              }}
            />
            <Text style={[styles.helper, { color: "#C9B8BD" }]}>
              Application approval is required before annual billing. Sensitive
              verification is private.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: sparksOpen }}
            onPress={() => setSparksOpen((value) => !value)}
            style={[
              pricingStyles.sparkToggle,
              {
                backgroundColor: "rgba(255,253,252,.92)",
                borderColor: "rgba(229,9,47,.2)",
                borderWidth: 1,
              },
            ]}
          >
            <PremiumIcon name="sparkles" tone="gold" size={42} iconSize={19} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: "#2B171D" }]}>
                Golden Spark packs
              </Text>
              <Text style={[styles.helper, { color: "#5A5557" }]}>
                Optional extras after your daily free Spark
              </Text>
            </View>
            <Ionicons
              name={sparksOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.gold}
            />
          </Pressable>
          {sparksOpen && (
            <View
              style={[
                aiStyles.roseWallet,
                {
                  alignItems: "flex-start",
                  backgroundColor: "rgba(255,253,252,.92)",
                  borderColor: "rgba(229,9,47,.2)",
                  borderWidth: 1,
                },
              ]}
            >
              <View style={aiStyles.roseIcon}>
                <PremiumIcon
                  name="sparkles"
                  tone="gold"
                  size={42}
                  iconSize={19}
                />
              </View>
              <View style={{ flex: 1, gap: 7 }}>
                <Text style={[aiStyles.roseTitle, { color: "#2B171D" }]}>
                  Choose a Spark pack
                </Text>
                <View style={pricingStyles.sparkGrid}>
                  {sparkPacks.map((pack) => (
                    <Pressable
                      key={pack.id}
                      onPress={() => {
                        track("checkout_started", {
                          item_key: pack.id,
                          platform: Platform.OS,
                        });
                        setCheckout({
                          name: pack.name,
                          price: formatMoney(pack.priceCents),
                          period: " one-time",
                          tag: pack.tag,
                          features: [
                            `${pack.sparks} Golden Sparks`,
                            "Romantic Spark animation",
                            "Restorable store purchase",
                            "Abuse and spam limits still apply",
                          ],
                          kind: "spark_pack",
                          sparkAmount: pack.sparks,
                          storeProduct: { type: "spark", packId: pack.id },
                        });
                      }}
                      style={[
                        pricingStyles.sparkCard,
                        pack.bestValue && pricingStyles.sparkCardBest,
                      ]}
                    >
                      <Text
                        style={[
                          pricingStyles.sparkCount,
                          { color: colors.wine },
                        ]}
                      >
                        {pack.sparks}
                      </Text>
                      <Text
                        style={[pricingStyles.sparkLabel, { color: "#5A5557" }]}
                      >
                        Sparks
                      </Text>
                      <Text
                        style={[
                          pricingStyles.sparkPrice,
                          { color: colors.wine },
                        ]}
                      >
                        {formatMoney(pack.priceCents)}
                      </Text>
                      {pack.bestValue && (
                        <Text style={pricingStyles.sparkBest}>Popular</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}
          <View
            style={[
              pricingStyles.restoreCard,
              {
                backgroundColor: "rgba(255,253,252,.92)",
                borderColor: "rgba(229,9,47,.2)",
                borderWidth: 1,
              },
            ]}
          >
            <PremiumIcon
              name="refresh-circle"
              tone="gold"
              size={44}
              iconSize={21}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: "#2B171D" }]}>
                Restore purchases
              </Text>
              <Text style={[styles.helper, { color: "#5A5557" }]}>
                {restoreStatus}
              </Text>
            </View>
            <Pressable
              disabled={restoring}
              onPress={() => void restorePurchases()}
              style={pricingStyles.restoreButton}
            >
              <Text style={[pricingStyles.restoreText, { color: "#2B171D" }]}>
                {restoring ? "Checking…" : "Restore"}
              </Text>
            </Pressable>
          </View>
          <View
            style={[
              pricingStyles.manageCard,
              {
                backgroundColor: "rgba(255,253,252,.92)",
                borderColor: "rgba(229,9,47,.2)",
                borderWidth: 1,
              },
            ]}
          >
            <View style={shared.row}>
              <PremiumIcon
                name="receipt-outline"
                tone="rose"
                size={44}
                iconSize={21}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.cardTitle, { color: "#2B171D" }]}>
                  Membership & billing help
                </Text>
                <Text style={[styles.helper, { color: "#5A5557" }]}>
                  Manage renewal in your app-store account. Refunds, duplicate
                  charges and chargebacks open a traceable support case.
                </Text>
              </View>
            </View>
            <Button
              label={billingHelp ? "Hide billing paths" : "View billing paths"}
              variant="secondary"
              icon="help-circle-outline"
              onPress={() => setBillingHelp((value) => !value)}
            />
            {billingHelp && (
              <View
                style={[
                  pricingStyles.billingHelpBox,
                  {
                    backgroundColor: "rgba(255,253,252,.92)",
                    borderColor: "rgba(229,9,47,.2)",
                    borderWidth: 1,
                  },
                ]}
              >
                {[
                  "Cancel or change renewal in Apple/Google settings",
                  "Restore only server-verified purchases",
                  "Request refund review with receipt reference",
                  "Grace period preserves access while the store retries",
                  "Refund or chargeback reverses the entitlement ledger",
                ].map((item) => (
                  <View key={item} style={pricingStyles.featureRow}>
                    <MiniPremiumIcon
                      name="checkmark-circle-outline"
                      tone="gold"
                      size={27}
                      iconSize={13}
                    />
                    <Text
                      style={[
                        shared.body,
                        { flex: 1, marginLeft: 8, color: colors.ivory },
                      ]}
                    >
                      {item}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View
            style={[
              launchStyles.billingPromise,
              {
                backgroundColor: "rgba(255,253,252,.92)",
                borderColor: "rgba(229,9,47,.2)",
                borderWidth: 1,
              },
            ]}
          >
            <PremiumIcon
              name="shield-checkmark"
              tone="gold"
              size={44}
              iconSize={21}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: "#2B171D" }]}>
                Clear payments, no surprises
              </Text>
              <Text style={[styles.helper, { color: "#5A5557" }]}>
                Subscriptions, coins and Spark packs use official in-app
                billing. Apple Pay is reserved for optional real-world date
                venue holds.
              </Text>
            </View>
          </View>
          <Text style={[styles.legal, { paddingBottom: 10, color: "#5A5557" }]}>
            Cancel anytime. Your subscription renews through your app store
            account.
          </Text>
        </ScrollView>
        <MembershipCheckoutSheet
          serverMode={ports.serverMode}
          previewEntitlementsAllowed={ports.previewEntitlementsAllowed}
          plan={checkout}
          onClose={() => setCheckout(null)}
          onPurchase={purchaseStoreProduct}
          onComplete={(sparkAmount) =>
            sparkAmount ? onBuyRoses(sparkAmount) : undefined
          }
        />
      </SafeAreaView>
    </View>
  );
}
function MembershipCheckoutSheet({
  serverMode,
  previewEntitlementsAllowed,
  plan,
  onClose,
  onPurchase,
  onComplete,
}: {
  serverMode: boolean;
  previewEntitlementsAllowed: boolean;
  plan: CheckoutPlan | null;
  onClose: () => void;
  onPurchase: (plan: CheckoutPlan) => Promise<unknown>;
  onComplete?: (sparkAmount?: number) => void;
}) {
  const [stage, setStage] = useState<
    "review" | "store" | "verifying" | "complete"
  >("review");
  const [productionError, setProductionError] = useState("");
  useEffect(() => {
    if (plan) {
      setStage("review");
      setProductionError("");
    }
  }, [plan]);
  if (!plan) return null;
  const steps = checkoutSteps(plan.kind, plan.executive);
  const activeStep =
    stage === "complete"
      ? steps.length - 1
      : stage === "verifying"
        ? 2
        : stage === "store"
          ? 1
          : 0;
  const advance = async () => {
    if (serverMode) {
      if (plan.executive) {
        setProductionError(
          "Executive applications must be approved before annual store billing. No request or charge was created.",
        );
        return;
      }
      if (Platform.OS === "web") {
        setProductionError(
          "Membership purchases are available only through the signed iOS or Android app. No charge or entitlement was created.",
        );
        return;
      }
      if (stage === "review") {
        setStage("store");
        track("checkout_store_opened", {
          item_key: plan.name.toLowerCase().replace(/\s+/g, "_"),
          platform: Platform.OS,
        });
        return;
      }
      if (stage === "store") {
        setStage("verifying");
        setProductionError("");
        track("checkout_verification_started", {
          item_key: plan.name.toLowerCase().replace(/\s+/g, "_"),
          platform: Platform.OS,
        });
        try {
          await onPurchase(plan);
          setStage("complete");
          track("checkout_completed", {
            item_key: plan.name.toLowerCase().replace(/\s+/g, "_"),
            platform: Platform.OS,
          });
        } catch (error) {
          setStage("store");
          setProductionError(
            error instanceof Error
              ? error.message
              : "The purchase could not be verified. No entitlement was changed.",
          );
          track("checkout_failed", {
            error_code: "purchase_verification_failed",
            platform: Platform.OS,
          });
        }
      }
      return;
    }
    if (stage === "review") {
      setStage("store");
      return;
    }
    if (stage === "store") {
      setStage("verifying");
      return;
    }
    setStage("complete");
    if (previewEntitlementsAllowed && plan.kind === "spark_pack")
      onComplete?.(plan.sparkAmount);
  };
  const buttonLabel =
    stage === "review"
      ? plan.executive
        ? "Review application"
        : "Continue to checkout"
      : stage === "store"
        ? plan.executive
          ? "Submit application"
          : "Confirm with app store"
        : "Finish secure verification";
  const buttonIcon =
    stage === "review"
      ? plan.executive
        ? "briefcase"
        : "lock-closed"
      : stage === "store"
        ? "storefront-outline"
        : "shield-checkmark-outline";
  const successCopy = serverMode
    ? plan.kind === "spark_pack"
      ? `${plan.sparkAmount ?? 0} Golden Sparks were verified by the app store and added securely.`
      : "Your membership is verified and active."
    : plan.executive
      ? "Your Executive Circle application is ready for private review. No charge was made."
      : plan.kind === "spark_pack"
        ? `${plan.sparkAmount ?? 0} Golden Sparks were added for this showcase. No real charge was made.`
        : "Your membership checkout showcase is complete. No real charge was made.";
  return (
    <Modal
      visible
      transparent
      animationType={Platform.OS === "web" ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View style={pricingStyles.checkoutModalRoot}>
        <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
        <SafeAreaView style={[chatStyles.sheet, pricingStyles.checkoutSheet]}>
          <SheetHeader
            title="Secure checkout"
            subtitle={`${plan.name} · ${plan.price}${plan.period}`}
            onClose={onClose}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={pricingStyles.checkoutScroll}
          >
            <LinearGradient
              colors={
                plan.executive
                  ? ["#3B2D09", "#FFFDFC"]
                  : plan.kind === "spark_pack"
                    ? ["#3B2208", "#FFFDFC"]
                    : ["#3A0710", "#FFFDFC"]
              }
              style={pricingStyles.checkoutHero}
            >
              <PremiumIcon
                name={
                  plan.executive
                    ? "briefcase"
                    : plan.kind === "spark_pack"
                      ? "sparkles"
                      : "card"
                }
                tone="gold"
                size={56}
                iconSize={26}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>{plan.tag.toUpperCase()}</Text>
                <Text style={pricingStyles.checkoutTitle}>{plan.name}</Text>
                <Text style={styles.helper}>
                  {plan.price}
                  {plan.period} · billed through your app store
                </Text>
              </View>
            </LinearGradient>
            <View style={pricingStyles.checkoutSteps}>
              {steps.map((step, index) => (
                <View key={step} style={pricingStyles.checkoutStep}>
                  <View
                    style={[
                      pricingStyles.checkoutStepDot,
                      index <= activeStep && pricingStyles.checkoutStepDotOn,
                    ]}
                  >
                    <Text style={pricingStyles.checkoutStepNumber}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text
                    style={[
                      pricingStyles.checkoutStepText,
                      index <= activeStep && pricingStyles.checkoutStepTextOn,
                    ]}
                  >
                    {step}
                  </Text>
                </View>
              ))}
            </View>
            <View style={pricingStyles.checkoutFeatureBox}>
              {plan.features.slice(0, 4).map((feature) => (
                <View key={feature} style={pricingStyles.featureRow}>
                  <MiniPremiumIcon
                    name="checkmark-circle"
                    tone="gold"
                    size={28}
                    iconSize={13}
                  />
                  <Text
                    style={[
                      shared.body,
                      { color: colors.ivory, marginLeft: 9, flex: 1 },
                    ]}
                  >
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
            {productionError ? (
              <View style={pricingStyles.checkoutBlocked}>
                <MiniPremiumIcon
                  name="lock-closed"
                  tone="ruby"
                  size={34}
                  iconSize={16}
                />
                <Text style={pricingStyles.checkoutBlockedText}>
                  {productionError}
                </Text>
              </View>
            ) : null}
            {stage === "complete" ? (
              <>
                <View style={pricingStyles.checkoutReady}>
                  <MiniPremiumIcon
                    name="checkmark-circle"
                    tone="gold"
                    size={34}
                    iconSize={16}
                  />
                  <Text style={pricingStyles.checkoutReadyText}>
                    {successCopy}
                  </Text>
                </View>
                <Button label="Done" variant="secondary" onPress={onClose} />
              </>
            ) : (
              <Button
                label={buttonLabel}
                icon={buttonIcon}
                variant="gold"
                onPress={() => void advance()}
              />
            )}
            <Text style={styles.legal}>
              {serverMode
                ? "The app store confirms payment; DestinyOne unlocks only server-verified entitlements."
                : "Showcase only. No real payment is collected here."}
            </Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
function PricingPromise({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={pricingStyles.promiseCard}>
      <MiniPremiumIcon name={icon} tone="gold" size={34} iconSize={16} />
      <Text style={pricingStyles.promiseTitle}>{title}</Text>
      <Text style={pricingStyles.promiseBody}>{body}</Text>
    </View>
  );
}
