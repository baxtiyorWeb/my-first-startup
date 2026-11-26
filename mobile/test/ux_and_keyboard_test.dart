import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/theme/theme_controller.dart';
import 'package:mobile/core/widgets/app_button.dart';
import 'package:mobile/core/widgets/empty_state.dart';
import 'package:mobile/core/widgets/report_bottom_sheet.dart';
import 'package:mobile/features/auth/data/auth_controller.dart';
import 'package:mobile/features/cheatsheets/presentation/cheatsheets_screen.dart';
import 'package:mobile/features/feed/data/feed_controller.dart';
import 'package:mobile/features/feed/data/feed_repository.dart';
import 'package:mobile/features/feed/presentation/create_post_screen.dart';
import 'package:mobile/features/profile/presentation/profile_edit_sheet.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('ReportBottomSheet fits cleanly under large keyboard insets without overflow', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(390, 720),
            viewInsets: EdgeInsets.only(bottom: 340),
          ),
          child: const Scaffold(
            body: Align(
              alignment: Alignment.bottomCenter,
              child: ReportBottomSheet(
                targetType: 'post',
                authorName: 'Sardor Dev',
                snippet: 'Test post snippet',
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
    await tester.enterText(find.byType(TextField), 'Qoidani buzuvchi reklama');
    expect(find.text('Shikoyatni yuborish'), findsOneWidget);
  });

  testWidgets('ProfileEditSheet handles keyboard insets, validates name inline, and saves updates', (WidgetTester tester) async {
    final mockHttp = MockClient((req) async {
      if (req.method == 'PATCH') {
        final body = json.decode(req.body) as Map<String, dynamic>;
        return http.Response(
          json.encode({
            'success': true,
            'data': {
              'id': 'u_1',
              'name': body['name'] ?? 'Baxtiyor Dev',
              'handle': 'founder',
              'role': body['role'] ?? 'Engineer',
              'bio': body['bio'] ?? '',
              'location': body['location'],
              'website': body['website'],
            },
          }),
          200,
        );
      }
      return http.Response(json.encode({'success': true, 'data': {}}), 200);
    });
    final apiClient = ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api');
    final auth = AuthController(apiClient: apiClient, initialAuthenticated: true);
    addTearDown(auth.dispose);

    await tester.pumpWidget(
      MaterialApp(
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(390, 720),
            viewInsets: EdgeInsets.only(bottom: 320),
          ),
          child: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => ProfileEditSheet.show(context, authController: auth),
                child: const Text('Open Edit'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Edit'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);

    await tester.enterText(find.byType(TextField).first, 'A');
    await tester.tap(find.text('Saqlash'));
    await tester.pumpAndSettle();
    expect(find.text('Ism kamida 2 ta belgidan iborat bo\'lishi kerak'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, 'Baxtiyor Dev');
    await tester.pump();
    expect(find.text('Ism kamida 2 ta belgidan iborat bo\'lishi kerak'), findsNothing);

    await tester.tap(find.text('Saqlash'));
    await tester.pumpAndSettle();
    expect(auth.currentUser.name, 'Baxtiyor Dev');
  });

  testWidgets('AppButton shows muted disabled opacity when onPressed is null', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: AppButton(
            text: 'Disabled CTA',
            onPressed: null,
          ),
        ),
      ),
    );
    await tester.pump();

    final opacityWidget = tester.widget<AnimatedOpacity>(
      find.descendant(
        of: find.byType(AppButton),
        matching: find.byType(AnimatedOpacity),
      ),
    );
    expect(opacityWidget.opacity, 0.48);
  });

  testWidgets('CreatePostScreen updates character counter smoothly via ValueListenableBuilder', (WidgetTester tester) async {
    final mockHttp = MockClient((_) async => http.Response('{"success":true,"data":[]}', 200));
    final apiClient = ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api');
    final auth = AuthController(apiClient: apiClient, initialAuthenticated: true);
    final feed = FeedController(
      FeedRepositoryImpl(apiClient: apiClient),
      autoLoad: false,
    );
    addTearDown(() {
      auth.dispose();
      feed.dispose();
    });

    await tester.pumpWidget(
      MaterialApp(
        home: CreatePostScreen(
          feedController: feed,
          authController: auth,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('0 / 280'), findsOneWidget);
    await tester.enterText(find.byKey(const ValueKey('create_post_content_field')), 'Salom Dunyo');
    await tester.pump();

    expect(find.text('11 / 280'), findsOneWidget);
  });

  test('ThemeController persists and restores ThemeMode preference', () async {
    final ctrl1 = ThemeController();
    await ctrl1.setThemeMode(ThemeMode.dark);
    expect(ctrl1.themeMode, ThemeMode.dark);
    ctrl1.dispose();

    final ctrl2 = ThemeController();
    await ctrl2.load();
    expect(ctrl2.themeMode, ThemeMode.dark);
    ctrl2.dispose();
  });

  testWidgets('CheatSheetsScreen displays EmptyStateWidget on empty filter and resets via button', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: CheatSheetsScreen(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'zzz_nonexistent_cmd');
    await tester.pump();

    expect(find.byType(EmptyStateWidget), findsOneWidget);
    expect(find.text('Qo\'llanma topilmadi'), findsOneWidget);

    await tester.tap(find.text('Tozalash'));
    await tester.pump();
    expect(find.byType(EmptyStateWidget), findsNothing);
  });
}
