import { RequestHandler } from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

interface User {
  id: string;
  phoneNumber: string;
  name: string;
  password?: string; // hashed password
  createdAt: string;
  isVerified: boolean;
  lastLoginAt?: string;
}

interface AuthSession {
  token: string;
  userId: string;
  expiresAt: string;
}

interface OTPSession {
  phoneNumber: string;
  otp: string;
  name: string;
  expiresAt: string;
  attempts: number;
}

const USERS_FILE_PATH = join(process.cwd(), "users.csv");
const SESSIONS_FILE_PATH = join(process.cwd(), "sessions.csv");
const OTP_FILE_PATH = join(process.cwd(), "otps.csv");

// Helper functions for CSV operations
const parseCSVLine = (line: string): string[] => {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"' && inQuotes) {
      inQuotes = false;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

const escapeCSVField = (field: string): string => {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
};

// File initialization
const initializeFiles = () => {
  // Initialize users.csv
  if (!existsSync(USERS_FILE_PATH)) {
    const header =
      "id,phoneNumber,name,createdAt,isVerified,password,lastLoginAt";
    writeFileSync(USERS_FILE_PATH, header + "\n", "utf8");
  }

  // Initialize sessions.csv
  if (!existsSync(SESSIONS_FILE_PATH)) {
    const header = "token,userId,expiresAt";
    writeFileSync(SESSIONS_FILE_PATH, header + "\n", "utf8");
  }

  // Initialize otps.csv
  if (!existsSync(OTP_FILE_PATH)) {
    const header = "phoneNumber,otp,name,expiresAt,attempts";
    writeFileSync(OTP_FILE_PATH, header + "\n", "utf8");
  }
};

// User management functions
const loadUsers = (): User[] => {
  try {
    const content = readFileSync(USERS_FILE_PATH, "utf8");
    const lines = content.trim().split("\n");
    if (lines.length <= 1) return [];

    const users: User[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      if (values.length >= 5) {
        const user: User = {
          id: values[0],
          phoneNumber: values[1],
          name: values[2],
          createdAt: values[3],
          isVerified: values[4] === "true",
        };

        // Add password if available (index 5)
        if (values.length > 5 && values[5]) {
          user.password = values[5];
        }

        // Add lastLoginAt if available (index 6)
        if (values.length > 6 && values[6]) {
          user.lastLoginAt = values[6];
        }

        users.push(user);
      }
    }
    return users;
  } catch (error) {
    console.error("Error loading users:", error);
    return [];
  }
};

const saveUsers = (users: User[]): void => {
  const header =
    "id,phoneNumber,name,createdAt,isVerified,password,lastLoginAt";
  const rows = users.map((user) =>
    [
      escapeCSVField(user.id),
      escapeCSVField(user.phoneNumber),
      escapeCSVField(user.name),
      escapeCSVField(user.createdAt),
      escapeCSVField(user.isVerified.toString()),
      escapeCSVField(user.password || ""),
      escapeCSVField(user.lastLoginAt || ""),
    ].join(","),
  );
  const content = [header, ...rows].join("\n") + "\n";
  writeFileSync(USERS_FILE_PATH, content, "utf8");
};

// Session management functions
const loadSessions = (): AuthSession[] => {
  try {
    const content = readFileSync(SESSIONS_FILE_PATH, "utf8");
    const lines = content.trim().split("\n");
    if (lines.length <= 1) return [];

    const sessions: AuthSession[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      if (values.length >= 3) {
        sessions.push({
          token: values[0],
          userId: values[1],
          expiresAt: values[2],
        });
      }
    }
    return sessions;
  } catch (error) {
    console.error("Error loading sessions:", error);
    return [];
  }
};

const saveSessions = (sessions: AuthSession[]): void => {
  const header = "token,userId,expiresAt";
  const rows = sessions.map((session) =>
    [
      escapeCSVField(session.token),
      escapeCSVField(session.userId),
      escapeCSVField(session.expiresAt),
    ].join(","),
  );
  const content = [header, ...rows].join("\n") + "\n";
  writeFileSync(SESSIONS_FILE_PATH, content, "utf8");
};

// OTP management functions
const loadOTPs = (): OTPSession[] => {
  try {
    const content = readFileSync(OTP_FILE_PATH, "utf8");
    const lines = content.trim().split("\n");
    if (lines.length <= 1) return [];

    const otps: OTPSession[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      if (values.length >= 5) {
        otps.push({
          phoneNumber: values[0],
          otp: values[1],
          name: values[2],
          expiresAt: values[3],
          attempts: parseInt(values[4]) || 0,
        });
      }
    }
    return otps;
  } catch (error) {
    console.error("Error loading OTPs:", error);
    return [];
  }
};

const saveOTPs = (otps: OTPSession[]): void => {
  const header = "phoneNumber,otp,name,expiresAt,attempts";
  const rows = otps.map((otp) =>
    [
      escapeCSVField(otp.phoneNumber),
      escapeCSVField(otp.otp),
      escapeCSVField(otp.name),
      escapeCSVField(otp.expiresAt),
      escapeCSVField(otp.attempts.toString()),
    ].join(","),
  );
  const content = [header, ...rows].join("\n") + "\n";
  writeFileSync(OTP_FILE_PATH, content, "utf8");
};

// Helper function to generate random OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to normalize phone number
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, "");
};

// OTP request handler
export const requestOTP: RequestHandler = async (req, res) => {
  try {
    initializeFiles();
    const { phoneNumber, name } = req.body;

    if (!phoneNumber || !name) {
      return res
        .status(400)
        .json({ error: "Phone number and name are required" });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Validate phone number format
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    // Check for existing OTP with rate limiting
    const otps = loadOTPs();
    const existingOTP = otps.find((otp) => otp.phoneNumber === normalizedPhone);

    if (existingOTP) {
      const timeLeft = new Date(existingOTP.expiresAt).getTime() - Date.now();
      const lastRequestTime =
        new Date(existingOTP.expiresAt).getTime() - 5 * 60 * 1000; // 5 minutes ago
      const timeSinceLastRequest = Date.now() - lastRequestTime;

      if (timeSinceLastRequest < 60000) {
        // 1 minute cooldown
        return res.status(429).json({
          error: "Please wait before requesting another OTP",
          timeLeft: Math.ceil((60000 - timeSinceLastRequest) / 1000),
        });
      }
    }

    // Generate new OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Remove any existing OTP for this phone number
    const filteredOTPs = otps.filter(
      (existingOtp) => existingOtp.phoneNumber !== normalizedPhone,
    );

    // Add new OTP
    const newOTP: OTPSession = {
      phoneNumber: normalizedPhone,
      otp,
      name: name.trim(),
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
    };

    filteredOTPs.push(newOTP);
    saveOTPs(filteredOTPs);

    console.log(`OTP for ${normalizedPhone}: ${otp} (expires at ${expiresAt})`);

    res.json({
      success: true,
      message: "OTP sent successfully",
      demoOTP: otp, // In production, remove this line and send via SMS
    });
  } catch (error) {
    console.error("Error requesting OTP:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// OTP verification handler
export const verifyOTP: RequestHandler = (req, res) => {
  try {
    initializeFiles();
    const { phoneNumber, otp, name } = req.body;

    if (!phoneNumber || !otp || !name) {
      return res
        .status(400)
        .json({ error: "Phone number, OTP, and name are required" });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Load and find OTP
    const otps = loadOTPs();
    const otpSession = otps.find(
      (session) => session.phoneNumber === normalizedPhone,
    );

    if (!otpSession) {
      return res.status(400).json({ error: "OTP not found or expired" });
    }

    // Check if OTP is expired
    if (new Date() > new Date(otpSession.expiresAt)) {
      // Remove expired OTP
      const filteredOTPs = otps.filter(
        (session) => session.phoneNumber !== normalizedPhone,
      );
      saveOTPs(filteredOTPs);
      return res.status(400).json({ error: "OTP has expired" });
    }

    // Check attempts
    if (otpSession.attempts >= 3) {
      // Remove OTP after too many attempts
      const filteredOTPs = otps.filter(
        (session) => session.phoneNumber !== normalizedPhone,
      );
      saveOTPs(filteredOTPs);
      return res
        .status(400)
        .json({ error: "Too many attempts. Please request a new OTP" });
    }

    // Verify OTP
    if (otpSession.otp !== otp) {
      // Increment attempts
      otpSession.attempts += 1;
      saveOTPs(otps);
      return res.status(400).json({
        error: "Invalid OTP",
        attemptsLeft: 3 - otpSession.attempts,
      });
    }

    // OTP is valid - remove it
    const filteredOTPs = otps.filter(
      (session) => session.phoneNumber !== normalizedPhone,
    );
    saveOTPs(filteredOTPs);

    // Create or update user
    let users = loadUsers();
    let user = users.find((u) => u.phoneNumber === normalizedPhone);

    if (!user) {
      // Create new user
      user = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        phoneNumber: normalizedPhone,
        name: name.trim(),
        createdAt: new Date().toISOString(),
        isVerified: true,
      };
      users.push(user);
    } else {
      // Update existing user
      user.isVerified = true;
      user.name = name.trim(); // Update name in case it changed
    }

    saveUsers(users);

    // Create session token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const session: AuthSession = {
      token,
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
    };

    const sessions = loadSessions();
    sessions.push(session);
    saveSessions(sessions);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
};

// Token verification handler
export const verifyToken: RequestHandler = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const sessions = loadSessions();
    const session = sessions.find(
      (s) => s.token === token && new Date(s.expiresAt) > new Date(),
    );

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const users = loadUsers();
    const user = users.find((u) => u.id === session.userId);

    if (!user || !user.isVerified) {
      return res.status(401).json({ error: "User not found or not verified" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ error: "Failed to verify token" });
  }
};

export const logoutUser: RequestHandler = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const sessions = loadSessions();
    const filteredSessions = sessions.filter((s) => s.token !== token);

    saveSessions(filteredSessions);

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Failed to logout" });
  }
};

// Password utilities
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Password-based authentication endpoints
export const loginWithPassword: RequestHandler = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res
        .status(400)
        .json({ error: "Phone number and password are required" });
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const users = loadUsers();
    const user = users.find((u) => u.phoneNumber === normalizedPhone);

    if (!user || !user.password) {
      return res
        .status(401)
        .json({ error: "Invalid credentials or account not found" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ error: "Account not verified" });
    }

    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login time
    user.lastLoginAt = new Date().toISOString();
    saveUsers(users);

    // Create session token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const session: AuthSession = {
      token,
      userId: user.id,
      expiresAt: expiresAt.toISOString(),
    };

    const sessions = loadSessions();
    sessions.push(session);
    saveSessions(sessions);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("Password login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

export const createAccount: RequestHandler = async (req, res) => {
  try {
    const { phoneNumber, password, name } = req.body;

    if (!phoneNumber || !password || !name) {
      return res
        .status(400)
        .json({ error: "Phone number, password, and name are required" });
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    if (normalizedPhone.length < 10 || normalizedPhone.length > 15) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    if (name.trim().length < 2) {
      return res
        .status(400)
        .json({ error: "Name must be at least 2 characters long" });
    }

    const users = loadUsers();
    const existingUser = users.find((u) => u.phoneNumber === normalizedPhone);

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "An account with this phone number already exists" });
    }

    const hashedPassword = await hashPassword(password);
    const userId = generateUserId();
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      phoneNumber: normalizedPhone,
      name: name.trim(),
      password: hashedPassword,
      createdAt: now,
      isVerified: true, // Auto-verify new accounts
      lastLoginAt: now,
    };

    users.push(newUser);
    saveUsers(users);

    // Create session token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const session: AuthSession = {
      token,
      userId: newUser.id,
      expiresAt: expiresAt.toISOString(),
    };

    const sessions = loadSessions();
    sessions.push(session);
    saveSessions(sessions);

    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        phoneNumber: newUser.phoneNumber,
        name: newUser.name,
        createdAt: newUser.createdAt,
        isVerified: newUser.isVerified,
        lastLoginAt: newUser.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("Account creation error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
};

export const updateProfile: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const sessions = loadSessions();
    const session = sessions.find(
      (s) => s.token === token && new Date(s.expiresAt) > new Date(),
    );

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const users = loadUsers();
    const userIndex = users.findIndex((u) => u.id === session.userId);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    const { name, newPassword, currentPassword } = req.body;

    if (name && name.trim().length < 2) {
      return res
        .status(400)
        .json({ error: "Name must be at least 2 characters long" });
    }

    const user = users[userIndex];

    // Update name if provided
    if (name) {
      user.name = name.trim();
    }

    // Update password if provided
    if (newPassword) {
      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters long" });
      }

      // Verify current password if user has one
      if (user.password && currentPassword) {
        const isCurrentPasswordValid = await verifyPassword(
          currentPassword,
          user.password,
        );
        if (!isCurrentPasswordValid) {
          return res
            .status(400)
            .json({ error: "Current password is incorrect" });
        }
      }

      user.password = await hashPassword(newPassword);
    }

    users[userIndex] = user;
    saveUsers(users);

    res.json({
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export const deleteAccount: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.substring(7);
    const sessions = loadSessions();
    const session = sessions.find(
      (s) => s.token === token && new Date(s.expiresAt) > new Date(),
    );

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const users = loadUsers();
    const filteredUsers = users.filter((u) => u.id !== session.userId);

    if (users.length === filteredUsers.length) {
      return res.status(404).json({ error: "User not found" });
    }

    saveUsers(filteredUsers);

    // Remove all sessions for this user
    const filteredSessions = sessions.filter(
      (s) => s.userId !== session.userId,
    );
    saveSessions(filteredSessions);

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Account deletion error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
};
