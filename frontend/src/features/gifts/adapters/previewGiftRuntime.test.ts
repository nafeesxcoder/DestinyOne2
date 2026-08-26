import { describe, expect, it } from 'vitest';
import { buildGiftConfirmationPlan, buildGiftFulfillmentPlan, buildGiftSteps, estimateGiftOrderQuote, formatGiftMoney, giftOrderSummary, respondToPhysicalGiftOrder, validateGiftDeliveryAddress } from './previewGiftRuntime';

describe('real gift fulfillment estimates', () => {
  it('estimates on-demand gifts in minutes with fees and tax', () => {
    const quote = estimateGiftOrderQuote(
      { productId: 'gelato-night', productName: 'Gelato Night', priceCents: 2600, recipientId: 'match-a' },
      new Date('2026-07-11T15:00:00-07:00'),
    );
    expect(quote.etaLabel).toBe('43–67 min');
    expect(quote.serviceLevelLabel).toBe('On-demand courier');
    expect(quote.paymentPolicy).toContain('recipient accepts');
    expect(quote.providerCapability).toContain('Preview mode');
    expect(quote.acceptanceWindowMinutes).toBe(30);
    expect(quote.quoteValidMinutes).toBe(10);
    expect(quote.etaConfidence).toBe('fast');
    expect(quote.currency).toBe('USD');
    expect(quote.pricingVersion).toBe('gift-checkout-v2-2026-08');
    expect(quote.rushFeeCents).toBeGreaterThan(0);
    expect(quote.exactRoutePending).toBe(true);
    expect(quote.totalCents).toBeGreaterThan(quote.itemSubtotalCents);
    expect(formatGiftMoney(quote.totalCents)).toMatch(/^\$/);
  });

  it('calculates distance, rush, small-order and scheduled-window pricing separately', () => {
    const fast = estimateGiftOrderQuote(
      { productId: 'chai-duo', productName: 'Chai Duo', priceCents: 2200, recipientId: 'match-a', deliveryWindow: 'asap', deliveryCity: 'Fresno, CA', deliveryDistanceMilesEstimate: 8.2 },
      new Date('2026-07-11T12:00:00-07:00'),
    );
    expect(fast.deliveryCity).toBe('Fresno, CA');
    expect(fast.distanceFeeCents).toBe(340);
    expect(fast.rushFeeCents).toBe(299);
    expect(fast.smallOrderFeeCents).toBe(199);
    const scheduled = estimateGiftOrderQuote(
      { productId: 'chai-duo', productName: 'Chai Duo', priceCents: 2200, recipientId: 'match-a', deliveryWindow: 'scheduled' },
      new Date('2026-07-11T12:00:00-07:00'),
    );
    expect(scheduled.rushFeeCents).toBe(0);
    expect(scheduled.etaMinutesMin).toBeGreaterThan(1400);
  });

  it('quotes every cart line and quantity instead of trusting one product total', () => {
    const quote = estimateGiftOrderQuote({
      productId: 'gift-cart',
      productName: '3 romantic gifts',
      priceCents: 1,
      recipientId: 'match-a',
      lineItems: [
        { productId: 'ruby-roses', quantity: 1 },
        { productId: 'chai-duo', quantity: 2 },
      ],
    }, new Date('2026-07-11T12:00:00-07:00'));
    expect(quote.itemSubtotalCents).toBe(9300);
    expect(quote.itemSubtotalCents).not.toBe(1);
    expect(quote.totalCents).toBeGreaterThan(quote.itemSubtotalCents);
  });

  it('uses INR product pricing while converting fees without a product minimum', () => {
    const quote = estimateGiftOrderQuote({
      productId: 'artisan-chocolate',
      productName: 'Artisan Love Chocolates',
      recipientId: 'match-india',
      currency: 'INR',
      marketCountry: 'IN',
      deliveryCity: 'New Delhi, Delhi',
    }, new Date('2026-07-11T12:00:00+05:30'));
    expect(quote.itemSubtotalCents).toBe(69900);
    expect(quote.deliveryFeeCents).toBeLessThan(20000);
    expect(quote.totalCents).toBeLessThan(150000);
  });

  it('quotes INR carts per line so the visible subtotal and checkout subtotal match', () => {
    const quote = estimateGiftOrderQuote({
      productId: 'gift-cart',
      recipientId: 'match-india',
      currency: 'INR',
      marketCountry: 'IN',
      lineItems: [{productId:'artisan-chocolate',quantity:2}],
    }, new Date('2026-07-11T12:00:00+05:30'));
    expect(quote.itemSubtotalCents).toBe(139800);
    expect(quote.totalCents-quote.itemSubtotalCents).toBeGreaterThan(0);
  });

  it('creates honest sender, recipient and email confirmation contracts', () => {
    const preview = buildGiftConfirmationPlan(true);
    expect(preview.channels).toHaveLength(7);
    expect(preview.channels.find(channel => channel.audience === 'sender' && channel.channel === 'in_app')?.status).toBe('sent');
    expect(preview.channels.filter(channel => channel.channel === 'email').every(channel => channel.status === 'preview_only')).toBe(true);
    expect(preview.channels.some(channel => channel.channel === 'push' && channel.audience === 'recipient')).toBe(true);
    expect(preview.channels.some(channel => channel.channel === 'sms' && channel.audience === 'recipient')).toBe(true);
    expect(preview.emailAdapter).toBe('developer_required');
    const production = buildGiftConfirmationPlan(false);
    expect(production.channels.filter(channel => channel.channel === 'email').every(channel => channel.status === 'queued')).toBe(true);
  });

  it('moves delivery to tomorrow after cutoff', () => {
    const quote = estimateGiftOrderQuote(
      { productId: 'ruby-roses', productName: 'Ruby Rose Bouquet', priceCents: 4900, recipientId: 'match-a' },
      new Date('2026-07-11T22:30:00-07:00'),
    );
    expect(quote.etaLabel).toContain('Tomorrow');
    expect(quote.providerRecommendation).toContain('same-day');
    expect(quote.etaMinutesMin).toBeGreaterThan(600);
  });

  it('builds a five-step recipient-private fulfillment tracker', () => {
    const quote = estimateGiftOrderQuote(
      { productId: 'chai-duo', productName: 'Chai & Coffee Duo', priceCents: 2200, recipientId: 'match-a' },
      new Date('2026-07-11T12:00:00-07:00'),
    );
    const steps = buildGiftSteps('payment_authorized', quote);
    expect(steps).toHaveLength(5);
    expect(steps[1]?.status).toBe('done');
    expect(steps[2]?.status).toBe('active');
    expect(steps[4]?.body).toContain(quote.etaLabel);
  });

  it('builds provider readiness and status copy for the order UI', () => {
    const quote = estimateGiftOrderQuote(
      { productId: 'ruby-roses', productName: 'Ruby Rose Bouquet', priceCents: 4900, recipientId: 'match-a' },
      new Date('2026-07-11T14:00:00-07:00'),
    );
    const plan = buildGiftFulfillmentPlan(quote);
    expect(plan).toHaveLength(4);
    expect(plan[0]?.title).toBe('Recipient approval');
    expect(plan.some((item) => item.owner === 'provider')).toBe(true);
    expect(giftOrderSummary('recipient_pending', quote).headline).toContain('Waiting');
    expect(giftOrderSummary('delivered', quote).tone).toBe('success');
  });

  it('validates private recipient addresses for US, Canada and India', () => {
    expect(validateGiftDeliveryAddress({recipientName:'Aarav',line1:'100 Main St',city:'Fresno',region:'CA',postalCode:'93721',country:'US'})).toBe('');
    expect(validateGiftDeliveryAddress({recipientName:'Aarav',line1:'100 King St',city:'Toronto',region:'ON',postalCode:'M5V 2T6',country:'CA'})).toBe('');
    expect(validateGiftDeliveryAddress({recipientName:'Aarav',line1:'12 Connaught Place',city:'New Delhi',region:'Delhi',postalCode:'110001',country:'IN'})).toBe('');
    expect(validateGiftDeliveryAddress({recipientName:'Aarav',line1:'100 Main St',city:'Fresno',region:'CA',postalCode:'bad',country:'US'})).toContain('ZIP');
  });

  it('returns country-scoped address suggestions that auto-fill structured fields', async () => {
    const { searchGiftDeliveryAddresses }=await import('./previewGiftRuntime');
    const us=await searchGiftDeliveryAddresses('3661','US');
    expect(us[0]).toMatchObject({line1:'3661 W Shaw Ave',city:'Fresno',region:'CA',postalCode:'93711',country:'US'});
    const india=await searchGiftDeliveryAddresses('Connaught','IN');
    expect(india[0]).toMatchObject({city:'New Delhi',postalCode:'110001',country:'IN'});
  });

  it('keeps preview accept and decline responses deterministic and private', async () => {
    const accepted=await respondToPhysicalGiftOrder({orderId:'demo-gift-recipient',accept:true,dropoff:{recipientName:'Aarav',line1:'100 Main St',city:'Fresno',region:'CA',postalCode:'93721',country:'US'}});
    expect(accepted.status).toBe('recipient_accepted');
    expect(accepted.addressStoredPrivately).toBe(true);
    const declined=await respondToPhysicalGiftOrder({orderId:'demo-gift-recipient-2',accept:false});
    expect(declined.status).toBe('cancelled');
    expect(declined.addressStoredPrivately).toBe(false);
  });
});
