import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mobile/app.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('Unauthenticated app opens Google-only LoginScreen', (WidgetTester tester) async {
    await tester.pumpWidget(const GoGettersApp());
    await tester.pump();

    expect(find.text('Google orqali kiring'), findsOneWidget);
    expect(find.text('Google orqali davom etish'), findsOneWidget);
    expect(find.text('Mehmon sifatida kirish'), findsNothing);
  });

  testWidgets('Geters mobile app hides intent badges and opens full-screen CreatePostScreen', (WidgetTester tester) async {
    await tester.pumpWidget(const GoGettersApp(initialAuthenticated: true));
    await tester.pump();

    // Verify branding & bottom nav labels matching uploaded mockup
    expect(find.text('Geters'), findsOneWidget);
    expect(find.text('Asosiy'), findsOneWidget);
    expect(find.text('Kashf et'), findsOneWidget);
    expect(find.text('Shorts'), findsWidgets);

    // Ensure intent badges are completely removed
    expect(find.text('Ishga tayyor'), findsNothing);
    expect(find.text('Kofaunder qidirmoqda'), findsNothing);
    expect(find.text('Maslahatchi'), findsNothing);

    // Navigate to full-screen CreatePostScreen via center '+' icon
    await tester.tap(find.byIcon(Icons.add_rounded));
    await tester.pumpAndSettle();

    expect(find.text('Post yaratish'), findsOneWidget);
    expect(find.text('Chop etish'), findsOneWidget);
    expect(find.text('Ommaviy'), findsOneWidget);
    expect(find.text('0 / 280'), findsOneWidget);
    expect(find.text('Kamera'), findsOneWidget);
    expect(find.text('Video'), findsOneWidget);
    expect(find.text('Teglar'), findsOneWidget);
    expect(find.text('0/5'), findsOneWidget);
    expect(find.text("Teg qidirish yoki qo'shish..."), findsOneWidget);
  });

  testWidgets('Profile tab renders profile details and tabs', (WidgetTester tester) async {
    await tester.pumpWidget(const GoGettersApp(initialAuthenticated: true));
    await tester.pump();

    await tester.tap(find.text('Profil'));
    await tester.pumpAndSettle();

    expect(find.text('Profilni tahrirlash'), findsOneWidget);
    expect(find.text('Postlar'), findsWidgets);

    await tester.drag(find.byType(NestedScrollView), const Offset(0, -280));
    await tester.pumpAndSettle();

    expect(find.text('Saqlanganlar'), findsOneWidget);
    expect(find.text('Faollik'), findsOneWidget);
    expect(find.text('Haqida'), findsOneWidget);

    await tester.tap(find.text('Haqida'));
    await tester.pumpAndSettle();
    expect(find.text('Profil haqida'), findsOneWidget);
  });
}
