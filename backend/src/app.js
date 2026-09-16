const path = require("path");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes"); // Directly import auth routes
const profileRoutes = require("./routes/profileRoutes"); // Directly import profile routes
const matchRoutes = require("./routes/matchRoutes"); // Directly import match routes
const coupleRoutes = require("./routes/coupleRoutes"); // Directly import couple routes
const chatRoutes = require("./routes/chatRoutes"); // Directly import chat routes
const pushRoutes = require("./routes/pushRoutes"); // Directly import push notification routes
const safetyRoutes = require("./routes/safetyRoutes"); // Directly import safety routes
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");
const app = express();
app.use(cors());
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
app.use("/safety", safetyRoutes);
// If you have other route modules (like gifts, users, etc.), mount them here
// app.use('/gifts', giftRoutes);
// app.use('/users', userRoutes);
// 404 handler
app.use(notFoundHandler);
// Global error handler
app.use(errorHandler);
module.exports = app;
