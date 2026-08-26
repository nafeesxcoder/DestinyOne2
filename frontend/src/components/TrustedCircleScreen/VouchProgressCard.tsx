import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme';

export function VouchProgressCard({ vouches }: { vouches: string[] }) {
  return (
    <View className="gap-3.5 p-[17px] rounded-[22px] bg-surface border border-line">
      <View className="flex-row items-center">
        <Text className="font-poppins-bold text-[16px] text-ivory">Your circle</Text>
        <View className="flex-1" />
        <Text className="font-poppins-bold text-[11px] text-pinkSoft">{vouches.length}/3 vouched</Text>
      </View>
      <View className="h-[5px] flex-row gap-[5px]">
        {[0, 1, 2].map((index) => (
          <View key={index} className={`flex-1 rounded-[3px] ${index < vouches.length ? 'bg-pink' : 'bg-line'}`} />
        ))}
      </View>
      {vouches.length ? (
        <View className="flex-row flex-wrap gap-1.5 mt-2">
          {vouches.map((value) => (
            <View key={value} className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-[14px] bg-[rgba(229,9,47,.1)] border border-[rgba(229,9,47,.28)]">
              <Ionicons name="checkmark" size={12} color={colors.pinkSoft} />
              <Text className="font-poppins-semibold text-[10px] text-[#F5D6DA]">{value}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="font-poppins-regular text-[12.5px] text-muted">
          No vouches yet. Your friends answer privately from the invite link.
        </Text>
      )}
    </View>
  );
}
