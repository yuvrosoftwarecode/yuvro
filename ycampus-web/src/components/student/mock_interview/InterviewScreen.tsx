import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, RotateCcw, LogOut, User, Bot, Code, Clock, Loader2, Video, VideoOff, Settings, PhoneOff, Eye, Volume2, Target, Shield, HelpCircle } from 'lucide-react';
import CodeEditor from '@/components/code-editor/CodeEditor';
import { mockInterviewService } from '@/services/mockInterviewService';
import { aiAssistantService } from '@/services/aiAssistantService';
import { aiMockInterviewService } from '@/services/aiMockInterviewService';
import { toast } from 'sonner';
import { Role, Message } from '@/types/mockInterview';
import { useAuth } from '@/contexts/AuthContext';
import knowledgeTree from '@/assets/knowledge-tree.png';

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
  const [currentQuestionId, setCurrentQuestionId] = useState<number>(1);
  const [hintsRemaining, setHintsRemaining] = useState<number>(3);
  const [isHintAvailable, setIsHintAvailable] = useState<boolean>(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [layout, setLayout] = useState<'modern' | 'classic'>('modern');
  const [interviewState, setInterviewState] = useState<'initial' | 'listening' | 'thinking' | 'speaking'>('initial');

  const { user } = useAuth();
  const startTimeRef = useRef<number>(Date.now());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoStopped, setIsVideoStopped] = useState(false);
  const [metrics, setMetrics] = useState({
    eyeContact: 72,
    speechClarity: 85,
    confidence: 68
  });

  useEffect(() => {
    if (interviewState !== 'listening') return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        eyeContact: Math.min(95, Math.max(50, prev.eyeContact + Math.floor(Math.random() * 5) - 2)),
        speechClarity: Math.min(98, Math.max(60, prev.speechClarity + Math.floor(Math.random() * 5) - 2)),
        confidence: Math.min(95, Math.max(50, prev.confidence + Math.floor(Math.random() * 5) - 2))
      }));
    }, 2500);

    return () => clearInterval(interval);
  }, [interviewState]);

  const toggleMute = () => {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoStopped(!isVideoStopped);
    }
  };

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
  const isProcessingRef = useRef(false);
  const currentQuestionIdRef = useRef(currentQuestionId);

  const setInterviewStateSync = (newState: 'initial' | 'listening' | 'thinking' | 'speaking') => {
    console.log(`[InterviewEngine] State Transition: ${interviewStateRef.current} -> ${newState}`);
    setInterviewState(newState);
    interviewStateRef.current = newState;
  };

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

  useEffect(() => {
    currentQuestionIdRef.current = currentQuestionId;
  }, [currentQuestionId]);

  const captureScreenshot = (): string | null => {
    if (!videoRef.current) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      }
    } catch (e) {
      console.warn("Failed to capture video screenshot:", e);
    }
    return null;
  };

  useEffect(() => {
    const activeSubId = submissionId || propsSubmissionId;
    if (role.id !== 'jd_resume' || !activeSubId || isInterviewCompleted) return;

    const enrollTimer = setTimeout(async () => {
      const imgB64 = captureScreenshot();
      if (imgB64) {
        try {
          console.log("[Proctoring] Enrolling face...");
          await aiMockInterviewService.faceEnroll(activeSubId, imgB64);
        } catch (e) {
          console.warn("Face enrollment failed:", e);
        }
      }
    }, 4000);

    const verificationInterval = setInterval(async () => {
      const imgB64 = captureScreenshot();
      if (imgB64) {
        try {
          console.log("[Proctoring] Verifying presence...");
          const res = await aiMockInterviewService.faceVerify(activeSubId, imgB64);
          if (res && res.status === 'warning') {
            toast.warning(res.message || "Proctoring warning: face mismatch or absent.");
          }
        } catch (e) {
          console.warn("Face verification failed:", e);
        }
      }
    }, 20000);

    return () => {
      clearTimeout(enrollTimer);
      clearInterval(verificationInterval);
    };
  }, [role.id, submissionId, propsSubmissionId, isInterviewCompleted]);

  useEffect(() => {
    showCodeEditorRef.current = showCodeEditor;
  }, [showCodeEditor]);

  const handleRequestHint = async () => {
    const activeSubId = submissionId || propsSubmissionId;
    if (!activeSubId || isAITyping || isInterviewCompleted) return;
    try {
      setIsAITyping(true);
      window.speechSynthesis.cancel();
      
      const response = await aiMockInterviewService.getHint(
        activeSubId,
        currentQuestionId,
        currentUserAnswer
      );
      console.log("[InterviewEngine] Hint response:", response);
      
      const hintText = response.hint;
      const aiElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const hintMessage: Message = {
        type: 'ai',
        content: `💡 Hint: ${hintText}`,
        timestamp: new Date().toLocaleTimeString(),
        relativeTime: aiElapsed,
      };
      
      setConversation(prev => [...prev, hintMessage]);
      speakText(hintText);
      setIsAITyping(false);
      
      // Reset speech recognition to make sure it keeps listening
      setInterviewStateSync('listening');
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to fetch hint:", err);
      setIsAITyping(false);
    }
  };

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
      console.log("[InterviewEngine] AI started speaking");
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setInterviewStateSync('speaking');
      setIsAITyping(false);
    };

    utterance.onend = () => {
      console.log("[InterviewEngine] AI finished speaking");
      if (!isInterviewCompleted) {
        setInterviewStateSync('listening');
        setIsRecording(true);
        setIsUserTyping(true);
      }
    };

    utterance.onerror = (event) => {
      console.error("[InterviewEngine] Speech synthesis error:", event);
      // Recovery: fall back to listening state so the interview doesn't get stuck
      if (!isInterviewCompleted) {
        setInterviewStateSync('listening');
        setIsRecording(true);
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
        const isCustomMode = role.id === 'jd_resume';
        const isPredefined = config?.interview_type === 'predefined';

        startTimeRef.current = Date.now();

        if (isCustomMode) {
          // --- CUSTOM JD/RESUME MODE INITIALIZATION ---
          const greeting = config?.first_question || "Hello! I'm your interviewer today. To start, could you please introduce yourself?";
          if (config?.first_question_id) {
            setCurrentQuestionId(config.first_question_id);
          }
          setConversation([{
            type: 'ai',
            content: greeting,
            timestamp: new Date().toLocaleTimeString(),
            relativeTime: 0,
          }]);
          
          setIsAITyping(false);
          setTimeout(() => {
             console.log("[InterviewEngine] Initializing custom greeting...");
             speakText(greeting);
          }, 1000);
        } else if (isPredefined) {
          // --- PREDEFINED MODE INITIALIZATION ---
          const greeting = config.first_question || "Hello! I'm your interviewer today. To start, could you please introduce yourself?";
          setConversation([{
            type: 'ai',
            content: greeting,
            timestamp: new Date().toLocaleTimeString(),
            relativeTime: 0,
          }]);
          
          setIsAITyping(false);
          // Small delay to ensure synthesis is ready
          setTimeout(() => {
             console.log("[InterviewEngine] Initializing greeting...");
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
            relativeTime: 0,
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

      const activeSubmissionId = submissionId || propsSubmissionId;
      if (role.id === 'jd_resume') {
        if (activeSubmissionId) {
          await aiMockInterviewService.generateReport(activeSubmissionId);
        }
        onInterviewComplete(role, difficulty, duration, activeSubmissionId || '');
      } else if (interviewSessionId) {
        // Use the specialized end_interview endpoint which handles report generation
        await mockInterviewService.endInterviewSession(interviewSessionId);
        onInterviewComplete(role, difficulty, duration, submissionId || interviewSessionId);
      } else if (activeSubmissionId) {
        // Fallback for when only submissionId is present
        await mockInterviewService.updateMockInterviewSubmission(activeSubmissionId, {
          status: 'completed',
        });
        onInterviewComplete(role, difficulty, duration, activeSubmissionId);
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

        // Reset silence timer on every speech result with natural human pause tolerance (4.0s)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          handleAutoSubmit();
        }, 4000);

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

      recognition.onerror = (event: any) => {
        console.warn("[InterviewEngine] Speech recognition error:", event.error);
        if (event.error === 'network' || event.error === 'aborted') {
          // These are usually recoverable by restarting
          console.log("[InterviewEngine] Recoverable error, engine will restart onend");
        }
      };

      recognition.onend = () => {
        console.log("[InterviewEngine] Speech recognition session ended");
        // Always try to restart the recognition itself if the component is still active
        // and interview is not completed. This handles browser-side timeouts.
        if (!isInterviewCompleted) {
          try { 
            console.log("[InterviewEngine] Restarting speech recognition...");
            recognition.start(); 
          } catch (e) { }
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
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    // Check ref and processing flag for latest state
    if (isInterviewCompleted || interviewStateRef.current !== 'listening' || isProcessingRef.current) {
      console.log("[InterviewEngine] Skipping submit: state check failed", { 
        completed: isInterviewCompleted, 
        state: interviewStateRef.current,
        processing: isProcessingRef.current 
      });
      return;
    }

    let cleanAnswer = currentUserAnswerRef.current.replace(/ \[interim\].*$/, '').trim();
    const latestCode = currentCodeRef.current;
    const isEditorActive = showCodeEditorRef.current;

    if (!cleanAnswer && isEditorActive && latestCode) {
      cleanAnswer = 'I have written the code in the editor.';
    }

    if (!cleanAnswer && !latestCode) {
      // Still listening if no content
      console.log("[InterviewEngine] No answer detected, resuming listening");
      setInterviewStateSync('listening');
      setIsRecording(true);
      setIsUserTyping(true);
      return;
    }

    console.log("[InterviewEngine] Initiating submission...");
    isProcessingRef.current = true;
    
    const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

    const userMessage: Message = {
      type: 'user',
      content: cleanAnswer || '(No verbal answer)',
      timestamp: new Date().toLocaleTimeString(),
      codeSubmission: isEditorActive ? latestCode : undefined,
      relativeTime: elapsedSeconds,
    };
    setConversation(prev => [...prev, userMessage]);
    setCurrentUserAnswer('');
    setCurrentCode(''); 

    setInterviewStateSync('thinking');
    setIsRecording(false);
    setIsUserTyping(false);
    setIsAITyping(true);

    const isCustomMode = role.id === 'jd_resume';
    const isPredefined = aiConfig?.interview_type === 'predefined';
    const effectiveInterviewSessionId = propsInterviewSessionId || interviewSessionId;
    const effectiveChatId = propsChatSessionId || chatSessionId;

    try {
      if (isCustomMode) {
        // --- CUSTOM JD/RESUME AI INTERVIEW FLOW ---
        console.log("[InterviewEngine] Custom mode: submitting answer for question", currentQuestionIdRef.current);
        
        let combinedAnswer = cleanAnswer + (isEditorActive && latestCode ? `\n\n[Code Submission]:\n${latestCode}` : '');
        
        const response = await aiMockInterviewService.submitAnswer(
          submissionId || propsSubmissionId || '',
          currentQuestionIdRef.current,
          combinedAnswer,
          elapsedSeconds
        );
        
        console.log("[InterviewEngine] Submit answer response:", response);
        const cueText = response.cue.message;
        const proceed = response.proceed;
        
        if (response.is_finished) {
          console.log("[InterviewEngine] Custom mode: interview completed via response");
          const endMsg: Message = {
            type: 'ai',
            content: cueText,
            timestamp: new Date().toLocaleTimeString(),
            relativeTime: Math.floor((Date.now() - startTimeRef.current) / 1000),
          };
          setConversation(prev => [...prev, endMsg]);
          speakText(cueText);
          setIsAITyping(false);
          setTimeout(() => handleEndInterview(), 4000);
          return;
        }

        if (response.cue.action === 'offer_hint') {
          setIsHintAvailable(true);
        } else {
          setIsHintAvailable(false);
        }
        
        if (proceed) {
          setIsAITyping(true);
          try {
            const nextResp = await aiMockInterviewService.nextQuestion(submissionId || propsSubmissionId || '');
            console.log("[InterviewEngine] Received next question:", nextResp);
            
            const nextText = nextResp.question;
            const nextQId = nextResp.question_id;
            
            if (nextQId) {
              setCurrentQuestionId(nextQId);
            }
            
            const combinedText = `${cueText}\n\n${nextText}`;
            const aiElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            
            const combinedMessage: Message = {
              type: 'ai',
              content: combinedText,
              timestamp: new Date().toLocaleTimeString(),
              relativeTime: aiElapsed,
            };
            
            setConversation(prev => [...prev, combinedMessage]);
            speakText(combinedText);
            setIsHintAvailable(false);
            setIsAITyping(false);
            
            if (nextResp.is_finished) {
              console.log("[InterviewEngine] Interview completed");
              setTimeout(() => handleEndInterview(), 4000);
            }
          } catch (err) {
            console.error("[InterviewEngine] Error getting next custom question:", err);
            // Fallback: show cue message at least
            const aiElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            const cueMessage: Message = {
              type: 'ai',
              content: cueText,
              timestamp: new Date().toLocaleTimeString(),
              relativeTime: aiElapsed,
            };
            setConversation(prev => [...prev, cueMessage]);
            speakText(cueText);
            setIsAITyping(false);
          }
        } else {
          // If we don't proceed, just show the cue (like "Would you like to add anything else?")
          const aiElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          const cueMessage: Message = {
            type: 'ai',
            content: cueText,
            timestamp: new Date().toLocaleTimeString(),
            relativeTime: aiElapsed,
          };
          setConversation(prev => [...prev, cueMessage]);
          speakText(cueText);
          setIsAITyping(false);
        }
      } else if (isPredefined && effectiveInterviewSessionId) {
        // --- PREDEFINED DIALOGUE ENGINE ---
        console.log("[InterviewEngine] Fetching next predefined question...");
        const lowerAnswer = cleanAnswer.toLowerCase();
        let status_val = 'normal';
        if (lowerAnswer.includes('repeat') || lowerAnswer.includes('pardon') || lowerAnswer.includes('say that again')) {
          status_val = 'repeat';
        } else if (lowerAnswer.includes('skip') || lowerAnswer.includes("don't know") || lowerAnswer.includes("don't have an answer") || lowerAnswer.includes("no idea")) {
          status_val = 'skip';
        }

        const response = await mockInterviewService.getNextQuestion(role.id, effectiveInterviewSessionId, cleanAnswer, status_val);
        const nextText = response.question;
        console.log("[InterviewEngine] Received next question:", nextText);

        const aiElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const aiMessage: Message = {
          type: 'ai',
          content: nextText,
          timestamp: new Date().toLocaleTimeString(),
          relativeTime: aiElapsed,
        };
        setConversation(prev => [...prev, aiMessage]);
        speakText(nextText);
        
        setIsAITyping(false);

        if (response.is_finished) {
          console.log("[InterviewEngine] Interview marked as finished");
          setTimeout(() => handleEndInterview(), 4000);
        }
      } else if (effectiveChatId) {
        // --- FULL AI MODE ---
        console.log("[InterviewEngine] Fetching AI response...");
        let combinedAnswer = cleanAnswer + (isEditorActive && latestCode ? `\n\n[Code Submission]:\n${latestCode}` : '');
        
        // Client-side end interview intent check if in Full AI mode
        const cleanLower = cleanAnswer.toLowerCase().replace(/['"]/g, '').trim();
        const endKeywords = ["stop the interview", "end the interview", "stop the test", "end the test", "quit the interview", "quit", "stop", "end", "close the test", "i am done", "im done", "lets wrap up", "enough for today"];
        const isEndRequest = endKeywords.some(k => cleanLower === k || cleanLower.includes(k));
        
        const aiResp = await aiAssistantService.sendMessage(effectiveChatId, combinedAnswer);
        const aiText = aiResp.response;
        
        if (!aiText) {
          throw new Error("Empty AI response in Full AI Mode");
        }

        console.log("[InterviewEngine] Received AI response");
        const aiElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const aiMessage: Message = {
          type: 'ai',
          content: aiText,
          timestamp: new Date().toLocaleTimeString(),
          relativeTime: aiElapsed,
        };
        setConversation(prev => [...prev, aiMessage]);
        speakText(aiText);
        checkCodingQuestion(aiText);
        setIsAITyping(false);

        // Check if AI response confirmed interview completion or farewell
        const aiLower = aiText.toLowerCase();
        if (
          aiLower.includes("completes the interview") ||
          aiLower.includes("concludes our interview") ||
          aiLower.includes("finalize your performance report") ||
          aiLower.includes("interview is now completed") ||
          aiLower.includes("report will now be generated")
        ) {
          console.log("[InterviewEngine] AI farewell detected, wrapping up interview session...");
          setTimeout(() => handleEndInterview(), 4000);
        }
      }
    } catch (err) {
      console.error('[InterviewEngine] Dialogue error:', err);
      // Fallback: resume listening if everything fails
      setInterviewStateSync('listening');
      setIsRecording(true);
      setIsAITyping(false);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const handleToggleRecording = async () => {
    // Manual trigger for those who don't want to wait for silence
    if (interviewState === 'listening') {
      handleAutoSubmit();
    }
  };

  const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Medishetty Manikanta Gandhi';
  const userEmail = user?.email || 'mkgandhioff@gmail.com';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatTimeFull = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    const hStr = h > 0 ? `${h.toString().padStart(2, '0')} : ` : '00 : ';
    const mStr = `${m.toString().padStart(2, '0')}`;
    const sStr = `${s.toString().padStart(2, '0')}`;
    
    return `${hStr}${mStr} : ${sStr}`;
  };

  const getRingColor = () => {
    switch (interviewState) {
      case 'listening': return 'border-emerald-500/30 bg-emerald-500/5';
      case 'thinking': return 'border-amber-500/30 bg-amber-500/5';
      case 'speaking': return 'border-indigo-500/30 bg-indigo-500/5';
      default: return 'border-slate-700/30 bg-slate-700/5';
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-[#060b13] flex flex-col font-sans text-slate-200 select-none">
      <style>{`
        @keyframes pulseRing {
          0% {
            transform: scale(0.95);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
        @keyframes wave {
          0%, 100% {
            transform: scaleY(0.3);
          }
          50% {
            transform: scaleY(1);
          }
        }
        .pulse-ring-1 {
          animation: pulseRing 3s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
        }
        .pulse-ring-2 {
          animation: pulseRing 3s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
          animation-delay: 1s;
        }
        .pulse-ring-3 {
          animation: pulseRing 3s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
          animation-delay: 2s;
        }
        .soundwave-bar {
          animation: wave 1.2s ease-in-out infinite;
        }
      `}</style>

      {/* Top Bar */}
      <div className="h-16 px-6 bg-[#090e18]/95 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={knowledgeTree} alt="Yuvro" className="h-8 w-8 object-contain" />
            <span className="font-bold text-lg text-white tracking-wide">yuvro</span>
          </div>
          <div className="h-5 border-l border-slate-800 mx-1 hidden sm:block"></div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">AI Mock Interview</span>
            <span className="text-slate-700">•</span>
            <Badge className="bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border-none text-xs font-semibold px-2.5 py-0.5 rounded">
              {role.title}
            </Badge>
            <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-none text-xs font-semibold px-2.5 py-0.5 rounded capitalize">
              {difficulty}
            </Badge>
          </div>
        </div>

        {/* Dynamic State Central Badge */}
        <div className="flex items-center gap-3 bg-[#0a0f1d] border border-slate-800 px-4 py-1.5 rounded-full shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          <span className="font-mono text-sm font-bold text-slate-200 tracking-wider">
            {formatTimeFull(timeLeft)}
          </span>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-l border-slate-800 pl-3">
            Interview in progress
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span title="AI Proctoring Active">
            <Shield className="w-5 h-5 text-emerald-400 cursor-pointer hover:text-emerald-300 transition-colors mr-2" />
          </span>
          {role.id === 'jd_resume' && (
            <Button
              variant="outline"
              size="sm"
              disabled={isAITyping || isInterviewCompleted}
              onClick={handleRequestHint}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border-amber-500/20 rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 transition-all mr-2"
            >
              <HelpCircle className="w-4 h-4" />
              Request Hint
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleEndInterview}
            disabled={loadingExit}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl px-4 py-2 text-xs font-semibold border border-rose-500/20 flex items-center gap-2 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(244,63,94,0.05)]"
          >
            <LogOut className="w-4 h-4" />
            {loadingExit ? 'Leaving...' : 'Leave Interview'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full mx-auto p-6 flex gap-6 overflow-hidden max-w-[1800px]">
        {/* Left Column: AI Interviewer Card & Questions Transcript */}
        <div className={`transition-all duration-500 flex flex-col gap-6 h-full overflow-hidden ${
          showCodeEditor ? 'w-1/4' : 'w-[55%]'
        }`}>
          {/* AI Interviewer Card */}
          <Card className="bg-[#0a0f1d]/50 backdrop-blur-md border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl p-5 relative shrink-0">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-slate-400">AI Interviewer ({interviewer})</span>
              </div>
              <div className="flex items-center">
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${
                  interviewState === 'speaking' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                  interviewState === 'thinking' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                  interviewState === 'listening' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  'bg-slate-800/40 text-slate-500 border-slate-800'
                }`}>
                  {interviewState === 'speaking' ? 'Speaking' :
                   interviewState === 'thinking' ? 'Thinking' :
                   interviewState === 'listening' ? 'Listening' :
                   'Idle'}
                </span>
                {interviewState === 'speaking' && (
                  <div className="flex items-center gap-1 ml-2.5">
                    <div className="w-0.5 h-3 bg-indigo-400 rounded-full soundwave-bar" style={{ animationDelay: '0.1s' }} />
                    <div className="w-0.5 h-4.5 bg-indigo-400 rounded-full soundwave-bar" style={{ animationDelay: '0.3s' }} />
                    <div className="w-0.5 h-2 bg-indigo-400 rounded-full soundwave-bar" style={{ animationDelay: '0.5s' }} />
                    <div className="w-0.5 h-3.5 bg-indigo-400 rounded-full soundwave-bar" style={{ animationDelay: '0.2s' }} />
                    <div className="w-0.5 h-2.5 bg-indigo-400 rounded-full soundwave-bar" style={{ animationDelay: '0.4s' }} />
                  </div>
                )}
              </div>
            </div>

            <div className="h-44 relative w-full flex items-center justify-center overflow-hidden">
              {/* Radar pulse rings */}
              {interviewState !== 'initial' && (
                <>
                  <div className={`absolute w-32 h-32 rounded-full border pulse-ring-1 ${getRingColor()}`} />
                  <div className={`absolute w-32 h-32 rounded-full border pulse-ring-2 ${getRingColor()}`} />
                  <div className={`absolute w-32 h-32 rounded-full border pulse-ring-3 ${getRingColor()}`} />
                </>
              )}
              {/* Center visualizer circle */}
              <div className={`relative z-10 w-24 h-24 flex items-center justify-center rounded-full bg-[#0d1324] border transition-all duration-500 shadow-2xl ${
                interviewState === 'speaking' ? 'border-indigo-500 shadow-indigo-500/20 scale-105' :
                interviewState === 'thinking' ? 'border-amber-500 shadow-amber-500/20 scale-105' :
                interviewState === 'listening' ? 'border-emerald-500 shadow-emerald-500/20 scale-105' :
                'border-slate-800'
              }`}>
                {interviewState === 'thinking' && (
                  <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-indigo-400 border-b-transparent border-l-transparent animate-spin" />
                )}
                <span className={`text-3xl font-bold transition-colors duration-500 ${
                  interviewState === 'speaking' ? 'text-indigo-400' :
                  interviewState === 'thinking' ? 'text-amber-400' :
                  interviewState === 'listening' ? 'text-emerald-400' :
                  'text-slate-500'
                }`}>
                  J
                </span>
              </div>
            </div>
          </Card>

          {/* Transcript Log Card */}
          <Card className="flex-1 bg-[#0a0f1d]/50 backdrop-blur-md border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl p-5">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5 shrink-0">
              <h2 className="text-sm font-bold text-slate-300">Interview Transcript (AI Questions)</h2>
              <span className="flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {conversation.filter(msg => msg.type === 'ai').length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-500 mb-2" />
                  <p className="text-xs text-slate-400">AI interviewer is initializing...</p>
                </div>
              ) : (
                conversation.filter(msg => msg.type === 'ai').map((msg, idx) => (
                  <div key={idx} className="flex gap-4 items-start py-2 border-b border-white/5 last:border-0">
                    <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded shrink-0">
                      {msg.relativeTime !== undefined ? formatElapsed(msg.relativeTime) : '00:00'}
                    </span>
                    <p className="text-sm text-slate-200 leading-relaxed font-medium">
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
              <div ref={conversationEndRef} />
            </div>
          </Card>
        </div>

        {/* Code Editor Column (if toggled) */}
        {showCodeEditor && (
          <div className="flex-1 flex flex-col gap-6 h-full transition-all duration-500">
            <Card className="flex-1 h-full border-slate-800 bg-[#0a0f1d]/50 overflow-hidden flex flex-col shadow-2xl">
              <div className="px-4 py-3 bg-[#090e18]/80 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-400" /> Code Editor
                </span>
                <Badge variant="outline" className="text-[10px] text-indigo-300 border-indigo-500/20 bg-indigo-500/5">JavaScript</Badge>
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

        {/* Right Column: User Video & Live Metrics */}
        <div className={`transition-all duration-500 flex flex-col gap-6 h-full overflow-hidden shrink-0 ${
          showCodeEditor ? 'w-1/3' : 'w-[45%]'
        }`}>
          {/* User Video Card */}
          <Card className="flex-1 bg-[#0a0f1d]/50 backdrop-blur-md border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0d1324]/20 shrink-0">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-slate-300">You</span>
              </div>
              <span className={`flex items-center gap-1.5 text-[9px] px-2 py-0.5 rounded-full border transition-all ${
                isRecording ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 font-bold' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
                {isRecording ? 'RECORDING' : 'LIVE'}
              </span>
            </div>

            <div className="flex-1 bg-[#04060a] relative overflow-hidden flex items-center justify-center">
              {isVideoStopped ? (
                <div className="flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-slate-400 text-3xl font-extrabold shadow-inner">
                    {userInitials}
                  </div>
                  <p className="text-xs text-slate-500 mt-4 font-semibold tracking-wider">Camera turned off</p>
                </div>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 pointer-events-none" />

              {/* Speech Sound Wave Overlay (When speaking) */}
              {isRecording && interviewState === 'listening' && (
                <div className="absolute bottom-4 right-4 flex gap-1 items-end h-8 px-3 py-1 bg-black/40 backdrop-blur rounded-lg border border-white/5 pointer-events-none">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-0.5 bg-emerald-400/80 rounded-full soundwave-bar" style={{ height: `${Math.random() * 60 + 40}%`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}


            </div>
          </Card>

          {/* Live Metrics Row */}
          <div className="grid grid-cols-3 gap-4 shrink-0">
            {/* Eye Contact */}
            <Card className="bg-[#0a0f1d]/50 backdrop-blur-md border-white/5 p-4 rounded-2xl flex flex-col justify-between shadow-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Eye Contact</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-100 tracking-tight">{metrics.eyeContact}%</p>
                <p className="text-[10px] font-bold text-blue-400/90 capitalize">{metrics.eyeContact >= 70 ? 'Good' : 'Needs Work'}</p>
              </div>
            </Card>

            {/* Speech Clarity */}
            <Card className="bg-[#0a0f1d]/50 backdrop-blur-md border-white/5 p-4 rounded-2xl flex flex-col justify-between shadow-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Speech Clarity</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Volume2 className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-100 tracking-tight">{metrics.speechClarity}%</p>
                <p className="text-[10px] font-bold text-emerald-400/90 capitalize">{metrics.speechClarity >= 80 ? 'Excellent' : 'Good'}</p>
              </div>
            </Card>

            {/* Confidence */}
            <Card className="bg-[#0a0f1d]/50 backdrop-blur-md border-white/5 p-4 rounded-2xl flex flex-col justify-between shadow-xl">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confidence</span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-100 tracking-tight">{metrics.confidence}%</p>
                <p className="text-[10px] font-bold text-amber-400/90 capitalize">{metrics.confidence >= 70 ? 'Excellent' : 'Good'}</p>
              </div>
            </Card>
          </div>
        </div>
      </div>

    </div>
  );
};

export default InterviewScreen;