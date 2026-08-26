import React from "react";
import {
  Pressable,
  ScrollView,
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
import {
  MiniPremiumIcon,
  PremiumIcon,
} from "../../../components/premium/PremiumIcon";
import type { CoupleConnectionHub } from "../../../domain/coupleConnection";
import type { CoupleModeState } from "../../../domain/coupleMode";
import type { ChatMessage } from "../../../storage";
import type { Screen } from "../../../app/navigation/types";
import { colors } from "../../../theme";
import { coupleHomeStyles, styles } from "../../../theme/appStyles";

export type CoupleHomeTool = "gift" | "games";

export function CoupleHomeScreen({
  state,
  hub,
  memberName,
  city,
  messages,
  onShare,
  onManage,
  onOpenTool,
  navigate,
}: {
  state: CoupleModeState;
  hub: CoupleConnectionHub;
  memberName: string;
  city: string;
  messages: ChatMessage[];
  onShare: () => void;
  onManage: () => void;
  onOpenTool: (tool: CoupleHomeTool) => void;
  navigate: (screen: Screen) => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const compact = width < 430;
  const partnerName = state.connection.partner?.displayName || "Your partner";
  const connected = state.connection.status === "active";
  const incomingCount = hub.incomingRequests.length;
  const outgoingPartner = hub.outgoingRequests[0]?.member.displayName;
  const latestDate = [...messages]
    .reverse()
    .find((message) => message.type === "date" && message.date)?.date;
  const actions = [
    {
      id: "dates",
      title: "Plan a date",
      body: "Places, restaurants, packages and events near you.",
      icon: "calendar" as const,
      tone: "gold" as const,
      onPress: () => navigate("events"),
      locked: false,
    },
    {
      id: "chat",
      title: "Private chat",
      body: "Messages, calls, photos, voice notes and live location.",
      icon: "chatbubble-ellipses" as const,
      tone: "ruby" as const,
      onPress: () => navigate("chat"),
      locked: !connected,
    },
    {
      id: "gift",
      title: "Send a gift",
      body: "Digital moments and real gift delivery with private address consent.",
      icon: "gift" as const,
      tone: "gold" as const,
      onPress: () => onOpenTool("gift"),
      locked: !connected,
    },
    {
      id: "games",
      title: "Play together",
      body: "Conversation games built for couples, not public scores.",
      icon: "game-controller" as const,
      tone: "plum" as const,
      onPress: () => onOpenTool("games"),
      locked: !connected,
    },
  ];
  return (
    <LinearGradient
      colors={["#FFFDFC", "#0A0103", colors.black]}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={[shared.safe, { maxWidth: 920, paddingHorizontal: 0 }]}
      >
        <View style={coupleHomeStyles.header}>
          <View style={{ flex: 1 }}>
            <Text style={coupleHomeStyles.brand}>
              DESTINY<Text style={{ color: colors.gold }}>ONE</Text>
            </Text>
            <Text style={shared.h2}>Our space</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            onPress={() => navigate("profile")}
          >
            <PremiumIcon
              name="person-outline"
              tone="dark"
              size={40}
              iconSize={19}
            />
          </Pressable>
        </View>
        <ScrollView
          onScroll={handleBottomNavScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={coupleHomeStyles.content}
        >
          <LinearGradient
            colors={[
              "rgba(153,10,38,.92)",
              "rgba(74,4,20,.94)",
              "rgba(42,24,7,.96)",
            ]}
            style={coupleHomeStyles.hero}
          >
            <View style={coupleHomeStyles.heroGlow} />
            <View style={coupleHomeStyles.avatarPair}>
              <View style={coupleHomeStyles.initialAvatar}>
                <Text style={coupleHomeStyles.initialText}>
                  {(memberName || "Y")[0]?.toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  coupleHomeStyles.initialAvatar,
                  coupleHomeStyles.partnerAvatar,
                ]}
              >
                <Text style={coupleHomeStyles.initialText}>
                  {partnerName[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={coupleHomeStyles.heartSeal}>
                <Ionicons name="heart" size={18} color="#2A1005" />
              </View>
            </View>
            <Text style={coupleHomeStyles.heroEyebrow}>
              {connected
                ? "PRIVATE COUPLE SPACE"
                : incomingCount
                  ? "REQUEST WAITING"
                  : outgoingPartner
                    ? "REQUEST SENT"
                    : "PARTNER CONNECTION NEEDED"}
            </Text>
            <Text style={coupleHomeStyles.heroTitle}>
              {connected
                ? `${memberName || "You"} & ${partnerName}`
                : incomingCount
                  ? "Someone wants to connect."
                  : outgoingPartner
                    ? `Waiting for ${outgoingPartner}`
                    : "Build this space together"}
            </Text>
            <Text style={coupleHomeStyles.heroBody}>
              {connected
                ? `Your chat, plans and shared moments stay together in one calm place${city ? ` around ${city}` : ""}.`
                : incomingCount
                  ? "Review their minimal profile and accept only if you personally know them."
                  : outgoingPartner
                    ? "They will see your request in their Couple Mode account. Shared tools unlock after acceptance."
                    : "Search the exact verified phone number, send a request, and wait for your partner to accept."}
            </Text>
            <View style={coupleHomeStyles.statusPill}>
              <View
                style={[
                  coupleHomeStyles.statusDot,
                  connected && coupleHomeStyles.statusDotOn,
                ]}
              />
              <Text style={coupleHomeStyles.statusText}>
                {connected
                  ? "Two-person space connected"
                  : incomingCount
                    ? `${incomingCount} request${incomingCount === 1 ? "" : "s"} waiting`
                    : outgoingPartner
                      ? "Partner approval pending"
                      : "Not connected yet"}
              </Text>
            </View>
          </LinearGradient>
          <View style={coupleHomeStyles.sectionHead}>
            <Text style={styles.sectionLabel}>TOGETHER TOOLS</Text>
            <Text style={coupleHomeStyles.sectionMeta}>Matching is off</Text>
          </View>
          <View
            style={[
              coupleHomeStyles.actionGrid,
              wide && coupleHomeStyles.actionGridWide,
            ]}
          >
            {actions.map((action) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={action.title}
                key={action.id}
                onPress={action.onPress}
                style={[
                  coupleHomeStyles.action,
                  wide && coupleHomeStyles.actionWide,
                  compact && coupleHomeStyles.actionCompact,
                ]}
              >
                <PremiumIcon
                  name={action.icon}
                  tone={action.tone}
                  size={48}
                  iconSize={22}
                />
                <View style={{ flex: 1 }}>
                  <Text style={coupleHomeStyles.actionTitle}>
                    {action.title}
                  </Text>
                  <Text style={coupleHomeStyles.actionBody}>{action.body}</Text>
                </View>
                {action.locked ? (
                  <MiniPremiumIcon
                    name="lock-closed"
                    tone="dark"
                    size={28}
                    iconSize={13}
                  />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={colors.muted}
                  />
                )}
              </Pressable>
            ))}
          </View>
          {latestDate ? (
            <Pressable
              onPress={() => navigate("chat")}
              style={coupleHomeStyles.nextPlan}
            >
              <PremiumIcon
                name="calendar"
                tone="gold"
                size={46}
                iconSize={21}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>NEXT SHARED PLAN</Text>
                <Text style={coupleHomeStyles.planTitle}>
                  {latestDate.venue}
                </Text>
                <Text style={styles.helper}>
                  {latestDate.time} · {latestDate.area}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gold} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => navigate("events")}
              style={coupleHomeStyles.nextPlan}
            >
              <PremiumIcon
                name="sparkles"
                tone="gold"
                size={46}
                iconSize={21}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>MAKE A MEMORY</Text>
                <Text style={coupleHomeStyles.planTitle}>
                  Choose your next date.
                </Text>
                <Text style={styles.helper}>
                  Explore nearby cafés, restaurants, activities and complete
                  date packages.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gold} />
            </Pressable>
          )}
          <View style={coupleHomeStyles.connectionRow}>
            <View style={{ flex: 1 }}>
              <Text style={coupleHomeStyles.connectionTitle}>
                Your two-person connection
              </Text>
              <Text style={styles.helper}>
                No contacts are uploaded. Connection requires an exact phone
                search and your partner's approval.
              </Text>
            </View>
            <Pressable
              onPress={connected ? onShare : onManage}
              style={coupleHomeStyles.connectionButton}
            >
              <Ionicons
                name={
                  connected
                    ? "share-social-outline"
                    : incomingCount
                      ? "mail-unread-outline"
                      : "search-outline"
                }
                size={17}
                color={colors.gold}
              />
              <Text style={coupleHomeStyles.connectionButtonText}>
                {connected
                  ? "Share app"
                  : incomingCount
                    ? "Review"
                    : "Find partner"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
        <BottomNav
          active="home"
          mode="couple"
          onOpenTool={onOpenTool}
          navigate={navigate}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}
