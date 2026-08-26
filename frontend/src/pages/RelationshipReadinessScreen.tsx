import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MiniPremiumIcon } from '../components/premium/PremiumIcon';
import type { ProfileDraft } from '../storage';
import { colors } from '../theme';
import { ReadinessHero } from '../components/RelationshipReadinessScreen/ReadinessHero';
import { ReadinessSignalList, type ReadinessSignal } from '../components/RelationshipReadinessScreen/ReadinessSignalList';

export function RelationshipReadinessScreen({
  profile,
  verified,
  vibeCount,
  hasIntent,
  onBack,
  onOpenCoach,
  onOpenProfile,
}: {
  profile: ProfileDraft;
  verified: boolean;
  vibeCount: number;
  hasIntent: boolean;
  onBack: () => void;
  onOpenCoach: () => void;
  onOpenProfile: () => void;
}) {
  const signals: ReadinessSignal[] = [
    {
      label: 'Your profile feels complete',
      body: profile.firstName && profile.city && profile.profession ? 'Name, city and work are clear.' : 'Add your essentials so your introduction feels grounded.',
      done: !!(profile.firstName && profile.city && profile.profession),
      icon: 'person-outline',
    },
    {
      label: 'Your intent is easy to understand',
      body: hasIntent ? 'People can understand what you are here to build.' : 'Choose your relationship intent when you are ready.',
      done: hasIntent,
      icon: 'heart-outline',
    },
    {
      label: 'Your personality has some texture',
      body: vibeCount >= 3 ? `${vibeCount} values and interests give people a real opening.` : 'Add a few values or interests that feel like you.',
      done: vibeCount >= 3,
      icon: 'sparkles-outline',
    },
    {
      label: 'Your trust signal is visible',
      body: verified ? 'Your verification badge is ready.' : 'A quick private verification helps protect real conversations.',
      done: verified,
      icon: 'shield-checkmark-outline',
    },
  ];
  const completed = signals.filter((signal) => signal.done).length;
  const score = 48 + completed * 13;

  return (
    <SafeAreaView className="flex-1 bg-[#FFF9F6]" edges={['top']}>
      <View className="h-[72px] px-5 flex-row items-center gap-3 border-b border-[#F0DDD6]">
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Explore" onPress={onBack} className="w-[42px] h-[42px] rounded-[21px] items-center justify-center bg-white border border-[#EAD7D0]">
          <Ionicons name="arrow-back" size={21} color={colors.plum} />
        </Pressable>
        <View className="flex-1">
          <Text className="font-poppins-bold text-[10px] tracking-[1.3px] text-[#B88624]">PRIVATE READINESS</Text>
          <Text className="font-poppins-bold text-[18px] text-plum mt-0.5">Your relationship rhythm</Text>
        </View>
      </View>
      <ScrollView contentContainerClassName="p-5 gap-4 pb-[42px] max-w-[760px] self-center w-full" showsVerticalScrollIndicator={false}>
        <ReadinessHero score={score} completed={completed} total={signals.length} />

        <View className="flex-row gap-2.5 items-center p-3.5 rounded-[17px] bg-[#FFF2D9] border border-[#EDD49A]">
          <MiniPremiumIcon name="eye-off-outline" tone="gold" size={34} iconSize={16} />
          <Text className="flex-1 font-poppins-regular text-[10.5px] leading-[15px] text-[#6A4C1B]">
            This is not a compatibility score. Only you can see it, and it never changes how you are ranked.
          </Text>
        </View>

        <Text className="font-poppins-bold text-[10px] tracking-[1.35px] text-[#C44369] mt-0.5">YOUR PRIVATE CHECK-IN</Text>

        <ReadinessSignalList signals={signals} />

        <View className="flex-row gap-3 p-[15px] rounded-[20px] bg-[#F9E9EF] border border-[#F1C7D5]">
          <MiniPremiumIcon name="sparkles-outline" tone="ruby" size={42} iconSize={19} />
          <View className="flex-1">
            <Text className="font-poppins-bold text-[14px] text-plum">Want a little clarity?</Text>
            <Text className="font-poppins-regular text-[10.5px] leading-[15px] text-[#73545C] mt-0.5">
              Use the Relationship Coach for a thoughtful profile review, a first-message draft, or a private post-date reflection.
            </Text>
          </View>
        </View>

        <View className="gap-2.5">
          <Pressable onPress={onOpenCoach} className="h-[52px] rounded-[18px] bg-pink items-center justify-center flex-row gap-2 shadow-[0_0_12px_rgba(179,12,61,.23)]">
            <Ionicons name="sparkles-outline" size={18} color={colors.ivory} />
            <Text className="font-poppins-bold text-[12.5px] text-ivory">Open Relationship Coach</Text>
          </Pressable>
          <Pressable onPress={onOpenProfile} className="h-12 rounded-[17px] bg-white border border-[#E5D4CE] items-center justify-center flex-row gap-1.5">
            <Text className="font-poppins-bold text-[12px] text-plum">Review my profile</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.plum} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
