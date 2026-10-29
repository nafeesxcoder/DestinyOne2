import { describe, expect, it } from 'vitest';
import { applyStatusToSteps, formatTimelineTime, giftChanged, giftHeadline, isAwaitingPayment, isTerminalGiftStatus, mergeOrderIntoGift, parseServerTime } from './giftTracking';

const steps = [
  { key: 'request', label: 'a', body: '', status: 'done' as const },
  { key: 'recipient', label: 'b', body: '', status: 'active' as const },
  { key: 'payment', label: 'c', body: '', status: 'pending' as const },
  { key: 'partner', label: 'd', body: '', status: 'pending' as const },
  { key: 'delivery', label: 'e', body: '', status: 'pending' as const },
];

describe('giftTracking', () => {
  it('moves the active step as the order progresses', () => {
    expect(applyStatusToSteps(steps, 'merchant_preparing')?.map((s) => s.status)).toEqual(['done', 'done', 'done', 'active', 'pending']);
    expect(applyStatusToSteps(steps, 'picked_up')?.map((s) => s.status)).toEqual(['done', 'done', 'done', 'done', 'active']);
    expect(applyStatusToSteps(steps, 'delivered')?.map((s) => s.status)).toEqual(['done', 'done', 'done', 'done', 'done']);
  });

  it('resets every step for cancelled, expired and refunded orders', () => {
    for (const status of ['cancelled', 'expired', 'refunded', 'failed'] as const) {
      expect(applyStatusToSteps(steps, status)?.every((s) => s.status === 'pending')).toBe(true);
    }
  });

  it('knows which statuses are final and which wait for payment', () => {
    expect(isTerminalGiftStatus('delivered')).toBe(true);
    expect(isTerminalGiftStatus('merchant_preparing')).toBe(false);
    expect(isAwaitingPayment('recipient_accepted')).toBe(true);
    expect(isAwaitingPayment('picked_up')).toBe(false);
  });

  it('explains closed orders in plain words', () => {
    expect(giftHeadline('expired').body).toContain('No charge was made');
    expect(giftHeadline('cancelled', 'Declined by recipient').body).toContain('Declined by recipient');
    expect(giftHeadline('delivered').tone).toBe('success');
  });

  it('reads server timestamps as UTC', () => {
    expect(parseServerTime('2026-10-28 17:30:22.367418')).toBe(Date.parse('2026-10-28T17:30:22.367418Z'));
    expect(formatTimelineTime('not a date')).toBe('');
  });

  it('merges a server order into a chat gift and detects changes', () => {
    const gift = { name: 'Cozy', emoji: 'x', deliveryStatus: 'recipient_pending' as const, steps };
    const merged = mergeOrderIntoGift(gift, { orderId: '1', status: 'merchant_preparing', productId: 'p', productName: 'Cozy', currency: 'USD', totalCents: 100, timeline: [{ status: 'merchant_preparing', at: '2026-10-28 17:30:22' }] });
    expect(merged.deliveryStatus).toBe('merchant_preparing');
    expect(merged.timeline).toHaveLength(1);
    expect(giftChanged(gift, merged)).toBe(true);
    expect(giftChanged(merged, mergeOrderIntoGift(merged, { orderId: '1', status: 'merchant_preparing', productId: 'p', productName: 'Cozy', currency: 'USD', totalCents: 100, timeline: merged.timeline }))).toBe(false);
  });
});
