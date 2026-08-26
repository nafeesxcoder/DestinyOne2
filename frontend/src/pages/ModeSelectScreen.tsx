import React from 'react';
import { Text, View } from 'react-native';

import { Button, SectionTitle, shared } from '../components';
import { FormPage } from '../components/forms/FormScaffold';
import { ReferenceIconTile } from '../components/premium/PremiumIcon';
import type { ExperienceMode } from '../domain/coupleMode';
import { ModeOptionCard, type ModeOption } from '../components/ModeSelectScreen/ModeOptionCard';

const options: ModeOption[] = [
  {
    mode: 'seeking',
    tag: 'MEET MODE',
    title: 'I am looking for my person',
    body: 'Thoughtful introductions for a serious relationship.',
    detail: 'Five curated introductions each day. Shared values first, conversation after mutual interest.',
    icon: 'heart-outline',
  },
  {
    mode: 'couple',
    tag: 'COUPLE MODE',
    title: 'We are already together',
    body: 'A private space for your relationship, dates and small moments.',
    detail: 'Matching stays off. Connect privately, plan dates, exchange gifts and play together.',
    icon: 'heart-circle-outline',
  },
];

export function ModeSelectScreen({
  mode,
  onChange,
  onNext,
}: {
  mode: ExperienceMode;
  onChange: (mode: ExperienceMode) => void;
  onNext: () => void;
}) {
  return (
    <FormPage step={3}>
      <SectionTitle
        emphasis
        eyebrow="YOUR DESTINYONE EXPERIENCE"
        title="What brings you here?"
        body="Choose the space that fits your life today. You can change it any time."
      />
      <View className="gap-3.5">
        {options.map((option) => (
          <ModeOptionCard key={option.mode} option={option} selected={mode === option.mode} onPress={() => onChange(option.mode)} />
        ))}
      </View>
      <View className="p-4 gap-4 rounded-2xl bg-[#FFF8F4] border border-line flex-row items-center">
        <ReferenceIconTile name="lock-closed" orbSize={30} iconSize={13} tilePadding={10} />
        <View className="flex-1">
          <Text className="font-poppins-bold text-[13.5px] leading-[18px] text-espresso">Your choice stays private.</Text>
          <Text className="font-poppins-semibold text-[12.5px] leading-[18px] text-muted">You can switch modes later from Profile.</Text>
        </View>
      </View>
      <View style={shared.spacer} />
      <Button
        label={mode === 'couple' ? 'Set up Couple Mode' : 'Continue with Meet Mode'}
        icon="arrow-forward"
        variant={mode === 'couple' ? 'gold' : 'primary'}
        onPress={onNext}
      />
    </FormPage>
  );
}
