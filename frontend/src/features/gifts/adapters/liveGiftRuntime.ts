import { giftApi, type RealGiftOrder } from "../../../api/giftApi";
import {
  estimateGiftOrderQuote,
  type GiftDeliveryAddress,
  type GiftOrderRequest,
  type GiftOrderResponse,
  type GiftRecipientResponse,
} from "./previewGiftRuntime";

// The server also reports refunded/expired; the shared UI model shows both as cancelled.
function toUiStatus(status: RealGiftOrder["status"]): GiftOrderResponse["status"] {
  return status === "refunded" || status === "expired" ? "cancelled" : status;
}

function buildResponse(
  quote: ReturnType<typeof estimateGiftOrderQuote>,
  orderId: string,
  status: GiftOrderResponse["status"],
): GiftOrderResponse {
  const waiting = status === "recipient_pending";
  return {
    orderId,
    demo: false,
    status,
    deliveryStatus: status,
    provider: "doordash_drive",
    quote,
    steps: [
      {
        key: "request",
        label: "Order placed",
        body: "Your gift order was created.",
        status: "done",
      },
      {
        key: "recipient",
        label: waiting ? "Waiting for them" : "Address confirmed",
        body: waiting
          ? "Waiting for your match to confirm delivery details."
          : "Delivery details are confirmed.",
        status: waiting ? "active" : "done",
      },
      {
        key: "payment",
        label: "Payment",
        body: waiting
          ? "Payment happens once they accept."
          : "Complete payment to confirm the order.",
        status: waiting ? "pending" : "active",
      },
      {
        key: "partner",
        label: "Delivery partner",
        body: "DestinyOne arranges the delivery partner for this order.",
        status: "pending",
      },
      {
        key: "delivery",
        label: "Delivery",
        body: "You will be notified once it is on the way.",
        status: "pending",
      },
    ],
    confirmations: {
      channels: [],
      emailAdapter: "developer_required",
      senderReceiptLabel: "Receipt sent to your account",
      recipientRequestLabel: "They will be notified",
    },
  };
}

export async function createPhysicalGiftOrderLive(
  accessToken: string,
  conversationId: string,
  input: GiftOrderRequest,
): Promise<GiftOrderResponse> {
  const quote = estimateGiftOrderQuote(input);
  // SECURITY: the sender must never send a delivery address. The order is always
  // created as recipient_pending and the address is added by the recipient in
  // respondToPhysicalGiftOrderLive(). Any input.deliveryAddress is ignored.
  const created = await giftApi.createOrder(accessToken, conversationId, {
    productId: input.productId,
    productName: input.productName || quote.productName,
    note: input.note,
    currency: quote.currency,
    totalCents: quote.totalCents,
  });
  // A new order never starts at recipient_accepted; checkout happens after the
  // recipient responds (see the gift card / payment step), not here.
  return buildResponse(quote, created.orderId, toUiStatus(created.status));
}

export async function respondToPhysicalGiftOrderLive(
  accessToken: string,
  input: { orderId: string; accept: boolean; dropoff?: GiftDeliveryAddress },
): Promise<GiftRecipientResponse> {
  const updated = await giftApi.respond(
    accessToken,
    input.orderId,
    input.accept,
    input.dropoff,
  );
  return {
    orderId: updated.orderId,
    status: toUiStatus(updated.status),
    deliveryStatus: toUiStatus(updated.status),
    accepted: input.accept,
    addressStoredPrivately: true,
  };
}

export async function confirmPhysicalGiftPaymentLive(
  accessToken: string,
  orderId: string,
  sessionId: string,
) {
  return giftApi.confirm(accessToken, orderId, sessionId);
}