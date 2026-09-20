import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

const createToken = (user) => jwt.sign(
  { sub: user._id.toString(), email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email });

const requireAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ message: 'Admin access required.' });
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Admin authentication required.' });
  }
};

router.post('/admin-login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.trim().toLowerCase(), role: 'admin' }).select('+passwordHash');
    const passwordMatches = user ? await bcrypt.compare(password || '', user.passwordHash) : false;
    if (!user || !passwordMatches) return res.status(401).json({ message: 'Invalid admin email or password.' });
    res.json({ user: { ...publicUser(user), role: user.role }, token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/admin-password', requireAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ message: 'Current password and a new password of at least 6 characters are required.' });
    const user = await User.findById(req.auth.sub).select('+passwordHash');
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(401).json({ message: 'Current password is incorrect.' });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ message: 'Admin password changed successfully.' });
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(409).json({ message: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash });
    res.status(201).json({ user: publicUser(user), token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !passwordMatches) return res.status(401).json({ message: 'Invalid email or password.' });

    res.json({ user: publicUser(user), token: createToken(user) });
  } catch (error) {
    next(error);
  }
});

export default router;
