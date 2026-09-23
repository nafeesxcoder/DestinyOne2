import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Location from "expo-location";

import { Button, shared } from "../../components";
import {
  BottomNav,
  handleBottomNavScroll,
} from "../../components/navigation/BottomNav";
import {
  MiniPremiumIcon,
  PremiumIcon,
  type PremiumIconTone,
} from "../../components/premium/PremiumIcon";
import { SheetHeader } from "../../components/sheets/SheetHeader";
import { SafetyActions } from "../trust/screens/SafetyScreens";
import { CallModal } from "./CallModalReal";
import { callApi } from "../../api/callApi";
import { chatApi } from "../../api/chatApi";
import { matches, type Match } from "../../data";
import type { PreviewState, Screen } from "../../app/navigation/types";
import type {
  ChatMessage,
  CoupleChatSettings,
  DatePlanStatus,
  RelationshipReflectionChoice,
  RelationshipReflectionRecord,
  RelationshipReminderRecord,
} from "../../storage";
import { defaultCoupleChatSettings } from "../../storage";
import { colors } from "../../theme";
import {
  aiStyles,
  chatPremiumStyles,
  chatStyles,
  coachStyles,
  coupleStyles,
  dateStyles,
  discoveryStyles,
  gameStyles,
  giftFlowStyles,
  journeyStyles,
  launchStyles,
  premiumButtonStyles,
  rosePopupStyles,
  snapStyles,
  stickerStyles,
  styles,
} from "../../theme/appStyles";
import { canSendGift } from "../../domain/commerce";
import type { ExperienceMode } from "../../domain/coupleMode";
import { truthOrDarePrompts } from "../../domain/coupleGamePrompts";
import {
  buildCatalogGifUri,
  buildStickerPayload,
  classifyEmojiMotion,
  customChatStickers,
  parseCatalogGifUri,
  parseStickerPayload,
  searchChatGifCatalog,
  type ChatGifCatalogItem,
  type CustomChatSticker,
  type EmojiMotion,
} from "../../domain/chatMediaCatalog";
import {
  buildPrivacySafeLinkPreview,
  gifLibraryStorageKey,
  isConversationMuted,
  mergeGifRecents,
  notificationMuteLabel,
  toggleGifFavourite,
  type GifLibraryEntry,
} from "../../domain/chatExperience";
import { dateLifecycleCopy } from "../../domain/dateLifecycle";
import { conversationIdFor } from "../../domain/matchIdentity";
import {
  chatMoreAttachments,
  chatPrimaryAttachments,
} from "../../domain/featureFocus";
import {
  buildRelationshipJourney,
  type RelationshipReflection,
} from "../../domain/relationshipJourney";
import type { RelationshipJourneyEventName } from "../../domain/relationshipLearning";
import { buildRelationshipLearningState } from "../../domain/relationshipLearning";
import { scanMessageSafety, type MessageSafetyScan } from "../../domain/safety";
import type {
  GiftAddressSuggestion,
  GiftDeliveryAddress,
  GiftFulfillmentStatus,
  GiftOrderQuote,
} from "../gifts/contracts/GiftModels";
import type {
  ChatRuntimePorts,
  MatchRealtimeSession,
  RealtimeCallEvent,
} from "./contracts/ChatRuntimePorts";
import { track } from "../../lib/telemetry";
import giftCatalogJson from "../../../shared/gift-catalog.json";

// ðŸš€ BACKGROUND IMAGE ADDED HERE
const backgroundImage = require("../../../assets/background.png");

export type RoseAvailability = { freeAvailable: boolean; paidCredits: number };
export type RosePopupPayload = { match: Match; note: string; paid: boolean };
export type CoupleLaunchTool = "gift" | "games" | null;
const accessibilityHitSlop = {
  top: 12,
  right: 12,
  bottom: 12,
  left: 12,
} as const;
const ChatRuntimeContext = createContext<ChatRuntimePorts | null>(null);
const useChatRuntime = () => {
  const runtime = useContext(ChatRuntimeContext);
  if (!runtime)
    throw new Error("ChatRuntimePorts must be provided by ChatScreen.");
  return runtime;
};

const digitalGifts = [
  { name: "A Rose", emoji: "ðŸŒ¹", coins: 40, caption: "A little romance" },
  { name: "Flowers", emoji: "ðŸ’", coins: 80, caption: "Thinking of you" },
  { name: "Teddy", emoji: "ðŸ§¸", coins: 120, caption: "A warm hug" },
  {
    name: "Celebration",
    emoji: "ðŸ¥‚",
    coins: 160,
    caption: "To new beginnings",
  },
  {
    name: "Golden Heart",
    emoji: "ðŸ’›",
    coins: 200,
    caption: "Something meaningful",
  },
  { name: "Promise", emoji: "ðŸ’", coins: 300, caption: "For a special moment" },
];
export const physicalGifts = giftCatalogJson
  .filter((gift) => gift.active)
  .map((gift) => ({ ...gift, caption: gift.description }));
export type DigitalGift = (typeof digitalGifts)[number];
export type PhysicalGift = (typeof physicalGifts)[number];
function physicalGiftIcon(id: string): keyof typeof Ionicons.glyphMap {
  const map: Record<string, keyof typeof Ionicons.glyphMap> = {
    "ruby-roses": "flower",
    "gelato-night": "restaurant",
    "chai-duo": "cafe",
    "artisan-chocolate": "heart",
    "mini-cake": "gift",
    orchid: "leaf",
    "book-date": "book",
    "self-care": "sparkles",
    candle: "flame",
    fruit: "restaurant",
    card: "mail",
    "movie-night": "film",
  };
  return map[id] ?? "gift";
}
function digitalGiftIcon(name: string): keyof typeof Ionicons.glyphMap {
  if (name.includes("Rose")) return "flower";
  if (name.includes("Flowers")) return "flower";
  if (name.includes("Teddy")) return "happy";
  if (name.includes("Celebration")) return "sparkles";
  if (name.includes("Heart")) return "heart";
  if (name.includes("Promise")) return "diamond";
  return "gift";
}
const quickEmojis = [
  "ðŸ˜€",
  "ðŸ˜ƒ",
  "ðŸ˜„",
  "ðŸ˜",
  "ðŸ˜†",
  "ðŸ˜…",
  "ðŸ˜‚",
  "ðŸ¤£",
  "ðŸ˜Š",
  "ðŸ˜‡",
  "ðŸ™‚",
  "ðŸ™ƒ",
  "ðŸ˜‰",
  "ðŸ˜Œ",
  "ðŸ˜",
  "ðŸ¥°",
  "ðŸ˜˜",
  "ðŸ˜—",
  "ðŸ˜™",
  "ðŸ˜š",
  "ðŸ˜‹",
  "ðŸ˜›",
  "ðŸ˜",
  "ðŸ˜œ",
  "ðŸ¤ª",
  "ðŸ¤¨",
  "ðŸ§",
  "ðŸ¤“",
  "ðŸ˜Ž",
  "ðŸ¥¸",
  "ðŸ¤©",
  "ðŸ¥³",
  "ðŸ™‚â€â†•ï¸",
  "ðŸ˜",
  "ðŸ˜’",
  "ðŸ™‚â€â†”ï¸",
  "ðŸ˜ž",
  "ðŸ˜”",
  "ðŸ˜Ÿ",
  "ðŸ˜•",
  "ðŸ™",
  "â˜¹ï¸",
  "ðŸ˜£",
  "ðŸ˜–",
  "ðŸ˜«",
  "ðŸ˜©",
  "ðŸ¥º",
  "ðŸ˜¢",
  "ðŸ˜­",
  "ðŸ˜¤",
  "ðŸ˜ ",
  "ðŸ˜¡",
  "ðŸ¤¬",
  "ðŸ¤¯",
  "ðŸ˜³",
  "ðŸ¥µ",
  "ðŸ¥¶",
  "ðŸ˜±",
  "ðŸ˜¨",
  "ðŸ˜°",
  "ðŸ˜¥",
  "ðŸ˜“",
  "ðŸ¤—",
  "ðŸ¤”",
  "ðŸ«£",
  "ðŸ¤­",
  "ðŸ«¢",
  "ðŸ«¡",
  "ðŸ¤«",
  "ðŸ« ",
  "ðŸ¤¥",
  "ðŸ˜¶",
  "ðŸ˜",
  "ðŸ˜‘",
  "ðŸ˜¬",
  "ðŸ™„",
  "ðŸ˜¯",
  "ðŸ˜¦",
  "ðŸ˜§",
  "ðŸ˜®",
  "ðŸ˜²",
  "ðŸ¥±",
  "ðŸ˜´",
  "ðŸ¤¤",
  "ðŸ˜ª",
  "ðŸ˜®â€ðŸ’¨",
  "ðŸ˜µ",
  "ðŸ˜µâ€ðŸ’«",
  "ðŸ¤",
  "ðŸ¥´",
  "ðŸ¤¢",
  "ðŸ¤®",
  "ðŸ¤§",
  "ðŸ˜·",
  "ðŸ¤’",
  "ðŸ¤•",
  "ðŸ¤‘",
  "ðŸ¤ ",
  "ðŸ˜ˆ",
  "ðŸ‘¿",
  "ðŸ‘‹",
  "ðŸ¤š",
  "ðŸ–ï¸",
  "âœ‹",
  "ðŸ––",
  "ðŸ‘Œ",
  "ðŸ¤Œ",
  "ðŸ¤",
  "âœŒï¸",
  "ðŸ¤ž",
  "ðŸ«°",
  "ðŸ¤Ÿ",
  "ðŸ¤˜",
  "ðŸ¤™",
  "ðŸ‘ˆ",
  "ðŸ‘‰",
  "ðŸ‘†",
  "ðŸ‘‡",
  "â˜ï¸",
  "ðŸ‘",
  "ðŸ‘Ž",
  "âœŠ",
  "ðŸ‘Š",
  "ðŸ¤›",
  "ðŸ¤œ",
  "ðŸ‘",
  "ðŸ™Œ",
  "ðŸ«¶",
  "ðŸ«¶ðŸ½",
  "ðŸ¤²",
  "ðŸ™",
  "âœï¸",
  "ðŸ’…",
  "ðŸ¤",
  "ðŸ’ª",
  "ðŸ«µ",
  "ðŸ«‚",
  "ðŸ‘€",
  "ðŸ‘ï¸",
  "ðŸ‘„",
  "â¤ï¸",
  "ðŸ©·",
  "ðŸ§¡",
  "ðŸ’›",
  "ðŸ’š",
  "ðŸ’™",
  "ðŸ©µ",
  "ðŸ’œ",
  "ðŸ¤Ž",
  "ðŸ–¤",
  "ðŸ©¶",
  "ðŸ¤",
  "ðŸ’”",
  "â¤ï¸â€ðŸ”¥",
  "â¤ï¸â€ðŸ©¹",
  "ðŸ’•",
  "ðŸ’ž",
  "ðŸ’“",
  "ðŸ’—",
  "ðŸ’–",
  "ðŸ’˜",
  "ðŸ’",
  "ðŸ’Ÿ",
  "ðŸ’Œ",
  "ðŸ’‹",
  "ðŸ’¯",
  "ðŸ’¢",
  "ðŸ’¥",
  "ðŸ’«",
  "ðŸ’¦",
  "ðŸ’¨",
  "ðŸ•³ï¸",
  "ðŸ’¬",
  "ðŸ‘‘",
  "ðŸ’",
  "ðŸ’Ž",
  "âœ¨",
  "â­",
  "ðŸŒŸ",
  "ðŸ”¥",
  "ðŸŒ¹",
  "ðŸ’",
  "ðŸŒ·",
  "ðŸŒ¸",
  "ðŸŒº",
  "ðŸŒ»",
  "ðŸŒ¼",
  "ðŸª·",
  "ðŸ€",
  "â˜•",
  "ðŸ«–",
  "ðŸµ",
  "ðŸ•",
  "ðŸ”",
  "ðŸŸ",
  "ðŸŒ®",
  "ðŸœ",
  "ðŸ",
  "ðŸ›",
  "ðŸ«",
  "ðŸ°",
  "ðŸ§",
  "ðŸ¦",
  "ðŸ¿",
  "ðŸ¥‚",
  "ðŸ·",
  "ðŸ¹",
  "ðŸŽ‚",
  "ðŸŽ‰",
  "ðŸŽŠ",
  "ðŸŽ",
  "ðŸŽˆ",
  "ðŸª©",
  "ðŸŽµ",
  "ðŸŽ¶",
  "ðŸŽ¬",
  "ðŸ“¸",
  "ðŸš—",
  "âœˆï¸",
  "ðŸ¡",
  "ðŸŒ",
  "ðŸŒ™",
  "â˜€ï¸",
  "ðŸŒ§ï¸",
  "ðŸŒˆ",
  "âš¡",
  "ðŸ’ƒðŸ½",
  "ðŸ•º",
  "ðŸ‹ï¸",
  "ðŸ§˜â€â™€ï¸",
  "ðŸ¶",
  "ðŸ±",
  "ðŸ¼",
  "ðŸ¦",
  "ðŸ¦„",
  "ðŸ¦‹",
  "ðŸ¥",
  "ðŸ’",
  "ðŸ™ˆ",
  "ðŸ™‰",
  "ðŸ™Š",
];
type EmojiCategoryId =
  | "recent"
  | "smileys"
  | "love"
  | "gestures"
  | "food"
  | "travel"
  | "all";
const emojiCategories: Array<{
  id: EmojiCategoryId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  emojis: string[];
}> = [
  {
    id: "recent",
    label: "Recent",
    icon: "time-outline",
    emojis: [
      "â¤ï¸",
      "ðŸ˜‚",
      "ðŸ¥°",
      "ðŸ˜˜",
      "ðŸ˜Š",
      "ðŸ™",
      "ðŸ”¥",
      "ðŸ’",
      "â˜•",
      "âœ¨",
      "ðŸ«¶",
      "ðŸ˜",
      "ðŸ¤£",
      "ðŸ’Œ",
      "ðŸŒ¹",
      "ðŸ¥º",
      "ðŸŽ‰",
      "ðŸ™ˆ",
    ],
  },
  {
    id: "smileys",
    label: "Smileys",
    icon: "happy-outline",
    emojis: quickEmojis.slice(0, 100),
  },
  {
    id: "love",
    label: "Love",
    icon: "heart-outline",
    emojis: quickEmojis.slice(140, 185),
  },
  {
    id: "gestures",
    label: "Gestures",
    icon: "hand-left-outline",
    emojis: quickEmojis.slice(100, 145),
  },
  {
    id: "food",
    label: "Food",
    icon: "restaurant-outline",
    emojis: quickEmojis.slice(185, 215),
  },
  {
    id: "travel",
    label: "Travel",
    icon: "airplane-outline",
    emojis: quickEmojis.slice(215),
  },
  { id: "all", label: "All", icon: "apps-outline", emojis: quickEmojis },
];
const emojiSearchGroups = [
  {
    keywords: "love heart romantic kiss rose flower",
    emojis: emojiCategories.find((item) => item.id === "love")!.emojis,
  },
  {
    keywords: "laugh funny haha smile happy",
    emojis: ["ðŸ˜‚", "ðŸ¤£", "ðŸ˜„", "ðŸ˜", "ðŸ˜†", "ðŸ˜…", "ðŸ˜œ", "ðŸ¤ª", "ðŸ˜Ž", "ðŸ¥³"],
  },
  {
    keywords: "sad cry upset miss",
    emojis: ["ðŸ¥º", "ðŸ˜¢", "ðŸ˜­", "ðŸ˜ž", "ðŸ˜”", "ðŸ’”", "ðŸ˜¥", "ðŸ˜“"],
  },
  {
    keywords: "food coffee chai date dinner cake",
    emojis: emojiCategories.find((item) => item.id === "food")!.emojis,
  },
  {
    keywords: "travel car plane home weather",
    emojis: emojiCategories.find((item) => item.id === "travel")!.emojis,
  },
  {
    keywords: "hand clap pray hug gesture",
    emojis: emojiCategories.find((item) => item.id === "gestures")!.emojis,
  },
];
const isAnimatedEmojiText = (value = "") => {
  const trimmed = value.trim().replace(/^âœ¨STICKER\|/, "");
  return (
    !!trimmed &&
    !/[\p{L}\p{N}]/u.test(trimmed) &&
    /\p{Extended_Pictographic}/u.test(trimmed) &&
    Array.from(trimmed).length <= 8
  );
};
const snapFilters = [
  { name: "Ruby Glow", color: "rgba(229,9,47,.24)" },
  { name: "Golden Hour", color: "rgba(212,175,55,.18)" },
  { name: "Noir", color: "rgba(0,0,0,.38)" },
  { name: "Rose Film", color: "rgba(255,110,128,.18)" },
  { name: "Cool Date", color: "rgba(61,94,180,.18)" },
  { name: "Velvet Crush", color: "rgba(128,0,32,.32)" },
  { name: "Bollywood Sparkle", color: "rgba(255,64,129,.22)" },
  { name: "Chai Warmth", color: "rgba(166,94,46,.22)" },
  { name: "Dream Home", color: "rgba(248,245,240,.13)" },
  { name: "Moonlit Date", color: "rgba(64,60,160,.25)" },
  { name: "Rose Petal", color: "rgba(255,80,115,.28)" },
  { name: "Cinema Night", color: "rgba(17,17,20,.48)" },
  { name: "Soft Blush", color: "rgba(255,174,188,.22)" },
  { name: "Royal Ruby", color: "rgba(180,0,42,.3)" },
  { name: "Shaadi Glow", color: "rgba(255,214,102,.2)" },
  { name: "Meme Pop", color: "rgba(0,255,180,.16)" },
  { name: "Funny Face", color: "rgba(255,255,255,.18)" },
  { name: "Desi Drama", color: "rgba(255,111,0,.20)" },
  { name: "Puppy Mood", color: "rgba(120,80,35,.18)" },
  { name: "Cartoon Crush", color: "rgba(80,200,255,.18)" },
  { name: "Retro VHS", color: "rgba(120,0,255,.16)" },
  { name: "Neon Club", color: "rgba(255,0,200,.22)" },
  { name: "Soft Focus", color: "rgba(255,230,210,.18)" },
  { name: "Laugh Track", color: "rgba(255,230,0,.16)" },
  { name: "Crown Mode", color: "rgba(212,175,55,.22)" },
];
const faceEmojiOptions = [
  "ðŸ˜‚",
  "ðŸ¤£",
  "ðŸ˜Ž",
  "ðŸ‘‘",
  "ðŸ¥¸",
  "ðŸ¤ ",
  "ðŸ¤“",
  "ðŸ¤¡",
  "ðŸ˜ˆ",
  "ðŸ‘½",
  "ðŸ¤–",
  "ðŸ¦„",
  "ðŸ¶",
  "ðŸ±",
  "ðŸ¼",
  "ðŸ¦",
  "ðŸµ",
  "ðŸ™ˆ",
  "ðŸ’˜",
  "ðŸ˜",
  "ðŸ˜˜",
  "ðŸ¤­",
  "ðŸ˜œ",
  "ðŸ˜‡",
  "ðŸ•¶ï¸",
  "ðŸŽ©",
  "ðŸ’ƒðŸ½",
  "ðŸª©",
  "ðŸ”¥",
  "âœ¨",
];
const chatCoachSuggestions = [
  {
    label: "Warm question",
    message: (match: Match) =>
      `I liked your ${match.vibes[0]?.toLowerCase() ?? "intentional"} energy. What does a great weekend look like for you?`,
  },
  {
    label: "Date idea",
    message: (match: Match) =>
      `This may be early, but ${match.city.split(",")[0]} has some great cafÃ©s. Want to plan a simple public coffee sometime?`,
  },
  {
    label: "Values check",
    message: (_: Match) =>
      "What is one value you would never compromise in a serious relationship?",
  },
  {
    label: "Family tone",
    message: (_: Match) =>
      "How do you like to balance family involvement with independence as a couple?",
  },
];
type CoupleGame = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: PremiumIconTone;
  tag: string;
  description: string;
  howToPlay: string;
  prompts: string[];
};
type GameReplyPayload = { parentId: string; gameTitle: string; answer: string };
const parseGameReply = (message: ChatMessage): GameReplyPayload | null => {
  if (message.type !== "text" || !message.text?.startsWith("ðŸŽ®REPLY|"))
    return null;
  const parts = message.text.split("|");
  return {
    parentId: parts[1] ?? "",
    gameTitle: parts[2] ?? "Couple game",
    answer: parts.slice(3).join("|"),
  };
};
const parseQuotedReply = (text?: string) => {
  if (!text?.startsWith("â†©REPLY|")) return null;
  const parts = text.split("|");
  return {
    parentId: parts[1] ?? "",
    quote: parts[2] ?? "Message",
    body: parts.slice(3).join("|"),
  };
};
const coupleGames: CoupleGame[] = [
  {
    id: "truth-dare",
    title: "Truth or Dare",
    icon: "flame",
    tone: "ruby",
    tag: "100 ROMANTIC + FUN ROUNDS",
    description:
      "A safe mix of funny, romantic, thoughtful and future-focused rounds.",
    howToPlay:
      "Take turns. Answer honestly or complete the dare, then choose another round.",
    prompts: truthOrDarePrompts,
  },
  {
    id: "connection-cards",
    title: "Curiosity Cards",
    icon: "chatbubbles",
    tone: "rose",
    tag: "GET CLOSER",
    description: "Reciprocal questions that move from light to meaningful.",
    howToPlay:
      "Both people answer the same card before moving to the next one.",
    prompts: [
      "Which small everyday gesture makes you feel genuinely considered?",
      "What does a peaceful Sunday in your future look like?",
      "What is something you are learning to communicate more clearly?",
      "Which family tradition would you love to keepâ€”or thoughtfully reinvent?",
      "What kind of support helps you most on a difficult day?",
      "What is one dream that feels more exciting when shared?",
    ],
  },
  {
    id: "decode-us",
    title: "Decode Us",
    icon: "help-circle",
    tone: "plum",
    tag: "PUZZLES",
    description: "Emoji clues, mini riddles and playful guesses.",
    howToPlay:
      "One person answers privately in their head; the other gets one guess and one hint.",
    prompts: [
      "EMOJI CLUE Â· â˜•ðŸŒ§ï¸ðŸ“š â€” invent the perfect date hidden in these emojis.",
      "RIDDLE Â· I can fill a room but take up no space. What am I?",
      "GUESS ME Â· Give three clues about your comfort food without naming it.",
      "EMOJI STORY Â· ðŸ§³ðŸŒ„ðŸŽµðŸœ â€” where did our imaginary weekend go?",
      "TWO CLUES Â· Describe your dream city using only weather + one sound.",
      "MYSTERY Â· Pick an object near you; give one true clue and one tricky clue.",
    ],
  },
  {
    id: "coffee-roadtrip",
    title: "Coffee or Road Trip",
    icon: "cafe",
    tone: "gold",
    tag: "QUICK PICKS",
    description: "Fast choices that reveal the reason behind the answer.",
    howToPlay:
      "Choose first, explain why second. No â€œbothâ€ answers for this round.",
    prompts: [
      "Cozy coffee â˜• or spontaneous road trip ðŸš— â€” and what makes it your pick?",
      "Sunrise walk ðŸŒ… or late-night dessert ðŸ°?",
      "Plan every detail ðŸ—“ï¸ or leave one surprise âœ¨?",
      "Cook together ðŸ or find a hidden local restaurant ðŸ¥¢?",
      "Mountain cabin ðŸ”ï¸ or city weekend ðŸŒ†?",
      "Voice note ðŸŽ™ï¸ or handwritten letter ðŸ’Œ?",
    ],
  },
  {
    id: "future-draft",
    title: "Future Draft",
    icon: "diamond",
    tone: "gold",
    tag: "DATE TO MARRY",
    description: "Build a shared future one thoughtful pick at a time.",
    howToPlay:
      "Each person ranks the four choices, then compare the biggest difference with curiosity.",
    prompts: [
      "Rank for the next five years: family, career, home, travel.",
      "Draft a Sunday: rest, friends, family time, one adventure.",
      "Choose three home feelings: calm, lively, private, welcoming, creative.",
      "Rank money priorities: security, experiences, giving, comfort.",
      "Pick two couple rituals: weekly date, daily walk, family dinner, monthly trip.",
      "Choose the first thing to protect in a busy season: honesty, quality time, health, patience.",
    ],
  },
  {
    id: "caption-battle",
    title: "Caption Battle",
    icon: "images",
    tone: "ruby",
    tag: "LAUGH TOGETHER",
    description: "Turn imaginary moments into funny one-line captions.",
    howToPlay:
      "Both send one caption. The next person chooses the winner and starts another round.",
    prompts: [
      "Caption this: we arrived at the restaurant wearing the exact same color.",
      "Caption this: our â€œquick coffeeâ€ somehow became a four-hour conversation.",
      "Caption this: the GPS said two minutes; we are now beside a goat farm.",
      "Caption this: both families joined the video call five minutes early.",
      "Caption this: we tried cooking together and the smoke alarm became the referee.",
      "Caption this: our first couple photo has one perfect smile and one closed eye.",
    ],
  },
];
const coupleThemes = [
  {
    name: "Ruby Velvet",
    accent: "#E5092F",
    soft: "rgba(229,9,47,.12)",
    panel: "#160308",
    bg: "#070001",
    border: "#7A1B31",
  },
  {
    name: "Champagne Night",
    accent: "#D4AF37",
    soft: "rgba(212,175,55,.13)",
    panel: "#151007",
    bg: "#050301",
    border: "#705A22",
  },
  {
    name: "Royal Plum",
    accent: "#8B5CF6",
    soft: "rgba(139,92,246,.13)",
    panel: "#12051C",
    bg: "#050108",
    border: "#4C1D95",
  },
  {
    name: "Moonlit Noir",
    accent: "#B9C6FF",
    soft: "rgba(185,198,255,.12)",
    panel: "#080A14",
    bg: "#02030A",
    border: "#29324F",
  },
  {
    name: "Rose Gold",
    accent: "#FF8A98",
    soft: "rgba(255,138,152,.13)",
    panel: "#1C0710",
    bg: "#070002",
    border: "#7A2534",
  },
  {
    name: "Emerald Promise",
    accent: "#50D890",
    soft: "rgba(80,216,144,.12)",
    panel: "#06170F",
    bg: "#010705",
    border: "#1B6B45",
  },
  {
    name: "Desert Chai",
    accent: "#D98B43",
    soft: "rgba(217,139,67,.13)",
    panel: "#180D05",
    bg: "#080401",
    border: "#7A4318",
  },
  {
    name: "Bollywood Glow",
    accent: "#FF3FB4",
    soft: "rgba(255,63,180,.13)",
    panel: "#190415",
    bg: "#070004",
    border: "#8A1B64",
  },
  {
    name: "Ocean Drive",
    accent: "#45C7FF",
    soft: "rgba(69,199,255,.12)",
    panel: "#04131B",
    bg: "#01070B",
    border: "#17617D",
  },
  {
    name: "Ivory Calm",
    accent: "#FFF0D2",
    soft: "rgba(255,240,210,.10)",
    panel: "#17110E",
    bg: "#070504",
    border: "#6D5A44",
  },
];

const maxChatFileBytes = 100 * 1024 * 1024;
const formatChatFileSize = (bytes?: number) => {
  if (!bytes || bytes < 1) return "Size unavailable";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};

export function ChatScreen({
  runtimePorts,
  previewState,
  showcaseDateStatus,
  isChatPreview,
  experienceMode,
  initialTool,
  onToolConsumed,
  match,
  messages,
  reflection,
  reminder,
  settings,
  conversationSettings,
  initialDraft,
  onDraftConsumed,
  onSettingsChange,
  onDateStatus,
  onReflection,
  onLearningConsent,
  onReminder,
  onJourneyEvent,
  coinBalance,
  roseAvailability: _roseAvailability,
  onRose,
  onSend,
  onEdit,
  onDelete,
  onMessageState,
  onGiftResponse,
  onForward,
  onOpenConversation,
  onSpendCoins,
  onReport,
  onBlock,
  isBlocked,
  onUnblock,
  onUnmatch,
  navigate,
  accessToken,
}: {
  runtimePorts: ChatRuntimePorts;
  previewState?: PreviewState;
  showcaseDateStatus?: DatePlanStatus;
  isChatPreview: boolean;
  experienceMode: ExperienceMode;
  initialTool: CoupleLaunchTool;
  onToolConsumed: () => void;
  match: Match;
  messages: ChatMessage[];
  reflection?: RelationshipReflectionRecord;
  reminder?: RelationshipReminderRecord;
  settings: CoupleChatSettings;
  conversationSettings: Record<string, CoupleChatSettings>;
  initialDraft?: string;
  onDraftConsumed?: () => void;
  onSettingsChange: (settings: CoupleChatSettings) => void;
  onDateStatus: (messageId: string, status: DatePlanStatus) => void;
  onReflection: (
    messageId: string,
    choice: RelationshipReflectionChoice | null,
  ) => void;
  onLearningConsent: (enabled: boolean) => void;
  onReminder: (messageId: string, enabled: boolean) => void;
  onJourneyEvent: (
    name: RelationshipJourneyEventName,
    properties: Record<string, string | boolean>,
  ) => void;
  coinBalance: number;
  roseAvailability: RoseAvailability;
  onRose: () => void;
  onSend: (message: ChatMessage) => Promise<boolean>;
  onEdit: (messageId: string, text: string) => Promise<boolean>;
  onDelete: (messageId: string) => Promise<boolean>;
  onMessageState: (
    messageId: string,
    input: {
      starred?: boolean;
      pinned?: boolean;
      hidden?: boolean;
      reaction?: string | null;
    },
  ) => Promise<boolean>;
  onGiftResponse: (
    messageId: string,
    input: { accept: boolean; dropoff?: GiftDeliveryAddress },
  ) => Promise<{ ok: boolean; error?: string }>;
  onForward: (target: Match, messages: ChatMessage[]) => Promise<number>;
  onOpenConversation: (target: Match) => void;
  onSpendCoins: (coins: number) => void;
  onReport: (reason: string, details?: string) => void;
  onBlock: () => void;
  isBlocked?: boolean;
  onUnblock: () => void;
  onUnmatch: () => void;
  navigate: (s: Screen) => void;
  accessToken: string;
}) {
  const {
    createOrder: createPhysicalGiftOrder,
    digitalWalletMode: digitalGiftWalletMode,
    physicalMode: physicalGiftOrderingMode,
  } = runtimePorts.gifts;
  const { width: chatWidth } = useWindowDimensions();
  const messagesRef = useRef<ScrollView | null>(null);
  const [text, setText] = useState("");
  const [showAttachments, setShowAttachments] = useState(
    previewState === "chat-attachments",
  );
  const [attachmentPage, setAttachmentPage] = useState<"main" | "more">("main");
  const [showEmoji, setShowEmoji] = useState(previewState === "chat-emoji");
  const [recordingPreviewVisible, setRecordingPreviewVisible] = useState(
    previewState === "chat-recording",
  );
  const [showCoach, setShowCoach] = useState(previewState === "chat-coach");
  const [gifOpen, setGifOpen] = useState(previewState === "chat-gif");
  const [giftOpen, setGiftOpen] = useState(previewState === "chat-gift");
  const [gamesOpen, setGamesOpen] = useState(previewState === "chat-games");
  const [snapOpen, setSnapOpen] = useState(previewState === "chat-snap");
  const [faceEmojiOpen, setFaceEmojiOpen] = useState(
    previewState === "chat-face-emoji",
  );
  const [callMode, setCallMode] = useState<"audio" | "video" | null>(
    previewState === "chat-audio-call"
      ? "audio"
      : previewState === "chat-video-call"
        ? "video"
        : null,
  );
  const [chatError, setChatError] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(
    previewState === "chat-options",
  );
  const [safetyOpen, setSafetyOpen] = useState(previewState === "chat-safety");
  const [settingsOpen, setSettingsOpen] = useState(
    previewState === "chat-settings",
  );
  const [searchOpen, setSearchOpen] = useState(previewState === "chat-search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [hiddenMessageIds, setHiddenMessageIds] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const [editTarget, setEditTarget] = useState<ChatMessage | null>(null);
  const [forwardMessages, setForwardMessages] = useState<ChatMessage[]>([]);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [messageActionNotice, setMessageActionNotice] = useState("");
  const [journeyOpen, setJourneyOpen] = useState(
    previewState === "chat-relationship-path" || !!showcaseDateStatus,
  );
  const [sending, setSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [activeRealtimeSession, setActiveRealtimeSession] =
    useState<MatchRealtimeSession | null>(null);
  const [lastCallEvent, setLastCallEvent] = useState<RealtimeCallEvent | null>(
    null,
  );
  const [incomingCallId, setIncomingCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    id: string;
    callerName: string;
    mode: "audio" | "video";
  } | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isCallOutgoing, setIsCallOutgoing] = useState(true);
  const startRealCall = async (callMode: "audio" | "video") => {
    if (!accessToken) return;
    try {
      const result = await callApi.start(
        accessToken,
        conversationIdFor(match),
        callMode,
      );
      setActiveCallId(result.id);
      setIsCallOutgoing(true);
      setCallMode(callMode);
    } catch {
      // silent: person can retry the call button
    }
  };
  useEffect(() => {
    if (!accessToken || callMode) return;
    let active = true;
    const poll = async () => {
      try {
        const call = await callApi.getIncoming(accessToken);
        if (!active) return;
        if (call && call.conversationId === conversationIdFor(match)) {
          setIncomingCall({
            id: call.id,
            callerName: call.callerName,
            mode: call.mode,
          });
        } else {
          setIncomingCall(null);
        }
      } catch {
        // ignore transient errors; next poll retries
      }
    };
    const timer = setInterval(() => void poll(), 3000);
    void poll();
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [accessToken, callMode, match]);
  const [connectionOnline, setConnectionOnline] = useState(() =>
    Platform.OS !== "web" || typeof navigator === "undefined"
      ? true
      : navigator.onLine,
  );
  const [deliveryOverrides, setDeliveryOverrides] = useState<
    Record<string, ChatMessage["status"]>
  >({});
  const deliveryTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const pendingDeleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageOffsets = useRef<Record<string, number>>({});
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeSession = useRef<MatchRealtimeSession | null>(null);
  const speechRecognitionRef = useRef<{
    start: () => void;
    stop: () => void;
    onresult?:
      | ((event: {
          results: ArrayLike<{ 0?: { transcript?: string } }>;
        }) => void)
      | null;
    continuous?: boolean;
    interimResults?: boolean;
    lang?: string;
  } | null>(null);
  const voiceTranscriptRef = useRef("");
  const isCoupleMode = experienceMode === "couple";
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status.hasError)
      setChatError(status.error ?? "Voice note failed. Please try again.");
  });
  const recorderState = useAudioRecorderState(recorder, 200);
  useEffect(() => {
    if (!initialDraft) return;
    setText(initialDraft);
    setShowAttachments(false);
    setShowEmoji(false);
    onDraftConsumed?.();
  }, [initialDraft, onDraftConsumed]);
  useEffect(() => {
    if (initialTool === "gift") setGiftOpen(true);
    if (initialTool === "games") setGamesOpen(true);
    if (initialTool) onToolConsumed();
  }, [initialTool, onToolConsumed]);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const updateConnection = () => setConnectionOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);
  useEffect(
    () => () => {
      deliveryTimers.current.forEach(clearTimeout);
      deliveryTimers.current = [];
      if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (isChatPreview) return;
    let cancelled = false;
    setActiveRealtimeSession(null);
    const matchId = conversationIdFor(match);
    void runtimePorts.realtime
      .connect(matchId, {
        onTyping: setPartnerTyping,
        onPresence: setPartnerOnline,
        onConnection: setRealtimeConnected,
        onReceipt: (status) =>
          setDeliveryOverrides((current) => {
            const next = { ...current };
            messages.forEach((message) => {
              if (message.mine !== false) next[message.id] = status;
            });
            return next;
          }),
        onCall: (event) => {
          setLastCallEvent(event);
          if (event.event === "invite" && event.mode)
            setIncomingCallId(event.clientCallId);
          if (["reject", "end", "missed", "failed"].includes(event.event)) {
            setIncomingCallId(null);
            setCallMode(null);
          }
        },
      })
      .then(async (session) => {
        if (cancelled) {
          await session?.close();
          return;
        }
        realtimeSession.current = session;
        setActiveRealtimeSession(session);
        if (session) {
          await session.markDelivered();
          await session.markRead();
        }
      })
      .catch((error) => {
        if (!cancelled)
          setChatError(
            error instanceof Error
              ? error.message
              : "Realtime chat could not connect.",
          );
      });
    return () => {
      cancelled = true;
      if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
      const session = realtimeSession.current;
      realtimeSession.current = null;
      if (session) void session.close();
    };
  }, [isChatPreview, match.id]);
  useEffect(() => {
    if (!activeRealtimeSession || !messages.length) return;
    void activeRealtimeSession
      .markDelivered()
      .then(() => activeRealtimeSession.markRead())
      .catch(() => undefined);
  }, [activeRealtimeSession, messages.length]);
  useEffect(() => {
    if (!connectionOnline) return;
    setDeliveryOverrides((current) =>
      Object.fromEntries(
        Object.entries(current).map(([id, status]) => [
          id,
          status === "sent" ? "delivered" : status,
        ]),
      ),
    );
  }, [connectionOnline]);
  const createMessage = (
    message: Omit<ChatMessage, "id" | "createdAt" | "status">,
  ): ChatMessage => ({
    ...message,
    ...(message.type === "text" && message.text
      ? { linkPreview: buildPrivacySafeLinkPreview(message.text) }
      : {}),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    status: "sent",
  });
  const messageSummary = (message: ChatMessage) => {
    const sticker = parseStickerPayload(message.text);
    return message.text?.startsWith("ðŸŽ®GAME|")
      ? `Game: ${message.text.split("|")[1] ?? "Couple game"}`
      : message.text?.startsWith("ðŸŽ®REPLY|")
        ? `Game answer: ${parseGameReply(message)?.answer ?? ""}`
        : message.text?.startsWith("â†©REPLY|")
          ? (parseQuotedReply(message.text)?.body ?? "Reply")
          : sticker
            ? `${sticker.label} ${sticker.emoji}`
            : message.text?.trim() ||
              message.date?.venue ||
              message.gift?.name ||
              message.document?.name ||
              (message.type === "voice"
                ? "Voice message"
                : message.type === "location"
                  ? "Live location"
                  : message.type === "image"
                    ? "Photo"
                    : message.type === "gif"
                      ? "GIF"
                      : message.type === "snap"
                        ? "View-once photo"
                        : "Message");
  };
  const dispatchMessage = async (message: ChatMessage) => {
    setChatError("");
    setDeliveryOverrides((current) => ({ ...current, [message.id]: "sent" }));
    const sent = await onSend(message);
    if (!sent) {
      setChatError(
        "Message was not confirmed. Check your connection and try again.",
      );
      return false;
    }
    if (connectionOnline && isChatPreview) {
      const deliveredTimer = setTimeout(() => {
        setDeliveryOverrides((current) => ({
          ...current,
          [message.id]: "delivered",
        }));
        setPartnerTyping(true);
      }, 700);
      const readTimer = setTimeout(() => {
        setDeliveryOverrides((current) => ({
          ...current,
          [message.id]: "read",
        }));
        setPartnerTyping(false);
      }, 2400);
      deliveryTimers.current.push(deliveredTimer, readTimer);
    }
    return sent;
  };
  const updateText = (value: string) => {
    setText(value);
    if (isChatPreview || !realtimeSession.current) return;
    void realtimeSession.current
      .sendTyping(value.trim().length > 0)
      .catch(() => undefined);
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(
      () =>
        void realtimeSession.current?.sendTyping(false).catch(() => undefined),
      1400,
    );
  };
  const sendText = async () => {
    const value = text.trim();
    if (!value || sending) return;
    const messageText = replyTarget
      ? `â†©REPLY|${replyTarget.id}|${messageSummary(replyTarget).slice(0, 64)}|${value}`
      : value;
    setSending(true);
    try {
      if (
        await dispatchMessage(
          createMessage({ type: "text", text: messageText }),
        )
      ) {
        setText("");
        setReplyTarget(null);
        setShowEmoji(false);
        if (!isChatPreview)
          void realtimeSession.current
            ?.sendTyping(false)
            .catch(() => undefined);
      }
    } finally {
      setSending(false);
    }
  };
  const sendQuickShare = (textValue: string) => {
    void dispatchMessage(createMessage({ type: "text", text: textValue }));
    setShowAttachments(false);
    setAttachmentPage("main");
  };
  const startVoiceNote = async () => {
    setChatError("");
    setShowAttachments(false);
    setShowEmoji(false);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setChatError(
          "Microphone permission is needed to record a voice message.",
        );
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      voiceTranscriptRef.current = "";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const SpeechRecognition =
          (
            window as unknown as {
              SpeechRecognition?: new () => NonNullable<
                typeof speechRecognitionRef.current
              >;
              webkitSpeechRecognition?: new () => NonNullable<
                typeof speechRecognitionRef.current
              >;
            }
          ).SpeechRecognition ??
          (
            window as unknown as {
              webkitSpeechRecognition?: new () => NonNullable<
                typeof speechRecognitionRef.current
              >;
            }
          ).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";
          recognition.onresult = (event) => {
            voiceTranscriptRef.current = Array.from(event.results)
              .map((result) => result[0]?.transcript ?? "")
              .join(" ")
              .replace(/\s+/g, " ")
              .trim();
          };
          speechRecognitionRef.current = recognition;
          try {
            recognition.start();
          } catch {
            speechRecognitionRef.current = null;
          }
        }
      }
      recorder.record({ forDuration: 120 });
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Could not start recording. Check microphone access and try again.",
      );
    }
  };
  const sendVoiceNote = async () => {
    const durationMs = Math.max(1000, recorderState.durationMillis);
    try {
      await recorder.stop();
      try {
        speechRecognitionRef.current?.stop();
      } catch {}
      speechRecognitionRef.current = null;
      await setAudioModeAsync({ allowsRecording: false });
      if (recorder.uri) {
        const uploadedUri = accessToken
          ? await chatApi
              .uploadMedia(accessToken, recorder.uri, `voice-${Date.now()}.m4a`)
              .catch(() => recorder.uri!)
          : recorder.uri;
        await dispatchMessage(
          createMessage({
            type: "voice",
            uri: uploadedUri,
            voice: {
              uri: uploadedUri,
              durationMs,
              transcript: voiceTranscriptRef.current || undefined,
              transcriptStatus: voiceTranscriptRef.current
                ? "available"
                : "unavailable",
            },
          }),
        );
      } else
        setChatError(
          "The recording could not be saved. Please record it again.",
        );
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Could not send the voice message.",
      );
    }
  };
  const cancelVoiceNote = async () => {
    try {
      try {
        speechRecognitionRef.current?.stop();
      } catch {}
      speechRecognitionRef.current = null;
      voiceTranscriptRef.current = "";
      if (recorderState.isRecording) await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      setChatError(
        "Recording stopped, but the microphone could not reset cleanly.",
      );
    }
  };
  const sendOrRecord = () => {
    if (text.trim()) {
      void sendText();
      return;
    }
    void startVoiceNote();
  };
  const shareLiveLocation = async () => {
    setChatError("");
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setChatError("Location permission is needed to share live location.");
      return;
    }
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const locationMessage = createMessage({
        type: "location",
        text: "Live location shared",
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "Live location Â· tracking for 30 min",
          live: true,
          expiresAt: Date.now() + 30 * 60 * 1000,
          accuracy: position.coords.accuracy ?? undefined,
        },
      });
      await dispatchMessage(locationMessage);
      setShowAttachments(false);
    } catch {
      setChatError(
        "Could not get your current location. Try again outdoors or check permission settings.",
      );
    }
  };
  const sendGalleryMedia = async () => {
    setChatError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setChatError("Photo and video permission is needed to share media.");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.82,
        videoMaxDuration: 180,
      });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      if (asset.fileSize && asset.fileSize > maxChatFileBytes) {
        setChatError("Choose a photo or video smaller than 100 MB.");
        return;
      }
      const name =
        asset.fileName?.trim() ||
        `DestinyOne-media-${Date.now()}.${asset.type === "video" ? "mp4" : "jpg"}`;
      const uploadedUri = accessToken
        ? await chatApi.uploadMedia(accessToken, asset.uri, name).catch(() => asset.uri)
        : asset.uri;
      if (asset.type === "video") {
        await dispatchMessage(
          createMessage({
            type: "document",
            uri: uploadedUri,
            text: "Video",
            document: {
              name,
              size: asset.fileSize,
              mimeType: asset.mimeType ?? "video/mp4",
              kind: "video",
            },
          }),
        );
      } else {
        await dispatchMessage(
          createMessage({
            type: "image",
            uri: uploadedUri,
            text: asset.fileName?.trim() || "Photo",
          }),
        );
      }
      setShowAttachments(false);
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Could not open your photo and video library.",
      );
    }
  };
  const sendCameraPhoto = async () => {
    setChatError("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setChatError("Camera permission is needed to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 5],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name = asset.fileName?.trim() || `DestinyOne-photo-${Date.now()}.jpg`;
      const uploadedUri = accessToken
        ? await chatApi.uploadMedia(accessToken, asset.uri, name).catch(() => asset.uri)
        : asset.uri;
      await dispatchMessage(
        createMessage({ type: "image", uri: uploadedUri }),
      );
      setShowAttachments(false);
    }
  };
  const sendDocument = async () => {
    setChatError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      if (asset.size && asset.size > maxChatFileBytes) {
        setChatError("Choose a document smaller than 100 MB.");
        return;
      }
      const isVideo = asset.mimeType?.startsWith("video/") ?? false;
      const uploadedUri = accessToken
        ? await chatApi
            .uploadMedia(accessToken, asset.uri, asset.name || `document-${Date.now()}`)
            .catch(() => asset.uri)
        : asset.uri;
      await dispatchMessage(
        createMessage({
          type: "document",
          uri: uploadedUri,
          text: isVideo ? "Video" : "Document",
          document: {
            name: asset.name || "Shared document",
            size: asset.size,
            mimeType: asset.mimeType ?? "application/octet-stream",
            kind: isVideo ? "video" : "document",
          },
        }),
      );
      setShowAttachments(false);
      setAttachmentPage("main");
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : "Could not open the document picker. Please try again.",
      );
    }
  };
  const sendGif = (uri: string) => {
    void dispatchMessage(createMessage({ type: "gif", uri }));
    setGifOpen(false);
    setShowEmoji(false);
    setShowAttachments(false);
  };
  const sendEmojiSticker = (sticker: CustomChatSticker) => {
    void dispatchMessage(
      createMessage({ type: "text", text: buildStickerPayload(sticker) }),
    );
    setShowEmoji(false);
  };
  const sendDigitalGift = (gift: DigitalGift) => {
    if (digitalGiftWalletMode !== "demo") {
      setChatError(
        "Digital gifts are unavailable until verified store billing and server wallet sync are active.",
      );
      setGiftOpen(false);
      return;
    }
    if (!canSendGift(coinBalance, gift.coins)) {
      setChatError(
        "Not enough coins. Secure wallet top-up will be enabled with production billing.",
      );
      setGiftOpen(false);
      return;
    }
    track("gift_sent", { gift: gift.name, coins: gift.coins });
    onSpendCoins(gift.coins);
    void dispatchMessage(
      createMessage({
        type: "gift",
        gift: { name: gift.name, emoji: gift.emoji, coins: gift.coins },
      }),
    );
    setGiftOpen(false);
    setShowAttachments(false);
  };
  const sendPhysicalGift = async (gift: PhysicalGift, note: string) => {
    const order = await createPhysicalGiftOrder({
      productId: gift.id,
      productName: gift.name,
      recipientId: match.id,
      recipientName: match.name,
      priceCents: gift.priceCents,
      etaHint: gift.eta,
      note,
    });
    track("physical_gift_requested", { gift: gift.name, demo: order.demo });
    await dispatchMessage(
      createMessage({
        type: "gift",
        text: `${gift.name} requested Â· ${order.quote.etaLabel}`,
        gift: {
          name: gift.name,
          emoji: gift.emoji,
          priceCents: gift.priceCents,
          physical: true,
          orderId: order.orderId,
          deliveryStatus: order.deliveryStatus,
          etaLabel: order.quote.etaLabel,
          etaConfidence: order.quote.etaConfidence,
          provider: "DestinyOne delivery",
          quoteId: order.quote.quoteId,
          serviceLevel: order.quote.serviceLevelLabel,
          providerRecommendation: order.quote.providerRecommendation,
          paymentPolicy: order.quote.paymentPolicy,
          cancellationPolicy: order.quote.cancellationPolicy,
          supportPolicy: order.quote.supportPolicy,
          recipientPrivacy: order.quote.recipientPrivacy,
          acceptanceWindowMinutes: order.quote.acceptanceWindowMinutes,
          acceptanceExpiresAt: order.quote.acceptanceExpiresAt,
          totalCents: order.quote.totalCents,
          steps: order.steps,
        },
      }),
    );
    setGiftOpen(false);
    setShowAttachments(false);
  };
  const sendSnap = (
    uri: string,
    filter: string,
    sticker: string,
    viewOnce: boolean,
  ) => {
    void dispatchMessage(
      createMessage({
        type: "snap",
        uri,
        snap: {
          filter,
          sticker,
          viewOnce,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        },
      }),
    );
    setSnapOpen(false);
    setShowAttachments(false);
  };
  const sendFaceEmoji = (faceUri: string, emoji: string, filter: string) => {
    void dispatchMessage(
      createMessage({
        type: "sticker",
        sticker: { faceUri, emoji, filter, label: "My face emoji" },
      }),
    );
    setFaceEmojiOpen(false);
    setShowAttachments(false);
  };
  const startGame = (game: CoupleGame, prompt: string) => {
    void dispatchMessage(
      createMessage({ type: "text", text: `ðŸŽ®GAME|${game.title}|${prompt}` }),
    );
    setGamesOpen(false);
    setShowAttachments(false);
  };
  const sendGameReply = (parent: ChatMessage, answer: string) => {
    const value = answer.trim();
    if (!value) return;
    const gameTitle = parent.text?.split("|")[1] ?? "Couple game";
    void dispatchMessage(
      createMessage({
        type: "text",
        text: `ðŸŽ®REPLY|${parent.id}|${gameTitle}|${value}`,
      }),
    );
  };
  const openAttachment = (id: string) => {
    if (id === "date_market") {
      setShowAttachments(false);
      navigate("events");
      return;
    }
    if (id === "camera") {
      void sendCameraPhoto();
      return;
    }
    if (id === "gallery") {
      void sendGalleryMedia();
      return;
    }
    if (id === "location") {
      void shareLiveLocation();
      return;
    }
    if (id === "document") {
      void sendDocument();
      return;
    }
    if (id === "more") {
      setAttachmentPage("more");
      return;
    }
    if (id === "contact") {
      sendQuickShare(
        `ðŸ‘¤ Trusted contact card\n${match.name} Â· DestinyOne verified match`,
      );
      return;
    }
    if (id === "poll") {
      sendQuickShare(
        "ðŸ“Š Which date feels best?\nâ˜• CafÃ©   ðŸ½ï¸ Dinner   ðŸŽ¨ Activity",
      );
      return;
    }
    if (id === "gif") {
      setGifOpen(true);
      return;
    }
    if (id === "gift") {
      setShowAttachments(false);
      navigate("gifts");
      return;
    }
    if (id === "games") {
      setGamesOpen(true);
      return;
    }
    if (id === "snap") {
      setSnapOpen(true);
      return;
    }
    if (id === "face") {
      setFaceEmojiOpen(true);
      return;
    }
    if (id === "spark") {
      setShowAttachments(false);
      onRose();
      return;
    }
    if (id === "disappearing") {
      onSettingsChange({
        ...settings,
        retentionMode: settings.retentionMode === "keep" ? "24_hours" : "keep",
      });
      setShowAttachments(false);
      return;
    }
    if (id === "back") setAttachmentPage("main");
  };
  const activeTheme =
    coupleThemes.find((theme) => theme.name === settings.theme) ??
    coupleThemes[0]!;
  const disappearingMessages = settings.retentionMode !== "keep";
  const retentionShort =
    settings.retentionMode === "after_seen"
      ? "After seen"
      : settings.retentionMode === "24_hours"
        ? "24h"
        : settings.retentionMode === "7_days"
          ? "7d"
          : "Keep";
  const displayName = settings.nickname.trim() || match.name;
  const partnerIsOnline = isChatPreview ? connectionOnline : partnerOnline;
  const presenceLabel = partnerTyping
    ? `${match.name} is typingâ€¦`
    : partnerIsOnline
      ? isCoupleMode
        ? "Private couple space"
        : settings.nickname.trim()
          ? `${match.name} Â· Online`
          : "Online now"
      : !connectionOnline
        ? "You are offline"
        : realtimeConnected
          ? "Last seen recently"
          : "Connecting securelyâ€¦";
  const messageSafety = scanMessageSafety(text);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const previewMessages: ChatMessage[] =
    previewState === "chat-document"
      ? [
          ...messages,
          {
            id: "document-card-preview",
            mine: true,
            type: "document",
            text: "Document",
            uri: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            document: {
              name: "Relationship values.pdf",
              size: 1887437,
              mimeType: "application/pdf",
              kind: "document",
            },
            createdAt: Date.now() - 120000,
            status: "read",
          },
        ]
      : previewState === "chat-media"
        ? [
            ...messages,
            {
              id: "media-card-preview",
              mine: true,
              type: "image",
              text: "Photo",
              uri: match.photo,
              createdAt: Date.now() - 120000,
              status: "read",
            },
          ]
        : previewState === "chat-voice"
          ? [
              ...messages,
              {
                id: "voice-card-preview",
                mine: true,
                type: "voice",
                text: "Voice message",
                uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                voice: {
                  uri: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                  durationMs: 18000,
                },
                createdAt: Date.now() - 120000,
                status: "read",
              },
            ]
          : messages;
  const recordingUiActive =
    recorderState.isRecording || recordingPreviewVisible;
  const recordingDurationMs = recordingPreviewVisible
    ? 7800
    : recorderState.durationMillis;
  const gameRepliesByParent = previewMessages.reduce<
    Record<string, ChatMessage[]>
  >((groups, message) => {
    const reply = parseGameReply(message);
    if (reply) {
      groups[reply.parentId] = [...(groups[reply.parentId] ?? []), message];
    }
    return groups;
  }, {});
  const topLevelMessages = previewMessages.filter(
    (message) =>
      !parseGameReply(message) &&
      !hiddenMessageIds.includes(message.id) &&
      !message.hiddenForMe,
  );
  const visibleMessages = normalizedSearch
    ? topLevelMessages.filter(
        (message) =>
          messageSummary(message).toLowerCase().includes(normalizedSearch) ||
          (gameRepliesByParent[message.id] ?? []).some((reply) =>
            messageSummary(reply).toLowerCase().includes(normalizedSearch),
          ),
      )
    : topLevelMessages;
  const pinnedMessages = previewMessages
    .filter((message) => !!message.pinnedAt && !message.deletedForEveryone)
    .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
  const latestDateMessage = [...messages]
    .reverse()
    .find((message) => message.type === "date" && message.date);
  const selectedMessage =
    previewMessages.find((message) => message.id === selectedMessageId) ?? null;
  const selectMessage = (message: ChatMessage) => {
    if (message.deletedForEveryone) return;
    if (multiSelectMode) {
      setSelectedMessageIds((current) =>
        current.includes(message.id)
          ? current.filter((id) => id !== message.id)
          : [...current, message.id],
      );
      return;
    }
    setSelectedMessageId((current) =>
      current === message.id ? null : message.id,
    );
  };
  const startMultiSelect = (message?: ChatMessage) => {
    setMultiSelectMode(true);
    setSelectedMessageIds(message ? [message.id] : []);
    setSelectedMessageId(null);
  };
  const stopMultiSelect = () => {
    setMultiSelectMode(false);
    setSelectedMessageIds([]);
  };
  const reactToMessage = async (messageId: string, reaction: string) => {
    const current = previewMessages.find((item) => item.id === messageId);
    const next = current?.reactions?.me === reaction ? null : reaction;
    await onMessageState(messageId, { reaction: next });
    setSelectedMessageId(null);
  };
  const toggleStar = async (messageId: string) => {
    const current = previewMessages.find((item) => item.id === messageId);
    await onMessageState(messageId, { starred: !current?.starredByMe });
    setSelectedMessageId(null);
  };
  const togglePin = async (messageId: string) => {
    const current = previewMessages.find((item) => item.id === messageId);
    await onMessageState(messageId, { pinned: !current?.pinnedAt });
    setSelectedMessageId(null);
  };
  const hideForMe = async (messageId: string) => {
    setHiddenMessageIds((current) => [...current, messageId]);
    await onMessageState(messageId, { hidden: true });
    setSelectedMessageId(null);
  };
  const copySelected = async () => {
    if (!selectedMessage) return;
    const value = messageSummary(selectedMessage);
    try {
      if (
        Platform.OS === "web" &&
        typeof navigator !== "undefined" &&
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(value);
        setMessageActionNotice("Message copied.");
      } else {
        await Share.share({ message: value });
        setMessageActionNotice("Copy/share options opened.");
      }
    } catch {
      setMessageActionNotice("Could not copy this message.");
    }
    setSelectedMessageId(null);
  };
  const forwardSelected = () => {
    const chosen = multiSelectMode
      ? previewMessages.filter((message) =>
          selectedMessageIds.includes(message.id),
        )
      : selectedMessage
        ? [selectedMessage]
        : [];
    if (!chosen.length) return;
    setForwardMessages(chosen);
    setSelectedMessageId(null);
    stopMultiSelect();
  };
  const requestDeleteSelected = () => {
    if (!selectedMessage || selectedMessage.mine === false) return;
    if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    setHiddenMessageIds((current) => [
      ...new Set([...current, selectedMessage.id]),
    ]);
    setPendingDelete(selectedMessage);
    setSelectedMessageId(null);
    pendingDeleteTimer.current = setTimeout(() => {
      void onDelete(selectedMessage.id);
      setPendingDelete(null);
      pendingDeleteTimer.current = null;
    }, 5000);
  };
  const undoDelete = () => {
    if (!pendingDelete) return;
    if (pendingDeleteTimer.current) clearTimeout(pendingDeleteTimer.current);
    setHiddenMessageIds((current) =>
      current.filter((id) => id !== pendingDelete.id),
    );
    setPendingDelete(null);
    pendingDeleteTimer.current = null;
  };
  const jumpToMessage = (messageId: string) => {
    const y = messageOffsets.current[messageId];
    if (typeof y === "number") {
      messagesRef.current?.scrollTo({ y: Math.max(0, y - 90), animated: true });
      setSelectedMessageId(null);
      setTimeout(() => setSelectedMessageId(messageId), 250);
      setTimeout(() => setSelectedMessageId(null), 1800);
    } else
      setMessageActionNotice(
        "The original message is outside the loaded history.",
      );
  };
  return (
    <ChatRuntimeContext.Provider value={runtimePorts}>
      <View style={{ flex: 1, backgroundColor: "#FFF7F8" }}>
        <Image
          source={backgroundImage}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <SafeAreaView
          style={[
            chatPremiumStyles.safeArea,
            { backgroundColor: "transparent" },
          ]}
        >
          <View
            style={[
              styles.chatHead,
              chatPremiumStyles.chatHead,
              {
                backgroundColor: "rgba(255,253,252,.98)",
                borderBottomColor: "#E8D6D9",
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isCoupleMode ? "Back to our space" : "Back to matches"
              }
              hitSlop={accessibilityHitSlop}
              onPress={() => navigate("home")}
            >
              <PremiumIcon
                name="arrow-back"
                tone="dark"
                size={35}
                iconSize={17}
              />
            </Pressable>
            {match.photo ? (
              <Image
                accessible
                accessibilityLabel={`${match.name} profile photo`}
                source={{ uri: match.photo }}
                style={[
                  styles.chatAvatar,
                  chatPremiumStyles.chatAvatar,
                  { borderWidth: 1, borderColor: activeTheme.accent },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.chatAvatar,
                  chatPremiumStyles.chatAvatar,
                  chatStyles.initialAvatar,
                  { borderColor: activeTheme.accent },
                ]}
              >
                <Text style={chatStyles.initialAvatarText}>
                  {match.name[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View accessibilityRole="header" style={{ flex: 1 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Conversation with ${displayName}`}
                accessibilityHint="Edit chat nickname"
                hitSlop={accessibilityHitSlop}
                onPress={() => setSettingsOpen(true)}
                style={{ flex: 1 }}
              >
                <Text
                  numberOfLines={1}
                  style={[shared.label, chatStyles.chatName]}
                >
                  {displayName}
                </Text>
                <View style={chatStyles.onlineRow}>
                  <View
                    style={[
                      chatStyles.onlineDot,
                      {
                        backgroundColor: partnerTyping
                          ? colors.gold
                          : partnerIsOnline
                            ? "#3E9A66"
                            : colors.muted,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.onlineText,
                      partnerTyping && chatStyles.typingStatus,
                    ]}
                  >
                    {presenceLabel}
                  </Text>
                </View>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Audio call"
              hitSlop={accessibilityHitSlop}
              onPress={() => void startRealCall("audio")}
              style={chatStyles.headerAction}
            >
              <Ionicons name="call-outline" size={20} color={colors.wine} />
            </Pressable>
            {chatWidth >= 340 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Video call"
                hitSlop={accessibilityHitSlop}
                onPress={() => void startRealCall("video")}
                style={chatStyles.headerAction}
              >
                <Ionicons
                  name="videocam-outline"
                  size={21}
                  color={colors.wine}
                />
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chat options"
              hitSlop={accessibilityHitSlop}
              onPress={() => setOptionsOpen(true)}
              style={chatStyles.headerAction}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={20}
                color={colors.muted}
              />
            </Pressable>
          </View>
          {searchOpen && (
            <View style={chatStyles.searchBar}>
              <Ionicons name="search-outline" size={18} color={colors.muted} />
              <TextInput
                accessibilityLabel="Search this conversation"
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search this conversation"
                placeholderTextColor="#806D7D"
                style={chatStyles.searchInput}
              />
              <Text
                accessibilityLiveRegion="polite"
                style={chatStyles.searchCount}
              >
                {normalizedSearch ? `${visibleMessages.length} found` : ""}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close message search"
                hitSlop={accessibilityHitSlop}
                onPress={() => {
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
              >
                <Ionicons name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>
          )}
          {!!incomingCall && !callMode && (
            <View accessibilityRole="alert" style={chatStyles.incomingCall}>
              <PremiumIcon
                name={incomingCall?.mode === "video" ? "videocam" : "call"}
                tone="ruby"
                size={40}
                iconSize={19}
              />
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.incomingCallTitle}>
                  Incoming {incomingCall?.mode ?? "audio"} call
                </Text>
                <Text style={chatStyles.incomingCallBody}>
                  {match.name} Â· Verified mutual match
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decline call"
                hitSlop={accessibilityHitSlop}
                onPress={() => {
                  if (incomingCall)
                    void callApi
                      .respond(accessToken, incomingCall.id, false)
                      .catch(() => undefined);
                  setIncomingCall(null);
                  setIncomingCallId(null);
                }}
                style={chatStyles.callDecline}
              >
                <Ionicons name="call" size={17} color={colors.danger} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Accept call"
                hitSlop={accessibilityHitSlop}
                onPress={() => {
                  if (!incomingCall) return;
                  void callApi
                    .respond(accessToken, incomingCall.id, true)
                    .catch(() => undefined);
                  setActiveCallId(incomingCall.id);
                  setIsCallOutgoing(false);
                  setCallMode(incomingCall.mode);
                  setIncomingCall(null);
                }}
                style={chatStyles.callAccept}
              >
                <Ionicons name="call" size={17} color={colors.textInverse} />
              </Pressable>
            </View>
          )}
          <View style={chatStyles.contextBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isCoupleMode
                  ? "Open our couple space"
                  : "Open relationship path"
              }
              hitSlop={accessibilityHitSlop}
              onPress={() => {
                if (isCoupleMode) {
                  navigate("home");
                  return;
                }
                const dateStatus =
                  latestDateMessage?.date?.planStatus ??
                  (latestDateMessage ? "proposed" : "none");
                const journey = buildRelationshipJourney({
                  alignmentComplete: true,
                  conversationUnlocked: true,
                  dateStatus,
                  reflection: reflection?.choice ?? null,
                });
                onJourneyEvent("relationship_path_opened", {
                  stage: journey.currentStage?.id ?? "complete",
                });
                setJourneyOpen(true);
              }}
              style={chatStyles.privateContext}
            >
              <Ionicons
                name="heart-circle-outline"
                size={14}
                color={colors.gold}
              />
              <Text style={chatStyles.privateContextText}>
                {isCoupleMode
                  ? "Our space"
                  : disappearingMessages
                    ? `${retentionShort} Â· Path`
                    : "Relationship path"}
              </Text>
            </Pressable>
            <View style={shared.spacer} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open couple games"
              accessibilityState={{ expanded: gamesOpen }}
              hitSlop={accessibilityHitSlop}
              onPress={() => setGamesOpen(true)}
              style={[chatStyles.contextAction, chatStyles.playContextAction]}
            >
              <Ionicons name="game-controller" size={14} color="#7A132F" />
              <Text style={chatStyles.playContextText}>Play</Text>
              <View style={chatStyles.playContextDot} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Send a romantic gift to ${match.name}`}
              hitSlop={accessibilityHitSlop}
              onPress={() => navigate("gifts")}
              style={[chatStyles.contextAction, chatStyles.giftContextAction]}
            >
              <Ionicons name="gift" size={14} color="#FFF" />
              <Text style={chatStyles.giftContextText}>Gift</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Date Marketplace"
              hitSlop={accessibilityHitSlop}
              onPress={() => navigate("events")}
              style={chatStyles.contextAction}
            >
              <Ionicons name="calendar-outline" size={14} color={colors.gold} />
              <Text style={chatStyles.contextActionText}>Date</Text>
            </Pressable>
            {chatWidth >= 520 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reply coach"
                accessibilityState={{ expanded: showCoach }}
                hitSlop={accessibilityHitSlop}
                onPress={() => setShowCoach((value) => !value)}
                style={[
                  chatStyles.contextAction,
                  showCoach && chatStyles.contextActionOn,
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={14}
                  color={showCoach ? colors.gold : colors.muted}
                />
                <Text style={chatStyles.contextActionText}>Coach</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search messages"
              accessibilityState={{ expanded: searchOpen }}
              hitSlop={accessibilityHitSlop}
              onPress={() => {
                setSearchOpen((value) => !value);
                setSearchQuery("");
              }}
              style={chatStyles.contextIcon}
            >
              <Ionicons name="search-outline" size={17} color={colors.muted} />
            </Pressable>
            {chatWidth >= 410 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Chat settings"
                hitSlop={accessibilityHitSlop}
                onPress={() => setSettingsOpen(true)}
                style={chatStyles.contextIcon}
              >
                <Ionicons
                  name="settings-outline"
                  size={17}
                  color={colors.muted}
                />
              </Pressable>
            )}
          </View>
          {showCoach && (
            <View style={[coachStyles.chatCoach, chatStyles.coachPanel]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 7 }}
              >
                {chatCoachSuggestions.map((item) => (
                  <Pressable
                    key={item.label}
                    onPress={() => {
                      setText(item.message(match));
                      setShowCoach(false);
                    }}
                    style={[
                      coachStyles.suggestionChip,
                      {
                        borderColor: "rgba(255,255,255,.10)",
                        backgroundColor: "rgba(255,255,255,.045)",
                      },
                    ]}
                  >
                    <Text style={coachStyles.suggestionText}>{item.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                onPress={() => navigate("coach")}
                style={chatStyles.coachOpen}
              >
                <Text style={chatStyles.coachOpenText}>Open coach</Text>
              </Pressable>
            </View>
          )}
          {!!chatError && (
            <Pressable
              onPress={() => setChatError("")}
              style={chatStyles.errorBanner}
            >
              <Text style={chatStyles.errorText}>{chatError}</Text>
              <MiniPremiumIcon
                name="close"
                tone="dark"
                size={28}
                iconSize={13}
              />
            </Pressable>
          )}
          {!!pinnedMessages.length && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${pinnedMessages.length} pinned messages`}
              onPress={() => setPinnedOpen(true)}
              style={chatStyles.pinnedBanner}
            >
              <MiniPremiumIcon name="pin" tone="gold" size={28} iconSize={13} />
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.pinnedBannerTitle}>
                  {pinnedMessages.length} pinned{" "}
                  {pinnedMessages.length === 1 ? "message" : "messages"}
                </Text>
                <Text numberOfLines={1} style={chatStyles.pinnedBannerBody}>
                  {messageSummary(pinnedMessages[0]!)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#8A6B1A" />
            </Pressable>
          )}
          {multiSelectMode && (
            <View accessibilityRole="toolbar" style={chatStyles.multiSelectBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel message selection"
                onPress={stopMultiSelect}
                style={chatStyles.multiSelectButton}
              >
                <Ionicons name="close" size={18} color="#6C555D" />
              </Pressable>
              <Text
                accessibilityLiveRegion="polite"
                style={chatStyles.multiSelectCount}
              >
                {selectedMessageIds.length} selected
              </Text>
              <View style={shared.spacer} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Forward selected messages"
                disabled={!selectedMessageIds.length}
                onPress={forwardSelected}
                style={[
                  chatStyles.multiSelectAction,
                  !selectedMessageIds.length && { opacity: 0.4 },
                ]}
              >
                <Ionicons name="arrow-redo-outline" size={17} color="#FFF" />
                <Text style={chatStyles.multiSelectActionText}>Forward</Text>
              </Pressable>
            </View>
          )}
          {!!pendingDelete && (
            <View accessibilityRole="alert" style={chatStyles.undoBanner}>
              <Ionicons name="trash-outline" size={17} color="#8F1730" />
              <Text style={chatStyles.undoText}>Message deleted</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Undo message delete"
                onPress={undoDelete}
                style={chatStyles.undoButton}
              >
                <Text style={chatStyles.undoButtonText}>UNDO</Text>
              </Pressable>
            </View>
          )}
          <ScrollView
            ref={messagesRef}
            onScroll={handleBottomNavScroll}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            onContentSizeChange={() =>
              messagesRef.current?.scrollToEnd({ animated: true })
            }
            contentContainerStyle={[
              styles.messages,
              chatPremiumStyles.messages,
            ]}
          >
            {!isCoupleMode && isChatPreview && (
              <>
                <View style={styles.iceReveal}>
                  <Text style={styles.kicker}>ICEBREAKER REVEALED</Text>
                  <Text style={styles.revealText}>
                    You both chose:{" "}
                    <Text style={{ color: colors.text }}>Road trip ðŸš—</Text>
                  </Text>
                </View>
                <Text style={chatStyles.dayLabel}>TODAY</Text>
                <View
                  style={[styles.theirBubble, chatPremiumStyles.theirBubble]}
                >
                  <Text style={styles.bubbleText}>
                    Okay, excellent choice. Mountains or coast? ðŸ˜Š
                  </Text>
                  <Text style={styles.time}>7:42 PM</Text>
                </View>
              </>
            )}
            {visibleMessages.map((message) => (
              <View
                key={message.id}
                onLayout={(event) => {
                  messageOffsets.current[message.id] =
                    event.nativeEvent.layout.y;
                }}
                style={[
                  chatStyles.messageGroup,
                  (selectedMessageId === message.id ||
                    selectedMessageIds.includes(message.id)) &&
                    chatStyles.messageGroupSelected,
                ]}
              >
                <ChatBubble
                  message={message}
                  status={deliveryOverrides[message.id] ?? message.status}
                  accent={activeTheme.accent}
                  reaction={message.reactions?.me || undefined}
                  starred={message.starredByMe}
                  pinned={!!message.pinnedAt}
                  selected={selectedMessageIds.includes(message.id)}
                  gameReplies={gameRepliesByParent[message.id] ?? []}
                  onReplyJump={jumpToMessage}
                  onGameReply={(answer) => sendGameReply(message, answer)}
                  onGiftResponse={(input) => onGiftResponse(message.id, input)}
                  onPress={() => selectMessage(message)}
                />
              </View>
            ))}
            {!!normalizedSearch && !visibleMessages.length && (
              <View style={chatStyles.emptySearch}>
                <Ionicons
                  name="search-outline"
                  size={24}
                  color={colors.muted}
                />
                <Text style={chatStyles.emptySearchText}>
                  No messages match â€œ{searchQuery}â€.
                </Text>
              </View>
            )}
            {!isCoupleMode && partnerTyping && (
              <View
                accessible
                accessibilityLabel={`${match.name} is typing`}
                style={chatStyles.typingRow}
              >
                {match.photo ? (
                  <Image
                    accessible={false}
                    source={{ uri: match.photo }}
                    style={chatStyles.typingAvatar}
                  />
                ) : (
                  <View
                    style={[chatStyles.typingAvatar, chatStyles.initialAvatar]}
                  >
                    <Text style={chatStyles.typingInitial}>
                      {match.name[0]?.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={chatStyles.typingBubble}>
                  <View style={chatStyles.typingDot} />
                  <View style={chatStyles.typingDot} />
                  <View style={chatStyles.typingDot} />
                </View>
                <Text style={chatStyles.typingLabel}>
                  {match.name} is typing
                </Text>
              </View>
            )}
          </ScrollView>
          <KeyboardAvoidingView
            behavior={
              Platform.OS === "ios"
                ? "padding"
                : Platform.OS === "android"
                  ? "height"
                  : undefined
            }
            style={chatStyles.keyboardWrap}
          >
            {!!text.trim() && messageSafety.signals.length > 0 && (
              <SafetyNudge
                scan={messageSafety}
                onOpenSafety={() => navigate("safety")}
              />
            )}
            {showAttachments && (
              <View
                style={[
                  chatStyles.attachmentTray,
                  chatWidth >= 600 && chatStyles.attachmentTrayWide,
                ]}
              >
                <View style={chatStyles.attachmentTrayHeader}>
                  <View style={{ flex: 1 }}>
                    <Text
                      accessibilityRole="header"
                      style={chatStyles.attachmentTrayTitle}
                    >
                      {attachmentPage === "main"
                        ? "Share in chat"
                        : "More ways to connect"}
                    </Text>
                    <Text style={chatStyles.attachmentTrayBody}>
                      {attachmentPage === "main"
                        ? "Photos, video, files, places and date plans."
                        : "Play together, send a gift, create a poll or turn on privacy tools."}
                    </Text>
                  </View>
                  <Text style={chatStyles.attachmentTrayPage}>
                    {attachmentPage === "main" ? "1 / 2" : "2 / 2"}
                  </Text>
                </View>
                {(attachmentPage === "main"
                  ? chatPrimaryAttachments
                  : chatMoreAttachments
                )
                  .filter((item) => !isCoupleMode || item.id !== "spark")
                  .map((item) => (
                    <Attachment
                      key={item.id}
                      icon={item.icon as keyof typeof Ionicons.glyphMap}
                      label={
                        item.id === "disappearing"
                          ? disappearingMessages
                            ? `${retentionShort} On`
                            : "Timer Off"
                          : item.label
                      }
                      color={item.color}
                      onPress={() => openAttachment(item.id)}
                    />
                  ))}
              </View>
            )}
            {showEmoji && (
              <EmojiMediaPanel
                onEmoji={(emoji) => setText((value) => value + emoji)}
                onGif={sendGif}
                onSticker={sendEmojiSticker}
              />
            )}
            {replyTarget && (
              <View style={chatStyles.replyPreview}>
                <View style={chatStyles.replyAccent} />
                <View style={{ flex: 1 }}>
                  <Text style={chatStyles.replyTitle}>
                    Replying to your message
                  </Text>
                  <Text numberOfLines={1} style={chatStyles.replyText}>
                    {messageSummary(replyTarget)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel reply"
                  hitSlop={accessibilityHitSlop}
                  onPress={() => setReplyTarget(null)}
                >
                  <Ionicons name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>
            )}
            <View style={[styles.composer, chatPremiumStyles.composer]}>
              {!connectionOnline && (
                <View accessibilityRole="alert" style={chatStyles.offlinePill}>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={12}
                    color={colors.muted}
                  />
                  <Text style={chatStyles.offlineText}>
                    Offline Â· message will send when connected
                  </Text>
                </View>
              )}
              {recordingUiActive ? (
                <VoiceRecordingComposer
                  durationMs={recordingDurationMs}
                  onCancel={() => {
                    if (recordingPreviewVisible) {
                      setRecordingPreviewVisible(false);
                      return;
                    }
                    void cancelVoiceNote();
                  }}
                  onSend={() => {
                    if (recordingPreviewVisible) {
                      setRecordingPreviewVisible(false);
                      return;
                    }
                    void sendVoiceNote();
                  }}
                />
              ) : (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      showAttachments ? "Close attachments" : "Add attachment"
                    }
                    accessibilityState={{ expanded: showAttachments }}
                    hitSlop={accessibilityHitSlop}
                    onPress={() => {
                      setShowAttachments((value) => {
                        if (!value) setAttachmentPage("main");
                        return !value;
                      });
                      setShowEmoji(false);
                    }}
                  >
                    <PremiumIcon
                      name={showAttachments ? "close" : "add-circle-outline"}
                      tone={showAttachments ? "ruby" : "dark"}
                      size={36}
                      iconSize={17}
                    />
                  </Pressable>
                  <View
                    style={[
                      chatStyles.inputWrap,
                      {
                        backgroundColor: "#FFFDFC",
                        borderWidth: 1,
                        borderColor: "#E2CED3",
                      },
                    ]}
                  >
                    <TextInput
                      accessibilityLabel="Message"
                      accessibilityHint="Type a message to this mutual match"
                      value={text}
                      onChangeText={updateText}
                      onSubmitEditing={() => void sendText()}
                      returnKeyType="send"
                      placeholder={sending ? "Sendingâ€¦" : "Messageâ€¦"}
                      placeholderTextColor="#8C7888"
                      editable={!sending}
                      style={[styles.chatInput, chatPremiumStyles.chatInput]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        showEmoji ? "Close emoji picker" : "Open emoji picker"
                      }
                      accessibilityState={{ expanded: showEmoji }}
                      hitSlop={accessibilityHitSlop}
                      onPress={() => {
                        setShowEmoji((value) => !value);
                        setShowAttachments(false);
                      }}
                    >
                      <Ionicons
                        name={showEmoji ? "close" : "happy-outline"}
                        size={21}
                        color={showEmoji ? colors.gold : "#B59DA4"}
                      />
                    </Pressable>
                  </View>
                  <Pressable
                    disabled={sending}
                    accessibilityRole="button"
                    accessibilityLabel={
                      sending
                        ? "Sending message"
                        : text.trim()
                          ? "Send message"
                          : "Record voice note"
                    }
                    accessibilityState={{ disabled: sending }}
                    hitSlop={accessibilityHitSlop}
                    onPress={sendOrRecord}
                    style={chatStyles.sendButton}
                  >
                    <Ionicons
                      name={
                        sending ? "time-outline" : text.trim() ? "send" : "mic"
                      }
                      size={20}
                      color={colors.textInverse}
                    />
                  </Pressable>
                </>
              )}
            </View>
          </KeyboardAvoidingView>
          <BottomNav
            active="chat"
            mode={experienceMode}
            light
            referenceIcons
            onOpenTool={(tool) =>
              tool === "gift" ? setGiftOpen(true) : setGamesOpen(true)
            }
            navigate={navigate}
          />
          <MessageActionSheet
            visible={!!selectedMessage}
            message={selectedMessage}
            reaction={selectedMessage?.reactions?.me || undefined}
            starred={!!selectedMessage?.starredByMe}
            pinned={!!selectedMessage?.pinnedAt}
            notice={messageActionNotice}
            onClose={() => {
              setSelectedMessageId(null);
              setMessageActionNotice("");
            }}
            onInfo={() =>
              setMessageActionNotice(
                selectedMessage
                  ? `${selectedMessage.mine === false ? "Received" : "Sent"} ${new Date(selectedMessage.createdAt).toLocaleString()} Â· ${deliveryOverrides[selectedMessage.id] ?? selectedMessage.status}${selectedMessage.editedAt ? " Â· Edited" : ""}`
                  : "",
              )
            }
            onReply={() => {
              if (selectedMessage) setReplyTarget(selectedMessage);
              setSelectedMessageId(null);
            }}
            onEdit={() => {
              if (selectedMessage) setEditTarget(selectedMessage);
              setSelectedMessageId(null);
            }}
            onCopy={() => void copySelected()}
            onReact={(reaction) => {
              if (selectedMessage)
                void reactToMessage(selectedMessage.id, reaction);
            }}
            onForward={forwardSelected}
            onMultiSelect={() => {
              if (selectedMessage) startMultiSelect(selectedMessage);
            }}
            onPin={() => {
              if (selectedMessage) void togglePin(selectedMessage.id);
            }}
            onStar={() => {
              if (selectedMessage) void toggleStar(selectedMessage.id);
            }}
            onDelete={requestDeleteSelected}
            onHideForMe={() => {
              if (selectedMessage) void hideForMe(selectedMessage.id);
            }}
          />
          <EditMessageSheet
            message={editTarget}
            onClose={() => setEditTarget(null)}
            onSave={async (textValue) => {
              if (!editTarget) return false;
              const saved = await onEdit(editTarget.id, textValue);
              if (saved) setEditTarget(null);
              return saved;
            }}
          />
          <ForwardSelectorSheet
            visible={forwardMessages.length > 0}
            messages={forwardMessages}
            current={match}
            onClose={() => setForwardMessages([])}
            onForward={async (target) => {
              const sent = await onForward(target, forwardMessages);
              setForwardMessages([]);
              setMessageActionNotice(
                `${sent} ${sent === 1 ? "message" : "messages"} forwarded to ${target.name}.`,
              );
            }}
          />
          <PinnedMessagesSheet
            visible={pinnedOpen}
            messages={pinnedMessages}
            onClose={() => setPinnedOpen(false)}
            onJump={(messageId) => {
              setPinnedOpen(false);
              setTimeout(() => jumpToMessage(messageId), 250);
            }}
            onUnpin={(messageId) => void togglePin(messageId)}
          />
          <ConversationInboxSheet
            visible={inboxOpen}
            current={match}
            settings={conversationSettings}
            onClose={() => setInboxOpen(false)}
            onOpen={(target) => {
              setInboxOpen(false);
              onOpenConversation(target);
            }}
          />
          <GifPicker
            visible={gifOpen}
            onClose={() => setGifOpen(false)}
            onSelect={sendGif}
            onSticker={sendEmojiSticker}
          />
          <GiftShop
            visible={giftOpen}
            balance={coinBalance}
            recipientName={match.name}
            physicalMode={physicalGiftOrderingMode}
            digitalMode={digitalGiftWalletMode}
            onClose={() => setGiftOpen(false)}
            onSendDigital={sendDigitalGift}
            onOrderPhysical={sendPhysicalGift}
          />
          <GameSheet
            visible={gamesOpen}
            onClose={() => setGamesOpen(false)}
            onPlay={startGame}
          />
          <SnapStudio
            visible={snapOpen}
            onClose={() => setSnapOpen(false)}
            onSend={sendSnap}
          />
          <FaceEmojiStudio
            visible={faceEmojiOpen}
            onClose={() => setFaceEmojiOpen(false)}
            onSend={sendFaceEmoji}
          />
          <CallModal
            mode={callMode}
            match={match}
            isCoupleMode={isCoupleMode}
            accessToken={accessToken}
            callId={activeCallId}
            isCaller={isCallOutgoing}
            onClose={() => {
              setIncomingCallId(null);
              setActiveCallId(null);
              setCallMode(null);
            }}
          />
          <CoupleSettingsSheet
            visible={settingsOpen}
            match={match}
            settings={settings}
            onChange={onSettingsChange}
            onClose={() => setSettingsOpen(false)}
          />
          <ChatOptionsSheet
            visible={optionsOpen}
            retentionLabel={retentionShort}
            screenshotAlerts={settings.screenshotAlerts}
            onClose={() => setOptionsOpen(false)}
            onInbox={() => {
              setOptionsOpen(false);
              setInboxOpen(true);
            }}
            onSearch={() => {
              setOptionsOpen(false);
              setSearchOpen(true);
              setSearchQuery("");
            }}
            onDate={() => {
              setOptionsOpen(false);
              navigate("events");
            }}
            onSettings={() => {
              setOptionsOpen(false);
              setSettingsOpen(true);
            }}
            onSafety={() => {
              setOptionsOpen(false);
              setSafetyOpen(true);
            }}
          />
          <SafetyActions
            mode={experienceMode}
            visible={safetyOpen}
            match={match}
            isBlocked={isBlocked}
            onClose={() => setSafetyOpen(false)}
            onSafetyCenter={() => {
              setSafetyOpen(false);
              navigate("safety");
            }}
            onReport={(reason, details) => {
              onReport(reason, details);
              setSafetyOpen(false);
            }}
            onBlock={() => {
              setSafetyOpen(false);
              onBlock();
            }}
            onUnblock={() => {
              setSafetyOpen(false);
              onUnblock();
            }}
            onUnmatch={() => {
              setSafetyOpen(false);
              onUnmatch();
            }}
          />
          {!isCoupleMode && (
            <RelationshipJourneySheet
              visible={journeyOpen}
              match={match}
              dateMessage={latestDateMessage}
              reflection={reflection?.choice ?? null}
              useForMatching={reflection?.useForMatching ?? false}
              reminderEnabled={reminder?.enabled ?? false}
              onDateStatus={(status) => {
                if (latestDateMessage)
                  onDateStatus(latestDateMessage.id, status);
              }}
              onReflection={(choice) => {
                if (latestDateMessage)
                  onReflection(latestDateMessage.id, choice);
              }}
              onLearningConsent={onLearningConsent}
              onReminder={(enabled) => {
                if (latestDateMessage)
                  onReminder(latestDateMessage.id, enabled);
              }}
              onRespectfulClose={() => {
                setJourneyOpen(false);
                setSafetyOpen(true);
              }}
              onClose={() => setJourneyOpen(false)}
              onDate={() => {
                setJourneyOpen(false);
                navigate("events");
              }}
              onCircle={() => {
                setJourneyOpen(false);
                navigate("circle");
              }}
            />
          )}
        </SafeAreaView>
      </View>
    </ChatRuntimeContext.Provider>
  );
}

function RelationshipJourneySheet({
  visible,
  match,
  dateMessage,
  reflection,
  useForMatching,
  reminderEnabled,
  onDateStatus,
  onReflection,
  onLearningConsent,
  onReminder,
  onRespectfulClose,
  onClose,
  onDate,
  onCircle,
}: {
  visible: boolean;
  match: Match;
  dateMessage?: ChatMessage;
  reflection: RelationshipReflection;
  useForMatching: boolean;
  reminderEnabled: boolean;
  onDateStatus: (status: DatePlanStatus) => void;
  onReflection: (value: RelationshipReflection) => void;
  onLearningConsent: (enabled: boolean) => void;
  onReminder: (enabled: boolean) => void;
  onRespectfulClose: () => void;
  onClose: () => void;
  onDate: () => void;
  onCircle: () => void;
}) {
  const dateStatus =
    dateMessage?.date?.planStatus ?? (dateMessage ? "proposed" : "none");
  const journey = buildRelationshipJourney({
    alignmentComplete: true,
    conversationUnlocked: true,
    dateStatus,
    reflection,
  });
  const learning = buildRelationshipLearningState({
    dateStatus,
    reflection,
    useForMatching,
    reminderEnabled,
  });
  const reflectionOptions: Array<{
    value: Exclude<RelationshipReflection, null>;
    label: string;
    body: string;
    icon: keyof typeof Ionicons.glyphMap;
  }> = [
    {
      value: "continue",
      label: "Worth exploring",
      body: "I felt safe and would like another date.",
      icon: "heart",
    },
    {
      value: "pause",
      label: "I need more time",
      body: "Keep the connection open without pressure.",
      icon: "time",
    },
    {
      value: "close",
      label: "Not for me",
      body: "Privately close the journey and improve future suggestions.",
      icon: "close-circle",
    },
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, journeyStyles.sheet]}>
        <SheetHeader
          title="Your relationship path"
          subtitle={`A private journey with ${match.name}`}
          onClose={onClose}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={journeyStyles.content}
        >
          <View style={journeyStyles.progressCard}>
            <View style={shared.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>INTENT TO RELATIONSHIP</Text>
                <Text style={journeyStyles.progressTitle}>
                  {journey.currentStage?.title ?? "Journey complete"}
                </Text>
              </View>
              <Text style={journeyStyles.progressPercent}>
                {journey.progressPercent}%
              </Text>
            </View>
            <View style={journeyStyles.track}>
              <View
                style={[
                  journeyStyles.fill,
                  { width: `${journey.progressPercent}%` },
                ]}
              />
            </View>
            <Text style={styles.helper}>
              No public compatibility score. Each step opens only through mutual
              actions.
            </Text>
          </View>
          <View style={journeyStyles.stageList}>
            {journey.stages.map((stage, index) => (
              <View
                key={stage.id}
                style={[
                  journeyStyles.stage,
                  stage.status === "current" && journeyStyles.stageCurrent,
                ]}
              >
                <View
                  style={[
                    journeyStyles.stageIcon,
                    stage.status === "complete" && journeyStyles.stageIconDone,
                  ]}
                >
                  <Ionicons
                    name={
                      stage.status === "complete"
                        ? "checkmark"
                        : stage.status === "current"
                          ? "heart"
                          : "lock-closed"
                    }
                    size={15}
                    color={
                      stage.status === "locked" ? colors.muted : colors.ivory
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      journeyStyles.stageTitle,
                      stage.status === "locked" && { color: colors.muted },
                    ]}
                  >
                    {index + 1}. {stage.title}
                  </Text>
                  <Text style={journeyStyles.stageBody}>{stage.body}</Text>
                </View>
                <Text style={journeyStyles.stageStatus}>
                  {stage.status === "complete"
                    ? "DONE"
                    : stage.status === "current"
                      ? "NOW"
                      : "LATER"}
                </Text>
              </View>
            ))}
          </View>
          {dateStatus === "none" && (
            <View style={journeyStyles.actionCard}>
              <PremiumIcon
                name="calendar"
                tone="gold"
                size={46}
                iconSize={21}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  Ready for a thoughtful first date?
                </Text>
                <Text style={styles.helper}>
                  Choose a public place, agree on a time and keep safety
                  check-in on.
                </Text>
              </View>
            </View>
          )}
          {dateStatus === "none" && (
            <Button label="Plan a safe date" icon="calendar" onPress={onDate} />
          )}
          {(dateStatus === "proposed" || dateStatus === "countered") && (
            <View style={journeyStyles.responseCard}>
              <View style={shared.row}>
                <MiniPremiumIcon
                  name="time"
                  tone="gold"
                  size={34}
                  iconSize={16}
                />
                <View style={{ flex: 1 }}>
                  <Text style={journeyStyles.reflectionTitle}>
                    {dateStatus === "countered"
                      ? "A change was suggested"
                      : "Waiting for mutual confirmation"}
                  </Text>
                  <Text style={journeyStyles.reflectionBody}>
                    {dateMessage?.date?.venue} Â· {dateMessage?.date?.time}
                  </Text>
                </View>
              </View>
              <Text style={styles.helper}>
                In production, only the recipient can respond. These controls
                keep the mock journey testable.
              </Text>
              <View style={journeyStyles.responseActions}>
                <Button
                  label="Accept plan"
                  icon="checkmark-circle"
                  onPress={() => onDateStatus("accepted")}
                />
                <Button
                  label="Suggest change"
                  variant="secondary"
                  onPress={() => onDateStatus("countered")}
                />
                <Button
                  label="Decline kindly"
                  variant="ghost"
                  onPress={() => onDateStatus("declined")}
                />
              </View>
            </View>
          )}
          {dateStatus === "accepted" && (
            <View style={journeyStyles.responseCard}>
              <View style={journeyStyles.acceptedRow}>
                <MiniPremiumIcon
                  name="checkmark-circle"
                  tone="gold"
                  size={38}
                  iconSize={18}
                />
                <View style={{ flex: 1 }}>
                  <Text style={journeyStyles.reflectionTitle}>
                    Date plan accepted
                  </Text>
                  <Text style={journeyStyles.reflectionBody}>
                    Reflection stays locked until the date has happened.
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: learning.reminderActive }}
                accessibilityLabel="Private date reminder"
                onPress={() => onReminder(!reminderEnabled)}
                style={journeyStyles.consentRow}
              >
                <MiniPremiumIcon
                  name="notifications-outline"
                  tone={learning.reminderActive ? "gold" : "dark"}
                  size={34}
                  iconSize={16}
                />
                <View style={{ flex: 1 }}>
                  <Text style={journeyStyles.reflectionTitle}>
                    Private date reminder
                  </Text>
                  <Text style={journeyStyles.reflectionBody}>
                    Remind only me before the plan, with no partner name or
                    message preview.
                  </Text>
                </View>
                <View
                  style={[
                    discoveryStyles.switch,
                    learning.reminderActive && discoveryStyles.switchOn,
                  ]}
                >
                  <View
                    style={[
                      discoveryStyles.switchThumb,
                      learning.reminderActive && discoveryStyles.switchThumbOn,
                    ]}
                  />
                </View>
              </Pressable>
              <Button
                label="The date happened"
                icon="heart-circle"
                onPress={() => onDateStatus("completed")}
              />
              <View style={journeyStyles.responseActions}>
                <Button
                  label="Cancel plan"
                  variant="ghost"
                  onPress={() => onDateStatus("cancelled")}
                />
                <Button
                  label="They did not show"
                  variant="ghost"
                  onPress={() => onDateStatus("no_show")}
                />
                <Button
                  label="No response"
                  variant="ghost"
                  onPress={() => onDateStatus("unresponsive")}
                />
              </View>
            </View>
          )}
          {dateStatus === "declined" && (
            <View style={journeyStyles.responseCard}>
              <View style={shared.row}>
                <MiniPremiumIcon
                  name="heart-dislike-outline"
                  tone="rose"
                  size={36}
                  iconSize={17}
                />
                <View style={{ flex: 1 }}>
                  <Text style={journeyStyles.reflectionTitle}>
                    This plan was declined
                  </Text>
                  <Text style={journeyStyles.reflectionBody}>
                    No pressure. Suggest a different plan or review respectful
                    close options.
                  </Text>
                </View>
              </View>
              <Button
                label="Plan something different"
                icon="calendar"
                onPress={onDate}
              />
              <Button
                label="Review close options"
                variant="secondary"
                onPress={onRespectfulClose}
              />
            </View>
          )}
          {(dateStatus === "cancelled" ||
            dateStatus === "no_show" ||
            dateStatus === "unresponsive") && (
            <View style={journeyStyles.responseCard}>
              <View style={shared.row}>
                <MiniPremiumIcon
                  name={
                    dateStatus === "no_show" ? "shield-outline" : "time-outline"
                  }
                  tone={dateStatus === "no_show" ? "ruby" : "rose"}
                  size={36}
                  iconSize={17}
                />
                <View style={{ flex: 1 }}>
                  <Text style={journeyStyles.reflectionTitle}>
                    {dateLifecycleCopy(dateStatus).label}
                  </Text>
                  <Text style={journeyStyles.reflectionBody}>
                    {dateLifecycleCopy(dateStatus).guidance}
                  </Text>
                </View>
              </View>
              <Button
                label="Plan something different"
                icon="calendar"
                onPress={onDate}
              />
              {dateStatus === "no_show" && (
                <Button
                  label="Review safety options"
                  variant="secondary"
                  onPress={onRespectfulClose}
                />
              )}
            </View>
          )}
          {dateStatus === "completed" && !reflection && (
            <View style={journeyStyles.reflectionBlock}>
              <Text style={styles.sectionLabel}>
                PRIVATE POST-DATE REFLECTION
              </Text>
              <Text style={styles.helper}>
                Only you see this answer. It is never sent to {match.name}.
              </Text>
              {reflectionOptions.map((option) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  key={option.value}
                  onPress={() => onReflection(option.value)}
                  style={journeyStyles.reflectionOption}
                >
                  <MiniPremiumIcon
                    name={option.icon}
                    tone={
                      option.value === "continue"
                        ? "gold"
                        : option.value === "pause"
                          ? "rose"
                          : "dark"
                    }
                    size={34}
                    iconSize={16}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={journeyStyles.reflectionTitle}>
                      {option.label}
                    </Text>
                    <Text style={journeyStyles.reflectionBody}>
                      {option.body}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          {!!reflection && (
            <View style={journeyStyles.savedReflection}>
              <MiniPremiumIcon
                name="lock-closed"
                tone="gold"
                size={34}
                iconSize={16}
              />
              <View style={{ flex: 1 }}>
                <Text style={journeyStyles.reflectionTitle}>
                  Reflection saved privately
                </Text>
                <Text style={journeyStyles.reflectionBody}>
                  {reflection === "continue"
                    ? "Trusted Circle is now available when you both feel ready."
                    : reflection === "pause"
                      ? "The connection stays open without adding pressure."
                      : "This preview keeps the answer private; production will offer a respectful close flow."}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change reflection"
                onPress={() => onReflection(null)}
              >
                <Text style={discoveryStyles.manageText}>Change</Text>
              </Pressable>
            </View>
          )}
          {!!reflection && (
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: learning.canUseForMatching }}
              accessibilityLabel="Improve future matches from this reflection"
              onPress={() => onLearningConsent(!useForMatching)}
              style={[
                journeyStyles.consentRow,
                learning.canUseForMatching && journeyStyles.consentRowOn,
              ]}
            >
              <MiniPremiumIcon
                name="options-outline"
                tone={learning.canUseForMatching ? "gold" : "dark"}
                size={36}
                iconSize={17}
              />
              <View style={{ flex: 1 }}>
                <Text style={journeyStyles.reflectionTitle}>
                  Improve my future matches
                </Text>
                <Text style={journeyStyles.reflectionBody}>
                  {learning.canUseForMatching
                    ? "Only this private answer becomes a broad matching signal. You can revoke it anytime."
                    : `Off by default. Your answer stays private and is not used to rank ${match.name} or anyone else.`}
                </Text>
              </View>
              <View
                style={[
                  discoveryStyles.switch,
                  learning.canUseForMatching && discoveryStyles.switchOn,
                ]}
              >
                <View
                  style={[
                    discoveryStyles.switchThumb,
                    learning.canUseForMatching && discoveryStyles.switchThumbOn,
                  ]}
                />
              </View>
            </Pressable>
          )}
          {journey.trustedCircleReady && (
            <Button
              label="Open Trusted Circle"
              icon="people"
              variant="gold"
              onPress={onCircle}
            />
          )}
          {reflection === "close" && (
            <Button
              label="Review respectful close options"
              icon="heart-dislike-outline"
              variant="secondary"
              onPress={onRespectfulClose}
            />
          )}
          <Text style={styles.legal}>
            Relationship Path is guidance, not a guarantee or compatibility
            score. Safety tools remain available at every stage.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function giftStatusLabel(
  status?: NonNullable<ChatMessage["gift"]>["deliveryStatus"],
) {
  const labels: Record<string, string> = {
    requested: "REQUEST CREATED",
    recipient_pending: "WAITING FOR RECIPIENT TO ACCEPT",
    recipient_accepted: "RECIPIENT ACCEPTED PRIVATELY",
    payment_authorized: "PAYMENT AUTHORIZED",
    merchant_preparing: "PARTNER PREPARING",
    courier_assigned: "COURIER ASSIGNED",
    picked_up: "OUT FOR DELIVERY",
    delivered: "DELIVERED",
    cancelled: "CANCELLED",
    failed: "NEEDS SUPPORT",
  };
  return labels[status ?? "recipient_pending"] ?? "GIFT ORDER UPDATED";
}

function MessageReceipt({ status }: { status: ChatMessage["status"] }) {
  const read = status === "read";
  const label =
    status === "sent"
      ? "Sent Â· one tick"
      : status === "delivered"
        ? "Delivered Â· two ticks"
        : "Read Â· blue ticks";
  return (
    <View accessibilityLabel={label} style={chatStyles.receipt}>
      <Ionicons
        name={status === "sent" ? "checkmark" : "checkmark-done"}
        size={14}
        color={read ? "#61A8FF" : "rgba(255,255,255,.78)"}
      />
    </View>
  );
}

function ChatBubble({
  message,
  status,
  accent: _accent,
  reaction,
  starred,
  pinned,
  selected,
  gameReplies = [],
  onReplyJump,
  onGameReply,
  onGiftResponse,
  onPress,
}: {
  message: ChatMessage;
  status: ChatMessage["status"];
  accent?: string;
  reaction?: string;
  starred?: boolean;
  pinned?: boolean;
  selected?: boolean;
  gameReplies?: ChatMessage[];
  onReplyJump?: (messageId: string) => void;
  onGameReply?: (answer: string) => void;
  onGiftResponse?: (input: {
    accept: boolean;
    dropoff?: GiftDeliveryAddress;
  }) => Promise<{ ok: boolean; error?: string }>;
  onPress?: () => void;
}) {
  const mine = message.mine !== false;
  const gamePayload =
    message.type === "text" && message.text?.startsWith("ðŸŽ®GAME|")
      ? message.text.split("|")
      : null;
  const gameTitle = gamePayload?.[1] ?? "";
  const gamePrompt = gamePayload?.slice(2).join("|") ?? "";
  const quotedReply =
    message.type === "text" ? parseQuotedReply(message.text) : null;
  const stickerPayload =
    message.type === "text" ? parseStickerPayload(message.text) : null;
  const catalogGif =
    message.type === "gif" ? parseCatalogGifUri(message.uri) : null;
  const emojiText =
    stickerPayload?.emoji ??
    (message.type === "text" ? (message.text?.trim() ?? "") : "");
  const emojiOnly =
    message.type === "text" &&
    (!!stickerPayload || isAnimatedEmojiText(message.text));
  const textBody = quotedReply?.body ?? message.text;
  const linkPreview =
    message.linkPreview ?? buildPrivacySafeLinkPreview(textBody);
  const incomingSafety = !mine && textBody ? scanMessageSafety(textBody) : null;
  const openDocument = () => {
    if (message.uri) void Linking.openURL(message.uri).catch(() => undefined);
  };
  if (message.deletedForEveryone) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Message: ${messageSummaryForAccessibility(message)}. ${mine ? status : "Received"}.`}
      accessibilityHint={
        message.type === "document"
          ? "Open shared file"
          : gamePayload
            ? "Answer inside this game card"
            : message.type === "gift" && message.gift?.physical
              ? "Use the private gift controls inside this card"
              : "Open message actions"
      }
      onPress={
        message.type === "document"
          ? openDocument
          : gamePayload || (message.type === "gift" && message.gift?.physical)
            ? undefined
            : onPress
      }
      style={[
        mine ? styles.myBubble : styles.theirBubble,
        message.type === "text" &&
          !gamePayload &&
          !emojiOnly &&
          (mine ? chatStyles.textBubbleMine : chatStyles.textBubbleTheirs),
        emojiOnly && chatStyles.emojiOnlyBubble,
        !!gamePayload && chatStyles.gameMessageBubble,
        !!gamePayload && !mine && chatStyles.gameMessageBubbleTheirs,
        (message.type === "image" ||
          message.type === "gif" ||
          message.type === "snap") &&
          chatStyles.mediaBubble,
        (message.type === "image" ||
          message.type === "gif" ||
          message.type === "snap") &&
          !mine &&
          chatStyles.mediaBubbleTheirs,
        message.type === "gift" && chatStyles.giftBubble,
        message.type === "gift" &&
          message.gift?.physical &&
          chatStyles.physicalGiftBubble,
        message.type === "sticker" && chatStyles.stickerBubble,
        message.type === "date" && dateStyles.dateBubble,
        message.type === "voice" && chatStyles.voiceBubble,
        message.type === "voice" && !mine && chatStyles.voiceBubbleTheirs,
        message.type === "location" && chatStyles.locationBubble,
        message.type === "document" && chatStyles.documentBubble,
        message.type === "document" && !mine && chatStyles.documentBubbleTheirs,
      ]}
    >
      {selected && (
        <View pointerEvents="none" style={chatStyles.selectedMessageCheck}>
          <Ionicons name="checkmark" size={13} color="#FFF" />
        </View>
      )}
      {message.forwarded && (
        <View style={chatStyles.forwardedLabel}>
          <Ionicons
            name="arrow-redo-outline"
            size={10}
            color={mine ? "#F8CDD7" : "#8D747C"}
          />
          <Text
            style={[
              chatStyles.forwardedText,
              mine && chatStyles.forwardedTextMine,
            ]}
          >
            Forwarded
          </Text>
        </View>
      )}
      {message.type === "text" && !gamePayload && !emojiOnly && (
        <View
          pointerEvents="none"
          style={[
            chatStyles.messageTail,
            mine ? chatStyles.messageTailMine : chatStyles.messageTailTheirs,
          ]}
        />
      )}
      {quotedReply && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Jump to original message"
          onPress={() => onReplyJump?.(quotedReply.parentId)}
          style={[
            chatStyles.quotedReply,
            mine ? chatStyles.quotedReplyMine : chatStyles.quotedReplyTheirs,
          ]}
        >
          <View style={chatStyles.quotedReplyAccent} />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                chatStyles.quotedReplyLabel,
                mine && chatStyles.quotedReplyLabelMine,
              ]}
            >
              Reply Â· tap to view
            </Text>
            <Text
              numberOfLines={2}
              style={[
                chatStyles.quotedReplyText,
                mine && chatStyles.quotedReplyTextMine,
              ]}
            >
              {quotedReply.quote}
            </Text>
          </View>
          <Ionicons
            name="arrow-up"
            size={13}
            color={mine ? "#F5D77A" : "#8B1732"}
          />
        </Pressable>
      )}
      {message.type === "text" && !gamePayload && !emojiOnly && (
        <Text
          style={[
            styles.bubbleText,
            mine ? { color: colors.textInverse } : { color: colors.text },
          ]}
        >
          {textBody}
        </Text>
      )}
      {linkPreview && <LinkPreviewCard preview={linkPreview} mine={mine} />}
      {!!incomingSafety?.signals.length &&
        incomingSafety.severity !== "calm" && (
          <IncomingMessageSafety scan={incomingSafety} />
        )}
      {emojiOnly && (
        <AnimatedEmojiMessage emoji={emojiText} sticker={stickerPayload} />
      )}
      {!!gamePayload && (
        <GameChatCard
          title={gameTitle}
          prompt={gamePrompt}
          mine={mine}
          replies={gameReplies}
          onReply={onGameReply}
        />
      )}
      {(message.type === "image" ||
        (message.type === "gif" && !catalogGif) ||
        message.type === "snap") &&
        message.uri && (
          <View style={chatStyles.messageMediaFrame}>
            <Image
              accessible
              accessibilityLabel={
                message.type === "gif" ? "Shared GIF" : "Shared photo"
              }
              source={{ uri: message.uri }}
              style={chatStyles.messageMedia}
            />
            <View pointerEvents="none" style={chatStyles.mediaShade} />
          </View>
        )}
      {catalogGif && <CatalogGifMessage gif={catalogGif} />}
      {message.type === "gif" && (
        <View style={chatStyles.gifBadge}>
          <Text style={chatStyles.gifBadgeText}>GIF</Text>
        </View>
      )}
      {message.type === "snap" && message.snap && (
        <>
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor:
                  snapFilters.find((item) => item.name === message.snap?.filter)
                    ?.color ?? "transparent",
              },
            ]}
          />
          {!!message.snap.sticker && (
            <Text style={chatStyles.snapSticker}>{message.snap.sticker}</Text>
          )}
          <View style={chatStyles.snapBadge}>
            <MiniPremiumIcon
              name={message.snap.viewOnce ? "eye-off" : "time"}
              tone="dark"
              size={22}
              iconSize={10}
            />
            <Text style={chatStyles.snapBadgeText}>
              {message.snap.viewOnce ? "VIEW ONCE" : "24H SNAP"} Â·{" "}
              {message.snap.filter}
            </Text>
          </View>
        </>
      )}
      {message.type === "sticker" && message.sticker && (
        <>
          <View style={stickerStyles.faceStickerFrame}>
            <Image
              source={{ uri: message.sticker.faceUri }}
              style={chatStyles.faceStickerImage}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor:
                    snapFilters.find(
                      (item) => item.name === message.sticker?.filter,
                    )?.color ?? "transparent",
                },
              ]}
            />
          </View>
          <Text style={chatStyles.faceStickerEmoji}>
            {message.sticker.emoji}
          </Text>
          <Text style={chatStyles.giftCaption}>
            {message.sticker.filter ?? "Made by me"}
          </Text>
        </>
      )}
      {message.type === "gift" &&
        message.gift &&
        (message.gift.physical ? (
          <PhysicalGiftChatCard
            gift={message.gift}
            messageText={message.text}
            mine={mine}
            onResponse={onGiftResponse}
          />
        ) : (
          <>
            <PremiumIcon name="sparkles" tone="gold" size={62} iconSize={29} />
            <Text style={chatStyles.giftTitle}>{message.gift.name}</Text>
            <Text style={chatStyles.giftCaption}>
              {message.text ?? "A digital gift sent with intention"}
            </Text>
          </>
        ))}
      {message.type === "date" && message.date && (
        <>
          <View style={dateStyles.messageDateHeader}>
            <PremiumIcon name="calendar" tone="gold" size={42} iconSize={19} />
            <View>
              <Text style={dateStyles.messageEyebrow}>
                {message.date.packageTitle ?? "DATE IDEA"}
              </Text>
              <Text style={dateStyles.messageVenue}>{message.date.venue}</Text>
              {message.date.packageTier && (
                <Text style={dateStyles.messagePackageTier}>
                  {message.date.packageTier}
                </Text>
              )}
            </View>
          </View>
          <View style={dateStyles.messageDivider} />
          <View style={dateStyles.messageLine}>
            <MiniPremiumIcon
              name="location-outline"
              tone="rose"
              size={28}
              iconSize={13}
            />
            <Text style={dateStyles.messageLineText}>{message.date.area}</Text>
          </View>
          <View style={dateStyles.messageLine}>
            <MiniPremiumIcon
              name="time-outline"
              tone="rose"
              size={28}
              iconSize={13}
            />
            <Text style={dateStyles.messageLineText}>{message.date.time}</Text>
          </View>
          {message.date.safetyCheckIn && (
            <View style={dateStyles.safePill}>
              <MiniPremiumIcon
                name="shield-checkmark"
                tone="gold"
                size={24}
                iconSize={11}
              />
              <Text style={dateStyles.safePillText}>
                Safety check-in enabled
              </Text>
            </View>
          )}
          <DatePlanStatusMini
            safetyCheckIn={!!message.date.safetyCheckIn}
            status={message.date.planStatus}
          />
          <Text style={dateStyles.waitingText}>
            {datePlanStatusLabel(message.date.planStatus ?? "proposed")}
          </Text>
        </>
      )}
      {message.type === "voice" && message.uri && (
        <VoiceNote
          uri={message.uri}
          durationMs={message.voice?.durationMs ?? 0}
          transcript={message.voice?.transcript}
          transcriptStatus={message.voice?.transcriptStatus}
          mine={mine}
        />
      )}
      {message.type === "location" && message.location && (
        <LiveLocationCard location={message.location} />
      )}
      {message.type === "document" && message.document && (
        <DocumentChatCard document={message.document} mine={mine} />
      )}
      <View style={chatStyles.messageMeta}>
        {message.editedAt && (
          <Text
            style={[chatStyles.editedLabel, mine && chatStyles.editedLabelMine]}
          >
            edited
          </Text>
        )}
        {pinned && <Ionicons name="pin" size={10} color={colors.gold} />}{" "}
        {starred && <Ionicons name="star" size={10} color={colors.gold} />}
        <Text
          style={[
            styles.time,
            { color: mine && !emojiOnly ? "rgba(255,255,255,.78)" : "#806D73" },
          ]}
        >
          {new Date(message.createdAt).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
        {mine && <MessageReceipt status={status} />}
      </View>
      {!!reaction && (
        <View style={chatStyles.reactionPill}>
          <Text style={chatStyles.reactionText}>{reaction}</Text>
        </View>
      )}
    </Pressable>
  );
}

function LinkPreviewCard({
  preview,
  mine,
}: {
  preview: NonNullable<ChatMessage["linkPreview"]>;
  mine: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const risky = preview.safety !== "safe";
  const open = () => {
    if (risky && !confirmOpen) {
      setConfirmOpen(true);
      return;
    }
    void Linking.openURL(preview.url).catch(() => setConfirmOpen(true));
  };
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${preview.title} on ${preview.host}. ${preview.description}`}
      accessibilityHint={
        risky
          ? "Tap once to review the warning and again to open"
          : "Open shared link"
      }
      onPress={open}
      style={[
        chatStyles.linkCard,
        mine ? chatStyles.linkCardMine : chatStyles.linkCardTheirs,
        risky && chatStyles.linkCardRisk,
      ]}
    >
      <View style={[chatStyles.linkIcon, risky && chatStyles.linkIconRisk]}>
        <Ionicons
          name={risky ? "warning-outline" : "link-outline"}
          size={17}
          color={risky ? "#A40B31" : mine ? "#8B1732" : "#FFF"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={[chatStyles.linkHost, mine && chatStyles.linkHostMine]}
        >
          {preview.host}
        </Text>
        <Text
          numberOfLines={2}
          style={[chatStyles.linkTitle, mine && chatStyles.linkTitleMine]}
        >
          {preview.title}
        </Text>
        <Text
          numberOfLines={confirmOpen ? 4 : 2}
          style={[
            chatStyles.linkDescription,
            mine && chatStyles.linkDescriptionMine,
          ]}
        >
          {confirmOpen
            ? "Check the full domain above. Tap again only if you trust the sender."
            : preview.description}
        </Text>
      </View>
      <Ionicons
        name={confirmOpen ? "shield-outline" : "open-outline"}
        size={16}
        color={risky ? "#A40B31" : mine ? "#F6D77B" : "#8B1732"}
      />
    </Pressable>
  );
}

function IncomingMessageSafety({ scan }: { scan: MessageSafetyScan }) {
  return (
    <View accessibilityRole="alert" style={chatStyles.incomingSafety}>
      <Ionicons name="shield-outline" size={15} color="#9A7417" />
      <View style={{ flex: 1 }}>
        <Text style={chatStyles.incomingSafetyTitle}>{scan.nudgeTitle}</Text>
        <Text style={chatStyles.incomingSafetyBody}>
          {scan.recommendedAction}
        </Text>
      </View>
    </View>
  );
}

function messageSummaryForAccessibility(message: ChatMessage) {
  if (message.text?.startsWith("ðŸŽ®GAME|"))
    return `Couple game ${message.text.split("|")[1] ?? ""}`;
  if (message.text?.startsWith("ðŸŽ®REPLY|"))
    return `Game answer ${parseGameReply(message)?.answer ?? ""}`;
  if (message.text?.startsWith("â†©REPLY|"))
    return `Reply ${parseQuotedReply(message.text)?.body ?? ""}`;
  const sticker = parseStickerPayload(message.text);
  if (sticker) return `${sticker.label} sticker ${sticker.emoji}`;
  const catalogGif = parseCatalogGifUri(message.uri);
  if (catalogGif)
    return `${catalogGif.title}, ${catalogGif.style} animated GIF`;
  return (
    message.text?.slice(0, 50) ||
    message.date?.venue ||
    message.gift?.name ||
    message.document?.name ||
    message.type
  );
}

function AnimatedEmojiMessage({
  emoji,
  sticker,
}: {
  emoji: string;
  sticker: CustomChatSticker | null;
}) {
  const emotion: EmojiMotion = sticker?.motion ?? classifyEmojiMotion(emoji);
  const motion = useRef(new Animated.Value(0)).current;
  const particles = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    motion.setValue(0);
    particles.setValue(0);
    const fast = ["laugh", "angry", "party"].includes(emotion);
    const bodyLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: fast ? 210 : emotion === "love" ? 360 : 520,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: fast ? 210 : emotion === "love" ? 360 : 520,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    const particleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(particles, {
          toValue: 1,
          duration: ["laugh", "cry"].includes(emotion) ? 760 : 1050,
          easing: Easing.out(Easing.quad),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(particles, {
          toValue: 0,
          duration: 1,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.delay(120),
      ]),
    );
    bodyLoop.start();
    particleLoop.start();
    return () => {
      bodyLoop.stop();
      particleLoop.stop();
    };
  }, [emotion, motion, particles]);
  const scale = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [
      1,
      emotion === "love"
        ? 1.24
        : emotion === "surprise"
          ? 1.28
          : emotion === "cry"
            ? 0.98
            : 1.1,
    ],
  });
  const translateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [
      0,
      ["laugh", "party", "celebrate"].includes(emotion)
        ? -8
        : emotion === "cry"
          ? 3
          : -3,
    ],
  });
  const translateX = motion.interpolate({
    inputRange: [0, 1],
    outputRange: emotion === "angry" ? [-5, 5] : [0, 0],
  });
  const rotate = motion.interpolate({
    inputRange: [0, 1],
    outputRange:
      emotion === "laugh"
        ? ["-9deg", "9deg"]
        : emotion === "party"
          ? ["-11deg", "11deg"]
          : emotion === "angry"
            ? ["-3deg", "3deg"]
            : emotion === "kiss"
              ? ["-4deg", "5deg"]
              : ["0deg", "0deg"],
  });
  const particleTranslateY = particles.interpolate({
    inputRange: [0, 1],
    outputRange: ["laugh", "cry"].includes(emotion) ? [0, 34] : [14, -38],
  });
  const particleTranslateX = particles.interpolate({
    inputRange: [0, 1],
    outputRange: [0, emotion === "angry" ? 20 : emotion === "party" ? 12 : 5],
  });
  const particleOpacity = particles.interpolate({
    inputRange: [0, 0.12, 0.72, 1],
    outputRange: [0, 1, 0.9, 0],
  });
  const particleScale = particles.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 1.15, 0.82],
  });
  const glyphs: Record<EmojiMotion, [string, string]> = {
    laugh: ["ðŸ’§", "ðŸ’§"],
    cry: ["ðŸ’§", "ðŸ’§"],
    love: ["â™¥", "â™¡"],
    kiss: ["â™¥", "ðŸ’‹"],
    angry: ["ðŸ’¨", "ðŸ’¢"],
    party: ["âœ¦", "â—"],
    surprise: ["!", "âœ¦"],
    sleep: ["Z", "z"],
    celebrate: ["âœ¦", "â˜…"],
    bounce: ["âœ¦", ""],
  };
  const [particleOne, particleTwo] = glyphs[emotion];
  const tone = sticker?.tone ?? "rose";
  const toneStyle = {
    ruby: { backgroundColor: "#FFF0F3", borderColor: "#D998A8" },
    rose: { backgroundColor: "#FFF5F6", borderColor: "#E5BEC8" },
    gold: { backgroundColor: "#FFF8E7", borderColor: "#E2CB8D" },
    plum: { backgroundColor: "#F7F0FF", borderColor: "#CEAFE9" },
    cocoa: { backgroundColor: "#FAF2EA", borderColor: "#D8B99C" },
  }[tone];
  return (
    <View
      accessibilityLabel={`${sticker ? sticker.label : "Animated"} ${emotion} emoji ${emoji}`}
      style={[
        chatStyles.animatedEmojiWrap,
        !!sticker && chatStyles.animatedStickerWrap,
        !!sticker && toneStyle,
      ]}
    >
      {emotion === "love" && (
        <>
          <Animated.View
            style={[
              chatStyles.heartRing,
              { opacity: motion, transform: [{ scale }] },
            ]}
          />
          <Animated.View
            style={[
              chatStyles.heartRing,
              chatStyles.heartRingOuter,
              { opacity: particles, transform: [{ scale: particleScale }] },
            ]}
          />
        </>
      )}
      {emotion === "laugh" && (
        <Animated.Text
          style={[
            chatStyles.laughBurst,
            {
              opacity: particleOpacity,
              transform: [
                { translateY: particleTranslateY },
                { scale: particleScale },
              ],
            },
          ]}
        >
          HA!
        </Animated.Text>
      )}
      {emotion === "cry" && (
        <>
          <Animated.View
            style={[
              chatStyles.tearStream,
              chatStyles.tearStreamLeft,
              {
                opacity: particleOpacity,
                transform: [
                  { translateY: particleTranslateY },
                  { scaleY: particleScale },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              chatStyles.tearStream,
              chatStyles.tearStreamRight,
              {
                opacity: particleOpacity,
                transform: [
                  { translateY: particleTranslateY },
                  { scaleY: particleScale },
                ],
              },
            ]}
          />
        </>
      )}
      {emotion === "kiss" && (
        <Animated.Text
          style={[
            chatStyles.kissBurst,
            {
              opacity: particleOpacity,
              transform: [
                { translateY: particleTranslateY },
                { scale: particleScale },
              ],
            },
          ]}
        >
          ðŸ’‹
        </Animated.Text>
      )}
      <Animated.View
        style={[
          chatStyles.emojiStage,
          {
            transform: [{ translateX }, { translateY }, { scale }, { rotate }],
          },
        ]}
      >
        <Text
          style={[
            chatStyles.animatedEmoji,
            !!sticker && chatStyles.animatedSticker,
          ]}
        >
          {emoji}
        </Text>
      </Animated.View>
      {!!particleOne && (
        <Animated.Text
          style={[
            chatStyles.emotionParticle,
            chatStyles.emotionParticleOne,
            {
              opacity: particleOpacity,
              transform: [
                { translateY: particleTranslateY },
                { translateX: particleTranslateX },
                { scale: particleScale },
              ],
            },
          ]}
        >
          {particleOne}
        </Animated.Text>
      )}
      {!!particleTwo && (
        <Animated.Text
          style={[
            chatStyles.emotionParticle,
            chatStyles.emotionParticleTwo,
            {
              opacity: particleOpacity,
              transform: [
                { translateY: particleTranslateY },
                { translateX: Animated.multiply(particleTranslateX, -1) },
                { scale: particleScale },
              ],
            },
          ]}
        >
          {particleTwo}
        </Animated.Text>
      )}
      {sticker && (
        <View style={chatStyles.stickerCaptionWrap}>
          <Text style={chatStyles.stickerLabel}>{sticker.label}</Text>
          <Text numberOfLines={2} style={chatStyles.stickerCaption}>
            {sticker.caption}
          </Text>
        </View>
      )}
    </View>
  );
}

function CatalogGifMessage({ gif }: { gif: ChatGifCatalogItem }) {
  const sticker: CustomChatSticker = {
    id: gif.id,
    emoji: gif.previewEmoji ?? "âœ¨",
    label: gif.title.toUpperCase(),
    caption: `${gif.style} animated reaction`,
    tone: catalogGifTone(gif),
    motion: classifyEmojiMotion(gif.previewEmoji ?? "âœ¨"),
    tags: gif.searchText,
  };
  return (
    <View
      accessibilityLabel={`${gif.title}, ${gif.style} animated GIF`}
      style={chatStyles.catalogGifMessage}
    >
      <AnimatedEmojiMessage emoji={sticker.emoji} sticker={sticker} />
    </View>
  );
}

function GameChatCard({
  title,
  prompt,
  mine,
  replies,
  onReply,
}: {
  title: string;
  prompt: string;
  mine: boolean;
  replies: ChatMessage[];
  onReply?: (answer: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(replies.length === 0);
  const [answer, setAnswer] = useState("");
  const send = () => {
    const value = answer.trim();
    if (!value || !onReply) return;
    onReply(value);
    setAnswer("");
    setReplyOpen(false);
  };
  return (
    <View
      style={[
        chatStyles.gameMessageCard,
        !mine && chatStyles.gameMessageCardTheirs,
      ]}
    >
      <View style={chatStyles.gameMessageHeader}>
        <View
          style={[
            chatStyles.gameMessageIcon,
            !mine && chatStyles.gameMessageIconTheirs,
          ]}
        >
          <Ionicons
            name="game-controller"
            size={16}
            color={mine ? "#FFF" : "#8B1431"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              chatStyles.gameMessageEyebrow,
              !mine && chatStyles.gameMessageEyebrowTheirs,
            ]}
          >
            COUPLE GAME Â· ROUND READY
          </Text>
          <Text
            numberOfLines={1}
            style={[
              chatStyles.gameMessageTitle,
              !mine && chatStyles.gameMessageTitleTheirs,
            ]}
          >
            {title}
          </Text>
        </View>
      </View>
      <Text
        style={[
          chatStyles.gameMessagePrompt,
          !mine && chatStyles.gameMessagePromptTheirs,
        ]}
      >
        {prompt}
      </Text>
      {replies.map((reply) => {
        const parsed = parseGameReply(reply);
        if (!parsed) return null;
        const replyMine = reply.mine !== false;
        return (
          <View
            key={reply.id}
            style={[
              chatStyles.gameNestedReply,
              replyMine
                ? chatStyles.gameNestedReplyMine
                : chatStyles.gameNestedReplyTheirs,
            ]}
          >
            <View style={chatStyles.gameNestedHeader}>
              <Ionicons
                name={replyMine ? "person" : "heart"}
                size={11}
                color={replyMine ? "#7C1730" : "#9A7417"}
              />
              <Text style={chatStyles.gameNestedName}>
                {replyMine ? "You" : "Your match"} answered
              </Text>
              <Text style={chatStyles.gameNestedTime}>
                {new Date(reply.createdAt).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <Text style={chatStyles.gameNestedAnswer}>{parsed.answer}</Text>
          </View>
        );
      })}
      {replyOpen ? (
        <View
          style={[
            chatStyles.gameReplyComposer,
            !mine && chatStyles.gameReplyComposerTheirs,
          ]}
        >
          <TextInput
            accessibilityLabel={`Answer ${title} round`}
            value={answer}
            onChangeText={setAnswer}
            onSubmitEditing={send}
            returnKeyType="send"
            placeholder="Type your answer inside this roundâ€¦"
            placeholderTextColor={mine ? "rgba(255,255,255,.65)" : "#8F7980"}
            style={[
              chatStyles.gameReplyInput,
              !mine && chatStyles.gameReplyInputTheirs,
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send game answer"
            disabled={!answer.trim()}
            onPress={send}
            style={[
              chatStyles.gameReplySend,
              !answer.trim() && { opacity: 0.4 },
            ]}
          >
            <Ionicons name="send" size={15} color="#FFF" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Answer inside game card"
          onPress={() => setReplyOpen(true)}
          style={[
            chatStyles.gameTurnPill,
            !mine && chatStyles.gameTurnPillTheirs,
          ]}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={12}
            color={mine ? "#F6D77B" : "#8B1431"}
          />
          <Text
            style={[
              chatStyles.gameTurnText,
              !mine && chatStyles.gameTurnTextTheirs,
            ]}
          >
            {replies.length ? "Add another answer" : "Answer inside this card"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function DocumentChatCard({
  document,
  mine,
}: {
  document: NonNullable<ChatMessage["document"]>;
  mine: boolean;
}) {
  const extension =
    document.name.split(".").pop()?.slice(0, 5).toUpperCase() ||
    (document.kind === "video" ? "VIDEO" : "FILE");
  return (
    <View style={chatStyles.documentCardWrap}>
      <View
        style={[
          chatStyles.documentCard,
          mine ? chatStyles.documentCardMine : chatStyles.documentCardTheirs,
        ]}
      >
        <View
          style={[chatStyles.documentIcon, mine && chatStyles.documentIconMine]}
        >
          <Ionicons
            name={document.kind === "video" ? "play" : "document-text"}
            size={22}
            color={mine ? "#FFF" : "#A40B31"}
          />
          <Text
            style={[
              chatStyles.documentExtension,
              mine && chatStyles.documentExtensionMine,
            ]}
          >
            {extension}
          </Text>
        </View>
        <View style={chatStyles.documentCopy}>
          <Text
            numberOfLines={2}
            style={[
              chatStyles.documentName,
              mine && chatStyles.documentNameMine,
            ]}
          >
            {document.name}
          </Text>
          <View style={chatStyles.documentMetaRow}>
            <Text
              style={[
                chatStyles.documentFine,
                mine && chatStyles.documentFineMine,
              ]}
            >
              {formatChatFileSize(document.size)}
            </Text>
            <View
              style={[
                chatStyles.documentMetaDot,
                mine && chatStyles.documentMetaDotMine,
              ]}
            />
            <Text
              numberOfLines={1}
              style={[
                chatStyles.documentFine,
                mine && chatStyles.documentFineMine,
              ]}
            >
              {document.kind === "video" ? "Video" : "Document"}
            </Text>
          </View>
          <View style={chatStyles.secureFileRow}>
            <Ionicons
              name="shield-checkmark"
              size={11}
              color={mine ? "#F6D77B" : "#9C7414"}
            />
            <Text
              style={[
                chatStyles.secureFileText,
                mine && chatStyles.secureFileTextMine,
              ]}
            >
              Shared securely
            </Text>
          </View>
        </View>
        <View
          style={[chatStyles.documentOpen, mine && chatStyles.documentOpenMine]}
        >
          <Ionicons
            name={document.kind === "video" ? "play" : "open-outline"}
            size={17}
            color={mine ? "#FFF" : "#8E1732"}
          />
        </View>
      </View>
    </View>
  );
}

function datePlanStatusLabel(status: DatePlanStatus) {
  return dateLifecycleCopy(status).label;
}

function DatePlanStatusMini({
  safetyCheckIn,
  status = "proposed",
}: {
  safetyCheckIn: boolean;
  status?: DatePlanStatus;
}) {
  const steps = [
    ["sent", "Suggested"],
    ["pending", "Accept"],
    ["reserve", "Reserve"],
    [safetyCheckIn ? "safe" : "meet", safetyCheckIn ? "Check-in" : "Meet"],
  ] as const;
  const completedSteps =
    status === "completed" ? 4 : status === "accepted" ? 2 : 1;
  return (
    <View style={dateStyles.dateFlow}>
      {steps.map((step, index) => (
        <View key={step[0]} style={dateStyles.dateFlowItem}>
          <View
            style={[
              dateStyles.dateFlowDot,
              index < completedSteps && dateStyles.dateFlowDotDone,
            ]}
          />
          <Text
            style={[
              dateStyles.dateFlowText,
              index < completedSteps && dateStyles.dateFlowTextOn,
            ]}
          >
            {step[1]}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PhysicalGiftChatCard({
  gift,
  messageText,
  mine,
  onResponse,
}: {
  gift: NonNullable<ChatMessage["gift"]>;
  messageText?: string;
  mine: boolean;
  onResponse?: (input: {
    accept: boolean;
    dropoff?: GiftDeliveryAddress;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const { formatMoney: formatGiftMoney } = useChatRuntime().gifts;
  const product = physicalGifts.find((item) => item.name === gift.name);
  const orderShort = (gift.orderId ?? "preview")
    .replace("demo-gift-", "")
    .slice(-7)
    .toUpperCase();
  const status = gift.deliveryStatus ?? "recipient_pending";
  const complete = status === "delivered";
  const attention = status === "failed" || status === "cancelled";
  return (
    <View style={giftFlowStyles.orderCard}>
      <LinearGradient
        colors={
          attention
            ? ["#4B151C", "#7D2431"]
            : complete
              ? ["#18392A", "#2B7650"]
              : ["#45000E", "#8E092C", "#C82950"]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={giftFlowStyles.orderHero}
      >
        <View style={giftFlowStyles.orderGlow} />
        {product ? (
          <Image
            accessible
            accessibilityLabel={`${gift.name} gift`}
            source={{ uri: product.photo }}
            style={giftFlowStyles.orderPhoto}
          />
        ) : (
          <View style={giftFlowStyles.orderPhotoFallback}>
            <Ionicons name="gift" size={25} color="#FFF" />
          </View>
        )}
        <View style={giftFlowStyles.orderHeroCopy}>
          <Text style={giftFlowStyles.orderEyebrow}>
            DESTINYONE GIFT Â· #{orderShort}
          </Text>
          <Text style={giftFlowStyles.orderTitle}>{gift.name}</Text>
          <View style={giftFlowStyles.orderHeroMeta}>
            <Ionicons name="shield-checkmark" size={13} color="#F6D77B" />
            <Text style={giftFlowStyles.orderHeroMetaText}>
              Private delivery request
            </Text>
          </View>
        </View>
        <View style={giftFlowStyles.orderSeal}>
          <Ionicons name="heart" size={15} color="#FFF" />
        </View>
      </LinearGradient>
      <View style={giftFlowStyles.orderBody}>
        <View
          style={[
            giftFlowStyles.orderStatusRow,
            complete && giftFlowStyles.orderStatusComplete,
            attention && giftFlowStyles.orderStatusAttention,
          ]}
        >
          <View
            style={[
              giftFlowStyles.orderStatusDot,
              complete && { backgroundColor: "#3C9863" },
              attention && { backgroundColor: "#B62B43" },
            ]}
          />
          <Text numberOfLines={1} style={giftFlowStyles.orderStatusLabel}>
            {giftStatusLabel(status)}
          </Text>
        </View>
        <View style={giftFlowStyles.orderMetrics}>
          <View style={giftFlowStyles.orderMetric}>
            <Ionicons name="time-outline" size={16} color="#980A30" />
            <Text style={giftFlowStyles.orderMetricLabel}>ETA</Text>
            <Text numberOfLines={1} style={giftFlowStyles.orderMetricValue}>
              {gift.etaLabel ?? "Pending"}
            </Text>
          </View>
          <View style={giftFlowStyles.orderMetricDivider} />
          <View style={giftFlowStyles.orderMetric}>
            <Ionicons name="receipt-outline" size={16} color="#980A30" />
            <Text style={giftFlowStyles.orderMetricLabel}>TOTAL</Text>
            <Text style={giftFlowStyles.orderMetricValue}>
              {gift.totalCents ? formatGiftMoney(gift.totalCents) : "Estimate"}
            </Text>
          </View>
          <View style={giftFlowStyles.orderMetricDivider} />
          <View style={giftFlowStyles.orderMetric}>
            <Ionicons name="lock-closed-outline" size={16} color="#980A30" />
            <Text style={giftFlowStyles.orderMetricLabel}>ADDRESS</Text>
            <Text style={giftFlowStyles.orderMetricValue}>Private</Text>
          </View>
        </View>
        <View style={giftFlowStyles.orderNote}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color="#A40B31"
          />
          <View style={{ flex: 1 }}>
            <Text style={giftFlowStyles.orderNoteLabel}>PERSONAL NOTE</Text>
            <Text style={giftFlowStyles.orderNoteText}>
              {messageText ??
                "A thoughtful surprise is waiting for private acceptance."}
            </Text>
          </View>
        </View>
        {!mine && (
          <GiftRecipientDecisionPanelV2 gift={gift} onResponse={onResponse} />
        )}
        {!!gift.steps?.length && <GiftTrackingMini gift={gift} />}
      </View>
    </View>
  );
}

function GiftRecipientDecisionPanelV2({
  gift,
  onResponse,
}: {
  gift: NonNullable<ChatMessage["gift"]>;
  onResponse?: (input: {
    accept: boolean;
    dropoff?: GiftDeliveryAddress;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const {
    searchAddresses: searchGiftDeliveryAddresses,
    validateAddress: validateGiftDeliveryAddress,
  } = useChatRuntime().gifts;
  const [mode, setMode] = useState<"idle" | "address" | "decline">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [address, setAddress] = useState<GiftDeliveryAddress>({
    recipientName: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "US",
    phone: "",
    instructions: "",
  });
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GiftAddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const pending = gift.deliveryStatus === "recipient_pending";
  const knownAddress =
    gift.recipientAddressMode === "sender_supplied_known_address";
  const expiresAt = gift.acceptanceExpiresAt
    ? Date.parse(gift.acceptanceExpiresAt)
    : NaN;
  const expired =
    pending && Number.isFinite(expiresAt) && expiresAt <= Date.now();
  const minutesLeft = Number.isFinite(expiresAt)
    ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 60000))
    : (gift.acceptanceWindowMinutes ?? 30);
  useEffect(() => {
    if (mode !== "address" || knownAddress || query.trim().length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let active = true;
    setSearching(true);
    const timer = setTimeout(
      () =>
        void searchGiftDeliveryAddresses(query, address.country)
          .then((items) => {
            if (active) setSuggestions(items);
          })
          .finally(() => {
            if (active) setSearching(false);
          }),
      280,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mode, knownAddress, query, address.country]);
  const chooseAddress = (item: GiftAddressSuggestion) => {
    setAddress((current) => ({
      ...current,
      line1: item.line1,
      city: item.city,
      region: item.region,
      postalCode: item.postalCode,
      country: item.country,
    }));
    setQuery(item.label);
    setSuggestions([]);
    setError("");
  };
  const respond = async (accept: boolean) => {
    if (!onResponse || submitting) return;
    setError("");
    const dropoff = accept && !knownAddress ? address : undefined;
    if (dropoff) {
      const issue = validateGiftDeliveryAddress(dropoff);
      if (issue) {
        setError(issue);
        return;
      }
    }
    setSubmitting(true);
    const result = await onResponse({ accept, dropoff });
    setSubmitting(false);
    if (!result.ok) {
      setError(
        result.error ?? "Your response could not be saved. Please retry.",
      );
      return;
    }
    setMode("idle");
  };
  if (!pending)
    return (
      <View
        accessible
        accessibilityLiveRegion="polite"
        style={[
          giftFlowStyles.recipientResult,
          gift.deliveryStatus === "recipient_accepted"
            ? giftFlowStyles.recipientAccepted
            : giftFlowStyles.recipientDeclined,
        ]}
      >
        <Ionicons
          name={
            gift.deliveryStatus === "recipient_accepted"
              ? "checkmark-circle"
              : "close-circle"
          }
          size={18}
          color={
            gift.deliveryStatus === "recipient_accepted" ? "#27744A" : "#9D253C"
          }
        />
        <View style={{ flex: 1 }}>
          <Text style={giftFlowStyles.recipientResultTitle}>
            {gift.deliveryStatus === "recipient_accepted"
              ? "Accepted privately"
              : "Gift request closed"}
          </Text>
          <Text style={giftFlowStyles.recipientResultBody}>
            {gift.deliveryStatus === "recipient_accepted"
              ? "Your address is encrypted and hidden from the sender. Payment and delivery updates will appear here."
              : "No delivery will be created and no payment will be captured."}
          </Text>
        </View>
      </View>
    );
  if (expired)
    return (
      <View accessibilityRole="alert" style={giftFlowStyles.recipientExpired}>
        <Ionicons name="time-outline" size={18} color="#8B2638" />
        <Text style={giftFlowStyles.recipientExpiredText}>
          This private acceptance window has expired. No charge was made.
        </Text>
      </View>
    );
  return (
    <Pressable
      onPress={(event) => event.stopPropagation()}
      style={giftFlowStyles.recipientPanel}
    >
      <View style={giftFlowStyles.recipientPanelHead}>
        <View style={giftFlowStyles.recipientLock}>
          <Ionicons name="lock-closed" size={14} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={giftFlowStyles.recipientEyebrow}>
            YOUR PRIVATE DECISION
          </Text>
          <Text style={giftFlowStyles.recipientTitle}>
            Would you like to receive this gift?
          </Text>
          <Text style={giftFlowStyles.recipientFine}>
            {minutesLeft} min left Â· the sender never sees your address
          </Text>
        </View>
      </View>
      {mode === "idle" && (
        <View style={giftFlowStyles.recipientActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Accept gift privately"
            onPress={() => setMode("address")}
            style={giftFlowStyles.recipientAccept}
          >
            <Ionicons name="heart" size={15} color="#FFF" />
            <Text style={giftFlowStyles.recipientAcceptText}>
              Accept privately
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decline gift"
            onPress={() => setMode("decline")}
            style={giftFlowStyles.recipientDecline}
          >
            <Text style={giftFlowStyles.recipientDeclineText}>Decline</Text>
          </Pressable>
        </View>
      )}
      {mode === "decline" && (
        <View style={giftFlowStyles.recipientConfirm}>
          <Text style={giftFlowStyles.recipientConfirmTitle}>
            Decline this gift?
          </Text>
          <Text style={giftFlowStyles.recipientConfirmBody}>
            The sender only sees that the request was declined. No address is
            shared and no payment is captured.
          </Text>
          <View style={giftFlowStyles.recipientActions}>
            <Pressable
              onPress={() => setMode("idle")}
              style={giftFlowStyles.recipientDecline}
            >
              <Text style={giftFlowStyles.recipientDeclineText}>
                Keep request
              </Text>
            </Pressable>
            <Pressable
              disabled={submitting}
              onPress={() => void respond(false)}
              style={[
                giftFlowStyles.recipientAccept,
                submitting && { opacity: 0.55 },
              ]}
            >
              <Text style={giftFlowStyles.recipientAcceptText}>
                {submitting ? "Savingâ€¦" : "Yes, decline"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      {mode === "address" && (
        <View style={giftFlowStyles.addressPanel}>
          {knownAddress ? (
            <View style={giftFlowStyles.knownAddress}>
              <Ionicons name="shield-checkmark" size={18} color="#8D6812" />
              <View style={{ flex: 1 }}>
                <Text style={giftFlowStyles.recipientConfirmTitle}>
                  Confirm your saved delivery address
                </Text>
                <Text style={giftFlowStyles.recipientConfirmBody}>
                  The address is not displayed in chat and is never returned to
                  the sender.
                </Text>
              </View>
            </View>
          ) : (
            <>
              <Text style={giftFlowStyles.recipientConfirmTitle}>
                Where should it arrive?
              </Text>
              <Text style={giftFlowStyles.recipientConfirmBody}>
                Search and select your address. Then add apartment and drop-off
                details if needed.
              </Text>
              <View style={giftFlowStyles.addressSearch}>
                <View style={giftFlowStyles.addressSearchInput}>
                  <Ionicons name="search" size={15} color="#8F1731" />
                  <TextInput
                    accessibilityLabel="Search delivery address"
                    value={query}
                    onChangeText={setQuery}
                    placeholder={
                      address.country === "IN"
                        ? "Search house, street or landmark"
                        : "Search street address"
                    }
                    placeholderTextColor="#9A858B"
                    autoCapitalize="words"
                    style={giftFlowStyles.addressSearchText}
                  />
                  {searching && (
                    <Text style={giftFlowStyles.addressSearching}>
                      Searchingâ€¦
                    </Text>
                  )}
                </View>
                {suggestions.length > 0 && (
                  <View style={giftFlowStyles.addressSuggestions}>
                    {suggestions.map((item) => (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Use address ${item.label}`}
                        key={item.id}
                        onPress={() => chooseAddress(item)}
                        style={giftFlowStyles.addressSuggestion}
                      >
                        <Ionicons name="location" size={14} color="#991033" />
                        <Text style={giftFlowStyles.addressSuggestionText}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
              <View style={giftFlowStyles.countryChoiceWide}>
                {(["US", "CA", "IN"] as const).map((country) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: address.country === country,
                    }}
                    key={country}
                    onPress={() => {
                      setAddress((current) => ({
                        ...current,
                        country,
                        postalCode: "",
                      }));
                      setQuery("");
                      setSuggestions([]);
                    }}
                    style={[
                      giftFlowStyles.countryButton,
                      address.country === country &&
                        giftFlowStyles.countryButtonOn,
                    ]}
                  >
                    <Text
                      style={[
                        giftFlowStyles.countryText,
                        address.country === country &&
                          giftFlowStyles.countryTextOn,
                      ]}
                    >
                      {country === "IN" ? "India" : country}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <GiftAddressField
                label="Full name *"
                value={address.recipientName}
                onChange={(recipientName) =>
                  setAddress((current) => ({ ...current, recipientName }))
                }
              />
              <GiftAddressField
                label="Street address *"
                value={address.line1}
                onChange={(line1) =>
                  setAddress((current) => ({ ...current, line1 }))
                }
              />
              <GiftAddressField
                label="Apt / unit (optional)"
                value={address.line2 ?? ""}
                onChange={(line2) =>
                  setAddress((current) => ({ ...current, line2 }))
                }
              />
              <View style={giftFlowStyles.addressRow}>
                <View style={{ flex: 1 }}>
                  <GiftAddressField
                    label="City *"
                    value={address.city}
                    onChange={(city) =>
                      setAddress((current) => ({ ...current, city }))
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <GiftAddressField
                    label="State / province *"
                    value={address.region}
                    onChange={(region) =>
                      setAddress((current) => ({ ...current, region }))
                    }
                  />
                </View>
              </View>
              <GiftAddressField
                label={
                  address.country === "IN" ? "PIN code *" : "ZIP / postal *"
                }
                value={address.postalCode}
                onChange={(postalCode) =>
                  setAddress((current) => ({ ...current, postalCode }))
                }
              />
              <GiftAddressField
                label="Phone (optional)"
                value={address.phone ?? ""}
                onChange={(phone) =>
                  setAddress((current) => ({ ...current, phone }))
                }
                keyboardType="phone-pad"
              />
              <GiftAddressField
                label="Drop-off note (optional)"
                value={address.instructions ?? ""}
                onChange={(instructions) =>
                  setAddress((current) => ({ ...current, instructions }))
                }
              />
            </>
          )}
          {!!error && (
            <Text
              accessibilityRole="alert"
              style={giftFlowStyles.recipientError}
            >
              {error}
            </Text>
          )}
          <View style={giftFlowStyles.recipientActions}>
            <Pressable
              disabled={submitting}
              onPress={() => {
                setError("");
                setMode("idle");
              }}
              style={giftFlowStyles.recipientDecline}
            >
              <Text style={giftFlowStyles.recipientDeclineText}>Back</Text>
            </Pressable>
            <Pressable
              disabled={submitting}
              onPress={() => void respond(true)}
              style={[
                giftFlowStyles.recipientAccept,
                submitting && { opacity: 0.55 },
              ]}
            >
              <Ionicons name="lock-closed" size={13} color="#FFF" />
              <Text style={giftFlowStyles.recipientAcceptText}>
                {submitting
                  ? "Securingâ€¦"
                  : knownAddress
                    ? "Confirm & accept"
                    : "Save & accept"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function GiftAddressField({
  label,
  value,
  onChange,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={giftFlowStyles.addressField}>
      <Text style={giftFlowStyles.addressLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize="words"
        placeholderTextColor="#9A858B"
        style={giftFlowStyles.addressInput}
      />
    </View>
  );
}

function GiftTrackingMini({
  gift,
}: {
  gift: NonNullable<ChatMessage["gift"]>;
}) {
  const [trackingNotice, setTrackingNotice] = useState("");
  const steps = gift.steps ?? [];
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.status === "active"),
  );
  const currentStep = steps[activeIndex] ?? steps[0];
  const shortLabels: Record<string, string> = {
    request: "Sent",
    recipient: "Accept",
    payment: "Pay",
    partner: "Prepare",
    delivery: "Deliver",
  };
  const openTracking = () =>
    setTrackingNotice((current) =>
      current
        ? ""
        : `Order ${gift.orderId ?? "preview"} stays inside DestinyOne. Live merchant and courier webhooks update this timeline after private acceptance.`,
    );
  return (
    <View style={giftFlowStyles.chatTrack}>
      <View style={giftFlowStyles.chatTrackHeader}>
        <View style={{ flex: 1 }}>
          <Text style={giftFlowStyles.chatTrackTitle}>Order progress</Text>
          <Text style={giftFlowStyles.chatTrackFine}>
            {gift.provider ?? "DestinyOne delivery"} Â·{" "}
            {gift.acceptanceWindowMinutes ?? 30} min acceptance window
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Track gift order"
          accessibilityState={{ expanded: !!trackingNotice }}
          onPress={openTracking}
          style={giftFlowStyles.trackButton}
        >
          <Text style={giftFlowStyles.trackLink}>
            {trackingNotice ? "Hide" : "Track"}
          </Text>
          <Ionicons
            name={trackingNotice ? "chevron-up" : "arrow-forward"}
            size={13}
            color="#FFF"
          />
        </Pressable>
      </View>
      <View style={giftFlowStyles.chatTimeline}>
        {steps.map((step, index) => (
          <View
            key={`${step.key}-${index}`}
            style={giftFlowStyles.chatTimelineStep}
          >
            {index < steps.length - 1 && (
              <View
                style={[
                  giftFlowStyles.chatTimelineLine,
                  (step.status === "done" || index < activeIndex) &&
                    giftFlowStyles.chatTimelineLineOn,
                ]}
              />
            )}
            <View
              style={[
                giftFlowStyles.chatTimelineDot,
                step.status === "done" && giftFlowStyles.chatStepDone,
                step.status === "active" && giftFlowStyles.chatStepActive,
              ]}
            >
              {step.status === "done" ? (
                <Ionicons name="checkmark" size={9} color="#FFF" />
              ) : step.status === "active" ? (
                <View style={giftFlowStyles.chatTimelineDotInner} />
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={[
                giftFlowStyles.chatTimelineLabel,
                step.status === "active" && giftFlowStyles.chatTimelineLabelOn,
              ]}
            >
              {shortLabels[step.key] ?? step.label}
            </Text>
          </View>
        ))}
      </View>
      {currentStep && (
        <View style={giftFlowStyles.chatCurrent}>
          <Ionicons name="sparkles" size={15} color="#997013" />
          <View style={{ flex: 1 }}>
            <Text style={giftFlowStyles.chatCurrentTitle}>
              {currentStep.label}
            </Text>
            <Text style={giftFlowStyles.chatCurrentBody}>
              {currentStep.body.replace(
                gift.provider ?? "",
                "A trusted local partner",
              )}
            </Text>
          </View>
        </View>
      )}
      {!!trackingNotice && (
        <View style={giftFlowStyles.chatTrackNotice}>
          <MiniPremiumIcon
            name="navigate-outline"
            tone="gold"
            size={28}
            iconSize={13}
          />
          <View style={{ flex: 1 }}>
            <Text style={giftFlowStyles.chatTrackNoticeText}>
              {trackingNotice}
            </Text>
            {gift.paymentPolicy && (
              <Text style={giftFlowStyles.chatTrackPolicy}>
                {gift.paymentPolicy}
              </Text>
            )}
            {gift.cancellationPolicy && (
              <Text style={giftFlowStyles.chatTrackPolicy}>
                {gift.cancellationPolicy}
              </Text>
            )}
          </View>
        </View>
      )}
      <View style={giftFlowStyles.chatPrivacy}>
        <Ionicons name="lock-closed" size={12} color="#8A6817" />
        <Text style={giftFlowStyles.chatPrivacyText}>
          No charge before acceptance Â· recipient address stays private
        </Text>
      </View>
    </View>
  );
}

const voiceWaveHeights = [
  9, 17, 12, 25, 15, 22, 10, 19, 14, 27, 12, 21, 16, 24, 11, 18, 13, 23,
];
const formatVoiceDuration = (durationMs: number) => {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

function VoiceNote({
  uri,
  durationMs,
  transcript,
  transcriptStatus,
  mine,
}: {
  uri: string;
  durationMs: number;
  transcript?: string;
  transcriptStatus?: "available" | "processing" | "unavailable";
  mine: boolean;
}) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const [rate, setRate] = useState(1);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const waveWidth = useRef(1);
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  const playedSeconds = Math.max(0, Math.floor(status.currentTime ?? 0));
  const progress = Math.min(1, playedSeconds / totalSeconds);
  const changeRate = () => {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    player.setPlaybackRate(next);
  };
  const seek = (x: number) =>
    void player.seekTo(
      Math.max(
        0,
        Math.min(totalSeconds, (x / waveWidth.current) * totalSeconds),
      ),
    );
  return (
    <View style={{ gap: 6 }}>
      <View style={[chatStyles.voiceNote, !mine && chatStyles.voiceNoteTheirs]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${status.playing ? "Pause" : "Play"} voice message, ${formatVoiceDuration(durationMs)}`}
          onPress={() => (status.playing ? player.pause() : player.play())}
          style={[chatStyles.voicePlay, !mine && chatStyles.voicePlayTheirs]}
        >
          <Ionicons
            name={status.playing ? "pause" : "play"}
            size={17}
            color={mine ? "#8F0B2C" : "#FFF"}
          />
        </Pressable>
        <View style={chatStyles.voiceTrack}>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel={`Voice message position ${Math.round(progress * 100)} percent`}
            accessibilityHint="Tap the waveform to seek"
            onLayout={(event) => {
              waveWidth.current = Math.max(1, event.nativeEvent.layout.width);
            }}
            onPress={(event) => seek(event.nativeEvent.locationX)}
            style={chatStyles.voiceWave}
          >
            {voiceWaveHeights.map((height, index) => {
              const reached = index / voiceWaveHeights.length <= progress;
              return (
                <View
                  key={index}
                  style={[
                    chatStyles.voiceBar,
                    !mine && chatStyles.voiceBarTheirs,
                    reached && chatStyles.voiceBarPlayed,
                    { height },
                  ]}
                />
              );
            })}
          </Pressable>
          <View style={chatStyles.voiceDurationRow}>
            <Text
              style={[
                chatStyles.voiceDuration,
                !mine && chatStyles.voiceDurationTheirs,
              ]}
            >
              {status.playing
                ? formatVoiceDuration(playedSeconds * 1000)
                : formatVoiceDuration(durationMs)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Playback speed ${rate} times`}
              onPress={changeRate}
              style={[
                chatStyles.voiceSpeed,
                !mine && chatStyles.voiceSpeedTheirs,
              ]}
            >
              <Text
                style={[
                  chatStyles.voiceSpeedText,
                  !mine && chatStyles.voiceSpeedTextTheirs,
                ]}
              >
                {rate}Ã—
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle voice transcript"
              onPress={() => setTranscriptOpen((value) => !value)}
              style={[
                chatStyles.voiceTranscriptButton,
                !mine && chatStyles.voiceTranscriptButtonTheirs,
              ]}
            >
              <Ionicons
                name="text-outline"
                size={11}
                color={mine ? "#F6D77B" : "#A40B31"}
              />
            </Pressable>
          </View>
        </View>
      </View>
      {transcriptOpen && (
        <View
          style={[
            chatStyles.voiceTranscript,
            mine && chatStyles.voiceTranscriptMine,
          ]}
        >
          <Text
            style={[
              chatStyles.voiceTranscriptLabel,
              mine && chatStyles.voiceTranscriptLabelMine,
            ]}
          >
            TRANSCRIPT
          </Text>
          <Text
            style={[
              chatStyles.voiceTranscriptText,
              mine && chatStyles.voiceTranscriptTextMine,
            ]}
          >
            {transcript ||
              (transcriptStatus === "processing"
                ? "Transcription is processing securelyâ€¦"
                : "A transcript was not captured for this message.")}
          </Text>
        </View>
      )}
    </View>
  );
}

function VoiceRecordingComposer({
  durationMs,
  onCancel,
  onSend,
}: {
  durationMs: number;
  onCancel: () => void;
  onSend: () => void;
}) {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const elapsed = Math.min(120000, Math.max(0, durationMs));
  const activeBars = Math.max(
    1,
    Math.round((elapsed / 1000) % voiceWaveHeights.length),
  );
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Recording voice message, ${formatVoiceDuration(elapsed)} elapsed`}
      style={chatStyles.recordingComposer}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel voice recording"
        hitSlop={accessibilityHitSlop}
        onPress={onCancel}
        style={chatStyles.recordingCancel}
      >
        <Ionicons name="trash-outline" size={18} color="#8A1730" />
      </Pressable>
      <View style={chatStyles.recordingMain}>
        <View style={chatStyles.recordingTop}>
          <Animated.View
            style={[
              chatStyles.recordingDot,
              { opacity: pulse, transform: [{ scale: pulse }] },
            ]}
          />
          <Text style={chatStyles.recordingLabel}>Recording</Text>
          <Text style={chatStyles.recordingTimer}>
            {formatVoiceDuration(elapsed)}
          </Text>
          <Text style={chatStyles.recordingLimit}>/ 2:00</Text>
        </View>
        <View style={chatStyles.recordingWave}>
          {voiceWaveHeights.map((height, index) => (
            <View
              key={index}
              style={[
                chatStyles.recordingBar,
                index < activeBars && chatStyles.recordingBarOn,
                { height: Math.max(5, Math.round(height * 0.62)) },
              ]}
            />
          ))}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send voice message"
        hitSlop={accessibilityHitSlop}
        onPress={onSend}
        style={chatStyles.recordingSend}
      >
        <Ionicons name="send" size={18} color="#FFF" />
      </Pressable>
    </View>
  );
}

function LiveLocationCard({
  location,
}: {
  location: NonNullable<ChatMessage["location"]>;
}) {
  const [mapFallback, setMapFallback] = useState("");
  const expiresIn = location.expiresAt
    ? Math.max(0, Math.ceil((location.expiresAt - Date.now()) / 60000))
    : 30;
  const coordinates = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  const openMap = () => {
    setMapFallback("");
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
    ).catch(() =>
      setMapFallback(
        `Map could not open in this preview. Approx location: ${coordinates}`,
      ),
    );
  };
  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={openMap} style={chatStyles.locationCard}>
        <LinearGradient
          colors={["rgba(212,175,55,.24)", "rgba(145,12,35,.52)"]}
          style={chatStyles.locationMap}
        >
          <View style={chatStyles.locationGrid} />
          <PremiumIcon name="navigate" tone="gold" size={46} iconSize={21} />
        </LinearGradient>
        <View style={chatStyles.locationInfo}>
          <Text style={chatStyles.locationTitle}>Live location</Text>
          <Text style={chatStyles.locationSubtitle}>{location.label}</Text>
          <Text style={chatStyles.locationFine}>
            {expiresIn > 0 ? `${expiresIn} min left Â· ` : "Expired Â· "}
            approximate area shared
          </Text>
        </View>
      </Pressable>
      {!!mapFallback && (
        <View style={chatStyles.locationFallback}>
          <MiniPremiumIcon
            name="map-outline"
            tone="gold"
            size={26}
            iconSize={12}
          />
          <Text style={chatStyles.locationFallbackText}>{mapFallback}</Text>
        </View>
      )}
    </View>
  );
}

function SafetyNudge({
  scan,
  onOpenSafety,
}: {
  scan: MessageSafetyScan;
  onOpenSafety: () => void;
}) {
  const tone =
    scan.severity === "urgent" || scan.severity === "high"
      ? "ruby"
      : scan.severity === "caution"
        ? "gold"
        : "rose";
  return (
    <View style={chatStyles.safetyNudge}>
      <MiniPremiumIcon
        name={
          scan.severity === "urgent" || scan.severity === "high"
            ? "warning-outline"
            : "shield-checkmark-outline"
        }
        tone={tone}
        size={32}
        iconSize={15}
      />
      <View style={{ flex: 1 }}>
        <Text style={chatStyles.safetyNudgeTitle}>{scan.nudgeTitle}</Text>
        <Text style={chatStyles.safetyNudgeBody}>{scan.recommendedAction}</Text>
        <View style={chatStyles.safetySignalRow}>
          {scan.signals.slice(0, 3).map((signal) => (
            <View
              key={`${signal.type}-${signal.label}`}
              style={chatStyles.safetySignalPill}
            >
              <Text style={chatStyles.safetySignalText}>{signal.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <Pressable onPress={onOpenSafety} style={chatStyles.safetyNudgeButton}>
        <Text style={chatStyles.safetyNudgeButtonText}>Safety</Text>
      </Pressable>
    </View>
  );
}

function Attachment({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const tone: PremiumIconTone =
    color === "#D4AF37" ||
    ["Gift", "Spark", "Location", "Date Market", "Poll"].includes(label)
      ? "gold"
      : ["Games", "More", "Back", "Document"].includes(label)
        ? "plum"
        : label === "GIF"
          ? "rose"
          : "ruby";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={accessibilityHitSlop}
      onPress={onPress}
      style={chatStyles.attachment}
    >
      <PremiumIcon name={icon} tone={tone} size={44} iconSize={19} />
      <Text style={chatStyles.attachmentLabel}>{label}</Text>
    </Pressable>
  );
}

function ChatOptionsSheet({
  visible,
  retentionLabel,
  screenshotAlerts,
  onClose,
  onInbox,
  onSearch,
  onDate,
  onSettings,
  onSafety,
}: {
  visible: boolean;
  retentionLabel: string;
  screenshotAlerts: boolean;
  onClose: () => void;
  onInbox: () => void;
  onSearch: () => void;
  onDate: () => void;
  onSettings: () => void;
  onSafety: () => void;
}) {
  const options = [
    {
      label: "Conversation inbox",
      body: "Open active, pinned and archived conversations.",
      icon: "file-tray-full-outline" as const,
      onPress: onInbox,
    },
    {
      label: "Search conversation",
      body: "Find messages, dates and shared items.",
      icon: "search-outline" as const,
      onPress: onSearch,
    },
    {
      label: "Date Marketplace",
      body: "Browse nearby places, packages and events.",
      icon: "calendar-outline" as const,
      onPress: onDate,
    },
    {
      label: "Chat appearance",
      body: "Nickname and private DestinyOne couple theme.",
      icon: "color-palette-outline" as const,
      onPress: onSettings,
    },
    {
      label: `Disappearing messages Â· ${retentionLabel}`,
      body: "Choose after seen, 24 hours, 7 days, or keep messages.",
      icon: "timer-outline" as const,
      onPress: onSettings,
    },
    {
      label: `Screenshot alerts Â· ${screenshotAlerts ? "On" : "Off"}`,
      body: "Supported native captures notify both people; web capture can be undetectable.",
      icon: "scan-outline" as const,
      onPress: onSettings,
    },
    {
      label: "Safety and privacy",
      body: "Report, block, unmatch or open the Safety Center.",
      icon: "shield-checkmark-outline" as const,
      onPress: onSafety,
    },
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={chatStyles.sheet}>
        <SheetHeader
          title="Chat options"
          subtitle="Conversation tools and privacy"
          onClose={onClose}
        />
        <View style={chatStyles.optionList}>
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={option.label}
              key={option.label}
              onPress={option.onPress}
              style={chatStyles.optionRow}
            >
              <MiniPremiumIcon
                name={option.icon}
                tone={
                  option.label.includes("Date") || option.label.includes("24h")
                    ? "gold"
                    : "rose"
                }
                size={36}
                iconSize={16}
              />
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.optionTitle}>{option.label}</Text>
                <Text style={chatStyles.optionBody}>{option.body}</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export function RoseComposer({
  visible,
  recipientName,
  availability,
  onClose,
  onSend,
}: {
  visible: boolean;
  recipientName: string;
  availability: RoseAvailability;
  onClose: () => void;
  onSend: (note: string) => void;
}) {
  const [note, setNote] = useState("A Golden Spark for something real âœ¨");
  useEffect(() => {
    if (visible) setNote("A Golden Spark for something real âœ¨");
  }, [visible]);
  const canSend = availability.freeAvailable || availability.paidCredits > 0;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={chatStyles.sheet}>
        <SheetHeader
          title="Send a Golden Spark"
          subtitle={
            recipientName
              ? `A warmer hello for ${recipientName}`
              : "A warmer hello"
          }
          onClose={onClose}
        />
        <LinearGradient
          colors={["#3B2208", "#140004"]}
          style={aiStyles.roseComposerHero}
        >
          <PremiumIcon name="sparkles" tone="gold" size={76} iconSize={35} />
          <Text style={aiStyles.roseComposerTitle}>
            {availability.freeAvailable
              ? "Free Spark available today"
              : "Free Spark used today"}
          </Text>
          <Text style={aiStyles.roseComposerBody}>
            {availability.paidCredits} paid Sparks available. Base plan gets 1
            free Golden Spark every day.
          </Text>
        </LinearGradient>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={120}
          placeholder="Write a short noteâ€¦"
          placeholderTextColor="#8C7888"
          style={aiStyles.roseNote}
        />
        <Button
          label={canSend ? "Send Spark" : "Buy Spark pack"}
          icon="sparkles"
          variant={canSend ? "primary" : "gold"}
          onPress={() =>
            canSend
              ? onSend(note.trim() || "A Golden Spark for something real âœ¨")
              : onSend(note.trim())
          }
        />
        <Text style={styles.legal}>
          Extra Sparks will use Google Play / App Store billing in production.
        </Text>
      </SafeAreaView>
    </Modal>
  );
}

export function RoseReceivedPopup({
  data,
  onClose,
  onOpenChat,
}: {
  data: RosePopupPayload | null;
  onClose: () => void;
  onOpenChat: (match: Match) => void;
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!data) return;
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [data, pulse]);
  if (!data) return null;
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.05],
  });
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={rosePopupStyles.backdrop}>
        <LinearGradient
          colors={["#4A0010", "#F8EFE8"]}
          style={rosePopupStyles.card}
        >
          <Pressable onPress={onClose} style={rosePopupStyles.close}>
            <PremiumIcon name="close" tone="dark" size={36} iconSize={17} />
          </Pressable>
          <Text style={rosePopupStyles.petal}>âœ¦</Text>
          <Text style={[rosePopupStyles.petal, rosePopupStyles.petalRight]}>
            âœ§
          </Text>
          <Animated.View
            style={[rosePopupStyles.bloom, { transform: [{ scale }] }]}
          >
            <PremiumIcon name="sparkles" tone="gold" size={92} iconSize={42} />
          </Animated.View>
          <Text style={launchStyles.scriptHero}>A Golden Spark arrived</Text>
          <Text style={rosePopupStyles.title}>
            {data.match.name} gets this moment
          </Text>
          <Text style={rosePopupStyles.note}>â€œ{data.note}â€</Text>
          <View style={rosePopupStyles.pushPreview}>
            <PremiumIcon
              name="notifications"
              tone="gold"
              size={38}
              iconSize={17}
            />
            <Text style={rosePopupStyles.pushPreviewText}>
              Push notification queued Â· opens to this romantic animation
            </Text>
          </View>
          <View style={{ width: "100%", gap: 10 }}>
            <Button
              label={`Open chat with ${data.match.name}`}
              icon="chatbubble"
              onPress={() => onOpenChat(data.match)}
            />
            <Button label="Keep browsing" variant="ghost" onPress={onClose} />
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function useGifProviderSearch(query: string, active: boolean) {
  const { gifSearch } = useChatRuntime();
  const [items, setItems] = useState<ChatGifCatalogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  useEffect(() => {
    if (!active || !gifSearch.configured) {
      setItems([]);
      setTotalCount(0);
      setNextOffset(null);
      setLoading(false);
      setError("");
      return;
    }
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    setItems([]);
    setTotalCount(0);
    setNextOffset(null);
    const timer = setTimeout(
      () => {
        void gifSearch
          .search({ query, limit: 36 })
          .then((page) => {
            if (currentRequest !== requestId.current) return;
            setItems(page.items);
            setTotalCount(page.totalCount);
            setNextOffset(page.nextOffset);
          })
          .catch((reason) => {
            if (currentRequest !== requestId.current) return;
            setError(
              reason instanceof Error
                ? reason.message
                : "GIF search is temporarily unavailable.",
            );
          })
          .finally(() => {
            if (currentRequest === requestId.current) setLoading(false);
          });
      },
      query.trim() ? 320 : 60,
    );
    return () => clearTimeout(timer);
  }, [active, gifSearch, query]);
  const loadMore = async () => {
    if (!active || !gifSearch.configured || nextOffset === null || loadingMore)
      return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await gifSearch.search({
        query,
        offset: nextOffset,
        limit: 36,
      });
      setItems((current) => [
        ...current,
        ...page.items.filter(
          (next) => !current.some((item) => item.id === next.id),
        ),
      ]);
      setTotalCount(page.totalCount);
      setNextOffset(page.nextOffset);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "More GIFs could not load. Please retry.",
      );
    } finally {
      setLoadingMore(false);
    }
  };
  return {
    items,
    totalCount,
    nextOffset,
    loading,
    loadingMore,
    error,
    loadMore,
  };
}

function GifResultTile({
  gif,
  compact,
  favourite,
  onSelect,
  onToggleFavourite,
}: {
  gif: ChatGifCatalogItem;
  compact?: boolean;
  favourite?: boolean;
  onSelect: (uri: string) => void;
  onToggleFavourite?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [gif.uri]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Send ${gif.title} GIF`}
      disabled={failed || !gif.uri}
      onPress={() => onSelect(gif.uri)}
      style={compact ? chatStyles.inlineGifCard : chatStyles.gifCard}
    >
      {!failed && !!gif.uri ? (
        <Image
          accessible
          accessibilityLabel={`${gif.title} animated GIF`}
          source={{ uri: gif.uri }}
          onError={() => setFailed(true)}
          style={styles.fill}
        />
      ) : (
        <View style={chatStyles.gifUnavailable}>
          <Text style={chatStyles.gifUnavailableEmoji}>âœ¨</Text>
          <Text style={chatStyles.gifUnavailableText}>Preview unavailable</Text>
        </View>
      )}
      {!failed && (
        <LinearGradient
          colors={["transparent", "rgba(19,3,8,.88)"]}
          style={StyleSheet.absoluteFill}
        />
      )}{" "}
      {!!onToggleFavourite && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            favourite ? "Remove GIF from favourites" : "Add GIF to favourites"
          }
          onPress={(event) => {
            event.stopPropagation();
            onToggleFavourite();
          }}
          style={chatStyles.gifFavourite}
        >
          <Ionicons
            name={favourite ? "star" : "star-outline"}
            size={14}
            color={favourite ? "#F6D77B" : "#FFF"}
          />
        </Pressable>
      )}
      <View style={compact ? chatStyles.inlineGifCopy : chatStyles.gifCardCopy}>
        <Text
          numberOfLines={1}
          style={compact ? chatStyles.inlineGifTitle : chatStyles.gifTitle}
        >
          {gif.title}
        </Text>
        <Text style={compact ? chatStyles.inlineGifStyle : chatStyles.gifStyle}>
          {gif.style}
        </Text>
      </View>
    </Pressable>
  );
}

function catalogGifTone(gif: ChatGifCatalogItem): CustomChatSticker["tone"] {
  const tones: CustomChatSticker["tone"][] = [
    "ruby",
    "rose",
    "gold",
    "plum",
    "cocoa",
  ];
  const styleNumber = Number(gif.id.split("-").at(-1) ?? 0);
  return tones[Math.abs(styleNumber) % tones.length] ?? "rose";
}

function CatalogGifArtwork({
  gif,
  compact,
}: {
  gif: ChatGifCatalogItem;
  compact?: boolean;
}) {
  const motion = useRef(new Animated.Value(0)).current;
  const emotion = classifyEmojiMotion(gif.previewEmoji ?? "âœ¨");
  useEffect(() => {
    motion.setValue(0);
    const fast = ["laugh", "angry", "party"].includes(emotion);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: fast ? 260 : emotion === "love" ? 420 : 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: fast ? 260 : emotion === "love" ? 420 : 620,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [emotion, motion]);
  const tone = catalogGifTone(gif);
  const palette: Record<CustomChatSticker["tone"], readonly [string, string]> =
    {
      ruby: ["#7A0923", "#D94362"],
      rose: ["#F7C5D0", "#FFF4F5"],
      gold: ["#A87A13", "#F3D67D"],
      plum: ["#44204F", "#A26CB2"],
      cocoa: ["#6D3E28", "#C58F69"],
    };
  const scale = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [1, emotion === "love" || emotion === "surprise" ? 1.22 : 1.1],
  });
  const translateY = motion.interpolate({
    inputRange: [0, 1],
    outputRange: [
      0,
      ["laugh", "party", "celebrate"].includes(emotion)
        ? -7
        : emotion === "cry"
          ? 5
          : -3,
    ],
  });
  const translateX = motion.interpolate({
    inputRange: [0, 1],
    outputRange: emotion === "angry" ? [-5, 5] : [0, 0],
  });
  const rotate = motion.interpolate({
    inputRange: [0, 1],
    outputRange:
      emotion === "laugh"
        ? ["-10deg", "10deg"]
        : emotion === "party"
          ? ["-12deg", "12deg"]
          : emotion === "kiss"
            ? ["-5deg", "6deg"]
            : ["0deg", "0deg"],
  });
  return (
    <LinearGradient colors={palette[tone]} style={styles.fill}>
      <Animated.View
        style={[
          chatStyles.catalogGifHalo,
          { opacity: motion, transform: [{ scale }] },
        ]}
      />
      {emotion === "cry" && (
        <Animated.Text
          style={[
            chatStyles.catalogGifParticle,
            { opacity: motion, transform: [{ translateY }] },
          ]}
        >
          ðŸ’§
        </Animated.Text>
      )}
      {emotion === "laugh" && (
        <Animated.Text
          style={[
            chatStyles.catalogGifLaugh,
            { opacity: motion, transform: [{ scale }] },
          ]}
        >
          HA!
        </Animated.Text>
      )}
      {emotion === "kiss" && (
        <Animated.Text
          style={[
            chatStyles.catalogGifKiss,
            { opacity: motion, transform: [{ translateY }] },
          ]}
        >
          ðŸ’‹
        </Animated.Text>
      )}
      <Animated.Text
        style={[
          chatStyles.catalogGifEmoji,
          compact && chatStyles.catalogGifEmojiCompact,
          {
            transform: [{ translateX }, { translateY }, { scale }, { rotate }],
          },
        ]}
      >
        {gif.previewEmoji ?? "âœ¨"}
      </Animated.Text>
    </LinearGradient>
  );
}

function CatalogGifTile({
  gif,
  compact,
  favourite,
  onSelect,
  onToggleFavourite,
}: {
  gif: ChatGifCatalogItem;
  compact?: boolean;
  favourite?: boolean;
  onSelect: (uri: string) => void;
  onToggleFavourite?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Send ${gif.title}, ${gif.style} animated GIF`}
      onPress={() => onSelect(buildCatalogGifUri(gif))}
      style={compact ? chatStyles.inlineGifCard : chatStyles.gifCard}
    >
      <CatalogGifArtwork gif={gif} compact={compact} />
      <LinearGradient
        colors={["transparent", "rgba(19,3,8,.82)"]}
        style={StyleSheet.absoluteFill}
      />
      {!!onToggleFavourite && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            favourite ? "Remove GIF from favourites" : "Add GIF to favourites"
          }
          onPress={(event) => {
            event.stopPropagation();
            onToggleFavourite();
          }}
          style={chatStyles.gifFavourite}
        >
          <Ionicons
            name={favourite ? "star" : "star-outline"}
            size={14}
            color={favourite ? "#F6D77B" : "#FFF"}
          />
        </Pressable>
      )}
      <View style={compact ? chatStyles.inlineGifCopy : chatStyles.gifCardCopy}>
        <Text
          numberOfLines={1}
          style={compact ? chatStyles.inlineGifTitle : chatStyles.gifTitle}
        >
          {gif.title}
        </Text>
        <Text
          numberOfLines={1}
          style={compact ? chatStyles.inlineGifStyle : chatStyles.gifStyle}
        >
          {gif.style}
        </Text>
      </View>
    </Pressable>
  );
}

function CatalogGifPager({
  offset,
  total,
  pageSize,
  onChange,
  compact: _compact,
}: {
  offset: number;
  total: number;
  pageSize: number;
  onChange: (offset: number) => void;
  compact?: boolean;
}) {
  if (total <= pageSize) return null;
  const end = Math.min(total, offset + pageSize);
  return (
    <View style={chatStyles.catalogGifPager}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Previous GIF page"
        disabled={offset === 0}
        onPress={() => onChange(Math.max(0, offset - pageSize))}
        style={[
          chatStyles.catalogGifPageButton,
          offset === 0 && chatStyles.catalogGifPageButtonDisabled,
        ]}
      >
        <Ionicons name="chevron-back" size={15} color="#8A1732" />
      </Pressable>
      <Text style={chatStyles.catalogGifPageText}>
        {offset + 1}â€“{end} of {total.toLocaleString()}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Next GIF page"
        disabled={end >= total}
        onPress={() => onChange(end)}
        style={[
          chatStyles.catalogGifPageButton,
          end >= total && chatStyles.catalogGifPageButtonDisabled,
        ]}
      >
        <Ionicons name="chevron-forward" size={15} color="#8A1732" />
      </Pressable>
    </View>
  );
}

function GifProviderLine({ live, error }: { live: boolean; error?: string }) {
  const { gifSearch } = useChatRuntime();
  return (
    <View
      style={[
        chatStyles.gifProviderLine,
        !!error && chatStyles.gifProviderLineError,
      ]}
    >
      <Ionicons
        name={
          error ? "cloud-offline-outline" : live ? "flash" : "sparkles-outline"
        }
        size={13}
        color={error ? "#A40B31" : live ? "#8B6817" : "#8A1732"}
      />
      <Text
        style={[
          chatStyles.gifProviderText,
          !!error && chatStyles.gifProviderTextError,
        ]}
      >
        {error ||
          `${live ? "Live exact search" : "Built-in animated catalog"} Â· ${live ? `Powered by ${gifSearch.providerName}` : "1,000 GIF reactions available now"}`}
      </Text>
    </View>
  );
}

function GifPicker({
  visible,
  onClose,
  onSelect,
  onSticker: _onSticker,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (uri: string) => void;
  onSticker: (sticker: CustomChatSticker) => void;
}) {
  const gifSearchConfigured = useChatRuntime().gifSearch.configured;
  const [query, setQuery] = useState("");
  const [catalogOffset, setCatalogOffset] = useState(0);
  const [libraryMode, setLibraryMode] = useState<
    "all" | "recent" | "favourites"
  >("all");
  const [recents, setRecents] = useState<GifLibraryEntry[]>([]);
  const [favourites, setFavourites] = useState<GifLibraryEntry[]>([]);
  useEffect(() => {
    if (visible) {
      setQuery("");
      setCatalogOffset(0);
      setLibraryMode("all");
      void AsyncStorage.getItem(gifLibraryStorageKey).then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as {
            recents?: GifLibraryEntry[];
            favourites?: GifLibraryEntry[];
          };
          setRecents(Array.isArray(parsed.recents) ? parsed.recents : []);
          setFavourites(
            Array.isArray(parsed.favourites) ? parsed.favourites : [],
          );
        } catch {
          setRecents([]);
          setFavourites([]);
        }
      });
    }
  }, [visible]);
  useEffect(() => setCatalogOffset(0), [query]);
  const provider = useGifProviderSearch(query, visible);
  const catalogMatches = searchChatGifCatalog(query);
  const catalogPageSize = 24;
  const catalogPage = catalogMatches.slice(
    catalogOffset,
    catalogOffset + catalogPageSize,
  );
  const persistLibrary = (
    nextRecents: GifLibraryEntry[],
    nextFavourites: GifLibraryEntry[],
  ) =>
    void AsyncStorage.setItem(
      gifLibraryStorageKey,
      JSON.stringify({ recents: nextRecents, favourites: nextFavourites }),
    ).catch(() => undefined);
  const entryFor = (gif: ChatGifCatalogItem, uri: string): GifLibraryEntry => ({
    uri,
    title: gif.title,
    style: gif.style,
    previewEmoji: gif.previewEmoji,
    usedAt: Date.now(),
  });
  const choose = (gif: ChatGifCatalogItem, uri: string) => {
    const next = mergeGifRecents(recents, entryFor(gif, uri));
    setRecents(next);
    persistLibrary(next, favourites);
    onSelect(uri);
  };
  const favourite = (gif: ChatGifCatalogItem, uri: string) => {
    const next = toggleGifFavourite(favourites, entryFor(gif, uri));
    setFavourites(next);
    persistLibrary(recents, next);
  };
  const renderLibraryEntry = (entry: GifLibraryEntry) => {
    const catalog = parseCatalogGifUri(entry.uri);
    const gif: ChatGifCatalogItem = catalog ?? {
      id: `saved-${entry.uri}`,
      title: entry.title,
      style: entry.style,
      uri: entry.uri,
      previewEmoji: entry.previewEmoji,
      searchText: `${entry.title} ${entry.style}`.toLowerCase(),
    };
    return catalog ? (
      <CatalogGifTile
        key={entry.uri}
        gif={gif}
        favourite={favourites.some((item) => item.uri === entry.uri)}
        onSelect={(uri) => choose(gif, uri)}
        onToggleFavourite={() => favourite(gif, entry.uri)}
      />
    ) : (
      <GifResultTile
        key={entry.uri}
        gif={gif}
        favourite={favourites.some((item) => item.uri === entry.uri)}
        onSelect={(uri) => choose(gif, uri)}
        onToggleFavourite={() => favourite(gif, entry.uri)}
      />
    );
  };
  const libraryEntries = libraryMode === "recent" ? recents : favourites;
  const count =
    libraryMode === "all"
      ? gifSearchConfigured
        ? provider.totalCount
        : catalogMatches.length
      : libraryEntries.length;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "92%" }]}>
        <SheetHeader
          title="Choose a GIF"
          subtitle="Search, recent reactions and favourites cached on this device"
          onClose={onClose}
        />
        <View accessibilityRole="tablist" style={chatStyles.gifLibraryTabs}>
          {(
            [
              { id: "all", label: "All GIFs", icon: "images-outline" },
              { id: "recent", label: "Recent", icon: "time-outline" },
              { id: "favourites", label: "Favourites", icon: "star-outline" },
            ] as const
          ).map((item) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: libraryMode === item.id }}
              key={item.id}
              onPress={() => {
                setLibraryMode(item.id);
                setQuery("");
              }}
              style={[
                chatStyles.gifLibraryTab,
                libraryMode === item.id && chatStyles.gifLibraryTabOn,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={libraryMode === item.id ? "#FFF" : "#775E66"}
              />
              <Text
                style={[
                  chatStyles.gifLibraryTabText,
                  libraryMode === item.id && chatStyles.gifLibraryTabTextOn,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {libraryMode === "all" && (
          <>
            <View style={chatStyles.gifSearchWrap}>
              <Ionicons name="search-outline" size={17} color="#806D73" />
              <TextInput
                accessibilityLabel="Search GIF catalog"
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Try good morning, hug, kiss, loveâ€¦"
                placeholderTextColor="#8A767D"
                style={chatStyles.gifSearchInput}
              />
              {!!query && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear GIF search"
                  onPress={() => setQuery("")}
                >
                  <Ionicons name="close-circle" size={18} color="#9C858C" />
                </Pressable>
              )}
            </View>
            <GifProviderLine
              live={gifSearchConfigured}
              error={provider.error}
            />
          </>
        )}
        <View style={chatStyles.gifResultHeader}>
          <Text style={chatStyles.gifResultTitle}>
            {libraryMode === "recent"
              ? "RECENTLY USED"
              : libraryMode === "favourites"
                ? "YOUR FAVOURITES"
                : query.trim()
                  ? `RESULTS FOR â€œ${query.trim().toUpperCase()}â€`
                  : "DAILY REACTIONS"}
          </Text>
          <Text style={chatStyles.gifResultCount}>
            {provider.loading && libraryMode === "all"
              ? "Searchingâ€¦"
              : count.toLocaleString()}
          </Text>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={chatStyles.gifGrid}
        >
          {libraryMode !== "all"
            ? libraryEntries.map(renderLibraryEntry)
            : gifSearchConfigured
              ? provider.items.map((gif) => (
                  <GifResultTile
                    key={gif.id}
                    gif={gif}
                    favourite={favourites.some((item) => item.uri === gif.uri)}
                    onSelect={(uri) => choose(gif, uri)}
                    onToggleFavourite={() => favourite(gif, gif.uri)}
                  />
                ))
              : catalogPage.map((gif) => {
                  const uri = buildCatalogGifUri(gif);
                  return (
                    <CatalogGifTile
                      key={gif.id}
                      gif={gif}
                      favourite={favourites.some((item) => item.uri === uri)}
                      onSelect={(selectedUri) => choose(gif, selectedUri)}
                      onToggleFavourite={() => favourite(gif, uri)}
                    />
                  );
                })}
          {libraryMode === "all" && !gifSearchConfigured && (
            <CatalogGifPager
              offset={catalogOffset}
              total={catalogMatches.length}
              pageSize={catalogPageSize}
              onChange={setCatalogOffset}
            />
          )}{" "}
          {libraryMode === "all" && provider.nextOffset !== null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Load more GIFs"
              disabled={provider.loadingMore}
              onPress={() => void provider.loadMore()}
              style={chatStyles.gifLoadMore}
            >
              <Ionicons name="add-circle-outline" size={17} color="#A40B31" />
              <Text style={chatStyles.gifLoadMoreText}>
                {provider.loadingMore ? "Loadingâ€¦" : "Load 36 more"}
              </Text>
            </Pressable>
          )}
          {libraryMode !== "all" && !libraryEntries.length && (
            <Text style={chatStyles.emojiEmpty}>
              {libraryMode === "recent"
                ? "GIFs you send will appear here for quick reuse."
                : "Tap the star on any GIF to keep it here."}
            </Text>
          )}
          {libraryMode === "all" &&
            !provider.loading &&
            gifSearchConfigured &&
            !provider.items.length && (
              <Text style={chatStyles.emojiEmpty}>
                No GIF found. Try love, funny, sorry or congratulations.
              </Text>
            )}
          {libraryMode === "all" &&
            !gifSearchConfigured &&
            !catalogPage.length && (
              <Text style={chatStyles.emojiEmpty}>
                No GIF found. Try good morning, hug, kiss, love, laugh or chai.
              </Text>
            )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function EmojiMediaPanel({
  onEmoji,
  onGif,
  onSticker,
}: {
  onEmoji: (emoji: string) => void;
  onGif: (uri: string) => void;
  onSticker: (sticker: CustomChatSticker) => void;
}) {
  const gifSearchConfigured = useChatRuntime().gifSearch.configured;
  const [mode, setMode] = useState<"emoji" | "gif" | "sticker">("emoji");
  const [category, setCategory] = useState<EmojiCategoryId>("recent");
  const [query, setQuery] = useState("");
  const [gifLimit, setGifLimit] = useState(48);
  const [catalogOffset, setCatalogOffset] = useState(0);
  const normalized = query.trim().toLowerCase();
  const activeCategory =
    emojiCategories.find((item) => item.id === category) ?? emojiCategories[0]!;
  const searchedEmoji = normalized
    ? [
        ...new Set(
          emojiSearchGroups
            .filter(
              (group) =>
                group.keywords.includes(normalized) ||
                normalized
                  .split(/\s+/)
                  .some((term) => group.keywords.includes(term)),
            )
            .flatMap((group) => group.emojis),
        ),
      ]
    : activeCategory.emojis;
  const visibleEmoji = searchedEmoji.length
    ? searchedEmoji
    : quickEmojis.filter((emoji) => emoji.includes(query.trim()));
  const stickerTokens = normalized.split(/\s+/).filter(Boolean);
  const visibleStickers = customChatStickers.filter(
    (sticker) =>
      !stickerTokens.length ||
      stickerTokens.some((token) =>
        `${sticker.label} ${sticker.caption} ${sticker.tags} ${sticker.emoji}`
          .toLowerCase()
          .includes(token),
      ),
  );
  const provider = useGifProviderSearch(query, mode === "gif");
  const visibleGifs = provider.items.slice(0, gifLimit);
  const catalogMatches = searchChatGifCatalog(query);
  const catalogPageSize = 24;
  const catalogPage = catalogMatches.slice(
    catalogOffset,
    catalogOffset + catalogPageSize,
  );
  useEffect(() => {
    setGifLimit(48);
    setCatalogOffset(0);
  }, [mode, query]);
  const modeLabel =
    mode === "emoji"
      ? "Search emoji"
      : mode === "gif"
        ? "Search GIFs"
        : "Search stickers";
  return (
    <View
      accessibilityLabel="Emoji, GIF and sticker picker"
      style={chatStyles.emojiMediaPanel}
    >
      <View style={chatStyles.emojiSearchWrap}>
        <Ionicons name="search-outline" size={17} color="#806D73" />
        <TextInput
          accessibilityLabel={modeLabel}
          value={query}
          onChangeText={setQuery}
          placeholder={modeLabel}
          placeholderTextColor="#8A767D"
          style={chatStyles.emojiSearchInput}
        />
        {!!query && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            hitSlop={accessibilityHitSlop}
            onPress={() => setQuery("")}
          >
            <Ionicons name="close-circle" size={18} color="#9C858C" />
          </Pressable>
        )}
      </View>
      {mode === "emoji" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={chatStyles.emojiCategoryRow}
        >
          {emojiCategories.map((item) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: category === item.id }}
              accessibilityLabel={`${item.label} emoji`}
              key={item.id}
              onPress={() => {
                setCategory(item.id);
                setQuery("");
              }}
              style={[
                chatStyles.emojiCategoryButton,
                category === item.id && chatStyles.emojiCategoryButtonOn,
              ]}
            >
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={17}
                color={category === item.id ? "#A40B31" : "#76636A"}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={chatStyles.emojiContent}
        contentContainerStyle={
          mode === "gif"
            ? chatStyles.inlineGifGrid
            : mode === "sticker"
              ? chatStyles.stickerGrid
              : chatStyles.richEmojiGrid
        }
      >
        {mode === "emoji" && (
          <>
            <View style={chatStyles.emojiSectionHeader}>
              <Text style={chatStyles.emojiSectionTitle}>
                {normalized
                  ? "SEARCH RESULTS"
                  : activeCategory.label.toUpperCase()}
              </Text>
              <Text style={chatStyles.emojiSectionCount}>
                {visibleEmoji.length}
              </Text>
            </View>
            {visibleEmoji.map((emoji, index) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add ${emoji}`}
                key={`${emoji}-${index}`}
                onPress={() => onEmoji(emoji)}
                style={chatStyles.richEmojiButton}
              >
                <Text style={chatStyles.richEmoji}>{emoji}</Text>
              </Pressable>
            ))}
            {!visibleEmoji.length && (
              <Text style={chatStyles.emojiEmpty}>
                No emoji found. Try â€œloveâ€, â€œlaughâ€, â€œfoodâ€ or â€œtravelâ€.
              </Text>
            )}
          </>
        )}
        {mode === "gif" && (
          <>
            <View style={chatStyles.emojiSectionHeader}>
              <Text style={chatStyles.emojiSectionTitle}>
                {normalized ? "SEARCH RESULTS" : "1,000 DAILY-USE GIFS"}
              </Text>
              <Text style={chatStyles.emojiSectionCount}>
                {provider.loading
                  ? "â€¦"
                  : gifSearchConfigured
                    ? provider.totalCount.toLocaleString()
                    : catalogMatches.length.toLocaleString()}
              </Text>
            </View>
            <GifProviderLine
              live={gifSearchConfigured}
              error={provider.error}
            />
            {gifSearchConfigured
              ? visibleGifs.map((gif) => (
                  <GifResultTile
                    compact
                    key={gif.id}
                    gif={gif}
                    onSelect={onGif}
                  />
                ))
              : catalogPage.map((gif) => (
                  <CatalogGifTile
                    compact
                    key={gif.id}
                    gif={gif}
                    onSelect={onGif}
                  />
                ))}
            {!gifSearchConfigured && (
              <CatalogGifPager
                compact
                offset={catalogOffset}
                total={catalogMatches.length}
                pageSize={catalogPageSize}
                onChange={setCatalogOffset}
              />
            )}{" "}
            {provider.nextOffset !== null && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Load more GIF results"
                disabled={provider.loadingMore}
                onPress={() => void provider.loadMore()}
                style={chatStyles.inlineGifMore}
              >
                <Text style={chatStyles.inlineGifMoreText}>
                  {provider.loadingMore ? "Loadingâ€¦" : "Load 36 more"}
                </Text>
              </Pressable>
            )}
            {!provider.loading &&
              gifSearchConfigured &&
              !visibleGifs.length && (
                <Text style={chatStyles.emojiEmpty}>
                  No GIF found. Try good morning, hug, kiss, love, funny or
                  sorry.
                </Text>
              )}
            {!gifSearchConfigured && !catalogPage.length && (
              <Text style={chatStyles.emojiEmpty}>
                No GIF found. Try laugh, hug, love, chai or good morning.
              </Text>
            )}
          </>
        )}
        {mode === "sticker" && (
          <>
            <View style={chatStyles.emojiSectionHeader}>
              <Text style={chatStyles.emojiSectionTitle}>
                DESTINYONE STICKER PACK
              </Text>
              <Text style={chatStyles.emojiSectionCount}>
                {visibleStickers.length}
              </Text>
            </View>
            {visibleStickers.map((sticker) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Send ${sticker.label} animated sticker`}
                key={sticker.id}
                onPress={() => onSticker(sticker)}
                style={chatStyles.customStickerChoice}
              >
                <LinearGradient
                  colors={
                    sticker.tone === "gold"
                      ? ["#FFF9E8", "#F7E2AF"]
                      : sticker.tone === "plum"
                        ? ["#F9F1FF", "#E7D1F4"]
                        : sticker.tone === "cocoa"
                          ? ["#FCF4EC", "#E9D3BE"]
                          : ["#FFF7F7", "#F8D6DE"]
                  }
                  style={chatStyles.customStickerInner}
                >
                  <View style={chatStyles.customStickerEmojiWrap}>
                    <Text style={chatStyles.customStickerEmoji}>
                      {sticker.emoji}
                    </Text>
                    <Text style={chatStyles.customStickerSpark}>âœ¦</Text>
                  </View>
                  <Text numberOfLines={1} style={chatStyles.customStickerLabel}>
                    {sticker.label}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={chatStyles.customStickerCaption}
                  >
                    {sticker.caption}
                  </Text>
                </LinearGradient>
              </Pressable>
            ))}
            {!visibleStickers.length && (
              <Text style={chatStyles.emojiEmpty}>
                No sticker found. Try laugh, hug, love, chai, angry or good
                morning.
              </Text>
            )}
          </>
        )}
      </ScrollView>
      <View accessibilityRole="tablist" style={chatStyles.emojiModeTabs}>
        {(
          [
            { id: "emoji", label: "Emoji", icon: "happy-outline" },
            { id: "gif", label: "GIF", icon: "images-outline" },
            { id: "sticker", label: "Stickers", icon: "sparkles-outline" },
          ] as const
        ).map((item) => (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === item.id }}
            key={item.id}
            onPress={() => {
              setMode(item.id);
              setQuery("");
            }}
            style={[
              chatStyles.emojiModeTab,
              mode === item.id && chatStyles.emojiModeTabOn,
            ]}
          >
            <Ionicons
              name={item.icon}
              size={16}
              color={mode === item.id ? "#FFF" : "#735E65"}
            />
            <Text
              style={[
                chatStyles.emojiModeText,
                mode === item.id && chatStyles.emojiModeTextOn,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function MessageActionSheet({
  visible,
  message,
  reaction,
  starred,
  pinned,
  notice,
  onClose,
  onInfo,
  onReply,
  onEdit,
  onCopy,
  onReact,
  onForward,
  onMultiSelect,
  onPin,
  onStar,
  onDelete,
  onHideForMe,
}: {
  visible: boolean;
  message: ChatMessage | null;
  reaction?: string;
  starred: boolean;
  pinned: boolean;
  notice: string;
  onClose: () => void;
  onInfo: () => void;
  onReply: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onReact: (reaction: string) => void;
  onForward: () => void;
  onMultiSelect: () => void;
  onPin: () => void;
  onStar: () => void;
  onDelete: () => void;
  onHideForMe: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reactionHint, setReactionHint] = useState(false);
  useEffect(() => {
    if (visible) {
      setConfirmDelete(false);
      setReactionHint(false);
    }
  }, [visible, message?.id]);
  const actions = [
    {
      label: "Message info",
      body: "Time and delivery status",
      icon: "information-circle-outline" as const,
      onPress: onInfo,
    },
    {
      label: "Reply",
      body: "Quote this message",
      icon: "arrow-undo-outline" as const,
      onPress: onReply,
    },
    ...(message?.mine !== false &&
    message?.type === "text" &&
    !message?.text?.startsWith("ðŸŽ®")
      ? [
          {
            label: "Edit",
            body: "Update this message with an edited label",
            icon: "create-outline" as const,
            onPress: onEdit,
          },
        ]
      : []),
    {
      label: "Copy",
      body: "Copy message text",
      icon: "copy-outline" as const,
      onPress: onCopy,
    },
    {
      label: "React",
      body: "Choose a quick reaction above",
      icon: "happy-outline" as const,
      onPress: () => setReactionHint(true),
    },
    {
      label: "Forward",
      body: "Share with another conversation",
      icon: "arrow-redo-outline" as const,
      onPress: onForward,
    },
    {
      label: "Select messages",
      body: "Choose several messages to forward together",
      icon: "checkmark-circle-outline" as const,
      onPress: onMultiSelect,
    },
    {
      label: pinned ? "Unpin" : "Pin",
      body: pinned
        ? "Remove from pinned messages"
        : "Keep at the top of this chat",
      icon: pinned ? ("pin-outline" as const) : ("pin" as const),
      onPress: onPin,
    },
    {
      label: starred ? "Unstar" : "Star",
      body: starred ? "Remove from starred messages" : "Save for later",
      icon: starred ? ("star-outline" as const) : ("star" as const),
      onPress: onStar,
    },
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close message actions"
        style={chatStyles.actionSheetBackdrop}
        onPress={onClose}
      />
      <SafeAreaView style={chatStyles.messageActionSheet}>
        <View style={chatStyles.actionGrabber} />
        <View style={chatStyles.actionPreview}>
          <View style={chatStyles.actionPreviewAccent} />
          <View style={{ flex: 1 }}>
            <Text style={chatStyles.actionPreviewLabel}>
              {message?.mine === false ? "Received message" : "Your message"}
            </Text>
            <Text numberOfLines={2} style={chatStyles.actionPreviewText}>
              {message ? messageSummaryForAccessibility(message) : ""}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={accessibilityHitSlop}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color="#756168" />
          </Pressable>
        </View>
        <View style={chatStyles.quickReactionRow}>
          {["ðŸ‘", "â¤ï¸", "ðŸ˜‚", "ðŸ˜®", "ðŸ¥º", "ðŸ™"].map((item) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`React ${item}`}
              accessibilityState={{ selected: reaction === item }}
              key={item}
              onPress={() => onReact(item)}
              style={[
                chatStyles.quickReactionButton,
                reaction === item && chatStyles.quickReactionButtonOn,
              ]}
            >
              <Text style={chatStyles.quickReactionEmoji}>{item}</Text>
            </Pressable>
          ))}
        </View>
        {(!!notice || reactionHint) && (
          <View
            accessibilityLiveRegion="polite"
            style={chatStyles.actionNotice}
          >
            <Ionicons
              name="information-circle-outline"
              size={15}
              color="#9A7417"
            />
            <Text style={chatStyles.actionNoticeText}>
              {notice ||
                "Tap one of the reactions above. Tap the selected reaction again to replace it."}
            </Text>
          </View>
        )}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={chatStyles.actionList}
        >
          {actions.map((action) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={action.label}
              key={action.label}
              onPress={action.onPress}
              style={chatStyles.actionRow}
            >
              <View style={chatStyles.actionIcon}>
                <Ionicons name={action.icon} size={18} color="#5B454C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.actionTitle}>{action.label}</Text>
                <Text style={chatStyles.actionBody}>{action.body}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="#B39DA4" />
            </Pressable>
          ))}
          {message?.mine !== false &&
            (confirmDelete ? (
              <View style={chatStyles.deleteConfirm}>
                <View style={{ flex: 1 }}>
                  <Text style={chatStyles.deleteConfirmTitle}>
                    Delete for everyone?
                  </Text>
                  <Text style={chatStyles.deleteConfirmBody}>
                    You have 5 seconds to undo before the secure delete is
                    committed.
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel delete"
                  onPress={() => setConfirmDelete(false)}
                  style={chatStyles.deleteCancel}
                >
                  <Text style={chatStyles.deleteCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm delete"
                  onPress={onDelete}
                  style={chatStyles.deleteConfirmButton}
                >
                  <Text style={chatStyles.deleteConfirmButtonText}>Delete</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete message"
                onPress={() => setConfirmDelete(true)}
                style={[chatStyles.actionRow, chatStyles.deleteAction]}
              >
                <View style={[chatStyles.actionIcon, chatStyles.deleteIcon]}>
                  <Ionicons name="trash-outline" size={18} color="#B10D38" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={chatStyles.deleteTitle}>
                    Delete for everyone
                  </Text>
                  <Text style={chatStyles.actionBody}>
                    Remove the content from both sides
                  </Text>
                </View>
              </Pressable>
            ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete for me"
            onPress={onHideForMe}
            style={[chatStyles.actionRow, chatStyles.deleteAction]}
          >
            <View style={[chatStyles.actionIcon, chatStyles.deleteIcon]}>
              <Ionicons name="trash-outline" size={18} color="#B10D38" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={chatStyles.deleteTitle}>Delete for me</Text>
              <Text style={chatStyles.actionBody}>
                Remove it from your view only
              </Text>
            </View>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function EditMessageSheet({
  message,
  onClose,
  onSave,
}: {
  message: ChatMessage | null;
  onClose: () => void;
  onSave: (text: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (message) {
      setValue(parseQuotedReply(message.text)?.body ?? message.text ?? "");
      setError("");
    }
  }, [message?.id]);
  const save = async () => {
    const clean = value.trim();
    if (!clean) {
      setError("Message cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      if (!(await onSave(clean)))
        setError("The edit could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      visible={!!message}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={chatStyles.sheet}>
        <SheetHeader
          title="Edit message"
          subtitle="Edited messages are clearly labelled for both people"
          onClose={onClose}
        />
        <View style={chatStyles.editMessageCard}>
          <TextInput
            accessibilityLabel="Edit message text"
            autoFocus
            multiline
            value={value}
            onChangeText={setValue}
            maxLength={2000}
            placeholder="Update your message"
            placeholderTextColor="#8B747C"
            style={chatStyles.editMessageInput}
          />
          <Text style={chatStyles.editMessageCount}>{value.length}/2,000</Text>
        </View>
        {!!error && (
          <Text accessibilityRole="alert" style={chatStyles.editMessageError}>
            {error}
          </Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save edited message"
          disabled={saving || !value.trim()}
          onPress={() => void save()}
          style={[
            chatStyles.primarySheetButton,
            (saving || !value.trim()) && { opacity: 0.45 },
          ]}
        >
          <Ionicons name="checkmark-circle" size={18} color="#FFF" />
          <Text style={chatStyles.primarySheetButtonText}>
            {saving ? "Savingâ€¦" : "Save changes"}
          </Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

function ForwardSelectorSheet({
  visible,
  messages,
  current,
  onClose,
  onForward,
}: {
  visible: boolean;
  messages: ChatMessage[];
  current: Match;
  onClose: () => void;
  onForward: (target: Match) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState("");
  useEffect(() => {
    if (visible) {
      setQuery("");
      setSendingId("");
    }
  }, [visible]);
  const normalized = query.trim().toLowerCase();
  const recipients = matches.filter(
    (item) =>
      item.id !== current.id &&
      (!normalized ||
        `${item.name} ${item.city} ${item.profession}`
          .toLowerCase()
          .includes(normalized)),
  );
  const choose = async (target: Match) => {
    setSendingId(target.id);
    try {
      await onForward(target);
    } finally {
      setSendingId("");
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "88%" }]}>
        <SheetHeader
          title="Forward messages"
          subtitle={`${messages.length} ${messages.length === 1 ? "message" : "messages"} Â· choose a verified conversation`}
          onClose={onClose}
        />
        <View style={chatStyles.gifSearchWrap}>
          <Ionicons name="search-outline" size={17} color="#806D73" />
          <TextInput
            accessibilityLabel="Search forwarding recipients"
            value={query}
            onChangeText={setQuery}
            placeholder="Search conversations"
            placeholderTextColor="#8A767D"
            style={chatStyles.gifSearchInput}
          />
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={chatStyles.forwardList}
        >
          {recipients.map((person) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Forward to ${person.name}`}
              disabled={!!sendingId}
              key={person.id}
              onPress={() => void choose(person)}
              style={chatStyles.forwardPerson}
            >
              {person.photo ? (
                <Image
                  source={{ uri: person.photo }}
                  style={chatStyles.forwardAvatar}
                />
              ) : (
                <View
                  style={[chatStyles.forwardAvatar, chatStyles.initialAvatar]}
                >
                  <Text style={chatStyles.initialAvatarText}>
                    {person.name[0]}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={chatStyles.forwardName}>{person.name}</Text>
                <Text style={chatStyles.forwardMeta}>
                  {person.city} Â· Verified match
                </Text>
              </View>
              <View style={chatStyles.forwardButton}>
                <Ionicons
                  name={sendingId === person.id ? "time-outline" : "arrow-redo"}
                  size={16}
                  color="#FFF"
                />
              </View>
            </Pressable>
          ))}
          {!recipients.length && (
            <Text style={chatStyles.emojiEmpty}>
              No verified conversation matches this search.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PinnedMessagesSheet({
  visible,
  messages,
  onClose,
  onJump,
  onUnpin,
}: {
  visible: boolean;
  messages: ChatMessage[];
  onClose: () => void;
  onJump: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "85%" }]}>
        <SheetHeader
          title="Pinned messages"
          subtitle="Important moments kept at the top of this conversation"
          onClose={onClose}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={chatStyles.forwardList}
        >
          {messages.map((message) => (
            <View key={message.id} style={chatStyles.pinnedMessageRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Jump to pinned message"
                onPress={() => onJump(message.id)}
                style={{ flex: 1 }}
              >
                <Text style={chatStyles.pinnedMessageLabel}>
                  {message.mine === false ? "FROM YOUR MATCH" : "FROM YOU"} Â·{" "}
                  {new Date(message.createdAt).toLocaleDateString()}
                </Text>
                <Text numberOfLines={3} style={chatStyles.pinnedMessageText}>
                  {messageSummaryForAccessibility(message)}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Unpin message"
                onPress={() => onUnpin(message.id)}
                style={chatStyles.unpinButton}
              >
                <Ionicons name="pin-outline" size={16} color="#8A1732" />
              </Pressable>
            </View>
          ))}
          {!messages.length && (
            <Text style={chatStyles.emojiEmpty}>No pinned messages yet.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ConversationInboxSheet({
  visible,
  current,
  settings,
  onClose,
  onOpen,
}: {
  visible: boolean;
  current: Match;
  settings: Record<string, CoupleChatSettings>;
  onClose: () => void;
  onOpen: (target: Match) => void;
}) {
  const [tab, setTab] = useState<"active" | "pinned" | "archived">("active");
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (visible) {
      setTab("active");
      setQuery("");
    }
  }, [visible]);
  const all = [current, ...matches.filter((item) => item.id !== current.id)];
  const normalized = query.trim().toLowerCase();
  const filtered = all
    .filter((person) => {
      const preference = {
        ...defaultCoupleChatSettings,
        ...settings[person.id],
      };
      const belongs =
        tab === "archived"
          ? preference.conversationArchived
          : tab === "pinned"
            ? preference.conversationPinned && !preference.conversationArchived
            : !preference.conversationArchived;
      return (
        belongs &&
        (!normalized ||
          `${preference.nickname} ${person.name} ${person.city} ${person.profession}`
            .toLowerCase()
            .includes(normalized))
      );
    })
    .sort(
      (a, b) =>
        Number(!!settings[b.id]?.conversationPinned) -
        Number(!!settings[a.id]?.conversationPinned),
    );
  const counts = {
    active: all.filter((person) => !settings[person.id]?.conversationArchived)
      .length,
    pinned: all.filter(
      (person) =>
        settings[person.id]?.conversationPinned &&
        !settings[person.id]?.conversationArchived,
    ).length,
    archived: all.filter((person) => settings[person.id]?.conversationArchived)
      .length,
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "90%" }]}>
        <SheetHeader
          title="Conversation inbox"
          subtitle="Pinned chats stay first; archived chats remain private and searchable"
          onClose={onClose}
        />
        <View accessibilityRole="tablist" style={chatStyles.inboxTabs}>
          {(["active", "pinned", "archived"] as const).map((item) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item }}
              key={item}
              onPress={() => setTab(item)}
              style={[
                chatStyles.inboxTab,
                tab === item && chatStyles.inboxTabOn,
              ]}
            >
              <Text
                style={[
                  chatStyles.inboxTabText,
                  tab === item && chatStyles.inboxTabTextOn,
                ]}
              >
                {item[0]?.toUpperCase()}
                {item.slice(1)} Â· {counts[item]}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={chatStyles.gifSearchWrap}>
          <Ionicons name="search-outline" size={17} color="#806D73" />
          <TextInput
            accessibilityLabel={`Search ${tab} conversations`}
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${tab}`}
            placeholderTextColor="#8A767D"
            style={chatStyles.gifSearchInput}
          />
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={chatStyles.forwardList}
        >
          {filtered.map((person) => {
            const preference = {
              ...defaultCoupleChatSettings,
              ...settings[person.id],
            };
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open conversation with ${preference.nickname || person.name}`}
                key={person.id}
                onPress={() => onOpen(person)}
                style={[
                  chatStyles.forwardPerson,
                  person.id === current.id && chatStyles.currentConversation,
                ]}
              >
                {person.photo ? (
                  <Image
                    source={{ uri: person.photo }}
                    style={chatStyles.forwardAvatar}
                  />
                ) : (
                  <View
                    style={[chatStyles.forwardAvatar, chatStyles.initialAvatar]}
                  >
                    <Text style={chatStyles.initialAvatarText}>
                      {person.name[0]}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={shared.row}>
                    <Text numberOfLines={1} style={chatStyles.forwardName}>
                      {preference.nickname || person.name}
                    </Text>
                    {preference.conversationPinned && (
                      <Ionicons name="pin" size={12} color="#A47A14" />
                    )}
                    {preference.notificationMode === "muted" && (
                      <Ionicons
                        name="notifications-off"
                        size={12}
                        color="#8A747B"
                      />
                    )}
                  </View>
                  <Text style={chatStyles.forwardMeta}>
                    {person.city} Â·{" "}
                    {person.id === current.id
                      ? "Open now"
                      : "Verified conversation"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color="#A48D94" />
              </Pressable>
            );
          })}
          {!filtered.length && (
            <View style={chatStyles.inboxEmpty}>
              <MiniPremiumIcon
                name={
                  tab === "archived"
                    ? "archive-outline"
                    : "chatbubble-ellipses-outline"
                }
                tone="rose"
                size={40}
                iconSize={18}
              />
              <Text style={chatStyles.inboxEmptyTitle}>
                No {tab} conversations
              </Text>
              <Text style={chatStyles.inboxEmptyBody}>
                {query
                  ? "Try another name or city."
                  : tab === "archived"
                    ? "Archived conversations will appear here without losing messages."
                    : "Use Chat settings to pin or organize a conversation."}
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function GiftShop({
  visible,
  balance,
  recipientName,
  physicalMode,
  digitalMode,
  onClose,
  onSendDigital,
  onOrderPhysical,
}: {
  visible: boolean;
  balance: number;
  recipientName: string;
  physicalMode: "live" | "demo" | "blocked";
  digitalMode: "live" | "demo" | "blocked";
  onClose: () => void;
  onSendDigital: (gift: DigitalGift) => void;
  onOrderPhysical: (gift: PhysicalGift, note: string) => Promise<void>;
}) {
  const {
    estimateQuote: estimateGiftOrderQuote,
    formatMoney: formatGiftMoney,
  } = useChatRuntime().gifts;
  const [tab, setTab] = useState<"delivered" | "digital">("delivered");
  const [selectedGift, setSelectedGift] = useState<PhysicalGift | null>(null);
  const [note, setNote] = useState("Thinking of you â¤ï¸");
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const selectedQuote = selectedGift
    ? estimateGiftOrderQuote({
        productId: selectedGift.id,
        productName: selectedGift.name,
        priceCents: selectedGift.priceCents,
        etaHint: selectedGift.eta,
        recipientId: "preview",
      })
    : null;
  useEffect(() => {
    if (visible) {
      setTab("delivered");
      setSelectedGift(null);
      setNote("Thinking of you â¤ï¸");
      setError("");
    }
  }, [visible]);
  const placeOrder = async () => {
    if (!selectedGift) return;
    setOrdering(true);
    setError("");
    try {
      await onOrderPhysical(selectedGift, note.trim());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not place the gift order.",
      );
    } finally {
      setOrdering(false);
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "92%" }]}>
        <SheetHeader
          title="Send something real"
          subtitle={`A beautiful surprise for ${recipientName}`}
          onClose={onClose}
        />
        <View style={chatStyles.giftTabs}>
          <Pressable
            onPress={() => setTab("delivered")}
            style={[
              chatStyles.giftTab,
              tab === "delivered" && chatStyles.giftTabOn,
            ]}
          >
            <MiniPremiumIcon
              name="bicycle"
              tone={tab === "delivered" ? "gold" : "dark"}
              size={28}
              iconSize={13}
            />
            <Text style={chatStyles.giftTabText}>Delivered gifts</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("digital")}
            style={[
              chatStyles.giftTab,
              tab === "digital" && chatStyles.giftTabOn,
            ]}
          >
            <MiniPremiumIcon
              name="sparkles"
              tone={tab === "digital" ? "gold" : "dark"}
              size={28}
              iconSize={13}
            />
            <Text style={chatStyles.giftTabText}>Digital</Text>
          </Pressable>
        </View>
        {tab === "delivered" ? (
          <>
            <View style={chatStyles.privacyBanner}>
              <PremiumIcon
                name="lock-closed"
                tone="gold"
                size={38}
                iconSize={18}
              />
              <Text style={chatStyles.privacyBannerText}>
                {recipientName}'s exact address is never shown. They accept
                privately first, then payment + courier order starts.
              </Text>
            </View>
            <GiftFlowPreview quote={selectedQuote} />
            <ScrollView contentContainerStyle={chatStyles.giftGrid}>
              {physicalGifts.map((gift) => (
                <Pressable
                  key={gift.id}
                  onPress={() => setSelectedGift(gift)}
                  style={[
                    chatStyles.giftCard,
                    selectedGift?.id === gift.id && chatStyles.giftCardOn,
                  ]}
                >
                  <View style={chatStyles.giftPhotoWrap}>
                    <Image
                      source={{ uri: gift.photo }}
                      style={chatStyles.giftPhoto}
                    />
                    <LinearGradient
                      colors={["transparent", "rgba(9,0,3,.78)"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={chatStyles.giftPhotoBadge}>
                      <MiniPremiumIcon
                        name={physicalGiftIcon(gift.id)}
                        tone={selectedGift?.id === gift.id ? "gold" : "ruby"}
                        size={34}
                        iconSize={16}
                      />
                    </View>
                  </View>
                  <Text style={chatStyles.giftName}>{gift.name}</Text>
                  <Text style={chatStyles.giftDescription}>{gift.caption}</Text>
                  <View style={chatStyles.deliveryMeta}>
                    <Text style={chatStyles.priceText}>
                      {formatGiftMoney(gift.priceCents)}
                    </Text>
                    <Text style={chatStyles.etaText}>{gift.eta}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            {selectedGift && selectedQuote && (
              <View style={giftFlowStyles.quoteCard}>
                <View style={shared.row}>
                  <PremiumIcon
                    name={physicalGiftIcon(selectedGift.id)}
                    tone="gold"
                    size={44}
                    iconSize={20}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={giftFlowStyles.quoteTitle}>
                      {selectedGift.name}
                    </Text>
                    <Text style={giftFlowStyles.quoteMeta}>
                      {selectedQuote.serviceLevelLabel} Â· DestinyOne delivery Â·
                      ETA {selectedQuote.etaLabel}
                    </Text>
                  </View>
                  <View style={giftFlowStyles.totalPill}>
                    <Text style={giftFlowStyles.totalText}>
                      {formatGiftMoney(selectedQuote.totalCents)}
                    </Text>
                  </View>
                </View>
                <View style={giftFlowStyles.priceRows}>
                  <GiftPriceRow
                    label="Gift"
                    value={formatGiftMoney(selectedQuote.itemSubtotalCents)}
                  />
                  <GiftPriceRow
                    label="Delivery"
                    value={formatGiftMoney(selectedQuote.deliveryFeeCents)}
                  />
                  <GiftPriceRow
                    label="Service + est. tax"
                    value={formatGiftMoney(
                      selectedQuote.serviceFeeCents +
                        selectedQuote.estimatedTaxCents,
                    )}
                  />
                </View>
                <GiftQuoteInfo quote={selectedQuote} />
                <GiftReadinessPanel quote={selectedQuote} />
                <GiftStatusPreview
                  status="recipient_pending"
                  quote={selectedQuote}
                />
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={120}
                  placeholder="Add a short noteâ€¦"
                  placeholderTextColor="#8C7888"
                  style={giftFlowStyles.noteInput}
                />
                <View style={giftFlowStyles.stepPreview}>
                  {["Request", "Accept", "Pay", "Prepare", "Deliver"].map(
                    (label, index) => (
                      <View key={label} style={giftFlowStyles.stepMini}>
                        <View
                          style={[
                            giftFlowStyles.stepDot,
                            index === 0 && giftFlowStyles.stepDotOn,
                          ]}
                        >
                          <Text style={giftFlowStyles.stepNumber}>
                            {index + 1}
                          </Text>
                        </View>
                        <Text style={giftFlowStyles.stepMiniText}>{label}</Text>
                      </View>
                    ),
                  )}
                </View>
                <Pressable
                  disabled={ordering || physicalMode === "blocked"}
                  onPress={() => void placeOrder()}
                  style={[
                    chatStyles.checkoutButton,
                    { width: "100%", marginTop: 2 },
                    physicalMode === "blocked" && { opacity: 0.45 },
                  ]}
                >
                  <Text style={chatStyles.checkoutButtonText}>
                    {physicalMode === "blocked"
                      ? "Delivery connection required"
                      : ordering
                        ? "Creating secure requestâ€¦"
                        : `Send request Â· ${formatGiftMoney(selectedQuote.totalCents)}`}
                  </Text>
                </Pressable>
                <Text style={giftFlowStyles.quoteFine}>
                  Payment is authorized only after {recipientName} accepts.
                  Final provider quote can update after exact address.
                </Text>
              </View>
            )}
            {!!error && <Text style={styles.formError}>{error}</Text>}
          </>
        ) : (
          <>
            <View style={chatStyles.balance}>
              <MiniPremiumIcon
                name="sparkles"
                tone="gold"
                size={32}
                iconSize={15}
              />
              <Text style={chatStyles.balanceText}>
                {digitalMode === "demo"
                  ? `${balance} demo coins`
                  : "Secure wallet unavailable"}
              </Text>
              <Text style={chatStyles.balanceNote}>
                {digitalMode === "demo" ? "Preview only" : "Billing required"}
              </Text>
            </View>
            <ScrollView contentContainerStyle={chatStyles.giftGrid}>
              {digitalGifts.map((gift) => (
                <Pressable
                  disabled={digitalMode !== "demo"}
                  key={gift.name}
                  onPress={() => onSendDigital(gift)}
                  style={[
                    chatStyles.giftCard,
                    digitalMode !== "demo" && { opacity: 0.45 },
                  ]}
                >
                  <PremiumIcon
                    name={digitalGiftIcon(gift.name)}
                    tone={gift.name.includes("Promise") ? "gold" : "rose"}
                    size={58}
                    iconSize={27}
                  />
                  <Text style={chatStyles.giftName}>{gift.name}</Text>
                  <Text style={chatStyles.giftDescription}>{gift.caption}</Text>
                  <View style={chatStyles.coinPill}>
                    <MiniPremiumIcon
                      name="sparkles"
                      tone="gold"
                      size={22}
                      iconSize={10}
                    />
                    <Text style={chatStyles.coinText}>{gift.coins}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
        <Text style={chatStyles.billingNote}>
          {physicalMode === "blocked" || digitalMode === "blocked"
            ? "Unavailable actions never create local orders or change local balances in a real-backend build."
            : "Preview transactions stay on this device and never charge a real payment method."}
        </Text>
      </SafeAreaView>
    </Modal>
  );
}

function GiftFlowPreview({ quote }: { quote: GiftOrderQuote | null }) {
  const steps = [
    { title: "Choose", body: "Pick gift + note" },
    { title: "Accept", body: "Recipient accepts privately" },
    { title: "Pay", body: "Authorize after consent" },
    { title: "Prepare", body: "A trusted local partner prepares" },
    { title: "Deliver", body: quote?.etaLabel ?? "ETA after gift selected" },
  ];
  return (
    <View style={giftFlowStyles.flowPanel}>
      {steps.map((step, index) => (
        <View key={step.title} style={giftFlowStyles.flowStep}>
          <View
            style={[
              giftFlowStyles.stepDot,
              index === 0 && giftFlowStyles.stepDotOn,
            ]}
          >
            <Text style={giftFlowStyles.stepNumber}>{index + 1}</Text>
          </View>
          <Text style={giftFlowStyles.flowTitle}>{step.title}</Text>
          <Text style={giftFlowStyles.flowBody}>{step.body}</Text>
          {index < steps.length - 1 && <View style={giftFlowStyles.flowLine} />}
        </View>
      ))}
    </View>
  );
}

function GiftReadinessPanel({ quote }: { quote: GiftOrderQuote }) {
  const { buildFulfillmentPlan } = useChatRuntime().gifts;
  const plan = buildFulfillmentPlan(quote);
  return (
    <View style={giftFlowStyles.readinessPanel}>
      <View style={shared.row}>
        <MiniPremiumIcon
          name="git-branch-outline"
          tone="gold"
          size={30}
          iconSize={14}
        />
        <Text style={giftFlowStyles.readinessTitle}>Production order map</Text>
        <View style={shared.spacer} />
        <Text style={giftFlowStyles.readinessBadge}>
          {quote.quoteValidMinutes} min quote
        </Text>
      </View>
      {plan.map((item) => (
        <View key={item.title} style={giftFlowStyles.readinessRow}>
          <MiniPremiumIcon
            name={item.ready ? "checkmark-circle" : "construct-outline"}
            tone={item.ready ? "gold" : "rose"}
            size={26}
            iconSize={12}
          />
          <View style={{ flex: 1 }}>
            <Text style={giftFlowStyles.readinessItemTitle}>{item.title}</Text>
            <Text style={giftFlowStyles.readinessBody}>
              {item.owner === "provider"
                ? "A vetted local merchant and courier are selected privately by city, availability and delivery promise."
                : item.body}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function GiftStatusPreview({
  status,
  quote,
}: {
  status: GiftFulfillmentStatus;
  quote: GiftOrderQuote;
}) {
  const summary = useChatRuntime().gifts.orderSummary(status, quote);
  return (
    <View
      style={[
        giftFlowStyles.statusPreview,
        summary.tone === "waiting" && giftFlowStyles.statusWaiting,
      ]}
    >
      <MiniPremiumIcon
        name={
          summary.tone === "success"
            ? "checkmark-circle"
            : summary.tone === "support"
              ? "alert-circle-outline"
              : "time-outline"
        }
        tone={
          summary.tone === "success"
            ? "gold"
            : summary.tone === "support"
              ? "ruby"
              : "rose"
        }
        size={32}
        iconSize={15}
      />
      <View style={{ flex: 1 }}>
        <Text style={giftFlowStyles.statusTitle}>{summary.headline}</Text>
        <Text style={giftFlowStyles.statusBody}>{summary.body}</Text>
      </View>
      <Text style={giftFlowStyles.statusCta}>{summary.cta}</Text>
    </View>
  );
}

function GiftQuoteInfo({ quote }: { quote: GiftOrderQuote }) {
  return (
    <View style={giftFlowStyles.quoteInfo}>
      <GiftQuoteInfoRow icon="bicycle" text={quote.providerRecommendation} />
      <GiftQuoteInfoRow
        icon="hourglass-outline"
        text={`${quote.etaConfidence} ETA confidence Â· recipient acceptance expires privately at ${new Date(quote.acceptanceExpiresAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
      />
      <GiftQuoteInfoRow icon="card" text={quote.paymentPolicy} />
      <GiftQuoteInfoRow icon="refresh-circle" text={quote.cancellationPolicy} />
      <GiftQuoteInfoRow icon="lock-closed" text={quote.recipientPrivacy} />
    </View>
  );
}

function GiftQuoteInfoRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={giftFlowStyles.quoteInfoRow}>
      <MiniPremiumIcon name={icon} tone="gold" size={28} iconSize={13} />
      <Text style={giftFlowStyles.quoteInfoText}>{text}</Text>
    </View>
  );
}

function GiftPriceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={giftFlowStyles.priceRow}>
      <Text style={giftFlowStyles.priceLabel}>{label}</Text>
      <Text style={giftFlowStyles.priceValue}>{value}</Text>
    </View>
  );
}

function GameSheet({
  visible,
  onClose,
  onPlay,
}: {
  visible: boolean;
  onClose: () => void;
  onPlay: (game: CoupleGame, prompt: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [customOpen, setCustomOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  useEffect(() => {
    if (visible) {
      setSelectedId(null);
      setPromptIndex(0);
      setCustomOpen(false);
      setCustomPrompt("");
    }
  }, [visible]);
  const selected = coupleGames.find((game) => game.id === selectedId);
  const selectGame = (game: CoupleGame) => {
    setSelectedId(game.id);
    setPromptIndex(0);
    setCustomOpen(false);
    setCustomPrompt("");
  };
  const nextPrompt = () => {
    if (selected)
      setPromptIndex((current) => (current + 1) % selected.prompts.length);
  };
  const sendCustom = () => {
    const value = customPrompt.trim();
    if (selected && value) onPlay(selected, `CUSTOM ROUND Â· ${value}`);
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, gameStyles.sheet]}>
        <SheetHeader
          title={selected?.title ?? "Couple games"}
          subtitle={
            selected
              ? "Preview a round before it enters the chat."
              : "Six simple games made for laughter and real conversation."
          }
          onClose={onClose}
        />
        {selected ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={gameStyles.detailScroll}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to all games"
              onPress={() => setSelectedId(null)}
              style={gameStyles.backButton}
            >
              <Ionicons name="arrow-back" size={16} color="#7B2137" />
              <Text style={gameStyles.backText}>All games</Text>
            </Pressable>
            <LinearGradient
              colors={["#FFF0F3", "#F8E6CF"]}
              style={gameStyles.detailHero}
            >
              <PremiumIcon
                name={selected.icon}
                tone={selected.tone}
                size={56}
                iconSize={25}
              />
              <View style={{ flex: 1 }}>
                <Text style={gameStyles.detailTag}>{selected.tag}</Text>
                <Text style={gameStyles.detailTitle}>{selected.title}</Text>
                <Text style={gameStyles.detailBody}>
                  {selected.description}
                </Text>
              </View>
            </LinearGradient>
            <View style={gameStyles.howCard}>
              <MiniPremiumIcon
                name="people"
                tone="gold"
                size={34}
                iconSize={16}
              />
              <View style={{ flex: 1 }}>
                <Text style={gameStyles.howLabel}>HOW TO PLAY</Text>
                <Text style={gameStyles.howText}>{selected.howToPlay}</Text>
              </View>
            </View>
            <View style={gameStyles.promptCard}>
              <View style={gameStyles.promptHeader}>
                <Text style={gameStyles.roundLabel}>
                  ROUND {promptIndex + 1} OF {selected.prompts.length}
                </Text>
                <View style={gameStyles.privatePill}>
                  <Ionicons name="lock-closed" size={10} color="#8B6A25" />
                  <Text style={gameStyles.privateText}>MUTUAL CHAT</Text>
                </View>
              </View>
              <Text style={gameStyles.promptText}>
                {selected.prompts[promptIndex]}
              </Text>
            </View>
            <View style={gameStyles.actionRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show another prompt"
                onPress={nextPrompt}
                style={gameStyles.secondaryButton}
              >
                <Ionicons name="refresh" size={17} color="#7B2137" />
                <Text style={gameStyles.secondaryText}>New prompt</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Send ${selected.title} round to chat`}
                onPress={() => onPlay(selected, selected.prompts[promptIndex]!)}
                style={gameStyles.primaryButton}
              >
                <Ionicons name="send" size={17} color="#FFF" />
                <Text style={gameStyles.primaryText}>Send this round</Text>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: customOpen }}
              accessibilityLabel="Create your own game prompt"
              onPress={() => setCustomOpen((value) => !value)}
              style={[
                gameStyles.customToggle,
                customOpen && gameStyles.customToggleOn,
              ]}
            >
              <MiniPremiumIcon
                name="create-outline"
                tone="rose"
                size={32}
                iconSize={15}
              />
              <View style={{ flex: 1 }}>
                <Text style={gameStyles.customToggleTitle}>
                  Write your own round
                </Text>
                <Text style={gameStyles.customToggleBody}>
                  Add a private question or challenge in your own words.
                </Text>
              </View>
              <Ionicons
                name={customOpen ? "chevron-up" : "chevron-down"}
                size={17}
                color="#8B213A"
              />
            </Pressable>
            {customOpen && (
              <View style={gameStyles.customCard}>
                <View style={gameStyles.customHeader}>
                  <View>
                    <Text style={gameStyles.customLabel}>CUSTOM PROMPT</Text>
                    <Text style={gameStyles.customHint}>
                      Keep it kind, mutual and comfortable.
                    </Text>
                  </View>
                  <Text style={gameStyles.customCount}>
                    {customPrompt.length}/220
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel="Custom game prompt"
                  value={customPrompt}
                  onChangeText={setCustomPrompt}
                  multiline
                  maxLength={220}
                  placeholder="Example: What tiny tradition would you love us to create together?"
                  placeholderTextColor="#927D83"
                  style={gameStyles.customInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send custom game round"
                  accessibilityState={{ disabled: !customPrompt.trim() }}
                  disabled={!customPrompt.trim()}
                  onPress={sendCustom}
                  style={[
                    gameStyles.customSend,
                    !customPrompt.trim() && gameStyles.customSendDisabled,
                  ]}
                >
                  <Ionicons name="send" size={15} color="#FFF" />
                  <Text style={gameStyles.customSendText}>
                    Send custom round
                  </Text>
                </Pressable>
              </View>
            )}
            <Text style={gameStyles.privacyNote}>
              This round appears as one clear card. Both people answer inside
              that same card.
            </Text>
          </ScrollView>
        ) : (
          <>
            <View style={gameStyles.hero}>
              <PremiumIcon
                name="game-controller"
                tone="gold"
                size={44}
                iconSize={20}
              />
              <View style={{ flex: 1 }}>
                <Text style={gameStyles.heroTitle}>
                  Play without leaving chat
                </Text>
                <Text style={gameStyles.heroBody}>
                  Choose a game, preview the exact prompt, then send only when
                  it feels right.
                </Text>
              </View>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={gameStyles.grid}
            >
              {coupleGames.map((game) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${game.title}`}
                  key={game.id}
                  onPress={() => selectGame(game)}
                  style={gameStyles.card}
                >
                  <PremiumIcon
                    name={game.icon}
                    tone={game.tone}
                    size={44}
                    iconSize={20}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={gameStyles.cardTag}>{game.tag}</Text>
                    <Text style={gameStyles.title}>{game.title}</Text>
                    <Text numberOfLines={2} style={gameStyles.body}>
                      {game.description}
                    </Text>
                  </View>
                  <View style={gameStyles.openButton}>
                    <Ionicons name="arrow-forward" size={16} color="#FFF" />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={gameStyles.privacyNote}>
              100 original Truth or Dare rounds Â· custom prompts Â· private to
              this mutual chat.
            </Text>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function CoupleSettingsSheet({
  visible,
  match,
  settings,
  onChange,
  onClose,
}: {
  visible: boolean;
  match: Match;
  settings: CoupleChatSettings;
  onChange: (settings: CoupleChatSettings) => void;
  onClose: () => void;
}) {
  const [nickname, setNickname] = useState(settings.nickname);
  const [status, setStatus] = useState("");
  useEffect(() => {
    if (visible) {
      setNickname(settings.nickname);
      setStatus("");
    }
  }, [visible, settings.nickname]);
  const activeTheme =
    coupleThemes.find((theme) => theme.name === settings.theme) ??
    coupleThemes[0]!;
  const saveNickname = () => {
    onChange({
      ...settings,
      nickname: nickname.trim(),
      theme: settings.theme || coupleThemes[0]!.name,
    });
    setStatus(
      nickname.trim()
        ? `${match.name} now appears as ${nickname.trim()} in this chat.`
        : "Nickname removed for this match.",
    );
  };
  const chooseTheme = (theme: (typeof coupleThemes)[number]) => {
    onChange({ ...settings, theme: theme.name });
    setStatus(`${theme.name} theme applied.`);
  };
  const retentionOptions = [
    {
      value: "keep" as const,
      label: "Keep messages",
      body: "Messages stay until someone deletes them.",
    },
    {
      value: "after_seen" as const,
      label: "Delete after seen",
      body: "New messages disappear once the recipient has seen them.",
    },
    {
      value: "24_hours" as const,
      label: "24 hours",
      body: "New messages disappear 24 hours after sending.",
    },
    {
      value: "7_days" as const,
      label: "7 days",
      body: "New messages disappear after one week.",
    },
  ];
  const chooseRetention = (
    retentionMode: CoupleChatSettings["retentionMode"],
  ) => {
    onChange({ ...settings, retentionMode });
    setStatus(
      retentionMode === "keep"
        ? "Messages will be kept."
        : "Privacy timer updated for new messages. Existing messages keep their current policy.",
    );
  };
  const toggleScreenshotAlerts = () => {
    onChange({ ...settings, screenshotAlerts: !settings.screenshotAlerts });
    setStatus(
      !settings.screenshotAlerts
        ? "Screenshot alerts turned on where the device supports detection."
        : "Screenshot alerts turned off for this chat.",
    );
  };
  const toggleConversationFlag = (
    key: "conversationPinned" | "conversationArchived",
  ) => {
    const next = !settings[key];
    onChange({ ...settings, [key]: next });
    setStatus(
      key === "conversationPinned"
        ? next
          ? "Conversation pinned to the top."
          : "Conversation unpinned."
        : next
          ? "Conversation moved to Archived. New messages can bring it back."
          : "Conversation restored to your inbox.",
    );
  };
  const setNotificationMode = (
    notificationMode: CoupleChatSettings["notificationMode"],
  ) => {
    onChange({
      ...settings,
      notificationMode,
      mutedUntil:
        notificationMode === "muted" ? settings.mutedUntil : undefined,
    });
    setStatus(
      notificationMode === "all"
        ? "All message notifications enabled."
        : notificationMode === "mentions"
          ? "Only important and direct notifications will alert you."
          : "Conversation muted.",
    );
  };
  const muteFor = (duration: "1h" | "8h" | "1w" | "forever") => {
    const durationMs =
      duration === "1h"
        ? 60 * 60 * 1000
        : duration === "8h"
          ? 8 * 60 * 60 * 1000
          : duration === "1w"
            ? 7 * 24 * 60 * 60 * 1000
            : undefined;
    onChange({
      ...settings,
      notificationMode: "muted",
      mutedUntil: durationMs ? Date.now() + durationMs : undefined,
    });
    setStatus(
      duration === "forever"
        ? "Muted until you turn notifications back on."
        : `Muted for ${duration === "1h" ? "1 hour" : duration === "8h" ? "8 hours" : "1 week"}.`,
    );
  };
  const notificationMuted = isConversationMuted(settings);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, { maxHeight: "92%" }]}>
        <SheetHeader
          title="Chat settings"
          subtitle="Inbox, notifications, appearance and privacy"
          onClose={onClose}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={coupleStyles.scrollContent}
        >
          <LinearGradient
            colors={[activeTheme.accent, activeTheme.panel]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={coupleStyles.preview}
          >
            {match.photo ? (
              <Image
                source={{ uri: match.photo }}
                style={coupleStyles.previewAvatar}
              />
            ) : (
              <View
                style={[coupleStyles.previewAvatar, chatStyles.initialAvatar]}
              >
                <Text style={chatStyles.initialAvatarText}>
                  {match.name[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={coupleStyles.previewName}>
                {nickname.trim() || match.name}
              </Text>
              <Text style={coupleStyles.previewMeta}>
                {match.name} Â· {activeTheme.name}
              </Text>
            </View>
            <PremiumIcon name="heart" tone="gold" size={44} iconSize={19} />
          </LinearGradient>
          <View style={coupleStyles.section}>
            <Text style={styles.sectionLabel}>NICKNAME</Text>
            <View style={coupleStyles.nicknameRow}>
              <TextInput
                value={nickname}
                onChangeText={setNickname}
                placeholder={`Nickname for ${match.name}`}
                placeholderTextColor="#806D7D"
                style={coupleStyles.nicknameInput}
              />
              <Pressable onPress={saveNickname} style={coupleStyles.saveButton}>
                <Text style={coupleStyles.saveText}>Save</Text>
              </Pressable>
            </View>
            <Text style={styles.helper}>Only you see this nickname.</Text>
          </View>
          <View style={coupleStyles.section}>
            <Text style={styles.sectionLabel}>CONVERSATION</Text>
            <View style={chatStyles.conversationPreferenceRow}>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.conversationPinned }}
                onPress={() => toggleConversationFlag("conversationPinned")}
                style={[
                  chatStyles.conversationPreference,
                  settings.conversationPinned &&
                    chatStyles.conversationPreferenceOn,
                ]}
              >
                <MiniPremiumIcon
                  name="pin"
                  tone={settings.conversationPinned ? "gold" : "dark"}
                  size={34}
                  iconSize={16}
                />
                <View style={{ flex: 1 }}>
                  <Text style={coupleStyles.privacyTitle}>
                    Pin conversation
                  </Text>
                  <Text style={coupleStyles.privacyBody}>
                    Keep this chat at the top of your inbox.
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: settings.conversationArchived }}
                onPress={() => toggleConversationFlag("conversationArchived")}
                style={[
                  chatStyles.conversationPreference,
                  settings.conversationArchived &&
                    chatStyles.conversationPreferenceOn,
                ]}
              >
                <MiniPremiumIcon
                  name="archive-outline"
                  tone={settings.conversationArchived ? "gold" : "dark"}
                  size={34}
                  iconSize={16}
                />
                <View style={{ flex: 1 }}>
                  <Text style={coupleStyles.privacyTitle}>
                    Archive conversation
                  </Text>
                  <Text style={coupleStyles.privacyBody}>
                    Hide it from the active inbox without deleting messages.
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
          <View style={coupleStyles.section}>
            <View style={shared.row}>
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
              <View style={shared.spacer} />
              <Text style={chatStyles.notificationStatus}>
                {notificationMuteLabel(settings)}
              </Text>
            </View>
            <View style={chatStyles.notificationModes}>
              {(
                [
                  { id: "all", label: "All", icon: "notifications" },
                  { id: "mentions", label: "Important", icon: "at" },
                  { id: "muted", label: "Muted", icon: "notifications-off" },
                ] as const
              ).map((item) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: settings.notificationMode === item.id,
                  }}
                  key={item.id}
                  onPress={() => setNotificationMode(item.id)}
                  style={[
                    chatStyles.notificationMode,
                    settings.notificationMode === item.id &&
                      chatStyles.notificationModeOn,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={
                      settings.notificationMode === item.id ? "#FFF" : "#745E65"
                    }
                  />
                  <Text
                    style={[
                      chatStyles.notificationModeText,
                      settings.notificationMode === item.id &&
                        chatStyles.notificationModeTextOn,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {notificationMuted && (
              <View style={chatStyles.muteDurationRow}>
                {(
                  [
                    { id: "1h", label: "1 hour" },
                    { id: "8h", label: "8 hours" },
                    { id: "1w", label: "1 week" },
                    { id: "forever", label: "Always" },
                  ] as const
                ).map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    key={item.id}
                    onPress={() => muteFor(item.id)}
                    style={chatStyles.muteDuration}
                  >
                    <Text style={chatStyles.muteDurationText}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            <Text style={styles.sectionLabel}>SOUND</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 7 }}
            >
              {(
                ["Destiny Chime", "Soft Rose", "Classic", "Silent"] as const
              ).map((sound) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: settings.notificationSound === sound,
                  }}
                  key={sound}
                  onPress={() => {
                    onChange({ ...settings, notificationSound: sound });
                    setStatus(`${sound} selected for this chat.`);
                  }}
                  style={[
                    chatStyles.soundChoice,
                    settings.notificationSound === sound &&
                      chatStyles.soundChoiceOn,
                  ]}
                >
                  <Ionicons
                    name={
                      sound === "Silent"
                        ? "volume-mute-outline"
                        : "musical-note-outline"
                    }
                    size={14}
                    color={
                      settings.notificationSound === sound ? "#FFF" : "#745E65"
                    }
                  />
                  <Text
                    style={[
                      chatStyles.soundChoiceText,
                      settings.notificationSound === sound &&
                        chatStyles.soundChoiceTextOn,
                    ]}
                  >
                    {sound}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={coupleStyles.section}>
            <Text style={styles.sectionLabel}>MESSAGE PRIVACY</Text>
            {retentionOptions.map((option) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{
                  checked: settings.retentionMode === option.value,
                }}
                key={option.value}
                onPress={() => chooseRetention(option.value)}
                style={[
                  coupleStyles.privacyChoice,
                  settings.retentionMode === option.value &&
                    coupleStyles.privacyChoiceOn,
                ]}
              >
                <MiniPremiumIcon
                  name={
                    settings.retentionMode === option.value
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  tone={
                    settings.retentionMode === option.value ? "gold" : "dark"
                  }
                  size={34}
                  iconSize={16}
                />
                <View style={{ flex: 1 }}>
                  <Text style={coupleStyles.privacyTitle}>{option.label}</Text>
                  <Text style={coupleStyles.privacyBody}>{option.body}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <View style={coupleStyles.section}>
            <Text style={styles.sectionLabel}>SCREENSHOT ALERTS</Text>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.screenshotAlerts }}
              onPress={toggleScreenshotAlerts}
              style={coupleStyles.captureCard}
            >
              <PremiumIcon
                name="scan-outline"
                tone={settings.screenshotAlerts ? "gold" : "dark"}
                size={44}
                iconSize={20}
              />
              <View style={{ flex: 1 }}>
                <Text style={coupleStyles.privacyTitle}>
                  Notify both people
                </Text>
                <Text style={coupleStyles.privacyBody}>
                  When a supported native device reports a capture, DestinyOne
                  records the event and alerts the other person.
                </Text>
              </View>
              <View
                style={[
                  coupleStyles.toggle,
                  settings.screenshotAlerts && coupleStyles.toggleOn,
                ]}
              >
                <View
                  style={[
                    coupleStyles.toggleKnob,
                    settings.screenshotAlerts && coupleStyles.toggleKnobOn,
                  ]}
                />
              </View>
            </Pressable>
            <View style={coupleStyles.limitCard}>
              <MiniPremiumIcon
                name="information-circle-outline"
                tone="rose"
                size={30}
                iconSize={14}
              />
              <Text style={coupleStyles.limitText}>
                Web browsers and some operating-system capture methods cannot be
                detected reliably. DestinyOne will never show a false
                â€œscreenshot takenâ€ alert.
              </Text>
            </View>
          </View>
          <View style={coupleStyles.section}>
            <View style={shared.row}>
              <Text style={styles.sectionLabel}>COUPLE THEME</Text>
              <View style={shared.spacer} />
              <Pressable
                onPress={() =>
                  setStatus(
                    "Custom colors and wallpaper will be available after secure sync is connected.",
                  )
                }
                style={premiumButtonStyles.smallGhost}
              >
                <Text style={discoveryStyles.manageText}>Custom</Text>
              </Pressable>
            </View>
            <View style={coupleStyles.themeGrid}>
              {coupleThemes.map((theme) => (
                <Pressable
                  key={theme.name}
                  onPress={() => chooseTheme(theme)}
                  style={[
                    coupleStyles.themeCard,
                    settings.theme === theme.name && {
                      borderColor: theme.accent,
                      backgroundColor: theme.soft,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[theme.accent, theme.panel]}
                    style={coupleStyles.themeDot}
                  />
                  <Text style={coupleStyles.themeName}>{theme.name}</Text>
                  {settings.theme === theme.name && (
                    <MiniPremiumIcon
                      name="checkmark-circle"
                      tone="gold"
                      size={28}
                      iconSize={13}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
          {!!status && (
            <View style={coupleStyles.statusCard}>
              <MiniPremiumIcon
                name="checkmark-circle"
                tone="gold"
                size={28}
                iconSize={13}
              />
              <Text style={coupleStyles.statusText}>{status}</Text>
            </View>
          )}
          <Text style={chatStyles.billingNote}>
            Preview settings save on this device. Production timers and
            supported capture events are enforced by the server for mutual
            matches.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SnapStudio({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (
    uri: string,
    filter: string,
    sticker: string,
    viewOnce: boolean,
  ) => void;
}) {
  const [uri, setUri] = useState("");
  const [filter, setFilter] = useState(snapFilters[0]!.name);
  const [sticker, setSticker] = useState("ðŸ’˜");
  const [viewOnce, setViewOnce] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (visible) {
      setUri("");
      setFilter(snapFilters[0]!.name);
      setSticker("ðŸ’˜");
      setViewOnce(true);
      setError("");
    }
  }, [visible]);
  const choose = async (camera = false) => {
    setError("");
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(
          camera
            ? "Camera permission is needed to create a Snap."
            : "Photo permission is needed to choose a Snap.",
        );
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
          });
      if (!result.canceled && result.assets[0]) {
        setUri(result.assets[0].uri);
        return;
      }
      setError("No photo selected. Choose camera or library to continue.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not open camera or photo library. Please try again.",
      );
    }
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={snapStyles.screen}>
        <View style={snapStyles.header}>
          <Pressable onPress={onClose} style={chatStyles.sheetClose}>
            <PremiumIcon name="close" tone="dark" size={38} iconSize={18} />
          </Pressable>
          <Text style={snapStyles.headerTitle}>DestinyOne Snap</Text>
          <Pressable
            disabled={!uri}
            onPress={() => onSend(uri, filter, sticker, viewOnce)}
            style={premiumButtonStyles.smallGhost}
          >
            <Text style={[snapStyles.sendText, !uri && { opacity: 0.35 }]}>
              Send
            </Text>
          </Pressable>
        </View>
        {uri ? (
          <View style={snapStyles.preview}>
            <Image source={{ uri }} style={styles.fill} />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: snapFilters.find(
                    (item) => item.name === filter,
                  )?.color,
                },
              ]}
            />
            <Text style={snapStyles.previewSticker}>{sticker}</Text>
            <View style={snapStyles.previewLabel}>
              <MiniPremiumIcon
                name={viewOnce ? "eye-off" : "time"}
                tone="dark"
                size={28}
                iconSize={13}
              />
              <Text style={snapStyles.previewLabelText}>
                {viewOnce ? "View once" : "Available for 24 hours"}
              </Text>
            </View>
          </View>
        ) : (
          <LinearGradient
            colors={["#250006", "#090002"]}
            style={snapStyles.empty}
          >
            <PremiumIcon name="camera" tone="ruby" size={74} iconSize={34} />
            <Text style={snapStyles.emptyTitle}>Create a playful moment</Text>
            <Text style={styles.helper}>
              Take a photo or choose one from your library.
            </Text>
            <View style={snapStyles.emptyActions}>
              <Button
                label="Camera"
                icon="camera"
                onPress={() => void choose(true)}
              />
              <Button
                label="Photo library"
                variant="secondary"
                icon="images"
                onPress={() => void choose(false)}
              />
            </View>
          </LinearGradient>
        )}
        {uri && (
          <View style={snapStyles.controls}>
            <Text style={styles.sectionLabel}>FILTERS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {snapFilters.map((item) => (
                <Pressable
                  key={item.name}
                  onPress={() => setFilter(item.name)}
                  style={[
                    snapStyles.filterChip,
                    filter === item.name && snapStyles.filterChipOn,
                  ]}
                >
                  <View
                    style={[
                      snapStyles.filterDot,
                      { backgroundColor: item.color },
                    ]}
                  />
                  <Text style={snapStyles.filterText}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.sectionLabel}>FUN STICKERS</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 14 }}
            >
              {faceEmojiOptions.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setSticker(item)}
                  style={[
                    snapStyles.emojiChoice,
                    sticker === item && snapStyles.emojiChoiceOn,
                  ]}
                >
                  <Text style={{ fontSize: 28 }}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setViewOnce((value) => !value)}
              style={snapStyles.viewOnce}
            >
              <MiniPremiumIcon
                name={viewOnce ? "checkmark-circle" : "ellipse-outline"}
                tone={viewOnce ? "gold" : "dark"}
                size={34}
                iconSize={16}
              />
              <View>
                <Text style={shared.label}>View once</Text>
                <Text style={styles.helper}>
                  A private snap that disappears after opening
                </Text>
              </View>
            </Pressable>
            <Button
              label="Replace photo"
              variant="secondary"
              icon="camera-reverse"
              onPress={() => void choose(true)}
            />
          </View>
        )}
        {!!error && (
          <View style={snapStyles.errorCard}>
            <MiniPremiumIcon
              name="alert-circle-outline"
              tone="ruby"
              size={28}
              iconSize={13}
            />
            <Text style={snapStyles.errorText}>{error}</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function FaceEmojiStudio({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (uri: string, emoji: string, filter: string) => void;
}) {
  const [uri, setUri] = useState("");
  const [emoji, setEmoji] = useState("ðŸ˜‚");
  const [filter, setFilter] = useState(snapFilters[5]!.name);
  const [error, setError] = useState("");
  const autoLaunch = useRef(false);
  useEffect(() => {
    if (visible) {
      autoLaunch.current = false;
      setUri("");
      setEmoji("ðŸ˜‚");
      setFilter(snapFilters[5]!.name);
      setError("");
    }
  }, [visible]);
  const capture = async (camera = true) => {
    setError("");
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError(
          camera
            ? "Camera permission is needed for Funny Cam."
            : "Photo permission is needed.",
        );
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.85,
            allowsEditing: true,
            aspect: [1, 1],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.85,
            allowsEditing: true,
            aspect: [1, 1],
          });
      if (!result.canceled && result.assets[0]) {
        setUri(result.assets[0].uri);
        return;
      }
      setError(
        "No face photo selected. Open camera or use gallery to create a custom emoji.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not open camera. Please try again or use gallery.",
      );
    }
  };
  useEffect(() => {
    if (!visible || uri || autoLaunch.current) return;
    autoLaunch.current = true;
    const timer = setTimeout(() => void capture(true), 180);
    return () => clearTimeout(timer);
  }, [visible, uri]);
  const activeColor =
    snapFilters.find((item) => item.name === filter)?.color ?? "transparent";
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={snapStyles.screen}>
        <View style={snapStyles.header}>
          <Pressable onPress={onClose} style={chatStyles.sheetClose}>
            <PremiumIcon name="close" tone="dark" size={38} iconSize={18} />
          </Pressable>
          <Text style={snapStyles.headerTitle}>Funny Cam</Text>
          <Pressable
            disabled={!uri}
            onPress={() => onSend(uri, emoji, filter)}
            style={premiumButtonStyles.smallGhost}
          >
            <Text style={[snapStyles.sendText, !uri && { opacity: 0.35 }]}>
              Send
            </Text>
          </Pressable>
        </View>
        {uri ? (
          <View style={[snapStyles.preview, { height: "50%" }]}>
            <Image source={{ uri }} style={styles.fill} />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: activeColor },
              ]}
            />
            <Text style={snapStyles.previewSticker}>{emoji}</Text>
            <View style={snapStyles.previewLabel}>
              <MiniPremiumIcon
                name="sparkles"
                tone="gold"
                size={28}
                iconSize={13}
              />
              <Text style={snapStyles.previewLabelText}>{filter}</Text>
            </View>
          </View>
        ) : (
          <LinearGradient
            colors={["#2B0007", "#090002"]}
            style={snapStyles.empty}
          >
            <PremiumIcon name="camera" tone="ruby" size={76} iconSize={35} />
            <Text style={snapStyles.emptyTitle}>Opening cameraâ€¦</Text>
            <Text style={[styles.helper, { textAlign: "center" }]}>
              Funny Cam starts with camera. If your browser blocks it, tap Open
              camera below.
            </Text>
            <View style={snapStyles.emptyActions}>
              <Button
                label="Open camera"
                icon="camera"
                onPress={() => void capture(true)}
              />
              <Button
                label="Use gallery"
                variant="secondary"
                icon="images"
                onPress={() => void capture(false)}
              />
            </View>
          </LinearGradient>
        )}
        <View style={snapStyles.controls}>
          <Text style={styles.sectionLabel}>
            {snapFilters.length} FUNNY CAMERA FILTERS
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {snapFilters.map((item) => (
              <Pressable
                key={item.name}
                onPress={() => setFilter(item.name)}
                style={[
                  snapStyles.filterChip,
                  filter === item.name && snapStyles.filterChipOn,
                ]}
              >
                <View
                  style={[
                    snapStyles.filterDot,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text style={snapStyles.filterText}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.sectionLabel}>CUSTOM FACE EMOJI / PROPS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {faceEmojiOptions.map((item) => (
              <Pressable
                key={item}
                onPress={() => setEmoji(item)}
                style={[
                  snapStyles.emojiChoice,
                  emoji === item && snapStyles.emojiChoiceOn,
                ]}
              >
                <Text style={{ fontSize: 29 }}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={chatStyles.privacyBanner}>
            <PremiumIcon
              name="shield-checkmark"
              tone="gold"
              size={38}
              iconSize={18}
            />
            <Text style={chatStyles.privacyBannerText}>
              Use only your own face. Funny Cam photos stay in chat and are not
              used for matching or ads.
            </Text>
          </View>
          {uri && (
            <Button
              label="Retake with camera"
              variant="secondary"
              icon="camera-reverse"
              onPress={() => void capture(true)}
            />
          )}{" "}
          {!!error && <Text style={styles.formError}>{error}</Text>}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

