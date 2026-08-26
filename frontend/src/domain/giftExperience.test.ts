import {describe,expect,it} from 'vitest';
import {buildGiftMarketplaceProducts} from './giftCommerce';
import {buildGiftConciergeV2Plan,buildGiftPriceBreakdown,giftReactionSignals,parseGiftConciergePrompt} from './giftExperience';

describe('gift experience v2',()=>{
  it('understands a natural Hindi-English INR request',()=>{
    expect(parseGiftConciergePrompt('Anika upset hai, ₹2,000 ke andar aaj thoughtful gift','INR',600000)).toMatchObject({budgetMinor:200000,inferredMood:'comforting',inferredDelivery:'today'});
  });

  it('returns three in-budget non-repeating options with cautions',()=>{
    const products=buildGiftMarketplaceProducts({country:'IN',city:'New Delhi, Delhi'});
    const plan=buildGiftConciergeV2Plan({prompt:'Anika upset hai, ₹2,000 ke andar aaj thoughtful gift',products,currency:'INR',fallbackBudgetMinor:200000,previousProductIds:['chai-duo'],relationshipStage:'dating'});
    expect(plan.options).toHaveLength(3);
    expect(plan.options.every(option=>option.estimatedTotalMinor<=200000&&option.productId!=='chai-duo')).toBe(true);
    expect(plan.options[0]?.caution).toContain('Avoid');
  });

  it('makes every price component reconcile to one final payable authorization',()=>{
    expect(buildGiftPriceBreakdown({productSubtotalMinor:4900,addOnSubtotalMinor:600,deliveryMinor:799,serviceMinor:399,taxMinor:586,discountMinor:200,tipMinor:500})).toMatchObject({finalPayableMinor:7584,refundableAuthorizationMinor:7584});
  });

  it('turns recipient reactions into private learning signals',()=>{
    expect(giftReactionSignals('loved_it')).toEqual({learningSignal:'delivered_positive',score:4});
    expect(giftReactionSignals('not_my_style')).toEqual({learningSignal:'delivered_negative',score:-4});
  });
});
