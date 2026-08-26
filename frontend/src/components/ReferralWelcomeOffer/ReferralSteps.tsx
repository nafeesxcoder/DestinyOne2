import React from 'react';
import { Text, View } from 'react-native';

const STEPS: [string, string][] = [
  ['1', 'Send your invite'],
  ['2', 'They join + verify'],
  ['3', 'Your free week unlocks'],
];

export function ReferralSteps({ wide }: { wide: boolean }) {
  return (
    <View className={`gap-2 ${wide ? 'flex-row' : ''}`}>
      {STEPS.map(([number, label]) => (
        <View
          key={number}
          className={`min-h-11 flex-row items-center gap-2.5 px-2.5 py-2 rounded-lg bg-[#FFF9F7] border border-[#E8D4D8] ${
            wide ? 'flex-1 min-h-[58px] items-start' : ''
          }`}
        >
          <View className="w-[25px] h-[25px] rounded-[13px] bg-[#85162B] items-center justify-center">
            <Text className="font-poppins-bold text-[10px] text-white">{number}</Text>
          </View>
          <Text className="flex-1 font-poppins-bold text-[9.8px] leading-[14.5px] text-espresso">{label}</Text>
        </View>
      ))}
    </View>
  );
}
