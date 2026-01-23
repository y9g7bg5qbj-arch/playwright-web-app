import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@playwright-web-app/shared';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

// WebSocket URL - in dev connects directly to backend, in prod uses same origin
const WS_URL = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:3000';
const isDev = import.meta.env?.DEV || (typeof window !== 'undefined' && window.location.hostname === 'localhost');

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Subscribe to auth store to react to login/logout - this makes the hook reactive
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Read token fresh when auth state changes
  const token = isAuthenticated ? apiClient.getToken() : null;

  useEffect(() => {
    // Dev mode: connect even without token
    if (!token && !isDev) {
      // Production: require auth
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const newSocket = io(WS_URL, {
      auth: { token: token || '' }, // Empty token triggers dev mode on backend
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
    });

    // Use state so components re-render when socket is ready
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]); // Re-run when token changes (login/logout)

  return {
    socket,
    isConnected,
  };
}
