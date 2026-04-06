import { useEffect, useState, useRef } from "react";
import { fetchVideosBySubtopic } from "@/services/courseService";
import { CodeEditor } from "@/components/code-editor";
import AIChatContainer from "./Learn/AIChatWidget/AIChatContainer";
import ExampleCodeGallery from "@/components/code-editor/ExampleCodeGallery";
import { Sparkles, Code, Video as VideoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";

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

  const [videoChatSplitRatio, setVideoChatSplitRatio] = useState(50);

  const [dragMode, setDragMode] = useState<'horizontal' | 'vertical' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{ mode: 'horizontal' | 'vertical' | null; startVal: number }>({ mode: null, startVal: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const isCodeOnLeft = layout === 'code-chat';
    const isCodeOnRight = layout === 'video-code' || layout === 'video-chat-code';

    let minWidth = 15;
    let maxWidth = 85;

    if (isCodeOnLeft) minWidth = 38;
    if (isCodeOnRight) maxWidth = 62;

    if (leftPanelWidth < minWidth) {
      setLeftPanelWidth(minWidth);
    } else if (leftPanelWidth > maxWidth) {
      setLeftPanelWidth(maxWidth);
    }
  }, [layout]);

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

  const startHorizontalDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragInfo.current = { mode: 'horizontal', startVal: leftPanelWidth };
    setDragMode('horizontal');
  };

  const startVerticalDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragInfo.current = { mode: 'vertical', startVal: videoChatSplitRatio };
    setDragMode('vertical');
  };

  useEffect(() => {
    const handleMouseUp = () => {
      const { mode, startVal } = dragInfo.current;
      if (!mode) return;

      // Commit final values to React state
      if (mode === 'horizontal') setLeftPanelWidth(startVal);
      if (mode === 'vertical') setVideoChatSplitRatio(startVal);

      dragInfo.current = { mode: null, startVal: 0 };
      setDragMode(null);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const { mode } = dragInfo.current;
      if (!mode || !containerRef.current) return;

      if (e.buttons !== 1) {
        handleMouseUp();
        return;
      }

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;

        if (mode === 'horizontal') {
          const newWidth = (e.clientX / window.innerWidth) * 100;
          const isCodeOnLeft = layout === 'code-chat';
          const isCodeOnRight = layout === 'video-code' || layout === 'video-chat-code';
          let minW = 15, maxW = 85;
          if (isCodeOnLeft) minW = 38;
          if (isCodeOnRight) maxW = 62;

          const clampedWidth = Math.max(minW, Math.min(maxW, newWidth));
          containerRef.current!.style.setProperty('--left-width', `${clampedWidth}%`);
          dragInfo.current.startVal = clampedWidth;
        } else if (mode === 'vertical' && leftPaneRef.current) {
          const rect = leftPaneRef.current.getBoundingClientRect();
          const newHeightPct = ((e.clientY - rect.top) / rect.height) * 100;
          const clampedHeight = Math.max(20, Math.min(80, newHeightPct));
          containerRef.current!.style.setProperty('--video-height', `${clampedHeight}%`);
          dragInfo.current.startVal = clampedHeight;
        }
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [layout]);

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
          className="w-full h-full rounded-2xl"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      );
    }

    if (url.endsWith(".mp4")) {
      return <video src={url} controls className="w-full h-full rounded-2xl" />;
    }

    return (
      <iframe
        src={url}
        className="w-full h-full rounded-2xl"
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

  const renderVideo = () => (
    <div className="w-full h-full bg-gray-50 overflow-hidden p-6 flex items-center justify-center">
      <div
        className="w-full relative flex items-center justify-center rounded-2xl shadow-sm border border-gray-200 overflow-hidden bg-white/50"
        style={{
          aspectRatio: "16 / 9",
          maxHeight: "100%",
          height: "auto",
          maxWidth: "100%"
        }}
      >
        {loading ? (
          <LoadingSpinner size="lg" />
        ) : !selectedVideo ? (
          <div className="text-gray-500 font-medium text-sm">No video selected</div>
        ) : (
          <div className="w-full h-full relative">
            {renderVideoPlayer(selectedVideo.video_link)}
          </div>
        )}
      </div>
    </div>
  );


  const renderChat = (isEmbedded = false) => (
    <div className={cn("h-full w-full", !isEmbedded && "p-1")}>
      <AIChatContainer
        className={cn("w-full h-full", isEmbedded ? "shadow-none border-none rounded-none" : "rounded-xl border border-gray-200 shadow-sm")}
        style={{ border: isEmbedded ? "none" : undefined, boxShadow: isEmbedded ? "none" : undefined }}
        welcomeMessage={`Hi! I can help you with understanding "${selectedVideo?.title || subtopicName}".`}
        persistenceKey={sessionId}
        chatTitle="AI Learning Buddy"
        contextGetter={getVideoContext}
        onNewChat={onNewSession}
        showHistory={false}
      />
    </div>
  );

  const renderCodeEditor = (isEmbedded = false) => (
    <div className={cn("h-full w-full", !isEmbedded && "p-1")}>
      <CodeEditor
        problemTitle="Practice Coding"
        problemId={`video-coding-${subtopicId}`}
        initialCode="# Write your solution here\n"
        testCases={[]}
        showTestCases={true}
        allowCustomTestCases={true}
        showFullscreenButton={true}
        showExamplesButton={true}
        className={cn("h-full", isEmbedded ? "border-none shadow-none rounded-none" : "rounded-xl border border-gray-200 shadow-sm")}
      />
    </div>
  );


  // --- Layout Helpers ---

  const isSplit = layout !== "video";
  const isVideoInLayout = layout.includes('video');
  const isChatOnLeft = layout === 'video-chat-code';
  const isCodeOnLeft = layout === 'code-chat';
  const isRightPaneActive = isSplit;

  // Calculate widths and heights for transitions
  const currentLeftWidth = isSplit ? leftPanelWidth : 100;
  const currentRightWidth = isSplit ? (100 - leftPanelWidth) : 0;
  const currentVideoHeight = layout === 'video-chat-code' ? videoChatSplitRatio : 100;
  const currentChatHeight = layout === 'video-chat-code' ? (100 - videoChatSplitRatio) : 0;

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full relative select-none bg-gray-50"
      style={{
        '--left-width': `${currentLeftWidth}%`,
        '--video-height': `${currentVideoHeight}%`
      } as React.CSSProperties}
    >
      {/* MAIN CONTENT AREA WRAPPER */}
      <div className="flex-1 flex overflow-hidden relative">
        {dragMode && (
          <div
            className="absolute inset-0 z-[100] select-none"
            style={{ cursor: dragMode === 'horizontal' ? 'col-resize' : 'row-resize' }}
          />
        )}
        <div className="box-border relative flex-1 flex overflow-hidden">

          {/* LEFT PANE SLIDER */}
          <div
            ref={leftPaneRef}
            className={cn(
              "h-full flex flex-col relative overflow-hidden shrink-0 will-change-[width]",
              !dragMode && "transition-all duration-500 ease-in-out"
            )}
            style={{ width: `var(--left-width)` }}
          >
            <div className="flex flex-col h-full w-full relative">
              {/* TOP SLOT: Video or Code */}
              <div
                className={cn(
                  "w-full transition-all duration-500 ease-in-out relative overflow-hidden flex flex-col items-center",
                  !isVideoInLayout && !isCodeOnLeft && "opacity-0 pointer-events-none"
                )}
                style={{ height: `var(--video-height)` }}
              >
                <div className={cn("w-full h-full relative", !isSplit && "max-w-6xl mx-auto py-4")}>
                  {/* Slot L1: Video or Code (Top Left) */}
                  <div
                    className={cn(
                      "absolute inset-0 transition-opacity duration-500",
                      (isCodeOnLeft) ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                  >
                    {renderCodeEditor(true)}
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 transition-opacity duration-500",
                      (!isCodeOnLeft && isVideoInLayout) ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                  >
                    {renderVideo()}
                  </div>
                </div>
              </div>

              {/* VERTICAL RESIZER (only for video-chat-code) */}
              <div
                onMouseDown={startVerticalDrag}
                className={cn(
                  "absolute left-0 right-0 h-4 -mt-2 cursor-row-resize z-20 flex items-center justify-center group",
                  !dragMode && "transition-all duration-500",
                  layout === 'video-chat-code' ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                style={{ top: `var(--video-height)` }}
              >
                <div className="h-1.5 w-10 bg-indigo-500 rounded-full transition-all duration-200 shadow-sm opacity-0 group-hover:opacity-100" />
              </div>

              {/* BOTTOM SLOT: AI Chat (for 3-pane mode) */}
              <div
                className={cn(
                  "w-full transition-all duration-500 ease-in-out overflow-hidden",
                  !isChatOnLeft && "opacity-0 pointer-events-none"
                )}
                style={{ height: `calc(100% - var(--video-height))` }}
              >
                {renderChat(true)}
              </div>
            </div>
          </div>

          {/* HORIZONTAL RESIZER HANDLE */}
          <div
            onMouseDown={startHorizontalDrag}
            className={cn(
              "w-4 -ml-2 h-full cursor-col-resize z-20 flex items-center justify-center absolute group",
              !dragMode && "transition-all duration-500",
              isSplit ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            style={{ left: `var(--left-width)` }}
          >
            <div className="w-1.5 h-10 bg-indigo-500 rounded-full transition-all duration-200 shadow-sm opacity-0 group-hover:opacity-100" />
          </div>

          {/* RIGHT PANE SLIDER */}
          <div
            className={cn(
              "h-full flex flex-col border-l border-slate-200 bg-white relative overflow-hidden shrink-0 will-change-[width]",
              !dragMode && "transition-all duration-500 ease-in-out",
              !isRightPaneActive && "opacity-0 pointer-events-none"
            )}
            style={{ width: `calc(100% - var(--left-width))` }}
          >
            <div className="h-full w-full relative">
              {/* Slot R: Code or Chat */}
              <div className="absolute inset-0">
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-500",
                    (layout === 'video-code' || layout === 'video-chat-code') ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                >
                  {renderCodeEditor(true)}
                </div>
                <div
                  className={cn(
                    "absolute inset-0 transition-all duration-500",
                    (layout === 'video-chat' || layout === 'code-chat') ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                >
                  {renderChat(true)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showExamples && (
        <ExampleCodeGallery
          currentLanguage="python"
          onClose={() => setShowExamples(false)}
          onApplyCode={(_exampleCode) => {
            setShowExamples(false);
          }}
        />
      )}
    </div>
  );
};
export default StudentVideos;