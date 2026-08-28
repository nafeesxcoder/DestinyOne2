const twilio = require("twilio");
const env = require("../config/env");

let client = null;
function getClient() {
  if (!env.twilio.accountSid || !env.twilio.authToken) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in .env",
    );
  }
  if (!client) {
    client = twilio(env.twilio.accountSid, env.twilio.authToken);
  }
  return client;
}

async function sendOtpSms(toPhone, code) {
  // Sirf tab console-fallback use karo jab dev mode ho AUR Twilio SID set na ho
  if (env.nodeEnv !== "production" && !env.twilio.accountSid) {
    console.log(`[DEV SMS] OTP for ${toPhone}: ${code}`);
    return { simulated: true };
  }

  // Twilio configured hai (dev ya production, dono mein) — real SMS bhejo
  const result = await getClient().messages.create({
    to: toPhone,
    from: env.twilio.fromNumber,
    body: `Your DestinyOne verification code is ${code}. It expires in ${env.otp.expiresMinutes} minutes.`,
  });
  return { sid: result.sid };
}

module.exports = { sendOtpSms };
