/** Every top-level UI destination in the original DestinyOne experience. */
export type Screen =
  | 'splash' | 'welcome' | 'auth' | 'otp' | 'verify' | 'modeSelect'
  | 'coupleSetup' | 'profileSetup' | 'vibes' | 'intent' | 'alignment'
  | 'home' | 'explore' | 'circle' | 'discovery' | 'detail' | 'mutual'
  | 'icebreaker' | 'chat' | 'gifts' | 'datePlan' | 'safety' | 'likes'
  | 'profile' | 'pricing' | 'support' | 'coach' | 'events' | 'executive'
  | 'verifyHub' | 'readiness' | 'community' | 'blueprint' | 'journey'
  | 'dateSafety' | 'admin';

/** Deep-linkable modal or state used by visual QA and product previews. */
export type PreviewState =
  | 'profile-settings' | 'profile-referral' | 'match-safety'
  | 'chat-search' | 'chat-coach' | 'chat-attachments' | 'chat-document'
  | 'chat-media' | 'chat-voice' | 'chat-recording' | 'chat-emoji'
  | 'chat-gif' | 'chat-gift' | 'chat-gift-recipient' | 'chat-games'
  | 'chat-snap' | 'chat-face-emoji' | 'chat-audio-call' | 'chat-video-call'
  | 'chat-settings' | 'chat-options' | 'chat-safety'
  | 'chat-relationship-path' | 'chat-date-accepted' | 'chat-date-cancelled'
  | 'chat-date-no-show' | 'chat-date-unresponsive' | 'safety-plan'
  | 'safety-emergency' | 'safety-privacy' | 'safety-data' | 'safety-delete';

export const previewScreens: readonly Screen[] = [
  'splash','welcome','auth','otp','verify','modeSelect','coupleSetup','profileSetup',
  'vibes','intent','alignment','home','explore','circle','discovery','detail','mutual',
  'icebreaker','chat','gifts','datePlan','safety','likes','profile','pricing','support',
  'coach','events','executive','verifyHub','readiness','community','blueprint','journey',
  'dateSafety','admin',
];

export const previewStates: readonly PreviewState[] = [
  'profile-settings','profile-referral','match-safety','chat-search','chat-coach',
  'chat-attachments','chat-document','chat-media','chat-voice','chat-recording',
  'chat-emoji','chat-gif','chat-gift','chat-gift-recipient','chat-games','chat-snap',
  'chat-face-emoji','chat-audio-call','chat-video-call','chat-settings','chat-options',
  'chat-safety','chat-relationship-path','chat-date-accepted','chat-date-cancelled',
  'chat-date-no-show','chat-date-unresponsive','safety-plan','safety-emergency',
  'safety-privacy','safety-data','safety-delete',
];

export const onboardingScreens = new Set<Screen>([
  'splash','welcome','auth','otp','verify','modeSelect','coupleSetup','profileSetup',
  'vibes','intent','alignment',
]);

export const resumableOnboardingScreens = new Set<Screen>([
  'welcome','auth','otp','verify','modeSelect','coupleSetup','profileSetup',
  'vibes','intent','alignment',
]);
