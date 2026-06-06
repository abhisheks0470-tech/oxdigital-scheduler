import 'package:flutter_test/flutter_test.dart';
import 'package:oxdigital_meeting_scheduler/main.dart';

void main() {
  testWidgets('renders OxDigital login screen', (tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pump();

    expect(find.text('Welcome Back!'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
  });
}
