import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function ReadinessHero({ score, completed, total }: { score: number; completed: number; total: number }) {
  return (
    <LinearGradient colors={['#5A1023', '#2A0710']} className="p-5 rounded-[24px] gap-3.5 shadow-[0_0_16px_rgba(110,17,42,.17)]">
      <View className="flex-row gap-4 items-center">
        <View className="w-[82px] h-[82px] rounded-[41px] bg-[#FFF5DD] border-2 border-gold items-center justify-center">
          <Text className="font-poppins-bold text-[27px] leading-[31px] text-plum">{score}</Text>
          <Text className="font-poppins-bold text-[8.5px] tracking-[1px] text-[#8C6716]">READY</Text>
        </View>
        <View className="flex-1">
          <Text className="font-poppins-bold text-[9px] tracking-[1.1px] text-[#F6CC7D]">FOR YOUR EYES ONLY</Text>
          <Text className="font-poppins-bold text-[21px] text-ivory mt-0.5">A calmer way to get ready.</Text>
          <Text className="font-poppins-regular text-[11.5px] leading-[17px] text-[#F4DDE1] mt-1">
            No public score, no ranking. Just a private check on the things that make a first conversation feel more real.
          </Text>
        </View>
      </View>
      <View className="h-[7px] rounded-lg bg-white/20 overflow-hidden">
        <View className="h-full rounded-lg bg-gold" style={{ width: `${score}%` }} />
      </View>
      <Text className="font-poppins-semibold text-[10.5px] text-[#F8E6C6]">
        {completed} of {total} foundations feel ready
      </Text>
    </LinearGradient>
  );
}
