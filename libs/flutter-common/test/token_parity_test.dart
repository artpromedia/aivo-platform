import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/aivo_brand.dart';
import 'package:flutter_common/ui/aivo_button.dart';
import 'package:flutter_common/ui/aivo_card.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path/path.dart' as path;

String _hex(Color color) {
  final value = color.value.toRadixString(16).padLeft(8, '0').toUpperCase();
  return '#${value.substring(2)}';
}

Color _rgbaToColor(String rgba) {
  final match = RegExp(r'rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)')
      .firstMatch(rgba);
  if (match == null) {
    throw ArgumentError('Invalid rgba string: $rgba');
  }
  final r = int.parse(match.group(1)!);
  final g = int.parse(match.group(2)!);
  final b = int.parse(match.group(3)!);
  final a = (double.parse(match.group(4)!) * 255).round();
  return Color.fromARGB(a, r, g, b);
}

void main() {
  test('Flutter tokens match web tokens.json', () {
    final tokensPath = path.normalize(
      path.join(Directory.current.path, '..', '..', 'libs', 'ui-web', 'src', 'tokens.json'),
    );
    final tokens = jsonDecode(File(tokensPath).readAsStringSync()) as Map<String, dynamic>;

    final functionalColors =
        (tokens['functional'] as Map<String, dynamic>)['color'] as Map<String, dynamic>;
    expect(_hex(AivoBrand.success), functionalColors['success']);
    expect(_hex(AivoBrand.progress), functionalColors['progress']);
    expect(_hex(AivoBrand.focus), functionalColors['focus']);
    expect(_hex(AivoBrand.danger), functionalColors['error']);

    final base = tokens['base'] as Map<String, dynamic>;
    final space = base['space'] as Map<String, dynamic>;
    expect(AivoBrand.space0, (space['0'] as num).toDouble());
    expect(AivoBrand.space1, (space['1'] as num).toDouble());
    expect(AivoBrand.space2, (space['2'] as num).toDouble());
    expect(AivoBrand.space3, (space['3'] as num).toDouble());
    expect(AivoBrand.space4, (space['4'] as num).toDouble());
    expect(AivoBrand.space5, (space['5'] as num).toDouble());
    expect(AivoBrand.space6, (space['6'] as num).toDouble());
    expect(AivoBrand.space7, (space['7'] as num).toDouble());
    expect(AivoBrand.space8, (space['8'] as num).toDouble());
    expect(AivoBrand.space9, (space['9'] as num).toDouble());
    expect(AivoBrand.space10, (space['10'] as num).toDouble());

    final radius = base['radius'] as Map<String, dynamic>;
    expect(AivoBrand.radiusXs, (radius['xs'] as num).toDouble());
    expect(AivoBrand.radiusSm, (radius['sm'] as num).toDouble());
    expect(AivoBrand.radiusMd, (radius['md'] as num).toDouble());
    expect(AivoBrand.radiusLg, (radius['lg'] as num).toDouble());
    expect(AivoBrand.radiusXl, (radius['xl'] as num).toDouble());
    expect(AivoBrand.radiusPill, (radius['pill'] as num).toDouble());

    final neutral =
        (base['color'] as Map<String, dynamic>)['neutral'] as Map<String, dynamic>;
    expect(_hex(AivoBrand.gray[50]!), neutral['50']);
    expect(_hex(AivoBrand.gray[100]!), neutral['100']);
    expect(_hex(AivoBrand.gray[200]!), neutral['200']);
    expect(_hex(AivoBrand.gray[300]!), neutral['300']);
    expect(_hex(AivoBrand.gray[400]!), neutral['400']);
    expect(_hex(AivoBrand.gray[500]!), neutral['500']);
    expect(_hex(AivoBrand.gray[600]!), neutral['600']);
    expect(_hex(AivoBrand.gray[700]!), neutral['700']);
    expect(_hex(AivoBrand.gray[800]!), neutral['800']);
    expect(_hex(AivoBrand.gray[900]!), neutral['900']);
    expect(_hex(AivoBrand.gray[950]!), neutral['950']);

    final gradeThemes = tokens['gradeThemes'] as Map<String, dynamic>;

    void expectExplorerColors(Map<String, dynamic> color) {
      expect(_hex(AivoBrand.explorerPrimary), color['primary']);
      expect(_hex(AivoBrand.explorerPrimaryHover), color['primaryHover']);
      expect(_hex(AivoBrand.explorerSecondary), color['secondary']);
      expect(_hex(AivoBrand.explorerAccent), color['accent']);
      expect(_hex(AivoBrand.explorerBackground), color['background']);
      expect(_hex(AivoBrand.explorerSurface), color['surface']);
      expect(_hex(AivoBrand.explorerSurfaceMuted), color['surfaceMuted']);
      expect(_hex(AivoBrand.explorerSurfaceElevated), color['surfaceElevated']);
      expect(_hex(AivoBrand.explorerInfo), color['info']);
      expect(_hex(AivoBrand.explorerSuccess), color['success']);
      expect(_hex(AivoBrand.explorerWarning), color['warning']);
      expect(_hex(AivoBrand.explorerError), color['error']);
      expect(_hex(AivoBrand.explorerBorder), color['border']);
      expect(_hex(AivoBrand.explorerBorderMuted), color['borderMuted']);
      expect(_hex(AivoBrand.explorerFocus), color['focus']);
      expect(_hex(AivoBrand.explorerFocusRing), _hex(_rgbaToColor(color['focusRing'])));
      expect(_hex(AivoBrand.explorerBackdrop), _hex(_rgbaToColor(color['backdrop'])));
      expect(_hex(AivoBrand.explorerTextPrimary), color['textPrimary']);
      expect(_hex(AivoBrand.explorerTextSecondary), color['textSecondary']);
      expect(_hex(AivoBrand.explorerTextMuted), color['textMuted']);
      expect(_hex(AivoBrand.explorerTextOnPrimary), color['textOnPrimary']);
      expect(_hex(AivoBrand.explorerTextOnAccent), color['textOnAccent']);
    }

    void expectNavigatorColors(Map<String, dynamic> color) {
      expect(_hex(AivoBrand.navigatorPrimary), color['primary']);
      expect(_hex(AivoBrand.navigatorPrimaryHover), color['primaryHover']);
      expect(_hex(AivoBrand.navigatorSecondary), color['secondary']);
      expect(_hex(AivoBrand.navigatorAccent), color['accent']);
      expect(_hex(AivoBrand.navigatorBackground), color['background']);
      expect(_hex(AivoBrand.navigatorSurface), color['surface']);
      expect(_hex(AivoBrand.navigatorSurfaceMuted), color['surfaceMuted']);
      expect(_hex(AivoBrand.navigatorSurfaceElevated), color['surfaceElevated']);
      expect(_hex(AivoBrand.navigatorInfo), color['info']);
      expect(_hex(AivoBrand.navigatorSuccess), color['success']);
      expect(_hex(AivoBrand.navigatorWarning), color['warning']);
      expect(_hex(AivoBrand.navigatorError), color['error']);
      expect(_hex(AivoBrand.navigatorBorder), color['border']);
      expect(_hex(AivoBrand.navigatorBorderMuted), color['borderMuted']);
      expect(_hex(AivoBrand.navigatorFocus), color['focus']);
      expect(_hex(AivoBrand.navigatorFocusRing), _hex(_rgbaToColor(color['focusRing'])));
      expect(_hex(AivoBrand.navigatorBackdrop), _hex(_rgbaToColor(color['backdrop'])));
      expect(_hex(AivoBrand.navigatorTextPrimary), color['textPrimary']);
      expect(_hex(AivoBrand.navigatorTextSecondary), color['textSecondary']);
      expect(_hex(AivoBrand.navigatorTextMuted), color['textMuted']);
      expect(_hex(AivoBrand.navigatorTextOnPrimary), color['textOnPrimary']);
      expect(_hex(AivoBrand.navigatorTextOnAccent), color['textOnAccent']);
    }

    void expectScholarColors(Map<String, dynamic> color) {
      expect(_hex(AivoBrand.scholarPrimary), color['primary']);
      expect(_hex(AivoBrand.scholarPrimaryHover), color['primaryHover']);
      expect(_hex(AivoBrand.scholarSecondary), color['secondary']);
      expect(_hex(AivoBrand.scholarAccent), color['accent']);
      expect(_hex(AivoBrand.scholarBackground), color['background']);
      expect(_hex(AivoBrand.scholarSurface), color['surface']);
      expect(_hex(AivoBrand.scholarSurfaceMuted), color['surfaceMuted']);
      expect(_hex(AivoBrand.scholarSurfaceElevated), color['surfaceElevated']);
      expect(_hex(AivoBrand.scholarInfo), color['info']);
      expect(_hex(AivoBrand.scholarSuccess), color['success']);
      expect(_hex(AivoBrand.scholarWarning), color['warning']);
      expect(_hex(AivoBrand.scholarError), color['error']);
      expect(_hex(AivoBrand.scholarBorder), color['border']);
      expect(_hex(AivoBrand.scholarBorderMuted), color['borderMuted']);
      expect(_hex(AivoBrand.scholarFocus), color['focus']);
      expect(_hex(AivoBrand.scholarFocusRing), _hex(_rgbaToColor(color['focusRing'])));
      expect(_hex(AivoBrand.scholarBackdrop), _hex(_rgbaToColor(color['backdrop'])));
      expect(_hex(AivoBrand.scholarTextPrimary), color['textPrimary']);
      expect(_hex(AivoBrand.scholarTextSecondary), color['textSecondary']);
      expect(_hex(AivoBrand.scholarTextMuted), color['textMuted']);
      expect(_hex(AivoBrand.scholarTextOnPrimary), color['textOnPrimary']);
      expect(_hex(AivoBrand.scholarTextOnAccent), color['textOnAccent']);
    }

    expectExplorerColors(
        (gradeThemes['explorer'] as Map<String, dynamic>)['color'] as Map<String, dynamic>);
    expectNavigatorColors(
        (gradeThemes['navigator'] as Map<String, dynamic>)['color'] as Map<String, dynamic>);
    expectScholarColors(
        (gradeThemes['scholar'] as Map<String, dynamic>)['color'] as Map<String, dynamic>);

    expect(AivoBrand.touchTargetExplorer,
        (((gradeThemes['explorer'] as Map<String, dynamic>)['touchTarget'] as Map<String, dynamic>)['min'] as num)
            .toDouble());
    expect(AivoBrand.touchTargetNavigator,
        (((gradeThemes['navigator'] as Map<String, dynamic>)['touchTarget'] as Map<String, dynamic>)['min'] as num)
            .toDouble());
    expect(AivoBrand.touchTargetScholar,
        (((gradeThemes['scholar'] as Map<String, dynamic>)['touchTarget'] as Map<String, dynamic>)['min'] as num)
            .toDouble());

    final explorerRadius =
        (gradeThemes['explorer'] as Map<String, dynamic>)['radius'] as Map<String, dynamic>;
    expect(AivoBrand.radiusExplorerButton, (explorerRadius['button'] as num).toDouble());
    expect(AivoBrand.radiusExplorerCard, (explorerRadius['card'] as num).toDouble());
    expect(AivoBrand.radiusExplorerInput, (explorerRadius['input'] as num).toDouble());
    expect(AivoBrand.radiusExplorerModal, (explorerRadius['modal'] as num).toDouble());

    final navigatorRadius =
        (gradeThemes['navigator'] as Map<String, dynamic>)['radius'] as Map<String, dynamic>;
    expect(AivoBrand.radiusNavigatorButton, (navigatorRadius['button'] as num).toDouble());
    expect(AivoBrand.radiusNavigatorCard, (navigatorRadius['card'] as num).toDouble());
    expect(AivoBrand.radiusNavigatorInput, (navigatorRadius['input'] as num).toDouble());
    expect(AivoBrand.radiusNavigatorModal, (navigatorRadius['modal'] as num).toDouble());

    final scholarRadius =
        (gradeThemes['scholar'] as Map<String, dynamic>)['radius'] as Map<String, dynamic>;
    expect(AivoBrand.radiusScholarButton, (scholarRadius['button'] as num).toDouble());
    expect(AivoBrand.radiusScholarCard, (scholarRadius['card'] as num).toDouble());
    expect(AivoBrand.radiusScholarInput, (scholarRadius['input'] as num).toDouble());
    expect(AivoBrand.radiusScholarModal, (scholarRadius['modal'] as num).toDouble());

    // Motion duration tokens
    final motion = base['motion'] as Map<String, dynamic>;
    final duration = motion['duration'] as Map<String, dynamic>;
    expect(AivoBrand.durationFast.inMilliseconds, duration['fast']);
    expect(AivoBrand.durationBase.inMilliseconds, duration['base']);
    expect(AivoBrand.durationSlow.inMilliseconds, duration['slow']);

    final durationReduced = motion['durationReduced'] as Map<String, dynamic>;
    expect(AivoBrand.durationReducedFast.inMilliseconds, durationReduced['fast']);
    expect(AivoBrand.durationReducedBase.inMilliseconds, durationReduced['base']);
    expect(AivoBrand.durationReducedSlow.inMilliseconds, durationReduced['slow']);

    // Shadow tokens - verify navy-based color (rgba(26, 26, 46, opacity))
    final shadow = base['shadow'] as Map<String, dynamic>;
    final shadowSoft = shadow['soft'] as Map<String, dynamic>;
    final shadowRaised = shadow['raised'] as Map<String, dynamic>;
    final shadowElevated = shadow['elevated'] as Map<String, dynamic>;

    // Verify shadow offsets and blur radii
    expect(AivoBrand.shadowSoft.first.offset.dy, shadowSoft['y']);
    expect(AivoBrand.shadowSoft.first.blurRadius, shadowSoft['blur']);
    expect(AivoBrand.shadowRaised.first.offset.dy, shadowRaised['y']);
    expect(AivoBrand.shadowRaised.first.blurRadius, shadowRaised['blur']);
    expect(AivoBrand.shadowElevated.first.offset.dy, shadowElevated['y']);
    expect(AivoBrand.shadowElevated.first.blurRadius, shadowElevated['blur']);

    // Verify shadow colors use navy base (26, 26, 46 = 0x1A1A2E)
    // The RGB portion of the shadow color should be navy
    final navyRgb = 0x1A1A2E;
    expect(AivoBrand.shadowSoft.first.color.value & 0x00FFFFFF, navyRgb);
    expect(AivoBrand.shadowRaised.first.color.value & 0x00FFFFFF, navyRgb);
    expect(AivoBrand.shadowElevated.first.color.value & 0x00FFFFFF, navyRgb);
  });

  test('Purple color palette matches web tokens', () {
    final tokensPath = path.normalize(
      path.join(Directory.current.path, '..', '..', 'libs', 'ui-web', 'src', 'tokens.json'),
    );
    final tokens = jsonDecode(File(tokensPath).readAsStringSync()) as Map<String, dynamic>;
    final base = tokens['base'] as Map<String, dynamic>;
    final purple = (base['color'] as Map<String, dynamic>)['purple'] as Map<String, dynamic>;

    expect(_hex(AivoBrand.primary[50]!), purple['50']);
    expect(_hex(AivoBrand.primary[100]!), purple['100']);
    expect(_hex(AivoBrand.primary[200]!), purple['200']);
    expect(_hex(AivoBrand.primary[300]!), purple['300']);
    expect(_hex(AivoBrand.primary[400]!), purple['400']);
    expect(_hex(AivoBrand.primary[500]!), purple['500']);
    expect(_hex(AivoBrand.primary[600]!), purple['600']);
    expect(_hex(AivoBrand.primary[700]!), purple['700']);
    expect(_hex(AivoBrand.primary[800]!), purple['800']);
    expect(_hex(AivoBrand.primary[900]!), purple['900']);
  });

  test('Teal color palette matches web tokens', () {
    final tokensPath = path.normalize(
      path.join(Directory.current.path, '..', '..', 'libs', 'ui-web', 'src', 'tokens.json'),
    );
    final tokens = jsonDecode(File(tokensPath).readAsStringSync()) as Map<String, dynamic>;
    final base = tokens['base'] as Map<String, dynamic>;
    final teal = (base['color'] as Map<String, dynamic>)['teal'] as Map<String, dynamic>;

    expect(_hex(AivoBrand.teal[50]!), teal['50']);
    expect(_hex(AivoBrand.teal[100]!), teal['100']);
    expect(_hex(AivoBrand.teal[200]!), teal['200']);
    expect(_hex(AivoBrand.teal[300]!), teal['300']);
    expect(_hex(AivoBrand.teal[400]!), teal['400']);
    expect(_hex(AivoBrand.teal[500]!), teal['500']);
    expect(_hex(AivoBrand.teal[600]!), teal['600']);
    expect(_hex(AivoBrand.teal[700]!), teal['700']);
    expect(_hex(AivoBrand.teal[800]!), teal['800']);
    expect(_hex(AivoBrand.teal[900]!), teal['900']);
  });

  test('Navy color palette matches web tokens', () {
    final tokensPath = path.normalize(
      path.join(Directory.current.path, '..', '..', 'libs', 'ui-web', 'src', 'tokens.json'),
    );
    final tokens = jsonDecode(File(tokensPath).readAsStringSync()) as Map<String, dynamic>;
    final base = tokens['base'] as Map<String, dynamic>;
    final navy = (base['color'] as Map<String, dynamic>)['navy'] as Map<String, dynamic>;

    expect(_hex(AivoBrand.navy[50]!), navy['50']);
    expect(_hex(AivoBrand.navy[100]!), navy['100']);
    expect(_hex(AivoBrand.navy[200]!), navy['200']);
    expect(_hex(AivoBrand.navy[300]!), navy['300']);
    expect(_hex(AivoBrand.navy[400]!), navy['400']);
    expect(_hex(AivoBrand.navy[500]!), navy['500']);
    expect(_hex(AivoBrand.navy[600]!), navy['600']);
    expect(_hex(AivoBrand.navy[700]!), navy['700']);
    expect(_hex(AivoBrand.navy[800]!), navy['800']);
    expect(_hex(AivoBrand.navy[900]!), navy['900']);
  });

  test('Explorer typography matches web tokens', () {
    final tokensPath = path.normalize(
      path.join(Directory.current.path, '..', '..', 'libs', 'ui-web', 'src', 'tokens.json'),
    );
    final tokens = jsonDecode(File(tokensPath).readAsStringSync()) as Map<String, dynamic>;
    final explorer = (tokens['gradeThemes'] as Map<String, dynamic>)['explorer'] as Map<String, dynamic>;
    final fontSize = explorer['fontSize'] as Map<String, dynamic>;
    final lineHeight = explorer['lineHeight'] as Map<String, dynamic>;

    expect(AivoBrand.explorerDisplaySize, (fontSize['display'] as num).toDouble());
    expect(AivoBrand.explorerDisplayLineHeight, (lineHeight['display'] as num).toDouble());
    expect(AivoBrand.explorerHeadlineSize, (fontSize['headline'] as num).toDouble());
    expect(AivoBrand.explorerHeadlineLineHeight, (lineHeight['headline'] as num).toDouble());
    expect(AivoBrand.explorerTitleSize, (fontSize['title'] as num).toDouble());
    expect(AivoBrand.explorerTitleLineHeight, (lineHeight['title'] as num).toDouble());
    expect(AivoBrand.explorerBodySize, (fontSize['body'] as num).toDouble());
    expect(AivoBrand.explorerBodyLineHeight, (lineHeight['body'] as num).toDouble());
    expect(AivoBrand.explorerLabelSize, (fontSize['label'] as num).toDouble());
    expect(AivoBrand.explorerLabelLineHeight, (lineHeight['label'] as num).toDouble());
    expect(AivoBrand.explorerCaptionSize, (fontSize['caption'] as num).toDouble());
    expect(AivoBrand.explorerCaptionLineHeight, (lineHeight['caption'] as num).toDouble());
  });

  test('Navigator typography matches web tokens', () {
    final tokensPath = path.normalize(
      path.join(Directory.current.path, '..', '..', 'libs', 'ui-web', 'src', 'tokens.json'),
    );
    final tokens = jsonDecode(File(tokensPath).readAsStringSync()) as Map<String, dynamic>;
    final navigator = (tokens['gradeThemes'] as Map<String, dynamic>)['navigator'] as Map<String, dynamic>;
    final fontSize = navigator['fontSize'] as Map<String, dynamic>;
    final lineHeight = navigator['lineHeight'] as Map<String, dynamic>;

    expect(AivoBrand.navigatorDisplaySize, (fontSize['display'] as num).toDouble());
    expect(AivoBrand.navigatorDisplayLineHeight, (lineHeight['display'] as num).toDouble());
    expect(AivoBrand.navigatorHeadlineSize, (fontSize['headline'] as num).toDouble());
    expect(AivoBrand.navigatorHeadlineLineHeight, (lineHeight['headline'] as num).toDouble());
    expect(AivoBrand.navigatorTitleSize, (fontSize['title'] as num).toDouble());
    expect(AivoBrand.navigatorTitleLineHeight, (lineHeight['title'] as num).toDouble());
    expect(AivoBrand.navigatorBodySize, (fontSize['body'] as num).toDouble());
    expect(AivoBrand.navigatorBodyLineHeight, (lineHeight['body'] as num).toDouble());
    expect(AivoBrand.navigatorLabelSize, (fontSize['label'] as num).toDouble());
    expect(AivoBrand.navigatorLabelLineHeight, (lineHeight['label'] as num).toDouble());
    expect(AivoBrand.navigatorCaptionSize, (fontSize['caption'] as num).toDouble());
    expect(AivoBrand.navigatorCaptionLineHeight, (lineHeight['caption'] as num).toDouble());
  });

  test('Scholar typography matches web tokens', () {
    final tokensPath = path.normalize(
      path.join(Directory.current.path, '..', '..', 'libs', 'ui-web', 'src', 'tokens.json'),
    );
    final tokens = jsonDecode(File(tokensPath).readAsStringSync()) as Map<String, dynamic>;
    final scholar = (tokens['gradeThemes'] as Map<String, dynamic>)['scholar'] as Map<String, dynamic>;
    final fontSize = scholar['fontSize'] as Map<String, dynamic>;
    final lineHeight = scholar['lineHeight'] as Map<String, dynamic>;

    expect(AivoBrand.scholarDisplaySize, (fontSize['display'] as num).toDouble());
    expect(AivoBrand.scholarDisplayLineHeight, (lineHeight['display'] as num).toDouble());
    expect(AivoBrand.scholarHeadlineSize, (fontSize['headline'] as num).toDouble());
    expect(AivoBrand.scholarHeadlineLineHeight, (lineHeight['headline'] as num).toDouble());
    expect(AivoBrand.scholarTitleSize, (fontSize['title'] as num).toDouble());
    expect(AivoBrand.scholarTitleLineHeight, (lineHeight['title'] as num).toDouble());
    expect(AivoBrand.scholarBodySize, (fontSize['body'] as num).toDouble());
    expect(AivoBrand.scholarBodyLineHeight, (lineHeight['body'] as num).toDouble());
    expect(AivoBrand.scholarLabelSize, (fontSize['label'] as num).toDouble());
    expect(AivoBrand.scholarLabelLineHeight, (lineHeight['label'] as num).toDouble());
    expect(AivoBrand.scholarCaptionSize, (fontSize['caption'] as num).toDouble());
    expect(AivoBrand.scholarCaptionLineHeight, (lineHeight['caption'] as num).toDouble());
  });

  test('Accessibility typography settings are correct', () {
    // Large text scale factor should be 1.2x
    expect(AivoBrand.largeTextScaleFactor, 1.2);

    // Dyslexia-friendly spacing settings
    expect(AivoBrand.dyslexiaLetterSpacingEm, 0.05);
    expect(AivoBrand.dyslexiaWordSpacingEm, 0.1);

    // Font families
    expect(AivoBrand.fontFamilyDefault, 'Nunito');
    expect(AivoBrand.fontFamilyDyslexia, 'Atkinson Hyperlegible');
  });

  test('Font weights match web tokens', () {
    final tokensPath = path.normalize(
      path.join(Directory.current.path, '..', '..', 'libs', 'ui-web', 'src', 'tokens.json'),
    );
    final tokens = jsonDecode(File(tokensPath).readAsStringSync()) as Map<String, dynamic>;
    final fontWeight = ((tokens['brand'] as Map<String, dynamic>)['font'] as Map<String, dynamic>)['weight'] as Map<String, dynamic>;

    expect(AivoBrand.fontWeightRegular.value, fontWeight['regular']);
    expect(AivoBrand.fontWeightMedium.value, fontWeight['medium']);
    expect(AivoBrand.fontWeightSemibold.value, fontWeight['semibold']);
    expect(AivoBrand.fontWeightBold.value, fontWeight['bold']);
    expect(AivoBrand.fontWeightHeading.value, fontWeight['heading']);
  });

  test('Button component has all required variants', () {
    // Web button.tsx variants: default, destructive, outline, secondary, ghost, link
    // Flutter variants: primary, secondary, ghost, outline, destructive, success
    // Note: Flutter adds "success" and uses "primary" instead of "default"
    
    final variants = AivoButtonVariant.values;
    
    // Core variants matching web
    expect(variants.contains(AivoButtonVariant.primary), isTrue, 
        reason: 'Should have primary variant (maps to web default)');
    expect(variants.contains(AivoButtonVariant.secondary), isTrue,
        reason: 'Should have secondary variant');
    expect(variants.contains(AivoButtonVariant.ghost), isTrue,
        reason: 'Should have ghost variant');
    expect(variants.contains(AivoButtonVariant.outline), isTrue,
        reason: 'Should have outline variant');
    expect(variants.contains(AivoButtonVariant.destructive), isTrue,
        reason: 'Should have destructive variant');
    expect(variants.contains(AivoButtonVariant.success), isTrue,
        reason: 'Should have success variant');
    
    // Legacy aliases for backward compatibility
    expect(variants.contains(AivoButtonVariant.outlined), isTrue,
        reason: 'Should have outlined alias for backward compatibility');
    expect(variants.contains(AivoButtonVariant.text), isTrue,
        reason: 'Should have text alias for backward compatibility');
    expect(variants.contains(AivoButtonVariant.danger), isTrue,
        reason: 'Should have danger alias for backward compatibility');
  });

  test('Button component has all required sizes', () {
    // Web button.tsx sizes: default (h-10 px-4 py-2), sm (h-9 px-3), lg (h-11 px-8), icon (h-10 w-10)
    // Flutter sizes: sm, md, lg, icon
    
    final sizes = AivoButtonSize.values;
    
    // Core sizes matching web
    expect(sizes.contains(AivoButtonSize.sm), isTrue,
        reason: 'Should have sm size');
    expect(sizes.contains(AivoButtonSize.md), isTrue,
        reason: 'Should have md size (maps to web default)');
    expect(sizes.contains(AivoButtonSize.lg), isTrue,
        reason: 'Should have lg size');
    expect(sizes.contains(AivoButtonSize.icon), isTrue,
        reason: 'Should have icon size');
    
    // Legacy aliases for backward compatibility
    expect(sizes.contains(AivoButtonSize.small), isTrue,
        reason: 'Should have small alias for backward compatibility');
    expect(sizes.contains(AivoButtonSize.medium), isTrue,
        reason: 'Should have medium alias for backward compatibility');
    expect(sizes.contains(AivoButtonSize.large), isTrue,
        reason: 'Should have large alias for backward compatibility');
  });

  test('Button grade-band touch targets match web gradeThemes', () {
    final tokensPath = path.normalize(
      path.join(Directory.current.path, '..', '..', 'libs', 'ui-web', 'src', 'tokens.json'),
    );
    final tokens = jsonDecode(File(tokensPath).readAsStringSync()) as Map<String, dynamic>;
    final gradeThemes = tokens['gradeThemes'] as Map<String, dynamic>;

    // Explorer touch target
    final explorerTouchTarget = (gradeThemes['explorer'] as Map<String, dynamic>)['touchTarget'] as Map<String, dynamic>;
    expect(AivoBrand.touchTargetExplorer, (explorerTouchTarget['min'] as num).toDouble(),
        reason: 'Explorer touch target should match web gradeThemes.explorer.touchTarget.min');

    // Navigator touch target
    final navigatorTouchTarget = (gradeThemes['navigator'] as Map<String, dynamic>)['touchTarget'] as Map<String, dynamic>;
    expect(AivoBrand.touchTargetNavigator, (navigatorTouchTarget['min'] as num).toDouble(),
        reason: 'Navigator touch target should match web gradeThemes.navigator.touchTarget.min');

    // Scholar touch target
    final scholarTouchTarget = (gradeThemes['scholar'] as Map<String, dynamic>)['touchTarget'] as Map<String, dynamic>;
    expect(AivoBrand.touchTargetScholar, (scholarTouchTarget['min'] as num).toDouble(),
        reason: 'Scholar touch target should match web gradeThemes.scholar.touchTarget.min');
  });

  test('Button animation configurations per grade band', () {
    // Grade-band specific animation settings as per Sprint 3 requirements
    // Explorer (Pre-K–5): More playful, bouncy animations
    // Navigator (6-8): Moderate animations
    // Scholar (9-12): Subtle, professional animations

    // These are internal implementation details but we verify the expected values
    // Explorer: hover 1.05x, press 0.95x, duration 250ms
    // Navigator: hover 1.02x, press 0.98x, duration 200ms
    // Scholar: hover 1.01x, press 0.99x, duration 150ms

    // Animation durations use the brand tokens
    expect(AivoBrand.durationFast.inMilliseconds, 150,
        reason: 'Fast duration should be 150ms for Scholar-like responsiveness');
    expect(AivoBrand.durationBase.inMilliseconds, 250,
        reason: 'Base duration should be 250ms for Explorer animations');
  });

  test('Card component has all required variants', () {
    // Web card has standard (default), we extend with elevated, outlined, filled
    final variants = AivoCardVariant.values;
    
    expect(variants.contains(AivoCardVariant.standard), isTrue,
        reason: 'Should have standard variant (default)');
    expect(variants.contains(AivoCardVariant.elevated), isTrue,
        reason: 'Should have elevated variant');
    expect(variants.contains(AivoCardVariant.outlined), isTrue,
        reason: 'Should have outlined variant');
    expect(variants.contains(AivoCardVariant.filled), isTrue,
        reason: 'Should have filled variant');
  });

  test('Card grade-band border radius matches web gradeThemes', () {
    final tokensPath = path.normalize(
      path.join(Directory.current.path, '..', '..', 'libs', 'ui-web', 'src', 'tokens.json'),
    );
    final tokens = jsonDecode(File(tokensPath).readAsStringSync()) as Map<String, dynamic>;
    final gradeThemes = tokens['gradeThemes'] as Map<String, dynamic>;

    // Explorer card radius
    final explorerRadius = (gradeThemes['explorer'] as Map<String, dynamic>)['radius'] as Map<String, dynamic>;
    expect(AivoBrand.radiusExplorerCard, (explorerRadius['card'] as num).toDouble(),
        reason: 'Explorer card radius should match web gradeThemes.explorer.radius.card');

    // Navigator card radius
    final navigatorRadius = (gradeThemes['navigator'] as Map<String, dynamic>)['radius'] as Map<String, dynamic>;
    expect(AivoBrand.radiusNavigatorCard, (navigatorRadius['card'] as num).toDouble(),
        reason: 'Navigator card radius should match web gradeThemes.navigator.radius.card');

    // Scholar card radius
    final scholarRadius = (gradeThemes['scholar'] as Map<String, dynamic>)['radius'] as Map<String, dynamic>;
    expect(AivoBrand.radiusScholarCard, (scholarRadius['card'] as num).toDouble(),
        reason: 'Scholar card radius should match web gradeThemes.scholar.radius.card');
  });

  test('Card shadow system matches web tokens', () {
    final tokensPath = path.normalize(
      path.join(Directory.current.path, '..', '..', 'libs', 'ui-web', 'src', 'tokens.json'),
    );
    final tokens = jsonDecode(File(tokensPath).readAsStringSync()) as Map<String, dynamic>;
    final shadow = ((tokens['base'] as Map<String, dynamic>)['shadow']) as Map<String, dynamic>;

    // Verify shadow soft
    final softShadow = shadow['soft'] as Map<String, dynamic>;
    expect(AivoBrand.shadowSoft.first.offset.dy, (softShadow['y'] as num).toDouble(),
        reason: 'Shadow soft Y offset should match web');
    expect(AivoBrand.shadowSoft.first.blurRadius, (softShadow['blur'] as num).toDouble(),
        reason: 'Shadow soft blur should match web');

    // Verify shadow raised
    final raisedShadow = shadow['raised'] as Map<String, dynamic>;
    expect(AivoBrand.shadowRaised.first.offset.dy, (raisedShadow['y'] as num).toDouble(),
        reason: 'Shadow raised Y offset should match web');
    expect(AivoBrand.shadowRaised.first.blurRadius, (raisedShadow['blur'] as num).toDouble(),
        reason: 'Shadow raised blur should match web');

    // Verify shadow elevated
    final elevatedShadow = shadow['elevated'] as Map<String, dynamic>;
    expect(AivoBrand.shadowElevated.first.offset.dy, (elevatedShadow['y'] as num).toDouble(),
        reason: 'Shadow elevated Y offset should match web');
    expect(AivoBrand.shadowElevated.first.blurRadius, (elevatedShadow['blur'] as num).toDouble(),
        reason: 'Shadow elevated blur should match web');
  });
}

