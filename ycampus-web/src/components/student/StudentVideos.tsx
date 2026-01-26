import { useEffect, useState, useRef } from "react";
import { fetchVideosBySubtopic } from "@/services/courseService";
// Removed unused imports
import { CodeEditor } from "@/components/code-editor";
import AIChatContainer from "./Learn/AIChatWidget/AIChatContainer";
import ExampleCodeGallery from "@/components/code-editor/ExampleCodeGallery";
import { Sparkles, Code, Video as VideoIcon } from "lucide-react";

type Video = {
  id: string;
  title: string;
  video_link: string;
  ai_context?: string | null;
  sub_topic: string;
  description?: string;
};

export type LayoutMode = "video" | "video-chat" | "video-code" | "code-chat" | "video-chat-code";

type StudentVideosProps = {
  subtopicId: string;
  courseName: string;
  topicName: string;
  subtopicName: string;
  subtopicContent?: string | null;
  sessionId: string;
  onNewSession: () => void;
  layout: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
};

const StudentVideos = ({
  subtopicId,
  courseName,
  topicName,
  subtopicName,
  subtopicContent,
  sessionId,
  onNewSession,
  layout,
  onLayoutChange
}: StudentVideosProps) => {
  const [showExamples, setShowExamples] = useState(false);

  const leftPaneRef = useRef<HTMLDivElement>(null);

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const [leftPanelWidth, setLeftPanelWidth] = useState(45); // % width of left panel (video gets 45%, code editor gets 55%)

  // Vertical split state for 'video-chat-code' in Left Pane (Video height %)
  const [videoChatSplitRatio, setVideoChatSplitRatio] = useState(50);

  const [dragMode, setDragMode] = useState<'horizontal' | 'vertical' | null>(null);

  useEffect(() => {
    loadVideos();
  }, [subtopicId]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const res = (await fetchVideosBySubtopic(subtopicId)) as Video[];
      setVideos(res);

      if (res.length > 0) setSelectedVideo(res[0]);
      else setSelectedVideo(null);
    } catch (err) {
      console.error("Failed to load videos", err);
    } finally {
      setLoading(false);
    }
  };

  const startHorizontalDrag = () => setDragMode('horizontal');
  const startVerticalDrag = () => setDragMode('vertical');
  const stopDrag = () => setDragMode(null);

  const onDrag = (e: MouseEvent) => {
    if (!dragMode) return;

    if (dragMode === 'horizontal') {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth >= 15 && newWidth <= 75) {
        setLeftPanelWidth(newWidth);
      }
    } else if (dragMode === 'vertical' && leftPaneRef.current) {
      const rect = leftPaneRef.current.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const newHeightPct = (relativeY / rect.height) * 100;

      if (newHeightPct >= 20 && newHeightPct <= 80) {
        setVideoChatSplitRatio(newHeightPct);
      }
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stopDrag);

    return () => {
      window.removeEventListener("mousemove", onDrag);
      window.removeEventListener("mouseup", stopDrag);
    };
  }, [dragMode]);

  const renderVideoPlayer = (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      let videoId = "";

      if (url.includes("youtu.be")) {
        videoId = url.split("youtu.be/")[1];
      } else if (url.includes("v=")) {
        videoId = url.split("v=")[1].split("&")[0];
      }

      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full h-full rounded-lg"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      );
    }

    if (url.endsWith(".mp4")) {
      return <video src={url} controls className="w-full h-full rounded-lg" />;
    }

    return (
      <iframe
        src={url}
        className="w-full h-full rounded-lg"
        allowFullScreen
      />
    );
  };

  const getVideoContext = () => {
    let ctx = `Course: ${courseName}.\n`;
    ctx += `Topic: ${topicName}.\n`;
    ctx += `Subtopic: ${subtopicName}.\n`;
    if (subtopicContent) ctx += `Content: ${subtopicContent}\n`;
    if (selectedVideo) {
      ctx += `Current Video: ${selectedVideo.title}.\n`;
      if (selectedVideo.ai_context) ctx += `Video Context: ${selectedVideo.ai_context}\n`;
    }
    return ctx;
  };

  // --- Components for Panes ---

  const PaneWrapper = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`w-full h-full bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 ${className}`}>
      {children}
    </div>
  );

  const LayoutSelector = () => (
    <div className="flex flex-col gap-3">
      {(['video', 'video-chat', 'video-code', 'code-chat', 'video-chat-code'] as LayoutMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => onLayoutChange(mode)}
          title={mode.replace(/-/g, ' + ')}
          className={`p-2 rounded-xl transition-all flex items-center justify-center group relative ${layout === mode
            ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-100 ring-offset-1"
            : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200"
            }`}
        >
          {mode === 'video' && <VideoIcon className="w-5 h-5" />}
          {mode === 'video-chat' && (
            <div className="flex gap-0.5"><VideoIcon className="w-3.5 h-3.5" /><Sparkles className="w-3.5 h-3.5" /></div>
          )}
          {mode === 'video-code' && (
            <div className="flex gap-0.5"><VideoIcon className="w-3.5 h-3.5" /><Code className="w-3.5 h-3.5" /></div>
          )}
          {mode === 'code-chat' && (
            <div className="flex gap-0.5"><Code className="w-3.5 h-3.5" /><Sparkles className="w-3.5 h-3.5" /></div>
          )}
          {mode === 'video-chat-code' && (
            <div className="flex flex-col gap-0.5 items-center">
              <div className="flex gap-0.5">
                <VideoIcon className="w-2.5 h-2.5" />
                <Sparkles className="w-2.5 h-2.5" />
              </div>
              <Code className="w-2.5 h-2.5" />
            </div>
          )}

          {/* Tooltip on Left */}
          <span className="absolute right-full mr-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-50 shadow-xl">
            {mode.replace(/-/g, ' + ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        </button>
      ))}
    </div>
  );

  const VideoComponent = () => (
    <PaneWrapper>
      <div className="w-full h-full flex flex-col bg-black relative">
        {!selectedVideo ? (
          <div className="text-gray-500 flex items-center justify-center h-full">No video selected</div>
        ) : (
          <div className="absolute inset-0">
            {renderVideoPlayer(selectedVideo.video_link)}
          </div>
        )}
      </div>
    </PaneWrapper>
  );

  const ChatComponent = () => (
    <PaneWrapper>
      <div className="w-full h-full flex flex-col">
        <AIChatContainer
          className="w-full h-full shadow-none border-none rounded-none"
          welcomeMessage={`Hi! I can help you with understanding "${selectedVideo?.title || subtopicName}".`}
          persistenceKey={sessionId}
          chatTitle="AI Learning Buddy"
          contextGetter={getVideoContext}
          onNewChat={onNewSession}
          showHistory={false}
        />
      </div>
    </PaneWrapper>
  );

  const CodeEditorComponent = () => (
    <PaneWrapper>
      <CodeEditor
        problemTitle="Practice Coding"
        problemId={`video-coding-${subtopicId}`}
        initialCode="# Write your solution here\n"
        testCases={[]}
        showTestCases={true}
        allowCustomTestCases={true}
        showFullscreenButton={true}
        showExamplesButton={true}
        className="h-full"
      />
    </PaneWrapper>
  );


  // --- Layout Helpers ---

  const isSplit = layout !== "video";

  const gapSize = 16; // 1rem
  const halfGap = gapSize / 2;

  const styles = {
    left: {
      width: isSplit ? `calc(${leftPanelWidth}% - ${halfGap}px)` : "100%"
    },
    right: {
      width: isSplit ? `calc(${100 - leftPanelWidth}% - ${halfGap}px)` : "0%",
      display: isSplit ? 'flex' : 'none'
    }
  };

  return (
    <div className="flex flex-col h-full relative select-none bg-gray-50/50">

      {/* HEADER REMOVED - Controlled by Parent */}

      {/* MAIN CONTENT AREA WRAPPER */}
      <div className="flex-1 flex overflow-hidden">

        {/* PANES AREA */}
        <div className="flex-1 flex overflow-hidden p-4 gap-4 box-border relative">

          {/* LEFT PANE */}
          <div
            ref={leftPaneRef}
            className={`h-full flex flex-col ${dragMode ? "pointer-events-none select-none" : ""}`}
            style={styles.left}
          >
            {/* Standard Modes */}
            {(layout === 'video' || layout === 'video-chat' || layout === 'video-code') && <VideoComponent />}
            {(layout === 'code-chat') && <CodeEditorComponent />}

            {/* 3-Pane Vertical Split Mode (Left Side: Video Top, Chat Bottom) */}
            {(layout === 'video-chat-code') && (
              <div className="flex flex-col h-full w-full relative gap-4">
                {/* TOP: VIDEO */}
                <div style={{ height: `calc(${videoChatSplitRatio}% - 8px)` }} className="w-full">
                  <VideoComponent />
                </div>

                {/* VERTICAL RESIZER - Invisible Absolute */}
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startVerticalDrag();
                  }}
                  className="absolute left-0 right-0 h-4 -mt-2 cursor-row-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  style={{ top: `${videoChatSplitRatio}%` }}
                >
                  <div className="h-1 w-8 bg-gray-300 rounded-full shadow-sm" />
                </div>

                {/* BOTTOM: CHAT */}
                <div style={{ height: `calc(${100 - videoChatSplitRatio}% - 8px)` }} className="w-full">
                  <ChatComponent />
                </div>
              </div>
            )}
          </div>

          {/* RESIZER HANDLE (Horizontal) - Invisible functional area */}
          {isSplit && (
            <div
              onMouseDown={startHorizontalDrag}
              className={`w-4 -ml-2 h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity absolute`}
              style={{ left: `${leftPanelWidth}%` }} // Position absolutely to avoid layout shifts in flex gap
            >
              <div className="w-1 h-8 bg-gray-300 rounded-full shadow-sm" />
            </div>
          )}

          {/* RIGHT PANE (Only active in split modes) */}
          {isSplit && (
            <div
              className={`h-full flex flex-col bg-transparent ${dragMode ? "pointer-events-none select-none" : ""}`}
              style={styles.right}
            >
              {/* Standard Split Modes */}
              {(layout === 'video-chat' || layout === 'code-chat') && <ChatComponent />}
              {(layout === 'video-code' || layout === 'video-chat-code') && <CodeEditorComponent />}

              {/* 3-Pane Vertical Split Mode - Using GAP separation instead of border */}
              {/* REMOVED OLD RIGHT PANE LOGIC FOR video-chat-code */}
            </div>
          )}

        </div>

        {/* Right Sidebar Control */}
        <div className="w-16 bg-white border-l border-gray-200 flex flex-col items-center py-6 gap-4 shrink-0 z-30 shadow-[ -4px_0_15px_-3px_rgba(0,0,0,0.05) ]">
          <LayoutSelector />
        </div>
      </div>

      {showExamples && (
        <ExampleCodeGallery
          currentLanguage="python"
          onClose={() => setShowExamples(false)}
          onApplyCode={(_exampleCode) => {
            // Code will be applied directly by CodeEditorWithAI
            setShowExamples(false);
          }}
        />
      )}
    </div>
  );
};
export default StudentVideos;



