import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MiniPremiumIcon, PremiumIcon } from '../../../components/premium/PremiumIcon';
import type { ProfileDraft } from '../../../storage';
import { colors } from '../../../theme';
import { blueprintStyles } from '../../../theme/appStyles';

export function RelationshipBlueprintScreen({profile,onBack,onOpenJourney,onSaveBlueprint}:{profile:ProfileDraft;onBack:()=>void;onOpenJourney:()=>void;onSaveBlueprint:(input:{pace:string;family:string;home:string;future:string})=>Promise<{saved:boolean}>}){
  const blueprintSections=[
    {id:'commitment',label:'Commitment',body:'Define the pace, structure and clarity you need.',questions:[
      {id:'commitmentPace',label:'Marriage timeline',prompt:'What marriage pace feels intentional to you?',options:['Within 1–2 years','Within 2–3 years','When the relationship feels ready']},
      {id:'relationshipStructure',label:'Relationship structure',prompt:'What kind of commitment are you building toward?',options:['Exclusive and monogamous','Exclusive after a clear conversation','Discuss together before defining it']},
      {id:'futurePlanning',label:'Future conversations',prompt:'When should the bigger life questions come up?',options:['Early and honestly','After a few meaningful dates','Once trust feels established']},
    ]},
    {id:'family',label:'Family',body:'Be honest about children, relatives and care responsibilities.',questions:[
      {id:'children',label:'Children',prompt:'How do children fit into your future?',options:['Definitely want children','Open to children','Do not want children']},
      {id:'familyRole',label:'Family involvement',prompt:'How present should family be in your marriage?',options:['Close and actively involved','Close, with healthy boundaries','Mostly independent as a couple']},
      {id:'caregiving',label:'Care responsibilities',prompt:'How should long-term family care be handled?',options:['Shared responsibility','Plan around each family’s needs','Discuss if and when it arises']},
    ]},
    {id:'life',label:'Life & values',body:'Align the everyday life behind the wedding day.',questions:[
      {id:'location',label:'Future home',prompt:`How flexible are you about building a home${profile.city?` beyond ${profile.city}`:''}?`,options:['Open to relocating','Prefer my current region','Depends on career and family']},
      {id:'faithCulture',label:'Faith & culture',prompt:'What role should faith or culture have at home?',options:['Central to our home','Important, with flexibility','Personal and individually chosen']},
      {id:'dailyLife',label:'Everyday rhythm',prompt:'What kind of shared life feels most natural?',options:['Home-centred and calm','Social and community-oriented','A balance of both']},
    ]},
    {id:'partnership',label:'Partnership',body:'Set expectations for work, money and healthy repair.',questions:[
      {id:'career',label:'Career & ambition',prompt:'How should two careers fit into one marriage?',options:['Both careers supported equally','Take turns through life stages','Prioritize stability over advancement']},
      {id:'money',label:'Money style',prompt:'What financial partnership feels healthiest?',options:['Mostly shared with transparency','Shared goals plus personal accounts','Keep finances mostly separate']},
      {id:'conflict',label:'Conflict & repair',prompt:'What should happen when something feels wrong?',options:['Talk calmly within a day','Take space, then reconnect','Use counselling when we feel stuck']},
    ]},
  ];
  const blueprintQuestions=blueprintSections.flatMap(section=>section.questions);
  const dealbreakerOptions=[
    {id:'intent',title:'Marriage intent mismatch',body:'Exclude people who are unsure about a marriage-minded relationship.'},
    {id:'children',title:'Children-plan conflict',body:'Treat incompatible plans about children as a hard boundary.'},
    {id:'dishonesty',title:'Dishonesty or hidden relationships',body:'No tolerance for material lies, secret partners or identity deception.'},
    {id:'respect',title:'Controlling or disrespectful behaviour',body:'Exclude patterns of pressure, humiliation, threats or boundary violations.'},
    {id:'smoking',title:'Smoking or recreational drugs',body:'Use substance lifestyle preferences as a strict matching boundary.'},
    {id:'addiction',title:'Unmanaged substance misuse',body:'Require honesty, recovery responsibility and a safe relationship environment.'},
    {id:'money',title:'Financial deception or gambling',body:'Exclude hidden debt, financial manipulation or uncontrolled gambling.'},
    {id:'repair',title:'Refuses communication or repair',body:'Require willingness to discuss conflict, take accountability and reconnect.'},
  ];
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [activeSection,setActiveSection]=useState('commitment');
  const [strictEnabled,setStrictEnabled]=useState(true);
  const [dealbreakers,setDealbreakers]=useState<string[]>([]);
  const [shared,setShared]=useState(false);
  const [saveCopy,setSaveCopy]=useState('Your answers stay private until you decide otherwise.');
  const completed=Object.keys(answers).length;
  const complete=completed===blueprintQuestions.length;
  const selectedSection=blueprintSections.find(section=>section.id===activeSection)??blueprintSections[0]!;
  const chooseAnswer=(id:string,option:string)=>{
    const next={...answers,[id]:option};
    setAnswers(next);
    if(Object.keys(next).length===blueprintQuestions.length){
      setSaveCopy('Saving the core private blueprint...');
      void onSaveBlueprint({pace:next.commitmentPace??'',family:next.familyRole??'',home:next.location??'',future:next.futurePlanning??''}).then(result=>setSaveCopy(result.saved?'Core blueprint saved. Strict dealbreakers are ready for your developer to connect.':'Frontend choices saved in this preview. Your developer can connect permanent storage and hard filters.'));
    }else{
      setSaveCopy('Your current choices stay private in this frontend preview.');
    }
  };
  const toggleDealbreaker=(id:string)=>{
    setDealbreakers(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
    setSaveCopy('Strict dealbreaker selection updated in the frontend. Matching enforcement will be connected by your developer.');
  };
  return <SafeAreaView style={blueprintStyles.safe} edges={['top']}><View style={blueprintStyles.header}><Pressable onPress={onBack} style={blueprintStyles.back}><Ionicons name="arrow-back" size={21} color={colors.plum}/></Pressable><View style={{flex:1}}><Text style={blueprintStyles.eyebrow}>MARRIAGE BLUEPRINT</Text><Text style={blueprintStyles.headerTitle}>Plan clearly. Love freely.</Text></View></View><ScrollView contentContainerStyle={blueprintStyles.content} showsVerticalScrollIndicator={false}>
    <LinearGradient colors={['#3D0A17','#72142E']} style={blueprintStyles.hero}><MiniPremiumIcon name="finger-print-outline" tone="gold" size={48} iconSize={22}/><View style={{flex:1}}><Text style={blueprintStyles.heroTitle}>Build the life behind “I do.”</Text><Text style={blueprintStyles.heroBody}>Twelve private choices cover commitment, family, daily life and partnership—without reducing a person to a score.</Text></View><View style={blueprintStyles.heroMetric}><Text style={blueprintStyles.heroMetricValue}>{completed}/12</Text><Text style={blueprintStyles.heroMetricLabel}>ANSWERED</Text></View></LinearGradient>
    <View style={blueprintStyles.privateNote}><MiniPremiumIcon name="lock-closed-outline" tone="gold" size={30} iconSize={14}/><Text style={blueprintStyles.privateText}>Your answers are private. DestinyOne shows shared conversation areas, never a compatibility percentage.</Text></View>
    <View style={blueprintStyles.progressRow}><Text style={blueprintStyles.progressText}>{completed} of {blueprintQuestions.length} answered</Text><View style={blueprintStyles.progressTrack}><View style={[blueprintStyles.progressFill,{width:`${completed/blueprintQuestions.length*100}%`}]} /></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={blueprintStyles.sectionTabs}>{blueprintSections.map(section=>{const count=section.questions.filter(question=>answers[question.id]).length;const active=section.id===selectedSection.id;return <Pressable accessibilityRole="tab" accessibilityState={{selected:active}} key={section.id} onPress={()=>setActiveSection(section.id)} style={[blueprintStyles.sectionTab,active&&blueprintStyles.sectionTabActive]}><Text style={[blueprintStyles.sectionTabText,active&&blueprintStyles.sectionTabTextActive]}>{section.label}</Text><Text style={[blueprintStyles.sectionTabCount,active&&blueprintStyles.sectionTabCountActive]}>{count}/3</Text></Pressable>})}</ScrollView>
    <View style={blueprintStyles.sectionIntro}><View style={{flex:1}}><Text style={blueprintStyles.sectionEyebrow}>PART {String(blueprintSections.findIndex(section=>section.id===selectedSection.id)+1).padStart(2,'0')}</Text><Text style={blueprintStyles.sectionTitle}>{selectedSection.label}</Text><Text style={blueprintStyles.sectionBody}>{selectedSection.body}</Text></View><MiniPremiumIcon name={selectedSection.id==='commitment'?'diamond-outline':selectedSection.id==='family'?'people-outline':selectedSection.id==='life'?'home-outline':'heart-circle-outline'} tone="ruby" size={42} iconSize={19}/></View>
    {selectedSection.questions.map(question=>{const index=blueprintQuestions.findIndex(item=>item.id===question.id);return <View key={question.id} style={blueprintStyles.questionCard}><Text style={blueprintStyles.questionNumber}>{String(index+1).padStart(2,'0')}</Text><Text style={blueprintStyles.questionLabel}>{question.label.toUpperCase()}</Text><Text style={blueprintStyles.questionPrompt}>{question.prompt}</Text><View style={blueprintStyles.optionList}>{question.options.map(option=><Pressable accessibilityRole="radio" accessibilityState={{checked:answers[question.id]===option}} key={option} onPress={()=>chooseAnswer(question.id,option)} style={[blueprintStyles.option,answers[question.id]===option&&blueprintStyles.optionActive]}><Text style={[blueprintStyles.optionText,answers[question.id]===option&&blueprintStyles.optionTextActive]}>{option}</Text>{answers[question.id]===option&&<Ionicons name="checkmark-circle" size={16} color={colors.gold}/>}</Pressable>)}</View></View>})}
    <View style={blueprintStyles.dealbreakerPanel}><View style={blueprintStyles.dealbreakerHeader}><PremiumIcon name="shield-checkmark" tone="ruby" size={50} iconSize={23}/><View style={{flex:1}}><Text style={blueprintStyles.dealbreakerEyebrow}>STRICT DEALBREAKERS</Text><Text style={blueprintStyles.dealbreakerTitle}>Hard boundaries, chosen by you.</Text><Text style={blueprintStyles.dealbreakerBody}>When backend matching is connected, selected conflicts should be excluded—not quietly ranked lower.</Text></View><Pressable accessibilityRole="switch" accessibilityState={{checked:strictEnabled}} accessibilityLabel="Strict dealbreakers" onPress={()=>setStrictEnabled(value=>!value)} style={[blueprintStyles.strictSwitch,strictEnabled&&blueprintStyles.strictSwitchOn]}><View style={[blueprintStyles.strictSwitchThumb,strictEnabled&&blueprintStyles.strictSwitchThumbOn]}/></Pressable></View>
      <View style={[blueprintStyles.dealbreakerGrid,!strictEnabled&&blueprintStyles.dealbreakerGridMuted]}>{dealbreakerOptions.map(option=>{const selected=dealbreakers.includes(option.id);return <Pressable disabled={!strictEnabled} accessibilityRole="checkbox" accessibilityState={{checked:selected,disabled:!strictEnabled}} key={option.id} onPress={()=>toggleDealbreaker(option.id)} style={[blueprintStyles.dealbreakerOption,selected&&blueprintStyles.dealbreakerOptionActive]}><MiniPremiumIcon name={selected?'checkmark':'add'} tone={selected?'gold':'dark'} size={30} iconSize={14}/><View style={{flex:1}}><Text style={blueprintStyles.dealbreakerOptionTitle}>{option.title}</Text><Text style={blueprintStyles.dealbreakerOptionBody}>{option.body}</Text></View></Pressable>})}</View>
      <View style={blueprintStyles.developerNote}><Ionicons name="code-slash-outline" size={17} color={colors.gold}/><Text style={blueprintStyles.developerNoteText}>{strictEnabled?`${dealbreakers.length} strict ${dealbreakers.length===1?'boundary':'boundaries'} selected. Frontend only—your developer will connect storage and server-side exclusion.`:'Strict enforcement is paused. Your selected boundaries remain visible in this preview.'}</Text></View>
    </View>
    <View style={[blueprintStyles.sharedCard,!complete&&blueprintStyles.sharedCardMuted]}><View style={{flex:1}}><Text style={blueprintStyles.sharedTitle}>{shared?'Shared conversation view is ready':'Choose what to share later'}</Text><Text style={blueprintStyles.sharedBody}>{shared?'When you both opt in, you will see discussion themes such as family, pace and future home.':'Finish your private blueprint first. Nothing is shared automatically.'}</Text></View><Pressable disabled={!complete} onPress={()=>setShared(value=>!value)} style={[blueprintStyles.sharedButton,!complete&&blueprintStyles.sharedButtonDisabled]}><Text style={blueprintStyles.sharedButtonText}>{shared?'Private again':'Preview shared view'}</Text></Pressable></View>
    {shared&&<View style={blueprintStyles.revealCard}><Text style={blueprintStyles.revealEyebrow}>WHEN BOTH PEOPLE OPT IN</Text><Text style={blueprintStyles.revealTitle}>Discuss themes, not private answers or strict exclusions.</Text><View style={blueprintStyles.revealPills}>{blueprintSections.map(section=><View key={section.id} style={blueprintStyles.revealPill}><Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.pink}/><Text style={blueprintStyles.revealPillText}>{section.label}</Text></View>)}</View></View>}
    <Text style={blueprintStyles.saveFine}>{saveCopy}</Text><Pressable onPress={onOpenJourney} style={blueprintStyles.journeyButton}><Ionicons name="map-outline" size={18} color={colors.ivory}/><Text style={blueprintStyles.journeyButtonText}>Open our date journey</Text></Pressable>
  </ScrollView></SafeAreaView>
}


