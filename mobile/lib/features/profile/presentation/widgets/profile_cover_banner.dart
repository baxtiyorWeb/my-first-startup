import 'dart:math' as math;
import 'package:material_ui/material_ui.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/app_media_image.dart';
import '../../../../core/widgets/liquid_glass.dart';

/// Tech-wave profile cover banner matching the Geters mobile profile design.
class ProfileCoverBanner extends StatelessWidget {
  final String displayName;
  final String? coverPhotoUrl;
  final String subtitle;

  const ProfileCoverBanner({
    super.key,
    required this.displayName,
    this.coverPhotoUrl,
    this.subtitle = 'Code • Build • Share • Grow',
  });

  @override
  Widget build(BuildContext context) {
    final hasCustomCover = coverPhotoUrl != null && coverPhotoUrl!.isNotEmpty;

    return Stack(
      fit: StackFit.expand,
      children: [
        if (hasCustomCover)
          AppMediaImage(
            source: coverPhotoUrl!,
            fit: BoxFit.cover,
          )
        else
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppColors.backgroundDark,
                  AppColors.surfaceDark,
                  AppColors.surfaceDarkElevated,
                ],
              ),
            ),
          ),

        if (hasCustomCover)
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withAlpha(110),
                  Colors.black.withAlpha(185),
                ],
              ),
            ),
          )
        else
          CustomPaint(
            painter: _TechWavePainter(),
          ),

        // Subtle tilted </> glass badge on the right
        if (!hasCustomCover)
          Positioned(
            right: 26,
            bottom: 30,
            child: Transform.rotate(
              angle: -0.18,
              child: LiquidGlassContainer(
                width: 68,
                height: 68,
                borderRadius: 18,
                blurSigma: 14,
                borderColor: AppColors.info.withAlpha(75),
                child: Center(
                  child: Text(
                    '</>',
                    style: TextStyle(
                      color: AppColors.info.withAlpha(215),
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ),
            ),
          ),

        // Left-aligned GETERS + display name + tagline
        Positioned(
          left: 22,
          right: 112,
          bottom: 56,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'GETERS',
                style: TextStyle(
                  color: Colors.white.withAlpha(135),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 2.8,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                displayName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                subtitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: Colors.white.withAlpha(165),
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                width: 24,
                height: 2.5,
                decoration: BoxDecoration(
                  color: AppColors.primaryLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _TechWavePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    // Ambient radial glow on top-right
    final glowPaint = Paint()
      ..shader = RadialGradient(
        center: const Alignment(0.55, -0.15),
        radius: 0.95,
        colors: [
          AppColors.primary.withAlpha(95),
          AppColors.info.withAlpha(45),
          Colors.transparent,
        ],
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));
    canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), glowPaint);

    // Smooth glowing wave ribbons
    _drawWave(
      canvas,
      size,
      yStart: size.height * 0.92,
      yMid: size.height * 0.62,
      yEnd: size.height * 0.45,
      color: AppColors.info.withAlpha(155),
      strokeWidth: 2.2,
      blur: 6,
    );
    _drawWave(
      canvas,
      size,
      yStart: size.height * 0.96,
      yMid: size.height * 0.78,
      yEnd: size.height * 0.25,
      color: AppColors.primaryLight.withAlpha(110),
      strokeWidth: 1.5,
      blur: 4,
    );
    _drawWave(
      canvas,
      size,
      yStart: size.height * 0.85,
      yMid: size.height * 0.95,
      yEnd: size.height * 0.68,
      color: AppColors.info.withAlpha(65),
      strokeWidth: 1.2,
      blur: 2,
    );

    // Subtle bokeh particles
    final dotPaint = Paint()..color = AppColors.info.withAlpha(120);
    for (var i = 0; i < 14; i++) {
      final dx = size.width * (0.28 + ((i * 37) % 70) / 100);
      final dy = size.height * (0.2 + ((i * 53) % 72) / 100);
      final r = 0.8 + (math.sin(i.toDouble()).abs() * 1.4);
      canvas.drawCircle(Offset(dx, dy), r, dotPaint);
    }
  }

  void _drawWave(
    Canvas canvas,
    Size size, {
    required double yStart,
    required double yMid,
    required double yEnd,
    required Color color,
    required double strokeWidth,
    required double blur,
  }) {
    final path = Path()
      ..moveTo(0, yStart)
      ..cubicTo(
        size.width * 0.35,
        yMid + 26,
        size.width * 0.68,
        yMid - 34,
        size.width,
        yEnd,
      );

    final glow = Paint()
      ..color = color.withAlpha(90)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth * 3.2
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, blur);
    canvas.drawPath(path, glow);

    final line = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;
    canvas.drawPath(path, line);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
