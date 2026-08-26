import React, { type ReactNode } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { SectionTitle, shared } from "../../../components";
import { FormPage } from "../../../components/forms/FormScaffold";
import type { ExperienceMode } from "../../../domain/coupleMode";
import { colors } from "../../../theme";
import { coupleModeStyles } from "../../../theme/appStyles";

const backgroundImage = require("../../../../assets/background.png");

/* =========================================================
   GLOW ICON (Dark red background)
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

export function ModeSelectScreen({
  mode,
  onChange,
  onNext,
}: {
  mode: ExperienceMode;
  onChange: (mode: ExperienceMode) => void;
  onNext: () => void;
}) {
  const options = [
    {
      mode: "seeking" as const,
      tag: "MEET MODE",
      title: "I am looking for my person",
      body: "Thoughtful introductions for a serious relationship.",
      detail:
        "Five curated introductions each day. Shared values first, conversation after mutual interest.",
      icon: "heart-outline" as const,
    },
    {
      mode: "couple" as const,
      tag: "COUPLE MODE",
      title: "We are already together",
      body: "A private space for your relationship, dates and small moments.",
      detail:
        "Matching stays off. Connect privately, plan dates, exchange gifts and play together.",
      icon: "heart-circle-outline" as const,
    },
  ];
  return (
    <PremiumBackground>
      <FormPage step={3}>
        <SectionTitle
          emphasis
          eyebrow="YOUR DESTINYONE EXPERIENCE"
          title="What brings you here?"
          body="Choose the space that fits your life today. You can change it any time."
        />
        <View style={coupleModeStyles.modeGrid}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: mode === option.mode }}
              key={option.mode}
              onPress={() => onChange(option.mode)}
              style={[
                coupleModeStyles.modeCard,
                mode === option.mode && coupleModeStyles.modeCardOn,
              ]}
            >
              <View style={coupleModeStyles.modeHeader}>
                <GlowIcon
                  icon={option.icon}
                  size={44}
                  color="#FFFFFF"
                  glowColor="#E5092F"
                />
                <View style={coupleModeStyles.modeCopy}>
                  <Text style={coupleModeStyles.modeTag}>{option.tag}</Text>
                  <Text style={coupleModeStyles.modeTitle}>{option.title}</Text>
                  <Text style={coupleModeStyles.modeBody}>{option.body}</Text>
                </View>
                <View
                  style={[
                    coupleModeStyles.modeStatus,
                    mode === option.mode && coupleModeStyles.modeStatusOn,
                  ]}
                >
                  {mode === option.mode ? (
                    <>
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={colors.gold}
                      />
                      <Text style={coupleModeStyles.modeStatusText}>
                        SELECTED
                      </Text>
                    </>
                  ) : (
                    <Ionicons
                      name="ellipse-outline"
                      size={20}
                      color={colors.muted}
                    />
                  )}
                </View>
              </View>
              <View style={coupleModeStyles.modeDetail}>
                <Ionicons
                  name={
                    option.mode === "seeking"
                      ? "sparkles-outline"
                      : "lock-closed-outline"
                  }
                  size={15}
                  color={mode === option.mode ? colors.gold : colors.pinkSoft}
                />
                <Text style={coupleModeStyles.modeDetailText}>
                  {option.detail}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
        <View style={coupleModeStyles.modePromise}>
          <GlowIcon
            icon="lock-closed"
            size={30}
            color="#FFFFFF"
            glowColor="#E5092F"
          />
          <View style={{ flex: 1 }}>
            <Text style={coupleModeStyles.modePromiseTitle}>
              Your choice stays private.
            </Text>
            <Text style={coupleModeStyles.modePromiseBody}>
              You can switch modes later from Profile.
            </Text>
          </View>
        </View>
        <View style={shared.spacer} />

        {/* CUSTOM MAIN BUTTON - dark red gradient */}
        <Pressable
          onPress={onNext}
          style={{ borderRadius: 32, overflow: "hidden" }}
        >
          <LinearGradient
            colors={["#390006", "#7C0015", "#430009", "#210003"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 58,
              borderRadius: 32,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 12,
              borderWidth: 1.5,
              borderColor: "rgba(255,60,80,.62)",
              shadowColor: "#E5092F",
              shadowOpacity: 0.58,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 9 },
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                borderWidth: 1.5,
                borderColor: "rgba(255,255,255,.92)",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "transparent",
                shadowColor: "#FF3357",
                shadowOpacity: 0.65,
                shadowRadius: 8,
              }}
            >
              <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
            </View>
            <Text
              style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 16 }}
            >
              {mode === "couple"
                ? "Set up Couple Mode"
                : "Continue with Meet Mode"}
            </Text>
          </LinearGradient>
        </Pressable>
      </FormPage>
    </PremiumBackground>
  );
}
