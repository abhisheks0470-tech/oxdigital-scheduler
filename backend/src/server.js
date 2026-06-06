const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { load, save, id, hash, now } = require('./store');

const PORT = Number(process.env.PORT || 4100);
const root = path.join(__dirname, '..', '..');
const webRoot = path.join(root, 'web');
const uploadRoot = path.join(__dirname, '..', 'uploads');
const tokenSecret = process.env.JWT_SECRET || 'local-oxdigital-secret';

const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' });
  res.end(JSON.stringify(data));
};

const signToken = (userId) => {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })).toString('base64url');
  const sig = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
};

const verifyToken = (token) => {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
  if (sig !== expected) return null;
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
  return parsed.exp > Date.now() ? parsed.userId : null;
};

const body = (req) => new Promise((resolve) => {
  let raw = '';
  req.on('data', (chunk) => raw += chunk);
  req.on('end', () => {
    try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
  });
});

const publicUser = (user) => {
  const { passwordHash, ...safe } = user;
  return safe;
};

const parseUrl = (req) => new URL(req.url, `http://${req.headers.host}`);
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const dateOnly = (iso) => new Date(iso).toISOString().slice(0, 10);
const money = (v) => Number(v || 0);

function scopedMeetings(db, user) {
  if (user.role === 'admin') return db.meetings;
  if (user.role === 'telecaller') return db.meetings.filter((m) => m.telecallerId === user.id);
  return db.meetings.filter((m) => m.salesmanId === user.id);
}

function enrichMeeting(db, m) {
  const telecaller = db.users.find((u) => u.id === m.telecallerId);
  const salesman = db.users.find((u) => u.id === m.salesmanId);
  return { ...m, telecallerName: telecaller?.name || 'Unknown', salesmanName: salesman?.name || 'Unknown' };
}

function hasSlotConflict(db, salesmanId, meetingAt, excludeId) {
  const start = new Date(meetingAt);
  const blockedStart = new Date(start.getTime() - db.settings.meetingBufferMinutes * 60000);
  const blockedEnd = new Date(start.getTime() + db.settings.meetingBufferMinutes * 60000);
  const active = db.meetings.filter((m) => m.salesmanId === salesmanId && m.id !== excludeId && !['cancelled', 'not-interested', 'wrong-lead'].includes(m.status));
  const conflict = active.find((m) => blockedStart < new Date(m.blockedEnd) && blockedEnd > new Date(m.blockedStart));
  return { conflict, blockedStart: blockedStart.toISOString(), blockedEnd: blockedEnd.toISOString() };
}

function metrics(meetings, db) {
  const today = new Date();
  const saleDone = meetings.filter((m) => m.status === 'sale-done');
  return {
    totalTelecallers: db.users.filter((u) => u.role === 'telecaller').length,
    totalSalesmen: db.users.filter((u) => u.role === 'salesman').length,
    totalMeetings: meetings.length,
    todayMeetings: meetings.filter((m) => sameDay(m.meetingAt, today)).length,
    upcomingMeetings: meetings.filter((m) => new Date(m.meetingAt) >= today && m.status === 'upcoming').length,
    completedMeetings: meetings.filter((m) => m.status === 'completed').length,
    cancelledMeetings: meetings.filter((m) => ['cancelled', 'not-interested'].includes(m.status)).length,
    saleDoneMeetings: saleDone.length,
    followUps: meetings.filter((m) => m.status === 'follow-up').length,
    pendingPayments: saleDone.reduce((sum, m) => sum + money(m.result?.pendingAmount), 0),
    revenue: saleDone.reduce((sum, m) => sum + money(m.result?.totalAmount), 0),
    received: saleDone.reduce((sum, m) => sum + money(m.result?.receivedAmount), 0)
  };
}

function serveStatic(req, res) {
  const url = parseUrl(req);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const candidate = path.normalize(path.join(webRoot, pathname));
  if (!candidate.startsWith(webRoot)) return false;
  if (!fs.existsSync(candidate) || fs.statSync(candidate).isDirectory()) return false;
  const ext = path.extname(candidate).toLowerCase();
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
  fs.createReadStream(candidate).pipe(res);
  return true;
}

async function api(req, res, url) {
  const db = load();
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const userId = verifyToken(token);
  const user = db.users.find((u) => u.id === userId);
  const requireAuth = () => {
    if (!user) json(res, 401, { error: 'Unauthorized' });
    return Boolean(user);
  };

  if (req.method === 'POST' && url.pathname === '/api/login') {
    const input = await body(req);
    const found = db.users.find((u) => u.email.toLowerCase() === String(input.email || '').toLowerCase() && u.passwordHash === hash(input.password || '') && u.status === 'active');
    if (!found) return json(res, 401, { error: 'Invalid login details' });
    return json(res, 200, { token: signToken(found.id), user: publicUser(found) });
  }

  if (!requireAuth()) return;

  if (req.method === 'GET' && url.pathname === '/api/me') return json(res, 200, { user: publicUser(user), settings: db.settings });
  if (req.method === 'GET' && url.pathname === '/api/users') {
    if (user.role !== 'admin') return json(res, 200, { users: db.users.filter((u) => u.status === 'active' && ['salesman', 'telecaller'].includes(u.role)).map(publicUser) });
    return json(res, 200, { users: db.users.map(publicUser) });
  }
  if (req.method === 'POST' && url.pathname === '/api/users') {
    if (user.role !== 'admin') return json(res, 403, { error: 'Admin only' });
    const input = await body(req);
    const next = { id: id('usr'), name: input.name, mobile: input.mobile, email: input.email, passwordHash: hash(input.password || '123456'), role: input.role, status: input.status || 'active', avatar: String(input.name || 'OX').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase() };
    db.users.push(next); save(db);
    return json(res, 201, { user: publicUser(next) });
  }
  if (req.method === 'PUT' && url.pathname.startsWith('/api/users/')) {
    if (user.role !== 'admin') return json(res, 403, { error: 'Admin only' });
    const target = db.users.find((u) => u.id === url.pathname.split('/').pop());
    if (!target) return json(res, 404, { error: 'User not found' });
    const input = await body(req);
    Object.assign(target, { name: input.name ?? target.name, mobile: input.mobile ?? target.mobile, email: input.email ?? target.email, role: input.role ?? target.role, status: input.status ?? target.status });
    if (input.password) target.passwordHash = hash(input.password);
    save(db);
    return json(res, 200, { user: publicUser(target) });
  }

  if (req.method === 'GET' && url.pathname === '/api/dashboard') {
    const meetings = scopedMeetings(db, user);
    return json(res, 200, {
      metrics: metrics(meetings, db),
      meetings: meetings.map((m) => enrichMeeting(db, m)).sort((a, b) => new Date(a.meetingAt) - new Date(b.meetingAt)).slice(0, 12),
      performance: db.users.filter((u) => ['telecaller', 'salesman'].includes(u.role)).map((u) => ({ user: publicUser(u), meetings: db.meetings.filter((m) => m.telecallerId === u.id || m.salesmanId === u.id).length, sales: db.meetings.filter((m) => (m.telecallerId === u.id || m.salesmanId === u.id) && m.status === 'sale-done').length }))
    });
  }

  if (req.method === 'GET' && url.pathname === '/api/meetings') {
    let list = scopedMeetings(db, user);
    const salesmanId = url.searchParams.get('salesmanId');
    const status = url.searchParams.get('status');
    const date = url.searchParams.get('date');
    if (salesmanId) list = list.filter((m) => m.salesmanId === salesmanId);
    if (status) list = list.filter((m) => m.status === status);
    if (date) list = list.filter((m) => dateOnly(m.meetingAt) === date);
    return json(res, 200, { meetings: list.map((m) => enrichMeeting(db, m)) });
  }
  if (req.method === 'POST' && url.pathname === '/api/meetings') {
    if (!['admin', 'telecaller'].includes(user.role)) return json(res, 403, { error: 'Only admin or telecaller can book meetings' });
    const input = await body(req);
    const slot = hasSlotConflict(db, input.salesmanId, input.meetingAt);
    if (slot.conflict) return json(res, 409, { error: 'Slot blocked for this salesman', conflict: enrichMeeting(db, slot.conflict) });
    const meeting = { id: id('mtg'), customerName: input.customerName, mobile: input.mobile, whatsapp: input.whatsapp, businessName: input.businessName, businessCategory: input.businessCategory, address: input.address, mapLocation: input.mapLocation, interestedService: input.interestedService, expectedBudget: money(input.expectedBudget), notes: input.notes || '', meetingAt: input.meetingAt, blockedStart: slot.blockedStart, blockedEnd: slot.blockedEnd, telecallerId: user.role === 'telecaller' ? user.id : input.telecallerId, salesmanId: input.salesmanId, status: 'upcoming', result: null, createdAt: now(), updatedAt: now() };
    db.meetings.push(meeting);
    db.notifications.push({ id: id('ntf'), userId: input.salesmanId, title: 'New meeting assigned', body: `${meeting.customerName} at ${new Date(meeting.meetingAt).toLocaleString()}`, read: false, createdAt: now() });
    save(db);
    return json(res, 201, { meeting: enrichMeeting(db, meeting) });
  }
  if (req.method === 'GET' && url.pathname === '/api/slots') {
    const salesmanId = url.searchParams.get('salesmanId');
    const date = url.searchParams.get('date');
    const slots = [];
    for (let h = 9; h <= 18; h++) {
      const at = new Date(`${date}T${String(h).padStart(2, '0')}:00:00`);
      const conflict = hasSlotConflict(db, salesmanId, at.toISOString()).conflict;
      slots.push({ time: `${String(h).padStart(2, '0')}:00`, meetingAt: at.toISOString(), available: !conflict, status: conflict ? 'blocked' : 'available' });
    }
    return json(res, 200, { slots });
  }
  if (req.method === 'PUT' && url.pathname.match(/^\/api\/meetings\/[^/]+\/result$/)) {
    const meeting = db.meetings.find((m) => m.id === url.pathname.split('/')[3]);
    if (!meeting) return json(res, 404, { error: 'Meeting not found' });
    if (user.role === 'salesman' && meeting.salesmanId !== user.id) return json(res, 403, { error: 'Not assigned to you' });
    const input = await body(req);
    const map = { 'Sale Done': 'sale-done', 'Follow-up Required': 'follow-up', 'Not Interested': 'not-interested', 'Client Not Available': 'client-not-available', 'Wrong Lead': 'wrong-lead', 'Meeting Cancelled': 'cancelled', 'Need Revisit': 'need-revisit', Completed: 'completed' };
    meeting.status = map[input.status] || input.status || meeting.status;
    meeting.result = { ...(meeting.result || {}), ...input };
    meeting.updatedAt = now();
    if (meeting.status === 'sale-done') db.notifications.push({ id: id('ntf'), userId: 'usr_admin', title: 'Sale done alert', body: `${meeting.customerName} marked sale done`, read: false, createdAt: now() });
    save(db);
    return json(res, 200, { meeting: enrichMeeting(db, meeting) });
  }
  if (req.method === 'GET' && url.pathname === '/api/followups') {
    const today = new Date();
    const followups = scopedMeetings(db, user).filter((m) => m.status === 'follow-up').map((m) => enrichMeeting(db, m));
    return json(res, 200, {
      today: followups.filter((m) => m.result?.followUpDate && sameDay(m.result.followUpDate, today)),
      upcoming: followups.filter((m) => !m.result?.followUpDate || new Date(m.result.followUpDate) >= today),
      overdue: followups.filter((m) => m.result?.followUpDate && new Date(m.result.followUpDate) < today)
    });
  }
  if (req.method === 'GET' && url.pathname === '/api/reports') {
    let list = scopedMeetings(db, user);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const telecaller = url.searchParams.get('telecallerId');
    const salesman = url.searchParams.get('salesmanId');
    const status = url.searchParams.get('status');
    const service = url.searchParams.get('service');
    if (from) list = list.filter((m) => dateOnly(m.meetingAt) >= from);
    if (to) list = list.filter((m) => dateOnly(m.meetingAt) <= to);
    if (telecaller) list = list.filter((m) => m.telecallerId === telecaller);
    if (salesman) list = list.filter((m) => m.salesmanId === salesman);
    if (status) list = list.filter((m) => m.status === status);
    if (service) list = list.filter((m) => m.interestedService === service);
    return json(res, 200, { metrics: metrics(list, db), meetings: list.map((m) => enrichMeeting(db, m)) });
  }
  if (req.method === 'POST' && url.pathname === '/api/uploads') {
    const input = await body(req);
    fs.mkdirSync(uploadRoot, { recursive: true });
    const fileName = `${id('proof')}.txt`;
    fs.writeFileSync(path.join(uploadRoot, fileName), input.dataUrl || 'Payment proof placeholder');
    return json(res, 201, { url: `/uploads/${fileName}` });
  }
  if (req.method === 'GET' && url.pathname === '/api/notifications') return json(res, 200, { notifications: db.notifications.filter((n) => n.userId === user.id || user.role === 'admin').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
  if (req.method === 'GET' && url.pathname === '/api/live-locations') {
    if (user.role !== 'admin') return json(res, 403, { error: 'Admin only' });
    return json(res, 200, { salesmen: db.users.filter((u) => u.role === 'salesman').map((u) => publicUser(u)) });
  }
  if (req.method === 'GET' && url.pathname === '/api/settings') return json(res, 200, { settings: db.settings });
  if (req.method === 'PUT' && url.pathname === '/api/settings') {
    if (user.role !== 'admin') return json(res, 403, { error: 'Admin only' });
    Object.assign(db.settings, await body(req)); save(db);
    return json(res, 200, { settings: db.settings });
  }

  json(res, 404, { error: 'Not found' });
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = parseUrl(req);
  if (url.pathname.startsWith('/api/')) return api(req, res, url).catch((err) => json(res, 500, { error: err.message }));
  if (url.pathname.startsWith('/uploads/')) {
    const file = path.normalize(path.join(uploadRoot, url.pathname.replace('/uploads/', '')));
    if (file.startsWith(uploadRoot) && fs.existsSync(file)) return fs.createReadStream(file).pipe(res);
  }
  if (!serveStatic(req, res)) json(res, 404, { error: 'Not found' });
}).listen(PORT, () => {
  console.log(`OxDigital Meeting Scheduler CRM running at http://localhost:${PORT}`);
});
