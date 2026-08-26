const { Resend } = require("resend");
const env = require("../config/env");

let resend = null;
function getClient() {
  if (!env.resend.apiKey) {
    throw new Error("Resend is not configured. Set RESEND_API_KEY in .env");
  }
  if (!resend) {
    resend = new Resend(env.resend.apiKey);
  }
  return resend;
}

async function sendOtpEmail(toEmail, code) {
  // Development mode: sirf console par print karo (email mat bhejo)
  if (env.nodeEnv !== "production") {
    console.log(`[DEV EMAIL] OTP for ${toEmail}: ${code}`);
    return { simulated: true };
  }

  // Production mode: actual email bhejo (domain verified hona chahiye)
  const { data, error } = await getClient().emails.send({
    from: env.resend.fromEmail,
    to: toEmail,
    subject: "Your DestinyOne verification code",
    html: `
      <div style="font-family: sans-serif; padding: 24px;">
        <h2 style="color:#B30C3D;">DestinyOne</h2>
        <p>Your verification code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${code}</p>
        <p>This code expires in ${env.otp.expiresMinutes} minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
  if (error) throw new Error(error.message || "Failed to send email");
  return data;
}

module.exports = { sendOtpEmail };
