import React, { useEffect, useRef } from 'react';
import 'xterm/css/xterm.css';

interface PreviewConsoleProps {
  output: string;
}

export function PreviewConsole({ output }: PreviewConsoleProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);

  useEffect(() => {
    if (!terminalRef.current) return;
    if (typeof window === 'undefined') return;

    let term: any;
    let fitAddon: any;
    let resizeObserver: ResizeObserver;

    const initTerminal = async () => {
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('xterm-addon-fit');

      term = new Terminal({
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
        },
        fontSize: 12,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        disableStdin: true,
        cursorBlink: true,
      });
      
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      
      term.open(terminalRef.current!);
      
      // Delay fit slightly to ensure DOM is ready and dimensions exist
      setTimeout(() => {
        try {
          fitAddon.fit();
        } catch(e) {}
      }, 50);
      
      xtermRef.current = term;

      // If output was already provided before terminal initialized, write it now
      if (output && lastOutputLength.current === 0) {
        const formattedOutput = output.replace(/(?<!\r)\n/g, '\r\n');
        term.write(formattedOutput);
        lastOutputLength.current = output.length;
      }

      resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon.fit();
        } catch(e) {}
      });
      resizeObserver.observe(terminalRef.current!);
    };

    initTerminal();

    return () => {
      if (resizeObserver && terminalRef.current) {
        resizeObserver.disconnect();
      }
      if (term) {
        term.dispose();
      }
    };
  }, []);

  // Sync output to terminal incrementally
  const lastOutputLength = useRef(0);
  useEffect(() => {
    if (xtermRef.current && output) {
      const newOutput = output.slice(lastOutputLength.current);
      if (newOutput) {
        // Replace typical \n with \r\n for xterm if needed, though WebContainers usually provides \r\n
        const formattedOutput = newOutput.replace(/(?<!\r)\n/g, '\r\n');
        xtermRef.current.write(formattedOutput);
        lastOutputLength.current = output.length;
      }
    } else if (xtermRef.current && !output) {
      xtermRef.current.clear();
      lastOutputLength.current = 0;
    }
  }, [output]);

  return <div ref={terminalRef} className="h-full w-full bg-[#1e1e1e] overflow-hidden p-2" />;
}
