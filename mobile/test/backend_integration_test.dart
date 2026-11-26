import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mobile/app.dart';
import 'package:mobile/core/media/video_thumbnail_service.dart';
import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/widgets/app_avatar.dart';
import 'package:mobile/core/widgets/app_video_player.dart';
import 'package:mobile/features/auth/data/auth_controller.dart';
import 'package:mobile/features/feed/data/feed_controller.dart';
import 'package:mobile/features/feed/data/feed_repository.dart';
import 'package:mobile/features/feed/models/author.dart';
import 'package:mobile/features/feed/models/post.dart';
import 'package:mobile/features/feed/presentation/widgets/post_card.dart';
import 'package:mobile/features/pricing/data/pricing_repository.dart';
import 'package:mobile/features/pricing/presentation/pricing_screen.dart';
import 'package:mobile/features/shorts/presentation/shorts_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('AuthController logs in with Google idToken, restores session, and handles 401 expiry', () async {
    final mockHttp = MockClient((req) async {
      if (req.url.path.endsWith('/auth/google/verify')) {
        return http.Response(
          json.encode({
            'success': true,
            'data': {
              'token': 'jwt_test_token_123',
              'user': {
                'id': 'u_1',
                'name': 'Baxtiyor Test',
                'handle': '@baxtiyor_test',
                'role': 'Flutter Engineer',
                'verified': true,
              },
            },
          }),
          200,
        );
      }
      if (req.url.path.endsWith('/auth/session')) {
        expect(req.headers['Authorization'], 'Bearer jwt_test_token_123');
        return http.Response(
          json.encode({
            'success': true,
            'data': {
              'isAuthenticated': true,
              'user': {
                'id': 'u_1',
                'name': 'Baxtiyor Test',
                'handle': '@baxtiyor_test',
                'role': 'Flutter Engineer',
                'verified': true,
              },
            },
          }),
          200,
        );
      }
      if (req.url.path.endsWith('/posts')) {
        return http.Response(
          json.encode({
            'success': false,
            'error': {'code': 'UNAUTHORIZED', 'message': 'Sessiya eskirgan'},
          }),
          401,
        );
      }
      return http.Response('{}', 404);
    });

    final apiClient = ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api');
    final auth = AuthController(apiClient: apiClient);

    final ok = await auth.loginWithGoogleIdToken('dev-mock-token:baxtiyor@thegogetters.uz');
    expect(ok, isTrue);
    expect(auth.authToken, 'jwt_test_token_123');
    expect(auth.currentUser.name, 'Baxtiyor Test');
    expect(auth.currentUser.handle, 'baxtiyor_test');

    final restored = await auth.restoreSession();
    expect(restored, isTrue);

    // Trigger 401 to verify automatic session invalidation
    await expectLater(
      () => apiClient.get('/posts'),
      throwsA(isA<ApiException>()),
    );
    expect(auth.isAuthenticated, isFalse);
    expect(auth.authToken, isNull);
  });

  test('FeedRepositoryImpl maps Shorts (<= 60s) and regular video posts from backend API', () async {
    final mockHttp = MockClient((req) async {
      if (req.url.path.endsWith('/shorts')) {
        return http.Response(
          json.encode({
            'success': true,
            'data': [
              {
                'id': 'short_1',
                'title': '45s Flutter Tip',
                'content': 'Short video content',
                'postType': 'thought',
                'contentKind': 'video',
                'videoUrl': 'https://cdn.example.com/short.mp4',
                'videoDurationSeconds': 45,
                'isShort': true,
                'createdAt': '2026-11-21T00:00:00.000Z',
                'author': {'id': 'u1', 'name': 'Baxtiyor', 'handle': '@baxtiyor', 'role': 'Dev'},
              },
            ],
          }),
          200,
        );
      }
      if (req.url.path.endsWith('/posts') && req.method == 'POST') {
        final body = json.decode(req.body) as Map<String, dynamic>;
        expect(body['videoUrl'], 'https://cdn.example.com/exact60.mp4');
        expect(body['videoDurationSeconds'], 60);
        return http.Response(
          json.encode({
            'success': true,
            'data': {
              'id': 'post_60',
              'content': body['content'],
              'postType': 'thought',
              'contentKind': 'video',
              'videoUrl': body['videoUrl'],
              'videoDurationSeconds': 60,
              'isShort': true,
              'createdAt': '2026-11-21T00:00:00.000Z',
              'author': {'id': 'u1', 'name': 'Baxtiyor', 'handle': '@baxtiyor', 'role': 'Dev'},
            },
          }),
          201,
        );
      }
      return http.Response(json.encode({'success': true, 'data': []}), 200);
    });

    final apiClient = ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api', authToken: 'tok');
    final repo = FeedRepositoryImpl(apiClient: apiClient);

    final shorts = await repo.getShorts(filter: 'for_you');
    expect(shorts.length, 1);
    expect(shorts.first.isShort, isTrue);
    expect(shorts.first.videoDurationSeconds, 45);

    final created = await repo.createPost(
      author: const Author(id: 'u1', name: 'Baxtiyor', handle: 'baxtiyor', role: 'Dev'),
      content: '60 second boundary video',
      contentKind: 'video',
      videoUrl: 'https://cdn.example.com/exact60.mp4',
      videoDurationSeconds: 60,
    );
    expect(created.isShort, isTrue);
    expect(created.videoDurationSeconds, 60);
  });

  testWidgets('PricingScreen hides plans behind Coming Soon blur and unlocks when comingSoonMode is false', (WidgetTester tester) async {
    final mockHttp = MockClient((req) async {
      if (req.url.path.endsWith('/pricing')) {
        return http.Response(
          json.encode({
            'success': true,
            'data': {
              'plans': [
                {
                  'id': 'p_free',
                  'slug': 'free',
                  'name': 'Boshlang\'ich',
                  'description': 'Asosiy reja',
                  'priceMonthlyUzs': 0,
                  'priceYearlyUzs': 0,
                  'currency': 'UZS',
                  'features': ['Cheksiz o\'qish'],
                  'isCurrent': true,
                },
                {
                  'id': 'p_pro',
                  'slug': 'pro',
                  'name': 'Geters Pro',
                  'description': 'Faol mualliflar uchun',
                  'priceMonthlyUzs': 49000,
                  'priceYearlyUzs': 470000,
                  'currency': 'UZS',
                  'features': ['50 MB HD Shorts'],
                  'isCurrent': false,
                },
              ],
              'currentSubscription': null,
              'providerConfigured': false,
            },
          }),
          200,
        );
      }
      return http.Response('{}', 404);
    });

    final repo = PricingRepository(
      apiClient: ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api'),
    );

    // 1. Default Coming Soon mode: plans rendered beneath blur + interaction blocked
    await tester.pumpWidget(MaterialApp(home: PricingScreen(repository: repo)));
    await tester.pumpAndSettle();

    expect(find.text('Tariflar va Obuna'), findsOneWidget);
    expect(find.text('Coming Soon'), findsOneWidget);
    expect(find.text('Tez kunda'), findsOneWidget);
    expect(find.text('Geters Pro'), findsOneWidget);
    expect(find.text('49 000 so\'m / oy'), findsOneWidget);

    await tester.tap(find.text('Yillik (-20%)'), warnIfMissed: false);
    await tester.pumpAndSettle();
    expect(find.text('470 000 so\'m / yil'), findsNothing);

    // 2. Unlocked mode (future activation): interactive billing toggle works
    await tester.pumpWidget(
      MaterialApp(home: PricingScreen(repository: repo, comingSoonMode: false)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Coming Soon'), findsNothing);
    await tester.tap(find.text('Yillik (-20%)'));
    await tester.pumpAndSettle();
    expect(find.text('470 000 so\'m / yil'), findsOneWidget);
  });

  testWidgets('PostCard renders AppVideoPlayer safely when post.videoUrl is present', (WidgetTester tester) async {
    final mockHttp = MockClient((req) async {
      return http.Response(json.encode({'success': true, 'data': []}), 200);
    });
    final apiClient = ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api');
    final auth = AuthController(apiClient: apiClient);
    final feed = FeedController(FeedRepositoryImpl(apiClient: apiClient));

    final videoPost = Post(
      id: 'vid_1',
      author: const Author(id: 'u1', name: 'Baxtiyor', handle: 'baxtiyor', role: 'Dev'),
      content: 'Assalomu Alaykum video post',
      contentKind: 'video',
      videoUrl: 'https://local-network.b-cdn.net/shorts/sample.mp4',
      videoDurationSeconds: 10,
      isShort: true,
      createdAt: DateTime(2026, 11, 21),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: PostCard(
              post: videoPost,
              feedController: feed,
              authController: auth,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(AppVideoPlayer), findsOneWidget);
    expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);
    expect(find.text('0:10'), findsOneWidget);
    expect(find.text('Videoni yuklashda xatolik · Qayta urinish'), findsNothing);
    expect(find.byType(CircularProgressIndicator), findsNothing);

    await tester.tap(find.byType(AppVideoPlayer));
    await tester.pumpAndSettle();
    expect(find.byType(AppVideoPlayer), findsOneWidget);
  });

  testWidgets('AppAvatar keeps fallback gradient and initials for SVG and null URLs', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Row(
            children: [
              AppAvatar(
                name: 'Baxtiyor Qurbonnazarov',
                imageUrl: 'https://api.dicebear.com/7.x/micah/svg?seed=baxtiyor',
                size: 40,
              ),
              AppAvatar(
                name: 'Ali Valiyev',
                imageUrl: null,
                size: 40,
              ),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('BQ'), findsOneWidget);
    expect(find.text('AV'), findsOneWidget);

    final containers = tester.widgetList<Container>(
      find.descendant(of: find.byType(AppAvatar), matching: find.byType(Container)),
    );
    for (final container in containers) {
      final decoration = container.decoration;
      if (decoration is BoxDecoration && decoration.shape == BoxShape.circle) {
        expect(decoration.gradient, isA<LinearGradient>());
      }
    }
  });

  testWidgets('ShortsScreen renders AppVideoPlayer, mute toggle, and author profile cleanly', (WidgetTester tester) async {
    final mockHttp = MockClient((req) async {
      if (req.url.path.endsWith('/shorts')) {
        return http.Response(
          json.encode({
            'success': true,
            'data': [
              {
                'id': 'short_ui_1',
                'title': 'Flutter Shorts UX',
                'content': 'Interactive timeline & polished avatar',
                'postType': 'thought',
                'contentKind': 'video',
                'videoUrl': 'https://local-network.b-cdn.net/shorts/ux.mp4',
                'videoDurationSeconds': 24,
                'isShort': true,
                'createdAt': '2026-11-21T00:00:00.000Z',
                'author': {
                  'id': 'u_s1',
                  'name': 'Baxtiyor Dev',
                  'handle': '@baxtiyor_dev',
                  'role': 'Engineer',
                  'verified': true,
                },
              },
            ],
          }),
          200,
        );
      }
      return http.Response(json.encode({'success': true, 'data': []}), 200);
    });

    final apiClient = ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api');
    final auth = AuthController(apiClient: apiClient);
    final feed = FeedController(FeedRepositoryImpl(apiClient: apiClient));

    await tester.pumpWidget(
      MaterialApp(
        home: ShortsScreen(
          feedController: feed,
          authController: auth,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(AppVideoPlayer), findsOneWidget);
    expect(find.text('Baxtiyor Dev'), findsOneWidget);
    expect(find.byIcon(Icons.volume_up_rounded), findsOneWidget);
    expect(find.text('1x'), findsOneWidget);

    await tester.tap(find.text('1x'));
    await tester.pump();
    expect(find.text('1.5x'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.more_vert_rounded));
    await tester.pumpAndSettle();
    expect(find.text('Ijro tezligi'), findsOneWidget);
    expect(find.text('Avto-keyingi video'), findsOneWidget);

    await tester.tap(find.text('Avto-keyingi video'));
    await tester.pump();
    Navigator.of(tester.element(find.text('Ijro tezligi'))).pop();
    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.volume_up_rounded));
    await tester.pump();
    expect(find.byIcon(Icons.volume_off_rounded), findsOneWidget);
  });

  testWidgets('Tapping Shorts in MainShellScreen hides bottom navigation bar and Back restores it', (WidgetTester tester) async {
    await tester.pumpWidget(const GoGettersApp(initialAuthenticated: true));
    await tester.pump();

    expect(find.text('Asosiy'), findsOneWidget);
    expect(find.text('Kashf et'), findsOneWidget);
    expect(find.text('Profil'), findsOneWidget);

    await tester.tap(find.text('Shorts').last);
    await tester.pumpAndSettle();

    expect(find.text('Asosiy'), findsNothing);
    expect(find.text('Kashf et'), findsNothing);
    expect(find.text('Profil'), findsNothing);
    expect(find.byIcon(Icons.arrow_back_ios_new_rounded), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back_ios_new_rounded));
    await tester.pumpAndSettle();

    expect(find.text('Asosiy'), findsOneWidget);
    expect(find.text('Kashf et'), findsOneWidget);
    expect(find.text('Profil'), findsOneWidget);
  });

  testWidgets('AppVideoPlayer displays extracted first-frame thumbnail when posterUrl is absent', (WidgetTester tester) async {
    const channel = MethodChannel('com.geters.mobile/video_thumbnail');
    final samplePng = Uint8List.fromList(<int>[
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1,
      0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84,
      120, 156, 99, 80, 77, 126, 253, 31, 0, 4, 151, 2, 115, 86, 221, 175, 124,
      0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ]);

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      if (call.method == 'getThumbnail') {
        return samplePng;
      }
      return null;
    });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(channel, null);
      VideoThumbnailService.clearCache();
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: AppVideoPlayer(
            url: 'https://local-network.b-cdn.net/shorts/first-frame-test.mp4',
            durationSeconds: 20,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(Image), findsOneWidget);
    expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);
    expect(find.text('0:20'), findsOneWidget);
  });
}
