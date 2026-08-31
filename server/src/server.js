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

const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/transactions', transactionRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/users', resourceRoutes(User, { superAdmin: true, middleware: requireSuperAdmin }));
app.use('/api/subscriptions', resourceRoutes(Subscription, { superAdmin: true, middleware: requireSuperAdmin }));
app.use('/api/public', publicRoutes);
app.use(errorHandler);

const port = process.env.PORT || 5000;
connectDatabase().then(() => app.listen(port, () => console.log(`API running on port ${port}`))).catch((error) => { console.error('Database connection failed', error); process.exit(1); });
