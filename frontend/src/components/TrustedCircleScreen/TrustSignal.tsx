import React from 'react';
import { Text, View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

import { PremiumIcon } from '../../components/premium/PremiumIcon';

export function TrustSignal({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) {
  return (
    <View className="p-3.5 rounded-2xl bg-white/[.045] border border-white/[.08] flex-row items-center gap-2.5">
      <PremiumIcon name={icon} tone="ruby" size={38} iconSize={17} />
      <View className="flex-1">
        <Text className="font-poppins-bold text-[11.5px] text-ivory">{title}</Text>
        <Text className="font-poppins-regular text-[9.5px] leading-[14px] text-muted mt-0.5">{body}</Text>
      </View>
    </View>
  );
}
