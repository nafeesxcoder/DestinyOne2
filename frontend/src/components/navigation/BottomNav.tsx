import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ReferenceIconTile, type PremiumIconTone } from '../premium/PremiumIcon';
import type { ExperienceMode } from '../../domain/coupleMode';
import { primaryNavigation } from '../../domain/featureFocus';
import type { Screen } from '../../app/navigation/types';
import { bottomNavStyles } from '../../theme/appStyles';

const motionListeners = new Set<(collapsed: boolean) => void>();
let lastScrollY = 0;
let lastCollapsed = false;

function emitMotion(collapsed: boolean) {
  if (lastCollapsed === collapsed) return;
  lastCollapsed = collapsed;
  motionListeners.forEach(listener => listener(collapsed));
}

export function handleBottomNavScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
  const nextY = Math.max(0, event.nativeEvent.contentOffset.y);
  const delta = nextY - lastScrollY;
  if (nextY <= 10) emitMotion(false);
  else if (delta > 5) emitMotion(true);
  else if (delta < -5) emitMotion(false);
  lastScrollY = nextY;
}

function AnimatedBottomNavItem({ label, icon, tone, selected, smallViewport, collapseProgress, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; tone: PremiumIconTone; selected: boolean; smallViewport: boolean; collapseProgress: Animated.Value; onPress: () => void }) {
  const activeProgress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => { Animated.spring(activeProgress, { toValue: selected ? 1 : 0, friction: 7, tension: 95, useNativeDriver: Platform.OS !== 'web' }).start(); }, [activeProgress, selected]);
  const translateY = activeProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const scale = activeProgress.interpolate({ inputRange: [0, 1], outputRange: [.98, 1.05] });
  const labelOpacity = collapseProgress.interpolate({ inputRange: [0, 1], outputRange: [1, .96] });
  const labelHeight = collapseProgress.interpolate({ inputRange: [0, 1], outputRange: [20, 18] });
  const goldAccent = tone === 'gold';
  return <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityHint="Double tap to open" accessibilityState={{ selected }} hitSlop={smallViewport ? { top: 7, bottom: 7, left: 2, right: 2 } : undefined} onPress={onPress} style={[bottomNavStyles.navItem, smallViewport && bottomNavStyles.navItemCompact]}>
    <Animated.View style={[bottomNavStyles.iconLift, { transform: [{ translateY }, { scale }] }]}>{selected && <View pointerEvents="none" style={[bottomNavStyles.activeHalo, goldAccent && bottomNavStyles.activeHaloGold]} />}<ReferenceIconTile name={icon} orbSize={smallViewport ? 29 : 31} iconSize={smallViewport ? 13 : 14} tilePadding={smallViewport ? 7 : 8} /></Animated.View>
    <Animated.View pointerEvents="none" style={[bottomNavStyles.labelWrap, { height: labelHeight, opacity: labelOpacity }]}><Text numberOfLines={1} style={[bottomNavStyles.navText, selected && bottomNavStyles.navTextOn]}>{label}</Text>{selected && <View style={[bottomNavStyles.activeDot, goldAccent && bottomNavStyles.activeDotGold]} />}</Animated.View>
  </Pressable>;
}

type BottomNavProps = {
  active: string;
  navigate: (screen: Screen) => void;
  mode?: ExperienceMode;
  onOpenTool?: (tool: 'gift' | 'games') => void;
  light?: boolean;
  referenceIcons?: boolean;
  referenceTiles?: boolean;
};

export function BottomNav({ active, navigate, mode = 'seeking', onOpenTool: _onOpenTool }: BottomNavProps) {
  void _onOpenTool;
  const { width } = useWindowDimensions();
  const smallViewport = width <= 370;
  const [hostWidth, setHostWidth] = useState(Math.min(width, 920));
  const [collapsed, setCollapsed] = useState(false);
  const collapseProgress = useRef(new Animated.Value(0)).current;
  useEffect(() => { const listener = (next: boolean) => setCollapsed(next); motionListeners.add(listener); return () => { motionListeners.delete(listener); }; }, []);
  useEffect(() => { Animated.spring(collapseProgress, { toValue: collapsed ? 1 : 0, friction: 9, tension: 105, useNativeDriver: false }).start(); }, [collapseProgress, collapsed]);
  const coupleNavigation = [
    { label: 'Together', target: 'home' as Screen, icon: 'heart' as const, tone: 'ruby' as PremiumIconTone },
    { label: 'Dates', target: 'events' as Screen, icon: 'calendar' as const, tone: 'gold' as PremiumIconTone },
    { label: 'Chat', target: 'chat' as Screen, icon: 'chatbubble' as const, tone: 'ruby' as PremiumIconTone },
    { label: 'Gifts', target: 'gifts' as Screen, icon: 'gift' as const, tone: 'gold' as PremiumIconTone },
    { label: 'Profile', target: 'profile' as Screen, icon: 'person' as const, tone: 'dark' as PremiumIconTone },
  ];
  const navigationMeta: Record<typeof primaryNavigation[number]['target'], { icon: keyof typeof Ionicons.glyphMap; tone: PremiumIconTone }> = { home: { icon: 'heart', tone: 'ruby' }, explore: { icon: 'compass', tone: 'ruby' }, chat: { icon: 'chatbubble', tone: 'ruby' }, gifts: { icon: 'gift', tone: 'gold' }, events: { icon: 'calendar', tone: 'gold' }, profile: { icon: 'person', tone: 'ruby' } };
  const items = mode === 'couple' ? coupleNavigation : primaryNavigation.map(item => ({ ...item, ...navigationMeta[item.target] }));
  const expandedWidth = Math.max(0, Math.min(hostWidth - 18, mode === 'couple' ? 700 : 820));
  const compactWidth = Math.max(0, Math.min(hostWidth - (smallViewport ? 22 : 38), mode === 'couple' ? 560 : 650));
  const dockWidth = collapseProgress.interpolate({ inputRange: [0, 1], outputRange: [expandedWidth, compactWidth] });
  const dockHeight = collapseProgress.interpolate({ inputRange: [0, 1], outputRange: [82, 70] });
  const dockRadius = collapseProgress.interpolate({ inputRange: [0, 1], outputRange: [28, 32] });
  const dockPaddingTop = collapseProgress.interpolate({ inputRange: [0, 1], outputRange: [7, 4] });
  const dockPaddingBottom = collapseProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 4] });
  return <View pointerEvents="box-none" onLayout={event => setHostWidth(event.nativeEvent.layout.width)} style={bottomNavStyles.navHost}>
    <Animated.View accessibilityRole="tablist" accessibilityLabel="Primary navigation" style={[bottomNavStyles.nav, { width: dockWidth, height: dockHeight, borderRadius: dockRadius, paddingTop: dockPaddingTop, paddingBottom: dockPaddingBottom }]}>
      <View style={bottomNavStyles.navScroller}>{items.map(item => { const selected = active === item.target || (item.target === 'events' && active === 'events'); const renderedIconName = (selected ? item.icon : `${item.icon}-outline`) as keyof typeof Ionicons.glyphMap; return <AnimatedBottomNavItem key={item.label} label={item.label} icon={renderedIconName} tone={item.tone} selected={selected} smallViewport={smallViewport} collapseProgress={collapseProgress} onPress={() => navigate(item.target as Screen)} />; })}</View>
    </Animated.View>
  </View>;
}
