# DestinyOne Backend (Express + MySQL)

Phone OTP, Email OTP, and Google / Apple / LinkedIn login — all issuing your own JWT
access + refresh tokens, backed by MySQL.

## 1. Install

```bash
cd backend
npm install
```

## 2. Configure

```bash
cp .env.example .env
```

Fill in:
- `DB_*` — your MySQL connection
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — any long random strings
- `TWILIO_*` — for phone OTP (leave blank in dev; codes print to the server console instead)
- `RESEND_*` — for email OTP (leave blank in dev; codes print to the server console instead)
- `GOOGLE_*`, `APPLE_*`, `LINKEDIN_*` — only the ones you want to enable

## 3. Create the database + tables

```sql
CREATE DATABASE destinyone;
```

```bash
npm run migrate
```

## 4. Run

```bash
npm run dev
```

Server runs at `http://localhost:4000`.

## Endpoints

| Method | Path                     | Purpose                              |
|--------|--------------------------|---------------------------------------|
| POST   | `/auth/otp/request`      | `{ channel: "phone"|"email", identifier }` → sends code |
| POST   | `/auth/otp/verify`       | `{ channel, identifier, code }` → returns user + tokens |
| POST   | `/auth/refresh`          | `{ refreshToken }` → new token pair   |
| POST   | `/auth/logout`           | Requires `Authorization: Bearer <accessToken>` |
| GET    | `/auth/me`               | Requires `Authorization: Bearer <accessToken>` |
| GET    | `/auth/google`           | Redirects to Google consent screen    |
| GET    | `/auth/google/callback`  | Google redirects here automatically   |
| GET    | `/auth/apple`            | Redirects to Apple sign-in            |
| POST   | `/auth/apple/callback`   | Apple redirects here automatically    |
| GET    | `/auth/linkedin`         | Redirects to LinkedIn consent screen  |
| GET    | `/auth/linkedin/callback`| LinkedIn redirects here automatically |

After a successful OAuth login, the server redirects to:
`${APP_URL}/auth/callback#accessToken=...&refreshToken=...`
Your Expo app should catch this deep link and pull the tokens out of the URL fragment.

## Dev mode without Twilio/Resend keys

If `TWILIO_ACCOUNT_SID` or `RESEND_API_KEY` are left blank and `NODE_ENV` is not
`production`, the OTP code is printed to the server console instead of being sent —
useful for testing the flow before wiring up real providers.
