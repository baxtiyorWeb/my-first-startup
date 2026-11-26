import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/cache/local_cache_store.dart';
import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/sync/offline_action_queue.dart';
import 'package:mobile/core/sync/pending_action.dart';
import 'package:mobile/features/feed/data/feed_controller.dart';
import 'package:mobile/features/feed/data/feed_repository.dart';
import 'package:mobile/features/feed/data/post_action_controller.dart';
import 'package:mobile/features/feed/data/post_action_repository.dart';
import 'package:mobile/features/feed/models/author.dart';
import 'package:mobile/features/feed/models/post.dart';
import 'package:shared_preferences/shared_preferences.dart';

Post _samplePost({
  String id = 'post_shared_1',
  bool isShort = false,
  bool isLiked = false,
  int likesCount = 4,
  bool isSaved = false,
  int sharesCount = 1,
}) {
  return Post(
    id: id,
    author: const Author(
      id: 'u_author',
      name: 'Baxtiyor Dev',
      handle: 'baxtiyor',
      role: 'Founder',
    ),
    title: 'Startup Showcase',
    content: 'Offline-first mobile architecture',
    postType: 'thought',
    contentKind: isShort ? 'video' : 'thought',
    isShort: isShort,
    createdAt: DateTime(2026, 11, 21),
    likesCount: likesCount,
    isLiked: isLiked,
    isSaved: isSaved,
    sharesCount: sharesCount,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('Unified Social Actions keep Feed, Shorts, and Bookmarks synchronized across optimistic toggles', () async {
    final mockHttp = MockClient((req) async {
      if (req.url.path.endsWith('/posts')) {
        return http.Response(
          json.encode({
            'success': true,
            'data': [_samplePost(id: 'shared_1').toJson()],
          }),
          200,
        );
      }
      if (req.url.path.endsWith('/shorts')) {
        return http.Response(
          json.encode({
            'success': true,
            'data': [_samplePost(id: 'shared_1', isShort: true).toJson()],
          }),
          200,
        );
      }
      if (req.url.path.endsWith('/actions/sync')) {
        final body = json.decode(req.body) as Map<String, dynamic>;
        final actions = body['actions'] as List<dynamic>;
        return http.Response(
          json.encode({
            'success': true,
            'data': {
              'results': actions.map((a) {
                final m = a as Map<String, dynamic>;
                final action = m['action'] as String;
                return {
                  'idempotencyKey': m['idempotencyKey'],
                  'postId': m['postId'],
                  'action': action,
                  'status': 'synced',
                  if (action == 'like') 'isLiked': m['desiredState'],
                  if (action == 'like') 'likesCount': 5,
                  if (action == 'bookmark') 'isSaved': m['desiredState'],
                };
              }).toList(),
            },
          }),
          200,
        );
      }
      return http.Response(json.encode({'success': true, 'data': []}), 200);
    });

    final client = ApiClient(
      client: mockHttp,
      baseUrl: 'http://localhost:3000/api',
      authToken: 'tok_u1',
    );
    final feed = FeedController(
      FeedRepositoryImpl(apiClient: client),
      cacheStore: LocalCacheStore(userScope: 'u_1'),
      autoLoad: false,
    );
    addTearDown(feed.dispose);

    await feed.setActiveUser('u_1');
    await feed.loadPosts(forceRefresh: true);
    await feed.loadShorts(forceRefresh: true);

    expect(feed.posts.single.isLiked, isFalse);
    expect(feed.shorts.single.isLiked, isFalse);
    expect(feed.bookmarkedPosts, isEmpty);

    // Toggle Like and Bookmark once via unified FeedController
    await feed.toggleLike('shared_1');
    await feed.toggleBookmark('shared_1');

    // Optimistic state updates immediately across BOTH Feed, Shorts, and Bookmarks
    expect(feed.posts.single.isLiked, isTrue);
    expect(feed.posts.single.likesCount, 5);
    expect(feed.shorts.single.isLiked, isTrue);
    expect(feed.shorts.single.likesCount, 5);
    expect(feed.shorts.single.isSaved, isTrue);
    expect(feed.bookmarkedPosts.map((p) => p.id), ['shared_1']);

    await feed.actionController.syncEngine.syncNow(ignoreBackoff: true);
    expect(feed.pendingSyncCount, 0);
  });

  test('Rapid repeated Like taps coalesce into a single latest queued state without duplicate requests', () async {
    int syncCalls = 0;
    final sentActions = <Map<String, dynamic>>[];

    final mockHttp = MockClient((req) async {
      if (req.url.path.endsWith('/actions/sync')) {
        syncCalls += 1;
        final body = json.decode(req.body) as Map<String, dynamic>;
        final actions = (body['actions'] as List<dynamic>)
            .cast<Map<String, dynamic>>();
        sentActions.addAll(actions);
        return http.Response(
          json.encode({
            'success': true,
            'data': {
              'results': actions
                  .map((a) => {
                        'idempotencyKey': a['idempotencyKey'],
                        'postId': a['postId'],
                        'action': a['action'],
                        'status': 'synced',
                        'isLiked': a['desiredState'],
                        'likesCount': 11,
                      })
                  .toList(),
            },
          }),
          200,
        );
      }
      return http.Response('{}', 200);
    });

    final client = ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api');
    final actionCtrl = PostActionController(
      repository: PostActionRepository(apiClient: client),
    );
    addTearDown(actionCtrl.dispose);

    await actionCtrl.setActiveUser('u_rapid');
    final post = _samplePost(id: 'rapid_post', likesCount: 10, isLiked: false);
    actionCtrl.ingestPosts([post]);

    // Rapidly tap 5 times -> final desiredState should be true
    for (int i = 0; i < 5; i++) {
      await actionCtrl.toggleLike(post);
    }

    expect(actionCtrl.resolvePost(post).isLiked, isTrue);
    expect(actionCtrl.resolvePost(post).likesCount, 11);
    expect(actionCtrl.pendingSyncCount, 1);

    await actionCtrl.syncEngine.syncNow(ignoreBackoff: true);

    expect(syncCalls, 1);
    expect(sentActions.length, 1);
    expect(sentActions.first['desiredState'], isTrue);
    expect(actionCtrl.pendingSyncCount, 0);
  });

  test('Offline actions survive app restart and sync automatically once backend responds', () async {
    bool isOnline = false;
    final syncedKeys = <String>[];

    final mockHttp = MockClient((req) async {
      if (req.url.path.endsWith('/actions/sync')) {
        if (!isOnline) {
          throw const SocketException('No Internet');
        }
        final body = json.decode(req.body) as Map<String, dynamic>;
        final actions = (body['actions'] as List<dynamic>)
            .cast<Map<String, dynamic>>();
        for (final a in actions) {
          syncedKeys.add(a['idempotencyKey'] as String);
        }
        return http.Response(
          json.encode({
            'success': true,
            'data': {
              'results': actions
                  .map((a) => {
                        'idempotencyKey': a['idempotencyKey'],
                        'postId': a['postId'],
                        'action': a['action'],
                        'status': 'synced',
                        if (a['action'] == 'like') 'isLiked': true,
                        if (a['action'] == 'like') 'likesCount': 21,
                      })
                  .toList(),
            },
          }),
          200,
        );
      }
      return http.Response('{}', 200);
    });

    final client1 = ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api');
    final session1 = PostActionController(
      repository: PostActionRepository(apiClient: client1),
    );
    await session1.setActiveUser('u_offline');
    final post = _samplePost(id: 'off_1', likesCount: 20);
    session1.ingestPosts([post]);

    await session1.toggleLike(post);
    await session1.toggleBookmark(post);
    await session1.syncEngine.syncNow(ignoreBackoff: true);
    expect(session1.pendingSyncCount, 2);
    session1.dispose();

    // Simulate app restart with a fresh controller reading persisted SharedPreferences
    final client2 = ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api');
    final session2 = PostActionController(
      repository: PostActionRepository(apiClient: client2),
    );
    addTearDown(session2.dispose);
    await session2.setActiveUser('u_offline');
    expect(session2.pendingSyncCount, 2);

    // Network comes back online
    isOnline = true;
    await session2.syncEngine.syncNow(ignoreBackoff: true);

    expect(syncedKeys.length, 2);
    expect(session2.pendingSyncCount, 0);
  });

  test('Interrupted syncing actions recover to pending on startup and 404 rolls back optimistic state', () async {
    final stuckAction = PendingAction(
      idempotencyKey: 'like_stuck_1',
      postId: 'missing_1',
      type: SocialActionType.like,
      desiredState: true,
      createdAt: DateTime(2026, 11, 21),
      nextRetryAt: DateTime(2026, 11, 21),
      status: PendingActionStatus.syncing,
    );
    SharedPreferences.setMockInitialValues({
      'geters_sync_queue_v1_u_stuck': json.encode([stuckAction.toJson()]),
    });

    final recoveredQueue = OfflineActionQueue(userScope: 'u_stuck');
    await recoveredQueue.ensureLoaded();
    expect(recoveredQueue.pendingItems.length, 1);
    expect(recoveredQueue.pendingItems.first.status, PendingActionStatus.pending);
    expect(recoveredQueue.syncingItems, isEmpty);

    final mockHttp = MockClient((req) async {
      if (req.url.path.endsWith('/actions/sync')) {
        final actions = (json.decode(req.body)['actions'] as List<dynamic>)
            .cast<Map<String, dynamic>>();
        return http.Response(
          json.encode({
            'success': true,
            'data': {
              'results': actions
                  .map((a) => {
                        'idempotencyKey': a['idempotencyKey'],
                        'postId': a['postId'],
                        'action': a['action'],
                        'status': 'not_found',
                        'error': 'Post topilmadi',
                      })
                  .toList(),
            },
          }),
          200,
        );
      }
      return http.Response('{}', 200);
    });

    final client = ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api');
    final ctrl = PostActionController(
      repository: PostActionRepository(apiClient: client),
    );
    addTearDown(ctrl.dispose);

    await ctrl.setActiveUser('u_rollback');
    final post = _samplePost(id: 'missing_1', isLiked: false, likesCount: 7);
    ctrl.ingestPosts([post]);
    await ctrl.toggleLike(post);
    expect(ctrl.resolvePost(post).isLiked, isTrue);
    expect(ctrl.resolvePost(post).likesCount, 8);

    await ctrl.syncEngine.syncNow(ignoreBackoff: true);

    expect(ctrl.pendingSyncCount, 0);
    expect(ctrl.resolvePost(post).isLiked, isFalse);
    expect(ctrl.resolvePost(post).likesCount, 7);
    expect(ctrl.lastFeedbackMessage, contains('topilmadi'));
  });

  test('Native OS Share MethodChannel dispatches text, increments sharesCount, and syncs', () async {
    const shareChannel = MethodChannel('com.geters.mobile/share');
    final shareCalls = <Map<dynamic, dynamic>>[];

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(shareChannel, (call) async {
      if (call.method == 'shareText') {
        shareCalls.add(call.arguments as Map<dynamic, dynamic>);
        return true;
      }
      return null;
    });
    addTearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(shareChannel, null);
    });

    final mockHttp = MockClient((req) async {
      if (req.url.path.endsWith('/actions/sync')) {
        return http.Response(
          json.encode({
            'success': true,
            'data': {
              'results': [
                {
                  'idempotencyKey':
                      ((json.decode(req.body)['actions'] as List).first)['idempotencyKey'],
                  'postId': 'share_1',
                  'action': 'share',
                  'status': 'synced',
                  'sharesCount': 2,
                },
              ],
            },
          }),
          200,
        );
      }
      return http.Response('{}', 200);
    });

    final ctrl = PostActionController(
      repository: PostActionRepository(
        apiClient: ApiClient(client: mockHttp, baseUrl: 'http://localhost:3000/api'),
      ),
    );
    addTearDown(ctrl.dispose);

    final post = _samplePost(id: 'share_1', sharesCount: 1);
    ctrl.ingestPosts([post]);

    final dispatch = await ctrl.sharePost(post);
    expect(dispatch.usedNativeSheet, isTrue);
    expect(dispatch.sharedUrl, 'https://thegogetters.uz/dashboard/posts/share_1');
    expect(shareCalls.length, 1);
    expect(ctrl.resolvePost(post).sharesCount, 2);

    await ctrl.syncEngine.syncNow(ignoreBackoff: true);
    expect(ctrl.pendingSyncCount, 0);
    expect(ctrl.resolvePost(post).sharesCount, 2);
  });

  test('LocalCacheStore isolates user scopes and wipes private cache on logout', () async {
    final store = LocalCacheStore(userScope: 'user_a');
    await store.writeJson(
      'posts_all_latest',
      [_samplePost(id: 'private_a').toJson()],
      ttl: const Duration(minutes: 5),
    );

    final cachedA = await store.readJson('posts_all_latest');
    expect(cachedA, isNotNull);
    expect(cachedA!.isStale, isFalse);

    store.setUserScope('user_b');
    final cachedB = await store.readJson('posts_all_latest');
    expect(cachedB, isNull);

    await store.clearUserScope('user_a');
    store.setUserScope('user_a');
    expect(await store.readJson('posts_all_latest', allowStale: true), isNull);
  });
}
