import { useEffect, useState } from "react";
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Button, Chip, Field, shared } from "../../components";
import { colors } from "../../theme";
import { formatUsdFromCents } from '../../domain/money';
import { buildDateMarketplaceSnapshot } from "../../domain/dateMarketplace";
import { buildMarketplaceBookingTimeline, calculateMarketplaceRefund, type MarketplaceBookingStatus } from "../../domain/marketplaceBooking";
import { type ExperienceMode } from "../../domain/coupleMode";
import type { MarketplacePlace } from "./contracts/MarketplaceModels";
import type { MarketplacePorts } from './contracts/MarketplacePorts';
import { type Screen } from "../../app/navigation/types";
import { MiniPremiumIcon, PremiumIcon, type PremiumIconTone } from "../../components/premium/PremiumIcon";
import { Segment } from "../../components/forms/FormScaffold";
import { SheetHeader } from "../../components/sheets/SheetHeader";
import { BottomNav, handleBottomNavScroll } from "../../components/navigation/BottomNav";
import { type CoupleLaunchTool } from "../../features/chat/ChatFeature";
import { selectorStyles, couplesMarketStyles, marketplaceBrandStyles, coachStyles, styles, chatStyles } from "../../theme/appStyles";
export const eventExperiences = [
    { title: 'Rooftop Chai Mixer', city: 'New York, NY', date: 'Friday · 7 PM', type: 'In person', icon: '☕', tag: 'Verified members only', body: 'A calm 40-person Indian singles mixer with conversation prompts, safety hosts and clear intent badges.' },
    { title: 'Gujarati Garba Social', city: 'New Jersey / New York', date: 'Saturday · 6 PM', type: 'In person', icon: '💃🏽', tag: 'Community-led', body: 'Culture-first evening for serious singles who want family-friendly energy without old-school pressure.' },
    { title: 'Punjabi Culture Night', city: 'Toronto, ON', date: 'Saturday · 6 PM', type: 'In person', icon: '🎶', tag: 'Community-led', body: 'Music, food and serious singles who value family, culture and long-term compatibility.' },
    { title: 'South Asian Professionals Mixer', city: 'San Francisco, CA', date: 'Thursday · 7 PM', type: 'In person', icon: '🤝', tag: 'Career + values', body: 'Small groups for Indian, Punjabi and American professionals who want real relationships, not casual swiping.' },
    { title: 'Video Speed Dates', city: 'USA / Canada', date: 'Sunday · 5 PM', type: 'Online', icon: '🎥', tag: '7-minute rounds', body: 'Private video rounds before anyone can ask for a phone number. Chat unlocks only after mutual interest.' },
    { title: 'Marriage-minded Speed Dating', city: 'Dallas, TX', date: 'Sunday · 4 PM', type: 'Hybrid', icon: '💍', tag: 'Intent verified', body: 'Quick values-led intros with serious relationship and marriage filters checked before the event.' },
    { title: 'Premium Invite-only Dinner', city: 'Los Angeles, CA', date: 'Friday · 8 PM', type: 'Private dinner', icon: '🍽️', tag: 'Limited seats', body: 'Eight verified members, hosted table, premium venue and gentle post-event concierge follow-up.' },
    { title: 'Executive Private Dinner', city: 'New York, NY', date: 'Monthly', type: 'Invite only', icon: '🥂', tag: 'Executive Circle', body: 'Founder and business-owner dinner for members approved through Executive Circle verification.' },
];
const coupleExperiences = [
    { title: 'Candlelight Jazz Night', city: 'Toronto, ON', date: 'Friday · 8 PM', type: 'Live experience', icon: '🎷', tag: 'Couples welcome', body: 'Reserved seating, live jazz and an easy after-show dessert route for a complete evening.' },
    { title: 'Clay & Chai Workshop', city: 'USA / Canada', date: 'Saturday · 3 PM', type: 'Creative date', icon: '🎨', tag: 'Small groups', body: 'A guided pottery session with chai, shared prompts and a keepsake you make together.' },
    { title: 'Night Market Passport', city: 'New York / Toronto', date: 'Saturday · 6 PM', type: 'Food experience', icon: '🥟', tag: 'Flexible arrival', body: 'A curated tasting route with partner challenges, public meeting points and flexible pacing.' },
    { title: 'Couples Cooking Table', city: 'Vancouver, BC', date: 'Sunday · 5 PM', type: 'Hosted class', icon: '🍳', tag: 'Limited seats', body: 'Cook a South Asian menu together at a hosted public studio, then sit down for dinner.' },
];
type PlaceKind = 'Restaurant' | 'Cafe' | 'Hotel' | 'Wellness' | 'Tourist' | 'Activity' | 'Park' | 'Dessert' | 'Lounge' | 'Cultural';
export type PlaceItem = {
    id: string;
    name: string;
    city: string;
    country: 'USA' | 'Canada';
    kind: PlaceKind;
    area: string;
    price: string;
    vibe: string;
    bestTime: string;
    safety: string;
    icon: string;
    tags: string[];
    photo?: string;
    source?: 'curated' | 'live';
    rating?: number;
    ratingCount?: number;
    openNow?: boolean;
    mapsUrl?: string;
    latitude?: number;
    longitude?: number;
    bookable?: boolean;
    recommendationReason?: string;
    matchScore?: number;
};
type DatePackage = {
    id: string;
    title: string;
    tier: string;
    city: string;
    price: string;
    duration: string;
    includes: string[];
    safety: string;
    icon: keyof typeof Ionicons.glyphMap;
};
type PartnerRequest = {
    venue: string;
    city: string;
    contact: string;
    packageTitle: string;
};
type CoupleBundle = {
    id: string;
    title: string;
    city: string;
    price: string;
    priceCents: number;
    duration: string;
    mood: string;
    icon: keyof typeof Ionicons.glyphMap;
    includes: string[];
    flexibility: string;
    safety: string;
};
export const placeKinds: ('All' | PlaceKind)[] = ['All', 'Restaurant', 'Cafe', 'Hotel', 'Wellness', 'Tourist', 'Activity', 'Park', 'Dessert', 'Lounge', 'Cultural'];
export const placeCities = ['All', 'Fresno, CA', 'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Dallas, TX', 'Austin, TX', 'San Francisco, CA', 'Seattle, WA', 'Miami, FL', 'Boston, MA', 'Washington, DC', 'San Diego, CA', 'Atlanta, GA', 'Denver, CO', 'Las Vegas, NV', 'Orlando, FL', 'Toronto, ON', 'Vancouver, BC', 'Montreal, QC', 'Calgary, AB', 'Ottawa, ON'];
const cityCoordinates: Record<string, {
    latitude: number;
    longitude: number;
}> = {
    'Toronto, ON': { latitude: 43.6532, longitude: -79.3832 }, 'Mississauga, ON': { latitude: 43.5890, longitude: -79.6441 }, 'Brampton, ON': { latitude: 43.7315, longitude: -79.7624 }, 'Markham, ON': { latitude: 43.8561, longitude: -79.3370 }, 'Vaughan, ON': { latitude: 43.8361, longitude: -79.4983 }, 'Oakville, ON': { latitude: 43.4675, longitude: -79.6877 }, 'Burlington, ON': { latitude: 43.3255, longitude: -79.7990 }, 'Hamilton, ON': { latitude: 43.2557, longitude: -79.8711 }, 'Niagara-on-the-Lake, ON': { latitude: 43.2549, longitude: -79.0773 }, 'Niagara Falls, ON': { latitude: 43.0896, longitude: -79.0849 },
    'Fresno, CA': { latitude: 36.7378, longitude: -119.7871 }, 'Clovis, CA': { latitude: 36.8252, longitude: -119.7029 }, 'New York, NY': { latitude: 40.7128, longitude: -74.0060 }, 'Los Angeles, CA': { latitude: 34.0522, longitude: -118.2437 }, 'Chicago, IL': { latitude: 41.8781, longitude: -87.6298 }, 'Houston, TX': { latitude: 29.7604, longitude: -95.3698 }, 'Dallas, TX': { latitude: 32.7767, longitude: -96.7970 }, 'Austin, TX': { latitude: 30.2672, longitude: -97.7431 }, 'San Francisco, CA': { latitude: 37.7749, longitude: -122.4194 }, 'Seattle, WA': { latitude: 47.6062, longitude: -122.3321 }, 'Miami, FL': { latitude: 25.7617, longitude: -80.1918 }, 'Boston, MA': { latitude: 42.3601, longitude: -71.0589 }, 'Washington, DC': { latitude: 38.9072, longitude: -77.0369 }, 'San Diego, CA': { latitude: 32.7157, longitude: -117.1611 }, 'Atlanta, GA': { latitude: 33.7490, longitude: -84.3880 }, 'Denver, CO': { latitude: 39.7392, longitude: -104.9903 }, 'Las Vegas, NV': { latitude: 36.1699, longitude: -115.1398 }, 'Orlando, FL': { latitude: 28.5383, longitude: -81.3792 }, 'Portland, OR': { latitude: 45.5152, longitude: -122.6784 }, 'Phoenix, AZ': { latitude: 33.4484, longitude: -112.0740 }, 'Tampa, FL': { latitude: 27.9506, longitude: -82.4572 }, 'Charlotte, NC': { latitude: 35.2271, longitude: -80.8431 }, 'Philadelphia, PA': { latitude: 39.9526, longitude: -75.1652 }, 'Minneapolis, MN': { latitude: 44.9778, longitude: -93.2650 }, 'Nashville, TN': { latitude: 36.1627, longitude: -86.7816 }, 'Salt Lake City, UT': { latitude: 40.7608, longitude: -111.8910 }, 'Kansas City, MO': { latitude: 39.0997, longitude: -94.5786 }, 'Raleigh, NC': { latitude: 35.7796, longitude: -78.6382 }, 'Columbus, OH': { latitude: 39.9612, longitude: -82.9988 }, 'Detroit, MI': { latitude: 42.3314, longitude: -83.0458 },
    'Vancouver, BC': { latitude: 49.2827, longitude: -123.1207 }, 'Montreal, QC': { latitude: 45.5019, longitude: -73.5674 }, 'Calgary, AB': { latitude: 51.0447, longitude: -114.0719 }, 'Ottawa, ON': { latitude: 45.4215, longitude: -75.6972 }, 'Edmonton, AB': { latitude: 53.5461, longitude: -113.4938 }, 'Quebec City, QC': { latitude: 46.8139, longitude: -71.2080 }, 'Winnipeg, MB': { latitude: 49.8951, longitude: -97.1384 }, 'Halifax, NS': { latitude: 44.6488, longitude: -63.5752 }, 'Victoria, BC': { latitude: 48.4284, longitude: -123.3656 }, 'Saskatoon, SK': { latitude: 52.1332, longitude: -106.6700 }, 'Regina, SK': { latitude: 50.4452, longitude: -104.6189 },
};
const citySuggestions = Object.keys(cityCoordinates);
const normalizeCity = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
const mapsSearchUrl = (query: string, city: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${query} ${city}`)}`;
const inferredPlaceKind = (query: string): PlaceKind | 'All' => {
    const text = query.trim().toLowerCase();
    if (/airbnb|hotel|stay|resort|room|lodging/.test(text))
        return 'Hotel';
    if (/restaurant|dinner|food|brunch|lunch|indian|italian|mexican/.test(text))
        return 'Restaurant';
    if (/coffee|cafe|chai|tea/.test(text))
        return 'Cafe';
    if (/park|garden|walk|trail|hike|outdoor/.test(text))
        return 'Park';
    if (/spa|massage|wellness|yoga/.test(text))
        return 'Wellness';
    if (/dessert|ice cream|bakery|sweet/.test(text))
        return 'Dessert';
    if (/museum|gallery|culture|art/.test(text))
        return 'Cultural';
    if (/tour|travel|trip|attraction|romantic place/.test(text))
        return 'Tourist';
    if (/activity|bowling|comedy|class|pottery|game/.test(text))
        return 'Activity';
    if (/lounge|rooftop|wine|bar/.test(text))
        return 'Lounge';
    return 'All';
};
const buildCityFallbackPlaces = (city: string): PlaceItem[] => {
    const displayCity = city.trim() || 'Your city';
    const country = /\b(ON|QC|BC|AB|MB|NS|NB|SK|PE|NL)\b/i.test(displayCity) ? 'Canada' : 'USA';
    const templates: {
        kind: PlaceKind;
        name: string;
        price: string;
        vibe: string;
        bestTime: string;
        icon: string;
        tags: string[];
    }[] = [
        { kind: 'Restaurant', name: 'Top-rated romantic restaurants', price: '$$', vibe: 'Dinner options matched to your cuisine and budget', bestTime: 'Friday or Saturday evening', icon: '🍽️', tags: ['restaurant', 'dinner', 'romantic', 'food'] },
        { kind: 'Cafe', name: 'Quiet coffee & chai near you', price: '$', vibe: 'Low-pressure first-date cafés with public seating', bestTime: 'Late morning or early evening', icon: '☕', tags: ['coffee', 'cafe', 'chai', 'first date'] },
        { kind: 'Park', name: 'Public park & sunset walk', price: 'Free', vibe: 'Open-air conversation with an easy arrival and exit', bestTime: 'Golden hour', icon: '🌳', tags: ['park', 'walk', 'garden', 'outdoor', 'romantic place'] },
        { kind: 'Activity', name: 'Something fun to do together', price: '$$', vibe: 'Classes, comedy, bowling and playful local activities', bestTime: 'Weekend afternoon', icon: '🎟️', tags: ['activity', 'comedy', 'class', 'games'] },
        { kind: 'Cultural', name: 'Museum, gallery & culture date', price: '$–$$', vibe: 'Built-in conversation starters without a loud room', bestTime: 'Weekend daytime', icon: '🖼️', tags: ['museum', 'gallery', 'culture', 'art'] },
        { kind: 'Hotel', name: 'Romantic hotels & stays', price: '$$$', vibe: 'Compare hotels, boutique stays and Airbnb-style options', bestTime: 'Weekend getaway', icon: '🛏️', tags: ['hotel', 'stay', 'airbnb', 'travel', 'resort'] },
        { kind: 'Wellness', name: 'Couples spa & wellness', price: '$$$', vibe: 'Relaxing shared time with clear booking policies', bestTime: 'Sunday afternoon', icon: '🌿', tags: ['spa', 'massage', 'wellness', 'relax'] },
        { kind: 'Tourist', name: 'Local gems & weekend trips', price: '$–$$$', vibe: 'Popular attractions and new things to explore nearby', bestTime: 'Weekend morning', icon: '🧭', tags: ['tourist', 'travel', 'trip', 'attraction', 'new'] },
    ];
    return templates.map((item, index) => ({ id: `city-${normalizeCity(displayCity).replace(/[^a-z0-9]+/g, '-')}-${item.kind.toLowerCase()}`, name: item.name, city: displayCity, country, kind: item.kind, area: `Near ${displayCity.split(',')[0]}`, price: item.price, vibe: item.vibe, bestTime: item.bestTime, safety: 'Public-first suggestion. Confirm current hours, reviews, availability and cancellation terms.', icon: item.icon, tags: item.tags, source: 'curated', mapsUrl: mapsSearchUrl(item.tags[0] ?? item.name, displayCity), bookable: false, recommendationReason: index < 3 ? `Recommended from your ${displayCity.split(',')[0]} profile location` : 'Matches a popular date style', matchScore: Math.max(82, 97 - index * 2) }));
};
const livePlaceToItem = (place: MarketplacePlace): PlaceItem => ({
    id: `live-${place.id}`,
    name: place.name,
    city: place.city,
    country: /\b(ON|QC|BC|AB|MB|NS|NB|SK|PE|NL)\b/i.test(place.city) ? 'Canada' : 'USA',
    kind: place.category,
    area: place.address || place.city,
    price: place.price,
    vibe: place.rating ? `${place.rating.toFixed(1)} rated local choice${place.openNow === true ? ' · open now' : ''}` : 'A local place to explore together',
    bestTime: place.openNow === true ? 'Open now' : place.openNow === false ? 'Currently closed' : 'Check live hours',
    safety: 'Meet in public, use separate arrival plans, and confirm details before leaving.',
    icon: '📍',
    tags: ['live result', place.category.toLowerCase()],
    source: 'live',
    rating: place.rating,
    ratingCount: place.ratingCount,
    openNow: place.openNow,
    mapsUrl: place.mapsUrl,
    latitude: place.latitude,
    longitude: place.longitude,
});
export const datePackages: DatePackage[] = [
    { id: 'safe-cafe', title: 'First Date Safe Café', tier: 'Starter', city: 'Any major city', price: '$18–$35 pp', duration: '60–75 min', icon: 'cafe', includes: ['Quiet public café shortlist', 'Two time options', 'Safety check-in reminder'], safety: 'Public, easy exit, no private address shared.' },
    { id: 'chai-dessert', title: 'Chai + Dessert Walk', tier: 'Community favorite', city: 'NYC · Toronto · Dallas', price: '$22–$45 pp', duration: '90 min', icon: 'ice-cream', includes: ['Indian dessert spot', 'Nearby public walk', 'Conversation prompts'], safety: 'Busy area, daytime/evening public route.' },
    { id: 'museum-coffee', title: 'Museum + Coffee', tier: 'Values date', city: 'USA / Canada', price: '$25–$55 pp', duration: '2 hours', icon: 'color-palette', includes: ['Museum or gallery pick', 'Coffee after', 'Low-pressure activity'], safety: 'Staffed indoor venue with public seating.' },
    { id: 'indian-dinner', title: 'Indian Dinner Date', tier: 'Plus', city: 'Top metro cities', price: '$45–$90 pp', duration: '90–120 min', icon: 'restaurant', includes: ['Vegetarian-friendly restaurant', 'Reservation hold preview', 'Split/host payment choice'], safety: 'Partner venue, reservation trail and check-in.' },
    { id: 'rooftop-table', title: 'Premium Rooftop Table', tier: 'Premium', city: 'NYC · LA · Miami · Toronto', price: '$95–$180 pp', duration: '2 hours', icon: 'wine', includes: ['Rooftop or lounge table', 'Mocktail/dessert option', 'Concierge reminder'], safety: 'Staffed venue, separate arrivals encouraged.' },
    { id: 'executive-dinner', title: 'Executive Invite-only Dinner', tier: 'Executive Circle', city: 'NYC · SF · Dallas', price: 'Included after approval', duration: '2.5 hours', icon: 'diamond', includes: ['Verified guest list', 'Hosted table', 'Private concierge follow-up'], safety: 'Invite-only, ID/business verified, host present.' },
];
const coupleBundles: CoupleBundle[] = [
    { id: 'easy-first-date', title: 'The Easy First Date', city: 'Any USA / Canada city', price: 'From $69', priceCents: 6900, duration: '2–3 hours', mood: 'Cozy', icon: 'cafe', includes: ['Café or dessert reservation', 'Shared-interest activity', 'Parking/transit guidance', 'Safety check-in'], flexibility: 'Free plan changes before venue confirmation.', safety: 'Public venues, separate arrival options and private contact details.' },
    { id: 'date-night', title: 'Dinner + Something Fun', city: 'Any USA / Canada city', price: 'From $189', priceCents: 18900, duration: '4–5 hours', mood: 'Playful', icon: 'restaurant', includes: ['Dinner table for two', 'Comedy, games or live show', 'Dessert stop', 'One shared itinerary'], flexibility: 'Flexible time swap when inventory allows.', safety: 'Verified reservation trail and optional trusted-contact share.' },
    { id: 'city-escape', title: 'Romantic City Escape', city: 'Any USA / Canada city', price: 'From $649', priceCents: 64900, duration: '1 night', mood: 'Romantic', icon: 'bed', includes: ['Boutique hotel stay', 'Dinner reservation', 'Couples experience', 'Breakfast or late checkout'], flexibility: 'Refund and cancellation terms shown before confirmation.', safety: 'Hotel and venue details unlock only after both partners accept.' },
    { id: 'weekend', title: 'Anniversary Weekend', city: 'Any USA / Canada city', price: 'From $1,249', priceCents: 124900, duration: '2 nights', mood: 'Luxury', icon: 'diamond', includes: ['Premium romantic hotel', 'Chef-led dinner', 'Spa or wellness session', 'Flowers and private concierge'], flexibility: 'Concierge handles changes across the complete itinerary.', safety: 'One support contact for stay, dining, experience and transport issues.' },
];
const marketplaceBookingTypes = [
    { title: 'Restaurants & cafés', body: 'Real-time tables, dietary preferences, deposits and cancellation terms.', icon: 'restaurant' as const, tone: 'ruby' as PremiumIconTone },
    { title: 'Hotels & romantic stays', body: 'Room availability, total price, amenities, policies and secure booking.', icon: 'bed' as const, tone: 'gold' as PremiumIconTone },
    { title: 'Experiences & tours', body: 'Cooking, pottery, comedy, museums, cruises and local activities.', icon: 'ticket' as const, tone: 'plum' as PremiumIconTone },
    { title: 'Events & entertainment', body: 'Concerts, sports, theatre, festivals and DestinyOne hosted mixers.', icon: 'musical-notes' as const, tone: 'rose' as PremiumIconTone },
    { title: 'Spa & wellness', body: 'Couples massage, wellness day, yoga and relaxing retreat options.', icon: 'flower' as const, tone: 'gold' as PremiumIconTone },
    { title: 'Surprises & gifting', body: 'Flowers, dessert, room décor and meaningful add-ons in one order.', icon: 'gift' as const, tone: 'ruby' as PremiumIconTone },
    { title: 'Transport & arrival', body: 'Parking, transit, separate arrival plans and future ride integrations.', icon: 'car' as const, tone: 'dark' as PremiumIconTone },
] as const;
const reservationOps = [
    { title: 'Quote + hold', body: 'Show package price, hold expiry, refund rules and venue confirmation before payment.', icon: 'receipt-outline' as const },
    { title: 'Private acceptance', body: 'Both members confirm the date plan before location details or reservation actions are finalized.', icon: 'lock-closed-outline' as const },
    { title: 'Safety check-in', body: 'Reminder before and after the date with quick “I’m safe” and support/report paths.', icon: 'shield-checkmark-outline' as const },
    { title: 'Partner support', body: 'Venue cancellation, late arrival, refund and support escalation are tracked as provider events.', icon: 'headset-outline' as const },
] as const;
const safeDateChecklist = [
    'Public venue with staff nearby',
    'Separate arrival and exit options',
    'No home address sharing',
    'Check-in reminder enabled',
    'Report/block path one tap away',
] as const;
export const placeDirectory: PlaceItem[] = [
    { id: 'fresno-shinzen', name: 'Shinzen Japanese Friendship Garden', city: 'Fresno, CA', country: 'USA', kind: 'Park', area: 'Woodward Park', price: '$', vibe: 'Peaceful garden paths, koi views and easy conversation', bestTime: 'Weekend morning or golden hour', safety: 'Public staffed garden inside Woodward Park; confirm seasonal hours', icon: '🌸', tags: ['garden', 'walk', 'romantic', 'public'], mapsUrl: mapsSearchUrl('Shinzen Japanese Friendship Garden', 'Fresno, CA'), recommendationReason: 'A calm profile-city pick for conversation', matchScore: 98 },
    { id: 'fresno-woodward', name: 'Woodward Park Sunset Walk', city: 'Fresno, CA', country: 'USA', kind: 'Park', area: 'North Fresno', price: '$', vibe: 'Open trails, river-bluff views and a flexible first date', bestTime: 'Golden hour', safety: 'Meet near a named public entrance and stay on open paths', icon: '🌳', tags: ['park', 'sunset', 'walk', 'first date'], mapsUrl: mapsSearchUrl('Woodward Park', 'Fresno, CA'), recommendationReason: 'Nearby, public and easy to shorten or extend', matchScore: 97 },
    { id: 'fresno-forestiere', name: 'Forestiere Underground Gardens Tour', city: 'Fresno, CA', country: 'USA', kind: 'Tourist', area: 'West Shaw Avenue', price: '$$', vibe: 'A memorable guided tour with natural conversation prompts', bestTime: 'Daytime · reserve ahead', safety: 'Ticketed public attraction; confirm tour time and weather policy', icon: '🏛️', tags: ['tour', 'garden', 'history', 'unique'], mapsUrl: mapsSearchUrl('Forestiere Underground Gardens', 'Fresno, CA'), bookable: true, recommendationReason: 'A distinctive Fresno experience for an activity-led date', matchScore: 95 },
    { id: 'fresno-zoo', name: 'Fresno Chaffee Zoo Day Date', city: 'Fresno, CA', country: 'USA', kind: 'Activity', area: 'Roeding Park', price: '$$', vibe: 'A playful daytime date with plenty to discover together', bestTime: 'Morning · check ticket hours', safety: 'Staffed public attraction with separate arrival options', icon: '🦒', tags: ['zoo', 'activity', 'day date', 'public'], mapsUrl: mapsSearchUrl('Fresno Chaffee Zoo', 'Fresno, CA'), bookable: true, recommendationReason: 'High-energy daytime option near your profile city', matchScore: 93 },
    { id: 'fresno-tower', name: 'Tower District Dinner & Show Search', city: 'Fresno, CA', country: 'USA', kind: 'Restaurant', area: 'Tower District', price: '$$', vibe: 'Pair a restaurant with local theatre, music or dessert', bestTime: 'Friday evening', safety: 'Choose a staffed venue and confirm event/ticket details', icon: '🎭', tags: ['restaurant', 'dinner', 'theatre', 'music'], mapsUrl: mapsSearchUrl('romantic restaurants Tower District', 'Fresno, CA'), recommendationReason: 'Dinner-plus-activity option close to home', matchScore: 91 },
    { id: 'fresno-clovis', name: 'Old Town Clovis Coffee Walk', city: 'Clovis, CA', country: 'USA', kind: 'Cafe', area: 'Old Town Clovis', price: '$', vibe: 'Coffee, shops and a relaxed walk in a public district', bestTime: 'Saturday morning', safety: 'Public commercial area; agree on a named café first', icon: '☕', tags: ['coffee', 'walk', 'shops', 'clovis'], mapsUrl: mapsSearchUrl('coffee Old Town Clovis', 'Clovis, CA'), recommendationReason: 'A low-pressure option near Fresno', matchScore: 89 },
    { id: 'nyc-bow-bridge', name: 'Central Park Bow Bridge', city: 'New York, NY', country: 'USA', kind: 'Park', area: 'Central Park', price: 'Free', vibe: 'Classic walk, photos and quiet conversation', bestTime: 'Saturday morning', safety: 'Very public in daytime; meet near main paths', icon: '🌳', tags: ['walk', 'tourist', 'romantic'] },
    { id: 'nyc-bryant', name: 'Bryant Park Coffee Walk', city: 'New York, NY', country: 'USA', kind: 'Cafe', area: 'Midtown', price: '$', vibe: 'Easy first coffee with public seating', bestTime: 'Weekday evening', safety: 'Busy public area near transit', icon: '☕', tags: ['coffee', 'public', 'quick'] },
    { id: 'nyc-pier57', name: 'Pier 57 Rooftop & Food Hall', city: 'New York, NY', country: 'USA', kind: 'Restaurant', area: 'Chelsea / Hudson River', price: '$$', vibe: 'Views, food choices and low-pressure seating', bestTime: 'Sunset', safety: 'Public venue with multiple exits', icon: '🌇', tags: ['food hall', 'views', 'sunset'] },
    { id: 'nyc-met', name: 'The Met Museum Date', city: 'New York, NY', country: 'USA', kind: 'Cultural', area: 'Upper East Side', price: '$$', vibe: 'Art, values and easy conversation starters', bestTime: 'Sunday afternoon', safety: 'Indoor public museum', icon: '🖼️', tags: ['museum', 'culture', 'day date'] },
    { id: 'la-griffith', name: 'Griffith Observatory', city: 'Los Angeles, CA', country: 'USA', kind: 'Tourist', area: 'Los Feliz', price: 'Free', vibe: 'City views, stars and meaningful talk', bestTime: 'Golden hour', safety: 'Public attraction; parking can be busy', icon: '🔭', tags: ['views', 'tourist', 'sunset'] },
    { id: 'la-getty', name: 'Getty Center Garden Walk', city: 'Los Angeles, CA', country: 'USA', kind: 'Cultural', area: 'Brentwood', price: '$', vibe: 'Architecture, gardens and slow conversation', bestTime: 'Saturday afternoon', safety: 'Staffed public campus', icon: '🏛️', tags: ['museum', 'garden', 'art'] },
    { id: 'la-venice', name: 'Venice Canals Stroll', city: 'Los Angeles, CA', country: 'USA', kind: 'Park', area: 'Venice', price: 'Free', vibe: 'Scenic walk without loud bar energy', bestTime: 'Morning', safety: 'Meet in daylight and stay on public walkways', icon: '🌊', tags: ['walk', 'photo', 'calm'] },
    { id: 'la-rooftop', name: 'Downtown Rooftop Mocktail Lounge', city: 'Los Angeles, CA', country: 'USA', kind: 'Lounge', area: 'DTLA', price: '$$$', vibe: 'Premium evening date with skyline energy', bestTime: 'Friday 8 PM', safety: 'Choose staffed venues and arrange own transport', icon: '🍸', tags: ['rooftop', 'premium', 'mocktails'] },
    { id: 'chi-riverwalk', name: 'Chicago Riverwalk', city: 'Chicago, IL', country: 'USA', kind: 'Tourist', area: 'Downtown', price: 'Free', vibe: 'Beautiful walk, architecture and easy stops', bestTime: 'Summer evening', safety: 'Public and active; avoid isolated late hours', icon: '🚶', tags: ['walk', 'architecture', 'views'] },
    { id: 'chi-millennium', name: 'Millennium Park + Dessert', city: 'Chicago, IL', country: 'USA', kind: 'Dessert', area: 'The Loop', price: '$', vibe: 'Tourist classic plus sweet treat after', bestTime: 'Afternoon', safety: 'Meet near main entrances', icon: '🍨', tags: ['dessert', 'tourist', 'public'] },
    { id: 'chi-westloop', name: 'West Loop Dinner Row', city: 'Chicago, IL', country: 'USA', kind: 'Restaurant', area: 'West Loop', price: '$$$', vibe: 'Upscale dinner options for second dates', bestTime: 'Saturday dinner', safety: 'Use reservation and share date plan', icon: '🍽️', tags: ['dinner', 'premium', 'restaurant'] },
    { id: 'hou-buffalo', name: 'Buffalo Bayou Park', city: 'Houston, TX', country: 'USA', kind: 'Park', area: 'Montrose / Downtown', price: 'Free', vibe: 'Walk, skyline and casual outdoor energy', bestTime: 'Morning or sunset', safety: 'Daytime recommended for first date', icon: '🌿', tags: ['walk', 'park', 'skyline'] },
    { id: 'hou-museum', name: 'Museum District Café Date', city: 'Houston, TX', country: 'USA', kind: 'Cafe', area: 'Museum District', price: '$$', vibe: 'Coffee before or after a museum visit', bestTime: 'Sunday afternoon', safety: 'Public, easy to exit politely', icon: '☕', tags: ['museum', 'coffee', 'culture'] },
    { id: 'dal-klyde', name: 'Klyde Warren Park', city: 'Dallas, TX', country: 'USA', kind: 'Park', area: 'Arts District', price: 'Free', vibe: 'Food trucks, public seating and light activity', bestTime: 'Saturday lunch', safety: 'Busy public park', icon: '🌮', tags: ['food trucks', 'park', 'casual'] },
    { id: 'dal-bishop', name: 'Bishop Arts Dessert Walk', city: 'Dallas, TX', country: 'USA', kind: 'Dessert', area: 'Bishop Arts', price: '$$', vibe: 'Cute shops, dessert and low-pressure wandering', bestTime: 'Evening', safety: 'Stay in active streets', icon: '🧁', tags: ['dessert', 'shops', 'walk'] },
    { id: 'aus-ladybird', name: 'Lady Bird Lake Trail', city: 'Austin, TX', country: 'USA', kind: 'Park', area: 'Downtown Austin', price: 'Free', vibe: 'Active, relaxed and conversation-friendly', bestTime: 'Morning', safety: 'Public trail; daytime first', icon: '🏞️', tags: ['walk', 'fitness', 'outdoor'] },
    { id: 'aus-southcongress', name: 'South Congress Coffee + Shops', city: 'Austin, TX', country: 'USA', kind: 'Cafe', area: 'SoCo', price: '$$', vibe: 'Coffee, boutiques and playful photos', bestTime: 'Saturday afternoon', safety: 'Busy public area', icon: '🛍️', tags: ['coffee', 'shops', 'casual'] },
    { id: 'sf-ferry', name: 'Ferry Building Date', city: 'San Francisco, CA', country: 'USA', kind: 'Restaurant', area: 'Embarcadero', price: '$$', vibe: 'Food stalls, bay views and easy stroll', bestTime: 'Weekend lunch', safety: 'Public indoor/outdoor marketplace', icon: '🌁', tags: ['food hall', 'bay', 'walk'] },
    { id: 'sf-golden', name: 'Golden Gate Park Tea Garden', city: 'San Francisco, CA', country: 'USA', kind: 'Cultural', area: 'Golden Gate Park', price: '$$', vibe: 'Quiet, beautiful and intentional', bestTime: 'Sunday afternoon', safety: 'Daytime public attraction', icon: '🍵', tags: ['tea', 'garden', 'culture'] },
    { id: 'sea-pike', name: 'Pike Place Market', city: 'Seattle, WA', country: 'USA', kind: 'Tourist', area: 'Downtown Seattle', price: '$$', vibe: 'Food, flowers and playful exploration', bestTime: 'Morning', safety: 'Busy public market', icon: '💐', tags: ['market', 'flowers', 'tourist'] },
    { id: 'sea-kerry', name: 'Kerry Park Viewpoint', city: 'Seattle, WA', country: 'USA', kind: 'Tourist', area: 'Queen Anne', price: 'Free', vibe: 'Short scenic stop, best paired with coffee', bestTime: 'Sunset', safety: 'Public viewpoint; keep it brief for first meet', icon: '🌄', tags: ['views', 'photo', 'sunset'] },
    { id: 'mia-wynwood', name: 'Wynwood Walls + Café', city: 'Miami, FL', country: 'USA', kind: 'Cultural', area: 'Wynwood', price: '$$', vibe: 'Art, color and easy conversation', bestTime: 'Afternoon', safety: 'Stay in main public art areas', icon: '🎨', tags: ['art', 'coffee', 'walk'] },
    { id: 'mia-brickell', name: 'Brickell Dinner Lounge', city: 'Miami, FL', country: 'USA', kind: 'Lounge', area: 'Brickell', price: '$$$', vibe: 'Dressy evening with city energy', bestTime: 'Friday evening', safety: 'Meet inside venue, arrange own ride', icon: '✨', tags: ['lounge', 'premium', 'dinner'] },
    { id: 'bos-seaport', name: 'Boston Seaport Walk', city: 'Boston, MA', country: 'USA', kind: 'Park', area: 'Seaport', price: 'Free', vibe: 'Waterfront, clean public space and cafés nearby', bestTime: 'Late afternoon', safety: 'Public and active area', icon: '🌊', tags: ['waterfront', 'walk', 'coffee'] },
    { id: 'bos-isabella', name: 'Isabella Stewart Gardner Museum', city: 'Boston, MA', country: 'USA', kind: 'Cultural', area: 'Fenway', price: '$$', vibe: 'Romantic art setting without bar pressure', bestTime: 'Sunday afternoon', safety: 'Staffed indoor museum', icon: '🏺', tags: ['museum', 'art', 'romantic'] },
    { id: 'dc-mall', name: 'National Mall Walk', city: 'Washington, DC', country: 'USA', kind: 'Tourist', area: 'National Mall', price: 'Free', vibe: 'Iconic monuments and meaningful talks', bestTime: 'Morning', safety: 'Public; avoid isolated late-night walks', icon: '🏛️', tags: ['tourist', 'walk', 'history'] },
    { id: 'dc-georgetown', name: 'Georgetown Waterfront Dessert', city: 'Washington, DC', country: 'USA', kind: 'Dessert', area: 'Georgetown', price: '$$', vibe: 'River views, dessert and cute streets', bestTime: 'Evening', safety: 'Busy public area', icon: '🍰', tags: ['dessert', 'waterfront', 'walk'] },
    { id: 'sd-balboa', name: 'Balboa Park Garden Date', city: 'San Diego, CA', country: 'USA', kind: 'Park', area: 'Balboa Park', price: 'Free', vibe: 'Gardens, museums and sunshine', bestTime: 'Saturday afternoon', safety: 'Public daytime location', icon: '🌺', tags: ['garden', 'museum', 'outdoor'] },
    { id: 'atl-beltline', name: 'Atlanta BeltLine + Food Hall', city: 'Atlanta, GA', country: 'USA', kind: 'Activity', area: 'Old Fourth Ward', price: '$$', vibe: 'Walk, murals and food options', bestTime: 'Weekend afternoon', safety: 'Stay on active trail sections', icon: '🚲', tags: ['walk', 'food hall', 'murals'] },
    { id: 'den-union', name: 'Denver Union Station Coffee', city: 'Denver, CO', country: 'USA', kind: 'Cafe', area: 'LoDo', price: '$$', vibe: 'Cozy public coffee date with transit access', bestTime: 'Sunday morning', safety: 'Public landmark with staff nearby', icon: '🚉', tags: ['coffee', 'public', 'cozy'] },
    { id: 'lv-bellagio', name: 'Bellagio Conservatory Walk', city: 'Las Vegas, NV', country: 'USA', kind: 'Tourist', area: 'The Strip', price: 'Free', vibe: 'Beautiful indoor walk without casino pressure', bestTime: 'Afternoon', safety: 'Busy public resort area', icon: '🌸', tags: ['tourist', 'indoor', 'photo'] },
    { id: 'orl-disney', name: 'Disney Springs Dinner Walk', city: 'Orlando, FL', country: 'USA', kind: 'Restaurant', area: 'Lake Buena Vista', price: '$$', vibe: 'Food, music and safe public energy', bestTime: 'Evening', safety: 'Highly public, staffed area', icon: '🎶', tags: ['restaurant', 'walk', 'entertainment'] },
    { id: 'tor-distillery', name: 'Distillery District Date', city: 'Toronto, ON', country: 'Canada', kind: 'Cultural', area: 'Downtown Toronto', price: '$$', vibe: 'Historic streets, dessert and galleries', bestTime: 'Saturday afternoon', safety: 'Public pedestrian district', icon: '🧱', tags: ['culture', 'dessert', 'walk'] },
    { id: 'tor-cn', name: 'CN Tower Views + Dinner Nearby', city: 'Toronto, ON', country: 'Canada', kind: 'Tourist', area: 'Entertainment District', price: '$$$', vibe: 'Big-city premium date energy', bestTime: 'Sunset', safety: 'Public landmark; book ahead', icon: '🗼', tags: ['views', 'tourist', 'premium'] },
    { id: 'tor-yorkville', name: 'Yorkville Café & Gallery Walk', city: 'Toronto, ON', country: 'Canada', kind: 'Cafe', area: 'Yorkville', price: '$$', vibe: 'Polished café date and calm streets', bestTime: 'Sunday afternoon', safety: 'Busy upscale neighborhood', icon: '☕', tags: ['coffee', 'gallery', 'premium'] },
    { id: 'van-stanley', name: 'Stanley Park Seawall', city: 'Vancouver, BC', country: 'Canada', kind: 'Park', area: 'Stanley Park', price: 'Free', vibe: 'Iconic walk with ocean views', bestTime: 'Morning', safety: 'Daytime public route recommended', icon: '🌲', tags: ['walk', 'views', 'outdoor'] },
    { id: 'van-granville', name: 'Granville Island Market', city: 'Vancouver, BC', country: 'Canada', kind: 'Restaurant', area: 'Granville Island', price: '$$', vibe: 'Food market, shops and waterfront', bestTime: 'Lunch', safety: 'Public market', icon: '🛶', tags: ['market', 'food', 'waterfront'] },
    { id: 'mtl-old', name: 'Old Montréal Evening Walk', city: 'Montreal, QC', country: 'Canada', kind: 'Tourist', area: 'Old Montréal', price: 'Free', vibe: 'Cobblestones, lights and romantic streets', bestTime: 'Early evening', safety: 'Stay in active tourist streets', icon: '🏙️', tags: ['tourist', 'romantic', 'walk'] },
    { id: 'mtl-mountroyal', name: 'Mount Royal Lookout', city: 'Montreal, QC', country: 'Canada', kind: 'Park', area: 'Mount Royal', price: 'Free', vibe: 'Views and outdoor conversation', bestTime: 'Daytime', safety: 'Daylight first-date option', icon: '⛰️', tags: ['views', 'park', 'outdoor'] },
    { id: 'cal-peace', name: 'Peace Bridge + River Café Area', city: 'Calgary, AB', country: 'Canada', kind: 'Cafe', area: 'Bow River', price: '$$', vibe: 'Walk plus coffee/dessert nearby', bestTime: 'Afternoon', safety: 'Public river path', icon: '🌉', tags: ['walk', 'coffee', 'river'] },
    { id: 'cal-prince', name: "Prince's Island Park", city: 'Calgary, AB', country: 'Canada', kind: 'Park', area: 'Downtown Calgary', price: 'Free', vibe: 'Relaxed green-space date', bestTime: 'Morning', safety: 'Public park in daylight', icon: '🍃', tags: ['park', 'walk', 'calm'] },
    { id: 'ott-byward', name: 'ByWard Market Food Walk', city: 'Ottawa, ON', country: 'Canada', kind: 'Restaurant', area: 'ByWard Market', price: '$$', vibe: 'Food stalls, desserts and lively streets', bestTime: 'Weekend afternoon', safety: 'Busy public market', icon: '🥐', tags: ['market', 'food', 'dessert'] },
    { id: 'ott-canal', name: 'Rideau Canal Walk', city: 'Ottawa, ON', country: 'Canada', kind: 'Tourist', area: 'Downtown Ottawa', price: 'Free', vibe: 'Scenic walk with historic city feel', bestTime: 'Afternoon', safety: 'Public path; daytime recommended', icon: '⛸️', tags: ['walk', 'tourist', 'views'] },
    { id: 'tor-romantic-dinner', name: 'Toronto Skyline Dinner for Two', city: 'Toronto, ON', country: 'Canada', kind: 'Restaurant', area: 'Financial District', price: '$$$', vibe: 'Window-table dining with skyline views and a polished evening atmosphere', bestTime: 'Friday · 7:30 PM', safety: 'Staffed downtown venue near transit', icon: '🍽️', tags: ['romantic', 'dinner', 'views', 'reservable'], photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=82' },
    { id: 'tor-boutique-stay', name: 'Boutique Romance Stay', city: 'Toronto, ON', country: 'Canada', kind: 'Hotel', area: 'Queen Street East', price: '$$$$', vibe: 'Design-led suite, breakfast and spa add-on for a one-night city escape', bestTime: 'Weekend check-in', safety: 'Verified hotel desk and private itinerary details', icon: '🛏️', tags: ['hotel', 'romantic', 'spa', 'breakfast'], photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=82' },
    { id: 'tor-spa-day', name: 'Couples Spa + Afternoon Tea', city: 'Toronto, ON', country: 'Canada', kind: 'Wellness', area: 'Yorkville', price: '$$$', vibe: 'Relaxing couples treatment followed by tea in a calm upscale setting', bestTime: 'Saturday · 2 PM', safety: 'Licensed staffed wellness venue', icon: '🌸', tags: ['spa', 'wellness', 'tea', 'couples'], photo: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=82' },
    { id: 'mis-lakefront', name: 'Port Credit Lakefront Date', city: 'Mississauga, ON', country: 'Canada', kind: 'Cafe', area: 'Port Credit', price: '$$', vibe: 'Coffee, waterfront walk and sunset with easy GO Transit access', bestTime: 'Sunday · 4 PM', safety: 'Busy public waterfront and main-street cafés', icon: '☕', tags: ['coffee', 'waterfront', 'sunset', 'public'], photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=82' },
    { id: 'oak-harbour', name: 'Oakville Harbour Dinner Walk', city: 'Oakville, ON', country: 'Canada', kind: 'Restaurant', area: 'Old Oakville', price: '$$$', vibe: 'Intimate dinner followed by a quiet harbour walk', bestTime: 'Saturday · 6 PM', safety: 'Active downtown streets and staffed restaurant', icon: '🌊', tags: ['dinner', 'harbour', 'romantic', 'walk'], photo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=82' },
    { id: 'ham-art-date', name: 'Hamilton Art + Dessert Date', city: 'Hamilton, ON', country: 'Canada', kind: 'Cultural', area: 'James Street North', price: '$$', vibe: 'Gallery browsing, local dessert and creative conversation starters', bestTime: 'Friday · 6 PM', safety: 'Public arts district with staffed venues', icon: '🎨', tags: ['gallery', 'dessert', 'art', 'shared interest'], photo: 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=82' },
    { id: 'notl-winery', name: 'Niagara Winery + Chef Lunch', city: 'Niagara-on-the-Lake, ON', country: 'Canada', kind: 'Activity', area: 'Wine Country', price: '$$$$', vibe: 'Scenic tasting, chef lunch and countryside views for a special occasion', bestTime: 'Saturday · 12 PM', safety: 'Ticketed staffed experience; arrange a sober driver', icon: '🍇', tags: ['winery', 'lunch', 'romantic', 'experience'], photo: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=82' },
    { id: 'niagara-falls-stay', name: 'Falls-view Romantic Escape', city: 'Niagara Falls, ON', country: 'Canada', kind: 'Hotel', area: 'Fallsview', price: '$$$$', vibe: 'One-night stay, falls-view room and dinner package', bestTime: 'Friday check-in', safety: 'Verified hotel with staffed lobby and secure booking trail', icon: '🏨', tags: ['hotel', 'falls', 'weekend', 'romantic'], photo: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1200&q=82' },
    { id: 'markham-dinner', name: 'Markham Asian Night Market Date', city: 'Markham, ON', country: 'Canada', kind: 'Restaurant', area: 'Downtown Markham', price: '$$', vibe: 'Shareable food, dessert and lively low-pressure energy', bestTime: 'Saturday evening', safety: 'Public plaza with multiple staffed venues', icon: '🥟', tags: ['food', 'dessert', 'casual', 'public'], photo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=82' },
    { id: 'vaughan-fun', name: 'Vaughan Games + Dinner Night', city: 'Vaughan, ON', country: 'Canada', kind: 'Activity', area: 'Vaughan Metropolitan Centre', price: '$$$', vibe: 'Playful games, easy conversation and dinner nearby', bestTime: 'Friday · 7 PM', safety: 'Indoor staffed entertainment venue near transit', icon: '🎳', tags: ['games', 'dinner', 'playful', 'indoor'], photo: 'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=82' },
];
const placeSearchText = (place: PlaceItem) => [place.name, place.city, place.country, place.kind, place.area, place.vibe, place.safety, place.tags.join(' ')].join(' ').toLowerCase();
const isSafeFirstDatePlace = (place: PlaceItem) => /public|staffed|busy|daytime|museum|market|transit|active|indoor|partner|main/.test(placeSearchText(place));
const isReservablePlace = (place: PlaceItem) => place.bookable === true;
const isPremiumPlace = (place: PlaceItem) => place.price.includes('$$$') || /premium|upscale|rooftop|dinner|views|lounge|yorkville|tower/.test(placeSearchText(place));
const isCommunityPlace = (place: PlaceItem) => /indian|chai|spice|culture|dessert|vegetarian|food|market|tea/.test(placeSearchText(place));
const fallbackPlacePhotos: Record<PlaceKind, string> = { Restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80', Cafe: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80', Hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80', Wellness: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80', Tourist: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', Activity: 'https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80', Park: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80', Dessert: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=80', Lounge: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80', Cultural: 'https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=80' };
const placePhoto = (place: PlaceItem) => place.photo ?? fallbackPlacePhotos[place.kind];
const distanceMiles = (from: {
    latitude: number;
    longitude: number;
}, to: {
    latitude: number;
    longitude: number;
}) => {
    const radians = (value: number) => value * Math.PI / 180;
    const latitudeDelta = radians(to.latitude - from.latitude);
    const longitudeDelta = radians(to.longitude - from.longitude);
    const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
    return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
export const buildMarketplaceSnapshot = () => buildDateMarketplaceSnapshot({
    venueCount: placeDirectory.length,
    cityCount: placeCities.filter(city => city !== 'All').length,
    packageCount: datePackages.length,
    eventCount: eventExperiences.length,
    hasSearch: true,
    hasSafeFirstDateFilter: true,
    hasPartnerProgram: true,
    hasReservationApiPlan: true,
    hasSafetyCheckIns: true,
    hasIndianMixers: eventExperiences.some(event => /indian|south asian|punjabi|gujarati|chai|culture/i.test(`${event.title} ${event.body}`)),
    hasSpeedVideoEvents: eventExperiences.some(event => /speed|video/i.test(`${event.title} ${event.body} ${event.type}`)),
    hasPremiumDinners: eventExperiences.some(event => /premium|invite|dinner|executive/i.test(`${event.title} ${event.body} ${event.type}`)),
});
export const launchMarketplaceCoverage = [
    { city: 'NYC/NJ', partnerLeads: 8, signedPartners: 1, eventHosts: 1, monthlyEvents: 2, capacitySeats: 80 },
    { city: 'Bay Area', partnerLeads: 6, signedPartners: 1, eventHosts: 1, monthlyEvents: 1, capacitySeats: 48 },
    { city: 'Dallas', partnerLeads: 5, signedPartners: 1, eventHosts: 1, monthlyEvents: 1, capacitySeats: 42 },
    { city: 'Toronto', partnerLeads: 7, signedPartners: 1, eventHosts: 1, monthlyEvents: 2, capacitySeats: 90 },
    { city: 'Chicago', partnerLeads: 4, signedPartners: 1, eventHosts: 1, monthlyEvents: 1, capacitySeats: 32 },
] as const;
export function EventsHub({ ports, mode, defaultCity, profileVibes, relationshipIntent, onBack, onOpenDatePlan, onOpenTool, navigate }: {
    ports: MarketplacePorts;
    mode: ExperienceMode;
    defaultCity: string;
    profileVibes: string[];
    relationshipIntent: string;
    onBack: () => void;
    onOpenDatePlan: (place?: PlaceItem) => void;
    onOpenTool: (tool: Exclude<CoupleLaunchTool, null>) => void;
    navigate: (screen: Screen) => void;
}) {
    const isLiveSearchConfigured = ports.liveSearchConfigured;
    const searchMarketplacePlaces = ports.searchPlaces;
    const { width } = useWindowDimensions();
    const compactMarket = width < 430;
    const wideMarket = width >= 720;
    const [section, setSection] = useState<'places' | 'packages' | 'events'>('places');
    const [query, setQuery] = useState('');
    const [kind, setKind] = useState<'All' | PlaceKind>('All');
    const [marketCity, setMarketCity] = useState(defaultCity.trim());
    const [radius, setRadius] = useState(25);
    const [safeOnly, setSafeOnly] = useState(false);
    const [reservableOnly, setReservableOnly] = useState(false);
    const [communityOnly, setCommunityOnly] = useState(false);
    const [premiumOnly, setPremiumOnly] = useState(false);
    const [plannerOpen, setPlannerOpen] = useState(false);
    const [saved, setSaved] = useState<string[]>([]);
    const [selected, setSelected] = useState<PlaceItem | null>(null);
    const [rsvpEvent, setRsvpEvent] = useState<typeof eventExperiences[number] | null>(null);
    const [bundleCheckout, setBundleCheckout] = useState<CoupleBundle | null>(null);
    const [partnerOpen, setPartnerOpen] = useState(false);
    const [, setPartnerStatus] = useState('');
    const [partnerRequest, setPartnerRequest] = useState<PartnerRequest>({ venue: '', city: 'New York, NY', contact: '', packageTitle: 'First Date Safe Café' });
    const [livePlaces, setLivePlaces] = useState<PlaceItem[]>([]);
    const [liveStatus, setLiveStatus] = useState<'preview' | 'loading' | 'ready' | 'error'>('preview');
    const [liveError, setLiveError] = useState('');
    const [nextPageToken, setNextPageToken] = useState<string | undefined>();
    const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false);
    const [smartPromptOpen, setSmartPromptOpen] = useState(!!defaultCity.trim());
    const visibleExperiences = mode === 'couple' ? coupleExperiences : eventExperiences;
    const normalized = query.trim().toLowerCase();
    const selectedCoordinates = cityCoordinates[marketCity];
    const queryKind = inferredPlaceKind(query);
    const effectiveKind = kind === 'All' && queryKind !== 'All' ? queryKind : kind;
    const cityFallback = buildCityFallbackPlaces(marketCity);
    useEffect(() => { if (defaultCity.trim()) {
        setMarketCity(defaultCity.trim());
        setSmartPromptOpen(true);
    } }, [defaultCity]);
    const getDistance = (place: PlaceItem) => {
        const placeCoordinates = place.latitude !== undefined && place.longitude !== undefined ? { latitude: place.latitude, longitude: place.longitude } : cityCoordinates[place.city];
        return selectedCoordinates && placeCoordinates ? distanceMiles(selectedCoordinates, placeCoordinates) : Number.POSITIVE_INFINITY;
    };
    const runLiveSearch = async (append = false) => {
        if (!isLiveSearchConfigured || !marketCity.trim()) {
            setLiveStatus('preview');
            setLivePlaces([]);
            setNextPageToken(undefined);
            return;
        }
        setLiveStatus('loading');
        setLiveError('');
        try {
            const result = await searchMarketplacePlaces({ city: marketCity.trim(), query: query.trim() || undefined, category: kind, pageToken: append ? nextPageToken : undefined });
            if (!result) {
                setLiveStatus('preview');
                return;
            }
            const incoming = result.places.map(livePlaceToItem);
            setLivePlaces(current => append ? [...current, ...incoming.filter(item => !current.some(existing => existing.id === item.id))] : incoming);
            setNextPageToken(result.nextPageToken);
            setLiveStatus('ready');
        }
        catch (error) {
            setLiveStatus('error');
            setLiveError(error instanceof Error ? error.message : 'Live place search is temporarily unavailable.');
        }
    };
    useEffect(() => {
        if (section !== 'places' || !isLiveSearchConfigured || !marketCity.trim())
            return;
        const timeout = setTimeout(() => void runLiveSearch(), 450);
        return () => clearTimeout(timeout);
    }, [section, marketCity, query, kind]);
    const sourcePlaces = liveStatus === 'ready' && livePlaces.length ? livePlaces : [...placeDirectory, ...cityFallback];
    const preferenceText = `${profileVibes.join(' ')} ${relationshipIntent}`.toLowerCase();
    const recommendationScore = (place: PlaceItem) => {
        let score = place.matchScore ?? 76;
        if (place.matchScore === undefined && normalizeCity(place.city) === normalizeCity(marketCity))
            score += 12;
        if (queryKind !== 'All' && place.kind === queryKind)
            score += 7;
        if (place.tags.some(tag => preferenceText.includes(tag.toLowerCase())))
            score += 4;
        if (isSafeFirstDatePlace(place))
            score += 3;
        if (place.openNow === true)
            score += 2;
        if (place.rating)
            score += Math.min(5, Math.round(place.rating));
        return Math.min(99, score);
    };
    const filtered = sourcePlaces.filter(place => {
        const text = placeSearchText(place);
        const sameCity = normalizeCity(place.city) === normalizeCity(marketCity);
        return (!normalized || text.includes(normalized) || (queryKind !== 'All' && place.kind === queryKind))
            && (effectiveKind === 'All' || place.kind === effectiveKind)
            && (place.source === 'live' || !marketCity.trim() || sameCity || !!selectedCoordinates && getDistance(place) <= radius)
            && (!safeOnly || isSafeFirstDatePlace(place))
            && (!reservableOnly || isReservablePlace(place))
            && (!communityOnly || isCommunityPlace(place))
            && (!premiumOnly || isPremiumPlace(place));
    }).sort((left, right) => recommendationScore(right) - recommendationScore(left) || getDistance(left) - getDistance(right));
    const featured = filtered.slice(0, 8);
    const tonightPicks = filtered.filter(place => isSafeFirstDatePlace(place)).slice(0, 3);
    const rsvp = (event: typeof eventExperiences[number]) => setRsvpEvent(event);
    const toggleSaved = (id: string) => setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    const updatePartnerRequest = (key: keyof PartnerRequest, value: string) => setPartnerRequest(current => ({ ...current, [key]: value }));
    const submitPartnerRequest = () => {
        setPartnerStatus(`${partnerRequest.venue.trim() || 'Partner venue'} has been sent to our ${partnerRequest.city} curation team.`);
        setPartnerOpen(false);
    };
    return <LinearGradient colors={['#FFFDFC', '#FAF0EC', '#F7E9E9']} style={{ flex: 1 }}>
    <SafeAreaView style={[shared.safe, marketplaceBrandStyles.page]}>
      <View style={marketplaceBrandStyles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={accessibilityHitSlop} onPress={onBack} style={styles.backButton}><PremiumIcon name="arrow-back" tone="dark" size={42} iconSize={20}/></Pressable>
        <View style={marketplaceBrandStyles.headerCopy}><Text style={marketplaceBrandStyles.headerEyebrow}>DATE CONCIERGE</Text><Text accessibilityRole="header" style={marketplaceBrandStyles.headerTitle}>Date Marketplace</Text></View>
        <MiniPremiumIcon name="shield-checkmark-outline" tone="gold" size={34} iconSize={16}/>
      </View>
      <ScrollView onScroll={handleBottomNavScroll} scrollEventThrottle={16} contentContainerStyle={[marketplaceBrandStyles.content, compactMarket && marketplaceBrandStyles.contentCompact]} showsVerticalScrollIndicator={false}>
        <View style={[marketplaceBrandStyles.hero, wideMarket && marketplaceBrandStyles.heroWide, compactMarket && marketplaceBrandStyles.heroCompact]}>
          <PremiumIcon name="calendar" tone="rose" size={compactMarket ? 52 : wideMarket ? 58 : 64} iconSize={compactMarket ? 24 : wideMarket ? 27 : 29}/>
          <View style={[marketplaceBrandStyles.heroCopy, wideMarket && marketplaceBrandStyles.heroCopyWide]}><Text style={marketplaceBrandStyles.scriptHero}>Plan a date, together.</Text><Text accessibilityRole="header" style={[marketplaceBrandStyles.heroTitle, compactMarket && marketplaceBrandStyles.titleCompact]}>Plan the whole date.</Text><Text style={[marketplaceBrandStyles.heroBody, wideMarket && marketplaceBrandStyles.heroBodyWide, compactMarket && marketplaceBrandStyles.bodyCompact]}>Curated places, thoughtful packages and hosted events for serious couples.</Text></View>
          <View style={marketplaceBrandStyles.publicBadge}><Ionicons name="shield-checkmark" size={14} color={colors.gold}/><Text style={marketplaceBrandStyles.publicBadgeText}>PUBLIC-FIRST</Text></View>
        </View>
        <View style={coachStyles.eventStats}>
          <EventStat value={liveStatus === 'ready' ? `${livePlaces.length}${nextPageToken ? '+' : ''}` : `${placeDirectory.length}+`} label={liveStatus === 'ready' ? 'live results' : 'curated picks'}/>
          <EventStat value={`${radius} mi`} label={marketCity.trim() ? `around ${marketCity.split(',')[0]}` : 'choose a city'}/>
          <EventStat value="Public-first" label="safety standard"/>
        </View>
        {smartPromptOpen && marketCity.trim() && <View style={marketplaceBrandStyles.smartCard}>
          <PremiumIcon name="notifications" tone="ruby" size={44} iconSize={20}/>
          <View style={{ flex: 1 }}><Text style={marketplaceBrandStyles.smartEyebrow}>SMART PICK · {marketCity.split(',')[0]?.toUpperCase() ?? 'YOUR CITY'}</Text><Text style={marketplaceBrandStyles.smartTitle}>Fresh ideas are ready near your profile location.</Text><Text style={marketplaceBrandStyles.smartBody}>We rank public-first places by distance, date style, your saved preferences and current search. Live hours still need confirmation.</Text><Pressable accessibilityRole="button" accessibilityLabel="Show romantic picks" hitSlop={accessibilityHitSlop} onPress={() => { setSection('places'); setQuery('romantic'); setKind('All'); }}><Text style={marketplaceBrandStyles.smartLink}>Show romantic picks</Text></Pressable></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss smart recommendation" hitSlop={accessibilityHitSlop} onPress={() => setSmartPromptOpen(false)}><MiniPremiumIcon name="close" tone="dark" size={30} iconSize={14}/></Pressable>
        </View>}
        <View style={styles.segment}>
          <Segment label="Places" active={section === 'places'} onPress={() => setSection('places')}/>
          <Segment label="Date packages" active={section === 'packages'} onPress={() => setSection('packages')}/>
          <Segment label={mode === 'couple' ? 'Experiences' : 'Events'} active={section === 'events'} onPress={() => setSection('events')}/>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: plannerOpen }} onPress={() => setPlannerOpen(value => !value)} style={marketplaceBrandStyles.plannerToggle}>
          <MiniPremiumIcon name="sparkles" tone="gold" size={38} iconSize={17}/>
          <View style={{ flex: 1 }}><Text style={marketplaceBrandStyles.plannerTitle}>Build the complete date</Text><Text style={marketplaceBrandStyles.plannerBody}>Dining, experiences and arrival details in one plan</Text></View>
          <Ionicons name={plannerOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.gold}/>
        </Pressable>
        {plannerOpen && <CouplesPlanBuilder city={marketCity} radius={radius} onCityChange={setMarketCity} onRadiusChange={setRadius} onExplore={() => { setSection('places'); setPlannerOpen(false); }} onBook={setBundleCheckout}/>}
        {section === 'places' && <>
        <View style={coachStyles.searchPanel}>
          <View style={selectorStyles.searchBox}>
            <MiniPremiumIcon name="location" tone="gold" size={32} iconSize={15}/>
            <TextInput accessibilityLabel="Date Marketplace city" accessibilityHint="Enter any USA or Canada city" value={marketCity} onChangeText={(text) => { setMarketCity(text); setCitySuggestionsOpen(true); }} onFocus={() => setCitySuggestionsOpen(true)} placeholder="Choose any USA or Canada city" placeholderTextColor="#6F6875" style={selectorStyles.searchInput}/>
            {!!marketCity && <Pressable accessibilityRole="button" accessibilityLabel="Clear Date Marketplace city" hitSlop={accessibilityHitSlop} onPress={() => { setMarketCity(''); setCitySuggestionsOpen(false); }}><MiniPremiumIcon name="close-circle" tone="dark" size={30} iconSize={14}/></Pressable>}
          </View>
          {citySuggestionsOpen && <View style={[shared.card, { gap: 2, padding: 8 }]}>
            {citySuggestions.filter(option => option.toLowerCase().includes(marketCity.trim().toLowerCase())).slice(0, 6).map(option => <Pressable accessibilityRole="button" accessibilityLabel={`Use ${option}`} hitSlop={accessibilityHitSlop} key={option} onPress={() => { setMarketCity(option); setCitySuggestionsOpen(false); }} style={{ paddingHorizontal: 10, paddingVertical: 9 }}><Text style={styles.cardTitle}>{option}</Text></Pressable>)}
            <Text style={[styles.helper, { paddingHorizontal: 10, paddingTop: 4 }]}>Type any USA or Canada city to search live local results.</Text>
          </View>}
          <View style={selectorStyles.searchBox}>
            <MiniPremiumIcon name="search" tone="rose" size={32} iconSize={15}/>
            <TextInput accessibilityLabel="Search Date Marketplace" accessibilityHint="Search restaurants, parks, hotels, travel and romantic places" value={query} onChangeText={setQuery} onFocus={() => setCitySuggestionsOpen(false)} placeholder="Search: safe café, Indian dinner, NYC tourist..." placeholderTextColor="#6F6875" style={selectorStyles.searchInput}/>
            {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Clear Date Marketplace search" hitSlop={accessibilityHitSlop} onPress={() => setQuery('')}><MiniPremiumIcon name="close-circle" tone="dark" size={30} iconSize={14}/></Pressable>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={marketplaceBrandStyles.quickSearchRow}>
            {([['Romantic dinner', 'restaurant'], ['Parks & gardens', 'leaf'], ['Coffee & chai', 'cafe'], ['Hotels & Airbnb', 'bed'], ['Weekend trips', 'car'], ['Things to do', 'ticket']] as const).map(([label, icon]) => <Pressable accessibilityRole="button" accessibilityLabel={`Search ${label}`} hitSlop={accessibilityHitSlop} key={label} onPress={() => { setQuery(label); setKind('All'); }} style={marketplaceBrandStyles.quickSearch}><MiniPremiumIcon name={icon} tone="ruby" size={27} iconSize={12}/><Text style={marketplaceBrandStyles.quickSearchText}>{label}</Text></Pressable>)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {placeKinds.map(option => <Pressable accessibilityRole="radio" accessibilityLabel={`${option} category`} accessibilityState={{ checked: kind === option }} hitSlop={accessibilityHitSlop} key={option} onPress={() => setKind(option)} style={[coachStyles.filterPill, kind === option && coachStyles.filterPillOn]}><Text style={[coachStyles.filterText, kind === option && { color: colors.ivory }]}>{option}</Text></Pressable>)}
          </ScrollView>
        </View>
        <TonightSafePicks places={tonightPicks} getDistance={getDistance} onDetail={setSelected} onPlan={onOpenDatePlan}/>
        {liveStatus === 'loading' && <Text style={[styles.helper, { textAlign: 'center' }]}>Finding current places near {marketCity}…</Text>}
        {liveStatus === 'ready' && <Text style={[styles.helper, { textAlign: 'center' }]}>Live local results. Hours and availability can change, so confirm before you leave.</Text>}
        {liveStatus === 'error' && <Text style={[styles.helper, { textAlign: 'center' }]}>Live search is unavailable right now. Showing DestinyOne curated ideas instead. {liveError}</Text>}
        {liveStatus === 'preview' && <Text style={[styles.helper, { textAlign: 'center' }]}>Personalized preview results for {marketCity || 'your city'}. A connected Places provider adds live businesses, hours, ratings and availability.</Text>}
        <View style={coachStyles.marketFilterGrid}>
          <MarketToggle icon="shield-checkmark" label="First date safe near me" active={safeOnly} onPress={() => setSafeOnly(value => !value)}/>
          <MarketToggle icon="calendar" label="Reservation-ready" active={reservableOnly} onPress={() => setReservableOnly(value => !value)}/>
          <MarketToggle icon="people" label="Indian/community" active={communityOnly} onPress={() => setCommunityOnly(value => !value)}/>
          <MarketToggle icon="diamond" label="Members-only" active={premiumOnly} onPress={() => setPremiumOnly(value => !value)}/>
        </View>
        <View style={coachStyles.boundaryCard}>
          <PremiumIcon name="shield-checkmark" tone="gold" size={44} iconSize={19}/>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Safer date rule</Text>
            <Text style={styles.helper}>First meetings should be public, easy to leave, and never require sharing home address or private transport. Check-ins are on by default in Date Concierge.</Text>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <View style={shared.row}>
            <Text style={styles.sectionLabel}>{query || kind !== 'All' || safeOnly || reservableOnly || communityOnly || premiumOnly ? 'SEARCH RESULTS' : `BEST WITHIN ${radius} MILES`}</Text>
            <View style={shared.spacer}/>
            <Text style={coachStyles.resultCount}>{filtered.length} found · {saved.length} saved</Text>
          </View>
          {featured.map(place => <PlaceCard key={place.id} place={{ ...place, matchScore: recommendationScore(place) }} distance={getDistance(place)} saved={saved.includes(place.id)} onSave={() => toggleSaved(place.id)} onDetail={() => setSelected({ ...place, matchScore: recommendationScore(place) })} onPlan={() => onOpenDatePlan(place)}/>)}
        </View>
        {filtered.length > 8 && <View style={{ gap: 12 }}>
          <Text style={styles.sectionLabel}>MORE OPTIONS</Text>
          {filtered.slice(8, 14).map(place => <PlaceCard key={place.id} compact place={place} distance={getDistance(place)} saved={saved.includes(place.id)} onSave={() => toggleSaved(place.id)} onDetail={() => setSelected(place)} onPlan={() => onOpenDatePlan(place)}/>)}
          {filtered.length > 14 && <Text style={[styles.helper, { textAlign: 'center' }]}>Use city, category or search to explore all {filtered.length} matching places.</Text>}
        </View>}
        {liveStatus === 'ready' && nextPageToken && <Button label="Show more local places" variant="secondary" icon="add-circle-outline" onPress={() => void runLiveSearch(true)}/>}
        {!filtered.length && <View style={[shared.card, { alignItems: 'center', gap: 10 }]}>
          <PremiumIcon name="search" tone="ruby" size={54} iconSize={25}/>
          <Text style={styles.cardTitle}>No place found</Text>
          <Text style={[styles.helper, { textAlign: 'center' }]}>Try a city, restaurant, café, park, tourist place, lounge or activity keyword.</Text>
        </View>}
        </>}
        {section === 'packages' && <>
        <View style={coachStyles.boundaryCard}>
          <PremiumIcon name="sparkles" tone="gold" size={44} iconSize={19}/>
          <View style={{ flex: 1 }}><Text style={styles.cardTitle}>Curated date packages</Text><Text style={styles.helper}>Pick a low-pressure café, an activity, dinner or a premium hosted experience. Every package includes a public-place safety plan.</Text></View>
        </View>
        <View style={{ gap: 12 }}>
          <View style={shared.row}>
            <Text style={styles.sectionLabel}>DATE PACKAGES</Text>
            <View style={shared.spacer}/>
            <Pressable onPress={() => onOpenDatePlan()}><Text style={coachStyles.inlineLink}>Open concierge</Text></Pressable>
          </View>
          {datePackages.map(item => <DatePackageCard key={item.id} item={item} onPlan={() => onOpenDatePlan()}/>)}
        </View>
        <ReservationOpsCard />
        <Button label="Open Date Concierge" icon="calendar" onPress={() => onOpenDatePlan()}/>
        </>}
        {section === 'events' && <>
        <View style={coachStyles.boundaryCard}>
          <PremiumIcon name="people" tone="ruby" size={44} iconSize={19}/>
          <View style={{ flex: 1 }}><Text style={styles.cardTitle}>{mode === 'couple' ? 'Do something memorable together' : 'Meet through shared culture and intent'}</Text><Text style={styles.helper}>{mode === 'couple' ? 'Hosted classes, culture nights and easy-to-book experiences designed for two.' : 'Verified mixers, video speed dates, community nights and small hosted dinners for serious singles.'}</Text></View>
        </View>
        <View style={{ gap: 12 }}>
          <Text style={styles.sectionLabel}>{mode === 'couple' ? 'COUPLE EXPERIENCES · CLASSES · CULTURE NIGHTS' : 'INDIAN MIXERS · VIDEO SPEED DATES · PREMIUM DINNERS'}</Text>
          {visibleExperiences.map((event, index) => <View key={event.title} style={coachStyles.eventCard}>
            <PremiumIcon name={(index === 0 ? 'cafe' : index === 1 ? 'musical-notes' : index === 4 ? 'videocam' : index >= 6 ? 'restaurant' : 'heart') as keyof typeof Ionicons.glyphMap} tone={index % 2 ? 'gold' : 'ruby'} size={50} iconSize={23}/>
            <View style={{ flex: 1 }}>
              <View style={shared.row}>
                <Text style={styles.cardTitle}>{event.title}</Text>
                <View style={shared.spacer}/>
                <View style={coachStyles.eventType}><Text style={coachStyles.eventTypeText}>{event.type}</Text></View>
              </View>
              <Text style={coachStyles.eventMeta}>{event.city} · {event.date}</Text>
              <Text style={styles.helper}>{event.body}</Text>
              <View style={coachStyles.eventFooter}>
                <View style={coachStyles.eventTag}><PremiumIcon name="shield-checkmark" tone="gold" size={24} iconSize={11}/><Text style={coachStyles.eventTagText}>{event.tag}</Text></View>
                <Pressable onPress={() => rsvp(event)} style={coachStyles.rsvpButton}><Text style={coachStyles.rsvpText}>Details & RSVP</Text></Pressable>
              </View>
            </View>
          </View>)}
        </View>
        </>}
        <Text style={styles.legal}>Availability and hours can change. Confirm details before you travel, and meet in public.</Text>
      </ScrollView>
      <PlaceDetailModal place={selected} distance={selected ? getDistance(selected) : undefined} saved={!!selected && saved.includes(selected.id)} onClose={() => setSelected(null)} onSave={() => selected && toggleSaved(selected.id)} onPlan={() => { if (selected)
        onOpenDatePlan(selected); }}/>
      <EventRsvpSheet event={rsvpEvent} onClose={() => setRsvpEvent(null)} onPlan={() => { setRsvpEvent(null); onOpenDatePlan(); }}/>
      <PartnerInterestSheet visible={partnerOpen} request={partnerRequest} onChange={updatePartnerRequest} onClose={() => setPartnerOpen(false)} onSubmit={submitPartnerRequest}/>
      <MarketplaceCheckoutSheet bundle={bundleCheckout} onClose={() => setBundleCheckout(null)}/>
      <BottomNav active="events" mode={mode} onOpenTool={onOpenTool} navigate={navigate} light referenceIcons/>
    </SafeAreaView>
  </LinearGradient>;
}
function CouplesPlanBuilder({ city, radius, onCityChange, onRadiusChange, onExplore, onBook }: {
    city: string;
    radius: number;
    onCityChange: (city: string) => void;
    onRadiusChange: (radius: number) => void;
    onExplore: () => void;
    onBook: (bundle: CoupleBundle) => void;
}) {
    const [mood, setMood] = useState('Cozy');
    const [budget, setBudget] = useState('Under $100');
    const [ready, setReady] = useState(false);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    const moods = ['Cozy', 'Playful', 'Romantic', 'Luxury'];
    const budgets = ['Under $100', '$100–$400', '$400–$900', 'Luxury'];
    const bundleIndex = Math.max(0, budgets.indexOf(budget));
    const baseBundle = coupleBundles[bundleIndex] ?? coupleBundles[0]!;
    const bundle: {
        id: string;
        title: string;
        city: string;
        price: string;
        priceCents: number;
        duration: string;
        mood: string;
        icon: keyof typeof Ionicons.glyphMap;
        includes: string[];
        flexibility: string;
        safety: string;
    } = { ...baseBundle, city: city.trim() || baseBundle.city, mood };
    const cityMatches = citySuggestions.filter(option => !city.trim() || option.toLowerCase().includes(city.trim().toLowerCase())).slice(0, 6);
    return <View style={couplesMarketStyles.builder}>
    <View style={shared.row}><PremiumIcon name="sparkles" tone="gold" size={52} iconSize={24}/><View style={{ flex: 1, marginLeft: 10 }}><Text style={styles.kicker}>DESTINYONE COMPLETE PLAN</Text><Text style={styles.cardTitle}>One booking. Your whole date.</Text><Text style={styles.helper}>Stay, dining, experiences, surprises and arrival details in one itinerary.</Text></View></View>
    <View style={{ gap: 8 }}><View style={selectorStyles.searchBox}><MiniPremiumIcon name="location" tone="rose" size={32} iconSize={15}/><TextInput accessibilityLabel="Date plan city or postal code" value={city} onFocus={() => setShowCitySuggestions(true)} onChangeText={(value) => { onCityChange(value); setShowCitySuggestions(true); setReady(false); }} placeholder="Any USA or Canada city / postal code" placeholderTextColor="#71626A" style={selectorStyles.searchInput}/>{!!city && <Pressable accessibilityRole="button" accessibilityLabel="Clear marketplace city" hitSlop={accessibilityHitSlop} onPress={() => { onCityChange(''); setShowCitySuggestions(true); setReady(false); }}><MiniPremiumIcon name="close-circle" tone="dark" size={30} iconSize={14}/></Pressable>}</View>{showCitySuggestions && <View style={selectorStyles.suggestionPanel}>{cityMatches.length ? cityMatches.map(option => <Pressable accessibilityRole="button" accessibilityLabel={`Use ${option}`} hitSlop={accessibilityHitSlop} key={option} onPress={() => { onCityChange(option); setShowCitySuggestions(false); setReady(false); }} style={selectorStyles.suggestionRow}><MiniPremiumIcon name="location-outline" tone={option === city ? 'gold' : 'rose'} size={26} iconSize={12}/><Text style={selectorStyles.suggestionText}>{option}</Text>{option === city && <MiniPremiumIcon name="checkmark-circle" tone="gold" size={24} iconSize={11}/>}</Pressable>) : <View style={selectorStyles.suggestionRow}><Text style={selectorStyles.suggestionText}>Choose a suggested USA or Canada city for accurate radius results.</Text></View>}</View>}</View>
    <View style={{ gap: 8 }}><View style={shared.row}><Text style={styles.sectionLabel}>NEARBY RANGE</Text><View style={shared.spacer}/><Text style={coachStyles.resultCount}>from {city || 'your city'}</Text></View><View style={couplesMarketStyles.choiceRow}>{[25, 50, 100].map(option => <Pressable accessibilityRole="button" accessibilityLabel={`${option} mile radius`} key={option} onPress={() => { onRadiusChange(option); setReady(false); }} style={[couplesMarketStyles.choice, radius === option && couplesMarketStyles.choiceOn]}><Text style={[couplesMarketStyles.choiceText, radius === option && { color: colors.ivory }]}>{option} miles</Text></Pressable>)}</View></View>
    <View style={{ gap: 8 }}><Text style={styles.sectionLabel}>MOOD</Text><View style={couplesMarketStyles.choiceRow}>{moods.map(option => <Pressable key={option} onPress={() => { setMood(option); setReady(false); }} style={[couplesMarketStyles.choice, mood === option && couplesMarketStyles.choiceOn]}><Text style={[couplesMarketStyles.choiceText, mood === option && { color: colors.ivory }]}>{option}</Text></Pressable>)}</View></View>
    <View style={{ gap: 8 }}><Text style={styles.sectionLabel}>TOTAL BUDGET</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{budgets.map(option => <Pressable key={option} onPress={() => { setBudget(option); setReady(false); }} style={[couplesMarketStyles.budget, budget === option && couplesMarketStyles.budgetOn]}><Text style={[couplesMarketStyles.choiceText, budget === option && { color: colors.ivory }]}>{option}</Text></Pressable>)}</ScrollView></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>{marketplaceBookingTypes.map(item => <View key={item.title} style={couplesMarketStyles.bookingType}><MiniPremiumIcon name={item.icon} tone={item.tone} size={32} iconSize={15}/><Text style={couplesMarketStyles.bookingTypeTitle}>{item.title}</Text><Text style={couplesMarketStyles.bookingTypeBody}>{item.body}</Text></View>)}</ScrollView>
    {!ready ? <View style={{ gap: 9 }}><Button label={`Show best within ${radius} miles`} icon="location" variant="secondary" onPress={() => { setShowCitySuggestions(false); onExplore(); }}/><Button label="Build complete itinerary" icon="sparkles" onPress={() => { setShowCitySuggestions(false); setReady(true); }}/></View> : <View style={couplesMarketStyles.generated}>
      <View style={shared.row}><PremiumIcon name={bundle.icon} tone={bundle.mood === 'Luxury' ? 'gold' : 'ruby'} size={48} iconSize={22}/><View style={{ flex: 1, marginLeft: 9 }}><Text style={styles.cardTitle}>{bundle.title}</Text><Text style={coachStyles.eventMeta}>{bundle.city} · {bundle.duration} · {bundle.price}</Text></View><MiniPremiumIcon name="checkmark-circle" tone="gold" size={34} iconSize={16}/></View>
      <View style={couplesMarketStyles.itinerary}>{bundle.includes.map((item, index) => <View key={item} style={couplesMarketStyles.itineraryRow}><View style={couplesMarketStyles.stepNumber}><Text style={couplesMarketStyles.stepNumberText}>{index + 1}</Text></View><Text style={couplesMarketStyles.itineraryText}>{item}</Text></View>)}</View>
      <View style={couplesMarketStyles.policyRow}><MiniPremiumIcon name="refresh-circle" tone="gold" size={28} iconSize={13}/><Text style={couplesMarketStyles.policyText}>{bundle.flexibility}</Text></View>
      <View style={couplesMarketStyles.policyRow}><MiniPremiumIcon name="shield-checkmark" tone="rose" size={28} iconSize={13}/><Text style={couplesMarketStyles.policyText}>{bundle.safety}</Text></View>
      <Button label="Reserve complete plan" icon="wallet" variant="gold" onPress={() => onBook(bundle)}/>
      <Pressable onPress={() => setReady(false)} style={couplesMarketStyles.startOver}><Text style={couplesMarketStyles.startOverText}>Change plan</Text></Pressable>
    </View>}
  </View>;
}
function MarketplaceCheckoutSheet({ bundle, onClose }: {
    bundle: CoupleBundle | null;
    onClose: () => void;
}) {
    const [payment, setPayment] = useState('Card');
    const [status, setStatus] = useState<MarketplaceBookingStatus>('quote_ready');
    const [cancelled, setCancelled] = useState(false);
    useEffect(() => { setStatus('quote_ready'); setCancelled(false); setPayment('Card'); }, [bundle?.id, bundle?.city]);
    if (!bundle)
        return null;
    const confirmation = `DO-${bundle.id.toUpperCase().slice(0, 6)}-2026`;
    const confirmed = status === 'confirmed';
    const timeline = buildMarketplaceBookingTimeline(status);
    const advance = () => setStatus(current => current === 'quote_ready' ? 'awaiting_match_acceptance' : current === 'awaiting_match_acceptance' ? 'awaiting_payment' : current === 'awaiting_payment' ? 'provider_confirming' : 'confirmed');
    const actionLabel = status === 'quote_ready' ? 'Share plan for acceptance' : status === 'awaiting_match_acceptance' ? 'Preview both accepted' : status === 'awaiting_payment' ? `Prepare ${payment} securely` : status === 'provider_confirming' ? 'Preview provider confirmation' : 'Manage booking';
    const refund = calculateMarketplaceRefund({ amountCents: bundle.priceCents, cancellationCutoffAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), cancelledAt: new Date().toISOString() });
    return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={chatStyles.sheet}><SheetHeader title={cancelled ? 'Booking cancelled' : confirmed ? 'Itinerary reserved' : 'Complete your booking'} subtitle={`${bundle.city} · ${bundle.duration}`} onClose={onClose}/><ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
    <View style={couplesMarketStyles.checkoutHero}><PremiumIcon name={cancelled ? 'refresh-circle' : confirmed ? 'checkmark-circle' : 'wallet'} tone="gold" size={56} iconSize={26}/><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{cancelled ? 'Cancellation complete' : confirmed ? 'Your complete plan is ready' : bundle.title}</Text><Text style={styles.helper}>{cancelled ? `${formatUsdFromCents(refund.amountCents)} preview refund · no real charge made` : confirmed ? `Confirmation ${confirmation}` : 'One checkout and one support contact for the full itinerary.'}</Text></View></View>
    <View style={coachStyles.detailRows}><DetailRow icon="location-outline" label="Destination" value={bundle.city}/><DetailRow icon="time-outline" label="Duration" value={bundle.duration}/><DetailRow icon="receipt-outline" label="Estimated total" value={bundle.price}/><DetailRow icon="refresh-circle-outline" label="Changes" value={bundle.flexibility}/></View>
    {!cancelled && <View style={coachStyles.marketPillarGrid}>{timeline.map(item => { const current = item.status === status; const complete = timeline.findIndex(step => step.status === item.status) < timeline.findIndex(step => step.status === status) || confirmed; return <View key={item.status} style={[coachStyles.marketPillar, (current || complete) && coachStyles.marketPillarOn]}><MiniPremiumIcon name={complete ? 'checkmark-circle' : current ? 'radio-button-on' : 'ellipse-outline'} tone={complete ? 'gold' : current ? 'rose' : 'dark'} size={24} iconSize={11}/><View style={{ flex: 1 }}><Text style={coachStyles.marketPillarTitle}>{item.title}</Text><Text style={coachStyles.marketPillarBody}>{item.body}</Text></View></View>; })}</View>}
    <View style={couplesMarketStyles.checkoutItems}>{bundle.includes.map((item, index) => <View key={item} style={couplesMarketStyles.checkoutItem}><MiniPremiumIcon name={index === 0 ? 'bed' : index === 1 ? 'restaurant' : index === 2 ? 'ticket' : 'sparkles'} tone={index % 2 ? 'ruby' : 'gold'} size={32} iconSize={15}/><View style={{ flex: 1 }}><Text style={couplesMarketStyles.checkoutItemTitle}>{item}</Text><Text style={couplesMarketStyles.checkoutItemMeta}>{cancelled ? 'Released in preview' : confirmed ? 'Grouped under one confirmation' : 'Freshness rechecked before payment'}</Text></View>{confirmed && !cancelled && <MiniPremiumIcon name="checkmark-circle" tone="gold" size={26} iconSize={12}/>}</View>)}</View>
    {!confirmed && !cancelled && status === 'awaiting_payment' && <><Text style={styles.sectionLabel}>PAYMENT</Text><View style={couplesMarketStyles.paymentRow}>{['Card', 'Apple Pay', 'Google Pay'].map(option => <Pressable key={option} onPress={() => setPayment(option)} style={[couplesMarketStyles.paymentChoice, payment === option && couplesMarketStyles.paymentChoiceOn]}><MiniPremiumIcon name={option === 'Card' ? 'card' : option === 'Apple Pay' ? 'logo-apple' : 'logo-google'} tone={payment === option ? 'gold' : 'dark'} size={28} iconSize={13}/><Text style={[couplesMarketStyles.paymentText, payment === option && { color: colors.ivory }]}>{option}</Text></Pressable>)}</View></>}
    {!confirmed && !cancelled && <><View style={couplesMarketStyles.totalRow}><Text style={styles.cardTitle}>Estimated total</Text><Text style={couplesMarketStyles.totalPrice}>{bundle.price}</Text></View><Button label={actionLabel} icon={status === 'quote_ready' ? 'share-outline' : status === 'awaiting_match_acceptance' ? 'people' : status === 'awaiting_payment' ? 'lock-closed' : 'business'} onPress={advance}/></>}
    {confirmed && !cancelled && <><View style={coachStyles.savedNote}><MiniPremiumIcon name="shield-checkmark" tone="gold" size={28} iconSize={13}/><Text style={coachStyles.savedNoteText}>Receipt, provider confirmation, change policy and one support contact stay with this itinerary.</Text></View><Button label="Request cancellation" icon="refresh-circle" variant="secondary" onPress={() => setCancelled(true)}/><Button label="Done" icon="checkmark" onPress={onClose}/></>}
    {cancelled && <><View style={coachStyles.savedNote}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={28} iconSize={13}/><Text style={coachStyles.savedNoteText}>{refund.reason} Production waits for the payment webhook before showing refund complete.</Text></View><Button label="Done" icon="checkmark" onPress={onClose}/></>}
    <Text style={styles.legal}>Preview mode does not charge a card or reserve live inventory. Production booking activates only after provider contracts, server-side price checks, payment webhooks and cancellation support are connected.</Text>
  </ScrollView></SafeAreaView></Modal>;
}
function MarketToggle({ icon, label, active, onPress }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    active: boolean;
    onPress: () => void;
}) {
    return <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: active }} hitSlop={accessibilityHitSlop} onPress={onPress} style={[coachStyles.marketToggle, active && coachStyles.marketToggleOn]}>
    <MiniPremiumIcon name={icon} tone={active ? 'gold' : 'rose'} size={30} iconSize={14}/>
    <Text style={[coachStyles.marketToggleText, active && { color: colors.ivory }]}>{label}</Text>
  </Pressable>;
}
function DatePackageCard({ item, onPlan }: {
    item: DatePackage;
    onPlan: () => void;
}) {
    return <View style={coachStyles.packageCard}>
    <PremiumIcon name={item.icon} tone={item.tier.includes('Executive') ? 'gold' : 'ruby'} size={54} iconSize={25}/>
    <View style={{ flex: 1 }}>
      <View style={shared.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={coachStyles.eventMeta}>{item.city} · {item.duration}</Text>
        </View>
        <View style={coachStyles.packageTier}><Text style={coachStyles.packageTierText}>{item.tier}</Text></View>
      </View>
      <Text style={styles.helper}>{item.includes.join(' · ')}</Text>
      <View style={coachStyles.eventFooter}>
        <View style={coachStyles.eventTag}><PremiumIcon name="shield-checkmark" tone="gold" size={24} iconSize={11}/><Text style={coachStyles.eventTagText}>{item.safety}</Text></View>
      </View>
      <View style={coachStyles.packageFooter}>
        <Text style={coachStyles.packagePrice}>{item.price}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Plan ${item.title}`} hitSlop={accessibilityHitSlop} onPress={onPlan} style={coachStyles.rsvpButton}><Text style={coachStyles.rsvpText}>Plan package</Text></Pressable>
      </View>
    </View>
  </View>;
}
function TonightSafePicks({ places, getDistance, onDetail, onPlan }: {
    places: PlaceItem[];
    getDistance: (place: PlaceItem) => number;
    onDetail: (place: PlaceItem) => void;
    onPlan: (place?: PlaceItem) => void;
}) {
    return <View style={coachStyles.tonightPanel}>
    <View style={shared.row}>
      <PremiumIcon name="moon-outline" tone="ruby" size={46} iconSize={21}/>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.cardTitle}>Tonight-safe picks</Text>
        <Text style={styles.helper}>Quick public/reservable ideas for members who want a simple plan without endless scrolling.</Text>
      </View>
    </View>
    <View style={coachStyles.tonightGrid}>
      {places.map(place => <Pressable accessibilityRole="button" accessibilityLabel={`View ${place.name}`} hitSlop={accessibilityHitSlop} key={place.id} onPress={() => onDetail(place)} style={coachStyles.tonightCard}>
        <Image source={{ uri: placePhoto(place) }} style={couplesMarketStyles.tonightImage}/>
        <View style={{ flex: 1 }}>
          <Text style={coachStyles.tonightTitle}>{place.name}</Text>
          <Text style={coachStyles.tonightBody}>{Number.isFinite(getDistance(place)) ? `${Math.round(getDistance(place))} mi` : 'Local pick'} · {place.bestTime}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Plan ${place.name}`} hitSlop={accessibilityHitSlop} onPress={() => onPlan(place)} style={coachStyles.tonightPlan}><Text style={coachStyles.tonightPlanText}>Plan</Text></Pressable>
      </Pressable>)}
    </View>
  </View>;
}
function ReservationOpsCard() {
    return <View style={coachStyles.opsCard}>
    <View style={shared.row}>
      <PremiumIcon name="git-branch-outline" tone="gold" size={46} iconSize={21}/>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.cardTitle}>Reservation + safety operating model</Text>
        <Text style={styles.helper}>This is the logic a real billion-dollar marketplace needs before live bookings.</Text>
      </View>
    </View>
    <View style={coachStyles.opsGrid}>{reservationOps.map(item => <View key={item.title} style={coachStyles.opsItem}>
      <MiniPremiumIcon name={item.icon} tone="rose" size={32} iconSize={15}/>
      <Text style={coachStyles.opsTitle}>{item.title}</Text>
      <Text style={coachStyles.opsBody}>{item.body}</Text>
    </View>)}</View>
    <View style={coachStyles.checklistWrap}>{safeDateChecklist.map(item => <View key={item} style={coachStyles.safeCheckItem}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={22} iconSize={10}/><Text style={coachStyles.safeCheckText}>{item}</Text></View>)}</View>
  </View>;
}
function PartnerInterestSheet({ visible, request, onChange, onClose, onSubmit }: {
    visible: boolean;
    request: PartnerRequest;
    onChange: (key: keyof PartnerRequest, value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}) {
    return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={chatStyles.modalBackdrop} onPress={onClose}/>
    <SafeAreaView style={chatStyles.sheet}>
      <SheetHeader title="Add restaurant/café partner" subtitle="Preview partner intake" onClose={onClose}/>
      <View style={coachStyles.partnerIntakeHero}>
        <PremiumIcon name="storefront-outline" tone="gold" size={54} iconSize={25}/>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Partner package review</Text>
          <Text style={styles.helper}>Production will send this to a CRM or partner table with safety, reservation and support checks.</Text>
        </View>
      </View>
      <Field label="Venue name" value={request.venue} onChangeText={(text: string) => onChange('venue', text)} placeholder="Example: Saffron Lounge"/>
      <Field label="City" value={request.city} onChangeText={(text: string) => onChange('city', text)} placeholder="New York, NY"/>
      <Field label="Partner contact" value={request.contact} onChangeText={(text: string) => onChange('contact', text)} placeholder="manager@venue.com"/>
      <View style={{ gap: 8 }}>
        <Text style={styles.sectionLabel}>PACKAGE FIT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {datePackages.map(item => <Pressable key={item.id} onPress={() => onChange('packageTitle', item.title)} style={[coachStyles.partnerPackageChip, request.packageTitle === item.title && coachStyles.partnerPackageChipOn]}><Text style={[coachStyles.partnerPackageText, request.packageTitle === item.title && { color: colors.ivory }]}>{item.title}</Text></Pressable>)}
        </ScrollView>
      </View>
      <Button label="Queue partner review" icon="checkmark-circle" onPress={onSubmit}/>
      <Button label="Cancel" variant="secondary" onPress={onClose}/>
      <Text style={styles.legal}>Preview only. Live partner onboarding needs contracts, payment terms, refund policy, safety SLA and provider webhooks.</Text>
    </SafeAreaView>
  </Modal>;
}
function EventRsvpSheet({ event, onClose, onPlan }: {
    event: typeof eventExperiences[number] | null;
    onClose: () => void;
    onPlan: () => void;
}) {
    const [saved, setSaved] = useState(false);
    useEffect(() => setSaved(false), [event?.title]);
    if (!event)
        return null;
    const groupSize = event.type === 'Online' ? 'Private 1:1 rounds' : event.type === 'Private dinner' || event.type === 'Invite only' ? '8–12 approved guests' : 'Small hosted groups';
    return <Modal visible transparent animationType="slide" onRequestClose={onClose}><Pressable style={chatStyles.modalBackdrop} onPress={onClose}/><SafeAreaView style={chatStyles.sheet}><SheetHeader title="Event details & RSVP" subtitle={`${event.city} · ${event.date}`} onClose={onClose}/><ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 8 }} showsVerticalScrollIndicator={false}><View style={coachStyles.rsvpConfirm}><PremiumIcon name="ticket" tone="gold" size={58} iconSize={27}/><View style={{ flex: 1 }}><Text style={styles.cardTitle}>{event.title}</Text><Text style={styles.helper}>{event.body}</Text></View></View><View style={coachStyles.detailRows}><DetailRow icon="location-outline" label="Location" value={event.city}/><DetailRow icon="calendar-outline" label="Schedule" value={event.date}/><DetailRow icon="people-outline" label="Group format" value={groupSize}/><DetailRow icon="shield-checkmark-outline" label="Entry standard" value={event.tag}/></View><View style={coachStyles.opsGrid}><View style={coachStyles.opsItem}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={30} iconSize={14}/><Text style={coachStyles.opsTitle}>Verified arrival</Text><Text style={coachStyles.opsBody}>Host check-in and clear community expectations before introductions begin.</Text></View><View style={coachStyles.opsItem}><MiniPremiumIcon name="chatbubbles" tone="rose" size={30} iconSize={14}/><Text style={coachStyles.opsTitle}>Guided connection</Text><Text style={coachStyles.opsBody}>Conversation prompts and small groups keep the experience warm, not awkward.</Text></View><View style={coachStyles.opsItem}><MiniPremiumIcon name="lock-closed" tone="gold" size={30} iconSize={14}/><Text style={coachStyles.opsTitle}>Private follow-up</Text><Text style={coachStyles.opsBody}>Contact details stay hidden; mutual interest can unlock an in-app chat afterward.</Text></View></View>{saved && <View style={coachStyles.savedNote}><MiniPremiumIcon name="checkmark-circle" tone="gold" size={28} iconSize={13}/><Text style={coachStyles.savedNoteText}>RSVP saved for this preview. Live ticket confirmation and reminders connect with the backend later.</Text></View>}<Button label={saved ? 'RSVP saved' : 'Save RSVP'} icon={saved ? 'checkmark-circle' : 'ticket-outline'} onPress={() => setSaved(true)}/><Button label="Plan a date around this" icon="calendar" variant="gold" onPress={onPlan}/><Button label="Done" variant="secondary" onPress={onClose}/><Text style={styles.legal}>Event inventory is preview data. Production will connect tickets, capacity, payment and ID-verified check-in.</Text></ScrollView></SafeAreaView></Modal>;
}
function placeKindIcon(kind: PlaceKind): keyof typeof Ionicons.glyphMap {
    return kind === 'Restaurant' ? 'restaurant' : kind === 'Cafe' ? 'cafe' : kind === 'Hotel' ? 'bed' : kind === 'Wellness' ? 'flower' : kind === 'Tourist' ? 'camera' : kind === 'Activity' ? 'bicycle' : kind === 'Park' ? 'leaf' : kind === 'Dessert' ? 'ice-cream' : kind === 'Lounge' ? 'wine' : kind === 'Cultural' ? 'color-palette' : 'location';
}
function PlaceCard({ place, distance, saved, compact, onSave, onDetail, onPlan }: {
    place: PlaceItem;
    distance?: number;
    saved: boolean;
    compact?: boolean;
    onSave: () => void;
    onDetail: () => void;
    onPlan: () => void;
}) {
    const labels = [
        isSafeFirstDatePlace(place) ? 'Safe first date' : null,
        isReservablePlace(place) ? 'Reservable' : null,
        isCommunityPlace(place) ? 'Community-friendly' : null,
        isPremiumPlace(place) ? 'Premium' : null,
    ].filter(Boolean) as string[];
    return <View style={[coachStyles.placeCard, compact && coachStyles.placeCardCompact]}>
    <View style={[couplesMarketStyles.placePhotoWrap, compact && couplesMarketStyles.placePhotoCompact]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${place.name}`} onPress={onDetail} style={StyleSheet.absoluteFill}>
        <Image source={{ uri: placePhoto(place) }} style={couplesMarketStyles.placePhoto}/>
        <LinearGradient colors={['transparent', 'rgba(12,2,5,.88)']} style={StyleSheet.absoluteFill}/>
        <View style={couplesMarketStyles.photoBadges}><View style={couplesMarketStyles.distanceBadge}><MiniPremiumIcon name={placeKindIcon(place.kind)} tone="gold" size={24} iconSize={11}/><Text style={couplesMarketStyles.distanceText}>{Number.isFinite(distance) ? `${Math.round(distance ?? 0)} mi` : 'Local'}</Text></View><View style={couplesMarketStyles.priceBadge}><Text style={couplesMarketStyles.priceBadgeText}>{place.price}</Text></View></View>
        <View style={couplesMarketStyles.photoTitle}><Text style={couplesMarketStyles.photoKind}>{place.kind.toUpperCase()}</Text><Text style={couplesMarketStyles.photoName}>{place.name}</Text><Text style={couplesMarketStyles.photoMeta}>{place.area} · {place.city}</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={saved ? `Unsave ${place.name}` : `Save ${place.name}`} hitSlop={accessibilityHitSlop} onPress={onSave} style={couplesMarketStyles.photoSave}><PremiumIcon name={saved ? 'bookmark' : 'bookmark-outline'} tone={saved ? 'gold' : 'dark'} size={36} iconSize={16}/></Pressable>
    </View>
    <View style={couplesMarketStyles.placeContent}>
      {(place.recommendationReason || place.matchScore) && <View style={marketplaceBrandStyles.reasonRow}><MiniPremiumIcon name="sparkles" tone="gold" size={25} iconSize={11}/><Text style={marketplaceBrandStyles.reasonText}>{place.recommendationReason ?? 'Recommended from your city, preferences and date-safety settings'}</Text>{place.matchScore && <Text style={marketplaceBrandStyles.scoreText}>{place.matchScore}% fit</Text>}</View>}
      <View style={shared.row}><Text style={[styles.cardTitle, { flex: 1 }]}>{place.vibe}</Text>{place.rating !== undefined && <Text style={coachStyles.resultCount}>{place.rating.toFixed(1)} / 5</Text>}</View>
      <View style={coachStyles.placeLabelRow}>{labels.slice(0, compact ? 2 : 4).map(label => <View key={label} style={coachStyles.placeLabel}><Text style={coachStyles.placeLabelText}>{label}</Text></View>)}</View>
      <View style={coachStyles.eventFooter}>
        <View style={coachStyles.eventTag}><PremiumIcon name="time-outline" tone="gold" size={24} iconSize={11}/><Text style={coachStyles.eventTagText}>{place.bestTime}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Details for ${place.name}`} hitSlop={accessibilityHitSlop} onPress={onDetail} style={coachStyles.detailsButton}><Text style={coachStyles.detailsText}>Details</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Plan ${place.name}`} hitSlop={accessibilityHitSlop} onPress={onPlan} style={coachStyles.rsvpButton}><Text style={coachStyles.rsvpText}>{place.bookable ? 'Reserve' : 'Plan'}</Text></Pressable>
      </View>
    </View>
  </View>;
}
function PlaceDetailModal({ place, distance, saved, onClose, onSave, onPlan }: {
    place: PlaceItem | null;
    distance?: number;
    saved: boolean;
    onClose: () => void;
    onSave: () => void;
    onPlan: () => void;
}) {
    if (!place)
        return null;
    return <Modal visible transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={chatStyles.modalBackdrop} onPress={onClose}/>
    <SafeAreaView style={chatStyles.sheet}>
      <SheetHeader title={place.name} subtitle={`${place.city} · ${place.kind}`} onClose={onClose}/>
      <View style={couplesMarketStyles.detailPhotoWrap}><Image source={{ uri: placePhoto(place) }} style={couplesMarketStyles.detailPhoto}/><LinearGradient colors={['transparent', 'rgba(12,2,5,.92)']} style={StyleSheet.absoluteFill}/><View style={couplesMarketStyles.detailPhotoCopy}><Text style={couplesMarketStyles.photoKind}>{place.kind.toUpperCase()} · {Number.isFinite(distance) ? `${Math.round(distance ?? 0)} MILES AWAY` : 'NEARBY'}</Text><Text style={couplesMarketStyles.detailPhotoTitle}>{place.vibe}</Text></View></View>
      <View style={coachStyles.detailRows}>
        <DetailRow icon="cash-outline" label="Budget" value={place.price}/>
        <DetailRow icon="time-outline" label="Best time" value={place.bestTime}/>
        <DetailRow icon="shield-checkmark-outline" label="Safety note" value={place.safety}/>
        <DetailRow icon="restaurant-outline" label="Booking status" value={isReservablePlace(place) ? 'DestinyOne partner inventory is available for this venue.' : 'Add it to your plan; live partner booking is not offered for this venue yet.'}/>
        <DetailRow icon="calendar-outline" label="Availability" value={place.source === 'live' ? (place.openNow === true ? 'Open now; confirm table or entry before you leave.' : place.openNow === false ? 'Currently closed; check the next opening time.' : 'Check current hours before you leave.') : 'Curated plan idea; confirm current hours and availability.'}/>
      </View>
      <View style={styles.chipRow}>{place.tags.map(tag => <Chip key={tag} label={tag}/>)}</View>
      <View style={{ gap: 10 }}><Button label={saved ? 'Saved idea' : 'Save idea'} icon={saved ? 'bookmark' : 'bookmark-outline'} variant="secondary" onPress={onSave}/>{place.mapsUrl && <Button label="Open directions" icon="navigate-outline" variant="gold" onPress={() => void Linking.openURL(place.mapsUrl!)}/>}<Button label={place.bookable ? 'Reserve this date' : 'Plan this date'} icon="calendar" onPress={onPlan}/></View>
      <Text style={styles.legal}>{place.bookable ? 'Final price, cancellation terms and payment must be shown before confirmation.' : 'This is a planning suggestion, not a reservation. Confirm hours and booking availability directly before travelling.'}</Text>
    </SafeAreaView>
  </Modal>;
}
function DetailRow({ icon, label, value }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
}) { return <View style={coachStyles.detailRow}><PremiumIcon name={icon} tone="ruby" size={34} iconSize={15}/><View style={{ flex: 1 }}><Text style={coachStyles.detailLabel}>{label}</Text><Text style={coachStyles.detailValue}>{value}</Text></View></View>; }
function EventStat({ value, label }: {
    value: string;
    label: string;
}) { return <View style={coachStyles.eventStat}><Text style={coachStyles.eventStatValue}>{value}</Text><Text style={coachStyles.eventStatLabel}>{label}</Text></View>; }
const accessibilityHitSlop = { top: 12, right: 12, bottom: 12, left: 12 } as const;
