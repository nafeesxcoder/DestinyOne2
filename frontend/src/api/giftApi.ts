const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

async function authFetch(path: string, accessToken: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export type RealGiftOrder = {
  orderId: string;
  status:
    | "recipient_pending"
    | "recipient_accepted"
    | "payment_authorized"
    | "merchant_preparing"
    | "delivered"
    | "cancelled"
    | "failed";
  productId: string;
  productName: string;
  note?: string | null;
  currency: string;
  totalCents: number;
  deliveryAddress?: unknown;
};

export const giftApi = {
  async createOrder(
    accessToken: string,
    conversationId: string,
    input: {
      productId?: string;
      productName?: string;
      note?: string;
      currency?: string;
      totalCents: number;
      deliveryAddress?: unknown;
    },
  ): Promise<RealGiftOrder> {
    const data = await authFetch("/gifts/orders", accessToken, {
      method: "POST",
      body: JSON.stringify({ conversationId, ...input }),
    });
    return data.order;
  },

  async respond(
    accessToken: string,
    orderId: string,
    accept: boolean,
    deliveryAddress?: unknown,
  ): Promise<RealGiftOrder> {
    const data = await authFetch(`/gifts/orders/${orderId}/respond`, accessToken, {
      method: "POST",
      body: JSON.stringify({ accept, deliveryAddress }),
    });
    return data.order;
  },

  async checkout(
    accessToken: string,
    orderId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ checkoutUrl: string }> {
    return authFetch(`/gifts/orders/${orderId}/checkout`, accessToken, {
      method: "POST",
      body: JSON.stringify({ successUrl, cancelUrl }),
    });
  },

  async confirm(
    accessToken: string,
    orderId: string,
    sessionId: string,
  ): Promise<RealGiftOrder> {
    const data = await authFetch(
      `/gifts/orders/${orderId}/confirm?session_id=${encodeURIComponent(sessionId)}`,
      accessToken,
    );
    return data.order;
  },

  async getOrder(accessToken: string, orderId: string): Promise<RealGiftOrder> {
    const data = await authFetch(`/gifts/orders/${orderId}`, accessToken);
    return data.order;
  },
};