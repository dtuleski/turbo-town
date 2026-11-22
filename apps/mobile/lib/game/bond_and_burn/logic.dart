import 'dart:convert';
import 'dart:math';

import '../data/physics_data.g.dart';

/// Bond & Burn data and rules, ported from apps/web `bondAndBurnData.ts` and
/// `bondAndBurnLogic.ts`. Tables come from the web through
/// `tools/export_physics_data.mjs`.

const List<String> kBondDifficulties = ['easy', 'medium', 'hard'];

class BondElement {
  const BondElement({required this.symbol, required this.name, required this.emoji});
  final String symbol;
  final String name;

  /// Coloured dot, the web `emoji` field.
  final String emoji;
}

class RecipeIngredient {
  const RecipeIngredient(this.symbol, this.count);
  final String symbol;
  final int count;
}

class Recipe {
  const Recipe({
    required this.id,
    required this.name,
    required this.formula,
    required this.ingredients,
    required this.points,
    required this.funFact,
  });
  final String id;
  final String name;
  final String formula;
  final List<RecipeIngredient> ingredients;
  final int points;

  /// English text of the web data; the localized one is looked up by [id].
  final String funFact;

  int get totalIngredients => ingredients.fold(0, (sum, i) => sum + i.count);
}

class BondConfig {
  const BondConfig({
    required this.recipes,
    required this.heatRisePerSecond,
    required this.heatDropOnSuccess,
    required this.heatPenaltyWrong,
    required this.elements,
    required this.availableRecipeIds,
  });

  /// Recipes per round.
  final int recipes;
  final double heatRisePerSecond;
  final double heatDropOnSuccess;
  final double heatPenaltyWrong;

  /// Symbols the round hands out as "game elements".
  final List<String> elements;
  final List<String> availableRecipeIds;
}

class TableEntry {
  const TableEntry({required this.symbol, required this.name, required this.row, required this.col, required this.cat});
  final String symbol;
  final String name;
  final int row;
  final int col;

  /// Category: nonmetal, noble, alkali, alkaline, metalloid, halogen,
  /// transition or post-trans.
  final String cat;
}

final Map<String, dynamic> _json = jsonDecode(kBondAndBurnDataJson) as Map<String, dynamic>;

final Map<String, BondElement> kBondElements = {
  for (final e in (_json['elements'] as Map<String, dynamic>).entries)
    e.key: BondElement(
      symbol: (e.value as Map<String, dynamic>)['symbol'] as String,
      name: e.value['name'] as String,
      emoji: e.value['emoji'] as String,
    ),
};

final List<Recipe> kBondRecipes = [
  for (final r in _json['recipes'] as List)
    Recipe(
      id: (r as Map<String, dynamic>)['id'] as String,
      name: r['name'] as String,
      formula: r['formula'] as String,
      ingredients: [
        for (final i in r['ingredients'] as List)
          RecipeIngredient((i as Map<String, dynamic>)['symbol'] as String, (i['count'] as num).toInt()),
      ],
      points: (r['points'] as num).toInt(),
      funFact: r['funFact'] as String,
    ),
];

final Map<String, BondConfig> _configs = {
  for (final e in (_json['configs'] as Map<String, dynamic>).entries)
    e.key: BondConfig(
      recipes: ((e.value as Map<String, dynamic>)['recipes'] as num).toInt(),
      heatRisePerSecond: (e.value['heatRisePerSecond'] as num).toDouble(),
      heatDropOnSuccess: (e.value['heatDropOnSuccess'] as num).toDouble(),
      heatPenaltyWrong: (e.value['heatPenaltyWrong'] as num).toDouble(),
      elements: [for (final s in e.value['elements'] as List) s as String],
      availableRecipeIds: [for (final s in e.value['availableRecipeIds'] as List) s as String],
    ),
};

/// Config of a difficulty; anything unknown is easy (web).
BondConfig bondConfig(String difficulty) => _configs[difficulty] ?? _configs['easy']!;

/// `difficulty` query value to a known one; unknown is easy, for the config
/// and the table alike so the two stay in step.
String bondDifficultyParam(String? raw) => _configs.containsKey(raw) ? raw! : 'easy';

final List<TableEntry> _tableFull = [
  for (final t in _json['table'] as List)
    TableEntry(
      symbol: (t as Map<String, dynamic>)['symbol'] as String,
      name: t['name'] as String,
      row: (t['row'] as num).toInt(),
      col: (t['col'] as num).toInt(),
      cat: t['cat'] as String,
    ),
];

/// Periodic table rows shown for a difficulty. Easy stops at row 3 so that
/// Na and Cl (period 3) are on it.
List<TableEntry> bondPeriodicTable(String difficulty) {
  final maxRows = _json['tableMaxRow'] as Map<String, dynamic>;
  final maxRow = ((maxRows[difficulty] ?? maxRows['easy']) as num).toInt();
  return [
    for (final t in _tableFull)
      if (t.row <= maxRow) t,
  ];
}

Recipe? bondRecipeById(String id) {
  for (final r in kBondRecipes) {
    if (r.id == id) return r;
  }
  return null;
}

/// [count] distinct recipes of the difficulty, in random order.
List<Recipe> selectRecipes(String difficulty, int count, Random rng) {
  final config = bondConfig(difficulty);
  final available = [
    for (final r in kBondRecipes)
      if (config.availableRecipeIds.contains(r.id)) r,
  ];
  for (var i = available.length - 1; i > 0; i--) {
    final j = rng.nextInt(i + 1);
    final t = available[i];
    available[i] = available[j];
    available[j] = t;
  }
  return available.take(count).toList();
}

/// A random game element, leaning toward what the recipe needs (40%).
/// [rng] is `nextDouble`, so tests can replay the web sequence.
BondElement getRandomElement(BondConfig config, Recipe? recipe, double Function() rng) {
  final elements = config.elements;
  if (recipe != null && rng() < 0.4) {
    final needed = [
      for (final i in recipe.ingredients)
        if (elements.contains(i.symbol)) i.symbol,
    ];
    if (needed.isNotEmpty) {
      return kBondElements[needed[(rng() * needed.length).floor()]]!;
    }
  }
  return kBondElements[elements[(rng() * elements.length).floor()]]!;
}

/// True once the chamber holds every ingredient of the recipe.
bool checkRecipeComplete(List<String> chamber, Recipe recipe) {
  final counts = <String, int>{};
  for (final s in chamber) {
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return recipe.ingredients.every((i) => (counts[i.symbol] ?? 0) >= i.count);
}

/// True when the recipe still needs more of [symbol].
bool canPlaceElement(List<String> chamber, Recipe recipe, String symbol) {
  final current = chamber.where((s) => s == symbol).length;
  for (final i in recipe.ingredients) {
    if (i.symbol == symbol) return current < i.count;
  }
  return false;
}

/// Heat after a change, kept between 0 and 100.
double calculateHeat(double current, double delta) => max(0, min(100, current + delta));

/// Points for a finished recipe: base x difficulty x speed bonus x combo.
int calculateRecipeScore(Recipe recipe, double timeTaken, int combo, String difficulty) {
  final diffMultiplier = difficulty == 'easy' ? 1.0 : (difficulty == 'medium' ? 1.5 : 2.0);
  // Up to 2x under 5 s, falling to 1x at 20 s.
  final speedBonus = timeTaken <= 5
      ? 2.0
      : timeTaken >= 20
          ? 1.0
          : 2.0 - ((timeTaken - 5) / 15) * 1.0;
  final comboMultiplier = min(3, combo);
  return (recipe.points * diffMultiplier * speedBonus * comboMultiplier + 0.5).floor();
}

/// The score the player sees while playing (the server score is final).
int calculateFinalScore(int totalScore) => min(8000, totalScore);

/// Server difficulty number.
int bondDifficultyValue(String difficulty) =>
    difficulty == 'hard' ? 3 : (difficulty == 'medium' ? 2 : 1);
