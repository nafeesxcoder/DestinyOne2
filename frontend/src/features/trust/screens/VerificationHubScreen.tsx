import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, shared } from '../../../components';
import { MiniPremiumIcon, PremiumIcon } from '../../../components/premium/PremiumIcon';
import { colors } from '../../../theme';
import { coachStyles, discoveryStyles, launchStyles, styles, trustHubStyles, ventureStyles } from '../../../theme/appStyles';

export function VerificationHubScreen({preview,verified,selfieUri,hasVoiceIntro,vouches,onBack,onVerify,onOpenSafety}:{preview:boolean;verified:boolean;selfieUri:string;hasVoiceIntro:boolean;vouches:string[];onBack:()=>void;onVerify:()=>void;onOpenSafety:()=>void}){
  const [biometricConsent,setBiometricConsent]=useState(false);
  const [idStatus,setIdStatus]=useState<'not_started'|'submitted'|'verified'>('not_started');
  const [businessStatus,setBusinessStatus]=useState<'not_started'|'submitted'|'verified'>('not_started');
  const [sessionStatus,setSessionStatus]=useState(preview?'Preview device · session controls ready for backend.':'Secure device status unavailable until session sync is connected.');
  const [trustStatus,setTrustStatus]=useState(preview?'Trust Engine preview is ready. Connect providers later for real checks.':'Verification results appear only after a secure provider and server acknowledgement.');
  const idVerified=idStatus==='verified';
  const businessVerified=businessStatus==='verified';
  const trustScore=(verified?25:8)+(selfieUri||verified?15:0)+(hasVoiceIntro?12:0)+Math.min(vouches.length,3)*10+(idVerified?18:idStatus==='submitted'?9:0)+(businessVerified?12:businessStatus==='submitted'?6:0)+(biometricConsent?8:0)+10;
  const steps=[
    {title:'Phone / email login',body:'OTP preview is available now; production connects through the typed AWS Cognito/SNS auth contract.',done:true,icon:'phone-portrait' as const},
    {title:'Biometric consent',body:biometricConsent?'Consent recorded for liveness provider handoff.':'Required before any selfie/liveness vendor runs in production.',done:biometricConsent,icon:'finger-print' as const},
    {title:'Selfie liveness',body:selfieUri||verified?'Selfie/liveness preview completed.':'Add camera or gallery selfie for trust badge.',done:!!selfieUri||verified,icon:'camera' as const},
    {title:'Optional ID check',body:idVerified?'ID provider review marked verified.':idStatus==='submitted'?'ID provider packet prepared for review.':'Production provider can verify ID without showing documents to other members.',done:idVerified,icon:'id-card' as const},
    {title:'Voice intro',body:hasVoiceIntro?'Voice intro improves authenticity.':'Add a short intro so matches can hear your vibe.',done:hasVoiceIntro,icon:'mic' as const},
    {title:'Friend vouches',body:`${vouches.length}/3 character vouches added.`,done:vouches.length>0,icon:'people' as const},
    {title:'Business verification',body:businessVerified?'Executive/business proof marked verified.':businessStatus==='submitted'?'Business review packet prepared.':'Required for Executive Circle before billing.',done:businessVerified,icon:'briefcase' as const},
  ];
  const memberBadges=[
    {title:'Verified Member',body:'Shown after phone/email + selfie check.',icon:'shield-checkmark' as const,done:verified},
    {title:'ID Checked',body:'Optional badge after private ID provider approval.',icon:'id-card' as const,done:idVerified},
    {title:'Executive Ready',body:'Business verification for $5,000/year circle.',icon:'briefcase' as const,done:businessVerified},
    {title:'Voice Intro',body:'Signals authenticity without exposing private data.',icon:'mic' as const,done:hasVoiceIntro},
    {title:'Trusted Circle',body:'Friend vouches add confidence for serious matches.',icon:'people' as const,done:vouches.length>0},
  ];
  const requirePreview=(action:()=>void)=>{if(preview){action();return}setTrustStatus('Secure provider connection required. No verification, consent, or trusted-device result was changed.')};
  const runLiveness=()=>requirePreview(()=>{if(!biometricConsent){setTrustStatus('Please accept biometric consent before liveness verification.');return}onVerify();setTrustStatus('Selfie/liveness preview completed. Production will call a liveness provider here.')});
  const advanceId=()=>requirePreview(()=>{if(idStatus==='not_started'){setIdStatus('submitted');setTrustStatus('ID review packet prepared. Production will upload encrypted documents to the provider.');return}setIdStatus('verified');setTrustStatus('ID check marked verified in preview. Public profile only shows a simple badge.')});
  const advanceBusiness=()=>requirePreview(()=>{if(businessStatus==='not_started'){setBusinessStatus('submitted');setTrustStatus('Business verification packet prepared for Executive Circle review.');return}setBusinessStatus('verified');setTrustStatus('Business verification marked approved. Executive Circle can unlock after real review.')});
  const refreshSession=()=>requirePreview(()=>{setSessionStatus(`Preview device refreshed · ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`);setTrustStatus('Session/device preview refreshed. AWS session APIs will store trusted devices and revoke controls.')});
  const providerChecklist=[
    ['Auth provider','Phone/email OTP, resend limits, device/session logs.',true],
    ['Liveness vendor','Biometric consent, selfie capture, duplicate-face checks.',biometricConsent],
    ['ID provider','Encrypted document upload, age gate, manual review fallback.',idStatus!=='not_started'],
    ['Business proof','LinkedIn/company docs, concierge review and approval logs.',businessStatus!=='not_started'],
    ['Fraud rules','Duplicate accounts, money requests, velocity and off-app pressure alerts.',true],
  ] as const;
  return <LinearGradient colors={['#260006',colors.black,colors.black]} style={{flex:1}}><SafeAreaView style={shared.safe}><View style={coachStyles.header}><Pressable onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable><Text style={[styles.cardTitle,{marginLeft:12}]}>Verification & Trust Hub</Text></View><ScrollView contentContainerStyle={coachStyles.content} showsVerticalScrollIndicator={false}>
    <View style={ventureStyles.hero}><PremiumIcon name="shield-checkmark" tone="gold" size={70} iconSize={32}/><Text style={launchStyles.scriptHero}>Trust should feel calm</Text><Text style={[shared.h1,{textAlign:'center'}]}>{verified?'Verified member':'Build your trust profile'}</Text><Text style={[shared.body,{textAlign:'center'}]}>A serious dating app needs proof, privacy and safety — without making onboarding feel scary.</Text></View>
    <View style={ventureStyles.trustMeter}><View style={shared.row}><View><Text style={styles.kicker}>TRUST LEVEL</Text><Text style={ventureStyles.trustScore}>{Math.min(100,trustScore)}%</Text></View><View style={shared.spacer}/><PremiumIcon name={verified?'shield-checkmark':'shield-outline'} tone="gold" size={54} iconSize={25}/></View><View style={ventureStyles.progressTrack}><View style={[ventureStyles.progressFill,{width:`${Math.min(100,trustScore)}%`}]}/></View><Text style={styles.helper}>Internal trust signal only. Members see badges, not private scores.</Text></View>
    <View style={trustHubStyles.badgeGrid}>{memberBadges.map(badge=><View key={badge.title} style={[trustHubStyles.badgeCard,badge.done&&trustHubStyles.badgeCardOn]}><MiniPremiumIcon name={badge.done?'checkmark-circle':badge.icon} tone={badge.done?'gold':'dark'} size={34} iconSize={16}/><Text style={trustHubStyles.badgeTitle}>{badge.title}</Text><Text style={trustHubStyles.badgeBody}>{badge.body}</Text></View>)}</View>
    <View style={trustHubStyles.statusCard}><MiniPremiumIcon name="sparkles" tone="gold" size={30} iconSize={14}/><Text style={trustHubStyles.statusText}>{trustStatus}</Text></View>
    <Pressable onPress={()=>requirePreview(()=>{setBiometricConsent(value=>!value);setTrustStatus(!biometricConsent?'Biometric consent accepted for provider handoff.':'Biometric consent removed in preview.')})} style={[trustHubStyles.consentCard,biometricConsent&&trustHubStyles.consentCardOn]}><PremiumIcon name="finger-print" tone={biometricConsent?'gold':'ruby'} size={46} iconSize={21}/><View style={{flex:1}}><Text style={styles.cardTitle}>Biometric consent</Text><Text style={styles.helper}>{preview?'Required before selfie/liveness checks. Consent is separate from public profile badges.':'Consent can be recorded only through the secure liveness provider flow.'}</Text></View><View style={[discoveryStyles.switch,biometricConsent&&discoveryStyles.switchOn]}><View style={[discoveryStyles.switchThumb,biometricConsent&&discoveryStyles.switchThumbOn]}/></View></Pressable>
    <View style={trustHubStyles.actionGrid}>
      <TrustAction icon="shield-checkmark" title="Real profile verification" body="Phone, email, selfie/liveness and optional ID entry point. AWS adapter implementation stays with your developer." cta="View option" onPress={()=>setTrustStatus('Real profile verification option is ready in the frontend. No badge or private data changed; your developer can connect the secure API here.')}/>
      <TrustAction icon="camera" title={preview?'Run liveness preview':'Selfie liveness'} body={preview?'Completes the selfie/liveness step after consent.':'Requires the connected liveness provider and server review.'} cta={preview?(verified?'Refresh':'Run'):'Unavailable'} onPress={runLiveness}/>
      <TrustAction icon="id-card" title="ID provider packet" body={idStatus==='not_started'?'Prepare encrypted ID review handoff.':idVerified?'Verified in preview.':'Ready for reviewer approval.'} cta={idStatus==='not_started'?'Prepare':idVerified?'Verified':'Mark verified'} onPress={advanceId}/>
      <TrustAction icon="briefcase" title="Business proof" body={businessStatus==='not_started'?'Prepare Executive Circle proof review.':businessVerified?'Executive proof approved.':'Ready for concierge review.'} cta={businessStatus==='not_started'?'Prepare':businessVerified?'Approved':'Approve'} onPress={advanceBusiness}/>
      <TrustAction icon="phone-portrait" title="Device/session" body={sessionStatus} cta={preview?'Refresh':'Unavailable'} onPress={refreshSession}/>
    </View>
    <View style={trustHubStyles.privacyPanel}><PremiumIcon name="eye-off-outline" tone="gold" size={46} iconSize={21}/><View style={{flex:1}}><Text style={styles.cardTitle}>What stays private</Text><Text style={styles.helper}>ID documents, selfie source files, exact trust score, reports, blocks and safety notes are never shown on public profiles.</Text></View></View>
    <View style={ventureStyles.section}>{steps.map(step=><TrustStep key={step.title} {...step}/>)}</View>
    <View style={coachStyles.boundaryCard}><PremiumIcon name="lock-closed" tone="gold" size={44} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>Privacy promise</Text><Text style={styles.helper}>Verification photos, ID details and safety reports stay private. Public profile only shows simple trust badges.</Text></View></View>
    <View style={ventureStyles.section}><Text style={styles.sectionLabel}>PROVIDER READINESS</Text>{providerChecklist.map(([title,body,done])=><VerificationChecklistRow key={title} title={title} body={body} done={done}/>)}</View>
    <View style={ventureStyles.section}><Text style={styles.sectionLabel}>SECURITY FEATURES TO SHIP</Text>{['End-to-end sensitive media rules','Screenshot and abuse reporting hooks','Device/session management','Data export and delete account flow','Blocked-member graph across discovery, likes and chat'].map(item=><VerificationChecklistRow key={item} title={item} body="AWS integration requirement for production release." done={item.includes('delete')||item.includes('Device')}/>)}</View>
    <Button label="Open Safety Center" variant="secondary" icon="shield-checkmark-outline" onPress={onOpenSafety}/>
  </ScrollView></SafeAreaView></LinearGradient>
}

function TrustAction({icon,title,body,cta,onPress}:{icon:keyof typeof Ionicons.glyphMap;title:string;body:string;cta:string;onPress:()=>void}){
  return <View style={trustHubStyles.actionCard}><PremiumIcon name={icon} tone="gold" size={42} iconSize={19}/><View style={{flex:1}}><Text style={trustHubStyles.actionTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View><Pressable onPress={onPress} style={trustHubStyles.actionButton}><Text style={trustHubStyles.actionButtonText}>{cta}</Text></Pressable></View>
}

function TrustStep({title,body,done,icon}:{title:string;body:string;done:boolean;icon:keyof typeof Ionicons.glyphMap}){
  return <View style={ventureStyles.trustStep}><PremiumIcon name={icon} tone={done?'gold':'ruby'} size={42} iconSize={19}/><View style={{flex:1}}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View><MiniPremiumIcon name={done?'checkmark-circle':'ellipse-outline'} tone={done?'gold':'dark'} size={34} iconSize={16}/></View>
}


function VerificationChecklistRow({title,body,done}:{title:string;body:string;done:boolean}){
  return <View style={ventureStyles.checklistRow}><MiniPremiumIcon name={done?'checkmark-circle':'ellipse-outline'} tone={done?'gold':'dark'} size={34} iconSize={16}/><View style={{flex:1}}><Text style={ventureStyles.checkTitle}>{title}</Text><Text style={styles.helper}>{body}</Text></View></View>;
}

