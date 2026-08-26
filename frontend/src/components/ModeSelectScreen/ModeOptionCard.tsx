import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ReferenceIconTile } from '../../components/premium/PremiumIcon';
import { colors } from '../../theme';

export type ModeOption = {
  mode: 'seeking' | 'couple';
  tag: string;
  title: string;
  body: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export function ModeOptionCard({ option, selected, onPress }: { option: ModeOption; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={`p-5 gap-4 rounded-[18px] border ${selected ? 'bg-[#FDEFF1] border-[#D9AA52]' : 'bg-surface border-line'}`}
    >
      <View className="flex-row items-center gap-3.5">
        <ReferenceIconTile name={option.icon} orbSize={44} iconSize={19} tilePadding={14} />
        <View className="flex-1 gap-0.5">
          <Text className="font-poppins-bold text-[10px] tracking-[1.05px] text-gold">{option.tag}</Text>
          <Text className="font-poppins-bold text-[20px] leading-[26px] text-espresso">{option.title}</Text>
          <Text className="font-poppins-semibold text-[14px] leading-5 text-muted">{option.body}</Text>
        </View>
        <View
          className={`items-center justify-center rounded-[15px] ${
            selected ? 'min-w-[82px] px-2.5 flex-row gap-1 bg-[#FFF5D8] border border-[#E3BE67]' : 'min-w-[30px] h-[30px]'
          }`}
        >
          {selected ? (
            <>
              <Ionicons name="checkmark" size={12} color={colors.gold} />
              <Text className="font-poppins-bold text-[8.5px] tracking-[.55px] text-[#82611F]">SELECTED</Text>
            </>
          ) : (
            <Ionicons name="ellipse-outline" size={20} color={colors.muted} />
          )}
        </View>
      </View>
      <View className="pt-3.5 border-t border-[#E9D9D0] flex-row items-start gap-2">
        <Ionicons
          name={option.mode === 'seeking' ? 'sparkles-outline' : 'lock-closed-outline'}
          size={15}
          color={selected ? colors.gold : colors.pinkSoft}
        />
        <Text className="flex-1 font-poppins-semibold text-[12.5px] leading-[18px] text-[#66565D]">{option.detail}</Text>
      </View>
    </Pressable>
  );
}
