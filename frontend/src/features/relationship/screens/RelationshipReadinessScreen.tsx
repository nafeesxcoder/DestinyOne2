import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MiniPremiumIcon } from '../../../components/premium/PremiumIcon';
import type { ProfileDraft } from '../../../storage';
import { colors } from '../../../theme';
import { readinessStyles } from '../../../theme/appStyles';

export function RelationshipReadinessScreen({profile,verified,vibeCount,hasIntent,onBack,onOpenCoach,onOpenProfile}:{profile:ProfileDraft;verified:boolean;vibeCount:number;hasIntent:boolean;onBack:()=>void;onOpenCoach:()=>void;onOpenProfile:()=>void}){
  const signals=[
    {label:'Your profile feels complete',body:profile.firstName&&profile.city&&profile.profession?'Name, city and work are clear.':'Add your essentials so your introduction feels grounded.',done:!!(profile.firstName&&profile.city&&profile.profession),icon:'person-outline' as const},
    {label:'Your intent is easy to understand',body:hasIntent?'People can understand what you are here to build.':'Choose your relationship intent when you are ready.',done:hasIntent,icon:'heart-outline' as const},
    {label:'Your personality has some texture',body:vibeCount>=3?`${vibeCount} values and interests give people a real opening.`:'Add a few values or interests that feel like you.',done:vibeCount>=3,icon:'sparkles-outline' as const},
    {label:'Your trust signal is visible',body:verified?'Your verification badge is ready.':'A quick private verification helps protect real conversations.',done:verified,icon:'shield-checkmark-outline' as const},
  ];
  const completed=signals.filter(signal=>signal.done).length;
  const score=48+completed*13;
  return <SafeAreaView style={readinessStyles.safe} edges={['top']}><View style={readinessStyles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to Explore" onPress={onBack} style={readinessStyles.back}><Ionicons name="arrow-back" size={21} color={colors.plum}/></Pressable><View style={{flex:1}}><Text style={readinessStyles.eyebrow}>PRIVATE READINESS</Text><Text style={readinessStyles.headerTitle}>Your relationship rhythm</Text></View></View><ScrollView contentContainerStyle={readinessStyles.content} showsVerticalScrollIndicator={false}>
    <LinearGradient colors={['#5A1023','#2A0710']} style={readinessStyles.hero}><View style={readinessStyles.heroTop}><View style={readinessStyles.score}><Text style={readinessStyles.scoreValue}>{score}</Text><Text style={readinessStyles.scoreLabel}>READY</Text></View><View style={{flex:1}}><Text style={readinessStyles.heroEyebrow}>FOR YOUR EYES ONLY</Text><Text style={readinessStyles.heroTitle}>A calmer way to get ready.</Text><Text style={readinessStyles.heroBody}>No public score, no ranking. Just a private check on the things that make a first conversation feel more real.</Text></View></View><View style={readinessStyles.progressTrack}><View style={[readinessStyles.progressFill,{width:`${score}%`}]} /></View><Text style={readinessStyles.progressCopy}>{completed} of {signals.length} foundations feel ready</Text></LinearGradient>
    <View style={readinessStyles.insight}><MiniPremiumIcon name="eye-off-outline" tone="gold" size={34} iconSize={16}/><Text style={readinessStyles.insightText}>This is not a compatibility score. Only you can see it, and it never changes how you are ranked.</Text></View>
    <Text style={readinessStyles.sectionLabel}>YOUR PRIVATE CHECK-IN</Text>
    <View style={readinessStyles.signalList}>{signals.map(signal=><View key={signal.label} style={[readinessStyles.signal,signal.done&&readinessStyles.signalDone]}><MiniPremiumIcon name={signal.done?'checkmark':'ellipse-outline'} tone={signal.done?'gold':'dark'} size={34} iconSize={15}/><View style={{flex:1}}><Text style={readinessStyles.signalTitle}>{signal.label}</Text><Text style={readinessStyles.signalBody}>{signal.body}</Text></View><Ionicons name={signal.icon} size={18} color={signal.done?colors.gold:'#88747A'}/></View>)}</View>
    <View style={readinessStyles.coachCard}><MiniPremiumIcon name="sparkles-outline" tone="ruby" size={42} iconSize={19}/><View style={{flex:1}}><Text style={readinessStyles.coachTitle}>Want a little clarity?</Text><Text style={readinessStyles.coachBody}>Use the Relationship Coach for a thoughtful profile review, a first-message draft, or a private post-date reflection.</Text></View></View>
    <View style={readinessStyles.actions}><Pressable onPress={onOpenCoach} style={readinessStyles.primaryAction}><Ionicons name="sparkles-outline" size={18} color={colors.ivory}/><Text style={readinessStyles.primaryActionText}>Open Relationship Coach</Text></Pressable><Pressable onPress={onOpenProfile} style={readinessStyles.secondaryAction}><Text style={readinessStyles.secondaryActionText}>Review my profile</Text><Ionicons name="arrow-forward" size={17} color={colors.plum}/></Pressable></View>
  </ScrollView></SafeAreaView>
}


