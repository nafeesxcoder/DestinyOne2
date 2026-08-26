import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme';

export function RewardAndDemoSection({
  rewardMode,
  vouches,
  demoQualities,
  onAddVouch,
}: {
  rewardMode: 'live' | 'demo' | 'blocked';
  vouches: string[];
  demoQualities: string[];
  onAddVouch: (quality: string) => void;
}) {
  return (
    <>
      <View className="p-[15px] rounded-[20px] bg-[#FFF8E8] border border-[#67531A] flex-row items-center gap-3">
        <View className="w-[43px] h-[43px] rounded-[22px] bg-[#F8ECD0] items-center justify-center">
          <Ionicons name="gift" size={23} color={colors.gold} />
        </View>
        <View className="flex-1">
          <Text className="font-poppins-bold text-[16px] text-ivory">
            {rewardMode === 'demo' ? '100 demo coins per completed vouch' : 'Verified rewards connection required'}
          </Text>
          <Text className="font-poppins-regular text-[12.5px] text-muted">
            {rewardMode === 'demo'
              ? 'Preview rewards update only this device.'
              : 'No local reward balance changes until verified invite completion and server billing are connected.'}
          </Text>
        </View>
      </View>

      {rewardMode === 'demo' ? (
        <View className="p-4 rounded-[20px] bg-[#FFF7F7] border border-line gap-2.5">
          <Text className="font-poppins-bold text-[10px] tracking-[1.2px] text-gold">MVP PREVIEW</Text>
          <Text className="font-poppins-regular text-[12.5px] text-muted">
            Simulate a friend response to preview how trust qualities appear.
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            {demoQualities.map((quality) => {
              const disabled = vouches.includes(quality) || vouches.length >= 3;
              return (
                <Pressable
                  disabled={disabled}
                  onPress={() => onAddVouch(quality)}
                  key={quality}
                  className={`flex-row items-center gap-1 px-2.5 py-2 rounded-[14px] bg-surface2 ${disabled ? 'opacity-40' : ''}`}
                >
                  <Text className="font-poppins-semibold text-[10.5px] text-ivory">{quality}</Text>
                  <Ionicons name="add-circle" size={16} color={colors.pink} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <View className="p-4 rounded-[20px] bg-[#FFF7F7] border border-line gap-2.5">
          <Text className="font-poppins-bold text-[10px] tracking-[1.2px] text-gold">SECURE VERIFICATION REQUIRED</Text>
          <Text className="font-poppins-regular text-[12.5px] text-muted">
            Friend responses and rewards stay unavailable until the verified invite backend is active.
          </Text>
        </View>
      )}
    </>
  );
}
