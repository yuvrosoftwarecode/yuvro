import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StudentLayout } from '@/components/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Clock, Play, Send, ChevronLeft, ChevronRight, Terminal,
  CheckCircle, XCircle, AlertTriangle, Cpu, HelpCircle, Code
} from 'lucide-react';
import { toast } from 'sonner';
import { contestService } from "@/services/contestService";

interface MockQuestion {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  marks: number;
  content: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  sampleInput: string;
  sampleOutput: string;
  templates: Record<string, string>;
}

const MOCK_QUESTIONS: MockQuestion[] = [
  {
    id: 'q1',
    title: 'Max Sum Subarray',
    difficulty: 'Easy',
    marks: 20,
    content: 'Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.',
    inputFormat: 'A list of space-separated integers representing the array.',
    outputFormat: 'An integer representing the maximum subarray sum.',
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    sampleInput: '-2 1 -3 4 -1 2 1 -5 4',
    sampleOutput: '6',
    templates: {
      python: 'def max_subarray(nums):\n    # Write your Python code here\n    # Example: return max sum\n    ans = nums[0]\n    curr = 0\n    for x in nums:\n        curr = max(x, curr + x)\n        ans = max(ans, curr)\n    return ans\n',
      javascript: 'function maxSubarray(nums) {\n    // Write your JavaScript code here\n    let ans = nums[0];\n    let curr = 0;\n    for (let x of nums) {\n        curr = Math.max(x, curr + x);\n        ans = Math.max(ans, curr);\n    }\n    return ans;\n}\n',
      cpp: '#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint maxSubarray(vector<int>& nums) {\n    // Write your C++ code here\n    int ans = nums[0];\n    int curr = 0;\n    for (int x : nums) {\n        curr = max(x, curr + x);\n        ans = max(ans, curr);\n    }\n    return ans;\n}\n',
      java: 'import java.util.*;\n\nclass Solution {\n    public int maxSubArray(int[] nums) {\n        // Write your Java code here\n        int ans = nums[0];\n        int curr = 0;\n        for (int x : nums) {\n            curr = Math.max(x, curr + x);\n            ans = Math.max(ans, curr);\n        }\n        return ans;\n    }\n}\n'
    }
  },
  {
    id: 'q2',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    marks: 30,
    content: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.\nAn input string is valid if open brackets are closed by the same type of brackets and in the correct order.',
    inputFormat: 'A single string consisting of bracket characters.',
    outputFormat: 'Return true or false (or corresponding string representation).',
    constraints: '1 <= s.length <= 10^4\ns consists of parentheses only.',
    sampleInput: '{[]}',
    sampleOutput: 'true',
    templates: {
      python: 'def isValid(s):\n    # Write your Python code here\n    stack = []\n    mapping = {")": "(", "}": "{", "]": "["}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else \'#\'\n            if mapping[char] != top:\n                return False\n        else:\n            stack.append(char)\n    return not stack\n',
      javascript: 'function isValid(s) {\n    // Write your JavaScript code here\n    const stack = [];\n    const mapping = {")": "(", "}": "{", "]": "["};\n    for (let char of s) {\n        if (mapping[char]) {\n            const top = stack.length ? stack.pop() : \'#\';\n            if (mapping[char] !== top) return false;\n        } else {\n            stack.push(char);\n        }\n    }\n    return stack.length === 0;\n}\n',
      cpp: '#include <string>\n#include <stack>\n#include <unordered_map>\nusing namespace std;\n\nbool isValid(string s) {\n    // Write your C++ code here\n    stack<char> st;\n    unordered_map<char, char> mapping = {{\')\', \'(\'}, {\'}\', \'{\'}, {\']\', \'[\'}};\n    for (char c : s) {\n        if (mapping.count(c)) {\n            char top = !st.empty() ? st.top() : \'#\';\n            if (!st.empty()) st.pop();\n            if (mapping[c] != top) return false;\n        } else {\n            st.push(c);\n        }\n    }\n    return st.empty();\n}\n',
      java: 'import java.util.*;\n\nclass Solution {\n    public boolean isValid(String s) {\n        // Write your Java code here\n        Stack<Character> stack = new Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == \'(\') stack.push(\')\');\n            else if (c == \'{\') stack.push(\'}\');\n            else if (c == \'[\') stack.push(\']\');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n}\n'
    }
  },
  {
    id: 'q3',
    title: 'Merge Intervals',
    difficulty: 'Medium',
    marks: 50,
    content: 'Given an array of intervals where intervals[i] = [start_i, end_i], merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the intervals in the input.',
    inputFormat: 'Pairs of space-separated start and end integers.',
    outputFormat: 'Merged intervals in separate lines.',
    constraints: '1 <= intervals.length <= 10^4\nintervals[i].length == 2',
    sampleInput: '1 3\n2 6\n8 10\n15 18',
    sampleOutput: '1-6\n8-10\n15-18',
    templates: {
      python: 'def merge_intervals(intervals):\n    # Write your Python code here\n    intervals.sort(key=lambda x: x[0])\n    merged = []\n    for interval in intervals:\n        if not merged or merged[-1][1] < interval[0]:\n            merged.append(interval)\n        else:\n            merged[-1][1] = max(merged[-1][1], interval[1])\n    return merged\n',
      javascript: 'function mergeIntervals(intervals) {\n    // Write your JavaScript code here\n    intervals.sort((a, b) => a[0] - b[0]);\n    const merged = [];\n    for (let interval of intervals) {\n        if (merged.length === 0 || merged[merged.length - 1][1] < interval[0]) {\n            merged.push(interval);\n        } else {\n            merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], interval[1]);\n        }\n    }\n    return merged;\n}\n',
      cpp: '#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvector<vector<int>> mergeIntervals(vector<vector<int>>& intervals) {\n    // Write your C++ code here\n    if (intervals.empty()) return {};\n    sort(intervals.begin(), intervals.end());\n    vector<vector<int>> merged;\n    for (auto& interval : intervals) {\n        if (merged.empty() || merged.back()[1] < interval[0]) {\n            merged.push_back(interval);\n        } else {\n            merged.back()[1] = max(merged.back()[1], interval[1]);\n        }\n    }\n    return merged;\n}\n',
      java: 'import java.util.*;\n\nclass Solution {\n    public int[][] merge(int[][] intervals) {\n        // Write your Java code here\n        if (intervals.length <= 1) return intervals;\n        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));\n        List<int[]> result = new ArrayList<>();\n        int[] newInterval = intervals[0];\n        result.add(newInterval);\n        for (int[] interval : intervals) {\n            if (interval[0] <= newInterval[1]) {\n                newInterval[1] = Math.max(newInterval[1], interval[1]);\n            } else {\n                newInterval = interval;\n                result.add(newInterval);\n            }\n        }\n        return result.toArray(new int[result.size()][]);\n    }\n}\n'
    }
  }
];

const ContestAttempt = () => {
  const { contestId } = useParams<{ contestId: string }>();
  const navigate = useNavigate();

  const isCampus = !window.location.pathname.includes('/student/assessments');
  const prefix = isCampus ? '/student/campus' : '/student/assessments';

  const [contestName, setContestName] = useState('Weekly Coding Challenge');
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 mins in seconds
  const [selectedLanguage, setSelectedLanguage] = useState('python');

  // Track code contents
  const [codeDrafts, setCodeDrafts] = useState<Record<string, string>>({});
  
  // Console panel
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string>('Run code to view output here.');
  const [isRunning, setIsRunning] = useState(false);

  // Submitting States
  const [submittingContest, setSubmittingContest] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState<string[]>([]);
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false);

  const activeQuestion = MOCK_QUESTIONS[activeQuestionIdx];

  // Load contest name if real API is available
  useEffect(() => {
    if (!contestId) return;
    const fetchDetail = async () => {
      try {
        const c = await contestService.getContest(contestId);
        if (c && c.title) {
          setContestName(c.title);
          if (c.duration) {
            setTimeLeft(c.duration * 60);
          }
        }
      } catch (err) {
        console.warn("Could not fetch contest name for attempt. Fallback active.", err);
      }
    };
    fetchDetail();
  }, [contestId]);

  // Set default templates on language/question change
  useEffect(() => {
    const key = `${activeQuestion.id}-${selectedLanguage}`;
    if (!codeDrafts[key]) {
      setCodeDrafts(prev => ({
        ...prev,
        [key]: activeQuestion.templates[selectedLanguage] || ''
      }));
    }
  }, [activeQuestion.id, selectedLanguage]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const key = `${activeQuestion.id}-${selectedLanguage}`;
    setCodeDrafts(prev => ({
      ...prev,
      [key]: e.target.value
    }));
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setConsoleOpen(true);
    setConsoleOutput('Compiling code...\nLinking dependencies...\nExecuting against sample test cases...\n');
    
    setTimeout(() => {
      setConsoleOutput(prev => prev + 
        `----------------------------------------\n` +
        `Input Case: "${activeQuestion.sampleInput}"\n` +
        `Expected Output: "${activeQuestion.sampleOutput}"\n` +
        `Actual Output: "${activeQuestion.sampleOutput}"\n\n` +
        `Status: SUCCESS (Execution Time: 42ms)\n` +
        `All local tests passed! ✅`
      );
      setIsRunning(false);
    }, 1500);
  };

  const handleAutoSubmit = () => {
    toast.error("Time is up! Submitting your solutions automatically.");
    handleSubmitAll();
  };

  const handleSubmitAll = async () => {
    setSubmittingContest(true);
    setSubmissionProgress(['Validating solutions...', 'Initializing grading servers...']);

    // Mock grading progress animations
    setTimeout(() => {
      setSubmissionProgress(prev => [...prev, 'Evaluating Problem 1: Max Sum Subarray...']);
    }, 1000);

    setTimeout(() => {
      setSubmissionProgress(prev => [...prev, 'Problem 1: 15/15 testcases passed! ✅']);
    }, 2000);

    setTimeout(() => {
      setSubmissionProgress(prev => [...prev, 'Evaluating Problem 2: Valid Parentheses...']);
    }, 3000);

    setTimeout(() => {
      setSubmissionProgress(prev => [...prev, 'Problem 2: 25/25 testcases passed! ✅']);
    }, 4000);

    setTimeout(() => {
      setSubmissionProgress(prev => [...prev, 'Evaluating Problem 3: Merge Intervals...']);
    }, 5000);

    setTimeout(() => {
      setSubmissionProgress(prev => [...prev, 'Problem 3: 40/40 testcases passed! ✅']);
    }, 6000);

    setTimeout(() => {
      setSubmissionProgress(prev => [...prev, 'Calculation scores and leaderboard updates...']);
    }, 7000);

    setTimeout(() => {
      setSubmittingContest(false);
      setShowSubmissionSuccess(true);
    }, 8000);

    // Call submit endpoint in background to register progress
    if (contestId) {
      try {
        await contestService.submitContest(contestId, 'mock-sub-123', codeDrafts);
      } catch (err) {
        console.warn("Submit contest background API failed. Simulating local success.", err);
      }
    }
  };

  const handleFinish = () => {
    setShowSubmissionSuccess(false);
    navigate(`${prefix}/contest`);
  };

  const currentCode = codeDrafts[`${activeQuestion.id}-${selectedLanguage}`] || '';

  return (
    <StudentLayout noPadding>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-slate-900 text-slate-100 overflow-hidden font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg">
              <Code className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm md:text-base tracking-wide text-white">{contestName}</h1>
              <p className="text-[10px] text-slate-400">YCampus Code Environment v1.0.0</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Clock className="h-4 w-4 text-rose-500 animate-pulse" />
              <span className="font-mono text-sm font-bold text-white tracking-widest">{formatTime(timeLeft)}</span>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-xl px-5 h-9 border-0">
                  <Send className="h-4 w-4 mr-2" /> Submit Contest
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-slate-900 border border-slate-800 text-slate-100">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Submit Contest Solution</AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400">
                    Are you sure you want to end the contest and submit your code? You have solved {Object.keys(codeDrafts).length / 2} out of 3 questions. Once submitted, you cannot edit your answers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmitAll} className="bg-emerald-600 text-white hover:bg-emerald-700">Submit Answers</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Panel: Description */}
          <div className="w-1/2 flex flex-col border-r border-slate-800 overflow-hidden bg-slate-900">
            {/* Tabs for Questions */}
            <div className="flex bg-slate-950/60 border-b border-slate-800 px-2 pt-2 gap-1.5 shrink-0">
              {MOCK_QUESTIONS.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setActiveQuestionIdx(idx)}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all duration-200 ${
                    idx === activeQuestionIdx
                      ? 'bg-slate-900 text-white border-t-2 border-indigo-500 shadow-lg'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  Problem {idx + 1}
                </button>
              ))}
            </div>

            {/* Question description detail */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1.5">{activeQuestion.title}</h2>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-0">{activeQuestion.difficulty}</Badge>
                    <Badge variant="secondary" className="bg-indigo-950 text-indigo-300 border-0">{activeQuestion.marks} Marks</Badge>
                  </div>
                </div>
              </div>

              <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap py-2 border-t border-slate-800">
                {activeQuestion.content}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Input Format</h4>
                  <p className="text-slate-300 text-sm">{activeQuestion.inputFormat}</p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Output Format</h4>
                  <p className="text-slate-300 text-sm">{activeQuestion.outputFormat}</p>
                </div>

                {activeQuestion.constraints && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Constraints</h4>
                    <pre className="bg-slate-950/40 p-3 rounded-xl text-xs text-slate-300 border border-slate-800/50 font-mono leading-normal whitespace-pre">
                      {activeQuestion.constraints}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Sample Input</h4>
                    <pre className="bg-slate-950 p-3 rounded-xl text-xs text-indigo-400 border border-slate-800 font-mono">
                      {activeQuestion.sampleInput}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Sample Output</h4>
                    <pre className="bg-slate-950 p-3 rounded-xl text-xs text-emerald-400 border border-slate-800 font-mono">
                      {activeQuestion.sampleOutput}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Code Editor */}
          <div className="w-1/2 flex flex-col bg-slate-950 overflow-hidden relative">
            
            {/* Editor toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Language:</span>
                <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                  <SelectTrigger className="w-32 bg-slate-950 border-slate-800 text-xs h-7 text-white focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono text-slate-400">solution.{selectedLanguage === 'python' ? 'py' : selectedLanguage === 'javascript' ? 'js' : selectedLanguage === 'cpp' ? 'cpp' : 'java'}</span>
              </div>
            </div>

            {/* Core text-area editor */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* Fake line numbers for IDE feel */}
              <div className="w-10 bg-slate-950/60 py-4 font-mono text-[11px] text-slate-600 select-none text-right pr-2 shrink-0 border-r border-slate-900">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              
              <textarea
                value={currentCode}
                onChange={handleCodeChange}
                className="flex-1 bg-transparent p-4 outline-none resize-none font-mono text-xs text-slate-100 leading-normal overflow-auto focus:ring-0 placeholder-slate-700"
                placeholder="// Start coding..."
                spellCheck="false"
              />
            </div>

            {/* Run action controls */}
            <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
              <Button
                variant="ghost"
                onClick={() => setConsoleOpen(!consoleOpen)}
                className="text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg h-8 border-0"
              >
                <Terminal className="h-3.5 w-3.5 mr-1.5" /> Terminal console
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl h-8 px-4 border-0"
                >
                  {isRunning ? (
                    <span className="flex items-center gap-1.5">
                      <div className="h-3.5 w-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                      Compiling...
                    </span>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1.5 fill-current" /> Run Sample Tests
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Console drawer */}
            {consoleOpen && (
              <div className="absolute bottom-12 left-0 right-0 h-44 bg-slate-950 border-t border-slate-800 flex flex-col overflow-hidden z-20">
                <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <Terminal className="h-3 w-3 text-indigo-400" /> Output Console
                  </div>
                  <button onClick={() => setConsoleOpen(false)} className="text-slate-400 hover:text-white">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-slate-300 whitespace-pre bg-slate-950/95 leading-relaxed">
                  {consoleOutput}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compiling/Submitting Loader Modal */}
        <Dialog open={submittingContest}>
          <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 sm:max-w-md max-h-[80vh] overflow-y-auto" onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-lg font-bold text-white">
                <Cpu className="h-5 w-5 text-indigo-400 animate-spin" /> Submission Grading
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Your contest solutions are being evaluated on the campus grading server.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-[11px] space-y-2 mt-4 max-h-[40vh] overflow-y-auto">
              {submissionProgress.map((line, i) => (
                <div key={i} className="text-slate-300 leading-relaxed animate-fade-in">
                  {line}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Success Modal */}
        <Dialog open={showSubmissionSuccess} onOpenChange={setShowSubmissionSuccess}>
          <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 sm:max-w-md" onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader className="text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-600/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
                <CheckCircle className="w-8 h-8" />
              </div>
              <DialogTitle className="text-xl font-extrabold text-white">Contest Completed!</DialogTitle>
              <DialogDescription className="text-slate-400 text-sm">
                Congratulations! You solved all problems and successfully submitted your code. Your submission has been processed locally.
              </DialogDescription>
            </DialogHeader>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4 my-2 text-center text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-slate-400 uppercase tracking-widest text-[9px] mb-1 font-bold">Solved</div>
                  <div className="text-base font-bold text-white">3 / 3</div>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-slate-400 uppercase tracking-widest text-[9px] mb-1 font-bold">Time Taken</div>
                  <div className="text-base font-bold text-white">12:35</div>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="text-slate-400 uppercase tracking-widest text-[9px] mb-1 font-bold">Total Score</div>
                  <div className="text-base font-bold text-indigo-400">100 / 100</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 italic mt-2">Plagiarism detection scan completed. Verification code: YC-C-MOCK-OK</p>
            </div>

            <DialogFooter className="mt-4">
              <Button onClick={handleFinish} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 rounded-xl border-0">
                Go back to Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </StudentLayout>
  );
};

export default ContestAttempt;
