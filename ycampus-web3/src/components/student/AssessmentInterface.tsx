import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Flag, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  X,
  Camera,
  Mic,
  CameraOff,
  MicOff,
  Monitor,
  Eye,
  EyeOff,
  MoreVertical,
  Maximize
} from 'lucide-react';
import CodeEditor from '@/components/ui/code-editor';

interface Assessment {
  id: string;
  title: string;
  course: string;
  duration: number;
  totalQuestions: number;
}

interface Question {
  id: string;
  type: 'mcq' | 'coding' | 'descriptive';
  question: string;
  options?: string[];
  multipleCorrect?: boolean;
  marks: number;
}

interface AssessmentInterfaceProps {
  assessment: Assessment;
  onComplete: (stats?: { answeredCount: number; totalQuestions: number; timeSpent: number }) => void;
  onBack: () => void;
}

// Mock questions data - increased to 30 questions
const mockQuestions: Question[] = [
  {
    id: '1',
    type: 'mcq',
    question: 'What is the time complexity of binary search algorithm?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    multipleCorrect: false,
    marks: 2
  },
  {
    id: '2',
    type: 'coding',
    question: 'Write a function to find the maximum element in an array. The function should handle edge cases like empty arrays.',
    marks: 10
  },
  {
    id: '3',
    type: 'descriptive',
    question: 'Explain the concept of object-oriented programming and its four main principles. Provide examples for each principle.',
    marks: 8
  },
  {
    id: '4',
    type: 'mcq',
    question: 'Which of the following are valid HTTP methods? (Select all that apply)',
    options: ['GET', 'POST', 'FETCH', 'DELETE', 'UPDATE', 'PUT'],
    multipleCorrect: true,
    marks: 3
  },
  {
    id: '5',
    type: 'coding',
    question: 'Implement a function to check if a string is a palindrome. Ignore case and non-alphanumeric characters.',
    marks: 8
  },
  {
    id: '6',
    type: 'mcq',
    question: 'What is the result of 2 + 2 * 3 in most programming languages?',
    options: ['8', '12', '10', '6'],
    multipleCorrect: false,
    marks: 2
  },
  {
    id: '7',
    type: 'mcq',
    question: 'Which data structures use LIFO (Last In, First Out) principle?',
    options: ['Queue', 'Stack', 'Array', 'Linked List'],
    multipleCorrect: false,
    marks: 2
  },
  {
    id: '8',
    type: 'coding',
    question: 'Write a function to reverse a string without using built-in reverse methods.',
    marks: 6
  },
  {
    id: '9',
    type: 'mcq',
    question: 'Which of these are programming paradigms? (Select all that apply)',
    options: ['Object-Oriented', 'Functional', 'Procedural', 'Recursive', 'Iterative'],
    multipleCorrect: true,
    marks: 4
  },
  {
    id: '10',
    type: 'coding',
    question: 'Implement a function to find the factorial of a number using recursion.',
    marks: 8
  },
  {
    id: '11',
    type: 'mcq',
    question: 'What is the space complexity of merge sort?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    multipleCorrect: false,
    marks: 2
  },
  {
    id: '12',
    type: 'coding',
    question: 'Write a function to find the second largest element in an array.',
    marks: 7
  },
  {
    id: '13',
    type: 'mcq',
    question: 'Which sorting algorithms have O(n log n) average time complexity? (Select all that apply)',
    options: ['Quick Sort', 'Merge Sort', 'Bubble Sort', 'Heap Sort', 'Insertion Sort'],
    multipleCorrect: true,
    marks: 4
  },
  {
    id: '14',
    type: 'coding',
    question: 'Implement a function to check if two strings are anagrams of each other.',
    marks: 8
  },
  {
    id: '15',
    type: 'mcq',
    question: 'What is a closure in programming?',
    options: ['A type of loop', 'A function with access to outer scope', 'A data structure', 'A control statement'],
    multipleCorrect: false,
    marks: 3
  },
  {
    id: '16',
    type: 'coding',
    question: 'Write a function to find all prime numbers up to a given number using the Sieve of Eratosthenes.',
    marks: 10
  },
  {
    id: '17',
    type: 'mcq',
    question: 'Which of these are valid ways to declare a variable in JavaScript? (Select all that apply)',
    options: ['var x = 5', 'let y = 10', 'const z = 15', 'int a = 20'],
    multipleCorrect: true,
    marks: 3
  },
  {
    id: '18',
    type: 'coding',
    question: 'Implement a function to merge two sorted arrays into one sorted array.',
    marks: 8
  },
  {
    id: '19',
    type: 'mcq',
    question: 'What is the time complexity of accessing an element in a hash table (average case)?',
    options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    multipleCorrect: false,
    marks: 2
  },
  {
    id: '20',
    type: 'coding',
    question: 'Write a function to implement binary search on a sorted array.',
    marks: 9
  },
  {
    id: '21',
    type: 'mcq',
    question: 'Which of these are characteristics of functional programming? (Select all that apply)',
    options: ['Immutability', 'Pure Functions', 'Higher-order Functions', 'Global State'],
    multipleCorrect: true,
    marks: 4
  },
  {
    id: '22',
    type: 'coding',
    question: 'Implement a function to find the longest common subsequence of two strings.',
    marks: 12
  },
  {
    id: '23',
    type: 'mcq',
    question: 'What does SQL stand for?',
    options: ['Structured Query Language', 'Sequential Query Language', 'Standard Query Language', 'Simple Query Language'],
    multipleCorrect: false,
    marks: 2
  },
  {
    id: '24',
    type: 'coding',
    question: 'Write a function to implement a simple LRU (Least Recently Used) cache.',
    marks: 15
  },
  {
    id: '25',
    type: 'mcq',
    question: 'Which of these are NoSQL database types? (Select all that apply)',
    options: ['Document', 'Key-Value', 'Column-Family', 'Relational', 'Graph'],
    multipleCorrect: true,
    marks: 4
  },
  {
    id: '26',
    type: 'coding',
    question: 'Implement a function to detect if a linked list has a cycle.',
    marks: 10
  },
  {
    id: '27',
    type: 'mcq',
    question: 'What is the difference between == and === in JavaScript?',
    options: ['No difference', '== checks type, === checks value', '=== checks type and value', '== is deprecated'],
    multipleCorrect: false,
    marks: 3
  },
  {
    id: '28',
    type: 'coding',
    question: 'Write a function to implement quicksort algorithm.',
    marks: 12
  },
  {
    id: '29',
    type: 'mcq',
    question: 'Which HTTP status codes indicate client errors? (Select all that apply)',
    options: ['200', '400', '404', '500', '403'],
    multipleCorrect: true,
    marks: 3
  },
  {
    id: '30',
    type: 'coding',
    question: 'Implement a function to find the shortest path in a weighted graph using Dijkstra\'s algorithm.',
    marks: 15
  }
];

const AssessmentInterface: React.FC<AssessmentInterfaceProps> = ({
  assessment,
  onComplete,
  onBack
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(assessment.duration * 60);
  const [answers, setAnswers] = useState<{[key: string]: any}>({});
  const [explanations, setExplanations] = useState<{[key: string]: string}>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [cameraAlert, setCameraAlert] = useState(false);
  const [tabSwitchAlert, setTabSwitchAlert] = useState(false);
  const [showTabSwitchDialog, setShowTabSwitchDialog] = useState(false);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<() => void | null>(null);
  const [isCodeEditorFullscreen, setIsCodeEditorFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasMediaAccess, setHasMediaAccess] = useState(true);
  const [videoTrackEnabled, setVideoTrackEnabled] = useState(true);
  const [audioTrackEnabled, setAudioTrackEnabled] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const playbackRetryTimerRef = useRef<number | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [questionPage, setQuestionPage] = useState(0); // For pagination
  // Debounce timers to stabilize monitoring status updates
  const videoStatusTimerRef = useRef<number | null>(null);
  const audioStatusTimerRef = useRef<number | null>(null);

  const scheduleStableStatusUpdate = (
    type: 'video' | 'audio',
    enabled: boolean,
    delayMs: number = 1000
  ) => {
    const timerRef = type === 'video' ? videoStatusTimerRef : audioStatusTimerRef;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      if (type === 'video') {
        setVideoTrackEnabled(prev => (prev !== enabled ? enabled : prev));
      } else {
        setAudioTrackEnabled(prev => (prev !== enabled ? enabled : prev));
      }
    }, delayMs);
  };

  // Initialize camera and microphone with better permission handling
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        streamRef.current = stream;
        setHasMediaAccess(true);
        setVideoTrackEnabled(true);
        setAudioTrackEnabled(true);
        setCameraAlert(false);
        
        // Enhanced video initialization with multiple attempts
        const initializeVideo = async () => {
          if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            try {
              await videoRef.current.play();
            } catch (playError) {
              console.error('Video play error:', playError);
              // Retry after a short delay
              setTimeout(() => {
                videoRef.current?.play().catch(console.error);
              }, 500);
            }
          }
        };
        
        // Stronger ensure-playback loop for browsers that delay autoplay
        const ensureVideoPlaying = () => {
          let attempts = 0;
          const tryPlay = async () => {
            attempts += 1;
            if (!videoRef.current || !streamRef.current) return;
            const el = videoRef.current;
            if (el.srcObject !== streamRef.current) {
              el.srcObject = streamRef.current;
            }
            el.muted = true; // enforce autoplay allowance
            try {
              if (el.paused) {
                await el.play();
              }
              // if playing, stop retries
              if (!el.paused) {
                if (playbackRetryTimerRef.current) clearInterval(playbackRetryTimerRef.current);
                playbackRetryTimerRef.current = null;
              }
            } catch {}
            if (attempts > 12 && playbackRetryTimerRef.current) {
              clearInterval(playbackRetryTimerRef.current);
              playbackRetryTimerRef.current = null;
            }
          };
          if (playbackRetryTimerRef.current) clearInterval(playbackRetryTimerRef.current);
          playbackRetryTimerRef.current = window.setInterval(tryPlay, 400);
        };
        
        // Multiple initialization attempts
        await initializeVideo();
        setTimeout(initializeVideo, 100);
        setTimeout(initializeVideo, 500);
        ensureVideoPlaying();

        // Enhanced track monitoring
        const monitorTrack = (track: MediaStreamTrack, type: 'video' | 'audio') => {
          const updateStatus = () => {
            const enabled = track.enabled && track.readyState === 'live';
            scheduleStableStatusUpdate(type, enabled);
          };

          track.addEventListener('ended', updateStatus);
          track.addEventListener('mute', updateStatus);
          track.addEventListener('unmute', updateStatus);
          
          // Regular status check
          const interval = setInterval(updateStatus, 1000);
          return () => {
            clearInterval(interval);
            track.removeEventListener('ended', updateStatus);
            track.removeEventListener('mute', updateStatus);
            track.removeEventListener('unmute', updateStatus);
          };
        };

        stream.getVideoTracks().forEach(track => monitorTrack(track, 'video'));
        stream.getAudioTracks().forEach(track => monitorTrack(track, 'audio'));

      } catch (error) {
        console.error('Error accessing media devices:', error);
        setHasMediaAccess(false);
        setVideoTrackEnabled(false);
        setAudioTrackEnabled(false);
        setCameraAlert(true);
      }
    };

    initializeMedia();

    // Check for permission changes periodically (only when access is lost)
    const permissionCheck = setInterval(async () => {
      if (!hasMediaAccess) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          streamRef.current = stream;
          setHasMediaAccess(true);
          setCameraAlert(false);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.error);
          }
        } catch (error) {
          // remain in no-access state
        }
      }
    }, 5000);

    return () => {
      clearInterval(permissionCheck);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (playbackRetryTimerRef.current) {
        clearInterval(playbackRetryTimerRef.current);
        playbackRetryTimerRef.current = null;
      }
    };
  }, [hasMediaAccess]);

  // Enhanced track monitoring with better state detection
  useEffect(() => {
    if (!streamRef.current) return;

    const checkTrackStates = () => {
      const videoTracks = streamRef.current?.getVideoTracks() || [];
      const audioTracks = streamRef.current?.getAudioTracks() || [];
      
      const videoEnabled = videoTracks.some(track => track.enabled && track.readyState === 'live');
      const audioEnabled = audioTracks.some(track => track.enabled && track.readyState === 'live');
      
      // Debounced/stabilized updates to avoid blinking
      // Only reassign/play when state actually changes to enabled to avoid flicker
      if (videoEnabled && videoRef.current && streamRef.current) {
        const currentSrc = videoRef.current.srcObject as MediaStream | null;
        if (currentSrc !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        if (videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
        }
      }
      scheduleStableStatusUpdate('video', videoEnabled);
      scheduleStableStatusUpdate('audio', audioEnabled);
    };

    const interval = setInterval(checkTrackStates, 2000); // Less frequent checks to prevent blinking
    return () => clearInterval(interval);
  }, [hasMediaAccess]);

  // Derive alert from stabilized track states
  useEffect(() => {
    const shouldAlert = !(videoTrackEnabled && audioTrackEnabled);
    setCameraAlert(prev => (prev !== shouldAlert ? shouldAlert : prev));
  }, [videoTrackEnabled, audioTrackEnabled]);

  // Ensure video element persists through sidebar changes and re-enable detection
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(console.error);
      };
      videoRef.current.play().catch(console.error);
    }
  }, [isSidebarCollapsed]);

  // Re-initialize media when tracks are re-enabled
  useEffect(() => {
    const reinitializeMedia = async () => {
      if (!hasMediaAccess && !cameraAlert) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          
          streamRef.current = stream;
          setHasMediaAccess(true);
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(console.error);
          }
        } catch (error) {
          console.error('Error re-initializing media:', error);
        }
      }
    };

    reinitializeMedia();
  }, [hasMediaAccess, cameraAlert]);

  // Fallback: if autoplay is blocked initially, start playback on first user interaction
  useEffect(() => {
    const tryResumePlayback = async () => {
      try {
        if (videoRef.current && streamRef.current) {
          const el = videoRef.current;
          if (el.srcObject !== streamRef.current) {
            el.srcObject = streamRef.current;
          }
          // Only call play if paused or not started
          // Some browsers throw if calling play() redundantly
          if (el.paused) {
            await el.play();
          }
        }
      } catch {}
    };

    const onUserInteract = () => {
      tryResumePlayback();
    };

    document.addEventListener('click', onUserInteract, { capture: true, once: true });
    document.addEventListener('keydown', onUserInteract, { capture: true, once: true });

    return () => {
      document.removeEventListener('click', onUserInteract, { capture: true } as any);
      document.removeEventListener('keydown', onUserInteract, { capture: true } as any);
    };
  }, []);

  // Tab switch detection with exam termination after 2 switches
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 2) {
            setShowTabSwitchDialog(true);
          } else {
            setTabSwitchAlert(true);
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Navigation blocking for back button and tab closing
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      setShowNavigationDialog(true);
      setPendingNavigation(() => () => window.history.back());
      // Push current state back to prevent navigation
      window.history.pushState(null, '', window.location.href);
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Trigger browser's native confirmation dialog
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    const handleVisibilityChange = () => {
      // Show custom dialog when user comes back after interacting with native dialog
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          setShowNavigationDialog(true);
          setPendingNavigation(() => () => window.close());
        }, 100);
      }
    };

    const handleFocus = () => {
      // Also show dialog when window regains focus (handles both Cancel/Stay and Leave scenarios)
      setTimeout(() => {
        setShowNavigationDialog(true);
        setPendingNavigation(() => () => window.close());
      }, 100);
    };

    // Push initial state
    window.history.pushState(null, '', window.location.href);
    
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Listen to browser permission changes (camera/microphone) to update status immediately
  useEffect(() => {
    if (!(navigator as any).permissions) return;

    let camStatus: PermissionStatus | null = null;
    let micStatus: PermissionStatus | null = null;

    const handlePermissionChange = () => {
      const cameraGranted = camStatus ? camStatus.state === 'granted' : true;
      const micGranted = micStatus ? micStatus.state === 'granted' : true;

      if (!cameraGranted || !micGranted) {
        // Reflect loss of access immediately
        setHasMediaAccess(false);
        scheduleStableStatusUpdate('video', false, 0);
        scheduleStableStatusUpdate('audio', false, 0);
        setCameraAlert(true);
        // Stop any active tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
      }
    };

    (navigator as any).permissions.query({ name: 'camera' }).then((status: PermissionStatus) => {
      camStatus = status;
      status.onchange = handlePermissionChange;
      handlePermissionChange();
    }).catch(() => {});

    (navigator as any).permissions.query({ name: 'microphone' }).then((status: PermissionStatus) => {
      micStatus = status;
      status.onchange = handlePermissionChange;
      handlePermissionChange();
    }).catch(() => {});

    return () => {
      if (camStatus) camStatus.onchange = null;
      if (micStatus) micStatus.onchange = null;
    };
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleExplanationChange = (questionId: string, explanation: string) => {
    setExplanations(prev => ({
      ...prev,
      [questionId]: explanation
    }));
  };

  const handleFlagQuestion = (questionId: string) => {
    setFlagged(prev => {
      const newFlagged = new Set(prev);
      if (newFlagged.has(questionId)) {
        newFlagged.delete(questionId);
      } else {
        newFlagged.add(questionId);
      }
      return newFlagged;
    });
  };

  const handleSubmitAssessment = () => {
    const answeredCount = mockQuestions.filter(q => {
      if (q.type === 'descriptive') {
        return answers[q.id]?.trim();
      } else {
        return answers[q.id] && explanations[q.id]?.trim();
      }
    }).length;
    
    const timeSpent = (assessment.duration * 60) - timeLeft;
    
    onComplete({
      answeredCount,
      totalQuestions: mockQuestions.length,
      timeSpent
    });
  };

  const handleTabSwitchDialogClose = () => {
    // End exam regardless of user action
    handleSubmitAssessment();
  };

  const handleNavigationConfirm = () => {
    setShowNavigationDialog(false);
    setPendingNavigation(null);
    handleSubmitAssessment();
  };

  const handleNavigationCancel = () => {
    setShowNavigationDialog(false);
    setPendingNavigation(null);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < mockQuestions.length - 1) {
      const newQuestion = currentQuestion + 1;
      setCurrentQuestion(newQuestion);
      // Update pagination if needed
      const newPage = Math.floor(newQuestion / 10);
      if (newPage !== questionPage) {
        setQuestionPage(newPage);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      const newQuestion = currentQuestion - 1;
      setCurrentQuestion(newQuestion);
      // Update pagination if needed
      const newPage = Math.floor(newQuestion / 10);
      if (newPage !== questionPage) {
        setQuestionPage(newPage);
      }
    }
  };

  // Question navigation with pagination
  const questionsPerPage = 10;
  const totalPages = Math.ceil(mockQuestions.length / questionsPerPage);
  const startQuestion = questionPage * questionsPerPage;
  const endQuestion = Math.min(startQuestion + questionsPerPage, mockQuestions.length);
  const paginatedQuestions = mockQuestions.slice(startQuestion, endQuestion);

  const handleQuestionClick = (index: number) => {
    const actualIndex = startQuestion + index;
    setCurrentQuestion(actualIndex);
  };

  const handlePageChange = (newPage: number) => {
    setQuestionPage(newPage);
  };

  const getQuestionStatus = (index: number, questionId: string) => {
    const question = mockQuestions.find(q => q.id === questionId);
    // For non-descriptive questions, check both answer and explanation
    if (question && question.type !== 'descriptive') {
      const hasAnswer = answers[questionId];
      const hasExplanation = explanations[questionId]?.trim();
      if (hasAnswer && hasExplanation) return 'answered';
    } else if (question && question.type === 'descriptive') {
      // For descriptive questions, only check if answer exists
      if (answers[questionId]?.trim()) return 'answered';
    }
    if (flagged.has(questionId)) return 'flagged';
    if (index === currentQuestion) return 'current';
    return 'unanswered';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered': return 'bg-green-500 text-white';
      case 'flagged': return 'bg-yellow-500 text-white';
      case 'current': return 'bg-primary text-white';
      default: return 'bg-muted text-muted-foreground border';
    }
  };

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'mcq':
        return (
          <div className="space-y-3">
            {question.multipleCorrect ? (
              <div className="space-y-3">
                {question.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Checkbox
                      id={`option-${index}`}
                      checked={answers[question.id]?.includes(option) || false}
                      onCheckedChange={(checked) => {
                        const currentAnswers = answers[question.id] || [];
                        const newAnswers = checked
                          ? [...currentAnswers, option]
                          : currentAnswers.filter((a: string) => a !== option);
                        handleAnswerChange(question.id, newAnswers);
                      }}
                    />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <RadioGroup
                value={answers[question.id] || ''}
                onValueChange={(value) => handleAnswerChange(question.id, value)}
              >
                {question.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            
            {/* Explanation field for MCQ questions */}
            <div className="mt-4">
              <Label htmlFor={`explanation-${question.id}`} className="text-sm font-medium">
                Explain your answer (required)
              </Label>
              <Textarea
                id={`explanation-${question.id}`}
                placeholder="Explain why you chose this answer..."
                value={explanations[question.id] || ''}
                onChange={(e) => handleExplanationChange(question.id, e.target.value)}
                className="mt-2 min-h-20"
              />
            </div>
          </div>
        );

      case 'coding':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="c">C</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCodeEditorFullscreen(!isCodeEditorFullscreen)}
              >
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
            
            <div className={isCodeEditorFullscreen ? 'h-[60vh]' : 'h-80'}>
              <CodeEditor
                language={selectedLanguage}
                initialCode={answers[question.id] || ''}
                onCodeChange={(value) => handleAnswerChange(question.id, value)}
                placeholder={`Write your ${selectedLanguage} code here...`}
                showLanguageSelector={false}
                showRunButton={false}
                showCopyButton={false}
                showResetButton={false}
                showFullscreenToggle={false}
                maxHeight={isCodeEditorFullscreen ? '60vh' : '400px'}
              />
            </div>
            
            {/* Explanation field for coding questions */}
            <div className="mt-2">
              <Label htmlFor={`explanation-${question.id}`} className="text-sm font-medium">
                Explain your approach (required)
              </Label>
              <Textarea
                id={`explanation-${question.id}`}
                placeholder="Explain your coding approach, algorithm choice, time/space complexity..."
                value={explanations[question.id] || ''}
                onChange={(e) => handleExplanationChange(question.id, e.target.value)}
                className="mt-2 min-h-24"
              />
            </div>
          </div>
        );

      case 'descriptive':
        return (
          <Textarea
            placeholder="Type your answer here..."
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="min-h-32"
          />
        );

      default:
        return null;
    }
  };

  const currentQuestionData = mockQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / mockQuestions.length) * 100;
  const answeredCount = mockQuestions.filter(q => {
    if (q.type === 'descriptive') {
      return answers[q.id]?.trim();
    } else {
      return answers[q.id] && explanations[q.id]?.trim();
    }
  }).length;
  const flaggedCount = flagged.size;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Alerts */}
      <div className="flex justify-center">
        {cameraAlert && (
          <Alert className="m-4 w-[60%] border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {!hasMediaAccess 
                  ? "Camera and microphone access are required for this assessment. Please enable permissions in your browser settings."
                  : "Camera or microphone has been disabled. Please re-enable to continue the assessment."
                }
              </span>
              <Button variant="ghost" size="sm" onClick={() => setCameraAlert(false)}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="flex justify-center">
        {tabSwitchAlert && (
          <Alert className="m-4 w-[60%] border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Tab switching detected! This action has been logged. ({tabSwitchCount} violations)</span>
              <Button variant="ghost" size="sm" onClick={() => setTabSwitchAlert(false)}>
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Header */}
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Video Monitor - Left side */}
            <div className="relative bg-black rounded-lg overflow-hidden h-16 w-32">
              {hasMediaAccess && streamRef.current ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-xs">
                  <div className="text-center">
                    <Camera className="h-4 w-4 mx-auto mb-1 opacity-50" />
                    <p className="text-[10px]">Camera Not Available</p>
                  </div>
                </div>
              )}
              <div className="absolute bottom-1 right-1 flex space-x-1">
                {videoTrackEnabled ? (
                  <Camera className="h-2 w-2 text-green-400" />
                ) : (
                  <CameraOff className="h-2 w-2 text-red-400" />
                )}
                {audioTrackEnabled ? (
                  <Mic className="h-2 w-2 text-green-400" />
                ) : (
                  <MicOff className="h-2 w-2 text-red-400" />
                )}
              </div>
            </div>
            
            <div>
              <h1 className="text-xl font-bold">{assessment.title}</h1>
              <Badge variant="outline">{assessment.course}</Badge>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mr-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className={`font-mono text-lg ${timeLeft < 300 ? 'text-red-600' : 'text-foreground'}`}>
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Submit Button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-black text-white hover:bg-black/90">
                  Submit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Assessment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to submit your assessment? You won't be able to make changes after submission.
                    <br /><br />
                    <strong>Summary:</strong>
                    <br />• Answered: {answeredCount}/{mockQuestions.length} questions
                    <br />• Flagged: {flaggedCount} questions
                    <br />• Time remaining: {formatTime(timeLeft)}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmitAssessment}>
                    Submit Assessment
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className={`bg-card border-r transition-all duration-300 ${
          isSidebarCollapsed ? 'w-16' : 'w-80'
        }`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              {!isSidebarCollapsed && (
                <h3 className="font-semibold">Questions</h3>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              >
                {isSidebarCollapsed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>

            {!isSidebarCollapsed ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Questions {startQuestion + 1}-{endQuestion}
                    </span>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost" 
                        size="sm"
                        onClick={() => handlePageChange(questionPage - 1)}
                        disabled={questionPage === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(questionPage + 1)}
                        disabled={questionPage === totalPages - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2 mb-6">
                    {paginatedQuestions.map((question, index) => {
                      const actualIndex = startQuestion + index;
                      const status = getQuestionStatus(actualIndex, question.id);
                      return (
                        <Button
                          key={question.id}
                          variant="outline"
                          size="sm"
                          className={`h-10 w-10 p-0 ${getStatusColor(status)}`}
                          onClick={() => handleQuestionClick(index)}
                        >
                          {actualIndex + 1}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Progress</span>
                      <span>{currentQuestion + 1}/{mockQuestions.length}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Answered</span>
                      <span className="text-green-600">{answeredCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flagged</span>
                      <span className="text-yellow-600">{flaggedCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Remaining</span>
                      <span className="text-muted-foreground">{mockQuestions.length - answeredCount}</span>
                    </div>
                  </div>
                </div>

                {/* Monitoring Status */}
                <div className="mt-6 p-3 bg-muted/30 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">Monitoring Status</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Camera</span>
                      <span className={videoTrackEnabled ? 'text-green-600' : 'text-red-600'}>
                        {videoTrackEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Audio</span>
                      <span className={audioTrackEnabled ? 'text-green-600' : 'text-red-600'}>
                        {audioTrackEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tab Switches</span>
                      <span className="text-orange-600">{tabSwitchCount}</span>
                    </div>
                  </div>
                </div>

              </>
            ) : (
              <>
                {/* Collapsed sidebar with question numbers and pagination */}
                <div className="mb-4">
                  <div className="flex items-center justify-center mb-2">
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost" 
                        size="sm"
                        onClick={() => handlePageChange(questionPage - 1)}
                        disabled={questionPage === 0}
                        className="h-5 w-5 p-0"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePageChange(questionPage + 1)}
                        disabled={questionPage === totalPages - 1}
                        className="h-5 w-5 p-0"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    {paginatedQuestions.map((question, index) => {
                      const actualIndex = startQuestion + index;
                      const status = getQuestionStatus(actualIndex, question.id);
                      return (
                        <Button
                          key={question.id}
                          variant="outline"
                          size="sm"
                          className={`w-8 h-8 p-0 text-xs ${getStatusColor(status)}`}
                          onClick={() => handleQuestionClick(index)}
                        >
                          {actualIndex + 1}
                        </Button>
                      );
                    })}
                  </div>
                </div>

              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-auto max-h-[480px] custom-scrollbar mr-4">
          <div className="p-6 pb-0">
            <Card className="h-full flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline">
                        Question {currentQuestion + 1} of {mockQuestions.length}
                      </Badge>
                      <Badge variant="secondary">
                        {currentQuestionData.marks} marks
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {currentQuestionData.type}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-relaxed">
                      {currentQuestionData.question}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFlagQuestion(currentQuestionData.id)}
                    className={flagged.has(currentQuestionData.id) ? 'text-yellow-600' : ''}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {renderQuestion(currentQuestionData)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Tab Switch Violation Dialog */}
      <AlertDialog open={showTabSwitchDialog} onOpenChange={() => {}}>
        <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Assessment Terminated</AlertDialogTitle>
            <AlertDialogDescription>
              The assessment has been closed due to excessive tab switching. This violation has been logged for review.
              Your responses up to this point have been recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleTabSwitchDialogClose}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Navigation Confirmation Dialog */}
      <AlertDialog open={showNavigationDialog} onOpenChange={setShowNavigationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to end the assessment? Your current progress will be saved, but you won't be able to continue the assessment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleNavigationCancel}>
              Continue Assessment
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleNavigationConfirm}>
              End Assessment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AssessmentInterface;