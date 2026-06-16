import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import JSZip from "jszip";
import { TopNav } from "@/components/TopNav";
import { PreviewStatus, PreviewState } from "@/components/Preview/PreviewStatus";
import { PreviewConsole } from "@/components/Preview/PreviewConsole";
import { WebContainerRunner } from "@/services/WebContainerRunner";
import { DiffBadge, StatusBadge } from "@/components/Badges";
import { tickets, labs } from "@/lib/dummy";
import {
  Play, Save, Send, Lightbulb, AlertTriangle, ChevronRight, ChevronDown, ChevronLeft,
  FileCode2, Folder, FolderOpen, Search, GitBranch, Bug, Package, Settings,
  CircleDot, Terminal as TerminalIcon, CheckCircle2, XCircle, Clock, Zap,
  MessageSquare, Lock, Unlock, RotateCcw, Copy, Share2, Flag, HelpCircle,
  Sparkles, Gauge, Wand2, Globe, Check, ArrowLeft, PanelLeftClose, PanelLeftOpen, BookOpen,
} from "lucide-react";

export const Route = createFileRoute("/lab/$slug/ticket/$ticketId")({ component: TicketEditor });

const STARTER_MAIN = `public class Main {
    public static void main(String[] args) {
        // TODO: declare primitive types and print them
        int integerValue = 42;
        double pi = 3.14;
        boolean isJavaFun = true;
        String greeting = "Hello Java";

        System.out.println("Integer: " + integerValue);
        System.out.println("Double: " + pi);
        System.out.println("Boolean: " + isJavaFun);
        System.out.println("String: " + greeting);

        // TODO: type casting
        double castedDouble = integerValue; // implicit
        int castedInt = (int) pi;           // explicit

        // TODO: string ops
        System.out.println("Length: " + greeting.length());
        System.out.println("Char[0]: " + greeting.charAt(0));
    }
}`;

const STARTER_TEST = `import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MainTest {
    @Test void variablesDeclared() { assertTrue(true); }
    @Test void implicitCast()      { assertEquals(42.0, (double) 42); }
    @Test void explicitCast()      { assertEquals(3, (int) 3.99); }
    @Test void stringLength()      { assertEquals(10, "Hello Java".length()); }
    @Test void outputFormat()      { assertEquals("Result: 42", "Result: " + 42); }
}`;

const STARTER_README = `# JAVA-101 · Variables & Types

Demonstrate the 8 Java primitive types, perform implicit and explicit
casts, and use String methods (length, charAt, substring).

Run with: \`javac Main.java && java Main\``;

type FileName = string;

const EXECUTOR_URL = import.meta.env.VITE_CODE_EXECUTOR_BASE_URL || "http://localhost:8009";
const GITHUB_REPO = "MKGandhi05/RideWise";

type GitNode = {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
};

type TreeNode = {
  name: string;
  path: string;
  type: "blob" | "tree";
  children?: TreeNode[];
};

type TestResult = { name: string; pass: boolean; time: string; expected?: string; got?: string };
type BottomTab = "output" | "errors" | "tests" | "quality" | "terminal";

function TicketEditor() {
  const { slug, ticketId } = Route.useParams();
  const navigate = useNavigate({ from: "/lab/$slug/ticket/$ticketId" });
  const routerState = useRouterState();
  const isReviewRoute = routerState.location.pathname.endsWith("/review");
  const lab = labs.find((l) => l.slug === slug) ?? labs[0];
  const ticket = tickets.find((t) => t.id === ticketId) ?? tickets[0];

  const [tab, setTab] = useState<"problem" | "hints" | "discuss">("problem");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [mainView, setMainView] = useState<"code" | "preview">("code");
  const [activeFile, setActiveFile] = useState<string>("");
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [bottomTab, setBottomTab] = useState<BottomTab>("tests");
  const [hintLevel, setHintLevel] = useState(2);
  const [elapsed, setElapsed] = useState(0);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showProgress, setShowProgress] = useState(true);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  const [repoTree, setRepoTree] = useState<TreeNode[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Test 1 · Variables Declaration", pass: false, time: "—" },
    { name: "Test 2 · Type Casting (implicit)", pass: false, time: "—" },
    { name: "Test 3 · Type Casting (explicit)", pass: false, time: "—" },
    { name: "Test 4 · String Operations", pass: false, time: "—" },
    { name: "Test 5 · Output Format", pass: false, time: "—" },
  ]);
  const [testsRan, setTestsRan] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function fetchTree() {
      setIsLoadingTree(true);
      try {
        const res = await fetch(`/github-zip/${GITHUB_REPO}/zip/refs/heads/main`);
        const blob = await res.blob();
        const zip = await JSZip.loadAsync(blob);
        
        const root: TreeNode[] = [];
        const map = new Map<string, TreeNode>();
        
        const getOrCreateNode = (path: string, isDir: boolean): TreeNode => {
            if (map.has(path)) return map.get(path)!;
            
            const parts = path.split("/");
            const name = parts[parts.length - 1];
            const node: TreeNode = {
                name,
                path,
                type: isDir ? "tree" : "blob",
                ...(isDir ? { children: [] } : {})
            };
            map.set(path, node);
            
            if (parts.length > 1) {
                const parentPath = parts.slice(0, -1).join("/");
                const parentNode = getOrCreateNode(parentPath, true);
                parentNode.children!.push(node);
            } else {
                root.push(node);
            }
            return node;
        };

        const loadedFiles: Record<string, string> = {};
        const promises: Promise<void>[] = [];

        zip.forEach((relativePath, zipEntry) => {
          const parts = relativePath.split("/");
          parts.shift(); // remove root folder (e.g., RepoName-main)
          // Handle trailing slashes in directory names
          if (parts[parts.length - 1] === "") parts.pop();
          const path = parts.join("/");
          if (!path) return;
          
          const isBinary = /\.(png|jpe?g|gif|ico|woff2?|ttf|eot|mp3|mp4|avi|zip|tar|gz|pdf)$/i.test(path);
          const node = getOrCreateNode(path, zipEntry.dir);
          if (!zipEntry.dir) {
            if (isBinary) {
              loadedFiles[path] = "";
            } else {
              promises.push(zipEntry.async("string").then(content => {
                 loadedFiles[path] = content;
              }));
            }
          }
        });
        
        await Promise.all(promises);
        setFiles(loadedFiles);
        
        const sortNodes = (nodes: TreeNode[]) => {
          nodes.sort((a, b) => {
            if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          for (const node of nodes) {
            if (node.children) sortNodes(node.children);
          }
        };
        sortNodes(root);
        setRepoTree(root);
      } catch (e) {
        console.error(e);
        // Fallback or show toast
      } finally {
        setIsLoadingTree(false);
      }
    }
    fetchTree();
  }, []);

  async function handleFileClick(path: string) {
    if (!openFiles.includes(path)) {
      setOpenFiles(prev => [...prev, path]);
    }
    setActiveFile(path);
  }

  // Keyboard: Ctrl/Cmd+Enter to run
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); handleRun(); }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  });

  const passed = tests.filter((t) => t.pass).length;
  const allPass = testsRan && passed === tests.length;
  const timeStr = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  const code = files[activeFile] || "";

  // Simple compile-state heuristic based on Main.java code
  const compileState: "ok" | "warn" | "err" = useMemo(() => {
    const m = files["Main.java"] || "";
    if (!m) return "ok";
    if (!/class\s+\w+/.test(m) || !/public\s+static\s+void\s+main/.test(m)) return "err";
    if (/\bcastedDouble\b/.test(m) && !/println.*castedDouble|System\.out.*castedDouble/.test(m)) return "warn";
    return "ok";
  }, [files]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  async function handleRun() {
    setRunning(true);
    setBottomTab("output");
    setOutput("Running code on remote executor...\n");
    
    try {
      const res = await fetch(`${EXECUTOR_URL}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: files[activeFile] || "",
          language: lab.slug,
          input: "",
          timeout: 10
        })
      });
      const data = await res.json();
      
      let outStr = "";
      if (data.status === "compilation_error") {
        outStr = `❌ Compilation Error:\n${data.error}`;
        setBottomTab("errors");
      } else if (!data.success) {
        outStr = `❌ Runtime Error:\n${data.error}\n\nOutput:\n${data.output}`;
        setBottomTab("errors");
      } else {
        outStr = `${data.output}\n\n✓ Program ran successfully (${(data.execution_time || 0).toFixed(2)}s)`;
      }
      setOutput(outStr);
    } catch (err: any) {
      setOutput(`❌ Execution failed: ${err.message}`);
      setBottomTab("errors");
    } finally {
      setRunning(false);
    }
  }

  async function handleRunTests() {
    setBottomTab("tests");
    setTests((ts) => ts.map((t) => ({ ...t, time: "…", pass: false })));
    setTestsRan(false);
    
    const isJava101 = lab.slug === "java" && ticketId === "JAVA-101";
    const m = files["Main.java"] || files[activeFile] || "";
    const syntaxTests: TestResult[] = isJava101 ? [
      { name: "Test 1 · Variables Declaration", pass: /int\s+\w+\s*=/.test(m) && /double\s+\w+\s*=/.test(m), time: "12ms" },
      { name: "Test 2 · Type Casting (implicit)", pass: /double\s+\w+\s*=\s*\w+\s*;/.test(m), time: "8ms" },
      { name: "Test 3 · Type Casting (explicit)", pass: /\(int\)\s*\w/.test(m), time: "9ms" },
      { name: "Test 4 · String Operations", pass: /\.length\(\)/.test(m) && /\.charAt\(/.test(m), time: "7ms" },
    ] : [];
    
    try {
      const res = await fetch(`${EXECUTOR_URL}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: m,
          language: lab.slug,
          input: "",
          timeout: 10
        })
      });
      const data = await res.json();
      
      let expectedOut = "";
      if (isJava101) {
        expectedOut = `Integer: 42\nDouble: 3.14\nBoolean: true\nString: Hello Java\nLength: 10\nCharacter at index 0: H`;
      }
      
      const pass = isJava101 
        ? data.success && data.output.trim() === expectedOut.trim()
        : data.success;
      
      const execTest: TestResult = {
        name: isJava101 ? "Test 5 · Output Format" : "Execution completed successfully",
        pass: pass,
        time: `${((data.execution_time || 0) * 1000).toFixed(0)}ms`,
        expected: isJava101 ? expectedOut : undefined,
        got: data.success ? data.output.trim() || "No output" : `Error:\n${data.error.trim()}`
      };
      
      setTests([...syntaxTests, execTest]);
    } catch (e: any) {
      setTests([...syntaxTests, { name: "Test 5 · Output Format", pass: false, time: "0ms", got: `Error: ${e.message}` }]);
    } finally {
      setTestsRan(true);
    }
  }

  async function handleSubmit() {
    setBottomTab("tests");
    setTests((ts) => ts.map((t) => ({ ...t, time: "…", pass: false })));
    setTestsRan(false);
    
    const isJava101 = lab.slug === "java" && ticketId === "JAVA-101";
    const m = files["Main.java"] || files[activeFile] || "";
    const syntaxTests: TestResult[] = isJava101 ? [
      { name: "Test 1 · Variables Declaration", pass: /int\s+\w+\s*=/.test(m) && /double\s+\w+\s*=/.test(m), time: "12ms" },
      { name: "Test 2 · Type Casting (implicit)", pass: /double\s+\w+\s*=\s*\w+\s*;/.test(m), time: "8ms" },
      { name: "Test 3 · Type Casting (explicit)", pass: /\(int\)\s*\w/.test(m), time: "9ms" },
      { name: "Test 4 · String Operations", pass: /\.length\(\)/.test(m) && /\.charAt\(/.test(m), time: "7ms" },
    ] : [];
    
    try {
      const res = await fetch(`${EXECUTOR_URL}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: m,
          language: lab.slug,
          input: "",
          timeout: 10
        })
      });
      const data = await res.json();
      
      let expectedOut = "";
      if (isJava101) {
        expectedOut = `Integer: 42\nDouble: 3.14\nBoolean: true\nString: Hello Java\nLength: 10\nCharacter at index 0: H`;
      }
      
      const pass = isJava101 
        ? data.success && data.output.trim() === expectedOut.trim()
        : data.success;
      
      const execTest: TestResult = {
        name: isJava101 ? "Test 5 · Output Format" : "Execution completed successfully",
        pass: pass,
        time: `${((data.execution_time || 0) * 1000).toFixed(0)}ms`,
        expected: isJava101 ? expectedOut : undefined,
        got: data.success ? data.output.trim() || "No output" : `Error:\n${data.error.trim()}`
      };
      
      const nextTests = [...syntaxTests, execTest];
      setTests(nextTests);
      setTestsRan(true);
      
      if (nextTests.every((t) => t.pass)) {
        navigate({ to: "/lab/$slug/ticket/$ticketId/review", params: { slug, ticketId } });
      } else {
        showToast("Fix failing tests before submitting");
      }
    } catch (e: any) {
      setTests([...syntaxTests, { name: "Test 5 · Output Format", pass: false, time: "0ms", got: `Error: ${e.message}` }]);
      setTestsRan(true);
      showToast("Fix failing tests before submitting");
    }
  }

  function handleSave() {
    setDirty({ "Main.java": false, "MainTest.java": false, "README.md": false });
    const now = new Date();
    setSavedAt(`${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`);
    showToast("Saved");
  }

  function handleReset() {
    if (!confirm("Reset code to starter template?")) return;
    setFiles({ "Main.java": STARTER_MAIN, "MainTest.java": STARTER_TEST, "README.md": STARTER_README });
    setDirty({ "Main.java": false, "MainTest.java": false, "README.md": false });
    setTestsRan(false);
    setOutput("");
    showToast("Code reset");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(files["Main.java"]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      showToast("Template copied");
    } catch {
      showToast("Copy failed");
    }
  }

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(`${ticket.id} solution by @alex\n\n\`\`\`java\n${files["Main.java"]}\n\`\`\``);
      showToast("Share link copied");
    } catch { showToast("Copy failed"); }
  }

  function updateCode(v: string) {
    setFiles((f) => ({ ...f, [activeFile]: v }));
    setDirty((d) => ({ ...d, [activeFile]: true }));
  }

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }

  if (isReviewRoute) return <Outlet />;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top sub-bar (no global nav — full-page editor) */}
      <div className="flex flex-wrap items-center gap-3 border-b bg-card/60 px-3 py-2 text-xs">
        <Link to="/lab/$slug" params={{ slug }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-accent">
          <ArrowLeft className="h-3 w-3" />Exit
        </Link>
        <button onClick={() => setLeftCollapsed((v) => !v)} title="Toggle panel"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-accent">
          {leftCollapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
          <span className="hidden md:inline">{leftCollapsed ? "Show" : "Hide"} panel</span>
        </button>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Practical Labs</Link><ChevronRight className="h-3 w-3" />
          <Link to="/lab/$slug" params={{ slug }} className="hover:text-foreground">{lab.name}</Link><ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-mono">{ticket.id}</span>
        </div>
        <StatusBadge value={ticket.status} />
        <DiffBadge value={ticket.difficulty} />
        <span className="text-muted-foreground inline-flex items-center gap-1"><Zap className="h-3 w-3 text-primary" />+{ticket.xp} XP</span>
        <span className="text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" />Est. {ticket.estMin}m · Elapsed <span className="font-mono text-foreground">{timeStr}</span></span>
        {savedAt && <span className="text-success inline-flex items-center gap-1"><Check className="h-3 w-3" />Saved {savedAt}</span>}

        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex bg-muted p-0.5 rounded-md border mr-2">
            <button 
              onClick={() => setMainView("code")} 
              className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${mainView === "code" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              Code
            </button>
            <button 
              onClick={() => setMainView("preview")} 
              className={`px-3 py-1 rounded-sm text-xs font-medium transition-colors ${mainView === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              Preview
            </button>
          </div>
          <button onClick={() => setTab("hints")} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent"><HelpCircle className="h-3 w-3" />Hints</button>
          <button onClick={() => showToast("Issue reported · #4821")} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent"><Flag className="h-3 w-3" />Report</button>
          <button onClick={() => showToast("Feedback submitted")} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent"><MessageSquare className="h-3 w-3" />Feedback</button>
          <button onClick={handleSave} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 hover:bg-accent"><Save className="h-3 w-3" />Save</button>
          <button onClick={handleRun} disabled={running} className="inline-flex items-center gap-1 rounded-md bg-success/20 text-success border border-success/40 px-3 py-1 hover:bg-success/30 font-medium disabled:opacity-60">
            <Play className="h-3 w-3" />{running ? "Running…" : "Run"} <kbd className="hidden md:inline rounded bg-success/20 px-1 text-[10px]">⌘↵</kbd>
          </button>
          <button onClick={handleSubmit}
            className="inline-flex items-center gap-1 rounded-md px-3 py-1 font-medium bg-primary text-primary-foreground hover:opacity-90">
            <Send className="h-3 w-3" />Submit
          </button>
        </div>
      </div>

      {/* MAIN IDE */}
      <div className="flex flex-1 min-h-0">
        {/* Activity bar */}
        <div className="flex w-11 flex-col items-center gap-1 border-r bg-editor-panel py-2 text-muted-foreground">
          {[FileCode2, Search, GitBranch, Bug, Package].map((I, i) => (
            <button key={i} className={`grid h-9 w-9 place-items-center rounded ${i === 0 ? "text-foreground bg-accent" : "hover:text-foreground"}`}><I className="h-4 w-4" /></button>
          ))}
          <Settings className="mt-auto h-4 w-4" />
        </div>

        {/* Left panel (collapsible) */}
        {leftCollapsed ? (
          <aside className="hidden md:flex w-10 flex-col items-center gap-1 border-r bg-editor-panel py-2 text-muted-foreground">
            {[
              { k: "problem", I: BookOpen, label: "Problem" },
              { k: "hints", I: Lightbulb, label: "Hints" },
              { k: "discuss", I: MessageSquare, label: "Discuss" },
            ].map(({ k, I, label }) => (
              <button key={k} title={label} onClick={() => { setLeftCollapsed(false); setTab(k as typeof tab); }}
                className="grid h-9 w-9 place-items-center rounded hover:text-foreground hover:bg-accent">
                <I className="h-4 w-4" />
              </button>
            ))}
            <button onClick={() => setLeftCollapsed(false)} title="Expand panel"
              className="mt-auto grid h-9 w-9 place-items-center rounded hover:text-foreground hover:bg-accent">
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </aside>
        ) : (
          <aside className="hidden md:flex w-[30%] min-w-[300px] max-w-[460px] flex-col border-r bg-editor-panel">
            <div className="flex items-center border-b text-xs">
              {[
                { k: "problem", label: "Problem" },
                { k: "hints", label: "Hints" },
                { k: "discuss", label: "Discuss" },
              ].map((t) => (
                <button key={t.k} onClick={() => setTab(t.k as typeof tab)}
                  className={`px-3 py-2 ${tab === t.k ? "bg-editor-bg text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</button>
              ))}
              <button onClick={() => setLeftCollapsed(true)} title="Collapse panel"
                className="ml-auto mr-2 grid h-7 w-7 place-items-center rounded hover:bg-accent text-muted-foreground hover:text-foreground">
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto scrollbar-thin p-4 text-sm space-y-3">
              {tab === "problem" && <ProblemPanel ticket={ticket} />}
              {tab === "hints" && <HintsPanel level={hintLevel} setLevel={setHintLevel} elapsed={elapsed} onUnlock={(n, c) => showToast(`Hint ${n} unlocked${c ? ` (${c})` : ""}`)} />}
              {tab === "discuss" && <DiscussPanel />}
            </div>
          </aside>
        )}

        {/* Center editor */}
        <section className="flex flex-1 min-w-0 flex-col relative">
          <div className="flex flex-1 min-h-0">
            {/* File tree */}
            <div className="hidden lg:flex w-52 flex-col border-r bg-editor-panel text-xs">
              <div className="px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">Explorer</div>
              <div className="flex-1 overflow-auto scrollbar-thin px-2 space-y-0.5 pb-2">
                {isLoadingTree ? (
                  <div className="p-4 text-muted-foreground text-center animate-pulse">Loading repo...</div>
                ) : (
                  <GitTree nodes={repoTree} active={activeFile} dirty={dirty} onFileClick={handleFileClick} />
                )}
              </div>
              <div className="mt-auto border-t px-3 py-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1"><GitBranch className="h-3 w-3" /> master</div>
              </div>
            </div>

            <div className="flex flex-1 min-w-0 flex-col relative">
              {/* We use visibility instead of display:none so the iframe loads and warms up Vite in the background! */}
              <div className={`absolute inset-0 bg-muted/20 ${mainView === "preview" ? "z-10 opacity-100" : "-z-10 opacity-0 pointer-events-none"}`}>
                <PreviewView files={files} lab={lab} activeFile={activeFile} />
              </div>
              <div className={`absolute inset-0 flex-col ${mainView === "code" ? "flex z-10 opacity-100" : "-z-10 opacity-0 pointer-events-none"}`}>
                <>
                  {/* Tabs row */}
              <div className="flex items-center border-b bg-editor-panel text-xs overflow-x-auto">
                {openFiles.map((f) => (
                  <button key={f} onClick={() => setActiveFile(f)}
                    className={`flex items-center gap-2 border-r px-3 py-2 whitespace-nowrap ${activeFile === f ? "bg-editor-bg text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <FileCode2 className="h-3 w-3" />{f.split("/").pop()}
                    {dirty[f] && <CircleDot className="h-2.5 w-2.5 text-warning" />}
                    <span onClick={(e) => {
                      e.stopPropagation();
                      const next = openFiles.filter(p => p !== f);
                      setOpenFiles(next);
                      if (activeFile === f) setActiveFile(next[0] || "");
                    }} className="ml-1 hover:bg-accent rounded p-0.5 w-4 h-4 flex items-center justify-center">×</span>
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2 pr-3 text-[11px] text-muted-foreground whitespace-nowrap">
                  <CompileBadge state={compileState} />
                  <span className="hidden md:inline">Quality <span className="text-foreground">{Math.max(4, 10 - (code.match(/TODO/g)?.length ?? 0))}/10</span></span>
                  <button onClick={toggleTheme} className="rounded border px-2 py-0.5 hover:bg-accent">
                    {theme === "dark" ? "☀ Light" : "🌙 Dark"}
                  </button>
                  <button title="Format" onClick={() => showToast("Code formatted")} className="rounded border px-2 py-0.5 hover:bg-accent"><Wand2 className="h-3 w-3" /></button>
                </div>
              </div>

              {/* Editor */}
              <div className="flex flex-1 min-h-0 relative">
                <Editor
                  height="100%"
                  language={
                    activeFile.endsWith(".md") ? "markdown" :
                    activeFile.endsWith(".java") ? "java" :
                    activeFile.endsWith(".py") ? "python" :
                    activeFile.endsWith(".html") ? "html" :
                    activeFile.endsWith(".js") || activeFile.endsWith(".jsx") ? "javascript" :
                    activeFile.endsWith(".ts") || activeFile.endsWith(".tsx") ? "typescript" :
                    activeFile.endsWith(".css") ? "css" :
                    activeFile.endsWith(".json") ? "json" :
                    activeFile.endsWith(".yml") || activeFile.endsWith(".yaml") ? "yaml" :
                    "plaintext"
                  }
                  theme={theme === "dark" ? "vs-dark" : "light"}
                  value={code}
                  onChange={(v) => updateCode(v || "")}
                  options={{
                    minimap: { enabled: true },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                    padding: { top: 16 },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                  loading={<div className="flex items-center justify-center h-full w-full text-muted-foreground animate-pulse text-sm">Loading editor...</div>}
                />
              </div>

              {/* Bottom panel */}
              <div className="border-t bg-editor-panel">
                <div className="flex items-center border-b text-xs overflow-x-auto">
                  {[
                    { k: "output", label: "Console", icon: TerminalIcon },
                    { k: "tests", label: `Tests${testsRan ? ` (${passed}/${tests.length})` : ""}`, icon: CheckCircle2 },
                    { k: "errors", label: "Errors", icon: AlertTriangle },
                    { k: "quality", label: "Quality", icon: Gauge },
                    { k: "terminal", label: "Terminal", icon: TerminalIcon },
                  ].map((t) => (
                    <button key={t.k} onClick={() => setBottomTab(t.k as BottomTab)}
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 uppercase tracking-wide ${bottomTab === t.k ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                      <t.icon className="h-3 w-3" />{t.label}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2 px-3 text-[11px] text-muted-foreground whitespace-nowrap">
                    <button onClick={handleRunTests} className="rounded border px-2 py-0.5 hover:bg-accent text-foreground">Run tests</button>
                    {testsRan && <span>{allPass ? "✓ ready to submit" : "fix failing tests"}</span>}
                  </div>
                </div>
                <div className="h-52 overflow-auto scrollbar-thin p-3 text-xs">
                  {bottomTab === "tests" && <TestsView tests={tests} ran={testsRan} onRun={handleRunTests} />}
                  {bottomTab === "output" && <OutputView output={output} />}
                  {bottomTab === "errors" && <ErrorsView state={compileState} />}
                  {bottomTab === "quality" && <QualityView code={code} />}
                  {bottomTab === "terminal" && <TerminalView />}
                </div>
              </div>
              </>
            </div>
          </div>

            {/* Live progress */}
            {showProgress && (
              <div className="hidden xl:flex w-60 flex-col gap-2 border-l bg-editor-panel/80 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">Live Progress</div>
                  <button onClick={() => setShowProgress(false)} className="text-muted-foreground hover:text-foreground">×</button>
                </div>
                <ProgressTile icon={CheckCircle2} label="Tests passed" value={`${passed}/${tests.length}`} tone={allPass ? "success" : "warning"} pct={(passed / tests.length) * 100} />
                <ProgressTile icon={Gauge} label="Code quality" value={`${Math.max(4, 10 - (code.match(/TODO/g)?.length ?? 0))}/10`} tone="info" pct={Math.max(40, 100 - (code.match(/TODO/g)?.length ?? 0) * 10)} />
                <ProgressTile icon={Clock} label="Time spent" value={timeStr} tone="muted" pct={Math.min(100, (elapsed / (ticket.estMin * 60)) * 100)} />
                <ProgressTile icon={Zap} label="XP on submit" value={`+${ticket.xp}`} tone="primary" pct={100} />

                <div className="mt-2 rounded-md border bg-editor-bg p-2">
                  <div className="flex items-center gap-1 text-[11px] font-semibold"><Lightbulb className="h-3 w-3 text-warning" />Active hints</div>
                  <div className="mt-1 text-muted-foreground">Level {hintLevel} unlocked</div>
                  <button onClick={() => setTab("hints")} className="mt-1.5 w-full rounded border border-dashed py-1 text-[11px] hover:bg-accent">Open hints panel</button>
                </div>

                <div className="mt-auto space-y-1.5">
                  <button onClick={handleReset} className="w-full inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 hover:bg-accent"><RotateCcw className="h-3 w-3" />Reset code</button>
                  <button onClick={handleCopy} className="w-full inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 hover:bg-accent">
                    {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}{copied ? "Copied" : "Copy template"}
                  </button>
                  <button onClick={handleShare} className="w-full inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 hover:bg-accent"><Share2 className="h-3 w-3" />Share code</button>
                </div>
              </div>
            )}
          </div>

          {!showProgress && (
            <button onClick={() => setShowProgress(true)} className="absolute right-3 top-12 rounded-full border bg-card p-2 shadow-lg hover:bg-accent" title="Show progress">
              <Sparkles className="h-4 w-4 text-primary" />
            </button>
          )}
        </section>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 border-t bg-primary/90 px-3 py-1 text-[11px] text-primary-foreground">
        <span className="inline-flex items-center gap-1"><GitBranch className="h-3 w-3" /> main</span>
        <span>Java 17</span>
        <span>UTF-8</span>
        <span>LF</span>
        <span className="inline-flex items-center gap-1">
          {compileState === "ok" && <><CheckCircle2 className="h-3 w-3" />Compiled</>}
          {compileState === "warn" && <><AlertTriangle className="h-3 w-3" />1 warning</>}
          {compileState === "err" && <><XCircle className="h-3 w-3" />Compile error</>}
        </span>
        <span className="ml-auto">{activeFile} · {code.split("\n").length} lines</span>
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border bg-card px-4 py-2 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}


/* ---------- Subviews ---------- */

function CompileBadge({ state }: { state: "ok" | "warn" | "err" }) {
  const map = {
    ok: { txt: "Compiled", cls: "text-success border-success/40 bg-success/10", I: CheckCircle2 },
    warn: { txt: "Warnings", cls: "text-warning border-warning/40 bg-warning/10", I: AlertTriangle },
    err: { txt: "Errors", cls: "text-destructive border-destructive/40 bg-destructive/10", I: XCircle },
  } as const;
  const { txt, cls, I } = map[state];
  return <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 ${cls}`}><I className="h-3 w-3" />{txt}</span>;
}

function TestsView({ tests, ran, onRun }: { tests: TestResult[]; ran: boolean; onRun: () => void }) {
  const passed = tests.filter((t) => t.pass).length;
  if (!ran) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <CheckCircle2 className="h-6 w-6" />
        <div>No test results yet</div>
        <button onClick={onRun} className="rounded border bg-primary px-3 py-1 text-xs text-primary-foreground hover:opacity-90">Run tests</button>
      </div>
    );
  }
  return (
    <div className="font-mono space-y-1.5">
      <div className="text-muted-foreground">Running tests… completed in 0.12s</div>
      <div className="border-b border-dashed my-1" />
      {tests.map((t) => (
        <div key={t.name}>
          <div className="flex items-center gap-2">
            {t.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
            <span className={t.pass ? "" : "text-destructive"}>{t.name}</span>
            <span className="ml-auto text-muted-foreground">{t.time}</span>
          </div>
          {t.got && (
            <div className={`ml-5 mt-1 rounded border p-1.5 text-[11px] ${
              !t.pass 
                ? "border-destructive/30 bg-destructive/5 text-destructive/90"
                : "border-border bg-accent/50 text-muted-foreground"
            }`}>
              {t.expected && <div>Expected: <span className={!t.pass ? "text-success" : "text-foreground"}>{t.expected}</span></div>}
              <div>{t.expected ? "Got:      " : "Output:\n"}<span className={!t.pass ? "text-destructive" : "text-foreground whitespace-pre-wrap font-mono"}>{t.got}</span></div>
            </div>
          )}
        </div>
      ))}
      <div className="mt-2 border-t pt-2">
        Score: <span className="text-foreground font-semibold">{passed}/{tests.length}</span> ({Math.round((passed / tests.length) * 100)}%)
        {passed < tests.length && <span className="ml-2 text-destructive">Submit when all tests pass.</span>}
      </div>
    </div>
  );
}

function OutputView({ output }: { output: string }) {
  if (!output) return <div className="text-muted-foreground">Click <span className="text-foreground font-medium">Run</span> to execute your code.</div>;
  return <pre className="font-mono text-muted-foreground whitespace-pre-wrap">{output}</pre>;
}

function ErrorsView({ state }: { state: "ok" | "warn" | "err" }) {
  const items = state === "err" ? [
    { sev: "err" as const, line: 1, msg: "Missing class or main method", fix: "Ensure 'public class Main { public static void main(String[] args) {} }'" },
  ] : state === "warn" ? [
    { sev: "warn" as const, line: 18, msg: "Unused variable 'castedDouble'", fix: "Remove the declaration or print it" },
  ] : [];
  if (!items.length) return <div className="text-muted-foreground inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" />No errors or warnings.</div>;
  return (
    <div className="space-y-1.5 font-mono">
      {items.map((e, i) => (
        <div key={i} className={`rounded border p-2 ${e.sev === "err" ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5"}`}>
          <div className="flex items-center gap-2">
            {e.sev === "err" ? <XCircle className="h-3 w-3 text-destructive" /> : <AlertTriangle className="h-3 w-3 text-warning" />}
            <span className="underline-offset-2">Main.java:{e.line}</span>
            <span className={e.sev === "err" ? "text-destructive" : "text-warning"}>{e.msg}</span>
          </div>
          <div className="mt-1 ml-5 text-[11px] text-muted-foreground">💡 {e.fix}</div>
        </div>
      ))}
    </div>
  );
}

function QualityView({ code }: { code: string }) {
  const todos = (code.match(/TODO/g) ?? []).length;
  const score = Math.max(4, 10 - todos);
  const items = [
    { ok: true, t: "Naming conventions followed" },
    { ok: true, t: "No unused imports" },
    { ok: todos === 0, sev: "warn" as const, t: `Resolve ${todos} TODO comment${todos === 1 ? "" : "s"}` },
    { ok: code.includes("/**") || code.includes("//"), sev: "warn" as const, t: "Add comments to explain logic" },
    { ok: code.split("\n").length < 40, sev: "err" as const, t: "Method too long — consider refactoring" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-semibold">{score}<span className="text-muted-foreground text-sm">/10</span></div>
        <div className="flex-1 h-2 rounded-full bg-accent overflow-hidden">
          <div className="h-full bg-success transition-all" style={{ width: `${score * 10}%` }} />
        </div>
      </div>
      <ul className="space-y-1 font-mono">
        {items.map((i, k) => (
          <li key={k} className="flex items-center gap-2">
            {i.ok
              ? <CheckCircle2 className="h-3 w-3 text-success" />
              : i.sev === "warn" ? <AlertTriangle className="h-3 w-3 text-warning" /> : <XCircle className="h-3 w-3 text-destructive" />}
            <span className={i.ok ? "" : i.sev === "warn" ? "text-warning" : "text-destructive"}>{i.t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewView({ files, lab, activeFile }: { files: Record<string, string>; lab: typeof labs[number]; activeFile: string }) {
  const [previewStatus, setPreviewStatus] = useState<PreviewState>('idle');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [consoleOutput, setConsoleOutput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showTerminal, setShowTerminal] = useState<boolean>(false);
  
  const runnerRef = useRef<WebContainerRunner | null>(null);

  // Find package.json
  const allPkgJsons = Object.keys(files).filter((path) => path.endsWith("package.json"));
  let packageJsonPath = allPkgJsons.find(p => p.includes("frontend") || p.includes("client") || p.includes("web") || p.includes("ui"));
  
  if (!packageJsonPath && allPkgJsons.length > 0) {
    packageJsonPath = allPkgJsons.find(p => {
      const content = files[p];
      return content.includes('"react"') || content.includes('"vite"') || content.includes('"next"');
    }) || allPkgJsons[0];
  }

  const hasPackageJson = !!packageJsonPath;
  const isReact = Object.keys(files).some(f => f.endsWith(".tsx") || f.endsWith(".jsx"));

  const startWebContainer = async () => {
    try {
      setPreviewStatus('booting');
      setConsoleOutput('');
      
      if (!runnerRef.current) {
        runnerRef.current = new WebContainerRunner();
      }
      
      const runner = runnerRef.current;
      
      // Clean up files (lift to root if needed)
      const projectRoot = packageJsonPath ? packageJsonPath.replace("package.json", "") : "";
      const runnerFiles: Record<string, string> = {};
      
      for (const [path, code] of Object.entries(files)) {
        let targetPath = projectRoot && path.startsWith(projectRoot) ? `/${path.slice(projectRoot.length)}` : (!projectRoot ? `/${path}` : null);
        if (targetPath) {
          let content = code;
          
          // Inject Mock Backend into Vite Config so frontend buttons are functional
          if (targetPath === "/vite.config.js" || targetPath === "/vite.config.ts") {
            const mockPlugin = `
const mockBackendPlugin = () => ({
  name: 'mock-backend',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.end();
        return;
      }

      if (req.url?.includes('/auth/register') || req.url?.includes('/auth/login')) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ token: "mock-jwt-token", user: { id: 1, email: "test@example.com" } }));
        return;
      }
      if (req.url?.includes('/resume/upload')) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: "Resume uploaded successfully (mocked)", data: { id: 123 } }));
        return;
      }
      if (req.url?.includes('/jd/upload')) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: "JD uploaded successfully (mocked)" }));
        return;
      }
      if (req.url?.includes('/analytics/analyze')) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true }));
        return;
      }
      if (req.url?.includes('/analytics') && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          overall_match: 85,
          skill_coverage: 90,
          experience_match: 80,
          keywords_matched: ["React", "JavaScript", "Node.js"],
          missing_skills: ["Docker", "Kubernetes"],
          total_interviews: 3,
          average_score: 75
        }));
        return;
      }
      if (req.url?.includes('/api/') || req.method === 'POST' || req.method === 'PUT') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, data: [], message: "Mocked response" }));
        return;
      }
      next();
    });
  }
});
`;
            if (content.includes("plugins: [")) {
              content = content.replace("export default defineConfig", mockPlugin + "\nexport default defineConfig");
              content = content.replace("plugins: [", "plugins: [mockBackendPlugin(), ");
            } else if (content.includes("defineConfig({")) {
              content = content.replace("export default defineConfig", mockPlugin + "\nexport default defineConfig");
              content = content.replace("defineConfig({", "defineConfig({ plugins: [mockBackendPlugin()],");
            }
          }

          if (targetPath === "/package-lock.json" || targetPath === "/yarn.lock" || targetPath === "/pnpm-lock.yaml") {
            continue; // Skip lockfiles so our dynamic package.json downgrades actually take effect
          }

          if (targetPath === "/index.html") {
            const script = `
<script>
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('React Router Future Flag')) return;
    originalWarn(...args);
  };
</script>
`;
            if (content.includes("<head>")) {
              content = content.replace("<head>", "<head>" + script);
            } else {
              content = script + content;
            }
          }

          if (targetPath === "/package.json") {
            // Force downgrade Vite to v5 no matter what version the student wrote to avoid WASI crashes
            content = content.replace(/"vite"\s*:\s*"[^"]+"/, '"vite": "^5.4.11"');
            content = content.replace(/"@vitejs\/plugin-react"\s*:\s*"[^"]+"/, '"@vitejs/plugin-react": "^4.2.1"');
          }

          runnerFiles[targetPath] = content;
        }
      }
      
      // Ensure environment variables are set so Axios doesn't resolve to 'undefined'
      let envContent = runnerFiles["/.env"] || "";
      envContent += "\nVITE_API_URL=\nREACT_APP_API_URL=\nREACT_APP_BASE_URL=\n";
      runnerFiles["/.env"] = envContent;

      // Inject Mock Backend for Create React App (react-scripts)
      if (hasPackageJson && !runnerFiles["/src/setupProxy.js"]) {
        runnerFiles["/src/setupProxy.js"] = `
module.exports = function(app) {
  app.use((req, res, next) => {
    if (req.url.includes('/api/accounts/signin/') || req.url.includes('/api/accounts/signup/')) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        success: true, 
        access: "mock-jwt-access-token", 
        refresh: "mock-jwt-refresh-token",
        username: "MockUser",
        email: "user@example.com"
      }));
      return;
    }
    if (req.url.includes('/api/accounts/get_user/')) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        username: "MockUser",
        email: "user@example.com"
      }));
      return;
    }
    if (req.url.includes('/api/')) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, message: "Mocked response from setupProxy.js" }));
      return;
    }
    next();
  });
};
`;
      }

      await runner.initialize(runnerFiles);
      
      setPreviewStatus('installing');
      await runner.installDependencies((data) => {
        setConsoleOutput(prev => prev + data);
      });
      
      setPreviewStatus('starting');
      await runner.startDevServer((data) => {
        setConsoleOutput(prev => prev + data);
      });
      
      const url = await runner.getPreviewUrl();
      setPreviewUrl(url);
      setPreviewStatus('ready');
      
    } catch (e: any) {
      console.error(e);
      setPreviewStatus('error');
      setErrorMessage(e.message || "An unknown error occurred");
    }
  };

  useEffect(() => {
    if (!isReact && !hasPackageJson) return; // Prevent WebContainer from booting
    startWebContainer();
    return () => {
      if (runnerRef.current) {
        runnerRef.current.stop();
      }
    };
  }, [packageJsonPath]); // Re-run if package.json path changes

  // Sync active file changes to the WebContainer to trigger Vite HMR
  useEffect(() => {
    if (previewStatus === 'ready' && runnerRef.current && activeFile && files[activeFile] !== undefined) {
      const projectRoot = packageJsonPath ? packageJsonPath.replace("package.json", "") : "";
      const targetPath = projectRoot && activeFile.startsWith(projectRoot) ? `/${activeFile.slice(projectRoot.length)}` : (!projectRoot ? `/${activeFile}` : null);
      
      if (targetPath) {
        // Debounce slightly or just write directly since fs operations are fast in memory
        runnerRef.current.updateFile(targetPath, files[activeFile]);
      }
    }
  }, [files[activeFile], activeFile, previewStatus, packageJsonPath]);

  // If it's a Python/HTML project without a package.json, bypass WebContainers completely!
  if (!isReact && !hasPackageJson) {
    let htmlContent = files["/index.html"] || Object.values(files).find(c => c.includes("<!DOCTYPE html>")) || "<h1>No index.html found</h1>";
    const cssFiles = Object.keys(files).filter(f => f.endsWith(".css"));
    let injectedStyles = "";
    for (const css of cssFiles) {
      injectedStyles += `<style>/* ${css} */\n${files[css]}</style>\n`;
    }
    
    if (htmlContent.includes("</head>")) {
      htmlContent = htmlContent.replace("</head>", `${injectedStyles}</head>`);
    } else {
      htmlContent = injectedStyles + htmlContent;
    }

    return (
      <div className="flex h-full gap-2 bg-white relative group">
        <iframe 
          srcDoc={htmlContent} 
          className="w-full h-full border-0 bg-white" 
          sandbox="allow-scripts allow-forms allow-modals"
          title="Preview"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex-1 rounded border bg-white overflow-hidden relative min-h-0 group">
        <PreviewStatus 
          status={previewStatus} 
          errorMessage={errorMessage} 
          onRetry={startWebContainer} 
        />
        {previewStatus === 'ready' && previewUrl && (
          <iframe 
            src={previewUrl} 
            className="w-full h-full border-0" 
            allow="cross-origin-isolated"
            title="Preview"
          />
        )}
        <button 
          onClick={() => setShowTerminal(p => !p)}
          className="absolute bottom-4 right-4 z-50 flex items-center gap-2 rounded border bg-background/95 backdrop-blur px-3 py-1.5 text-xs font-medium shadow hover:bg-accent text-foreground transition-opacity opacity-0 group-hover:opacity-100"
        >
          <TerminalIcon className="h-3 w-3" />
          {showTerminal ? "Hide Console" : "Show Console"}
        </button>
      </div>
      <div className={`rounded overflow-hidden shrink-0 transition-all duration-300 ${showTerminal ? "h-48 border opacity-100" : "h-0 border-0 opacity-0"}`}>
        <PreviewConsole output={consoleOutput} />
      </div>
    </div>
  );
}

function TerminalView() {
  return (
    <div className="font-mono text-muted-foreground space-y-0.5">
      <div><span className="text-success">alex@labs</span>:<span className="text-info">~/java-101</span>$ javac Main.java</div>
      <div><span className="text-success">alex@labs</span>:<span className="text-info">~/java-101</span>$ java Main</div>
      <div className="text-foreground">{"> Build successful in 1.2s"}</div>
      <div><span className="text-success">alex@labs</span>:<span className="text-info">~/java-101</span>$ <span className="animate-pulse">▌</span></div>
    </div>
  );
}

function ProgressTile({ icon: Icon, label, value, tone, pct }: { icon: typeof Zap; label: string; value: string; tone: "success" | "warning" | "info" | "primary" | "muted"; pct: number }) {
  const color = { success: "text-success", warning: "text-warning", info: "text-info", primary: "text-primary", muted: "text-muted-foreground" }[tone];
  const bar = { success: "bg-success", warning: "bg-warning", info: "bg-info", primary: "bg-primary", muted: "bg-muted-foreground" }[tone];
  return (
    <div className="rounded-md border bg-editor-bg p-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-muted-foreground"><Icon className={`h-3 w-3 ${color}`} />{label}</span>
        <span className={`font-semibold ${color}`}>{value}</span>
      </div>
      <div className="mt-1.5 h-1 rounded-full bg-accent overflow-hidden">
        <div className={`h-full ${bar} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}



function ProblemPanel({ ticket }: { ticket: typeof tickets[number] }) {
  return (
    <>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{ticket.id} · {ticket.tag}</div>
        <h2 className="text-lg font-semibold mt-0.5">{ticket.title}</h2>
        <p className="mt-2 text-muted-foreground">📋 Create a program demonstrating Java variables and data types.</p>
      </div>

      <Section title="🎯 Learning objectives">
        <ul className="space-y-1 text-muted-foreground">
          <li>✓ Understand primitive data types</li>
          <li>✓ Declare and initialize variables</li>
          <li>✓ Perform type casting</li>
          <li>✓ Work with String operations</li>
        </ul>
      </Section>

      <Section title="✅ Tasks">
        <div className="space-y-2 text-muted-foreground">
          <div>
            <div className="text-foreground">Task 1 · Create variables for all primitive types</div>
            <ul className="ml-3 mt-0.5 list-['└─_'] text-[12px]">
              <li>int, double, boolean, char, long, float, byte, short</li>
              <li>Initialize with appropriate values</li>
              <li>Print them to console</li>
            </ul>
          </div>
          <div>
            <div className="text-foreground">Task 2 · Perform type casting</div>
            <ul className="ml-3 mt-0.5 list-['└─_'] text-[12px]">
              <li>Implicit: int → double</li>
              <li>Explicit: double → int</li>
              <li>Show before and after values</li>
            </ul>
          </div>
          <div>
            <div className="text-foreground">Task 3 · Work with Strings</div>
            <ul className="ml-3 mt-0.5 list-['└─_'] text-[12px]">
              <li>Create a String variable</li>
              <li>Use length(), charAt(), substring()</li>
              <li>Print the results</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="📥 Expected output">
        <pre className="rounded-md bg-editor-bg border p-2 text-[12px] font-mono text-muted-foreground">{`Integer: 42
Double: 3.14
Boolean: true
String: Hello Java
Length: 10
Character at index 0: H`}</pre>
      </Section>

      <Section title="🔗 Related concepts">
        <ul className="space-y-1 text-info">
          <li>→ JAVA-102 · Control Flow & Loops</li>
          <li>→ JAVA-105 · Strings Deep Dive</li>
          <li>→ Docs: Primitive vs reference types</li>
        </ul>
      </Section>

      <Section title="⚠️ Common mistakes">
        <ul className="space-y-1 text-muted-foreground">
          <li>• Type mismatch: <code>double → int</code> requires explicit cast</li>
          <li>• Forgetting <code>(int)</code> when narrowing</li>
          <li>• <code>charAt</code> out-of-bounds on empty strings</li>
        </ul>
      </Section>
    </>
  );
}

function HintsPanel({ level, setLevel, elapsed, onUnlock }: { level: number; setLevel: (n: number) => void; elapsed: number; onUnlock: (n: number, cost: string) => void }) {
  const mins = elapsed / 60;
  const hints = [
    { n: 1, cost: "Free", title: "Think about it", body: "Think about what data type each variable needs. List the 8 Java primitives.", unlockMin: 0 },
    { n: 2, cost: mins >= 5 ? "Free" : `Free in ${Math.ceil(5 - mins)}m`, title: "Approach", body: "First declare all 8 primitive types with sensible defaults. Then print each, then attempt one cast in each direction.", unlockMin: 5 },
    { n: 3, cost: mins >= 15 ? "Free" : "10 XP", title: "Code template", body: "int a = 42;\ndouble b = a;        // implicit\nint c = (int) 3.99;  // explicit", unlockMin: 15 },
    { n: 4, cost: mins >= 25 ? "Free" : "20 XP", title: "Partial solution (50%)", body: "Use greeting.length() + greeting.charAt(0). Now complete the casting part…", unlockMin: 25 },
  ];
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning">
        <Lightbulb className="inline h-3 w-3 mr-1" /> Progressive hints — unlocking deeper hints costs XP unless you wait.
      </div>
      {hints.map((h) => {
        const unlocked = level >= h.n || mins >= h.unlockMin;
        return (
          <div key={h.n} className="rounded-md border bg-editor-bg p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Level {h.n} · {h.title}</div>
              <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                {unlocked ? <Unlock className="h-3 w-3 text-success" /> : <Lock className="h-3 w-3" />}{h.cost}
              </span>
            </div>
            {unlocked ? (
              <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground font-mono">{h.body}</pre>
            ) : (
              <div className="mt-2 space-y-1">
                <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" />Auto-unlocks at {h.unlockMin}m elapsed</div>
                <button onClick={() => { setLevel(h.n); onUnlock(h.n, h.cost); }} className="w-full rounded border border-dashed py-1.5 text-xs hover:bg-accent">Unlock now for {h.cost}</button>
              </div>
            )}
          </div>
        );
      })}
      <div className="rounded-md border bg-editor-bg p-3 text-xs">
        <div className="font-medium inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> Full solution review</div>
        <div className="mt-1 text-muted-foreground">Unlocked after submission — includes annotated solution, alternatives, and best practices.</div>
      </div>
    </div>
  );
}

function DiscussPanel() {
  return (
    <div className="space-y-3 text-xs">
      {[
        { u: "Priya M.", t: "Why does (int)3.99 give 3 and not 4?", r: 12 },
        { u: "Liam K.", t: "Tip: use Integer.MIN_VALUE for edge testing.", r: 4 },
        { u: "Sofia R.", t: "Got 100% — used String.format for clean output.", r: 7 },
      ].map((d, i) => (
        <div key={i} className="rounded-md border p-2 bg-editor-bg">
          <div className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px]">{d.u[0]}</span><span className="font-medium">{d.u}</span></div>
          <div className="mt-1 text-muted-foreground">{d.t}</div>
          <div className="mt-1 text-[10px] text-muted-foreground">{d.r} replies</div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-md border bg-editor-bg/60">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium">
        <span>{title}</span>{open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && <div className="px-3 pb-3 text-xs">{children}</div>}
    </div>
  );
}

function GitTree({ nodes, active, dirty, onFileClick }: { nodes: TreeNode[], active: string, dirty: Record<string, boolean>, onFileClick: (path: string) => void }) {
  return (
    <>
      {nodes.map(node => {
        if (node.type === "tree") {
          return (
            <TreeFolder key={node.path} label={node.name} open={false}>
              <GitTree nodes={node.children || []} active={active} dirty={dirty} onFileClick={onFileClick} />
            </TreeFolder>
          );
        }
        return (
          <TreeFile 
            key={node.path} 
            name={node.name} 
            active={active === node.path} 
            modified={dirty[node.path]} 
            onClick={() => onFileClick(node.path)} 
          />
        );
      })}
    </>
  );
}

function TreeFolder({ label, open: defaultOpen = false, children }: { label: string; open?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent/60">
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {open ? <FolderOpen className="h-3 w-3 text-info" /> : <Folder className="h-3 w-3 text-info" />}
        <span>{label}</span>
      </button>
      {open && <div className="pl-4">{children}</div>}
    </div>
  );
}
function TreeFile({ name, active, modified, onClick }: { name: string; active?: boolean; modified?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-1.5 rounded px-1.5 py-0.5 text-left ${active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60"}`}>
      <FileCode2 className="h-3 w-3" /><span className="flex-1 truncate">{name}</span>
      {modified && <span className="h-1.5 w-1.5 rounded-full bg-warning" />}
    </button>
  );
}

