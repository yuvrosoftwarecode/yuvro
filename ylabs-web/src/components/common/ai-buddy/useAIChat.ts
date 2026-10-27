import { useCallback, useEffect, useState } from "react";
import { yhubApiAuthUtil } from "@/utils/RestApiAuthUtil";
import { creditEvents } from "@/context/creditEvents";

const uuidv4 = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export type ChatMessage = {
  id: string;
  message_type: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
};

type ChatSessionSummary = {
  id: string;
  title?: string;
  created_at?: string;
  [key: string]: unknown;
};

type Agent = { id: string; name: string };

const useAIChat = (config?: {
  getContext?: () => string;
  persistenceKey?: string;
  chatTitle?: string;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [activeStream, setActiveStream] = useState<{ id: string; content: string } | null>(null);

  const getContext = config?.getContext;
  const persistenceKey = config?.persistenceKey;

  useEffect(() => {
    const storageKey = persistenceKey
      ? `ai-mentor-session-${persistenceKey}`
      : "ai-mentor-session-default";

    const initSession = async () => {
      setMessages([]);
      setSessionId(null);

      const savedSessionId = localStorage.getItem(storageKey);
      if (savedSessionId) {
        try {
          const data = await yhubApiAuthUtil.get<{ id: string; messages: ChatMessage[] }>(
            `/sessions/${savedSessionId}/`,
          );
          if (data && data.id) {
            setSessionId(data.id);
            if (data.messages && Array.isArray(data.messages)) {
              setMessages(data.messages);
            }
          } else {
            localStorage.removeItem(storageKey);
          }
        } catch (e) {
          console.warn("Failed to load saved session", e);
          localStorage.removeItem(storageKey);
        }
      }
    };

    initSession();
  }, [persistenceKey]);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await yhubApiAuthUtil.get<Agent[]>("/agents/");
        if (Array.isArray(data)) {
          setAgents(data);
        }
      } catch (error) {
        console.warn("Failed to fetch agents", error);
      }
    };

    loadAgents();
  }, []);

  useEffect(() => {
    const context = getContext?.()?.toLowerCase() || "";

    if (!context) {
      setSuggestedPrompts([
        "Summarize this topic",
        "Give me key points",
        "Ask me a quick question",
      ]);
      return;
    }

    if (context.includes("video")) {
      setSuggestedPrompts([
        "Explain this video in simple terms",
        "Give me 3 revision points",
        "Ask me a quiz question",
      ]);
      return;
    }

    if (context.includes("note") || context.includes("material")) {
      setSuggestedPrompts([
        "Summarize the material",
        "Create short revision notes",
        "Generate practice questions",
      ]);
      return;
    }

    setSuggestedPrompts([
      "Explain this topic",
      "Give me key formulas",
      "What should I revise first?",
    ]);
  }, [getContext, persistenceKey]);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;

    try {
      const selectedAgent = agents[0]?.id;
      if (!selectedAgent) {
        const localId = `local-${uuidv4()}`;
        setSessionId(localId);
        return localId;
      }

      const response = await yhubApiAuthUtil.post<{ id: string }>("/sessions/", {
        ai_agent: selectedAgent,
        page: "learn",
        title: config?.chatTitle || "AI Mentor Chat",
        page_content: getContext?.() || "",
      });

      if (response?.id) {
        setSessionId(response.id);
        const storageKey = persistenceKey
          ? `ai-mentor-session-${persistenceKey}`
          : "ai-mentor-session-default";
        localStorage.setItem(storageKey, response.id);
        return response.id;
      }
    } catch (error) {
      console.warn("Failed to create AI session", error);
    }

    const fallbackSessionId = `local-${uuidv4()}`;
    setSessionId(fallbackSessionId);
    return fallbackSessionId;
  }, [agents, config?.chatTitle, getContext, sessionId]);

  const sendMessage = useCallback(
    async (content: string) => {
      const assistantMsgId = `srv-${uuidv4()}`;
      const userMessage: ChatMessage = {
        id: `user-${uuidv4()}`,
        message_type: "user",
        content,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [
        ...prev,
        userMessage,
        {
          id: assistantMsgId,
          message_type: "assistant",
          content: "",
          created_at: new Date().toISOString(),
        },
      ]);
      setIsLoading(true);

      try {
        const sid = await ensureSession();
        const baseUrl =
          import.meta.env.VITE_YHUB_BACKEND_API_BASE_URL ||
          import.meta.env.VITE_BACKEND_API_BASE_URL ||
          "/api";
        const endpoint =
          sid && !sid.startsWith("local-")
            ? `${baseUrl}/sessions/${sid}/send_message/`
            : `${baseUrl}/chat/quick_chat/`;

        const payload = {
          message: content,
          temperature: 0.7,
          max_tokens: 4096,
          page_content: getContext?.() || "",
          stream: true,
          ...(sid && !sid.startsWith("local-") ? {} : { ai_agent_id: agents[0]?.id ?? null }),
        };

        const streamingBufferRef = { current: "" };
        const displayedBufferRef = { current: "" };
        let isStreamingDone = false;
        let hasReceivedFirstToken = false;
        let hasEmittedInsufficient = false;
        let typingTimer: ReturnType<typeof setTimeout> | null = null;
        let finalData: Record<string, unknown> | null = null;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access")}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          if (response.status === 402) {
            let errPayload: Record<string, unknown> = {};
            try {
              errPayload = await response.json();
            } catch {
              // ignore JSON parse failure
            }
            const available =
              typeof errPayload?.available === "number" ? errPayload.available : undefined;
            const required =
              typeof errPayload?.required === "number" ? errPayload.required : undefined;
            const message =
              errPayload?.message ||
              errPayload?.detail ||
              "Insufficient credits to start AI session.";

            setMessages((m) => m.filter((msg) => msg.id !== assistantMsgId));
            creditEvents.emitInsufficient({ available, required, message });
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!response.body) throw new Error("ReadableStream not supported.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        const processTyping = () => {
          if (typingTimer) return;
          const tick = () => {
            const target = streamingBufferRef.current;
            const current = displayedBufferRef.current;
            if (current.length < target.length) {
              const backlog = target.length - current.length;
              const increment = backlog > 300 ? 12 : backlog > 100 ? 4 : backlog > 20 ? 2 : 1;
              const next = target.slice(0, current.length + increment);
              displayedBufferRef.current = next;
              setActiveStream({ id: assistantMsgId, content: next });
              setMessages((m) =>
                m.map((msg) => (msg.id === assistantMsgId ? { ...msg, content: next } : msg)),
              );
              typingTimer = setTimeout(tick, backlog > 100 ? 5 : 20);
            } else {
              typingTimer = null;
              if (isStreamingDone && finalData) {
                setMessages((m) =>
                  m.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          id: finalData.message_id || msg.id,
                          content: streamingBufferRef.current,
                        }
                      : msg,
                  ),
                );
                setActiveStream(null);
              }
            }
          };
          tick();
        };

        while (true) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) break;
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf("\n\n")) >= 0) {
            const rawMessage = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 2);
            if (rawMessage.startsWith("data: ")) {
              try {
                const dataStr = rawMessage.substring(6).trim();
                if (dataStr === "[DONE]") continue;
                const data = JSON.parse(dataStr);
                if (data.chunk) {
                  if (!hasReceivedFirstToken) {
                    hasReceivedFirstToken = true;
                    streamingBufferRef.current = data.chunk;
                    processTyping();
                  } else {
                    streamingBufferRef.current += data.chunk;
                    if (!typingTimer) processTyping();
                  }
                } else if (data.done) {
                  isStreamingDone = true;
                  finalData = data;
                  if (data.credits_used !== undefined && typeof data.credits_used === "number") {
                    creditEvents.emitRefresh();
                  }
                } else if (data.error || data.error_code === "insufficient_credits") {
                  if (data.error_code === "insufficient_credits") {
                    if (!hasEmittedInsufficient) {
                      hasEmittedInsufficient = true;
                      const available =
                        typeof data.available === "number" ? data.available : undefined;
                      const required =
                        typeof data.required === "number" ? data.required : undefined;
                      const message =
                        typeof data.error === "string"
                          ? data.error
                          : "Insufficient credits to continue response.";
                      creditEvents.emitInsufficient({ available, required, message });
                    }
                    setMessages((m) =>
                      m.map((msg) =>
                        msg.id === assistantMsgId
                          ? {
                              ...msg,
                              content: streamingBufferRef.current
                                ? `${streamingBufferRef.current}\n\n*(Session paused: insufficient credits)*`
                                : "Session paused: insufficient credits.",
                            }
                          : msg,
                      ),
                    );
                  } else {
                    console.error("Backend sent error in stream:", data.error);
                    setMessages((m) =>
                      m.map((msg) =>
                        msg.id === assistantMsgId
                          ? { ...msg, content: "Error: " + data.error }
                          : msg,
                      ),
                    );
                  }
                  isStreamingDone = true;
                  setActiveStream(null);
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }
        }
      } catch (error) {
        const assistantMessage: ChatMessage = {
          id: `assistant-${uuidv4()}`,
          message_type: "assistant",
          content: "I hit an error while processing your request. Please try again.",
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        console.error("AI chat failed", error);
      } finally {
        setIsLoading(false);
      }
    },
    [ensureSession, getContext, agents],
  );

  const startNewChat = useCallback(() => {
    const storageKey = persistenceKey
      ? `ai-mentor-session-${persistenceKey}`
      : "ai-mentor-session-default";
    localStorage.removeItem(storageKey);
    setSessionId(null);
    setMessages([]);
  }, [persistenceKey]);

  const [sessionHistory, setSessionHistory] = useState<ChatSessionSummary[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await yhubApiAuthUtil.get<ChatSessionSummary[]>("/sessions/");
      if (Array.isArray(data)) {
        setSessionHistory(data);
      }
    } catch (error) {
      console.warn("Failed to fetch session history", error);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const loadSession = useCallback(
    async (id: string) => {
      const storageKey = persistenceKey
        ? `ai-mentor-session-${persistenceKey}`
        : "ai-mentor-session-default";
      try {
        const data = await yhubApiAuthUtil.get<{ id: string; messages: ChatMessage[] }>(
          `/sessions/${id}/`,
        );
        if (data && data.id) {
          setSessionId(data.id);
          localStorage.setItem(storageKey, data.id);
          setMessages(data.messages || []);
        }
      } catch (e) {
        console.warn("Failed to load session", e);
      }
    },
    [persistenceKey],
  );

  return {
    messages,
    sendMessage,
    isLoading,
    suggestedPrompts,
    activeStream,
    startNewChat,
    sessionHistory,
    fetchHistory,
    loadSession,
  };
};

export default useAIChat;
