import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, RotateCcw, LogOut, User, Bot, Code, Clock } from 'lucide-react';
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
  onExit: () => void;
  onInterviewComplete: (role: Role, difficulty: string, duration: string) => void;
}

const InterviewScreen: React.FC<InterviewScreenProps> = ({
  role,
  difficulty,
  duration,
  interviewer,
  mediaStream,
  resume,
  onExit,
  onInterviewComplete
}) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentUserAnswer, setCurrentUserAnswer] = useState('');
  const [isAITyping, setIsAITyping] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);


  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [layout, setLayout] = useState<'modern' | 'classic'>('classic');

  const videoRef = useRef<HTMLVideoElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);


  const speakText = (text: string) => {
    // Cancel any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    speechRef.current = utterance;

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    const targetVoiceName = role.interviewer_voice_id;

    if (targetVoiceName) {
      selectedVoice = voices.find(voice => voice.name === targetVoiceName);
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.name.includes(targetVoiceName));
      }
    }

    // Fallback logic
    if (!selectedVoice) {
      if (interviewer === 'Junnu') {
        // IN Male preference
        selectedVoice = voices.find(voice => voice.name.includes("Microsoft Ravi")) ||
          voices.find(voice => voice.lang === "en-IN" && voice.name.toLowerCase().includes("male")) ||
          voices.find(voice => voice.name.includes("Male") && (voice.lang.includes("en-IN") || voice.name.includes("India"))) ||
          voices.find(voice => voice.name.includes("Google UK English Male"));
      } else {
        // Munnu (Default) - US Female preference
        selectedVoice = voices.find(voice => voice.name.includes("Google US English")) ||
          voices.find(voice => voice.name.includes("Microsoft Zira")) ||
          voices.find(voice => voice.lang === "en-US" && !voice.name.toLowerCase().includes("male"));
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = role.voice_speed || 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  };


  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    }
  }, []);


  const getDurationInSeconds = (durationStr: string): number => {
    const match = durationStr.match(/(\d+)\s*mins?/i);
    return match ? parseInt(match[1]) * 60 : 300;
  };


  useEffect(() => {
    const seconds = getDurationInSeconds(duration);
    setTimeLeft(seconds);

    const initInterview = async () => {
      try {
        setIsAITyping(true);

        const response = await mockInterviewService.startInterview(
          role.id,
          difficulty,
          getDurationInSeconds(duration) / 60,
          resume
        );

        if (response.chat_session_id) {
          setChatSessionId(response.chat_session_id);


          const initialPrompt = "The interview is starting now. Please introduce yourself and ask the first question.";
          const aiResponse = await aiAssistantService.sendMessage(response.chat_session_id, initialPrompt);

          const aiText = aiResponse.response;
          setConversation([{
            type: 'ai',
            content: aiText,
            timestamp: new Date().toLocaleTimeString(),
            questionType: 'behavioral' // Default
          }]);

          speakText(aiText);

          // Check if coding question (heuristic: contains "code" or "function")
          if (aiText.toLowerCase().includes("code") || aiText.toLowerCase().includes("function")) {
            setShowCodeEditor(true);
          } else {
            setShowCodeEditor(false);
          }
        }
        setIsAITyping(false);
      } catch (error) {
        console.error("Failed to start interview", error);
        setIsAITyping(false);
        // Handle error (alert or exit)
      }
    };

    initInterview();
  }, [role.id, difficulty, duration]); // dependency on role vars

  const handleEndInterview = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
    }
    window.speechSynthesis.cancel();
    onExit();
  };


  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleEndInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);


  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Auto-play was prevented
          // Show a UI element to let the user manually start playback
          console.log("Video playback failed", error);
        });
      }
    }
  }, [mediaStream, layout]);


  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        setCurrentUserAnswer(prev => {
          const base = prev.split(" [interim]")[0]; // remove previous interim
          return base + finalTranscript + (interimTranscript ? ` [interim]${interimTranscript}` : '');
        });
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          try { recognitionRef.current?.start(); } catch (e) { }
        }
      };
    }
    return () => {
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
    }
  }, [isRecording]);


  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, isUserTyping, isAITyping]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleRecording = async () => {
    if (!chatSessionId) {
      alert("Interview not initialized yet.");
      return;
    }

    if (!isRecording) {
      window.speechSynthesis.cancel();
      setIsRecording(true);
      setIsUserTyping(true);
      setCurrentUserAnswer('');
      if (recognitionRef.current) try { recognitionRef.current.start(); } catch (e) { }
    } else {
      setIsRecording(false);
      setIsUserTyping(false);
      if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }

      // Clean Answer
      let cleanAnswer = currentUserAnswer.replace(/ \[interim\].*$/, '').trim();
      if (!cleanAnswer && showCodeEditor && currentCode) {
        cleanAnswer = "I have written the code in the editor.";
      }

      const combinedAnswer = cleanAnswer + (showCodeEditor && currentCode ? `\n\n[Code Submission]:\n${currentCode}` : "");

      const userMessage: Message = {
        type: 'user',
        content: cleanAnswer || "(No verbal answer)",
        timestamp: new Date().toLocaleTimeString(),
        codeSubmission: showCodeEditor ? currentCode : undefined
      };
      setConversation(prev => [...prev, userMessage]);
      setCurrentUserAnswer('');
      setCurrentCode('');

      // Send to AI
      setIsAITyping(true);
      try {
        const aiResp = await aiAssistantService.sendMessage(chatSessionId, combinedAnswer);
        const aiText = aiResp.response;

        const aiMessage: Message = {
          type: 'ai',
          content: aiText,
          timestamp: new Date().toLocaleTimeString(),
          questionType: 'behavioral' // In full AI, we deduce type or assume behavioral/mixed
        };
        setConversation(prev => [...prev, aiMessage]);
        speakText(aiText);

        if (aiText.toLowerCase().includes("write code") ||
          aiText.toLowerCase().includes("coding question") ||
          aiText.toLowerCase().includes("write a function") ||
          aiText.match(/```/)) {

          const codeBlockRegex = /```(?:javascript|js|python|java|cpp|typescript|ts)?\s*([\s\S]*?)```/i;
          const match = aiText.match(codeBlockRegex);

          if (match && match[1]) {
            setCurrentCode(match[1].trim());
            if (!showCodeEditor) setShowCodeEditor(true);
          } else {
            if (!showCodeEditor) setShowCodeEditor(true);
          }
        }
      } catch (err) {
        console.error("AI Error", err);
      } finally {
        setIsAITyping(false);
      }
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col font-sans selection:bg-blue-100">


      <div className="bg-white border-b border-slate-200 px-6 py-3 grid grid-cols-3 items-center sticky top-0 z-50 shadow-sm transition-all">


        <div className="flex items-center gap-4 justify-self-start">
          <Button variant="ghost" size="sm" onClick={onExit} className="text-slate-500 hover:text-slate-900">
            <LogOut className="w-4 h-4 mr-2" />
            Exit
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200 border-transparent font-mono hidden sm:inline-flex">{role.title}</Badge>
            <Badge className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100">{difficulty}</Badge>
          </div>
        </div>


        <div className="justify-self-center flex justify-center w-full">
          {layout === 'classic' && (
            <div className="w-20 h-10 bg-black rounded-md overflow-hidden border border-slate-200 shadow-sm relative group transform-gpu ring-1 ring-slate-900/5">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full border border-white"></div>
            </div>
          )}
        </div>


        <div className="flex items-center gap-4 justify-self-end">

          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setLayout('modern')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${layout === 'modern' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Split
            </button>
            <button
              onClick={() => setLayout('classic')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${layout === 'classic' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Classic
            </button>
          </div>


          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </div>


      <div className="flex-1 w-full mx-auto p-6 flex gap-6 overflow-hidden transition-all duration-500 relative max-w-[1800px]">





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


            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {conversation.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                  <Bot className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">The Ai is preparing your first question...</p>
                </div>
              )}

              {conversation.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${msg.type === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                    }`}>
                    <div className="flex items-center gap-2 mb-2 opacity-70 text-[10px] uppercase font-bold tracking-wider">
                      {msg.type === 'ai' ? <><Bot className="w-3 h-3" /> AI Interviewer</> : <><User className="w-3 h-3" /> You</>}
                      <span>• {msg.timestamp}</span>
                    </div>
                    {msg.content}

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
              {isUserTyping && (
                <div className="flex justify-end text-xs text-slate-400 mr-2">
                  Listening... <span className="ml-1 animate-pulse">🎤</span>
                </div>
              )}
              <div ref={conversationEndRef} />
            </div>


            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-center gap-4">

              {isRecording && (
                <div className="flex items-center gap-1 h-8 px-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-1 bg-red-500 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]" style={{ height: `${Math.random() * 100}%` }} />
                  ))}
                </div>
              )}

              <Button
                size="lg"
                onClick={handleToggleRecording}
                disabled={isAITyping}
                className={`rounded-full px-8 h-12 font-bold shadow-lg transition-all ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-200'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'
                  }`}
              >
                {isRecording ? <><MicOff className="w-4 h-4 mr-2" /> Stop Recording</> : <><Mic className="w-4 h-4 mr-2" /> Start Answer</>}
              </Button>
            </div>
          </Card>

        </div>


        {showCodeEditor && (
          <div className={`gap-6 transition-all duration-500 flex flex-col ${layout === 'classic' ? 'w-full lg:w-1/2' : 'w-full lg:w-1/2'}`}>
            <Card className="flex-1 h-full border-slate-200 overflow-hidden flex flex-col shadow-sm transition-all duration-500">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-2"><Code className="w-3 h-3" /> Code Editor</span>
                <Badge variant="outline" className="text-[10px] bg-white">JavaScript</Badge>
              </div>
              <div className="flex-1 relative">
                <CodeEditor
                  initialCode={currentCode}
                  initialLanguage={'javascript'}
                  onCodeChange={setCurrentCode}
                  className="h-full border-none"
                />
              </div>
            </Card>
          </div>
        )}


        {layout === 'modern' && (
          <div className={`flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500 ${showCodeEditor ? 'w-full lg:w-1/3' : 'w-full lg:w-1/4'}`}>


            <Card className={`overflow-hidden shadow-sm transition-all duration-300 ${isAITyping ? 'ring-2 ring-blue-500 shadow-blue-200 scale-[1.02]' : 'border-slate-200'}`}>
              <div className={`p-3 border-b flex justify-between items-center transition-colors ${isAITyping ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-white border-slate-100 text-slate-800'} font-bold text-sm`}>
                <span>AI Interviewer ({interviewer})</span>
                {isAITyping && <span className="text-[10px] uppercase font-extrabold animate-pulse">Speaking...</span>}
              </div>
              <div className="aspect-video bg-slate-50 relative flex items-center justify-center overflow-hidden">

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
              <div className="flex-1 bg-black relative overflow-hidden group">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />


                {isRecording && (
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1 items-end h-12 px-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className="w-1.5 bg-green-400/80 rounded-t-full" style={{
                        height: '20%',
                        animation: `visualizer 0.5s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.05}s`
                      }} />
                    ))}
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