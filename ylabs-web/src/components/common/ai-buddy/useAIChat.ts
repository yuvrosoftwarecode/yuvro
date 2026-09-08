import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { yhubApiAuthUtil } from '@/utils/RestApiAuthUtil';

export type ChatMessage = {
  id: string;
  message_type: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
};

type Agent = { id: string; name: string };

const useAIChat = (config?: { getContext?: () => string; persistenceKey?: string; chatTitle?: string }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [activeStream, setActiveStream] = useState<{ id: string; content: string } | null>(null);

  const getContext = config?.getContext;
  const persistenceKey = config?.persistenceKey;

  useEffect(() => {
    if (persistenceKey) {
      setMessages([]);
      setSessionId(null);
    }
  }, [persistenceKey]);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await yhubApiAuthUtil.get<Agent[]>('/agents/');
        if (Array.isArray(data)) {
          setAgents(data);
        }
      } catch (error) {
        console.warn('Failed to fetch agents', error);
      }
    };

    loadAgents();
  }, []);

  useEffect(() => {
    const context = getContext?.()?.toLowerCase() || '';

    if (!context) {
      setSuggestedPrompts(['Summarize this topic', 'Give me key points', 'Ask me a quick question']);
      return;
    }

    if (context.includes('video')) {
      setSuggestedPrompts(['Explain this video in simple terms', 'Give me 3 revision points', 'Ask me a quiz question']);
      return;
    }

    if (context.includes('note') || context.includes('material')) {
      setSuggestedPrompts(['Summarize the material', 'Create short revision notes', 'Generate practice questions']);
      return;
    }

    setSuggestedPrompts(['Explain this topic', 'Give me key formulas', 'What should I revise first?']);
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

      const response = await yhubApiAuthUtil.post<{ id: string }>('/sessions/', {
        ai_agent: selectedAgent,
        page: 'learn',
        title: config?.chatTitle || 'AI Mentor Chat',
        page_content: getContext?.() || '',
      });

      if (response?.id) {
        setSessionId(response.id);
        return response.id;
      }
    } catch (error) {
      console.warn('Failed to create AI session', error);
    }

    const fallbackSessionId = `local-${uuidv4()}`;
    setSessionId(fallbackSessionId);
    return fallbackSessionId;
  }, [agents, config?.chatTitle, getContext, sessionId]);

  const sendMessage = useCallback(async (content: string) => {
    const assistantMsgId = `srv-${uuidv4()}`;
    const userMessage: ChatMessage = {
      id: `user-${uuidv4()}`,
      message_type: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, { id: assistantMsgId, message_type: 'assistant', content: '', created_at: new Date().toISOString() }]);
    setIsLoading(true);

    try {
      const sid = await ensureSession();
      const baseUrl = import.meta.env.VITE_YHUB_BACKEND_API_BASE_URL || import.meta.env.VITE_BACKEND_API_BASE_URL || '/api';
      const endpoint = (sid && !sid.startsWith('local-')) ? `${baseUrl}/sessions/${sid}/send_message/` : `${baseUrl}/chat/quick_chat/`;

      const payload = { message: content, temperature: 0.7, max_tokens: 4096, page_content: getContext?.() || '', stream: true, ...(sid && !sid.startsWith('local-') ? {} : { ai_agent_id: agents[0]?.id ?? null }) };

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
    } catch (error) {
      const assistantMessage: ChatMessage = {
        id: `assistant-${uuidv4()}`,
        message_type: 'assistant',
        content: 'I hit an error while processing your request. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      console.error('AI chat failed', error);
    } finally {
      setIsLoading(false);
    }
  }, [ensureSession, getContext, agents]);

  return {
    messages,
    sendMessage,
    isLoading,
    suggestedPrompts,
    activeStream,
  };
};

export default useAIChat;
