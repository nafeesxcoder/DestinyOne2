import type { ChatMessage, CoupleChatSettings, DatePlanStatus } from "../storage";

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

  async editMessage(
    accessToken: string,
    conversationId: string,
    messageId: string,
    text: string,
  ): Promise<PersistenceResult<ChatMessage>> {
    return authFetch(`/chat/${conversationId}/messages/${messageId}`, accessToken, {
      method: "PUT",
      body: JSON.stringify({ text }),
    }) as Promise<PersistenceResult<ChatMessage>>;
  },

  async deleteMessage(
    accessToken: string,
    conversationId: string,
    messageId: string,
  ): Promise<PersistenceResult<ChatMessage>> {
    return authFetch(`/chat/${conversationId}/messages/${messageId}`, accessToken, {
      method: "DELETE",
    }) as Promise<PersistenceResult<ChatMessage>>;
  },

  async setMessageState(
    accessToken: string,
    conversationId: string,
    messageId: string,
    input: { starred?: boolean; pinned?: boolean; hidden?: boolean; reaction?: string | null },
  ): Promise<PersistenceResult<{ ok: boolean }>> {
    return authFetch(`/chat/${conversationId}/messages/${messageId}/state`, accessToken, {
      method: "PUT",
      body: JSON.stringify(input),
    }) as Promise<PersistenceResult<{ ok: boolean }>>;
  },

  async getSettings(
    accessToken: string,
    conversationId: string,
  ): Promise<CoupleChatSettings | null> {
    const result = await authFetch(`/chat/${conversationId}/settings`, accessToken);
    return (result.data as CoupleChatSettings | null) ?? null;
  },

  async saveSettings(
    accessToken: string,
    conversationId: string,
    settings: CoupleChatSettings,
  ): Promise<PersistenceResult<{ ok: boolean }>> {
    return authFetch(`/chat/${conversationId}/settings`, accessToken, {
      method: "PUT",
      body: JSON.stringify(settings),
    }) as Promise<PersistenceResult<{ ok: boolean }>>;
  },

  async uploadMedia(
    accessToken: string,
    localUri: string,
    fileName: string,
  ): Promise<string> {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const formData = new FormData();
    formData.append("file", blob, fileName);
    const uploadResponse = await fetch(`${API_URL}/chat/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
    const data = await uploadResponse.json();
    if (!uploadResponse.ok) {
      throw new Error(data.error || "Could not upload the file.");
    }
    return data.url as string;
  },
};