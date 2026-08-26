import { describe, expect, it } from 'vitest';
import { previewScreens } from './types';

const completeOriginalRouteInventory = [
  'splash','welcome','auth','otp','verify','modeSelect','coupleSetup','profileSetup',
  'vibes','intent','alignment','home','explore','circle','discovery','detail','mutual',
  'icebreaker','chat','gifts','datePlan','safety','likes','profile','pricing','support',
  'coach','events','executive','verifyHub','readiness','community','blueprint','journey',
  'dateSafety','admin',
] as const;

describe('complete original route inventory', () => {
  it('keeps every original top-level screen available for preview and QA', () => {
    expect(previewScreens).toEqual(completeOriginalRouteInventory);
    expect(new Set(previewScreens).size).toBe(36);
  });
});
