import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, Field, shared } from '../../components';
import { BottomNav, handleBottomNavScroll } from '../../components/navigation/BottomNav';
import { MiniPremiumIcon, PremiumIcon } from '../../components/premium/PremiumIcon';
import type { Screen } from '../../app/navigation/types';
import { matches } from '../../data';
import { colors } from '../../theme';
import { coachStyles, styles, supportStyles, ventureStyles } from '../../theme/appStyles';

const executiveMetrics=[
  {label:'Membership',value:'Invite-only circle',icon:'lock-closed' as const},
  {label:'Price point',value:'$5,000 / year',icon:'diamond' as const},
  {label:'Matching style',value:'Handpicked intros',icon:'people' as const},
  {label:'Privacy',value:'Hidden profile mode',icon:'shield-checkmark' as const},
];
const executiveRequirements=[
  ['Business identity','Founder, business owner, investor, doctor, lawyer, executive or senior professional.'],
  ['Serious intent','Long-term relationship or marriage only — no casual dating positioning.'],
  ['Verification','Selfie, phone/email, optional ID and business/profile verification before approval.'],
  ['Privacy standard','No public income display. Sensitive checks remain private and manual.'],
] as const;
const executiveServices=[
  {title:'Private matchmaker review',body:'A concierge reviews goals, lifestyle, city, family expectations and privacy needs before intros.',icon:'person' as const},
  {title:'Handpicked weekly introductions',body:'No endless swiping. Members receive a small set of serious, verified prospects.',icon:'heart' as const},
  {title:'VIP date planning',body:'Curated restaurant, lounge, café or private event suggestions with optional reservation holds.',icon:'calendar' as const},
  {title:'Luxury gifting',body:'Flowers, dessert, handwritten card or premium surprise gifts can be ordered inside the app.',icon:'gift' as const},
  {title:'Executive privacy mode',body:'Hide from public discovery and appear only to approved Executive Circle members.',icon:'eye-off' as const},
  {title:'Priority safety support',body:'Faster report review, scam checks, verified events and safer date check-ins.',icon:'shield-checkmark' as const},
];
const executiveMatches=[
  {name:'Rohan',age:34,role:'SaaS founder',city:'New York, NY',intent:'Marriage-minded',vibe:'Family-first · Ambitious · Private',photo:matches[4]!.photo},
  {name:'Karan',age:35,role:'Hospitality group owner',city:'Dallas, TX',intent:'Serious relationship',vibe:'Business-minded · Foodie · Spiritual',photo:matches[8]!.photo},
  {name:'Dev',age:33,role:'Venture partner',city:'San Francisco, CA',intent:'Open to marriage',vibe:'Travel · Fitness · Long-term',photo:matches[12]!.photo},
] as const;
const executiveApplicationSteps=[
  ['Application submitted','Member answers privacy, intent, city and relationship goals.'],
  ['Verification review','Selfie, optional ID, business proof and profile quality are checked privately.'],
  ['Concierge interview','A short call confirms expectations and dating boundaries.'],
  ['Approved circle','Member unlocks private intros, events, gifting and VIP date planning.'],
] as const;
export function ExecutiveCircleScreen({preview,navigate,onBack,onOpenEvents,onOpenPricing,onOpenVerify,onOpenDatePlan}:{preview:boolean;navigate:(s:Screen)=>void;onBack:()=>void;onOpenEvents:()=>void;onOpenPricing:()=>void;onOpenVerify:()=>void;onOpenDatePlan:()=>void}){
  const {width}=useWindowDimensions();
  const compact=width<600;
  const wide=width>=840;
  const [tab,setTab]=useState<'overview'|'apply'|'matches'|'concierge'>('overview');
  const [application,setApplication]=useState(preview?{role:'Founder / business owner',city:'New York, NY',intent:'Marriage in 12–24 months',privacy:'Hidden profile'}:{role:'',city:'',intent:'',privacy:''});
  const [conciergeNote,setConciergeNote]=useState(preview?'Plan a quiet premium dinner with serious conversation.':'');
  const [status,setStatus]=useState({title:'',body:''});
  const [applicationError,setApplicationError]=useState('');
  const [conciergeError,setConciergeError]=useState('');
  const submitApplication=()=>{setApplicationError('');if(!preview){setApplicationError('Executive application service must be connected before a private application can be submitted.');return}const missing=Object.entries(application).find(([,value])=>value.trim().length<3);if(missing){setApplicationError('Please complete every application field before submitting.');return}setStatus({title:'Application moved to private review',body:`${application.role} · ${application.city} · ${application.intent}. Next: verification + concierge interview.`});setTab('apply')};
  const requestIntro=(name:string)=>setStatus(preview?{title:`Intro request queued for ${name}`,body:'Concierge will review compatibility, privacy preference and relationship intent before any introduction is shown.'}:{title:'Verified concierge connection required',body:'No introduction was requested. Live Executive members will appear only from the approved private feed.'});
  const sendGift=(name:string)=>setStatus(preview?{title:`Luxury gift request started for ${name}`,body:'Choose Real Gift in chat to create the private accept → pay → courier flow. Recipient address remains hidden.'}:{title:'Verified fulfillment connection required',body:'No gift request was created or charged.'});
  const askConcierge=()=>{setConciergeError('');if(!preview){setConciergeError('Executive concierge messaging must be connected before this note can be sent.');return}const note=conciergeNote.trim();if(note.length<20){setConciergeError('Write at least 20 characters so concierge has useful context.');return}setStatus({title:'Concierge note saved',body:note});};
  return <LinearGradient colors={['#FBF7F2','#FFFDFC','#F7EAE8']} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={ventureStyles.pageHeader}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} style={ventureStyles.backButton}><Ionicons name="arrow-back" size={21} color={colors.wine}/></Pressable><View style={{flex:1}}><Text style={styles.kicker}>INVITE-ONLY MEMBERSHIP</Text><Text style={ventureStyles.headerTitle}>Executive Circle</Text></View><View style={ventureStyles.headerBadge}><Ionicons name="shield-checkmark" size={15} color="#7A5914"/><Text style={ventureStyles.headerBadgeText}>Private</Text></View></View><ScrollView onScroll={handleBottomNavScroll} scrollEventThrottle={16} contentContainerStyle={[ventureStyles.pageContent,{paddingHorizontal:compact?16:22}]} showsVerticalScrollIndicator={false}>
    <View style={[ventureStyles.executiveHero,wide&&ventureStyles.heroWide]}>
      <View style={[ventureStyles.heroCopy,wide&&ventureStyles.heroCopyWide]}>
        <View style={ventureStyles.heroIconRow}><PremiumIcon name="briefcase" tone="gold" size={62} iconSize={28}/><View><Text style={ventureStyles.heroKicker}>PRIVATE · VERIFIED · SERIOUS</Text><Text style={ventureStyles.heroScript}>Introductions with intention.</Text></View></View>
        <Text style={[ventureStyles.heroTitle,!wide&&{textAlign:'center'}]}>DestinyOne Executive Circle</Text>
        <Text style={[ventureStyles.heroBody,!wide&&{textAlign:'center'}]}>Invite-only matchmaking for founders, business owners, investors and high-performing professionals who value time, privacy and real commitment.</Text>
        <View style={ventureStyles.trustPills}><View style={ventureStyles.trustPill}><Ionicons name="lock-closed-outline" size={14} color={colors.wine}/><Text style={ventureStyles.trustPillText}>Discreet</Text></View><View style={ventureStyles.trustPill}><Ionicons name="people-outline" size={14} color={colors.wine}/><Text style={ventureStyles.trustPillText}>Human-reviewed</Text></View><View style={ventureStyles.trustPill}><Ionicons name="heart-outline" size={14} color={colors.wine}/><Text style={ventureStyles.trustPillText}>Marriage-minded</Text></View></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Apply for Executive Circle" onPress={()=>setTab('apply')} style={ventureStyles.heroApply}><Ionicons name="briefcase-outline" size={17} color="#FFFFFF"/><Text style={ventureStyles.heroApplyText}>Apply for private review</Text><Ionicons name="arrow-forward" size={17} color="#FFFFFF"/></Pressable>
      </View>
      <LinearGradient colors={['#FFF8E7','#FFFDFC']} style={ventureStyles.pricePanel}>
        <View style={ventureStyles.priceIcon}><Ionicons name="diamond-outline" size={24} color="#7A5914"/></View>
        <Text style={ventureStyles.priceEyebrow}>ANNUAL MEMBERSHIP</Text>
        <View style={ventureStyles.priceRow}><Text style={ventureStyles.priceValue}>$5,000</Text><Text style={ventureStyles.pricePeriod}>/ year</Text></View>
        <Text style={ventureStyles.priceNote}>Application and private verification required before billing.</Text>
        <View style={ventureStyles.priceDivider}/>
        {['Concierge review','Handpicked introductions','Private profile controls'].map(item=><View key={item} style={ventureStyles.includedRow}><Ionicons name="checkmark-circle" size={17} color={colors.gold}/><Text style={ventureStyles.includedText}>{item}</Text></View>)}
      </LinearGradient>
    </View>
    <View style={ventureStyles.metricGrid}>{executiveMetrics.map(item=><MetricPill key={item.label} {...item}/>)}</View>
    <View accessibilityRole="tablist" style={ventureStyles.tabRow}>{(['overview','apply','matches','concierge'] as const).map(item=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===item}} key={item} onPress={()=>setTab(item)} style={[ventureStyles.tabButton,tab===item&&ventureStyles.tabButtonOn]}><Text numberOfLines={1} style={[ventureStyles.tabText,tab===item&&ventureStyles.tabTextOn]}>{item==='overview'?'Overview':item==='apply'?'Apply':item==='matches'?'Matches':'Concierge'}</Text></Pressable>)}</View>
    {!!status.title&&<View style={ventureStyles.statusCard}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={34} iconSize={16}/><View style={{flex:1}}><Text style={ventureStyles.statusTitle}>{status.title}</Text><Text style={styles.helper}>{status.body}</Text></View><Pressable onPress={()=>setStatus({title:'',body:''})}><MiniPremiumIcon name="close" tone="dark" size={28} iconSize={13}/></Pressable></View>}
    {tab==='overview'&&<View style={ventureStyles.section}>
      <View style={ventureStyles.sectionHeader}><View><Text style={styles.sectionLabel}>WHAT MEMBERS GET</Text><Text style={ventureStyles.sectionTitle}>High-touch support, without the noise.</Text></View><Text style={ventureStyles.sectionMeta}>6 private benefits</Text></View>
      <View style={ventureStyles.serviceGrid}>{executiveServices.map((service,index)=><View key={service.title} style={[ventureStyles.serviceCard,compact&&ventureStyles.serviceCardCompact]}><PremiumIcon name={service.icon} tone={index%3===1?'gold':'ruby'} size={44} iconSize={20}/><View style={{flex:1}}><Text style={ventureStyles.serviceTitle}>{service.title}</Text><Text style={ventureStyles.serviceBody}>{service.body}</Text></View></View>)}</View>
      <View style={ventureStyles.actionPanel}><View><Text style={styles.kicker}>READY WHEN YOU ARE</Text><Text style={ventureStyles.actionPanelTitle}>Start with a private application.</Text></View><View style={ventureStyles.actionGrid}><Button label="Apply for Executive Circle" icon="briefcase" variant="gold" onPress={()=>setTab('apply')}/><Button label="View private matches" icon="heart" variant="secondary" onPress={()=>setTab('matches')}/><Button label="Open annual pricing" icon="diamond" variant="secondary" onPress={onOpenPricing}/></View></View>
      <View style={ventureStyles.privacyCard}><PremiumIcon name="lock-closed" tone="gold" size={46} iconSize={21}/><View style={{flex:1}}><Text style={ventureStyles.privacyTitle}>No public wealth display</Text><Text style={ventureStyles.privacyBody}>Income, business proof and ID checks stay private. Members only see calm trust badges such as “Business verified” or “Executive approved.”</Text></View></View>
    </View>}
    {tab==='apply'&&<View style={ventureStyles.section}>
      <View style={ventureStyles.sectionHeader}><View><Text style={styles.sectionLabel}>APPLICATION REQUIREMENTS</Text><Text style={ventureStyles.sectionTitle}>A selective circle starts with trust.</Text></View><Text style={ventureStyles.sectionMeta}>Private review</Text></View>
      {executiveRequirements.map(([title,body],index)=><ChecklistRow key={title} title={title} body={body} done={index<2}/>)}
      <View style={ventureStyles.applicationCard}><View style={ventureStyles.applicationIntro}><PremiumIcon name="document-text-outline" tone="ruby" size={46} iconSize={21}/><View style={{flex:1}}><Text style={ventureStyles.applicationTitle}>Your private application</Text><Text style={styles.helper}>These details are reviewed by the concierge team and are never shown as a public wealth score.</Text></View></View><Field label="Professional role" value={application.role} onChangeText={(role:string)=>{setApplicationError('');setApplication(current=>({...current,role}))}}/><Field label="City" value={application.city} onChangeText={(city:string)=>{setApplicationError('');setApplication(current=>({...current,city}))}}/><Field label="Relationship intent" value={application.intent} onChangeText={(intent:string)=>{setApplicationError('');setApplication(current=>({...current,intent}))}}/><Field label="Privacy preference" value={application.privacy} onChangeText={(privacy:string)=>{setApplicationError('');setApplication(current=>({...current,privacy}))}}/>{!!applicationError&&<View style={ventureStyles.errorCard}><MiniPremiumIcon name="alert-circle-outline" tone="ruby" size={28} iconSize={13}/><Text style={ventureStyles.errorText}>{applicationError}</Text></View>}<Button label="Submit private application" icon="send" onPress={submitApplication}/></View>
      <View style={ventureStyles.section}><Text style={styles.sectionLabel}>APPROVAL FLOW</Text>{executiveApplicationSteps.map(([title,body],index)=><ChecklistRow key={title} title={title} body={body} done={index===0}/>)}</View>
      <Button label="Complete verification first" icon="id-card" variant="secondary" onPress={onOpenVerify}/>
    </View>}
    {tab==='matches'&&<View style={ventureStyles.section}>
      <View style={shared.row}><Text style={styles.sectionLabel}>{preview?'EXECUTIVE-ONLY SAMPLE MATCHES':'EXECUTIVE-ONLY INTRODUCTIONS'}</Text><View style={shared.spacer}/><Pressable onPress={()=>setTab('apply')}><Text style={coachStyles.resultCount}>Apply</Text></Pressable></View>
      {preview?executiveMatches.map(person=><View key={person.name} style={ventureStyles.executiveMatchCard}><Image source={{uri:person.photo}} style={ventureStyles.executivePhoto}/><LinearGradient colors={['transparent','rgba(10,0,3,.96)']} style={StyleSheet.absoluteFill}/><View style={ventureStyles.executiveMatchInfo}><Chip label="Executive approved" gold/><Text style={ventureStyles.executiveName}>{person.name}, {person.age}</Text><Text style={ventureStyles.executiveMatchMeta}>{person.role} · {person.city}</Text><Text style={ventureStyles.executiveMatchBody}>{person.intent} · {person.vibe}</Text><View style={styles.chipRow}><Pressable accessibilityRole="button" accessibilityLabel={`Request intro with ${person.name}`} onPress={()=>requestIntro(person.name)} style={coachStyles.rsvpButton}><Text style={coachStyles.rsvpText}>Request intro</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Plan VIP date with ${person.name}`} onPress={onOpenDatePlan} style={coachStyles.detailsButton}><Text style={coachStyles.detailsText}>VIP date</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Send gift to ${person.name}`} onPress={()=>sendGift(person.name)} style={coachStyles.detailsButton}><Text style={coachStyles.detailsText}>Gift</Text></Pressable></View></View></View>):<View style={[shared.card,{gap:12,alignItems:'center'}]}><PremiumIcon name="shield-checkmark" tone="gold" size={54} iconSize={25}/><Text style={styles.cardTitle}>Approved private feed required</Text><Text style={[styles.helper,{textAlign:'center'}]}>No sample executives are shown in a live account. Approved introductions will appear only after membership, verification and concierge review are confirmed by the server.</Text></View>}
      <Button label="Talk to concierge" icon="person" onPress={()=>setTab('concierge')}/>
    </View>}
    {tab==='concierge'&&<View style={ventureStyles.section}>
      <View style={ventureStyles.conciergeCard}><PremiumIcon name="person" tone="gold" size={64} iconSize={28}/><Text style={ventureStyles.conciergeScript}>Your private matchmaker</Text><Text style={ventureStyles.conciergeTitle}>Tell us what kind of introduction feels right.</Text><Text style={ventureStyles.conciergeBody}>Share the pace, privacy level and kind of setting you prefer. A concierge reviews every request before taking action.</Text><TextInput value={conciergeNote} onChangeText={text=>{setConciergeError('');setConciergeNote(text)}} multiline placeholder="Write concierge request..." placeholderTextColor="#76686C" style={[supportStyles.messageBox,ventureStyles.conciergeInput]}/><Text style={ventureStyles.charCount}>{conciergeNote.trim().length}/20 minimum</Text>{!!conciergeError&&<View style={ventureStyles.errorCard}><MiniPremiumIcon name="alert-circle-outline" tone="ruby" size={28} iconSize={13}/><Text style={ventureStyles.errorText}>{conciergeError}</Text></View>}<Button label="Send to concierge" icon="send" onPress={askConcierge}/></View>
      <Button label="Book private event / dinner" icon="calendar" variant="secondary" onPress={onOpenEvents}/>
      <Button label="Plan a VIP date" icon="restaurant" variant="secondary" onPress={onOpenDatePlan}/>
      <Button label="Upgrade to Executive annual" icon="diamond" variant="gold" onPress={onOpenPricing}/>
    </View>}
  </ScrollView><BottomNav active="executive" navigate={navigate} light/></SafeAreaView></LinearGradient>
}

function MetricPill({label,value,icon}:{label:string;value:string;icon:keyof typeof Ionicons.glyphMap}){
  return <View style={ventureStyles.metricCard}><PremiumIcon name={icon} tone="gold" size={42} iconSize={19}/><Text style={ventureStyles.metricLabel}>{label}</Text><Text style={ventureStyles.metricValue}>{value}</Text></View>
}

export function ChecklistRow({title,body,done}:{title:string;body:string;done:boolean}){
  return <View style={ventureStyles.checklistRow}><MiniPremiumIcon name={done?'checkmark-circle':'ellipse-outline'} tone={done?'gold':'dark'} size={34} iconSize={16}/><View style={{flex:1}}><Text style={ventureStyles.checkTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View></View>
}
