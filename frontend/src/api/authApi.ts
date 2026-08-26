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

  async googleAuth(idToken: string) {
    throw new Error("Google Auth flow has changed. Use expo-auth-session instead.");
  },
};