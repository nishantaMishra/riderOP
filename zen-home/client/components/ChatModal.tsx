import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Send,
  MessageCircle,
  User,
  ArrowLeft,
  Clock,
  CheckCheck,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
  otherUserId: string;
  otherUserName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  rideContext?: {
    rideId: string;
    from: string;
    to: string;
    type: string;
  };
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOtherUserId?: string;
  initialOtherUserName?: string;
  rideContext?: {
    rideId: string;
    from: string;
    to: string;
    type: string;
  };
}

type ChatView = "conversations" | "chat";

export const ChatModal = ({
  isOpen,
  onClose,
  initialOtherUserId,
  initialOtherUserName,
  rideContext,
}: ChatModalProps) => {
  const [view, setView] = useState<ChatView>("conversations");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && isAuthenticated) {
      if (initialOtherUserId && initialOtherUserName) {
        // Start conversation with specific user
        startConversationWithUser(initialOtherUserId, initialOtherUserName);
      } else {
        // Load conversations list
        loadConversations();
      }
    }
  }, [
    isOpen,
    isAuthenticated,
    initialOtherUserId,
    initialOtherUserName,
    rideContext,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-refresh messages when in chat view
    let interval: NodeJS.Timeout;
    if (view === "chat" && currentConversation) {
      interval = setInterval(() => {
        loadMessages(currentConversation.id);
      }, 5000); // Refresh every 5 seconds
    }
    return () => clearInterval(interval);
  }, [view, currentConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth-token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/conversations", {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      } else {
        throw new Error("Failed to load conversations");
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          headers: getAuthHeaders(),
        },
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const startConversationWithUser = async (
    otherUserId: string,
    otherUserName: string,
  ) => {
    try {
      setLoading(true);

      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          otherUserId,
          otherUserName,
          rideContext,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const conversationId = data.conversationId;

        // Create temporary conversation object
        const tempConversation: Conversation = {
          id: conversationId,
          otherUserId,
          otherUserName,
          lastMessage: "",
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          rideContext,
        };

        setCurrentConversation(tempConversation);
        setView("chat");
        await loadMessages(conversationId);
      } else {
        throw new Error("Failed to start conversation");
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation || sending) return;

    try {
      setSending(true);

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          receiverId: currentConversation.otherUserId,
          receiverName: currentConversation.otherUserName,
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage("");
        await loadMessages(currentConversation.id);
        messageInputRef.current?.focus();
      } else {
        throw new Error("Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const openConversation = async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    setView("chat");
    await loadMessages(conversation.id);
  };

  const backToConversations = () => {
    setView("conversations");
    setCurrentConversation(null);
    setMessages([]);
    loadConversations();
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md h-[600px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {view === "chat" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={backToConversations}
                className="mr-2 p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <MessageCircle className="h-5 w-5 text-primary" />
            {view === "conversations"
              ? "Messages"
              : currentConversation?.otherUserName}
          </DialogTitle>
        </DialogHeader>

        {/* Ride Context Display for Chat View */}
        {view === "chat" && currentConversation?.rideContext && (
          <div className="flex-shrink-0 px-4 py-2 bg-accent/50 border-b">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-1.5 w-1.5 bg-primary rounded-full"></div>
              <span className="font-medium">
                {currentConversation.rideContext.type === "offering"
                  ? "Offering"
                  : "Seeking"}{" "}
                Ride:
              </span>
              <span className="text-foreground font-medium">
                {currentConversation.rideContext.from} →{" "}
                {currentConversation.rideContext.to}
              </span>
            </div>
          </div>
        )}

        {view === "conversations" ? (
          <div className="flex-1 flex flex-col min-h-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Loading conversations...
                  </p>
                </div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">No conversations yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Start a conversation by clicking "Message" on any ride card
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-2 p-1">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => openConversation(conversation)}
                      className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {conversation.otherUserName}
                            </p>
                            {conversation.rideContext && (
                              <p className="text-xs text-primary truncate mb-1">
                                {conversation.rideContext.type === "offering"
                                  ? "Offering"
                                  : "Seeking"}
                                :{conversation.rideContext.from} →{" "}
                                {conversation.rideContext.to}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground truncate">
                              {conversation.lastMessage ||
                                "Start a conversation"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {conversation.lastMessageTime && (
                            <p className="text-xs text-muted-foreground">
                              {formatMessageTime(conversation.lastMessageTime)}
                            </p>
                          )}
                          {conversation.unreadCount > 0 && (
                            <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-xs text-primary-foreground">
                                {conversation.unreadCount}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No messages yet. Send the first message!
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === user?.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.senderId === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <div
                          className={`flex items-center justify-end mt-1 space-x-1 ${
                            message.senderId === user?.id
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">
                            {formatMessageTime(message.timestamp)}
                          </span>
                          {message.senderId === user?.id && (
                            <CheckCheck
                              className={`h-3 w-3 ${
                                message.isRead
                                  ? "text-green-400"
                                  : "text-primary-foreground/50"
                              }`}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="flex-shrink-0 p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={sending}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  size="sm"
                  className="px-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
