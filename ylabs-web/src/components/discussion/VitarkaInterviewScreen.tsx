import React, { useState, useEffect, useRef } from "react";
import { yhubApiAuthUtil } from "../../utils/RestApiAuthUtil";

interface Message {
  type: "ai" | "user";
  content: string;
}

export function VitarkaInterviewScreen({
  mockInterviewId,
  onEnd,
}: {
  mockInterviewId: string;
  onEnd: () => void;
}) {
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const interviewStateRef = useRef(interviewState);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const currentUserAnswerRef = useRef(currentUserAnswer);
  const sessionInfoRef = useRef(sessionInfo);
  const isFinishedRef = useRef(false);
  const processingRef = useRef(false);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setMediaStream(stream);
      setHasPermissions(true);
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
    };
  }, [mediaStream]);

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find((v) => v.lang.startsWith("en") && v.name.includes("Female"));
    if (!selectedVoice) selectedVoice = voices.find((v) => v.lang.startsWith("en"));
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.onstart = () => {
      setInterviewState("speaking");
    };

    utterance.onend = () => {
      if (isFinishedRef.current) {
        setTimeout(() => handleEnd(), 1000);
      } else {
        setInterviewState("listening");
        try {
          recognitionRef.current?.start();
        } catch (e) {}
      }
    };

    utterance.onerror = () => {
      if (isFinishedRef.current) {
        setTimeout(() => handleEnd(), 1000);
      } else {
        setInterviewState("listening");
        try {
          recognitionRef.current?.start();
        } catch (e) {}
      }
    };

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
          sequential: true,
          force: true,
        },
      );
      setSessionInfo({
        interview_session_id: res.interview_session_id,
        submission_id: res.submission_id,
      });

      const firstQ = res.first_question || "Hello. Let's begin the discussion.";
      setConversation([{ type: "ai", content: firstQ }]);
      speakText(firstQ);
    } catch (err) {
      console.error("Failed to start interview", err);
      alert("Failed to initialize interview.");
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
        if (interviewStateRef.current !== "listening" || isUnmountedRef.current) return;

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
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      window.speechSynthesis.cancel();
      mediaStream?.getTracks().forEach((t) => t.stop());
    };
  }, [hasPermissions]);

  const handleAutoSubmit = async () => {
    if (processingRef.current || isFinishedRef.current || interviewStateRef.current !== "listening")
      return;

    let cleanAnswer = currentUserAnswerRef.current.replace(/ \[interim\].*$/, "").trim();
    if (!cleanAnswer) {
      setInterviewState("listening");
      return;
    }

    processingRef.current = true;
    setInterviewState("thinking");
    recognitionRef.current?.stop();

    setConversation((prev) => [...prev, { type: "user", content: cleanAnswer }]);
    setCurrentUserAnswer("");

    try {
      const sessionId = sessionInfoRef.current?.interview_session_id;
      const res = await yhubApiAuthUtil.post<any>(
        `/mock-interviews/${mockInterviewId}/get_next_question/`,
        {
          interview_session_id: sessionId,
          user_answer: cleanAnswer,
          status: "normal",
        },
      );

      const nextQ = res.question;
      setConversation((prev) => [...prev, { type: "ai", content: nextQ }]);
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

  const handleEnd = async () => {
    isFinishedRef.current = true;
    window.speechSynthesis.cancel();
    try {
      recognitionRef.current?.abort();
    } catch (e) {}
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

    onEnd();
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
    <div className="mx-auto flex h-[85vh] max-w-7xl flex-col gap-6 px-8 py-6 lg:flex-row">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex items-center justify-between rounded-t-2xl border-b border-neutral-800 bg-[#0b0b0c] px-6 py-4">
          <h2 className="font-serif text-xl font-medium text-white">Vitarka AI Discussion</h2>
          <div className="flex items-center gap-3">
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

        <div className="flex-1 overflow-y-auto rounded-b-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6">
            {conversation.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${msg.type === "user" ? "bg-neutral-900 text-white rounded-br-none" : "bg-neutral-50 text-neutral-900 rounded-bl-none border border-neutral-100"}`}
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
        </div>
      </div>

      <div className="flex w-full flex-col gap-6 lg:w-80">
        <div className="overflow-hidden rounded-2xl bg-neutral-900 shadow-lg">
          <video ref={videoRef} muted playsInline className="h-48 w-full object-cover" />
          <div className="flex justify-center p-4">
            <button
              onClick={handleEnd}
              className="rounded-lg bg-red-500/10 px-5 py-2 text-[13px] font-medium text-red-500 transition hover:bg-red-500/20"
            >
              End Discussion
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-500">
            How it works
          </h3>
          <ul className="flex flex-col gap-3 text-[13px] text-neutral-600 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-neutral-900">1.</span> Speak naturally. The AI is listening when
              the dot is green.
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-900">2.</span> Pause when you're done. Your answer will
              be automatically submitted after 2 seconds of silence.
            </li>
            <li className="flex gap-2">
              <span className="text-neutral-900">3.</span> The AI will respond and ask follow-up
              questions sequentially.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
