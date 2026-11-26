import 'package:material_ui/material_ui.dart';

class PostVisibilityOption {
  final String id;
  final String label;
  final IconData icon;

  const PostVisibilityOption({
    required this.id,
    required this.label,
    required this.icon,
  });
}

abstract class AppConstants {
  static const int maxPostContentLength = 280;
  static const int maxPostMediaCount = 3;
  static const int maxPostTags = 5;

  static const List<PostVisibilityOption> postVisibilities = [
    PostVisibilityOption(
      id: 'public',
      label: 'Ommaviy',
      icon: Icons.language_rounded,
    ),
    PostVisibilityOption(
      id: 'followers',
      label: 'Obunachilar',
      icon: Icons.group_outlined,
    ),
  ];
}
