import { RequestHandler } from "express";
import { readFileSync, writeFileSync, existsSync, statSync } from "fs";
import { join } from "path";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

interface Conversation {
  id: string;
  user1Id: string;
  user1Name: string;
  user2Id: string;
  user2Name: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount1: number; // unread count for user1
  unreadCount2: number; // unread count for user2
  rideContext?: {
    rideId: string;
    from: string;
    to: string;
    type: string;
  };
}

const MESSAGES_FILE_PATH = join(process.cwd(), "messages.csv");
const CONVERSATIONS_FILE_PATH = join(process.cwd(), "conversations.csv");

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
const initializeMessageFiles = (): void => {
  if (!existsSync(MESSAGES_FILE_PATH)) {
    const header =
      "id,conversationId,senderId,senderName,receiverId,receiverName,content,timestamp,isRead\n";
    writeFileSync(MESSAGES_FILE_PATH, header, "utf8");
    console.log("Created new messages CSV file");
  }

  if (!existsSync(CONVERSATIONS_FILE_PATH)) {
    const header =
      "id,user1Id,user1Name,user2Id,user2Name,lastMessage,lastMessageTime,unreadCount1,unreadCount2\n";
    writeFileSync(CONVERSATIONS_FILE_PATH, header, "utf8");
    console.log("Created new conversations CSV file");
  }
};

// Load functions
const loadMessages = (): Message[] => {
  try {
    const content = readFileSync(MESSAGES_FILE_PATH, "utf8");
    const lines = content.trim().split("\n");
    if (lines.length <= 1) return [];

    const messages: Message[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      if (values.length >= 9) {
        messages.push({
          id: values[0],
          conversationId: values[1],
          senderId: values[2],
          senderName: values[3],
          receiverId: values[4],
          receiverName: values[5],
          content: values[6],
          timestamp: values[7],
          isRead: values[8] === "true",
        });
      }
    }
    return messages;
  } catch (error) {
    console.error("Error loading messages:", error);
    return [];
  }
};

const saveMessages = (messages: Message[]): void => {
  const header =
    "id,conversationId,senderId,senderName,receiverId,receiverName,content,timestamp,isRead";
  const rows = messages.map((msg) =>
    [
      escapeCSVField(msg.id),
      escapeCSVField(msg.conversationId),
      escapeCSVField(msg.senderId),
      escapeCSVField(msg.senderName),
      escapeCSVField(msg.receiverId),
      escapeCSVField(msg.receiverName),
      escapeCSVField(msg.content),
      escapeCSVField(msg.timestamp),
      escapeCSVField(msg.isRead.toString()),
    ].join(","),
  );
  const content = [header, ...rows].join("\n") + "\n";
  writeFileSync(MESSAGES_FILE_PATH, content, "utf8");
};

const loadConversations = (): Conversation[] => {
  try {
    const content = readFileSync(CONVERSATIONS_FILE_PATH, "utf8");
    const lines = content.trim().split("\n");
    if (lines.length <= 1) return [];

    const conversations: Conversation[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      if (values.length >= 9) {
        const conversation: Conversation = {
          id: values[0],
          user1Id: values[1],
          user1Name: values[2],
          user2Id: values[3],
          user2Name: values[4],
          lastMessage: values[5],
          lastMessageTime: values[6],
          unreadCount1: parseInt(values[7]) || 0,
          unreadCount2: parseInt(values[8]) || 0,
        };

        // Parse ride context if it exists
        if (
          values.length >= 13 &&
          values[9] &&
          values[10] &&
          values[11] &&
          values[12]
        ) {
          conversation.rideContext = {
            rideId: values[9],
            from: values[10],
            to: values[11],
            type: values[12],
          };
        }

        conversations.push(conversation);
      }
    }
    return conversations;
  } catch (error) {
    console.error("Error loading conversations:", error);
    return [];
  }
};

const saveConversations = (conversations: Conversation[]): void => {
  const header =
    "id,user1Id,user1Name,user2Id,user2Name,lastMessage,lastMessageTime,unreadCount1,unreadCount2,rideId,rideFrom,rideTo,rideType";
  const rows = conversations.map((conv) =>
    [
      escapeCSVField(conv.id),
      escapeCSVField(conv.user1Id),
      escapeCSVField(conv.user1Name),
      escapeCSVField(conv.user2Id),
      escapeCSVField(conv.user2Name),
      escapeCSVField(conv.lastMessage),
      escapeCSVField(conv.lastMessageTime),
      conv.unreadCount1.toString(),
      conv.unreadCount2.toString(),
      escapeCSVField(conv.rideContext?.rideId || ""),
      escapeCSVField(conv.rideContext?.from || ""),
      escapeCSVField(conv.rideContext?.to || ""),
      escapeCSVField(conv.rideContext?.type || ""),
    ].join(","),
  );
  const content = [header, ...rows].join("\n") + "\n";
  writeFileSync(CONVERSATIONS_FILE_PATH, content, "utf8");
};

// Helper functions
const getConversationId = (user1Id: string, user2Id: string): string => {
  // Create consistent conversation ID regardless of user order
  const sortedIds = [user1Id, user2Id].sort();
  return `conv_${sortedIds[0]}_${sortedIds[1]}`;
};

const findOrCreateConversation = (
  user1Id: string,
  user1Name: string,
  user2Id: string,
  user2Name: string,
  rideContext?: {
    rideId: string;
    from: string;
    to: string;
    type: string;
  },
): Conversation => {
  const conversations = loadConversations();
  const conversationId = getConversationId(user1Id, user2Id);

  let conversation = conversations.find((c) => c.id === conversationId);

  if (!conversation) {
    conversation = {
      id: conversationId,
      user1Id,
      user1Name,
      user2Id,
      user2Name,
      lastMessage: "",
      lastMessageTime: new Date().toISOString(),
      unreadCount1: 0,
      unreadCount2: 0,
      rideContext,
    };
    conversations.push(conversation);
    saveConversations(conversations);
  }

  return conversation;
};

// Middleware to verify authentication
const verifyAuth = async (
  req: any,
): Promise<{ userId: string; userName: string } | null> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);

    // Load sessions and verify token using direct fs operations
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

// API Endpoints
export const getUserConversations: RequestHandler = async (req, res) => {
  try {
    initializeMessageFiles();

    const auth = await verifyAuth(req);
    if (!auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const conversations = loadConversations();
    const userConversations = conversations
      .filter((c) => c.user1Id === auth.userId || c.user2Id === auth.userId)
      .map((c) => {
        const isUser1 = c.user1Id === auth.userId;
        return {
          id: c.id,
          otherUserId: isUser1 ? c.user2Id : c.user1Id,
          otherUserName: isUser1 ? c.user2Name : c.user1Name,
          lastMessage: c.lastMessage,
          lastMessageTime: c.lastMessageTime,
          unreadCount: isUser1 ? c.unreadCount1 : c.unreadCount2,
          rideContext: c.rideContext,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime(),
      );

    res.json({ conversations: userConversations });
  } catch (error) {
    console.error("Error getting conversations:", error);
    res.status(500).json({ error: "Failed to get conversations" });
  }
};

export const getConversationMessages: RequestHandler = async (req, res) => {
  try {
    initializeMessageFiles();

    const auth = await verifyAuth(req);
    if (!auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { conversationId } = req.params;
    const messages = loadMessages();
    const conversationMessages = messages
      .filter((m) => m.conversationId === conversationId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    // Mark messages as read
    let hasUpdates = false;
    conversationMessages.forEach((msg) => {
      if (msg.receiverId === auth.userId && !msg.isRead) {
        msg.isRead = true;
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      saveMessages(messages);

      // Update conversation unread count
      const conversations = loadConversations();
      const conversation = conversations.find((c) => c.id === conversationId);
      if (conversation) {
        if (conversation.user1Id === auth.userId) {
          conversation.unreadCount1 = 0;
        } else {
          conversation.unreadCount2 = 0;
        }
        saveConversations(conversations);
      }
    }

    res.json({ messages: conversationMessages });
  } catch (error) {
    console.error("Error getting messages:", error);
    res.status(500).json({ error: "Failed to get messages" });
  }
};

export const sendMessage: RequestHandler = async (req, res) => {
  try {
    initializeMessageFiles();

    const auth = await verifyAuth(req);
    if (!auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { receiverId, receiverName, content } = req.body;

    if (!receiverId || !receiverName || !content?.trim()) {
      return res
        .status(400)
        .json({ error: "Receiver ID, name, and message content are required" });
    }

    // Create or get conversation
    const conversation = findOrCreateConversation(
      auth.userId,
      auth.userName,
      receiverId,
      receiverName,
    );

    // Create message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const newMessage: Message = {
      id: messageId,
      conversationId: conversation.id,
      senderId: auth.userId,
      senderName: auth.userName,
      receiverId,
      receiverName,
      content: content.trim(),
      timestamp,
      isRead: false,
    };

    // Save message
    const messages = loadMessages();
    messages.push(newMessage);
    saveMessages(messages);

    // Update conversation
    const conversations = loadConversations();
    const convIndex = conversations.findIndex((c) => c.id === conversation.id);
    if (convIndex !== -1) {
      conversations[convIndex].lastMessage = content.trim();
      conversations[convIndex].lastMessageTime = timestamp;

      // Increment unread count for receiver
      if (conversations[convIndex].user1Id === receiverId) {
        conversations[convIndex].unreadCount1++;
      } else {
        conversations[convIndex].unreadCount2++;
      }

      saveConversations(conversations);
    }

    console.log(`Message sent from ${auth.userName} to ${receiverName}`);

    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

export const startConversation: RequestHandler = async (req, res) => {
  try {
    initializeMessageFiles();

    const auth = await verifyAuth(req);
    if (!auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { otherUserId, otherUserName, rideContext } = req.body;

    if (!otherUserId || !otherUserName) {
      return res
        .status(400)
        .json({ error: "Other user ID and name are required" });
    }

    if (otherUserId === auth.userId) {
      return res
        .status(400)
        .json({ error: "Cannot start conversation with yourself" });
    }

    // Create or get conversation
    const conversation = findOrCreateConversation(
      auth.userId,
      auth.userName,
      otherUserId,
      otherUserName,
      rideContext,
    );

    res.json({ success: true, conversationId: conversation.id });
  } catch (error) {
    console.error("Error starting conversation:", error);
    res.status(500).json({ error: "Failed to start conversation" });
  }
};
