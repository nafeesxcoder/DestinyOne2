import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumIcon } from '../components/premium/PremiumIcon';
import type { Match } from '../data';
import { colors } from '../theme';
import { SafetyPlanCard } from '../components/DateSafetyConciergeScreen/SafetyPlanCard';
import { SafetyRules } from '../components/DateSafetyConciergeScreen/SafetyRules';

export function DateSafetyConciergeScreen({
  partner,
  onBack,
  onOpenDatePlan,
  onSavePlan,
}: {
  partner: Match;
  onBack: () => void;
  onOpenDatePlan: () => void;
  onSavePlan: (input: { checkInEnabled: boolean; checkInAt?: string; trustedContactLabel: string }) => Promise<{ saved: boolean }>;
}) {
  const [checkIn, setCheckIn] = useState(true);
  const [contact, setContact] = useState('');
  const [arrival, setArrival] = useState('9:30 PM');
  const [saved, setSaved] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const savePlan = () => {
    setSaved(true);
    setSaveStatus('Saving your private plan...');
    const checkInAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    void onSavePlan({ checkInEnabled: checkIn, checkInAt: checkIn ? checkInAt : undefined, trustedContactLabel: contact }).then((result) =>
      setSaveStatus(
        result.saved
          ? 'Your private safety plan is saved to this account.'
          : 'Your private safety plan is saved for this preview. Sign in to keep it across devices.',
      ),
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF9F6]" edges={['top']}>
      <View className="h-[72px] px-5 flex-row items-center gap-3 border-b border-[#F0DDD6]">
        <Pressable onPress={onBack} className="w-[42px] h-[42px] rounded-[21px] items-center justify-center bg-white border border-[#EAD7D0]">
          <Ionicons name="arrow-back" size={21} color={colors.plum} />
        </Pressable>
        <View className="flex-1">
          <Text className="font-poppins-bold text-[10px] tracking-[1.2px] text-[#B88624]">DATE SAFETY CONCIERGE</Text>
          <Text className="font-poppins-bold text-[18px] text-plum">Plan for a calm night out</Text>
        </View>
      </View>
      <ScrollView contentContainerClassName="w-full max-w-[760px] self-center p-5 gap-[15px] pb-10" showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#321018', '#6B1427']} className="p-[21px] rounded-[24px] items-center gap-2.5">
          <PremiumIcon name="shield-checkmark" tone="gold" size={56} iconSize={26} />
          <Text className="font-poppins-bold text-[20px] text-ivory">Safety can stay simple.</Text>
          <Text className="font-poppins-regular text-[10.8px] leading-[16px] text-[#ECD0D5] text-center">
            Create a private check-in plan for your date with {partner.name}. Your exact live location is never shared by default.
          </Text>
        </LinearGradient>

        <SafetyPlanCard
          checkIn={checkIn}
          onToggleCheckIn={() => setCheckIn((value) => !value)}
          arrival={arrival}
          onChangeArrival={setArrival}
          contact={contact}
          onChangeContact={setContact}
        />

        <SafetyRules />

        <Pressable onPress={savePlan} className="h-[50px] rounded-[17px] bg-pink items-center justify-center flex-row gap-2">
          <Ionicons name={saved ? 'checkmark-circle' : 'shield-checkmark-outline'} size={18} color={colors.ivory} />
          <Text className="font-poppins-bold text-[12px] text-ivory">{saved ? 'Safety plan saved' : 'Save my private plan'}</Text>
        </Pressable>

        {saved && (
          <Text className="font-poppins-semibold text-[10px] leading-[15px] text-center text-[#7A5E26]">
            {saveStatus || `Your check-in is set for ${arrival}${contact ? ` and ${contact} is listed as your trusted contact.` : '.'}`}
          </Text>
        )}

        <Pressable onPress={onOpenDatePlan} className="h-[49px] rounded-[17px] bg-white border border-[#E2D3CE] px-3.5 flex-row items-center gap-2">
          <Ionicons name="calendar-outline" size={18} color={colors.plum} />
          <Text className="flex-1 font-poppins-bold text-[11px] text-plum">Choose a public date place</Text>
          <Ionicons name="arrow-forward" size={17} color={colors.plum} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
