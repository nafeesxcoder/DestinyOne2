# Screen and preview inventory

The central source of truth is `src/app/navigation/types.ts`. Its automated test requires the exact 36-route inventory below, preventing a screen from disappearing silently during future refactors.

## Top-level destinations

| Route | Experience | Owning module |
| --- | --- | --- |
| `splash` | Branded launch | `features/launch` |
| `welcome` | Product introduction | `features/launch` |
| `auth` | Email/phone and social access presentation | `features/access` |
| `otp` | One-time-code presentation | `features/access` |
| `verify` | Selfie/trust onboarding presentation | `features/access` |
| `modeSelect` | Seeking or Couple Mode selection | `features/onboarding` |
| `coupleSetup` | Partner connection setup | `features/onboarding` |
| `profileSetup` | Profile, photos and voice introduction | `features/onboarding` |
| `vibes` | Values and vibe preferences | `features/onboarding` |
| `intent` | Relationship intent | `features/onboarding` |
| `alignment` | Long-term alignment questions | `features/onboarding` |
| `home` | Daily introductions or Couple Mode home | `features/discovery`, `features/relationship` |
| `explore` | Feature and experience hub | `features/discovery` |
| `circle` | Trusted circle | `features/trust` |
| `discovery` | Discovery filters and pool | `features/discovery` |
| `detail` | Full match profile and intent passport | `features/discovery` |
| `mutual` | Mutual-match celebration | `features/discovery` |
| `icebreaker` | Guided opening prompt | `features/discovery` |
| `chat` | Conversation, media, gifts, dates and relationship tools | `features/chat` |
| `gifts` | Gift catalog and concierge presentation | `features/gifts` |
| `datePlan` | Date-place and package planning | `features/dates` |
| `safety` | Safety center, privacy and account controls | `features/trust` |
| `likes` | Likes and acknowledged matches | `features/discovery` |
| `profile` | Member profile, settings and intent passport | `features/profile` |
| `pricing` | Membership and consumable presentation | `features/pricing` |
| `support` | Support and moderation appeal presentation | `features/support` |
| `coach` | Relationship coaching | `features/relationship` |
| `events` | Curated events marketplace | `features/marketplace` |
| `executive` | Executive-circle experience | `features/executive` |
| `verifyHub` | Verification and trust hub | `features/trust` |
| `readiness` | Relationship readiness | `features/relationship` |
| `community` | City community rooms | `features/community` |
| `blueprint` | Relationship blueprint | `features/relationship` |
| `journey` | Two-person relationship journey | `features/relationship` |
| `dateSafety` | Date-safety concierge | `features/trust` |
| `admin` | Local moderation/operations preview | `features/admin` |

## Deep preview states

These 32 states make otherwise nested sheets, dialogs and lifecycle states directly inspectable by product and QA:

| Area | States |
| --- | --- |
| Profile | `profile-settings`, `profile-referral` |
| Match detail | `match-safety` |
| Chat discovery/tools | `chat-search`, `chat-coach`, `chat-attachments`, `chat-document`, `chat-media`, `chat-voice`, `chat-recording`, `chat-emoji`, `chat-gif`, `chat-games`, `chat-snap`, `chat-face-emoji` |
| Chat gifts | `chat-gift`, `chat-gift-recipient` |
| Chat calling/settings/safety | `chat-audio-call`, `chat-video-call`, `chat-settings`, `chat-options`, `chat-safety`, `chat-relationship-path` |
| Date lifecycle in chat | `chat-date-accepted`, `chat-date-cancelled`, `chat-date-no-show`, `chat-date-unresponsive` |
| Safety center | `safety-plan`, `safety-emergency`, `safety-privacy`, `safety-data`, `safety-delete` |

## Expected route behavior

- The first 11 routes are onboarding destinations and do not show the signed-in bottom navigation.
- `home` changes presentation according to the chosen seeking/couple experience.
- Nested tools preserve a safe back path to their owning destination.
- Preview query parameters are visual-QA helpers, not authentication or authorization.
- A new route is incomplete until its type, route composition, inventory test, documentation and mobile/desktop visual check all exist.
