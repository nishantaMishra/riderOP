import { RequestHandler } from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";

interface User {
  id: string;
  phoneNumber: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  isVerified: boolean;
  emailVerified: boolean;
}

interface AuthSession {
  token: string;
  userId: string;
  expiresAt: string;
}

interface OTPSession {
  identifier: string; // phone or email
  type: "phone" | "email";
  otp: string;
  purpose: "registration" | "password_reset";
  name?: string; // only for registration
  phoneNumber?: string; // only for registration
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
  const str = String(field || "");
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Initialize CSV files
const initializeUserFiles = (): void => {
  if (!existsSync(USERS_FILE_PATH)) {
    const header =
      "id,phoneNumber,email,name,passwordHash,createdAt,isVerified,emailVerified\n";
    writeFileSync(USERS_FILE_PATH, header, "utf8");
    console.log("Created new users CSV file");
  }

  if (!existsSync(SESSIONS_FILE_PATH)) {
    const header = "token,userId,expiresAt\n";
    writeFileSync(SESSIONS_FILE_PATH, header, "utf8");
    console.log("Created new sessions CSV file");
  }

  if (!existsSync(OTP_FILE_PATH)) {
    const header =
      "identifier,type,otp,purpose,name,phoneNumber,expiresAt,attempts\n";
    writeFileSync(OTP_FILE_PATH, header, "utf8");
    console.log("Created new OTP CSV file");
  }
};

// Phone number and email validation
const isValidPhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10 || cleaned.length > 15) {
    return false;
  }
  const phoneRegex =
    /^(\+?1?)?[2-9]\d{2}[2-9]\d{2}\d{4}$|^(\+?\d{1,3})?[1-9]\d{8,14}$/;
  return phoneRegex.test(cleaned);
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 && /^[2-9]/.test(cleaned)) {
    return "1" + cleaned;
  }
  return cleaned;
};

// Password hashing
const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return salt + ":" + hash;
};

const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const [salt, hash] = hashedPassword.split(":");
  const verifyHash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return hash === verifyHash;
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
      if (values.length >= 8) {
        users.push({
          id: values[0],
          phoneNumber: values[1],
          email: values[2],
          name: values[3],
          passwordHash: values[4],
          createdAt: values[5],
          isVerified: values[6] === "true",
          emailVerified: values[7] === "true",
        });
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
    "id,phoneNumber,email,name,passwordHash,createdAt,isVerified,emailVerified";
  const rows = users.map((user) =>
    [
      escapeCSVField(user.id),
      escapeCSVField(user.phoneNumber),
      escapeCSVField(user.email),
      escapeCSVField(user.name),
      escapeCSVField(user.passwordHash),
      escapeCSVField(user.createdAt),
      escapeCSVField(user.isVerified.toString()),
      escapeCSVField(user.emailVerified.toString()),
    ].join(","),
  );
  const content = [header, ...rows].join("\n") + "\n";
  writeFileSync(USERS_FILE_PATH, content, "utf8");
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
      if (values.length >= 8) {
        otps.push({
          identifier: values[0],
          type: values[1] as "phone" | "email",
          otp: values[2],
          purpose: values[3] as "registration" | "password_reset",
          name: values[4] || undefined,
          phoneNumber: values[5] || undefined,
          expiresAt: values[6],
          attempts: parseInt(values[7]) || 0,
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
  const header =
    "identifier,type,otp,purpose,name,phoneNumber,expiresAt,attempts";
  const rows = otps.map((otp) =>
    [
      escapeCSVField(otp.identifier),
      escapeCSVField(otp.type),
      escapeCSVField(otp.otp),
      escapeCSVField(otp.purpose),
      escapeCSVField(otp.name || ""),
      escapeCSVField(otp.phoneNumber || ""),
      escapeCSVField(otp.expiresAt),
      escapeCSVField(otp.attempts.toString()),
    ].join(","),
  );
  const content = [header, ...rows].join("\n") + "\n";
  writeFileSync(OTP_FILE_PATH, content, "utf8");
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

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

const cleanExpiredSessions = (): void => {
  const sessions = loadSessions();
  const now = new Date();
  const validSessions = sessions.filter(
    (session) => new Date(session.expiresAt) > now,
  );
  if (validSessions.length !== sessions.length) {
    saveSessions(validSessions);
  }
};

const cleanExpiredOTPs = (): void => {
  const otps = loadOTPs();
  const now = new Date();
  const validOTPs = otps.filter((otp) => new Date(otp.expiresAt) > now);
  if (validOTPs.length !== otps.length) {
    saveOTPs(validOTPs);
  }
};

// Resend Email Service Implementation
const sendEmailOTP = async (
  email: string,
  otp: string,
  purpose: string,
): Promise<boolean> => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const hasResendApiKey = process.env.RESEND_API_KEY;

    // Log OTP details in non-production for easier debugging
    if (!isProduction) {
      console.log(`📧 [DEV] EMAIL OTP to ${email}: ${otp}`);
      console.log(`📱 [DEV] Purpose: ${purpose}`);
      if (!hasResendApiKey) {
        console.log(
          `📭 [DEV] Skipping real email send because RESEND_API_KEY is missing`,
        );
        return true;
      }
      console.log("📬 [DEV] Sending real email via Resend using API key");
    }

    if (!hasResendApiKey) {
      console.error(
        "❌ RESEND_API_KEY not found. Please set up your Resend API key.",
      );
      console.error("Visit https://resend.com to get your API key");
      return false;
    }

    const { Resend } = require("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const subject =
      purpose === "registration"
        ? "Verify Your RideShare Hub Account"
        : "Reset Your Password - RideShare Hub";

    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    // Create professional HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.4; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #641ae6 0%, #16a249 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                🚗 RideShare Hub
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">
                Connect. Share. Travel.
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 20px;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                ${purpose === "registration" ? "Welcome to RideShare Hub!" : "Password Reset Request"}
              </h2>
              
              <p style="color: #666; margin: 0 0 30px 0; font-size: 16px;">
                ${
                  purpose === "registration"
                    ? "Thank you for joining our rideshare community! To complete your account setup, please verify your email address with the code below:"
                    : "We received a request to reset your password. Use the verification code below to set a new password:"
                }
              </p>

              <!-- OTP Display -->
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border: 3px solid #641ae6; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                <p style="color: #641ae6; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                  Your Verification Code
                </p>
                <div style="font-size: 42px; font-weight: bold; color: #641ae6; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                  ${otp}
                </div>
                <p style="color: #7c3aed; margin: 15px 0 0 0; font-size: 12px;">
                  Enter this code to ${purpose === "registration" ? "verify your account" : "reset your password"}
                </p>
              </div>

              <!-- Security Notice -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>🔒 Security Notice:</strong> This code expires in 10 minutes. Never share this code with anyone. 
                  If you didn't request this, please ignore this email.
                </p>
              </div>

              ${
                purpose === "registration"
                  ? `
              <div style="margin: 30px 0;">
                <h3 style="color: #333; font-size: 18px; margin: 0 0 15px 0;">What's next?</h3>
                <ul style="color: #666; margin: 0; padding-left: 20px;">
                  <li style="margin: 5px 0;">Verify your email with the code above</li>
                  <li style="margin: 5px 0;">Create a secure password for your account</li>
                  <li style="margin: 5px 0;">Start connecting with fellow travelers</li>
                  <li style="margin: 5px 0;">Share rides and save money!</li>
                </ul>
              </div>
              `
                  : `
              <p style="color: #666; margin: 30px 0 0 0; font-size: 14px;">
                After entering the code, you'll be able to create a new password for your account.
              </p>
              `
              }
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 30px 20px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #641ae6; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                🚗 RideShare Hub
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Connecting travelers, one ride at a time.<br>
                This email was sent because you requested ${purpose === "registration" ? "account registration" : "a password reset"} on RideShare Hub.
              </p>
              <p style="color: #9ca3af; margin: 15px 0 0 0; font-size: 11px;">
                If you have any questions, please contact our support team.
              </p>
            </div>

          </div>
        </body>
      </html>
    `;

    // Plain text version for email clients that don't support HTML
    const textContent = `
      RideShare Hub - ${subject}
      
      ${purpose === "registration" ? "Welcome to RideShare Hub!" : "Password Reset Request"}
      
      Your verification code is: ${otp}
      
      This code expires in 10 minutes.
      
      ${
        purpose === "registration"
          ? "Please enter this code to verify your account and complete registration."
          : "Please enter this code to reset your password."
      }
      
      If you didn't request this, please ignore this email.
      
      Best regards,
      The RideShare Hub Team
    `;

    const emailData = {
      from: fromEmail,
      to: [email],
      subject: subject,
      html: htmlContent,
      text: textContent,
    };

    const { data, error } = await resend.emails.send(emailData);

    if (error) {
      console.error("❌ Resend error:", error);
      return false;
    }

    console.log("✅ Email sent successfully via Resend:", data?.id);
    console.log(`📧 Email delivered to: ${email}`);
    return true;
  } catch (error: any) {
    console.error("❌ Email sending error:", error);
    return false;
  }
};

const createUserSession = (user: User): { token: string; user: any } => {
  const token = generateToken();
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

  return {
    token,
    user: {
      id: user.id,
      phoneNumber: user.phoneNumber,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      isVerified: user.isVerified,
      emailVerified: user.emailVerified,
    },
  };
};

// API endpoints

// Registration: Request email OTP
export const requestRegistrationOTP: RequestHandler = async (req, res) => {
  try {
    initializeUserFiles();

    const { phoneNumber, email, name } = req.body;

    if (!phoneNumber || !email || !name) {
      return res
        .status(400)
        .json({ error: "Phone number, email, and name are required" });
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid phone number" });
    }

    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid email address" });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const users = loadUsers();

    // Check if phone or email already exists
    const existingUser = users.find(
      (u) =>
        u.phoneNumber === normalizedPhone ||
        u.email.toLowerCase() === email.toLowerCase(),
    );

    if (existingUser) {
      return res.status(400).json({
        error:
          existingUser.phoneNumber === normalizedPhone
            ? "Phone number already registered. Use login instead."
            : "Email already registered. Use login instead.",
      });
    }

    cleanExpiredOTPs();

    let otps = loadOTPs();
    const existingOTP = otps.find(
      (otp) =>
        otp.identifier === email.toLowerCase() &&
        otp.purpose === "registration",
    );

    if (existingOTP && new Date(existingOTP.expiresAt) > new Date()) {
      const timeLeft = Math.ceil(
        (new Date(existingOTP.expiresAt).getTime() - Date.now()) / 1000,
      );
      if (timeLeft > 480) {
        // More than 8 minutes left
        return res.status(429).json({
          error: `Please wait ${Math.ceil(timeLeft / 60)} minutes before requesting a new OTP`,
          timeLeft,
        });
      }
    }

    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    otps = otps.filter(
      (o) =>
        o.identifier !== email.toLowerCase() || o.purpose !== "registration",
    );

    const newOTPSession: OTPSession = {
      identifier: email.toLowerCase(),
      type: "email",
      otp,
      purpose: "registration",
      name: name.trim(),
      phoneNumber: normalizedPhone,
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
    };

    otps.push(newOTPSession);
    saveOTPs(otps);

    const sent = await sendEmailOTP(email, otp, "registration");

    if (!sent) {
      return res.status(500).json({ error: "Failed to send OTP email" });
    }

    console.log(`Registration OTP sent to ${email}: ${otp}`);

    res.json({
      success: true,
      message: "Registration OTP sent to your email",
      ...(process.env.NODE_ENV !== "production" && { demoOTP: otp }),
    });
  } catch (error) {
    console.error("Registration OTP request error:", error);
    res.status(500).json({ error: "Failed to process registration request" });
  }
};

// Registration: Verify OTP and create account
export const verifyRegistrationOTP: RequestHandler = (req, res) => {
  try {
    initializeUserFiles();

    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      return res
        .status(400)
        .json({ error: "Email, OTP, and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    cleanExpiredOTPs();

    let otps = loadOTPs();
    const otpSession = otps.find(
      (o) =>
        o.identifier === email.toLowerCase() && o.purpose === "registration",
    );

    if (!otpSession) {
      return res.status(400).json({
        error: "No registration OTP found. Please request a new one.",
      });
    }

    if (new Date(otpSession.expiresAt) <= new Date()) {
      otps = otps.filter(
        (o) =>
          o.identifier !== email.toLowerCase() || o.purpose !== "registration",
      );
      saveOTPs(otps);
      return res
        .status(400)
        .json({ error: "OTP has expired. Please request a new one." });
    }

    if (otpSession.attempts >= 3) {
      otps = otps.filter(
        (o) =>
          o.identifier !== email.toLowerCase() || o.purpose !== "registration",
      );
      saveOTPs(otps);
      return res.status(400).json({
        error: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    if (otpSession.otp !== otp.trim()) {
      otpSession.attempts += 1;
      saveOTPs(otps);

      const remainingAttempts = 3 - otpSession.attempts;
      return res.status(400).json({
        error: `Incorrect OTP. ${remainingAttempts} attempts remaining.`,
        remainingAttempts,
      });
    }

    // OTP verified, create user account
    otps = otps.filter(
      (o) =>
        o.identifier !== email.toLowerCase() || o.purpose !== "registration",
    );
    saveOTPs(otps);

    const users = loadUsers();
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newUser: User = {
      id: userId,
      phoneNumber: otpSession.phoneNumber!,
      email: email.toLowerCase(),
      name: otpSession.name!,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      isVerified: true,
      emailVerified: true,
    };

    users.push(newUser);
    saveUsers(users);

    console.log("Created new verified user:", userId);

    cleanExpiredSessions();
    const sessionData = createUserSession(newUser);

    res.json({
      success: true,
      message: "Account created successfully",
      ...sessionData,
    });
  } catch (error) {
    console.error("Registration verification error:", error);
    res.status(500).json({ error: "Failed to verify registration" });
  }
};

// Login with email/phone and password
export const loginUser: RequestHandler = (req, res) => {
  try {
    initializeUserFiles();

    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ error: "Email/phone and password are required" });
    }

    const users = loadUsers();
    let user: User | undefined;

    // Check if identifier is email or phone
    if (isValidEmail(identifier)) {
      user = users.find(
        (u) => u.email.toLowerCase() === identifier.toLowerCase(),
      );
    } else if (isValidPhoneNumber(identifier)) {
      const normalizedPhone = normalizePhoneNumber(identifier);
      user = users.find((u) => u.phoneNumber === normalizedPhone);
    } else {
      return res
        .status(400)
        .json({ error: "Please enter a valid email or phone number" });
    }

    if (!user) {
      return res
        .status(401)
        .json({ error: "Account not found. Please register first." });
    }

    if (!user.isVerified || !user.emailVerified) {
      return res
        .status(401)
        .json({ error: "Account not verified. Please complete registration." });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    cleanExpiredSessions();
    const sessionData = createUserSession(user);

    console.log("User logged in:", user.id);

    res.json({
      success: true,
      message: "Login successful",
      ...sessionData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to process login" });
  }
};

// Password Reset: Request OTP
export const requestPasswordResetOTP: RequestHandler = async (req, res) => {
  try {
    initializeUserFiles();

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    if (!isValidEmail(email)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid email address" });
    }

    const users = loadUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );

    if (!user) {
      return res
        .status(404)
        .json({ error: "No account found with this email address" });
    }

    cleanExpiredOTPs();

    let otps = loadOTPs();
    const existingOTP = otps.find(
      (otp) =>
        otp.identifier === email.toLowerCase() &&
        otp.purpose === "password_reset",
    );

    if (existingOTP && new Date(existingOTP.expiresAt) > new Date()) {
      const timeLeft = Math.ceil(
        (new Date(existingOTP.expiresAt).getTime() - Date.now()) / 1000,
      );
      if (timeLeft > 480) {
        return res.status(429).json({
          error: `Please wait ${Math.ceil(timeLeft / 60)} minutes before requesting a new OTP`,
          timeLeft,
        });
      }
    }

    const otp = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    otps = otps.filter(
      (o) =>
        o.identifier !== email.toLowerCase() || o.purpose !== "password_reset",
    );

    const newOTPSession: OTPSession = {
      identifier: email.toLowerCase(),
      type: "email",
      otp,
      purpose: "password_reset",
      expiresAt: expiresAt.toISOString(),
      attempts: 0,
    };

    otps.push(newOTPSession);
    saveOTPs(otps);

    const sent = await sendEmailOTP(email, otp, "password_reset");

    if (!sent) {
      return res
        .status(500)
        .json({ error: "Failed to send password reset email" });
    }

    console.log(`Password reset OTP sent to ${email}: ${otp}`);

    res.json({
      success: true,
      message: "Password reset OTP sent to your email",
      ...(process.env.NODE_ENV !== "production" && { demoOTP: otp }),
    });
  } catch (error) {
    console.error("Password reset OTP request error:", error);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
};

// Password Reset: Verify OTP and reset password
export const resetPassword: RequestHandler = (req, res) => {
  try {
    initializeUserFiles();

    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ error: "Email, OTP, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    cleanExpiredOTPs();

    let otps = loadOTPs();
    const otpSession = otps.find(
      (o) =>
        o.identifier === email.toLowerCase() && o.purpose === "password_reset",
    );

    if (!otpSession) {
      return res.status(400).json({
        error: "No password reset OTP found. Please request a new one.",
      });
    }

    if (new Date(otpSession.expiresAt) <= new Date()) {
      otps = otps.filter(
        (o) =>
          o.identifier !== email.toLowerCase() ||
          o.purpose !== "password_reset",
      );
      saveOTPs(otps);
      return res
        .status(400)
        .json({ error: "OTP has expired. Please request a new one." });
    }

    if (otpSession.attempts >= 3) {
      otps = otps.filter(
        (o) =>
          o.identifier !== email.toLowerCase() ||
          o.purpose !== "password_reset",
      );
      saveOTPs(otps);
      return res.status(400).json({
        error: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    if (otpSession.otp !== otp.trim()) {
      otpSession.attempts += 1;
      saveOTPs(otps);

      const remainingAttempts = 3 - otpSession.attempts;
      return res.status(400).json({
        error: `Incorrect OTP. ${remainingAttempts} attempts remaining.`,
        remainingAttempts,
      });
    }

    // OTP verified, update password
    otps = otps.filter(
      (o) =>
        o.identifier !== email.toLowerCase() || o.purpose !== "password_reset",
    );
    saveOTPs(otps);

    const users = loadUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.passwordHash = hashPassword(newPassword);
    saveUsers(users);

    console.log("Password reset for user:", user.id);

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
};

export const verifyToken: RequestHandler = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No valid token provided" });
    }

    const token = authHeader.substring(7);
    cleanExpiredSessions();

    const sessions = loadSessions();
    const session = sessions.find(
      (s) => s.token === token && new Date(s.expiresAt) > new Date(),
    );

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const users = loadUsers();
    const user = users.find((u) => u.id === session.userId);

    if (!user || !user.isVerified || !user.emailVerified) {
      return res.status(401).json({ error: "User not found or not verified" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
        emailVerified: user.emailVerified,
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
