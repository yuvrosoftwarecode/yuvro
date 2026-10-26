import React from "react";
import { Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import useAIChat from "./useAIChat";
import { WalletBalanceBadge } from "@/components/credits/WalletBalanceBadge";

const AIChatContainer: React.FC<{
  className?: string;
  contextGetter?: () => string;
  welcomeMessage?: string;
  persistenceKey?: string;
  chatTitle?: string;
  onNewChat?: () => void;
  showHistory?: boolean;
  onClose?: () => void;
  onInsertCode?: (code: string) => void;
  activeFile?: string;
}> = ({
  className,
  contextGetter,
  welcomeMessage,
  persistenceKey,
  chatTitle,
  onClose,
  onInsertCode,
  activeFile,
}) => {
  const { user } = useAuth();
  const panelTitle = (chatTitle ? chatTitle.split("-")[0].trim() : "AI Mentor") || "AI Mentor";

  const { messages, sendMessage, isLoading, suggestedPrompts, activeStream } = useAIChat({
    getContext: contextGetter,
    persistenceKey,
    chatTitle: chatTitle || `AI Mentor - ${user?.first_name || "Student"}`,
  });

  return (
    <div className={`flex flex-col min-h-0 ${className || "w-[360px] h-[500px]"}`}>
      <div
        className={`flex flex-col flex-1 min-h-0 bg-white overflow-hidden ${!className ? "rounded-2xl border border-gray-200 shadow-xl" : ""}`}
        style={
          !className
            ? { border: "1px solid #e5e7eb", boxShadow: "0 4px 24px 0 rgba(0,0,0,0.08)" }
            : {}
        }
      >
        <div
          className="flex items-center justify-between px-4 py-3 bg-white shrink-0"
          style={{ borderBottom: "1px solid #f3f4f6" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-none">{panelTitle}</p>
              <p className="text-[11px] text-emerald-500 font-medium mt-0.5">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WalletBalanceBadge />
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close AI Mentor"
                title="Close"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <ChatMessages
          messages={messages}
          isLoading={isLoading}
          welcomeMessage={welcomeMessage}
          onInsertCode={onInsertCode}
          activeStream={activeStream}
          activeFile={activeFile}
        />

        <div
          className="px-3 pb-3 pt-2 bg-white shrink-0"
          style={{ borderTop: "1px solid #f3f4f6" }}
        >
          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            suggestedPrompts={suggestedPrompts}
          />
          <p className="text-[10px] text-gray-300 text-center mt-2 tracking-wide">
            Powered by Yuvro AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChatContainer;
