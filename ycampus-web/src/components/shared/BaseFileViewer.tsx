import React, { useState, useEffect } from 'react';
import { Loader2, FileText, Download, FileArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeEditor } from '@/components/ui/code-editor';
import mammoth from 'mammoth';

interface BaseFileViewerProps {
  url: string;
  fileName: string;
  fileType?: string;
  fallbackDownloadFn?: () => void;
  className?: string;
  /** Pre-decoded text content (for files extracted from a ZIP). Skips fetch when provided. */
  preloadedText?: string;
}

const getAccessibleUrl = (url: string | null) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `http://${url}`;
};

export const getFileType = (filename: string): 'image' | 'pdf' | 'text' | 'docx' | 'document' | 'unknown' => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (['xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(ext)) return 'document';
  if (['txt', 'md', 'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'java', 'c', 'cpp', 'sql', 'sh', 'rb', 'php', 'go', 'xml', 'yaml', 'log'].includes(ext)) return 'text';
  return 'unknown';
};

export const BaseFileViewer: React.FC<BaseFileViewerProps> = ({
  url,
  fileName,
  fileType,
  fallbackDownloadFn,
  className = '',
  preloadedText
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [docxHtml, setDocxHtml] = useState<string>('');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const type = fileType?.startsWith('image/') ? 'image'
             : fileType?.includes('pdf') ? 'pdf'
             : (fileType?.includes('word') || fileType?.includes('docx') || fileType?.includes('doc'))
               ? 'docx'
             : getFileType(fileName);

  const isZip = fileType?.includes('zip') || fileType?.includes('rar') || fileName.toLowerCase().endsWith('.zip');

  useEffect(() => {
    let active = true;

    // If preloaded text is provided (e.g. from ZIP extraction), skip fetching
    if (preloadedText !== undefined) {
      setTextContent(preloadedText);
      return;
    }

    const loadFile = async (targetUrl: string) => {
      // Images and PDFs: just set the URL directly, no fetch needed
      if (type === 'image' || type === 'pdf') {
        setBlobUrl(targetUrl);
        return;
      }

      // Unknown / ZIP: nothing to render
      if (type === 'document' || type === 'unknown' || isZip) {
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(targetUrl);
        if (!res.ok) throw new Error('Failed to load file');
        const blob = await res.blob();

        if (!active) return;

        if (type === 'docx') {
          // Convert DOCX → HTML using mammoth (runs entirely in browser)
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (active) setDocxHtml(result.value);
        } else if (type === 'text') {
          setTextContent(await blob.text());
        }

      } catch (err) {
        console.error(err);
        if (active) setError('Unable to process the file.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (url) {
      loadFile(getAccessibleUrl(url));
    }

    return () => {
      active = false;
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url, fileName, type, isZip, preloadedText]);

  const handleDownload = () => {
    if (fallbackDownloadFn) {
      fallbackDownloadFn();
    } else {
      const a = document.createElement('a');
      a.href = getAccessibleUrl(url);
      a.download = fileName;
      a.click();
    }
  };

  if (error) {
    return (
      <div className={`h-full w-full flex flex-col items-center justify-center p-6 text-center bg-muted/20 ${className}`}>
        <FileText className="h-14 w-14 text-red-300 mb-3" />
        <h3 className="text-sm font-medium text-foreground mb-1">Preview Error</h3>
        <p className="text-xs text-muted-foreground max-w-xs mb-4">{error}</p>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" /> Download File Instead
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`relative w-full h-full flex flex-col items-center justify-center bg-white/80 z-10 ${className}`}>
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading document...</p>
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className={`w-full h-full flex items-center justify-center overflow-auto bg-slate-50 ${className}`}>
        <img src={blobUrl || getAccessibleUrl(url)} className="max-w-full max-h-full object-contain" alt={fileName} />
      </div>
    );
  }

  if (type === 'pdf') {
    return <iframe src={blobUrl || getAccessibleUrl(url)} title={fileName} className={`w-full h-full border-0 bg-white ${className}`} />;
  }

  if (type === 'docx' && docxHtml) {
    return (
      <div className={`w-full h-full overflow-auto bg-white ${className}`}>
        <div
          className="max-w-3xl mx-auto px-10 py-10 prose prose-sm prose-slate"
          style={{ fontFamily: 'Georgia, serif', lineHeight: 1.8, fontSize: '15px' }}
          dangerouslySetInnerHTML={{ __html: docxHtml }}
        />
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className={`w-full h-full flex flex-col ${className}`}>
        <CodeEditor
          initialCode={textContent}
          readOnly={true}
          language={fileName.split('.').pop() === 'py' ? 'python' : 'javascript'}
          className="flex-1 border-0 rounded-none shadow-none"
        />
      </div>
    );
  }

  // Fallback for PPT, XLS, ZIP, Unknown
  return (
    <div className={`h-full w-full flex flex-col items-center justify-center text-center p-6 bg-muted/20 ${className}`}>
      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
        {isZip ? <FileArchive className="h-6 w-6 text-muted-foreground" /> : <FileText className="h-6 w-6 text-muted-foreground" />}
      </div>
      <p className="text-sm font-medium text-foreground">Preview not available</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mb-4">
        This file format cannot be previewed in the browser.
      </p>
      <Button onClick={handleDownload}>
        <Download className="h-4 w-4 mr-2" /> Download to View
      </Button>
    </div>
  );
};
