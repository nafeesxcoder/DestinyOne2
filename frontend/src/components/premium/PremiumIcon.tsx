import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { premiumIconStyles } from '../../theme/appStyles';

const premiumRose = require('../../../assets/premium-red-rose.png');

export type PremiumIconTone = 'ruby' | 'gold' | 'plum' | 'rose' | 'dark';

const palettes: Record<PremiumIconTone, { colors: [string, string, string]; glow: string; icon: string }> = {
  ruby: { colors: ['#C91638','#7B0D20','#1A0307'], glow: 'rgba(229,9,47,.50)', icon: '#FFF8F4' },
  gold: { colors: ['#E8C76A','#A77E19','#2A1D07'], glow: 'rgba(212,175,55,.42)', icon: '#1B0905' },
  plum: { colors: ['#5E28A8','#351149','#120018'], glow: 'rgba(122,31,224,.42)', icon: '#FFF8F4' },
  rose: { colors: ['#E55A70','#A50D2B','#27040B'], glow: 'rgba(255,110,128,.38)', icon: '#FFF8F4' },
  dark: { colors: ['#3A3035','#201219','#070002'], glow: 'rgba(255,255,255,.18)', icon: '#FFF8F4' },
};

type PremiumIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  tone?: PremiumIconTone;
  size?: number;
  iconSize?: number;
  referenceGlass?: boolean;
};

export function RoseMark({ size = 34 }: { size?: number }) {
  return <Image source={premiumRose} resizeMode="cover" style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)' }} />;
}

export function PremiumIcon({ name, tone = 'ruby', size = 44, iconSize = 20, referenceGlass = false }: PremiumIconProps) {
  const palette = palettes[tone];
  return <LinearGradient colors={referenceGlass ? ['#F36278','#8A0B25','#31030E','#050001'] : palette.colors} locations={referenceGlass ? [0,.34,.7,1] : undefined} start={{ x: .12, y: .03 }} end={{ x: .9, y: .98 }} style={[premiumIconStyles.frame, referenceGlass && premiumIconStyles.referenceFrame, { width: size, height: size, borderRadius: size / 2, shadowColor: referenceGlass ? '#E72A4F' : palette.glow }]}>
    <View style={[premiumIconStyles.inner, referenceGlass && premiumIconStyles.referenceInner, { borderRadius: size / 2 - 2 }]} />
    {referenceGlass && <LinearGradient colors={['rgba(255,255,255,0)','rgba(20,0,6,.05)','rgba(0,0,0,.58)']} locations={[0,.46,1]} start={{ x: .16, y: .08 }} end={{ x: .94, y: .94 }} style={[premiumIconStyles.referenceShade, { borderRadius: size / 2 }]} />}
    {referenceGlass && <View style={[premiumIconStyles.referenceRing, { borderRadius: size / 2 - 4 }]} />}
    <View style={[premiumIconStyles.shine, referenceGlass && premiumIconStyles.referenceShine]} />
    <Ionicons name={name} size={iconSize} color={referenceGlass ? '#FFF8F4' : palette.icon} />
  </LinearGradient>;
}

export function MiniPremiumIcon(props: PremiumIconProps) {
  return <PremiumIcon {...props} size={props.size ?? 30} iconSize={props.iconSize ?? 14} />;
}

export function ReferenceIconTile({ name, orbSize = 44, iconSize = 20, tilePadding = 20 }: { name: keyof typeof Ionicons.glyphMap; orbSize?: number; iconSize?: number; tilePadding?: number }) {
  const tileSize = orbSize + tilePadding;
  const candidate = String(name).endsWith('-outline') ? String(name).slice(0, -8) : String(name);
  const solidName = (Ionicons.glyphMap as Record<string, number>)[candidate] ? candidate as keyof typeof Ionicons.glyphMap : name;
  const referenceIconSize = Math.min(iconSize, Math.round(orbSize * .41));
  return <LinearGradient colors={['#FFF4F3','#FDE5E7','#FFF9F7']} locations={[0,.58,1]} start={{ x: .08, y: 0 }} end={{ x: .94, y: 1 }} style={[premiumIconStyles.referenceTile, { width: tileSize, height: tileSize, borderRadius: Math.max(16, tileSize * .31) }]}>
    <View style={[premiumIconStyles.referenceTileInset, { borderRadius: Math.max(14, tileSize * .29) }]} />
    <PremiumIcon name={solidName} tone="ruby" size={orbSize} iconSize={referenceIconSize} referenceGlass />
  </LinearGradient>;
}
