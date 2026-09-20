import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import authRoutes from './routes/auth.js';
import User from './models/User.js';

const app = express();
const port = process.env.PORT || 5000;

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
};

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  service: 'DUMP RUNNERZ API',
  database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
}));
app.use('/api/auth', authRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
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
