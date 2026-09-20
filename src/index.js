import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';
import authRoutes from './routes/auth.js';

const app = express();
const port = process.env.PORT || 5000;

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
  app.listen(port, () => console.log(`DUMP RUNNERZ server running on http://localhost:${port}`));
};

start().catch((error) => {
  console.error('Unable to start DUMP RUNNERZ server:', error.message);
  process.exit(1);
});
