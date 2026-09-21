import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import userRoutes from './routes/users.js';
import contactMessageRoutes from './routes/contact-messages.js';
import User from './models/User.js';

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CLIENT_ORIGIN || '').split(',').map((origin) => origin.trim()).filter(Boolean),
]);

const ensureAdminUser = async () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required in server/.env');
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await User.findOneAndUpdate(
    { email },
    { $set: { role: 'admin' }, $setOnInsert: { name: 'DUMP RUNNERZ Admin', passwordHash } },
    { upsert: true, new: true, setDefaultsOnInsert: true, rawResult: true }
  );
  if (result.lastErrorObject?.upserted) console.log('Admin account created in MongoDB.');
  await User.updateMany({ role: { $exists: false } }, { $set: { role: 'customer' } });
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
}));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  service: 'DUMP RUNNERZ API',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
}));
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact-messages', contactMessageRoutes);
app.use((_req, res) => res.status(404).json({ message: 'API endpoint not found.' }));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.code === 11000) return res.status(409).json({ message: 'This record already exists.' });
  if (error.name === 'ValidationError') return res.status(400).json({ message: 'Please check the submitted details.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON request.' });
  res.status(error.statusCode || 500).json({ message: error.message || 'Something went wrong. Please try again.' });
});

const start = async () => {
  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) throw new Error('MONGODB_URI and JWT_SECRET are required in server/.env');
  await mongoose.connect(process.env.MONGODB_URI);
  await ensureAdminUser();
  app.listen(port, () => console.log(`DUMP RUNNERZ server running on http://localhost:${port}`));
};

start().catch((error) => {
  console.error('Unable to start DUMP RUNNERZ server:', error.message);
  process.exit(1);
});
