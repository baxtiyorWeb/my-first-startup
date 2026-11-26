import 'package:material_ui/material_ui.dart';

/// Isolates keyboard `viewInsets.bottom` subscriptions so only bottom padding
/// updates during keyboard open/close frames without rebuilding inner forms or lists.
class KeyboardInsetPadding extends StatelessWidget {
  final Widget child;
  final EdgeInsets extraPadding;

  const KeyboardInsetPadding({
    super.key,
    required this.child,
    this.extraPadding = EdgeInsets.zero,
  });

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        extraPadding.left,
        extraPadding.top,
        extraPadding.right,
        extraPadding.bottom + bottomInset,
      ),
      child: child,
    );
  }
}
