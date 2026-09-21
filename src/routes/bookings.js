import { Router } from 'express';
import Booking from '../models/Booking.js';
import { optionalAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const booking = await Booking.create({
      ...req.body,
      bookingId: `DR-${Date.now().toString().slice(-8)}`,
      user: req.user?._id || null,
    });
    res.status(201).json({ booking });
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const bookings = await Booking.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    res.json({ message: 'Booking removed successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
