import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_BASE_URL } from '../constants';
import { trafficStore } from '../services/trafficStore';

export interface WebSocketMessage {
  type: 'DETECTION' | 'ALERT' | 'CAMERA_STATUS' | 'PING';
  data: any;
  timestamp: string;
}

export function useWebSocket(url: string = WS_BASE_URL) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(msg);

          if (msg.type === 'DETECTION' && msg.data) {
            trafficStore.recordVideoDetection(msg.data);
          }
        } catch {
          // Ignore non-json
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      socketRef.current = ws;
    } catch {
      setIsConnected(false);
    }
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = (msg: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage
  };
}
