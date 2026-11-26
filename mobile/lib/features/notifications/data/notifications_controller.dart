import 'package:material_ui/material_ui.dart';
import '../models/notification_item.dart';
import 'notifications_repository.dart';

class NotificationsController extends ChangeNotifier {
  final NotificationsRepository _repository;

  List<NotificationItem> _items = [];
  bool _isLoading = true;

  NotificationsController(this._repository) {
    load();
  }

  List<NotificationItem> get items => _items;
  bool get isLoading => _isLoading;
  int get unreadCount => _items.where((i) => !i.isRead).length;

  Future<void> load() async {
    _isLoading = true;
    notifyListeners();
    _items = await _repository.getNotifications();
    _isLoading = false;
    notifyListeners();
  }

  Future<void> markAsRead(String id) async {
    await _repository.markAsRead(id);
    final idx = _items.indexWhere((i) => i.id == id);
    if (idx != -1) {
      _items[idx] = _items[idx].copyWith(isRead: true);
      notifyListeners();
    }
  }

  Future<void> markAllAsRead() async {
    await _repository.markAllAsRead();
    _items = _items.map((i) => i.copyWith(isRead: true)).toList();
    notifyListeners();
  }
}
