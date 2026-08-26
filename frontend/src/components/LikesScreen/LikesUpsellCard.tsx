import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '../../components';
import { PremiumIcon } from '../../components/premium/PremiumIcon';

export function LikesUpsellCard({ preview, onOpenPricing }: { preview: boolean; onOpenPricing: () => void }) {
  return (
    <View className="rounded-2xl border border-[#6C5520] bg-surface p-5 gap-3.5">
      <PremiumIcon name="sparkles" tone="gold" size={48} iconSize={22} />
      <Text className="font-poppins-bold text-[16px] text-ivory">See who chose you</Text>
      <Text className="font-poppins-regular text-[14px] leading-5 text-ivory">
        {preview
          ? 'Plus members can see likes, meet up to 5 daily matches, and hear voice intros.'
          : 'Membership access will unlock verified incoming interests after entitlement and likes sync are both active.'}
      </Text>
      <Button label="Explore DestinyOne Plus" variant="gold" onPress={onOpenPricing} />
    </View>
  );
}
