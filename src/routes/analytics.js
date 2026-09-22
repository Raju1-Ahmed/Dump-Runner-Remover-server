import { Router } from 'express';
import geoip from 'geoip-lite';
import VisitorSession from '../models/VisitorSession.js';
import PageView from '../models/PageView.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
const startOfDay = (date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; };
const endOfDay = (date) => { const d = new Date(date); d.setHours(23, 59, 59, 999); return d; };
const parseRange = (query) => {
  const end = query.to ? endOfDay(query.to) : endOfDay(new Date());
  const start = query.from ? startOfDay(query.from) : startOfDay(new Date(Date.now() - 29 * 86400000));
  return { start, end };
};
const pct = (value, total) => total ? Math.round((value / total) * 100) : 0;
const sourceFrom = (referrer, utmSource) => {
  if (utmSource) return 'Campaign';
  if (!referrer || referrer === 'Direct') return 'Direct';
  if (/google|bing|yahoo|duckduckgo/i.test(referrer)) return 'Search';
  if (/facebook|instagram|tiktok|linkedin|twitter|x.com/i.test(referrer)) return 'Social';
  return 'Referral';
};
const countryFromRequest = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '').replace('::ffff:', '');
  if (!ip || ip === '127.0.0.1' || ip === '::1') return 'Unknown';
  const code = geoip.lookup(ip)?.country;
  if (!code) return 'Unknown';
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code; } catch { return code; }
};
const parseUserAgent = (ua = '') => ({
  deviceType: /tablet|ipad/i.test(ua) ? 'Tablet' : /mobile|android|iphone/i.test(ua) ? 'Mobile' : 'Desktop',
  operatingSystem: /windows/i.test(ua) ? 'Windows' : /mac os|macintosh/i.test(ua) ? 'macOS' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ios/i.test(ua) ? 'iOS' : /linux/i.test(ua) ? 'Linux' : 'Other',
  browser: /edg\//i.test(ua) ? 'Edge' : /firefox/i.test(ua) ? 'Firefox' : /safari/i.test(ua) && !/chrome/i.test(ua) ? 'Safari' : /chrome|crios/i.test(ua) ? 'Chrome' : 'Other',
});

router.post('/track', async (req, res) => {
  if (process.env.ANALYTICS_ENABLED === 'false') return res.status(204).end();
  try {
    const { visitorId, sessionId, pagePath = '/', pageTitle = 'DUMP RUNNERZ', referrer = 'Direct', language = 'Unknown', utmSource, utmMedium, utmCampaign } = req.body || {};
    if (!visitorId || !sessionId) return res.status(400).json({ message: 'Analytics identifiers are required.' });
    const parsed = parseUserAgent(req.get('user-agent'));
    const country = countryFromRequest(req);
    const trafficSource = sourceFrom(referrer, utmSource);
    const existingVisitor = await VisitorSession.exists({ visitorId });
    await VisitorSession.findOneAndUpdate({ sessionId }, {
      $set: { lastSeenAt: new Date(), exitPage: pagePath, country, ...parsed, language, referrer, trafficSource, utmSource, utmMedium, utmCampaign, isReturningVisitor: Boolean(existingVisitor) },
      $setOnInsert: { visitorId, sessionId, firstSeenAt: new Date(), landingPage: pagePath },
      $inc: { pageViews: 1 },
    }, { upsert: true, setDefaultsOnInsert: true });
    await PageView.create({ sessionId, visitorId, pagePath, pageTitle, referrer, trafficSource, country, ...parsed, timestamp: new Date() });
    res.status(202).json({ ok: true });
  } catch (error) { console.error('Analytics tracking failed:', error.message); res.status(202).json({ ok: false }); }
});

router.use('/admin', requireAdmin);

router.get('/admin/analytics/overview', async (req, res, next) => {
  try {
    const { start, end } = parseRange(req.query);
    const sessionFilter = { firstSeenAt: { $gte: start, $lte: end } };
    const viewFilter = { timestamp: { $gte: start, $lte: end } };
    const [sessions, views, topPages, devices, browsers, operatingSystems, sources, countries, trend, durationResult] = await Promise.all([
      VisitorSession.countDocuments(sessionFilter),
      PageView.countDocuments(viewFilter),
      PageView.aggregate([{ $match: viewFilter }, { $group: { _id: '$pagePath', views: { $sum: 1 }, visitors: { $addToSet: '$visitorId' } } }, { $project: { _id: 0, page: '$_id', views: 1, uniqueVisitors: { $size: '$visitors' } } }, { $sort: { views: -1 } }, { $limit: 10 }]),
      VisitorSession.aggregate([{ $match: sessionFilter }, { $group: { _id: '$deviceType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      VisitorSession.aggregate([{ $match: sessionFilter }, { $group: { _id: '$browser', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      VisitorSession.aggregate([{ $match: sessionFilter }, { $group: { _id: '$operatingSystem', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      VisitorSession.aggregate([{ $match: sessionFilter }, { $group: { _id: '$trafficSource', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      VisitorSession.aggregate([{ $match: sessionFilter }, { $group: { _id: '$country', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
      PageView.aggregate([{ $match: viewFilter }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, views: { $sum: 1 }, visitors: { $addToSet: '$visitorId' }, sessions: { $addToSet: '$sessionId' } } }, { $project: { _id: 0, date: '$_id', views: 1, visitors: { $size: '$visitors' }, sessions: { $size: '$sessions' } } }, { $sort: { date: 1 } }]),
      VisitorSession.aggregate([{ $match: sessionFilter }, { $project: { duration: { $divide: [{ $subtract: ['$lastSeenAt', '$firstSeenAt'] }, 1000] } } }, { $group: { _id: null, average: { $avg: '$duration' } } }]),
    ]);
    const uniqueVisitors = (await VisitorSession.distinct('visitorId', sessionFilter)).length;
    const newVisitors = sessions - (await VisitorSession.countDocuments({ ...sessionFilter, isReturningVisitor: true }));
    const returningVisitors = sessions - newVisitors;
    res.json({ range: { start, end }, kpis: { totalVisitors: sessions, uniqueVisitors, sessions, pageViews: views, newVisitors, returningVisitors, averageSessionDuration: Math.round(durationResult[0]?.average || 0), pagesPerSession: sessions ? Number((views / sessions).toFixed(1)) : 0 }, topPages, trend, breakdowns: { devices: devices.map((x) => ({ label: x._id || 'Unknown', count: x.count, percentage: pct(x.count, sessions) })), browsers: browsers.map((x) => ({ label: x._id || 'Unknown', count: x.count, percentage: pct(x.count, sessions) })), operatingSystems: operatingSystems.map((x) => ({ label: x._id || 'Unknown', count: x.count, percentage: pct(x.count, sessions) })), sources: sources.map((x) => ({ label: x._id || 'Direct', count: x.count, percentage: pct(x.count, sessions) })), countries: countries.map((x) => ({ label: x._id || 'Unknown', count: x.count, percentage: pct(x.count, sessions) })), newReturning: [{ label: 'New Visitors', count: newVisitors, percentage: pct(newVisitors, sessions) }, { label: 'Returning Visitors', count: returningVisitors, percentage: pct(returningVisitors, sessions) }] } });
  } catch (error) { next(error); }
});

router.get('/admin/analytics/recent-visitors', async (req, res, next) => {
  try { const page = Math.max(Number(req.query.page) || 1, 1); const limit = Math.min(Number(req.query.limit) || 20, 50); const { start, end } = parseRange(req.query); const filter = { lastSeenAt: { $gte: start, $lte: end } }; const [items, total] = await Promise.all([VisitorSession.find(filter).sort({ lastSeenAt: -1 }).skip((page - 1) * limit).limit(limit).select('-_id visitorId lastSeenAt country deviceType browser landingPage pageViews sessionDuration isReturningVisitor').lean(), VisitorSession.countDocuments(filter)]); res.json({ items, page, pages: Math.ceil(total / limit), total }); } catch (error) { next(error); }
});

router.get('/admin/analytics/history', async (req, res, next) => {
  try { const page = Math.max(Number(req.query.page) || 1, 1); const limit = Math.min(Number(req.query.limit) || 30, 100); const { start, end } = parseRange(req.query); const filter = { timestamp: { $gte: start, $lte: end } }; for (const key of ['pagePath', 'country', 'deviceType', 'browser']) if (req.query[key]) filter[key] = req.query[key]; const [items, total] = await Promise.all([PageView.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).select('-_id timestamp pagePath country deviceType browser referrer sessionId').lean(), PageView.countDocuments(filter)]); res.json({ items, page, pages: Math.ceil(total / limit), total }); } catch (error) { next(error); }
});

export default router;
