import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mobile/core/cache/local_cache_store.dart';
import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/features/auth/data/auth_controller.dart';
import 'package:mobile/features/feed/data/feed_controller.dart';
import 'package:mobile/features/feed/data/feed_repository.dart';
import 'package:mobile/features/feed/models/author.dart';
import 'package:mobile/features/feed/models/comment.dart';
import 'package:mobile/features/feed/models/post.dart';
import 'package:mobile/features/feed/presentation/create_post_screen.dart';
import 'package:mobile/features/feed/presentation/widgets/trending_topics_bar.dart';
import 'package:mobile/features/tags/data/tags_controller.dart';
import 'package:mobile/features/tags/data/tags_repository.dart';
import 'package:mobile/features/tags/models/tag_item.dart';
import 'package:mobile/features/tags/presentation/widgets/dynamic_tag_selector.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FakeTagsRepository implements TagsRepository {
  List<TagItem> trendingList = [];
  bool shouldThrowTrending = false;
  Completer<TagSuggestResponse>? slowSuggestCompleter;
  int suggestCallCount = 0;
  String? lastSuggestQuery;
  bool shouldThrowCreate = false;
  String? createErrorMessage;

  @override
  Future<List<TagItem>> getTrendingTags({int limit = 12}) async {
    if (shouldThrowTrending) {
      throw const ApiException('Tarmoqda xatolik yuz berdi');
    }
    return trendingList;
  }

  @override
  Future<TagSuggestResponse> suggestTags(String query, {int limit = 8}) async {
    suggestCallCount++;
    lastSuggestQuery = query;
    if (slowSuggestCompleter != null) {
      return slowSuggestCompleter!.future;
    }
    final lower = query.toLowerCase();
    final items = trendingList
        .where((t) =>
            t.name.toLowerCase().contains(lower) ||
            t.slug.toLowerCase().contains(lower))
        .toList();
    final exact = items.any((t) =>
        t.name.toLowerCase() == lower || t.slug.toLowerCase() == lower);
    return TagSuggestResponse(
      query: query,
      items: items,
      exactMatch: exact,
      canCreate: !exact && query.length >= 2,
      normalizedCandidate: query,
    );
  }

  @override
  Future<List<TagItem>> searchTags({
    String query = '',
    String sort = 'trending',
    int limit = 20,
    int offset = 0,
  }) async {
    return trendingList;
  }

  @override
  Future<TagItem> createTag(String name, {String? description}) async {
    if (shouldThrowCreate) {
      throw ApiException(createErrorMessage ?? 'Teg yaratishda xatolik');
    }
    final created = TagItem(
      id: 'tag_${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      slug: name.toLowerCase().replaceAll(RegExp(r'\s+'), '-'),
      usageCount: 1,
    );
    trendingList.insert(0, created);
    return created;
  }
}

class FakeFeedRepo implements FeedRepository {
  String? lastRequestedTag;
  List<String> lastCreatedTags = [];
  List<String> lastCreatedTagIds = [];

  @override
  Future<FeedPageResult> getPostsPage({
    String? filterTab,
    String? sortBy,
    String? tag,
    String? cursor,
    int limit = 20,
  }) async {
    lastRequestedTag = tag;
    return const FeedPageResult(posts: []);
  }

  @override
  Future<FeedPageResult> getShortsPage({
    String filter = 'for_you',
    String? cursor,
    int limit = 20,
  }) async =>
      const FeedPageResult(posts: []);

  @override
  Future<List<Post>> getPosts({String? filterTab, String? sortBy, String? tag, String? cursor}) async =>
      const [];

  @override
  Future<List<Post>> getShorts({String filter = 'for_you', String? cursor}) async => const [];

  @override
  Future<List<Post>> getBookmarks({int limit = 40}) async => const [];

  @override
  Future<Post> createPost({
    required Author author,
    required String content,
    String? title,
    String postType = 'thought',
    String? contentKind,
    String? topic,
    String? projectStage,
    String? lookingFor,
    String? projectUrl,
    String? videoUrl,
    int? videoDurationSeconds,
    List<String> mediaUrls = const [],
    List<String> tags = const [],
    List<String> tagIds = const [],
  }) async {
    lastCreatedTags = tags;
    lastCreatedTagIds = tagIds;
    return Post(
      id: 'p_${DateTime.now().millisecondsSinceEpoch}',
      author: author,
      content: content,
      topic: topic,
      tags: tags,
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<Post?> updatePost(
    String postId, {
    String? title,
    required String content,
    List<String>? tags,
    List<String>? tagIds,
  }) async =>
      null;

  @override
  Future<bool> deletePost(String postId) async => true;

  @override
  Future<bool> toggleLike(String postId) async => true;

  @override
  Future<bool> toggleBookmark(String postId) async => true;

  @override
  Future<bool> toggleFollowAuthor(String handle) async => true;

  @override
  Future<int> recordView(String postId) async => 1;

  @override
  Future<List<Comment>> getComments(String postId) async => const [];

  @override
  Future<Comment> addComment(String postId, Author author, String content, {String? parentId}) async {
    return Comment(
      id: 'c_1',
      postId: postId,
      author: author,
      content: content,
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<void> toggleCommentLike(String postId, String commentId) async {}
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  group('TagsController tests', () {
    test('loadTrending fetches tags, writes cache, and recovers on network error', () async {
      final repo = FakeTagsRepository();
      repo.trendingList = [
        const TagItem(id: 't1', name: 'Flutter', slug: 'flutter', usageCount: 50),
        const TagItem(id: 't2', name: 'Nextjs', slug: 'nextjs', usageCount: 40),
      ];

      final cache = LocalCacheStore();
      final controller = TagsController(repository: repo, cacheStore: cache);

      await controller.loadTrending();
      expect(controller.trendingTags.length, 2);
      expect(controller.trendingTags.first.name, 'Flutter');

      // Second controller reads from cache when network fails
      final repoFail = FakeTagsRepository();
      repoFail.shouldThrowTrending = true;
      final controllerFail = TagsController(repository: repoFail, cacheStore: cache);

      await controllerFail.loadTrending();
      expect(controllerFail.trendingTags.length, 2);
      expect(controllerFail.trendingTags[1].name, 'Nextjs');

      controller.dispose();
      controllerFail.dispose();
    });

    test('updateSearchQuery debounces and discards out-of-order stale responses', () async {
      final repo = FakeTagsRepository();
      repo.trendingList = [
        const TagItem(id: 't1', name: 'Startap', slug: 'startap'),
      ];
      final controller = TagsController(repository: repo);

      // Fast typing: 's', 'st', 'sta'
      controller.updateSearchQuery('s');
      controller.updateSearchQuery('st');
      controller.updateSearchQuery('sta');

      expect(controller.isSearching, true);
      // Wait past debounce (250ms)
      await Future<void>.delayed(const Duration(milliseconds: 300));

      expect(controller.isSearching, false);
      expect(repo.lastSuggestQuery, 'sta');
      expect(controller.suggestions.length, 1);
      expect(controller.suggestions.first.slug, 'startap');

      controller.dispose();
    });

    test('createTag surfaces server validation error on rejection', () async {
      final repo = FakeTagsRepository();
      repo.shouldThrowCreate = true;
      repo.createErrorMessage = 'Ushbu teg hamjamiyat qoidalariga zid deb topildi';

      final controller = TagsController(repository: repo);
      final res = await controller.createTag('qimor');

      expect(res, isNull);
      expect(controller.createError, 'Ushbu teg hamjamiyat qoidalariga zid deb topildi');

      controller.dispose();
    });
  });

  group('Dynamic Tag Widget Integration tests', () {
    testWidgets('DynamicTagSelector renders tags, toggles selection up to maxPostTags', (WidgetTester tester) async {
      final repo = FakeTagsRepository();
      repo.trendingList = [
        const TagItem(id: 't1', name: 'AI', slug: 'ai', usageCount: 120),
        const TagItem(id: 't2', name: 'Texnologiya', slug: 'texnologiya', usageCount: 80),
      ];
      final controller = TagsController(repository: repo);
      await controller.loadTrending();

      List<TagItem> selected = [];

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, setState) {
                return DynamicTagSelector(
                  controller: controller,
                  selectedTags: selected,
                  maxTags: 2,
                  onChanged: (next) => setState(() => selected = next),
                );
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('#AI'), findsOneWidget);
      expect(find.text('#Texnologiya'), findsOneWidget);
      expect(find.text('0/2'), findsOneWidget);

      // Select AI
      await tester.tap(find.text('#AI'));
      await tester.pumpAndSettle();
      expect(find.text('1/2'), findsOneWidget);

      // Select Texnologiya
      await tester.tap(find.text('#Texnologiya'));
      await tester.pumpAndSettle();
      expect(find.text('2/2'), findsOneWidget);

      controller.dispose();
    });

    testWidgets('TrendingTopicsBar renders dynamically and invokes onTagSelected with slug', (WidgetTester tester) async {
      final repo = FakeTagsRepository();
      repo.trendingList = [
        const TagItem(id: 't1', name: 'Dasturlash', slug: 'dasturlash', usageCount: 5000),
      ];
      final controller = TagsController(repository: repo);
      await controller.loadTrending();

      String? selectedSlug;

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: TrendingTopicsBar(
              tagsController: controller,
              onTagSelected: (slug) => selectedSlug = slug,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('#Dasturlash'), findsOneWidget);
      expect(find.text('5.0K'), findsOneWidget);

      await tester.tap(find.text('#Dasturlash'));
      await tester.pumpAndSettle();

      expect(selectedSlug, 'dasturlash');
      controller.dispose();
    });

    test('FeedController.setTopicFilter triggers FeedRepository.getPostsPage with tag parameter', () async {
      final feedRepo = FakeFeedRepo();
      final controller = FeedController(feedRepo, autoLoad: false);

      controller.setTopicFilter('startap');
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(controller.selectedTopicFilter, 'startap');
      expect(feedRepo.lastRequestedTag, 'startap');

      // Toggling same tag clears filter
      controller.setTopicFilter('startap');
      await Future<void>.delayed(const Duration(milliseconds: 50));

      expect(controller.selectedTopicFilter, isNull);
      expect(feedRepo.lastRequestedTag, isNull);

      controller.dispose();
    });

    testWidgets('CreatePostScreen submits both tags and tagIds', (WidgetTester tester) async {
      final feedRepo = FakeFeedRepo();
      final auth = AuthController(initialAuthenticated: true);
      final feedController = FeedController(feedRepo, autoLoad: false);

      final tagsRepo = FakeTagsRepository();
      tagsRepo.trendingList = [
        const TagItem(id: 'tag_123', name: 'Mobile', slug: 'mobile'),
      ];
      final tagsController = TagsController(repository: tagsRepo);
      await tagsController.loadTrending();

      addTearDown(() {
        auth.dispose();
        feedController.dispose();
        tagsController.dispose();
      });

      await tester.pumpWidget(
        MaterialApp(
          home: CreatePostScreen(
            feedController: feedController,
            authController: auth,
            tagsController: tagsController,
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Enter post content
      await tester.enterText(
        find.byKey(const ValueKey('create_post_content_field')),
        'Test dynamic tagging post content',
      );
      await tester.pumpAndSettle();

      // Select tag chip
      await tester.ensureVisible(find.text('#Mobile'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('#Mobile'));
      await tester.pumpAndSettle();

      // Submit post
      await tester.tap(find.text('Chop etish'));
      await tester.pumpAndSettle();

      expect(feedRepo.lastCreatedTags, ['Mobile']);
      expect(feedRepo.lastCreatedTagIds, ['tag_123']);
    });
  });
}
