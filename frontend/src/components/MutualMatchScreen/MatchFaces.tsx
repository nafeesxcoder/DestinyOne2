import React from 'react';
import { Image, Text, View } from 'react-native';

import { PremiumIcon } from '../../components/premium/PremiumIcon';

export function MatchFaces({ photo }: { photo: string }) {
  return (
    <View className="w-[245px] h-[145px]">
      <Image source={{ uri: photo }} className="absolute left-0 w-[142px] h-[142px] rounded-[71px] border-4 border-[#7C0015]" />
      <View className="absolute right-0 w-[142px] h-[142px] rounded-[71px] border-4 border-[#7C0015] bg-[#2B1A1E] items-center justify-center">
        <Text className="font-poppins-bold text-[38px] text-ivory">A</Text>
      </View>
      <View className="absolute z-10 left-[98px] top-12 w-[49px] h-[49px] rounded-[25px] bg-pink border-[3px] border-[#390006] items-center justify-center">
        <PremiumIcon name="heart" tone="ruby" size={58} iconSize={28} />
      </View>
    </View>
  );
}
