import React, { useState, useRef } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCommunity, PostTag, PostAudience, CommunityPost } from '@/hooks/useCommunity';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Loader2, X, ImagePlus, Bold, Italic, Underline, Strikethrough, Link as LinkIcon, ListOrdered, List, Quote, Code, Terminal } from 'lucide-react';

interface CreatePostDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
  post?: CommunityPost;
}

const availableTags: { value: PostTag; label: string; color: string }[] = [
  { value: 'exam', label: 'Exam', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { value: 'event', label: 'Event', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { value: 'doubt', label: 'Doubt', color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  { value: 'placement', label: 'Placement', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
];

const audienceOptions: { value: PostAudience; label: string }[] = [
  { value: 'college', label: 'Entire College' },
  { value: 'department', label: 'My Department' },
  { value: 'batch', label: 'My Batch' },
];

export function CreatePostDrawer({
  open,
  onOpenChange,
  onPostCreated,
  post,
}: CreatePostDrawerProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { createPost, updatePost, isCreatingPost } = useCommunity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [content, setContent] = useState(post?.content || '');
  const [selectedTags, setSelectedTags] = useState<PostTag[]>(post?.tags || []);
  const [audience, setAudience] = useState<PostAudience>(post?.audience || 'college');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>(post?.images || []);

  const [editorState, setEditorState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    listUnordered: false,
    listOrdered: false,
  });

  const updateToolbarStates = React.useCallback(() => {
    setEditorState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough'),
      listUnordered: document.queryCommandState('insertUnorderedList'),
      listOrdered: document.queryCommandState('insertOrderedList'),
    });
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const markdown = htmlToMarkdown(html);
      setContent(markdown);
      updateToolbarStates();
    }
  };

  const handleFormat = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleLink = () => {
    const url = prompt('Enter link URL:');
    if (url) {
      handleFormat('createLink', url);
    }
  };

  const handleCode = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const text = range.toString();
    
    const code = document.createElement('code');
    code.textContent = text || 'code';
    
    range.deleteContents();
    range.insertNode(code);
    
    range.setStartAfter(code);
    range.setEndAfter(code);
    selection.removeAllRanges();
    selection.addRange(range);
    
    handleInput();
  };

  const handleCodeBlock = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const text = range.toString();
    
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = text || 'code block';
    pre.appendChild(code);
    
    range.deleteContents();
    range.insertNode(pre);
    
    range.setStartAfter(pre);
    range.setEndAfter(pre);
    selection.removeAllRanges();
    selection.addRange(range);
    
    handleInput();
  };

  const handleKeyDown = () => {
    setTimeout(updateToolbarStates, 0);
  };

  const setEditorRef = React.useCallback((node: HTMLDivElement | null) => {
    editorRef.current = node;
    if (node) {
      if (post) {
        node.innerHTML = markdownToHtml(post.content);
      } else {
        node.innerHTML = '';
      }
    }
  }, [post]);

  // Sync content state when editing post changes
  React.useEffect(() => {
    if (post) {
      setContent(post.content);
      setSelectedTags(post.tags);
      setAudience(post.audience);
      setPreviewUrls(post.images);
      if (editorRef.current) {
        editorRef.current.innerHTML = markdownToHtml(post.content);
      }
    } else {
      resetForm();
    }
  }, [post]);

  // Listen to selection changes to update toolbar active state
  React.useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const anchorNode = selection.anchorNode;
      if (anchorNode && editorRef.current && editorRef.current.contains(anchorNode)) {
        updateToolbarStates();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateToolbarStates]);

  const toggleTag = (tag: PostTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 4 images
    const remainingSlots = 4 - selectedImages.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      // toast is imported via useCommunity's sonner
    }

    // Create preview URLs
    const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file));
    
    setSelectedImages(prev => [...prev, ...filesToAdd]);
    setPreviewUrls(prev => [...prev, ...newPreviewUrls]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    // Revoke the preview URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setContent('');
    setSelectedTags([]);
    setAudience('college');
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setPreviewUrls([]);
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      if (post) {
        await updatePost({
          id: post.id,
          content: content.trim(),
          tag_names: selectedTags,
          visibility: audience === 'college' ? 'ENTIRE_COLLEGE' : audience === 'department' ? 'MY_DEPARTMENT' : 'MY_BATCH',
        });
      } else {
        await createPost({
          content: content.trim(),
          tags: selectedTags,
          visibility: audience === 'college' ? 'ENTIRE_COLLEGE' : audience === 'department' ? 'MY_DEPARTMENT' : 'MY_BATCH',
          images: selectedImages,
        });
      }

      resetForm();
      onPostCreated();
    } catch (error) {
      console.error('Failed to save post:', error);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const isSubmitting = isCreatingPost;

  const formContent = (
    <div className="space-y-4 px-4 sm:px-0">
      <div className="space-y-2">
        <Label htmlFor="content">What's on your mind?</Label>
        <div className="flex flex-col rounded-lg border border-input overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-primary bg-background">
          <style>{`
            .rich-editor:empty:before {
              content: attr(placeholder);
              color: hsl(var(--muted-foreground) / 0.7);
              cursor: text;
              pointer-events: none;
            }
            .rich-editor {
              white-space: pre-wrap;
              word-break: break-word;
            }
            .rich-editor blockquote {
              border-left: 4px solid hsl(var(--primary) / 0.5);
              padding-left: 1rem;
              font-style: italic;
              color: hsl(var(--muted-foreground));
              margin: 0.5rem 0;
              background-color: hsl(var(--muted) / 0.3);
              padding-top: 0.25rem;
              padding-bottom: 0.25rem;
              border-radius: 0 0.25rem 0.25rem 0;
            }
            .rich-editor code {
              background-color: hsl(var(--muted) / 0.8);
              color: hsl(var(--destructive));
              padding: 0.15rem 0.35rem;
              border-radius: 0.25rem;
              font-family: monospace;
              font-size: 0.85em;
              border: 1px solid hsl(var(--border) / 0.5);
              font-weight: 500;
            }
            .rich-editor pre {
              background-color: hsl(var(--muted) / 0.5);
              color: hsl(var(--foreground));
              padding: 0.75rem 1rem;
              border-radius: 0.5rem;
              border: 1px solid hsl(var(--border));
              font-family: monospace;
              font-size: 0.85em;
              margin: 0.5rem 0;
              position: relative;
            }
            .rich-editor pre::before {
              content: "code block";
              position: absolute;
              top: 2px;
              right: 8px;
              font-size: 0.65rem;
              color: hsl(var(--muted-foreground) / 0.6);
              text-transform: uppercase;
              font-weight: 700;
              letter-spacing: 0.05em;
            }
            .rich-editor ul {
              list-style-type: disc;
              padding-left: 1.5rem;
              margin: 0.5rem 0;
            }
            .rich-editor ol {
              list-style-type: decimal;
              padding-left: 1.5rem;
              margin: 0.5rem 0;
            }
            .rich-editor li {
              margin: 0.25rem 0;
            }
            .rich-editor u {
              text-decoration: underline;
            }
          `}</style>

          {/* Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 p-1 bg-muted/40 border-b border-input select-none">
            <Button
              type="button"
              variant={editorState.bold ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                "h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground",
                editorState.bold && "bg-primary text-primary-foreground font-bold hover:bg-primary/90 hover:text-primary-foreground"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFormat('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editorState.italic ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                "h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground",
                editorState.italic && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFormat('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editorState.underline ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                "h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground",
                editorState.underline && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFormat('underline')}
              title="Underline (Ctrl+U)"
            >
              <Underline className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editorState.strikethrough ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                "h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground",
                editorState.strikethrough && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFormat('strikeThrough')}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            
            <div className="w-[1px] h-4 bg-muted-foreground/20 mx-1" />
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleLink}
              title="Link"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            
            <div className="w-[1px] h-4 bg-muted-foreground/20 mx-1" />
            
            <Button
              type="button"
              variant={editorState.listOrdered ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                "h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground",
                editorState.listOrdered && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFormat('insertOrderedList')}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editorState.listUnordered ? 'secondary' : 'ghost'}
              size="icon"
              className={cn(
                "h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground",
                editorState.listUnordered && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFormat('insertUnorderedList')}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            
            <div className="w-[1px] h-4 bg-muted-foreground/20 mx-1" />
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleFormat('formatBlock', 'blockquote')}
              title="Blockquote"
            >
              <Quote className="h-4 w-4" />
            </Button>
            
            <div className="w-[1px] h-4 bg-muted-foreground/20 mx-1" />
            
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCode}
              title="Code"
            >
              <Code className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCodeBlock}
              title="Code Block"
            >
              <Terminal className="h-4 w-4" />
            </Button>
          </div>

          <div
            ref={setEditorRef}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onKeyUp={updateToolbarStates}
            onMouseUp={updateToolbarStates}
            placeholder="Share updates, ask questions, or start a discussion..."
            className="rich-editor min-h-[120px] max-h-[300px] overflow-y-auto p-3 outline-none focus:outline-none bg-background text-foreground"
            style={{ outline: 'none' }}
          />
        </div>
        <div className="text-xs text-muted-foreground text-right select-none">
          {content.length}/5000
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="space-y-2">
        <Label>Images (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {previewUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Preview ${index + 1}`}
                className="h-20 w-20 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {selectedImages.length < 4 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-20 w-20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/50 transition-colors"
            >
              <ImagePlus className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Add</span>
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />
        <p className="text-xs text-muted-foreground">
          Up to 4 images, max 5MB each (JPEG, PNG, GIF, WebP)
        </p>
      </div>


      <div className="space-y-2">
        <Label>Tags (optional)</Label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => (
            <Badge
              key={tag.value}
              variant="outline"
              className={cn(
                'cursor-pointer transition-colors',
                selectedTags.includes(tag.value)
                  ? tag.color
                  : 'hover:bg-muted'
              )}
              onClick={() => toggleTag(tag.value)}
            >
              {tag.label}
              {selectedTags.includes(tag.value) && (
                <X className="h-3 w-3 ml-1" />
              )}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Who can see this?</Label>
        <Select value={audience} onValueChange={(v) => setAudience(v as PostAudience)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {audienceOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const footerContent = (
    <div className="flex justify-end gap-2 px-4 sm:px-0">
      <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={!content.trim() || isSubmitting}
      >
        {isSubmitting ? (
          <>
            {post ? 'Saving...' : 'Posting...'}
          </>
        ) : (
          post ? 'Save Changes' : 'Post'
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Create Post</DrawerTitle>
            <DrawerDescription>
              Share with your campus community
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 pb-4">
            {formContent}
          </div>
          <DrawerFooter>{footerContent}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>
            Share with your campus community
          </DialogDescription>
        </DialogHeader>
        {formContent}
        <DialogFooter>{footerContent}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Rich Text HTML to Markdown converter
function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return nodeToMarkdown(doc.body).replace(/\n{3,}/g, '\n\n').trim();
}

function nodeToMarkdown(node: Node): string {
  let markdown = '';

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      markdown += child.textContent;
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const element = child as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      switch (tagName) {
        case 'b':
        case 'strong':
          markdown += `**${nodeToMarkdown(element)}**`;
          break;
        case 'i':
        case 'em':
          markdown += `*${nodeToMarkdown(element)}*`;
          break;
        case 'u':
          markdown += `<u>${nodeToMarkdown(element)}</u>`;
          break;
        case 's':
        case 'strike':
        case 'del':
          markdown += `~~${nodeToMarkdown(element)}~~`;
          break;
        case 'a':
          const href = element.getAttribute('href') || '';
          markdown += `[${nodeToMarkdown(element)}](${href})`;
          break;
        case 'code':
          if (element.parentElement && element.parentElement.tagName.toLowerCase() === 'pre') {
            markdown += nodeToMarkdown(element);
          } else {
            markdown += `\`${nodeToMarkdown(element)}\``;
          }
          break;
        case 'pre':
          markdown += `\n\`\`\`\n${nodeToMarkdown(element).trim()}\n\`\`\`\n`;
          break;
        case 'ul':
          const ulContent = Array.from(element.childNodes)
            .map(li => li.nodeType === Node.ELEMENT_NODE ? `- ${nodeToMarkdown(li).trim()}` : '')
            .filter(Boolean)
            .join('\n');
          markdown += `\n${ulContent}\n`;
          break;
        case 'ol':
          const olContent = Array.from(element.childNodes)
            .map((li, i) => li.nodeType === Node.ELEMENT_NODE ? `${i + 1}. ${nodeToMarkdown(li).trim()}` : '')
            .filter(Boolean)
            .join('\n');
          markdown += `\n${olContent}\n`;
          break;
        case 'li':
          markdown += `${nodeToMarkdown(element)}`;
          break;
        case 'blockquote':
          markdown += `\n> ${nodeToMarkdown(element).trim()}\n`;
          break;
        case 'p':
        case 'div':
          const content = nodeToMarkdown(element);
          if (content.trim()) {
            markdown += `\n${content}\n`;
          } else {
            markdown += '\n';
          }
          break;
        case 'br':
          markdown += '\n';
          break;
        default:
          markdown += nodeToMarkdown(element);
      }
    }
  });

  return markdown;
}

// Markdown to Rich Text HTML converter for editor load
function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Escape basic HTML characters to prevent rendering arbitrary markup in editing
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;u&gt;/g, '<u>')
    .replace(/&lt;\/u&gt;/g, '</u>');

  // Convert blockquotes
  html = html.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');

  // Convert Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');

  // Convert Italic
  html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
  html = html.replace(/_(.*?)_/g, '<i>$1</i>');

  // Convert Strikethrough
  html = html.replace(/~~(.*?)~~/g, '<s>$1</s>');

  // Convert Code Block
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Convert Inline Code
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');

  // Convert Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Convert bullet lists
  html = html.replace(/^\s*-\s*(.*)$/gm, '<li>$1</li>');
  
  // Convert numbered lists
  html = html.replace(/^\s*\d+\.\s*(.*)$/gm, '<li>$1</li>');

  // Convert newlines to breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}
