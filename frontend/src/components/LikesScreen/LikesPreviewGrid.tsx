import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MiniPremiumIcon } from '../../components/premium/PremiumIcon';
import type { Match } from '../../data';

/**
 * Shows blurred preview cards for the first couple of matches, teasing
 * "someone in <city> liked you" without revealing identity (preview mode).
 */
export function LikesPreviewGrid({ items }: { items: Match[] }) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((match) => (
        <View key={match.id} className="w-[47%] aspect-[3/4] rounded-2xl overflow-hidden bg-surface2">
          <Image source={{ uri: match.photo }} blurRadius={18} className="absolute inset-0 w-full h-full" />
          <LinearGradient colors={['transparent', 'rgba(11,11,15,.9)']} style={StyleSheet.absoluteFill} />
          <View className="absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-black/35 items-center justify-center">
            <MiniPremiumIcon name="lock-closed" tone="gold" size={34} iconSize={16} />
          </View>
          <Text className="absolute bottom-2.5 left-2.5 right-2.5 font-poppins-semibold text-[12px] text-white">
            Someone in {match.city.split(',')[0]}
          </Text>
        </View>
      ))}
    </View>
  );
}
