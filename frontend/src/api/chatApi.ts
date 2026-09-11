import type { ChatMessage, DatePlanStatus } from "../storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export type PersistenceResult<T = unknown> = {
  saved: boolean;
  reason: "backend" | "preview_id" | "demo" | "error";
  data?: T;
  error?: string;
};

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
  if (!response.ok) {
    return { saved: false, reason: "error", error: data.error || "Request failed" } as PersistenceResult;
  }
  return { saved: !!data.saved, reason: data.reason || "backend", data: data.data } as PersistenceResult;
}

export const chatApi = {
  async fetchMessages(accessToken: string, conversationId: string): Promise<ChatMessage[]> {
    const result = await authFetch(`/chat/${conversationId}/messages`, accessToken);
    return (result.data as ChatMessage[]) || [];
  },

  async fetchMessagesSince(
    accessToken: string,
    conversationId: string,
    sinceMs: number,
  ): Promise<ChatMessage[]> {
    const result = await authFetch(
      `/chat/${conversationId}/messages?since=${sinceMs}`,
      accessToken,
    );
    return (result.data as ChatMessage[]) || [];
  },

  async sendMessage(
    accessToken: string,
    conversationId: string,
    message: ChatMessage,
  ): Promise<PersistenceResult<ChatMessage>> {
    return authFetch(`/chat/${conversationId}/messages`, accessToken, {
      method: "POST",
      body: JSON.stringify(message),
    }) as Promise<PersistenceResult<ChatMessage>>;
  },

  async sendDateProposal(
    accessToken: string,
    conversationId: string,
    date: NonNullable<ChatMessage["date"]>,
  ): Promise<PersistenceResult<{ id: string; status: string }>> {
    return authFetch(`/chat/${conversationId}/date-proposal`, accessToken, {
      method: "POST",
      body: JSON.stringify(date),
    }) as Promise<PersistenceResult<{ id: string; status: string }>>;
  },

  async setDatePlanStatus(
    accessToken: string,
    proposalId: string | undefined,
    status: DatePlanStatus,
  ): Promise<PersistenceResult<{ id: string; status: string }>> {
    return authFetch(`/chat/date-proposal/status`, accessToken, {
      method: "PUT",
      body: JSON.stringify({ proposalId, status }),
    }) as Promise<PersistenceResult<{ id: string; status: string }>>;
  },

  async shareLiveLocation(
    accessToken: string,
    conversationId: string,
    location: NonNullable<ChatMessage["location"]>,
    clientActionId: string,
  ): Promise<PersistenceResult<{ ok: boolean }>> {
    return authFetch(`/chat/${conversationId}/location`, accessToken, {
      method: "POST",
      body: JSON.stringify({ location, clientActionId }),
    }) as Promise<PersistenceResult<{ ok: boolean }>>;
  },
};