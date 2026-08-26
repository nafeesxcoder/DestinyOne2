import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../components';
import { MiniPremiumIcon } from '../components/premium/PremiumIcon';
import { ReferralHero } from '../components/ReferralWelcomeOffer/ReferralHero';
import { RewardCard } from '../components/ReferralWelcomeOffer/RewardCard';
import { ReferralSteps } from '../components/ReferralWelcomeOffer/ReferralSteps';

export function ReferralWelcomeOffer({
  visible,
  referralCode,
  onClose,
  onViewPlans,
}: {
  visible: boolean;
  referralCode: string;
  onClose: () => void;
  onViewPlans: () => void;
}) {
  const { width } = useWindowDimensions();
  const [shareStatus, setShareStatus] = useState('');
  const wide = width >= 760;
  const wideSheetWidth = Math.min(900, width - 32);

  useEffect(() => {
    if (visible) setShareStatus('');
  }, [visible]);

  const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://destinyone.app';
  const inviteLink = `${origin}/?ref=${encodeURIComponent(referralCode)}`;

  const shareInvite = async () => {
    const message = `I found DestinyOne, a dating app for people who actually mean it. Join with my private invite and complete your verified profile: ${inviteLink}`;
    try {
      await Share.share({ title: 'Your private DestinyOne invite', message });
      setShareStatus('Invite ready. Your free week unlocks when your friend verifies their profile.');
    } catch {
      setShareStatus(`Share is unavailable here. Use this link: ${inviteLink}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View className="flex-1 justify-end px-0 web:px-4">
        <Pressable className="flex-1 bg-black/[.62]" onPress={onClose} />
        <SafeAreaView
          className="absolute left-0 right-0 bottom-0 bg-[#FFFDFC] rounded-t-[30px] border border-line p-5 gap-[18px] max-h-[94%] pt-0"
          style={wide ? { left: (width - wideSheetWidth) / 2, right: undefined, width: wideSheetWidth, maxHeight: '90%' } : undefined}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="gap-[11px] p-3.5 pb-5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close referral offer"
              onPress={onClose}
              className="absolute right-[22px] top-[22px] z-10 w-[34px] h-[34px] rounded-[17px] bg-black/75 border border-white/[.14] items-center justify-center"
            >
              <Ionicons name="close" size={20} color="#FFFDFC" />
            </Pressable>

            <ReferralHero />
            <RewardCard />
            <ReferralSteps wide={wide} />

            <View className="flex-row items-center justify-between p-3 rounded-lg bg-[rgba(212,175,55,.08)] border border-[rgba(212,175,55,.24)]">
              <View>
                <Text className="font-poppins-bold text-[7.8px] tracking-[1.1px] text-[#C8AD63]">YOUR INVITE CODE</Text>
                <Text className="font-poppins-bold text-[15px] text-espresso mt-0.5">{referralCode}</Text>
              </View>
              <MiniPremiumIcon name="link" tone="dark" size={34} iconSize={16} />
            </View>

            {!!shareStatus && (
              <Text className="font-poppins-bold text-[10px] leading-[15px] text-[#7C5B16] text-center">{shareStatus}</Text>
            )}

            <View className={`gap-2 ${wide ? 'flex-row' : ''}`}>
              <View className={wide ? 'flex-1' : 'w-full'}>
                <Button label="Send my invite" icon="share-social" variant="gold" onPress={() => void shareInvite()} />
              </View>
              <View className={wide ? 'flex-1' : 'w-full'}>
                <Button label="Explore plans" icon="diamond-outline" variant="secondary" onPress={onViewPlans} />
              </View>
            </View>

            <Pressable onPress={onClose} className="self-center p-2">
              <Text className="font-poppins-semibold text-[11px] text-muted">Maybe later</Text>
            </Pressable>

            <Text className="font-poppins-regular text-[10.5px] leading-4 text-center text-[#806D7D]">
              One reward per verified friend. Self-referrals and duplicate accounts are not eligible. Safety and privacy tools remain
              free for everyone.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
