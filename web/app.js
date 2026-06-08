const BASE = window.location.pathname.startsWith('/scheduler') ? '/scheduler' : '';
const API = BASE;
const assetBase = BASE || '.';
const logo = `${assetBase}/assets/oxdigital-logo.svg`;
const DEMO_MODE = window.location.protocol === 'file:' || new URLSearchParams(window.location.search).get('demo') === '1';
const services = ['Google Ads', 'Facebook/Instagram Ads', 'Website Development', 'Social Media Management', 'Google Business Profile', 'Complete Digital Marketing'];
const statusLabels = { 'upcoming': 'Upcoming', 'completed': 'Completed', 'sale-done': 'Sale Done', 'follow-up': 'Follow-up', 'cancelled': 'Cancelled', 'not-interested': 'Not Interested', 'wrong-lead': 'Wrong Lead', 'client-not-available': 'Client Not Available', 'need-revisit': 'Need Revisit' };
const state = { token: localStorage.oxToken || '', user: null, settings: null, dashboard: null, meetings: [], users: [], selectedRole: 'telecaller', booking: { step: 1 }, view: 'dashboard', calendarDate: new Date(), report: { from: '', to: '', telecallerId: '', salesmanId: '', status: '', service: '' } };
window.state = state;
let syncTimer = null;
let lastVersion = 0;

const $ = (s) => document.querySelector(s);
const app = $('#app');
const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
const todayValue = () => new Date().toISOString().slice(0, 10);
const rupee = (n) => Number(n || 0).toLocaleString('en-IN');
const esc = (v = '') => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const telUrl = (phone = '') => `tel:${String(phone).replace(/[^\d+]/g, '')}`;
const waUrl = (phone = '') => `https://wa.me/91${String(phone).replace(/\D/g, '').slice(-10)}`;
const mapUrl = (value = '') => {
  const v = String(value || '').trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v || 'Indore')}`;
};

function icon(name) {
  const map = { menu:'☰', back:'‹', bell:'●', home:'⌂', cal:'□', users:'♙', report:'▤', gear:'⚙', plus:'+', call:'☎', wa:'◉', nav:'➤', user:'◌', close:'×' };
  return map[name] || name;
}
function toast(message) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = message; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
async function request(path, options = {}) {
  if (DEMO_MODE) return demoRequest(path, options);
  const res = await fetch(API + path, { ...options, headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
const demoDb = {
  users: [
    { id: 'usr_admin', name: 'Abhishek Sir', mobile: '9000000001', email: 'admin@oxdigital.in', role: 'admin', status: 'active', avatar: 'AS' },
    { id: 'usr_telecaller', name: 'Priya Sharma', mobile: '9000000002', email: 'telecaller@oxdigital.in', role: 'telecaller', status: 'active', avatar: 'PS' },
    { id: 'usr_salesman', name: 'Rahul Kumar', mobile: '9000000003', email: 'salesman@oxdigital.in', role: 'salesman', status: 'active', avatar: 'RK', currentLocation: { lat: 22.7196, lng: 75.8577, label: 'Vijay Nagar, Indore', updatedAt: new Date().toISOString() } },
    { id: 'usr_salesman2', name: 'Vikram Singh', mobile: '9000000004', email: 'vikram@oxdigital.in', role: 'salesman', status: 'active', avatar: 'VS', currentLocation: { lat: 22.7533, lng: 75.8937, label: 'Palasia, Indore', updatedAt: new Date().toISOString() } }
  ],
  meetings: [],
  notifications: [],
  settings: { companyName: 'OxDigital', workingHours: { start: '09:00', end: '19:00' }, meetingBufferMinutes: 60 }
};
function demoInit() {
  if (demoDb.meetings.length) return;
  const makeMeeting = (id, customerName, hour, status, salesmanId, result = null) => {
    const at = new Date(); at.setHours(hour, 0, 0, 0);
    return { id, customerName, mobile: '9876543210', whatsapp: '9876543210', businessName: customerName, businessCategory: 'Digital Marketing', address: '123, MG Road, Indore, MP', mapLocation: '22.7196,75.8577', interestedService: 'Google Ads', expectedBudget: 25000, notes: 'Demo lead for website testing.', meetingAt: at.toISOString(), blockedStart: new Date(at.getTime() - 3600000).toISOString(), blockedEnd: new Date(at.getTime() + 3600000).toISOString(), telecallerId: 'usr_telecaller', salesmanId, status, result, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), telecallerName: 'Priya Sharma', salesmanName: salesmanId === 'usr_salesman' ? 'Rahul Kumar' : 'Vikram Singh' };
  };
  demoDb.meetings.push(
    makeMeeting('mtg_amit', 'Amit Enterprises', 10, 'upcoming', 'usr_salesman'),
    makeMeeting('mtg_neha', 'Neha Store', 12, 'upcoming', 'usr_salesman2'),
    makeMeeting('mtg_shree', 'Shree Traders', 15, 'follow-up', 'usr_salesman', { followUpDate: new Date().toISOString(), reason: 'Owner approval pending', expectedClosingAmount: 25000 }),
    makeMeeting('mtg_orbit', 'Orbit Classes', 16, 'sale-done', 'usr_salesman2', { totalAmount: 25000, receivedAmount: 15000, pendingAmount: 10000 })
  );
  demoDb.notifications.push({ id: 'ntf_1', userId: 'usr_admin', title: 'Demo mode active', body: 'All website pages work locally. Host backend for live sync.', read: false, createdAt: new Date().toISOString() });
}
function demoUser() {
  return demoDb.users.find(u => u.id === state.user?.id) || demoDb.users.find(u => u.id === localStorage.oxDemoUser) || demoDb.users[1];
}
function demoScopedMeetings(user = demoUser()) {
  if (user.role === 'admin') return demoDb.meetings;
  if (user.role === 'telecaller') return demoDb.meetings.filter(m => m.telecallerId === user.id);
  return demoDb.meetings.filter(m => m.salesmanId === user.id);
}
function demoMetrics(list) {
  const sale = list.filter(m => m.status === 'sale-done');
  return { totalTelecallers: demoDb.users.filter(u => u.role === 'telecaller').length, totalSalesmen: demoDb.users.filter(u => u.role === 'salesman').length, totalMeetings: list.length, todayMeetings: list.length, upcomingMeetings: list.filter(m => m.status === 'upcoming').length, completedMeetings: list.filter(m => m.status === 'completed').length, cancelledMeetings: list.filter(m => ['cancelled','not-interested'].includes(m.status)).length, saleDoneMeetings: sale.length, followUps: list.filter(m => m.status === 'follow-up').length, pendingPayments: sale.reduce((s,m)=>s+Number(m.result?.pendingAmount||0),0), revenue: sale.reduce((s,m)=>s+Number(m.result?.totalAmount||0),0), received: sale.reduce((s,m)=>s+Number(m.result?.receivedAmount||0),0) };
}
function demoSyncPayload() {
  const user = demoUser();
  const meetings = demoScopedMeetings(user);
  return { version: Date.now(), user, settings: demoDb.settings, metrics: demoMetrics(meetings), meetings, users: user.role === 'admin' ? demoDb.users : demoDb.users.filter(u => ['salesman','telecaller'].includes(u.role)), notifications: demoDb.notifications };
}
async function demoRequest(path, options = {}) {
  demoInit();
  const method = options.method || 'GET';
  const input = options.body ? JSON.parse(options.body) : {};
  if (path === '/api/login' && method === 'POST') {
    const user = demoDb.users.find(u => u.email.toLowerCase() === String(input.email || '').toLowerCase());
    if (!user || input.password !== '123456') throw new Error('Invalid login details');
    localStorage.oxDemoUser = user.id;
    return { token: `demo-${user.id}`, user };
  }
  if (path === '/api/me') return { user: demoUser(), settings: demoDb.settings };
  if (path === '/api/sync') return demoSyncPayload();
  if (path === '/api/dashboard') {
    const meetings = demoScopedMeetings();
    return { metrics: demoMetrics(meetings), meetings, performance: demoDb.users.filter(u => ['telecaller','salesman'].includes(u.role)).map(u => ({ user: u, meetings: demoDb.meetings.filter(m => m.telecallerId === u.id || m.salesmanId === u.id).length, sales: demoDb.meetings.filter(m => (m.telecallerId === u.id || m.salesmanId === u.id) && m.status === 'sale-done').length })) };
  }
  if (path.startsWith('/api/meetings') && method === 'GET') return { meetings: demoScopedMeetings() };
  if (path === '/api/users' && method === 'GET') return { users: demoSyncPayload().users };
  if (path === '/api/users' && method === 'POST') {
    const user = { id: `usr_${Date.now()}`, avatar: String(input.name || 'OX').split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase(), status: 'active', ...input };
    demoDb.users.push(user); return { user };
  }
  if (path.startsWith('/api/users/') && method === 'PUT') {
    const id = path.split('/').pop(); const user = demoDb.users.find(u => u.id === id); Object.assign(user, input); return { user };
  }
  if (path === '/api/meetings' && method === 'POST') {
    const salesman = demoDb.users.find(u => u.id === input.salesmanId);
    const meetingAt = input.meetingAt || new Date().toISOString();
    const m = { id: `mtg_${Date.now()}`, status: 'upcoming', telecallerId: demoUser().id, telecallerName: demoUser().name, salesmanName: salesman?.name || 'Salesman', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), blockedStart: new Date(new Date(meetingAt).getTime() - 3600000).toISOString(), blockedEnd: new Date(new Date(meetingAt).getTime() + 3600000).toISOString(), ...input };
    demoDb.meetings.push(m); return { meeting: m };
  }
  if (path.startsWith('/api/slots')) {
    return { slots: Array.from({ length: 10 }, (_, i) => { const h = i + 9; const at = new Date(); at.setHours(h,0,0,0); const blocked = [10,11,12,15].includes(h); return { time: `${String(h).padStart(2,'0')}:00`, meetingAt: at.toISOString(), available: !blocked, status: blocked ? 'blocked' : 'available' }; }) };
  }
  if (path === '/api/uploads' && method === 'POST') {
    return { url: `demo-payment-proof-${Date.now()}.jpg` };
  }
  if (path.match(/^\/api\/meetings\/[^/]+\/result$/) && method === 'PUT') {
    const m = demoDb.meetings.find(x => x.id === path.split('/')[3]); if (m) { m.status = input.status === 'Sale Done' ? 'sale-done' : input.status === 'Follow-up Required' ? 'follow-up' : 'completed'; m.result = input; m.updatedAt = new Date().toISOString(); } return { meeting: m };
  }
  if (path === '/api/followups') {
    const list = demoScopedMeetings().filter(m => m.status === 'follow-up');
    return { today: list, upcoming: list, overdue: [] };
  }
  if (path === '/api/live-locations') return { salesmen: demoDb.users.filter(u => u.role === 'salesman') };
  if (path === '/api/settings') return { settings: demoDb.settings };
  return {};
}
function statusBadge(status) {
  const cls = status === 'sale-done' ? 'purple' : status === 'completed' ? 'green' : ['cancelled','not-interested','wrong-lead'].includes(status) ? 'red' : status === 'follow-up' ? 'yellow' : '';
  return `<span class="badge ${cls}">${statusLabels[status] || status}</span>`;
}
function phone(content, nav = true, cls = '') {
  return `<div class="phone active-screen ${cls}">${content}${nav && state.user ? bottomNav() : ''}</div>`;
}
function bottomNav() {
  const items = navItems();
  return `<nav class="bottom-nav">${items.map(([v,i,l]) => `<button class="${state.view === v ? 'active' : ''}" onclick="go('${v}')"><b>${icon(i)}</b><span>${l}</span></button>`).join('')}</nav>`;
}
function navItems() {
  if (state.user.role === 'admin') return [['dashboard','home','Dashboard'],['calendar','cal','Calendar'],['users','users','Users'],['reports','report','Reports'],['settings','gear','Settings']];
  if (state.user.role === 'telecaller') return [['dashboard','home','Dashboard'],['calendar','cal','Meetings'],['booking','plus','Book'],['followups','report','Follow-ups'],['profile','user','Profile']];
  return [['dashboard','home','Dashboard'],['calendar','cal','Calendar'],['meeting','plus','Update'],['followups','report','Follow-ups'],['profile','user','Profile']];
}
function header(title = '', back = false) {
  if (title) return `<div class="topbar">${back ? `<button class="icon-btn" onclick="go('dashboard')">${icon('back')}</button>` : `<button class="icon-btn">${icon('menu')}</button>`}<span style="flex:1;text-align:center">${title}</span></div>`;
  return `<div class="header"><div class="brand"><img src="${logo}" alt="OxDigital"></div><button class="icon-btn" onclick="logout()">${icon('gear')}</button></div>`;
}
function login() {
  app.innerHTML = `<div class="shell">${phone(`<div class="screen">
    <img class="login-logo" src="${logo}" alt="OxDigital">
    <h2 style="text-align:center;margin:0">Welcome Back!</h2>
    <p class="subtitle" style="text-align:center">Login to your account</p>
    <div class="seg">${['telecaller','salesman','admin'].map(r => `<button class="${state.selectedRole===r?'active':''}" onclick="state.selectedRole='${r}';login()">${r[0].toUpperCase()+r.slice(1)}</button>`).join('')}</div>
    <form onsubmit="doLogin(event)">
      <div class="field"><label>Mobile Number / Email</label><input class="input" name="email" value="${state.selectedRole}@oxdigital.in" placeholder="Enter mobile number or email"></div>
      <div class="field"><label>Password</label><input class="input" name="password" type="password" value="123456" placeholder="Enter your password"></div>
      <div class="actions" style="justify-content:space-between;margin:12px 0 18px"><label class="mini"><input type="checkbox"> Remember Me</label><a class="mini" style="color:var(--blue)">Forgot Password?</a></div>
      <button class="btn">Login</button>
    </form>
    <p class="subtitle" style="text-align:center;margin-top:56px">Powered by <b>OxDigital</b></p>
  </div>`, false, 'single')}</div>`;
}
async function doLogin(e) {
  e.preventDefault();
  try {
    const data = await request('/api/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
    state.token = data.token; state.user = data.user; localStorage.oxToken = data.token;
    await bootstrap();
  } catch (err) { toast(err.message); }
}
function logout() { localStorage.removeItem('oxToken'); Object.assign(state, { token:'', user:null, view:'dashboard' }); login(); }
async function bootstrap() {
  try {
    const me = await request('/api/me'); state.user = me.user; state.settings = me.settings;
    await syncNow(false);
    startSync();
    render();
  } catch { logout(); }
}
async function loadDashboard() { state.dashboard = await request('/api/dashboard'); }
async function loadMeetings(query = '') { state.meetings = (await request('/api/meetings' + query)).meetings; }
async function loadUsers() { state.users = (await request('/api/users')).users; }
function startSync() {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => syncNow(true), 5000);
}
async function syncNow(quiet = true) {
  if (!state.token) return;
  try {
    const data = await request('/api/sync');
    const changed = data.version !== lastVersion;
    lastVersion = data.version;
    state.user = data.user;
    state.settings = data.settings;
    state.dashboard = { metrics: data.metrics, meetings: data.meetings.slice(0, 12), performance: state.dashboard?.performance || [] };
    state.meetings = data.meetings;
    state.users = data.users;
    if (changed && quiet && !$('.modal')) render();
  } catch (err) {
    if (!quiet) throw err;
  }
}
function go(view) { state.view = view; if (view === 'booking') state.booking = { step: 1, date: todayValue() }; render(); }
function render() {
  if (!state.user) return login();
  if (isDesktop()) return renderDesktop();
  if (state.view === 'booking') return renderBooking();
  if (state.view === 'calendar') return renderCalendar();
  if (state.view === 'users') return renderUsers();
  if (state.view === 'reports') return renderReports();
  if (state.view === 'settings') return renderSettings();
  if (state.view === 'followups') return renderFollowups();
  if (state.view === 'profile') return renderProfile();
  return state.user.role === 'admin' ? renderAdmin() : state.user.role === 'telecaller' ? renderTelecaller() : renderSalesman();
}
function isDesktop() { return window.matchMedia('(min-width: 900px)').matches; }
function desktopShell(title, content, actions = '') {
  const items = navItems();
  app.innerHTML = `<div class="desktop-app">
    <aside class="desktop-sidebar">
      <div class="desktop-brand"><img src="${logo}" alt="OxDigital"><strong>OxDigital CRM</strong></div>
      <nav>${items.map(([v,i,l]) => `<button class="${state.view === v ? 'active' : ''}" onclick="go('${v}')"><b>${icon(i)}</b><span>${l}</span></button>`).join('')}</nav>
      <div class="desktop-user"><div class="avatar">${state.user.avatar}</div><div><b>${state.user.name}</b><span>${state.user.role}</span></div></div>
    </aside>
    <main class="desktop-main">
      <header class="desktop-header"><div><p>${new Date().toLocaleDateString([], { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p><h1>${title}</h1></div><div class="actions">${actions}<button class="icon-btn" onclick="logout()">${icon('gear')}</button></div></header>
      ${content}
    </main>
  </div>`;
}
function renderDesktop() {
  if (state.view === 'calendar') return desktopShell('Calendar', desktopCalendar());
  if (state.view === 'users') return desktopShell('User Management', desktopUsers(), `<button class="btn small green" onclick="userModal()">+ Add User</button>`);
  if (state.view === 'reports') return desktopShell('Reports', desktopReports(), `<button class="btn small" onclick="downloadReport()">Download Report</button>`);
  if (state.view === 'settings' || state.view === 'profile') return renderDesktopSettings();
  if (state.view === 'followups') return renderDesktopFollowups();
  if (state.view === 'booking') return renderDesktopBooking();
  return desktopShell(`${state.user.role === 'admin' ? 'Admin' : state.user.role === 'telecaller' ? 'Telecaller' : 'Salesman'} Dashboard`, desktopDashboard(), state.user.role === 'telecaller' ? `<button class="btn small green" onclick="go('booking')">+ Book New Meeting</button>` : '');
}
function desktopDashboard() {
  const m = state.dashboard.metrics;
  const metrics = state.user.role === 'admin'
    ? [['Today Meetings',m.todayMeetings],['Upcoming',m.upcomingMeetings,'green'],['Completed',m.completedMeetings,'green'],['Sale Done',m.saleDoneMeetings,'purple'],['Follow-ups',m.followUps,'yellow'],['Pending Payments',rupee(m.pendingPayments),'red'],['Revenue',rupee(m.revenue),'green'],['Telecallers',m.totalTelecallers],['Salesmen',m.totalSalesmen]]
    : state.user.role === 'telecaller'
      ? [['Today Booked',m.todayMeetings],['Upcoming',m.upcomingMeetings,'green'],['Follow-ups',m.followUps,'yellow'],['Sale Done',m.saleDoneMeetings,'purple'],['Cancelled',m.cancelledMeetings,'red'],['Pending Payments',rupee(m.pendingPayments),'red']]
      : [['Today Meetings',m.todayMeetings],['Upcoming',m.upcomingMeetings,'green'],['Completed',m.completedMeetings,'green'],['Pending',m.upcomingMeetings,'yellow'],['Sale Done',m.saleDoneMeetings,'purple'],['Follow-ups',m.followUps,'yellow']];
  const timeline = state.user.role === 'admin' && (state.report.from || state.report.to || state.report.status || state.report.service || state.report.salesmanId || state.report.telecallerId)
    ? filteredReportMeetings()
    : (state.dashboard.meetings || state.meetings);
  return `<section class="desktop-metrics">${metrics.map(([l,v,c]) => stat(l,v,c || '')).join('')}</section>
    ${state.user.role === 'admin' ? `<section class="desktop-panel"><div class="desktop-panel-head"><h2>Timeline Filters</h2><button class="btn small ghost" onclick="go('reports')">Advanced Reports</button></div>${reportFilters()}</section>` : ''}
    <section class="desktop-panel"><div class="desktop-panel-head"><h2>${state.user.role === 'salesman' ? "Today's Assigned Meetings" : "Meeting Timeline"}</h2><button class="btn small ghost" onclick="go('calendar')">View All</button></div>${desktopMeetingTable(timeline)}</section>`;
}
function desktopMeetingTable(meetings) {
  return `<div class="desktop-table"><div class="desktop-table-head"><span>Time</span><span>Customer</span><span>Service</span><span>Salesman</span><span>Status</span></div>${meetings.map(m => `<button class="desktop-table-row" onclick="openMeeting('${m.id}')"><span>${fmtTime(m.meetingAt)}</span><span><b>${m.customerName}</b><small>${m.mobile}</small></span><span>${m.interestedService}</span><span>${m.salesmanName || '-'}</span><span>${statusBadge(m.status)}</span></button>`).join('') || '<p class="subtitle">No records found.</p>'}</div>`;
}
function desktopCalendar() {
  const days = calendarDays();
  return `<div class="desktop-two"><section class="desktop-panel"><div class="desktop-panel-head"><h2><button class="icon-btn" onclick="shiftCalendar(-1)">‹</button> ${state.calendarDate.toLocaleDateString([], {month:'long',year:'numeric'})} <button class="icon-btn" onclick="shiftCalendar(1)">›</button></h2><div class="seg desktop-seg"><button>Day</button><button>Week</button><button class="active">Month</button></div></div><div class="calendar"><div class="cal-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<b>${d}</b>`).join('')}${days.map(d=>`<span class="cal-day ${d && d===new Date().getDate() && state.calendarDate.getMonth()===new Date().getMonth()?'active':''} ${d && state.meetings.some(m=>new Date(m.meetingAt).getDate()===d && new Date(m.meetingAt).getMonth()===state.calendarDate.getMonth())?'has':''}">${d}</span>`).join('')}</div></div><div class="legend"><span><i class="dot"></i>Upcoming</span><span><i class="dot green"></i>Completed</span><span><i class="dot purple"></i>Sale Done</span><span><i class="dot yellow"></i>Follow-up</span><span><i class="dot red"></i>Cancelled</span></div></section><section class="desktop-panel"><div class="desktop-panel-head"><h2>Date-wise Meetings</h2></div>${desktopMeetingTable(state.meetings)}</section></div>`;
}
function desktopUsers() {
  return `<section class="desktop-panel">${state.users.map(u => `<div class="row-card desktop-user-row"><div class="avatar">${u.avatar}</div><div><b>${u.name}</b><p class="subtitle">${u.email}<br>${u.mobile || ''}</p></div><span class="badge">${u.role}</span><span class="badge ${u.status === 'active' ? 'green' : 'red'}">${u.status}</span><button class="btn small ghost" onclick="userModal('${u.id}')">Edit</button></div>`).join('')}</section>`;
}
function desktopReports() {
  const list = filteredReportMeetings();
  const m = reportMetricsFor(list);
  return `<div class="desktop-two"><section class="desktop-panel">${reportFilters()}</section><section class="desktop-panel">${reportStats(m)}</section></div><section class="desktop-panel"><div class="desktop-panel-head"><h2>Filtered Timeline</h2><button class="btn small" onclick="downloadReport()">Download Report</button></div>${desktopMeetingTable(list)}</section>`;
}
async function renderDesktopFollowups() {
  const f = await request('/api/followups');
  desktopShell('Follow-ups', `<section class="desktop-metrics">${stat('Today', f.today.length)}${stat('Upcoming', f.upcoming.length, 'green')}${stat('Overdue', f.overdue.length, 'red')}</section><section class="desktop-panel">${desktopMeetingTable([...f.today,...f.upcoming,...f.overdue])}</section>`);
}
async function renderDesktopSettings() {
  const loc = await request('/api/live-locations').catch(()=>({salesmen:[]}));
  desktopShell(state.user.role === 'admin' ? 'Settings' : 'Profile', `<div class="desktop-two"><section class="desktop-panel"><img src="${logo}" style="height:54px"><div class="field"><label>Company Name</label><input class="input" value="${state.settings.companyName}"></div><div class="field"><label>Working Hours</label><input class="input" value="${state.settings.workingHours.start} - ${state.settings.workingHours.end}"></div><div class="field"><label>Meeting Buffer Time</label><input class="input" value="${state.settings.meetingBufferMinutes} minutes"></div></section><section class="desktop-panel"><div class="desktop-panel-head"><h2>Live Location</h2></div><div class="map">${loc.salesmen.map((s,i)=>`<div class="pin" style="--x:${25+i*18}%;--y:${35+i*9}%"><div class="avatar">${s.avatar}</div></div>`).join('')}</div></section></div>`);
}
async function renderDesktopBooking() {
  const b = state.booking;
  if (!b.date) b.date = todayValue();
  desktopShell('Book New Meeting', `<section class="desktop-panel desktop-booking"><div class="stepper">${[1,2,3,4].map(n => `<span class="${b.step===n?'active':''}">${n}</span>`).join('')}</div>${bookingStep()}</section>`);
  if (b.step === 3 && b.salesmanId && b.date) await loadSlots();
}
function renderAdmin() {
  const m = state.dashboard.metrics;
  app.innerHTML = `<div class="shell"><div class="phone-grid">${phone(`<div class="screen">${header()}
    <p class="subtitle">Good Morning,</p><h1 class="title">${state.user.name}</h1><p class="subtitle">${new Date().toLocaleDateString([], { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
    <div class="stats" style="margin-top:18px">${stat('Today Meetings', m.todayMeetings)}${stat('Upcoming', m.upcomingMeetings, 'green')}${stat('Completed', m.completedMeetings, 'green')}${stat('Sales Done', m.saleDoneMeetings, 'red')}${stat('Follow-ups', m.followUps, 'yellow')}${stat('Pending Payments', rupee(m.pendingPayments), 'red')}</div>
    ${meetingList("Today's Meeting Timeline", state.dashboard.meetings.slice(0,5))}
  </div>`)}${phone(`<div class="screen">${header('Reports')}
    ${reportFilters()}${reportStats(m)}
    <button class="btn" onclick="downloadReport()">Download Report</button>
    <div class="section-title">Performance</div>${state.dashboard.performance.map(p => `<div class="row-card"><div class="avatar">${p.user.avatar}</div><div><b>${p.user.name}</b><p class="subtitle">${p.user.role}</p></div><span class="badge green">${p.sales}/${p.meetings}</span></div>`).join('')}
  </div>`)}</div></div>`;
}
function renderTelecaller() {
  const m = state.dashboard.metrics;
  app.innerHTML = `<div class="shell">${phone(`<div class="screen">${header()}
    <div class="row-card" style="grid-template-columns:auto 1fr"><div class="avatar">${state.user.avatar}</div><div><b>Hello, ${state.user.name.split(' ')[0]}</b><p class="subtitle">Telecaller</p></div></div>
    <div class="stats" style="margin-top:16px">${stat('Today Booked', m.todayMeetings)}${stat('Follow-ups', m.followUps, 'yellow')}${stat('Sale Done', m.saleDoneMeetings, 'green')}${stat('Cancelled', m.cancelledMeetings, 'red')}</div>
    <button class="btn green" style="margin-top:16px" onclick="go('booking')">+ Book New Meeting</button>
    ${meetingList('My Today Meetings', state.dashboard.meetings.slice(0,5))}
  </div>`)}</div>`;
}
function renderSalesman() {
  const m = state.dashboard.metrics;
  app.innerHTML = `<div class="shell">${phone(`<div class="screen">${header()}
    <div class="row-card" style="grid-template-columns:auto 1fr"><div class="avatar">${state.user.avatar}</div><div><b>Hello, ${state.user.name.split(' ')[0]}</b><p class="subtitle">Salesman</p></div></div>
    <div class="stats" style="grid-template-columns:repeat(3,1fr);margin-top:16px">${stat('Total Meetings', m.totalMeetings)}${stat('Completed', m.completedMeetings, 'green')}${stat('Pending', m.upcomingMeetings, 'red')}</div>
    ${meetingList("Today's Meetings", state.dashboard.meetings, true)}
  </div>`)}</div>`;
}
function stat(label, value, cls = '') { return `<div class="stat ${cls}"><b>${value}</b><span>${label}</span></div>`; }
function meetingList(title, meetings, actions = false) {
  return `<div class="section-title"><span>${title}</span><a onclick="go('calendar')">View All</a></div><div class="list">${meetings.map(m => `<div class="row-card" onclick="openMeeting('${m.id}')"><div class="meeting-time">${fmtTime(m.meetingAt)}</div><div><b>${m.customerName}</b><p class="subtitle">${m.interestedService}<br>${m.salesmanName}</p>${actions ? `<div class="actions" onclick="event.stopPropagation()"><a class="btn small ghost" href="${telUrl(m.mobile)}">☎ Call</a><a class="btn small ghost" target="_blank" href="${waUrl(m.whatsapp || m.mobile)}">◉ WhatsApp</a><a class="btn small green" target="_blank" href="${mapUrl(m.mapLocation || m.address)}">➤ Navigate</a></div>` : ''}</div>${statusBadge(m.status)}</div>`).join('') || '<p class="subtitle">No meetings yet.</p>'}</div>`;
}
async function renderBooking() {
  const b = state.booking;
  if (!b.date) b.date = todayValue();
  app.innerHTML = `<div class="shell">${phone(`${header('Book New Meeting', true)}<div class="screen"><div class="stepper">${[1,2,3,4].map(n => `<span class="${b.step===n?'active':''}">${n}</span>`).join('')}</div>${bookingStep()}</div>`, false, 'single')}</div>`;
  if (b.step === 3 && b.salesmanId && b.date) await loadSlots();
}
function bookingStep() {
  const b = state.booking;
  const salesmen = state.users.length ? state.users.filter(u => u.role === 'salesman' && u.status === 'active') : [];
  if (b.step === 1) return `<h3>Select Salesman</h3><input class="input" placeholder="Search salesman by name">${salesmen.map(s => `<div class="row-card" onclick="bSet({salesmanId:'${s.id}',salesmanName:'${s.name}',step:2})"><div class="avatar">${s.avatar}</div><div><b>${s.name}</b><p class="subtitle"><span class="dot green"></span>Available</p></div><span>›</span></div>`).join('')}`;
  if (b.step === 2) return `<h3>Select Date</h3><div class="calendar"><div class="cal-head"><button class="icon-btn" onclick="shiftBookingDate(-1)">‹</button><span>${new Date(b.date).toLocaleDateString([], { month:'long', year:'numeric' })}</span><button class="icon-btn" onclick="shiftBookingDate(1)">›</button></div><div class="field"><label>Meeting Date</label><input class="input" type="date" value="${b.date}" onchange="bSet({date:this.value})"></div></div><button class="btn" style="margin-top:18px" onclick="bSet({step:3})">Next</button>`;
  if (b.step === 3) return `<h3>Select Time Slot</h3><p class="subtitle">${fmtDate(b.date)}</p><div id="slots" class="slot-grid"><p class="subtitle">Loading slots...</p></div><div class="legend"><span><i class="dot green"></i>Available</span><span><i class="dot grey"></i>Blocked</span><span><i class="dot red"></i>Booked</span></div><button class="btn" style="margin-top:18px" onclick="${b.meetingAt ? 'bSet({step:4})' : 'toast(`Select a time slot first`)'}">Next</button>`;
  return `<h3>Customer Details</h3><form onsubmit="saveMeeting(event)">
    ${field('Customer Name','customerName','')}${field('Mobile Number','mobile','')}${field('WhatsApp Number','whatsapp','')}${field('Business Name','businessName','')}
    <div class="field"><label>Business Category <span class="muted">(optional)</span></label><input class="input" name="businessCategory" placeholder="Optional"></div>
    ${field('Full Address','address','')}${field('Google Map / Google Business Profile Link','mapLocation','', true, 'Paste Google Maps link, GBP listing link, or coordinates')}
    <div class="field"><label>Interested Service</label><select class="select" name="interestedService">${services.map(s=>`<option>${s}</option>`)}</select></div>
    ${field('Expected Budget','expectedBudget','')}<div class="field"><label>Notes</label><textarea name="notes" placeholder="Add notes"></textarea></div>
    <button class="btn green">Schedule Meeting</button></form>`;
}
function field(label, name, value = '', required = true, placeholder = '') { return `<div class="field"><label>${label}</label><input class="input" name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}></div>`; }
function bSet(patch) { Object.assign(state.booking, patch); renderBooking(); }
function shiftBookingDate(monthDelta) {
  const d = new Date(state.booking.date || todayValue());
  d.setMonth(d.getMonth() + monthDelta);
  bSet({ date: d.toISOString().slice(0, 10) });
}
async function loadSlots() {
  const data = await request(`/api/slots?salesmanId=${state.booking.salesmanId}&date=${state.booking.date}`);
  const slots = $('#slots');
  slots.innerHTML = data.slots.map(s => `<button class="slot ${state.booking.meetingAt===s.meetingAt?'selected':''}" ${s.available?'':'disabled'} onclick="bSet({meetingAt:'${s.meetingAt}'})">${to12(s.time)}</button>`).join('');
}
function to12(t) { const [h] = t.split(':').map(Number); return new Date(2000,1,1,h).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
function shiftCalendar(monthDelta) {
  const d = new Date(state.calendarDate);
  d.setMonth(d.getMonth() + monthDelta);
  state.calendarDate = d;
  render();
}
function calendarDays() {
  const y = state.calendarDate.getFullYear();
  const m = state.calendarDate.getMonth();
  const first = new Date(y, m, 1);
  const startOffset = first.getDay();
  const total = new Date(y, m + 1, 0).getDate();
  return [
    ...Array.from({ length: startOffset }, () => ''),
    ...Array.from({ length: total }, (_, i) => i + 1)
  ];
}
async function saveMeeting(e) {
  e.preventDefault();
  try {
    await request('/api/meetings', { method:'POST', body: JSON.stringify({ ...state.booking, ...Object.fromEntries(new FormData(e.target)) }) });
    toast('Meeting booked successfully'); state.view = 'dashboard'; await bootstrap();
  } catch (err) { toast(err.message); }
}
function renderCalendar() {
  const days = calendarDays();
  app.innerHTML = `<div class="shell">${phone(`${header('Calendar')}<div class="screen"><div class="seg"><button class="active">Day</button><button>Week</button><button>Month</button></div><div class="calendar"><div class="cal-head"><button class="icon-btn" onclick="shiftCalendar(-1)">‹</button><span>${state.calendarDate.toLocaleDateString([], {month:'long',year:'numeric'})}</span><button class="icon-btn" onclick="shiftCalendar(1)">›</button></div><div class="cal-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<b>${d}</b>`).join('')}${days.map(d=>`<span class="cal-day ${d && d===new Date().getDate() && state.calendarDate.getMonth()===new Date().getMonth()?'active':''} ${d && state.meetings.some(m=>new Date(m.meetingAt).getDate()===d && new Date(m.meetingAt).getMonth()===state.calendarDate.getMonth())?'has':''}">${d}</span>`).join('')}</div></div><div class="legend"><span><i class="dot"></i>Upcoming</span><span><i class="dot green"></i>Completed</span><span><i class="dot purple"></i>Sale Done</span><span><i class="dot yellow"></i>Follow-up</span><span><i class="dot red"></i>Cancelled</span></div>${meetingList('Date-wise Meetings', state.meetings, state.user.role==='salesman')}</div>`)}</div>`;
}
function openMeeting(id) {
  const m = state.meetings.find(x => x.id === id) || state.dashboard.meetings.find(x => x.id === id);
  const salesmanActions = state.user.role === 'salesman' ? `<button class="btn green" onclick="updateModal('${m.id}')">Update Result</button>` : '';
  const result = m.result ? `<div class="desktop-panel" style="box-shadow:none;margin:10px 0 0"><div class="section-title">Sales / Follow-up Result</div>${Object.entries(m.result).filter(([_,v]) => v !== '' && v != null).map(([k,v]) => `<div class="row-card" style="grid-template-columns:160px 1fr"><b>${esc(k.replace(/([A-Z])/g, ' $1'))}</b><span>${esc(v)}</span></div>`).join('')}</div>` : '<p class="subtitle">No salesman update submitted yet.</p>';
  showModal(`<h3>${m.customerName}</h3><p class="subtitle">${m.interestedService}</p><div class="list">
    <div class="row-card"><b>📅</b><div>${fmtDate(m.meetingAt)} · ${fmtTime(m.meetingAt)}</div>${statusBadge(m.status)}</div>
    <div class="row-card"><b>☎</b><div>${m.mobile}<br>${m.whatsapp}</div><span></span></div>
    <div class="row-card"><b>⌖</b><div>${m.address}<br><a class="subtitle" href="${mapUrl(m.mapLocation || m.address)}" target="_blank">${m.mapLocation || 'Open map location'}</a></div><span></span></div>
    <div class="map"><div class="pin" style="--x:52%;--y:48%"><div class="avatar">●</div></div></div>
    <div class="row-card"><div class="avatar">${m.telecallerName[0]}</div><div>Telecaller<br><b>${m.telecallerName}</b></div><span></span></div>
    <div class="row-card"><div class="avatar">${m.salesmanName[0]}</div><div>Salesman<br><b>${m.salesmanName}</b></div><span></span></div>
    ${result}
  </div><div class="actions" style="margin-top:14px"><a class="btn small ghost" href="${telUrl(m.mobile)}">☎ Call</a><a class="btn small ghost" target="_blank" href="${waUrl(m.whatsapp || m.mobile)}">◉ WhatsApp</a><a class="btn small green" target="_blank" href="${mapUrl(m.mapLocation || m.address)}">➤ Navigate</a>${salesmanActions}</div>`);
}
function updateModal(id) {
  showModal(`<h3>Update Meeting</h3><form onsubmit="saveResult(event,'${id}')"><div class="field"><label>Select Status</label><select class="select" name="status" onchange="resultFields(this.value)">
    ${['Sale Done','Follow-up Required','Not Interested','Client Not Available','Wrong Lead','Meeting Cancelled','Need Revisit'].map(s=>`<option>${s}</option>`).join('')}</select></div><div id="resultFields"></div><button class="btn green">Submit Update</button></form>`);
  resultFields('Sale Done');
}
function resultFields(status) {
  const el = $('#resultFields'); if (!el) return;
  el.innerHTML = status === 'Sale Done' ? `${field('Package Name','packageName','')}${field('Service Sold','serviceSold','')}${field('Total Amount','totalAmount','')}${field('Received Amount','receivedAmount','')}${field('Pending Amount','pendingAmount','')}<div class="field"><label>Payment Mode</label><select class="select" name="paymentMode"><option>Cash</option><option>UPI</option><option>Cheque</option><option>Bank Transfer</option></select></div>${field('UPI Transaction ID','upiTransactionId','', false)}${field('Cheque Number','chequeNumber','', false)}${field('Bank Reference','bankReference','', false)}<div class="field"><label>Upload Payment Screenshot/Photo</label><input class="input" type="file" accept="image/*" name="paymentProofUpload"><input class="input" style="margin-top:8px" type="file" accept="image/*" capture="environment" name="paymentProofCapture"><p class="subtitle">Use upload for gallery or capture for camera.</p></div>${field('Client Onboarding Notes','onboardingNotes','', false)}`
  : status === 'Follow-up Required' ? `<div class="field"><label>Follow-up Date</label><input class="input" type="date" name="followUpDate" value="${todayValue()}"></div><div class="field"><label>Follow-up Time</label><input class="input" type="time" name="followUpTime" value="11:00"></div>${field('Follow-up Reason','reason','')}${field('Expected Closing Amount','expectedClosingAmount','', false)}${field('Notes','notes','', false)}`
  : `${field('Reason','reason','Client declined')}${field('Remarks','remarks','Update captured by salesman')}`;
}
async function saveResult(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = Object.fromEntries(fd);
  const proof = fd.get('paymentProofUpload');
  const capture = fd.get('paymentProofCapture');
  const selectedProof = capture?.size ? capture : proof?.size ? proof : null;
  if (selectedProof) {
    const dataUrl = await fileToDataUrl(selectedProof);
    const uploaded = await request('/api/uploads', { method: 'POST', body: JSON.stringify({ name: selectedProof.name, dataUrl }) });
    payload.paymentProof = uploaded.url;
  } else {
    payload.paymentProof = '';
  }
  delete payload.paymentProofUpload;
  delete payload.paymentProofCapture;
  await request(`/api/meetings/${id}/result`, { method:'PUT', body: JSON.stringify(payload) });
  closeModal(); toast('Meeting updated'); await bootstrap();
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function showModal(html) { app.insertAdjacentHTML('beforeend', `<div class="modal open" onclick="if(event.target===this)closeModal()"><div class="modal-box"><button class="icon-btn" style="float:right" onclick="closeModal()">${icon('close')}</button>${html}</div></div>`); }
function closeModal() { const m = $('.modal'); if (m) m.remove(); }
function renderUsers() {
  app.innerHTML = `<div class="shell">${phone(`${header('Users')}<div class="screen"><button class="btn green" onclick="userModal()">+ Add User</button><div class="list" style="margin-top:14px">${state.users.map(u=>`<div class="row-card"><div class="avatar">${u.avatar}</div><div><b>${u.name}</b><p class="subtitle">${u.email}<br>${u.role}</p></div><button class="btn small ghost" onclick="userModal('${u.id}')">Edit</button></div>`).join('')}</div></div>`)}</div>`;
}
function userModal(id) {
  const u = state.users.find(x=>x.id===id) || {};
  showModal(`<h3>${id?'Edit':'Add'} User</h3><form onsubmit="saveUser(event,'${id||''}')">${field('Name','name',u.name||'')}${field('Mobile','mobile',u.mobile||'')}${field('Email','email',u.email||'')}<div class="field"><label>Password</label><input class="input" name="password" placeholder="Leave blank to keep"></div><div class="field"><label>Role</label><select class="select" name="role">${['telecaller','salesman','admin'].map(r=>`<option ${u.role===r?'selected':''}>${r}</option>`)}</select></div><div class="field"><label>Status</label><select class="select" name="status"><option ${u.status==='active'?'selected':''}>active</option><option ${u.status==='inactive'?'selected':''}>inactive</option></select></div><button class="btn green">Save User</button></form>`);
}
async function saveUser(e, id) {
  e.preventDefault();
  await request(id ? `/api/users/${id}` : '/api/users', { method: id ? 'PUT':'POST', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
  closeModal(); await loadUsers(); renderUsers();
}
function setReportFilter(key, value) { state.report[key] = value; render(); }
function filteredReportMeetings() {
  return state.meetings.filter(m => {
    const d = new Date(m.meetingAt).toISOString().slice(0, 10);
    return (!state.report.from || d >= state.report.from)
      && (!state.report.to || d <= state.report.to)
      && (!state.report.telecallerId || m.telecallerId === state.report.telecallerId)
      && (!state.report.salesmanId || m.salesmanId === state.report.salesmanId)
      && (!state.report.status || m.status === state.report.status)
      && (!state.report.service || m.interestedService === state.report.service);
  });
}
function reportMetricsFor(list) {
  const sale = list.filter(m => m.status === 'sale-done');
  return { totalMeetings: list.length, completedMeetings: list.filter(m => m.status === 'completed').length, saleDoneMeetings: sale.length, followUps: list.filter(m => m.status === 'follow-up').length, revenue: sale.reduce((s,m)=>s+Number(m.result?.totalAmount||0),0), pendingPayments: sale.reduce((s,m)=>s+Number(m.result?.pendingAmount||0),0) };
}
function reportFilters() { const tele = state.users.filter(u=>u.role==='telecaller'); const sales = state.users.filter(u=>u.role==='salesman'); return `<div class="field"><label>From Date</label><input class="input" type="date" value="${state.report.from}" onchange="setReportFilter('from', this.value)"></div><div class="field"><label>To Date</label><input class="input" type="date" value="${state.report.to}" onchange="setReportFilter('to', this.value)"></div><div class="field"><label>Telecaller</label><select class="select" onchange="setReportFilter('telecallerId', this.value)"><option value="">All Telecallers</option>${tele.map(u=>`<option value="${u.id}" ${state.report.telecallerId===u.id?'selected':''}>${u.name}</option>`).join('')}</select></div><div class="field"><label>Salesman</label><select class="select" onchange="setReportFilter('salesmanId', this.value)"><option value="">All Salesmen</option>${sales.map(u=>`<option value="${u.id}" ${state.report.salesmanId===u.id?'selected':''}>${u.name}</option>`).join('')}</select></div><div class="field"><label>Status</label><select class="select" onchange="setReportFilter('status', this.value)"><option value="">All Status</option>${Object.entries(statusLabels).map(([k,v])=>`<option value="${k}" ${state.report.status===k?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Service</label><select class="select" onchange="setReportFilter('service', this.value)"><option value="">All Services</option>${services.map(s=>`<option value="${s}" ${state.report.service===s?'selected':''}>${s}</option>`).join('')}</select></div>`; }
function reportStats(m) { return `<div class="stats">${stat('Total Meetings', m.totalMeetings)}${stat('Completed', m.completedMeetings, 'green')}${stat('Sale Done', m.saleDoneMeetings, 'purple')}${stat('Follow-ups', m.followUps, 'yellow')}${stat('Revenue (Rs)', rupee(m.revenue))}${stat('Pending Payments', rupee(m.pendingPayments), 'red')}</div>`; }
function renderReports() { const list = filteredReportMeetings(); const m = reportMetricsFor(list); app.innerHTML = `<div class="shell">${phone(`${header('Reports')}<div class="screen">${reportFilters()}${reportStats(m)}<button class="btn" onclick="downloadReport()">Download Report</button>${meetingList('Filtered Timeline', list)}</div>`)}</div>`; }
function downloadReport() {
  const rows = [['Customer','Service','Date','Salesman','Telecaller','Status','Amount'], ...filteredReportMeetings().map(m=>[m.customerName,m.interestedService,fmtDate(m.meetingAt),m.salesmanName,m.telecallerName,m.status,m.result?.totalAmount||0])];
  const csv = rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); a.download = 'oxdigital-report.csv'; a.click();
}
async function renderFollowups() {
  const f = await request('/api/followups');
  app.innerHTML = `<div class="shell">${phone(`${header('Follow-ups')}<div class="screen"><div class="stats">${stat('Today', f.today.length)}${stat('Upcoming', f.upcoming.length, 'green')}${stat('Overdue', f.overdue.length, 'red')}${stat('Reminder Sent', 0, 'yellow')}</div>${meetingList('Follow-up Leads', [...f.today,...f.upcoming,...f.overdue])}</div>`)}</div>`;
}
async function renderSettings() {
  const loc = await request('/api/live-locations').catch(()=>({salesmen:[]}));
  app.innerHTML = `<div class="shell">${phone(`${header(state.user.role==='admin'?'Settings':'Profile')}<div class="screen"><img src="${logo}" style="height:58px"><div class="section-title">Company Profile</div><div class="field"><label>Company Name</label><input class="input" value="${state.settings.companyName}"></div><div class="field"><label>Working Hours</label><input class="input" value="${state.settings.workingHours.start} - ${state.settings.workingHours.end}"></div><div class="field"><label>Meeting Buffer Time</label><input class="input" value="${state.settings.meetingBufferMinutes} minutes"></div><div class="section-title">Live Location Placeholder</div><div class="map">${loc.salesmen.map((s,i)=>`<div class="pin" style="--x:${25+i*18}%;--y:${35+i*9}%"><div class="avatar">${s.avatar}</div></div>`).join('')}</div></div>`)}</div>`;
}
function renderProfile() { renderSettings(); }

Object.assign(window, {
  go,
  login,
  doLogin,
  logout,
  bSet,
  saveMeeting,
  shiftBookingDate,
  openMeeting,
  updateModal,
  resultFields,
  saveResult,
  closeModal,
  userModal,
  saveUser,
  downloadReport,
  shiftCalendar,
  setReportFilter
});

if (state.token) bootstrap(); else login();
