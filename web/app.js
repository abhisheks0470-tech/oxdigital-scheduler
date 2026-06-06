const API = '';
const logo = '/assets/oxdigital-logo.svg';
const services = ['Google Ads', 'Facebook/Instagram Ads', 'Website Development', 'Social Media Management', 'Google Business Profile', 'Complete Digital Marketing'];
const statusLabels = { 'upcoming': 'Upcoming', 'completed': 'Completed', 'sale-done': 'Sale Done', 'follow-up': 'Follow-up', 'cancelled': 'Cancelled', 'not-interested': 'Not Interested', 'wrong-lead': 'Wrong Lead', 'client-not-available': 'Client Not Available', 'need-revisit': 'Need Revisit' };
const state = { token: localStorage.oxToken || '', user: null, settings: null, dashboard: null, meetings: [], users: [], selectedRole: 'telecaller', booking: { step: 1 }, view: 'dashboard' };
window.state = state;

const $ = (s) => document.querySelector(s);
const app = $('#app');
const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
const todayValue = () => new Date().toISOString().slice(0, 10);
const rupee = (n) => Number(n || 0).toLocaleString('en-IN');

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
  const res = await fetch(API + path, { ...options, headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function statusBadge(status) {
  const cls = status === 'sale-done' ? 'purple' : status === 'completed' ? 'green' : ['cancelled','not-interested','wrong-lead'].includes(status) ? 'red' : status === 'follow-up' ? 'yellow' : '';
  return `<span class="badge ${cls}">${statusLabels[status] || status}</span>`;
}
function phone(content, nav = true, cls = '') {
  return `<div class="phone active-screen ${cls}">${content}${nav && state.user ? bottomNav() : ''}</div>`;
}
function bottomNav() {
  const items = state.user.role === 'admin'
    ? [['dashboard','home','Dashboard'],['calendar','cal','Calendar'],['users','users','Users'],['reports','report','Reports'],['settings','gear','Settings']]
    : state.user.role === 'telecaller'
      ? [['dashboard','home','Dashboard'],['calendar','cal','Meetings'],['booking','plus','Book'],['followups','report','Follow-ups'],['profile','user','Profile']]
      : [['dashboard','home','Dashboard'],['calendar','cal','Calendar'],['meeting','plus','Update'],['followups','report','Follow-ups'],['profile','user','Profile']];
  return `<nav class="bottom-nav">${items.map(([v,i,l]) => `<button class="${state.view === v ? 'active' : ''}" onclick="go('${v}')"><b>${icon(i)}</b><span>${l}</span></button>`).join('')}</nav>`;
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
    await Promise.all([loadDashboard(), loadMeetings(), loadUsers()]);
    render();
  } catch { logout(); }
}
async function loadDashboard() { state.dashboard = await request('/api/dashboard'); }
async function loadMeetings(query = '') { state.meetings = (await request('/api/meetings' + query)).meetings; }
async function loadUsers() { state.users = (await request('/api/users')).users; }
function go(view) { state.view = view; if (view === 'booking') state.booking = { step: 1, date: todayValue() }; render(); }
function render() {
  if (!state.user) return login();
  if (state.view === 'booking') return renderBooking();
  if (state.view === 'calendar') return renderCalendar();
  if (state.view === 'users') return renderUsers();
  if (state.view === 'reports') return renderReports();
  if (state.view === 'settings') return renderSettings();
  if (state.view === 'followups') return renderFollowups();
  if (state.view === 'profile') return renderProfile();
  return state.user.role === 'admin' ? renderAdmin() : state.user.role === 'telecaller' ? renderTelecaller() : renderSalesman();
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
  return `<div class="section-title"><span>${title}</span><a onclick="go('calendar')">View All</a></div><div class="list">${meetings.map(m => `<div class="row-card" onclick="openMeeting('${m.id}')"><div class="meeting-time">${fmtTime(m.meetingAt)}</div><div><b>${m.customerName}</b><p class="subtitle">${m.interestedService}<br>${m.salesmanName}</p>${actions ? `<div class="actions"><button class="btn small ghost">☎ Call</button><button class="btn small ghost">◉ WhatsApp</button><button class="btn small green">➤ Navigate</button></div>` : ''}</div>${statusBadge(m.status)}</div>`).join('') || '<p class="subtitle">No meetings yet.</p>'}</div>`;
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
  if (b.step === 2) return `<h3>Select Date</h3><div class="calendar"><div class="cal-head"><button class="icon-btn">‹</button><span>${new Date(b.date).toLocaleDateString([], { month:'long', year:'numeric' })}</span><button class="icon-btn">›</button></div><input class="input" type="date" value="${b.date}" onchange="bSet({date:this.value})"></div><button class="btn" style="margin-top:18px" onclick="bSet({step:3})">Next</button>`;
  if (b.step === 3) return `<h3>Select Time Slot</h3><p class="subtitle">${fmtDate(b.date)}</p><div id="slots" class="slot-grid"><p class="subtitle">Loading slots...</p></div><div class="legend"><span><i class="dot green"></i>Available</span><span><i class="dot grey"></i>Blocked</span><span><i class="dot red"></i>Booked</span></div><button class="btn" style="margin-top:18px" onclick="${b.meetingAt ? 'bSet({step:4})' : 'toast(`Select a time slot first`)'}">Next</button>`;
  return `<h3>Customer Details</h3><form onsubmit="saveMeeting(event)">
    ${field('Customer Name','customerName','Amit Enterprises')}${field('Mobile Number','mobile','9876543210')}${field('WhatsApp Number','whatsapp','9876543210')}${field('Business Name','businessName','Amit Enterprises')}
    <div class="field"><label>Business Category</label><select class="select" name="businessCategory"><option>Digital Marketing</option><option>Retail</option><option>Education</option><option>Healthcare</option></select></div>
    ${field('Full Address','address','123, MG Road, Indore, MP')}${field('Google Map Location','mapLocation','22.7196,75.8577')}
    <div class="field"><label>Interested Service</label><select class="select" name="interestedService">${services.map(s=>`<option>${s}</option>`)}</select></div>
    ${field('Expected Budget','expectedBudget','25000')}<div class="field"><label>Notes</label><textarea name="notes">Interested in premium digital marketing package.</textarea></div>
    <button class="btn green">Schedule Meeting</button></form>`;
}
function field(label, name, value = '') { return `<div class="field"><label>${label}</label><input class="input" name="${name}" value="${value}" required></div>`; }
function bSet(patch) { Object.assign(state.booking, patch); renderBooking(); }
async function loadSlots() {
  const data = await request(`/api/slots?salesmanId=${state.booking.salesmanId}&date=${state.booking.date}`);
  const slots = $('#slots');
  slots.innerHTML = data.slots.map(s => `<button class="slot ${state.booking.meetingAt===s.meetingAt?'selected':''}" ${s.available?'':'disabled'} onclick="bSet({meetingAt:'${s.meetingAt}'})">${to12(s.time)}</button>`).join('');
}
function to12(t) { const [h] = t.split(':').map(Number); return new Date(2000,1,1,h).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
async function saveMeeting(e) {
  e.preventDefault();
  try {
    await request('/api/meetings', { method:'POST', body: JSON.stringify({ ...state.booking, ...Object.fromEntries(new FormData(e.target)) }) });
    toast('Meeting booked successfully'); state.view = 'dashboard'; await bootstrap();
  } catch (err) { toast(err.message); }
}
function renderCalendar() {
  const days = Array.from({ length: 35 }, (_, i) => i + 1);
  app.innerHTML = `<div class="shell">${phone(`${header('Calendar')}<div class="screen"><div class="seg"><button class="active">Day</button><button>Week</button><button>Month</button></div><div class="calendar"><div class="cal-head"><button class="icon-btn">‹</button><span>${new Date().toLocaleDateString([], {month:'long',year:'numeric'})}</span><button class="icon-btn">›</button></div><div class="cal-grid">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<b>${d}</b>`).join('')}${days.map(d=>`<span class="cal-day ${d===new Date().getDate()?'active':''} ${state.meetings.some(m=>new Date(m.meetingAt).getDate()===d)?'has':''}">${d}</span>`).join('')}</div></div><div class="legend"><span><i class="dot"></i>Upcoming</span><span><i class="dot green"></i>Completed</span><span><i class="dot purple"></i>Sale Done</span><span><i class="dot yellow"></i>Follow-up</span><span><i class="dot red"></i>Cancelled</span></div>${meetingList('Date-wise Meetings', state.meetings, state.user.role==='salesman')}</div>`)}</div>`;
}
function openMeeting(id) {
  const m = state.meetings.find(x => x.id === id) || state.dashboard.meetings.find(x => x.id === id);
  const salesmanActions = state.user.role === 'salesman' ? `<button class="btn green" onclick="updateModal('${m.id}')">Update Result</button>` : '';
  showModal(`<h3>${m.customerName}</h3><p class="subtitle">${m.interestedService}</p><div class="list">
    <div class="row-card"><b>📅</b><div>${fmtDate(m.meetingAt)} · ${fmtTime(m.meetingAt)}</div>${statusBadge(m.status)}</div>
    <div class="row-card"><b>☎</b><div>${m.mobile}<br>${m.whatsapp}</div><span></span></div>
    <div class="row-card"><b>⌖</b><div>${m.address}<br><span class="subtitle">${m.mapLocation}</span></div><span></span></div>
    <div class="map"><div class="pin" style="--x:52%;--y:48%"><div class="avatar">●</div></div></div>
    <div class="row-card"><div class="avatar">${m.telecallerName[0]}</div><div>Telecaller<br><b>${m.telecallerName}</b></div><span></span></div>
    <div class="row-card"><div class="avatar">${m.salesmanName[0]}</div><div>Salesman<br><b>${m.salesmanName}</b></div><span></span></div>
  </div><div class="actions" style="margin-top:14px"><button class="btn small ghost">☎ Call</button><button class="btn small ghost">◉ WhatsApp</button><button class="btn small green">➤ Navigate</button>${salesmanActions}</div>`);
}
function updateModal(id) {
  showModal(`<h3>Update Meeting</h3><form onsubmit="saveResult(event,'${id}')"><div class="field"><label>Select Status</label><select class="select" name="status" onchange="resultFields(this.value)">
    ${['Sale Done','Follow-up Required','Not Interested','Client Not Available','Wrong Lead','Meeting Cancelled','Need Revisit'].map(s=>`<option>${s}</option>`).join('')}</select></div><div id="resultFields"></div><button class="btn green">Submit Update</button></form>`);
  resultFields('Sale Done');
}
function resultFields(status) {
  const el = $('#resultFields'); if (!el) return;
  el.innerHTML = status === 'Sale Done' ? `${field('Package Name','packageName','Google Ads - Premium')}${field('Service Sold','serviceSold','Google Ads')}${field('Total Amount','totalAmount','25000')}${field('Received Amount','receivedAmount','15000')}${field('Pending Amount','pendingAmount','10000')}<div class="field"><label>Payment Mode</label><select class="select" name="paymentMode"><option>Cash</option><option selected>UPI</option><option>Cheque</option><option>Bank Transfer</option></select></div>${field('UPI Transaction ID','upiTransactionId','UPI1234567890')}${field('Cheque Number','chequeNumber','')}${field('Bank Reference','bankReference','')}${field('Upload Payment Screenshot/Photo','paymentProof','placeholder-upload')}${field('Client Onboarding Notes','onboardingNotes','Brief received')}`
  : status === 'Follow-up Required' ? `${field('Follow-up Date','followUpDate',todayValue())}${field('Follow-up Time','followUpTime','11:00')}${field('Follow-up Reason','reason','Owner approval pending')}${field('Expected Closing Amount','expectedClosingAmount','25000')}${field('Notes','notes','Call tomorrow')}`
  : `${field('Reason','reason','Client declined')}${field('Remarks','remarks','Update captured by salesman')}`;
}
async function saveResult(e, id) {
  e.preventDefault();
  await request(`/api/meetings/${id}/result`, { method:'PUT', body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
  closeModal(); toast('Meeting updated'); await bootstrap();
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
function reportFilters() { return `<div class="field"><label>Date Range</label><input class="input" value="01 May 2025 - 16 May 2025"></div><div class="field"><label>Telecaller</label><select class="select"><option>All Telecallers</option></select></div><div class="field"><label>Salesman</label><select class="select"><option>All Salesmen</option></select></div><div class="field"><label>Status</label><select class="select"><option>All Status</option></select></div>`; }
function reportStats(m) { return `<div class="stats">${stat('Total Meetings', m.totalMeetings)}${stat('Completed', m.completedMeetings, 'green')}${stat('Sale Done', m.saleDoneMeetings, 'purple')}${stat('Follow-ups', m.followUps, 'yellow')}${stat('Revenue (Rs)', rupee(m.revenue))}${stat('Pending Payments', rupee(m.pendingPayments), 'red')}</div>`; }
function renderReports() { const m = state.dashboard.metrics; app.innerHTML = `<div class="shell">${phone(`${header('Reports')}<div class="screen">${reportFilters()}${reportStats(m)}<button class="btn" onclick="downloadReport()">Download Report</button></div>`)}</div>`; }
function downloadReport() {
  const rows = [['Customer','Service','Date','Salesman','Telecaller','Status','Amount'], ...state.meetings.map(m=>[m.customerName,m.interestedService,fmtDate(m.meetingAt),m.salesmanName,m.telecallerName,m.status,m.result?.totalAmount||0])];
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

if (state.token) bootstrap(); else login();
