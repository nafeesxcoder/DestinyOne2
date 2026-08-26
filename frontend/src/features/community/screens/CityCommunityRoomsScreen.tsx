import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MiniPremiumIcon, PremiumIcon } from '../../../components/premium/PremiumIcon';
import { colors } from '../../../theme';
import { communityStyles } from '../../../theme/appStyles';

type CommunityRoom = {
  id: string;
  category: string;
  title: string;
  description: string;
  starts_at: string;
};

export function CityCommunityRoomsScreen({city,verified,onBack,onOpenDates,onOpenCircle,onLoadRooms,onJoinRoom}:{city:string;verified:boolean;onBack:()=>void;onOpenDates:()=>void;onOpenCircle:()=>void;onLoadRooms:(city:string)=>Promise<CommunityRoom[]|null>;onJoinRoom:(id:string)=>Promise<{status:string}|null>}){
  const [filter,setFilter]=useState<'For you'|'Professional'|'Culture'|'New here'>('For you');
  const [joined,setJoined]=useState<string[]>([]);
  const [selectedRoomId,setSelectedRoomId]=useState<string|null>(null);
  const [liveRooms,setLiveRooms]=useState<Array<{id:string;kind:'For you'|'Professional'|'Culture'|'New here';icon:keyof typeof Ionicons.glyphMap;title:string;body:string;meta:string}>>([]);
  const [roomStatus,setRoomStatus]=useState('');
  const cityName=city?.trim()||'your city';
  const previewRooms=[
    {id:'coffee',kind:'For you',icon:'cafe-outline' as const,title:`Sunday coffee in ${cityName}`,body:'A small hosted table for people who prefer a gentle, daytime first introduction.',meta:'12 verified members · This Sunday'},
    {id:'career',kind:'Professional',icon:'briefcase-outline' as const,title:'Career & commitment table',body:'A low-key dinner conversation for professionals balancing ambition, family and serious dating.',meta:'8 verified members · Next week'},
    {id:'culture',kind:'Culture',icon:'people-outline' as const,title:'Culture, food & familiar stories',body:'A welcoming room for community events, shared traditions and meeting people with care.',meta:'18 verified members · Monthly'},
    {id:'new',kind:'New here',icon:'map-outline' as const,title:`New to ${cityName}`,body:'Discover neighbourhood plans and a few friendly faces without the pressure of a loud crowd.',meta:'10 verified members · Friday'},
  ];
  useEffect(()=>{
    let active=true;
    setRoomStatus('Looking for hosted rooms nearby...');
    void onLoadRooms(cityName).then(rows=>{
      if(!active)return;
      const mapped=(rows??[]).map(room=>({
        id:room.id,
        kind:room.category as 'For you'|'Professional'|'Culture'|'New here',
        icon:room.category==='Professional'?'briefcase-outline' as const:room.category==='Culture'?'people-outline' as const:room.category==='New here'?'map-outline' as const:'cafe-outline' as const,
        title:room.title,
        body:room.description,
        meta:`Hosted room · ${new Date(room.starts_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}`,
      }));
      setLiveRooms(mapped);
      setRoomStatus(mapped.length?'Live hosted rooms are ready.':'No live rooms are published here yet. Showing the community preview.');
    }).catch(()=>{ if(active){setLiveRooms([]);setRoomStatus('Showing the community preview while live rooms reconnect.');} });
    return()=>{active=false;};
  },[cityName,onLoadRooms]);
  const rooms=liveRooms.length?liveRooms:previewRooms;
  const visibleRooms=filter==='For you'?rooms.slice(0,3):rooms.filter(room=>room.kind===filter);
  const selectedRoom=rooms.find(room=>room.id===selectedRoomId);
  const joinRoom=(id:string)=>{
    if(joined.includes(id))return;
    setRoomStatus('Reserving your room...');
    if(liveRooms.some(room=>room.id===id)){
      void onJoinRoom(id).then(result=>{
        if(!result){setRoomStatus('Sign in to reserve a hosted room.');return;}
        setJoined(current=>current.includes(id)?current:[...current,id]);
        setRoomStatus(result.status==='waitlisted'?'The room is full, so you are on the waitlist.':'Your place is reserved.');
      }).catch(error=>setRoomStatus(error instanceof Error?error.message:'We could not reserve this room right now.'));
      return;
    }
    setJoined(current=>[...current,id]);
    setRoomStatus('Preview RSVP saved on this device. Live rooms will require sign-in.');
  };
  return <SafeAreaView style={communityStyles.safe} edges={['top']}><View style={communityStyles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to Explore" onPress={onBack} style={communityStyles.back}><Ionicons name="arrow-back" size={21} color={colors.plum}/></Pressable><View style={{flex:1}}><Text style={communityStyles.eyebrow}>CITY COMMUNITY</Text><Text style={communityStyles.headerTitle}>Meet with a little more context</Text></View></View><ScrollView contentContainerStyle={communityStyles.content} showsVerticalScrollIndicator={false}>
    <LinearGradient colors={['#FFF4F0','#FCE2DE']} style={communityStyles.hero}><View style={communityStyles.heroIcon}><Ionicons name="people" size={26} color={colors.pink}/></View><View style={{flex:1}}><Text style={communityStyles.heroTitle}>Rooms around {cityName}</Text><Text style={communityStyles.heroBody}>Small, hosted spaces for meaningful conversation, local plans and people who want to show up with intention.</Text></View></LinearGradient>
    <View style={communityStyles.privacy}><MiniPremiumIcon name={verified?'shield-checkmark-outline':'lock-closed-outline'} tone="gold" size={34} iconSize={16}/><Text style={communityStyles.privacyText}>{verified?'Your verified badge is ready for rooms that require it.':'Rooms stay private. Complete verification before joining member-only gatherings.'}</Text></View>{!!roomStatus&&<Text style={communityStyles.liveStatus}>{roomStatus}</Text>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={communityStyles.filters}>{(['For you','Professional','Culture','New here'] as const).map(item=><Pressable key={item} onPress={()=>setFilter(item)} style={[communityStyles.filter,filter===item&&communityStyles.filterActive]}><Text style={[communityStyles.filterText,filter===item&&communityStyles.filterTextActive]}>{item}</Text></Pressable>)}</ScrollView>
    <View style={communityStyles.roomList}>{visibleRooms.map(room=>{const isJoined=joined.includes(room.id);return <View key={room.id} style={communityStyles.room}><Pressable accessibilityRole="button" accessibilityLabel={`View ${room.title}`} onPress={()=>setSelectedRoomId(room.id)} style={communityStyles.roomPress}><View style={communityStyles.roomHeader}><PremiumIcon name={room.icon} tone={room.kind==='Professional'?'gold':'ruby'} size={45} iconSize={20}/><View style={{flex:1}}><Text style={communityStyles.roomKind}>{room.kind.toUpperCase()}</Text><Text style={communityStyles.roomTitle}>{room.title}</Text></View><Ionicons name="chevron-forward" size={17} color={colors.muted}/></View><Text style={communityStyles.roomBody}>{room.body}</Text></Pressable><View style={communityStyles.roomFooter}><Text style={communityStyles.roomMeta}>{room.meta}</Text><Pressable onPress={()=>joinRoom(room.id)} style={[communityStyles.joinButton,isJoined&&communityStyles.joinedButton]}><Text style={[communityStyles.joinButtonText,isJoined&&communityStyles.joinedButtonText]}>{isJoined?'Joined':'Join room'}</Text>{isJoined&&<Ionicons name="checkmark" size={14} color={colors.plum}/>}</Pressable></View></View>})}</View>
    {!!selectedRoom&&<View style={communityStyles.detailCard}><View style={communityStyles.detailHeader}><View style={{flex:1}}><Text style={communityStyles.detailEyebrow}>ROOM DETAILS</Text><Text style={communityStyles.detailTitle}>{selectedRoom.title}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close room details" onPress={()=>setSelectedRoomId(null)} style={communityStyles.detailClose}><Ionicons name="close" size={17} color={colors.plum}/></Pressable></View><View style={communityStyles.hostRow}><View style={communityStyles.hostAvatar}><Text style={communityStyles.hostInitial}>M</Text></View><View style={{flex:1}}><Text style={communityStyles.hostLabel}>HOSTED BY MAYA</Text><Text style={communityStyles.hostText}>Verified community host · Helps the room stay welcoming and respectful.</Text></View><MiniPremiumIcon name="shield-checkmark" tone="gold" size={32} iconSize={15}/></View><View style={communityStyles.detailSection}><Text style={communityStyles.detailSectionLabel}>WHO YOU MAY MEET</Text><View style={communityStyles.memberRow}>{['A','K','R','S'].map((initial,index)=><View key={initial} style={[communityStyles.memberAvatar,{marginLeft:index? -8:0}]}><Text style={communityStyles.memberInitial}>{initial}</Text></View>)}<Text style={communityStyles.memberCopy}>A small, verified group. Full names stay private until you join.</Text></View></View><View style={communityStyles.agenda}><Text style={communityStyles.detailSectionLabel}>HOW THE GATHERING FLOWS</Text><View style={communityStyles.agendaRow}><Text style={communityStyles.agendaTime}>6:30</Text><Text style={communityStyles.agendaText}>Welcome and optional introductions</Text></View><View style={communityStyles.agendaRow}><Text style={communityStyles.agendaTime}>7:00</Text><Text style={communityStyles.agendaText}>Hosted conversation prompts and easy table changes</Text></View><View style={communityStyles.agendaRow}><Text style={communityStyles.agendaTime}>8:15</Text><Text style={communityStyles.agendaText}>Optional plans for people who want to continue nearby</Text></View></View><View style={communityStyles.chatPreview}><MiniPremiumIcon name="chatbubble-ellipses-outline" tone="ruby" size={34} iconSize={16}/><View style={{flex:1}}><Text style={communityStyles.chatPreviewTitle}>Private room chat</Text><Text style={communityStyles.chatPreviewBody}>{joined.includes(selectedRoom.id)?'You are in. Say hello or ask the host a question.':'Chat unlocks after you join. No public member directory.'}</Text></View></View><Pressable onPress={()=>joinRoom(selectedRoom.id)} style={[communityStyles.rsvpButton,joined.includes(selectedRoom.id)&&communityStyles.rsvpButtonJoined]}><Ionicons name={joined.includes(selectedRoom.id)?'checkmark-circle':'calendar-outline'} size={18} color={joined.includes(selectedRoom.id)?colors.plum:colors.ivory}/><Text style={[communityStyles.rsvpText,joined.includes(selectedRoom.id)&&communityStyles.rsvpTextJoined]}>{joined.includes(selectedRoom.id)?'Your spot is reserved':'RSVP to this room'}</Text></Pressable><Text style={communityStyles.detailFine}>Public venue details appear after RSVP. You can leave anytime before the host closes the guest list.</Text></View>}
    <View style={communityStyles.bottomCard}><MiniPremiumIcon name="calendar-outline" tone="gold" size={40} iconSize={18}/><View style={{flex:1}}><Text style={communityStyles.bottomTitle}>Turn a room into a real plan</Text><Text style={communityStyles.bottomBody}>Find public-first date ideas, thoughtful events, and small hosted gatherings nearby.</Text></View><Pressable onPress={onOpenDates} style={communityStyles.circleButton}><Ionicons name="arrow-forward" size={18} color={colors.ivory}/></Pressable></View>
    <Pressable onPress={onOpenCircle} style={communityStyles.vouchLink}><Ionicons name="people-outline" size={17} color={colors.pink}/><Text style={communityStyles.vouchLinkText}>Open Trusted Circle</Text><Ionicons name="chevron-forward" size={16} color={colors.muted}/></Pressable>
  </ScrollView></SafeAreaView>
}

