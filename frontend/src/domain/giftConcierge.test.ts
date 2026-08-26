import {describe,expect,it} from 'vitest';
import {buildGiftConciergePlan,estimateConciergeCartTotal} from './giftConcierge';

describe('gift AI concierge preview',()=>{
  it('respects budget, mood and delivery timing',()=>{
    const plan=buildGiftConciergePlan({budgetCents:4000,mood:'comforting',occasion:'Just because',deliveryWindow:'asap',recipientName:'Anika',city:'Fresno'});
    expect(plan.recommendedProductIds).toContain('chai-duo');
    expect(plan.reason).toContain('Fresno');
    expect(plan.mode).toBe('preview_rules');
    expect(plan.estimatedTotalCents).toBeLessThanOrEqual(4000);
  });

  it('keeps the complete checkout estimate inside budget instead of only checking each item',()=>{
    const plan=buildGiftConciergePlan({budgetCents:4500,mood:'comforting',occasion:'Thinking of you',deliveryWindow:'asap',recipientName:'Anika'});
    expect(plan.estimatedTotalCents).toBeLessThanOrEqual(4500);
    expect(estimateConciergeCartTotal(plan.recommendedProductIds,'asap').totalCents).toBe(plan.estimatedTotalCents);
    expect(plan.recommendedProductIds).not.toEqual(expect.arrayContaining(['chai-duo','artisan-chocolate','card']));
  });

  it('explains premium privacy and fulfillment differences',()=>{
    const plan=buildGiftConciergePlan({budgetCents:8000,mood:'romantic',occasion:'Milestone',deliveryWindow:'scheduled',recipientName:'Anika'});
    expect(plan.premiumDifferentiators).toHaveLength(4);
    expect(plan.premiumDifferentiators.some(item=>item.title.includes('Relationship'))).toBe(true);
    expect(plan.suggestedNote).toContain('Anika');
  });

  it('never falls back to an over-budget cart when fees make delivery impossible',()=>{
    const plan=buildGiftConciergePlan({budgetCents:2500,mood:'romantic',occasion:'Just because',deliveryWindow:'asap',recipientName:'Anika'});
    expect(plan.recommendedProductIds).toEqual([]);
    expect(plan.estimatedTotalCents).toBe(0);
    expect(plan.reason).toContain('No asap cart fits');
  });
});
