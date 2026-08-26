import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {buildRuntimeCapabilities, type RuntimeCapabilitiesInput} from './runtimeCapabilities';

const appSource = [
  'src/app/DestinyOneApp.tsx',
  'src/features/trust/screens/TrustedCircleScreen.tsx',
  'src/features/dates/DatePlannerScreen.tsx',
  'src/features/chat/ChatFeature.tsx',
  'src/features/gifts/GiftMarketplaceScreen.tsx',
  'src/features/marketplace/EventsHubScreen.tsx',
].map(file=>readFileSync(file,'utf8')).join('\n');
const compact=(value:string)=>value.replace(/\s+/g,'');

const base: RuntimeCapabilitiesInput = {
  appEnvironment: 'development',
  requiresRealBackend: false,
  paymentsConfigured: false,
  giftOrderingConfigured: false,
  storeBillingConnected: false,
  verifiedVouchRewardsConnected: false,
};

describe('runtime economic capability policy', () => {
  it('keeps explicit local demos available only in development preview', () => {
    expect(buildRuntimeCapabilities(base)).toMatchObject({
      strictRuntime: false,
      dateReservations: 'demo',
      physicalGiftOrdering: 'demo',
      digitalGiftWallet: 'demo',
      vouchRewards: 'demo',
    });
  });

  it('blocks every unconnected economic mutation in production', () => {
    expect(buildRuntimeCapabilities({...base, appEnvironment: 'production'})).toMatchObject({
      strictRuntime: true,
      dateReservations: 'blocked',
      physicalGiftOrdering: 'blocked',
      digitalGiftWallet: 'blocked',
      vouchRewards: 'blocked',
    });
  });

  it('also blocks demos in a real-backend staging pilot', () => {
    const snapshot = buildRuntimeCapabilities({...base, appEnvironment: 'staging', requiresRealBackend: true});
    expect(snapshot.strictRuntime).toBe(true);
    expect(Object.values(snapshot).filter((value) => value === 'demo')).toHaveLength(0);
  });

  it('opens only the provider-backed capabilities that are actually connected', () => {
    expect(buildRuntimeCapabilities({
      ...base,
      appEnvironment: 'production',
      paymentsConfigured: true,
      giftOrderingConfigured: true,
    })).toMatchObject({
      dateReservations: 'live',
      physicalGiftOrdering: 'live',
      digitalGiftWallet: 'blocked',
      vouchRewards: 'blocked',
    });
  });

  it('wires blocked modes into every local economic UI mutation', () => {
    const source=compact(appSource);
    expect(source).toContain(compact("vouchRewardsMode==='demo'"));
    expect(source).toContain(compact("digitalGiftWalletMode!=='demo'"));
    expect(source).toContain(compact("physicalMode==='blocked'"));
    expect(source).toContain(compact("checkoutBlocked=mode==='blocked'"));
    expect(source).toContain(compact('No local reward balance changes'));
  });
});
