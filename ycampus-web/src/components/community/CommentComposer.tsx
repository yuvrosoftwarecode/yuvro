import React, { useRef, useEffect, useState, useMemo, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2, Send, Smile, X } from 'lucide-react';

interface CommentComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  replyingToName?: string;
  onCancelReply?: () => void;
}

export function CommentComposer({
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
  replyingToName,
  onCancelReply,
}: CommentComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Focus textarea on mount and when switching to reply mode
  useEffect(() => {
    if (replyingToName) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [replyingToName]);

  const emojis = useMemo(
    () => ['😀', '😄', '😂', '😍', '👍', '🙏', '🎉', '🔥', '💯', '✅', '❓', '🤝'],
    []
  );

  const appendEmoji = (emoji: string) => {
    onChange(value + emoji);
    setEmojiOpen(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isSubmitting) {
        onSubmit();
      }
    }
  };

  const handleSubmitClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (value.trim() && !isSubmitting) {
      onSubmit();
    }
  };

  return (
    <div className="border-t p-4 bg-background">
      {replyingToName && (
        <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
          <span>Replying to <span className="font-medium text-foreground">{replyingToName}</span></span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelReply}
            type="button"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment..."
          className="min-h-[44px] max-h-[120px] resize-none flex-1"
          rows={1}
          autoFocus
        />

        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Add emoji"
              className="shrink-0"
            >
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            side="top"
            className="w-64 p-2"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="grid grid-cols-6 gap-1">
              {emojis.map((emoji) => (
                <Button
                  key={emoji}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => appendEmoji(emoji)}
                >
                  <span className="text-base leading-none">{emoji}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          size="icon"
          onClick={handleSubmitClick}
          disabled={!value.trim() || isSubmitting}
          type="button"
          className="shrink-0"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
