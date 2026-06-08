const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'db.json');

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
const hash = (password) => crypto.createHash('sha256').update(password).digest('hex');

function todayAt(hour, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysFromToday(days, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function seed() {
  const admin = { id: 'usr_admin', name: 'Abhishek Sir', mobile: '9000000001', email: 'admin@oxdigital.in', passwordHash: hash('123456'), role: 'admin', status: 'active', avatar: 'AS' };
  const telecaller = { id: 'usr_telecaller', name: 'Priya Sharma', mobile: '9000000002', email: 'telecaller@oxdigital.in', passwordHash: hash('123456'), role: 'telecaller', status: 'active', avatar: 'PS' };
  const telecaller2 = { id: 'usr_telecaller2', name: 'Neha Jain', mobile: '9000000005', email: 'neha@oxdigital.in', passwordHash: hash('123456'), role: 'telecaller', status: 'active', avatar: 'NJ' };
  const salesman = { id: 'usr_salesman', name: 'Rahul Kumar', mobile: '9000000003', email: 'salesman@oxdigital.in', passwordHash: hash('123456'), role: 'salesman', status: 'active', avatar: 'RK', currentLocation: { lat: 22.7196, lng: 75.8577, label: 'Vijay Nagar, Indore', updatedAt: now() } };
  const salesman2 = { id: 'usr_salesman2', name: 'Vikram Singh', mobile: '9000000004', email: 'vikram@oxdigital.in', passwordHash: hash('123456'), role: 'salesman', status: 'active', avatar: 'VS', currentLocation: { lat: 22.7533, lng: 75.8937, label: 'Palasia, Indore', updatedAt: now() } };
  const salesman3 = { id: 'usr_salesman3', name: 'Sandeep Yadav', mobile: '9000000006', email: 'sandeep@oxdigital.in', passwordHash: hash('123456'), role: 'salesman', status: 'active', avatar: 'SY', currentLocation: { lat: 22.7075, lng: 75.8408, label: 'MG Road, Indore', updatedAt: now() } };

  const meetings = [
    {
      id: 'mtg_amit', customerName: 'Amit Enterprises', mobile: '9876543210', whatsapp: '9876543210',
      businessName: 'Amit Enterprises', businessCategory: 'PPC Services', address: '123, MG Road, Indore, MP',
      mapLocation: '22.7196,75.8577', interestedService: 'Google Ads', expectedBudget: 25000, notes: 'Interested in premium lead generation.',
      meetingAt: todayAt(10), blockedStart: todayAt(9), blockedEnd: todayAt(11), telecallerId: telecaller.id, salesmanId: salesman.id,
      status: 'upcoming', result: null, createdAt: now(), updatedAt: now()
    },
    {
      id: 'mtg_neha', customerName: 'Neha Store', mobile: '9876500011', whatsapp: '9876500011',
      businessName: 'Neha Store', businessCategory: 'Retail', address: '56 Sapna Sangeeta Road, Indore',
      mapLocation: '22.7243,75.8839', interestedService: 'Social Media Management', expectedBudget: 15000, notes: 'Wants Instagram growth.',
      meetingAt: todayAt(12), blockedStart: todayAt(11), blockedEnd: todayAt(13), telecallerId: telecaller.id, salesmanId: salesman2.id,
      status: 'upcoming', result: null, createdAt: now(), updatedAt: now()
    },
    {
      id: 'mtg_shree', customerName: 'Shree Traders', mobile: '9876500022', whatsapp: '9876500022',
      businessName: 'Shree Traders', businessCategory: 'Distribution', address: 'Rau, Indore',
      mapLocation: '22.6348,75.8116', interestedService: 'Website Development', expectedBudget: 35000, notes: 'Catalog website required.',
      meetingAt: todayAt(15), blockedStart: todayAt(14), blockedEnd: todayAt(16), telecallerId: telecaller.id, salesmanId: salesman3.id,
      status: 'upcoming', result: null, createdAt: now(), updatedAt: now()
    },
    {
      id: 'mtg_khandelwal', customerName: 'Khandelwal Infotech', mobile: '9876500033', whatsapp: '9876500033',
      businessName: 'Khandelwal Infotech', businessCategory: 'IT Services', address: 'AB Road, Indore',
      mapLocation: '22.745,75.892', interestedService: 'Complete Digital Marketing', expectedBudget: 75000, notes: 'Full funnel campaign.',
      meetingAt: todayAt(16), blockedStart: todayAt(15), blockedEnd: todayAt(17), telecallerId: telecaller2.id, salesmanId: salesman.id,
      status: 'follow-up', result: { followUpDate: daysFromToday(1, 11), reason: 'Partner approval pending', expectedClosingAmount: 65000, notes: 'Call owner tomorrow.' }, createdAt: now(), updatedAt: now()
    },
    {
      id: 'mtg_completed', customerName: 'Orbit Classes', mobile: '9876500044', whatsapp: '9876500044',
      businessName: 'Orbit Classes', businessCategory: 'Education', address: 'Bhawarkua, Indore',
      mapLocation: '22.692,75.868', interestedService: 'Facebook/Instagram Ads', expectedBudget: 18000, notes: 'Trial campaign.',
      meetingAt: daysFromToday(-1, 11), blockedStart: daysFromToday(-1, 10), blockedEnd: daysFromToday(-1, 12), telecallerId: telecaller.id, salesmanId: salesman.id,
      status: 'sale-done', result: { packageName: 'Starter Growth', serviceSold: 'Facebook/Instagram Ads', totalAmount: 25000, receivedAmount: 15000, pendingAmount: 10000, paymentMode: 'UPI', upiTransactionId: 'UPI1234567890', onboardingNotes: 'Creative brief received.' }, createdAt: now(), updatedAt: now()
    }
  ];

  return {
    users: [admin, telecaller, telecaller2, salesman, salesman2, salesman3],
    meetings,
    callLogs: [],
    notifications: [
      { id: id('ntf'), userId: salesman.id, title: 'New meeting assigned', body: 'Amit Enterprises at 10:00 AM', read: false, createdAt: now() },
      { id: id('ntf'), userId: admin.id, title: 'Sale done alert', body: 'Orbit Classes closed for Rs. 25,000', read: false, createdAt: now() }
    ],
    settings: {
      companyName: 'OxDigital',
      workingHours: { start: '09:00', end: '19:00' },
      meetingBufferMinutes: 60,
      services: ['Google Ads', 'Facebook/Instagram Ads', 'Website Development', 'Social Media Management', 'Google Business Profile', 'Complete Digital Marketing'],
      paymentModes: ['Cash', 'UPI', 'Cheque', 'Bank Transfer'],
      brandingLogo: '/assets/oxdigital-logo.svg'
    }
  };
}

function ensureDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) save(seed());
}

function load() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  db.callLogs ||= [];
  return db;
}

function save(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
}

module.exports = { load, save, id, hash, now };
