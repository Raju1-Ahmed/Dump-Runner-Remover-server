import { Router } from 'express';
import ContactMessage from '../models/ContactMessage.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const subjects = ['General Inquiry', 'Junk Removal Estimate', 'Existing Appointment', 'Commercial Services', 'Other'];

router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone = '', subject, message } = req.body || {};
    if (!name?.trim() || !email?.trim() || !subject || !message?.trim()) return res.status(400).json({ message: 'Name, email, subject and message are required.' });
    if (!emailPattern.test(email.trim())) return res.status(400).json({ message: 'Please provide a valid email address.' });
    if (!subjects.includes(subject)) return res.status(400).json({ message: 'Please choose a valid subject.' });
    const contactMessage = await ContactMessage.create({ name, email, phone, subject, message });
    res.status(201).json({ message: 'Your message has been received.', contactMessage });
  } catch (error) { next(error); }
});

router.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json({ messages });
  } catch (error) { next(error); }
});

router.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    if (!['New', 'Read'].includes(req.body?.status)) return res.status(400).json({ message: 'Invalid message status.' });
    const contactMessage = await ContactMessage.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!contactMessage) return res.status(404).json({ message: 'Message not found.' });
    res.json({ contactMessage });
  } catch (error) { next(error); }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const contactMessage = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!contactMessage) return res.status(404).json({ message: 'Message not found.' });
    res.json({ message: 'Message removed successfully.' });
  } catch (error) { next(error); }
});

export default router;
