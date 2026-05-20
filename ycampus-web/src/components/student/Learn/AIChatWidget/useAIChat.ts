import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

export type ChatMessage = {
  id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
  feedback?: 'positive' | 'negative';
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

const useAIChat = (config?: { getContext?: () => string; persistenceKey?: string; chatTitle?: string; userName?: string }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(config?.persistenceKey || null);
  const [history, setHistory] = useState<{ key: string; title: string; date: string }[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [activeStream, setActiveStream] = useState<{ id: string; content: string } | null>(null);

  const persistenceKey = config?.persistenceKey;
  const getContext = config?.getContext;
  const chatTitle = config?.chatTitle || 'Chat Session';
  const userName = config?.userName || 'Student';

  // Sync activeKey with persistenceKey prop changes
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
      list = list.filter(i => i.key !== key);
      list.unshift({ key, title, date: new Date().toISOString() });
      if (list.length > 20) list = list.slice(0, 20);
      localStorage.setItem('yuvro_chat_index', JSON.stringify(list));
      setHistory(list);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Persistence: always start fresh when the key changes
  useEffect(() => {
    if (activeKey) {
      setSessionId(null);
      setMessages([]);
      setLoadedKey(activeKey);
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

  useEffect(() => {
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

  const getPageContentSnippet = () => {
    let contextParts: string[] = [];
    if (getContext) {
      const explicitContext = getContext();
      if (explicitContext) {
        contextParts.push(`--- EXPLICIT CONTEXT ---\n${explicitContext}`);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const aiContextElements = document.querySelectorAll('[data-ai-context="true"]');
        if (aiContextElements.length > 0) {
          contextParts.push(`--- PAGE CONTEXT ---`);
          aiContextElements.forEach((el, index) => {
            const label = el.getAttribute('data-ai-context-label');
            const content = (el as HTMLElement).innerText?.trim();
            if (content) {
              contextParts.push(label ? `[${label}]:\n${content}` : `[Section ${index + 1}]:\n${content}`);
            }
          });
        }
      } catch (e) {
        console.warn("Failed to gather AI context from DOM", e);
      }
    }
    const combinedContext = contextParts.join('\n\n');
    return combinedContext ? combinedContext.slice(0, 3800) : '';
  };

  useEffect(() => {
    const generatePrompts = () => {
      const context = getPageContentSnippet();
      const newPrompts: string[] = [];
      if (!context) {
        setSuggestedPrompts(['How does this work?', 'What can you help me with?']);
        return;
      }
      const lowerContext = context.toLowerCase();
      if (lowerContext.includes('error:') || lowerContext.includes('exception') || lowerContext.includes('failed')) {
        newPrompts.push('Explain this error', 'How can I fix this code?');
      }
      if (lowerContext.includes('test case') || lowerContext.includes('actual output')) {
         newPrompts.push('Why did this test case fail?', 'Give me a hint for this problem');
      }
      if (lowerContext.includes('problem:') || lowerContext.includes('description:')) {
         newPrompts.push('Write full code solution', 'What is the best approach?', 'Give me a hint');
      }
      if (newPrompts.length === 0) {
        newPrompts.push('Can you review my code?', 'Explain this snippet to me');
      }
      setSuggestedPrompts(Array.from(new Set(newPrompts)).slice(0, 3));
    };
    const timer = setTimeout(generatePrompts, 500);
    return () => clearTimeout(timer);
  }, [getContext, activeKey]);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const agentId = selectedAgent ?? agents[0]?.id ?? null;
    if (!agentId) {
      const localId = `local-${uuidv4()}`;
      setSessionId(localId);
      return localId;
    }
    try {
      const page_content = getPageContentSnippet();
      const payload: any = { ai_agent: agentId, page: 'learn', title: 'AI Tutor Chat', page_content };
      const res = await restApiAuthUtil.post<SessionResponse>('/sessions/', payload);
      if (res && res.id) {
        setSessionId(res.id);
        return res.id;
      }
    } catch (err) {
      console.error('Failed to create session', err);
    }
    const localId = `local-${uuidv4()}`;
    setSessionId(localId);
    return localId;
  }, [sessionId, selectedAgent, agents]);

  const sendMessage = useCallback(async (content: string) => {
    const assistantMsgId = `srv-${uuidv4()}`;
    const userMsg: ChatMessage = { id: `local-${uuidv4()}`, message_type: 'user', content, created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg, { id: assistantMsgId, message_type: 'assistant', content: '', created_at: new Date().toISOString() }]);
    setIsLoading(true);

    try {
      const sid = await ensureSession();
      const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL || '/api';
      const endpoint = (sid && !sid.startsWith('local-')) ? `${baseUrl}/sessions/${sid}/send_message/` : `${baseUrl}/chat/quick_chat/`;

      const payload = { message: content, temperature: 0.7, max_tokens: 4096, page_content: getPageContentSnippet(), stream: true, ...(sid && !sid.startsWith('local-') ? {} : { ai_agent_id: selectedAgent ?? agents[0]?.id ?? null }) };

      const streamingBufferRef = { current: '' };
      const displayedBufferRef = { current: '' };
      let isStreamingDone = false;
      let hasReceivedFirstToken = false;
      let typingTimer: any = null;
      let finalData: any = null;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('ReadableStream not supported.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const processTyping = () => {
        if (typingTimer) return;
        const tick = () => {
          const target = streamingBufferRef.current;
          const current = displayedBufferRef.current;
          if (current.length < target.length) {
            const backlog = target.length - current.length;
            const increment = backlog > 300 ? 12 : (backlog > 100 ? 4 : (backlog > 20 ? 2 : 1));
            const next = target.slice(0, current.length + increment);
            displayedBufferRef.current = next;
            setActiveStream({ id: assistantMsgId, content: next });
            setMessages((m) => m.map(msg => msg.id === assistantMsgId ? { ...msg, content: next } : msg));
            typingTimer = setTimeout(tick, backlog > 100 ? 5 : 20);
          } else {
            typingTimer = null;
            if (isStreamingDone && finalData) {
               setMessages((m) => m.map((msg) => msg.id === assistantMsgId ? { ...msg, id: finalData.message_id || msg.id, content: streamingBufferRef.current } : msg));
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
        while ((newlineIndex = buffer.indexOf('\n\n')) >= 0) {
          const rawMessage = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 2);
          if (rawMessage.startsWith('data: ')) {
            try {
              const dataStr = rawMessage.substring(6).trim();
              if (dataStr === '[DONE]') continue;
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
              }
            } catch (e) { console.error("Parse error:", e); }
          }
        }
      }
    } catch (err) {
      console.error('Streaming failed', err);
      setMessages((m) => m.map((msg) => msg.id === assistantMsgId ? { ...msg, content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` } : msg));
    } finally {
      setIsLoading(false);
    }
  }, [ensureSession, selectedAgent, agents]);

  const clearMessages = useCallback(() => setMessages([]), []);
  const provideFeedback = useCallback(async (messageId: string, isPositive: boolean) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: isPositive ? 'positive' : 'negative' } : m));
    if (sessionId && !sessionId.startsWith('local-')) {
      try {
        await restApiAuthUtil.post(`/sessions/${sessionId}/messages/${messageId}/feedback/`, { feedback: isPositive ? 1 : -1 });
      } catch (err) { console.error('Failed to send feedback', err); }
    }
  }, [sessionId]);

  return { messages, isLoading, sendMessage, agents, selectedAgent, setSelectedAgent, clearMessages, history, loginToSession: (key: string) => setActiveKey(key), suggestedPrompts, provideFeedback, activeStream } as const;
};

export default useAIChat;
