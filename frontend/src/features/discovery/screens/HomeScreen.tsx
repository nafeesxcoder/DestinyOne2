import type { ReactNode } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, shared } from "../../../components";
import {
  BottomNav,
  handleBottomNavScroll,
} from "../../../components/navigation/BottomNav";
import {
  MiniPremiumIcon,
  PremiumIcon,
} from "../../../components/premium/PremiumIcon"; // We'll still keep if needed, but replace uses
import type { Match } from "../../../data";
import { matchReasons } from "../../../domain/matching";
import type { ProfileGrowthInput } from "../../../domain/growth";
import type { DiscoverySignal, MatchFilters } from "../../../storage";
import type { Screen } from "../../../app/navigation/types";
import { colors } from "../../../theme";
import {
  giftMarketplaceStyles,
  homeCleanStyles,
  styles,
} from "../../../theme/appStyles";
import { IntentPassportCard } from "../components/IntentPassportCard";
import { MatchCard } from "../components/MatchCard";

const backgroundImage = require("../../../../assets/background.png");

function PremiumBackground({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, overflow: "hidden", backgroundColor: "#0B0710" }}>
      <Image
        source={backgroundImage}
        resizeMode="cover"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
      />
      {children}
    </View>
  );
}

/* =========================================================
   GLOW ICON (Dark red background style)
   ========================================================= */
function GlowIcon({
  icon,
  size = 36,
  color = "#FFFFFF",
  glowColor = "#E5092F",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  glowColor?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(35,0,7,.90)",
        borderWidth: 1.5,
        borderColor: "rgba(255,110,130,.72)",
        shadowColor: glowColor,
        shadowOpacity: 0.72,
        shadowRadius: 13,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
      }}
    >
      <LinearGradient
        colors={[
          "rgba(255,255,255,.22)",
          "rgba(229,9,47,.30)",
          "rgba(70,0,8,.30)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: size / 2,
        }}
      />
      <Ionicons name={icon} size={size * 0.48} color={color} />
    </View>
  );
}

type RoseAvailability = { freeAvailable: boolean; paidCredits: number };
type MemberMatchLoadState = "preview" | "loading" | "ready" | "error";
type MatchingPoolStatusView = { status: string; suggestions: string[] };

export function HomeScreen({
  preview,
  items,
  matchLoadState,
  matchingPoolStatus,
  onRetryMatches,
  preferences,
  alignment,
  signals: _signals,
  dismissedCount: _dismissedCount,
  profileGrowth,
  firstName = "there",
  crossedPaths,
  openDetail,
  onInterested,
  onSkip,
  onRose,
  navigate,
}: {
  preview: boolean;
  items: Match[];
  matchLoadState: MemberMatchLoadState;
  matchingPoolStatus: MatchingPoolStatusView | null;
  onRetryMatches: () => void;
  preferences: { intent: string; vibes: string[]; filters: MatchFilters };
  alignment: Record<string, string>;
  signals: DiscoverySignal[];
  dismissedCount: number;
  profileGrowth: ProfileGrowthInput;
  firstName?: string;
  roseAvailability: RoseAvailability;
  crossedPaths: boolean;
  openDetail: (m: Match) => void;
  onInterested: (m: Match) => void;
  onSkip: (m: Match) => void;
  onRose: (m: Match) => void;
  navigate: (s: Screen) => void;
}) {
  const { width } = useWindowDimensions();
  const desktop = width >= 980;
  const compactHome = width < 430;
  const swipeDeck = items.slice(0, 10);
  const featured = swipeDeck[0];
  const passportInput = {
    intent: preferences.intent,
    alignment: preview
      ? {
          timeline: "Within 1–2 years",
          children: "Open to children",
          family: "Balanced family involvement",
          relocation: "Open for the right person",
        }
      : alignment,
  };
  const poolNeedsVerification =
    matchingPoolStatus?.status === "verification_required";
  const poolNeedsPreferences =
    matchingPoolStatus?.status === "preferences_incomplete";
  const poolMessage =
    matchingPoolStatus?.suggestions[0] ??
    "No verified profiles meet your preferences right now. We will refresh your introductions as the community grows.";
  // firstName is now passed as a prop from the caller
  const railItems = [
    { label: "Home", screen: "home" as Screen, icon: "home" as const },
    {
      label: "Discover",
      screen: "explore" as Screen,
      icon: "compass" as const,
    },
    { label: "Matches", screen: "likes" as Screen, icon: "heart" as const },
    {
      label: "Chat",
      screen: "chat" as Screen,
      icon: "chatbubble-ellipses" as const,
    },
    { label: "Dates", screen: "events" as Screen, icon: "calendar" as const },
    { label: "Gifts", screen: "gifts" as Screen, icon: "gift" as const },
    {
      label: "Passport",
      screen: "alignment" as Screen,
      icon: "finger-print" as const,
    },
    {
      label: "Executive",
      screen: "executive" as Screen,
      icon: "briefcase" as const,
    },
    {
      label: "Events",
      screen: "events" as Screen,
      icon: "star-outline" as const,
    },
    { label: "Premium", screen: "pricing" as Screen, icon: "diamond" as const },
  ];
  const profilePreviewPhoto = swipeDeck.find(
    (match) => match.name === "Arjun",
  )?.photo;
  return (
    <PremiumBackground>
      <SafeAreaView style={homeCleanStyles.shell}>
        {desktop && (
          <View style={homeCleanStyles.desktopRail}>
            <View style={homeCleanStyles.railBrand}>
              <GlowIcon icon="heart-outline" size={48} />
              <Text style={homeCleanStyles.railLogo}>
                DESTINY<Text style={homeCleanStyles.brandOne}>ONE</Text>
              </Text>
              <Text style={homeCleanStyles.railTag}>
                Meaningful connections.{"\n"}Extraordinary futures.
              </Text>
              <View style={homeCleanStyles.railGoldLine} />
            </View>
            <View style={homeCleanStyles.railNav}>
              {railItems.map((item) => (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  onPress={() => navigate(item.screen)}
                  style={[
                    homeCleanStyles.railItem,
                    item.screen === "home" && homeCleanStyles.railItemOn,
                  ]}
                >
                  {item.screen === "home" && (
                    <LinearGradient
                      pointerEvents="none"
                      colors={["#250008", "#650016", "#9F0A2D"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={homeCleanStyles.railItemFill}
                    />
                  )}
                  <GlowIcon icon={item.icon} size={31} />
                  <Text
                    style={[
                      homeCleanStyles.railItemText,
                      item.screen === "home" && homeCleanStyles.railItemTextOn,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {(item.label === "Matches" || item.label === "Chat") && (
                    <View style={homeCleanStyles.railBadge}>
                      <Text style={homeCleanStyles.railBadgeText}>
                        {item.label === "Matches" ? 10 : 5}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => navigate("pricing")}
              style={homeCleanStyles.premiumRailCard}
            >
              <GlowIcon icon="diamond" size={54} glowColor="#D4AF37" />
              <Text style={homeCleanStyles.premiumRailTitle}>
                DESTINYONE PREMIUM
              </Text>
              <Text style={homeCleanStyles.premiumRailBody}>
                Exclusive features and intentional connections.
              </Text>
              <View style={homeCleanStyles.upgradePill}>
                <LinearGradient
                  pointerEvents="none"
                  colors={["#240006", "#650016", "#980126"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={homeCleanStyles.upgradeFill}
                />
                <View
                  pointerEvents="none"
                  style={homeCleanStyles.upgradeShine}
                />
                <Text style={homeCleanStyles.upgradeText}>UPGRADE NOW</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFDFC" />
              </View>
            </Pressable>
            <View style={homeCleanStyles.railQuote}>
              <Text style={homeCleanStyles.quoteMark}>“</Text>
              <Text style={homeCleanStyles.quoteText}>
                The right conversation today can change your tomorrow.
              </Text>
              <Text style={homeCleanStyles.quoteBy}>— DestinyOne ♥</Text>
            </View>
          </View>
        )}
        <View style={homeCleanStyles.mainPanel}>
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(35,0,7,.96)",
              "rgba(112,0,24,.82)",
              "rgba(208,17,58,.20)",
            ]}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={homeCleanStyles.canvasOrb}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              "rgba(31,0,7,.98)",
              "rgba(113,0,24,.92)",
              "rgba(214,24,62,.20)",
            ]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={homeCleanStyles.canvasRibbon}
          />
          <View pointerEvents="none" style={homeCleanStyles.canvasRibbonLine} />
          <View
            pointerEvents="none"
            style={homeCleanStyles.canvasRibbonLineTwo}
          />
          <View style={homeCleanStyles.header}>
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={[
                  homeCleanStyles.greeting,
                  compactHome && homeCleanStyles.headingCompact,
                ]}
              >
                Good evening, {firstName} 👋
              </Text>
              <Text style={homeCleanStyles.headerSub}>
                Thoughtful connections. Meaningful futures.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => navigate("likes")}
              style={homeCleanStyles.headerButton}
            >
              <GlowIcon icon="notifications-outline" size={36} />
              <View style={homeCleanStyles.notificationBadge}>
                <Text style={homeCleanStyles.notificationText}>3</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => navigate("profile")}
              style={homeCleanStyles.profileButton}
            >
              {profilePreviewPhoto ? (
                <Image
                  accessible
                  accessibilityLabel="Your profile photo"
                  source={{ uri: profilePreviewPhoto }}
                  style={homeCleanStyles.profilePhoto}
                />
              ) : (
                <GlowIcon icon="person" size={42} />
              )}
            </Pressable>
          </View>

          <ScrollView
            onScroll={handleBottomNavScroll}
            scrollEventThrottle={16}
            contentContainerStyle={[
              homeCleanStyles.content,
              desktop && homeCleanStyles.contentDesktop,
            ]}
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={[
                "rgba(255,253,252,.98)",
                "rgba(255,239,243,.94)",
                "rgba(255,250,248,.98)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                homeCleanStyles.hero,
                compactHome && homeCleanStyles.heroCompactMobile,
              ]}
            >
              <LinearGradient
                pointerEvents="none"
                colors={[
                  "rgba(126,0,27,.24)",
                  "rgba(194,10,58,.06)",
                  "transparent",
                ]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={homeCleanStyles.heroAccent}
              />
              <View
                pointerEvents="none"
                style={homeCleanStyles.heroInnerHighlight}
              />
              <Text style={homeCleanStyles.heroSpark}>✦</Text>
              <View
                style={[
                  homeCleanStyles.dailyCount,
                  compactHome && homeCleanStyles.dailyCountCompact,
                ]}
              >
                <Text
                  style={[
                    homeCleanStyles.statNumber,
                    compactHome && homeCleanStyles.statNumberCompact,
                  ]}
                >
                  {swipeDeck.length}
                </Text>
                <Text style={homeCleanStyles.introLabel}>INTRODUCTIONS</Text>
                <Text style={homeCleanStyles.statLabel}>curated for you</Text>
              </View>
              <View style={homeCleanStyles.heroCopy}>
                <Text
                  accessibilityRole="header"
                  style={homeCleanStyles.heroTitle}
                >
                  Chosen around your future.
                </Text>
                <Text style={homeCleanStyles.heroBody}>
                  {swipeDeck.length} thoughtful introductions. Clear intent
                  before chemistry, with room for a real conversation.
                </Text>
                <View style={homeCleanStyles.faceStack}>
                  {swipeDeck.slice(0, 4).map((match, index) => (
                    <Image
                      accessible
                      accessibilityLabel={`${match.name} profile photo`}
                      key={match.id}
                      source={{ uri: match.photo }}
                      style={[
                        homeCleanStyles.miniProfile,
                        { marginLeft: index ? -9 : 0 },
                      ]}
                    />
                  ))}
                  <View style={homeCleanStyles.moreProfiles}>
                    <Text style={homeCleanStyles.moreProfilesText}>
                      +{Math.max(0, swipeDeck.length - 4)}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            <IntentPassportCard
              input={passportInput}
              compact
              onEdit={() => navigate("alignment")}
            />

            {crossedPaths && (
              <Pressable
                onPress={() => navigate("discovery")}
                style={homeCleanStyles.crossedMini}
              >
                <GlowIcon icon="location" size={32} glowColor="#D4AF37" />
                <Text style={homeCleanStyles.crossedText}>
                  Crossed paths is on — nearby profiles are included privately.
                </Text>
                <GlowIcon
                  icon="chevron-forward"
                  size={28}
                  glowColor="#D4AF37"
                />
              </Pressable>
            )}

            {featured && (
              <View style={homeCleanStyles.featuredWrap}>
                <View style={homeCleanStyles.sectionRow}>
                  <Text style={styles.sectionLabel}>YOUR TOP MATCH</Text>
                  <Pressable onPress={() => openDetail(featured)}>
                    <Text style={homeCleanStyles.sectionLink}>
                      View full story →
                    </Text>
                  </Pressable>
                </View>
                <MatchCard
                  featuredHome
                  match={featured}
                  reasons={
                    featured.reasons ?? matchReasons(featured, preferences)
                  }
                  onPress={() => openDetail(featured)}
                  onInterested={() => onInterested(featured)}
                  onSkip={() => onSkip(featured)}
                  onRose={() => onRose(featured)}
                />
              </View>
            )}

            <View
              style={[
                homeCleanStyles.ideaPanel,
                compactHome && homeCleanStyles.ideaPanelCompact,
              ]}
            >
              <View
                style={
                  compactHome ? homeCleanStyles.ideaHeadingCompact : { flex: 1 }
                }
              >
                <Text style={homeCleanStyles.ideaTitle}>
                  Explore ideas together
                </Text>
                <Text style={homeCleanStyles.ideaBody}>
                  Start better conversations
                </Text>
              </View>
              {[
                {
                  label: "Future Plans",
                  count: "12 questions",
                  icon: "calendar-outline" as const,
                  screen: "blueprint" as Screen,
                },
                {
                  label: "Deal Breakers",
                  count: "8 questions",
                  icon: "shield-checkmark-outline" as const,
                  screen: "readiness" as Screen,
                },
                {
                  label: "Fun & Vibes",
                  count: "10 questions",
                  icon: "happy-outline" as const,
                  screen: "coach" as Screen,
                },
              ].map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => navigate(item.screen)}
                  style={homeCleanStyles.ideaTile}
                >
                  <GlowIcon icon={item.icon} size={34} />
                  <Text style={homeCleanStyles.ideaTileText}>{item.label}</Text>
                  <View style={homeCleanStyles.ideaMetaRow}>
                    <Text style={homeCleanStyles.ideaCount}>{item.count}</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={13}
                      color={colors.wine}
                    />
                  </View>
                </Pressable>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Romantic Gifts"
              onPress={() => navigate("gifts")}
              style={giftMarketplaceStyles.homeEntry}
            >
              <LinearGradient
                colors={["#4A0010", "#9D0A2E", "#D02B51"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={giftMarketplaceStyles.homeEntryGlow} />
              <GlowIcon icon="gift" size={56} />
              <View style={{ flex: 1 }}>
                <Text style={giftMarketplaceStyles.homeEntryEyebrow}>
                  ROMANTIC GIFTS
                </Text>
                <Text style={giftMarketplaceStyles.homeEntryTitle}>
                  Send a beautiful surprise in four steps.
                </Text>
                <Text style={giftMarketplaceStyles.homeEntryBody}>
                  Flowers, love notes, sweet treats and cozy date-night
                  gifts—without exchanging addresses.
                </Text>
              </View>
              <GlowIcon icon="arrow-forward" size={34} />
            </Pressable>

            <View style={homeCleanStyles.trustStrip}>
              {[
                {
                  title: "Verified & Safe",
                  body: "Real people. Real intentions.",
                  icon: "shield-checkmark" as const,
                },
                {
                  title: "Curated Daily",
                  body: "Quality over quantity.",
                  icon: "sparkles" as const,
                },
                {
                  title: "Privacy First",
                  body: "You are in control.",
                  icon: "lock-closed" as const,
                },
                {
                  title: "Made for Serious",
                  body: "Connections with purpose.",
                  icon: "heart" as const,
                },
              ].map((item) => (
                <View key={item.title} style={homeCleanStyles.trustItem}>
                  <GlowIcon icon={item.icon} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text style={homeCleanStyles.trustTitle}>{item.title}</Text>
                    <Text style={homeCleanStyles.trustBody}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            {!items.length && (
              <View style={[shared.card, homeCleanStyles.emptyCard]}>
                <GlowIcon
                  icon={
                    matchLoadState === "error"
                      ? "cloud-offline-outline"
                      : matchLoadState === "loading"
                        ? "hourglass-outline"
                        : "heart-outline"
                  }
                  size={58}
                />
                <Text style={styles.cardTitle}>
                  {matchLoadState === "error"
                    ? "Could not load your matches"
                    : matchLoadState === "loading"
                      ? "Curating your matches…"
                      : matchLoadState === "preview"
                        ? "No profiles match these filters"
                        : "Your next introduction is being curated"}
                </Text>
                <Text style={[styles.helper, { textAlign: "center" }]}>
                  {matchLoadState === "error"
                    ? "We will never replace unavailable member data with demo profiles. Check your connection and try again."
                    : matchLoadState === "loading"
                      ? "Verified profiles are loading securely."
                      : matchLoadState === "preview"
                        ? "Try widening age, city, vibe or family filters."
                        : poolMessage}
                </Text>
                {matchLoadState === "error" ? (
                  <Button
                    label="Try again"
                    icon="refresh"
                    onPress={onRetryMatches}
                  />
                ) : matchLoadState === "preview" ? (
                  <Button
                    label="Adjust filters"
                    onPress={() => navigate("discovery")}
                  />
                ) : poolNeedsVerification ? (
                  <Button
                    label="Complete verification"
                    icon="shield-checkmark-outline"
                    onPress={() => navigate("verifyHub")}
                  />
                ) : poolNeedsPreferences ? (
                  <Button
                    label="Complete preferences"
                    icon="options-outline"
                    onPress={() => navigate("discovery")}
                  />
                ) : matchLoadState === "ready" ? (
                  <Button
                    label="Review preferences"
                    icon="options-outline"
                    onPress={() => navigate("discovery")}
                  />
                ) : null}
              </View>
            )}
          </ScrollView>
          {!desktop && (
            <BottomNav active="home" navigate={navigate} light referenceIcons />
          )}
        </View>
      </SafeAreaView>
    </PremiumBackground>
  );
}
