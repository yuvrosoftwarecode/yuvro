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

type Agent = { id: string; name: string; provider?: string; model_name?: string };

const useAIChat = (config?: {
  getContext?: () => string;
  persistenceKey?: string;
  chatTitle?: string;
  selectedAgentId?: string | null;
  mode?: string;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [activeStream, setActiveStream] = useState<{ id: string; content: string } | null>(null);

  const getContext = config?.getContext;
  const persistenceKey = config?.persistenceKey;
  const selectedAgentId = config?.selectedAgentId;
  const mode = config?.mode || "ask";

  const getScopedStorageKey = useCallback(() => {
    const base = persistenceKey || "default";
    return `ai-mentor-session-${base}-${mode}`;
  }, [persistenceKey, mode]);

  useEffect(() => {
    const storageKey = getScopedStorageKey();

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
  }, [getScopedStorageKey]);

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
        "Start coding",
        "Show me an example",
        "Run tests",
      ]);
      return;
    }

    const prompts: string[] = [];

    if (context.includes("configure automated yuvro scoring rules") || context.includes("role: you are helping a recruiter")) {
      prompts.push("Create scoring rules for this task");
      prompts.push("Add edge-case assertions");
      prompts.push("Refine test & error messages");
      setSuggestedPrompts(prompts);
      return;
    }

    // Only show general contextual prompts (exclude repetitive test prompt actions)
    if (context.includes("code") || context.includes("function") || context.includes("class")) {
      prompts.push("Complete this code");
      prompts.push("Optimize performance");
      prompts.push("Add error handling");
    }
    // General fallback for ticket context
    else {
      prompts.push("Write the solution");
      prompts.push("Create a plan");
      prompts.push("Guide next steps");
    }
    setSuggestedPrompts(Array.from(new Set(prompts)).slice(0, 3));
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;

    try {
      const agentId = selectedAgentId || agents[0]?.id;
      if (!agentId) {
        const localId = `local-${uuidv4()}`;
        setSessionId(localId);
        return localId;
      }

      const response = await yhubApiAuthUtil.post<{ id: string }>("/sessions/", {
        ai_agent: agentId,
        page: "learn",
        title: config?.chatTitle || "AI Mentor Chat",
        page_content: getContext?.() || "",
        mode: mode || "ask",
      });

      if (response?.id) {
        setSessionId(response.id);
        const storageKey = getScopedStorageKey();
        localStorage.setItem(storageKey, response.id);
        return response.id;
      }
    } catch (error) {
      console.warn("Failed to create AI session", error);
    }

    const fallbackSessionId = `local-${uuidv4()}`;
    setSessionId(fallbackSessionId);
    return fallbackSessionId;
  }, [agents, selectedAgentId, config?.chatTitle, getContext, sessionId, mode, getScopedStorageKey]);

  const sendMessage = useCallback(
    async (content: string, extraContext?: string) => {
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

        const fullPageContent = [getContext?.() || "", extraContext || ""].filter(Boolean).join("\n\n");
        const payload = {
          message: content,
          temperature: 0.7,
          max_tokens: 4096,
          page_content: fullPageContent,
          stream: true,
          ai_agent_id: selectedAgentId || agents[0]?.id || null,
        };

        const streamingBufferRef = { current: "" };
        const displayedBufferRef = { current: "" };
        let isStreamingDone = false;
        let hasReceivedFirstToken = false;
        let hasEmittedInsufficient = false;
        let typingTimer: ReturnType<typeof setTimeout> | null = null;
        let finalData: Record<string, unknown> | null = null;

        // Get the token using yhubApiAuthUtil which handles token refresh
        let token = yhubApiAuthUtil.getAuthToken();
        if (!token) {
          console.error("No authentication token found. User may not be logged in.");
          const errorMsg = "Please log in to use AI Chat";
          setMessages((m) => m.filter((msg) => msg.id !== assistantMsgId));
          setMessages((prev) => [...prev, {
            id: `error-${uuidv4()}`,
            message_type: "assistant",
            content: errorMsg,
            created_at: new Date().toISOString(),
          }]);
          setIsLoading(false);
          return;
        }

        let response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        // Handle 401 with token refresh retry
        if (response.status === 401) {
          console.warn("Initial request returned 401. Attempting to refresh token...");
          try {
            const refreshed = await yhubApiAuthUtil.forceRefreshToken();
            if (refreshed) {
              const newToken = yhubApiAuthUtil.getAuthToken();
              if (newToken) {
                console.log("Token refreshed successfully. Retrying request...");
                response = await fetch(endpoint, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${newToken}`,
                  },
                  body: JSON.stringify(payload),
                });
              }
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
          }
        }

        if (!response.ok) {
          if (response.status === 401) {
            console.error("Authentication failed: Unable to authenticate. Please log in.");
            const errorMsg = "Please log in to use AI Chat";
            setMessages((m) => m.filter((msg) => msg.id !== assistantMsgId));
            setMessages((prev) => [...prev, {
              id: `error-${uuidv4()}`,
              message_type: "assistant",
              content: errorMsg,
              created_at: new Date().toISOString(),
            }]);
            setIsLoading(false);
            return;
          }
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
              typeof errPayload?.message === "string"
                ? errPayload.message
                : typeof errPayload?.detail === "string"
                ? errPayload.detail
                : "Insufficient credits to start AI session.";

            setMessages((m) => m.filter((msg) => msg.id !== assistantMsgId));
            creditEvents.emitInsufficient({ available, required, message });
            setIsLoading(false);
            return;
          }
          console.error("API Response Error:", response.status, response.statusText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!response.body) throw new Error("ReadableStream not supported.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let chunkCount = 0;

        console.log("Starting to read stream from endpoint:", endpoint);

        const processTyping = () => {
          if (typingTimer) return;
          const tick = () => {
            const target = streamingBufferRef.current;
            const current = displayedBufferRef.current;
            if (current.length < target.length) {
              const backlog = target.length - current.length;
              const increment =
                backlog > 400 ? 32 : backlog > 150 ? 16 : backlog > 50 ? 8 : backlog > 15 ? 4 : 2;
              const next = target.slice(0, current.length + increment);
              displayedBufferRef.current = next;
              setActiveStream({ id: assistantMsgId, content: next });
              setMessages((m) =>
                m.map((msg) => (msg.id === assistantMsgId ? { ...msg, content: next } : msg)),
              );
              typingTimer = setTimeout(tick, backlog > 50 ? 5 : 12);
            } else {
              typingTimer = null;
              if (isStreamingDone && finalData) {
                const finalMsgId = typeof finalData.message_id === "string" ? finalData.message_id : assistantMsgId;
                setMessages((m) =>
                  m.map((msg) =>
                    msg.id === assistantMsgId
                      ? {
                          ...msg,
                          id: finalMsgId,
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
          chunkCount++;
          if (value) {
            console.log(`Chunk ${chunkCount} received:`, value.length, "bytes");
          }
          if (readerDone) {
            console.log("Stream reader done after", chunkCount, "chunks. Final buffer:", buffer);
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf("\n\n")) >= 0) {
            const rawMessage = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 2);
            if (rawMessage.startsWith("data: ")) {
              try {
                const dataStr = rawMessage.substring(6).trim();
                if (dataStr === "[DONE]") {
                  console.log("Stream completed with [DONE]");
                  isStreamingDone = true;
                  continue;
                }
                const data = JSON.parse(dataStr);
                console.log("Received stream data:", data);
                
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
                  console.log("Stream marked as done");
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
                    const errorText = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
                    const finalErrContent = (streamingBufferRef.current ? `${streamingBufferRef.current}\n\n` : "") + errorText;
                    setMessages((m) =>
                      m.map((msg) =>
                        msg.id === assistantMsgId
                          ? { ...msg, content: finalErrContent }
                          : msg,
                      ),
                    );
                  }
                  isStreamingDone = true;
                  setActiveStream(null);
                  setIsLoading(false);
                }
              } catch (e) {
                console.error("Parse error:", e, "Raw message:", rawMessage);
              }
            }
          }
        }

        // Ensure final state is set
        if (streamingBufferRef.current && !isStreamingDone) {
          console.log("Stream ended but finalizing buffered content");
          isStreamingDone = true;
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: streamingBufferRef.current }
                : msg,
            ),
          );
          setActiveStream(null);
        }
      } catch (error: any) {
        const errorText = error?.message || "I hit an error while processing your request. Please try again.";
        const assistantMessage: ChatMessage = {
          id: `assistant-${uuidv4()}`,
          message_type: "assistant",
          content: `Error: ${errorText}`,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        console.error("AI chat failed", error);
      } finally {
        setIsLoading(false);
      }
    },
    [ensureSession, getContext, agents, selectedAgentId],
  );

  const startNewChat = useCallback(() => {
    const storageKey = getScopedStorageKey();
    localStorage.removeItem(storageKey);
    setSessionId(null);
    setMessages([]);
  }, [getScopedStorageKey]);

  const [sessionHistory, setSessionHistory] = useState<ChatSessionSummary[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const url = mode ? `/sessions/?mode=${encodeURIComponent(mode)}` : "/sessions/";
      const data = await yhubApiAuthUtil.get<ChatSessionSummary[]>(url);
      if (Array.isArray(data)) {
        setSessionHistory(data);
      }
    } catch (error) {
      console.warn("Failed to fetch session history", error);
    }
  }, [mode]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const loadSession = useCallback(
    async (id: string) => {
      const storageKey = getScopedStorageKey();
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
    [getScopedStorageKey],
  );

  return {
    messages,
    setMessages,
    sendMessage,
    isLoading,
    suggestedPrompts,
    activeStream,
    setActiveStream,
    startNewChat,
    sessionHistory,
    fetchHistory,
    loadSession,
    agents,
    sessionId,
    setSessionId,
  };
};

export default useAIChat;
