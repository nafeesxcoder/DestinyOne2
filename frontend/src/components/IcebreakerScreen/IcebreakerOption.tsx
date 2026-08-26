import React from 'react';
import { Pressable, Text } from 'react-native';

import { MiniPremiumIcon } from '../../components/premium/PremiumIcon';

export function IcebreakerOption({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`p-[18px] rounded-[18px] border flex-row items-center ${
        selected ? 'border-[#C97D8D] bg-[#F7E4E8] shadow-[0_4px_10px_rgba(179,12,61,.08)]' : 'border-line bg-surface'
      } ${disabled ? 'opacity-70' : ''}`}
    >
      <Text className={`flex-1 font-poppins-semibold text-[14px] ${selected ? 'text-[#2B1A1E]' : 'text-ivory'}`}>{label}</Text>
      <MiniPremiumIcon name={selected ? 'checkmark-circle' : 'ellipse-outline'} tone={selected ? 'gold' : 'dark'} size={34} iconSize={16} />
    </Pressable>
  );
}
