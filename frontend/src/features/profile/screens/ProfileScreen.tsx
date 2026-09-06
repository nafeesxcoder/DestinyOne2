import React, { useState } from "react";
import {
  Image,
  Modal,
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

import { Button, Chip, shared } from "../../../components";
import {
  BottomNav,
  handleBottomNavScroll,
} from "../../../components/navigation/BottomNav";
import {
  MiniPremiumIcon,
  PremiumIcon,
  type PremiumIconTone,
} from "../../../components/premium/PremiumIcon";
import { SheetHeader } from "../../../components/sheets/SheetHeader";
import type { Screen } from "../../../app/navigation/types";
import type {
  CoupleModeState,
  ExperienceMode,
} from "../../../domain/coupleMode";
import type { ProfileDraft } from "../../../storage";
import { colors } from "../../../theme";
import {
  chatStyles,
  discoveryStyles,
  mediaStyles,
  profilePremiumStyles,
  referralStyles,
  settingsSheetStyles,
  styles,
} from "../../../theme/appStyles";

// ✅ CORRECTED PATH (4 levels up to project root)
const backgroundImage = require("../../../../assets/background.png");

export function ProfileScreen({
  experienceMode,
  connectionStatus,
  partnerName,
  onModeChange,
  onOpenTool,
  profile,
  verified,
  profilePhoto,
  hasVoiceIntro,
  lastSeenVisible,
  analyticsConsent,
  preview,
  initialSettingsOpen = false,
  showReset = true,
  resetLabel,
  onLastSeenVisibleChange,
  onAnalyticsConsentChange,
  onInvite,
  navigate,
  onReset,
  onLogout,
  onDeactivate,
  onDeletePermanently,
}: {
  experienceMode: ExperienceMode;
  connectionStatus: CoupleModeState["connection"]["status"];
  partnerName?: string;
  onModeChange: (mode: ExperienceMode) => void;
  onOpenTool: (tool: "gift" | "games") => void;
  profile: ProfileDraft;
  verified: boolean;
  profilePhoto?: string;
  hasVoiceIntro: boolean;
  lastSeenVisible: boolean;
  analyticsConsent: boolean;
  preview: boolean;
  initialSettingsOpen?: boolean;
  showReset?: boolean;
  resetLabel: string;
  onLastSeenVisibleChange: (value: boolean) => void;
  onAnalyticsConsentChange: (value: boolean) => void;
  onInvite: () => void;
  navigate: (s: Screen) => void;
  onReset: () => void;
  onLogout?: () => void;
  onDeactivate?: () => void;
  onDeletePermanently?: () => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(initialSettingsOpen);
  const { width } = useWindowDimensions();
  const compactProfile = width < 560;
  const wideProfile = width >= 760;
  const isCoupleMode = experienceMode === "couple";
  const displayName = profile.firstName.trim() || "Member";
  const displayAge = profile.age.trim() || (preview ? "30" : "");
  const displayCity =
    profile.city.trim() || (preview ? "New York, NY" : "City not added");
  const displayProfession =
    profile.profession.trim() ||
    (preview ? "Professional" : "Profession not added");
  const profileStrength =
    (verified ? 34 : 16) +
    (profilePhoto ? 20 : 0) +
    (hasVoiceIntro ? 18 : 0) +
    16 +
    12;
  const profileActions = isCoupleMode
    ? [
        {
          label: "Couple details",
          body: "Names, city and connection",
          icon: "heart-outline" as const,
          tone: "rose" as PremiumIconTone,
          onPress: () => navigate("coupleSetup"),
        },
        {
          label: "Send a gift",
          body: partnerName
            ? `A thoughtful moment for ${partnerName}`
            : "Connect your partner first",
          icon: "gift-outline" as const,
          tone: "gold" as PremiumIconTone,
          onPress: () => onOpenTool("gift"),
        },
        {
          label: "Trust hub",
          body: "Verification and identity",
          icon: "shield-checkmark-outline" as const,
          tone: "gold" as PremiumIconTone,
          onPress: () => navigate("verifyHub"),
        },
        {
          label: "Safety",
          body: "Privacy and support",
          icon: "lock-closed-outline" as const,
          tone: "gold" as PremiumIconTone,
          onPress: () => navigate("safety"),
        },
      ]
    : [
        {
          label: "Edit profile",
          body: "Photos and details",
          icon: "person-outline" as const,
          tone: "rose" as PremiumIconTone,
          onPress: () => navigate("profileSetup"),
        },
        {
          label: "Preferences",
          body: "Intent and filters",
          icon: "options-outline" as const,
          tone: "rose" as PremiumIconTone,
          onPress: () => navigate("discovery"),
        },
        {
          label: "Trust hub",
          body: "Verification and vouches",
          icon: "shield-checkmark-outline" as const,
          tone: "gold" as PremiumIconTone,
          onPress: () => navigate("verifyHub"),
        },
        {
          label: "Safety",
          body: "Privacy and support",
          icon: "lock-closed-outline" as const,
          tone: "gold" as PremiumIconTone,
          onPress: () => navigate("safety"),
        },
      ];
  const experienceActions = isCoupleMode
    ? [
        {
          label: "Our Chat",
          body: "Private conversation",
          icon: "chatbubble-ellipses-outline" as const,
          tone: "ruby" as PremiumIconTone,
          onPress: () => navigate("chat"),
        },
        {
          label: "Dates & Events",
          body: "Plan something together",
          icon: "calendar-outline" as const,
          tone: "rose" as PremiumIconTone,
          onPress: () => navigate("events"),
        },
        {
          label: "Membership",
          body: "Plans and billing",
          icon: "diamond-outline" as const,
          tone: "gold" as PremiumIconTone,
          onPress: () => navigate("pricing"),
        },
        {
          label: "Help",
          body: "Private assistance",
          icon: "help-circle-outline" as const,
          tone: "dark" as PremiumIconTone,
          onPress: () => navigate("support"),
        },
      ]
    : [
        {
          label: "Relationship Coach",
          body: "Thoughtful guidance",
          icon: "sparkles-outline" as const,
          tone: "plum" as PremiumIconTone,
          onPress: () => navigate("coach"),
        },
        {
          label: "Dates & Events",
          body: "Plan something real",
          icon: "calendar-outline" as const,
          tone: "rose" as PremiumIconTone,
          onPress: () => navigate("events"),
        },
        {
          label: "Executive Circle",
          body: "Career-minded members",
          icon: "briefcase-outline" as const,
          tone: "gold" as PremiumIconTone,
          onPress: () => navigate("executive"),
        },
        {
          label: "Help",
          body: "Private assistance",
          icon: "help-circle-outline" as const,
          tone: "dark" as PremiumIconTone,
          onPress: () => navigate("support"),
        },
      ];
  const profileStats = [
    {
      value: profilePhoto ? "1 / 3" : "0 / 3",
      label: "Photos",
      icon: "images-outline" as const,
    },
    {
      value: `${Math.min(100, profileStrength)}%`,
      label: "Strength",
      icon: "sparkles-outline" as const,
    },
    {
      value: lastSeenVisible ? "Visible" : "Hidden",
      label: "Activity",
      icon: lastSeenVisible
        ? ("eye-outline" as const)
        : ("eye-off-outline" as const),
    },
  ];
  return (
    <View style={{ flex: 1 }}>
      <Image
        source={backgroundImage}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          onScroll={handleBottomNavScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            profilePremiumStyles.content,
            { paddingHorizontal: compactProfile ? 16 : 24 },
          ]}
        >
          <View style={profilePremiumStyles.pageHeader}>
            <View>
              <Text style={styles.kicker}>YOUR DESTINYONE</Text>
              <Text accessibilityRole="header" style={shared.h2}>
                Your profile
              </Text>
              <Text style={profilePremiumStyles.pageSubtitle}>
                Manage how you show up, what you share and where you go next.
              </Text>
            </View>
            <View style={shared.spacer} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open account settings"
              onPress={() => setSettingsOpen(true)}
              style={profilePremiumStyles.settingsButton}
            >
              <Ionicons name="settings-outline" size={21} color={colors.wine} />
            </Pressable>
          </View>
          <LinearGradient
            colors={["#FBE8EC", "#FFF9F7", "#FFF7E6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={profilePremiumStyles.hero}
          >
            <View style={profilePremiumStyles.heroGlow} />
            <View style={profilePremiumStyles.heroGlowGold} />
            <View
              style={[
                profilePremiumStyles.heroIdentity,
                wideProfile && profilePremiumStyles.heroIdentityWide,
              ]}
            >
              <View style={profilePremiumStyles.avatarHalo}>
                <View style={profilePremiumStyles.avatarRing}>
                  {profilePhoto ? (
                    <Image
                      accessible
                      accessibilityLabel={`${displayName} profile photo`}
                      source={{ uri: profilePhoto }}
                      style={profilePremiumStyles.avatarPhoto}
                    />
                  ) : (
                    <Text style={profilePremiumStyles.avatarInitial}>
                      {displayName[0]?.toUpperCase() ?? "D"}
                    </Text>
                  )}
                </View>
                <View style={profilePremiumStyles.statusGem}>
                  <MiniPremiumIcon
                    name="diamond"
                    tone="gold"
                    size={30}
                    iconSize={14}
                  />
                </View>
              </View>
              <View
                style={[
                  profilePremiumStyles.heroCopy,
                  wideProfile && profilePremiumStyles.heroCopyWide,
                ]}
              >
                <View
                  style={[
                    profilePremiumStyles.nameRow,
                    wideProfile && { justifyContent: "flex-start" },
                  ]}
                >
                  <Text style={profilePremiumStyles.name}>
                    {displayName}
                    {displayAge ? `, ${displayAge}` : ""}
                  </Text>
                  {verified && (
                    <MiniPremiumIcon
                      name="shield-checkmark"
                      tone="gold"
                      size={31}
                      iconSize={14}
                    />
                  )}
                </View>
                <Text
                  style={[
                    profilePremiumStyles.meta,
                    wideProfile && { textAlign: "left" },
                  ]}
                >
                  {displayProfession} · {displayCity}
                </Text>
                <View
                  style={[
                    mediaStyles.mediaBadges,
                    wideProfile && { justifyContent: "flex-start" },
                  ]}
                >
                  {verified && <Chip label="Selfie verified" selected />}
                  {hasVoiceIntro && <Chip label="Voice intro" selected />}
                  <Chip
                    label={isCoupleMode ? "Couple Mode" : "Serious intent"}
                    gold
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                  onPress={() => navigate("profileSetup")}
                  style={profilePremiumStyles.editButton}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                  <Text style={profilePremiumStyles.editButtonText}>
                    Edit profile
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={profilePremiumStyles.stats}>
              {profileStats.map((stat) => (
                <View key={stat.label} style={profilePremiumStyles.stat}>
                  <Ionicons name={stat.icon} size={16} color={colors.wine} />
                  <Text style={profilePremiumStyles.statValue}>
                    {stat.value}
                  </Text>
                  <Text style={profilePremiumStyles.statLabel}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={profilePremiumStyles.progressLabelRow}>
              <Text style={profilePremiumStyles.progressLabel}>
                Profile completion
              </Text>
              <Text style={profilePremiumStyles.progressValue}>
                {Math.min(100, profileStrength)}%
              </Text>
            </View>
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel="Profile completion"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.min(100, profileStrength),
                text: `${Math.min(100, profileStrength)} percent complete`,
              }}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, profileStrength)}
              aria-valuetext={`${Math.min(100, profileStrength)} percent complete`}
              style={profilePremiumStyles.progressTrack}
            >
              <LinearGradient
                colors={[colors.wine, colors.pinkSoft, colors.gold]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  width: `${Math.min(100, profileStrength)}%`,
                  height: "100%",
                  borderRadius: 4,
                }}
              />
            </View>
          </LinearGradient>
          <View style={profilePremiumStyles.experienceCard}>
            <View style={shared.row}>
              <PremiumIcon
                name={isCoupleMode ? "heart-circle" : "search-circle"}
                tone={isCoupleMode ? "gold" : "ruby"}
                size={48}
                iconSize={22}
              />
              <View style={{ flex: 1, marginLeft: 11 }}>
                <Text style={styles.kicker}>APP EXPERIENCE</Text>
                <Text style={profilePremiumStyles.experienceTitle}>
                  {isCoupleMode
                    ? "Using DestinyOne together"
                    : "Looking for your person"}
                </Text>
                <Text style={profilePremiumStyles.experienceBody}>
                  {isCoupleMode
                    ? `${connectionStatus === "active" && partnerName ? `Connected with ${partnerName}. ` : ""}Matches, Discover and Likes are hidden.`
                    : "Serious introductions and matching tools are active."}
                </Text>
              </View>
            </View>
            <View style={profilePremiumStyles.experienceChoices}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: !isCoupleMode }}
                onPress={() => onModeChange("seeking")}
                style={[
                  profilePremiumStyles.experienceChoice,
                  !isCoupleMode && profilePremiumStyles.experienceChoiceOn,
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={17}
                  color={!isCoupleMode ? "#FFFFFF" : colors.muted}
                />
                <Text
                  style={[
                    profilePremiumStyles.experienceChoiceText,
                    !isCoupleMode &&
                      profilePremiumStyles.experienceChoiceTextOn,
                  ]}
                >
                  Find my person
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: isCoupleMode }}
                onPress={() => onModeChange("couple")}
                style={[
                  profilePremiumStyles.experienceChoice,
                  isCoupleMode && profilePremiumStyles.experienceChoiceOn,
                ]}
              >
                <Ionicons
                  name="heart-outline"
                  size={17}
                  color={isCoupleMode ? "#FFFFFF" : colors.muted}
                />
                <Text
                  style={[
                    profilePremiumStyles.experienceChoiceText,
                    isCoupleMode && profilePremiumStyles.experienceChoiceTextOn,
                  ]}
                >
                  With my partner
                </Text>
              </Pressable>
            </View>
          </View>
          {!isCoupleMode && (
            <View style={profilePremiumStyles.readinessCard}>
              <View style={profilePremiumStyles.readinessHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.kicker}>PROFILE READINESS</Text>
                  <Text style={profilePremiumStyles.readinessHeading}>
                    Make every impression count.
                  </Text>
                  <Text style={profilePremiumStyles.readinessIntro}>
                    Complete these essentials to build trust before the first
                    conversation.
                  </Text>
                </View>
                <View style={profilePremiumStyles.readinessScore}>
                  <Text style={profilePremiumStyles.readinessScoreText}>
                    {Math.min(100, profileStrength)}%
                  </Text>
                </View>
              </View>
              <ProfileReadinessItem
                title="Photos feel real"
                body={
                  profilePhoto
                    ? "Main photo is added. Add 2 more for better trust."
                    : "Add a warm, clear photo before going live."
                }
                done={!!profilePhoto}
                icon="image-outline"
              />
              <ProfileReadinessItem
                title="Verified trust badge"
                body={
                  verified
                    ? "Verified badge is active."
                    : "Complete selfie verification to reduce drop-offs."
                }
                done={verified}
                icon="shield-checkmark-outline"
              />
              <ProfileReadinessItem
                title="Voice intro"
                body={
                  hasVoiceIntro
                    ? "Voice intro is ready for Plus members."
                    : "Add a 10-second intro so serious matches feel safer."
                }
                done={hasVoiceIntro}
                icon="mic-outline"
              />
              <Button
                label={verified ? "Open Trust Hub" : "Finish verification"}
                icon="shield-checkmark"
                variant={verified ? "secondary" : "gold"}
                onPress={() => navigate("verifyHub")}
              />
            </View>
          )}
          {!isCoupleMode && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Invite a verified friend and get seven days of Base"
              onPress={onInvite}
              style={referralStyles.profileBanner}
            >
              <LinearGradient
                colors={["rgba(212,175,55,.18)", "rgba(229,9,47,.12)"]}
                style={StyleSheet.absoluteFill}
              />
              <PremiumIcon name="gift" tone="gold" size={52} iconSize={24} />
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>DESTINY PASS</Text>
                <Text style={styles.cardTitle}>
                  Invite a friend · Get 7 days
                </Text>
                <Text style={styles.helper}>
                  Your pass unlocks after their verified profile is complete.
                </Text>
              </View>
              <MiniPremiumIcon
                name="chevron-forward"
                tone="dark"
                size={32}
                iconSize={15}
              />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open DestinyOne membership"
            onPress={() => navigate("pricing")}
          >
            <LinearGradient
              colors={["#FCE9ED", "#FFF8EF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={profilePremiumStyles.membershipCard}
            >
              <PremiumIcon
                name="diamond-outline"
                tone="ruby"
                size={48}
                iconSize={22}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>DESTINYONE MEMBERSHIP</Text>
                <Text style={profilePremiumStyles.membershipTitle}>
                  More thoughtful possibilities.
                </Text>
                <Text style={profilePremiumStyles.membershipBody}>
                  Explore premium introductions, advanced filters and
                  relationship tools.
                </Text>
              </View>
              <View style={profilePremiumStyles.cardArrow}>
                <Ionicons name="arrow-forward" size={18} color={colors.wine} />
              </View>
            </LinearGradient>
          </Pressable>
          <View style={profilePremiumStyles.actionSection}>
            <View style={profilePremiumStyles.sectionHeadingRow}>
              <Text style={styles.sectionLabel}>PROFILE & PRIVACY</Text>
              <Text style={profilePremiumStyles.sectionHint}>
                Tap to manage
              </Text>
            </View>
            <View style={profilePremiumStyles.actionGrid}>
              {profileActions.map((action) => (
                <ProfileActionTile
                  compact={compactProfile}
                  {...action}
                  key={action.label}
                />
              ))}
            </View>
          </View>
          <View style={profilePremiumStyles.actionSection}>
            <View style={profilePremiumStyles.sectionHeadingRow}>
              <Text style={styles.sectionLabel}>YOUR DESTINYONE</Text>
              <Text style={profilePremiumStyles.sectionHint}>
                Explore your tools
              </Text>
            </View>
            <View style={profilePremiumStyles.actionGrid}>
              {experienceActions.map((action) => (
                <ProfileActionTile
                  compact={compactProfile}
                  {...action}
                  key={action.label}
                />
              ))}
            </View>
          </View>
          {onLogout && (
            <Pressable onPress={onLogout} style={styles.resetButton}>
              <MiniPremiumIcon
                name="log-out-outline"
                tone="ruby"
                size={34}
                iconSize={16}
              />
              <Text style={styles.resetText}>Log out</Text>
            </Pressable>
          )}
          {onDeactivate && (
            <Pressable onPress={onDeactivate} style={styles.resetButton}>
              <MiniPremiumIcon
                name="pause-circle-outline"
                tone="ruby"
                size={34}
                iconSize={16}
              />
              <Text style={styles.resetText}>Deactivate account</Text>
            </Pressable>
          )}
          {onDeletePermanently && (
            <Pressable onPress={onDeletePermanently} style={styles.resetButton}>
              <MiniPremiumIcon
                name="trash-outline"
                tone="ruby"
                size={34}
                iconSize={16}
              />
              <Text style={styles.resetText}>Delete account permanently</Text>
            </Pressable>
          )}
          {showReset && !onLogout && (
            <Pressable onPress={onReset} style={styles.resetButton}>
              <MiniPremiumIcon
                name="log-out-outline"
                tone="ruby"
                size={34}
                iconSize={16}
              />
              <Text style={styles.resetText}>{resetLabel}</Text>
            </Pressable>
          )}
        </ScrollView>
        <ProfileSettingsSheet
          preview={preview}
          mode={experienceMode}
          visible={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          lastSeenVisible={lastSeenVisible}
          analyticsConsent={analyticsConsent}
          onLastSeenVisibleChange={onLastSeenVisibleChange}
          onAnalyticsConsentChange={onAnalyticsConsentChange}
          navigate={(screen) => {
            setSettingsOpen(false);
            navigate(screen);
          }}
        />
        <BottomNav
          active="profile"
          mode={experienceMode}
          onOpenTool={onOpenTool}
          navigate={navigate}
        />
      </SafeAreaView>
    </View>
  );
}

function ProfileActionTile({
  label,
  body,
  icon,
  tone,
  onPress,
  compact,
}: {
  label: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: PremiumIconTone;
  onPress: () => void;
  compact: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={body}
      onPress={onPress}
      style={[
        profilePremiumStyles.actionTile,
        compact && profilePremiumStyles.actionTileCompact,
      ]}
    >
      <PremiumIcon name={icon} tone={tone} size={44} iconSize={20} />
      <View style={profilePremiumStyles.actionCopy}>
        <Text style={profilePremiumStyles.actionTitle}>{label}</Text>
        <Text style={profilePremiumStyles.actionBody}>{body}</Text>
      </View>
      <View style={profilePremiumStyles.cardArrow}>
        <Ionicons name="chevron-forward" size={17} color={colors.wine} />
      </View>
    </Pressable>
  );
}

function ProfileSettingsSheet({
  preview,
  mode,
  visible,
  onClose,
  lastSeenVisible,
  analyticsConsent,
  onLastSeenVisibleChange,
  onAnalyticsConsentChange,
  navigate,
}: {
  preview: boolean;
  mode: ExperienceMode;
  visible: boolean;
  onClose: () => void;
  lastSeenVisible: boolean;
  analyticsConsent: boolean;
  onLastSeenVisibleChange: (value: boolean) => void;
  onAnalyticsConsentChange: (value: boolean) => void;
  navigate: (s: Screen) => void;
}) {
  const isCoupleMode = mode === "couple";
  const [notifications, setNotifications] = useState(true);
  const [pauseDiscovery, setPauseDiscovery] = useState(false);
  const [privateMode, setPrivateMode] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState(
    "Your privacy controls are ready.",
  );
  const unavailable = () =>
    setSettingsStatus(
      "Secure account settings connection required. No local-only change was applied.",
    );
  const toggleNotifications = () => {
    if (!preview) {
      unavailable();
      return;
    }
    const next = !notifications;
    setNotifications(next);
    setSettingsStatus(
      next
        ? isCoupleMode
          ? "Notifications are on for messages, plans, gifts and calls."
          : "Notifications are on for matches, Sparks and calls."
        : "Notifications are off.",
    );
  };
  const togglePrivateMode = () => {
    if (!preview) {
      unavailable();
      return;
    }
    const next = !privateMode;
    setPrivateMode(next);
    setSettingsStatus(
      next
        ? "Private profile mode is on. You are hidden from discovery."
        : "Private profile mode is off. You can appear in discovery again.",
    );
  };
  const togglePauseDiscovery = () => {
    if (!preview) {
      unavailable();
      return;
    }
    const next = !pauseDiscovery;
    setPauseDiscovery(next);
    setSettingsStatus(
      next
        ? "Discovery is paused. New daily introductions will wait."
        : "Discovery is active again.",
    );
  };
  const toggleLastSeen = () => {
    const next = !lastSeenVisible;
    onLastSeenVisibleChange(next);
    setSettingsStatus(
      preview
        ? next
          ? isCoupleMode
            ? "Last online is visible to your partner."
            : "Last online is visible to matches."
          : isCoupleMode
            ? "Last online is hidden from your partner."
            : "Last online is hidden from matches."
        : "Saving visibility through your secure account…",
    );
  };
  const toggleAnalytics = () => {
    const next = !analyticsConsent;
    onAnalyticsConsentChange(next);
    setSettingsStatus(
      preview
        ? next
          ? "Anonymous product analytics enabled. Private content and profile IDs stay excluded."
          : "Product analytics disabled. New journey events will not be stored."
        : "Saving analytics consent through your secure account…",
    );
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "90%" }]}>
        <SheetHeader
          title="Account settings"
          subtitle="Privacy, notifications and control"
          onClose={onClose}
        />
        <View style={settingsSheetStyles.hero}>
          <PremiumIcon name="settings" tone="gold" size={50} iconSize={23} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Private by default.</Text>
            <Text style={styles.helper}>
              Your choices can be changed anytime.
            </Text>
          </View>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 9 }}
        >
          <SettingsSwitch
            icon="notifications-outline"
            title={
              isCoupleMode
                ? "Message, plan & call notifications"
                : "Match & message notifications"
            }
            body={
              isCoupleMode
                ? "Get alerts from your connected partner, shared plans, gifts and calls."
                : "Get alerts for matches, Sparks, calls and support updates."
            }
            value={notifications}
            onPress={toggleNotifications}
          />
          {!isCoupleMode && (
            <>
              <SettingsSwitch
                icon="eye-off-outline"
                title="Private profile mode"
                body="Hide from discovery while you review likes and chats."
                value={privateMode}
                onPress={togglePrivateMode}
              />
              <SettingsSwitch
                icon="pause-circle-outline"
                title="Pause discovery"
                body="Stop appearing in new daily match decks temporarily."
                value={pauseDiscovery}
                onPress={togglePauseDiscovery}
              />
            </>
          )}
          <SettingsSwitch
            icon={lastSeenVisible ? "time-outline" : "eye-off-outline"}
            title="Show last online"
            body={
              lastSeenVisible
                ? isCoupleMode
                  ? "Your partner can see a recent online hint."
                  : "Matches can see a recent online hint."
                : isCoupleMode
                  ? "Last online is hidden from your partner."
                  : "Last online is hidden from matches."
            }
            value={lastSeenVisible}
            onPress={toggleLastSeen}
          />
          <SettingsSwitch
            icon="analytics-outline"
            title="Anonymous product analytics"
            body="Measure stage and consent choices only. Names, profile IDs, messages, photos and precise location are excluded."
            value={analyticsConsent}
            onPress={toggleAnalytics}
          />
          <View style={settingsSheetStyles.statusCard}>
            <MiniPremiumIcon
              name={preview ? "checkmark-circle" : "shield-checkmark-outline"}
              tone="gold"
              size={28}
              iconSize={13}
            />
            <Text style={settingsSheetStyles.statusText}>{settingsStatus}</Text>
          </View>
          <View style={settingsSheetStyles.shortcutGrid}>
            <Pressable
              onPress={() => navigate("safety")}
              style={settingsSheetStyles.shortcut}
            >
              <MiniPremiumIcon
                name="shield-checkmark-outline"
                tone="gold"
                size={30}
                iconSize={14}
              />
              <Text style={settingsSheetStyles.shortcutText}>Safety</Text>
            </Pressable>
            {!isCoupleMode && (
              <Pressable
                onPress={() => navigate("discovery")}
                style={settingsSheetStyles.shortcut}
              >
                <MiniPremiumIcon
                  name="options-outline"
                  tone="rose"
                  size={30}
                  iconSize={14}
                />
                <Text style={settingsSheetStyles.shortcutText}>Filters</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => navigate("support")}
              style={settingsSheetStyles.shortcut}
            >
              <MiniPremiumIcon
                name="help-circle-outline"
                tone="rose"
                size={30}
                iconSize={14}
              />
              <Text style={settingsSheetStyles.shortcutText}>Support</Text>
            </Pressable>
          </View>
          <Button label="Done" variant="secondary" onPress={onClose} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SettingsSwitch({
  icon,
  title,
  body,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      onPress={onPress}
      style={settingsSheetStyles.switchRow}
    >
      <PremiumIcon
        name={icon}
        tone={value ? "gold" : "dark"}
        size={42}
        iconSize={19}
      />
      <View style={{ flex: 1 }}>
        <Text style={settingsSheetStyles.switchTitle}>{title}</Text>
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

function ProfileReadinessItem({
  title,
  body,
  done,
  icon,
}: {
  title: string;
  body: string;
  done: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={profilePremiumStyles.readinessItem}>
      <MiniPremiumIcon
        name={done ? "checkmark-circle" : icon}
        tone={done ? "gold" : "rose"}
        size={34}
        iconSize={16}
      />
      <View style={{ flex: 1 }}>
        <Text style={profilePremiumStyles.readinessTitle}>{title}</Text>
        <Text style={styles.helper}>{body}</Text>
      </View>
    </View>
  );
}
