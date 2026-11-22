import 'dart:math';

import 'package:dashden_mobile/game/bond_and_burn/logic.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/lcg_random.dart';

/// Port of apps/web `utils/__tests__/bondAndBurnPeriodicTable.test.ts`, plus the
/// rules of `bondAndBurnLogic.ts`.
void main() {
  group('every recipe is completable from the periodic table', () {
    for (final diff in kBondDifficulties) {
      final config = bondConfig(diff);
      final tableSymbols = bondPeriodicTable(diff).map((e) => e.symbol).toSet();

      test('$diff only references recipes that exist', () {
        for (final id in config.availableRecipeIds) {
          expect(bondRecipeById(id), isNotNull, reason: '$diff: unknown recipe $id');
        }
      });

      for (final id in config.availableRecipeIds) {
        final recipe = bondRecipeById(id)!;
        test('$diff: ${recipe.name} (${recipe.formula}) has every ingredient on the table', () {
          for (final ing in recipe.ingredients) {
            expect(tableSymbols, contains(ing.symbol), reason: '$diff/$id: ${ing.symbol} missing from the table');
            expect(config.elements, contains(ing.symbol), reason: '$diff/$id: ${ing.symbol} not a game element');
            expect(kBondElements[ing.symbol], isNotNull, reason: '$diff/$id: ${ing.symbol} not defined');
          }
        });
      }

      test('$diff shows every configured game element on the table', () {
        for (final s in config.elements) {
          expect(tableSymbols, contains(s));
        }
      });

      test('$diff selectRecipes only returns completable recipes', () {
        for (var seed = 1; seed <= 20; seed++) {
          for (final r in selectRecipes(diff, config.recipes, Random(seed))) {
            for (final ing in r.ingredients) {
              expect(tableSymbols, contains(ing.symbol));
            }
          }
        }
      });
    }
  });

  test('Easy shows Na and Cl (Table Salt regression)', () {
    final symbols = bondPeriodicTable('easy').map((e) => e.symbol);
    expect(symbols, containsAll(['Na', 'Cl']));
    expect(bondConfig('easy').availableRecipeIds, contains('salt'));
  });

  test('table tiles have unique symbols and unique grid cells', () {
    for (final d in kBondDifficulties) {
      final t = bondPeriodicTable(d);
      expect({for (final e in t) e.symbol}, hasLength(t.length));
      expect({for (final e in t) '${e.row}:${e.col}'}, hasLength(t.length));
    }
  });

  test('an unknown difficulty falls back to the easy table and config', () {
    expect(bondPeriodicTable('1').map((e) => e.symbol), bondPeriodicTable('easy').map((e) => e.symbol));
    expect(bondDifficultyParam('1'), 'easy');
    expect(bondDifficultyParam('hard'), 'hard');
    expect(bondDifficultyParam(null), 'easy');
  });

  test('server difficulty numbers', () {
    expect([for (final d in kBondDifficulties) bondDifficultyValue(d)], [1, 2, 3]);
  });

  group('rules', () {
    final water = bondRecipeById('water')!;

    test('selectRecipes gives distinct recipes of the difficulty', () {
      for (final d in kBondDifficulties) {
        final picked = selectRecipes(d, bondConfig(d).recipes, LcgRandom(3));
        expect(picked.map((r) => r.id).toSet(), hasLength(picked.length));
        expect(picked.length, lessThanOrEqualTo(bondConfig(d).recipes));
        for (final r in picked) {
          expect(bondConfig(d).availableRecipeIds, contains(r.id));
        }
      }
      expect(selectRecipes('easy', 5, Random(1)), hasLength(3), reason: 'easy has only 3 recipes');
      expect(selectRecipes('hard', 5, Random(1)), hasLength(5));
    });

    test('canPlaceElement stops at the recipe count', () {
      expect(canPlaceElement([], water, 'H'), isTrue);
      expect(canPlaceElement(['H'], water, 'H'), isTrue);
      expect(canPlaceElement(['H', 'H'], water, 'H'), isFalse);
      expect(canPlaceElement([], water, 'O'), isTrue);
      expect(canPlaceElement(['O'], water, 'O'), isFalse);
      expect(canPlaceElement([], water, 'Na'), isFalse, reason: 'not an ingredient');
    });

    test('checkRecipeComplete needs every ingredient in the chamber', () {
      expect(checkRecipeComplete(['H', 'O'], water), isFalse);
      expect(checkRecipeComplete(['H', 'H', 'O'], water), isTrue);
      expect(checkRecipeComplete(['O', 'H', 'H'], water), isTrue);
      expect(water.totalIngredients, 3);
    });

    test('heat stays between 0 and 100', () {
      expect(calculateHeat(95, 10), 100);
      expect(calculateHeat(5, -12), 0);
      expect(calculateHeat(50, 8), 58);
    });

    test('recipe score: difficulty x speed x combo (combo capped at 3)', () {
      expect(calculateRecipeScore(water, 3, 1, 'easy'), 200, reason: '100 x 1 x 2 x 1');
      expect(calculateRecipeScore(water, 20, 1, 'easy'), 100, reason: 'slow: no speed bonus');
      expect(calculateRecipeScore(water, 12.5, 1, 'easy'), 150, reason: 'halfway: 1.5x');
      expect(calculateRecipeScore(water, 3, 2, 'medium'), 600, reason: '100 x 1.5 x 2 x 2');
      expect(calculateRecipeScore(water, 3, 9, 'hard'), 1200, reason: '100 x 2 x 2 x 3 (cap)');
    });

    test('the score shown is capped at 8000', () {
      expect(calculateFinalScore(7999), 7999);
      expect(calculateFinalScore(12000), 8000);
    });
  });
}
