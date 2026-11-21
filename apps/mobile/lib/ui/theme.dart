import 'package:flutter/material.dart';

/// DashDen visual theme. Colors mirror apps/web `tailwind.config.js`.
class AppTheme {
  const AppTheme._();

  // primary.*
  static const Color primary = Color(0xFF4A90E2); // blue
  static const Color secondary = Color(0xFF9B59B6); // purple
  static const Color pink = Color(0xFFE91E63);
  static const Color orange = Color(0xFFFF9800);
  static const Color green = Color(0xFF4CAF50);

  // bg.*
  static const Color bgLight = Color(0xFFF5F7FA);
  static const Color bgWhite = Color(0xFFFFFFFF);

  // text.*
  static const Color textPrimary = Color(0xFF2C3E50);
  static const Color textSecondary = Color(0xFF7F8C8D);
  static const Color textLight = Color(0xFFBDC3C7);

  // status.*
  static const Color success = Color(0xFF27AE60);
  static const Color error = Color(0xFFE74C3C);
  static const Color warning = Color(0xFFF39C12);
  static const Color info = Color(0xFF3498DB);

  /// Web font stack is Poppins, Comic Sans MS, sans-serif. The font files are
  /// not bundled yet, so platforms without Poppins use the system font.
  static const String fontFamily = 'Poppins';
  static const List<String> fontFamilyFallback = ['Comic Sans MS'];

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
    ).copyWith(
      primary: primary,
      secondary: secondary,
      tertiary: pink,
      error: error,
      surface: bgWhite,
      onSurface: textPrimary,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: fontFamily,
      fontFamilyFallback: fontFamilyFallback,
      scaffoldBackgroundColor: bgLight,
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        backgroundColor: bgWhite,
        foregroundColor: textPrimary,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: bgWhite,
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  static const LinearGradient brandGradient = LinearGradient(
    colors: [primary, secondary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
