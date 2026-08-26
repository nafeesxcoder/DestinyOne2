import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const app = [
  readFileSync('src/app/DestinyOneApp.tsx', 'utf8'),
  readFileSync('src/theme/appStyles.ts', 'utf8'),
  readFileSync('src/features/admin/AdminModerationPanelScreen.tsx', 'utf8'),
  readFileSync('src/features/gifts/GiftMarketplaceScreen.tsx', 'utf8'),
  readFileSync('src/features/marketplace/EventsHubScreen.tsx', 'utf8'),
  readFileSync('src/features/pricing/PricingScreen.tsx', 'utf8'),
].join('\n');
const compact = (value: string) => value.replace(/\s+/g, '');
const contains = (value: string) => expect(compact(app)).toContain(compact(value));

describe('monetization readiness wiring', () => {
  it('keeps real-world reservations separate from Apple or Google store billing', () => {
    contains("billingMode:'preview'");
    contains('reservationPaymentsReady:paymentsConfigured');
    expect(compact(app)).not.toContain(compact("billingMode:paymentsConfigured?'store':'preview'"));
  });

  it('keeps production paid feature gates and billing lock incomplete until provider integration', () => {
    contains('featureLimitsReady:false');
    contains('productionBillingLocked:false');
    contains("if(memberDataRuntime.source==='server')");
    contains('No charge or entitlement was created.');
  });

  it('anchors checkout sheets inside a full-screen modal root', () => {
    contains('<View style={pricingStyles.checkoutModalRoot}><Pressable style={chatStyles.modalBackdrop}');
    contains('checkoutModalRoot:{flex:1}');
    contains("animationType={Platform.OS==='web'?'fade':'slide'}");
  });
});
