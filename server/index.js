const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const dismissalRoutes = require('./routes/dismissal');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/dismissal', dismissalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// Serve React app if built, otherwise show message
app.use(express.static(path.join(__dirname, '../client/build')));

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
