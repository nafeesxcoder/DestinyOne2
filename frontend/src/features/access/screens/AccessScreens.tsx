import React, { useEffect, useState, type ReactNode } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

import { Button, Field, SectionTitle, shared } from "../../../components";
import { FormPage, Segment } from "../../../components/forms/FormScaffold";
import {
  PremiumIcon,
  ReferenceIconTile,
} from "../../../components/premium/PremiumIcon";
import {
  isValidEmail,
  isValidPassword,
  isValidPhone,
} from "../../../domain/validation";
import { colors } from "../../../theme";
import {
  authStyles,
  mediaStyles,
  onboardingStyles,
  styles,
  verificationStyles,
} from "../../../theme/appStyles";

const backgroundImage = require("../../../../assets/background.png");

/* =========================================================
   PREMIUM BACKGROUND
   ========================================================= */
function PremiumBackground({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, overflow: "hidden", backgroundColor: "#FFF7F7" }}>
      <Image
        source={backgroundImage}
        resizeMode="cover"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
      />
      {children}
    </View>
  );
}

/* =========================================================
   GLOW ICON (Dark red background style)
   ========================================================= */
function GlowIcon({
  icon,
  size = 36,
  color = "#FFFFFF",
  glowColor = "#E5092F",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
  glowColor?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(35,0,7,.90)",
        borderWidth: 1.5,
        borderColor: "rgba(255,110,130,.72)",
        shadowColor: glowColor,
        shadowOpacity: 0.72,
        shadowRadius: 13,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
      }}
    >
      <LinearGradient
        colors={[
          "rgba(255,255,255,.22)",
          "rgba(229,9,47,.30)",
          "rgba(70,0,8,.30)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: size / 2,
        }}
      />
      <Ionicons name={icon} size={size * 0.48} color={color} />
    </View>
  );
}

export type AccessMethod = "phone" | "email";
export type SocialProvider = "Apple" | "Google" | "LinkedIn";

export type AccessRequest = {
  method: AccessMethod;
  destination: string;
  password?: string;
};

type AuthScreenProps = {
  onBack: () => void;
  onRequestCode: (request: AccessRequest) => Promise<void>;
  onSocialContinue: (provider: SocialProvider) => Promise<void>;
};

export function AuthScreen({
  onBack,
  onRequestCode,
  onSocialContinue,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AccessMethod>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [authError, setAuthError] = useState("");
  const [socialStatus, setSocialStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const phoneValid = isValidPhone(phone);
  const emailValid = isValidEmail(email);
  const passwordValid = isValidPassword(password);
  const valid = mode === "phone" ? phoneValid : emailValid && passwordValid;

  const submit = async () => {
    setSubmitted(true);
    setAuthError("");
    setSocialStatus("");
    if (!valid) return;
    setLoading(true);
    try {
      await onRequestCode(
        mode === "phone"
          ? { method: "phone", destination: phone }
          : {
              method: "email",
              destination: email.trim().toLowerCase(),
              password,
            },
      );
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Could not create your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: AccessMethod) => {
    setMode(next);
    setSubmitted(false);
    setAuthError("");
    setSocialStatus("");
  };
  const socialLogin = async (provider: SocialProvider) => {
    setLoading(true);
    setAuthError("");
    setSocialStatus(`Continuing securely with ${provider}…`);
    try {
      await onSocialContinue(provider);
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : `Could not continue with ${provider}.`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumBackground>
      <FormPage
        {...({ style: { backgroundColor: "transparent" } } as any)}
        back={onBack}
        step={1}
      >
        <SectionTitle
          emphasis
          eyebrow="YOUR INVITE"
          title="Let’s make this yours."
          body="Start with your phone, email, or a trusted account."
        />
        <View style={authStyles.socialGrid}>
          {(["Apple", "Google", "LinkedIn"] as const).map((provider) => (
            <Pressable
              key={provider}
              accessibilityRole="button"
              accessibilityLabel={`Continue with ${provider}`}
              disabled={loading}
              onPress={() => void socialLogin(provider)}
              style={authStyles.socialButton}
            >
              <GlowIcon
                icon={
                  provider === "Apple"
                    ? "logo-apple"
                    : provider === "Google"
                      ? "logo-google"
                      : "logo-linkedin"
                }
                size={38}
                color="#FFFFFF"
                glowColor="#E5092F"
              />
              <Text style={authStyles.socialText}>{provider}</Text>
            </Pressable>
          ))}
        </View>
        {!!socialStatus && (
          <View style={authStyles.socialStatus}>
            <GlowIcon
              icon="shield-checkmark"
              size={34}
              color="#FFFFFF"
              glowColor="#E5092F"
            />
            <Text style={authStyles.socialStatusText}>{socialStatus}</Text>
          </View>
        )}
        <View style={authStyles.orRow}>
          <View style={authStyles.orLine} />
          <Text style={authStyles.orText}>or continue with</Text>
          <View style={authStyles.orLine} />
        </View>
        <View style={styles.segment}>
          <Segment
            label="Phone"
            active={mode === "phone"}
            onPress={() => switchMode("phone")}
          />
          <Segment
            label="Email"
            active={mode === "email"}
            onPress={() => switchMode("email")}
          />
        </View>
        <View style={{ gap: 16 }}>
          {mode === "phone" ? (
            <>
              <Field
                emphasis
                label="Phone number"
                placeholder="+1  (555)  000-0000"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                error={
                  submitted && !phoneValid
                    ? "Enter a valid 10-digit phone number."
                    : ""
                }
              />
              <Text style={[styles.helper, onboardingStyles.supportingText]}>
                We’ll text you a one-time code. Your number stays private.
              </Text>
            </>
          ) : (
            <>
              <Field
                emphasis
                label="Email address"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                error={
                  submitted && !emailValid ? "Enter a valid email address." : ""
                }
              />
              <Field
                emphasis
                label="Password"
                placeholder="10+ characters"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                error={
                  submitted && !passwordValid
                    ? "Use 10+ characters with uppercase, lowercase, and a number."
                    : ""
                }
              />
              <Text style={[styles.helper, onboardingStyles.supportingText]}>
                We’ll send a quick code before your profile opens.
              </Text>
            </>
          )}
        </View>
        <View style={shared.spacer} />
        {!!authError && <Text style={styles.formError}>{authError}</Text>}

        {/* MAIN BUTTON - dark red gradient */}
        <Pressable
          disabled={loading}
          onPress={() => void submit()}
          style={{
            borderRadius: 32,
            overflow: "hidden",
            opacity: loading ? 0.5 : 1,
          }}
        >
          <LinearGradient
            colors={["#390006", "#7C0015", "#430009", "#210003"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 56,
              borderRadius: 32,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              borderWidth: 1.5,
              borderColor: "rgba(255,60,80,.62)",
            }}
          >
            <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
            <Text
              style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 15 }}
            >
              {loading
                ? "Please wait…"
                : mode === "phone"
                  ? "Send verification code"
                  : "Send email verification code"}
            </Text>
          </LinearGradient>
        </Pressable>

        <Text style={[styles.legal, onboardingStyles.supportingText]}>
          By continuing, you agree to our Terms and Privacy Policy.
        </Text>
      </FormPage>
    </PremiumBackground>
  );
}

type OtpScreenProps = {
  destination: string;
  allowPreviewCode: boolean;
  onBack: () => void;
  onResend: () => Promise<void>;
  onVerify: (code: string) => Promise<boolean>;
  onVerified: () => void;
};

export function OtpScreen({
  destination,
  allowPreviewCode,
  onBack,
  onResend,
  onVerify,
  onVerified,
}: OtpScreenProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(30);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);
  const masked = destination.includes("@")
    ? destination.replace(/^(.{2}).*(@.*)$/, "$1••••$2")
    : `••• ••• ${destination.replace(/\D/g, "").slice(-4)}`;
  const isEmail = destination.includes("@");
  const verify = async () => {
    setLoading(true);
    setError("");
    try {
      if (await onVerify(code)) onVerified();
      else
        setError(
          "That code doesn’t match. Check the six digits and try again.",
        );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Verification failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };
  const resend = async () => {
    setSeconds(30);
    setCode("");
    setError("");
    try {
      await onResend();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not resend the code.",
      );
    }
  };

  return (
    <PremiumBackground>
      <FormPage
        {...({ style: { backgroundColor: "transparent" } } as any)}
        back={onBack}
      >
        <SectionTitle
          emphasis
          eyebrow="ONE QUICK CHECK"
          title="Enter the code."
          body={`Sent to ${masked}`}
        />
        <View style={{ gap: 12 }}>
          <TextInput
            autoFocus
            value={code}
            onChangeText={(value) => {
              setCode(value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor="#554E5B"
            style={[styles.otpInput, error && { borderColor: colors.danger }]}
          />
          {error ? (
            <Text style={styles.formError}>{error}</Text>
          ) : allowPreviewCode ? (
            <Text style={styles.demoHint}>Showcase access code: 123456</Text>
          ) : (
            <Text style={[styles.helper, onboardingStyles.supportingText]}>
              Use the newest code from your {isEmail ? "email" : "messages"}.
            </Text>
          )}
        </View>
        <Pressable
          disabled={seconds > 0}
          onPress={() => void resend()}
          style={styles.resend}
        >
          <Text
            style={[styles.resendText, seconds > 0 && { color: colors.muted }]}
          >
            {seconds > 0
              ? `Resend code in 0:${String(seconds).padStart(2, "0")}`
              : "Resend verification code"}
          </Text>
        </Pressable>
        <View
          style={[
            shared.card,
            { flexDirection: "row", gap: 12, alignItems: "center" },
          ]}
        >
          <GlowIcon
            icon="lock-closed"
            size={34}
            color="#FFFFFF"
            glowColor="#E5092F"
          />
          <Text
            style={[
              styles.helper,
              onboardingStyles.supportingText,
              { flex: 1 },
            ]}
          >
            Your contact details never appear on your profile.
          </Text>
        </View>
        <View style={shared.spacer} />

        {/* MAIN BUTTON - dark red gradient */}
        <Pressable
          disabled={code.length !== 6 || loading}
          onPress={() => void verify()}
          style={{
            borderRadius: 32,
            overflow: "hidden",
            opacity: code.length !== 6 || loading ? 0.5 : 1,
          }}
        >
          <LinearGradient
            colors={["#390006", "#7C0015", "#430009", "#210003"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 56,
              borderRadius: 32,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              borderWidth: 1.5,
              borderColor: "rgba(255,60,80,.62)",
            }}
          >
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            <Text
              style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 15 }}
            >
              {loading ? "Verifying…" : "Verify and continue"}
            </Text>
          </LinearGradient>
        </Pressable>
      </FormPage>
    </PremiumBackground>
  );
}

type VerificationScreenProps = {
  preview: boolean;
  verified: boolean;
  selfieUri: string;
  onSelfie: (uri: string) => void;
  onVerifiedChange: (verified: boolean) => void;
  onNext: () => void;
};

export function VerificationScreen({
  preview,
  verified,
  selfieUri,
  onSelfie,
  onVerifiedChange,
  onNext,
}: VerificationScreenProps) {
  const [error, setError] = useState("");
  const [idUri, setIdUri] = useState("");
  const pickVerificationPhoto = async () => {
    setError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        "Photo library permission is needed to add a verification photo.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onSelfie(result.assets[0].uri);
      if (preview) onVerifiedChange(true);
    }
  };
  const captureSelfie = async () => {
    setError("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera permission is needed for selfie verification.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      onSelfie(result.assets[0].uri);
      if (preview) onVerifiedChange(true);
    }
  };
  const pickGovernmentId = async () => {
    setError("");
    if (!preview) {
      setError(
        "Secure ID verification is not connected yet. No identity document was selected or stored.",
      );
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library permission is needed to add an optional ID.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setIdUri(result.assets[0].uri);
  };

  return (
    <PremiumBackground>
      <FormPage
        {...({ style: { backgroundColor: "transparent" } } as any)}
        step={2}
      >
        <SectionTitle
          emphasis
          eyebrow="REAL PEOPLE. REAL INTENT."
          title="One selfie. More trust."
          body="A quick private check keeps fake profiles out and genuine people in."
        />
        <LinearGradient
          colors={
            verified
              ? ["rgba(212,175,55,.14)", "rgba(55,10,19,.96)"]
              : ["rgba(229,9,47,.12)", "rgba(31,7,13,.96)"]
          }
          style={verificationStyles.card}
        >
          <View style={verificationStyles.glow} />
          <View style={styles.selfie}>
            {selfieUri ? (
              <Image
                source={{ uri: selfieUri }}
                style={mediaStyles.selfieImage}
              />
            ) : (
              <GlowIcon
                icon={verified ? "shield-checkmark" : "scan"}
                size={54}
                color="#FFFFFF"
                glowColor="#E5092F"
              />
            )}
            {verified && (
              <View style={mediaStyles.selfieCheck}>
                <PremiumIcon
                  name="checkmark"
                  tone="ruby"
                  size={27}
                  iconSize={13}
                  referenceGlass
                />
              </View>
            )}
          </View>

          <View
            style={[
              verificationStyles.statusPill,
              {
                backgroundColor: "#FFF8E9",
                borderColor: "#E9CC83",
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons
              name={verified ? "checkmark-circle" : "lock-closed"}
              size={13}
              color="#6B4B1A"
            />
            <Text style={[verificationStyles.statusText, { color: "#6B4B1A" }]}>
              {verified ? "TRUST BADGE ACTIVE" : "PRIVATE CHECK"}
            </Text>
          </View>

          <Text style={[verificationStyles.title, { color: "#FFFFFF" }]}>
            {verified
              ? "Verified looks good on you."
              : selfieUri && !preview
                ? "Your selfie is in review."
                : "Let’s make it official."}
          </Text>

          <Text style={[verificationStyles.body, { color: "#F5E6E8" }]}>
            {verified
              ? "Your trust badge is live. Your selfie stays private."
              : selfieUri && !preview
                ? "Your selfie is being reviewed privately. Your badge appears after approval."
                : "Choose a recent solo photo. It will never appear on your profile."}
          </Text>

          <View style={{ width: "100%", gap: 10 }}>
            <Button
              variant={verified ? "gold" : "secondary"}
              label={verified ? "Update my selfie" : "Choose a selfie"}
              onPress={() => void pickVerificationPhoto()}
              icon="images"
            />
            <Button
              variant="ghost"
              label="Take one now"
              onPress={() => void captureSelfie()}
              icon="camera-outline"
            />
          </View>
          {!!error && <Text style={styles.formError}>{error}</Text>}
        </LinearGradient>
        <Pressable
          onPress={() => void pickGovernmentId()}
          style={[styles.upload, verificationStyles.idCard]}
        >
          <GlowIcon
            icon={idUri ? "checkmark-circle" : "id-card"}
            size={34}
            color="#FFFFFF"
            glowColor="#E5092F"
          />
          <View style={{ flex: 1 }}>
            <Text style={shared.label}>
              {idUri
                ? "Extra trust added"
                : preview
                  ? "Want a stronger trust signal?"
                  : "Strengthen your trust badge"}
            </Text>
            <Text style={[styles.helper, onboardingStyles.supportingText]}>
              {idUri
                ? "Your ID was added privately"
                : preview
                  ? "Add an ID privately. Totally optional."
                  : "Available through secure ID verification"}
            </Text>
          </View>
          <PremiumIcon
            name={idUri ? "checkmark" : "chevron-forward"}
            tone="ruby"
            size={28}
            iconSize={13}
            referenceGlass
          />
        </Pressable>
        <View style={shared.spacer} />

        {/* KEEP GOING - MAIN BUTTON (dark red gradient) */}
        <Pressable
          disabled={preview ? !verified : !selfieUri}
          onPress={onNext}
          style={{
            borderRadius: 32,
            overflow: "hidden",
            opacity: (preview ? !verified : !selfieUri) ? 0.5 : 1,
          }}
        >
          <LinearGradient
            colors={["#390006", "#7C0015", "#430009", "#210003"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 52,
              borderRadius: 32,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              borderWidth: 1.5,
              borderColor: "rgba(255,60,80,.62)",
            }}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            <Text
              style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 15 }}
            >
              {selfieUri && !verified && !preview
                ? "Continue while we review"
                : "Keep going"}
            </Text>
          </LinearGradient>
        </Pressable>
      </FormPage>
    </PremiumBackground>
  );
}
