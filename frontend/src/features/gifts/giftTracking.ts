import type { RealGiftOrder } from "../../api/giftApi";
import type { ChatMessage } from "../../storage";

export type TrackedGiftStatus = RealGiftOrder["status"];
type ChatGift = NonNullable<ChatMessage["gift"]>;

const TERMINAL: TrackedGiftStatus[] = ["delivered", "cancelled", "failed", "refunded", "expired"];
// Statuses where the gift was dropped without being delivered.
const CLOSED: TrackedGiftStatus[] = ["cancelled", "failed", "refunded", "expired"];

export const isTerminalGiftStatus = (status?: string) =>
  !!status && TERMINAL.includes(status as TrackedGiftStatus);
export const isClosedGiftStatus = (status?: string) =>
  !!status && CLOSED.includes(status as TrackedGiftStatus);

// Before payment the card is polled quickly; afterwards a slow refresh is enough.
export const isAwaitingPayment = (status?: string) =>
  status === "recipient_pending" || status === "recipient_accepted";

const RANK: Record<TrackedGiftStatus, number> = {
  recipient_pending: 1,
  recipient_accepted: 2,
  payment_authorized: 3,
  merchant_preparing: 4,
  courier_assigned: 4,
  picked_up: 5,
  delivered: 6,
  cancelled: 0,
  failed: 0,
  refunded: 0,
  expired: 0,
};
const STEP_POSITION: Record<string, number> = {
  request: 1,
  recipient: 2,
  payment: 3,
  partner: 4,
  delivery: 5,
};

export function applyStatusToSteps(
  steps: ChatGift["steps"],
  status: TrackedGiftStatus,
): ChatGift["steps"] {
  if (!steps) return steps;
  const current = RANK[status] ?? 1;
  const closed = isClosedGiftStatus(status);
  return steps.map((step) => {
    const position = STEP_POSITION[step.key];
    if (!position) return step;
    const next = closed
      ? "pending"
      : current > position
        ? "done"
        : current === position
          ? "active"
          : "pending";
    return step.status === next ? step : { ...step, status: next };
  });
}

export type GiftHeadline = { title: string; body: string; tone: "info" | "success" | "warn" };

export function giftHeadline(status: TrackedGiftStatus, cancelledReason?: string): GiftHeadline {
  switch (status) {
    case "recipient_pending":
      return { title: "Waiting for them", body: "Waiting for your match to confirm delivery details.", tone: "info" };
    case "recipient_accepted":
      return { title: "Accepted · payment next", body: "Delivery details are confirmed. Payment is the last step before the gift is prepared.", tone: "info" };
    case "payment_authorized":
    case "merchant_preparing":
      return { title: "Gift is being prepared", body: "Payment is confirmed and the gift is being prepared.", tone: "info" };
    case "courier_assigned":
      return { title: "Courier assigned", body: "A courier is on the way to pick up the gift.", tone: "info" };
    case "picked_up":
      return { title: "On its way", body: "The courier has picked up the gift and is heading to the delivery address.", tone: "info" };
    case "delivered":
      return { title: "Delivered", body: "The gift has been delivered.", tone: "success" };
    case "cancelled":
      return { title: "Gift cancelled", body: cancelledReason ? `${cancelledReason}. Any payment is refunded automatically.` : "This gift was cancelled. Any payment is refunded automatically.", tone: "warn" };
    case "failed":
      return { title: "Delivery failed", body: "The gift could not be delivered. Any payment is refunded automatically.", tone: "warn" };
    case "refunded":
      return { title: "Refunded", body: "The payment for this gift has been refunded.", tone: "warn" };
    case "expired":
      return { title: "Gift expired", body: "This gift was not completed in time. No charge was made.", tone: "warn" };
    default:
      return { title: "Gift order updated", body: "Check back here for the latest status.", tone: "info" };
  }
}

export function timelineLabel(status: string): string {
  const labels: Record<string, string> = {
    recipient_pending: "Gift sent",
    recipient_accepted: "Accepted",
    payment_authorized: "Payment authorized",
    merchant_preparing: "Paid · preparing",
    courier_assigned: "Courier assigned",
    picked_up: "Out for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
    failed: "Delivery failed",
    refunded: "Refunded",
    expired: "Expired",
  };
  return labels[status] ?? status;
}

// The server sends MySQL datetimes in UTC ("2026-10-28 17:30:22.367418").
export function parseServerTime(value: string): number {
  const text = String(value).trim();
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text.replace(" ", "T")}Z`;
  return Date.parse(iso);
}

export function formatTimelineTime(value: string): string {
  const time = parseServerTime(value);
  if (!Number.isFinite(time)) return "";
  return new Date(time).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function mergeOrderIntoGift(gift: ChatGift, order: RealGiftOrder): ChatGift {
  return {
    ...gift,
    deliveryStatus: order.status,
    steps: applyStatusToSteps(gift.steps, order.status),
    trackingUrl: order.trackingUrl ?? gift.trackingUrl,
    cancelledReason: order.cancelledReason,
    timeline: order.timeline ?? gift.timeline,
  };
}

export function giftChanged(before: ChatGift, after: ChatGift): boolean {
  return (
    before.deliveryStatus !== after.deliveryStatus ||
    before.trackingUrl !== after.trackingUrl ||
    before.cancelledReason !== after.cancelledReason ||
    (before.timeline?.length ?? 0) !== (after.timeline?.length ?? 0)
  );
}
