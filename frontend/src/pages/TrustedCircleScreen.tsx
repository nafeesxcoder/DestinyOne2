import React, { useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, shared } from '../components';
import { colors } from '../theme';
import { TrustSignal } from '../components/TrustedCircleScreen/TrustSignal';
import { CircleHero } from '../components/TrustedCircleScreen/CircleHero';
import { VouchProgressCard } from '../components/TrustedCircleScreen/VouchProgressCard';
import { RewardAndDemoSection } from '../components/TrustedCircleScreen/RewardAndDemoSection';

export function TrustedCircleScreen({
  vouches,
  coinBalance,
  rewardMode,
  onBack,
  onAddVouch,
}: {
  vouches: string[];
  coinBalance: number;
  rewardMode: 'live' | 'demo' | 'blocked';
  onBack: () => void;
  onAddVouch: (quality: string) => void;
}) {
  const [inviteStatus, setInviteStatus] = useState('');
  const shareInvite = async () => {
    setInviteStatus('');
    try {
      await Share.share({
        title: 'Vouch for me on DestinyOne',
        message:
          'I’m building my Trusted Circle on DestinyOne. Would you vouch for the qualities you genuinely know me for? https://destinyone.app/vouch/demo',
      });
    } catch {
      setInviteStatus('Share sheet is not available in this browser preview. Demo invite: https://destinyone.app/vouch/demo');
    }
  };
  const demoQualities = ['Dependable', 'Emotionally mature', 'Family-minded'];

  return (
    <LinearGradient colors={['#F7F1EA', colors.black, colors.black]} className="flex-1">
      <SafeAreaView style={shared.safe}>
        <View className="h-[58px] flex-row items-center">
          <Pressable onPress={onBack} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-back" size={21} color={colors.ivory} />
          </Pressable>
          <View className="flex-1" />
          {rewardMode === 'demo' && (
            <View className="h-9 rounded-2xl bg-[#F8ECD0] border border-[#66521A] px-2.5 flex-row items-center gap-1.5">
              <Ionicons name="sparkles" size={14} color={colors.gold} />
              <Text className="font-poppins-bold text-[11px] text-gold">{coinBalance}</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerClassName="pb-[35px] gap-[18px]" showsVerticalScrollIndicator={false}>
          <CircleHero />

          <View className="gap-2.5">
            <TrustSignal icon="camera" title="Selfie verification" body="Confirms profile photo belongs to the person creating the account." />
            <TrustSignal icon="id-card" title="Optional ID check" body="Production can add ID verification for higher trust badges." />
            <TrustSignal icon="people" title="Friend vouches" body="Character vouches show reliability without exposing private dating activity." />
            <TrustSignal icon="calendar" title="Safer date check-ins" body="Public date plans and check-ins help members feel safer meeting offline." />
          </View>

          <VouchProgressCard vouches={vouches} />

          <Button label="Invite a trusted friend" icon="share-social" onPress={() => void shareInvite()} />

          {!!inviteStatus && (
            <View className="p-3.5 rounded-2xl bg-[rgba(51,11,19,.65)] flex-row items-center gap-2.5">
              <Ionicons name="link" size={22} color={colors.gold} />
              <Text className="flex-1 font-poppins-regular text-[12.5px] text-muted">{inviteStatus}</Text>
            </View>
          )}

          <RewardAndDemoSection rewardMode={rewardMode} vouches={vouches} demoQualities={demoQualities} onAddVouch={onAddVouch} />

          <View className="p-3.5 rounded-2xl bg-[rgba(51,11,19,.65)] flex-row items-center gap-2.5">
            <Ionicons name="shield-checkmark" size={22} color={colors.pinkSoft} />
            <Text className="flex-1 font-poppins-regular text-[12.5px] text-muted">
              Friends cannot view your matches, messages, likes, or private preferences. You remain fully in control.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
