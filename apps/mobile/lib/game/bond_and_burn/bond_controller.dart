import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/quest_models.dart';
import '../framework/game_feedback.dart';
import '../framework/game_session.dart';
import '../framework/session_timers.dart';
import 'logic.dart';

typedef BondArgs = ({String difficulty, QuestContext? quest});

GameSessionArgs bondSessionArgs(BondArgs a) => (
      themeId: 'BOND_AND_BURN',
      difficulty: bondDifficultyValue(a.difficulty),
      questContext: a.quest,
      challengeDay: null,
    );

/// Heat is checked once per step of this length (web: every 100 ms).
const Duration kBondStep = Duration(milliseconds: 100);

/// Pauses of the web round: the reaction, then the fun fact, then the next
/// recipe; the meltdown screen; the "lab complete" screen.
const Duration kReactionDelay = Duration(milliseconds: 1200);
const Duration kFunFactDelay = Duration(milliseconds: 4500);
const Duration kMeltdownDelay = Duration(milliseconds: 2000);
const Duration kLabCompleteDelay = Duration(milliseconds: 1000);
const Duration kWrongPickDelay = Duration(milliseconds: 500);

enum BondPhase { playing, reacting, meltdown, complete }

class BondState {
  const BondState({
    required this.recipes,
    this.recipeIndex = 0,
    this.chamber = const [],
    this.heat = 0,
    this.score = 0,
    this.combo = 1,
    this.roundsCompleted = 0,
    this.totalAttempts = 0,
    this.phase = BondPhase.playing,
    this.wrongSymbol,
    this.showFunFact = false,
    this.clockMs = 0,
    this.recipeStartMs = 0,
  });

  final List<Recipe> recipes;
  final int recipeIndex;

  /// Symbols dropped in the flask for the current recipe.
  final List<String> chamber;

  /// 0-100. At 100 the lab melts down.
  final double heat;
  final int score;
  final int combo;
  final int roundsCompleted;

  /// Every tap or drop, right or wrong.
  final int totalAttempts;
  final BondPhase phase;
  final String? wrongSymbol;
  final bool showFunFact;

  /// Round clock in ms, advanced by the heat steps; it times each recipe.
  final int clockMs;
  final int recipeStartMs;

  Recipe get recipe => recipes[recipeIndex];

  BondState copyWith({
    int? recipeIndex,
    List<String>? chamber,
    double? heat,
    int? score,
    int? combo,
    int? roundsCompleted,
    int? totalAttempts,
    BondPhase? phase,
    String? Function()? wrongSymbol,
    bool? showFunFact,
    int? clockMs,
    int? recipeStartMs,
  }) =>
      BondState(
        recipes: recipes,
        recipeIndex: recipeIndex ?? this.recipeIndex,
        chamber: chamber ?? this.chamber,
        heat: heat ?? this.heat,
        score: score ?? this.score,
        combo: combo ?? this.combo,
        roundsCompleted: roundsCompleted ?? this.roundsCompleted,
        totalAttempts: totalAttempts ?? this.totalAttempts,
        phase: phase ?? this.phase,
        wrongSymbol: wrongSymbol != null ? wrongSymbol() : this.wrongSymbol,
        showFunFact: showFunFact ?? this.showFunFact,
        clockMs: clockMs ?? this.clockMs,
        recipeStartMs: recipeStartMs ?? this.recipeStartMs,
      );
}

BondState _newState(String difficulty, Random rng) =>
    BondState(recipes: selectRecipes(difficulty, bondConfig(difficulty).recipes, rng));

/// Bond & Burn: drop the elements a recipe needs into the flask before the
/// heat reaches 100. Wrong drops add heat and break the combo.
class BondController extends StateNotifier<BondState> {
  BondController(this._session, this._feedback, this.args, {Random? random})
      : _rng = random ?? Random(),
        _timers = SessionTimers(_session),
        super(_newState(args.difficulty, random ?? Random()));

  final GameSessionController _session;
  final GameFeedback _feedback;
  final BondArgs args;
  final Random _rng;
  final SessionTimers _timers;

  BondConfig get _config => bondConfig(args.difficulty);

  bool get _playing => _session.phase == SessionPhase.playing;

  /// One heat step ([kBondStep]). Heat rises only while a recipe is being
  /// built, faster for each recipe done (+20% per recipe, web).
  void tick() {
    if (!_playing) return;
    state = state.copyWith(clockMs: state.clockMs + kBondStep.inMilliseconds);
    if (state.phase != BondPhase.playing) return;
    final mult = 1 + state.recipeIndex * 0.2;
    final next = calculateHeat(
      state.heat,
      _config.heatRisePerSecond * (kBondStep.inMilliseconds / 1000) * mult,
    );
    if (next >= 100) {
      _meltdown();
      return;
    }
    state = state.copyWith(heat: next);
  }

  void _meltdown() {
    state = state.copyWith(heat: 100, phase: BondPhase.meltdown);
    _feedback.haptic(HapticKind.error);
    _timers.later(kMeltdownDelay, () => _finish());
  }

  /// Puts [symbol] in the flask (a tap or a drop).
  void drop(String symbol) {
    if (!_playing || state.phase != BondPhase.playing) return;
    final recipe = state.recipe;
    final attempts = state.totalAttempts + 1;
    if (canPlaceElement(state.chamber, recipe, symbol)) {
      final chamber = [...state.chamber, symbol];
      _feedback.play(SoundCue.place);
      _feedback.haptic(HapticKind.light);
      state = state.copyWith(chamber: chamber, totalAttempts: attempts);
      if (checkRecipeComplete(chamber, recipe)) _react();
      return;
    }
    _feedback.haptic(HapticKind.error);
    state = state.copyWith(
      combo: 1,
      heat: calculateHeat(state.heat, _config.heatPenaltyWrong),
      totalAttempts: attempts,
      wrongSymbol: () => symbol,
    );
    _timers.later(kWrongPickDelay, () {
      if (state.wrongSymbol == symbol) state = state.copyWith(wrongSymbol: () => null);
    });
  }

  void _react() {
    state = state.copyWith(phase: BondPhase.reacting);
    _timers.later(kReactionDelay, () {
      final taken = (state.clockMs - state.recipeStartMs) / 1000;
      final points = calculateRecipeScore(state.recipe, taken, state.combo, args.difficulty);
      _feedback.play(SoundCue.spark);
      state = state.copyWith(
        score: state.score + points,
        combo: state.combo + 1,
        heat: calculateHeat(state.heat, -_config.heatDropOnSuccess),
        roundsCompleted: state.roundsCompleted + 1,
        showFunFact: true,
      );
      _timers.later(kFunFactDelay, _nextRecipe);
    });
  }

  void _nextRecipe() {
    final next = state.recipeIndex + 1;
    if (next >= state.recipes.length) {
      state = state.copyWith(phase: BondPhase.complete, showFunFact: false);
      _timers.later(kLabCompleteDelay, () => _finish());
      return;
    }
    state = state.copyWith(
      chamber: const [],
      recipeIndex: next,
      recipeStartMs: state.clockMs,
      phase: BondPhase.playing,
      showFunFact: false,
    );
  }

  /// Submits the round. A meltdown keeps the recipes already done.
  void _finish() {
    _timers.cancelAll();
    _feedback.play(SoundCue.celebration);
    _session.complete(
      extra: {'correctAnswers': state.roundsCompleted, 'totalQuestions': state.recipes.length},
      attempts: state.totalAttempts,
    );
  }

  void restart() {
    _timers.cancelAll();
    state = _newState(args.difficulty, _rng);
  }

  @override
  void dispose() {
    _timers.dispose();
    super.dispose();
  }
}

final bondControllerProvider = StateNotifierProvider.family
    .autoDispose<BondController, BondState, BondArgs>((ref, args) {
  final session = ref.watch(gameSessionProvider(bondSessionArgs(args)).notifier);
  return BondController(session, ref.watch(gameFeedbackProvider), args);
});
