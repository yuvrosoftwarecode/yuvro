import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [prefetchData, setPrefetchData] = useState<{ prompt: string; response: string; sessionId: string } | null>(null);
  const [activeStream, setActiveStream] = useState<{ id: string; content: string } | null>(null);
  const lastUpdateTime = useRef<number>(0);
 
  const persistenceKey = config?.persistenceKey;
  const getContext = config?.getContext;
  const chatTitle = config?.chatTitle || 'Chat Session';
  const userName = config?.userName || 'Student';
 
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

    // Warmup Logic: Keep AI models ready
    const triggerWarmup = async () => {
        try {
            await restApiAuthUtil.post('/agents/warmup/', {});
        } catch (e) {
            console.debug('Warmup silent fail', e);
        }
    };
    triggerWarmup();
    const warmupInterval = setInterval(triggerWarmup, 1000 * 60 * 5); // Every 5 mins
    return () => clearInterval(warmupInterval);
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
    // 0ms Perception: Immediate UI feedback
    const id = `local-${uuidv4()}`;
    const assistantMsgId = `srv-${uuidv4()}`;
    const userMsg: ChatMessage = { id, message_type: 'user', content, created_at: new Date().toISOString() };
    
    // UX Illusion: Smarter Context-Aware Starter Response
    const context = getPageContentSnippet();
    const isTestCaseContext = context.toLowerCase().includes('test case');

    let starterResponse = "Let me look into this for you. Analyzing context...";
    if (context.toLowerCase().includes('error')) starterResponse = "I see an error in your code. Let me analyze it for you...";
    else if (isTestCaseContext) starterResponse = ""; // Empty initially to allow typing effect from start
    else if (content.toLowerCase().includes('explain')) starterResponse = "I'll break this down for you step-by-step. Thinking...";
    
    const placeholderMsg: ChatMessage = { 
        id: assistantMsgId, 
        message_type: 'assistant', 
        content: starterResponse, 
        created_at: new Date().toISOString() 
    };

    setMessages((m) => [...m, userMsg, placeholderMsg]);
    setActiveStream({ id: assistantMsgId, content: starterResponse });
    setIsLoading(true);

    try {
      // 0ms Feeling: Use prefetched data if it matches EXACTLY
      if (prefetchData && prefetchData.prompt.trim().toLowerCase() === content.trim().toLowerCase()) {
        const data = prefetchData;
        setPrefetchData(null); // Consumed
        
        setSessionId(data.sessionId);
        setMessages((m) => 
            m.map((msg) => 
                msg.id === assistantMsgId ? { ...msg, content: data.response } : msg
            )
        );
        setActiveStream({ id: assistantMsgId, content: data.response });
        setIsLoading(false);
        return;
      }

      const sid = await ensureSession();
      const agentId = selectedAgent ?? agents[0]?.id ?? null;
      const page_content = getPageContentSnippet();
      const payload = { 
        message: content, 
        temperature: 0.7, 
        max_tokens: 4096, 
        page_content, 
        stream: true,
        ...(sid && !sid.startsWith('local-') ? {} : { ai_agent_id: agentId })
      };

      const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL || '/api';
      const endpoint = (sid && !sid.startsWith('local-')) 
        ? `${baseUrl}/sessions/${sid}/send_message/`
        : `${baseUrl}/chat/quick_chat/`;

      // Animation State Refs
      const streamingBufferRef = { current: '' };
      const displayedBufferRef = { current: '' };
      let isStreamingDone = false;
      let hasReceivedFirstToken = false;
      let finalData: any = null;
      let typingTimer: any = null;

      // Loading Animation Sequence
      const testCaseLoadingMessages = [
        `Hi ${userName}! Let me see......`,
        "Just a moment, analyzing your code......",
        "Checking for any potential issues......",
        "Running through test cases......",
        "Evaluating logic and efficiency......",
        "Almost done, putting it all together......",
        "Finalizing my thoughts for you......"
      ];
      
      let isLoadingAnimationActive = isTestCaseContext;
      let currentLoadingMsgIndex = 0;
      let loadingCharIndex = 0;

      const runLoadingAnimation = () => {
        if (!isLoadingAnimationActive || hasReceivedFirstToken) return;

        const currentMsg = testCaseLoadingMessages[currentLoadingMsgIndex];
        if (loadingCharIndex < currentMsg.length) {
          loadingCharIndex++;
          const typedText = currentMsg.slice(0, loadingCharIndex);
          setActiveStream({ id: assistantMsgId, content: typedText });
          setMessages((m) => m.map(msg => msg.id === assistantMsgId ? { ...msg, content: typedText } : msg));
          
          setTimeout(runLoadingAnimation, 40);
        } else {
          // Pause then move to next
          setTimeout(() => {
            if (!isLoadingAnimationActive || hasReceivedFirstToken) return;
            currentLoadingMsgIndex = (currentLoadingMsgIndex + 1) % testCaseLoadingMessages.length;
            loadingCharIndex = 0;
            runLoadingAnimation();
          }, 2000); 
        }
      };

      if (isLoadingAnimationActive) {
        // Start typing the first message immediately
        runLoadingAnimation();
      }



      const finishAnimation = () => {
        if (!finalData) return;
        
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, id: finalData.message_id || msg.id, content: streamingBufferRef.current } : msg
          )
        );
        setActiveStream(null);
        typingTimer = null;
      };

      const processTyping = () => {
        if (typingTimer) return;

        const tick = () => {
          const target = streamingBufferRef.current;
          const current = displayedBufferRef.current;

          if (current.length < target.length) {
            // Very smooth increment
            const backlog = target.length - current.length;
            const increment = backlog > 300 ? 12 : (backlog > 100 ? 4 : (backlog > 20 ? 2 : 1));
            const next = target.slice(0, current.length + increment);
            
            displayedBufferRef.current = next;
            setActiveStream({ id: assistantMsgId, content: next });
            
            const delay = backlog > 100 ? 5 : 20;
            typingTimer = setTimeout(tick, delay);
          } else {
            typingTimer = null;
            if (isStreamingDone) {
                finishAnimation();
            }
          }
        };

        tick();
      };

      try {
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

        while (true) {
          const { value, done: readerDone } = await reader.read();
          if (readerDone) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

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
                    isLoadingAnimationActive = false;
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
                  if (!typingTimer) finishAnimation();
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }
        }
      } catch (err) {
        console.error('Streaming failed', err);
        isLoadingAnimationActive = false;
        const errorMsg = (err instanceof Error) ? err.message : 'Service unavailable. Try again later.';
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: `Error: ${errorMsg}` } : msg
          )
        );
        setActiveStream(null);
      }
    } finally {
      setIsLoading(false);
    }

  }, [ensureSession, prefetchData]);
  
  const startPrefetch = useCallback(async (content: string) => {
    if (!content || content.length < 10) return; // Only prefetch for meaningful prompts
    
    try {
      const sid = await ensureSession();
      if (sid && !sid.startsWith('local-')) {
        const page_content = getPageContentSnippet();
        const payload = { message: content, temperature: 0.7, max_tokens: 1024, page_content, stream: false };
        const baseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL || '/api';
        
        // Background call - don't wait for response to block UI
        const resp = await restApiAuthUtil.post<ChatResponse>(`/sessions/${sid}/send_message/`, payload);
        if (resp && resp.response) {
            setPrefetchData({ prompt: content, response: resp.response, sessionId: sid });
        }
      }
    } catch (e) {
      console.warn("Prefetch failed", e);
    }
  }, [ensureSession]);

  const handleType = useCallback((content: string) => {
    // AGGRESSIVE PREFETCH: Trigger when user stops typing for 400ms
    const timer = setTimeout(() => {
        if (content.length > 15) {
            startPrefetch(content);
        }
    }, 400);
    return () => clearTimeout(timer);
  }, [startPrefetch]);

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
    handleType,
    activeStream,
  } as const;
};

export default useAIChat;
