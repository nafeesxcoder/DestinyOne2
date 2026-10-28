const path = require("path");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes"); // Directly import auth routes
const profileRoutes = require("./routes/profileRoutes"); // Directly import profile routes
const matchRoutes = require("./routes/matchRoutes"); // Directly import match routes
const coupleRoutes = require("./routes/coupleRoutes"); // Directly import couple routes
const chatRoutes = require("./routes/chatRoutes"); // Directly import chat routes
const pushRoutes = require("./routes/pushRoutes"); // Directly import push notification routes
const callRoutes = require("./routes/callRoutes"); // Directly import call routes
const giftRoutes = require("./routes/giftRoutes"); // Directly import gift ordering routes
const safetyRoutes = require("./routes/safetyRoutes"); // Directly import safety routes
const giftOpsRoutes = require("./routes/giftOpsRoutes");
const stripeWebhook = require("./controllers/stripeWebhookController");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const { corsOptions, securityHeaders } = require("./config/security");
const app = express();
// The API runs behind nginx, so trust one proxy hop. Without this every
// request looks like it comes from 127.0.0.1 and the rate limiters would
// count all users together.
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(cors(corsOptions));
// Stripe signs the raw request body, so this must be registered BEFORE express.json().
app.post("/webhooks/stripe", express.raw({ type: "application/json", limit: "1mb" }), stripeWebhook.handle);
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For Apple's form_post callback
// Serve uploaded photos (e.g. https://api.destinyone.co/uploads/photos/xyz.jpg)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));
// Mount auth routes under /auth
app.use("/auth", authRoutes);
// Mount profile routes under /profile
app.use("/profile", profileRoutes);
// Mount match routes under /matche
app.use("/matches", matchRoutes);
// Mount couple connection routes under /couple
app.use("/couple", coupleRoutes);
app.use("/chat", chatRoutes);
app.use("/push", pushRoutes);
app.use("/calls", callRoutes);
app.use("/gifts", giftRoutes);
app.use("/ops/gifts", giftOpsRoutes);
app.use("/safety", safetyRoutes);
// If you have other route modules (like gifts, users, etc.), mount them here
// app.use('/gifts', giftRoutes);
// app.use('/users', userRoutes);
// 404 handler
app.use(notFoundHandler);
// Global error handler
app.use(errorHandler);
module.exports = app;
