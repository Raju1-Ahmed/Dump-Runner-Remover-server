import { Router } from 'express';
import User from '../models/User.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find({}, 'name email role createdAt').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

export default router;
