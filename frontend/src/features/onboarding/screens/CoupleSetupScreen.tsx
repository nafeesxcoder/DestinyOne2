import React, { useState, type ReactNode } from "react";
import { Image, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button, Field, shared } from "../../../components";
import { FormPage } from "../../../components/forms/FormScaffold";
import {
  MiniPremiumIcon,
  PremiumIcon,
} from "../../../components/premium/PremiumIcon";
import type {
  CoupleConnectionHub,
  CouplePartnerSummary,
} from "../../../domain/coupleConnection";
import type { ProfileDraft } from "../../../storage";
import { coupleModeStyles, styles } from "../../../theme/appStyles";

const backgroundImage = require("../../../../assets/background.png");

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

export function CoupleSetupScreen({
  profile,
  hub,
  onSaveProfile,
  onSearch,
  onRequest,
  onRespond,
  onOpenSpace,
  onDisconnect,
  onBack,
}: {
  profile: ProfileDraft;
  hub: CoupleConnectionHub;
  onSaveProfile: (input: {
    firstName: string;
    age: string;
    city: string;
    profession: string;
  }) => Promise<void>;
  onSearch: (phone: string) => Promise<CouplePartnerSummary>;
  onRequest: (member: CouplePartnerSummary) => Promise<unknown>;
  onRespond: (requestId: string, accept: boolean) => Promise<void>;
  onOpenSpace: () => void;
  onDisconnect: () => Promise<void>;
  onBack: () => void;
}) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [memberName, setMemberName] = useState(profile.firstName);
  const [age, setAge] = useState(profile.age);
  const [city, setCity] = useState(profile.city);
  const [profession, setProfession] = useState(profile.profession);
  const [profileEnabled, setProfileEnabled] = useState(false);
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<CouplePartnerSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const profileReady =
    memberName.trim().length >= 2 &&
    Number(age) >= 18 &&
    city.trim().length >= 2 &&
    profession.trim().length >= 2;
  const saveProfile = async () => {
    setBusy(true);
    setError("");
    try {
      await onSaveProfile({ firstName: memberName, age, city, profession });
      setProfileEnabled(true);
      setStatus("Details saved. Now enter your partner's phone number below.");
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Could not save your details.",
      );
    } finally {
      setBusy(false);
    }
  };
  const search = async () => {
    setBusy(true);
    setError("");
    setStatus("");
    setResult(null);
    try {
      setResult(await onSearch(phone));
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "We could not find a Couple Mode account with that phone number.",
      );
    } finally {
      setBusy(false);
    }
  };
  const sendRequest = async () => {
    if (!result) return;
    setBusy(true);
    setError("");
    try {
      await onRequest(result);
      setResult(null);
      setStatus(
        `Request sent privately to ${result.displayName}. It expires in 7 days.`,
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Could not send the connection request.",
      );
    } finally {
      setBusy(false);
    }
  };
  const respond = async (requestId: string, accept: boolean) => {
    setBusy(true);
    setError("");
    try {
      await onRespond(requestId, accept);
      setStatus(
        accept ? "Couple space connected." : "Request declined privately.",
      );
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Could not update the request.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (hub.connection)
    return (
      <PremiumBackground>
        <FormPage back={onBack}>
          <View style={coupleModeStyles.setupHero}>
            <PremiumIcon
              name="heart-circle"
              tone="gold"
              size={64}
              iconSize={30}
            />
            <Text style={styles.kicker}>CONNECTED</Text>
            <Text style={[shared.h1, { textAlign: "center" }]}>
              You found each other.
            </Text>
            <Text style={[shared.body, { textAlign: "center" }]}>
              Your private space with {hub.connection.partnerDisplayName} is
              ready. Matching stays off.
            </Text>
          </View>
          <View style={shared.spacer} />
          <Button
            label="Open our Couple Space"
            icon="heart"
            variant="gold"
            onPress={onOpenSpace}
          />
          {confirmDisconnect ? (
            <View style={{ gap: 10, marginTop: 16 }}>
              <Text style={[shared.body, { textAlign: "center" }]}>
                Disconnect from {hub.connection.partnerDisplayName}? This ends
                your shared space for both of you.
              </Text>
              <Button
                label={disconnecting ? "Disconnecting…" : "Yes, disconnect"}
                icon="close-circle"
                onPress={async () => {
                  setDisconnecting(true);
                  try {
                    await onDisconnect();
                  } finally {
                    setDisconnecting(false);
                    setConfirmDisconnect(false);
                  }
                }}
              />
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setConfirmDisconnect(false)}
              />
            </View>
          ) : (
            <View style={{ marginTop: 16 }}>
              <Button
                label="End this connection"
                variant="secondary"
                icon="close-circle-outline"
                onPress={() => setConfirmDisconnect(true)}
              />
            </View>
          )}
        </FormPage>
      </PremiumBackground>
    );
  return (
    <PremiumBackground>
      <FormPage back={onBack}>
        <View style={coupleModeStyles.setupHero}>
          <PremiumIcon
            name="people-circle"
            tone="gold"
            size={64}
            iconSize={30}
          />
          <Text style={styles.kicker}>CONNECT WITH YOUR PARTNER</Text>
          <Text style={[shared.h1, { textAlign: "center" }]}>
            Find your partner on DestinyOne
          </Text>
          <Text style={[shared.body, { textAlign: "center" }]}>
            Both of you need a DestinyOne account. Save your details, then
            search the phone number your partner uses to log in.
          </Text>
        </View>
        <View style={coupleModeStyles.profileSetupCard}>
          <View style={shared.row}>
            <MiniPremiumIcon
              name={
                profileEnabled ? "checkmark-circle" : "person-circle-outline"
              }
              tone={profileEnabled ? "gold" : "rose"}
              size={38}
              iconSize={18}
            />
            <View style={{ flex: 1, marginLeft: 9 }}>
              <Text style={styles.cardTitle}>Step 1 of 2 · Your details</Text>
              <Text style={styles.helper}>
                Your partner will see these details with your request.
              </Text>
            </View>
          </View>
          <View style={coupleModeStyles.setupFields}>
            <Field
              label="Name"
              placeholder="Your first name"
              value={memberName}
              onChangeText={setMemberName}
            />
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Age"
                  placeholder="30"
                  keyboardType="number-pad"
                  value={age}
                  onChangeText={setAge}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="City"
                  placeholder="Toronto, ON"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>
            <Field
              label="Job"
              placeholder="For example: Engineer"
              value={profession}
              onChangeText={setProfession}
            />
          </View>
          <Button
            disabled={!profileReady || busy}
            label={
              profileEnabled
                ? "Details saved"
                : busy
                  ? "Saving…"
                  : "Save my details"
            }
            icon={
              profileEnabled ? "checkmark-circle" : "shield-checkmark-outline"
            }
            variant={profileEnabled ? "secondary" : "gold"}
            onPress={() => void saveProfile()}
          />
        </View>
        {profileEnabled && (
          <View style={coupleModeStyles.phoneSearchCard}>
            <View style={shared.row}>
              <PremiumIcon name="search" tone="ruby" size={46} iconSize={21} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.cardTitle}>
                  Step 2 of 2 · Find your partner
                </Text>
                <Text style={styles.helper}>
                  Enter the phone number they use to log in, including the
                  country code.
                </Text>
              </View>
            </View>
            <Field
              label="Partner's phone number"
              placeholder="+1 647 555 0198"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(value: string) => {
                setPhone(value);
                setResult(null);
                setError("");
              }}
            />
            <Button
              disabled={busy || phone.trim().length < 8}
              label={busy ? "Searching…" : "Search for my partner"}
              icon="search"
              onPress={() => void search()}
            />
          </View>
        )}
        {!!result && (
          <View style={coupleModeStyles.partnerResult}>
            <View style={coupleModeStyles.partnerInitial}>
              <Text style={coupleModeStyles.partnerInitialText}>
                {result.displayName[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={shared.row}>
                <Text style={coupleModeStyles.partnerName}>
                  {result.displayName}
                </Text>
                {result.verified && (
                  <MiniPremiumIcon
                    name="shield-checkmark"
                    tone="gold"
                    size={27}
                    iconSize={13}
                  />
                )}
              </View>
              <Text style={styles.helper}>
                {result.profession} · {result.city}
              </Text>
              <Text style={coupleModeStyles.phoneVerified}>
                Verified phone account
              </Text>
            </View>
            <Button
              disabled={busy}
              label="Send connection request"
              icon="paper-plane-outline"
              variant="gold"
              onPress={() => void sendRequest()}
            />
          </View>
        )}
        {hub.outgoingRequests.map((request) => (
          <View key={request.requestId} style={coupleModeStyles.requestCard}>
            <MiniPremiumIcon
              name="time-outline"
              tone="gold"
              size={38}
              iconSize={18}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                Request sent to {request.member.displayName}
              </Text>
              <Text style={styles.helper}>
                Waiting for them to accept. Your couple space will open after
                that.
              </Text>
            </View>
            <View style={coupleModeStyles.pendingPill}>
              <Text style={coupleModeStyles.pendingText}>WAITING</Text>
            </View>
          </View>
        ))}
        {hub.incomingRequests.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionLabel}>CONNECTION REQUESTS</Text>
            {hub.incomingRequests.map((request) => (
              <View
                key={request.requestId}
                style={coupleModeStyles.incomingCard}
              >
                <View style={shared.row}>
                  <View style={coupleModeStyles.partnerInitial}>
                    <Text style={coupleModeStyles.partnerInitialText}>
                      {request.member.displayName[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.cardTitle}>
                      {request.member.displayName}
                    </Text>
                    <Text style={styles.helper}>
                      {request.member.profession} · {request.member.city}
                    </Text>
                  </View>
                  <MiniPremiumIcon
                    name="shield-checkmark"
                    tone="gold"
                    size={30}
                    iconSize={14}
                  />
                </View>
                <Text style={styles.helper}>
                  Only accept if you personally know this person and expected
                  their request.
                </Text>
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Button
                      disabled={busy}
                      label="Decline"
                      variant="secondary"
                      onPress={() => void respond(request.requestId, false)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      disabled={busy}
                      label="Accept"
                      icon="checkmark"
                      variant="gold"
                      onPress={() => void respond(request.requestId, true)}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
        {!!error && (
          <View style={coupleModeStyles.errorCard}>
            <MiniPremiumIcon
              name="alert-circle-outline"
              tone="ruby"
              size={30}
              iconSize={14}
            />
            <Text style={[styles.formError, { flex: 1, textAlign: "left" }]}>
              {error}
            </Text>
          </View>
        )}
        {!!status && (
          <View style={coupleModeStyles.successCard}>
            <MiniPremiumIcon
              name="checkmark-circle"
              tone="gold"
              size={30}
              iconSize={14}
            />
            <Text style={[styles.helper, { flex: 1, color: "#F3DFA7" }]}>
              {status}
            </Text>
          </View>
        )}
        <View style={coupleModeStyles.privateList}>
          {[
            [
              "key-outline",
              "Search uses their phone number",
              "You cannot search by name.",
            ],
            [
              "eye-off-outline",
              "Phone numbers stay hidden",
              "Neither phone number is shown to the other person.",
            ],
            [
              "shield-checkmark-outline",
              "Both people must agree",
              "Your couple space opens only after your partner accepts.",
            ],
          ].map(([icon, title, body]) => (
            <View key={title} style={coupleModeStyles.privateRow}>
              <MiniPremiumIcon
                name={icon as keyof typeof Ionicons.glyphMap}
                tone="rose"
                size={34}
                iconSize={16}
              />
              <View style={{ flex: 1 }}>
                <Text style={coupleModeStyles.privateTitle}>{title}</Text>
                <Text style={styles.helper}>{body}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.legal}>
          For safety, searches use the full phone number and are limited.
        </Text>
      </FormPage>
    </PremiumBackground>
  );
}
