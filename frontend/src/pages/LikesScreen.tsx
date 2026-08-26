import React from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionTitle } from '../components';
import { BottomNav } from '../components/navigation/BottomNav';
import { matches } from '../data';
import type { Screen } from '../app/navigation/types';
import { LikesPreviewGrid } from '../components/LikesScreen/LikesPreviewGrid';
import { LikesLockedState } from '../components/LikesScreen/LikesLockedState';
import { LikesUpsellCard } from '../components/LikesScreen/LikesUpsellCard';

export function LikesScreen({
  preview,
  previewLikeCount,
  openPricing,
  navigate,
}: {
  preview: boolean;
  previewLikeCount: number;
  openPricing: () => void;
  navigate: (screen: Screen) => void;
}) {
  return (
    <SafeAreaView className="flex-1">
      <ScrollView contentContainerClassName="p-[22px] pb-[120px] gap-6">
        <SectionTitle
          eyebrow="Private & intentional"
          title="People who noticed you."
          body={
            preview
              ? `${previewLikeCount} people have shown private interest. Upgrade to see everyone.`
              : 'Incoming interest stays private and appears only after secure account sync.'
          }
        />
        {preview ? <LikesPreviewGrid items={matches.slice(0, 2)} /> : <LikesLockedState />}
        <LikesUpsellCard preview={preview} onOpenPricing={openPricing} />
      </ScrollView>
      <BottomNav active="explore" navigate={navigate} />
    </SafeAreaView>
  );
}
