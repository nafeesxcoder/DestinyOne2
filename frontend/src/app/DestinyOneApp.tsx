import { useEffect, useRef, useState, type ReactNode } from "react";
import { Image, Platform, Share, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi } from "../api/authApi";
import { profileApi } from "../api/profileApi";
import { matchApi } from "../api/matchApi";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts as usePoppins,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import {
  useFonts as useSatisfy,
  Satisfy_400Regular,
} from "@expo-google-fonts/satisfy";
import { LinearGradient } from "expo-linear-gradient"; // <-- Import added for background

import { Match, matches } from "../data";
import { colors } from "../theme";
import {
  ChatMessage,
  CoupleChatSettings,
  DatePlanStatus,
  DiscoverySignal,
  LocalReport,
  MatchFilters,
  OnboardingResumeScreen,
  ProfileDraft,
  RelationshipReflectionChoice,
  RelationshipReflectionRecord,
  RelationshipReminderRecord,
  RoseLedger,
  clearAppState,
  defaultCoupleChatSettings,
  defaultMatchFilters,
  initialPersistedState,
  loadAppState,
  saveAppState,
} from "../storage";
import * as Location from "expo-location";
import {
  allowsPreviewOtpFallback,
  appEnvironment,
  backendMode,
  backendRuntime,
  fetchCommunityRooms,
  fetchDailyMatches,
  fetchMatchingPoolStatus,
  isApiConfigured,
  joinCommunityRoom,
  loadCurrentMemberBootstrap,
  requestAccountDeletion,
  requiresRealBackend,
  submitModerationAppeal,
  submitSupportTicket,
  type MatchingPoolStatus,
  type SupportTopic,
} from "./adapters/previewMemberRuntime";
import { rankMatches } from "../domain/matching";
import { spendCoins } from "../domain/commerce";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { configureAnalyticsConsent, track } from "../lib/telemetry";
import {
  buildGiftFulfillmentPlan,
  createGiftIdempotencyKey,
  createPhysicalGiftOrder,
  digitalGiftWalletMode,
  estimateGiftOrderQuote,
  formatGiftMoney,
  giftOrderSummary,
  giftOrderingConfigured,
  openGiftOrderIssue,
  physicalGiftOrderingMode,
  recordGiftRecommendationFeedback,
  respondToPhysicalGiftOrder,
  searchGiftDeliveryAddresses,
  validateGiftDeliveryAddress,
  vouchRewardsMode,
  type GiftDeliveryAddress,
  type GiftOrderResponse,
} from "../features/gifts/adapters/previewGiftRuntime";
import { requestGiftConciergeV2 } from "../features/gifts/adapters/previewGiftConcierge";
import {
  fetchPersistedChatMessages as fetchPersistedChatMessagesPreview,
  fetchPersistedRelationshipJourney,
  persistBlock,
  persistChatMessage as persistChatMessagePreview,
  persistChatSettings,
  persistClearMatchingLearning,
  persistDatePlanStatus as persistDatePlanStatusPreview,
  persistDateProposal as persistDateProposalPreview,
  persistDateSafetyPlan,
  persistDiscoverySignal,
  persistIcebreakerAnswer,
  persistLiveLocationShare as persistLiveLocationSharePreview,
  persistMatchDecision,
  persistMatchFeedback,
  persistMatchingPreferences,
  persistMessageDelete as persistMessageDeletePreview,
  persistMessageEdit as persistMessageEditPreview,
  persistMessageUserState as persistMessageUserStatePreview,
  persistOnboardingProfile,
  persistPrivacySettings,
  persistProfileView,
  persistRelationshipBlueprint,
  persistRelationshipJourneyEvent,
  persistRelationshipReflection,
  persistRelationshipReminder,
  persistReport,
  persistUnmatch,
  subscribePersistedChatMessages as subscribePersistedChatMessagesPreview,
} from "./adapters/previewPersistence";
import { chatApi } from "../api/chatApi";
import { conversationIdFor, profileIdFor } from "../domain/matchIdentity";
import { previewEntitlementAllowed } from "../domain/monetizationOps";
import { usePreviewStoreBilling } from "./adapters/usePreviewStoreBilling";
import { type RelationshipJourneyEventName } from "../domain/relationshipLearning";
import { buildProfileCompletion } from "../domain/profileCompletion";
import { isDatePlanStatus } from "../domain/dateLifecycle";
import { memberNeedsOnboarding } from "../domain/memberBootstrap";
import {
  canCommitMemberMutation,
  evaluateMemberDataRuntime,
  memberMutationFailureMessage,
  type MemberMutationResult,
} from "../domain/memberDataRuntime";
import {
  buildCoupleModeAccess,
  coupleModeRoutes,
  guardCoupleModeRoute,
  initialCoupleModeState,
  reduceCoupleMode,
  type CoupleModeRoute,
  type CoupleModeState,
  type ExperienceMode,
} from "../domain/coupleMode";
import { createLocalCoupleModeRepository } from "./adapters/localCoupleModeRepository";
import {
  fetchCurrentCoupleConnectionHub as fetchCurrentCoupleConnectionHubPreview,
  respondToCoupleConnectionRequest as respondToCoupleConnectionRequestPreview,
  saveCoupleModeMemberProfile as saveCoupleModeMemberProfilePreview,
  searchCouplePartnerByPhone as searchCouplePartnerByPhonePreview,
  sendCoupleConnectionRequest as sendCoupleConnectionRequestPreview,
  setServerCoupleMode as setServerCoupleModePreview,
} from "./adapters/previewCoupleConnection";
import {
  type CoupleConnectionHub,
  type CouplePartnerSummary,
} from "../domain/coupleConnection";
import { coupleApi } from "../api/coupleApi";
import { searchChatGifCatalog } from "../domain/chatMediaCatalog";
import {
  applyMessageDeletion,
  applyMessageEdit,
} from "../domain/chatExperience";
import {
  onboardingScreens,
  previewScreens,
  previewStates,
  resumableOnboardingScreens,
  type PreviewState,
  type Screen,
} from "../app/navigation/types";
import {
  SplashScreen,
  WelcomeScreen,
} from "../features/launch/screens/LaunchScreens";
import {
  AuthScreen,
  OtpScreen,
  VerificationScreen,
} from "../features/access/screens/AccessScreens";
import { ModeSelectScreen } from "../features/onboarding/screens/ModeSelectScreen";
import {
  AlignmentScreen,
  IntentScreen,
  VibesScreen,
} from "../features/onboarding/screens/PreferenceScreens";
import { ProfileSetupScreen } from "../features/onboarding/screens/ProfileSetupScreen";
import { CoupleSetupScreen } from "../features/onboarding/screens/CoupleSetupScreen";
import { RelationshipReadinessScreen } from "../features/relationship/screens/RelationshipReadinessScreen";
import { RelationshipBlueprintScreen } from "../features/relationship/screens/RelationshipBlueprintScreen";
import { TwoPersonJourneyScreen } from "../features/relationship/screens/TwoPersonJourneyScreen";
import { DateSafetyConciergeScreen } from "../features/trust/screens/DateSafetyConciergeScreen";
import { TrustedCircleScreen } from "../features/trust/screens/TrustedCircleScreen";
import {
  SafetyActions,
  SafetyCenter,
  type SafetyTool,
} from "../features/trust/screens/SafetyScreens";
import { VerificationHubScreen } from "../features/trust/screens/VerificationHubScreen";
import { CityCommunityRoomsScreen } from "../features/community/screens/CityCommunityRoomsScreen";
import { ExploreHubScreen } from "../features/discovery/screens/ExploreHubScreen";
import { LikesScreen } from "../features/discovery/screens/LikesScreen";
import { HomeScreen } from "../features/discovery/screens/HomeScreen";
import { CoupleHomeScreen } from "../features/relationship/screens/CoupleHomeScreen";
import { RelationshipCoachScreen } from "../features/relationship/screens/RelationshipCoachScreen";
import { ProfileScreen } from "../features/profile/screens/ProfileScreen";
import { SupportCenterScreen } from "../features/support/screens/SupportCenterScreen";
import { DiscoveryCenterScreen } from "../features/discovery/screens/DiscoveryCenterScreen";
import { MatchDetailScreen } from "../features/discovery/screens/MatchDetailScreen";
import {
  IcebreakerScreen,
  MutualMatchScreen,
} from "../features/discovery/screens/MatchJourneyScreens";
import { ExecutiveCircleScreen } from "../features/executive/ExecutiveCircleScreen";
import { AdminModerationPanelScreen } from "../features/admin/AdminModerationPanelScreen";
import { DatePlannerScreen } from "../features/dates/DatePlannerScreen";
import {
  ChatScreen,
  physicalGifts,
  RoseComposer,
  RoseReceivedPopup,
  type CoupleLaunchTool,
  type PhysicalGift,
  type RoseAvailability,
  type RosePopupPayload,
} from "../features/chat/ChatFeature";
import { GiftMarketplace } from "../features/gifts/GiftMarketplaceScreen";
import {
  EventsHub,
  buildMarketplaceSnapshot,
  datePackages,
  eventExperiences,
  launchMarketplaceCoverage,
  placeCities,
  placeDirectory,
  placeKinds,
  type PlaceItem,
} from "../features/marketplace/EventsHubScreen";
import { Pricing } from "../features/pricing/PricingScreen";
import {
  AppNoticeSheet,
  type AppNotice,
} from "../components/feedback/AppNoticeSheet";
import { ReferralWelcomeOffer } from "../features/referrals/ReferralWelcomeOffer";

/* =========================================================
   PREMIUM BACKGROUND (MATCHES SPLASH SCREEN EXACTLY)
   ========================================================= */

function PremiumBackground({ children }: { children: ReactNode }) {
  return (
    <LinearGradient
      colors={[
        "#FFF8F7",
        "#FFECEF",
        "#FFDDE4",
        "#FBC8D1",
        "#F8B9C4",
        "#FFE8EB",
        "#FFF7F5",
      ]}
      locations={[0, 0.15, 0.32, 0.52, 0.68, 0.84, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flex: 1,
        overflow: "hidden",
      }}
    >
      {/* Soft red glow */}
      <LinearGradient
        colors={[
          "rgba(229,9,47,0.13)",
          "rgba(229,9,47,0.05)",
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          top: -100,
          left: -120,
          width: 600,
          height: 520,
          transform: [{ rotate: "-12deg" }],
        }}
      />

      {/* Right side red atmosphere */}
      <LinearGradient
        colors={[
          "rgba(155,0,28,0.02)",
          "rgba(155,0,28,0.10)",
          "rgba(229,9,47,0.16)",
          "rgba(255,255,255,0)",
        ]}
        start={{ x: 1, y: 0.5 }}
        end={{ x: 0, y: 0.5 }}
        style={{
          position: "absolute",
          top: 80,
          right: -220,
          width: 620,
          height: 520,
          transform: [{ rotate: "12deg" }],
        }}
      />

      {/* Bottom red atmosphere */}
      <LinearGradient
        colors={[
          "rgba(255,255,255,0)",
          "rgba(229,9,47,0.04)",
          "rgba(128,0,20,0.14)",
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          bottom: -160,
          left: -80,
          right: -80,
          height: 430,
        }}
      />

      {children}
    </LinearGradient>
  );
}

const memberDataRuntime = evaluateMemberDataRuntime(backendRuntime.mode);
function getPreviewScreen(): Screen | undefined {
  if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  if (backendRuntime.mode !== "demo" && params.get("previewAccess") !== "1")
    return undefined;
  const requested = params.get("preview") as Screen | null;
  return requested && previewScreens.includes(requested)
    ? requested
    : undefined;
}

function getGoogleCallback(): { email: string; fullName: string } | undefined {
  if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  if (params.get("provider") !== "google") return undefined;
  const email = params.get("email");
  if (!email) return undefined;
  return { email, fullName: params.get("fullName") ?? "" };
}

function getPreviewState(): PreviewState | undefined {
  if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  if (backendRuntime.mode !== "demo" && params.get("previewAccess") !== "1")
    return undefined;
  const requested = params.get("previewState") as PreviewState | null;
  return requested && previewStates.includes(requested) ? requested : undefined;
}
const showcasePreviewScreen = getPreviewScreen();
const showcasePreviewState = getPreviewState();
const googleCallbackData = getGoogleCallback();
const isPreviewAccessMode =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  (window.location.hostname.endsWith(".chatgpt.site") ||
    window.location.hostname.endsWith(".workers.dev") ||
    new URLSearchParams(window.location.search).get("previewAccess") === "1");
const showcaseOnboardingScreens = onboardingScreens;
const onboardingResumeScreens = resumableOnboardingScreens;
const showcaseExperienceMode: ExperienceMode =
  Platform.OS === "web" &&
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("mode") === "couple"
    ? "couple"
    : "seeking";
const showcaseMemberProfile: ProfileDraft = {
  firstName: "Aarav",
  gender: "man",
  age: "30",
  city: "Toronto, ON",
  height: "5 ft 10 in",
  profession: "Product Strategist",
  religion: "Hindu",
  community: "Punjabi",
};
const isCustomerShowcase = Boolean(
  showcasePreviewScreen &&
  !showcaseOnboardingScreens.has(showcasePreviewScreen),
);
const showcaseDateStatus: DatePlanStatus | undefined =
  showcasePreviewState === "chat-date-accepted"
    ? "accepted"
    : showcasePreviewState === "chat-date-cancelled"
      ? "cancelled"
      : showcasePreviewState === "chat-date-no-show"
        ? "no_show"
        : showcasePreviewState === "chat-date-unresponsive"
          ? "unresponsive"
          : undefined;
const showcaseGiftQuote = estimateGiftOrderQuote({
  productId: "ruby-roses",
  recipientId: matches[0]!.id,
  recipientAddressMode: "recipient_supplied_private",
});
const showcaseChatSeed: Record<string, ChatMessage[]> =
  showcasePreviewState === "chat-gift-recipient"
    ? {
        [matches[0]!.id]: [
          {
            id: "preview-recipient-gift",
            mine: false,
            type: "gift",
            text: "From Anika: â€œA little reminder that Iâ€™m thinking of you â¤ï¸â€",
            gift: {
              name: "Velvet Ruby Roses",
              emoji: "ðŸŒ¹",
              physical: true,
              orderId: "demo-gift-recipient-preview",
              deliveryStatus: "recipient_pending",
              recipientAddressMode: "recipient_supplied_private",
              etaLabel: showcaseGiftQuote.etaLabel,
              provider: "DestinyOne delivery",
              totalCents: showcaseGiftQuote.totalCents,
              acceptanceWindowMinutes: 30,
              acceptanceExpiresAt: new Date(
                Date.now() + 30 * 60 * 1000,
              ).toISOString(),
              steps: [
                {
                  key: "request",
                  label: "Gift request",
                  body: "Sender chose the gift and note.",
                  status: "done",
                },
                {
                  key: "recipient",
                  label: "Private acceptance",
                  body: "Confirm or decline privately.",
                  status: "active",
                },
                {
                  key: "payment",
                  label: "Secure payment",
                  body: "Payment begins only after acceptance.",
                  status: "pending",
                },
                {
                  key: "partner",
                  label: "Partner prepares",
                  body: "A trusted local partner prepares the gift.",
                  status: "pending",
                },
                {
                  key: "delivery",
                  label: "Courier delivery",
                  body: `Estimated arrival ${showcaseGiftQuote.etaLabel}.`,
                  status: "pending",
                },
              ],
            },
            createdAt: Date.now() - 120000,
            status: "read",
          },
        ],
      }
    : showcaseDateStatus
      ? {
          [matches[0]!.id]: [
            {
              id: "preview-date-lifecycle",
              type: "date",
              date: {
                venue: "Public-first dinner",
                category: "Restaurant",
                area: "Downtown Â· near your profile city",
                time: "Saturday Â· 7:00 PM",
                safetyCheckIn: true,
                planStatus: showcaseDateStatus,
              },
              createdAt: Date.now() - 3600000,
              status: "read",
            },
          ],
        }
      : {};
type MemberMatchLoadState = "preview" | "loading" | "ready" | "error";
const icebreakerQuestion = "Coffee date â˜• or road trip ðŸš—?";
const todayKey = () => new Date().toISOString().slice(0, 10);
const coupleModeRepository = createLocalCoupleModeRepository(AsyncStorage);
const showcaseCoupleModeState: CoupleModeState =
  showcaseExperienceMode === "couple"
    ? reduceCoupleMode(
        reduceCoupleMode(initialCoupleModeState, {
          type: "select_experience",
          mode: "couple",
          at: new Date().toISOString(),
        }),
        {
          type: "link_partner",
          connectionId: "preview-couple",
          partner: { memberId: "preview-partner", displayName: "My Partner" },
          at: new Date().toISOString(),
        },
      )
    : initialCoupleModeState;
function isCoupleModeRoute(screen: Screen): screen is Screen & CoupleModeRoute {
  return (coupleModeRoutes as readonly string[]).includes(screen);
}
function getRoseAvailability(ledger: RoseLedger): RoseAvailability {
  const today = todayKey();
  return {
    freeAvailable: ledger.dayKey !== today || !ledger.freeUsed,
    paidCredits: ledger.paidCredits,
  };
}
function mergeChatMessageList(current: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  [...current, ...incoming].forEach((message) => byId.set(message.id, message));
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}
function isChatMessage(value: unknown): value is ChatMessage {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as ChatMessage).id === "string" &&
    typeof (value as ChatMessage).createdAt === "number"
  );
}
function isIcebreakerWaitingForOtherAnswer(data: unknown) {
  return (
    !!data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    (
      data as {
        unlocked?: unknown;
      }
    ).unlocked === false
  );
}
function isMutualMatchDecision(data: unknown) {
  return (
    !!data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    (
      data as {
        matched?: unknown;
      }
    ).matched === true
  );
}
function backendDateStatus(value: unknown): DatePlanStatus {
  return isDatePlanStatus(value) ? value : "proposed";
}
function intentFromDatabase(value: string) {
  return value === "marriage"
    ? "Marriage"
    : value === "long_term"
      ? "Long-term Relationship"
      : "Long-term, leading to Marriage";
}
function DestinyOneApp() {
  // Local state exists only for deterministic frontend preview/offline UX.
  // Production behavior is supplied later through the typed AWS ports.
  const storeBilling = usePreviewStoreBilling();
  const [poppins] = usePoppins({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [satisfy] = useSatisfy({ Satisfy_400Regular });
  const [screen, setScreen] = useState<Screen>(
    () => showcasePreviewScreen ?? "splash",
  );
  const [selected, setSelected] = useState<Match>(matches[0]!);
  const [datePlanPreset, setDatePlanPreset] = useState<PlaceItem | null>(null);
  const [vibeList, setVibeList] = useState<string[]>([]);
  const [intent, setIntent] = useState("Long-term, leading to Marriage");
  const [alignment, setAlignment] = useState<Record<string, string>>({});
  const [verified, setVerified] = useState(isCustomerShowcase);
  const [authDestination, setAuthDestination] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const onboardingCompleteRef = useRef(false);
  const [serverDiscoveredMatches, setServerDiscoveredMatches] = useState<
    Match[] | null
  >(null);
  const [onboardingComplete, setOnboardingComplete] =
    useState(isCustomerShowcase);
  const [profileReminderShownAt, setProfileReminderShownAt] = useState(
    initialPersistedState.profileReminderShownAt,
  );
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(
    isCustomerShowcase
      ? showcaseMemberProfile
      : initialPersistedState.profileDraft,
  );
  const [chatMessages, setChatMessages] =
    useState<Record<string, ChatMessage[]>>(showcaseChatSeed);
  const [chatDrafts, setChatDrafts] = useState<Record<string, string>>({});
  const [coinBalance, setCoinBalance] = useState(
    memberDataRuntime.initialCoinBalance,
  );
  const [profilePhotos, setProfilePhotos] = useState<string[]>([]);
  const [selfieUri, setSelfieUri] = useState("");
  const [voiceIntroUri, setVoiceIntroUri] = useState("");
  const [vouches, setVouches] = useState<string[]>([]);
  const [discoverySignals, setDiscoverySignals] = useState<DiscoverySignal[]>(
    [],
  );
  const [smartDiscovery, setSmartDiscovery] = useState(true);
  const [crossedPaths, setCrossedPaths] = useState(false);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [reports, setReports] = useState<LocalReport[]>([]);
  const [safeCheckIns, setSafeCheckIns] = useState<string[]>([]);
  const [matchFilters, setMatchFilters] =
    useState<MatchFilters>(defaultMatchFilters);
  const [roseLedger, setRoseLedger] = useState<RoseLedger>(
    initialPersistedState.roseLedger,
  );
  const [roseTarget, setRoseTarget] = useState<Match | null>(null);
  const [rosePopup, setRosePopup] = useState<RosePopupPayload | null>(null);
  const [appNotice, setAppNotice] = useState<AppNotice | null>(null);
  const [referralOfferOpen, setReferralOfferOpen] = useState(
    showcasePreviewState === "profile-referral",
  );
  const [referralCode] = useState(
    () => `D1-${Date.now().toString(36).slice(-6).toUpperCase()}`,
  );
  const [detailSafetyOpen, setDetailSafetyOpen] = useState(
    showcasePreviewState === "match-safety",
  );
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [profileViewNotifiedIds, setProfileViewNotifiedIds] = useState<
    string[]
  >([]);
  const [lastSeenVisible, setLastSeenVisible] = useState(
    initialPersistedState.lastSeenVisible,
  );
  const [analyticsConsent, setAnalyticsConsent] = useState(
    initialPersistedState.analyticsConsent,
  );
  const [chatSettings, setChatSettings] = useState<
    Record<string, CoupleChatSettings>
  >(initialPersistedState.chatSettings);
  const [relationshipReflections, setRelationshipReflections] = useState<
    Record<string, RelationshipReflectionRecord>
  >(initialPersistedState.relationshipReflections);
  const [relationshipReminders, setRelationshipReminders] = useState<
    Record<string, RelationshipReminderRecord>
  >(initialPersistedState.relationshipReminders);
  const [serverMatches, setServerMatches] = useState<Match[] | null>(
    isPreviewAccessMode || memberDataRuntime.allowsMockMatches ? null : [],
  );
  const [matchLoadState, setMatchLoadState] = useState<MemberMatchLoadState>(
    isPreviewAccessMode || memberDataRuntime.allowsMockMatches
      ? "preview"
      : "loading",
  );
  const [matchingPoolStatus, setMatchingPoolStatus] =
    useState<MatchingPoolStatus | null>(null);
  const [coupleMode, setCoupleMode] = useState<CoupleModeState>(
    showcaseCoupleModeState,
  );
  const [coupleHub, setCoupleHub] = useState<CoupleConnectionHub>({
    experienceMode: showcaseExperienceMode,
    connection: null,
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [chatLaunchTool, setChatLaunchTool] = useState<CoupleLaunchTool>(null);
  const [hydrated, setHydrated] = useState(false);
  const couplePartnerName =
    coupleMode.connection.partner?.displayName.trim() || "My Partner";
  const couplePartner: Match = {
    ...matches[0]!,
    id: `couple-${coupleMode.connection.connectionId ?? "space"}`,
    profileId: coupleMode.connection.partner?.memberId,
    matchId: coupleMode.connection.connectionId ?? undefined,
    name: couplePartnerName,
    city: profileDraft.city || "Private couple space",
    profession: "Your partner",
    intent: "Committed relationship",
    match: "Exceptional Match",
    vibes: ["Together", "Private", "Intentional"],
    photo: "",
    photos: [],
  };
  const conversationPartner =
    coupleMode.experienceMode === "couple" ? couplePartner : selected;
  const coupleAccess = buildCoupleModeAccess(coupleMode);
  const applyCoupleHub = (hub: CoupleConnectionHub) => {
    setCoupleHub(hub);
    if (!hub.connection) {
      if (hub.experienceMode === "couple")
        setCoupleMode((current) =>
          current.experienceMode === "couple"
            ? current
            : reduceCoupleMode(current, {
                type: "select_experience",
                mode: "couple",
                at: new Date().toISOString(),
              }),
        );
      return;
    }
    const connection = hub.connection;
    setCoupleMode((current) => {
      if (
        current.connection.status === "active" &&
        current.connection.connectionId === connection.connectionId
      )
        return current;
      const at = new Date().toISOString();
      const inCoupleMode =
        current.experienceMode === "couple"
          ? current
          : reduceCoupleMode(current, {
              type: "select_experience",
              mode: "couple",
              at,
            });
      return reduceCoupleMode(inCoupleMode, {
        type: "link_partner",
        connectionId: connection.connectionId,
        partner: {
          memberId: connection.partnerMemberId,
          displayName: connection.partnerDisplayName,
        },
        at,
      });
    });
  };
  const refreshServerMatches = async () => {
    if (memberDataRuntime.source !== "server") return;
    setMatchLoadState("loading");
    try {
      const [daily, pool] = await Promise.all([
        fetchDailyMatches(5),
        fetchMatchingPoolStatus(),
      ]);
      setServerMatches(daily ?? []);
      setMatchingPoolStatus(pool);
      setMatchLoadState("ready");
    } catch (error) {
      setServerMatches([]);
      setMatchLoadState("error");
      setAppNotice({
        title: "Matches unavailable",
        body:
          error instanceof Error
            ? error.message
            : "Your curated matches could not be loaded securely. Please try again.",
        icon: "cloud-offline-outline",
        tone: "ruby",
      });
    }
  };
  useEffect(() => {
    let active = true;
    const started = Date.now();
    Promise.all([loadAppState(), coupleModeRepository.load()]).then(
      async ([saved, savedCoupleMode]) => {
        if (!active) return;
        let nextScreen: Screen = "welcome";
        if (memberDataRuntime.allowsLocalHydration) {
          if (!showcasePreviewScreen) {
            setCoupleMode(savedCoupleMode);
            setAuthDestination(saved.authDestination);
            setVerified(saved.verified);
            setProfileDraft({
              ...initialPersistedState.profileDraft,
              ...saved.profileDraft,
            });
            setVibeList(saved.vibes);
            setIntent(saved.intent);
            setAlignment(saved.alignment);
            setChatMessages(saved.chats);
            setCoinBalance(saved.coinBalance);
            setProfilePhotos(saved.photos);
            setSelfieUri(saved.selfieUri);
            setVoiceIntroUri(saved.voiceIntroUri);
            setVouches(saved.vouches);
            setDiscoverySignals(saved.discoverySignals);
            setSmartDiscovery(saved.smartDiscovery);
            setCrossedPaths(saved.crossedPaths);
            setBlockedIds(saved.blockedIds);
            setReports(saved.reports);
            setSafeCheckIns(saved.safeCheckIns);
            setMatchFilters({ ...defaultMatchFilters, ...saved.matchFilters });
            setRoseLedger({
              ...initialPersistedState.roseLedger,
              ...saved.roseLedger,
            });
            setLastSeenVisible(saved.lastSeenVisible ?? true);
            setAnalyticsConsent(saved.analyticsConsent ?? false);
            setChatSettings(saved.chatSettings ?? {});
            setRelationshipReflections(saved.relationshipReflections ?? {});
            setRelationshipReminders(saved.relationshipReminders ?? {});
            setProfileReminderShownAt(saved.profileReminderShownAt ?? 0);
            nextScreen = saved.onboardingComplete
              ? "home"
              : saved.onboardingScreen;
            setOnboardingComplete(saved.onboardingComplete);
          }
        }
        if (memberDataRuntime.source === "server") {
          try {
            const member = await loadCurrentMemberBootstrap();
            const needsOnboarding = member
              ? memberNeedsOnboarding(member)
              : false;
            nextScreen = !member
              ? "welcome"
              : needsOnboarding
                ? "profileSetup"
                : "home";
            setOnboardingComplete(Boolean(member && !needsOnboarding));
            setVerified(member?.profile?.verified === true);
            if (!member) setAuthDestination("");
            if (member?.profile) {
              setProfileDraft((current) => ({
                ...current,
                firstName: member.profile?.first_name ?? "",
                gender: member.matchAttributes?.gender ?? current.gender,
                city: member.profile?.city ?? "",
                profession: member.profile?.profession ?? "",
                religion: member.profile?.religion ?? "",
                community: member.profile?.community ?? "",
              }));
            }
            if (member?.matchingPreferences) {
              const serverPreferences = member.matchingPreferences;
              setMatchFilters({
                lookingFor:
                  serverPreferences.looking_for === "women"
                    ? "Women"
                    : serverPreferences.looking_for === "men"
                      ? "Men"
                      : "Everyone",
                minAge: serverPreferences.min_age,
                maxAge: serverPreferences.max_age,
                cities: serverPreferences.cities,
                intents: serverPreferences.intents.map(intentFromDatabase),
                mustHaveVibes: serverPreferences.must_have_vibes,
                familyPriority: serverPreferences.family_priority,
                children: serverPreferences.children,
                marriageTimeline: serverPreferences.marriage_timeline,
                relocation: serverPreferences.relocation,
                distancePreference: serverPreferences.distance_preference,
              });
              setSmartDiscovery(serverPreferences.smart_discovery);
            }
            if (member && !needsOnboarding) {
              await refreshServerMatches();
            } else {
              setMatchLoadState("ready");
            }
          } catch (error) {
            nextScreen = "welcome";
            setOnboardingComplete(false);
            setVerified(false);
            setMatchLoadState("error");
            setAppNotice({
              title: "Secure sign-in required",
              body:
                error instanceof Error
                  ? error.message
                  : "The production backend could not restore your session.",
              icon: "shield-outline",
              tone: "ruby",
            });
          }
        }
        if (googleCallbackData) {
          setAuthDestination(googleCallbackData.email);
          setAuthPassword("");
          nextScreen = "otp";
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", window.location.pathname);
          }
        }

        try {
          const savedToken = await AsyncStorage.getItem(
            "destinyone_access_token",
          );
          if (savedToken) {
            const me = await authApi.me(savedToken);
            setAccessToken(savedToken);
            const profileData = await profileApi.getMyProfile(savedToken);
            try {
              const discoverResult = await profileApi.discoverMatches(
                savedToken,
                20,
              );
              if (discoverResult.matches)
                setServerDiscoveredMatches(discoverResult.matches);
            } catch {
              setServerDiscoveredMatches([]);
            }
            if (profileData.profile) {
              setProfileDraft((current) => ({
                ...current,
                firstName: profileData.profile.first_name ?? current.firstName,
                gender: profileData.profile.gender ?? current.gender,
                age: profileData.profile.age
                  ? String(profileData.profile.age)
                  : current.age,
                height: profileData.profile.height ?? current.height,
                city: profileData.profile.city ?? current.city,
                profession:
                  profileData.profile.profession ?? current.profession,
                religion: profileData.profile.religion ?? current.religion,
                community: profileData.profile.community ?? current.community,
              }));
              setVerified(!!profileData.profile.verified);
            }
            if (profileData.photos?.length)
              setProfilePhotos(profileData.photos);
            if (profileData.vibes?.length) setVibeList(profileData.vibes);
            if (profileData.intent?.intent)
              setIntent(profileData.intent.intent);
            const onboardingDone = !!profileData.profile?.onboarding_complete;
            setOnboardingComplete(onboardingDone);
            nextScreen = onboardingDone ? "home" : "profileSetup";
            setAuthDestination(me.user.email || me.user.phone || "");
          }
        } catch (error) {
          console.log("Session restore failed:", error);
          setAppNotice({
            title: "Session restore failed",
            body:
              error instanceof Error
                ? error.message
                : "Could not reach the DestinyOne server.",
            icon: "cloud-offline-outline",
            tone: "ruby",
          });
          await AsyncStorage.removeItem("destinyone_access_token");
          await AsyncStorage.removeItem("destinyone_refresh_token");
        }
        const remaining = Math.max(0, 3000 - (Date.now() - started));
        ``;
        setTimeout(() => {
          if (active) {
            setScreen(showcasePreviewScreen ?? nextScreen);
            setHydrated(true);
          }
        }, remaining);
      },
    );
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!hydrated || !memberDataRuntime.allowsLocalPersistence) return;
    if (showcasePreviewScreen) return;
    const timer = setTimeout(() => {
      const onboardingScreen = (
        onboardingResumeScreens.has(screen) ? screen : "welcome"
      ) as OnboardingResumeScreen;
      void saveAppState({
        onboardingComplete,
        onboardingScreen,
        profileReminderShownAt,
        authDestination,
        verified,
        profileDraft,
        vibes: vibeList,
        intent,
        alignment,
        chats: chatMessages,
        coinBalance,
        photos: profilePhotos,
        selfieUri,
        voiceIntroUri,
        vouches,
        discoverySignals,
        smartDiscovery,
        crossedPaths,
        blockedIds,
        reports,
        safeCheckIns,
        matchFilters,
        roseLedger,
        lastSeenVisible,
        analyticsConsent,
        chatSettings,
        relationshipReflections,
        relationshipReminders,
      });
      void coupleModeRepository.save(coupleMode);
    }, 250);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    onboardingComplete,
    screen,
    profileReminderShownAt,
    authDestination,
    verified,
    profileDraft,
    vibeList,
    intent,
    alignment,
    chatMessages,
    coinBalance,
    profilePhotos,
    selfieUri,
    voiceIntroUri,
    vouches,
    discoverySignals,
    smartDiscovery,
    crossedPaths,
    blockedIds,
    reports,
    safeCheckIns,
    matchFilters,
    roseLedger,
    lastSeenVisible,
    analyticsConsent,
    chatSettings,
    relationshipReflections,
    relationshipReminders,
    coupleMode,
  ]);
  useEffect(() => {
    if (
      !hydrated ||
      !onboardingComplete ||
      showcasePreviewScreen ||
      appNotice ||
      !["home", "explore", "profile"].includes(screen)
    )
      return;
    const completion = buildProfileCompletion({
      profile: profileDraft,
      verified,
      photoCount: profilePhotos.length,
      hasVoiceIntro: !!voiceIntroUri,
      vouchCount: vouches.length,
      vibeCount: vibeList.length,
      intent,
      lastReminderShownAt: profileReminderShownAt,
    });
    if (!completion.reminderDue) return;
    const timer = setTimeout(() => {
      setProfileReminderShownAt(Date.now());
      setAppNotice({
        title: completion.reminderTitle,
        body: completion.reminderBody,
        icon: "person-circle-outline",
        tone: "gold",
        actionLabel: "Complete profile",
        actionScreen: "profile",
      });
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    onboardingComplete,
    screen,
    appNotice,
    profileDraft,
    verified,
    profilePhotos.length,
    voiceIntroUri,
    vouches.length,
    vibeList.length,
    intent,
    profileReminderShownAt,
  ]);
  useEffect(() => {
    configureAnalyticsConsent(hydrated && analyticsConsent, {
      platform:
        Platform.OS === "ios" || Platform.OS === "android"
          ? Platform.OS
          : "web",
      appVersion: "1.0.0",
      buildVariant:
        appEnvironment === "production" ? "production" : "development",
    });
  }, [hydrated, analyticsConsent]);
  useEffect(() => {
    if (!hydrated) return;
    track("screen_viewed", { screen_key: screen });
    if (screen === "welcome")
      track("onboarding_started", { screen_key: "welcome" });
    if (screen === "pricing")
      track("membership_viewed", { screen_key: "pricing" });
  }, [hydrated, screen]);
  useEffect(() => {
    if (!hydrated || !["coupleSetup", "home", "profile"].includes(screen))
      return;
    let active = true;
    const sync = () =>
      void (
        accessToken
          ? coupleApi.getHub(accessToken)
          : fetchCurrentCoupleConnectionHubPreview()
      )
        .then((hub) => {
          if (active) applyCoupleHub(hub);
        })
        .catch(() => undefined);
    sync();
    const timer = setInterval(
      sync,
      coupleMode.experienceMode === "couple" ? 8000 : 60000,
    );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [hydrated, coupleMode.experienceMode, screen, accessToken]);
  useEffect(() => {
    if (coupleMode.experienceMode !== "couple" || !isCoupleModeRoute(screen))
      return;
    const decision = guardCoupleModeRoute(coupleMode, screen);
    if (!decision.allowed && decision.resolved !== screen)
      setScreen(decision.resolved as Screen);
  }, [coupleMode, screen]);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen]);
  useEffect(() => {
    if (!hydrated || screen !== "chat") return;
    const matchId = conversationPartner.id;
    const backendMatchId = conversationIdFor(conversationPartner);
    let active = true;
    void Promise.all([
      fetchPersistedChatMessages(backendMatchId),
      fetchPersistedRelationshipJourney(backendMatchId),
    ]).then(([messages, journeyData]) => {
      if (!active) return;
      const journey =
        journeyData &&
        typeof journeyData === "object" &&
        !Array.isArray(journeyData)
          ? (journeyData as {
              proposal?: unknown;
              reflection?: unknown;
              reminder?: unknown;
            })
          : null;
      const proposal =
        journey?.proposal &&
        typeof journey.proposal === "object" &&
        !Array.isArray(journey.proposal)
          ? (journey.proposal as {
              id?: unknown;
              status?: unknown;
            })
          : null;
      const reflection =
        journey?.reflection &&
        typeof journey.reflection === "object" &&
        !Array.isArray(journey.reflection)
          ? (journey.reflection as {
              choice?: unknown;
              use_for_matching?: unknown;
              created_at?: unknown;
              updated_at?: unknown;
            })
          : null;
      const reminder =
        journey?.reminder &&
        typeof journey.reminder === "object" &&
        !Array.isArray(journey.reminder)
          ? (journey.reminder as {
              enabled?: unknown;
              reminder_at?: unknown;
            })
          : null;
      const proposalId =
        typeof proposal?.id === "string" ? proposal.id : undefined;
      const merged = mergeChatMessageList(
        chatMessages[matchId] ?? [],
        messages,
      );
      const latestDate = [...merged]
        .reverse()
        .find(
          (message) =>
            message.type === "date" &&
            message.date &&
            (message.date.proposalId === proposalId ||
              !message.date.proposalId),
        );
      const hydratedMessages =
        proposalId && latestDate
          ? merged.map((message) =>
              message.id === latestDate.id && message.date
                ? {
                    ...message,
                    date: {
                      ...message.date,
                      proposalId,
                      planStatus: backendDateStatus(proposal?.status),
                    },
                  }
                : message,
            )
          : merged;
      if (hydratedMessages.length > 0)
        setChatMessages((current) => ({
          ...current,
          [matchId]: mergeChatMessageList(
            current[matchId] ?? [],
            hydratedMessages,
          ),
        }));
      if (
        latestDate &&
        reflection &&
        ["continue", "pause", "close"].includes(String(reflection.choice))
      ) {
        const createdAt =
          typeof reflection.created_at === "string"
            ? Date.parse(reflection.created_at)
            : Date.now();
        const updatedAt =
          typeof reflection.updated_at === "string"
            ? Date.parse(reflection.updated_at)
            : createdAt;
        setRelationshipReflections((current) => ({
          ...current,
          [matchId]: {
            choice: reflection.choice as RelationshipReflectionChoice,
            dateMessageId: latestDate.id,
            dateProposalId: proposalId,
            useForMatching: reflection.use_for_matching === true,
            createdAt,
            updatedAt,
          },
        }));
      }
      if (latestDate && reminder) {
        setRelationshipReminders((current) => ({
          ...current,
          [matchId]: {
            enabled: reminder.enabled === true,
            dateMessageId: latestDate.id,
            dateProposalId: proposalId,
            scheduledFor:
              typeof reminder.reminder_at === "string"
                ? reminder.reminder_at
                : undefined,
            updatedAt: Date.now(),
          },
        }));
      }
    });
    const unsubscribe = subscribePersistedChatMessages(
      backendMatchId,
      (message) => {
        setChatMessages((current) => ({
          ...current,
          [matchId]: mergeChatMessageList(current[matchId] ?? [], [message]),
        }));
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [hydrated, screen, conversationPartner.id]);
  if (!poppins || !satisfy)
    return <View style={{ flex: 1, backgroundColor: colors.black }} />;
  const chooseExperienceMode = (mode: ExperienceMode) => {
    if (
      mode === "seeking" &&
      (coupleMode.connection.status === "active" ||
        coupleMode.connection.status === "paused")
    ) {
      setAppNotice({
        title: "Your couple space is still connected",
        body: "Disconnecting must be confirmed before matching can be enabled again.",
        icon: "lock-closed-outline",
        tone: "gold",
      });
      return;
    }
    const at = new Date().toISOString();
    setCoupleMode((current) =>
      reduceCoupleMode(current, { type: "select_experience", mode, at }),
    );
    if (mode === "seeking") {
      setChatLaunchTool(null);
      setCoupleHub({
        experienceMode: "seeking",
        connection: null,
        incomingRequests: [],
        outgoingRequests: [],
      });
      void (
        accessToken
          ? coupleApi.setMode(accessToken, false)
          : setServerCoupleModePreview(false)
      ).catch((error) =>
        setAppNotice({
          title: "Mode not updated",
          body:
            error instanceof Error
              ? error.message
              : "Could not update Couple Mode.",
          icon: "cloud-offline-outline",
          tone: "ruby",
        }),
      );
    }
  };
  const navigateTo = (target: Screen) => {
    if (coupleMode.experienceMode === "couple" && isCoupleModeRoute(target)) {
      const decision = guardCoupleModeRoute(coupleMode, target);
      if (!decision.allowed) {
        setScreen(decision.resolved as Screen);
        setAppNotice(
          decision.reason === "partner_connection_required"
            ? {
                title: "Connect your partner first",
                body: "Chat, shared date plans, gifts and games unlock only inside a connected two-person space.",
                icon: "link-outline",
                tone: "gold",
                actionLabel: "Set up our space",
                actionScreen: "coupleSetup",
              }
            : {
                title: "Matching is off in Couple Mode",
                body: "Profiles, Discover, Likes and Executive introductions stay hidden while you use DestinyOne with your partner.",
                icon: "heart-circle-outline",
                tone: "gold",
              },
        );
        return;
      }
    }
    setScreen(target);
  };
  const openCoupleTool = (tool: Exclude<CoupleLaunchTool, null>) => {
    const allowed =
      tool === "gift"
        ? coupleAccess.capabilities.canSendGifts
        : coupleAccess.capabilities.canPlayGames;
    if (!allowed) {
      navigateTo(tool === "gift" ? "gifts" : "chat");
      return;
    }
    if (tool === "gift") {
      navigateTo("gifts");
      return;
    }
    setChatLaunchTool(tool);
    navigateTo("chat");
  };
  const saveCoupleProfile = async (input: {
    firstName: string;
    age: string;
    city: string;
    profession: string;
  }) => {
    if (accessToken) {
      await profileApi.updateProfile(accessToken, input);
      await profileApi.updateMode(accessToken, "couple");
    } else {
      await saveCoupleModeMemberProfilePreview(input);
      await setServerCoupleModePreview(true);
    }
    setProfileDraft((current) => ({
      ...current,
      firstName: input.firstName.trim(),
      age: input.age.trim(),
      city: input.city.trim(),
      profession: input.profession.trim(),
    }));
    setOnboardingComplete(true);
  };
  const fetchPersistedChatMessages = (conversationId: string) =>
    accessToken
      ? chatApi.fetchMessages(accessToken, conversationId)
      : fetchPersistedChatMessagesPreview(conversationId);
  const subscribePersistedChatMessages = (
    conversationId: string,
    onMessage: (message: ChatMessage) => void,
  ) => {
    if (!accessToken)
      return subscribePersistedChatMessagesPreview(conversationId, onMessage);
    let active = true;
    let sinceMs = Date.now();
    const poll = () => {
      if (!active) return;
      const pollStartedAt = Date.now();
      void chatApi
        .fetchMessagesSince(accessToken, conversationId, sinceMs)
        .then((messages) => {
          if (!active) return;
          sinceMs = pollStartedAt;
          messages.forEach(onMessage);
        })
        .catch(() => undefined);
    };
    const timer = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  };
  const persistChatMessage = (conversationId: string, message: ChatMessage) =>
    accessToken
      ? chatApi.sendMessage(accessToken, conversationId, message)
      : persistChatMessagePreview(conversationId, message);
  const persistDateProposal = (
    conversationId: string,
    date: NonNullable<ChatMessage["date"]>,
  ) =>
    accessToken
      ? chatApi.sendDateProposal(accessToken, conversationId, date)
      : persistDateProposalPreview(conversationId, date);
  const persistDatePlanStatus = (
    proposalId: string | undefined,
    status: DatePlanStatus,
  ) =>
    accessToken
      ? chatApi.setDatePlanStatus(accessToken, proposalId, status)
      : persistDatePlanStatusPreview(proposalId, status);
  const persistLiveLocationShare = (
    conversationId: string,
    location: NonNullable<ChatMessage["location"]>,
    clientActionId: string,
  ) =>
    accessToken
      ? chatApi.shareLiveLocation(
          accessToken,
          conversationId,
          location,
          clientActionId,
        )
      : persistLiveLocationSharePreview(
          conversationId,
          location,
          clientActionId,
        );
  const persistMessageEdit = (
    conversationId: string,
    messageId: string,
    text: string,
  ) =>
    accessToken
      ? chatApi.editMessage(accessToken, conversationId, messageId, text)
      : persistMessageEditPreview(conversationId, messageId, text);
  const persistMessageDelete = (conversationId: string, messageId: string) =>
    accessToken
      ? chatApi.deleteMessage(accessToken, conversationId, messageId)
      : persistMessageDeletePreview(conversationId, messageId);
  const persistMessageUserState = (
    conversationId: string,
    messageId: string,
    input: {
      starred?: boolean;
      pinned?: boolean;
      hidden?: boolean;
      reaction?: string | null;
    },
  ) =>
    accessToken
      ? chatApi.setMessageState(accessToken, conversationId, messageId, input)
      : persistMessageUserStatePreview(conversationId, messageId, input);
  const searchCouplePartner = (phone: string) =>
    accessToken
      ? coupleApi.searchByPhone(accessToken, phone)
      : searchCouplePartnerByPhonePreview(phone);
  const requestCoupleConnection = async (member: CouplePartnerSummary) => {
    const request = accessToken
      ? await coupleApi.sendRequest(accessToken, member.memberId)
      : await sendCoupleConnectionRequestPreview(member);
    setCoupleHub((current) => ({ ...current, outgoingRequests: [request] }));
    return request;
  };
  const respondCoupleConnection = async (
    requestId: string,
    accept: boolean,
  ) => {
    const hub = accessToken
      ? await coupleApi.respond(accessToken, requestId, accept)
      : await respondToCoupleConnectionRequestPreview(requestId, accept);
    applyCoupleHub(hub);
    if (accept && hub.connection) setScreen("home");
  };
  const shareCoupleSpace = () => {
    const webUrl =
      Platform.OS === "web" && typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}?preview=modeSelect&mode=couple`
        : "https://destinyone.app/couple";
    void Share.share({
      title: "Join me on DestinyOne",
      message: `Create your DestinyOne account with your verified phone number, choose Couple Mode, then we can find each other by exact phone number: ${webUrl}`,
    });
  };
  const recordJourneyEvent = (
    name: RelationshipJourneyEventName,
    properties: Record<string, string | boolean>,
  ) => {
    track(name, properties as never);
    if (analyticsConsent)
      void persistRelationshipJourneyEvent(name, properties);
  };
  const confirmMemberMutation = (
    result: MemberMutationResult,
    title: string,
    fallback: string,
  ) => {
    if (canCommitMemberMutation(memberDataRuntime, result)) return true;
    setAppNotice({
      title,
      body: memberMutationFailureMessage(result, fallback),
      icon: "cloud-offline-outline",
      tone: "ruby",
    });
    return false;
  };
  const trackDiscovery = (type: DiscoverySignal["type"], match: Match) => {
    track("discovery_signal", { type });
    setDiscoverySignals((current) => [
      ...current.slice(-49),
      {
        id: `${Date.now()}-${Math.random()}`,
        type,
        matchId: match.id,
        createdAt: Date.now(),
      },
    ]);
    if (type === "view")
      void persistDiscoverySignal(profileIdFor(match), "view");
  };
  const openDetail = (m: Match) => {
    trackDiscovery("view", m);
    setSelected(m);
    setScreen("detail");
  };
  const chooseInterested = async (match: Match) => {
    if (accessToken) {
      try {
        const result = await matchApi.decide(
          accessToken,
          match.id,
          "interested",
        );
        setSelected(match);
        trackDiscovery("interested", match);
        setDismissedIds((current) => [...new Set([...current, match.id])]);
        if (result.mutual) {
          setScreen("mutual");
          return;
        }
        setAppNotice({
          title: "Interest sent privately",
          body: `If ${match.name} chooses you too, DestinyOne will open a mutual match and icebreaker.`,
          icon: "heart-outline",
          tone: "gold",
        });
      } catch (error) {
        setAppNotice({
          title: "Interest not sent",
          body:
            error instanceof Error
              ? error.message
              : "Your interest could not be confirmed. Please try again.",
          icon: "cloud-offline-outline",
          tone: "ruby",
        });
      }
      return;
    }
    const result = await persistMatchDecision(
      profileIdFor(match),
      "interested",
    );
    if (
      !confirmMemberMutation(
        result,
        "Interest not sent",
        "Your interest could not be confirmed. Please try again.",
      )
    )
      return;
    setSelected(match);
    trackDiscovery("interested", match);
    if (
      memberDataRuntime.source === "preview" ||
      isMutualMatchDecision(result.data)
    ) {
      setScreen("mutual");
      return;
    }
    setDismissedIds((current) => [...new Set([...current, match.id])]);
    setAppNotice({
      title: "Interest sent privately",
      body: `If ${match.name} chooses you too, DestinyOne will open a mutual match and icebreaker.`,
      icon: "heart-outline",
      tone: "gold",
    });
  };
  const passMatch = async (match: Match) => {
    if (accessToken) {
      try {
        await matchApi.decide(accessToken, match.id, "pass");
        trackDiscovery("skip", match);
        setDismissedIds((current) => [...new Set([...current, match.id])]);
      } catch (error) {
        setAppNotice({
          title: "Pass not saved",
          body:
            error instanceof Error
              ? error.message
              : "This profile could not be removed securely. Please try again.",
          icon: "cloud-offline-outline",
          tone: "ruby",
        });
      }
      return;
    }
    const result = await persistMatchDecision(profileIdFor(match), "pass");
    if (
      !confirmMemberMutation(
        result,
        "Pass not saved",
        "This profile could not be removed securely. Please try again.",
      )
    )
      return;
    trackDiscovery("skip", match);
    setDismissedIds((current) => [...new Set([...current, match.id])]);
  };
  const answerIcebreaker = async (answer: string) => {
    const result = await persistIcebreakerAnswer(
      conversationIdFor(selected),
      icebreakerQuestion,
      answer,
    );
    if (
      !confirmMemberMutation(
        result,
        "Answer not saved",
        "Your icebreaker answer could not be confirmed. Please try again.",
      )
    )
      return;
    if (result.saved && isIcebreakerWaitingForOtherAnswer(result.data)) {
      setAppNotice({
        title: "Answer saved",
        body: `Chat unlocks as soon as ${selected.name} answers the same icebreaker. Weâ€™ll keep it pressure-free.`,
        icon: "sparkles",
        tone: "gold",
      });
      setScreen("home");
      return;
    }
    setScreen("chat");
  };
  const notifyProfileView = async (match: Match) => {
    if (profileViewNotifiedIds.includes(match.id)) return;
    const result = await persistProfileView(profileIdFor(match), 5);
    if (
      !confirmMemberMutation(
        result,
        "Profile view not recorded",
        "The profile-view notification could not be confirmed.",
      )
    )
      return;
    setProfileViewNotifiedIds((current) =>
      current.includes(match.id) ? current : [...current, match.id],
    );
    setAppNotice({
      title: "Profile view notification sent",
      body: `${match.name} gets a tasteful notification because you spent 5+ seconds on the full profile. Swipe previews stay private.`,
      icon: "eye-outline",
      tone: "gold",
    });
  };
  const localRankedMatches = rankMatches(
    serverDiscoveredMatches ?? matches,
    { intent, vibes: vibeList, filters: matchFilters },
    discoverySignals,
    blockedIds,
    smartDiscovery,
  );
  const rankedMatches =
    serverMatches === null
      ? localRankedMatches
      : serverMatches.filter((match) => !blockedIds.includes(match.id));
  const visibleMatches = rankedMatches.filter(
    (match) => !dismissedIds.includes(match.id),
  );
  const roseAvailability = getRoseAvailability(roseLedger);
  const openRose = (match: Match) => setRoseTarget(match);
  const createRoseMessage = (note: string): ChatMessage => ({
    id: `spark-${Date.now()}`,
    type: "gift",
    text: note,
    gift: { name: "Golden Spark", emoji: "âœ¨" },
    createdAt: Date.now(),
    status: "sent",
  });
  const appendChatMessage = async (match: Match, message: ChatMessage) => {
    const matchId = match.id;
    if (memberDataRuntime.source === "preview" || isPreviewAccessMode) {
      setChatMessages((current) => ({
        ...current,
        [matchId]: [...(current[matchId] ?? []), message],
      }));
      return true;
    }
    let nextMessage = message;
    if (message.type === "date" && message.date) {
      const proposalResult = await persistDateProposal(
        conversationIdFor(match),
        message.date,
      );
      if (
        !confirmMemberMutation(
          proposalResult,
          "Date plan not sent",
          "Your date proposal could not be confirmed. Please try again.",
        )
      )
        return false;
      const data = proposalResult.data as
        | {
            id?: unknown;
            status?: unknown;
          }
        | undefined;
      if (typeof data?.id === "string")
        nextMessage = {
          ...message,
          date: {
            ...message.date,
            proposalId: data.id,
            planStatus: data.status === "accepted" ? "accepted" : "proposed",
          },
        };
    }
    if (message.type === "location" && message.location?.live) {
      const locationResult = await persistLiveLocationShare(
        conversationIdFor(match),
        message.location,
        message.id,
      );
      if (
        !confirmMemberMutation(
          locationResult,
          "Location not shared",
          "Your live location could not be activated securely.",
        )
      )
        return false;
    }
    const result = await persistChatMessage(
      conversationIdFor(match),
      nextMessage,
    );
    if (
      !confirmMemberMutation(
        result,
        "Message not sent",
        "Your message could not be delivered securely. Please try again.",
      )
    )
      return false;
    if (!isChatMessage(result.data)) {
      setAppNotice({
        title: "Message not sent",
        body: "The secure server returned an invalid message acknowledgement.",
        icon: "cloud-offline-outline",
        tone: "ruby",
      });
      return false;
    }
    setChatMessages((current) => ({
      ...current,
      [matchId]: mergeChatMessageList(current[matchId] ?? [], [
        result.data as ChatMessage,
      ]),
    }));
    return true;
  };
  const replaceChatMessage = (
    matchId: string,
    messageId: string,
    updater: (message: ChatMessage) => ChatMessage,
  ) => {
    setChatMessages((current) => ({
      ...current,
      [matchId]: (current[matchId] ?? []).map((message) =>
        message.id === messageId ? updater(message) : message,
      ),
    }));
  };
  const editChatMessage = async (
    match: Match,
    messageId: string,
    text: string,
  ) => {
    const current = (chatMessages[match.id] ?? []).find(
      (message) => message.id === messageId,
    );
    if (
      !current ||
      current.mine === false ||
      current.type !== "text" ||
      current.deletedForEveryone
    )
      return false;
    const edited = applyMessageEdit(current, text);
    if (memberDataRuntime.source === "preview" || isPreviewAccessMode) {
      replaceChatMessage(match.id, messageId, () => edited);
      return true;
    }
    const result = await persistMessageEdit(
      conversationIdFor(match),
      messageId,
      edited.text ?? "",
    );
    if (
      !confirmMemberMutation(
        result,
        "Message not edited",
        "The edited message could not be confirmed.",
      )
    )
      return false;
    if (isChatMessage(result.data))
      replaceChatMessage(match.id, messageId, () => result.data as ChatMessage);
    return true;
  };
  const deleteChatMessage = async (match: Match, messageId: string) => {
    const current = (chatMessages[match.id] ?? []).find(
      (message) => message.id === messageId,
    );
    if (!current || current.mine === false) return false;
    if (memberDataRuntime.source === "preview" || isPreviewAccessMode) {
      replaceChatMessage(match.id, messageId, (message) =>
        applyMessageDeletion(message),
      );
      return true;
    }
    const result = await persistMessageDelete(
      conversationIdFor(match),
      messageId,
    );
    if (
      !confirmMemberMutation(
        result,
        "Message not deleted",
        "The delete request could not be confirmed.",
      )
    )
      return false;
    if (isChatMessage(result.data))
      replaceChatMessage(match.id, messageId, () => result.data as ChatMessage);
    return true;
  };
  const updateChatMessageState = async (
    match: Match,
    messageId: string,
    input: {
      starred?: boolean;
      pinned?: boolean;
      hidden?: boolean;
      reaction?: string | null;
    },
  ) => {
    replaceChatMessage(match.id, messageId, (message) => ({
      ...message,
      starredByMe: input.starred ?? message.starredByMe,
      pinnedAt:
        input.pinned === undefined
          ? message.pinnedAt
          : input.pinned
            ? Date.now()
            : undefined,
      reactions:
        input.reaction === undefined
          ? message.reactions
          : { ...message.reactions, me: input.reaction ?? "" },
    }));
    if (memberDataRuntime.source === "preview" || isPreviewAccessMode)
      return true;
    const result = await persistMessageUserState(
      conversationIdFor(match),
      messageId,
      input,
    );
    if (!result.saved) {
      setAppNotice({
        title: "Message action not synced",
        body: memberMutationFailureMessage(
          result,
          "Try the action again when your connection is stable.",
        ),
        icon: "cloud-offline-outline",
        tone: "ruby",
      });
      return false;
    }
    return true;
  };
  const forwardChatMessages = async (
    target: Match,
    sourceMessages: ChatMessage[],
  ) => {
    let sent = 0;
    for (const source of sourceMessages) {
      if (source.deletedForEveryone) continue;
      const clone: ChatMessage = {
        ...source,
        id: `forward-${Date.now()}-${sent}-${Math.random().toString(36).slice(2, 6)}`,
        mine: true,
        senderId: undefined,
        forwarded: true,
        editedAt: undefined,
        reactions: undefined,
        starredByMe: undefined,
        pinnedAt: undefined,
        createdAt: Date.now() + sent,
        status: "sent",
      };
      if (await appendChatMessage(target, clone)) sent += 1;
    }
    return sent;
  };
  const appendMarketplaceGift = async (
    gift: PhysicalGift,
    note: string,
    order: GiftOrderResponse,
  ) => {
    track("physical_gift_requested", { gift: gift.name, demo: order.demo });
    const senderName = profileDraft.firstName.trim() || "Your match";
    return appendChatMessage(conversationPartner, {
      id: `gift-${order.orderId}`,
      mine: true,
      type: "gift",
      text: `From ${senderName}: â€œ${note}â€`,
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
        paymentPolicy: order.quote.paymentPolicy,
        cancellationPolicy: order.quote.cancellationPolicy,
        supportPolicy: order.quote.supportPolicy,
        recipientPrivacy: order.quote.recipientPrivacy,
        acceptanceWindowMinutes: order.quote.acceptanceWindowMinutes,
        acceptanceExpiresAt: order.quote.acceptanceExpiresAt,
        recipientAddressMode:
          order.recipientAddressMode ?? "recipient_supplied_private",
        totalCents: order.quote.totalCents,
        steps: order.steps,
      },
      createdAt: Date.now(),
      status: "sent",
    });
  };
  const respondToGiftRequest = async (
    match: Match,
    messageId: string,
    input: {
      accept: boolean;
      dropoff?: GiftDeliveryAddress;
    },
  ) => {
    const message = (chatMessages[match.id] ?? []).find(
      (item) => item.id === messageId,
    );
    if (!message?.gift?.physical || !message.gift.orderId)
      return { ok: false, error: "This gift request is unavailable." };
    try {
      const response = await respondToPhysicalGiftOrder({
        orderId: message.gift.orderId,
        accept: input.accept,
        dropoff: input.dropoff,
      });
      replaceChatMessage(match.id, messageId, (current) => {
        if (!current.gift) return current;
        const nextSteps = current.gift.steps?.map((step) =>
          response.status === "recipient_accepted"
            ? {
                ...step,
                status: (step.key === "request" || step.key === "recipient"
                  ? "done"
                  : step.key === "payment"
                    ? "active"
                    : "pending") as "done" | "active" | "pending",
              }
            : { ...step, status: "pending" as const },
        );
        return {
          ...current,
          gift: {
            ...current.gift,
            deliveryStatus: response.deliveryStatus,
            steps: nextSteps,
          },
        };
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Your response could not be saved. Please retry.",
      };
    }
  };
  const updateDatePlanStatus = async (
    matchId: string,
    messageId: string,
    status: DatePlanStatus,
  ) => {
    const message = (chatMessages[matchId] ?? []).find(
      (item) => item.id === messageId,
    );
    if (!message?.date) return;
    const previousStatus = message.date.planStatus ?? "proposed";
    if (isPreviewAccessMode) {
      setChatMessages((current) => ({
        ...current,
        [matchId]: (current[matchId] ?? []).map((item) =>
          item.id === messageId && item.date
            ? { ...item, date: { ...item.date, planStatus: status } }
            : item,
        ),
      }));
      recordJourneyEvent("date_plan_status_changed", {
        from_status: previousStatus,
        to_status: status,
      });
      return;
    }
    const result = await persistDatePlanStatus(message.date.proposalId, status);
    if (
      !confirmMemberMutation(
        result,
        "Date status not updated",
        "The date response could not be confirmed. Please try again.",
      )
    )
      return;
    setChatMessages((current) => ({
      ...current,
      [matchId]: (current[matchId] ?? []).map((item) =>
        item.id === messageId && item.date
          ? { ...item, date: { ...item.date, planStatus: status } }
          : item,
      ),
    }));
    recordJourneyEvent("date_plan_status_changed", {
      from_status: previousStatus,
      to_status: status,
    });
  };
  const saveReflection = async (
    matchId: string,
    messageId: string,
    choice: RelationshipReflectionChoice | null,
  ) => {
    if (!choice) {
      if (memberDataRuntime.source === "server") {
        setAppNotice({
          title: "Reflection unchanged",
          body: "Secure reflection replacement is not available yet. Your saved private answer was kept.",
          icon: "lock-closed-outline",
          tone: "gold",
        });
        return;
      }
      setRelationshipReflections((current) => {
        const next = { ...current };
        delete next[matchId];
        return next;
      });
      return;
    }
    const message = (chatMessages[matchId] ?? []).find(
      (item) => item.id === messageId,
    );
    const useForMatching =
      relationshipReflections[matchId]?.useForMatching ?? false;
    const result = await persistRelationshipReflection(
      message?.date?.proposalId,
      choice,
      useForMatching,
    );
    if (
      !confirmMemberMutation(
        result,
        "Reflection not saved",
        "Your private reflection could not be confirmed.",
      )
    )
      return;
    const now = Date.now();
    setRelationshipReflections((current) => ({
      ...current,
      [matchId]: {
        choice,
        dateMessageId: messageId,
        dateProposalId: message?.date?.proposalId,
        useForMatching,
        createdAt: current[matchId]?.createdAt ?? now,
        updatedAt: now,
      },
    }));
    recordJourneyEvent("private_reflection_saved", { choice });
  };
  const updateRelationshipLearningConsent = async (
    matchId: string,
    enabled: boolean,
  ) => {
    const reflection = relationshipReflections[matchId];
    if (!reflection) return;
    const result = await persistRelationshipReflection(
      reflection.dateProposalId,
      reflection.choice,
      enabled,
    );
    if (
      !confirmMemberMutation(
        result,
        "Matching preference not updated",
        "Your consent setting could not be confirmed.",
      )
    )
      return;
    setRelationshipReflections((current) => ({
      ...current,
      [matchId]: {
        ...reflection,
        useForMatching: enabled,
        updatedAt: Date.now(),
      },
    }));
    recordJourneyEvent("relationship_learning_consent_changed", { enabled });
  };
  const updateRelationshipReminder = async (
    matchId: string,
    messageId: string,
    enabled: boolean,
  ) => {
    const message = (chatMessages[matchId] ?? []).find(
      (item) => item.id === messageId,
    );
    if (!message?.date) return;
    const result = await persistRelationshipReminder(
      message.date.proposalId,
      enabled,
    );
    if (
      !confirmMemberMutation(
        result,
        "Reminder not updated",
        "Your private reminder could not be confirmed.",
      )
    )
      return;
    const data = result.data as
      | {
          reminder_at?: unknown;
        }
      | undefined;
    setRelationshipReminders((current) => ({
      ...current,
      [matchId]: {
        enabled,
        dateMessageId: messageId,
        dateProposalId: message.date?.proposalId,
        scheduledFor:
          typeof data?.reminder_at === "string"
            ? data.reminder_at
            : current[matchId]?.scheduledFor,
        updatedAt: Date.now(),
      },
    }));
    recordJourneyEvent("date_reminder_changed", { enabled });
  };
  const updateLastSeenPrivacy = async (value: boolean) => {
    const result = await persistPrivacySettings({
      lastSeenVisible: value,
      onlineStatusVisible: value,
    });
    if (
      !confirmMemberMutation(
        result,
        "Privacy setting not saved",
        "Your visibility setting could not be confirmed.",
      )
    )
      return;
    setLastSeenVisible(value);
  };
  const updateAnalyticsPrivacy = async (value: boolean) => {
    const result = await persistPrivacySettings({ analyticsConsent: value });
    if (
      !confirmMemberMutation(
        result,
        "Privacy setting not saved",
        "Your analytics choice could not be confirmed.",
      )
    )
      return;
    setAnalyticsConsent(value);
  };
  const updateSelectedChatSettings = async (settings: CoupleChatSettings) => {
    if (isPreviewAccessMode) {
      setChatSettings((current) => ({
        ...current,
        [conversationPartner.id]: settings,
      }));
      return;
    }
    const result = await persistChatSettings(
      conversationIdFor(conversationPartner),
      settings,
    );
    if (
      !confirmMemberMutation(
        result,
        "Chat settings not saved",
        "Your conversation settings could not be confirmed.",
      )
    )
      return;
    setChatSettings((current) => ({
      ...current,
      [conversationPartner.id]: settings,
    }));
  };
  const useCoachDraftInChat = (draft: string) => {
    setChatDrafts((current) => ({ ...current, [selected.id]: draft }));
    setScreen("chat");
  };
  const completeOnboarding = async () => {
    if (!isPreviewAccessMode && !accessToken) {
      const result = await persistOnboardingProfile({
        profile: profileDraft,
        photos: profilePhotos,
        selfieUri,
        voiceIntroUri,
        vibes: vibeList,
        intent,
        alignment,
        smartDiscovery,
        crossedPaths,
        lastSeenVisible,
        matchFilters,
      });
      if (
        !confirmMemberMutation(
          result,
          "Profile not completed",
          "Your profile could not be saved securely. Please try again.",
        )
      )
        return;
    }
    if (accessToken) {
      try {
        await profileApi.updateProfile(accessToken, {
          firstName: profileDraft.firstName,
          gender: profileDraft.gender,
          age: profileDraft.age,
          height: profileDraft.height,
          city: profileDraft.city,
          profession: profileDraft.profession,
          religion: profileDraft.religion,
          community: profileDraft.community,
        });
        await profileApi.updatePhotos(accessToken, profilePhotos);
        await profileApi.updateVibes(accessToken, vibeList);
        await profileApi.updateIntent(accessToken, {
          intent,
          timeline: alignment.timeline,
          children: alignment.children,
          family: alignment.family,
          relocation: alignment.relocation,
        });
        await profileApi.updatePreferences(accessToken, {
          lookingFor: matchFilters.lookingFor,
          minAge: matchFilters.minAge,
          maxAge: matchFilters.maxAge,
          cities: matchFilters.cities,
          intents: matchFilters.intents,
          mustHaveVibes: matchFilters.mustHaveVibes,
          familyPriority: matchFilters.familyPriority,
          children: matchFilters.children,
          marriageTimeline: matchFilters.marriageTimeline,
          relocation: matchFilters.relocation,
          distancePreference: matchFilters.distancePreference,
          smartDiscovery,
        });
        await profileApi.completeOnboarding(accessToken);
      } catch (error) {
        setAppNotice({
          title: "Profile sync failed",
          body:
            error instanceof Error
              ? error.message
              : "Your profile could not be saved to the server. Please try again.",
          icon: "cloud-offline-outline",
          tone: "ruby",
        });
        return;
      }
    }
    setOnboardingComplete(true);
    setScreen("home");
    setReferralOfferOpen(true);
    if (memberDataRuntime.source === "server" && !isPreviewAccessMode)
      await refreshServerMatches();
  };
  const updateMatchFilters = async (next: MatchFilters) => {
    if (accessToken) {
      try {
        await profileApi.updatePreferences(accessToken, {
          lookingFor: next.lookingFor,
          minAge: next.minAge,
          maxAge: next.maxAge,
          cities: next.cities,
          intents: next.intents,
          mustHaveVibes: next.mustHaveVibes,
          familyPriority: next.familyPriority,
          children: next.children,
          marriageTimeline: next.marriageTimeline,
          relocation: next.relocation,
          distancePreference: next.distancePreference,
          smartDiscovery,
        });
        setMatchFilters(next);
      } catch (error) {
        setAppNotice({
          title: "Preferences not saved",
          body:
            error instanceof Error
              ? error.message
              : "Your match preferences could not be confirmed.",
          icon: "cloud-offline-outline",
          tone: "ruby",
        });
      }
      return;
    }
    const result = await persistMatchingPreferences({
      filters: next,
      profile: profileDraft,
      alignment,
      smartDiscovery,
    });
    if (
      !confirmMemberMutation(
        result,
        "Preferences not saved",
        "Your match preferences could not be confirmed.",
      )
    )
      return;
    setMatchFilters(next);
  };
  const updateSmartDiscovery = async (enabled: boolean) => {
    if (accessToken) {
      try {
        await profileApi.updatePreferences(accessToken, {
          lookingFor: matchFilters.lookingFor,
          minAge: matchFilters.minAge,
          maxAge: matchFilters.maxAge,
          cities: matchFilters.cities,
          intents: matchFilters.intents,
          mustHaveVibes: matchFilters.mustHaveVibes,
          familyPriority: matchFilters.familyPriority,
          children: matchFilters.children,
          marriageTimeline: matchFilters.marriageTimeline,
          relocation: matchFilters.relocation,
          distancePreference: matchFilters.distancePreference,
          smartDiscovery: enabled,
        });
        setSmartDiscovery(enabled);
      } catch (error) {
        setAppNotice({
          title: "Discovery setting not saved",
          body:
            error instanceof Error
              ? error.message
              : "Smart Discovery could not be updated securely.",
          icon: "cloud-offline-outline",
          tone: "ruby",
        });
      }
      return;
    }
    const result = await persistMatchingPreferences({
      filters: matchFilters,
      profile: profileDraft,
      alignment,
      smartDiscovery: enabled,
    });
    if (
      !confirmMemberMutation(
        result,
        "Discovery setting not saved",
        "Smart Discovery could not be updated securely.",
      )
    )
      return;
    setSmartDiscovery(enabled);
  };
  const clearMatchingActivity = async () => {
    const result = await persistClearMatchingLearning();
    if (
      !confirmMemberMutation(
        result,
        "Activity not cleared",
        "Your matching activity could not be cleared securely.",
      )
    )
      return;
    setDiscoverySignals([]);
  };
  const submitSelectedMatchFeedback = async (
    feedback: "promising" | "not_aligned" | "met_in_person",
    useForMatching: boolean,
  ) => {
    const result = await persistMatchFeedback(
      conversationIdFor(selected),
      feedback,
      useForMatching,
    );
    if (result.reason === "error") {
      setAppNotice({
        title: "Feedback not saved",
        body:
          result.error ??
          "Your private feedback could not be confirmed. Please try again.",
        icon: "cloud-offline-outline",
        tone: "ruby",
      });
      return false;
    }
    setAppNotice({
      title: "Private reflection saved",
      body: useForMatching
        ? "Your feedback can improve future introductions. Personal notes and internal scores are never shared with members."
        : "Your reflection was saved without using it for future matching.",
      icon: "checkmark-circle",
      tone: "gold",
    });
    return true;
  };
  const recordSafeCheckIn = (id: string) => {
    if (memberDataRuntime.source === "preview") {
      setSafeCheckIns((current) => [...new Set([...current, id])]);
      return;
    }
    setAppNotice({
      title: "Check-in not recorded",
      body: "Secure date check-ins are unavailable until the live safety endpoint is connected. No check-in was created.",
      icon: "shield-outline",
      tone: "ruby",
    });
  };
  const reportMatch = async (
    match: Match,
    reason: string,
    details?: string,
  ) => {
    const reportId = `report-${Date.now()}`;
    const result = await persistReport(
      profileIdFor(match),
      reason,
      details,
      reportId,
    );
    if (
      !confirmMemberMutation(
        result,
        "Report not submitted",
        "Your safety report could not be confirmed. Please try again.",
      )
    )
      return false;
    setReports((current) => [
      ...current,
      {
        id: reportId,
        matchId: match.id,
        reason,
        details,
        createdAt: Date.now(),
      },
    ]);
    setAppNotice({
      title: "Report submitted privately",
      body: "Your report is saved for safety review. The other member is not notified.",
      icon: "flag-outline",
      tone: "gold",
    });
    return true;
  };
  const blockMatch = async (match: Match) => {
    const result = await persistBlock(profileIdFor(match));
    if (
      !confirmMemberMutation(
        result,
        "Member not blocked",
        "The private block could not be confirmed. Please try again.",
      )
    )
      return false;
    setBlockedIds((current) => [...new Set([...current, match.id])]);
    setDismissedIds((current) => [...new Set([...current, match.id])]);
    setAppNotice({
      title: "Blocked privately",
      body: `${match.name} is hidden from your matches, likes and chats. They will not be notified.`,
      icon: "ban-outline",
      tone: "ruby",
    });
    return true;
  };
  const unmatchMatch = async (match: Match) => {
    const result = await persistUnmatch(
      conversationIdFor(match),
      `unmatch-${Date.now()}`,
    );
    if (
      !confirmMemberMutation(
        result,
        "Could not unmatch",
        "The relationship could not be closed securely. Please try again.",
      )
    )
      return false;
    setDismissedIds((current) => [...new Set([...current, match.id])]);
    setAppNotice({
      title: "Unmatched",
      body: `${match.name} has been removed from your introductions and conversation flow.`,
      icon: "person-remove-outline",
      tone: "rose",
    });
    return true;
  };
  const sendRose = async (match: Match, note: string) => {
    const today = todayKey();
    const available = getRoseAvailability(roseLedger);
    if (memberDataRuntime.source === "server") {
      setAppNotice({
        title: "AWS integration required",
        body: "Golden Sparks remain disabled until your developer connects the typed discovery and payments ports.",
        icon: "shield-outline",
        tone: "ruby",
      });
      return;
    }
    if (!available.freeAvailable && available.paidCredits <= 0) {
      setAppNotice({
        title: "Golden Spark pack",
        body: "Free plan includes 1 Golden Spark every day. Extra Sparks can be added through secure in-app purchase.",
        icon: "sparkles",
        tone: "gold",
        actionLabel: "See Spark packs",
        actionScreen: "pricing",
      });
      return;
    }
    const paid = !available.freeAvailable;
    setRoseLedger((current) => ({
      dayKey: today,
      freeUsed: paid ? current.freeUsed : true,
      paidCredits: paid
        ? Math.max(0, current.paidCredits - 1)
        : current.paidCredits,
      sent: [
        ...current.sent.slice(-49),
        {
          id: `rose-${Date.now()}`,
          matchId: match.id,
          note,
          paid,
          createdAt: Date.now(),
        },
      ],
    }));
    trackDiscovery("interested", match);
    void persistMatchDecision(profileIdFor(match), "interested");
    appendChatMessage(match, createRoseMessage(note));
    setRosePopup({ match, note, paid });
  };
  const resetDemo = async () => {
    await Promise.all([clearAppState(), coupleModeRepository.clear()]);
    setCoupleMode(initialCoupleModeState);
    setChatLaunchTool(null);
    setVerified(initialPersistedState.verified);
    setProfileDraft(initialPersistedState.profileDraft);
    setVibeList(initialPersistedState.vibes);
    setIntent(initialPersistedState.intent);
    setAlignment(initialPersistedState.alignment);
    setChatMessages(initialPersistedState.chats);
    setChatDrafts({});
    setCoinBalance(initialPersistedState.coinBalance);
    setProfilePhotos(initialPersistedState.photos);
    setSelfieUri("");
    setVoiceIntroUri("");
    setVouches([]);
    setDiscoverySignals([]);
    setSmartDiscovery(true);
    setCrossedPaths(false);
    setBlockedIds([]);
    setReports([]);
    setSafeCheckIns([]);
    setMatchFilters(defaultMatchFilters);
    setRoseLedger(initialPersistedState.roseLedger);
    setLastSeenVisible(initialPersistedState.lastSeenVisible);
    setAnalyticsConsent(initialPersistedState.analyticsConsent);
    setChatSettings(initialPersistedState.chatSettings);
    setRelationshipReflections(initialPersistedState.relationshipReflections);
    setRelationshipReminders(initialPersistedState.relationshipReminders);
    setProfileReminderShownAt(initialPersistedState.profileReminderShownAt);
    setRosePopup(null);
    setAppNotice(null);
    setReferralOfferOpen(false);
    setDetailSafetyOpen(false);
    setDismissedIds([]);
    setProfileViewNotifiedIds([]);
    setAuthDestination("");
    setAuthPassword("");
    setOnboardingComplete(false);
    setScreen("welcome");
  };
  const deleteAccount = async () => {
    try {
      if (accessToken) {
        await authApi.deleteAccount(accessToken);
      } else {
        await requestAccountDeletion();
      }
    } catch (error) {
      setAppNotice({
        title: "Account not deleted",
        body:
          error instanceof Error
            ? error.message
            : "Your account could not be deleted. Please try again.",
        icon: "cloud-offline-outline",
        tone: "ruby",
      });
      return;
    } finally {
      await AsyncStorage.removeItem("destinyone_access_token");
      await AsyncStorage.removeItem("destinyone_refresh_token");
      setAccessToken("");
      await resetDemo();
    }
  };
  const deactivateAccount = async () => {
    try {
      if (accessToken) {
        await authApi.deactivateAccount(accessToken);
      }
    } catch (error) {
      setAppNotice({
        title: "Account not deactivated",
        body:
          error instanceof Error
            ? error.message
            : "Your account could not be deactivated. Please try again.",
        icon: "cloud-offline-outline",
        tone: "ruby",
      });
      return;
    } finally {
      await AsyncStorage.removeItem("destinyone_access_token");
      await AsyncStorage.removeItem("destinyone_refresh_token");
      setAccessToken("");
      await resetDemo();
    }
  };
  const logout = async () => {
    try {
      if (accessToken) {
        await authApi.logout(accessToken);
      }
    } catch {
    } finally {
      await AsyncStorage.removeItem("destinyone_access_token");
      await AsyncStorage.removeItem("destinyone_refresh_token");
      setAccessToken("");
      await resetDemo();
    }
  };
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {/* ðŸš€ Static background.png removed, entire app wrapped in Premium Gradient */}
      <PremiumBackground>
        {screen === "splash" && <SplashScreen />}
        {screen === "welcome" && (
          <WelcomeScreen onNext={() => setScreen("auth")} />
        )}
        {screen === "auth" && (
          <AuthScreen
            onBack={() => setScreen("welcome")}
            onRequestCode={async (request) => {
              const channel = request.method === "phone" ? "phone" : "email";
              await authApi.requestOtp(channel, request.destination);
              setAuthDestination(request.destination);
              setAuthPassword(request.password ?? "");
              setScreen("otp");
            }}
            onSocialContinue={async (provider) => {
              if (provider === "Apple") {
                // Apple abhi wire nahi hua â€” placeholder
                await new Promise((resolve) => setTimeout(resolve, 450));
                setAuthDestination(
                  `${provider.toLowerCase()}@destinyone.preview`,
                );
                setAuthPassword("");
                setScreen("verify");
                return;
              }

              const providerKey = provider === "Google" ? "google" : "linkedin";
              if (Platform.OS === "web") {
                window.location.href = authApi.oauthUrl(providerKey);
                return;
              }
              const redirectUrl = Linking.createURL("auth/callback");
              const result = await WebBrowser.openAuthSessionAsync(
                authApi.oauthUrl(providerKey),
                redirectUrl,
              );
              if (result.type === "success" && result.url) {
                const url = new URL(result.url);
                const email = url.searchParams.get("email");
                if (email) {
                  setAuthDestination(email);
                  setAuthPassword("");
                  setScreen("otp");
                }
              }
            }}
          />
        )}
        {screen === "otp" && (
          <OtpScreen
            destination={authDestination}
            allowPreviewCode={
              !authDestination.includes("@") &&
              (backendMode === "demo" || allowsPreviewOtpFallback)
            }
            onBack={() => setScreen("auth")}
            onResend={async () => {
              const channel = authDestination.includes("@") ? "email" : "phone";
              await authApi.requestOtp(channel, authDestination);
            }}
            onVerify={async (code) => {
              const channel = authDestination.includes("@") ? "email" : "phone";
              try {
                const result = await authApi.verifyOtp(
                  channel,
                  authDestination,
                  code,
                );
                await AsyncStorage.setItem(
                  "destinyone_access_token",
                  result.accessToken,
                );
                await AsyncStorage.setItem(
                  "destinyone_refresh_token",
                  result.refreshToken,
                );
                setAccessToken(result.accessToken);
                try {
                  const profileData = await profileApi.getMyProfile(
                    result.accessToken,
                  );
                  if (profileData.profile) {
                    setProfileDraft((current) => ({
                      ...current,
                      firstName:
                        profileData.profile.first_name ?? current.firstName,
                      gender: profileData.profile.gender ?? current.gender,
                      age: profileData.profile.age
                        ? String(profileData.profile.age)
                        : current.age,
                      height: profileData.profile.height ?? current.height,
                      city: profileData.profile.city ?? current.city,
                      profession:
                        profileData.profile.profession ?? current.profession,
                      religion:
                        profileData.profile.religion ?? current.religion,
                      community:
                        profileData.profile.community ?? current.community,
                    }));
                    setVerified(!!profileData.profile.verified);
                  }
                  if (profileData.photos?.length)
                    setProfilePhotos(profileData.photos);
                  if (profileData.vibes?.length) setVibeList(profileData.vibes);
                  if (profileData.intent?.intent)
                    setIntent(profileData.intent.intent);
                  const done = !!profileData.profile?.onboarding_complete;
                  setOnboardingComplete(done);
                  onboardingCompleteRef.current = done;
                } catch {
                  setOnboardingComplete(false);
                  onboardingCompleteRef.current = false;
                }
                return true;
              } catch {
                return false;
              }
            }}
            onVerified={() =>
              setScreen(onboardingCompleteRef.current ? "home" : "verify")
            }
          />
        )}
        {screen === "verify" && (
          <VerificationScreen
            preview={memberDataRuntime.source === "preview"}
            verified={verified}
            selfieUri={selfieUri}
            onSelfie={setSelfieUri}
            onVerifiedChange={setVerified}
            onNext={() => setScreen("modeSelect")}
          />
        )}
        {screen === "modeSelect" && (
          <ModeSelectScreen
            mode={coupleMode.experienceMode}
            onChange={chooseExperienceMode}
            onNext={() =>
              setScreen(
                coupleMode.experienceMode === "couple"
                  ? "coupleSetup"
                  : "profileSetup",
              )
            }
          />
        )}
        {screen === "coupleSetup" && (
          <CoupleSetupScreen
            profile={profileDraft}
            hub={coupleHub}
            onBack={() =>
              setScreen(onboardingComplete ? "profile" : "modeSelect")
            }
            onSaveProfile={saveCoupleProfile}
            onSearch={searchCouplePartner}
            onRequest={requestCoupleConnection}
            onRespond={respondCoupleConnection}
            onOpenSpace={() => setScreen("home")}
          />
        )}
        {screen === "profileSetup" && (
          <ProfileSetupScreen
            accessToken={accessToken}
            profile={profileDraft}
            onProfileChange={setProfileDraft}
            photos={profilePhotos}
            onPhotosChange={setProfilePhotos}
            voiceUri={voiceIntroUri}
            onVoiceChange={setVoiceIntroUri}
            allowPreviewContinue={isPreviewAccessMode}
            onNext={async () => {
              if (onboardingComplete && accessToken) {
                try {
                  await profileApi.updateProfile(accessToken, {
                    firstName: profileDraft.firstName,
                    gender: profileDraft.gender,
                    age: profileDraft.age,
                    height: profileDraft.height,
                    city: profileDraft.city,
                    profession: profileDraft.profession,
                    religion: profileDraft.religion,
                    community: profileDraft.community,
                  });
                  await profileApi.updatePhotos(accessToken, profilePhotos);
                  setAppNotice({
                    title: "Profile updated",
                    body: "Your changes have been saved.",
                    icon: "checkmark-circle",
                    tone: "gold",
                  });
                  setScreen("profile");
                } catch (error) {
                  setAppNotice({
                    title: "Profile not saved",
                    body:
                      error instanceof Error
                        ? error.message
                        : "Your changes could not be saved. Please try again.",
                    icon: "cloud-offline-outline",
                    tone: "ruby",
                  });
                }
                return;
              }
              setScreen("vibes");
            }}
          />
        )}
        {screen === "vibes" && (
          <VibesScreen
            value={vibeList}
            onChange={setVibeList}
            onNext={() => setScreen("intent")}
          />
        )}
        {screen === "intent" && (
          <IntentScreen
            value={intent}
            onChange={setIntent}
            onNext={() => setScreen("alignment")}
          />
        )}
        {screen === "alignment" && (
          <AlignmentScreen
            value={alignment}
            onChange={setAlignment}
            onNext={() => setScreen("discovery")}
          />
        )}
        {screen === "home" &&
          (coupleMode.experienceMode === "couple" ? (
            <CoupleHomeScreen
              state={coupleMode}
              hub={coupleHub}
              memberName={profileDraft.firstName}
              city={profileDraft.city}
              messages={chatMessages[conversationPartner.id] ?? []}
              onShare={shareCoupleSpace}
              onManage={() => setScreen("coupleSetup")}
              onOpenTool={openCoupleTool}
              navigate={navigateTo}
            />
          ) : (
            <HomeScreen
              preview={isPreviewAccessMode}
              items={visibleMatches}
              matchLoadState={matchLoadState}
              matchingPoolStatus={matchingPoolStatus}
              onRetryMatches={() => void refreshServerMatches()}
              preferences={{ intent, vibes: vibeList, filters: matchFilters }}
              alignment={alignment}
              signals={discoverySignals}
              dismissedCount={dismissedIds.length}
              firstName={profileDraft.firstName}
              profileGrowth={{
                hasPhoto: profilePhotos.length > 0,
                verified,
                hasVoiceIntro: !!voiceIntroUri,
                vouchesCount: vouches.length,
                vibeCount: vibeList.length,
                hasIntent: !!intent,
              }}
              roseAvailability={roseAvailability}
              crossedPaths={crossedPaths}
              openDetail={openDetail}
              onInterested={chooseInterested}
              onSkip={passMatch}
              onRose={openRose}
              navigate={navigateTo}
            />
          ))}
        {screen === "explore" && <ExploreHubScreen navigate={navigateTo} />}
        {screen === "gifts" && (
          <GiftMarketplace
            ports={{
              orderingMode: physicalGiftOrderingMode,
              createIdempotencyKey: createGiftIdempotencyKey,
              estimateQuote: estimateGiftOrderQuote,
              formatMoney: formatGiftMoney,
              createOrder: createPhysicalGiftOrder,
              recordRecommendationFeedback: recordGiftRecommendationFeedback,
              requestConcierge: requestGiftConciergeV2,
            }}
            recipient={conversationPartner}
            senderName={profileDraft.firstName}
            onBack={() => setScreen("explore")}
            onOpenChat={() => setScreen("chat")}
            onOrderCreated={appendMarketplaceGift}
            navigate={navigateTo}
          />
        )}
        {screen === "readiness" && (
          <RelationshipReadinessScreen
            profile={profileDraft}
            verified={verified}
            vibeCount={vibeList.length}
            hasIntent={!!intent}
            onBack={() => setScreen("explore")}
            onOpenCoach={() => setScreen("coach")}
            onOpenProfile={() => setScreen("profile")}
          />
        )}
        {screen === "community" && (
          <CityCommunityRoomsScreen
            city={profileDraft.city}
            verified={verified}
            onBack={() => setScreen("explore")}
            onOpenDates={() => setScreen("events")}
            onOpenCircle={() => setScreen("circle")}
            onLoadRooms={fetchCommunityRooms}
            onJoinRoom={joinCommunityRoom}
          />
        )}
        {screen === "blueprint" && (
          <RelationshipBlueprintScreen
            profile={profileDraft}
            onBack={() => setScreen("explore")}
            onOpenJourney={() => setScreen("journey")}
            onSaveBlueprint={persistRelationshipBlueprint}
          />
        )}
        {screen === "journey" && (
          <TwoPersonJourneyScreen
            partner={conversationPartner}
            onBack={() => setScreen("explore")}
            onOpenChat={() => setScreen("chat")}
            onOpenDates={() => setScreen("events")}
            onOpenSafety={() => setScreen("dateSafety")}
          />
        )}
        {screen === "dateSafety" && (
          <DateSafetyConciergeScreen
            partner={conversationPartner}
            onBack={() => setScreen("explore")}
            onOpenDatePlan={() => setScreen("events")}
            onSavePlan={persistDateSafetyPlan}
          />
        )}
        {screen === "circle" && (
          <TrustedCircleScreen
            vouches={vouches}
            coinBalance={coinBalance}
            rewardMode={vouchRewardsMode}
            onBack={() => setScreen("explore")}
            onAddVouch={(quality) => {
              if (
                vouchRewardsMode === "demo" &&
                vouches.length < 3 &&
                !vouches.includes(quality)
              ) {
                setVouches((current) => [...current, quality]);
                setCoinBalance((balance) => balance + 100);
              }
            }}
          />
        )}
        {screen === "discovery" && (
          <DiscoveryCenterScreen
            filters={matchFilters}
            onFiltersChange={updateMatchFilters}
            signals={discoverySignals}
            smartDiscovery={smartDiscovery}
            crossedPaths={crossedPaths}
            onSmartChange={updateSmartDiscovery}
            onCrossedChange={setCrossedPaths}
            onClear={clearMatchingActivity}
            onBack={() =>
              onboardingComplete
                ? setScreen("explore")
                : void completeOnboarding()
            }
          />
        )}
        {screen === "coach" && (
          <RelationshipCoachScreen
            match={selected}
            preferences={{ intent, vibes: vibeList, filters: matchFilters }}
            onBack={() => setScreen("explore")}
            onOpenFilters={() => setScreen("discovery")}
            onUseInChat={useCoachDraftInChat}
            onSubmitFeedback={submitSelectedMatchFeedback}
          />
        )}
        {screen === "events" && (
          <EventsHub
            ports={{
              liveSearchConfigured: false,
              searchPlaces: async () => null,
            }}
            mode={coupleMode.experienceMode}
            defaultCity={profileDraft.city}
            profileVibes={vibeList}
            relationshipIntent={intent}
            onBack={() => setScreen("home")}
            onOpenDatePlan={(place) => {
              setDatePlanPreset(place ?? null);
              navigateTo("datePlan");
            }}
            onOpenTool={openCoupleTool}
            navigate={navigateTo}
          />
        )}
        {screen === "executive" && (
          <ExecutiveCircleScreen
            preview={
              memberDataRuntime.source === "preview" || isPreviewAccessMode
            }
            navigate={navigateTo}
            onBack={() => setScreen("explore")}
            onOpenEvents={() => setScreen("events")}
            onOpenPricing={() => setScreen("pricing")}
            onOpenVerify={() => setScreen("verifyHub")}
            onOpenDatePlan={() => setScreen("datePlan")}
          />
        )}
        {screen === "verifyHub" && (
          <VerificationHubScreen
            preview={memberDataRuntime.source === "preview"}
            verified={verified}
            selfieUri={selfieUri}
            hasVoiceIntro={!!voiceIntroUri}
            vouches={vouches}
            onBack={() => setScreen("profile")}
            onVerify={async () => {
              if (!accessToken) {
                setAppNotice({
                  title: "Sign in required",
                  body: "Please sign in again to complete verification.",
                  icon: "shield-outline",
                  tone: "ruby",
                });
                return;
              }
              if (!selfieUri) {
                setAppNotice({
                  title: "Selfie required",
                  body: "Add a selfie photo before submitting for verification.",
                  icon: "camera-outline",
                  tone: "ruby",
                });
                return;
              }
              try {
                await profileApi.submitVerification(accessToken, selfieUri);
                setVerified(true);
                setAppNotice({
                  title: "Trust badge upgraded",
                  body: "Your selfie has been submitted and saved to your account.",
                  icon: "shield-checkmark",
                  tone: "gold",
                });
              } catch (error) {
                setAppNotice({
                  title: "Verification failed",
                  body:
                    error instanceof Error
                      ? error.message
                      : "Could not submit verification. Please try again.",
                  icon: "cloud-offline-outline",
                  tone: "ruby",
                });
              }
            }}
            onOpenSafety={() => setScreen("safety")}
          />
        )}
        {screen === "admin" && (
          <AdminModerationPanelScreen
            reports={reports}
            blockedCount={blockedIds.length}
            runtime={{
              backendMode,
              appEnvironment,
              requiresRealBackend,
              apiConfigured: isApiConfigured,
              paymentsConfigured: false,
              giftOrderingConfigured,
              physicalGiftCount: physicalGifts.length,
              venueCount: placeDirectory.length,
              cityCount: placeCities.filter((city) => city !== "All").length,
              categoryCount: placeKinds.filter((kind) => kind !== "All").length,
              packageCount: datePackages.length,
              partnerLeadCount: launchMarketplaceCoverage.reduce(
                (sum, city) => sum + city.partnerLeads,
                0,
              ),
              signedPartnerCount: launchMarketplaceCoverage.reduce(
                (sum, city) => sum + city.signedPartners,
                0,
              ),
              eventCount: eventExperiences.length,
              marketplaceSnapshot: buildMarketplaceSnapshot(),
              allowsPreviewOtpFallback,
            }}
            onBack={() => setScreen("profile")}
          />
        )}
        {screen === "detail" && (
          <MatchDetailScreen
            match={selected}
            preferences={{ intent, vibes: vibeList, filters: matchFilters }}
            alignment={alignment}
            back={() => setScreen("home")}
            interested={() => chooseInterested(selected)}
            onRose={() => openRose(selected)}
            onProfileView={() => notifyProfileView(selected)}
            onPrivateBlock={() => setDetailSafetyOpen(true)}
          />
        )}
        {screen === "mutual" && (
          <MutualMatchScreen
            match={selected}
            next={() => setScreen("icebreaker")}
            back={() => setScreen("home")}
          />
        )}
        {screen === "icebreaker" && (
          <IcebreakerScreen
            match={selected}
            question={icebreakerQuestion}
            onSubmit={answerIcebreaker}
          />
        )}
        {screen === "chat" && (
          <ChatScreen
            runtimePorts={{
              realtime: { connect: async () => null },
              gifSearch: {
                configured: false,
                providerName: "Built-in preview catalog",
                search: async ({ query, offset = 0, limit = 36 }) => {
                  const all = searchChatGifCatalog(query);
                  const items = all.slice(offset, offset + limit);
                  return {
                    items,
                    totalCount: all.length,
                    nextOffset:
                      offset + items.length < all.length
                        ? offset + items.length
                        : null,
                    provider: "preview",
                  };
                },
              },
              gifts: {
                physicalMode: physicalGiftOrderingMode,
                digitalWalletMode: digitalGiftWalletMode,
                createIdempotencyKey: createGiftIdempotencyKey,
                formatMoney: formatGiftMoney,
                estimateQuote: estimateGiftOrderQuote,
                buildFulfillmentPlan: buildGiftFulfillmentPlan,
                orderSummary: giftOrderSummary,
                createOrder: createPhysicalGiftOrder,
                respondToOrder: respondToPhysicalGiftOrder,
                searchAddresses: searchGiftDeliveryAddresses,
                validateAddress: validateGiftDeliveryAddress,
                openIssue: openGiftOrderIssue,
              },
            }}
            previewState={showcasePreviewState}
            showcaseDateStatus={showcaseDateStatus}
            isChatPreview={
              memberDataRuntime.source === "preview" || isPreviewAccessMode
            }
            experienceMode={coupleMode.experienceMode}
            initialTool={chatLaunchTool}
            onToolConsumed={() => setChatLaunchTool(null)}
            match={conversationPartner}
            messages={chatMessages[conversationPartner.id] ?? []}
            reflection={relationshipReflections[conversationPartner.id]}
            reminder={relationshipReminders[conversationPartner.id]}
            settings={{
              ...defaultCoupleChatSettings,
              ...chatSettings[conversationPartner.id],
            }}
            conversationSettings={chatSettings}
            initialDraft={chatDrafts[conversationPartner.id] ?? ""}
            onDraftConsumed={() =>
              setChatDrafts((current) => {
                const next = { ...current };
                delete next[conversationPartner.id];
                return next;
              })
            }
            onSettingsChange={updateSelectedChatSettings}
            onDateStatus={(messageId, status) =>
              updateDatePlanStatus(conversationPartner.id, messageId, status)
            }
            onReflection={(messageId, choice) =>
              saveReflection(conversationPartner.id, messageId, choice)
            }
            onLearningConsent={(enabled) =>
              updateRelationshipLearningConsent(conversationPartner.id, enabled)
            }
            onReminder={(messageId, enabled) =>
              updateRelationshipReminder(
                conversationPartner.id,
                messageId,
                enabled,
              )
            }
            onJourneyEvent={recordJourneyEvent}
            coinBalance={coinBalance}
            roseAvailability={roseAvailability}
            onRose={() =>
              coupleMode.experienceMode === "seeking" &&
              openRose(conversationPartner)
            }
            onSend={(message) =>
              appendChatMessage(conversationPartner, message)
            }
            onEdit={(messageId, text) =>
              editChatMessage(conversationPartner, messageId, text)
            }
            onDelete={(messageId) =>
              deleteChatMessage(conversationPartner, messageId)
            }
            onMessageState={(messageId, input) =>
              updateChatMessageState(conversationPartner, messageId, input)
            }
            onGiftResponse={(messageId, input) =>
              respondToGiftRequest(conversationPartner, messageId, input)
            }
            onForward={(target, forwarded) =>
              forwardChatMessages(target, forwarded)
            }
            onOpenConversation={(target) => {
              setSelected(target);
              setScreen("chat");
            }}
            onSpendCoins={(coins) =>
              setCoinBalance((balance) => spendCoins(balance, coins))
            }
            onReport={(reason, details) =>
              void reportMatch(conversationPartner, reason, details)
            }
            onBlock={async () => {
              if (await blockMatch(conversationPartner)) setScreen("home");
            }}
            onUnmatch={async () => {
              if (await unmatchMatch(conversationPartner)) setScreen("home");
            }}
            navigate={navigateTo}
          />
        )}
        {screen === "datePlan" && (
          <DatePlannerScreen
            match={conversationPartner}
            preset={datePlanPreset}
            packages={datePackages}
            reservationMode="demo"
            onRequestApproximateLocation={async () => {
              const permission =
                await Location.requestForegroundPermissionsAsync();
              if (!permission.granted) return false;
              await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Low,
              });
              return true;
            }}
            onCheckWalletSupport={async () => false}
            onReserve={async () => undefined}
            onBack={() => setScreen("events")}
            onSend={async (message) => {
              const sent = await appendChatMessage(
                conversationPartner,
                message,
              );
              if (sent) setScreen("chat");
              return sent;
            }}
          />
        )}
        {screen === "safety" && (
          <SafetyCenter
            reports={reports}
            blockedCount={blockedIds.length}
            datePlans={Object.values(chatMessages)
              .flat()
              .filter((message) => message.type === "date")}
            safeCheckIns={safeCheckIns}
            preview={memberDataRuntime.source === "preview"}
            initialTool={
              (showcasePreviewState === "safety-plan"
                ? "plan"
                : showcasePreviewState === "safety-emergency"
                  ? "emergency"
                  : showcasePreviewState === "safety-privacy"
                    ? "privacy"
                    : showcasePreviewState === "safety-data"
                      ? "data"
                      : showcasePreviewState === "safety-delete"
                        ? "delete"
                        : null) as SafetyTool | null
            }
            onCheckIn={recordSafeCheckIn}
            onDeleteAccount={deleteAccount}
            onBack={() => setScreen("profile")}
          />
        )}
        {screen === "likes" && (
          <LikesScreen
            preview={memberDataRuntime.source === "preview"}
            previewLikeCount={24}
            openPricing={() => setScreen("pricing")}
            navigate={navigateTo}
          />
        )}
        {screen === "profile" && (
          <ProfileScreen
            experienceMode={coupleMode.experienceMode}
            connectionStatus={coupleMode.connection.status}
            partnerName={coupleMode.connection.partner?.displayName}
            onModeChange={(mode) => {
              chooseExperienceMode(mode);
              setScreen(mode === "couple" ? "coupleSetup" : "home");
            }}
            onOpenTool={openCoupleTool}
            profile={profileDraft}
            verified={verified}
            profilePhoto={profilePhotos[0]}
            photoCount={profilePhotos.length}
            hasVoiceIntro={!!voiceIntroUri}
            lastSeenVisible={lastSeenVisible}
            analyticsConsent={analyticsConsent}
            preview={
              memberDataRuntime.source === "preview" || isPreviewAccessMode
            }
            initialSettingsOpen={showcasePreviewState === "profile-settings"}
            showReset={!showcasePreviewScreen}
            resetLabel={backendMode === "demo" ? "Start over" : "Sign out"}
            onLastSeenVisibleChange={updateLastSeenPrivacy}
            onAnalyticsConsentChange={updateAnalyticsPrivacy}
            onInvite={() => setReferralOfferOpen(true)}
            navigate={navigateTo}
            onReset={resetDemo}
            onLogout={async () => {
              if (accessToken) {
                try {
                  await authApi.logout(accessToken);
                } catch {
                  // ignore network errors on logout; clear local session anyway
                }
              }
              await AsyncStorage.removeItem("destinyone_access_token");
              await AsyncStorage.removeItem("destinyone_refresh_token");
              setAccessToken("");
              await resetDemo();
            }}
            onDeactivate={async () => {
              if (!accessToken) return;
              try {
                await authApi.deactivateAccount(accessToken);
              } catch (error) {
                setAppNotice({
                  title: "Could not deactivate",
                  body:
                    error instanceof Error
                      ? error.message
                      : "Please try again.",
                  icon: "cloud-offline-outline",
                  tone: "ruby",
                });
                return;
              }
              await AsyncStorage.removeItem("destinyone_access_token");
              await AsyncStorage.removeItem("destinyone_refresh_token");
              setAccessToken("");
              await resetDemo();
            }}
            onDeletePermanently={() => setScreen("safety")}
          />
        )}
        {screen === "support" && (
          <SupportCenterScreen
            onBack={() => setScreen("profile")}
            onSubmit={async (input) => {
              const saved =
                input.topic === "Appeal"
                  ? await submitModerationAppeal(
                      input.caseId ?? "",
                      input.message,
                    )
                  : await submitSupportTicket(
                      input.topic as SupportTopic,
                      input.message,
                      { app: "DestinyOne", backendMode },
                      "support_center",
                    );
              const id =
                typeof saved === "string"
                  ? saved
                  : typeof saved === "object" && saved && "id" in saved
                    ? String(saved.id)
                    : undefined;
              return {
                id,
                stored: !!saved,
                note: saved
                  ? input.topic === "Appeal"
                    ? "Appeal submitted to the independent review queue."
                    : "Saved through the configured support adapter."
                  : "Saved in frontend preview. AWS support API connection is required for durable storage.",
              };
            }}
          />
        )}
        {screen === "pricing" && (
          <Pricing
            ports={{
              serverMode: memberDataRuntime.source === "server",
              previewEntitlementsAllowed:
                previewEntitlementAllowed(appEnvironment),
              restorePreviewPurchases: storeBilling.restore,
              storeBilling,
            }}
            back={() => setScreen("profile")}
            onInvite={() => setReferralOfferOpen(true)}
            onBuyRoses={(amount = 5) => {
              setRoseLedger((current) => ({
                ...current,
                paidCredits: current.paidCredits + amount,
              }));
              setAppNotice({
                title: "Thoughtful notes added",
                body: `Demo balance updated with ${amount} thoughtful notes. Secure App Store and Google Play billing will be available at launch.`,
                icon: "sparkles",
                tone: "gold",
              });
            }}
          />
        )}
        <RoseComposer
          visible={!!roseTarget}
          recipientName={roseTarget?.name ?? ""}
          availability={roseAvailability}
          onClose={() => setRoseTarget(null)}
          onSend={(note) => {
            if (roseTarget) void sendRose(roseTarget, note);
            setRoseTarget(null);
          }}
        />
        <RoseReceivedPopup
          data={rosePopup}
          onClose={() => setRosePopup(null)}
          onOpenChat={(match) => {
            setSelected(match);
            setRosePopup(null);
            setScreen("chat");
          }}
        />
        <SafetyActions
          visible={detailSafetyOpen}
          match={selected}
          onClose={() => setDetailSafetyOpen(false)}
          onSafetyCenter={() => {
            setDetailSafetyOpen(false);
            setScreen("safety");
          }}
          onReport={async (reason, details) => {
            setDetailSafetyOpen(false);
            if (await reportMatch(selected, reason, details))
              setAppNotice({
                title: "Report submitted privately",
                body: "Your report is saved for safety review. The other member is not notified.",
                icon: "flag-outline",
                tone: "gold",
              });
          }}
          onBlock={async () => {
            setDetailSafetyOpen(false);
            if (await blockMatch(selected)) {
              setScreen("home");
              setAppNotice({
                title: "Blocked privately",
                body: `${selected.name} is hidden from your matches, likes and chats. They will not be notified.`,
                icon: "ban-outline",
                tone: "ruby",
              });
            }
          }}
          onUnmatch={async () => {
            setDetailSafetyOpen(false);
            if (await unmatchMatch(selected)) {
              setScreen("home");
              setAppNotice({
                title: "Unmatched",
                body: `${selected.name} has been removed from your introductions and conversation flow.`,
                icon: "person-remove-outline",
                tone: "rose",
              });
            }
          }}
        />
        <AppNoticeSheet
          notice={appNotice}
          onClose={() => setAppNotice(null)}
          onAction={(nextScreen) => {
            setAppNotice(null);
            navigateTo(nextScreen);
          }}
        />
        <ReferralWelcomeOffer
          visible={referralOfferOpen}
          referralCode={referralCode}
          onClose={() => setReferralOfferOpen(false)}
          onViewPlans={() => {
            setReferralOfferOpen(false);
            setScreen("pricing");
          }}
        />
      </PremiumBackground>
    </SafeAreaProvider>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <DestinyOneApp />
    </ErrorBoundary>
  );
}
