import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  useTerminalWebSocket,
  type ServerMessage,
  type ConnectionState,
} from '@/hooks/useTerminalWebSocket';

interface TerminalProps {
  sessionId: string;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onSessionEnded?: () => void;
}

/** Shortens /vercel/sandbox to ~ for display */
function formatCwd(cwd: string): string {
  if (cwd === '/vercel/sandbox') return '~';
  if (cwd.startsWith('/vercel/sandbox/')) return '~/' + cwd.slice('/vercel/sandbox/'.length);
  return cwd;
}

/**
 * Interactive terminal component backed by xterm.js and a WebSocket
 * connection to the sandbox backend.
 *
 * Implements a line-editing input model: the user types locally,
 * and the complete command is sent to the backend on Enter.
 */
export default function Terminal({ sessionId, onConnectionStateChange, onSessionEnded }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const disposedRef = useRef(false);

  // Terminal state
  const inputBufferRef = useRef('');
  const terminalIdRef = useRef<string | null>(null);
  const cwdRef = useRef('/vercel/sandbox');
  const [isCommandRunning, setIsCommandRunning] = useState(false);
  const isCommandRunningRef = useRef(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const savedInputRef = useRef('');

  /** Synchronously update both state and ref for isCommandRunning */
  const setRunning = useCallback((value: boolean) => {
    isCommandRunningRef.current = value;
    setIsCommandRunning(value);
  }, []);

  /** Write the shell prompt to xterm */
  const writePrompt = useCallback((cwd: string) => {
    const term = termRef.current;
    if (!term) return;
    const display = formatCwd(cwd);
    term.write(`\x1b[38;5;208muser@sandbox\x1b[0m:\x1b[38;5;39m${display}\x1b[0m$ `);
  }, []);

  /** Clear the current input line in xterm (visual only) */
  const clearInputLine = useCallback(() => {
    const term = termRef.current;
    if (!term) return;
    const buf = inputBufferRef.current;
    if (buf.length > 0) {
      // Move cursor to start of line after prompt, then clear to end
      term.write('\x1b[' + buf.length + 'D\x1b[K');
    }
  }, []);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((msg: ServerMessage) => {
    const term = termRef.current;
    if (!term) return;

    switch (msg.type) {
      case 'terminal:created':
        terminalIdRef.current = msg.terminalId;
        cwdRef.current = msg.cwd;
        break;

      case 'terminal:output':
        try {
          term.write(msg.data);
        } catch {
          // Ignore write errors (e.g. binary data)
        }
        break;

      case 'terminal:exit':
        cwdRef.current = msg.cwd;
        setRunning(false);
        break;

      case 'terminal:prompt':
        cwdRef.current = msg.cwd;
        setRunning(false);
        writePrompt(msg.cwd);
        break;

      case 'terminal:error':
        term.write(`\r\n\x1b[31mError: ${msg.message}\x1b[0m\r\n`);
        break;
    }
  }, [writePrompt, setRunning]);

  // Handle WebSocket disconnect — clear terminalId so reconnect creates a new one
  const handleDisconnect = useCallback(() => {
    terminalIdRef.current = null;
    setRunning(false);
    const term = termRef.current;
    if (term) {
      term.write('\r\n\x1b[38;5;245m  Reconnecting...\x1b[0m\r\n');
    }
  }, [setRunning]);

  const { sendMessage, connectionState, secondsRemaining } = useTerminalWebSocket(sessionId, {
    onMessage: handleMessage,
    onDisconnect: handleDisconnect,
    onSessionEnded,
  });

  // Notify parent of connection state changes
  const prevConnectionStateRef = useRef<ConnectionState | null>(null);
  useEffect(() => {
    if (prevConnectionStateRef.current !== connectionState) {
      prevConnectionStateRef.current = connectionState;
      onConnectionStateChange?.(connectionState);
    }
  }, [connectionState, onConnectionStateChange]);

  // Initialize xterm and create terminal session
  useEffect(() => {
    if (!containerRef.current) return;
    disposedRef.current = false;

    const term = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0a0a0c',
        foreground: '#e0e0e0',
        cursor: '#ff6b00',
        selectionBackground: '#ff6b0033',
        black: '#1a1a2e',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#6272a4',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#e0e0e0',
        brightBlack: '#44475a',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);

    // Initial fit — guard against post-dispose fire
    requestAnimationFrame(() => {
      if (!disposedRef.current) fitAddon.fit();
    });

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('\x1b[38;5;208m  Sandbox Terminal\x1b[0m');
    term.writeln('\x1b[38;5;245m  Connecting...\x1b[0m');
    term.writeln('');

    // Handle keyboard input
    term.onData((data) => {
      // Ignore input before terminal is created
      if (!terminalIdRef.current) return;

      const running = isCommandRunningRef.current;

      for (let i = 0; i < data.length; i++) {
        const ch = data[i];
        const code = ch.charCodeAt(0);

        if (code === 3) {
          // Ctrl+C
          if (running) {
            sendMessage({
              type: 'terminal:kill',
              terminalId: terminalIdRef.current,
            });
          } else {
            // Cancel current input
            term.write('^C\r\n');
            inputBufferRef.current = '';
            historyIndexRef.current = -1;
            writePrompt(cwdRef.current);
          }
          return;
        }

        // Ignore other input while a command is running
        if (running) continue;

        if (ch === '\r' || ch === '\n') {
          // Enter
          term.write('\r\n');
          const input = inputBufferRef.current;
          inputBufferRef.current = '';
          historyIndexRef.current = -1;

          if (input.trim()) {
            historyRef.current.push(input);
            if (historyRef.current.length > 1000) {
              historyRef.current.shift();
            }
            isCommandRunningRef.current = true;
            setIsCommandRunning(true);
            sendMessage({
              type: 'terminal:input',
              terminalId: terminalIdRef.current,
              data: input,
            });
          } else {
            sendMessage({
              type: 'terminal:input',
              terminalId: terminalIdRef.current,
              data: '',
            });
          }
        } else if (code === 127 || code === 8) {
          // Backspace
          if (inputBufferRef.current.length > 0) {
            inputBufferRef.current = inputBufferRef.current.slice(0, -1);
            term.write('\b \b');
          }
        } else if (ch === '\x1b' && data[i + 1] === '[') {
          // Arrow keys (escape sequences)
          const arrow = data[i + 2];
          i += 2; // Skip the [ and arrow char

          if (arrow === 'A') {
            // Up arrow — navigate history
            const history = historyRef.current;
            if (history.length === 0) continue;

            if (historyIndexRef.current === -1) {
              savedInputRef.current = inputBufferRef.current;
              historyIndexRef.current = history.length - 1;
            } else if (historyIndexRef.current > 0) {
              historyIndexRef.current--;
            } else {
              continue;
            }

            clearInputLine();
            const entry = history[historyIndexRef.current];
            inputBufferRef.current = entry;
            term.write(entry);
          } else if (arrow === 'B') {
            // Down arrow — navigate history
            if (historyIndexRef.current === -1) continue;

            clearInputLine();
            historyIndexRef.current++;

            if (historyIndexRef.current >= historyRef.current.length) {
              historyIndexRef.current = -1;
              inputBufferRef.current = savedInputRef.current;
              term.write(savedInputRef.current);
            } else {
              const entry = historyRef.current[historyIndexRef.current];
              inputBufferRef.current = entry;
              term.write(entry);
            }
          }
          // Left/Right arrows are ignored for simplicity in MVP
        } else if (code >= 32) {
          // Printable character
          inputBufferRef.current += ch;
          term.write(ch);
        }
      }
    });

    // Resize observer — guard rAF callback against post-dispose fire
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (disposedRef.current) return;
        fitAddon.fit();
        if (terminalIdRef.current) {
          sendMessage({
            type: 'terminal:resize',
            terminalId: terminalIdRef.current,
            cols: term.cols,
            rows: term.rows,
          });
        }
      });
    });
    resizeObserver.observe(containerRef.current);

    // Cleanup
    return () => {
      disposedRef.current = true;
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Request a terminal session once connected
  useEffect(() => {
    if (connectionState === 'connected' && !terminalIdRef.current) {
      sendMessage({ type: 'terminal:create' });
    }
  }, [connectionState, sendMessage]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0a0c]">
      <div className="flex items-center h-8 px-3 bg-[#111116] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-1.5 mr-3">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="text-xs text-white/40 font-mono">Terminal</span>
        <div className="ml-auto flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              connectionState === 'connected'
                ? 'bg-green-400'
                : connectionState === 'reconnecting'
                  ? 'bg-yellow-400'
                  : 'bg-red-400'
            }`}
          />
          <span className="text-[10px] text-white/30">
            {connectionState === 'connected'
              ? 'Connected'
              : connectionState === 'reconnecting'
                ? `Reconnecting...${secondsRemaining != null ? ` (${secondsRemaining}s)` : ''}`
                : 'Session Ended'}
          </span>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 p-1" />
    </div>
  );
}
