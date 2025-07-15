import { RequestHandler } from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const WHATSAPP_USERS_FILE_PATH = join(process.cwd(), "whatsapp_users.csv");

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

const normalizePhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Add country code if missing (assuming US +1 for numbers starting with area code)
  if (cleaned.length === 10 && /^[2-9]/.test(cleaned)) {
    return "1" + cleaned;
  }

  return cleaned;
};

// Initialize WhatsApp users CSV file
const initializeWhatsAppFile = (): void => {
  if (!existsSync(WHATSAPP_USERS_FILE_PATH)) {
    const header = "phoneNumber,name,addedDate\n";
    writeFileSync(WHATSAPP_USERS_FILE_PATH, header, "utf8");
    console.log("Created new WhatsApp users CSV file");
  }
};

// Load WhatsApp users
const loadWhatsAppUsers = (): string[] => {
  try {
    initializeWhatsAppFile();
    const content = readFileSync(WHATSAPP_USERS_FILE_PATH, "utf8");
    const lines = content.trim().split("\n");
    if (lines.length <= 1) return [];

    const phoneNumbers: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      if (values.length >= 1) {
        phoneNumbers.push(values[0]);
      }
    }
    return phoneNumbers;
  } catch (error) {
    console.error("Error loading WhatsApp users:", error);
    return [];
  }
};

// Helper function to verify authentication and get user info
const verifyAuth = async (
  req: any,
): Promise<{
  userId: string;
  userName: string;
  phoneNumber: string;
} | null> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);

    // Load sessions and verify token
    const SESSIONS_FILE_PATH = join(process.cwd(), "sessions.csv");
    const USERS_FILE_PATH = join(process.cwd(), "users.csv");

    const sessionsContent = readFileSync(SESSIONS_FILE_PATH, "utf8");
    const sessionLines = sessionsContent.trim().split("\n");

    for (let i = 1; i < sessionLines.length; i++) {
      const sessionValues = parseCSVLine(sessionLines[i]);
      if (sessionValues.length >= 3) {
        const sessionToken = sessionValues[0];
        const userId = sessionValues[1];
        const expiresAt = sessionValues[2];

        if (sessionToken === token && new Date(expiresAt) > new Date()) {
          // Get user info
          const usersContent = readFileSync(USERS_FILE_PATH, "utf8");
          const userLines = usersContent.trim().split("\n");

          for (let j = 1; j < userLines.length; j++) {
            const userValues = parseCSVLine(userLines[j]);
            if (userValues.length >= 5 && userValues[0] === userId) {
              return {
                userId: userValues[0],
                userName: userValues[2],
                phoneNumber: userValues[1],
              };
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Auth verification error:", error);
    return null;
  }
};

export const checkWhatsAppAccess: RequestHandler = async (req, res) => {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { targetPhoneNumber } = req.body;

    if (!targetPhoneNumber) {
      return res.status(400).json({ error: "Target phone number is required" });
    }

    const whatsappUsers = loadWhatsAppUsers();
    const normalizedUserPhone = normalizePhoneNumber(auth.phoneNumber);
    const normalizedTargetPhone = normalizePhoneNumber(targetPhoneNumber);

    // Check if current user is in WhatsApp users list
    const isUserInWhatsApp = whatsappUsers.includes(normalizedUserPhone);

    // Check if target user is in WhatsApp users list
    const isTargetInWhatsApp = whatsappUsers.includes(normalizedTargetPhone);

    if (!isUserInWhatsApp) {
      return res.json({
        canUseWhatsApp: false,
        reason: "You are not part of the common WhatsApp group",
      });
    }

    if (!isTargetInWhatsApp) {
      return res.json({
        canUseWhatsApp: false,
        reason: "Target user is not part of the WhatsApp group",
      });
    }

    // Both users are in WhatsApp group, generate WhatsApp link
    const whatsappUrl = `https://wa.me/${normalizedTargetPhone}`;

    res.json({
      canUseWhatsApp: true,
      whatsappUrl,
      isUserInWhatsApp,
      isTargetInWhatsApp,
    });
  } catch (error) {
    console.error("Error checking WhatsApp access:", error);
    res.status(500).json({ error: "Failed to check WhatsApp access" });
  }
};

export const getWhatsAppStatus: RequestHandler = async (req, res) => {
  try {
    const auth = await verifyAuth(req);
    if (!auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const whatsappUsers = loadWhatsAppUsers();
    const normalizedUserPhone = normalizePhoneNumber(auth.phoneNumber);
    const isUserInWhatsApp = whatsappUsers.includes(normalizedUserPhone);

    res.json({
      isUserInWhatsApp,
      whatsappUsersCount: whatsappUsers.length,
    });
  } catch (error) {
    console.error("Error getting WhatsApp status:", error);
    res.status(500).json({ error: "Failed to get WhatsApp status" });
  }
};
