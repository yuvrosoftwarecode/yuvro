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
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  showLanguageSelector?: boolean;
  showRunButton?: boolean;
  showCopyButton?: boolean;
  showResetButton?: boolean;
  showFullscreenToggle?: boolean;
  maxHeight?: string;
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
  { value: 'sql', label: 'SQL', extension: 'sql' }
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
  className,
  placeholder = 'Start typing your code...',
  readOnly = false,
  showLanguageSelector = true,
  showRunButton = true,
  showCopyButton = true,
  showResetButton = true,
  showFullscreenToggle = true,
  maxHeight = '400px'
}) => {
  const [code, setCode] = useState(initialCode || DEFAULT_CODE_TEMPLATES[language as keyof typeof DEFAULT_CODE_TEMPLATES] || '');
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lineNumbers, setLineNumbers] = useState<number[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Update line numbers when code changes
  useEffect(() => {
    const lines = code.split('\n');
    setLineNumbers(lines.map((_, index) => index + 1));
  }, [code]);

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Handle code changes
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
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
                <div key={lineNum} className="h-5 leading-5 text-right">
                  {lineNum}
                </div>
              ))}
            </div>

            {/* Code Input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
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