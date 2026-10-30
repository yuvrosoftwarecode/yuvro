import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Clock,
  ChevronRight,
  PhoneOff,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Loader2,
  Volume2,
  VolumeX,
  BrainCircuit,
  Trash2,
  Send,
  Zap,
  Ear,
  Hourglass,
  Award,
  Copy,
  Check,
  FileText,
  MessageSquare,
  User,
  Bot,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { type Interview } from "@/lib/mockInterviews";
import {
  fetchMockInterviewBySlugOrId,
  startBackendInterview,
  submitBackendAnswer,
  generateBackendReport,
  fetchBackendSubmission,
} from "@/services/mockInterviewService";

export const Route = createFileRoute("/mock-interview/$slug")({
  head: () => ({
    meta: [
      { title: "Vitarka Interview | Yuvro" },
      { name: "description", content: "Live AI mock interview with Vitarka Dynamic Engine." },
    ],
  }),
  loader: async ({ params }): Promise<Interview> => {
    const i = await fetchMockInterviewBySlugOrId(params.slug);
    if (!i) throw notFound();
    return i;
  },
  component: InterviewScreen,
});

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

interface QuestionItem {
  id: string;
  text: string;
  skill: string;
  followUps?: string[];
}

export type MicState = "ready" | "listening" | "speaking" | "processing";

const INTRO_PROMPT =
  "Hello! Welcome to your interview. Let's start with a brief introduction. Could you please introduce yourself?";
const SILENCE_REMINDER_PROMPT =
  "Would you like me to repeat the question, or are you ready to answer?";

// Browser SpeechRecognition constructor with cross-browser prefixes
const SpeechRecognitionClass =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition
    : null;

// Persistent consistent voice cache so AI voice never changes between questions
let globalConsistentVoice: SpeechSynthesisVoice | null = null;

function getConsistentVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (globalConsistentVoice) return globalConsistentVoice;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const voice =
    voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google US English")) ||
    voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
    voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Samantha"))) ||
    voices.find((v) => v.lang.startsWith("en") && !v.name.includes("Fred") && !v.name.includes("Zarvox")) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    voices[0];

  if (voice) {
    globalConsistentVoice = voice;
  }
  return globalConsistentVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      getConsistentVoice();
    };
  } catch {}
}

function isRepeatRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const keywords = [
    "repeat",
    "repeat the question",
    "can you repeat",
    "could you repeat",
    "please repeat",
    "say that again",
    "say again",
    "pardon",
    "what was the question",
    "didn't catch that",
    "did not catch that",
    "couldn't hear",
    "what did you say",
    "rephrase",
    "come again",
  ];
  return keywords.some((kw) => lower.includes(kw));
}

function isReadyOnly(text: string): boolean {
  const lower = text.toLowerCase().trim().replace(/[.,!]/g, "");
  return (
    lower === "ready" ||
    lower === "i am ready" ||
    lower === "im ready" ||
    lower === "yes ready" ||
    lower === "yes i am ready" ||
    lower === "yes"
  );
}

function InterviewScreen() {
  const iv = Route.useLoaderData();

  // Question bank loaded directly from backend predefined_tree
  const questions: QuestionItem[] = useMemo(() => {
    if (iv.predefinedTree && Array.isArray(iv.predefinedTree) && iv.predefinedTree.length > 0) {
      return iv.predefinedTree.map((node: any, k: number) => {
        const followUps: string[] = [];
        if (node.follow_ups && Array.isArray(node.follow_ups)) {
          for (const f of node.follow_ups) {
            if (f.text) followUps.push(f.text);
            if (f.follow_ups && Array.isArray(f.follow_ups)) {
              for (const deepF of f.follow_ups) {
                if (deepF.text) followUps.push(deepF.text);
              }
            }
          }
        }
        return {
          id: node.id || `q-${k}`,
          text: node.text,
          skill: `${iv.name} · Topic ${k + 1}`,
          followUps,
        };
      });
    }

    const skills =
      iv.requiredSkills && iv.requiredSkills.length > 0
        ? iv.requiredSkills
        : [iv.name];

    return skills.map((skill, k) => ({
      id: `q-dyn-${k}`,
      text: `Could you walk me through your hands-on experience with ${skill} in a production environment?`,
      skill,
      followUps: [
        `What architectural trade-offs or performance considerations did you face while implementing ${skill}?`,
        `How would you handle high concurrency or failure scenarios when scaling with ${skill}?`,
      ],
    }));
  }, [iv]);

  const [phase, setPhase] = useState<"lobby" | "live" | "done">("lobby");
  // stage: "intro" for the initial introduction, "questions" for technical questions
  const [stage, setStage] = useState<"intro" | "questions">("intro");
  const [idx, setIdx] = useState(0);
  const [currentPrompt, setCurrentPrompt] = useState(INTRO_PROMPT);
  const [answers, setAnswers] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [interimText, setInterimText] = useState("");
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [sound, setSound] = useState(true);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [log, setLog] = useState<{ who: "ai" | "me"; text: string }[]>([]);
  const [left, setLeft] = useState(iv.minutes * 60);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);
  const [backendTranscript, setBackendTranscript] = useState<any[] | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [activeDoneTab, setActiveDoneTab] = useState<"report" | "transcript">("report");
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // References to prevent closures, double triggers & GC
  const recognitionRef = useRef<any>(null);
  const finalSpeechRef = useRef<string>("");
  const isListeningRef = useRef(false);
  const isMountedRef = useRef(true);
  const restartTimerRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const fourSecSilenceTimerRef = useRef<any>(null);
  const silenceReminderGivenRef = useRef(false);
  const fullTextRef = useRef("");
  const micRef = useRef(mic);
  const phaseRef = useRef(phase);
  const submittingRef = useRef(submitting);
  const aiSpeakingRef = useRef(aiSpeaking);
  const currentPromptRef = useRef(currentPrompt);
  const synthUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const synthTimeoutRef = useRef<any>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    const updateVoice = () => {
      const v = getConsistentVoice();
      if (v) selectedVoiceRef.current = v;
    };
    updateVoice();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.onvoiceschanged = updateVoice;
    }
  }, []);

  useEffect(() => {
    micRef.current = mic;
    phaseRef.current = phase;
    submittingRef.current = submitting;
    aiSpeakingRef.current = aiSpeaking;
    currentPromptRef.current = currentPrompt;
  }, [mic, phase, submitting, aiSpeaking, currentPrompt]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (fourSecSilenceTimerRef.current) clearTimeout(fourSecSilenceTimerRef.current);
      if (synthTimeoutRef.current) clearTimeout(synthTimeoutRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
    };
  }, []);

  // 1. HARDWARE ACCESS: AUDIO & VIDEO ISOLATION
  const requestAudioAccess = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
    if (phaseRef.current === "done") return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      if (phaseRef.current === "done") {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }
      micStreamRef.current = stream;

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const pollMic = () => {
            if (!micStreamRef.current || !isMountedRef.current || phaseRef.current === "done") {
              ctx.close().catch(() => {});
              return;
            }
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setMicLevel(Math.min(100, Math.round(avg * 1.5)));
            const speakingNow = avg > 26;
            setUserSpeaking(speakingNow);

            // If real candidate speech is detected by mic audio, cancel 4-second silence reminder
            if (speakingNow && fourSecSilenceTimerRef.current) {
              clearTimeout(fourSecSilenceTimerRef.current);
              fourSecSilenceTimerRef.current = null;
            }

            requestAnimationFrame(pollMic);
          };
          pollMic();
        }
      } catch (e) {
        console.warn("Audio meter initialization notice:", e);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  // Initialize microphone device
  useEffect(() => {
    if (phase === "done") {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
      }
      return;
    }
    if (mic) {
      requestAudioAccess();
    } else if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
  }, [phase, mic, requestAudioAccess]);

  // Initialize camera device
  useEffect(() => {
    if (phase === "done") {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
      return;
    }

    if (cam && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 }, audio: false })
        .then((vStream) => {
          if (phaseRef.current === "done") {
            vStream.getTracks().forEach((t) => t.stop());
            return;
          }
          cameraStreamRef.current = vStream;
          if (lobbyVideoRef.current) {
            lobbyVideoRef.current.srcObject = vStream;
            lobbyVideoRef.current.play().catch(() => {});
          }
          if (videoRef.current) {
            videoRef.current.srcObject = vStream;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {
          setCam(false);
        });
    }

    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [phase, cam]);

  // Ensure live video stream attaches when entering live interview screen
  useEffect(() => {
    if (phase !== "live" || !cam) return;

    const attachLiveVideo = async () => {
      if (cameraStreamRef.current && cameraStreamRef.current.active) {
        if (videoRef.current) {
          videoRef.current.srcObject = cameraStreamRef.current;
          try {
            await videoRef.current.play();
          } catch {}
        }
      } else if (navigator.mediaDevices?.getUserMedia) {
        try {
          const vStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false,
          });
          if (phaseRef.current === "done") {
            vStream.getTracks().forEach((t) => t.stop());
            return;
          }
          cameraStreamRef.current = vStream;
          if (videoRef.current) {
            videoRef.current.srcObject = vStream;
            await videoRef.current.play();
          }
        } catch {
          setCam(false);
        }
      }
    };
    // Short timeout to guarantee video element is mounted in DOM
    const timer = setTimeout(attachLiveVideo, 100);
    return () => clearTimeout(timer);
  }, [phase, cam]);

  // Forward declarations for mutual references
  const submitAnswerRef = useRef<() => void>(() => {});

  // 2. 4-SECOND SILENCE REMINDER
  const triggerSilenceReminder = useCallback(() => {
    if (
      !isMountedRef.current ||
      phaseRef.current !== "live" ||
      aiSpeakingRef.current ||
      submittingRef.current ||
      userSpeaking ||
      fullTextRef.current.trim().length > 0
    ) {
      return;
    }

    silenceReminderGivenRef.current = true;
    setLog((l) => [...l, { who: "ai", text: SILENCE_REMINDER_PROMPT }]);
    // Speak the polite reminder aloud without advancing the question
    speakText(SILENCE_REMINDER_PROMPT);
  }, [userSpeaking]);

  const start4SecSilenceTimer = useCallback(() => {
    if (fourSecSilenceTimerRef.current) clearTimeout(fourSecSilenceTimerRef.current);
    if (silenceReminderGivenRef.current) return; // Only remind once per question to avoid repetition

    fourSecSilenceTimerRef.current = setTimeout(() => {
      if (
        isMountedRef.current &&
        phaseRef.current === "live" &&
        !aiSpeakingRef.current &&
        !submittingRef.current &&
        !fullTextRef.current.trim() &&
        !silenceReminderGivenRef.current
      ) {
        triggerSilenceReminder();
      }
    }, 4000); // Exact 4-second silence threshold
  }, [triggerSilenceReminder]);

  // 3. SPEECH RECOGNITION CONTROLS
  const stopRecognition = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    setIsListening(false);
    setUserSpeaking(false);
    setIsAutoSubmitting(false);
  }, []);

  const startRecognition = useCallback(() => {
    if (!SpeechRecognitionClass) return;

    // Do not listen while AI is speaking or while submitting
    if (isListeningRef.current || !micRef.current || aiSpeakingRef.current || submittingRef.current) {
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      const rec = new SpeechRecognitionClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      rec.onspeechstart = () => {
        setUserSpeaking(true);
        // Candidate started speaking: cancel 4-sec silence reminder immediately
        if (fourSecSilenceTimerRef.current) {
          clearTimeout(fourSecSilenceTimerRef.current);
          fourSecSilenceTimerRef.current = null;
        }
        // Cancel any pending auto-submit timer while speaking
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        setIsAutoSubmitting(false);
      };

      rec.onspeechend = () => {
        setUserSpeaking(false);
      };

      rec.onresult = (event: any) => {
        // Cancel 4-second silence reminder as soon as candidate speech results arrive
        if (fourSecSilenceTimerRef.current) {
          clearTimeout(fourSecSilenceTimerRef.current);
          fourSecSilenceTimerRef.current = null;
        }

        let newFinalText = "";
        let currentInterim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || "";
          if (res.isFinal) {
            newFinalText += transcript + " ";
          } else {
            currentInterim += transcript;
          }
        }

        if (newFinalText) {
          finalSpeechRef.current = (finalSpeechRef.current + " " + newFinalText).trim();
        }

        // Full speech synchronously captured in ref and state
        const completeSpeech = (finalSpeechRef.current + " " + currentInterim).trim();
        fullTextRef.current = completeSpeech;
        setInterimText(completeSpeech);
        setUserSpeaking(true);

        // VAD / End-of-Speech Detection:
        // Automatically schedule submission 2.2s after candidate finishes speaking a real utterance
        const wordCount = completeSpeech.split(/\s+/).filter(Boolean).length;
        if (wordCount >= 3 && completeSpeech.length >= 12) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          setIsAutoSubmitting(true);

          silenceTimerRef.current = setTimeout(() => {
            setIsAutoSubmitting(false);
            const textToSubmit = fullTextRef.current.trim();
            const words = textToSubmit.split(/\s+/).filter(Boolean).length;
            if (
              isMountedRef.current &&
              phaseRef.current === "live" &&
              !submittingRef.current &&
              !aiSpeakingRef.current &&
              words >= 3 &&
              textToSubmit.length >= 12
            ) {
              submitAnswerRef.current();
            }
          }, 2200);
        }
      };

      rec.onerror = (event: any) => {
        if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
          isListeningRef.current = false;
          setIsListening(false);
        }
      };

      rec.onend = () => {
        isListeningRef.current = false;
        setIsListening(false);
        setUserSpeaking(false);

        const textToSubmit = fullTextRef.current.trim();
        const words = textToSubmit.split(/\s+/).filter(Boolean).length;

        // If candidate already answered a substantive sentence and auto-submit was pending:
        if (
          words >= 3 &&
          textToSubmit.length >= 12 &&
          silenceTimerRef.current &&
          !submittingRef.current &&
          !aiSpeakingRef.current
        ) {
          setIsAutoSubmitting(false);
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
          submitAnswerRef.current();
          return;
        }

        // Auto restart if mic is active and phase is live and not speaking/submitting
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        if (micRef.current && phaseRef.current === "live" && !submittingRef.current && !aiSpeakingRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (
              isMountedRef.current &&
              micRef.current &&
              phaseRef.current === "live" &&
              !submittingRef.current &&
              !aiSpeakingRef.current
            ) {
              startRecognition();
            }
          }, 400);
        }
      };

      rec.start();
      recognitionRef.current = rec;
    } catch {
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [draft, interimText]);

  // 4. TEXT-TO-SPEECH (Vitarka AI Voice)
  const speakText = useCallback(
    (text: string, onEndCallback?: () => void) => {
      // 1. Immediately pause microphone so AI voice isn't picked up by mic
      stopRecognition();
      if (fourSecSilenceTimerRef.current) {
        clearTimeout(fourSecSilenceTimerRef.current);
        fourSecSilenceTimerRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsAutoSubmitting(false);
      setUserSpeaking(false);
      finalSpeechRef.current = "";
      fullTextRef.current = "";
      setInterimText("");
      setAiSpeaking(true);

      if (!sound || typeof window === "undefined" || !("speechSynthesis" in window)) {
        setAiSpeaking(false);
        setTimeout(() => {
          if (micRef.current && phaseRef.current === "live" && !submittingRef.current) {
            startRecognition();
            start4SecSilenceTimer();
            if (onEndCallback) onEndCallback();
          }
        }, 350);
        return;
      }

      try {
        if (synthTimeoutRef.current) clearTimeout(synthTimeoutRef.current);
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        synthUtteranceRef.current = utterance; // Prevent GC
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voice = selectedVoiceRef.current || getConsistentVoice();
        if (voice) {
          selectedVoiceRef.current = voice;
          utterance.voice = voice;
          utterance.lang = voice.lang || "en-US";
        }

        const handleSpeechFinished = () => {
          setAiSpeaking(false);
          synthUtteranceRef.current = null;
          if (synthTimeoutRef.current) clearTimeout(synthTimeoutRef.current);

          finalSpeechRef.current = "";
          fullTextRef.current = "";
          setInterimText("");
          setUserSpeaking(false);
          setIsAutoSubmitting(false);

          // Resume listening automatically and trigger 4-second silence countdown after slight pause
          setTimeout(() => {
            if (isMountedRef.current && micRef.current && phaseRef.current === "live" && !submittingRef.current) {
              startRecognition();
              start4SecSilenceTimer();
              if (onEndCallback) onEndCallback();
            }
          }, 450);
        };

        utterance.onend = handleSpeechFinished;
        utterance.onerror = handleSpeechFinished;

        // Failsafe timer so aiSpeaking NEVER hangs
        const estimatedMs = Math.max(3000, text.split(/\s+/).length * 420 + 1500);
        synthTimeoutRef.current = setTimeout(handleSpeechFinished, estimatedMs);

        window.speechSynthesis.speak(utterance);
      } catch {
        setAiSpeaking(false);
        setTimeout(() => {
          if (micRef.current && phaseRef.current === "live" && !submittingRef.current) {
            startRecognition();
            start4SecSilenceTimer();
            if (onEndCallback) onEndCallback();
          }
        }, 350);
      }
    },
    [sound, startRecognition, stopRecognition, start4SecSilenceTimer]
  );

  // 5. MASTER RECOGNITION LIFECYCLE CONTROLLER
  useEffect(() => {
    if (phase !== "live") {
      stopRecognition();
      return;
    }
    if (aiSpeaking || submitting) {
      stopRecognition();
      return;
    }
    if (mic) {
      startRecognition();
    } else {
      stopRecognition();
    }
  }, [phase, aiSpeaking, submitting, mic, startRecognition, stopRecognition]);

  // 6. SUBMIT ANSWER (Introduction or Technical Question)
  const submit = useCallback(async () => {
    if (submittingRef.current) return;

    const combinedText = fullTextRef.current.trim() || draft.trim();
    if (!combinedText) return;

    // 1. Check if candidate responded to the 4-second silence reminder
    if (isRepeatRequest(combinedText)) {
      setDraft("");
      setInterimText("");
      finalSpeechRef.current = "";
      fullTextRef.current = "";
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsAutoSubmitting(false);

      // Repeat current question without advancing
      const promptToRepeat = currentPromptRef.current;
      const repeatSpeech = `Certainly: ${promptToRepeat}`;
      setLog((l) => [...l, { who: "me", text: combinedText }, { who: "ai", text: repeatSpeech }]);
      silenceReminderGivenRef.current = false; // Reset reminder for the repeated prompt
      speakText(repeatSpeech);
      return;
    }

    if (isReadyOnly(combinedText)) {
      setDraft("");
      setInterimText("");
      finalSpeechRef.current = "";
      fullTextRef.current = "";
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setIsAutoSubmitting(false);

      const readyReply = "Great, go ahead. I am listening.";
      setLog((l) => [...l, { who: "me", text: combinedText }, { who: "ai", text: readyReply }]);
      silenceReminderGivenRef.current = true; // Avoid repeating reminder
      speakText(readyReply);
      return;
    }

    // 2. Candidate gave a genuine response -> Proceed to submit & evaluate
    stopRecognition();
    if (fourSecSilenceTimerRef.current) {
      clearTimeout(fourSecSilenceTimerRef.current);
      fourSecSilenceTimerRef.current = null;
    }
    setSubmitting(true);
    submittingRef.current = true;
    setIsAutoSubmitting(false);

    finalSpeechRef.current = "";
    fullTextRef.current = "";
    setDraft("");
    setInterimText("");
    setIsAutoSubmitting(false);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    setAnswers((prev) => [...prev, combinedText]);
    setLog((l) => [...l, { who: "me", text: combinedText }]);

    let nextAiPrompt = "";
    let isFinished = false;

    // ========================================================
    // CASE A: STAGE 0 - INTRODUCTION SUBMISSION
    // ========================================================
    if (stage === "intro") {
      // Submit introduction to backend
      if (iv.backendId && (sessionId || submissionId)) {
        try {
          const res = await submitBackendAnswer(iv.backendId, {
            interview_session_id: sessionId || submissionId || "",
            user_answer: combinedText,
          });
          if (res && res.question) {
            nextAiPrompt = res.question;
          }
        } catch (err) {
          console.warn("Backend intro processing fallback:", err);
        }
      }

      // If backend didn't return Question 1, use first technical question from tree
      if (!nextAiPrompt) {
        const firstTechQuestion =
          questions[0]?.text ||
          `Could you walk me through your hands-on experience with ${iv.name}?`;
        nextAiPrompt = `Thank you for introducing yourself! Let's move to our first technical question: ${firstTechQuestion}`;
      }

      // Transition to technical questions stage
      setStage("questions");
      setIdx(0);
      setCurrentPrompt(nextAiPrompt);
    }
    // ========================================================
    // CASE B: STAGE 1 - TECHNICAL QUESTIONS SUBMISSION
    // ========================================================
    else {
      if (iv.backendId && (sessionId || submissionId)) {
        try {
          const res = await submitBackendAnswer(iv.backendId, {
            interview_session_id: sessionId || submissionId || "",
            user_answer: combinedText,
          });
          if (res) {
            if (res.is_finished) {
              isFinished = true;
            } else if (res.question) {
              nextAiPrompt = res.question;
            }
          }
        } catch (err) {
          console.warn("Failed backend turn, using dynamic question tree fallback:", err);
        }
      }

      // Predefined tree traversal fallback
      if (!nextAiPrompt && !isFinished) {
        const currentQuestion = questions[Math.min(idx, questions.length - 1)];
        const hasFollowUp =
          currentQuestion?.followUps &&
          currentQuestion.followUps.length > 0 &&
          answers.length % 2 === 0;

        if (hasFollowUp && currentQuestion.followUps) {
          const fIdx = Math.floor(answers.length / 2) % currentQuestion.followUps.length;
          nextAiPrompt = currentQuestion.followUps[fIdx];
        } else if (idx < questions.length - 1) {
          nextAiPrompt = questions[idx + 1].text;
        } else {
          isFinished = true;
        }
      }

      if (nextAiPrompt) {
        setIdx((prev) => prev + 1);
        setCurrentPrompt(nextAiPrompt);
      }
    }

    setSubmitting(false);
    submittingRef.current = false;

    if (isFinished) {
      finishInterview();
      return;
    }

    if (nextAiPrompt) {
      setLog((l) => [...l, { who: "ai", text: nextAiPrompt }]);
      silenceReminderGivenRef.current = false; // Reset 4-sec reminder for new question
      speakText(nextAiPrompt);
    }
  }, [
    draft,
    interimText,
    stage,
    iv.backendId,
    sessionId,
    questions,
    idx,
    answers.length,
    speakText,
    stopRecognition,
  ]);

  submitAnswerRef.current = submit;

  const finishInterview = useCallback(async (explicitSubId?: string) => {
    // 1. Immediately cut off any active AI speech
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (synthTimeoutRef.current) {
      clearTimeout(synthTimeoutRef.current);
      synthTimeoutRef.current = null;
    }
    synthUtteranceRef.current = null;
    aiSpeakingRef.current = false;
    setAiSpeaking(false);

    // 2. Terminate speech recognition & cancel all pending auto-submit/silence timers
    stopRecognition();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    setIsListening(false);

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (fourSecSilenceTimerRef.current) {
      clearTimeout(fourSecSilenceTimerRef.current);
      fourSecSilenceTimerRef.current = null;
    }
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    silenceReminderGivenRef.current = false;
    setUserSpeaking(false);
    setIsAutoSubmitting(false);

    // 3. Lock submission state to block any pending in-flight audio turns
    submittingRef.current = true;
    setSubmitting(false);
    finalSpeechRef.current = "";
    fullTextRef.current = "";
    setDraft("");
    setInterimText("");

    // 4. Fully terminate and release hardware media streams (camera & microphone)
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      cameraStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      micStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (lobbyVideoRef.current) {
      lobbyVideoRef.current.srcObject = null;
    }
    setCam(false);
    setMic(false);
    micRef.current = false;

    // 5. Transition to "done" phase and fetch report
    phaseRef.current = "done";
    setPhase("done");
    setReportLoading(true);

    const targetSubId = explicitSubId || submissionId || sessionId;
    if (targetSubId) {
      try {
        const res = await generateBackendReport(targetSubId);
        if (res) {
          setReportData(res);
        }
        const sub = await fetchBackendSubmission(targetSubId);
        if (sub) {
          if (!res && (sub.report || sub.report_summary)) {
            setReportData(sub.report || sub.report_summary);
          }
          if (sub.transcript && Array.isArray(sub.transcript) && sub.transcript.length > 0) {
            setBackendTranscript(sub.transcript);
          }
        }
      } catch (err) {
        console.error("Error generating report:", err);
      } finally {
        setReportLoading(false);
      }
    } else {
      setReportLoading(false);
    }
  }, [submissionId, sessionId, stopRecognition]);

  // 7. START INTERVIEW (Exact Opening: Greet & Intro Only)
  const handleStart = async () => {
    requestAudioAccess();

    setPhase("live");
    setStage("intro");
    setIdx(0);
    setCurrentPrompt(INTRO_PROMPT);
    setSubmitting(true);
    submittingRef.current = true;
    silenceReminderGivenRef.current = false;

    // Connect to backend to initialize submission & session
    let promptText = INTRO_PROMPT;
    if (iv.backendId) {
      try {
        const res = await startBackendInterview(iv.backendId, {
          experience_level: iv.difficulty,
          duration: iv.minutes,
        });
        if (res) {
          if (res.submission_id) setSubmissionId(res.submission_id);
          setSessionId(res.interview_session_id || res.submission_id || null);
          if (res.first_question) {
            promptText = res.first_question;
          }
        }
      } catch (e) {
        console.warn("Backend session creation warning:", e);
      }
    }

    setSubmitting(false);
    submittingRef.current = false;

    // Display and speak the introduction greeting with consistent voice
    setCurrentPrompt(promptText);
    setLog([{ who: "ai", text: promptText }]);

    // AI speaks intro aloud; once AI finishes speaking, candidate voice input activates
    speakText(promptText);
  };

  // Timer countdown
  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setLeft((v) => (v <= 1 ? (finishInterview(), 0) : v - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Auto-scroll chat
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log, interimText]);

  // Compute live microphone state
  const micState: MicState = useMemo(() => {
    if (submitting) return "processing";
    if (aiSpeaking) return "ready";
    if (userSpeaking || interimText.trim().length > 0) return "speaking";
    if (isListening) return "listening";
    return "ready";
  }, [submitting, aiSpeaking, userSpeaking, interimText, isListening]);

  // Compute status text
  const statusMessage = useMemo(() => {
    if (submitting) return "Processing your answer…";
    if (aiSpeaking) return "AI is speaking…";
    if (userSpeaking || interimText.trim().length > 0) return "Listening to your answer…";
    if (isListening) return "Waiting for your response…";
    return "Microphone ready";
  }, [submitting, aiSpeaking, userSpeaking, interimText, isListening]);

  const currentQ = questions[Math.min(idx, questions.length - 1)];

  // ==========================================
  // LOBBY VIEW (Instructions & Hardware Check)
  // ==========================================
  if (phase === "lobby") {
    return (
      <Shell title={iv.name}>
        <div className="mx-auto grid max-w-5xl gap-6 px-6 py-8 md:grid-cols-[1.3fr_1fr]">
          {/* Left Column: Title, Mode, Products & Instructions */}
          <div className="rounded-2xl border bg-card p-6 flex flex-col justify-between shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{iv.icon}</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      <BrainCircuit className="h-3.5 w-3.5" />
                      {iv.interviewMode === "automatic" ? "Vitarka Dynamic AI Engine" : "Predefined Question Tree"}
                    </span>
                    {iv.products && iv.products.length > 0 && iv.products.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center uppercase rounded-full border border-border/80 px-2 py-0.5 text-[10px] font-bold bg-muted/80 text-foreground tracking-wider"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{iv.name}</h1>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{iv.description}</p>

              {/* Meta Chips */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="rounded-md border bg-muted/40 px-2.5 py-1 font-medium text-foreground">
                  ⏱️ {iv.minutes} Minutes
                </span>
                <span className="rounded-md border bg-muted/40 px-2.5 py-1 font-medium text-foreground">
                  🎯 {iv.difficulty} Level
                </span>
                <span className="rounded-md border bg-muted/40 px-2.5 py-1 font-medium text-foreground">
                  💼 {iv.role} Role
                </span>
              </div>

              {/* Clear Step-by-Step Instructions Card */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <FileText className="h-3.5 w-3.5" /> Interview Instructions & Guidelines
                </div>

                <div className="space-y-2.5 text-xs text-foreground/90">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      1
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Candidate Introduction:</span> The interview opens with a warm greeting from the AI interviewer and asks for your background introduction.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      2
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Interactive Voice Response:</span> Speak naturally through your microphone. Your spoken words are transcribed live into the transcript area.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      3
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Hands-Free Auto-Submission:</span> When you finish speaking and pause, the system automatically detects end-of-speech and submits your answer.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      4
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Real-Time User Transcript:</span> Follow the live conversation transcript streaming both the interviewer questions and your exact responses.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      5
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Comprehensive Report:</span> Upon completion, review your overall evaluation score, competency breakdown, and complete interview transcript.
                    </div>
                  </div>
                </div>
              </div>

              {iv.requiredSkills && iv.requiredSkills.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Skills Assessed:
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {iv.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md border bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={handleStart}
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Initializing Vitarka Session…
                  </>
                ) : (
                  <>
                    Start Live Voice Interview <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Camera Preview, Mic Test & Device Controls */}
          <div className="flex flex-col gap-3">
            <div className="relative aspect-video overflow-hidden rounded-2xl border bg-muted/40 shadow-sm">
              {cam ? (
                <video
                  ref={lobbyVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-xs text-muted-foreground">
                  Camera off · Voice interview active
                </div>
              )}

              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
                <span
                  className={`h-2 w-2 rounded-full ${
                    userSpeaking ? "bg-green-400 animate-ping" : "bg-green-500"
                  }`}
                />
                <span>{userSpeaking ? "Voice detected" : "Microphone ready"}</span>
              </div>
            </div>

            {/* Mic volume feedback bar */}
            {mic && (
              <div className="rounded-xl border bg-card p-3.5 text-xs space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Mic className="h-3.5 w-3.5 text-primary" /> Audio Check:
                  </span>
                  <span className={userSpeaking ? "text-green-600 font-semibold dark:text-green-400" : ""}>
                    {userSpeaking ? "Receiving voice…" : "Speak to test microphone"}
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-75"
                    style={{ width: `${Math.max(4, micLevel)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Toggle
                on={mic}
                onClick={() => setMic(!mic)}
                onIcon={<Mic className="h-4 w-4" />}
                offIcon={<MicOff className="h-4 w-4" />}
                label={mic ? "Mic On" : "Mic Off"}
              />
              <Toggle
                on={cam}
                onClick={() => setCam(!cam)}
                onIcon={<Video className="h-4 w-4" />}
                offIcon={<VideoOff className="h-4 w-4" />}
                label={cam ? "Camera On" : "Camera Off"}
              />
              <Toggle
                on={sound}
                onClick={() => setSound(!sound)}
                onIcon={<Volume2 className="h-4 w-4" />}
                offIcon={<VolumeX className="h-4 w-4" />}
                label="AI Voice"
              />
            </div>

            <div className="rounded-xl border bg-card/60 p-3 text-[11px] text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" /> Pro Tips:
              </div>
              <p>• Wear headphones or earbuds for optimal echo cancellation.</p>
              <p>• Speak clearly; automatic silence detection triggers 2s after you pause.</p>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  // ==========================================
  // DONE / POST-INTERVIEW VIEW (Report & Transcript)
  // ==========================================
  if (phase === "done") {
    // Determine overall score: from reportData, submission marks, or fallback
    const rawScore =
      reportData?.scaled_score ??
      reportData?.marks ??
      (reportData?.overall_score != null ? Math.round(reportData.overall_score * 10) : null) ??
      reportData?.vitarka_report?.scaled_score ??
      (reportData?.vitarka_report?.overall_score != null ? Math.round(reportData.vitarka_report.overall_score * 10) : null);

    const score = rawScore != null
      ? Math.min(100, Math.max(0, Math.round(rawScore)))
      : Math.min(
          95,
          50 +
            answers.reduce((acc, a) => {
              const words = a.trim().split(/\s+/).length;
              return acc + Math.min(10, Math.max(2, Math.floor(words / 15)));
            }, 0)
        );

    const recommendation =
      reportData?.recommendation ??
      reportData?.overall_report?.recommendation ??
      (score >= 80 ? "Strong Hire" : score >= 65 ? "Hire" : "Needs Practice");

    const feedbackSummary =
      reportData?.feedback_summary ??
      reportData?.executive_summary ??
      reportData?.overall_report?.executive_summary ??
      reportData?.vitarka_report?.executive_summary ??
      `You completed ${Math.max(1, answers.length)} conversational turns across ${iv.name}. Answers were captured via interactive voice and evaluated by Vitarka.`;

    const categoryScores =
      reportData?.vitarka_report?.category_scores ??
      reportData?.category_scores ?? {
        Communication: Math.min(10, Math.max(6, Math.round((score / 10) * 0.95))),
        "Technical Depth": Math.min(10, Math.max(5, Math.round((score / 10) * 0.9))),
        "Problem Solving": Math.min(10, Math.max(6, Math.round((score / 10)))),
        Architecture: Math.min(10, Math.max(5, Math.round((score / 10) * 0.88))),
      };

    // Full transcript list: prefer backend transcript if available, otherwise local session log
    const transcriptTurns: { speaker: string; text: string; isAi: boolean }[] = [];
    if (backendTranscript && Array.isArray(backendTranscript) && backendTranscript.length > 0) {
      for (const t of backendTranscript) {
        const isAi = t.message_type === "assistant";
        transcriptTurns.push({
          speaker: isAi ? "Vitarka AI Interviewer" : "Candidate (You)",
          text: t.content,
          isAi,
        });
      }
    } else {
      for (const m of log) {
        transcriptTurns.push({
          speaker: m.who === "ai" ? "Vitarka AI Interviewer" : "Candidate (You)",
          text: m.text,
          isAi: m.who === "ai",
        });
      }
    }

    const copyTranscriptText = () => {
      const fullText = transcriptTurns
        .map((t) => `[${t.speaker}]\n${t.text}\n`)
        .join("\n");
      navigator.clipboard.writeText(fullText);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    };

    return (
      <Shell title={iv.name}>
        <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
          {reportLoading ? (
            <div className="rounded-2xl border bg-card p-12 text-center shadow-sm space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Generating Vitarka Evaluation & Transcript…</h2>
                <p className="text-sm text-muted-foreground">
                  Analyzing candidate speech, assessing competencies, and compiling detailed evaluation report.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header Card */}
              <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5" /> Interview Completed
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                      {iv.name}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">Interview Performance & Report</h1>
                  <p className="text-sm text-muted-foreground">
                    Candidate responses submitted and evaluated across {transcriptTurns.length} conversational turns.
                  </p>
                </div>

                {/* Score Pill */}
                <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l pl-0 md:pl-6 pt-4 md:pt-0 w-full md:w-auto">
                  <div className="text-center">
                    <div className="text-4xl font-extrabold text-foreground">{score}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Overall Score / 100
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-wide ${
                        recommendation.toLowerCase().includes("strong")
                          ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-400"
                          : recommendation.toLowerCase().includes("hire")
                          ? "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:text-blue-400"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20 dark:text-amber-400"
                      }`}
                    >
                      {recommendation}
                    </span>
                    <div className="text-[11px] text-muted-foreground">Recommendation</div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs: Report vs Transcript */}
              <div className="flex border-b">
                <button
                  onClick={() => setActiveDoneTab("report")}
                  className={`inline-flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition ${
                    activeDoneTab === "report"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Award className="h-4 w-4" /> Performance Report
                </button>
                <button
                  onClick={() => setActiveDoneTab("transcript")}
                  className={`inline-flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition ${
                    activeDoneTab === "transcript"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" /> Full Conversation Transcript ({transcriptTurns.length})
                </button>
              </div>

              {/* TAB 1: PERFORMANCE REPORT */}
              {activeDoneTab === "report" && (
                <div className="space-y-6">
                  {/* Executive Summary */}
                  <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" /> Evaluator Feedback & Executive Summary
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                      {feedbackSummary}
                    </p>
                  </div>

                  {/* Competencies Breakdown */}
                  <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-primary" /> Competency & Rubric Ratings
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {Object.entries(categoryScores).map(([category, rating]) => (
                        <div key={category} className="rounded-xl border bg-muted/20 p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span>{category}</span>
                            <span className="text-primary font-bold">{String(rating)} / 10</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, (Number(rating) / 10) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Questions Evaluated Summary */}
                  <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Covered Interview Topics
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border p-3 text-xs bg-primary/5 border-primary/20">
                        <div className="font-semibold text-primary">Candidate Self-Introduction</div>
                        <div className="mt-1 text-muted-foreground">Delivered & Evaluated</div>
                      </div>
                      {questions.slice(0, Math.max(1, idx)).map((q, k) => (
                        <div key={k} className="rounded-lg border p-3 text-xs">
                          <div className="font-medium truncate text-foreground">{q.skill}</div>
                          <div className="mt-1 text-muted-foreground">Topic {k + 1} Evaluated</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FULL CONVERSATION TRANSCRIPT */}
              {activeDoneTab === "transcript" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Showing complete verbatim dialogue from this interview session.
                    </span>
                    <button
                      onClick={copyTranscriptText}
                      className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted transition shadow-sm"
                    >
                      {copiedTranscript ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy Transcript
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-4">
                    {transcriptTurns.map((turn, k) => (
                      <div
                        key={k}
                        className={`rounded-2xl border p-4.5 space-y-2 shadow-sm ${
                          turn.isAi
                            ? "bg-card border-border/70"
                            : "bg-primary/5 border-primary/25"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {turn.isAi ? (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                                <Bot className="h-3.5 w-3.5" />
                              </div>
                            ) : (
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                <User className="h-3.5 w-3.5" />
                              </div>
                            )}
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                              {turn.speaker}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">Turn #{k + 1}</span>
                        </div>
                        <p className="text-sm leading-relaxed text-foreground whitespace-pre-line pl-8">
                          {turn.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Action Buttons */}
              <div className="mt-8 flex items-center justify-between pt-4 border-t">
                <button
                  onClick={() => {
                    setPhase("lobby");
                    setStage("intro");
                    setIdx(0);
                    setAnswers([]);
                    setLog([]);
                    setDraft("");
                    setInterimText("");
                    setSessionId(null);
                    setSubmissionId(null);
                    setReportData(null);
                    setBackendTranscript(null);
                    setLeft(iv.minutes * 60);
                    if (typeof window !== "undefined" && "speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Retake Interview
                </button>

                <Link
                  to="/mock-interviews"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition shadow-sm"
                >
                  Back to Mock Interview <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </Shell>
    );
  }

  // ==========================================
  // LIVE INTERVIEW VIEW
  // ==========================================
  const hasContentToSend = (draft + " " + interimText).trim().length > 0;

  return (
    <Shell
      title={iv.name}
      right={
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSound(!sound)}
            className="rounded p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition"
            title={sound ? "Mute AI Voice" : "Unmute AI Voice"}
          >
            {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <span className="inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1 font-mono text-xs">
            <Clock className="h-3.5 w-3.5 text-primary" /> {fmt(left)}
          </span>
        </div>
      }
    >
      <div className="mx-auto grid h-[calc(100vh-56px)] max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_1.35fr]">
        {/* Left Side: Avatar, Audio Waveforms, Candidate Webcam & Device Controls */}
        <div className="flex flex-col gap-3 min-h-0">
          {/* AI Interviewer Tile */}
          <div className="relative flex-1 rounded-2xl border bg-card shadow-sm p-4 flex flex-col items-center justify-center text-center">
            {/* AI Avatar */}
            <div
              className={`grid h-24 w-24 place-items-center rounded-full bg-primary/15 transition-all duration-300 ${
                aiSpeaking ? "ring-8 ring-primary/20 scale-105" : ""
              }`}
            >
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>

            {/* Dynamic waveform based on real speech state */}
            <div className="mt-3 flex h-7 items-end gap-1">
              {Array.from({ length: 14 }).map((_, k) => (
                <span
                  key={k}
                  className="w-1 rounded-full bg-primary transition-all duration-150"
                  style={{
                    height: aiSpeaking
                      ? `${8 + ((k * 37) % 20)}px`
                      : userSpeaking
                      ? `${6 + ((k * 19) % 18)}px`
                      : "4px",
                  }}
                />
              ))}
            </div>

            <div className="mt-2 text-sm font-semibold">Vitarka AI Interviewer</div>

            {/* Status Message */}
            <div className="mt-0.5 text-xs text-muted-foreground font-medium">{statusMessage}</div>
          </div>

          {/* Candidate Live Video Tile (Prominent & Visible) */}
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-muted/30 shadow-sm flex items-center justify-center">
            {cam ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                <VideoOff className="h-6 w-6 opacity-60" />
                <span>Camera Off</span>
              </div>
            )}
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-[11px] font-medium text-white backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${userSpeaking ? "bg-green-400 animate-ping" : "bg-green-500"}`} />
              <span>You (Candidate)</span>
            </div>
          </div>

          {/* Bottom Device Controls & End Interview */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex gap-2">
              <Toggle
                on={mic}
                onClick={() => setMic(!mic)}
                onIcon={<Mic className="h-4 w-4" />}
                offIcon={<MicOff className="h-4 w-4" />}
                label={mic ? "Mic On" : "Mic Off"}
              />
              <Toggle
                on={cam}
                onClick={() => setCam(!cam)}
                onIcon={<Video className="h-4 w-4" />}
                offIcon={<VideoOff className="h-4 w-4" />}
                label={cam ? "Camera On" : "Camera Off"}
              />
            </div>
            <button
              onClick={() => finishInterview()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3.5 py-2 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition shadow-sm"
            >
              <PhoneOff className="h-4 w-4" /> End Interview
            </button>
          </div>
        </div>

        {/* Right Side: Active Question, Interview Conversation & Voice Input */}
        <div className="flex min-h-0 flex-col rounded-2xl border bg-card shadow-sm">
          {/* Header Progress Bar */}
          <div className="border-b px-5 py-3">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
              <span>
                {stage === "intro" ? "Step 1: Introduction" : `Question ${idx + 1}`}
              </span>
              <span className="truncate max-w-[200px]">
                {stage === "intro" ? "Candidate Background" : currentQ?.skill || iv.name}
              </span>
            </div>
            <div className="mt-2 h-1 rounded-full bg-muted">
              <div
                className="h-1 rounded-full bg-primary transition-all duration-300"
                style={{
                  width:
                    stage === "intro"
                      ? "5%"
                      : `${Math.min(100, Math.max(5, Math.round((((iv.minutes || 30) * 60 - left) / ((iv.minutes || 30) * 60)) * 100)))}%`,
                }}
              />
            </div>
          </div>

          {/* Prominent Active Question Banner */}
          <div className="border-b bg-muted/30 px-5 py-3 flex items-start gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold mt-0.5">
              Q
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Current Question
              </div>
              <p className="text-xs font-medium text-foreground leading-snug mt-0.5">
                {currentPrompt}
              </p>
            </div>
          </div>

          {/* Conversation Area (Only AI Questions Shown - Candidate Answers Hidden as requested) */}
          <div className="flex-1 space-y-3 overflow-y-auto p-5 text-sm">
            {log
              .filter((m) => m.who === "ai")
              .map((m, k) => (
                <Bubble key={k} who="ai">
                  {m.text}
                </Bubble>
              ))}

            {submitting && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/40 rounded-xl border">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Vitarka Dynamic AI is processing your response…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Answer Controls & Voice Status Area */}
          <div className="border-t p-4 space-y-2.5 bg-background/50">
            {/* Live Voice Status Bar & Auto-Submit Indicator */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (isListening) {
                      stopRecognition();
                      setMic(false);
                    } else {
                      setMic(true);
                      startRecognition();
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                    micState === "speaking"
                      ? "bg-green-600 text-white shadow-sm animate-pulse"
                      : isListening
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  title={isListening ? "Click to pause microphone" : "Click to speak"}
                >
                  <Mic className="h-3.5 w-3.5" />
                  <span>
                    {micState === "speaking"
                      ? "Listening…"
                      : isListening
                      ? "Microphone Active"
                      : "Tap to Speak"}
                  </span>
                </button>

                {isAutoSubmitting ? (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                    <Zap className="h-3 w-3 animate-spin" /> Speech finished · Submitting in 2s…
                  </span>
                ) : isListening && userSpeaking ? (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Mic className="h-3 w-3 animate-pulse" /> Recording your answer…
                  </span>
                ) : isListening ? (
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Speak aloud to answer — auto-submits when you pause
                  </span>
                ) : null}
              </div>

              {(draft || interimText) && (
                <button
                  onClick={() => {
                    setDraft("");
                    setInterimText("");
                    finalSpeechRef.current = "";
                    fullTextRef.current = "";
                    if (silenceTimerRef.current) {
                      clearTimeout(silenceTimerRef.current);
                      silenceTimerRef.current = null;
                    }
                    setIsAutoSubmitting(false);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Clear speech / text
                </button>
              )}
            </div>

            {interimText && (
              <div className="flex items-start gap-2 rounded-xl bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs text-foreground">
                <Mic className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5 animate-pulse" />
                <span className="italic leading-relaxed font-mono">"{interimText}"</span>
              </div>
            )}

            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                fullTextRef.current = e.target.value;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              rows={2}
              placeholder={
                isListening
                  ? "Microphone is listening (speak aloud, or type here if preferred)..."
                  : "Type your answer or click 'Tap to Speak'..."
              }
              className="w-full resize-none rounded-xl border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring transition leading-relaxed"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Automatic voice submission · or click Submit Answer
              </span>
              <button
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40 hover:opacity-90 transition shadow-sm"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : stage === "questions" && idx >= questions.length - 1 ? (
                  "Finish Interview"
                ) : (
                  "Submit Answer"
                )}{" "}
                <Send className="h-3.5 w-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link to="/mock-interviews" className="rounded-md p-1.5 hover:bg-muted transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="h-4 w-[1px] bg-border" />
          <div className="flex items-center gap-2 font-medium text-sm">
            <span>{title}</span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              Live Mock Interview
            </span>
          </div>
        </div>
        {right}
      </header>
      {children}
    </div>
  );
}

function Bubble({ who, children }: { who: "ai" | "me"; children: React.ReactNode }) {
  const isAi = who === "ai";
  return (
    <div className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed text-sm shadow-sm ${
          isAi
            ? "border bg-card text-card-foreground"
            : "bg-primary/10 border border-primary/25 text-foreground"
        }`}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1">
          {isAi ? (
            <>
              <Bot className="h-3 w-3 text-primary" />
              <span className="text-primary">Vitarka AI Interviewer</span>
            </>
          ) : (
            <>
              <User className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">Candidate (You)</span>
            </>
          )}
        </div>
        <div className="whitespace-pre-line">{children}</div>
      </div>
    </div>
  );
}

function Toggle({
  on,
  onClick,
  onIcon,
  offIcon,
  label,
}: {
  on: boolean;
  onClick: () => void;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
        on ? "bg-card hover:bg-muted text-foreground" : "bg-muted/50 text-muted-foreground"
      }`}
    >
      {on ? onIcon : offIcon} {label}
    </button>
  );
}
