import React, { type ReactNode } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, SectionTitle, shared } from "../../../components";
import { BottomNav } from "../../../components/navigation/BottomNav";
import {
  MiniPremiumIcon,
  PremiumIcon,
} from "../../../components/premium/PremiumIcon";
import { matches } from "../../../data";
import type { Screen } from "../../../app/navigation/types";
import { styles } from "../../../theme/appStyles";

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

export function LikesScreen({
  preview,
  previewLikeCount,
  openPricing,
  navigate,
}: {
  preview: boolean;
  previewLikeCount: number;
  openPricing: () => void;
  navigate: (screen: Screen) => void;
}) {
  return (
    <PremiumBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 22, paddingBottom: 120, gap: 25 }}
        >
          <SectionTitle
            eyebrow="Private & intentional"
            title="People who noticed you."
            body={
              preview
                ? `${previewLikeCount} people have shown private interest. Upgrade to see everyone.`
                : "Incoming interest stays private and appears only after secure account sync."
            }
          />
          {preview ? (
            <View style={styles.likesGrid}>
              {matches.slice(0, 2).map((match) => (
                <View key={match.id} style={styles.likeCard}>
                  <Image
                    source={{ uri: match.photo }}
                    blurRadius={18}
                    style={styles.fill}
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(11,11,15,.9)"]}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.likeLock}>
                    <MiniPremiumIcon
                      name="lock-closed"
                      tone="gold"
                      size={34}
                      iconSize={16}
                    />
                  </View>
                  <Text style={styles.likeText}>
                    Someone in {match.city.split(",")[0]}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[shared.card, { gap: 12, alignItems: "center" }]}>
              <PremiumIcon
                name="lock-closed"
                tone="gold"
                size={54}
                iconSize={25}
              />
              <Text style={styles.cardTitle}>Secure likes sync required</Text>
              <Text style={[styles.helper, { textAlign: "center" }]}>
                DestinyOne will not show sample people or invented like counts.
                Your verified incoming interests will appear here when the live
                likes feed is connected.
              </Text>
            </View>
          )}
          <View style={[shared.card, { gap: 14, borderColor: "#6C5520" }]}>
            <PremiumIcon name="sparkles" tone="gold" size={48} iconSize={22} />
            <Text style={styles.cardTitle}>See who chose you</Text>
            <Text style={shared.body}>
              {preview
                ? "Plus members can see likes, meet up to 5 daily matches, and hear voice intros."
                : "Membership access will unlock verified incoming interests after entitlement and likes sync are both active."}
            </Text>
            <Button
              label="Explore DestinyOne Plus"
              variant="gold"
              onPress={openPricing}
            />
          </View>
        </ScrollView>
        <BottomNav active="explore" navigate={navigate} />
      </SafeAreaView>
    </PremiumBackground>
  );
}
