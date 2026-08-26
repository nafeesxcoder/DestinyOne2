import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MiniPremiumIcon, PremiumIcon } from '../../../components/premium/PremiumIcon';
import type { Match } from '../../../data';
import { colors } from '../../../theme';
import { journeyStylesNew } from '../../../theme/appStyles';

export function TwoPersonJourneyScreen({partner,onBack,onOpenChat,onOpenDates,onOpenSafety}:{partner:Match;onBack:()=>void;onOpenChat:()=>void;onOpenDates:()=>void;onOpenSafety:()=>void}){
  const [done,setDone]=useState<string[]>(['match']);
  const [note,setNote]=useState('');
  const [familyRoomOpen,setFamilyRoomOpen]=useState(false);
  const [familyConsent,setFamilyConsent]=useState(false);
  const [familyShares,setFamilyShares]=useState<string[]>(['milestones']);
  const [inviteName,setInviteName]=useState('');
  const [inviteRole,setInviteRole]=useState('Parent / guardian');
  const [familyInvites,setFamilyInvites]=useState<Array<{id:string;name:string;role:string}>>([]);
  const [familyStatus,setFamilyStatus]=useState('Optional and off by default. Nothing is shared until both partners approve on the backend.');
  const milestones=[
    {id:'match',icon:'heart-outline' as const,title:'A mutual hello',body:'You both chose to start a conversation.',action:'Complete'},
    {id:'talk',icon:'chatbubble-outline' as const,title:'Find your rhythm',body:'Share a little more than small talk.',action:'Open chat'},
    {id:'plan',icon:'calendar-outline' as const,title:'Plan a public first date',body:'Choose a safe place and a time that works.',action:'Plan date'},
    {id:'reflect',icon:'sparkles-outline' as const,title:'Check in with yourself',body:'Private reflection keeps the next step clear.',action:'Add reflection'},
    {id:'exclusive',icon:'infinite-outline' as const,title:'Define the relationship',body:'A private, mutual conversation—not an automatic status change.',action:'Mark discussed'},
    {id:'family',icon:'people-outline' as const,title:'Meet the people who matter',body:'Optional family or chosen-family introductions when both feel ready.',action:'Family Room'},
    {id:'future',icon:'home-outline' as const,title:'Build shared future plans',body:'Talk about home, family, money and marriage pace without a public score.',action:'Mark discussed'},
  ];
  const completeMilestone=(id:string)=>setDone(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const handleMilestone=(id:string)=>{
    if(id==='talk'){onOpenChat();return}
    if(id==='plan'){onOpenDates();return}
    if(id==='reflect'){setNote('A private reflection is ready below.');return}
    if(id==='family'){setFamilyRoomOpen(true);setFamilyStatus('Family Room setup opened in the frontend. Partner approval and real invitations remain backend work.');return}
    completeMilestone(id);
  };
  const toggleFamilyShare=(id:string)=>setFamilyShares(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const addFamilyInvite=()=>{
    const name=inviteName.trim();
    if(!name){setFamilyStatus('Add a name before preparing an invitation draft.');return}
    if(!familyConsent){setFamilyStatus('Approve your side of Family Room consent before preparing invitations.');return}
    const id=`family-${Date.now()}`;
    setFamilyInvites(current=>[...current,{id,name,role:inviteRole}]);
    setInviteName('');
    setFamilyStatus(`${name} added as a frontend invitation draft. No message or account invitation was sent.`);
  };
  const progress=Math.round(done.length/milestones.length*100);
  return <SafeAreaView style={journeyStylesNew.safe} edges={['top']}><View style={journeyStylesNew.header}><Pressable onPress={onBack} style={journeyStylesNew.back}><Ionicons name="arrow-back" size={21} color={colors.plum}/></Pressable><View style={{flex:1}}><Text style={journeyStylesNew.eyebrow}>TWO-PERSON DATE JOURNEY</Text><Text style={journeyStylesNew.headerTitle}>You and {partner.name}</Text></View></View><ScrollView contentContainerStyle={journeyStylesNew.content} showsVerticalScrollIndicator={false}>
    <LinearGradient colors={['#FFF2EE','#F7DCE5']} style={journeyStylesNew.hero}><PremiumIcon name="heart" tone="ruby" size={50} iconSize={23}/><View style={{flex:1}}><Text style={journeyStylesNew.heroTitle}>Let the next step feel natural.</Text><Text style={journeyStylesNew.heroBody}>A quiet shared path from first hello to a thoughtful plan. No pressure, no public timeline.</Text></View></LinearGradient>
    <View style={journeyStylesNew.progressCard}><View style={journeyStylesNew.progressHead}><Text style={journeyStylesNew.progressTitle}>Your shared path</Text><Text style={journeyStylesNew.progressValue}>{progress}%</Text></View><View style={journeyStylesNew.progressTrack}><View style={[journeyStylesNew.progressFill,{width:`${progress}%`}]} /></View><Text style={journeyStylesNew.progressBody}>{done.length} of {milestones.length} moments complete</Text></View>
    <View style={journeyStylesNew.timeline}>{milestones.map((milestone,index)=>{const complete=done.includes(milestone.id);return <View key={milestone.id} style={journeyStylesNew.milestoneRow}><View style={journeyStylesNew.rail}><View style={[journeyStylesNew.milestoneIcon,complete&&journeyStylesNew.milestoneIconDone]}><Ionicons name={complete?'checkmark':milestone.icon} size={17} color={complete?colors.plum:colors.pink}/></View>{index<milestones.length-1&&<View style={[journeyStylesNew.line,complete&&journeyStylesNew.lineDone]}/>}</View><View style={[journeyStylesNew.milestone,complete&&journeyStylesNew.milestoneDone]}><Text style={journeyStylesNew.milestoneTitle}>{milestone.title}</Text><Text style={journeyStylesNew.milestoneBody}>{milestone.body}</Text><Pressable onPress={()=>handleMilestone(milestone.id)} style={journeyStylesNew.milestoneAction}><Text style={journeyStylesNew.milestoneActionText}>{complete?'Done':milestone.action}</Text><Ionicons name="arrow-forward" size={14} color={colors.pink}/></Pressable></View></View>})}</View>
    <View style={journeyStylesNew.familyEntry}><PremiumIcon name="people-circle-outline" tone="gold" size={50} iconSize={23}/><View style={{flex:1}}><Text style={journeyStylesNew.familyEyebrow}>OPTIONAL FAMILY ROOM</Text><Text style={journeyStylesNew.familyTitle}>Bring in trusted people—only when you both choose.</Text><Text style={journeyStylesNew.familyBody}>A small invite-only space for selected milestones, celebrations and event plans. It never opens your dating activity.</Text></View><Pressable accessibilityRole="switch" accessibilityState={{checked:familyRoomOpen}} accessibilityLabel="Optional Family Room" onPress={()=>{setFamilyRoomOpen(value=>!value);setFamilyStatus(!familyRoomOpen?'Family Room setup opened. Nothing has been shared.':'Family Room setup closed. No frontend invitation drafts were sent.')}} style={[journeyStylesNew.familySwitch,familyRoomOpen&&journeyStylesNew.familySwitchOn]}><View style={[journeyStylesNew.familySwitchThumb,familyRoomOpen&&journeyStylesNew.familySwitchThumbOn]}/></Pressable></View>
    {familyRoomOpen&&<View style={journeyStylesNew.familyPanel}>
      <View style={journeyStylesNew.familyConsentCard}><MiniPremiumIcon name={familyConsent?'checkmark-circle':'lock-closed-outline'} tone={familyConsent?'gold':'ruby'} size={38} iconSize={18}/><View style={{flex:1}}><Text style={journeyStylesNew.familyConsentTitle}>Two-person approval required</Text><Text style={journeyStylesNew.familyConsentBody}>You can approve your side here. {partner.name} must approve independently before the backend activates sharing or sends invitations.</Text></View><Pressable accessibilityRole="checkbox" accessibilityState={{checked:familyConsent}} onPress={()=>{setFamilyConsent(value=>!value);setFamilyStatus(!familyConsent?'Your side is approved in this preview. Partner approval is still required.':'Your Family Room approval was removed in this preview.')}} style={[journeyStylesNew.familyConsentButton,familyConsent&&journeyStylesNew.familyConsentButtonOn]}><Ionicons name={familyConsent?'checkmark':'person-outline'} size={15} color={familyConsent?colors.plum:colors.ivory}/><Text style={[journeyStylesNew.familyConsentButtonText,familyConsent&&journeyStylesNew.familyConsentButtonTextOn]}>{familyConsent?'You approved':'Approve my side'}</Text></Pressable></View>
      <Text style={journeyStylesNew.familySectionLabel}>WHAT FAMILY MAY SEE</Text><View style={journeyStylesNew.familyShareList}>{([
        ['milestones','Selected milestone updates','Only milestones both partners mark shareable.','flag-outline'],
        ['celebrations','Celebrations & announcements','Birthdays, engagement news or chosen moments.','sparkles-outline'],
        ['events','Family event plans','Invite details for a dinner, ceremony or gathering.','calendar-outline'],
      ] as const).map(([id,title,body,icon])=>{const active=familyShares.includes(id);return <Pressable accessibilityRole="checkbox" accessibilityState={{checked:active}} key={id} onPress={()=>toggleFamilyShare(id)} style={[journeyStylesNew.familyShare,active&&journeyStylesNew.familyShareOn]}><MiniPremiumIcon name={(active?'checkmark-circle':icon) as keyof typeof Ionicons.glyphMap} tone={active?'gold':'dark'} size={32} iconSize={15}/><View style={{flex:1}}><Text style={journeyStylesNew.familyShareTitle}>{title}</Text><Text style={journeyStylesNew.familyShareBody}>{body}</Text></View></Pressable>})}</View>
      <Text style={journeyStylesNew.familySectionLabel}>PREPARE INVITATION DRAFTS</Text><View style={journeyStylesNew.familyInviteBuilder}><TextInput value={inviteName} onChangeText={setInviteName} placeholder="Trusted person’s name" placeholderTextColor="#927D82" style={journeyStylesNew.familyInput}/><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={journeyStylesNew.familyRoleRow}>{['Parent / guardian','Sibling','Relative','Chosen family'].map(role=><Pressable key={role} onPress={()=>setInviteRole(role)} style={[journeyStylesNew.familyRole,inviteRole===role&&journeyStylesNew.familyRoleOn]}><Text style={[journeyStylesNew.familyRoleText,inviteRole===role&&journeyStylesNew.familyRoleTextOn]}>{role}</Text></Pressable>)}</ScrollView><Pressable onPress={addFamilyInvite} style={journeyStylesNew.familyInviteButton}><Ionicons name="person-add-outline" size={16} color={colors.ivory}/><Text style={journeyStylesNew.familyInviteButtonText}>Add invitation draft</Text></Pressable></View>
      {!!familyInvites.length&&<View style={journeyStylesNew.familyInviteList}>{familyInvites.map(invite=><View key={invite.id} style={journeyStylesNew.familyInvite}><View style={journeyStylesNew.familyAvatar}><Text style={journeyStylesNew.familyAvatarText}>{invite.name.charAt(0).toUpperCase()}</Text></View><View style={{flex:1}}><Text style={journeyStylesNew.familyInviteName}>{invite.name}</Text><Text style={journeyStylesNew.familyInviteRole}>{invite.role} · draft only</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${invite.name}`} onPress={()=>setFamilyInvites(current=>current.filter(item=>item.id!==invite.id))}><Ionicons name="close-circle-outline" size={20} color={colors.muted}/></Pressable></View>)}</View>}
      <View style={journeyStylesNew.familyNever}><Text style={journeyStylesNew.familyNeverTitle}>NEVER VISIBLE IN FAMILY ROOM</Text><View style={journeyStylesNew.familyNeverGrid}>{['Matches, likes or passes','Private chat or calls','Exact or live location','Safety reports and blocks','Marriage Blueprint answers','Strict dealbreakers'].map(item=><View key={item} style={journeyStylesNew.familyNeverItem}><Ionicons name="eye-off-outline" size={14} color={colors.pink}/><Text style={journeyStylesNew.familyNeverText}>{item}</Text></View>)}</View></View>
      <View style={journeyStylesNew.familyStatus}><Ionicons name="code-slash-outline" size={16} color={colors.gold}/><Text style={journeyStylesNew.familyStatusText}>{familyStatus}</Text></View>
    </View>}
    <View style={journeyStylesNew.reflection}><Text style={journeyStylesNew.reflectionTitle}>Private reflection</Text><Text style={journeyStylesNew.reflectionBody}>What would make the next conversation feel easy and respectful?</Text><TextInput value={note} onChangeText={setNote} placeholder="Write a note for yourself" placeholderTextColor="#987D84" multiline style={journeyStylesNew.reflectionInput}/><Text style={journeyStylesNew.reflectionFine}>{note?'Saved on this device.':'Only you can see this note.'}</Text></View>
    <Pressable onPress={onOpenSafety} style={journeyStylesNew.safetyLink}><MiniPremiumIcon name="shield-checkmark-outline" tone="gold" size={34} iconSize={16}/><View style={{flex:1}}><Text style={journeyStylesNew.safetyLinkTitle}>Set up date safety before you go</Text><Text style={journeyStylesNew.safetyLinkBody}>Check-in reminders and a trusted-contact plan.</Text></View><Ionicons name="arrow-forward" size={17} color={colors.gold}/></Pressable>
  </ScrollView></SafeAreaView>
}


