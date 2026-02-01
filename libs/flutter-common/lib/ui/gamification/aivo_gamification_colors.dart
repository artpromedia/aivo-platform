/// Aivo Gamification Colors
///
/// Standardized gamification colors matching web design tokens.
/// Used for XP, streaks, achievements, hearts, coins, and challenges.
library;

import 'package:flutter/material.dart';

/// Gamification-specific colors for learner engagement.
///
/// These colors are used across all gamification elements:
/// - XP and progress bars
/// - Streaks and flames
/// - Achievement badges (Gold, Silver, Bronze, Platinum)
/// - Hearts/Lives
/// - Coins/Currency
/// - Challenge cards
abstract final class AivoGamificationColors {
  // ════════════════════════════════════════════════════════════════════════════
  // XP & PROGRESS COLORS (Mint gradient)
  // ════════════════════════════════════════════════════════════════════════════

  /// Primary XP color - Mint-500
  static const Color xpPrimary = Color(0xFF10B981);

  /// Secondary XP color - Mint-600
  static const Color xpSecondary = Color(0xFF059669);

  /// Light XP background - Mint-100
  static const Color xpBackground = Color(0xFFD1FAE5);

  /// XP progress gradient
  static const LinearGradient xpGradient = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFF10B981), Color(0xFF059669)],
  );

  /// Level ring gradient (purple to blue)
  static const LinearGradient levelGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)],
  );

  // ════════════════════════════════════════════════════════════════════════════
  // STREAK COLORS (Fire gradient: Coral → Sunshine)
  // ════════════════════════════════════════════════════════════════════════════

  /// Streak fire base color - Coral-500
  static const Color streakFire = Color(0xFFFF6B6B);

  /// Streak flame top color - Sunshine-400
  static const Color streakFlame = Color(0xFFFBBF24);

  /// Streak ember glow - Sunshine-600
  static const Color streakEmber = Color(0xFFD97706);

  /// Fire gradient for streak flames
  static const LinearGradient streakGradient = LinearGradient(
    begin: Alignment.bottomCenter,
    end: Alignment.topCenter,
    colors: [Color(0xFFFF6B6B), Color(0xFFFFA500), Color(0xFFFBBF24)],
    stops: [0.0, 0.5, 1.0],
  );

  /// Streak glow shadow color
  static const Color streakGlow = Color(0x4DFF6B6B);

  // ════════════════════════════════════════════════════════════════════════════
  // ACHIEVEMENT BADGE COLORS
  // ════════════════════════════════════════════════════════════════════════════

  /// Gold badge primary - Sunshine-500
  static const Color badgeGold = Color(0xFFF59E0B);

  /// Gold badge highlight
  static const Color badgeGoldLight = Color(0xFFFBBF24);

  /// Gold badge shadow
  static const Color badgeGoldDark = Color(0xFFB45309);

  /// Silver badge primary - Gray-400
  static const Color badgeSilver = Color(0xFFA1A1AA);

  /// Silver badge highlight
  static const Color badgeSilverLight = Color(0xFFD4D4D8);

  /// Silver badge shadow
  static const Color badgeSilverDark = Color(0xFF71717A);

  /// Bronze badge primary - Sunshine-700
  static const Color badgeBronze = Color(0xFFB45309);

  /// Bronze badge highlight
  static const Color badgeBronzeLight = Color(0xFFD97706);

  /// Bronze badge shadow
  static const Color badgeBronzeDark = Color(0xFF92400E);

  /// Platinum badge primary - Purple-400
  static const Color badgePlatinum = Color(0xFFA78BFA);

  /// Platinum badge highlight
  static const Color badgePlatinumLight = Color(0xFFC4B5FD);

  /// Platinum badge shadow
  static const Color badgePlatinumDark = Color(0xFF7C3AED);

  /// Locked badge overlay color
  static const Color badgeLocked = Color(0xFF71717A);

  /// Badge background - Sunshine-100
  static const Color badgeBackground = Color(0xFFFEF3C7);

  /// Badge border - Sunshine-400
  static const Color badgeBorder = Color(0xFFFBBF24);

  // ════════════════════════════════════════════════════════════════════════════
  // HEARTS / LIVES COLORS
  // ════════════════════════════════════════════════════════════════════════════

  /// Full heart color - Coral-500
  static const Color heartFull = Color(0xFFFF6B6B);

  /// Empty heart color - Gray-300
  static const Color heartEmpty = Color(0xFFD4D4D8);

  /// Heart pulse glow
  static const Color heartGlow = Color(0x66FF6B6B);

  /// Broken heart accent
  static const Color heartBroken = Color(0xFFEF4444);

  // ════════════════════════════════════════════════════════════════════════════
  // COINS / CURRENCY COLORS
  // ════════════════════════════════════════════════════════════════════════════

  /// Gold coin primary - Sunshine-400
  static const Color coinGold = Color(0xFFFBBF24);

  /// Gold coin shadow/edge - Sunshine-700
  static const Color coinShadow = Color(0xFFB45309);

  /// Gold coin highlight
  static const Color coinHighlight = Color(0xFFFDE68A);

  /// Gem primary - Purple-500
  static const Color gemPrimary = Color(0xFF8B5CF6);

  /// Gem highlight - Purple-300
  static const Color gemHighlight = Color(0xFFC4B5FD);

  /// Gem shadow - Purple-700
  static const Color gemShadow = Color(0xFF6D28D9);

  // ════════════════════════════════════════════════════════════════════════════
  // CHALLENGE DIFFICULTY COLORS
  // ════════════════════════════════════════════════════════════════════════════

  /// Easy difficulty - Mint-500
  static const Color difficultyEasy = Color(0xFF10B981);

  /// Medium difficulty - Sunshine-500
  static const Color difficultyMedium = Color(0xFFF59E0B);

  /// Hard difficulty - Coral-500
  static const Color difficultyHard = Color(0xFFFF6B6B);

  /// Expert difficulty - Purple-500
  static const Color difficultyExpert = Color(0xFF8B5CF6);

  // ════════════════════════════════════════════════════════════════════════════
  // CHALLENGE TYPE COLORS
  // ════════════════════════════════════════════════════════════════════════════

  /// Daily challenge - Blue-500
  static const Color challengeDaily = Color(0xFF3B82F6);

  /// Weekly challenge - Purple-500
  static const Color challengeWeekly = Color(0xFF8B5CF6);

  /// Monthly challenge - Teal-500
  static const Color challengeMonthly = Color(0xFF14B8A6);

  /// Special challenge - Sunshine-500
  static const Color challengeSpecial = Color(0xFFF59E0B);

  // ════════════════════════════════════════════════════════════════════════════
  // CELEBRATION COLORS
  // ════════════════════════════════════════════════════════════════════════════

  /// Level up primary - Coral
  static const Color celebrationPrimary = Color(0xFFFF6B6B);

  /// Level up secondary - Sunshine
  static const Color celebrationSecondary = Color(0xFFFBBF24);

  /// Level up tertiary - Purple
  static const Color celebrationTertiary = Color(0xFF8B5CF6);

  /// Success color - Mint-500
  static const Color celebrationSuccess = Color(0xFF10B981);

  /// Confetti colors
  static const List<Color> confettiColors = [
    Color(0xFFFF6B6B), // Coral
    Color(0xFFFBBF24), // Sunshine
    Color(0xFF8B5CF6), // Purple
    Color(0xFF10B981), // Mint
    Color(0xFF3B82F6), // Blue
    Color(0xFFF472B6), // Pink
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /// Get badge colors for a tier.
  static ({Color primary, Color light, Color dark}) badgeColorsForTier(
    BadgeTier tier,
  ) {
    return switch (tier) {
      BadgeTier.bronze => (
          primary: badgeBronze,
          light: badgeBronzeLight,
          dark: badgeBronzeDark
        ),
      BadgeTier.silver => (
          primary: badgeSilver,
          light: badgeSilverLight,
          dark: badgeSilverDark
        ),
      BadgeTier.gold => (
          primary: badgeGold,
          light: badgeGoldLight,
          dark: badgeGoldDark
        ),
      BadgeTier.platinum => (
          primary: badgePlatinum,
          light: badgePlatinumLight,
          dark: badgePlatinumDark
        ),
    };
  }

  /// Get difficulty color.
  static Color difficultyColor(Difficulty difficulty) {
    return switch (difficulty) {
      Difficulty.easy => difficultyEasy,
      Difficulty.medium => difficultyMedium,
      Difficulty.hard => difficultyHard,
      Difficulty.expert => difficultyExpert,
    };
  }

  /// Get challenge type color.
  static Color challengeTypeColor(ChallengeType type) {
    return switch (type) {
      ChallengeType.daily => challengeDaily,
      ChallengeType.weekly => challengeWeekly,
      ChallengeType.monthly => challengeMonthly,
      ChallengeType.special => challengeSpecial,
    };
  }
}

/// Achievement badge tiers.
enum BadgeTier {
  bronze,
  silver,
  gold,
  platinum,
}

/// Challenge difficulty levels.
enum Difficulty {
  easy,
  medium,
  hard,
  expert,
}

/// Challenge types.
enum ChallengeType {
  daily,
  weekly,
  monthly,
  special,
}
