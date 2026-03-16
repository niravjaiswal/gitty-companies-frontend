import { useCallback, useEffect, useRef, useState } from 'react';
import { getWebSocketUrl } from '@/lib/api';

// ── Message types (must match backend) ─────────────────────────────────

interface TerminalCreatedMsg {
  type: 'terminal:created';
  terminalId: string;
  cwd: string;
}

interface TerminalOutputMsg {
  type: 'terminal:output';
  terminalId: string;
  data: string;
  stream: 'stdout' | 'stderr';
}

interface TerminalExitMsg {
  type: 'terminal:exit';
  terminalId: string;
  exitCode: number;
  cwd: string;
}

interface TerminalErrorMsg {
  type: 'terminal:error';
  terminalId: string;
  message: string;
}

interface TerminalPromptMsg {
  type: 'terminal:prompt';
  terminalId: string;
  cwd: string;
}

export type ServerMessage =
  | TerminalCreatedMsg
  | TerminalOutputMsg
  | TerminalExitMsg
  | TerminalErrorMsg
  | TerminalPromptMsg;

// ── Hook ───────────────────────────────────────────────────────────────

/** Retry every 2-3 s, ~20 attempts covers the 60 s backend grace period. */
const MAX_RETRIES = 20;
const RETRY_INTERVAL_MS = 3000;
const GRACE_PERIOD_S = 60;

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected';

interface UseTerminalWebSocketOptions {
  onMessage?: (msg: ServerMessage) => void;
  onDisconnect?: () => void;
  /** Called when the server sends close code 4001 (session expired). */
  onSessionEnded?: () => void;
}

interface UseTerminalWebSocketReturn {
  sendMessage: (msg: Record<string, unknown>) => void;
  connectionState: ConnectionState;
  secondsRemaining: number | null;
}

/**
 * Custom React hook that manages a WebSocket connection to the terminal backend.
 * Handles auto-connect, auth token attachment, reconnection with a fixed interval
 * (covering the 60 s backend grace period), and session-ended detection.
 */
export function useTerminalWebSocket(
  sessionId: string,
  options?: UseTerminalWebSocketOptions,
): UseTerminalWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onMessageRef = useRef(options?.onMessage);
  const onDisconnectRef = useRef(options?.onDisconnect);
  const onSessionEndedRef = useRef(options?.onSessionEnded);
  onMessageRef.current = options?.onMessage;
  onDisconnectRef.current = options?.onDisconnect;
  onSessionEndedRef.current = options?.onSessionEnded;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const sendMessage = useCallback((msg: Record<string, unknown>) => {
    const data = JSON.stringify(msg);
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
    // Drop messages when not connected — stale messages cause issues on reconnect
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    let disconnectedAt: number | null = null;

    function clearTimers() {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    }

    function startCountdown() {
      if (!disconnectedAt) disconnectedAt = Date.now();
      countdownTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - disconnectedAt!) / 1000);
        const remaining = Math.max(0, GRACE_PERIOD_S - elapsed);
        setSecondsRemaining(remaining);
        if (remaining <= 0 && countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
      }, 1000);
    }

    async function connect() {
      if (cancelled) return;

      // Guard against existing OPEN or CONNECTING sockets
      const existing = wsRef.current;
      if (
        existing &&
        (existing.readyState === WebSocket.OPEN ||
          existing.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      clearTimers();

      let url: string;
      try {
        url = await getWebSocketUrl(`/api/sessions/${sessionId}/terminal`);
      } catch {
        // If we can't get the URL (e.g. no session), schedule a retry
        if (!cancelled && retries < MAX_RETRIES) {
          retries++;
          if (!disconnectedAt) {
            disconnectedAt = Date.now();
            setConnectionState('reconnecting');
            startCountdown();
          }
          reconnectTimerRef.current = setTimeout(connect, RETRY_INTERVAL_MS);
        } else if (!cancelled) {
          setConnectionState('disconnected');
          setSecondsRemaining(0);
        }
        return;
      }

      if (cancelled) return;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) {
          ws.close();
          return;
        }
        retries = 0;
        disconnectedAt = null;
        clearTimers();
        setConnectionState('connected');
        setSecondsRemaining(null);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage;
          onMessageRef.current?.(msg);
        } catch {
          // Ignore non-JSON messages
        }
      };

      ws.onclose = (event) => {
        wsRef.current = null;
        onDisconnectRef.current?.();

        if (cancelled) return;

        // Close code 4001 = session expired — don't retry
        if (event.code === 4001) {
          setConnectionState('disconnected');
          setSecondsRemaining(0);
          onSessionEndedRef.current?.();
          return;
        }

        // Attempt reconnect with fixed interval
        if (retries < MAX_RETRIES) {
          if (!disconnectedAt) {
            disconnectedAt = Date.now();
            startCountdown();
          }
          setConnectionState('reconnecting');
          retries++;
          reconnectTimerRef.current = setTimeout(connect, RETRY_INTERVAL_MS);
        } else {
          setConnectionState('disconnected');
          setSecondsRemaining(0);
        }
      };

      ws.onerror = () => {
        // onclose will fire after onerror, which handles reconnection
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimers();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sessionId]);

  return { sendMessage, connectionState, secondsRemaining };
}
