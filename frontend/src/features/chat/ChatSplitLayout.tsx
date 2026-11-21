import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/** Width from which chats show side by side (list left, chat right). */
export const CHAT_SPLIT_MIN_WIDTH = 900;

/**
 * Phone: the list OR the open chat fills the screen.
 * Desktop/tablet: WhatsApp Web style — the list stays on the left and the
 * open chat (or a "pick a chat" panel) is on the right. The list keeps the
 * same position in the tree, so it is not reloaded when a chat is opened.
 */
export function ChatSplitLayout({
  wide,
  showingChat,
  list,
  children,
}: {
  wide: boolean;
  showingChat: boolean;
  list: React.ReactNode;
  /** The open chat. */
  children: React.ReactNode;
}) {
  if (!wide) return <>{showingChat ? children : list}</>;
  return (
    <View style={splitStyles.root}>
      <View style={splitStyles.listPane}>{list}</View>
      <View style={splitStyles.chatPane}>
        {showingChat ? (
          children
        ) : (
          <View style={splitStyles.empty}>
            <Ionicons name="chatbubbles-outline" size={64} color="#7C0015" />
            <Text style={splitStyles.emptyTitle}>Pick a chat</Text>
            <Text style={splitStyles.emptyBody}>
              Choose someone from the list on the left to start talking.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const splitStyles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: "#FFFDFC" },
  listPane: {
    width: 380,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(42,10,16,.18)",
  },
  chatPane: { flex: 1, minWidth: 0 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
    backgroundColor: "#FBF7F2",
  },
  emptyTitle: { fontSize: 22, fontWeight: "800", color: "#2B1A1E" },
  emptyBody: { fontSize: 15, color: "#76686C", textAlign: "center", maxWidth: 360 },
});
