import 'package:material_ui/material_ui.dart';
import 'core/cache/local_cache_store.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';
import 'features/auth/data/auth_controller.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/feed/data/feed_controller.dart';
import 'features/feed/data/feed_repository.dart';
import 'features/feed/data/post_action_controller.dart';
import 'features/feed/data/post_action_repository.dart';
import 'core/constants/api_constants.dart';
import 'features/messages/data/messages_controller.dart';
import 'features/messages/data/messages_repository.dart';
import 'features/messages/data/messages_stream_client.dart';
import 'features/notifications/data/notifications_controller.dart';
import 'features/notifications/data/notifications_repository.dart';
import 'features/shell/main_shell_screen.dart';
import 'features/tags/data/tags_controller.dart';
import 'features/tags/data/tags_repository.dart';

class GoGettersApp extends StatefulWidget {
  final bool initialAuthenticated;

  const GoGettersApp({super.key, this.initialAuthenticated = false});

  @override
  State<GoGettersApp> createState() => _GoGettersAppState();
}

class _GoGettersAppState extends State<GoGettersApp> {
  late final LocalCacheStore _cacheStore;
  late final ThemeController _themeController;
  late final AuthController _authController;
  late final PostActionController _postActionController;
  late final FeedController _feedController;
  late final TagsController _tagsController;
  late final NotificationsController _notificationsController;
  late final MessagesController _messagesController;
  bool _wasAuthenticated = false;
  String? _lastActiveUserId;

  @override
  void initState() {
    super.initState();
    _cacheStore = LocalCacheStore();
    _themeController = ThemeController()..load();
    _authController = AuthController(
      cacheStore: _cacheStore,
      initialAuthenticated: widget.initialAuthenticated,
    );
    _wasAuthenticated = _authController.isAuthenticated;
    _lastActiveUserId =
        _authController.isAuthenticated ? _authController.currentUser.id : null;
    _authController.addListener(_onAuthChanged);

    _postActionController = PostActionController(
      repository: PostActionRepository(apiClient: _authController.apiClient),
    );
    _feedController = FeedController(
      FeedRepositoryImpl(apiClient: _authController.apiClient),
      cacheStore: _cacheStore,
      actionController: _postActionController,
    );
    _tagsController = TagsController(
      repository: TagsRepositoryImpl(apiClient: _authController.apiClient),
      cacheStore: _cacheStore,
    );
    _notificationsController = NotificationsController(
      NotificationsRepositoryImpl(apiClient: _authController.apiClient),
    );
    _messagesController = MessagesController(
      repository: MessagesRepositoryImpl(apiClient: _authController.apiClient),
      stream: MessagesStreamClient(
        baseUrl: ApiConstants.baseUrl,
        tokenProvider: () => _authController.authToken,
      ),
    );

    if (widget.initialAuthenticated) {
      _feedController.setActiveUser(_authController.currentUser.id);
      _messagesController.setActiveUser(_authController.currentUser.id);
      _tagsController.loadTrending();
    } else {
      _authController.restoreSession();
    }
  }

  void _onAuthChanged() {
    final nowAuth = _authController.isAuthenticated;
    final currentUserId = nowAuth ? _authController.currentUser.id : null;

    if (nowAuth && (!_wasAuthenticated || _lastActiveUserId != currentUserId)) {
      _feedController.setActiveUser(currentUserId);
      _feedController.loadPosts(forceRefresh: true);
      _tagsController.loadTrending(forceRefresh: true);
      _notificationsController.load();
      _messagesController.setActiveUser(currentUserId);
    } else if (!nowAuth && _wasAuthenticated) {
      _feedController.clearUserData(_lastActiveUserId);
      _messagesController.setActiveUser(null);
    }
    _wasAuthenticated = nowAuth;
    _lastActiveUserId = currentUserId;
  }

  @override
  void dispose() {
    _authController.removeListener(_onAuthChanged);
    _themeController.dispose();
    _authController.dispose();
    _feedController.dispose();
    _tagsController.dispose();
    _postActionController.dispose();
    _notificationsController.dispose();
    _messagesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([_themeController, _authController]),
      builder: (context, _) {
        return MaterialApp(
          title: 'Geters',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: _themeController.themeMode,
          home: _authController.isAuthenticated
              ? MainShellScreen(
                  themeController: _themeController,
                  authController: _authController,
                  feedController: _feedController,
                  tagsController: _tagsController,
                  notificationsController: _notificationsController,
                  messagesController: _messagesController,
                )
              : LoginScreen(authController: _authController),
        );
      },
    );
  }
}
