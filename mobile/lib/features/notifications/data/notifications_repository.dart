import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../models/notification_item.dart';

abstract class NotificationsRepository {
  Future<List<NotificationItem>> getNotifications();
  Future<int> getUnreadCount();
  Future<void> markAllAsRead();
  Future<void> markAsRead(String id);
}

class NotificationsRepositoryImpl implements NotificationsRepository {
  final ApiClient _apiClient;

  NotificationsRepositoryImpl({ApiClient? apiClient})
      : _apiClient = apiClient ?? ApiClient();

  @override
  Future<List<NotificationItem>> getNotifications() async {
    try {
      final decoded = await _apiClient.get(ApiConstants.notificationsEndpoint);
      final rawList = decoded['data'] as List<dynamic>? ?? const [];
      return rawList
          .map((item) => NotificationItem.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return const [];
    }
  }

  @override
  Future<int> getUnreadCount() async {
    try {
      final decoded = await _apiClient.get('${ApiConstants.notificationsEndpoint}/unread-count');
      final data = decoded['data'] as Map<String, dynamic>? ?? const {};
      return (data['unreadCount'] as int?) ?? 0;
    } catch (_) {
      return 0;
    }
  }

  @override
  Future<void> markAllAsRead() async {
    await _apiClient.post('${ApiConstants.notificationsEndpoint}/read', body: {'all': true});
  }

  @override
  Future<void> markAsRead(String id) async {
    await _apiClient.post('${ApiConstants.notificationsEndpoint}/read', body: {'notificationId': id});
  }
}
