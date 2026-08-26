import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function CircleHero() {
  return (
    <View className="items-center gap-2.5">
      <View className="w-[225px] h-[135px] justify-center items-center">
        <View className="absolute w-[67px] h-[67px] rounded-[34px] border-[3px] border-[#33070F] items-center justify-center left-0.5 top-[42px] bg-[#7F1D68]">
          <Text className="font-poppins-bold text-[25px] text-ivory">S</Text>
        </View>
        <View className="absolute w-[67px] h-[67px] rounded-[34px] border-[3px] border-[#33070F] items-center justify-center right-0.5 top-[42px] bg-[#42307D]">
          <Text className="font-poppins-bold text-[25px] text-ivory">R</Text>
        </View>
        <View className="w-[102px] h-[102px] rounded-[51px] bg-[#6D1022] border-[3px] border-pink items-center justify-center shadow-[0_0_18px_rgba(179,12,61,.35)]">
          <Text className="font-poppins-bold text-[39px] text-ivory">A</Text>
          <View className="absolute right-px bottom-1.5 w-[27px] h-[27px] rounded-[14px] bg-pink items-center justify-center border-2 border-[#33070F]">
            <Ionicons name="checkmark" size={16} color="#2B1A1E" />
          </View>
        </View>
      </View>
      <Text className="font-poppins-bold text-[10px] tracking-[1.2px] text-gold">TRUSTED CIRCLE</Text>
      <Text className="font-poppins-bold text-[29px] text-ivory text-center">
        The people who know you, know your heart.
      </Text>
      <Text className="font-poppins-regular text-[14px] text-ivory text-center">
        Invite up to 3 close friends to vouch for your character—not your dating choices.
      </Text>
    </View>
  );
}
