import { useCallback, useState, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import { fetchConversationToken } from "../lib/tokens";

type ConversationStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

interface UseSpeechConversationOptions {
  onError?: (message: string) => void;
  onStatusChange?: (status: ConversationStatus) => void;
}

interface UseSpeechConversationReturn {
  status: ConversationStatus;
  toggleConversation: () => Promise<void>;
  isTransitioning: boolean;
  errorMessage: string;
  clearError: () => void;
}

export function useSpeechConversation({
  onError,
  onStatusChange,
}: UseSpeechConversationOptions = {}): UseSpeechConversationReturn {
  const conversation = useConversation();
  const [localStatus, setLocalStatus] = useState<ConversationStatus>(
    (conversation.status as ConversationStatus) || "disconnected"
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const activeRef = useRef(false);

  const handleStatusChange = useCallback(
    (s: ConversationStatus) => {
      setLocalStatus(s);
      setIsTransitioning(false);
      onStatusChange?.(s);
    },
    [onStatusChange]
  );

  const handleError = useCallback(
    (message: string) => {
      setErrorMessage(message);
      setLocalStatus("error");
      setIsTransitioning(false);
      onError?.(message);
    },
    [onError]
  );

  const toggleConversation = useCallback(async () => {
    // Prevent concurrent calls
    if (activeRef.current) return;

    if (conversation.status === "connected") {
      conversation.endSession();
      handleStatusChange("disconnected");
      return;
    }

    activeRef.current = true;
    setErrorMessage("");
    setIsTransitioning(true);
    handleStatusChange("connecting");

    try {
      // Fetch the WebRTC conversation token from our token server
      const token = await fetchConversationToken();

      conversation.startSession({
        conversationToken: token,
        connectionType: "webrtc",
        onConnect: () => {
          activeRef.current = false;
          handleStatusChange("connected");
        },
        onDisconnect: () => {
          activeRef.current = false;
          handleStatusChange("disconnected");
        },
        onError: (err: unknown) => {
          activeRef.current = false;
          const msg = err instanceof Error ? err.message : String(err);
          handleError(msg);
        },
      });
    } catch (err) {
      activeRef.current = false;
      const msg = err instanceof Error ? err.message : "Connection failed";
      handleError(msg);
    }
  }, [conversation, handleStatusChange, handleError]);

  const clearError = useCallback(() => {
    setErrorMessage("");
    setLocalStatus("disconnected");
  }, []);

  return {
    status: localStatus,
    toggleConversation,
    isTransitioning,
    errorMessage,
    clearError,
  };
}