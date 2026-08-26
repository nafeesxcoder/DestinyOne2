import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PremiumIcon } from '../../../components/premium/PremiumIcon';
import type { Match } from '../../../data';
import { colors } from '../../../theme';
import { safetyConciergeStyles } from '../../../theme/appStyles';

export function DateSafetyConciergeScreen({partner,onBack,onOpenDatePlan,onSavePlan}:{partner:Match;onBack:()=>void;onOpenDatePlan:()=>void;onSavePlan:(input:{checkInEnabled:boolean;checkInAt?:string;trustedContactLabel:string})=>Promise<{saved:boolean}>}){
  const [checkIn,setCheckIn]=useState(true);
  const [contact,setContact]=useState('');
  const [arrival,setArrival]=useState('9:30 PM');
  const [saved,setSaved]=useState(false);
  const [saveStatus,setSaveStatus]=useState('');
  const savePlan=()=>{
    setSaved(true);
    setSaveStatus('Saving your private plan...');
    const checkInAt=new Date(Date.now()+2*60*60*1000).toISOString();
    void onSavePlan({checkInEnabled:checkIn,checkInAt:checkIn?checkInAt:undefined,trustedContactLabel:contact}).then(result=>setSaveStatus(result.saved?'Your private safety plan is saved to this account.':'Your private safety plan is saved for this preview. Sign in to keep it across devices.'));
  };
  return <SafeAreaView style={safetyConciergeStyles.safe} edges={['top']}><View style={safetyConciergeStyles.header}><Pressable onPress={onBack} style={safetyConciergeStyles.back}><Ionicons name="arrow-back" size={21} color={colors.plum}/></Pressable><View style={{flex:1}}><Text style={safetyConciergeStyles.eyebrow}>DATE SAFETY CONCIERGE</Text><Text style={safetyConciergeStyles.headerTitle}>Plan for a calm night out</Text></View></View><ScrollView contentContainerStyle={safetyConciergeStyles.content} showsVerticalScrollIndicator={false}>
    <LinearGradient colors={['#321018','#6B1427']} style={safetyConciergeStyles.hero}><PremiumIcon name="shield-checkmark" tone="gold" size={56} iconSize={26}/><Text style={safetyConciergeStyles.heroTitle}>Safety can stay simple.</Text><Text style={safetyConciergeStyles.heroBody}>Create a private check-in plan for your date with {partner.name}. Your exact live location is never shared by default.</Text></LinearGradient>
    <View style={safetyConciergeStyles.planCard}><Text style={safetyConciergeStyles.planLabel}>YOUR PRIVATE PLAN</Text><View style={safetyConciergeStyles.toggleRow}><View style={{flex:1}}><Text style={safetyConciergeStyles.toggleTitle}>Arrival check-in</Text><Text style={safetyConciergeStyles.toggleBody}>We will remind you to confirm that you got home safely.</Text></View><Pressable accessibilityRole="switch" accessibilityState={{checked:checkIn}} onPress={()=>setCheckIn(value=>!value)} style={[safetyConciergeStyles.switch,checkIn&&safetyConciergeStyles.switchOn]}><View style={[safetyConciergeStyles.switchThumb,checkIn&&safetyConciergeStyles.switchThumbOn]}/></Pressable></View><Text style={safetyConciergeStyles.inputLabel}>CHECK-IN TIME</Text><View style={safetyConciergeStyles.timeRow}>{['8:30 PM','9:30 PM','10:30 PM'].map(time=><Pressable key={time} onPress={()=>setArrival(time)} style={[safetyConciergeStyles.timeChip,arrival===time&&safetyConciergeStyles.timeChipActive]}><Text style={[safetyConciergeStyles.timeText,arrival===time&&safetyConciergeStyles.timeTextActive]}>{time}</Text></Pressable>)}</View><Text style={safetyConciergeStyles.inputLabel}>TRUSTED CONTACT (OPTIONAL)</Text><TextInput value={contact} onChangeText={setContact} placeholder="Name or phone number" placeholderTextColor="#9B8187" style={safetyConciergeStyles.input}/><Text style={safetyConciergeStyles.inputFine}>This stays private. A real alert is sent only after you choose to enable it in production.</Text></View>
    <View style={safetyConciergeStyles.rules}><Text style={safetyConciergeStyles.rulesTitle}>A good first-date standard</Text>{['Meet in a public place with an easy exit.','Keep early plans inside the app until both people feel ready.','Do not share a home address or send money to someone you have not met.'].map(rule=><View key={rule} style={safetyConciergeStyles.rule}><Ionicons name="checkmark-circle" size={16} color={colors.gold}/><Text style={safetyConciergeStyles.ruleText}>{rule}</Text></View>)}</View>
    <Pressable onPress={savePlan} style={safetyConciergeStyles.saveButton}><Ionicons name={saved?'checkmark-circle':'shield-checkmark-outline'} size={18} color={colors.ivory}/><Text style={safetyConciergeStyles.saveButtonText}>{saved?'Safety plan saved':'Save my private plan'}</Text></Pressable>{saved&&<Text style={safetyConciergeStyles.savedText}>{saveStatus||`Your check-in is set for ${arrival}${contact?` and ${contact} is listed as your trusted contact.`:'.'}`}</Text>}<Pressable onPress={onOpenDatePlan} style={safetyConciergeStyles.dateButton}><Ionicons name="calendar-outline" size={18} color={colors.plum}/><Text style={safetyConciergeStyles.dateButtonText}>Choose a public date place</Text><Ionicons name="arrow-forward" size={17} color={colors.plum}/></Pressable>
  </ScrollView></SafeAreaView>
}

