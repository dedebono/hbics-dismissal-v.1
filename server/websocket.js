const { Server } = require('socket.io');

let io;

function createWebSocketServer(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.REACT_APP_WEBSOCKET_URL ? new URL(process.env.REACT_APP_WEBSOCKET_URL).origin : 'http://localhost:3000',
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected to Socket.IO:', socket.id);

    socket.on('disconnect', () => {
      console.log('Client disconnected from Socket.IO:', socket.id);
    });

    // Add a listener for a custom event from the client, e.g., 'request_active_students'
    socket.on('request_active_students', () => {
      console.log('Received request_active_students from client:', socket.id);
      // In a real application, you would fetch active students from your database
      // and emit them back to the client. For now, we'll just log.
      // Example: broadcast({ type: 'active_students', payload: [] });
    });
  });

  console.log('Socket.IO server created');
  return io;
}

function getWebSocketServer() {
  if (!io) {
    throw new Error('Socket.IO server has not been created yet.');
  }
  return io;
}

function broadcast(event, data) {
  if (io) {
    console.log(`Broadcasting event '${event}' with data:`, data);
    io.emit(event, data);
  }
}

module.exports = { createWebSocketServer, getWebSocketServer, broadcast };