import { giftApi } from "../../../api/giftApi";
import {
  estimateGiftOrderQuote,
  type GiftDeliveryAddress,
  type GiftOrderRequest,
  type GiftOrderResponse,
  type GiftRecipientResponse,
} from "./previewGiftRuntime";

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
  const created = await giftApi.createOrder(accessToken, conversationId, {
    productId: input.productId,
    productName: input.productName || quote.productName,
    note: input.note,
    currency: quote.currency,
    totalCents: quote.totalCents,
    deliveryAddress: input.deliveryAddress,
  });
  if (created.status === "recipient_accepted") {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://destinyone.co";
    const { checkoutUrl } = await giftApi.checkout(
      accessToken,
      created.orderId,
      `${origin}/?giftOrderId=${created.orderId}`,
      `${origin}/?giftOrderCancelled=${created.orderId}`,
    );
    if (typeof window !== "undefined") window.location.href = checkoutUrl;
  }
  return buildResponse(quote, created.orderId, created.status);
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
    status: updated.status,
    deliveryStatus: updated.status,
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