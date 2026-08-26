import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

const TIME_OPTIONS = ['8:30 PM', '9:30 PM', '10:30 PM'];

export function SafetyPlanCard({
  checkIn,
  onToggleCheckIn,
  arrival,
  onChangeArrival,
  contact,
  onChangeContact,
}: {
  checkIn: boolean;
  onToggleCheckIn: () => void;
  arrival: string;
  onChangeArrival: (time: string) => void;
  contact: string;
  onChangeContact: (value: string) => void;
}) {
  return (
    <View className="p-4 rounded-[21px] bg-white border border-[#EADDD8] gap-3">
      <Text className="font-poppins-bold text-[9px] tracking-[1.15px] text-[#C74A71]">YOUR PRIVATE PLAN</Text>

      <View className="flex-row items-center gap-2.5">
        <View className="flex-1">
          <Text className="font-poppins-bold text-[13px] text-plum">Arrival check-in</Text>
          <Text className="font-poppins-regular text-[10px] leading-[14px] text-[#77666B] mt-0.5">
            We will remind you to confirm that you got home safely.
          </Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: checkIn }}
          onPress={onToggleCheckIn}
          className={`w-[46px] h-[27px] rounded-[15px] p-[3px] ${checkIn ? 'bg-pink' : 'bg-[#D6C5C4]'}`}
        >
          <View className={`w-[21px] h-[21px] rounded-[11px] bg-white ${checkIn ? 'ml-[19px]' : ''}`} />
        </Pressable>
      </View>

      <Text className="font-poppins-bold text-[9px] tracking-[1.05px] text-[#A57319]">CHECK-IN TIME</Text>
      <View className="flex-row gap-1.5">
        {TIME_OPTIONS.map((time) => {
          const active = arrival === time;
          return (
            <Pressable
              key={time}
              onPress={() => onChangeArrival(time)}
              className={`flex-1 min-h-9 rounded-xl items-center justify-center border ${
                active ? 'bg-[#FFF0D0] border-[#D9B34B]' : 'border-[#E5D6D1]'
              }`}
            >
              <Text className={`font-poppins-semibold text-[9.5px] ${active ? 'text-plum' : 'text-[#77656A]'}`}>{time}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="font-poppins-bold text-[9px] tracking-[1.05px] text-[#A57319]">TRUSTED CONTACT (OPTIONAL)</Text>
      <TextInput
        value={contact}
        onChangeText={onChangeContact}
        placeholder="Name or phone number"
        placeholderTextColor="#9B8187"
        className="h-11 rounded-[13px] px-3 border border-[#E4D5D1] font-poppins-regular text-[11px] text-plum"
      />
      <Text className="font-poppins-regular text-[9px] leading-[13px] text-[#89757A]">
        This stays private. A real alert is sent only after you choose to enable it in production.
      </Text>
    </View>
  );
}
