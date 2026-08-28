const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export const authApi = {
  async requestOtp(channel: "phone" | "email", identifier: string) {
    const response = await fetch(`${API_URL}/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, identifier }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to send OTP");
    return data;
  },

  async verifyOtp(
    channel: "phone" | "email",
    identifier: string,
    code: string
  ) {
    const response = await fetch(`${API_URL}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, identifier, code }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Verification failed");
    return data; // { ok: true, user, accessToken, refreshToken }
  },

  async refresh(refreshToken: string) {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Refresh failed");
    return data; // { ok: true, accessToken, refreshToken }
  },

  async me(accessToken: string) {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load profile");
    return data; // { ok: true, user }
  },

  async logout(accessToken: string) {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Logout failed");
    return data;
  },

  // Google/Apple/LinkedIn login screen ka URL — WebBrowser.openAuthSessionAsync ke saath use hota hai
  oauthUrl(provider: "google" | "apple" | "linkedin") {
    return `${API_URL}/auth/${provider}`;
  },
};