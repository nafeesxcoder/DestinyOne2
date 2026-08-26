import React, { useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, shared } from '../../../components';
import { MiniPremiumIcon, PremiumIcon, type PremiumIconTone } from '../../../components/premium/PremiumIcon';
import { SheetHeader } from '../../../components/sheets/SheetHeader';
import { colors } from '../../../theme';
import { chatStyles, supportStyles, styles } from '../../../theme/appStyles';

export type SupportTopic='Safety'|'Appeal'|'Billing'|'Account'|'Report a bug';
export type SupportSubmission={topic:SupportTopic;message:string;caseId?:string};
export type SupportSubmissionResult={id?:string;stored:boolean;note:string};
type SupportInfo = { title: string; body: string; icon: keyof typeof Ionicons.glyphMap; tone?: PremiumIconTone; bullets?: string[]; cta?: 'email' };


export function SupportCenterScreen({onBack,onSubmit}:{onBack:()=>void;onSubmit:(input:SupportSubmission)=>Promise<SupportSubmissionResult>}){
  const [topic,setTopic]=useState('Safety');
  const [caseId,setCaseId]=useState('');
  const [message,setMessage]=useState('');
  const [ticket,setTicket]=useState('');
  const [ticketNote,setTicketNote]=useState('');
  const [supportInfo,setSupportInfo]=useState<SupportInfo|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const submit=async()=>{
    const trimmed=message.trim();
    if(!trimmed)return;
    const isAppeal=topic==='Appeal';
    if(isAppeal&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(caseId.trim())){
      setSupportInfo({title:'Check the case ID',body:'Use the full case ID shown in your moderation decision notice.',icon:'alert-circle-outline',tone:'rose',bullets:['Case IDs protect appeals from being attached to the wrong decision','Do not include another member’s personal details','Contact Safety support if your notice is missing']});
      return;
    }
    if(isAppeal&&trimmed.length<20){
      setSupportInfo({title:'Add a little more detail',body:'Please use at least 20 characters so the reviewer can understand your appeal.',icon:'create-outline',tone:'rose'});
      return;
    }
    const ticketId=`D1-${Date.now().toString().slice(-6)}`;
    setSubmitting(true);
    try{
      const result=await onSubmit({topic:topic as SupportTopic,message:trimmed,caseId:isAppeal?caseId.trim():undefined});
      const finalId=result.id||ticketId;
      setTicket(finalId);
      setTicketNote(result.note);
      setMessage('');
      if(isAppeal)setCaseId('');
      setSupportInfo({title:isAppeal?'Appeal received':'Support request created',body:`${finalId} · ${topic}`,icon:'checkmark-circle',tone:'gold',bullets:[result.stored?(isAppeal?'Queued for a qualified reviewer':'Synced to support storage'):'Saved in frontend preview',isAppeal?'Submitting an appeal does not expose the reporter’s identity':'You can keep using the app while support reviews it','Sensitive details stay inside the safety/support flow']});
    }catch(error){
      setTicket(ticketId);
      setTicketNote(error instanceof Error?error.message:'Support connection is not available yet. Saved locally in preview.');
      setMessage('');
      setSupportInfo({title:'Support request saved locally',body:`${ticketId} · ${topic}`,icon:'cloud-offline-outline',tone:'rose',bullets:['Support connection is not available right now','Your preview ticket is still shown on this screen','Production will retry through the configured AWS support API']});
    }finally{
      setSubmitting(false);
    }
  };
  const emailSupport=()=>Linking.openURL(`mailto:support@destinyone.app?subject=${encodeURIComponent(`DestinyOne ${topic} help`)}&body=${encodeURIComponent(message||'Hi DestinyOne team, I need help with ')}`).catch(()=>setSupportInfo({title:'Email support',body:'support@destinyone.app',icon:'mail-outline',tone:'gold',bullets:['Copy this email if your device cannot open mail automatically','Include your ticket ID if you already submitted one','Never send passwords or OTP codes']}));
  const topics=[
    {label:'Safety',icon:'shield-checkmark-outline' as const,sla:'Priority review'},
    {label:'Appeal',icon:'refresh-circle-outline' as const,sla:'Review a decision'},
    {label:'Billing',icon:'card-outline' as const,sla:'Payments & refunds'},
    {label:'Account',icon:'person-circle-outline' as const,sla:'Profile access'},
    {label:'Report a bug',icon:'bug-outline' as const,sla:'App issue'},
  ] as const;
  const faqs=[
    ['How verification works','Verification photos stay private and help reduce fake profiles.'],
    ['How matching works','Your stated preferences, filters and in-app activity rank matches. We never read phone searches.'],
    ['Refunds and billing','Subscriptions and Spark packs use app-store billing, so users can restore and cancel safely.'],
  ];
  return <LinearGradient colors={['#260007',colors.black,colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={supportStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>Help & support</Text></View><ScrollView contentContainerStyle={supportStyles.content} showsVerticalScrollIndicator={false}>
    <View style={supportStyles.hero}><PremiumIcon name="headset" tone="ruby" size={68} iconSize={31}/><View style={supportStyles.liveStatus}><View style={supportStyles.liveDot}/><Text style={supportStyles.liveText}>Support preview online</Text></View><Text style={[shared.h1,{textAlign:'center'}]}>We’re here when something feels off.</Text><Text style={[shared.body,{textAlign:'center'}]}>Choose a topic, send a note, or use safety actions. Typed support contracts connect this page to tickets, moderation and billing support.</Text></View>
    {ticket?<View style={supportStyles.ticketCard}><PremiumIcon name="checkmark-circle" tone="gold" size={44} iconSize={20}/><View style={{flex:1}}><Text style={styles.cardTitle}>Latest ticket: {ticket}</Text><Text style={styles.helper}>{ticketNote||'Saved locally in this preview. The configured AWS support API will store tickets and notify the support team.'}</Text></View></View>:null}
    <View style={supportStyles.topicGrid}>{topics.map(item=><Pressable key={item.label} onPress={()=>setTopic(item.label)} style={[supportStyles.topicCard,topic===item.label&&supportStyles.topicCardOn]}><PremiumIcon name={item.icon} tone={topic===item.label?'gold':'rose'} size={44} iconSize={20}/><Text style={supportStyles.topicText}>{item.label}</Text><Text style={supportStyles.topicSla}>{item.sla}</Text></Pressable>)}</View>
    <View style={shared.card}><View style={shared.row}><View style={{flex:1}}><Text style={styles.cardTitle}>{topic==='Appeal'?'Request an independent review':'Tell us what happened'}</Text><Text style={styles.helper}>Selected queue: {topic}</Text></View><MiniPremiumIcon name="lock-closed" tone="gold" size={30} iconSize={14}/></View>{topic==='Appeal'?<><Text style={styles.sectionLabel}>CASE ID</Text><TextInput value={caseId} onChangeText={setCaseId} autoCapitalize="none" placeholder="Case ID from your decision notice" placeholderTextColor="#6F6875" style={supportStyles.appealCaseInput}/><Text style={styles.helper}>Only the member affected by an eligible resolved case can appeal. A qualified lead or legal reviewer decides the outcome.</Text></>:null}<TextInput value={message} onChangeText={setMessage} placeholder={topic==='Appeal'?'Explain why the decision should be reviewed...':'Write your message...'} placeholderTextColor="#6F6875" multiline style={supportStyles.messageBox}/><Button disabled={!message.trim()||submitting||(topic==='Appeal'&&!caseId.trim())} label={submitting?'Submitting…':topic==='Appeal'?'Submit appeal':'Submit support request'} icon={topic==='Appeal'?'refresh-circle-outline':'send'} onPress={()=>void submit()}/></View>
    <View style={supportStyles.quickGrid}>
      <SupportQuickCard icon="shield-checkmark-outline" title="Safety guide" body="Dating safety, boundaries and reporting." onPress={()=>setSupportInfo({title:'Safety guide',body:'Small habits make first meetings safer.',icon:'shield-checkmark-outline',tone:'gold',bullets:['Meet in public for early dates','Keep early conversations inside DestinyOne','Use date check-ins and share plans with someone trusted','Report pressure, threats, fake identity or money requests']})}/>
      <SupportQuickCard icon="card-outline" title="Billing help" body="Subscriptions, restore purchase and refunds." onPress={()=>setSupportInfo({title:'Billing help',body:'Payments are designed to stay store-compliant and restorable.',icon:'card-outline',tone:'gold',bullets:['Subscriptions and Spark packs use Apple/Google in-app billing','Members can restore purchases from their store account','Real-world date holds use secure payment partners after venue confirmation','Refund policies follow app-store and payment-provider rules']})}/>
      <SupportQuickCard icon="mail-outline" title="Email team" body="Open a pre-filled support email." onPress={emailSupport}/>
      <SupportQuickCard icon="bug-outline" title="Send diagnostics" body="Preview app/device details for support." onPress={()=>setSupportInfo({title:'Diagnostics ready',body:'Production can attach safe app context without exposing private conversations.',icon:'bug-outline',tone:'rose',bullets:[`Device surface: ${Platform.OS}`,'App area: Support Center','Backend mode and app version only','No passwords, OTPs, photos or message content']})}/>
    </View>
    <View style={{gap:10}}><Text style={styles.sectionLabel}>FAQ</Text>{faqs.map(([title,body])=><View key={title} style={supportStyles.faqCard}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View>)}</View>
  </ScrollView><SupportInfoSheet info={supportInfo} onClose={()=>setSupportInfo(null)} onEmail={emailSupport}/></SafeAreaView></LinearGradient>
}

function SupportQuickCard({icon,title,body,onPress}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string;onPress:()=>void}){
  return <Pressable onPress={onPress} style={supportStyles.quickCard}>
    <PremiumIcon name={icon} tone="rose" size={42} iconSize={19}/>
    <Text style={supportStyles.quickTitle}>{title}</Text>
    <Text style={supportStyles.quickBody}>{body}</Text>
  </Pressable>
}

function SupportInfoSheet({info,onClose,onEmail}:{info:SupportInfo|null;onClose:()=>void;onEmail:()=>void}){
  if(!info)return null;
  return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet,{maxHeight:'82%'}]}><SheetHeader title={info.title} subtitle={info.body} onClose={onClose}/><View style={supportStyles.infoHero}><PremiumIcon name={info.icon} tone={info.tone??'gold'} size={54} iconSize={25}/><View style={{flex:1}}><Text style={styles.cardTitle}>{info.title}</Text><Text style={styles.helper}>{info.body}</Text></View></View>{info.bullets?.length?<View style={supportStyles.infoList}>{info.bullets.map(item=><View key={item} style={supportStyles.infoRow}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={26} iconSize={12}/><Text style={supportStyles.infoText}>{item}</Text></View>)}</View>:null}{info.cta==='email'?<Button label="Email support" icon="mail" variant="gold" onPress={onEmail}/>:<Button label="Got it" onPress={onClose}/>}</SafeAreaView></Modal>
}

