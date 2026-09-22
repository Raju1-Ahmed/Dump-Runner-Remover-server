import mongoose from 'mongoose';

const pageViewSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  visitorId: { type: String, required: true, index: true },
  pagePath: { type: String, required: true, index: true },
  pageTitle: { type: String, default: 'DUMP RUNNERZ' },
  referrer: { type: String, default: 'Direct' },
  trafficSource: { type: String, default: 'Direct', index: true },
  country: { type: String, default: 'Unknown', index: true },
  deviceType: { type: String, default: 'Desktop', index: true },
  browser: { type: String, default: 'Other', index: true },
  operatingSystem: { type: String, default: 'Other', index: true },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

pageViewSchema.index({ timestamp: -1 });

export default mongoose.model('PageView', pageViewSchema);
