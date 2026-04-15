const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

let io;

function createWebSocketServer(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8,
    transports: ['websocket', 'polling']
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    console.log('WebSocket auth - Token received:', token ? token.substring(0, 50) + '...' : 'none');

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('WebSocket auth - JWT verify error:', err.message);
        return next(new Error('Authentication error: Invalid or expired token'));
      }

      console.log('WebSocket auth - Decoded user:', decoded);
      socket.user = decoded;
      socket.tenant = decoded.school_id;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`Client connected to Socket.IO: ${socket.id}, User: ${socket.user.username}, Role: ${socket.user.role}, Tenant: ${socket.tenant}`);

    if (socket.tenant) {
      socket.join(`tenant_${socket.tenant}`);
      socket.join(`tenant_${socket.tenant}_role_${socket.user.role}`);
    }

    socket.on('disconnect', () => {
      console.log('Client disconnected from Socket.IO:', socket.id);
    });

    socket.on('request_active_students', () => {
      console.log('Received request_active_students from client:', socket.id, 'Tenant:', socket.tenant);
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

function broadcastToTenant(tenantId, event, data) {
  if (io && tenantId) {
    console.log(`Broadcasting event '${event}' to tenant ${tenantId}:`, data);
    io.to(`tenant_${tenantId}`).emit(event, data);
  }
}

function getConnectedUsers() {
  if (!io) return [];
  const sockets = io.sockets.sockets;
  const users = [];
  sockets.forEach((socket) => {
    if (socket.user) {
      users.push({
        id: socket.user.id,
        username: socket.user.username,
        role: socket.user.role,
        tenant: socket.tenant,
        socketId: socket.id
      });
    }
  });
  return users;
}

function getUsersByTenant(tenantId) {
  return getConnectedUsers().filter(u => u.tenant === tenantId);
}

function broadcastToRole(role, event, data) {
  if (io) {
    console.log(`Broadcasting event '${event}' to role ${role}:`, data);
    io.to(`role_${role}`).emit(event, data);
  }
}

function broadcastToTenantAndRole(tenantId, role, event, data) {
  if (io && tenantId) {
    console.log(`Broadcasting event '${event}' to tenant ${tenantId} and role ${role}:`, data);
    io.to(`tenant_${tenantId}_role_${role}`).emit(event, data);
  }
}

module.exports = { createWebSocketServer, getWebSocketServer, broadcast, broadcastToTenant, broadcastToRole, broadcastToTenantAndRole, getConnectedUsers, getUsersByTenant };