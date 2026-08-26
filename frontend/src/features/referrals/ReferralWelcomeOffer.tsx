import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components";
import { MiniPremiumIcon, PremiumIcon } from "../../components/premium/PremiumIcon";
import { styles, referralStyles, chatStyles } from "../../theme/appStyles";
export function ReferralWelcomeOffer({ visible, referralCode, onClose, onViewPlans }: {
    visible: boolean;
    referralCode: string;
    onClose: () => void;
    onViewPlans: () => void;
}) {
    const { width } = useWindowDimensions();
    const [shareStatus, setShareStatus] = useState('');
    const wide = width >= 760;
    const wideSheetWidth = Math.min(900, width - 32);
    useEffect(() => {
        if (visible)
            setShareStatus('');
    }, [visible]);
    const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://destinyone.app';
    const inviteLink = `${origin}/?ref=${encodeURIComponent(referralCode)}`;
    const shareInvite = async () => {
        const message = `I found DestinyOne, a dating app for people who actually mean it. Join with my private invite and complete your verified profile: ${inviteLink}`;
        try {
            await Share.share({ title: 'Your private DestinyOne invite', message });
            setShareStatus('Invite ready. Your free week unlocks when your friend verifies their profile.');
        }
        catch {
            setShareStatus(`Share is unavailable here. Use this link: ${inviteLink}`);
        }
    };
    return <Modal visible={visible} transparent animationType={Platform.OS === 'web' ? 'fade' : 'slide'} onRequestClose={onClose}>
    <View style={referralStyles.modalRoot}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={[chatStyles.sheet, referralStyles.sheet, wide && referralStyles.sheetWide, wide && { left: (width - wideSheetWidth) / 2, right: undefined, width: wideSheetWidth }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={referralStyles.scroll}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close referral offer" onPress={onClose} style={referralStyles.close}><Ionicons name="close" size={20} color="#FFFDFC"/></Pressable>
        <LinearGradient colors={['#49100F', '#18070B']} style={referralStyles.hero}>
          <View style={referralStyles.giftHalo}><PremiumIcon name="gift" tone="gold" size={58} iconSize={27}/></View>
          <Text style={styles.kicker}>BETTER PEOPLE, BETTER MATCHES</Text>
          <Text style={referralStyles.title}>Invite a friend. Unlock a week.</Text>
          <Text style={referralStyles.body}>Bring someone genuine to DestinyOne. When they verify, your Base Pass is on us.</Text>
        </LinearGradient>
        <View style={referralStyles.rewardCard}><View style={referralStyles.rewardTop}><MiniPremiumIcon name="diamond" tone="ruby" size={42} iconSize={19}/><View style={{ flex: 1 }}><Text style={referralStyles.rewardEyebrow}>7 DAYS · $45 VALUE</Text><Text style={referralStyles.rewardTitle}>Your Base Pass, on us</Text></View><Text style={referralStyles.rewardValue}>FREE</Text></View><View style={referralStyles.rewardPills}>{['5 fresh picks daily', 'Mutual chat', 'Intent filters', 'See profile visitors'].map(item => <View key={item} style={referralStyles.rewardPill}><Text style={referralStyles.rewardPillText}>{item}</Text></View>)}</View></View>
        <View style={[referralStyles.steps, wide && referralStyles.stepsWide]}>{[
            ['1', 'Send your invite'], ['2', 'They join + verify'], ['3', 'Your free week unlocks'],
        ].map(([number, label]) => <View key={number} style={[referralStyles.step, wide && referralStyles.stepWide]}><View style={referralStyles.stepNumber}><Text style={referralStyles.stepNumberText}>{number}</Text></View><Text style={referralStyles.stepText}>{label}</Text></View>)}</View>
        <View style={referralStyles.codeRow}><View><Text style={referralStyles.codeLabel}>YOUR INVITE CODE</Text><Text style={referralStyles.code}>{referralCode}</Text></View><MiniPremiumIcon name="link" tone="dark" size={34} iconSize={16}/></View>
        {!!shareStatus && <Text style={referralStyles.status}>{shareStatus}</Text>}
        <View style={[referralStyles.actions, wide && referralStyles.actionsWide]}><View style={[referralStyles.action, wide && referralStyles.actionWide]}><Button label="Send my invite" icon="share-social" variant="gold" onPress={() => void shareInvite()}/></View><View style={[referralStyles.action, wide && referralStyles.actionWide]}><Button label="Explore plans" icon="diamond-outline" variant="secondary" onPress={onViewPlans}/></View></View>
        <Pressable onPress={onClose} style={referralStyles.later}><Text style={referralStyles.laterText}>Maybe later</Text></Pressable>
        <Text style={styles.legal}>One reward per verified friend. Self-referrals and duplicate accounts are not eligible. Safety and privacy tools remain free for everyone.</Text>
      </ScrollView>
    </SafeAreaView></View>
  </Modal>;
}
