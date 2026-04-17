import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, RotateCcw, LogOut, User, Bot, Code, Clock, Loader2 } from 'lucide-react';
import CodeEditor from '@/components/code-editor/CodeEditor';
import { mockInterviewService } from '@/services/mockInterviewService';
import { aiAssistantService } from '@/services/aiAssistantService';
import { Role, Message } from '@/types/mockInterview';

interface InterviewScreenProps {
  role: Role;
  difficulty: string;
  duration: string;
  interviewer: string;
  mediaStream: MediaStream;
  resume?: File;
  aiConfig?: any;
  submissionId?: string;
  interviewSessionId?: string;
  chatSessionId?: string;
  onExit: () => void;
  onInterviewComplete: (role: Role, difficulty: string, duration: string, sessionId: string) => void;
}

const InterviewScreen: React.FC<InterviewScreenProps> = ({
  role,
  difficulty,
  duration,
  interviewer,
  mediaStream,
  resume,
  aiConfig,
  submissionId: propsSubmissionId,
  interviewSessionId: propsInterviewSessionId,
  chatSessionId: propsChatSessionId,
  onExit,
  onInterviewComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [loadingExit, setLoadingExit] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentUserAnswer, setCurrentUserAnswer] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isInterviewCompleted, setIsInterviewCompleted] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [layout, setLayout] = useState<'modern' | 'classic'>('modern');
  const [interviewState, setInterviewState] = useState<'initial' | 'listening' | 'thinking' | 'speaking'>('initial');

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const initializedRef = useRef(false);
  const interviewStateRef = useRef(interviewState);
  const currentUserAnswerRef = useRef(currentUserAnswer);
  const currentCodeRef = useRef(currentCode);
  const showCodeEditorRef = useRef(showCodeEditor);

  // Sync refs with state to avoid stale closures in speech recognition callbacks
  useEffect(() => {
    interviewStateRef.current = interviewState;
  }, [interviewState]);

  useEffect(() => {
    currentUserAnswerRef.current = currentUserAnswer;
  }, [currentUserAnswer]);

  useEffect(() => {
    currentCodeRef.current = currentCode;
  }, [currentCode]);

  useEffect(() => {
    showCodeEditorRef.current = showCodeEditor;
  }, [showCodeEditor]);

  const checkCodingQuestion = (text: string) => {
    const aiText = text.toLowerCase();
    const codingPrompts = [
      'write code', 'coding question', 'write a function', 'please write',
      'implement a', 'coding challenge', 'logic to solve', 'create a function',
    ];
    const hasCodingPrompt = codingPrompts.some(p => aiText.includes(p));
    const hasCodeBlock = text.includes('```');
    if (hasCodingPrompt || hasCodeBlock) {
      setShowCodeEditor(true);
      const codeBlockRegex = /```(?:javascript|js|python|java|cpp|typescript|ts)?\s*([\s\S]*?)```/i;
      const match = text.match(codeBlockRegex);
      if (match && match[1]) setCurrentCode(match[1].trim());
    }
  };

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    speechRef.current = utterance;
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    const targetVoiceName = role.interviewer_voice_id;

    if (targetVoiceName) {
      selectedVoice = voices.find(v => v.name === targetVoiceName) ||
        voices.find(v => v.name.includes(targetVoiceName));
    }

    if (!selectedVoice) {
      if (interviewer === 'Junnu') {
        const malePatterns = ['Ravi', 'Heera', 'Male', 'David', 'James', 'Daniel'];
        selectedVoice = voices.find(v => malePatterns.some(p => v.name.includes(p)) && v.lang.startsWith('en'));
      } else {
        const femalePatterns = ['Samantha', 'Zira', 'Female', 'Google UK English Female', 'Anna', 'Google US English'];
        selectedVoice = voices.find(v => femalePatterns.some(p => v.name.includes(p)) && v.lang.startsWith('en'));
      }
    }

    // FINAL FALLBACK: Just pick any English voice if still nothing
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    }

    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = role.voice_speed || 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      // Clear silence timer if it's running
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setInterviewState('speaking');
      setIsAITyping(false);
    };

    utterance.onend = () => {
      if (!isInterviewCompleted) {
        setInterviewState('listening');
        setIsRecording(true);
        setIsUserTyping(true);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        // Voices loaded
      }
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    // Polling fallback for some browsers
    const interval = setInterval(() => {
      if (window.speechSynthesis.getVoices().length > 0) clearInterval(interval);
    }, 500);

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
      clearInterval(interval);
    };
  }, []);

  const getDurationInSeconds = (durationStr: string): number => {
    const match = durationStr.match(/(\d+)\s*mins?/i);
    return match ? parseInt(match[1]) * 60 : 300;
  };

  useEffect(() => {
    const seconds = getDurationInSeconds(duration);
    setTimeLeft(seconds);

    const initInterview = async () => {
      // Ensure we have all necessary IDs before initializing
      if (!propsSubmissionId || !propsInterviewSessionId || !propsChatSessionId || !aiConfig) return;
      if (initializedRef.current) return;
      
      initializedRef.current = true;

      try {
        setSubmissionId(propsSubmissionId);
        setInterviewSessionId(propsInterviewSessionId);
        setChatSessionId(propsChatSessionId);

        const config = aiConfig;
        const isPredefined = config.interview_type === 'predefined';

        if (isPredefined) {
          // --- PREDEFINED MODE INITIALIZATION ---
          const greeting = config.first_question || "Hello! I'm your interviewer today. To start, could you please introduce yourself?";
          setConversation([{
            type: 'ai',
            content: greeting,
            timestamp: new Date().toLocaleTimeString(),
          }]);
          
          setIsAITyping(false);
          // Small delay to ensure synthesis is ready
          setTimeout(() => {
             speakText(greeting);
          }, 1000);
        } else {
          // --- FULL AI MODE ---
          const finalChatId = propsChatSessionId;
          setChatSessionId(finalChatId);
          setIsAITyping(true);
          const initialPrompt = 'The interview is starting now. Please introduce yourself and ask the first question.';
          const aiResponse = await aiAssistantService.sendMessage(finalChatId, initialPrompt);
          const aiText = aiResponse.response;
          
          if (!aiText) {
             console.warn("AI returned empty greeting response");
             setIsAITyping(false);
             return;
          }
          setConversation([{
            type: 'ai',
            content: aiText,
            timestamp: new Date().toLocaleTimeString(),
            questionType: 'behavioral',
          }]);
          setIsAITyping(false);
          setTimeout(() => {
            speakText(aiText);
          }, 1000);
          checkCodingQuestion(aiText);
        }
      } catch (error) {
        console.error('Failed to start interview', error);
        setIsAITyping(false);
      }
    };

    initInterview();
  }, [role.id, difficulty, duration, propsSubmissionId, propsInterviewSessionId, propsChatSessionId, aiConfig]);

  const handleEndInterview = async () => {
    // Avoid repeated end flow
    if (isInterviewCompleted) return;
    setIsInterviewCompleted(true);

    try {
      setLoadingExit(true);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
      window.speechSynthesis.cancel();

      if (interviewSessionId) {
        // Use the specialized end_interview endpoint which handles report generation
        await mockInterviewService.endInterviewSession(interviewSessionId);
        onInterviewComplete(role, difficulty, duration, submissionId || interviewSessionId);
      } else if (submissionId) {
        // Fallback for when only submissionId is present
        await mockInterviewService.updateMockInterviewSubmission(submissionId, {
          status: 'completed',
        });
        onInterviewComplete(role, difficulty, duration, submissionId);
      } else {
        onExit();
      }
    } catch (error) {
      console.error('Failed to end interview', error);
      onExit();
    } finally {
      setLoadingExit(false);
    }
  };

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { handleEndInterview(); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(e => console.log('Video playback failed', e));
    }
  }, [mediaStream, layout]);

  useEffect(() => {
    if (('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && !recognitionRef.current) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        // ONLY process if we are in listening state
        if (interviewStateRef.current !== 'listening') return;

        // Reset silence timer on every speech result
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          handleAutoSubmit();
        }, 1800);

        let final = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t;
          else interim += t;
        }
        
        setCurrentUserAnswer(prev => {
          const base = prev.split(' [interim]')[0];
          return base + final + (interim ? ` [interim]${interim}` : '');
        });
        setIsUserTyping(true); // Ensure transcript is visible when speaking starts
      };

      recognition.onend = () => {
        // Always try to restart the recognition itself if the component is still active
        // and interview is not completed. This handles browser-side timeouts.
        if (!isInterviewCompleted) {
          try { recognition.start(); } catch (e) { }
        }
      };

      recognitionRef.current = recognition;
      try { recognition.start(); } catch (e) { }
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) { }
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [isInterviewCompleted]); // Only restart engine if completion status changes or on mount

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isUserTyping, isAITyping]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAutoSubmit = async () => {
    // Proactively clear the timer
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    // Check ref for latest state
    if (isInterviewCompleted || interviewStateRef.current !== 'listening') return;

    let cleanAnswer = currentUserAnswerRef.current.replace(/ \[interim\].*$/, '').trim();
    const latestCode = currentCodeRef.current;
    const isEditorActive = showCodeEditorRef.current;

    if (!cleanAnswer && isEditorActive && latestCode) {
      cleanAnswer = 'I have written the code in the editor.';
    }

    if (!cleanAnswer && !latestCode) {
      // Still listening if no content
      setInterviewState('listening');
      setIsRecording(true);
      setIsUserTyping(true);
      return;
    }

    const userMessage: Message = {
      type: 'user',
      content: cleanAnswer || '(No verbal answer)',
      timestamp: new Date().toLocaleTimeString(),
      codeSubmission: isEditorActive ? latestCode : undefined,
    };
    setConversation(prev => [...prev, userMessage]);
    setCurrentUserAnswer('');
    setCurrentCode(''); 

    setInterviewState('thinking');
    setIsRecording(false);
    setIsUserTyping(false);
    setIsAITyping(true);

    const isPredefined = aiConfig?.interview_type === 'predefined';
    const effectiveInterviewSessionId = propsInterviewSessionId || interviewSessionId;
    const effectiveChatId = propsChatSessionId || chatSessionId;

    try {
      if (isPredefined && effectiveInterviewSessionId) {
        // --- PREDEFINED DIALOGUE ENGINE ---
        // We use the specialized getNextQuestion endpoint which handles tree traversal 
        // AND backend logging to the chat session automatically.
        const lowerAnswer = cleanAnswer.toLowerCase();
        let status_val = 'normal';
        if (lowerAnswer.includes('repeat') || lowerAnswer.includes('pardon') || lowerAnswer.includes('say that again')) {
          status_val = 'repeat';
        } else if (lowerAnswer.includes('skip') || lowerAnswer.includes("don't know") || lowerAnswer.includes("don't have an answer") || lowerAnswer.includes("no idea")) {
          status_val = 'skip';
        }

        const response = await mockInterviewService.getNextQuestion(role.id, effectiveInterviewSessionId, cleanAnswer, status_val);
        const nextText = response.question;

        const aiMessage: Message = {
          type: 'ai',
          content: nextText,
          timestamp: new Date().toLocaleTimeString(),
        };
        setConversation(prev => [...prev, aiMessage]);
        speakText(nextText);
        
        setIsAITyping(false);

        if (response.is_finished) {
          setTimeout(() => handleEndInterview(), 4000);
        }
      } else if (effectiveChatId) {
        // --- FULL AI MODE ---
        // In this mode, we use the free-form AI assistant service
        let combinedAnswer = cleanAnswer + (isEditorActive && latestCode ? `\n\n[Code Submission]:\n${latestCode}` : '');
        const aiResp = await aiAssistantService.sendMessage(effectiveChatId, combinedAnswer);
        const aiText = aiResp.response;
        
        if (!aiText) {
          throw new Error("Empty AI response in Full AI Mode");
        }

        const aiMessage: Message = {
          type: 'ai',
          content: aiText,
          timestamp: new Date().toLocaleTimeString(),
        };
        setConversation(prev => [...prev, aiMessage]);
        speakText(aiText);
        checkCodingQuestion(aiText);
        setIsAITyping(false);
      }
    } catch (err) {
      console.error('Dialogue error:', err);
      // Fallback: resume listening if everything fails
      setInterviewState('listening');
      setIsRecording(true);
      setIsAITyping(false);
    }
  };

  const handleToggleRecording = async () => {
    // Manual trigger for those who don't want to wait for silence
    if (interviewState === 'listening') {
      handleAutoSubmit();
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-white flex flex-col font-sans selection:bg-blue-100">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-50 shadow-sm">
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Badge className="bg-white hover:bg-white text-slate-800 border-slate-200 text-xs font-semibold px-3 py-1 truncate max-w-[260px]">
              {role.title}
            </Badge>
            <Badge className="bg-blue-50 hover:bg-blue-50 text-blue-700 border-blue-100 text-xs font-semibold px-3 py-1 capitalize">
              {difficulty}
            </Badge>
          </div>

          {layout === 'classic' && (
            <div className="absolute left-1/2 -translate-x-1/2 w-20 h-10 bg-black rounded-md overflow-hidden border border-slate-200 shadow-sm">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full border border-white" />
            </div>
          )}

          <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setLayout('modern')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${layout === 'modern' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Split
            </button>
            <button
              onClick={() => setLayout('classic')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${layout === 'classic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Classic
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-slate-200">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleEndInterview}
            disabled={loadingExit}
            className="h-9 px-4 text-sm font-semibold border-slate-200"
          >
            {loadingExit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
            {loadingExit ? 'Finishing...' : 'Finish & Exit'}
          </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full mx-auto p-6 flex gap-6 overflow-hidden max-w-[1800px]">
        {/* Conversation Panel */}
        <div className={`gap-6 transition-all duration-500 flex flex-col ${layout === 'classic' ? (showCodeEditor ? 'w-full lg:w-1/2' : 'w-full max-w-4xl mx-auto') : (showCodeEditor ? 'w-full lg:w-1/4' : 'w-full lg:w-3/4')}`}>
          <Card className="flex-1 flex flex-col overflow-hidden shadow-sm border-slate-200 h-full">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800">Interview Conversation</h2>
                {isRecording && <Badge variant="destructive" className="animate-pulse">Recording...</Badge>}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
              {conversation.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                  <Bot className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">The AI is preparing your first question...</p>
                </div>
              )}

              {conversation.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                    msg.type === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-sm'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                  }`}>
                    <div className="flex items-center gap-2 mb-2 opacity-70 text-[10px] uppercase font-bold tracking-wider">
                      {msg.type === 'ai' ? <><Bot className="w-3 h-3" /> AI Interviewer</> : <><User className="w-3 h-3" /> You</>}
                      <span>• {msg.timestamp}</span>
                    </div>
                    {msg.content}
                    {msg.codeSubmission && (
                      <div className="mt-3 p-2 bg-white/10 rounded border border-white/20">
                        <div className="text-[10px] opacity-70 mb-1">Code Submitted</div>
                        <pre className="text-xs overflow-x-auto"><code>{msg.codeSubmission}</code></pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isAITyping && (
                <div className="flex items-center gap-2 text-xs text-slate-400 ml-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  AI is thinking...
                </div>
              )}
              <div ref={conversationEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-100 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-3">
                {interviewState === 'listening' && (
                  <div className="flex items-center gap-1 h-8 px-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="w-1 bg-blue-500 rounded-full animate-pulse" style={{ height: `${Math.random() * 80 + 20}%`, animationDelay: `${i * 0.1}s` }} />
                    ))}
                    <span className="text-xs font-bold text-blue-600 ml-2 uppercase tracking-widest">Listening</span>
                  </div>
                )}
                {interviewState === 'speaking' && (
                  <div className="flex items-center gap-1 h-8 px-4">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="w-1 bg-green-500 rounded-full animate-bounce" style={{ height: `${Math.random() * 80 + 20}%`, animationDelay: `${i * 0.15}s` }} />
                    ))}
                    <span className="text-xs font-bold text-green-600 ml-2 uppercase tracking-widest">AI Speaking</span>
                  </div>
                )}
                {interviewState === 'thinking' && (
                  <div className="flex items-center gap-2 h-8 px-4">
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">AI Thinking</span>
                  </div>
                )}
              </div>
              
        
            </div>
          </Card>
        </div>

        {/* Code Editor Panel */}
        {showCodeEditor && (
          <div className={`gap-6 transition-all duration-500 flex flex-col ${layout === 'classic' ? 'w-full lg:w-1/2' : 'w-full lg:w-1/2'}`}>
            <Card className="flex-1 h-full border-slate-200 overflow-hidden flex flex-col shadow-sm">
              <div className="px-4 py-2 bg-white border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-2">
                  <Code className="w-3 h-3" /> Code Editor
                </span>
                <Badge variant="outline" className="text-[10px] bg-white">JavaScript</Badge>
              </div>
              <div className="flex-1 relative">
                <CodeEditor
                  initialCode={currentCode}
                  initialLanguage="javascript"
                  onCodeChange={setCurrentCode}
                  className="h-full border-none"
                />
              </div>
            </Card>
          </div>
        )}

        {/* Modern Layout - Video Panels */}
        {layout === 'modern' && (
          <div className={`flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500 ${showCodeEditor ? 'w-full lg:w-1/3' : 'w-full lg:w-1/4'}`}>
            <Card className={`overflow-hidden shadow-sm transition-all duration-300 ${isAITyping ? 'ring-2 ring-blue-500 shadow-blue-200 scale-[1.02]' : 'border-slate-200'}`}>
              <div className={`p-3 border-b flex justify-between items-center transition-colors ${isAITyping ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-white border-slate-100 text-slate-800'} font-bold text-sm`}>
                <span>AI Interviewer ({interviewer})</span>
                {isAITyping && <span className="text-[10px] uppercase font-extrabold animate-pulse">Speaking...</span>}
              </div>
              <div className="aspect-video bg-white relative flex items-center justify-center overflow-hidden">
                {isAITyping && (
                  <>
                    <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
                    <div className="absolute w-40 h-40 bg-blue-400/20 rounded-full animate-ping [animation-duration:2s]" />
                    <div className="absolute w-32 h-32 bg-blue-500/20 rounded-full animate-ping [animation-duration:1.5s]" />
                  </>
                )}
                <div className={`relative w-24 h-24 flex items-center justify-center rounded-full bg-white shadow-sm transition-all duration-300 z-10 ${isAITyping ? 'scale-110 ring-4 ring-blue-100' : ''}`}>
                  <Bot className={`w-12 h-12 ${isAITyping ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
              </div>
            </Card>

            <Card className={`overflow-hidden shadow-sm flex-1 flex flex-col transition-all duration-300 ${isRecording ? 'ring-2 ring-green-500 shadow-green-200 scale-[1.02]' : 'border-slate-200'}`}>
              <div className={`p-3 border-b flex justify-between items-center transition-colors ${isRecording ? 'bg-green-50 border-green-100 text-green-800' : 'bg-white border-slate-100 text-slate-800'} font-bold text-sm`}>
                <span>You</span>
                <span className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border transition-all ${isRecording ? 'bg-green-500 text-white border-green-600' : 'bg-green-50 text-green-600 border-green-100'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-white animate-ping' : 'bg-green-500 animate-pulse'}`} />
                  {isRecording ? 'RECORDING' : 'LIVE'}
                </span>
              </div>
              <div className="flex-1 bg-black relative overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 pointer-events-none" />
                {isRecording && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1 items-end h-16 px-8 pointer-events-none">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className="w-1.5 bg-green-400/80 rounded-t-full animate-pulse" style={{ height: `${Math.random() * 60 + 20}%`, animationDelay: `${i * 0.05}s` }} />
                    ))}
                  </div>
                )}

                {/* Live Transcript OVERLAY */}
                {isUserTyping && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md text-white p-4 animate-in fade-in slide-in-from-bottom-4 duration-500 border-t border-white/10 z-20">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                       <span className="text-[10px] uppercase font-black tracking-[0.2em] text-blue-400">Live Transcript</span>
                    </div>
                    <div className="text-sm leading-relaxed font-medium transition-all duration-300">
                      {currentUserAnswer ? (
                        <>
                          <span>{currentUserAnswer.split(' [interim]')[0]}</span>
                          {currentUserAnswer.includes(' [interim]') && (
                            <span className="text-white/50 italic ml-1">
                              {currentUserAnswer.split(' [interim]')[1]}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-white/40 italic">Listening...</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewScreen;