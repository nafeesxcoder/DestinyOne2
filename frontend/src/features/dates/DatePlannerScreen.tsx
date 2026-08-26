import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, shared } from "../../components";
import {
  MiniPremiumIcon,
  PremiumIcon,
} from "../../components/premium/PremiumIcon";
import type { Match } from "../../data";
import type { ChatMessage } from "../../storage";
import { colors } from "../../theme";
import {
  dateStyles,
  discoveryStyles,
  launchStyles,
  styles,
} from "../../theme/appStyles";
import {
  dateCategories,
  dateTimes,
  dateVenues,
  type DateVenue,
} from "./datePlannerData";

// 🚀 BACKGROUND IMAGE ADDED HERE
const backgroundImage = require("../../../assets/background.png");

export type DatePlanPreset = {
  id: string;
  name: string;
  kind?: string;
  city: string;
  area: string;
  price: string;
  vibe: string;
  icon: string;
};
export type DatePackageView = {
  id: string;
  title: string;
  tier: string;
  price: string;
  icon: keyof typeof Ionicons.glyphMap;
};
export type DateReservationMode = "live" | "demo" | "blocked";
export type DateReservationStatus =
  | "idle"
  | "processing"
  | "reserved"
  | "failed";
export type DateReservationQuote = {
  venueId: string;
  venueName: string;
  amountCents: number;
  currency: "usd";
  safetyPolicy: string;
  refundPolicy: string;
  providerLabel: string;
};
export type DateReservationInput = {
  venueId: string;
  venueName: string;
  amountCents: number;
  currency: "usd";
};
const formatReservationMoney = (amountCents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
const reservationStatusCopy = (
  status: DateReservationStatus,
  quote: DateReservationQuote | null,
) =>
  status === "processing"
    ? "Preparing secure checkout…"
    : status === "reserved"
      ? "Your reservation request is ready."
      : status === "failed"
        ? "Reservation could not be created."
        : quote
          ? `Optional ${formatReservationMoney(quote.amountCents, quote.currency)} venue hold. No charge until you confirm.`
          : "Choose a venue first.";
export function DatePlannerScreen({
  match,
  preset,
  packages,
  reservationMode,
  onRequestApproximateLocation,
  onCheckWalletSupport,
  onReserve,
  onBack,
  onSend,
}: {
  match: Match;
  preset?: DatePlanPreset | null;
  packages: DatePackageView[];
  reservationMode: DateReservationMode;
  onRequestApproximateLocation: () => Promise<boolean>;
  onCheckWalletSupport: () => Promise<boolean>;
  onReserve: (input: DateReservationInput) => Promise<void>;
  onBack: () => void;
  onSend: (message: ChatMessage) => Promise<boolean>;
}) {
  const presetCategory = preset
    ? ["Restaurant", "Hotel", "Lounge"].includes(preset.kind ?? "")
      ? "Dinner"
      : preset.kind === "Cafe" || preset.kind === "Dessert"
        ? "Café"
        : preset.kind === "Park" || preset.kind === "Tourist"
          ? "Walk"
          : "Activity"
    : "Café";
  const presetVenue: DateVenue | undefined = preset
    ? {
        id: `market-${preset.id}`,
        name: preset.name,
        category: presetCategory,
        area: `${preset.area} · ${preset.city}`,
        price: preset.price,
        vibe: preset.vibe,
        icon: preset.icon,
      }
    : undefined;
  const plannerVenues = presetVenue ? [presetVenue, ...dateVenues] : dateVenues;
  const [category, setCategory] = useState(presetCategory);
  const [venueId, setVenueId] = useState(presetVenue?.id ?? "");
  const [time, setTime] = useState("");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [useArea, setUseArea] = useState(false);
  const [safetyCheckIn, setSafetyCheckIn] = useState(true);
  const [sharePlan, setSharePlan] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [reservationStatus, setReservationStatus] =
    useState<DateReservationStatus>("idle");
  const [paymentError, setPaymentError] = useState("");
  const [applePaySupported, setApplePaySupported] = useState(false);
  const venues = plannerVenues.filter((venue) => venue.category === category);
  const selectedVenue = plannerVenues.find((venue) => venue.id === venueId);
  const selectedPackage = packages.find((item) => item.id === packageId);
  const reservationQuote = selectedVenue
    ? {
        venueId: selectedVenue.id,
        venueName: selectedVenue.name,
        amountCents: 1000,
        currency: "usd" as const,
        safetyPolicy: "Public venue and private acceptance required.",
        refundPolicy: "No charge is finalized before confirmation.",
        providerLabel:
          reservationMode === "live"
            ? "Secure reservation provider"
            : "Frontend preview",
      }
    : null;
  const planProgress =
    (selectedVenue ? 34 : 0) + (time ? 33 : 0) + (safetyCheckIn ? 33 : 20);
  const planSteps: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    done: boolean;
  }> = [
    { icon: "restaurant", label: "Place", done: !!selectedVenue },
    { icon: "time", label: "Time", done: !!time },
    { icon: "shield-checkmark", label: "Safety", done: safetyCheckIn },
  ];
  useEffect(() => {
    if (Platform.OS !== "ios" || reservationMode !== "live") return;
    void onCheckWalletSupport()
      .then(setApplePaySupported)
      .catch(() => setApplePaySupported(false));
  }, [onCheckWalletSupport, reservationMode]);
  const selectCategory = (next: string) => {
    setCategory(next);
    setVenueId("");
  };
  const choosePackage = (item: DatePackageView) => {
    setPackageId(item.id);
    setReservationStatus("idle");
    setPaymentError("");
    const nextCategory =
      item.icon === "restaurant" ||
      item.icon === "wine" ||
      item.icon === "diamond"
        ? "Dinner"
        : item.icon === "color-palette"
          ? "Activity"
          : "Café";
    if (nextCategory !== category) {
      setCategory(nextCategory);
      setVenueId("");
    }
  };
  const enableArea = async () => {
    if (useArea) {
      setUseArea(false);
      return;
    }
    setLocationError("");
    try {
      const granted = await onRequestApproximateLocation();
      if (!granted) {
        setLocationError(
          "Approximate location permission is needed to find nearby date ideas.",
        );
        return;
      }
      setUseArea(true);
    } catch {
      setLocationError(
        "Could not find your approximate area. You can still choose a sample venue.",
      );
    }
  };
  const reserveDate = async () => {
    if (!selectedVenue || reservationStatus === "processing") return;
    setPaymentError("");
    setReservationStatus("processing");
    try {
      await onReserve({
        venueId: selectedVenue.id,
        venueName: selectedVenue.name,
        amountCents: reservationQuote?.amountCents ?? 1000,
        currency: "usd",
      });
      setReservationStatus("reserved");
    } catch (error) {
      setReservationStatus("idle");
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Secure checkout could not be completed.",
      );
    }
  };
  const sendPlan = async () => {
    if (!selectedVenue || !time) return;
    await onSend({
      id: `date-${Date.now()}`,
      type: "date",
      date: {
        venue: selectedVenue.name,
        category: selectedVenue.category,
        area: useArea ? "Near your approximate area" : selectedVenue.area,
        time,
        safetyCheckIn,
        packageTitle: selectedPackage?.title,
        packageTier: selectedPackage?.tier,
        planStatus: "proposed",
      },
      createdAt: Date.now(),
      status: "sent",
    });
  };

  // 🚀 ROOT BACKGROUND REPLACED WITH IMAGEBACKGROUND
  return (
    <ImageBackground
      source={backgroundImage}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <SafeAreaView style={[shared.safe, { backgroundColor: "transparent" }]}>
        <View style={dateStyles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <PremiumIcon
              name="arrow-back"
              tone="dark"
              size={42}
              iconSize={20}
            />
          </Pressable>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Plan a date with {match.name}</Text>
            <Text style={styles.helper}>Suggest, don’t pressure</Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={dateStyles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={dateStyles.hero}>
            <PremiumIcon name="calendar" tone="gold" size={66} iconSize={30} />
            <Text style={[shared.h1, { textAlign: "center" }]}>
              Turn a good chat into a real moment.
            </Text>
            <Text style={[shared.body, { textAlign: "center" }]}>
              Choose a public place and a time. {match.name} can accept or
              suggest something different.
            </Text>
          </View>
          <View style={dateStyles.planStatusCard}>
            <View style={shared.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>PLAN READINESS</Text>
                <Text style={dateStyles.planStatusTitle}>
                  {selectedVenue && time
                    ? "Ready to suggest"
                    : selectedVenue
                      ? "Pick a time next"
                      : "Choose a place first"}
                </Text>
              </View>
              <Text style={dateStyles.planStatusPercent}>
                {Math.min(100, planProgress)}%
              </Text>
            </View>
            <View style={dateStyles.planTrack}>
              <View
                style={[
                  dateStyles.planFill,
                  { width: `${Math.min(100, planProgress)}%` },
                ]}
              />
            </View>
            <View style={dateStyles.planStepRow}>
              {planSteps.map((step) => (
                <View key={step.label} style={dateStyles.planStep}>
                  <MiniPremiumIcon
                    name={step.icon}
                    tone={step.done ? "gold" : "dark"}
                    size={26}
                    iconSize={12}
                  />
                  <Text
                    style={[
                      dateStyles.planStepText,
                      step.done && { color: colors.ivory },
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <Pressable
            onPress={() => void enableArea()}
            style={[dateStyles.areaButton, useArea && dateStyles.areaButtonOn]}
          >
            <PremiumIcon
              name={useArea ? "location" : "location-outline"}
              tone={useArea ? "gold" : "rose"}
              size={44}
              iconSize={20}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {useArea ? "Using your approximate area" : "Find ideas near me"}
              </Text>
              <Text style={styles.helper}>
                Foreground location only · exact location never shared
              </Text>
            </View>
            <MiniPremiumIcon
              name={useArea ? "checkmark-circle" : "chevron-forward"}
              tone={useArea ? "gold" : "dark"}
              size={34}
              iconSize={16}
            />
          </Pressable>
          {!!locationError && (
            <Text style={styles.formError}>{locationError}</Text>
          )}
          <View style={{ gap: 11 }}>
            <View style={shared.row}>
              <Text style={styles.sectionLabel}>DATE PACKAGE</Text>
              <View style={shared.spacer} />
              <Text style={dateStyles.sampleLabel}>
                {selectedPackage?.tier ?? "Choose one"}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 9 }}
            >
              {packages.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => choosePackage(item)}
                  style={[
                    dateStyles.packageSelect,
                    packageId === item.id && dateStyles.packageSelectOn,
                  ]}
                >
                  <MiniPremiumIcon
                    name={item.icon}
                    tone={packageId === item.id ? "gold" : "rose"}
                    size={30}
                    iconSize={14}
                  />
                  <Text
                    style={[
                      dateStyles.packageSelectTitle,
                      packageId === item.id && { color: colors.ivory },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={dateStyles.packageSelectMeta}>{item.price}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={{ gap: 11 }}>
            <Text style={styles.sectionLabel}>WHAT FEELS RIGHT?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 9 }}
            >
              {dateCategories.map((item) => (
                <Pressable
                  key={item.name}
                  onPress={() => selectCategory(item.name)}
                  style={[
                    dateStyles.category,
                    category === item.name && dateStyles.categoryOn,
                  ]}
                >
                  <MiniPremiumIcon
                    name={item.icon}
                    tone={category === item.name ? "gold" : "rose"}
                    size={30}
                    iconSize={14}
                  />
                  <Text
                    style={[
                      dateStyles.categoryText,
                      category === item.name && { color: colors.ivory },
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={{ gap: 10 }}>
            <View style={shared.row}>
              <Text style={styles.sectionLabel}>CURATED IDEAS</Text>
              <View style={shared.spacer} />
              <Text style={dateStyles.sampleLabel}>SAMPLE VENUES</Text>
            </View>
            {venues.map((venue) => (
              <Pressable
                key={venue.id}
                onPress={() => {
                  setVenueId(venue.id);
                  setReservationStatus("idle");
                  setPaymentError("");
                }}
                style={[
                  dateStyles.venueCard,
                  venueId === venue.id && dateStyles.venueCardOn,
                ]}
              >
                <Text style={dateStyles.venueEmoji}>{venue.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{venue.name}</Text>
                  <Text style={dateStyles.venueVibe}>{venue.vibe}</Text>
                  <Text style={styles.helper}>
                    {useArea ? "Near your approximate area" : venue.area} ·{" "}
                    {venue.price}
                  </Text>
                </View>
                <MiniPremiumIcon
                  name={
                    venueId === venue.id
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  tone={venueId === venue.id ? "gold" : "dark"}
                  size={34}
                  iconSize={16}
                />
              </Pressable>
            ))}
          </View>
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionLabel}>PICK A TIME</Text>
            <View style={dateStyles.timeGrid}>
              {dateTimes.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setTime(option)}
                  style={[
                    dateStyles.timeChip,
                    time === option && dateStyles.timeChipOn,
                  ]}
                >
                  <Text
                    style={[
                      dateStyles.timeText,
                      time === option && { color: colors.ivory },
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={dateStyles.safetyCard}>
            <View style={shared.row}>
              <PremiumIcon
                name="shield-checkmark"
                tone="gold"
                size={44}
                iconSize={20}
              />
              <Text style={[styles.cardTitle, { marginLeft: 8 }]}>
                Date safety
              </Text>
            </View>
            <DateToggle
              title="Check in after the date"
              body="DestinyOne reminds you to confirm you’re safe."
              value={safetyCheckIn}
              onPress={() => setSafetyCheckIn((value) => !value)}
            />
            <DateToggle
              title="Share plan with a trusted contact"
              body="Prepared for secure sharing when contacts backend is connected."
              value={sharePlan}
              onPress={() => setSharePlan((value) => !value)}
            />
          </View>
          <DatePlanPreview
            venue={selectedVenue}
            packageTitle={selectedPackage?.title}
            packageTier={selectedPackage?.tier}
            time={time}
            useArea={useArea}
            safetyCheckIn={safetyCheckIn}
            sharePlan={sharePlan}
          />
          <View style={dateStyles.sampleNotice}>
            <MiniPremiumIcon
              name="information-circle-outline"
              tone="gold"
              size={34}
              iconSize={16}
            />
            <Text style={[styles.helper, { flex: 1 }]}>
              Venue cards are MVP samples. Production connects a Places provider
              for live cafés, opening hours, ratings and map directions.
            </Text>
          </View>
          <ReservationCheckout
            mode={reservationMode}
            venue={selectedVenue}
            quote={reservationQuote}
            status={reservationStatus}
            applePaySupported={applePaySupported}
            error={paymentError}
            onReserve={() => void reserveDate()}
          />
          <Button
            disabled={!selectedVenue || !time}
            label={
              selectedVenue && time
                ? `Suggest to ${match.name}`
                : "Choose a place and time"
            }
            icon="send"
            onPress={sendPlan}
          />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function DatePlanPreview({
  venue,
  packageTitle,
  packageTier,
  time,
  useArea,
  safetyCheckIn,
  sharePlan,
}: {
  venue?: (typeof dateVenues)[number];
  packageTitle?: string;
  packageTier?: string;
  time: string;
  useArea: boolean;
  safetyCheckIn: boolean;
  sharePlan: boolean;
}) {
  return (
    <View style={dateStyles.previewCard}>
      <View style={shared.row}>
        <PremiumIcon
          name="reader-outline"
          tone="gold"
          size={42}
          iconSize={19}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardTitle}>Plan preview</Text>
          <Text style={styles.helper}>This is what gets sent in chat.</Text>
        </View>
      </View>
      <View style={dateStyles.previewLine}>
        <Text style={dateStyles.previewLabel}>Package</Text>
        <Text style={dateStyles.previewValue}>
          {packageTitle
            ? `${packageTitle}${packageTier ? ` · ${packageTier}` : ""}`
            : "Choose a package"}
        </Text>
      </View>
      <View style={dateStyles.previewLine}>
        <Text style={dateStyles.previewLabel}>Place</Text>
        <Text style={dateStyles.previewValue}>
          {venue?.name ?? "Choose a curated idea"}
        </Text>
      </View>
      <View style={dateStyles.previewLine}>
        <Text style={dateStyles.previewLabel}>Area</Text>
        <Text style={dateStyles.previewValue}>
          {venue ? (useArea ? "Near your approximate area" : venue.area) : "—"}
        </Text>
      </View>
      <View style={dateStyles.previewLine}>
        <Text style={dateStyles.previewLabel}>Time</Text>
        <Text style={dateStyles.previewValue}>{time || "Pick a time"}</Text>
      </View>
      <View style={dateStyles.previewFlags}>
        <View style={dateStyles.previewFlag}>
          <MiniPremiumIcon
            name="shield-checkmark"
            tone="gold"
            size={24}
            iconSize={11}
          />
          <Text style={dateStyles.previewFlagText}>
            {safetyCheckIn ? "Check-in on" : "Check-in off"}
          </Text>
        </View>
        {sharePlan && (
          <View style={dateStyles.previewFlag}>
            <MiniPremiumIcon
              name="share-social"
              tone="rose"
              size={24}
              iconSize={11}
            />
            <Text style={dateStyles.previewFlagText}>
              Trusted contact ready
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

function ReservationCheckout({
  mode,
  venue,
  quote,
  status,
  applePaySupported,
  error,
  onReserve,
}: {
  mode: DateReservationMode;
  venue?: (typeof dateVenues)[number];
  quote: DateReservationQuote | null;
  status: DateReservationStatus;
  applePaySupported: boolean;
  error: string;
  onReserve: () => void;
}) {
  if (!venue || !quote) return null;
  const useApplePay =
    Platform.OS === "ios" && mode === "live" && applePaySupported;
  const checkoutBlocked = mode === "blocked";
  const steps = [
    {
      label: "Review",
      body: "Confirm venue and hold terms.",
      status: status === "idle" ? "active" : "done",
    },
    {
      label: "Secure hold",
      body: "Create the provider reservation.",
      status:
        status === "processing"
          ? "active"
          : status === "reserved"
            ? "done"
            : "pending",
    },
    {
      label: "Confirmed",
      body: "Show the final reservation result.",
      status: status === "reserved" ? "done" : "pending",
    },
  ] as const;
  return (
    <View style={launchStyles.checkoutCard}>
      <View style={shared.row}>
        <PremiumIcon name="wallet" tone="gold" size={44} iconSize={20} />
        <View style={{ flex: 1, marginLeft: 11 }}>
          <Text style={styles.cardTitle}>Easy reservation</Text>
          <Text style={styles.helper}>
            {reservationStatusCopy(status, quote)}
          </Text>
        </View>
        {status === "reserved" && (
          <MiniPremiumIcon
            name="checkmark-circle"
            tone="gold"
            size={34}
            iconSize={16}
          />
        )}
      </View>
      <View style={dateStyles.reservationSteps}>
        {steps.map((step) => (
          <View key={step.label} style={dateStyles.reservationStep}>
            <View
              style={[
                dateStyles.reservationDot,
                step.status === "done" && dateStyles.reservationDotDone,
                step.status === "active" && dateStyles.reservationDotActive,
              ]}
            />
            <Text
              style={[
                dateStyles.reservationStepTitle,
                step.status === "active" && { color: colors.ivory },
              ]}
            >
              {step.label}
            </Text>
            <Text style={dateStyles.reservationStepBody}>{step.body}</Text>
          </View>
        ))}
      </View>
      <View style={dateStyles.reservationPolicy}>
        <ReservationPolicyRow
          icon="shield-checkmark"
          text={quote.safetyPolicy}
        />
        <ReservationPolicyRow icon="refresh-circle" text={quote.refundPolicy} />
        <ReservationPolicyRow
          icon="card"
          text={`${quote.providerLabel} · quote expires in 12 min`}
        />
      </View>
      {status === "reserved" ? (
        <View style={launchStyles.reservedPill}>
          <MiniPremiumIcon
            name="checkmark"
            tone="gold"
            size={24}
            iconSize={11}
          />
          <Text style={launchStyles.reservedText}>
            {mode === "live"
              ? "Reservation request created securely."
              : "Reservation demo saved on this device."}
          </Text>
        </View>
      ) : useApplePay ? (
        <Button
          label={`Reserve with Apple Pay · ${formatReservationMoney(quote.amountCents, quote.currency)}`}
          icon="logo-apple"
          onPress={onReserve}
        />
      ) : (
        <Button
          label={
            checkoutBlocked
              ? "Reservation connection required"
              : status === "processing"
                ? "Preparing secure checkout…"
                : mode === "live"
                  ? `Reserve securely · ${formatReservationMoney(quote.amountCents, quote.currency)}`
                  : `Try reservation demo · ${formatReservationMoney(quote.amountCents, quote.currency)}`
          }
          disabled={status === "processing" || checkoutBlocked}
          icon="wallet-outline"
          onPress={onReserve}
        />
      )}
      {!!error && <Text style={styles.formError}>{error}</Text>}
      <Text style={launchStyles.paymentFine}>
        Apple Pay is for real-world venue reservations. Plus and gift coins use
        Apple/Google in-app billing so purchases remain restorable and
        store-compliant.
      </Text>
    </View>
  );
}

function ReservationPolicyRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <MiniPremiumIcon name={icon} tone="gold" size={26} iconSize={12} />
      <Text style={[styles.helper, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

function DateToggle({
  title,
  body,
  value,
  onPress,
}: {
  title: string;
  body: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={dateStyles.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={dateStyles.toggleTitle}>{title}</Text>
        <Text style={styles.helper}>{body}</Text>
      </View>
      <View style={[discoveryStyles.switch, value && discoveryStyles.switchOn]}>
        <View
          style={[
            discoveryStyles.switchThumb,
            value && discoveryStyles.switchThumbOn,
          ]}
        />
      </View>
    </Pressable>
  );
}
