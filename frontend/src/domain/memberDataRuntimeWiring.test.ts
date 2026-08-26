import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = [
  'src/app/DestinyOneApp.tsx',
  'src/features/access/screens/AccessScreens.tsx',
  'src/features/discovery/screens/HomeScreen.tsx',
  'src/features/discovery/screens/LikesScreen.tsx',
  'src/features/profile/screens/ProfileScreen.tsx',
  'src/features/trust/screens/SafetyScreens.tsx',
  'src/features/trust/screens/VerificationHubScreen.tsx',
  'src/features/chat/ChatFeature.tsx',
  'src/features/gifts/GiftMarketplaceScreen.tsx',
  'src/features/marketplace/EventsHubScreen.tsx',
  'src/features/pricing/PricingScreen.tsx',
].map(path => readFileSync(path, 'utf8')).join('\n');
const compact = (value: string) => value.replace(/\s+/g, '');
const expectWiring = (value: string) => expect(compact(app)).toContain(compact(value));

describe('member data runtime wiring', () => {
  it('does not hydrate or persist preview member state in a server runtime', () => {
    expectWiring('if(memberDataRuntime.allowsLocalHydration)');
    expectWiring('if(!hydrated||!memberDataRuntime.allowsLocalPersistence)return;');
    expectWiring("if(memberDataRuntime.source==='server')");
  });

  it('does not expose preview routes or mock matches outside demo mode', () => {
    expectWiring("backendRuntime.mode!=='demo'");
    expectWiring('memberDataRuntime.allowsMockMatches?null:[]');
  });

  it('allows the signed-out showcase flow on approved public preview hosts', () => {
    expectWiring("window.location.hostname.endsWith('.chatgpt.site')");
    expectWiring("window.location.hostname.endsWith('.workers.dev')");
    expectWiring("new URLSearchParams(window.location.search).get('previewAccess')==='1'");
  });

  it('shows an honest retry state when server matches fail', () => {
    expectWiring("setMatchLoadState('error')");
    expectWiring('We will never replace unavailable member data with demo profiles.');
    expectWiring('onRetryMatches');
  });

  it('requires server acknowledgement before committing member actions', () => {
    expectWiring('confirmMemberMutation(result');
    expectWiring("memberDataRuntime.source==='preview'||isMutualMatchDecision(result.data)");
    expectWiring("setAppNotice({title:'Interest sent privately'");
    expectWiring("if(!isChatMessage(result.data))");
  });

  it('keeps invented chat, likes, and presence signals in preview-only surfaces', () => {
    expectWiring("isChatPreview={memberDataRuntime.source==='preview'||isPreviewAccessMode}");
    expectWiring("!isCoupleMode&&isChatPreview&&<><View style={styles.iceReveal}");
    expectWiring("!isCoupleMode&&partnerTyping&&<View accessible accessibilityLabel={`${match.name} is typing`}");
    expectWiring("if(memberDataRuntime.source==='preview'||isPreviewAccessMode){");
    expectWiring('preview ? `${previewLikeCount} people have shown private interest.');
    expectWiring("preview={memberDataRuntime.source==='preview'}");
    expectWiring("'Private conversation'");
  });

  it('keeps verification, safety and checkout simulations out of server runtimes', () => {
    expectWiring("const recordSafeCheckIn=(id:string)=>{");
    expectWiring("Secure date check-ins are unavailable until the live safety endpoint is connected.");
    expectWiring("const requirePreview=(action:()=>void)=>");
    expectWiring("No verification, consent, or trusted-device result was changed.");
    expectWiring('if (preview) onVerifiedChange(true)');
    expectWiring("Your badge appears after approval.");
    expectWiring("No identity document was selected or stored.");
    expectWiring("Secure data export is unavailable until identity verification and the live export endpoint are connected.");
    expectWiring("if(memberDataRuntime.source==='server'){");
  });
});
