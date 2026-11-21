import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { ChatConversationSummary } from "../../api/chatApi";
import { getChatSocket } from "../../api/chatSocket";

const backgroundImage = require("../../../assets/background.png");

const ink = "#2B1A1E";
const muted = "#76686C";
const ruby = "#7C0015";
const unreadRed = "#E5092F";

/** WhatsApp-style time: 2:14 PM today, "Yesterday", weekday this week, else a date. */
function formatListTime(at: number) {
  const date = new Date(at);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (at >= startOfToday)
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (at >= startOfToday - dayMs) return "Yesterday";
  if (at >= startOfToday - 6 * dayMs)
    return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function Avatar({ name, photo }: { name: string; photo: string }) {
  const [failed, setFailed] = useState(false);
  if (photo && !failed)
    return (
      <Image
        source={{ uri: photo }}
        style={listStyles.avatar}
        onError={() => setFailed(true)}
      />
    );
  return (
    <View style={[listStyles.avatar, listStyles.avatarFallback]}>
      <Text style={listStyles.avatarInitial}>
        {(name.trim()[0] || "?").toUpperCase()}
      </Text>
    </View>
  );
}

function ConversationRow({
  item,
  active,
  onPress,
}: {
  item: ChatConversationSummary;
  active: boolean;
  onPress: () => void;
}) {
  const last = item.lastMessage;
  const unread = item.unreadCount > 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${item.name}${unread ? `, ${item.unreadCount} unread` : ""}`}
      onPress={onPress}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        listStyles.row,
        active && listStyles.rowActive,
        pressed && listStyles.rowPressed,
      ]}
    >
      <Avatar name={item.name} photo={item.photo} />
      <View style={listStyles.rowBody}>
        <View style={listStyles.rowTop}>
          <Text numberOfLines={1} style={listStyles.name}>
            {item.name}
          </Text>
          {!!last && (
            <Text style={[listStyles.time, unread && listStyles.timeUnread]}>
              {formatListTime(last.at)}
            </Text>
          )}
        </View>
        <View style={listStyles.rowBottom}>
          {last?.mine && !!last.status && (
            <Ionicons
              name={last.status === "sent" ? "checkmark" : "checkmark-done"}
              size={16}
              color={last.status === "read" ? "#1D9BF0" : muted}
              style={{ marginRight: 3 }}
            />
          )}
          <Text
            numberOfLines={1}
            style={[listStyles.preview, unread && listStyles.previewUnread]}
          >
            {last
              ? last.preview
              : `You matched${item.city ? ` · ${item.city}` : ""} — say hello 👋`}
          </Text>
          {unread && (
            <View style={listStyles.badge}>
              <Text style={listStyles.badgeText}>
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export function ChatListScreen({
  loadConversations,
  onOpenConversation,
  onFindMatches,
  emptyTitle = "No chats yet",
  emptyBody = "When you and someone both say yes, they appear here and you can start talking.",
  emptyActionLabel = "See my matches",
  activeId = null,
  onHome,
  footer,
}: {
  /** The chat open next to the list (desktop), highlighted in the list. */
  activeId?: string | null;
  /** Shows a Home button in the header (used when there is no bottom nav). */
  onHome?: () => void;
  /** Returns the member's chats; throws when they cannot be loaded. */
  loadConversations: () => Promise<ChatConversationSummary[]>;
  onOpenConversation: (item: ChatConversationSummary) => void;
  onFindMatches: () => void;
  emptyTitle?: string;
  emptyBody?: string;
  emptyActionLabel?: string;
  /** Rendered below the list (the bottom navigation). */
  footer?: React.ReactNode;
}) {
  const [items, setItems] = useState<ChatConversationSummary[] | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  // The parent passes a new function on every render; read the latest one
  // through a ref so the list is not refetched each time.
  const loaderRef = useRef(loadConversations);
  loaderRef.current = loadConversations;
  const refresh = useCallback(async () => {
    try {
      const next = await loaderRef.current();
      setItems(next);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chats could not be loaded");
      setItems((current) => current ?? []);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // New messages and read ticks arrive over the socket: keep the list live.
    const socket = getChatSocket();
    const onChange = () => void refresh();
    socket?.on("message:new", onChange);
    socket?.on("message:status", onChange);
    // Fallback for when the socket is not connected.
    const timer = setInterval(onChange, 20000);
    return () => {
      socket?.off("message:new", onChange);
      socket?.off("message:status", onChange);
      clearInterval(timer);
    };
  }, [refresh]);

  // Opening a chat marks its messages read: refresh so its badge clears.
  useEffect(() => {
    if (!activeId) return;
    const timer = setTimeout(() => void refresh(), 1500);
    return () => clearTimeout(timer);
  }, [activeId, refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!items) return [];
    if (!q) return items;
    return items.filter((item) =>
      `${item.name} ${item.city} ${item.profession}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  const totalUnread = (items ?? []).reduce((sum, item) => sum + item.unreadCount, 0);

  return (
    <View style={listStyles.root}>
      <Image source={backgroundImage} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={[listStyles.header, listStyles.headerRow]}>
          <View style={{ flex: 1 }}>
            <Text style={listStyles.title}>Chats</Text>
            {totalUnread > 0 && (
              <Text style={listStyles.subtitle}>
                {totalUnread} unread {totalUnread === 1 ? "message" : "messages"}
              </Text>
            )}
          </View>
          {onHome && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go to home"
              onPress={onHome}
              hitSlop={8}
              style={listStyles.homeButton}
            >
              <Ionicons name="home-outline" size={20} color={ruby} />
            </Pressable>
          )}
        </View>
        <View style={listStyles.searchBox}>
          <Ionicons name="search" size={18} color={muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search chats"
            placeholderTextColor={muted}
            style={listStyles.searchInput}
            accessibilityLabel="Search chats"
            returnKeyType="search"
          />
          {!!query && (
            <Pressable accessibilityLabel="Clear search" onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={muted} />
            </Pressable>
          )}
        </View>

        {items === null ? (
          <View style={listStyles.center}>
            <ActivityIndicator color={ruby} />
          </View>
        ) : (
          <FlatList
            style={listStyles.panel}
            contentContainerStyle={filtered.length ? undefined : { flexGrow: 1 }}
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ConversationRow
                item={item}
                active={item.id === activeId}
                onPress={() => onOpenConversation(item)}
              />
            )}
            ItemSeparatorComponent={() => <View style={listStyles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                tintColor={ruby}
                onRefresh={async () => {
                  setRefreshing(true);
                  await refresh();
                  setRefreshing(false);
                }}
              />
            }
            ListHeaderComponent={
              error ? (
                <Pressable onPress={() => void refresh()} style={listStyles.errorBar}>
                  <Ionicons name="cloud-offline-outline" size={16} color={ruby} />
                  <Text style={listStyles.errorText}>{error} · Tap to retry</Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              query ? (
                <View style={listStyles.center}>
                  <Text style={listStyles.emptyBody}>No chats match “{query.trim()}”.</Text>
                </View>
              ) : (
                <View style={listStyles.center}>
                  <Ionicons name="chatbubbles-outline" size={46} color={ruby} />
                  <Text style={listStyles.emptyTitle}>{emptyTitle}</Text>
                  <Text style={listStyles.emptyBody}>{emptyBody}</Text>
                  <Pressable onPress={onFindMatches} style={listStyles.emptyButton}>
                    <Text style={listStyles.emptyButtonText}>{emptyActionLabel}</Text>
                  </Pressable>
                </View>
              )
            }
          />
        )}
        {/* Room for the floating bottom navigation. */}
        <View style={{ height: footer ? 96 : 12 }} />
      </SafeAreaView>
      {footer}
    </View>
  );
}

const listStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFDFC", overflow: "hidden" },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  title: { fontSize: 30, fontWeight: "800", color: ink },
  subtitle: { marginTop: 2, fontSize: 13, color: ruby, fontWeight: "600" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,.92)",
    borderWidth: 1,
    borderColor: "rgba(124,0,21,.14)",
  },
  searchInput: { flex: 1, fontSize: 15, color: ink, paddingVertical: 0 },
  panel: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,.94)",
    width: "auto",
    maxWidth: 720,
    alignSelf: "stretch",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowPressed: { backgroundColor: "rgba(124,0,21,.06)" },
  rowActive: { backgroundColor: "rgba(124,0,21,.10)" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  homeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.92)",
    borderWidth: 1,
    borderColor: "rgba(124,0,21,.18)",
  },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#F7E4E8" },
  avatarFallback: { alignItems: "center", justifyContent: "center", backgroundColor: ruby },
  avatarInitial: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },
  rowBody: { flex: 1, minWidth: 0, gap: 4 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: "700", color: ink },
  time: { fontSize: 12, color: muted },
  timeUnread: { color: unreadRed, fontWeight: "700" },
  rowBottom: { flexDirection: "row", alignItems: "center" },
  preview: { flex: 1, fontSize: 14, color: muted },
  previewUnread: { color: ink, fontWeight: "600" },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: unreadRed,
  },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(42,10,16,.12)", marginLeft: 80 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 10 },
  emptyTitle: { fontSize: 19, fontWeight: "800", color: ink },
  emptyBody: { fontSize: 14, color: muted, textAlign: "center", lineHeight: 20 },
  emptyButton: {
    marginTop: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: ruby,
  },
  emptyButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  errorBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(229,9,47,.08)",
  },
  errorText: { flex: 1, color: ruby, fontSize: 13, fontWeight: "600" },
});
