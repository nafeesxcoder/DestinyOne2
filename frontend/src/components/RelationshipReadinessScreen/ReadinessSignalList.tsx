import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MiniPremiumIcon } from '../../components/premium/PremiumIcon';
import { colors } from '../../theme';

export type ReadinessSignal = {
  label: string;
  body: string;
  done: boolean;
  icon: keyof typeof Ionicons.glyphMap;
};

export function ReadinessSignalList({ signals }: { signals: ReadinessSignal[] }) {
  return (
    <View className="gap-2.5">
      {signals.map((signal) => (
        <View
          key={signal.label}
          className={`flex-row gap-2.5 items-center p-3.5 rounded-[18px] border ${
            signal.done ? 'bg-[#FFFDF8] border-[#E7CC83]' : 'bg-white border-[#EBDCD7]'
          }`}
        >
          <MiniPremiumIcon name={signal.done ? 'checkmark' : 'ellipse-outline'} tone={signal.done ? 'gold' : 'dark'} size={34} iconSize={15} />
          <View className="flex-1">
            <Text className="font-poppins-bold text-[12.5px] text-plum">{signal.label}</Text>
            <Text className="font-poppins-regular text-[10.5px] leading-[15px] text-[#75666B] mt-0.5">{signal.body}</Text>
          </View>
          <Ionicons name={signal.icon} size={18} color={signal.done ? colors.gold : '#88747A'} />
        </View>
      ))}
    </View>
  );
}
