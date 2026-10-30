import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { yhubApiAuthUtil } from "../../utils/RestApiAuthUtil";
import { VitarkaCodeEditor, EditorDisplayMode } from "./VitarkaCodeEditor";

interface Message {
  type: "ai" | "user";
  content: string;
}

export interface VitarkaInterviewScreenRef {
  cancelEnd: () => void;
  confirmEnd: () => Promise<void>;
}

export interface VitarkaInterviewScreenProps {
  mockInterviewId: string;
  onEnd: () => void;
  candidateContext?: string;
  discussionMaxScore?: number;
  onQuestionChange?: (question: string) => void;
  onSessionStart?: (sessionId: string) => void;
}

export const VitarkaInterviewScreen = forwardRef<
  VitarkaInterviewScreenRef,
  VitarkaInterviewScreenProps
>(function VitarkaInterviewScreen(
  {
    mockInterviewId,
    onEnd,
    candidateContext,
    discussionMaxScore,
    onQuestionChange,
    onSessionStart,
  },
  ref,
) {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentUserAnswer, setCurrentUserAnswer] = useState("");
  const [interviewState, setInterviewState] = useState<
    "initial" | "listening" | "thinking" | "speaking"
  >("initial");
  const [hasPermissions, setHasPermissions] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{
    interview_session_id?: string;
    submission_id?: string;
  } | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [manualText, setManualText] = useState("");
  const [showInactivityModal, setShowInactivityModal] = useState(false);

  // Code editor states
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [editorDisplayMode, setEditorDisplayMode] = useState<EditorDisplayMode>("normal");
  const [codeContent, setCodeContent] = useState("");
  const [codeLanguage, setCodeLanguage] = useState("python");
  const codeContentRef = useRef(codeContent);
  const codeLanguageRef = useRef(codeLanguage);

  useEffect(() => {
    codeContentRef.current = codeContent;
  }, [codeContent]);

  useEffect(() => {
    codeLanguageRef.current = codeLanguage;
  }, [codeLanguage]);

  const checkIfCodingQuestion = (text: string, resData?: Record<string, unknown>): boolean => {
    if (!text) return false;
    const meta = resData?.metadata as Record<string, unknown> | undefined;
    if (resData?.question_kind === "coding" || meta?.requires_code === true) {
      return true;
    }
    const lower = text.toLowerCase();
    const codingTriggers = [
      "write a code",
      "write code",
      "write the code",
      "write a program",
      "write a function",
      "write a method",
      "implement a function",
      "implement the function",
      "implement a method",
      "implement an algorithm",
      "write a query",
      "write an sql",
      "write a class",
      "code a solution",
      "code this",
      "code it",
      "write a snippet",
      "code snippet",
      "can you code",
      "please code",
    ];
    return (
      codingTriggers.some((trigger) => lower.includes(trigger)) ||
      /```[a-z]*\n[\s\S]*?```/i.test(text)
    );
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityAttemptsRef = useRef(0);
  const isWaitingForConfirmationRef = useRef(false);
  const interviewStateRef = useRef(interviewState);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const currentUserAnswerRef = useRef(currentUserAnswer);
  const sessionInfoRef = useRef(sessionInfo);
  const isFinishedRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const processingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    cancelEnd: () => {
      try {
        window.speechSynthesis.resume();
      } catch (e) {}
      if (!isFinishedRef.current && !isUnmountedRef.current) {
        setInterviewState("listening");
        resetInactivityTimer();
        try {
          recognitionRef.current?.start();
        } catch (e) {}
      }
    },
    confirmEnd: async () => {
      await handleEndConfirm();
    },
  }));

  useEffect(() => {
    interviewStateRef.current = interviewState;
  }, [interviewState]);
  useEffect(() => {
    currentUserAnswerRef.current = currentUserAnswer;
  }, [currentUserAnswer]);
  useEffect(() => {
    sessionInfoRef.current = sessionInfo;
  }, [sessionInfo]);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, currentUserAnswer]);

  const requestPermissions = async () => {
    onSessionStart?.("started");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setMediaStream(stream);
      setHasPermissions(true);

      // Start audio level visualizer
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            if (isUnmountedRef.current || isFinishedRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((avg / 128) * 100));
            setMicVolume(normalized);
            animFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        }
      } catch (audioErr) {
        console.warn("Could not start audio visualizer:", audioErr);
      }

      startInterview();
    } catch (e) {
      console.error("Permissions denied:", e);
      alert("Camera and Microphone access is required for the Engineering Discussion.");
    }
  };

  useEffect(() => {
    if (mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(console.error);
    }
    return () => {
      mediaStream?.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => null);
      }
    };
  }, [mediaStream]);

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (isFinishedRef.current) return;
    // Extended timeout to 40 seconds to give candidates time to think and formulate answers
    inactivityTimerRef.current = setTimeout(() => {
      handleInactivityTimeout();
    }, 40000);
  };

  const INACTIVITY_PHRASES = [
    "Take your time. Whenever you're ready, feel free to speak or type your answer below.",
    "I'm listening. Take a moment if needed, or you can submit your answer in the text box.",
    "Whenever you are ready, please share your thoughts on the question.",
  ];

  const handleInactivityTimeout = () => {
    if (
      isFinishedRef.current ||
      processingRef.current ||
      interviewStateRef.current !== "listening" ||
      currentUserAnswerRef.current.replace(/ \[interim\].*$/, "").trim().length > 0 ||
      manualText.trim().length > 0
    ) {
      return;
    }

    inactivityAttemptsRef.current += 1;

    // After 3 gentle reminders, display an inactivity prompt banner rather than abruptly killing the interview
    if (inactivityAttemptsRef.current >= 3) {
      setShowInactivityModal(true);
      const promptText = "I haven't heard a response in a while. Would you like to continue the interview, or submit your current progress?";
      setConversation((prev) => [...prev, { type: "ai", content: promptText }]);
      speakText(promptText);
      return;
    }

    const promptText = INACTIVITY_PHRASES[(inactivityAttemptsRef.current - 1) % INACTIVITY_PHRASES.length];
    setConversation((prev) => [...prev, { type: "ai", content: promptText }]);
    setCurrentUserAnswer("");
    speakText(promptText);
  };

  const speakText = (text: string, onEndCallback?: () => void) => {
    window.speechSynthesis.cancel();
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    // Immediately stop listening so the microphone does NOT pick up AI audio from speakers
    setInterviewState("speaking");
    try {
      recognitionRef.current?.abort();
    } catch (e) {}
    setCurrentUserAnswer("");

    // Clean text for speech synthesis so symbols like ` are not read aloud as "back quote"
    let cleanSpeechText = text
      .replace(/`+/g, "")
      .replace(/[*#~]/g, "")
      .replace(/_/g, " ")
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    // Convert ALL CAPS words (length > 3) to lowercase so they are spoken as words instead of acronyms
    cleanSpeechText = cleanSpeechText.replace(/\b[A-Z]{4,}\b/g, (match) => match.toLowerCase());

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find((v) => v.lang.startsWith("en") && v.name.includes("Female"));
    if (!selectedVoice) selectedVoice = voices.find((v) => v.lang.startsWith("en"));
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onstart = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setInterviewState("speaking");
      try {
        recognitionRef.current?.abort();
      } catch (e) {}
    };

    const handleSpeakEnd = () => {
      if (onEndCallback) {
        onEndCallback();
        return;
      }
      if (isFinishedRef.current || isUnmountedRef.current) {
        setTimeout(() => handleEndRequest(), 1000);
      } else {
        // Small delay to prevent speaker reverberation from triggering mic
        setTimeout(() => {
          if (
            !isFinishedRef.current &&
            !isUnmountedRef.current &&
            !window.speechSynthesis.speaking
          ) {
            setInterviewState("listening");
            setCurrentUserAnswer("");
            resetInactivityTimer();
            try {
              recognitionRef.current?.start();
            } catch (e) {}
          }
        }, 400);
      }
    };

    utterance.onend = handleSpeakEnd;
    utterance.onerror = handleSpeakEnd;

    window.speechSynthesis.speak(utterance);
  };

  const startInterview = async () => {
    if (!mockInterviewId) {
      alert("No mock interview ID provided. Cannot start discussion.");
      return;
    }
    setInterviewState("thinking");
    try {
      const res = await yhubApiAuthUtil.post<any>(
        `/mock-interviews/${mockInterviewId}/start_interview/`,
        {
          source: "evaluation",
          sequential: true,
          force: true,
          candidate_context: candidateContext,
          discussion_max_score: discussionMaxScore,
          max_score: discussionMaxScore,
        },
      );
      setSessionInfo({
        interview_session_id: res.interview_session_id,
        submission_id: res.submission_id,
      });
      if (res.interview_session_id) onSessionStart?.(res.interview_session_id);

      const firstQRaw = res.first_question || "Hello. Let's begin the discussion.";
      const isCoding = checkIfCodingQuestion(firstQRaw, res);
      setShowCodeEditor(isCoding);
      if (isCoding) {
        setEditorDisplayMode("normal");
      }

      const firstQ = firstQRaw.replace(/`+/g, "");
      setConversation([{ type: "ai", content: firstQ }]);
      onQuestionChange?.(firstQ);
      speakText(firstQ);
    } catch (err) {
      console.error("Failed to start interview", err);
      setInterviewState("initial");
      alert("Failed to initialize interview. Please check your connection and try again.");
    }
  };

  const isUnmountedRef = useRef(false);

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (hasPermissions && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        if (
          interviewStateRef.current !== "listening" ||
          isUnmountedRef.current ||
          window.speechSynthesis.speaking
        ) {
          return;
        }

        if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          handleAutoSubmit();
        }, 2000);

        let final = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t;
          else interim += t;
        }

        setCurrentUserAnswer((prev) => {
          const base = prev.split(" [interim]")[0];
          return base + final + (interim ? ` [interim]${interim}` : "");
        });
      };

      recognition.onend = () => {
        if (
          !isFinishedRef.current &&
          interviewStateRef.current === "listening" &&
          !isUnmountedRef.current
        ) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
    }
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch (e) {}
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      window.speechSynthesis.cancel();
      mediaStream?.getTracks().forEach((t) => t.stop());
    };
  }, [hasPermissions]);

  const handleAutoSubmit = async () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (processingRef.current || isFinishedRef.current || interviewStateRef.current !== "listening")
      return;

    let cleanAnswer = currentUserAnswerRef.current.replace(/ \[interim\].*$/, "").trim();
    if (!cleanAnswer) {
      setInterviewState("listening");
      resetInactivityTimer();
      return;
    }

    inactivityAttemptsRef.current = 0;

    if (isWaitingForConfirmationRef.current) {
      const lowerAnswer = cleanAnswer.toLowerCase();
      isWaitingForConfirmationRef.current = false;

      setConversation((prev) => [...prev, { type: "user", content: cleanAnswer }]);
      setCurrentUserAnswer("");

      if (
        lowerAnswer.includes("no") ||
        lowerAnswer.includes("stop") ||
        lowerAnswer.includes("end") ||
        lowerAnswer.includes("quit") ||
        lowerAnswer.includes("exit")
      ) {
        const promptText = "Okay, thanks for your time. I am ending the interview.";
        setConversation((prev) => [...prev, { type: "ai", content: promptText }]);
        speakText(promptText, () => {
          handleEndConfirm();
        });
        return;
      } else {
        const promptText =
          "Great, let's continue. Could you please provide your answer to the previous question?";
        setConversation((prev) => [...prev, { type: "ai", content: promptText }]);
        speakText(promptText);
        return;
      }
    }

    processingRef.current = true;
    setInterviewState("thinking");
    recognitionRef.current?.stop();

    // If candidate wrote code, format the answer to include code block
    let finalAnswerToSubmit = cleanAnswer;
    const currentCode = codeContentRef.current?.trim();
    if (showCodeEditor && currentCode) {
      finalAnswerToSubmit = `${cleanAnswer}\n\n\`\`\`${codeLanguageRef.current}\n${currentCode}\n\`\`\``;
    }

    setConversation((prev) => [...prev, { type: "user", content: finalAnswerToSubmit }]);
    setCurrentUserAnswer("");

    try {
      const sessionId = sessionInfoRef.current?.interview_session_id;
      const res = await yhubApiAuthUtil.post<any>(
        `/mock-interviews/${mockInterviewId}/get_next_question/`,
        {
          source: "evaluation",
          interview_session_id: sessionId,
          user_answer: finalAnswerToSubmit,
          status: "normal",
        },
      );

      const nextQRaw = res.question || "";
      const isCoding = checkIfCodingQuestion(nextQRaw, res);
      setShowCodeEditor(isCoding);
      if (isCoding) {
        setEditorDisplayMode("normal");
      }

      const nextQ = nextQRaw.replace(/`+/g, "");
      setConversation((prev) => [...prev, { type: "ai", content: nextQ }]);
      onQuestionChange?.(nextQ);
      speakText(nextQ);

      if (res.is_finished) {
        isFinishedRef.current = true;
      }
    } catch (err) {
      console.error("Failed to get next question", err);
      setInterviewState("listening");
      try {
        recognitionRef.current?.start();
      } catch (e) {}
    } finally {
      processingRef.current = false;
    }
  };

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualText.trim() || processingRef.current || isFinishedRef.current) return;
    const textToSend = manualText.trim();
    setManualText("");
    currentUserAnswerRef.current = textToSend;
    handleAutoSubmit();
  };

  const handleEndRequest = () => {
    if (isSubmittingRef.current) return;
    try {
      window.speechSynthesis.pause();
    } catch (e) {}
    try {
      recognitionRef.current?.stop();
    } catch (e) {}
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    onEnd();
  };

  const handleEndConfirm = async () => {
    isSubmittingRef.current = true;
    isFinishedRef.current = true;
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    try {
      recognitionRef.current?.abort();
    } catch (e) {}
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    mediaStream?.getTracks().forEach((t) => t.stop());

    if (sessionInfoRef.current?.interview_session_id) {
      try {
        await yhubApiAuthUtil.post(
          `/interviews/${sessionInfoRef.current.interview_session_id}/end_interview/`,
          {},
        );
      } catch (err) {
        console.error("Failed to mark interview as completed", err);
      }
    }
  };

  if (!hasPermissions) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center">
        <h2 className="mb-4 font-serif text-3xl font-medium text-neutral-900">
          Engineering Discussion
        </h2>
        <p className="mb-8 max-w-md text-neutral-500">
          We will now conduct an AI-led voice discussion. Please ensure you are in a quiet
          environment and allow camera/microphone access to begin.
        </p>
        <button
          onClick={requestPermissions}
          className="rounded-lg bg-neutral-900 px-6 py-3 font-medium text-white transition hover:bg-neutral-800"
        >
          Allow Access & Start
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[85vh] max-w-7xl flex-col gap-6 px-8 py-6 lg:flex-row relative">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-neutral-800 bg-[#0b0b0c] px-6 py-4">
          <h2 className="font-serif text-xl font-medium text-white">Vitarka AI Discussion</h2>
          <div className="flex items-center gap-4">
            {/* Live Microphone Audio Level Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-800/80 border border-neutral-700/60" title={`Microphone Input Level: ${micVolume}%`}>
              <span className={`text-[11px] font-medium ${micVolume > 5 ? "text-emerald-400" : "text-neutral-400"}`}>
                Mic
              </span>
              <div className="flex items-end gap-0.5 h-3 w-8">
                {[15, 35, 60, 85].map((threshold, i) => (
                  <span
                    key={i}
                    className={`w-1.5 rounded-xs transition-all duration-75 ${
                      micVolume >= threshold
                        ? threshold > 60
                          ? "bg-amber-400 h-full"
                          : "bg-emerald-400 h-full"
                        : "bg-neutral-600 h-1"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 items-center justify-center">
                <span
                  className={`absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full opacity-75 ${interviewState === "listening" ? "bg-emerald-400" : "bg-neutral-500"}`}
                ></span>
                <span
                  className={`relative inline-flex h-2.5 w-2.5 rounded-full ${interviewState === "listening" ? "bg-emerald-500" : "bg-neutral-500"}`}
                ></span>
              </span>
              <span className="text-[13px] font-medium text-neutral-400 uppercase tracking-wider">
                {interviewState === "thinking"
                  ? "AI is thinking..."
                  : interviewState === "speaking"
                    ? "AI is speaking..."
                    : "Listening..."}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-b-2xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-6 overflow-y-auto">
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${msg.type === "user" ? "bg-neutral-900 text-white rounded-br-none" : "bg-neutral-50 text-neutral-900 rounded-bl-none border border-neutral-100"}`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {currentUserAnswer && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-none bg-neutral-900/80 px-5 py-3.5 text-[15px] leading-relaxed text-white shadow-sm opacity-70">
                  {currentUserAnswer}
                  <span className="animate-pulse ml-1">...</span>
                </div>
              </div>
            )}
            <div ref={conversationEndRef} />
          </div>

          {/* Text Input Fallback if microphone speech recognition fails */}
          <form onSubmit={handleManualSubmit} className="mt-4 pt-3 border-t border-neutral-100 flex items-center gap-2">
            <input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Or type your response here if microphone recognition has issues..."
              disabled={interviewState !== "listening" || processingRef.current}
              className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[14px] text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-neutral-900 focus:outline-none transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!manualText.trim() || interviewState !== "listening" || processingRef.current}
              className="rounded-xl bg-neutral-900 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-neutral-800 disabled:opacity-40 transition"
            >
              Send Answer
            </button>
          </form>
        </div>

        {/* Code Editor for Coding Questions */}
        {showCodeEditor && (
          <div className="w-full">
            <VitarkaCodeEditor
              code={codeContent}
              onChange={setCodeContent}
              language={codeLanguage}
              onLanguageChange={setCodeLanguage}
              displayMode={editorDisplayMode}
              onDisplayModeChange={setEditorDisplayMode}
            />
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-6 lg:w-80">
        <div className="overflow-hidden rounded-2xl bg-neutral-900 shadow-lg">
          <video ref={videoRef} muted playsInline className="h-48 w-full object-cover" />
          <div className="flex justify-center p-4">
            <button
              onClick={handleEndRequest}
              className="rounded-lg bg-red-500/10 px-5 py-2 text-[13px] font-medium text-red-500 transition hover:bg-red-500/20"
            >
              End Discussion
            </button>
          </div>
        </div>

        {/* Floating thumbnail of video & status when editor is maximized */}
        {showCodeEditor && editorDisplayMode === "maximized" && (
          <div className="fixed bottom-6 right-6 z-50 w-72 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 shadow-2xl">
            <div className="relative">
              <video ref={videoRef} muted playsInline className="h-40 w-full object-cover" />
              <div className="absolute top-2 left-2 flex items-center gap-2 rounded-full bg-black/60 px-2.5 py-1 backdrop-blur-sm">
                <span
                  className={`h-2 w-2 rounded-full ${interviewState === "listening" ? "bg-emerald-400" : "bg-neutral-400"}`}
                ></span>
                <span className="text-[11px] font-medium text-white capitalize">
                  {interviewState}
                </span>
              </div>
            </div>
            <div className="p-3 text-[12px] text-neutral-300">
              <p className="line-clamp-2">
                {conversation[conversation.length - 1]?.content || "Listening..."}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
            How it works
          </h3>
          <ul className="flex flex-col gap-3 text-[13px] text-neutral-600 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-neutral-900">1.</span> Speak naturally. The green dot and top mic indicator show when your voice is detected.
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-900">2.</span> Pause when you're done. Your answer will be submitted automatically after 2 seconds of silence.
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-900">3.</span> If your microphone is not recognized, you can use the text box at the bottom to type your answer.
            </li>
            {showCodeEditor && (
              <li className="flex gap-2 text-emerald-600 font-medium">
                <span>4.</span> Write and Run code in the editor above. You can minimize or maximize
                it as needed.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Inactivity Prompt Modal */}
      {showInactivityModal && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-serif font-medium text-neutral-900">Are you still there?</h3>
            <p className="mt-2 text-[14px] text-neutral-600 leading-relaxed">
              We haven't received a response in a while. Would you like to continue the discussion, or end it now?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowInactivityModal(false);
                  handleEndConfirm();
                }}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition"
              >
                End Interview
              </button>
              <button
                onClick={() => {
                  setShowInactivityModal(false);
                  inactivityAttemptsRef.current = 0;
                  setInterviewState("listening");
                  resetInactivityTimer();
                  try { recognitionRef.current?.start(); } catch (e) {}
                }}
                className="rounded-lg bg-neutral-900 px-5 py-2 text-[13px] font-medium text-white hover:bg-neutral-800 transition"
              >
                Continue Discussion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
