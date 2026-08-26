import React from 'react';
import { Text, View } from 'react-native';

import { PremiumIcon } from '../../components/premium/PremiumIcon';

/**
 * Honest empty state: no sample people, no invented like counts.
 * Shown once the real likes feed is connected to the backend.
 */
export function LikesLockedState() {
  return (
    <View className="rounded-2xl border border-line bg-surface p-5 gap-3 items-center">
      <PremiumIcon name="lock-closed" tone="gold" size={54} iconSize={25} />
      <Text className="font-poppins-bold text-[16px] text-ivory text-center">
        Secure likes sync required
      </Text>
      <Text className="font-poppins-semibold text-[12.5px] text-muted text-center">
        DestinyOne will not show sample people or invented like counts. Your verified incoming
        interests will appear here when the live likes feed is connected.
      </Text>
    </View>
  );
}
