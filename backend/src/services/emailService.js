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
  // Sirf tab console-fallback use karo jab dev mode ho AUR API key set na ho
  if (env.nodeEnv !== "production" && !env.resend.apiKey) {
    console.log(`[DEV EMAIL] OTP for ${toEmail}: ${code}`);
    return { simulated: true };
  }

  // API key set hai (dev ya production, dono mein) — real email bhejo
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

// Support team ko naya paid gift order aane par alert bhejta hai.
// Address email mein nahi jata (wo ops console se dekha jayega) ? privacy ke liye.
async function sendGiftOrderAlertEmail(order, toEmail) {
  const to = toEmail || env.gifts.supportEmail;
  if (!to) {
    // Support email set nahi hai: dev mein log, production mein skip (throw nahi karenge).
    console.warn("[email] GIFTS_SUPPORT_EMAIL not set; skipping gift order alert.");
    return { skipped: true };
  }
  if (env.nodeEnv !== "production" && !env.resend.apiKey) {
    console.log(`[DEV EMAIL] New paid gift order ${order.id} -> support@${to}`);
    return { simulated: true };
  }
  const amount = `$${(Number(order.total_cents) / 100).toFixed(2)} ${String(order.currency || "").toUpperCase()}`;
  const { data, error } = await getClient().emails.send({
    from: env.resend.fromEmail,
    to,
    subject: `New gift order to deliver: ${order.product_name}`,
    html: `
      <div style="font-family: sans-serif; padding: 24px;">
        <h2 style="color:#B30C3D;">DestinyOne ? New Gift Order</h2>
        <p>A gift order has been paid and is ready for manual delivery.</p>
        <table style="border-collapse: collapse; margin-top: 12px;">
          <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Order ID:</td><td>${order.id}</td></tr>
          <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Product:</td><td>${order.product_name}</td></tr>
          <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Amount:</td><td>${amount}</td></tr>
          <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Status:</td><td>${order.status}</td></tr>
        </table>
        <p style="margin-top: 16px;">Open the Ops Console to see the delivery address and mark delivery status:</p>
        <p><a href="${env.apiUrl}/ops/gifts/console" style="background:#B30C3D;color:white;padding:10px 16px;border-radius:6px;text-decoration:none;">Open Ops Console</a></p>
        <p style="color:#888; font-size: 12px; margin-top: 24px;">The delivery address is not included in this email for privacy; view it inside the console.</p>
      </div>
    `,
  });
  if (error) throw new Error(error.message || "Failed to send gift alert email");
  return data;
}

module.exports = { sendOtpEmail, sendGiftOrderAlertEmail };
