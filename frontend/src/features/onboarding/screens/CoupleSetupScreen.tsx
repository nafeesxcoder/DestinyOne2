import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button, Field, shared } from "../../../components";
import { FormPage } from "../../../components/forms/FormScaffold";
import type {
  CoupleConnectionHub,
  CoupleContactMatch,
  CouplePairingConnection,
  CouplePartnerProfile,
  CouplePartnerSummary,
} from "../../../domain/coupleConnection";
import type { ProfileDraft } from "../../../storage";
import { colors } from "../../../theme";
import { styles } from "../../../theme/appStyles";
import {
  canPickContacts,
  pickContacts,
  sendInvite,
  toE164,
  type PickedContact,
} from "../inviteHelpers";

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

type DetailsInput = {
  firstName: string;
  age: string;
  city: string;
  profession: string;
};

type Props = {
  profile: ProfileDraft;
  hub: CoupleConnectionHub;
  onSaveProfile: (input: DetailsInput) => Promise<void>;
  // Resolves to null when nobody with that phone / email has an account.
  onSearch: (identifier: string) => Promise<CouplePartnerSummary | null>;
  onMatchContacts: (phones: string[]) => Promise<CoupleContactMatch[]>;
  onLoadPartnerProfile: (connectionId: string) => Promise<CouplePartnerProfile>;
  onRequest: (member: CouplePartnerSummary) => Promise<unknown>;
  onRespond: (requestId: string, accept: boolean) => Promise<void>;
  // Opens the chat with one specific partner, like tapping a chat in WhatsApp.
  onOpenSpace: (connectionId: string) => void;
  onDisconnect: (connectionId: string) => Promise<void>;
  // Safety actions on a partner's profile (same endpoints as the normal chat).
  onBlockPartner?: (memberId: string) => Promise<boolean>;
  onReportPartner?: (memberId: string, reason: string) => Promise<boolean>;
  // Open straight on this partner's profile (chat header avatar tap).
  initialViewingId?: string | null;
  onBack: () => void;
};

const REPORT_REASONS = [
  "Fake or misleading profile",
  "Harassment or disrespect",
  "Asked for money",
  "Inappropriate content",
  "Safety concern",
];

type Miss = { phone?: string; email?: string };

function Avatar({ name, size = 46 }: { name: string; size?: number }) {
  return (
    <View
      style={[
        local.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[local.avatarText, { fontSize: size * 0.42 }]}>
        {name[0]?.toUpperCase() ?? "?"}
      </Text>
    </View>
  );
}

function SmallButton({
  label,
  icon,
  onPress,
  disabled,
  tone = "primary",
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  tone?: "primary" | "outline";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={[
        local.smallButton,
        tone === "outline" && local.smallButtonOutline,
        disabled && { opacity: 0.5 },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={15}
          color={tone === "outline" ? colors.pink : "#FFFFFF"}
        />
      )}
      <Text
        style={[
          local.smallButtonText,
          tone === "outline" && { color: colors.pink },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View style={local.pill}>
      <Text style={local.pillText}>{label}</Text>
    </View>
  );
}

/* ----------------------------------------------------------------------
   Partner profile (tap the (i) on a partner, like a WhatsApp contact card)
   ---------------------------------------------------------------------- */
function PartnerProfileView({
  connection,
  onLoad,
  onOpenChat,
  onDisconnect,
  onBlock,
  onReport,
  onClose,
}: {
  connection: CouplePairingConnection;
  onLoad: (connectionId: string) => Promise<CouplePartnerProfile>;
  onOpenChat: () => void;
  onDisconnect: () => Promise<void>;
  onBlock?: () => Promise<boolean>;
  onReport?: (reason: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [safety, setSafety] = useState<"" | "report" | "block">("");
  const [safetyNote, setSafetyNote] = useState("");
  const [data, setData] = useState<CouplePartnerProfile | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError("");
    onLoad(connection.connectionId)
      .then((value) => alive && setData(value))
      .catch(
        (value) =>
          alive &&
          setError(
            value instanceof Error ? value.message : "Could not load profile.",
          ),
      );
    return () => {
      alive = false;
    };
  }, [connection.connectionId]);

  const name = data?.displayName ?? connection.partnerDisplayName;
  const facts: Array<[keyof typeof Ionicons.glyphMap, string, string]> = data
    ? ([
        ["briefcase-outline", "Job", data.profession],
        ["location-outline", "City", data.city],
        ["resize-outline", "Height", data.height],
        ["book-outline", "Religion", data.religion],
        ["people-outline", "Community", data.community],
      ] as Array<[keyof typeof Ionicons.glyphMap, string, string]>).filter(
        ([, , value]) => !!value,
      )
    : [];

  return (
    <View style={{ gap: 16 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to partners"
        onPress={onClose}
        style={local.backRow}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
        <Text style={local.backText}>Partners</Text>
      </Pressable>

      {data && data.photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {data.photos.map((uri, index) => (
            <Image
              key={`${uri}-${index}`}
              source={{ uri }}
              resizeMode="cover"
              style={local.photo}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={{ alignItems: "center" }}>
          <Avatar name={name} size={96} />
        </View>
      )}

      <View style={{ alignItems: "center", gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={local.profileName}>
            {name}
            {data?.age ? `, ${data.age}` : ""}
          </Text>
          {data?.verified && (
            <Ionicons name="shield-checkmark" size={20} color={colors.gold} />
          )}
        </View>
        {!!data?.city && <Text style={styles.helper}>{data.city}</Text>}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Open chat"
            icon="chatbubble-ellipses"
            variant="gold"
            onPress={onOpenChat}
          />
        </View>
      </View>

      {!data && !error && <Text style={styles.helper}>Loading profile…</Text>}
      {!!error && <Text style={styles.formError}>{error}</Text>}

      {!!data?.about && (
        <View style={local.card}>
          <Text style={local.cardLabel}>ABOUT</Text>
          <Text style={shared.body}>{data.about}</Text>
        </View>
      )}

      {facts.length > 0 && (
        <View style={local.card}>
          {facts.map(([icon, label, value]) => (
            <View key={label} style={local.factRow}>
              <Ionicons name={icon} size={18} color={colors.pink} />
              <Text style={local.factLabel}>{label}</Text>
              <Text style={local.factValue}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      {!!data && data.vibes.length > 0 && (
        <View style={local.card}>
          <Text style={local.cardLabel}>VIBES</Text>
          <View style={local.chipWrap}>
            {data.vibes.map((vibe) => (
              <View key={vibe} style={local.chip}>
                <Text style={local.chipText}>{vibe}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {(onBlock || onReport) && (
        <View style={local.card}>
          {safetyNote ? <Text style={styles.helper}>{safetyNote}</Text> : null}
          {safety === "report" ? (
            <View style={{ gap: 8 }}>
              <Text style={local.rowTitle}>Report {name} privately</Text>
              {REPORT_REASONS.map((reason) => (
                <Pressable
                  key={reason}
                  accessibilityRole="button"
                  onPress={async () => {
                    const ok = await onReport?.(reason);
                    setSafety("");
                    setSafetyNote(
                      ok
                        ? "Report sent. Our safety team will review it."
                        : "Could not send the report. Please try again.",
                    );
                  }}
                  style={local.dangerRow}
                >
                  <Text style={styles.helper}>{reason}</Text>
                </Pressable>
              ))}
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setSafety("")}
              />
            </View>
          ) : safety === "block" ? (
            <View style={{ gap: 10 }}>
              <Text style={styles.helper}>
                Block {name}? You will no longer see each other's messages.
              </Text>
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cancel"
                    variant="secondary"
                    onPress={() => setSafety("")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Yes, block"
                    icon="ban"
                    onPress={async () => {
                      const ok = await onBlock?.();
                      setSafety("");
                      setSafetyNote(
                        ok ? `${name} is blocked.` : "Could not block. Try again.",
                      );
                    }}
                  />
                </View>
              </View>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {onReport && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSafety("report")}
                  style={local.dangerRow}
                >
                  <Ionicons name="flag-outline" size={20} color={colors.danger} />
                  <Text style={local.dangerText}>Report {name}</Text>
                </Pressable>
              )}
              {onBlock && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSafety("block")}
                  style={local.dangerRow}
                >
                  <Ionicons name="ban-outline" size={20} color={colors.danger} />
                  <Text style={local.dangerText}>Block {name}</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}

      <View style={local.card}>
        {confirming ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.helper}>
              Disconnect from {name}? This ends your shared chat for both of
              you.
            </Text>
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => setConfirming(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  disabled={busy}
                  label={busy ? "Ending…" : "Yes, disconnect"}
                  icon="close-circle"
                  onPress={async () => {
                    setBusy(true);
                    try {
                      await onDisconnect();
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirming(true)}
            style={local.dangerRow}
          >
            <Ionicons
              name="close-circle-outline"
              size={20}
              color={colors.danger}
            />
            <Text style={local.dangerText}>Disconnect from {name}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* ----------------------------------------------------------------------
   Main screen
   ---------------------------------------------------------------------- */
function formatChatTime(at: number) {
  if (!at) return "";
  const d = new Date(at);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const y = new Date(now.getTime() - 86400000);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function CoupleSetupScreen({
  profile,
  hub,
  onSaveProfile,
  onSearch,
  onMatchContacts,
  onLoadPartnerProfile,
  onRequest,
  onRespond,
  onOpenSpace,
  onDisconnect,
  onBlockPartner,
  onReportPartner,
  initialViewingId,
  onBack,
}: Props) {
  const [memberName, setMemberName] = useState(profile.firstName);
  const [age, setAge] = useState(profile.age);
  const [city, setCity] = useState(profile.city);
  const [profession, setProfession] = useState(profile.profession);
  const detailsComplete = (
    first: string,
    ageValue: string,
    cityValue: string,
    job: string,
  ) =>
    first.trim().length >= 2 &&
    Number(ageValue) >= 18 &&
    cityValue.trim().length >= 2 &&
    job.trim().length >= 2;
  // Like a WhatsApp profile: once the details exist they are shown as a
  // summary and only change when the member taps Edit.
  const [detailsSaved, setDetailsSaved] = useState(() =>
    detailsComplete(
      profile.firstName,
      profile.age,
      profile.city,
      profile.profession,
    ),
  );
  const [editing, setEditing] = useState(false);
  // The saved profile can finish loading after this screen mounts (opening
  // the app straight on this screen), so follow it until the member edits.
  useEffect(() => {
    if (editing) return;
    setMemberName(profile.firstName);
    setAge(profile.age);
    setCity(profile.city);
    setProfession(profile.profession);
    if (
      detailsComplete(
        profile.firstName,
        profile.age,
        profile.city,
        profile.profession,
      )
    )
      setDetailsSaved(true);
  }, [profile.firstName, profile.age, profile.city, profile.profession]);
  const detailsReady = detailsComplete(memberName, age, city, profession);

  const [query, setQuery] = useState("");
  const [found, setFound] = useState<CouplePartnerSummary | null>(null);
  const [miss, setMiss] = useState<Miss | null>(null);
  const [contacts, setContacts] = useState<{
    names: Record<string, string>;
    matches: CoupleContactMatch[];
    others: Array<{ name: string; phone: string }>;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(initialViewingId ?? null);
  const contactsSupported = useMemo(() => canPickContacts(), []);

  const viewing = hub.connections.find((c) => c.connectionId === viewingId);
  const connectionFor = (memberId: string) =>
    hub.connections.find((c) => c.partnerMemberId === memberId);
  const incomingFor = (memberId: string) =>
    hub.incomingRequests.find((r) => r.member.memberId === memberId);
  const outgoingFor = (memberId: string) =>
    hub.outgoingRequests.find((r) => r.member.memberId === memberId);

  const run = async (task: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (value) {
      setError(value instanceof Error ? value.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = () =>
    run(async () => {
      await onSaveProfile({ firstName: memberName, age, city, profession });
      setDetailsSaved(true);
      setEditing(false);
      setStatus("Details saved.");
    }, "Could not save your details.");

  const search = () =>
    run(async () => {
      setStatus("");
      setFound(null);
      setMiss(null);
      setContacts(null);
      const value = query.trim();
      if (!value) return;
      const isEmail = value.includes("@");
      const identifier = isEmail ? value.toLowerCase() : toE164(value);
      if (!identifier)
        throw new Error(
          "Enter the full phone number with country code, for example +1 647 555 0198, or an email address.",
        );
      const member = await onSearch(identifier);
      if (member) setFound(member);
      else setMiss(isEmail ? { email: identifier } : { phone: identifier });
    }, "Search failed. Please try again.");

  const importContacts = () =>
    run(async () => {
      setStatus("");
      setFound(null);
      setMiss(null);
      const picked: PickedContact[] = await pickContacts();
      if (!picked.length) return;
      const names: Record<string, string> = {};
      picked.forEach((contact) =>
        contact.phones.forEach((phone) => {
          names[phone] = contact.name;
        }),
      );
      const matches = await onMatchContacts(Object.keys(names));
      const matched = new Set(matches.map((match) => match.phone));
      const others = Object.keys(names)
        .filter((phone) => !matched.has(phone))
        .map((phone) => ({ name: names[phone]!, phone }));
      setContacts({ names, matches, others });
    }, "Could not read your contacts.");

  const sendRequest = (member: CouplePartnerSummary) =>
    run(async () => {
      await onRequest(member);
      setFound(null);
      setStatus(
        `Request sent privately to ${member.displayName}. It expires in 7 days.`,
      );
    }, "Could not send the connection request.");

  const respond = (requestId: string, accept: boolean) =>
    run(async () => {
      await onRespond(requestId, accept);
      setStatus(
        accept ? "Connected. You can chat now." : "Request declined privately.",
      );
    }, "Could not update the request.");

  const invite = (target: Miss) =>
    run(async () => {
      await sendInvite(target, memberName);
    }, "Could not open the invite.");

  // One row for a member who is on DestinyOne, with the action that fits
  // where things stand (open chat / accept / waiting / connect).
  const memberAction = (member: CouplePartnerSummary) => {
    const connection = connectionFor(member.memberId);
    if (connection)
      return (
        <SmallButton
          label="Open chat"
          icon="chatbubble-ellipses"
          onPress={() => onOpenSpace(connection.connectionId)}
        />
      );
    const incoming = incomingFor(member.memberId);
    if (incoming)
      return (
        <SmallButton
          label="Accept"
          icon="checkmark"
          disabled={busy}
          onPress={() => void respond(incoming.requestId, true)}
        />
      );
    if (outgoingFor(member.memberId)) return <Pill label="REQUESTED" />;
    return (
      <SmallButton
        label="Connect"
        icon="person-add"
        disabled={busy || !detailsSaved}
        onPress={() => void sendRequest(member)}
      />
    );
  };

  const memberRow = (
    member: CouplePartnerSummary,
    key: string,
    subtitle?: string,
  ) => (
    <View key={key} style={local.row}>
      <Avatar name={member.displayName} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Text style={local.rowTitle} numberOfLines={1}>
            {member.displayName}
          </Text>
          {member.verified && (
            <Ionicons name="shield-checkmark" size={14} color={colors.gold} />
          )}
        </View>
        <Text style={styles.helper} numberOfLines={1}>
          {subtitle ||
            [member.profession, member.city].filter(Boolean).join(" · ") ||
            "On DestinyOne"}
        </Text>
      </View>
      {memberAction(member)}
    </View>
  );

  // Like a WhatsApp profile card: shown on top the first time (nothing saved
  // yet), then tucked at the bottom and only edited when the member asks.
  const detailsBlock = (
        <View style={{ gap: 8 }}>
      <Text style={local.sectionLabel}>YOUR DETAILS</Text>
      {detailsSaved && !editing ? (
        <View style={local.row}>
          <Avatar name={memberName || "?"} />
          <View style={{ flex: 1 }}>
            <Text style={local.rowTitle}>{memberName}</Text>
            <Text style={styles.helper}>
              {[age && `${age} yrs`, city, profession]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          <SmallButton
            label="Edit"
            tone="outline"
            icon="create-outline"
            onPress={() => setEditing(true)}
          />
        </View>
      ) : (
        <View style={local.card}>
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
          <View style={styles.twoCol}>
            {detailsSaved && (
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancel"
                  variant="secondary"
                  onPress={() => {
                    setMemberName(profile.firstName);
                    setAge(profile.age);
                    setCity(profile.city);
                    setProfession(profile.profession);
                    setEditing(false);
                  }}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button
                disabled={!detailsReady || busy}
                label={busy ? "Saving…" : "Save"}
                icon="checkmark-circle"
                variant="gold"
                onPress={() => void saveDetails()}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );

  if (viewing) {
    return (
      <PremiumBackground>
        <FormPage back={onBack}>
          <PartnerProfileView
            connection={viewing}
            onLoad={onLoadPartnerProfile}
            onOpenChat={() => onOpenSpace(viewing.connectionId)}
            onDisconnect={async () => {
              await onDisconnect(viewing.connectionId);
              setViewingId(null);
            }}
            onBlock={
              onBlockPartner
                ? () => onBlockPartner(viewing.partnerMemberId)
                : undefined
            }
            onReport={
              onReportPartner
                ? (reason) => onReportPartner(viewing.partnerMemberId, reason)
                : undefined
            }
            onClose={() => setViewingId(null)}
          />
        </FormPage>
      </PremiumBackground>
    );
  }

  return (
    <PremiumBackground>
      <FormPage back={onBack}>
        <View style={{ gap: 4 }}>
          <Text style={styles.kicker}>WITH MY PARTNER</Text>
          <Text style={shared.h1}>Your partners</Text>
        </View>

        {!detailsSaved && detailsBlock}

        {/* Search bar, like WhatsApp's: phone / email, or pick from contacts */}
        <View style={local.searchRow}>
          <View style={local.searchBox}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              accessibilityLabel="Search by phone number or email"
              placeholder="Phone number or email"
              placeholderTextColor="#6F6875"
              selectionColor={colors.wine}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              value={query}
              onChangeText={(value) => {
                setQuery(value);
                setFound(null);
                setMiss(null);
                setError("");
              }}
              onSubmitEditing={() => void search()}
              style={local.searchInput}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityLabel="Clear search"
                onPress={() => {
                  setQuery("");
                  setFound(null);
                  setMiss(null);
                }}
              >
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            disabled={busy || query.trim().length < 5}
            onPress={() => void search()}
            style={[
              local.iconButton,
              (busy || query.trim().length < 5) && { opacity: 0.5 },
            ]}
          >
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {contactsSupported ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void importContacts()}
            style={local.contactsButton}
          >
            <Ionicons name="people" size={20} color={colors.pink} />
            <View style={{ flex: 1 }}>
              <Text style={local.rowTitle}>Find from my contacts</Text>
              <Text style={styles.helper}>
                See who in your phone is already on DestinyOne and invite the
                rest.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => void invite({})}
            style={local.contactsButton}
          >
            <Ionicons name="paper-plane" size={20} color={colors.pink} />
            <View style={{ flex: 1 }}>
              <Text style={local.rowTitle}>Invite a friend</Text>
              <Text style={styles.helper}>
                Share a link so they can create their account.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        )}

        {!!error && <Text style={styles.formError}>{error}</Text>}
        {!!status && <Text style={local.status}>{status}</Text>}

        {!detailsSaved && (
          <Text style={styles.helper}>
            Save your details first. Your partner sees them with your request.
          </Text>
        )}

        {/* Search result */}
        {found && (
          <View style={{ gap: 8 }}>
            <Text style={local.sectionLabel}>SEARCH RESULT</Text>
            {memberRow(found, found.memberId)}
          </View>
        )}
        {miss && (
          <View style={local.card}>
            <Text style={local.rowTitle}>Not on DestinyOne yet</Text>
            <Text style={styles.helper}>
              {miss.phone ?? miss.email} doesn't have an account. Send them an
              invite so they can join, then connect here.
            </Text>
            <SmallButton
              label="Send invite"
              icon="paper-plane"
              onPress={() => void invite(miss)}
            />
          </View>
        )}

        {/* Contacts */}
        {contacts && (
          <View style={{ gap: 12 }}>
            <Text style={local.sectionLabel}>
              ON DESTINYONE · {contacts.matches.length}
            </Text>
            {contacts.matches.length === 0 && (
              <Text style={styles.helper}>
                None of your selected contacts have an account yet.
              </Text>
            )}
            {contacts.matches.map((match) =>
              memberRow(
                match.member,
                match.member.memberId,
                contacts.names[match.phone] &&
                  contacts.names[match.phone] !== match.member.displayName
                  ? `${contacts.names[match.phone]} in your contacts`
                  : undefined,
              ),
            )}
            {contacts.others.length > 0 && (
              <>
                <Text style={local.sectionLabel}>
                  INVITE TO DESTINYONE · {contacts.others.length}
                </Text>
                {contacts.others.map((contact) => (
                  <View key={contact.phone} style={local.row}>
                    <Avatar name={contact.name} />
                    <View style={{ flex: 1 }}>
                      <Text style={local.rowTitle} numberOfLines={1}>
                        {contact.name}
                      </Text>
                      <Text style={styles.helper}>{contact.phone}</Text>
                    </View>
                    <SmallButton
                      label="Invite"
                      tone="outline"
                      icon="paper-plane-outline"
                      onPress={() => void invite({ phone: contact.phone })}
                    />
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* Incoming requests */}
        {hub.incomingRequests.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text style={local.sectionLabel}>CONNECTION REQUESTS</Text>
            {hub.incomingRequests.map((request) => (
              <View key={request.requestId} style={local.card}>
                <View style={local.row}>
                  <Avatar name={request.member.displayName} />
                  <View style={{ flex: 1 }}>
                    <Text style={local.rowTitle}>
                      {request.member.displayName}
                    </Text>
                    <Text style={styles.helper}>
                      {[request.member.profession, request.member.city]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
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

        {/* Partner list: tap a row to chat, (i) for their profile */}
        <View style={{ gap: 8 }}>
          <Text style={local.sectionLabel}>
            {hub.connections.length > 0
              ? `PARTNERS · ${hub.connections.length}`
              : "PARTNERS"}
          </Text>
          {hub.connections.length === 0 && (
            <View style={local.card}>
              <Text style={local.rowTitle}>No partners yet</Text>
              <Text style={styles.helper}>
                Search a phone number or email above, or pick from your
                contacts. Once they accept, they show up here and you can chat.
              </Text>
            </View>
          )}
          {hub.connections.map((connection) => (
            <View key={connection.connectionId} style={local.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open chat with ${connection.partnerDisplayName}`}
                onPress={() => onOpenSpace(connection.connectionId)}
                style={local.rowMain}
              >
                <Avatar name={connection.partnerDisplayName} />
                <View style={{ flex: 1 }}>
                  <Text style={local.rowTitle} numberOfLines={1}>
                    {connection.partnerDisplayName}
                  </Text>
                  <Text
                    style={[
                      styles.helper,
                      (connection.unreadCount ?? 0) > 0 && {
                        color: colors.pink,
                        fontWeight: "700",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {connection.lastMessage
                      ? `${connection.lastMessage.mine ? "You: " : ""}${connection.lastMessage.preview}`
                      : "Tap to open chat"}
                  </Text>
                </View>
                {connection.lastMessage ? (
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <Text style={styles.helper}>
                      {formatChatTime(connection.lastMessage.at)}
                    </Text>
                    {(connection.unreadCount ?? 0) > 0 && (
                      <View
                        style={{
                          minWidth: 20,
                          height: 20,
                          borderRadius: 10,
                          paddingHorizontal: 6,
                          backgroundColor: colors.pink,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {connection.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${connection.partnerDisplayName}'s profile`}
                hitSlop={8}
                onPress={() => setViewingId(connection.connectionId)}
                style={local.infoButton}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={26}
                  color={colors.pink}
                />
              </Pressable>
            </View>
          ))}
          {hub.outgoingRequests.map((request) => (
            <View key={request.requestId} style={local.row}>
              <Avatar name={request.member.displayName} />
              <View style={{ flex: 1 }}>
                <Text style={local.rowTitle}>{request.member.displayName}</Text>
                <Text style={styles.helper}>
                  Waiting for them to accept
                </Text>
              </View>
              <Pill label="REQUESTED" />
            </View>
          ))}
        </View>

        {detailsSaved && detailsBlock}

        <Text style={styles.legal}>
          Neither person's phone number or email is shown to the other. Your
          chat opens only after your partner accepts.
        </Text>
      </FormPage>
    </PremiumBackground>
  );
}

const local = StyleSheet.create({
  avatar: {
    backgroundColor: colors.plumLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.pink, fontFamily: "Poppins_600SemiBold" },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    paddingVertical: 0,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  contactsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  sectionLabel: {
    color: colors.gold,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: {
    color: colors.text,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    flexShrink: 1,
  },
  infoButton: { padding: 2 },
  card: {
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cardLabel: {
    color: colors.gold,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.2,
  },
  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.pink,
    alignSelf: "flex-start",
  },
  smallButtonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.pink,
  },
  smallButtonText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  pill: {
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: {
    color: colors.gold,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
  },
  status: {
    color: colors.text,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.blush,
  },
  backRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  backText: {
    color: colors.text,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
  photo: { width: 220, height: 280, borderRadius: 20 },
  profileName: {
    color: colors.text,
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
  },
  factRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  factLabel: {
    color: colors.muted,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    width: 84,
  },
  factValue: {
    flex: 1,
    color: colors.text,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.blush,
  },
  chipText: {
    color: colors.text,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
  },
  dangerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dangerText: {
    color: colors.danger,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
});
