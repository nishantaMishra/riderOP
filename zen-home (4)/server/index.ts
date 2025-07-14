import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getRides, addRide, checkCSVUpdates } from "./routes/rides";
import {
  requestRegistrationOTP,
  verifyRegistrationOTP,
  loginUser,
  requestPasswordResetOTP,
  resetPassword,
  verifyToken,
  logoutUser,
} from "./routes/auth";

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
  app.post("/api/auth/register/request-otp", requestRegistrationOTP);
  app.post("/api/auth/register/verify-otp", verifyRegistrationOTP);
  app.post("/api/auth/login", loginUser);
  app.post("/api/auth/password-reset/request-otp", requestPasswordResetOTP);
  app.post("/api/auth/password-reset/reset", resetPassword);
  app.get("/api/auth/verify", verifyToken);
  app.post("/api/auth/logout", logoutUser);

  // Rides API routes
  app.get("/api/rides", getRides);
  app.post("/api/rides", addRide);
  app.get("/api/rides/check-updates", checkCSVUpdates);

  return app;
}
