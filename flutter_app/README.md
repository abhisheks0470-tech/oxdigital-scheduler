# OxDigital Flutter Mobile App

This is the Android/mobile Flutter client for the OxDigital Meeting Scheduler CRM API.

Run:

```bash
flutter pub get
flutter run --dart-define=API_URL=http://10.0.2.2:4100
```

Use `http://10.0.2.2:4100` for Android emulator, or your computer LAN IP for a physical Android phone.

For Codemagic/live builds, `API_URL` is set to `https://oxdigital.in/scheduler`. Use `API_URL=demo` only for offline demo APKs.
