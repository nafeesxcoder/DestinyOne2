import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { PremiumIcon } from '../../components/premium/PremiumIcon';

export function ReferralHero() {
  return (
    <LinearGradient colors={['#49100F', '#18070B']} className="min-h-[188px] rounded-lg p-5 items-center justify-center gap-2 border border-[rgba(212,175,55,.30)] overflow-hidden">
      <View className="w-[70px] h-[70px] rounded-[35px] bg-[rgba(212,175,55,.10)] items-center justify-center">
        <PremiumIcon name="gift" tone="gold" size={58} iconSize={27} />
      </View>
      <Text className="font-poppins-bold text-[9.5px] tracking-[1.7px] text-pinkSoft">BETTER PEOPLE, BETTER MATCHES</Text>
      <Text className="font-poppins-bold text-[23px] leading-[29px] text-white text-center">Invite a friend. Unlock a week.</Text>
      <Text className="font-poppins-semibold text-[11.5px] leading-[17.5px] text-[#F1DDE2] text-center max-w-[470px]">
        Bring someone genuine to DestinyOne. When they verify, your Base Pass is on us.
      </Text>
    </LinearGradient>
  );
}
