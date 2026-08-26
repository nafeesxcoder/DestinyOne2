const twilio = require("twilio");
const env = require("../config/env");

let client = null;
function getClient() {
  if (!env.twilio.accountSid || !env.twilio.authToken) {
    throw new Error(
      "Twilio is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env",
    );
  }
  if (!client) {
    client = twilio(env.twilio.accountSid, env.twilio.authToken);
  }
  return client;
}

// ✅ Twilio Verify API se OTP bhejo (Trial account mein bhi kaam karta hai)
async function sendOtpSms(toPhone, code) {
  if (env.nodeEnv !== "production" && !env.twilio.verifyServiceSid) {
    console.log(`[DEV SMS] OTP for ${toPhone}: ${code}`);
    return { simulated: true };
  }

  try {
    // Twilio Verify Service mein OTP generate aur send karo (predefined template use hoga)
    const verification = await getClient()
      .verify.v2.services(env.twilio.verifyServiceSid)
      .verifications.create({
        to: toPhone,
        channel: "sms",
      });

    return { sid: verification.sid, status: verification.status };
  } catch (error) {
    console.error("Twilio Verify SMS error:", error.message);
    throw new Error("Failed to send SMS. Please try again.");
  }
}

// ✅ Twilio Verify API se OTP verify karo
async function verifyOtpSms(toPhone, code) {
  try {
    const verificationCheck = await getClient()
      .verify.v2.services(env.twilio.verifyServiceSid)
      .verificationChecks.create({
        to: toPhone,
        code: code,
      });

    return verificationCheck.status === "approved";
  } catch (error) {
    console.error("Twilio Verify check error:", error.message);
    return false;
  }
}

module.exports = { sendOtpSms, verifyOtpSms };
