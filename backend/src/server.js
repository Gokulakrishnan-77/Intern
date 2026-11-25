import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectSQL, sequelize } from './config/database.js';
import { seedDatabase } from './config/seed.js';

// Route Imports
import authRoutes from './routes/authRoutes.js';
import rideRoutes from './routes/rideRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../frontend/dist');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(helmet({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }));

const corsOptions = {
  origin: true, // Dynamically reflects requesting origin (Vercel, localhost, etc.)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-user-email',
    'x-admin-email',
    'Origin',
    'Accept',
    'X-Requested-With',
  ],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    database: `SQL (${sequelize.getDialect().toUpperCase()})`,
    service: 'RideShareLocal Backend Engine',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve frontend static build if dist exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Root endpoint for API status
app.get('/', (req, res) => {
  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.json({
    success: true,
    message: 'RideShare API Server is online and connected to PostgreSQL.',
    health: '/api/health',
  });
});

// API 404 Handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.originalUrl} not found.` });
});

// Fallback for non-API routes
app.get('*', (req, res) => {
  const indexHtml = path.join(distPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found on this API backend.`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Internal Error]:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Database Initialization & Server Startup
const startServer = async () => {
  try {
    await connectSQL();

    // Synchronize SQL Models (creates tables if they do not exist)
    await sequelize.sync();
    console.log('[SQL Database] All relational tables synchronized successfully.');

    // Seed master administrator Krish & initial demo data
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 RideShareLocal SQL Server running on port ${PORT}`);
      console.log(`📍 API Health: http://localhost:${PORT}/api/health`);
      console.log(`🛡️ Administrator Krish: jacksnow0777@gmail.com`);
      console.log(`💾 Database Engine: ${sequelize.getDialect().toUpperCase()} (Relational SQL)`);
      console.log(`📁 Database Name: ${sequelize.config.database || 'SQLite'}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('[Startup Error] Failed to initialize server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
