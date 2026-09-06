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
    return data;
  },
  async refresh(refreshToken: string) {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Refresh failed");
    return data;
  },
  async me(accessToken: string) {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load profile");
    return data;
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
  async deleteAccount(accessToken: string) {
    const response = await fetch(`${API_URL}/auth/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Account deletion failed");
    return data;
  },
  async deactivateAccount(accessToken: string) {
    const response = await fetch(`${API_URL}/auth/deactivate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Account deactivation failed");
    return data;
  },
  oauthUrl(provider: "google" | "apple" | "linkedin") {
    return `${API_URL}/auth/${provider}`;
  },
};