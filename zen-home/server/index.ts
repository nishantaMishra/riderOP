import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  getRides,
  addRide,
  updateRide,
  deleteRide,
  checkCSVUpdates,
} from "./routes/rides";
import {
  requestOTP,
  verifyOTP,
  verifyToken,
  logoutUser,
  loginWithPassword,
  createAccount,
  updateProfile,
  deleteAccount,
} from "./routes/auth";
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
  startConversation,
} from "./routes/messages";
import { checkWhatsAppAccess, getWhatsAppStatus } from "./routes/whatsapp";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.post("/api/auth/request-otp", requestOTP);
  app.post("/api/auth/verify-otp", verifyOTP);
  app.get("/api/auth/verify", verifyToken);
  app.post("/api/auth/logout", logoutUser);

  // Password-based authentication routes
  app.post("/api/auth/login", loginWithPassword);
  app.post("/api/auth/register", createAccount);
  app.put("/api/auth/profile", updateProfile);
  app.delete("/api/auth/account", deleteAccount);

  // Messaging routes
  app.get("/api/conversations", getUserConversations);
  app.get(
    "/api/conversations/:conversationId/messages",
    getConversationMessages,
  );
  app.post("/api/messages", sendMessage);
  app.post("/api/conversations", startConversation);

  // WhatsApp routes
  app.post("/api/whatsapp/check-access", checkWhatsAppAccess);
  app.get("/api/whatsapp/status", getWhatsAppStatus);

  // Rides API routes
  app.get("/api/rides", getRides);
  app.post("/api/rides", addRide);
  app.put("/api/rides/:rideId", updateRide);
  app.delete("/api/rides/:rideId", deleteRide);
  app.get("/api/rides/check-updates", checkCSVUpdates);

  // 404 handler for unknown API routes. Let non-API requests fall through so
  // Vite can serve the SPA during development.
  app.all("/api*", (_req, res) => {
    res.status(404).json({ error: "Route not found" });
  });

  return app;
}
