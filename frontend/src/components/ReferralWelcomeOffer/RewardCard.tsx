import React from 'react';
import { Text, View } from 'react-native';

import { MiniPremiumIcon } from '../../components/premium/PremiumIcon';

const PERKS = ['5 fresh picks daily', 'Mutual chat', 'Intent filters', 'See profile visitors'];

export function RewardCard() {
  return (
    <View className="gap-2.5 p-3.5 rounded-lg bg-[#FFFAF7] border border-[rgba(229,9,47,.30)]">
      <View className="flex-row items-center gap-2.5">
        <MiniPremiumIcon name="diamond" tone="ruby" size={42} iconSize={19} />
        <View className="flex-1">
          <Text className="font-poppins-bold text-[8.5px] tracking-[1.1px] text-gold">7 DAYS · $45 VALUE</Text>
          <Text className="font-poppins-bold text-[13px] text-espresso mt-0.5">Your Base Pass, on us</Text>
        </View>
        <Text className="font-poppins-bold text-[18px] text-gold">FREE</Text>
      </View>
      <View className="flex-row flex-wrap gap-1.5">
        {PERKS.map((item) => (
          <View key={item} className="px-2 py-1.5 rounded-[7px] bg-[#F8E9EC] border border-[#E8CDD4]">
            <Text className="font-poppins-bold text-[8px] text-[#6D3B49]">{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
