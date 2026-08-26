import React, { type ReactNode } from "react";
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

import { shared } from "../../../components";
import {
  BottomNav,
  handleBottomNavScroll,
} from "../../../components/navigation/BottomNav";
import { type PremiumIconTone } from "../../../components/premium/PremiumIcon";
import { relationshipJourneySteps } from "../../../domain/featureFocus";
import type { Screen } from "../../../app/navigation/types";
import { colors } from "../../../theme";
import {
  conciergeStyles,
  focusStyles,
  giftMarketplaceStyles,
  homeCleanStyles,
  styles,
} from "../../../theme/appStyles";

const accessibilityHitSlop = {
  top: 12,
  right: 12,
  bottom: 12,
  left: 12,
} as const;

const backgroundImage = require("../../../../assets/background.png");

function PremiumBackground({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, overflow: "hidden", backgroundColor: "#FFF7F7" }}>
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

export function ExploreHubScreen({
  navigate,
}: {
  navigate: (screen: Screen) => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const relationshipTools = [
    {
      title: "Match preferences",
      body: "Intent, family, distance and future-plan filters.",
      icon: "options-outline" as const,
      tone: "rose" as const,
      target: "discovery" as Screen,
    },
    {
      title: "Relationship coach",
      body: "Thoughtful prompts, profile polish and safety-aware support.",
      icon: "sparkles-outline" as const,
      tone: "plum" as const,
      target: "coach" as Screen,
    },
    {
      title: "Trusted Circle",
      body: "Private character vouches from people who know you well.",
      icon: "people-outline" as const,
      tone: "gold" as const,
      target: "circle" as Screen,
    },
    {
      title: "Relationship readiness",
      body: "A private check-in for profile clarity, intent and trust.",
      icon: "heart-circle-outline" as const,
      tone: "gold" as const,
      target: "readiness" as Screen,
    },
    {
      title: "City community rooms",
      body: "Small hosted circles for local people and real plans.",
      icon: "people-circle-outline" as const,
      tone: "plum" as const,
      target: "community" as Screen,
    },
    {
      title: "Relationship Blueprint",
      body: "Private future essentials, ready to share only when you choose.",
      icon: "finger-print-outline" as const,
      tone: "gold" as const,
      target: "blueprint" as Screen,
    },
  ];
  const confidenceTools = [
    {
      title: "Trust & verification",
      body: "Selfie, voice, ID and account trust controls.",
      icon: "shield-checkmark-outline" as const,
      tone: "rose" as const,
      target: "verifyHub" as Screen,
    },
    {
      title: "Two-person date journey",
      body: "A calm path from first hello to a thoughtful next plan.",
      icon: "map-outline" as const,
      tone: "rose" as const,
      target: "journey" as Screen,
    },
    {
      title: "Date Safety Concierge",
      body: "Private check-ins, trusted contacts and public-first planning.",
      icon: "shield-checkmark-outline" as const,
      tone: "plum" as const,
      target: "dateSafety" as Screen,
    },
  ];
  return (
    <PremiumBackground>
      <SafeAreaView
        style={[shared.safe, { maxWidth: 920, paddingHorizontal: 0 }]}
      >
        <View style={focusStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>DISCOVER WITH INTENTION</Text>
            <Text accessibilityRole="header" style={shared.h2}>
              Your next step
            </Text>
            <Text style={focusStyles.headerBody}>
              Everything that helps a meaningful connection move forward.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={accessibilityHitSlop}
            onPress={() => navigate("profile")}
            style={focusStyles.profileIconButton}
          >
            <GlowIcon icon="person-outline" size={36} />
          </Pressable>
        </View>
        <ScrollView
          onScroll={handleBottomNavScroll}
          scrollEventThrottle={16}
          style={focusStyles.scroll}
          contentContainerStyle={focusStyles.content}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#FFF9F6", "#FCE9EB"]}
            style={[
              focusStyles.welcomeCard,
              wide && focusStyles.welcomeCardWide,
            ]}
          >
            <View style={focusStyles.welcomeCopy}>
              <Text style={focusStyles.welcomeEyebrow}>
                YOUR DISCOVERY SPACE
              </Text>
              <Text accessibilityRole="header" style={focusStyles.welcomeTitle}>
                Find clarity, not more noise.
              </Text>
              <Text style={focusStyles.welcomeBody}>
                Meet thoughtfully selected people, understand what matters, and
                plan the next step at your own pace.
              </Text>
              <View style={focusStyles.welcomeActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigate("home")}
                  style={focusStyles.primaryAction}
                >
                  <Ionicons
                    name="heart-outline"
                    size={16}
                    color={colors.textInverse}
                  />
                  <Text style={focusStyles.primaryActionText}>
                    View today's matches
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => navigate("discovery")}
                  style={focusStyles.secondaryAction}
                >
                  <Ionicons
                    name="options-outline"
                    size={16}
                    color={colors.wine}
                  />
                  <Text style={focusStyles.secondaryActionText}>
                    Refine preferences
                  </Text>
                </Pressable>
              </View>
            </View>
            {wide && (
              <View style={focusStyles.welcomeSeal}>
                <GlowIcon icon="compass" size={62} />
                <Text style={focusStyles.welcomeSealText}>
                  Private by default
                </Text>
              </View>
            )}
          </LinearGradient>
          <View style={focusStyles.journeyPanel}>
            <View style={focusStyles.journeyHeading}>
              <View>
                <Text style={focusStyles.journeyEyebrow}>
                  RELATIONSHIP PATH
                </Text>
                <Text style={focusStyles.journeyTitle}>
                  Move at the pace that feels right.
                </Text>
              </View>
              <Text style={focusStyles.journeyHint}>4 thoughtful stages</Text>
            </View>
            <View style={focusStyles.journeyRail}>
              {relationshipJourneySteps.map((step) => (
                <React.Fragment key={step.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${step.label} stage`}
                    onPress={() => navigate(step.target as Screen)}
                    style={focusStyles.journeyStep}
                  >
                    <GlowIcon
                      icon={step.icon as keyof typeof Ionicons.glyphMap}
                      size={32}
                    />
                    <Text style={focusStyles.journeyLabel}>{step.label}</Text>
                  </Pressable>
                  {step.id !==
                    relationshipJourneySteps[
                      relationshipJourneySteps.length - 1
                    ]?.id && <View style={focusStyles.journeyLine} />}
                </React.Fragment>
              ))}
            </View>
          </View>
          <View
            style={[
              focusStyles.featuredRow,
              wide && focusStyles.featuredRowWide,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Executive Circle"
              onPress={() => navigate("executive")}
              style={[
                focusStyles.executiveCard,
                wide && focusStyles.featuredWide,
              ]}
            >
              <LinearGradient
                colors={["rgba(212,175,55,.18)", "rgba(229,9,47,.08)"]}
                style={StyleSheet.absoluteFill}
              />
              <GlowIcon icon="briefcase" size={50} glowColor="#D4AF37" />
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>EXECUTIVE CIRCLE</Text>
                <Text style={focusStyles.featureTitle}>
                  Selective professional introductions.
                </Text>
                <Text style={focusStyles.featureBody}>
                  Verified career, values and relationship intent for members
                  who prefer a smaller, curated circle.
                </Text>
              </View>
              <GlowIcon icon="chevron-forward" size={28} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open people who liked you"
              onPress={() => navigate("likes")}
              style={[focusStyles.likesCard, wide && focusStyles.likesWide]}
            >
              <GlowIcon icon="heart-circle" size={42} />
              <View style={{ flex: 1 }}>
                <Text style={focusStyles.likesTitle}>People who chose you</Text>
                <Text style={focusStyles.featureBody}>
                  Private interest, kept calm and intentional.
                </Text>
              </View>
              <GlowIcon icon="chevron-forward" size={28} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Romantic Gifts"
            onPress={() => navigate("gifts")}
            style={giftMarketplaceStyles.discoverEntry}
          >
            <LinearGradient
              colors={["#500010", "#A50A31", "#D52E55"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={giftMarketplaceStyles.discoverEntryGlow} />
            <GlowIcon icon="gift" size={54} />
            <View style={{ flex: 1 }}>
              <Text style={giftMarketplaceStyles.discoverEntryEyebrow}>
                NEW · ROMANTIC GIFTS
              </Text>
              <Text style={giftMarketplaceStyles.discoverEntryTitle}>
                A meaningful surprise, delivered beautifully.
              </Text>
              <Text style={giftMarketplaceStyles.discoverEntryBody}>
                Browse thoughtful gifts and complete the request inside
                DestinyOne—no address exchange, no external checkout.
              </Text>
            </View>
            <View style={giftMarketplaceStyles.discoverEntryAction}>
              <Text style={giftMarketplaceStyles.discoverEntryActionText}>
                Explore gifts
              </Text>
              <Ionicons name="arrow-forward" size={15} color="#FFF" />
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Date Concierge"
            onPress={() => navigate("events")}
            style={conciergeStyles.entryCard}
          >
            <LinearGradient
              colors={["#FFF5E6", "#FBE2E2"]}
              style={StyleSheet.absoluteFill}
            />
            <GlowIcon icon="calendar-outline" size={54} />
            <View style={{ flex: 1 }}>
              <Text style={conciergeStyles.entryEyebrow}>DATE CONCIERGE</Text>
              <Text style={conciergeStyles.entryTitle}>
                A lovely plan, without the busy work.
              </Text>
              <Text style={conciergeStyles.entryBody}>
                Find public-first places, date packages and local experiences in
                one calm flow.
              </Text>
            </View>
            <GlowIcon icon="arrow-forward" size={34} />
          </Pressable>
          <View style={focusStyles.sectionHeading}>
            <View>
              <Text style={styles.sectionLabel}>BUILD A STRONGER MATCH</Text>
              <Text style={focusStyles.sectionTitle}>
                Tools for clarity and compatibility
              </Text>
            </View>
            <Text style={homeCleanStyles.sectionHint}>Private by default</Text>
          </View>
          <View
            style={[focusStyles.toolGrid, wide && focusStyles.toolGridWide]}
          >
            {relationshipTools.map((tool) => (
              <ExploreTool
                key={tool.title}
                {...tool}
                wide={wide}
                onPress={() => navigate(tool.target)}
              />
            ))}
          </View>
          <View style={focusStyles.sectionHeading}>
            <View>
              <Text style={styles.sectionLabel}>TRUST & MOMENTUM</Text>
              <Text style={focusStyles.sectionTitle}>
                Move forward with confidence
              </Text>
            </View>
            <GlowIcon icon="shield-checkmark-outline" size={34} />
          </View>
          <View
            style={[
              focusStyles.toolGrid,
              wide && focusStyles.confidenceGridWide,
            ]}
          >
            {confidenceTools.map((tool) => (
              <ExploreTool
                key={tool.title}
                {...tool}
                wide={wide}
                onPress={() => navigate(tool.target)}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open chat"
            onPress={() => navigate("chat")}
            style={focusStyles.boundary}
          >
            <GlowIcon icon="chatbubbles-outline" size={40} />
            <View style={{ flex: 1 }}>
              <Text style={focusStyles.boundaryTitle}>
                Conversation comes first
              </Text>
              <Text style={focusStyles.featureBody}>
                GIFs, games and playful extras stay inside Chat. Romantic gifts
                now have their own clear marketplace, too.
              </Text>
            </View>
            <View style={focusStyles.boundaryAction}>
              <Text style={focusStyles.boundaryActionText}>Open chat</Text>
              <Ionicons
                name="arrow-forward"
                size={14}
                color={colors.textInverse}
              />
            </View>
          </Pressable>
        </ScrollView>
        <BottomNav
          active="explore"
          navigate={navigate}
          referenceIcons
          referenceTiles
        />
      </SafeAreaView>
    </PremiumBackground>
  );
}

function ExploreTool({
  title,
  body,
  icon,
  tone,
  wide,
  onPress,
}: {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: PremiumIconTone;
  wide: boolean;
  onPress: () => void;
}) {
  void tone;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        focusStyles.tool,
        wide && focusStyles.toolWide,
        pressed && focusStyles.toolPressed,
      ]}
    >
      <GlowIcon icon={icon} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={focusStyles.toolTitle}>{title}</Text>
        <Text style={focusStyles.toolBody}>{body}</Text>
      </View>
      <GlowIcon icon="chevron-forward" size={26} />
    </Pressable>
  );
}
