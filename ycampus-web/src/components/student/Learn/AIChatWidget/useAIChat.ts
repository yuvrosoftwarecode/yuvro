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
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);

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

  // Persistence: always start fresh when the key changes (switching subunits/topics)
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
    let contextParts: string[] = [];

    // 1. Prioritize explicit context via config
    if (getContext) {
      const explicitContext = getContext();
      if (explicitContext) {
        contextParts.push(`--- EXPLICIT CONTEXT ---\n${explicitContext}`);
      }
    }

    // 2. Gather context from marked DOM elements
    if (typeof window !== 'undefined') {
      try {
        const aiContextElements = document.querySelectorAll('[data-ai-context="true"]');
        if (aiContextElements.length > 0) {
          contextParts.push(`--- PAGE CONTEXT ---`);
          aiContextElements.forEach((el, index) => {
            // Get optional label if provided, e.g., data-ai-context-label="Error Log"
            const label = el.getAttribute('data-ai-context-label');
            const content = (el as HTMLElement).innerText?.trim();
            if (content) {
              if (label) {
                contextParts.push(`[${label}]:\n${content}`);
              } else {
                contextParts.push(`[Section ${index + 1}]:\n${content}`);
              }
            }
          });
        }
      } catch (e) {
        console.warn("Failed to gather AI context from DOM", e);
      }
    }

    // 3. Fallback to general page text ONLY if we have absolutely nothing else
    if (contextParts.length === 0 && typeof window !== 'undefined') {
      try {
        const text = (document.body && document.body.innerText) || (document.documentElement && document.documentElement.innerText) || '';
        if (text) {
          contextParts.push(`--- GENERAL PAGE TEXT ---\n${text}`);
        }
      } catch (e) {
         // ignore
      }
    }

    // Combine and truncate
    const combinedContext = contextParts.join('\n\n');
    return combinedContext ? combinedContext.slice(0, 3800) : '';
  };

  // Generate suggested prompts based on the context
  useEffect(() => {
    const generatePrompts = () => {
      const context = getPageContentSnippet();
      const newPrompts: string[] = [];
      
      if (!context) {
        setSuggestedPrompts(['How does this work?', 'What can you help me with?']);
        return;
      }

      const lowerContext = context.toLowerCase();

      // Simple keyword-based intent detection
      if (lowerContext.includes('error:') || lowerContext.includes('exception') || lowerContext.includes('failed')) {
        newPrompts.push('Explain this error');
        newPrompts.push('How can I fix this code?');
      }

      if (lowerContext.includes('test case') || lowerContext.includes('actual output')) {
         newPrompts.push('Why did this test case fail?');
         newPrompts.push('Give me a hint for this problem');
      }
      
      if (lowerContext.includes('problem:') || lowerContext.includes('description:')) {
         newPrompts.push('Write full code solution');
         newPrompts.push('What is the best approach?');
         newPrompts.push('Give me a hint');
      }

      // Fallbacks if nothing matched
      if (newPrompts.length === 0) {
        newPrompts.push('Can you review my code?');
        newPrompts.push('Explain this snippet to me');
      }

      // Limit to max 3 unique prompts
      setSuggestedPrompts(Array.from(new Set(newPrompts)).slice(0, 3));
    };

    // Give the DOM a tiny bit of time to render so data-ai-context attributes are present
    const timer = setTimeout(generatePrompts, 500);
    return () => clearTimeout(timer);
  }, [getContext, activeKey]); // Re-run when context getter or active problem changes

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
          
          // Create a placeholder message for the assistant
          const assistantMsgId = `srv-${uuidv4()}`;
          setMessages((m) => [...m, { id: assistantMsgId, message_type: 'assistant', content: '', created_at: new Date().toISOString() }]);
          // VITE_BACKEND_API_BASE_URL already includes '/api', so we construct the URL accordingly
          const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL || '/api';
          
          // Use fetch directly for streaming support
          const response = await fetch(`${baseUrl}/sessions/${sid}/send_message/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access')}`
            },
            body: JSON.stringify(payload)
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          if (!response.body) {
            throw new Error('ReadableStream not yet supported in this browser.');
          }
          
          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';
          
          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            
            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;
              
              // Process complete messages in the buffer
              // SSE messages are separated by double newlines \n\n
              let newlineIndex;
              while ((newlineIndex = buffer.indexOf('\n\n')) >= 0) {
                const message = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 2); // Remove the processed chunk from buffer
                
                if (message.startsWith('data: ')) {
                  try {
                    const dataStr = message.substring(6).trim();
                    if (dataStr === '[DONE]') continue; // Standard SSE finish signal, though we use our own {"done": true}
                    
                    const data = JSON.parse(dataStr);
                    
                    if (data.chunk) {
                      fullResponse += data.chunk;
                      // Update the message in state incrementally
                      setMessages((m) => 
                        m.map((msg) => 
                          msg.id === assistantMsgId ? { ...msg, content: fullResponse } : msg
                        )
                      );
                    } else if (data.error) {
                      console.error("Stream error:", data.error);
                      setMessages((m) => 
                        m.map((msg) => 
                          msg.id === assistantMsgId ? { ...msg, content: fullResponse + `\n\n[Error: ${data.error}]` } : msg
                        )
                      );
                    } else if (data.done) {
                      // Final message metadata received
                      setMessages((m) => 
                        m.map((msg) => 
                          msg.id === assistantMsgId ? { ...msg, id: data.message_id || msg.id } : msg
                        )
                      );
                    }
                  } catch (e) {
                    console.error("JSON parse error on SSE chunk:", e, message);
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('Backend session message send failed', err);
          // Delete the temporary empty message
          setMessages((m) => m.filter(msg => msg.message_type !== 'assistant' || msg.content !== ''));
          
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

  const provideFeedback = useCallback(async (messageId: string, isPositive: boolean) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, feedback: isPositive ? 'positive' : 'negative' } : m
    ));

    if (sessionId && !sessionId.startsWith('local-')) {
      try {
        await restApiAuthUtil.post(`/sessions/${sessionId}/messages/${messageId}/feedback/`, {
          feedback: isPositive ? 1 : -1
        });
      } catch (err) {
        console.error('Failed to send feedback', err);
      }
    }
  }, [sessionId]);

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
    suggestedPrompts,
    provideFeedback,
  } as const;
};

export default useAIChat;
