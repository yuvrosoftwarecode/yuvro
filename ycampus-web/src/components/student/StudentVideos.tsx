import { memo, useEffect, useRef, useState } from 'react';
import { Code, Monitor, Video as VideoIcon } from 'lucide-react';
import { fetchVideosBySubUnit } from '@/services/subjectService';
import { CodeEditor } from '@/components/code-editor';
import AIChatContainer from './ai-buddy/AIChatContainer';

export type LayoutMode = 'video' | 'video-chat' | 'video-code' | 'code-chat' | 'video-chat-code';

type Video = {
  id: string;
  title: string;
  video_link: string;
  ai_context?: string | null;
  sub_unit: string;
  description?: string;
};

type StudentVideosProps = {
  subunitId: string;
  subjectName: string;
  unitName: string;
  subunitName: string;
  subunitContent?: string | null;
  sessionId: string;
  onNewSession: () => void;
  layout: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
};

const StudentVideos = ({
  subunitId,
  subjectName,
  unitName,
  subunitName,
  subunitContent,
  sessionId,
  onNewSession,
  layout,
}: StudentVideosProps) => {
  const [, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const [leftPanelWidth, setLeftPanelWidth] = useState(45);
  const [videoChatSplitRatio, setVideoChatSplitRatio] = useState(50);
  const [dragMode, setDragMode] = useState<'horizontal' | 'vertical' | null>(null);

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const videoFrameHostRef = useRef<HTMLDivElement>(null);
  const [videoFrameSize, setVideoFrameSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      try {
        const response = (await fetchVideosBySubUnit(subunitId)) as Video[];
        setVideos(response || []);
        if (response?.length > 0) {
          setSelectedVideo(response[0]);
        } else {
          setSelectedVideo(null);
        }
      } catch (error) {
        console.error('Failed to load videos', error);
        setVideos([]);
        setSelectedVideo(null);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [subunitId]);

  useEffect(() => {
    const onDrag = (event: MouseEvent) => {
      if (!dragMode) return;

      if (dragMode === 'horizontal') {
        const newWidth = (event.clientX / window.innerWidth) * 100;
        if (newWidth >= 15 && newWidth <= 75) {
          setLeftPanelWidth(newWidth);
        }
      } else if (dragMode === 'vertical' && leftPaneRef.current) {
        const rect = leftPaneRef.current.getBoundingClientRect();
        const relativeY = event.clientY - rect.top;
        const newHeightPct = (relativeY / rect.height) * 100;

        if (newHeightPct >= 20 && newHeightPct <= 80) {
          setVideoChatSplitRatio(newHeightPct);
        }
      }
    };

    const stopDrag = () => setDragMode(null);

    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);

    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [dragMode]);

  useEffect(() => {
    const calculateFrame = () => {
      const host = videoFrameHostRef.current;
      if (!host) return;

      const maxWidth = host.clientWidth;
      const maxHeight = host.clientHeight;
      if (!maxWidth || !maxHeight) return;

      const ratio = 16 / 9;
      let width = maxWidth;
      let height = width / ratio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * ratio;
      }

      setVideoFrameSize({ width: Math.floor(width), height: Math.floor(height) });
    };

    calculateFrame();

    const observer = new ResizeObserver(calculateFrame);
    if (videoFrameHostRef.current) {
      observer.observe(videoFrameHostRef.current);
    }

    window.addEventListener('resize', calculateFrame);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', calculateFrame);
    };
  }, [layout, leftPanelWidth, videoChatSplitRatio, selectedVideo?.id]);

  const renderVideoPlayer = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';

      if (url.includes('youtu.be')) {
        videoId = url.split('youtu.be/')[1];
      } else if (url.includes('v=')) {
        videoId = url.split('v=')[1].split('&')[0];
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

    if (url.endsWith('.mp4')) {
      return <video src={url} controls className="w-full h-full rounded-lg object-contain bg-black" />;
    }

    return <iframe src={url} className="w-full h-full rounded-lg" allowFullScreen />;
  };

  const getVideoContext = () => {
    let context = `Subject: ${subjectName}.\n`;
    context += `Unit: ${unitName}.\n`;
    context += `SubUnit: ${subunitName}.\n`;
    if (subunitContent) context += `Content: ${subunitContent}\n`;
    if (selectedVideo) {
      context += `Current Video: ${selectedVideo.title}.\n`;
      if (selectedVideo.ai_context) context += `Video Context: ${selectedVideo.ai_context}\n`;
    }
    return context;
  };

  const videoPane = (
    <div className="w-full h-full bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
      <div className="w-full h-full flex flex-col bg-black p-2">
        {loading ? (
          <div className="text-gray-300 flex items-center justify-center h-full">Loading videos...</div>
        ) : !selectedVideo ? (
          <div className="text-gray-500 flex items-center justify-center h-full">No video selected</div>
        ) : (
          <div
            ref={videoFrameHostRef}
            className={`h-full grid place-items-center ${layout === 'video' ? 'w-[70%] mx-auto' : 'w-full'}`}
          >
            <div
              style={{
                width: videoFrameSize.width ? `${videoFrameSize.width}px` : '100%',
                height: videoFrameSize.height ? `${videoFrameSize.height}px` : '100%',
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            >
              {renderVideoPlayer(selectedVideo.video_link)}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const chatPane = (
    <div className="w-full h-full bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
      <AIChatContainer
        className="w-full h-full shadow-none border-none rounded-none"
        welcomeMessage={`Hi! I can help you with understanding "${selectedVideo?.title || subunitName}".`}
        persistenceKey={sessionId}
        chatTitle="AI Learning Buddy"
        contextGetter={getVideoContext}
        onNewChat={onNewSession}
        showHistory={false}
      />
    </div>
  );

  const codeEditorPane = (
    <div className="w-full h-full bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
      <CodeEditor
        problemTitle="Practice Coding"
        problemId={`video-coding-${subunitId}`}
        initialCode="# Write your solution here\n"
        testCases={[]}
        showTestCases={true}
        allowCustomTestCases={true}
        showFullscreenButton={true}
        showExamplesButton={true}
        className="h-full"
      />
    </div>
  );

  const isSplit = layout !== 'video';
  const gapSize = 12;
  const halfGap = gapSize / 2;

  const styles = {
    left: {
      width: isSplit ? `calc(${leftPanelWidth}% - ${halfGap}px)` : '100%',
    },
    right: {
      width: isSplit ? `calc(${100 - leftPanelWidth}% - ${halfGap}px)` : '0%',
      display: isSplit ? 'flex' : 'none',
    },
  };

  if (layout === 'video') {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm border-border">
          <div className="border-b border-border p-4">
            <h3 className="font-semibold tracking-tight flex items-center text-lg">
              <VideoIcon className="h-5 w-5" />
              <span className="ml-2">Video Content</span>
            </h3>
          </div>

          <div className="p-6">
            <div className="w-[70%] mx-auto relative">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border border-border overflow-hidden relative shadow-sm">
                {loading ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Loading video...</p>
                  </div>
                ) : !selectedVideo ? (
                  <div className="text-center text-muted-foreground">
                    <VideoIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No video available</p>
                    <p className="text-xs mt-1">Select a topic with video content</p>
                  </div>
                ) : (
                  <div ref={videoFrameHostRef} className="w-full h-full grid place-items-center">
                    <div
                      style={{
                        width: videoFrameSize.width ? `${videoFrameSize.width}px` : '100%',
                        height: videoFrameSize.height ? `${videoFrameSize.height}px` : '100%',
                        maxWidth: '100%',
                        maxHeight: '100%',
                      }}
                    >
                      {renderVideoPlayer(selectedVideo.video_link)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-6 flex flex-col min-h-0">
      <h3 className="font-semibold tracking-tight flex items-center mb-4 text-lg">
        <Monitor className="h-5 w-5" />
        <span className="ml-2">Video Content</span>
      </h3>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm border-border flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col h-full relative select-none bg-white">
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex overflow-hidden p-3 gap-3 box-border relative">
              <div
                ref={leftPaneRef}
                className={`h-full flex flex-col ${dragMode ? 'pointer-events-none select-none' : ''}`}
                style={styles.left}
              >
                {(layout === 'video-chat' || layout === 'video-code') && videoPane}
                {layout === 'code-chat' && codeEditorPane}

                {layout === 'video-chat-code' && (
                  <div className="flex flex-col h-full w-full relative gap-3">
                    <div style={{ height: `calc(${videoChatSplitRatio}% - 6px)` }} className="w-full">
                      {videoPane}
                    </div>

                    <div
                      onMouseDown={(event) => {
                        event.stopPropagation();
                        setDragMode('vertical');
                      }}
                      className="absolute left-0 right-0 h-4 -mt-2 cursor-row-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      style={{ top: `${videoChatSplitRatio}%` }}
                    >
                      <div className="h-1 w-8 bg-gray-300 rounded-full shadow-sm" />
                    </div>

                    <div style={{ height: `calc(${100 - videoChatSplitRatio}% - 6px)` }} className="w-full">
                      {chatPane}
                    </div>
                  </div>
                )}
              </div>

              {isSplit && (
                <div
                  onMouseDown={() => setDragMode('horizontal')}
                  className="w-4 -ml-2 h-full cursor-col-resize z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity absolute"
                  style={{ left: `${leftPanelWidth}%` }}
                >
                  <div className="w-1 h-8 bg-gray-300 rounded-full shadow-sm" />
                </div>
              )}

              {isSplit && (
                <div
                  className={`h-full flex flex-col bg-transparent ${dragMode ? 'pointer-events-none select-none' : ''}`}
                  style={styles.right}
                >
                  {(layout === 'video-chat' || layout === 'code-chat') && chatPane}
                  {(layout === 'video-code' || layout === 'video-chat-code') && codeEditorPane}
                </div>
              )}
            </div>
          </div>

          {/* {videos.length > 1 && (
            <div className="border-t border-gray-100 p-2 flex gap-2 overflow-x-auto">
              {videos.map((video) => {
                const selected = selectedVideo?.id === video.id;
                return (
                  <button
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className={`px-3 py-1.5 text-xs rounded-full border flex items-center gap-1.5 whitespace-nowrap ${
                      selected ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <VideoIcon className="w-3.5 h-3.5" />
                    {video.title}
                  </button>
                );
              })}
            </div>
          )} */}
        </div>
      </div>

      {/* {(layout === 'video-code' || layout === 'code-chat' || layout === 'video-chat-code') && (
        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
          <Code className="w-3.5 h-3.5" />
          Code editor is available in this layout.
        </div>
      )} */}
    </div>
  );
};

export default memo(StudentVideos);
