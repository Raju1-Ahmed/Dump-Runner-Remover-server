import mongoose from 'mongoose';

const visitorSessionSchema = new mongoose.Schema({
  visitorId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, unique: true, index: true },
  firstSeenAt: { type: Date, default: Date.now, index: true },
  lastSeenAt: { type: Date, default: Date.now, index: true },
  landingPage: { type: String, default: '/' },
  exitPage: { type: String, default: '/' },
  country: { type: String, default: 'Unknown' },
  region: { type: String, default: 'Unknown' },
  deviceType: { type: String, enum: ['Desktop', 'Mobile', 'Tablet'], default: 'Desktop', index: true },
  operatingSystem: { type: String, default: 'Other' },
  browser: { type: String, default: 'Other' },
  language: { type: String, default: 'Unknown' },
  referrer: { type: String, default: 'Direct' },
  trafficSource: { type: String, default: 'Direct', index: true },
  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
  isReturningVisitor: { type: Boolean, default: false },
  pageViews: { type: Number, default: 0 },
  sessionDuration: { type: Number, default: 0 },
}, { timestamps: true });

visitorSessionSchema.index({ firstSeenAt: -1 });
visitorSessionSchema.index({ lastSeenAt: -1 });

export default mongoose.model('VisitorSession', visitorSessionSchema);
