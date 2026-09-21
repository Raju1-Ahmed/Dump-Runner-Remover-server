import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    service: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    dateLabel: { type: String, required: true },
    time: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    suburb: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['New', 'Confirmed', 'Completed', 'Cancelled'], default: 'New' },
  },
  { timestamps: true }
);

export default mongoose.model('Booking', bookingSchema);
