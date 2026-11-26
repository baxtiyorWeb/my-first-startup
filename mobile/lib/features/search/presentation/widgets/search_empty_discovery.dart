import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/app_avatar.dart';
import '../../../../core/widgets/app_button.dart';
import '../../../../core/widgets/verified_badge.dart';
import '../../../feed/data/feed_controller.dart';
import '../../../feed/models/author.dart';
import '../../../feed/models/post.dart';
import '../../../tags/data/tags_controller.dart';
import '../../../tags/models/tag_item.dart';

class SearchEmptyDiscovery extends StatelessWidget {
  final TagsController tagsController;
  final FeedController feedController;
  final List<Post> allPosts;
  final bool isDark;
  final ValueChanged<String> onSelectTag;
  final ValueChanged<Author> onAuthorTap;

  const SearchEmptyDiscovery({
    super.key,
    required this.tagsController,
    required this.feedController,
    required this.allPosts,
    required this.isDark,
    required this.onSelectTag,
    required this.onAuthorTap,
  });

  static const List<Author> _recommendedAuthors = [
    Author(
      id: 'u3',
      name: 'Madina Karimova',
      handle: 'madina_ux',
      role: 'Product Designer @ FinTech',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      verified: true,
    ),
    Author(
      id: 'u2',
      name: 'Sardor Rahimov',
      handle: 'sardor_dev',
      role: 'Full-Stack Developer',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      verified: true,
    ),
    Author(
      id: 'u4',
      name: 'Javohir Toshmatov',
      handle: 'javohir_ai',
      role: 'AI Researcher & ML Engineer',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      verified: true,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
      physics: const BouncingScrollPhysics(),
      children: [
        _sectionCard(child: _buildTrendingCard()),
        const SizedBox(height: 16),
        _sectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.people_alt_outlined, size: 18, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Tavsiya etilgan mualliflar',
                    style: AppTypography.heading3.copyWith(
                      fontSize: 15,
                      color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              ..._recommendedAuthors.map((author) {
                final isFollowing = allPosts.any(
                  (p) => p.author.handle == author.handle && p.author.isFollowing,
                );
                return _buildAuthorRow(author, isFollowing);
              }),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTrendingCard() {
    final trends = tagsController.trendingTags;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.local_fire_department_rounded, size: 19, color: AppColors.warning),
            const SizedBox(width: 8),
            Text(
              'Trend teglar',
              style: AppTypography.heading3.copyWith(
                fontSize: 15,
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (trends.isEmpty && tagsController.isLoadingTrending)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Center(
              child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
            ),
          )
        else if (trends.isEmpty && tagsController.trendingError != null)
          TextButton.icon(
            onPressed: () => tagsController.loadTrending(forceRefresh: true),
            icon: const Icon(Icons.refresh_rounded, size: 16),
            label: const Text('Teglarni qayta yuklash'),
          )
        else if (trends.isEmpty)
          Text(
            'Hozircha trend teglar topilmadi',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight,
            ),
          )
        else
          ...trends.asMap().entries.map((e) => _buildTopicRow(e.key + 1, e.value)),
      ],
    );
  }

  Widget _sectionCard({required Widget child}) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? AppColors.surfaceDark : AppColors.surfaceLight,
          borderRadius: BorderRadius.circular(AppTheme.radiusCard),
          border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        ),
        child: child,
      );

  Widget _buildTopicRow(int idx, TagItem tag) {
    final countLabel = tag.usageCount >= 1000
        ? '${(tag.usageCount / 1000).toStringAsFixed(1)}K post'
        : '${tag.usageCount} post';
    return InkWell(
      onTap: () => onSelectTag(tag.name),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: isDark ? AppColors.surfaceDarkSubtle : AppColors.surfaceLightElevated,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
              ),
              alignment: Alignment.center,
              child: Text(
                '$idx',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primary),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                '#${tag.name}',
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                ),
              ),
            ),
            if (tag.usageCount > 0)
              Text(
                countLabel,
                style: TextStyle(fontSize: 12, color: isDark ? AppColors.textMutedDark : AppColors.textMutedLight),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAuthorRow(Author author, bool isFollowing) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => onAuthorTap(author),
            child: AppAvatar(imageUrl: author.avatarUrl, name: author.name, size: 40),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: GestureDetector(
              onTap: () => onAuthorTap(author),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          author.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                      if (author.verified) ...[
                        const SizedBox(width: 4),
                        const VerifiedBadge(size: 14),
                      ],
                    ],
                  ),
                  Text(
                    author.role,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.textMutedDark : AppColors.textSecondaryLight,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          AppButton(
            text: isFollowing ? 'Kuzatilmoqda' : 'Kuzatish',
            variant: isFollowing ? ButtonVariant.outline : ButtonVariant.primary,
            size: ButtonSize.sm,
            onPressed: () => feedController.toggleFollowAuthor(author.handle),
          ),
        ],
      ),
    );
  }
}
