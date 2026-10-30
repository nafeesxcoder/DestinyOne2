import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_KEY = "destinyone_access_token";
const REFRESH_KEY = "destinyone_refresh_token";
let refreshInFlight: Promise<{
  accessToken: string;
  refreshToken: string;
} | null> | null = null;

export class AuthRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
// True only when the server says the saved session is invalid or expired.
export const isSessionRejected = (error: unknown) =>
  error instanceof AuthRequestError &&
  (error.status === 401 || error.status === 403);

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
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AuthRequestError(
        data.error || "Refresh failed",
        response.status,
      );
    }
    return data;
  },
  // Refreshes the saved session. Calls made at the same time share one request
  // (refresh tokens are single-use, so two parallel calls would make the second
  // one fail and sign the person out). Returns null when there is no saved
  // session. Throws AuthRequestError; only status 401/403 means the session is
  // really gone, anything else (offline, server error) is temporary.
  refreshSavedSession(): Promise<{
    accessToken: string;
    refreshToken: string;
  } | null> {
    if (!refreshInFlight) {
      refreshInFlight = (async () => {
        const saved = await AsyncStorage.getItem(REFRESH_KEY);
        if (!saved) return null;
        const tokens = await authApi.refresh(saved);
        await AsyncStorage.setItem(ACCESS_KEY, tokens.accessToken);
        await AsyncStorage.setItem(REFRESH_KEY, tokens.refreshToken);
        return {
          accessToken: tokens.accessToken as string,
          refreshToken: tokens.refreshToken as string,
        };
      })().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
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