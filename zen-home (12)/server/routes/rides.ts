import { RequestHandler } from "express";
import { readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { join } from "path";

interface Ride {
  id: string;
  type: "offering" | "seeking";
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: number;
  name: string;
  contact: string;
  notes?: string;
  createdBy?: string; // User ID of the ride creator
}

const CSV_FILE_PATH = join(process.cwd(), "rides.csv");

// Store last modified time to detect changes
let lastModifiedTime = 0;
let cachedRides: Ride[] = [];

// Improved CSV parsing that handles quoted fields with commas
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
      i++; // Skip next quote
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

const parseCSV = (content: string): Ride[] => {
  const lines = content.trim().split("\n");
  if (lines.length <= 1) return []; // No data rows

  const rides: Ride[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = parseCSVLine(line);

    if (values.length >= 10) {
      // At least 10 fields required, 11th field (createdBy) is optional
      const ride: Ride = {
        id: values[0] || `ride_${Date.now()}_${i}`,
        type: (values[1] as "offering" | "seeking") || "offering",
        from: values[2] || "",
        to: values[3] || "",
        date: values[4] || "",
        time: values[5] || "",
        seats: parseInt(values[6]) || 1,
        price: parseFloat(values[7]) || 0,
        name: values[8] || "",
        contact: values[9] || "",
        notes: values[10] || "",
        createdBy: values[11] || undefined, // User ID if available
      };
      rides.push(ride);
    }
  }

  return rides;
};

const formatCSV = (rides: Ride[]): string => {
  const header =
    "id,type,from,to,date,time,seats,price,name,contact,notes,createdBy";
  const rows = rides.map((ride) => {
    // Properly escape quotes and handle commas in values
    const escapeField = (field: any): string => {
      const str = String(field || "");
      if (str.includes('"') || str.includes(",") || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escapeField(ride.id),
      escapeField(ride.type),
      escapeField(ride.from),
      escapeField(ride.to),
      escapeField(ride.date),
      escapeField(ride.time),
      ride.seats,
      ride.price,
      escapeField(ride.name),
      escapeField(ride.contact),
      escapeField(ride.notes),
      escapeField(ride.createdBy || ""),
    ].join(",");
  });

  return [header, ...rows].join("\n") + "\n";
};

const initializeCSVFile = (): void => {
  if (!existsSync(CSV_FILE_PATH)) {
    const header =
      "id,type,from,to,date,time,seats,price,name,contact,notes,createdBy\n";
    writeFileSync(CSV_FILE_PATH, header, "utf8");
    console.log("Created new CSV file:", CSV_FILE_PATH);
  }
};

const loadRidesFromFile = (): Ride[] => {
  try {
    const stats = statSync(CSV_FILE_PATH);
    const modifiedTime = stats.mtime.getTime();

    // Only reload if file has been modified
    if (modifiedTime !== lastModifiedTime) {
      console.log("CSV file modified, reloading data...");
      const content = readFileSync(CSV_FILE_PATH, "utf8");
      cachedRides = parseCSV(content);
      lastModifiedTime = modifiedTime;
    }

    return cachedRides;
  } catch (error) {
    console.error("Error loading rides from file:", error);
    return [];
  }
};

// Helper function to verify authentication and get user info
const verifyAuth = async (
  req: any,
): Promise<{ userId: string; userName: string } | null> => {
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
          // Get user name
          const usersContent = readFileSync(USERS_FILE_PATH, "utf8");
          const userLines = usersContent.trim().split("\n");

          for (let j = 1; j < userLines.length; j++) {
            const userValues = parseCSVLine(userLines[j]);
            if (userValues.length >= 5 && userValues[0] === userId) {
              return {
                userId: userValues[0],
                userName: userValues[2],
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

export const getRides: RequestHandler = (req, res) => {
  try {
    initializeCSVFile();
    const rides = loadRidesFromFile();

    console.log(`Loaded ${rides.length} rides from CSV`);
    res.json({ rides, total: rides.length, lastModified: lastModifiedTime });
  } catch (error) {
    console.error("Error reading rides:", error);
    res.status(500).json({ error: "Failed to read rides data" });
  }
};

export const addRide: RequestHandler = async (req, res) => {
  try {
    initializeCSVFile();

    console.log("Received new ride request:", req.body);

    // Verify authentication to get user info
    const auth = await verifyAuth(req);

    const { type, from, to, date, time, seats, price, name, contact, notes } =
      req.body;

    // Validate required fields
    if (!type || !from || !to || !date || !time || !name || !contact) {
      console.log("Missing required fields:", req.body);
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate unique ID
    const id = `ride_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newRide: Ride = {
      id,
      type,
      from,
      to,
      date,
      time,
      seats: parseInt(seats) || 1,
      price: parseFloat(price) || 0,
      name,
      contact,
      notes: notes || "",
      createdBy: auth?.userId, // Store the user ID if authenticated
    };

    console.log("Adding new ride:", newRide);

    // Read existing rides from file
    const existingRides = loadRidesFromFile();

    // Add new ride
    existingRides.push(newRide);

    // Write back to CSV
    const newContent = formatCSV(existingRides);
    writeFileSync(CSV_FILE_PATH, newContent, "utf8");

    console.log("Successfully wrote to CSV file");

    // Update cache
    cachedRides = existingRides;
    const stats = statSync(CSV_FILE_PATH);
    lastModifiedTime = stats.mtime.getTime();

    res.json({ success: true, ride: newRide });
  } catch (error) {
    console.error("Error adding ride:", error);
    res.status(500).json({ error: "Failed to add ride" });
  }
};

export const updateRide: RequestHandler = async (req, res) => {
  try {
    initializeCSVFile();

    const auth = await verifyAuth(req);
    if (!auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { rideId } = req.params;
    const { type, from, to, date, time, seats, price, name, contact, notes } =
      req.body;

    // Validate required fields
    if (!type || !from || !to || !date || !time || !name || !contact) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const rides = loadRidesFromFile();
    const rideIndex = rides.findIndex((r) => r.id === rideId);

    if (rideIndex === -1) {
      return res.status(404).json({ error: "Ride not found" });
    }

    const ride = rides[rideIndex];

    // Check if user owns this ride
    if (ride.createdBy !== auth.userId) {
      return res
        .status(403)
        .json({ error: "You can only edit your own rides" });
    }

    // Update ride data
    rides[rideIndex] = {
      ...ride,
      type,
      from,
      to,
      date,
      time,
      seats: parseInt(seats) || 1,
      price: parseFloat(price) || 0,
      name,
      contact,
      notes: notes || "",
    };

    // Write back to CSV
    const newContent = formatCSV(rides);
    writeFileSync(CSV_FILE_PATH, newContent, "utf8");

    // Update cache
    cachedRides = rides;
    const stats = statSync(CSV_FILE_PATH);
    lastModifiedTime = stats.mtime.getTime();

    console.log(`Ride ${rideId} updated by ${auth.userName}`);

    res.json({ success: true, ride: rides[rideIndex] });
  } catch (error) {
    console.error("Error updating ride:", error);
    res.status(500).json({ error: "Failed to update ride" });
  }
};

export const deleteRide: RequestHandler = async (req, res) => {
  try {
    initializeCSVFile();

    const auth = await verifyAuth(req);
    if (!auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { rideId } = req.params;

    const rides = loadRidesFromFile();
    const rideIndex = rides.findIndex((r) => r.id === rideId);

    if (rideIndex === -1) {
      return res.status(404).json({ error: "Ride not found" });
    }

    const ride = rides[rideIndex];

    // Check if user owns this ride
    if (ride.createdBy !== auth.userId) {
      return res
        .status(403)
        .json({ error: "You can only delete your own rides" });
    }

    // Remove ride from array
    rides.splice(rideIndex, 1);

    // Write back to CSV
    const newContent = formatCSV(rides);
    writeFileSync(CSV_FILE_PATH, newContent, "utf8");

    // Update cache
    cachedRides = rides;
    const stats = statSync(CSV_FILE_PATH);
    lastModifiedTime = stats.mtime.getTime();

    console.log(`Ride ${rideId} deleted by ${auth.userName}`);

    res.json({ success: true, message: "Ride deleted successfully" });
  } catch (error) {
    console.error("Error deleting ride:", error);
    res.status(500).json({ error: "Failed to delete ride" });
  }
};

// File watching endpoint to check for updates
export const checkCSVUpdates: RequestHandler = (req, res) => {
  try {
    const rides = loadRidesFromFile();
    res.json({ rides, total: rides.length, lastModified: lastModifiedTime });
  } catch (error) {
    console.error("Error checking CSV updates:", error);
    res.status(500).json({ error: "Failed to check updates" });
  }
};
