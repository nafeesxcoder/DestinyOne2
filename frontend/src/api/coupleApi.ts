import {
  parseCoupleConnectionHub,
  parseCoupleConnectionRequest,
  parseCouplePartnerSummary,
  isCoupleSearchMiss,
  type CoupleConnectionHub,
  type CoupleConnectionRequest,
  type CouplePartnerSummary,
} from "../domain/coupleConnection";

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

export const coupleApi = {
  async searchByPhone(accessToken: string, phone: string): Promise<CouplePartnerSummary> {
    const data = await authFetch(
      `/couple/search?phone=${encodeURIComponent(phone)}`,
      accessToken,
    );
    if (isCoupleSearchMiss(data)) throw new Error("No member found with that phone number.");
    return parseCouplePartnerSummary(data);
  },

  async sendRequest(accessToken: string, memberId: string): Promise<CoupleConnectionRequest> {
    const data = await authFetch("/couple/request", accessToken, {
      method: "POST",
      body: JSON.stringify({ memberId }),
    });
    return parseCoupleConnectionRequest(data);
  },

  async respond(
    accessToken: string,
    requestId: string,
    accept: boolean,
  ): Promise<CoupleConnectionHub> {
    const data = await authFetch("/couple/respond", accessToken, {
      method: "POST",
      body: JSON.stringify({ requestId, accept }),
    });
    return parseCoupleConnectionHub(data);
  },

  async getHub(accessToken: string): Promise<CoupleConnectionHub> {
    const data = await authFetch("/couple/hub", accessToken);
    return parseCoupleConnectionHub(data);
  },

  async setMode(accessToken: string, enabled: boolean) {
    return authFetch("/couple/mode", accessToken, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
  },

  async disconnect(accessToken: string) {
    return authFetch("/couple/disconnect", accessToken, {
      method: "POST",
    });
  },
};
