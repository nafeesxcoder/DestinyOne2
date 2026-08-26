import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { Button, SectionTitle, shared } from '../components';
import { FormPage } from '../components/forms/FormScaffold';
import { MiniPremiumIcon } from '../components/premium/PremiumIcon';
import type { Match } from '../data';
import { IcebreakerOption } from '../components/IcebreakerScreen/IcebreakerOption';

const OPTIONS = ['Coffee date — good conversation first', 'Road trip — let’s make a memory'];

export function IcebreakerScreen({
  match,
  question,
  onSubmit,
}: {
  match: Match;
  question: string;
  onSubmit: (answer: string) => Promise<void>;
}) {
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!answer || loading) return;
    setLoading(true);
    try {
      await onSubmit(answer);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormPage>
      <View className="items-center gap-3">
        <Text className="font-poppins-bold text-[9.5px] tracking-[1.7px] text-pinkSoft">YOUR FIRST MOMENT</Text>
        <View className="flex-row">
          <Image source={{ uri: match.photo }} className="w-[58px] h-[58px] rounded-[29px] border-2 border-black" />
          <View className="w-[58px] h-[58px] rounded-[29px] border-2 border-black bg-[#3A1820] items-center justify-center -ml-[9px]">
            <Text className="font-poppins-bold text-[20px] text-ivory">A</Text>
          </View>
        </View>
      </View>

      <SectionTitle title={question} body={`${match.name} is answering this too. No overthinking—just be you.`} />

      <View className="gap-3">
        {OPTIONS.map((option) => (
          <IcebreakerOption key={option} label={option} selected={answer === option} disabled={loading} onPress={() => setAnswer(option)} />
        ))}
      </View>

      <View className="flex-row items-center justify-center gap-1.5">
        <MiniPremiumIcon name="lock-closed" tone="dark" size={28} iconSize={13} />
        <Text className="font-poppins-regular text-[12.5px] leading-[18px] text-muted">
          Answers are revealed after you both respond. Production chat stays locked until then.
        </Text>
      </View>

      <View style={shared.spacer} />
      <Button disabled={!answer || loading} label={loading ? 'Saving answer…' : 'Send my answer'} onPress={() => void submit()} />
    </FormPage>
  );
}
