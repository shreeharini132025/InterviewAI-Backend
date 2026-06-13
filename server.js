const express = require('express');
const cors = require('cors');
const path = require('path');
require('./config/env');
const db = require('./config/db');

const app = express();

const allowedOrigins = [
  /^https?:\/\/localhost:\d+$/,
  /^https?:\/\/127\.0\.0\.1:\d+$/,
  /^https?:\/\/[a-z0-9-]+\.github\.io$/i,
  /^https?:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^https?:\/\/[a-z0-9-]+\.[a-z0-9-]+\.vercel\.app$/i,
  /^https?:\/\/[a-z0-9-]+\.onrender\.com$/i,
  /^https?:\/\/[a-z0-9-]+\.\d+\.inc1\.devtunnels\.ms$/i,
  /^https?:\/\/[a-z0-9-]+\.inc1\.devtunnels\.ms$/i,
];

const explicitOrigins = new Set(
  String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (explicitOrigins.has(origin)) return true;
  return allowedOrigins.some((pattern) => pattern.test(origin));
}

// Middleware
const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};


app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/questions', require('./routes/questions'));
app.use('/api/interview', require('./routes/interview'));
app.use('/interview', require('./routes/interview'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));
app.use('/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Smart Interview Platform API is running!', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await db.initializeDatabase();
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Smart Interview Platform API running on http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health\n`);
  });
}

startServer();

module.exports = app;

