import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://localhost:4100');

void main() => runApp(const OxDigitalApp());

class OxDigitalApp extends StatefulWidget {
  const OxDigitalApp({super.key});
  @override
  State<OxDigitalApp> createState() => _OxDigitalAppState();
}

class _OxDigitalAppState extends State<OxDigitalApp> {
  final api = ApiClient();
  Map<String, dynamic>? user;
  Map<String, dynamic>? dashboard;
  List meetings = [];
  List users = [];
  String view = 'dashboard';

  @override
  void initState() {
    super.initState();
    restore();
  }

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    api.token = prefs.getString('token');
    if (api.token != null) {
      try {
        final me = await api.get('/api/me');
        setState(() => user = me['user']);
        await refresh();
      } catch (_) {
        await prefs.remove('token');
      }
    }
  }

  Future<void> refresh() async {
    final data = await Future.wait([
      api.get('/api/dashboard'),
      api.get('/api/meetings'),
      api.get('/api/users'),
    ]);
    setState(() {
      dashboard = data[0];
      meetings = data[1]['meetings'];
      users = data[2]['users'];
    });
  }

  Future<void> login(String email, String password) async {
    final data = await api.post('/api/login', {'email': email, 'password': password});
    api.token = data['token'];
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', api.token!);
    setState(() => user = data['user']);
    await refresh();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    setState(() {
      user = null;
      dashboard = null;
      view = 'dashboard';
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'OxDigital Meeting Scheduler CRM',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff034d85)),
        scaffoldBackgroundColor: const Color(0xfff6f9fc),
        useMaterial3: true,
      ),
      home: user == null
          ? LoginScreen(onLogin: login)
          : Shell(
              user: user!,
              dashboard: dashboard,
              meetings: meetings,
              users: users,
              view: view,
              api: api,
              onView: (v) => setState(() => view = v),
              onRefresh: refresh,
              onLogout: logout,
            ),
    );
  }
}

class ApiClient {
  String? token;
  Map<String, String> get headers => {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };
  Future<Map<String, dynamic>> get(String path) async {
    final res = await http.get(Uri.parse('$apiUrl$path'), headers: headers);
    return _decode(res);
  }
  Future<Map<String, dynamic>> post(String path, Map body) async {
    final res = await http.post(Uri.parse('$apiUrl$path'), headers: headers, body: jsonEncode(body));
    return _decode(res);
  }
  Future<Map<String, dynamic>> put(String path, Map body) async {
    final res = await http.put(Uri.parse('$apiUrl$path'), headers: headers, body: jsonEncode(body));
    return _decode(res);
  }
  Map<String, dynamic> _decode(http.Response res) {
    final data = jsonDecode(res.body.isEmpty ? '{}' : res.body) as Map<String, dynamic>;
    if (res.statusCode >= 400) throw Exception(data['error'] ?? 'Request failed');
    return data;
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLogin});
  final Future<void> Function(String, String) onLogin;
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  String role = 'telecaller';
  final email = TextEditingController(text: 'telecaller@oxdigital.in');
  final password = TextEditingController(text: '123456');
  bool busy = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 390),
            child: ListView(
              padding: const EdgeInsets.all(24),
              children: [
                const SizedBox(height: 24),
                Image.asset('assets/oxdigital-logo.png', height: 92),
                const SizedBox(height: 22),
                const Text('Welcome Back!', textAlign: TextAlign.center, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                const Text('Login to your account', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 22),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'telecaller', label: Text('Telecaller')),
                    ButtonSegment(value: 'salesman', label: Text('Salesman')),
                    ButtonSegment(value: 'admin', label: Text('Admin')),
                  ],
                  selected: {role},
                  onSelectionChanged: (v) {
                    role = v.first;
                    email.text = '$role@oxdigital.in';
                    setState(() {});
                  },
                ),
                const SizedBox(height: 18),
                TextField(controller: email, decoration: crmInput('Mobile Number / Email')),
                const SizedBox(height: 12),
                TextField(controller: password, obscureText: true, decoration: crmInput('Password')),
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: busy ? null : () async {
                    setState(() => busy = true);
                    try { await widget.onLogin(email.text, password.text); } finally { if (mounted) setState(() => busy = false); }
                  },
                  style: primaryButton(),
                  child: Text(busy ? 'Please wait...' : 'Login'),
                ),
                const SizedBox(height: 58),
                const Text('Powered by OxDigital', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class Shell extends StatelessWidget {
  const Shell({super.key, required this.user, required this.dashboard, required this.meetings, required this.users, required this.view, required this.api, required this.onView, required this.onRefresh, required this.onLogout});
  final Map<String, dynamic> user;
  final Map<String, dynamic>? dashboard;
  final List meetings;
  final List users;
  final String view;
  final ApiClient api;
  final ValueChanged<String> onView;
  final Future<void> Function() onRefresh;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    Widget body;
    if (view == 'booking') {
      body = BookingScreen(api: api, users: users, onDone: () async { onView('dashboard'); await onRefresh(); });
    } else if (view == 'calendar') {
      body = CalendarScreen(meetings: meetings, onOpen: (m) => openMeeting(context, m));
    } else if (view == 'reports') {
      body = ReportsScreen(metrics: dashboard?['metrics'] ?? {});
    } else if (view == 'followups') {
      body = FollowupScreen(api: api);
    } else {
      body = DashboardScreen(user: user, dashboard: dashboard, meetings: meetings, onBook: () => onView('booking'), onOpen: (m) => openMeeting(context, m));
    }
    final List<(String, IconData, String)> nav = user['role'] == 'admin'
        ? const [('dashboard', Icons.home, 'Dashboard'), ('calendar', Icons.calendar_month, 'Calendar'), ('reports', Icons.bar_chart, 'Reports'), ('followups', Icons.notifications, 'Follow-ups'), ('profile', Icons.person, 'Profile')]
        : const [('dashboard', Icons.home, 'Dashboard'), ('calendar', Icons.calendar_month, 'Meetings'), ('booking', Icons.add_circle, 'Book'), ('followups', Icons.notifications, 'Follow-ups'), ('profile', Icons.person, 'Profile')];
    final selected = nav.indexWhere((n) => n.$1 == view);
    return Scaffold(
      body: SafeArea(child: body),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selected < 0 ? 0 : selected,
        onDestinationSelected: (i) => onView(nav[i].$1),
        destinations: [for (final n in nav) NavigationDestination(icon: Icon(n.$2), label: n.$3)],
      ),
    );
  }

  void openMeeting(BuildContext context, Map m) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => MeetingDetails(api: api, meeting: m, canUpdate: user['role'] == 'salesman', onUpdated: onRefresh),
    );
  }
}

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key, required this.user, required this.dashboard, required this.meetings, required this.onBook, required this.onOpen});
  final Map user;
  final Map? dashboard;
  final List meetings;
  final VoidCallback onBook;
  final ValueChanged<Map> onOpen;
  @override
  Widget build(BuildContext context) {
    final metrics = dashboard?['metrics'] ?? {};
    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        Row(children: [Image.asset('assets/oxdigital-logo.png', height: 42), const Spacer(), CircleAvatar(child: Text(user['avatar'] ?? 'OX'))]),
        const SizedBox(height: 18),
        Text('Hello, ${user['name']}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900)),
        Text(user['role'].toString().toUpperCase(), style: const TextStyle(color: Colors.grey)),
        const SizedBox(height: 16),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 2,
          childAspectRatio: 1.8,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          children: [
            metric('Today Meetings', metrics['todayMeetings']),
            metric('Upcoming', metrics['upcomingMeetings'], green),
            metric('Completed', metrics['completedMeetings'], green),
            metric('Sale Done', metrics['saleDoneMeetings'], purple),
            metric('Follow-ups', metrics['followUps'], amber),
            metric('Pending Payments', metrics['pendingPayments'], red),
          ],
        ),
        if (user['role'] == 'telecaller') Padding(padding: const EdgeInsets.only(top: 16), child: FilledButton(style: greenButton(), onPressed: onBook, child: const Text('+ Book New Meeting'))),
        section('Today Meetings'),
        for (final m in meetings) meetingTile(m, () => onOpen(Map<String, dynamic>.from(m))),
      ],
    );
  }
}

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key, required this.api, required this.users, required this.onDone});
  final ApiClient api;
  final List users;
  final Future<void> Function() onDone;
  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  int step = 1;
  String? salesmanId;
  DateTime date = DateTime.now();
  String? meetingAt;
  List slots = [];
  final form = <String, TextEditingController>{
    'customerName': TextEditingController(text: 'Amit Enterprises'),
    'mobile': TextEditingController(text: '9876543210'),
    'whatsapp': TextEditingController(text: '9876543210'),
    'businessName': TextEditingController(text: 'Amit Enterprises'),
    'businessCategory': TextEditingController(text: 'Digital Marketing'),
    'address': TextEditingController(text: '123, MG Road, Indore, MP'),
    'mapLocation': TextEditingController(text: '22.7196,75.8577'),
    'expectedBudget': TextEditingController(text: '25000'),
    'notes': TextEditingController(text: 'Interested in premium package.'),
  };
  String service = 'Google Ads';

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        crmHeader('Book New Meeting'),
        Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [1,2,3,4].map((n) => CircleAvatar(radius: 13, backgroundColor: step == n ? blue : const Color(0xffe8eef5), child: Text('$n', style: TextStyle(color: step == n ? Colors.white : Colors.grey, fontSize: 12)))).toList()),
        const SizedBox(height: 18),
        if (step == 1) ...selectSalesman(),
        if (step == 2) ...selectDate(),
        if (step == 3) ...selectSlot(),
        if (step == 4) ...customerForm(),
      ],
    );
  }

  List<Widget> selectSalesman() => [
    section('Select Salesman'),
    for (final s in widget.users.where((u) => u['role'] == 'salesman')) Card(child: ListTile(leading: CircleAvatar(child: Text(s['avatar'] ?? 'S')), title: Text(s['name']), subtitle: const Text('Available'), trailing: const Icon(Icons.chevron_right), onTap: () => setState(() { salesmanId = s['id']; step = 2; }))),
  ];
  List<Widget> selectDate() => [
    section('Select Date'),
    CalendarDatePicker(initialDate: date, firstDate: DateTime.now().subtract(const Duration(days: 1)), lastDate: DateTime.now().add(const Duration(days: 180)), onDateChanged: (v) => setState(() => date = v)),
    FilledButton(style: primaryButton(), onPressed: () => setState(() => step = 3), child: const Text('Next')),
  ];
  List<Widget> selectSlot() => [
    section('Select Time Slot'),
    FutureBuilder(
      future: loadSlots(),
      builder: (_, snap) => Wrap(
        spacing: 10,
        runSpacing: 10,
        children: [for (final s in slots) ChoiceChip(label: Text(toSlotLabel(s['time'])), selected: meetingAt == s['meetingAt'], onSelected: s['available'] ? (_) => setState(() => meetingAt = s['meetingAt']) : null)],
      ),
    ),
    const SizedBox(height: 18),
    FilledButton(style: primaryButton(), onPressed: meetingAt == null ? null : () => setState(() => step = 4), child: const Text('Next')),
  ];
  Future<void> loadSlots() async {
    if (salesmanId == null) return;
    final dateValue = DateFormat('yyyy-MM-dd').format(date);
    final data = await widget.api.get('/api/slots?salesmanId=$salesmanId&date=$dateValue');
    slots = data['slots'];
  }
  List<Widget> customerForm() => [
    section('Customer Details'),
    for (final e in form.entries) Padding(padding: const EdgeInsets.only(bottom: 10), child: TextField(controller: e.value, decoration: crmInput(labelFor(e.key)))),
    DropdownButtonFormField<String>(initialValue: service, decoration: crmInput('Interested Service'), items: services.map((s) => DropdownMenuItem<String>(value: s, child: Text(s))).toList(), onChanged: (v) => service = v!),
    const SizedBox(height: 18),
    FilledButton(style: greenButton(), onPressed: save, child: const Text('Schedule Meeting')),
  ];
  Future<void> save() async {
    final payload = {for (final e in form.entries) e.key: e.value.text, 'interestedService': service, 'salesmanId': salesmanId, 'meetingAt': meetingAt};
    await widget.api.post('/api/meetings', payload);
    await widget.onDone();
  }
}

class CalendarScreen extends StatelessWidget {
  const CalendarScreen({super.key, required this.meetings, required this.onOpen});
  final List meetings;
  final ValueChanged<Map> onOpen;
  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(18), children: [
    crmHeader('Calendar'),
    SegmentedButton(segments: const [ButtonSegment(value: 'day', label: Text('Day')), ButtonSegment(value: 'week', label: Text('Week')), ButtonSegment(value: 'month', label: Text('Month'))], selected: const {'month'}, onSelectionChanged: (_) {}),
    CalendarDatePicker(initialDate: DateTime.now(), firstDate: DateTime.now().subtract(const Duration(days: 30)), lastDate: DateTime.now().add(const Duration(days: 180)), onDateChanged: (_) {}),
    section('Date-wise Meetings'),
    for (final m in meetings) meetingTile(m, () => onOpen(Map<String, dynamic>.from(m))),
  ]);
}

class MeetingDetails extends StatelessWidget {
  const MeetingDetails({super.key, required this.api, required this.meeting, required this.canUpdate, required this.onUpdated});
  final ApiClient api;
  final Map meeting;
  final bool canUpdate;
  final Future<void> Function() onUpdated;
  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(18, 18, 18, MediaQuery.of(context).viewInsets.bottom + 18),
    child: ListView(shrinkWrap: true, children: [
      Text(meeting['customerName'], style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
      Text(meeting['interestedService'], style: const TextStyle(color: Colors.grey)),
      const SizedBox(height: 12),
      Card(child: ListTile(leading: const Icon(Icons.phone), title: Text(meeting['mobile']), subtitle: Text(meeting['whatsapp']))),
      Card(child: ListTile(leading: const Icon(Icons.place), title: Text(meeting['address']), subtitle: Text(meeting['mapLocation'] ?? 'Map placeholder'))),
      Card(child: ListTile(leading: const Icon(Icons.calendar_today), title: Text('${fmt(meeting['meetingAt'])} ${time(meeting['meetingAt'])}'), trailing: statusChip(meeting['status']))),
      Wrap(spacing: 8, children: [OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.call), label: const Text('Call')), OutlinedButton.icon(onPressed: () {}, icon: const Icon(Icons.chat), label: const Text('WhatsApp')), FilledButton.icon(style: greenButton(), onPressed: () {}, icon: const Icon(Icons.navigation), label: const Text('Navigate'))]),
      if (canUpdate) FilledButton(style: primaryButton(), onPressed: () => showDialog(context: context, builder: (_) => UpdateDialog(api: api, meeting: meeting, onUpdated: onUpdated)), child: const Text('Update Result')),
    ]),
  );
}

class UpdateDialog extends StatefulWidget {
  const UpdateDialog({super.key, required this.api, required this.meeting, required this.onUpdated});
  final ApiClient api;
  final Map meeting;
  final Future<void> Function() onUpdated;
  @override
  State<UpdateDialog> createState() => _UpdateDialogState();
}
class _UpdateDialogState extends State<UpdateDialog> {
  String status = 'Sale Done';
  final fields = <String, TextEditingController>{
    'packageName': TextEditingController(text: 'Google Ads - Premium'),
    'serviceSold': TextEditingController(text: 'Google Ads'),
    'totalAmount': TextEditingController(text: '25000'),
    'receivedAmount': TextEditingController(text: '15000'),
    'pendingAmount': TextEditingController(text: '10000'),
    'paymentMode': TextEditingController(text: 'UPI'),
    'upiTransactionId': TextEditingController(text: 'UPI1234567890'),
    'followUpDate': TextEditingController(text: DateFormat('yyyy-MM-dd').format(DateTime.now())),
    'followUpTime': TextEditingController(text: '11:00'),
    'reason': TextEditingController(text: 'Owner approval pending'),
    'remarks': TextEditingController(text: 'Captured from mobile app'),
  };
  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Update Meeting'),
    content: SizedBox(width: 360, child: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
      DropdownButtonFormField<String>(initialValue: status, decoration: crmInput('Select Status'), items: const ['Sale Done','Follow-up Required','Not Interested','Client Not Available','Wrong Lead','Meeting Cancelled','Need Revisit'].map((s) => DropdownMenuItem<String>(value: s, child: Text(s))).toList(), onChanged: (v) => setState(() => status = v!)),
      const SizedBox(height: 10),
      for (final key in visibleKeys(status)) Padding(padding: const EdgeInsets.only(bottom: 10), child: TextField(controller: fields[key], decoration: crmInput(labelFor(key)))),
    ]))),
    actions: [FilledButton(style: greenButton(), onPressed: () async {
      await widget.api.put('/api/meetings/${widget.meeting['id']}/result', {'status': status, for (final k in visibleKeys(status)) k: fields[k]!.text});
      if (context.mounted) Navigator.pop(context);
      await widget.onUpdated();
    }, child: const Text('Submit Update'))],
  );
}

class ReportsScreen extends StatelessWidget {
  const ReportsScreen({super.key, required this.metrics});
  final Map metrics;
  @override
  Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(18), children: [
    crmHeader('Reports'),
    TextField(decoration: crmInput('Date Range'), controller: TextEditingController(text: '01 May 2025 - 16 May 2025')),
    const SizedBox(height: 10),
    GridView.count(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), crossAxisCount: 2, childAspectRatio: 1.8, crossAxisSpacing: 10, mainAxisSpacing: 10, children: [
      metric('Total Meetings', metrics['totalMeetings']),
      metric('Completed', metrics['completedMeetings'], green),
      metric('Sale Done', metrics['saleDoneMeetings'], purple),
      metric('Follow-ups', metrics['followUps'], amber),
      metric('Revenue', metrics['revenue']),
      metric('Pending Payments', metrics['pendingPayments'], red),
    ]),
    FilledButton(style: primaryButton(), onPressed: () {}, child: const Text('Download Report')),
  ]);
}

class FollowupScreen extends StatelessWidget {
  const FollowupScreen({super.key, required this.api});
  final ApiClient api;
  @override
  Widget build(BuildContext context) => FutureBuilder<Map<String, dynamic>>(
    future: api.get('/api/followups'),
    builder: (_, snap) {
      final data = snap.data ?? {'today': [], 'upcoming': [], 'overdue': []};
      return ListView(padding: const EdgeInsets.all(18), children: [
        crmHeader('Follow-ups'),
        GridView.count(shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), crossAxisCount: 3, childAspectRatio: 1.3, children: [metric('Today', data['today'].length), metric('Upcoming', data['upcoming'].length, green), metric('Overdue', data['overdue'].length, red)]),
        for (final m in [...data['today'], ...data['upcoming'], ...data['overdue']]) meetingTile(m, () {}),
      ]);
    },
  );
}

const blue = Color(0xff034d85);
const green = Color(0xff07945f);
const purple = Color(0xff9c3bd6);
const amber = Color(0xfff6b739);
const red = Color(0xffe33c3c);
final services = ['Google Ads', 'Facebook/Instagram Ads', 'Website Development', 'Social Media Management', 'Google Business Profile', 'Complete Digital Marketing'];

InputDecoration crmInput(String label) => InputDecoration(labelText: label, filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xffdde5ee))));
ButtonStyle primaryButton() => FilledButton.styleFrom(backgroundColor: blue, minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)));
ButtonStyle greenButton() => FilledButton.styleFrom(backgroundColor: green, minimumSize: const Size.fromHeight(48), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)));
Widget crmHeader(String title) => Container(height: 56, margin: const EdgeInsets.only(bottom: 16), decoration: BoxDecoration(color: blue, borderRadius: BorderRadius.circular(14)), alignment: Alignment.center, child: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)));
Widget section(String title) => Padding(padding: const EdgeInsets.fromLTRB(0, 18, 0, 10), child: Text(title, style: const TextStyle(fontWeight: FontWeight.w900)));
Widget metric(String label, dynamic value, [Color color = blue]) => Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [Text('${value ?? 0}', style: TextStyle(fontSize: 22, color: color, fontWeight: FontWeight.w900)), Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12))])));
Widget meetingTile(dynamic raw, VoidCallback onTap) {
  final m = Map<String, dynamic>.from(raw);
  return Card(child: ListTile(onTap: onTap, leading: Text(time(m['meetingAt']), style: const TextStyle(fontWeight: FontWeight.w800)), title: Text(m['customerName']), subtitle: Text('${m['interestedService']}\n${m['salesmanName'] ?? ''}'), trailing: statusChip(m['status'])));
}
Widget statusChip(String status) => Chip(label: Text(status.replaceAll('-', ' '), style: const TextStyle(fontSize: 11)), backgroundColor: status == 'sale-done' ? const Color(0xfff1e3ff) : status == 'follow-up' ? const Color(0xfffff3d2) : status == 'completed' ? const Color(0xffdff8ed) : const Color(0xffe9f3ff));
String fmt(String iso) => DateFormat('dd MMM yyyy').format(DateTime.parse(iso));
String time(String iso) => DateFormat('hh:mm a').format(DateTime.parse(iso));
String toSlotLabel(String t) {
  final parts = t.split(':').map(int.parse).toList();
  return DateFormat('hh:mm a').format(DateTime(2025, 1, 1, parts[0], parts[1]));
}
String labelFor(String key) => key.replaceAllMapped(RegExp(r'([A-Z])'), (m) => ' ${m.group(1)}').replaceFirstMapped(RegExp(r'^.'), (m) => m.group(0)!.toUpperCase());
List<String> visibleKeys(String status) {
  if (status == 'Sale Done') return ['packageName', 'serviceSold', 'totalAmount', 'receivedAmount', 'pendingAmount', 'paymentMode', 'upiTransactionId'];
  if (status == 'Follow-up Required') return ['followUpDate', 'followUpTime', 'reason'];
  return ['reason', 'remarks'];
}
