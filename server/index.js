const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
require('dotenv').config();

const { createWebSocketServer } = require('./websocket');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const dismissalRoutes = require('./routes/dismissal');
const userRoutes = require('./routes/users');
const superadminRoutes = require('./routes/superadmin');
const DismissalAnalytics = require('./models/DismissalAnalytics');
const { initDatabase } = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = createWebSocketServer(server);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/dismissal', dismissalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/analytics', require('./routes/analytics'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Root health check
app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve React app if built, otherwise show message
app.use(express.static(path.join(__dirname, '../client/build'), { index: false }));

app.get('*', (req, res) => {
  const buildPath = path.join(__dirname, '../client/build/index.html');
  if (require('fs').existsSync(buildPath)) {
    res.sendFile(buildPath);
  } else {
    res.json({ message: 'React app not built. Please run "npm run build" in the client directory.' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Run database initialization (migration + superadmin auto-creation) on startup
initDatabase((err) => {
  if (err) {
    console.error('Database initialization error:', err.message);
  } else {
    console.log('✅ Database initialized and migrated successfully.');
  }
});

console.log('Starting server...');
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
