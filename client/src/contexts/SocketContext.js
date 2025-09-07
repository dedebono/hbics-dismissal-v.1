
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:5000';
    console.log('Attempting to connect to WebSocket at:', websocketUrl);
    const newSocket = io(websocketUrl);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket connected!');
    });
    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket disconnected.');
    });
    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.close();
      console.log('WebSocket cleanup.');
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
