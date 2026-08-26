import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme';

const RULES = [
  'Meet in a public place with an easy exit.',
  'Keep early plans inside the app until both people feel ready.',
  'Do not share a home address or send money to someone you have not met.',
];

export function SafetyRules() {
  return (
    <View className="p-[15px] rounded-[21px] bg-[#FFF5E3] border border-[#ECD59D] gap-2.5">
      <Text className="font-poppins-bold text-[13px] text-plum">A good first-date standard</Text>
      {RULES.map((rule) => (
        <View key={rule} className="flex-row gap-2 items-start">
          <Ionicons name="checkmark-circle" size={16} color={colors.gold} />
          <Text className="flex-1 font-poppins-regular text-[10px] leading-[14px] text-[#675344]">{rule}</Text>
        </View>
      ))}
    </View>
  );
}
