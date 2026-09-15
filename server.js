const path = require('path');
// Load environment variables before any other imports
require('dotenv').config({
  path: path.join(__dirname, 'config/.env'),
});

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const ErrorHandler = require('./utils/ErrorHandler');
const errorMiddleware = require('./middleware/error');
const { testConnection, pool } = require('./config/db');

// Import modular routers
const authRoutes = require('./routes/auth.routes');
const orderRoutes = require('./routes/order.routes');
const emailRoutes = require('./routes/email.routes');

const app = express();

// Configure CORS
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Default permitted origins
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://delivery.alliedscientificproducts.com',
  'https://delivery.alliedscientificproducts.com',
  'https://delivery-ch0u.onrender.com',
];

const allAllowedOrigins = Array.from(new Set([...defaultOrigins, ...allowedOrigins]));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Allow if origin is in whitelist or if localhost
      const isAllowed =
        allAllowedOrigins.includes(origin) ||
        /^http:\/\/localhost:[0-9]+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:[0-9]+$/.test(origin);

      if (isAllowed) {
        return callback(null, true);
      } else {
        console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
        return callback(null, true); // Fallback: allow to prevent dev disruption, or callback(new Error('CORS not allowed'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body and Cookie Parsers (50mb limit for base64 signature canvas data)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Health Check Endpoint
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Allied Scientific Delivery API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes (Mounting at root for 100% backward compatibility with frontend, and under /api)
app.use('/', authRoutes);
app.use('/', orderRoutes);
app.use('/', emailRoutes);

app.use('/api', authRoutes);
app.use('/api', orderRoutes);
app.use('/api', emailRoutes);

// Handle 404 Undefined Routes
app.all('*', (req, res, next) => {
  next(new ErrorHandler(`Route ${req.method} ${req.originalUrl} not found on this server`, 404));
});

// Centralized Error Handling Middleware
app.use(errorMiddleware);

// Server Port & Startup
const PORT = process.env.PORT || 9000;

const server = app.listen(PORT, async () => {
  console.log(`=============================================`);
  console.log(` Delivery Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=============================================`);

  // Verify database connection asynchronously
  await testConnection();
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful Handling of Unhandled Rejections and Exceptions
process.on('unhandledRejection', (err) => {
  console.error('[CRITICAL] Unhandled Promise Rejection:', err.message);
  console.error(err.stack);
});

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful Termination
const gracefulShutdown = (signal) => {
  console.log(`[Shutdown] Received ${signal}. Closing HTTP server...`);
  server.close(() => {
    console.log('[Shutdown] HTTP server closed.');
    pool.end(() => {
      console.log('[Shutdown] Database connections closed.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
