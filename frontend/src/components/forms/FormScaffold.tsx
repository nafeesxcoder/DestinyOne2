import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { StepBar, shared } from "../../components";
import { ReferenceIconTile } from "../premium/PremiumIcon";
import { colors } from "../../theme";
import { styles } from "../../theme/appStyles";

type FormPageProps = {
  children: React.ReactNode;
  back?: () => void;
  step?: number;
  scroll?: boolean;
  /** Shows a "Skip" button top-right so the member can move on without filling this step. */
  onSkip?: () => void;
  skipLabel?: string;
};

export function FormPage({
  children,
  back,
  step,
  scroll: _scroll,
  onSkip,
  skipLabel = "Skip",
}: FormPageProps) {
  void _scroll;
  const inner = (
    <View style={[shared.content, formPageStyles.content]}>
      {(back || step || onSkip) && (
        <View style={{ gap: 18 }}>
          <View style={formPageStyles.headerRow}>
            {back ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={back}
                style={styles.backButton}
              >
                <ReferenceIconTile
                  name="arrow-back"
                  orbSize={30}
                  iconSize={14}
                  tilePadding={10}
                />
              </Pressable>
            ) : (
              <View style={{ height: 42 }} />
            )}
            {onSkip && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${skipLabel} this step`}
                hitSlop={10}
                onPress={onSkip}
                style={({ pressed }) => [
                  formPageStyles.skipButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={formPageStyles.skipText}>{skipLabel}</Text>
                <Ionicons
                  name="play-skip-forward"
                  size={13}
                  color="#7C0015"
                />
              </Pressable>
            )}
          </View>
          {step && <StepBar step={step} total={6} />}
        </View>
      )}
      {children}
    </View>
  );

  return (
    <View
      style={{ flex: 1, overflow: "hidden", backgroundColor: "transparent" }}
    >
      <SafeAreaView style={shared.safe}>
        <KeyboardAvoidingView
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : Platform.OS === "android"
                ? "height"
                : undefined
          }
          style={formPageStyles.keyboard}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            // On web, react-native-web's "on-drag" closes the keyboard on ANY
            // scroll event, including the browser's own scroll-into-view when
            // a field is focused. That made the keyboard close before it even
            // opened and kicked the page down, so fields couldn't be tapped.
            keyboardDismissMode={
              Platform.OS === "web"
                ? "none"
                : Platform.OS === "ios"
                  ? "interactive"
                  : "on-drag"
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={formPageStyles.scrollContent}
          >
            {inner}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function Segment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.segmentItem, active && styles.segmentActive]}
    >
      <Text
        style={[styles.segmentText, active && { color: colors.textInverse }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const formPageStyles = StyleSheet.create({
  keyboard: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 42,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,.88)",
    borderWidth: 1,
    borderColor: "rgba(124,0,21,.28)",
  },
  skipText: { color: "#7C0015", fontWeight: "700", fontSize: 14 },
  scrollContent: { flexGrow: 1, paddingBottom: 34 },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingBottom: 28,
  },
});
