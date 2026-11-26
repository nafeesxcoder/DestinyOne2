import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button, Field, SectionTitle, shared } from "../../../components";
import { FormPage, Segment } from "../../../components/forms/FormScaffold";
import {
  isValidEmail,
  isValidPassword,
  normalizeAuthPhone,
} from "../../../domain/validation";
import { colors } from "../../../theme";
import { onboardingStyles, styles } from "../../../theme/appStyles";
import { PremiumBackground } from "./AccessScreens";

/* =========================================================
   USERNAME + PASSWORD ACCOUNTS
   Signup: code, then username + password. Login: username/email/phone + password.
   Forgot password: code to phone or email, then a new password.
   ========================================================= */

const USERNAME_RULE = /^[a-z0-9_.]{3,20}$/;
const isUsernameShape = (value: string) =>
  USERNAME_RULE.test(value) && /[a-z]/.test(value);

const linkButton = { alignSelf: "center" as const, padding: 10 };
const linkText = {
  color: colors.wine,
  fontFamily: "Poppins_600SemiBold",
  fontSize: 14,
  textAlign: "center" as const,
};

const PASSWORD_HELP = "Use 10+ characters with uppercase, lowercase, and a number.";

/** Signup step after the code is verified: choose a username and password. */
export function CredentialsScreen({
  onBack,
  onCheckUsername,
  onSubmit,
}: {
  onBack: () => void;
  onCheckUsername: (
    username: string,
  ) => Promise<{ valid: boolean; available: boolean }>;
  onSubmit: (username: string, password: string) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<
    "idle" | "checking" | "free" | "taken" | "invalid"
  >("idle");
  const handle = username.trim().toLowerCase();
  const shapeValid = isUsernameShape(handle);
  const passwordValid = isValidPassword(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  useEffect(() => {
    if (!handle) {
      setAvailability("idle");
      return;
    }
    if (!shapeValid) {
      setAvailability("invalid");
      return;
    }
    let active = true;
    setAvailability("checking");
    const timer = setTimeout(() => {
      onCheckUsername(handle)
        .then((result) => {
          if (active) setAvailability(result.available ? "free" : "taken");
        })
        .catch(() => {
          if (active) setAvailability("idle");
        });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // Re-check only when the typed username changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, shapeValid]);

  const usernameMessage =
    submitted && !handle
      ? "Choose a username."
      : availability === "invalid"
        ? "3–20 letters, numbers, dots or underscores, with at least one letter."
        : availability === "taken"
          ? "That username is taken. Try another one."
          : "";

  const submit = async () => {
    setSubmitted(true);
    setFormError("");
    if (!shapeValid || availability === "taken" || !passwordValid || !passwordsMatch) {
      return;
    }
    setLoading(true);
    try {
      await onSubmit(handle, password);
    } catch (caught) {
      setFormError(
        caught instanceof Error ? caught.message : "Could not create your account.",
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
        step={2}
      >
        <SectionTitle
          emphasis
          eyebrow="YOUR LOGIN"
          title="Choose your login."
          body="You will use this username and password to log in next time."
        />
        <View style={{ gap: 16 }}>
          <Field
            emphasis
            label="Username"
            placeholder="e.g. ravi_k"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
            error={usernameMessage}
          />
          {availability === "free" && (
            <Text style={[styles.helper, { color: colors.gold }]}>
              Username is available.
            </Text>
          )}
          <Field
            emphasis
            label="Password"
            placeholder="10+ characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={submitted && !passwordValid ? PASSWORD_HELP : ""}
          />
          <Field
            emphasis
            label="Confirm password"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            error={submitted && !passwordsMatch ? "Passwords do not match." : ""}
          />
          <Text style={[styles.helper, onboardingStyles.supportingText]}>
            Forgot it later? We will send a code to your phone or email.
          </Text>
        </View>
        <View style={shared.spacer} />
        {!!formError && <Text style={styles.formError}>{formError}</Text>}
        <Button
          label={loading ? "Please wait…" : "Create account"}
          onPress={() => void submit()}
        />
      </FormPage>
    </PremiumBackground>
  );
}

/** Log in with username, email or phone, plus password. */
export function LoginScreen({
  onBack,
  onLogin,
  onForgot,
  onCreate,
}: {
  onBack: () => void;
  onLogin: (identifier: string, password: string) => Promise<void>;
  onForgot: () => void;
  onCreate: () => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setSubmitted(true);
    setFormError("");
    if (!identifier.trim() || !password) return;
    setLoading(true);
    try {
      await onLogin(identifier.trim(), password);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not log in.");
    } finally {
      setLoading(false);
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
          eyebrow="WELCOME BACK"
          title="Log in."
          body="Enter the username you chose and your password."
        />
        <View style={{ gap: 16 }}>
          <Field
            emphasis
            label="Username"
            placeholder="e.g. ravi_k"
            autoCapitalize="none"
            autoCorrect={false}
            value={identifier}
            onChangeText={setIdentifier}
            error={submitted && !identifier.trim() ? "Enter your username." : ""}
          />
          <Field
            emphasis
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={submitted && !password ? "Enter your password." : ""}
          />
        </View>
        <View style={shared.spacer} />
        {!!formError && <Text style={styles.formError}>{formError}</Text>}
        <Button
          label={loading ? "Please wait…" : "Log in"}
          onPress={() => void submit()}
        />
        <Pressable accessibilityRole="button" onPress={onForgot} style={linkButton}>
          <Text style={linkText}>Forgot password?</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCreate} style={linkButton}>
          <Text style={linkText}>New here? Create an account</Text>
        </Pressable>
      </FormPage>
    </PremiumBackground>
  );
}

/** Forgot password: a code goes to the phone or email on the account. */
export function ForgotPasswordScreen({
  onBack,
  onRequestCode,
}: {
  onBack: () => void;
  onRequestCode: (channel: "phone" | "email", destination: string) => Promise<void>;
}) {
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const normalizedPhone = normalizeAuthPhone(phone);
  const emailValid = isValidEmail(email);

  const submit = async () => {
    setSubmitted(true);
    setFormError("");
    if (method === "phone" ? !normalizedPhone : !emailValid) return;
    setLoading(true);
    try {
      await onRequestCode(
        method,
        method === "phone" ? (normalizedPhone as string) : email.trim().toLowerCase(),
      );
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not send the code.");
    } finally {
      setLoading(false);
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
          eyebrow="PASSWORD HELP"
          title="Let’s reset it."
          body="We will send a 6-digit code to the phone or email you signed up with."
        />
        <View style={styles.segment}>
          <Segment
            label="Phone"
            active={method === "phone"}
            onPress={() => setMethod("phone")}
          />
          <Segment
            label="Email"
            active={method === "email"}
            onPress={() => setMethod("email")}
          />
        </View>
        <View style={{ gap: 16 }}>
          {method === "phone" ? (
            <>
              <Field
                emphasis
                label="Phone number with country code"
                placeholder="+1 416 555 0123"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                error={
                  submitted && !normalizedPhone
                    ? "Enter the number with its country code, starting with +."
                    : ""
                }
              />
              <Text style={[styles.helper, onboardingStyles.supportingText]}>
                Start with + and your country code, for example +1 for Canada or the USA.
              </Text>
            </>
          ) : (
            <Field
              emphasis
              label="Email address"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              error={submitted && !emailValid ? "Enter a valid email address." : ""}
            />
          )}
        </View>
        <View style={shared.spacer} />
        {!!formError && <Text style={styles.formError}>{formError}</Text>}
        <Button
          label={loading ? "Please wait…" : "Send reset code"}
          onPress={() => void submit()}
        />
      </FormPage>
    </PremiumBackground>
  );
}

/**
 * Last step of a reset: the code was verified, now set the new password.
 * Accounts made with only a code also pick a username here, so they can log in.
 */
export function NewPasswordScreen({
  onBack,
  askUsername,
  onSubmit,
}: {
  onBack: () => void;
  askUsername: boolean;
  onSubmit: (password: string, username?: string) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const handle = username.trim().toLowerCase();
  const usernameValid = !askUsername || isUsernameShape(handle);
  const passwordValid = isValidPassword(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  const submit = async () => {
    setSubmitted(true);
    setFormError("");
    if (!usernameValid || !passwordValid || !passwordsMatch) return;
    setLoading(true);
    try {
      await onSubmit(password, askUsername ? handle : undefined);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not reset your password.");
    } finally {
      setLoading(false);
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
          eyebrow="NEW PASSWORD"
          title="Choose a new password."
          body="You will log in with it next time."
        />
        <View style={{ gap: 16 }}>
          {askUsername && (
            <Field
              emphasis
              label="Choose a username"
              placeholder="e.g. ravi_k"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={setUsername}
              error={
                submitted && !usernameValid
                  ? "3–20 letters, numbers, dots or underscores, with at least one letter."
                  : ""
              }
            />
          )}
          <Field
            emphasis
            label="New password"
            placeholder="10+ characters"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            error={submitted && !passwordValid ? PASSWORD_HELP : ""}
          />
          <Field
            emphasis
            label="Confirm new password"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
            error={submitted && !passwordsMatch ? "Passwords do not match." : ""}
          />
        </View>
        <View style={shared.spacer} />
        {!!formError && <Text style={styles.formError}>{formError}</Text>}
        <Button
          label={loading ? "Please wait…" : "Save new password"}
          onPress={() => void submit()}
        />
      </FormPage>
    </PremiumBackground>
  );
}
