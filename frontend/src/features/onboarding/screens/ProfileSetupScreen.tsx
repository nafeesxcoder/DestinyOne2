import React, { useEffect, useState, type ReactNode } from "react";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { getCitiesOfState } from "@countrystatecity/countries-browser";

import { Button, Field, SectionTitle, shared } from "../../../components";
import { FormPage } from "../../../components/forms/FormScaffold";
import {
  MiniPremiumIcon,
  PremiumIcon,
  ReferenceIconTile,
} from "../../../components/premium/PremiumIcon";
import { SheetHeader } from "../../../components/sheets/SheetHeader";
import { profileCities, religions } from "../../../data";
import { isEligibleMemberAge } from "../../../domain/validation";
import type { ProfileDraft } from "../../../storage";
import { colors } from "../../../theme";
import {
  aiStyles,
  chatStyles,
  mediaStyles,
  onboardingStyles,
  profileSetupStyles,
  selectorStyles,
  styles,
} from "../../../theme/appStyles";

const backgroundImage = require("../../../../assets/background.png");
async function uploadPhotoAsset(
  uri: string,
  accessToken?: string,
): Promise<string> {
  if (!accessToken) return uri;
  try {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
    const formData = new FormData();
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append("photo", blob, "photo.jpg");
    const uploadResponse = await fetch(`${API_URL}/profile/upload-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    });
    const data = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(data.error || "Upload failed");
    return data.url;
  } catch {
    return uri;
  }
}

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

type ProfilePickerKind = "age" | "height" | "profession" | "community";
type RegionOption = { code: string; name: string };
type CityOption = { id: string | number; name: string };

const profileAgeOptions = Array.from({ length: 33 }, (_, index) =>
  String(index + 18),
);
const profileHeightOptions = Array.from({ length: 29 }, (_, index) => {
  const totalInches = index + 56;
  return `${Math.floor(totalInches / 12)} ft ${totalInches % 12} in`;
});
const profileProfessionOptions = [
  "Accountant",
  "Architect",
  "Artist",
  "Attorney / Lawyer",
  "Banking professional",
  "Business owner",
  "Consultant",
  "Content creator",
  "Data analyst",
  "Data scientist",
  "Dentist",
  "Designer",
  "Doctor / Physician",
  "Educator / Teacher",
  "Engineer",
  "Entrepreneur / Founder",
  "Finance professional",
  "Government / Public service",
  "Healthcare professional",
  "Hospitality professional",
  "Human resources",
  "Marketing professional",
  "Nurse",
  "Operations professional",
  "Pharmacist",
  "Photographer",
  "Product manager",
  "Professor / Researcher",
  "Project manager",
  "Real estate professional",
  "Sales professional",
  "Small business owner",
  "Social worker",
  "Software engineer",
  "Student",
  "Therapist / Counsellor",
  "Writer / Editor",
  "Other",
];
const profileCommunityOptions = [
  "Punjabi",
  "Gujarati",
  "Tamil",
  "Telugu",
  "Bengali",
  "Marathi",
  "Malayali",
  "Kannada",
  "Sindhi",
  "Rajasthani",
  "Kashmiri",
  "Assamese",
  "Odia",
  "Bhojpuri",
  "Haryanvi",
  "Himachali",
  "Uttarakhandi",
  "Goan",
  "Nepali",
  "Sri Lankan Tamil",
  "Pakistani Punjabi",
  "Pakistani",
  "Bangladeshi",
  "Indo-Caribbean",
  "Mixed South Asian",
  "South Asian + another culture",
  "Prefer not to say",
  "Other",
];
const makeRegionOptions = (
  entries: readonly (readonly [string, string])[],
): RegionOption[] => entries.map(([code, name]) => ({ code, name }));
const northAmericaRegions: Record<"US" | "CA", RegionOption[]> = {
  US: makeRegionOptions([
    ["AL", "Alabama"],
    ["AK", "Alaska"],
    ["AZ", "Arizona"],
    ["AR", "Arkansas"],
    ["CA", "California"],
    ["CO", "Colorado"],
    ["CT", "Connecticut"],
    ["DE", "Delaware"],
    ["DC", "District of Columbia"],
    ["FL", "Florida"],
    ["GA", "Georgia"],
    ["HI", "Hawaii"],
    ["ID", "Idaho"],
    ["IL", "Illinois"],
    ["IN", "Indiana"],
    ["IA", "Iowa"],
    ["KS", "Kansas"],
    ["KY", "Kentucky"],
    ["LA", "Louisiana"],
    ["ME", "Maine"],
    ["MD", "Maryland"],
    ["MA", "Massachusetts"],
    ["MI", "Michigan"],
    ["MN", "Minnesota"],
    ["MS", "Mississippi"],
    ["MO", "Missouri"],
    ["MT", "Montana"],
    ["NE", "Nebraska"],
    ["NV", "Nevada"],
    ["NH", "New Hampshire"],
    ["NJ", "New Jersey"],
    ["NM", "New Mexico"],
    ["NY", "New York"],
    ["NC", "North Carolina"],
    ["ND", "North Dakota"],
    ["OH", "Ohio"],
    ["OK", "Oklahoma"],
    ["OR", "Oregon"],
    ["PA", "Pennsylvania"],
    ["RI", "Rhode Island"],
    ["SC", "South Carolina"],
    ["SD", "South Dakota"],
    ["TN", "Tennessee"],
    ["TX", "Texas"],
    ["UT", "Utah"],
    ["VT", "Vermont"],
    ["VA", "Virginia"],
    ["WA", "Washington"],
    ["WV", "West Virginia"],
    ["WI", "Wisconsin"],
    ["WY", "Wyoming"],
    ["PR", "Puerto Rico"],
    ["GU", "Guam"],
    ["VI", "U.S. Virgin Islands"],
    ["AS", "American Samoa"],
    ["MP", "Northern Mariana Islands"],
  ]),
  CA: makeRegionOptions([
    ["AB", "Alberta"],
    ["BC", "British Columbia"],
    ["MB", "Manitoba"],
    ["NB", "New Brunswick"],
    ["NL", "Newfoundland and Labrador"],
    ["NS", "Nova Scotia"],
    ["NT", "Northwest Territories"],
    ["NU", "Nunavut"],
    ["ON", "Ontario"],
    ["PE", "Prince Edward Island"],
    ["QC", "Quebec"],
    ["SK", "Saskatchewan"],
    ["YT", "Yukon"],
  ]),
};
const canadianRegionCodes = new Set(
  northAmericaRegions.CA.map((region) => region.code),
);

function ProfileSelectField({
  label,
  value,
  placeholder,
  icon,
  onPress,
  optional = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  optional?: boolean;
}) {
  return (
    <View style={selectorStyles.selectField}>
      <Text style={shared.label}>
        {label}
        {optional ? " · optional" : ""}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || placeholder}`}
        onPress={onPress}
        style={[
          selectorStyles.selectButton,
          !!value && selectorStyles.selectButtonOn,
        ]}
      >
        <GlowIcon icon={icon} size={28} color="#FFFFFF" glowColor="#E5092F" />
        <Text
          numberOfLines={1}
          style={[
            selectorStyles.selectValue,
            !value && selectorStyles.selectPlaceholder,
            onboardingStyles.supportingText,
          ]}
        >
          {value || placeholder}
        </Text>
        <PremiumIcon
          name="chevron-down"
          tone="ruby"
          size={25}
          iconSize={12}
          referenceGlass
        />
      </Pressable>
    </View>
  );
}

function ProfileOptionSheet({
  visible,
  title,
  subtitle,
  options,
  value,
  searchable = false,
  allowCustom = false,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  options: string[];
  value: string;
  searchable?: boolean;
  allowCustom?: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (visible) setQuery("");
  }, [visible, title]);
  const normalized = query.trim().toLowerCase();
  const filtered = options.filter(
    (option) => !normalized || option.toLowerCase().includes(normalized),
  );
  const custom = query.trim();
  const showCustom =
    allowCustom &&
    custom.length >= 2 &&
    !options.some((option) => option.toLowerCase() === custom.toLowerCase());
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, selectorStyles.optionSheet]}>
        <SheetHeader title={title} subtitle={subtitle} onClose={onClose} />
        {searchable && (
          <View style={selectorStyles.sheetSearch}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              autoFocus={Platform.OS === "web"}
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${title.toLowerCase()}`}
              placeholderTextColor="#746A73"
              style={selectorStyles.sheetSearchInput}
            />
            {!!query && (
              <Pressable
                accessibilityLabel="Clear search"
                onPress={() => setQuery("")}
              >
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </Pressable>
            )}
          </View>
        )}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={selectorStyles.optionList}
        >
          {showCustom && (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(custom)}
              style={selectorStyles.customOption}
            >
              <MiniPremiumIcon name="add" tone="gold" size={29} iconSize={14} />
              <View style={{ flex: 1 }}>
                <Text style={selectorStyles.optionTitle}>Use “{custom}”</Text>
                <Text style={selectorStyles.optionBody}>
                  Add this to your profile
                </Text>
              </View>
            </Pressable>
          )}
          {filtered.map((option) => {
            const selected = option === value;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option}
                onPress={() => onSelect(option)}
                style={[
                  selectorStyles.optionRow,
                  selected && selectorStyles.optionRowOn,
                ]}
              >
                <Text
                  style={[
                    selectorStyles.optionTitle,
                    selected && { color: "#F5DFA9" },
                  ]}
                >
                  {option}
                </Text>
                {selected ? (
                  <MiniPremiumIcon
                    name="checkmark"
                    tone="gold"
                    size={26}
                    iconSize={12}
                  />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="#786A74" />
                )}
              </Pressable>
            );
          })}
          {!filtered.length && !showCustom && (
            <View style={selectorStyles.emptyState}>
              <MiniPremiumIcon
                name="search"
                tone="dark"
                size={38}
                iconSize={18}
              />
              <Text style={styles.cardTitle}>No exact match</Text>
              <Text style={styles.helper}>Try a shorter search.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function CityPickerSheet({
  visible,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const [country, setCountry] = useState<"US" | "CA">("US");
  const [regionCode, setRegionCode] = useState("");
  const [regionQuery, setRegionQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [cities, setCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!visible) return;
    const currentCode = value.split(",").at(-1)?.trim().toUpperCase() ?? "";
    const nextCountry = canadianRegionCodes.has(currentCode) ? "CA" : "US";
    setCountry(nextCountry);
    setRegionCode(
      northAmericaRegions[nextCountry].some(
        (region) => region.code === currentCode,
      )
        ? currentCode
        : "",
    );
    setRegionQuery("");
    setCityQuery(
      value.includes(",") ? value.slice(0, value.lastIndexOf(",")).trim() : "",
    );
    setCities([]);
    setError("");
  }, [visible, value]);
  useEffect(() => {
    if (!visible || !regionCode) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    getCitiesOfState(country, regionCode)
      .then((items) => {
        if (cancelled) return;
        setCities(
          items
            .map((item) => ({ id: item.id, name: item.name }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = profileCities
          .filter((item) => item.endsWith(`, ${regionCode}`))
          .map((item, index) => ({
            id: `fallback-${index}`,
            name: item.slice(0, item.lastIndexOf(",")),
          }));
        setCities(fallback);
        setError(
          "Live city list could not load. You can still type and use your city below.",
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, country, regionCode]);
  const regions = northAmericaRegions[country].filter(
    (region) =>
      !regionQuery.trim() ||
      `${region.name} ${region.code}`
        .toLowerCase()
        .includes(regionQuery.trim().toLowerCase()),
  );
  const normalizedCity = cityQuery.trim().toLowerCase();
  const filteredCities = cities
    .filter(
      (city) =>
        !normalizedCity || city.name.toLowerCase().includes(normalizedCity),
    )
    .slice(0, 60);
  const selectedRegion = northAmericaRegions[country].find(
    (region) => region.code === regionCode,
  );
  const customCity = cityQuery.trim();
  const canUseCustom =
    customCity.length >= 2 &&
    !cities.some(
      (city) => city.name.toLowerCase() === customCity.toLowerCase(),
    );
  const changeCountry = (next: "US" | "CA") => {
    setCountry(next);
    setRegionCode("");
    setRegionQuery("");
    setCityQuery("");
    setCities([]);
    setError("");
  };
  const selectCity = (name: string) => {
    onSelect(`${name}, ${regionCode}`);
    onClose();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={[chatStyles.sheet, selectorStyles.citySheet]}>
        <SheetHeader
          title="Choose your city"
          subtitle="USA and Canada city search"
          onClose={onClose}
        />
        <View style={selectorStyles.countrySegment}>
          {(["US", "CA"] as const).map((code) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: country === code }}
              key={code}
              onPress={() => changeCountry(code)}
              style={[
                selectorStyles.countryOption,
                country === code && selectorStyles.countryOptionOn,
              ]}
            >
              <Text
                style={[
                  selectorStyles.countryText,
                  country === code && selectorStyles.countryTextOn,
                ]}
              >
                {code === "US" ? "United States" : "Canada"}
              </Text>
            </Pressable>
          ))}
        </View>
        {!regionCode ? (
          <>
            <Text style={selectorStyles.sheetLabel}>
              {country === "US"
                ? "STATE OR TERRITORY"
                : "PROVINCE OR TERRITORY"}
            </Text>
            <View style={selectorStyles.sheetSearch}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                autoFocus={Platform.OS === "web"}
                value={regionQuery}
                onChangeText={setRegionQuery}
                placeholder={
                  country === "US" ? "Search state" : "Search province"
                }
                placeholderTextColor="#746A73"
                style={selectorStyles.sheetSearchInput}
              />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={selectorStyles.optionList}
            >
              {regions.map((region) => (
                <Pressable
                  accessibilityRole="button"
                  key={region.code}
                  onPress={() => {
                    setRegionCode(region.code);
                    setCityQuery("");
                  }}
                  style={selectorStyles.optionRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={selectorStyles.optionTitle}>
                      {region.name}
                    </Text>
                    <Text style={selectorStyles.optionBody}>{region.code}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#786A74" />
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={selectorStyles.regionBar}>
              <View style={{ flex: 1 }}>
                <Text style={selectorStyles.sheetLabel}>SEARCHING IN</Text>
                <Text style={selectorStyles.regionName}>
                  {selectedRegion?.name}, {country === "US" ? "USA" : "Canada"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setRegionCode("");
                  setRegionQuery("");
                  setCityQuery("");
                }}
                style={selectorStyles.changeRegion}
              >
                <Text style={selectorStyles.changeRegionText}>Change</Text>
              </Pressable>
            </View>
            <View style={selectorStyles.sheetSearch}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput
                autoFocus={Platform.OS === "web"}
                value={cityQuery}
                onChangeText={setCityQuery}
                placeholder="Start typing your city"
                placeholderTextColor="#746A73"
                style={selectorStyles.sheetSearchInput}
              />
              {!!cityQuery && (
                <Pressable
                  accessibilityLabel="Clear city search"
                  onPress={() => setCityQuery("")}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.muted}
                  />
                </Pressable>
              )}
            </View>
            {loading ? (
              <View style={selectorStyles.emptyState}>
                <MiniPremiumIcon
                  name="hourglass-outline"
                  tone="gold"
                  size={38}
                  iconSize={18}
                />
                <Text style={styles.cardTitle}>Loading cities…</Text>
              </View>
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={selectorStyles.optionList}
              >
                {!!error && (
                  <View style={selectorStyles.dataNotice}>
                    <Ionicons
                      name="cloud-offline-outline"
                      size={17}
                      color={colors.gold}
                    />
                    <Text style={selectorStyles.dataNoticeText}>{error}</Text>
                  </View>
                )}
                {canUseCustom && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => selectCity(customCity)}
                    style={selectorStyles.customOption}
                  >
                    <MiniPremiumIcon
                      name="location"
                      tone="gold"
                      size={29}
                      iconSize={14}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={selectorStyles.optionTitle}>
                        Use “{customCity}, {regionCode}”
                      </Text>
                      <Text style={selectorStyles.optionBody}>
                        Choose this city
                      </Text>
                    </View>
                  </Pressable>
                )}
                {filteredCities.map((city) => (
                  <Pressable
                    accessibilityRole="button"
                    key={`${city.id}-${city.name}`}
                    onPress={() => selectCity(city.name)}
                    style={selectorStyles.optionRow}
                  >
                    <Text style={selectorStyles.optionTitle}>{city.name}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#786A74"
                    />
                  </Pressable>
                ))}
                {!cityQuery && (
                  <View style={selectorStyles.emptyState}>
                    <MiniPremiumIcon
                      name="location-outline"
                      tone="dark"
                      size={38}
                      iconSize={18}
                    />
                    <Text style={styles.cardTitle}>Type your city</Text>
                    <Text style={styles.helper}>
                      Every city in {selectedRegion?.name} is searchable.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export function ProfileSetupScreen({
  profile,
  onProfileChange,
  photos,
  onPhotosChange,
  voiceUri,
  onVoiceChange,
  allowPreviewContinue = false,
  onNext,
  accessToken,
}: {
  profile: ProfileDraft;
  onProfileChange: (profile: ProfileDraft) => void;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  voiceUri: string;
  onVoiceChange: (uri: string) => void;
  allowPreviewContinue?: boolean;
  onNext: () => void;
  accessToken?: string;
}) {
  const { width } = useWindowDimensions();
  const [mediaError, setMediaError] = useState("");
  const [photoPickerIndex, setPhotoPickerIndex] = useState<number | null>(null);
  const [profilePicker, setProfilePicker] = useState<ProfilePickerKind | null>(
    null,
  );
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const compactPhotos = width < 520;
  const stackProfileFields = width < 440;
  const photoPrompts = [
    { title: "A clear hello", body: "Face the camera" },
    { title: "Your full look", body: "Show your style" },
    { title: "Your world", body: "A moment you love" },
  ];
  const updateProfile = <Key extends keyof ProfileDraft>(
    key: Key,
    value: ProfileDraft[Key],
  ) => onProfileChange({ ...profile, [key]: value });
  const ageEligible = isEligibleMemberAge(profile.age);
  const profileReady =
    photos.length >= 3 &&
    profile.firstName.trim().length >= 2 &&
    !!profile.gender &&
    ageEligible &&
    !!profile.height &&
    !!profile.city &&
    profile.profession.trim().length >= 2;
  const continueLabel =
    allowPreviewContinue && !profileReady
      ? "Continue in preview"
      : photos.length < 3
        ? "Add 3 photos to keep going"
        : !profile.firstName.trim()
          ? "Add your name to keep going"
          : !profile.gender
            ? "Choose how you identify"
            : !ageEligible
              ? "Choose an age from 18–50"
              : !profile.height
                ? "Choose your height"
                : !profile.city
                  ? "Choose your city"
                  : !profile.profession.trim()
                    ? "Choose what you do"
                    : "Looks good, keep going";
  const pickerOptions =
    profilePicker === "age"
      ? profileAgeOptions
      : profilePicker === "height"
        ? profileHeightOptions
        : profilePicker === "profession"
          ? profileProfessionOptions
          : profileCommunityOptions;
  const pickerValue =
    profilePicker === "age"
      ? profile.age
      : profilePicker === "height"
        ? profile.height
        : profilePicker === "profession"
          ? profile.profession
          : profile.community;
  const pickerTitle =
    profilePicker === "age"
      ? "Choose your age"
      : profilePicker === "height"
        ? "Choose your height"
        : profilePicker === "profession"
          ? "What do you do?"
          : "Culture / community";
  const pickerSubtitle =
    profilePicker === "age"
      ? "DestinyOne is for adults ages 18–50."
      : profilePicker === "height"
        ? "Pick the closest height."
        : profilePicker === "profession"
          ? "Search or add the answer that fits you."
          : "Choose one or add your own.";
  const selectPickerValue = (value: string) => {
    if (profilePicker === "age") updateProfile("age", value);
    if (profilePicker === "height") updateProfile("height", value);
    if (profilePicker === "profession") updateProfile("profession", value);
    if (profilePicker === "community") updateProfile("community", value);
    setProfilePicker(null);
  };
  const pickPhoto = async (index: number) => {
    setMediaError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMediaError(
        "Photo library permission is needed to add profile photos.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const uploadedUri = await uploadPhotoAsset(
        result.assets[0].uri,
        accessToken,
      );
      const next = [...photos];
      next[index] = uploadedUri;
      onPhotosChange(next.filter(Boolean));
    }
  };
  const takePhoto = async (index: number) => {
    setMediaError("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMediaError("Camera permission is needed to take a profile photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const uploadedUri = await uploadPhotoAsset(
        result.assets[0].uri,
        accessToken,
      );
      const next = [...photos];
      next[index] = uploadedUri;
      onPhotosChange(next.filter(Boolean));
    }
  };
  const choosePhoto = (index: number) => {
    setPhotoPickerIndex(index);
  };
  const removePhoto = (index: number) =>
    onPhotosChange(photos.filter((_, photoIndex) => photoIndex !== index));
  return (
    <PremiumBackground>
      <FormPage step={3} scroll>
        <SectionTitle
          emphasis
          eyebrow="MAKE A FIRST IMPRESSION"
          title="Make them want to know more."
          body="Three good photos. A few real details. Zero résumé energy."
        />
        <View style={profileSetupStyles.photoSection}>
          <View style={profileSetupStyles.photoHeader}>
            <View style={{ flex: 1 }}>
              <Text style={shared.label}>
                Start with 3 photos that feel like you
              </Text>
              <Text style={[styles.helper, onboardingStyles.supportingText]}>
                Portrait photos are cropped to 4:5. Tap any photo to replace it.
              </Text>
            </View>
            <View style={profileSetupStyles.photoCount}>
              <Text style={profileSetupStyles.photoCountText}>
                {photos.length}/3
              </Text>
            </View>
          </View>
          <View style={styles.photoRow}>
            {[0, 1, 2].map((index) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  photos[index]
                    ? `Replace photo ${index + 1}`
                    : `Add photo ${index + 1}`
                }
                onPress={() => choosePhoto(index)}
                key={index}
                style={[
                  styles.addPhoto,
                  !compactPhotos && profileSetupStyles.photoDesktop,
                ]}
              >
                {photos[index] ? (
                  <>
                    <Image
                      source={{ uri: photos[index] }}
                      resizeMode="cover"
                      style={styles.fill}
                    />
                    <LinearGradient
                      pointerEvents="none"
                      colors={["transparent", "rgba(11,2,8,.84)"]}
                      style={profileSetupStyles.photoOverlay}
                    >
                      <Text style={profileSetupStyles.photoChange}>
                        Tap to replace
                      </Text>
                    </LinearGradient>
                    <Pressable
                      accessibilityLabel={`Remove photo ${index + 1}`}
                      onPress={(event) => {
                        event.stopPropagation();
                        removePhoto(index);
                      }}
                      style={profileSetupStyles.photoRemove}
                    >
                      <Ionicons name="close" size={15} color={colors.ivory} />
                    </Pressable>
                  </>
                ) : (
                  <View style={profileSetupStyles.photoEmpty}>
                    <GlowIcon
                      icon="add"
                      size={29}
                      color="#FFFFFF"
                      glowColor="#E5092F"
                    />
                    <Text style={profileSetupStyles.photoPrompt}>
                      {photoPrompts[index]!.title}
                    </Text>
                    <Text style={profileSetupStyles.photoHint}>
                      {photoPrompts[index]!.body}
                    </Text>
                  </View>
                )}
                <View pointerEvents="none" style={styles.photoNum}>
                  <Text style={styles.photoNumText}>{index + 1}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          {!!mediaError && <Text style={styles.formError}>{mediaError}</Text>}
        </View>
        <View style={{ gap: 16 }}>
          <Field
            emphasis
            label="First name"
            placeholder="Your first name"
            value={profile.firstName}
            onChangeText={(text: string) => updateProfile("firstName", text)}
          />
          <View style={{ gap: 8 }}>
            <Text style={shared.label}>I identify as</Text>
            <View style={aiStyles.filterWrap}>
              {(
                [
                  ["woman", "Woman"],
                  ["man", "Man"],
                  ["nonbinary", "Non-binary"],
                ] as const
              ).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => updateProfile("gender", value)}
                  style={[
                    selectorStyles.religionChip,
                    profile.gender === value && selectorStyles.religionChipOn,
                  ]}
                >
                  <Text
                    style={[
                      selectorStyles.religionText,
                      profile.gender === value && { color: colors.surface },
                    ]}
                  >
                    {label}
                  </Text>
                  {profile.gender === value && (
                    <MiniPremiumIcon
                      name="checkmark"
                      tone="gold"
                      size={22}
                      iconSize={10}
                    />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
          <View
            style={[
              styles.twoCol,
              stackProfileFields && profileSetupStyles.fieldsStack,
              { width: "100%", minWidth: 0 },
            ]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <ProfileSelectField
                label="Age"
                value={profile.age}
                placeholder="Choose"
                icon="calendar-outline"
                onPress={() => setProfilePicker("age")}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <ProfileSelectField
                label="Height"
                value={profile.height}
                placeholder="Choose"
                icon="resize-outline"
                onPress={() => setProfilePicker("height")}
              />
            </View>
          </View>
          <ProfileSelectField
            label="City"
            value={profile.city}
            placeholder="Search USA or Canada city"
            icon="location-outline"
            onPress={() => setCityPickerVisible(true)}
          />
          <ProfileSelectField
            label="What do you do?"
            value={profile.profession}
            placeholder="Choose your profession"
            icon="briefcase-outline"
            onPress={() => setProfilePicker("profession")}
          />
          <View style={{ gap: 8 }}>
            <Text style={shared.label}>Faith · optional</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {religions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() =>
                    updateProfile(
                      "religion",
                      profile.religion === option ? "" : option,
                    )
                  }
                  style={[
                    selectorStyles.religionChip,
                    profile.religion === option &&
                      selectorStyles.religionChipOn,
                  ]}
                >
                  <Text
                    style={[
                      selectorStyles.religionText,
                      profile.religion === option && { color: colors.surface },
                    ]}
                  >
                    {option}
                  </Text>
                  {profile.religion === option && (
                    <MiniPremiumIcon
                      name="checkmark"
                      tone="gold"
                      size={22}
                      iconSize={10}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <ProfileSelectField
            label="Culture / community"
            value={profile.community}
            placeholder="Choose or add your culture"
            icon="people-outline"
            optional
            onPress={() => setProfilePicker("community")}
          />
        </View>
        <VoiceIntroRecorder uri={voiceUri} onChange={onVoiceChange} />

        {/* 🚀 CUSTOM MAIN BUTTON (dark red gradient) */}
        <Pressable
          onPress={onNext}
          disabled={!profileReady && !allowPreviewContinue}
          style={{
            borderRadius: 32,
            overflow: "hidden",
            opacity: !profileReady && !allowPreviewContinue ? 0.5 : 1,
          }}
        >
          <LinearGradient
            colors={["#390006", "#7C0015", "#430009", "#210003"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 58,
              borderRadius: 32,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 12,
              borderWidth: 1.5,
              borderColor: "rgba(255,60,80,.62)",
              shadowColor: "#E5092F",
              shadowOpacity: 0.58,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 9 },
            }}
          >
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            <Text
              style={{ color: "#FFFFFF", fontWeight: "bold", fontSize: 16 }}
            >
              {continueLabel}
            </Text>
          </LinearGradient>
        </Pressable>

        <PhotoPickerSheet
          visible={photoPickerIndex !== null}
          slot={photoPickerIndex === null ? 0 : photoPickerIndex + 1}
          onClose={() => setPhotoPickerIndex(null)}
          onCamera={() => {
            const index = photoPickerIndex;
            if (index === null) return;
            setPhotoPickerIndex(null);
            void takePhoto(index);
          }}
          onGallery={() => {
            const index = photoPickerIndex;
            if (index === null) return;
            setPhotoPickerIndex(null);
            void pickPhoto(index);
          }}
        />
        <ProfileOptionSheet
          visible={profilePicker !== null}
          title={pickerTitle}
          subtitle={pickerSubtitle}
          options={pickerOptions}
          value={pickerValue}
          searchable={
            profilePicker === "profession" || profilePicker === "community"
          }
          allowCustom={
            profilePicker === "profession" || profilePicker === "community"
          }
          onClose={() => setProfilePicker(null)}
          onSelect={selectPickerValue}
        />
        <CityPickerSheet
          visible={cityPickerVisible}
          value={profile.city}
          onClose={() => setCityPickerVisible(false)}
          onSelect={(value) => updateProfile("city", value)}
        />
      </FormPage>
    </PremiumBackground>
  );
}

function PhotoPickerSheet({
  visible,
  slot,
  onClose,
  onCamera,
  onGallery,
}: {
  visible: boolean;
  slot: number;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={chatStyles.modalBackdrop} onPress={onClose} />
      <SafeAreaView style={chatStyles.sheet}>
        <SheetHeader
          title={`Add photo ${slot}`}
          subtitle="Choose a clear, recent favorite."
          onClose={onClose}
        />
        <View style={mediaStyles.photoChoiceHero}>
          <PremiumIcon name="images" tone="gold" size={54} iconSize={25} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Let them see the real you.</Text>
            <Text style={styles.helper}>
              Bright, recent, and easy to recognize.
            </Text>
          </View>
        </View>
        <View style={mediaStyles.photoChoiceGrid}>
          <Pressable onPress={onCamera} style={mediaStyles.photoChoice}>
            <PremiumIcon name="camera" tone="ruby" size={50} iconSize={23} />
            <Text style={mediaStyles.photoChoiceTitle}>Camera</Text>
            <Text style={mediaStyles.photoChoiceBody}>Take a new photo</Text>
          </Pressable>
          <Pressable onPress={onGallery} style={mediaStyles.photoChoice}>
            <PremiumIcon name="image" tone="plum" size={50} iconSize={23} />
            <Text style={mediaStyles.photoChoiceTitle}>Gallery</Text>
            <Text style={mediaStyles.photoChoiceBody}>Choose a favorite</Text>
          </Pressable>
        </View>
        <Text style={styles.legal}>
          Your photos stay private until you finish your profile.
        </Text>
      </SafeAreaView>
    </Modal>
  );
}

function VoiceIntroRecorder({
  uri,
  onChange,
}: {
  uri: string;
  onChange: (uri: string) => void;
}) {
  const [error, setError] = useState("");
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    if (status.hasError)
      setError(status.error ?? "Recording failed. Please try again.");
    if (status.isFinished && status.url) onChange(status.url);
  });
  const recorderState = useAudioRecorderState(recorder, 200);
  const player = useAudioPlayer(uri || null);
  const playerStatus = useAudioPlayerStatus(player);
  const start = async () => {
    setError("");
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone permission is needed to record your introduction.");
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record({ forDuration: 30 });
  };
  const stop = async () => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    if (recorder.uri) onChange(recorder.uri);
  };
  const duration = Math.max(0, Math.round(recorderState.durationMillis / 1000));
  return (
    <View style={mediaStyles.voiceRecorder}>
      <View style={mediaStyles.voiceHeading}>
        <PremiumIcon
          name={recorderState.isRecording ? "mic" : "volume-medium"}
          tone="ruby"
          size={43}
          iconSize={20}
        />
        <View style={mediaStyles.voiceCopy}>
          <View style={mediaStyles.voiceTitleRow}>
            <Text style={mediaStyles.voiceTitle}>Let them hear your vibe</Text>
            {!uri && !recorderState.isRecording && (
              <Text style={mediaStyles.voiceOptional}>OPTIONAL</Text>
            )}
          </View>
          <Text style={mediaStyles.voiceBody}>
            {recorderState.isRecording
              ? `Recording · 0:${String(duration).padStart(2, "0")} / 0:30`
              : uri
                ? "Your hello is ready to play"
                : "A short hello makes your profile feel more human."}
          </Text>
        </View>
      </View>
      {uri && !recorderState.isRecording && (
        <View style={mediaStyles.voiceActions}>
          <Pressable
            onPress={() =>
              playerStatus.playing ? player.pause() : player.play()
            }
            style={mediaStyles.mediaAction}
          >
            <MiniPremiumIcon
              name={playerStatus.playing ? "pause" : "play"}
              tone="plum"
              size={30}
              iconSize={14}
            />
            <Text style={mediaStyles.mediaActionText}>
              {playerStatus.playing ? "Pause" : "Preview"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onChange("")}
            style={mediaStyles.deleteAction}
          >
            <MiniPremiumIcon
              name="trash-outline"
              tone="ruby"
              size={34}
              iconSize={16}
            />
          </Pressable>
        </View>
      )}
      {!uri && (
        <Button
          variant="secondary"
          label={
            recorderState.isRecording ? "Stop & save" : "Record voice intro"
          }
          icon={recorderState.isRecording ? "stop" : "mic"}
          onPress={recorderState.isRecording ? stop : start}
        />
      )}
      {!!error && <Text style={styles.formError}>{error}</Text>}
    </View>
  );
}
