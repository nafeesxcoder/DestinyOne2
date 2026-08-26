import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, shared } from '../../../components';
import { MiniPremiumIcon, PremiumIcon } from '../../../components/premium/PremiumIcon';
import type { Match } from '../../../data';
import { matchReasons } from '../../../domain/matching';
import type { MatchFilters } from '../../../storage';
import { colors } from '../../../theme';
import { aiStyles, coachStyles, discoveryStyles, launchStyles, styles } from '../../../theme/appStyles';

const coachCards=[
  {title:'Profile polish',icon:'person-circle' as const,body:'Rewrite your bio so it sounds warm, serious and real—not generic.'},
  {title:'First-message helper',icon:'chatbubble-ellipses' as const,body:'Get a thoughtful opener based on values, city and profile details.'},
  {title:'Red-flag scan',icon:'warning' as const,body:'Check for pressure, money requests, inconsistent intent or unsafe meeting patterns.'},
  {title:'Post-date reflection',icon:'heart-circle' as const,body:'After a date, log what felt safe, exciting, unclear and worth exploring.'},
];

export function RelationshipCoachScreen({match,preferences,onBack,onOpenFilters,onUseInChat,onSubmitFeedback:_onSubmitFeedback}:{match:Match;preferences:{intent:string;vibes:string[];filters:MatchFilters};onBack:()=>void;onOpenFilters:()=>void;onUseInChat:(draft:string)=>void;onSubmitFeedback:(feedback:'promising'|'not_aligned'|'met_in_person',useForMatching:boolean)=>Promise<boolean>}){
  const [selected,setSelected]=useState('First-message helper');
  const [topic,setTopic]=useState('family, emotional safety, and first-date clarity');
  const [saved,setSaved]=useState(false);
  const [useFeedbackForMatching,setUseFeedbackForMatching]=useState(false);
  const [feedbackSaved,setFeedbackSaved]=useState('');
  const [feedbackOutcome,setFeedbackOutcome]=useState<'promising'|'not_aligned'|'met_in_person'|''>('');
  const [feedbackSignals,setFeedbackSignals]=useState<Record<string,'more'|'less'>>({});
  const [safetyFeeling,setSafetyFeeling]=useState<'yes'|'unsure'|'no'|''>('');
  const reasons=match.reasons??matchReasons(match,preferences);
  const redFlags=['Asks to move off-app too fast','Pushes for exact location','Requests money, crypto or gift cards','Avoids verification or public places'];
  const learningFacets=[
    {id:'conversation',title:'Conversation ease',body:'The pace and flow felt natural.'},
    {id:'intent',title:'Marriage intent',body:'Their future goals felt clear and compatible.'},
    {id:'emotional',title:'Emotional maturity',body:'Listening, curiosity and accountability showed up.'},
    {id:'lifestyle',title:'Lifestyle rhythm',body:'Daily life, social energy and routines felt aligned.'},
    {id:'chemistry',title:'In-person chemistry',body:'Attraction and warmth felt genuine in person.'},
    {id:'logistics',title:'Location & logistics',body:'Distance, timing and practical effort felt workable.'},
  ];
  const output=selected==='First-message helper'
    ? `Hey ${match.name}, I liked that your profile feels ${match.familyPriority==='high'?'family-rooted':'intentional'}. I’m curious — what does a peaceful weekend usually look like for you?`
    : selected==='Profile polish'
      ? `I’m here for something real: a warm, steady relationship built on ${topic}. I value clear communication, family respect, and a life that still leaves room for joy.`
      : selected==='Post-date reflection'
        ? `After a date, ask yourself: Did I feel respected? Was intent clear? Did conversation feel calm or performative? Would I feel safe meeting again in public?`
        : `Safety scan for ${match.name}: keep early chat in-app, meet in public, avoid exact live location, and report any pressure around money, secrecy or fast off-app moves.`;
  const saveNote=()=>setSaved(true);
  const setLearningFacet=(id:string,value:'more'|'less')=>{
    setFeedbackSignals(current=>current[id]===value?Object.fromEntries(Object.entries(current).filter(([key])=>key!==id)):{...current,[id]:value});
    setFeedbackSaved('');
  };
  const prepareLearningFeedback=()=>{
    if(!feedbackOutcome){setFeedbackSaved('Choose a private date outcome first.');return}
    const signalCount=Object.keys(feedbackSignals).length;
    setFeedbackSaved(useFeedbackForMatching?`Learning handoff ready: ${signalCount} preference ${signalCount===1?'signal':'signals'} selected. Your developer will connect ranking updates.`:'Feedback stays private. Turn on matching consent if you want these broad signals used later.');
  };
  return <LinearGradient colors={['#27040A',colors.black,colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={coachStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>AI Relationship Coach</Text></View><ScrollView contentContainerStyle={coachStyles.content} showsVerticalScrollIndicator={false}>
    <View style={coachStyles.hero}><PremiumIcon name="sparkles" tone="ruby" size={70} iconSize={32}/><Text style={launchStyles.scriptHero}>Helpful, never fake</Text><Text style={[shared.h1,{textAlign:'center'}]}>Make dating feel clearer.</Text><Text style={[shared.body,{textAlign:'center'}]}>Coach uses only DestinyOne profile inputs, filters and in-app signals. It helps you show up better — it does not pretend to be you.</Text></View>
    <View style={coachStyles.cardGrid}>{coachCards.map((card,index)=><Pressable key={card.title} onPress={()=>{setSelected(card.title);setSaved(false)}} style={[coachStyles.toolCard,selected===card.title&&coachStyles.toolCardOn]}><PremiumIcon name={card.icon} tone={selected===card.title?'gold':index%2?'plum':'ruby'} size={48} iconSize={22}/><Text style={coachStyles.toolTitle}>{card.title}</Text><Text style={coachStyles.toolBody}>{card.body}</Text></Pressable>)}</View>
    <View style={coachStyles.outputCard}><Text style={styles.kicker}>WHAT SHOULD COACH FOCUS ON?</Text><TextInput value={topic} onChangeText={setTopic} placeholder="Example: family, faith, first-date clarity" placeholderTextColor="#6F6875" style={coachStyles.coachInput}/><Text style={styles.kicker}>COACH OUTPUT</Text><Text style={styles.cardTitle}>{selected}</Text>{selected==='Red-flag scan'?<View style={{gap:9}}>{redFlags.map(item=><View key={item} style={coachStyles.checkRow}><PremiumIcon name="shield-checkmark-outline" tone="gold" size={30} iconSize={14}/><Text style={coachStyles.checkText}>{item}</Text></View>)}</View>:<Text style={coachStyles.outputText}>“{output}”</Text>}{selected==='Post-date reflection'&&<View style={coachStyles.feedbackCard}>
      <View style={coachStyles.feedbackHeading}><PremiumIcon name="heart-circle-outline" tone="gold" size={44} iconSize={20}/><View style={{flex:1}}><Text style={styles.cardTitle}>What should future matches learn?</Text><Text style={styles.helper}>Private, consent-based and explainable. It is never shown to {match.name}.</Text></View><View style={coachStyles.feedbackApiBadge}><Text style={coachStyles.feedbackApiText}>FRONTEND</Text></View></View>
      <Text style={styles.sectionLabel}>PRIVATE OUTCOME</Text><View style={coachStyles.feedbackChoices}>{([{id:'promising',label:'Worth exploring',icon:'heart-outline'},{id:'not_aligned',label:'Not aligned',icon:'remove-circle-outline'},{id:'met_in_person',label:'Met in person',icon:'people-outline'}] as const).map(item=>{const active=feedbackOutcome===item.id;return <Pressable accessibilityRole="radio" accessibilityState={{checked:active}} key={item.id} onPress={()=>{setFeedbackOutcome(item.id);setFeedbackSaved('')}} style={[coachStyles.feedbackChoice,active&&coachStyles.feedbackChoiceOn]}><Ionicons name={active?'checkmark-circle':item.icon} size={17} color={active?colors.gold:colors.muted}/><Text style={[coachStyles.feedbackChoiceText,active&&coachStyles.feedbackChoiceTextOn]}>{item.label}</Text></Pressable>})}</View>
      <Text style={styles.sectionLabel}>TEACH BROAD PREFERENCES</Text><Text style={styles.helper}>Choose “More” or “Less.” The other person is never scored from your private answer.</Text><View style={coachStyles.feedbackLearningGrid}>{learningFacets.map(facet=>{const value=feedbackSignals[facet.id];return <View key={facet.id} style={coachStyles.feedbackLearningCard}><View style={{flex:1}}><Text style={coachStyles.feedbackLearningTitle}>{facet.title}</Text><Text style={coachStyles.feedbackLearningBody}>{facet.body}</Text></View><View style={coachStyles.feedbackDirectionRow}><Pressable accessibilityRole="button" accessibilityState={{selected:value==='more'}} onPress={()=>setLearningFacet(facet.id,'more')} style={[coachStyles.feedbackDirection,value==='more'&&coachStyles.feedbackDirectionOn]}><Ionicons name="arrow-up" size={13} color={value==='more'?colors.gold:colors.muted}/><Text style={[coachStyles.feedbackDirectionText,value==='more'&&coachStyles.feedbackDirectionTextOn]}>More</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{selected:value==='less'}} onPress={()=>setLearningFacet(facet.id,'less')} style={[coachStyles.feedbackDirection,value==='less'&&coachStyles.feedbackDirectionLess]}><Ionicons name="arrow-down" size={13} color={value==='less'?colors.pinkSoft:colors.muted}/><Text style={[coachStyles.feedbackDirectionText,value==='less'&&coachStyles.feedbackDirectionTextOn]}>Less</Text></Pressable></View></View>})}</View>
      <View style={coachStyles.feedbackSafety}><MiniPremiumIcon name="shield-checkmark-outline" tone="ruby" size={36} iconSize={17}/><View style={{flex:1}}><Text style={coachStyles.feedbackLearningTitle}>Did you feel safe and respected?</Text><Text style={coachStyles.feedbackLearningBody}>This is a safety signal, never a matching preference.</Text></View><View style={coachStyles.feedbackSafetyChoices}>{(['yes','unsure','no'] as const).map(value=><Pressable accessibilityRole="radio" accessibilityState={{checked:safetyFeeling===value}} key={value} onPress={()=>setSafetyFeeling(value)} style={[coachStyles.feedbackSafetyChoice,safetyFeeling===value&&coachStyles.feedbackSafetyChoiceOn]}><Text style={coachStyles.feedbackSafetyChoiceText}>{value==='yes'?'Yes':value==='unsure'?'Unsure':'No'}</Text></Pressable>)}</View></View>
      <Pressable accessibilityRole="switch" accessibilityState={{checked:useFeedbackForMatching}} onPress={()=>{setUseFeedbackForMatching(value=>!value);setFeedbackSaved('')}} style={[coachStyles.feedbackConsent,useFeedbackForMatching&&coachStyles.feedbackConsentOn]}><MiniPremiumIcon name={useFeedbackForMatching?'options':'lock-closed-outline'} tone={useFeedbackForMatching?'gold':'dark'} size={34} iconSize={16}/><View style={{flex:1}}><Text style={coachStyles.feedbackConsentTitle}>Use this outcome to improve my future introductions</Text><Text style={coachStyles.feedbackConsentText}>{useFeedbackForMatching?'Consent on. Only broad selected signals enter the developer handoff.':'Off by default. Outcome, note and safety response remain outside matching.'}</Text></View><View style={[discoveryStyles.switch,useFeedbackForMatching&&discoveryStyles.switchOn]}><View style={[discoveryStyles.switchThumb,useFeedbackForMatching&&discoveryStyles.switchThumbOn]}/></View></Pressable>
      <View style={coachStyles.feedbackSummary}><Ionicons name="git-branch-outline" size={17} color={colors.gold}/><Text style={coachStyles.feedbackSummaryText}>{Object.keys(feedbackSignals).length?`${Object.values(feedbackSignals).filter(value=>value==='more').length} “more” and ${Object.values(feedbackSignals).filter(value=>value==='less').length} “less” signals selected.`:'No learning preferences selected yet.'} Backend ranking weights and storage remain for your developer.</Text></View>
      <Pressable onPress={prepareLearningFeedback} style={coachStyles.feedbackPrepareButton}><Ionicons name="sparkles" size={17} color={colors.ivory}/><Text style={coachStyles.feedbackPrepareText}>Prepare private feedback</Text></Pressable>{!!feedbackSaved&&<Text style={coachStyles.feedbackSaved}>{feedbackSaved}</Text>}
    </View>}<View style={coachStyles.coachActions}><Pressable onPress={saveNote} style={[coachStyles.rsvpButton,{flex:1}]}><Text style={coachStyles.rsvpText}>{saved?'Saved':'Save note'}</Text></Pressable><Pressable onPress={()=>onUseInChat(output)} style={[coachStyles.rsvpButton,{flex:1,backgroundColor:'#7A1024'}]}><Text style={coachStyles.rsvpText}>Use in chat</Text></Pressable></View>{saved&&<View style={coachStyles.savedNote}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={28} iconSize={13}/><Text style={coachStyles.savedNoteText}>Coach note saved for this preview session. Production will store private notes securely.</Text></View>}</View>
    <View style={coachStyles.outputCard}><Text style={styles.kicker}>WHY THIS MATCH</Text><Text style={styles.helper}>For {match.name}, the coach sees:</Text><View style={aiStyles.reasonRow}>{(reasons.length?reasons:['Serious intent','Values-led profile','Compatible lifestyle']).map(reason=><View key={reason} style={aiStyles.reasonPill}><MiniPremiumIcon name="sparkles" tone="gold" size={21} iconSize={10}/><Text style={aiStyles.reasonText}>{reason}</Text></View>)}</View><Text style={styles.helper}>No percentages are shown. The algorithm keeps scoring internal and explains matches in plain language.</Text></View>
    <View style={coachStyles.boundaryCard}><PremiumIcon name="lock-closed" tone="gold" size={44} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>Privacy boundary</Text><Text style={styles.helper}>Coach never reads phone search history, contacts, external chats or photos you did not choose.</Text></View></View>
    <Button label="Tune my match filters" variant="secondary" icon="options" onPress={onOpenFilters}/>
  </ScrollView></SafeAreaView></LinearGradient>
}

