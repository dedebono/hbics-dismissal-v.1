
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { token, loading } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (loading || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL || window.location.origin.replace(/^http/, 'ws');
    console.log('Attempting to connect to WebSocket. Token:', token ? token.substring(0, 50) + '...' : 'none');

    const newSocket = io(websocketUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      auth: {
        token: token
      }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket connected!');
      newSocket.emit('request_active_students');
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('WebSocket disconnected:', reason);
    });

    newSocket.on('reconnect', (attempts) => {
      console.log('WebSocket reconnected after', attempts, 'attempts');
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnect error:', error);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
    });

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('reconnect');
      newSocket.off('reconnect_error');
      newSocket.off('connect_error');
      newSocket.close();
      console.log('WebSocket cleanup.');
    };
  }, [token, loading]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
