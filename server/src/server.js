import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { connectDatabase } from './config/database.js';
import transactionRoutes from './routes/transactionRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import masterRoutes from './routes/masterRoutes.js';
import { resourceRoutes } from './routes/resourceRoutes.js';
import User from './models/User.js';
import Subscription from './models/Subscription.js';
import { requireSuperAdmin } from './middleware/requireSuperAdmin.js';
import publicRoutes from './routes/publicRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { authenticateToken } from './middleware/authMiddleware.js';
import budgetRoutes from './routes/budgetRoutes.js';
import targetRoutes from './routes/targetRoutes.js';
import monthlyReportRoutes from './routes/monthlyReportRoutes.js';
import MonthlyReport from './models/MonthlyReport.js';
import businessRoutes from './routes/businessRoutes.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/masters', authenticateToken, masterRoutes);
app.use('/api/budgets', authenticateToken, budgetRoutes);
app.use('/api/targets', authenticateToken, targetRoutes);
app.use('/api/reports', authenticateToken, monthlyReportRoutes);
app.use('/api/business', authenticateToken, businessRoutes);
app.use('/api/users', authenticateToken, resourceRoutes(User, { superAdmin: true, middleware: requireSuperAdmin, isUserModel: true }));
app.use('/api/subscriptions', authenticateToken, resourceRoutes(Subscription, { superAdmin: true, middleware: requireSuperAdmin }));
app.use('/api/public', publicRoutes);
app.use(errorHandler);

const port = process.env.PORT || 5000;
// Monthly reports are one row per month PER BRANCH: syncIndexes() replaces the
// older userId+month unique index with the per-branch one. A failure here must
// never stop the API - the feature still works, only the extra duplicate guard
// would be missing - so the error is logged and startup continues.
connectDatabase()
    .then(() => MonthlyReport.syncIndexes().catch((error) => console.error('MonthlyReport index sync failed', error)))
    .then(() => app.listen(port, () => console.log(`API running on port ${port}`)))
    .catch((error) => { console.error('Database connection failed', error); process.exit(1); });
