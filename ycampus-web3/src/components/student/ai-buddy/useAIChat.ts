import { useCallback, useEffect, useState } from 'react';
import restApiAuthUtil from '@/utils/RestApiAuthUtil';

const uuidv4 = () => crypto.randomUUID();

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
        const data = await restApiAuthUtil.get<Agent[]>('/agents/');
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

      const response = await restApiAuthUtil.post<{ id: string }>('/sessions/', {
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
    const userMessage: ChatMessage = {
      id: `user-${uuidv4()}`,
      message_type: 'user',
      content,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const sid = await ensureSession();
      let assistantText = '';

      if (sid.startsWith('local-')) {
        assistantText = 'I am ready to help. Please retry once the AI service is available.';
      } else {
        const response = await restApiAuthUtil.post<{ response?: string }>(`/sessions/${sid}/send_message/`, {
          message: content,
          page_content: getContext?.() || '',
        });

        assistantText = response?.response || 'I could not generate a response right now. Please try again.';
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${uuidv4()}`,
        message_type: 'assistant',
        content: assistantText,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
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
  }, [ensureSession, getContext]);

  return {
    messages,
    sendMessage,
    isLoading,
    suggestedPrompts,
  };
};

export default useAIChat;
