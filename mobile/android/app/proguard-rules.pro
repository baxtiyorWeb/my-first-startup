# Flutter & Android release R8 rules for Geters
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Flutter deferred components (Play Core optional dependency)
-dontwarn com.google.android.play.core.**

# Google Sign-In & Play Services
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# RevenueCat / Play Billing
-keep class com.revenuecat.purchases.** { *; }
-keep class com.android.billingclient.** { *; }
-dontwarn com.revenuecat.purchases.**

# Secure Storage / Tink
-keep class com.google.crypto.tink.** { *; }
-dontwarn com.google.crypto.tink.**
