import { useState, useCallback, useEffect } from 'react';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

// Use crypto.randomUUID() instead of uuid package
const uuidv4 = () => crypto.randomUUID();

export type ChatMessage = {
  id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
};

export type ChatResponse = {
  chat_session_id?: string;
  message_id?: string;
  response: string;
  tokens_used?: number;
  response_time_ms?: number;
  metadata?: any;
};

export type SessionResponse = {
  id: string;
  [key: string]: any;
};

export type Agent = { id: string; name: string; provider?: string };

const useAIChat = (config?: { getContext?: () => string; persistenceKey?: string; chatTitle?: string }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(config?.persistenceKey || null);
  const [history, setHistory] = useState<{ key: string; title: string; date: string }[]>([]);

  const persistenceKey = config?.persistenceKey;
  const getContext = config?.getContext;
  const chatTitle = config?.chatTitle || 'Chat Session';

  // Sync activeKey with persistenceKey prop changes (e.g. switching problems)
  useEffect(() => {
    if (persistenceKey) {
      setActiveKey(persistenceKey);
    }
  }, [persistenceKey]);

  // Load history index
  useEffect(() => {
    try {
      const idx = localStorage.getItem('yuvro_chat_index');
      if (idx) {
        setHistory(JSON.parse(idx));
      }
    } catch (e) { console.error(e); }
  }, []);

  const updateHistoryIndex = useCallback((key: string, title: string) => {
    try {
      const idx = localStorage.getItem('yuvro_chat_index');
      let list: { key: string; title: string; date: string }[] = idx ? JSON.parse(idx) : [];
      // Remove existing entry for this key to update it to top
      list = list.filter(i => i.key !== key);
      list.unshift({ key, title, date: new Date().toISOString() });
      // Limit to 20
      if (list.length > 20) list = list.slice(0, 20);
      localStorage.setItem('yuvro_chat_index', JSON.stringify(list));
      setHistory(list);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Persistence: Load messages when activeKey changes
  useEffect(() => {
    if (activeKey) {
      try {
        setSessionId(null); // Force reset session ID when key changes
        const stored = localStorage.getItem(activeKey);
        if (stored) {
          setMessages(JSON.parse(stored));
        } else {
          setMessages([]);
        }
        setLoadedKey(activeKey);
      } catch (e) {
        console.error("Failed to load chat history", e);
        setMessages([]);
        setLoadedKey(activeKey);
      }
    } else {
      setLoadedKey(null);
      setSessionId(null);
    }
  }, [activeKey]);

  // Persistence: Save messages
  useEffect(() => {
    if (activeKey && loadedKey === activeKey) {
      localStorage.setItem(activeKey, JSON.stringify(messages));
      if (messages.length > 0) {
        updateHistoryIndex(activeKey, chatTitle);
      }
    }
  }, [messages, activeKey, loadedKey, chatTitle, updateHistoryIndex]);

  const loadSession = useCallback((key: string) => {
    setActiveKey(key);
  }, []);

  const storedAccess = localStorage.getItem("access");
  if (storedAccess) {
    restApiAuthUtil.setAuthToken(storedAccess);
  }

  useEffect(() => {
    // Fetch available agents once
    const loadAgents = async () => {
      try {
        const data = await restApiAuthUtil.get<Agent[]>('/agents/');
        if (Array.isArray(data)) setAgents(data);
      } catch (err) {
        console.warn('Failed to fetch agents', err);
      }
    };
    loadAgents();
  }, []);

  // Helper: capture a trimmed page excerpt to ground the chat
  const getPageContentSnippet = () => {
    try {
      if (getContext) {
        return getContext().slice(0, 3800);
      }
      if (typeof window === 'undefined') return '';
      const text = (document.body && document.body.innerText) || (document.documentElement && document.documentElement.innerText) || '';
      // keep under backend truncation (4000 chars) with margin
      return text ? text.slice(0, 3800) : '';
    } catch (e) {
      return '';
    }
  };

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;

    const agentId = selectedAgent ?? agents[0]?.id ?? null;

    if (!agentId) {
      const localId = `local-${uuidv4()}`;
      setSessionId(localId);
      return localId;
    }

    // Create a new session on the backend
    try {
      const agentName = agents.find(a => a.id === agentId)?.name || 'AI';
      const page_content = getPageContentSnippet();
      // Use generic title to hide model details from student
      const payload: any = { ai_agent: agentId, page: 'learn', title: 'AI Tutor Chat', page_content };
      const res = await restApiAuthUtil.post<SessionResponse>('/sessions/', payload);
      if (res && res.id) {
        setSessionId(res.id);
        return res.id;
      }
    } catch (err) {
      console.error('Failed to create session', err);
    }

    // fallback to a client-only session id
    const localId = `local-${uuidv4()}`;
    setSessionId(localId);
    return localId;
  }, [sessionId, selectedAgent, agents]);

  const sendMessage = useCallback(async (content: string) => {
    const id = `local-${uuidv4()}`;
    const userMsg: ChatMessage = { id, message_type: 'user', content, created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);

    setIsLoading(true);
    try {
      const sid = await ensureSession();

      // If we have a real session id (not client-local), use session send_message action
      if (sid && !sid.startsWith('local-')) {
        try {
          const page_content = getPageContentSnippet();
          const payload = { message: content, temperature: 0.7, max_tokens: 4096, page_content };
          const resp = await restApiAuthUtil.post<ChatResponse>(`/sessions/${sid}/send_message/`, payload);

          // Backend returns ChatResponseSerializer: { chat_session_id, message_id, response, ... }
          if (resp && resp.response) {
            setMessages((m) => [...m, { id: resp.message_id || `srv-${uuidv4()}`, message_type: 'assistant', content: resp.response, created_at: new Date().toISOString() }]);
          } else {
            setMessages((m) => [...m, { id: `srv-${uuidv4()}`, message_type: 'assistant', content: 'No response from AI.', created_at: new Date().toISOString() }]);
          }
        } catch (err) {
          console.error('Backend session message send failed', err);
          // fallback to quick chat
          const agentId = selectedAgent ?? agents[0]?.id ?? null;
          if (agentId) {
            try {
              const page_content = getPageContentSnippet();
              const resp = await restApiAuthUtil.post<ChatResponse>('/chat/quick_chat/', { ai_agent_id: agentId, message: content, temperature: 0.7, max_tokens: 4096, page_content });
              if (resp && resp.response) {
                setMessages((m) => [...m, { id: `srv-${uuidv4()}`, message_type: 'assistant', content: resp.response, created_at: new Date().toISOString() }]);
              }
            } catch (err2) {
              console.error('Quick chat fallback failed', err2);
              const errorMsg = (err2 instanceof Error) ? err2.message : 'Service unavailable. Try again later.';
              setMessages((m) => [...m, { id: `srv-${uuidv4()}`, message_type: 'assistant', content: errorMsg, created_at: new Date().toISOString() }]);
            }
          } else {
            setMessages((m) => [...m, { id: `srv-${uuidv4()}`, message_type: 'assistant', content: 'No AI agent available.', created_at: new Date().toISOString() }]);
          }
        }
      } else {
        // No persistent session - use quick_chat endpoint if agent available
        const agentId = selectedAgent ?? agents[0]?.id ?? null;
        if (agentId) {
          try {
            const page_content = getPageContentSnippet();
            const resp = await restApiAuthUtil.post<ChatResponse>('/chat/quick_chat/', { ai_agent_id: agentId, message: content, temperature: 0.7, max_tokens: 4096, page_content });
            if (resp && resp.response) {
              setMessages((m) => [...m, { id: `srv-${uuidv4()}`, message_type: 'assistant', content: resp.response, created_at: new Date().toISOString() }]);
            } else {
              setMessages((m) => [...m, { id: `srv-${uuidv4()}`, message_type: 'assistant', content: 'No response from AI.', created_at: new Date().toISOString() }]);
            }
          } catch (err) {
            console.error('Quick chat failed', err);
            const errorMsg = (err instanceof Error) ? err.message : 'Service unavailable. Try again later.';
            setMessages((m) => [...m, { id: `srv-${uuidv4()}`, message_type: 'assistant', content: errorMsg, created_at: new Date().toISOString() }]);
          }
        } else {
          setMessages((m) => [...m, { id: `srv-${uuidv4()}`, message_type: 'assistant', content: 'No AI agent available.', created_at: new Date().toISOString() }]);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [ensureSession]);

  const clearMessages = useCallback(() => setMessages([]), []);

  return {
    messages,
    isLoading,
    sendMessage,
    agents,
    selectedAgent,
    setSelectedAgent,
    clearMessages,
    history,
    loadSession,
  } as const;
};

export default useAIChat;
