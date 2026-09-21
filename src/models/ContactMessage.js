import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
  phone: { type: String, trim: true, maxlength: 40, default: '' },
  subject: { type: String, required: true, enum: ['General Inquiry', 'Junk Removal Estimate', 'Existing Appointment', 'Commercial Services', 'Other'] },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  status: { type: String, enum: ['New', 'Read'], default: 'New' },
}, { timestamps: true });

export default mongoose.model('ContactMessage', contactMessageSchema);
