import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import uploadRoutes from './routes/upload.routes.js';
import reconcileRoutes from './routes/reconcile.routes.js';
import exceptionsRoutes from './routes/exceptions.routes.js';
import chatRoutes from './routes/chat.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import evalRoutes from './routes/eval.routes.js';
import errorHandler from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check routes
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/reconcile', reconcileRoutes);
app.use('/api/exceptions', exceptionsRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/eval', evalRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
