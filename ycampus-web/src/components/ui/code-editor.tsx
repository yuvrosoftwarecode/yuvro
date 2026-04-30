import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Play, Copy, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CodeEditorProps {
  initialCode?: string;
  language?: string;
  onCodeChange?: (code: string) => void;
  onRun?: (code: string, language: string) => void;
  onLineClick?: (lineNum: number) => void;
  onTextSelect?: (selectedText: string, startLine: number) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  showLanguageSelector?: boolean;
  showRunButton?: boolean;
  showCopyButton?: boolean;
  showResetButton?: boolean;
  showFullscreenToggle?: boolean;
  maxHeight?: string;
  highlightLine?: number;
  highlightText?: string;
}

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', extension: 'js' },
  { value: 'typescript', label: 'TypeScript', extension: 'ts' },
  { value: 'python', label: 'Python', extension: 'py' },
  { value: 'java', label: 'Java', extension: 'java' },
  { value: 'cpp', label: 'C++', extension: 'cpp' },
  { value: 'c', label: 'C', extension: 'c' },
  { value: 'html', label: 'HTML', extension: 'html' },
  { value: 'css', label: 'CSS', extension: 'css' },
  { value: 'sql', label: 'SQL', extension: 'sql' },
  { value: 'shell', label: 'Shell', extension: 'sh' },
  { value: 'ruby', label: 'Ruby', extension: 'rb' },
  { value: 'php', label: 'PHP', extension: 'php' },
  { value: 'go', label: 'Go', extension: 'go' },
  { value: 'xml', label: 'XML', extension: 'xml' },
  { value: 'yaml', label: 'YAML', extension: 'yaml' },
  { value: 'markdown', label: 'Markdown', extension: 'md' }
];

const DEFAULT_CODE_TEMPLATES = {
  javascript: `// JavaScript Code
function solution() {
  // Your code here
  return result;
}

console.log(solution());`,
  typescript: `// TypeScript Code
function solution(): any {
  // Your code here
  return result;
}

console.log(solution());`,
  python: `# Python Code
def solution():
    # Your code here
    return result

print(solution())`,
  java: `// Java Code
public class Solution {
    public static void main(String[] args) {
        // Your code here
        System.out.println(solution());
    }
    
    public static Object solution() {
        // Your code here
        return null;
    }
}`,
  cpp: `// C++ Code
#include <iostream>
using namespace std;

int main() {
    // Your code here
    return 0;
}`,
  c: `// C Code
#include <stdio.h>

int main() {
    // Your code here
    return 0;
}`,
  html: `<!DOCTYPE html>
<html>
<head>
    <title>Solution</title>
</head>
<body>
    <!-- Your HTML here -->
</body>
</html>`,
  css: `/* CSS Code */
.solution {
    /* Your styles here */
}`,
  sql: `-- SQL Query
SELECT * FROM table_name
WHERE condition;`
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode,
  language = 'javascript',
  onCodeChange,
  onRun,
  onLineClick,
  onTextSelect,
  className,
  placeholder = 'Start typing your code...',
  readOnly = false,
  showLanguageSelector = true,
  showRunButton = true,
  showCopyButton = true,
  showResetButton = true,
  showFullscreenToggle = true,
  maxHeight = '400px',
  highlightLine,
  highlightText
}) => {
  const [code, setCode] = useState(initialCode || DEFAULT_CODE_TEMPLATES[language as keyof typeof DEFAULT_CODE_TEMPLATES] || '');
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Update internal code when initialCode prop changes
  useEffect(() => {
    if (initialCode !== undefined) {
      setCode(initialCode || DEFAULT_CODE_TEMPLATES[selectedLanguage as keyof typeof DEFAULT_CODE_TEMPLATES] || '');
    }
  }, [initialCode, selectedLanguage]);

  // Update line numbers when code changes
  useEffect(() => {
    const lines = code.split('\n');
    setLineNumbers(lines.map((_, index) => index + 1));
  }, [code]);

  // Handle programmatic highlighting
  useEffect(() => {
    if (!textareaRef.current) return;
    
    const syncScroll = () => {
      // Read actual DOM scroll position after browser has applied it
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const actualScroll = textareaRef.current.scrollTop;
          setScrollTop(actualScroll);
          if (lineNumbersRef.current) {
            lineNumbersRef.current.scrollTop = actualScroll;
          }
        }
      });
    };

    if (highlightLine) {
      const lines = code.split('\n');
      let charPos = 0;
      for (let i = 0; i < highlightLine - 1; i++) {
        charPos += lines[i].length + 1; // +1 for \n
      }
      
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(charPos, charPos);
      
      // Auto-scroll to that line
      const lineHeight = 20; // from leading-5/text-sm in CSS
      const targetScroll = Math.max(0, (highlightLine - 1) * lineHeight - 40);
      textareaRef.current.scrollTop = targetScroll;
      syncScroll();
    }

    if (highlightText) {
      const index = code.indexOf(highlightText);
      if (index !== -1) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(index, index + highlightText.length);
        
        // Find line number of text to scroll
        const textBefore = code.substring(0, index);
        const lineNum = textBefore.split('\n').length;
        const lineHeight = 20;
        const targetScroll = Math.max(0, (lineNum - 1) * lineHeight - 40);
        textareaRef.current.scrollTop = targetScroll;
        syncScroll();
      }
    }
  }, [highlightLine, highlightText, code]);

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      setScrollTop(textareaRef.current.scrollTop);
    }
  };

  // Handle code changes
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  };

  // Handle Text Selection
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    if (!onTextSelect) return;
    const target = e.currentTarget;
    const { selectionStart, selectionEnd, value } = target;
    
    if (selectionStart !== selectionEnd) {
      const selectedText = value.substring(selectionStart, selectionEnd);
      // Calculate start line
      const textBefore = value.substring(0, selectionStart);
      const startLine = textBefore.split('\n').length;
      
      onTextSelect(selectedText, startLine);
    }
  };

  // Handle line click in textarea
  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (!readOnly || !onLineClick) return;
    
    const target = e.currentTarget;
    // We only trigger line click if it's a simple click (not a selection)
    if (target.selectionStart === target.selectionEnd) {
      const textBefore = target.value.substring(0, target.selectionStart);
      const lineNum = textBefore.split('\n').length;
      onLineClick(lineNum);
    }
  };

  // Handle language change
  const handleLanguageChange = (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
    const template = DEFAULT_CODE_TEMPLATES[newLanguage as keyof typeof DEFAULT_CODE_TEMPLATES];
    if (template && code === DEFAULT_CODE_TEMPLATES[selectedLanguage as keyof typeof DEFAULT_CODE_TEMPLATES]) {
      const newCode = template;
      setCode(newCode);
      onCodeChange?.(newCode);
    }
  };

  // Handle run code
  const handleRunCode = () => {
    onRun?.(code, selectedLanguage);
  };

  // Handle copy code
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Handle reset code
  const handleResetCode = () => {
    const template = DEFAULT_CODE_TEMPLATES[selectedLanguage as keyof typeof DEFAULT_CODE_TEMPLATES] || '';
    setCode(template);
    onCodeChange?.(template);
  };

  // Handle tab key for indentation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newCode = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newCode);
      onCodeChange?.(newCode);
      
      // Set cursor position after tab
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.value === selectedLanguage);

  return (
    <Card className={cn('w-full', isFullscreen && 'fixed inset-0 z-50 rounded-none', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {currentLanguage?.label || 'Code'}
            </Badge>
            {showLanguageSelector && (
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-32 h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-1">
            {showRunButton && (
              <Button size="sm" variant="ghost" onClick={handleRunCode}>
                <Play className="h-3 w-3 mr-1" />
                Run
              </Button>
            )}
            {showCopyButton && (
              <Button size="sm" variant="ghost" onClick={handleCopyCode}>
                <Copy className="h-3 w-3" />
              </Button>
            )}
            {showResetButton && (
              <Button size="sm" variant="ghost" onClick={handleResetCode}>
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
            {showFullscreenToggle && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="relative border rounded-md bg-muted/50">
          <div className="flex">
            {/* Line Numbers */}
            <div 
              ref={lineNumbersRef}
              className="select-none text-xs text-muted-foreground bg-muted/30 border-r px-2 py-3 overflow-hidden"
              style={{ maxHeight: isFullscreen ? 'calc(100vh - 200px)' : maxHeight }}
            >
              {lineNumbers.map((lineNum) => (
                <div 
                  key={lineNum} 
                  className={cn(
                    "h-5 leading-5 text-right pr-3 transition-colors",
                    onLineClick ? 'cursor-pointer hover:text-primary transition-colors' : '',
                    highlightLine === lineNum && "bg-orange-100 text-orange-700 font-bold border-r-2 border-orange-400"
                  )}
                  onClick={() => onLineClick?.(lineNum)}
                >
                  {lineNum}
                </div>
              ))}
            </div>

            {/* Code Input */}
            <div className="flex-1 relative overflow-hidden">
              {/* Visual Highlight Backdrop */}
              {highlightLine && (
                <div 
                  className="absolute left-0 right-0 bg-orange-100/60 border-y border-orange-300/40 pointer-events-none z-0"
                  style={{ 
                    top: `calc(12px + ${(highlightLine - 1) * 20}px - ${scrollTop}px)`, 
                    height: '20px'
                  }}
                />
              )}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                onSelect={handleSelect}
                onClick={handleTextareaClick}
                placeholder={placeholder}
                readOnly={readOnly}
                className={cn(
                  "w-full h-full resize-none bg-transparent font-mono text-sm leading-5",
                  "px-3 py-3 border-0 outline-none placeholder:text-muted-foreground",
                  "overflow-auto whitespace-pre"
                )}
                style={{ 
                  maxHeight: isFullscreen ? 'calc(100vh - 200px)' : maxHeight,
                  minHeight: '200px'
                }}
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CodeEditor;