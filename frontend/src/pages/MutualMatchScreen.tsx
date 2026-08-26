import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, shared } from '../components';
import { PremiumIcon } from '../components/premium/PremiumIcon';
import type { Match } from '../data';
import { colors } from '../theme';
import { MatchFaces } from '../components/MutualMatchScreen/MatchFaces';

export function MutualMatchScreen({ match, next, back }: { match: Match; next: () => void; back: () => void }) {
  return (
    <LinearGradient colors={['#2E0710', colors.black, colors.black]} className="flex-1 items-center justify-center">
      <SafeAreaView className="items-center justify-center gap-[26px]" style={shared.safe}>
        <Text className="font-poppins-bold text-[9.5px] tracking-[1.7px] text-pinkSoft">A NEW BEGINNING</Text>

        <MatchFaces photo={match.photo} />

        <View className="items-center gap-2.5">
          <Text className="font-satisfy text-[50px] text-ivory">It’s a Match</Text>
          <Text className="font-poppins-regular text-[14px] leading-[18px] text-ivory text-center max-w-[310px]">
            You and {match.name} both felt something worth exploring.
          </Text>
        </View>

        <View className="w-full gap-3 p-4 rounded-[28px] bg-surface border border-line">
          <View className="flex-row items-center">
            <PremiumIcon name="chatbubbles-outline" tone="gold" size={44} iconSize={20} />
            <Text className="ml-[9px] font-poppins-semibold text-[12px] text-ivory">One little step before hello</Text>
          </View>
          <Text className="font-poppins-regular text-[14px] leading-[18px] text-ivory">
            Answer an icebreaker. When you both answer, your chat opens.
          </Text>
        </View>

        <View className="w-full gap-2">
          <Button label="Break the ice" icon="sparkles" onPress={next} />
          <Button label="Keep browsing" variant="ghost" onPress={back} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
