import 'package:material_ui/material_ui.dart';
import 'package:flutter/services.dart';
import 'app.dart';
import 'core/constants/api_constants.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // A release build without API_BASE_URL would send requests to the device
  // itself; fail immediately instead of shipping a broken app.
  ApiConstants.assertConfiguredForRelease();

  // Bound decoded image memory to keep feed scrolling fluid on mid-range devices.
  PaintingBinding.instance.imageCache
    ..maximumSize = 120
    ..maximumSizeBytes = 80 * 1024 * 1024;

  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Colors.transparent,
    ),
  );

  runApp(const GoGettersApp());
}
