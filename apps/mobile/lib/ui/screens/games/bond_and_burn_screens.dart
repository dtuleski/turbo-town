import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../api/quest_models.dart';
import '../../../game/bond_and_burn/bond_controller.dart';
import '../../../game/bond_and_burn/logic.dart';
import '../../../game/framework/game_session.dart';
import '../../../game/framework/game_session_frame.dart';
import '../../../game/game_registry.dart';
import '../../../l10n/gen/app_localizations.dart';
import '../../../l10n/physics_text.dart';
import '../../widgets/step_clock.dart';
import 'board_widgets.dart';
import 'how_to_play_card.dart';
import 'picker_setup.dart';
import 'quiz_setup_screens.dart';

const Color _bgTop = Color(0xFF0F172A);
const Color _bgMid = Color(0xFF1E1B4B);

/// Tailwind -500 colors of the six game elements (web `ELEMENTS.color`).
const Map<String, Color> kBondElementColors = {
  'H': Color(0xFFEF4444),
  'O': Color(0xFF3B82F6),
  'C': Color(0xFF1F2937),
  'N': Color(0xFF22C55E),
  'Na': Color(0xFFA855F7),
  'Cl': Color(0xFFEAB308),
};

/// Periodic table tile colors by category (web `CAT_COLORS`, -700 at 80%).
const Map<String, Color> kBondCategoryColors = {
  'nonmetal': Color(0xCC0369A1),
  'noble': Color(0xCC6D28D9),
  'alkali': Color(0xCCBE123C),
  'alkaline': Color(0xCCC2410C),
  'metalloid': Color(0xCC0F766E),
  'halogen': Color(0xCCA16207),
  'transition': Color(0xCC1D4ED8),
  'post-trans': Color(0xCC047857),
};

/// Emoji of the compound shown after a reaction (web `COMPOUND_VISUALS`).
const Map<String, ({String emoji, List<Color> colors})> kBondCompoundVisuals = {
  'water': (emoji: '💧', colors: [Color(0xFF60A5FA), Color(0xFF22D3EE)]),
  'salt': (emoji: '🧂', colors: [Color(0xFFC084FC), Color(0xFFF472B6)]),
  'co2': (emoji: '💨', colors: [Color(0xFF9CA3AF), Color(0xFF64748B)]),
  'methane': (emoji: '🔥', colors: [Color(0xFFFB923C), Color(0xFFF87171)]),
  'ammonia': (emoji: '🧪', colors: [Color(0xFF4ADE80), Color(0xFF10B981)]),
  'ethane': (emoji: '⛽', colors: [Color(0xFFFBBF24), Color(0xFFF97316)]),
  'hydrogen-peroxide': (emoji: '🫧', colors: [Color(0xFF7DD3FC), Color(0xFF60A5FA)]),
  'hydrochloric-acid': (emoji: '⚗', colors: [Color(0xFFFACC15), Color(0xFF84CC16)]),
  'sodium-hydroxide': (emoji: '🧴', colors: [Color(0xFFA78BFA), Color(0xFFA855F7)]),
  'nitrous-oxide': (emoji: '😂', colors: [Color(0xFF5EEAD4), Color(0xFF06B6D4)]),
};

class BondAndBurnSetupScreen extends StatelessWidget {
  const BondAndBurnSetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final desc = {
      'easy': l10n.bondAndBurn_easyDesc,
      'medium': l10n.bondAndBurn_mediumDesc,
      'hard': l10n.bondAndBurn_hardDesc,
    };
    return PickerSetupScreen(
      title: l10n.bondAndBurn_title,
      subtitle: '${l10n.bondAndBurn_subtitle}\n${l10n.bondAndBurn_description}',
      startLabel: l10n.bondAndBurn_startMission,
      selectLabel: l10n.bondAndBurn_selectDifficulty,
      groups: [
        SetupGroup('difficulty', l10n.bondAndBurn_chooseDifficulty, [
          for (final d in kBondDifficulties)
            SetupOption(d, quizDifficultyLabel(l10n, d),
                emoji: quizDifficultyEmoji(d), description: desc[d]),
        ]),
      ],
      footer: [
        HowToPlayCard(title: l10n.bondAndBurn_howToPlay, steps: [
          l10n.bondAndBurn_step1,
          l10n.bondAndBurn_step2,
          l10n.bondAndBurn_step3,
          l10n.bondAndBurn_step4,
        ]),
      ],
      buildRoute: (s) => '/bond-and-burn/play?difficulty=${s['difficulty']}',
    );
  }
}

class BondAndBurnGameScreen extends ConsumerWidget {
  const BondAndBurnGameScreen({super.key, required this.difficulty, this.questContext});

  final String difficulty;
  final QuestContext? questContext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final args = (difficulty: difficulty, quest: questContext);
    final provider = bondControllerProvider(args);
    ref.listen(provider, (_, __) {});
    return GameSessionFrame(
      args: bondSessionArgs(args),
      title: l10n.bondAndBurn_title,
      reviewType: gameById('bond-and-burn')!.reviewType,
      onPlayAgain: () => ref.read(provider.notifier).restart(),
      boardBuilder: (context, session) => _BondBoard(args: args, session: session),
    );
  }
}

class _BondBoard extends ConsumerStatefulWidget {
  const _BondBoard({required this.args, required this.session});

  final BondArgs args;
  final GameSessionState session;

  @override
  ConsumerState<_BondBoard> createState() => _BondBoardState();
}

class _BondBoardState extends ConsumerState<_BondBoard> {
  bool _flaskHover = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final state = ref.watch(bondControllerProvider(widget.args));
    final ctrl = ref.read(bondControllerProvider(widget.args).notifier);
    final recipe = state.recipe;
    final playing = state.phase == BondPhase.playing;
    final reacting = state.phase == BondPhase.reacting;
    final heatColor = state.heat < 40
        ? const Color(0xFF10B981)
        : state.heat < 70
            ? const Color(0xFFF59E0B)
            : state.heat < 85
                ? const Color(0xFFF97316)
                : const Color(0xFFDC2626);

    return StepClock(
      step: kBondStep,
      running: widget.session.phase == SessionPhase.playing,
      onStep: ctrl.tick,
      // The frame gives the board loose constraints; fill the page.
      child: Container(
        constraints: const BoxConstraints.expand(),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [_bgTop, _bgMid, _bgTop],
          ),
        ),
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              child: Column(
                children: [
                  _HeatBar(heat: state.heat, color: heatColor),
                  const SizedBox(height: 6),
                  Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    spacing: 14,
                    children: [
                      _stat('⏱ ${clockText(widget.session.elapsedSeconds)}', const Key('bond-clock')),
                      _stat('🏆 ${calculateFinalScore(state.score)}', const Key('bond-score')),
                      _stat(
                        '${l10n.bondAndBurn_round} ${state.recipeIndex + 1}/${state.recipes.length}',
                        const Key('bond-round'),
                      ),
                      if (state.combo > 1) _stat('🔥 ${state.combo}x', const Key('bond-combo')),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (playing) _RecipeCard(recipe: recipe),
                  if (playing || reacting) ...[
                    const SizedBox(height: 10),
                    _flask(context, l10n, state, ctrl),
                  ],
                  if (state.showFunFact) _FunFact(text: bondRecipeFunFact(l10n, recipe.id) ?? recipe.funFact),
                  if (playing) ...[
                    const SizedBox(height: 10),
                    Text(
                      l10n.bondAndBurn_pickElements.toUpperCase(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10, letterSpacing: 1),
                    ),
                    const SizedBox(height: 4),
                    _PeriodicTable(
                      difficulty: widget.args.difficulty,
                      wrongSymbol: state.wrongSymbol,
                      onPick: ctrl.drop,
                    ),
                  ],
                ],
              ),
            ),
            if (state.phase == BondPhase.meltdown)
              Positioned.fill(
                child: IgnorePointer(
                  child: Container(
                    key: const Key('bond-meltdown'),
                    color: const Color(0x66DC2626),
                    alignment: Alignment.center,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('💥', style: TextStyle(fontSize: 80)),
                        Text(
                          l10n.bondAndBurn_meltdown,
                          style: const TextStyle(
                              color: Color(0xFFFECACA), fontSize: 30, fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            if (state.phase == BondPhase.complete)
              Positioned.fill(
                child: IgnorePointer(
                  child: Container(
                    key: const Key('bond-complete'),
                    color: const Color(0xCC0F172A),
                    alignment: Alignment.center,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('🎉', style: TextStyle(fontSize: 60)),
                        Text(
                          l10n.bondAndBurn_labComplete,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _stat(String text, Key key) => Text(
        text,
        key: key,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
      );

  Widget _flask(BuildContext context, AppLocalizations l10n, BondState state, BondController ctrl) {
    final reacting = state.phase == BondPhase.reacting;
    final visual = kBondCompoundVisuals[state.recipe.id];
    return DragTarget<String>(
      onWillAcceptWithDetails: (_) {
        setState(() => _flaskHover = true);
        return state.phase == BondPhase.playing;
      },
      onLeave: (_) => setState(() => _flaskHover = false),
      onAcceptWithDetails: (d) {
        setState(() => _flaskHover = false);
        ctrl.drop(d.data);
      },
      builder: (context, _, __) => AnimatedScale(
        scale: _flaskHover ? 1.05 : 1,
        duration: const Duration(milliseconds: 200),
        child: SizedBox(
          key: const Key('bond-flask'),
          width: 190,
          height: 247,
          child: Stack(
            children: [
              Positioned.fill(
                child: CustomPaint(
                  painter: _FlaskPainter(count: state.chamber.length, hover: _flaskHover),
                ),
              ),
              if (!reacting)
                for (final (i, sym) in state.chamber.indexed)
                  Positioned(
                    left: 190 * (0.30 + (i % 3) * 0.25),
                    top: 247 * (0.55 + (i ~/ 3) * 0.18),
                    child: Container(
                      key: Key('bond-atom-$i'),
                      width: 32,
                      height: 32,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: kBondElementColors[sym],
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white24),
                        boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 4)],
                      ),
                      child: Text(sym,
                          style: const TextStyle(
                              color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)),
                    ),
                  ),
              if (reacting && visual != null)
                Positioned.fill(
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0.3, end: 1),
                    duration: const Duration(milliseconds: 800),
                    curve: Curves.easeOut,
                    builder: (context, v, child) => Opacity(
                      opacity: v.clamp(0.0, 1.0),
                      child: Transform.scale(scale: v, child: child),
                    ),
                    child: Column(
                      key: const Key('bond-reaction'),
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(colors: visual.colors),
                          ),
                          child: Text(visual.emoji, style: const TextStyle(fontSize: 36)),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '${bondRecipeName(l10n, state.recipe.id) ?? state.recipe.name}!',
                          style: const TextStyle(
                              color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                        ),
                      ],
                    ),
                  ),
                ),
              if (state.phase == BondPhase.playing && state.chamber.isEmpty && !_flaskHover)
                Positioned.fill(
                  child: IgnorePointer(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 36),
                        child: Text(
                          l10n.mobilePhysics_bondDropHint,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeatBar extends StatelessWidget {
  const _HeatBar({required this.heat, required this.color});

  final double heat;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('bond-heat'),
      height: 16,
      decoration: BoxDecoration(
        color: const Color(0x99334155),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0x66475569)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          FractionallySizedBox(
            widthFactor: (heat / 100).clamp(0.0, 1.0),
            child: Container(color: color),
          ),
          Center(
            child: Text('🌡 ${heat.round()}%',
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }
}

class _RecipeCard extends StatelessWidget {
  const _RecipeCard({required this.recipe});

  final Recipe recipe;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final name = bondRecipeName(l10n, recipe.id) ?? recipe.name;
    return Column(
      key: const Key('bond-recipe'),
      children: [
        Text.rich(
          TextSpan(
            text: '${l10n.bondAndBurn_make} $name ',
            children: [
              TextSpan(
                text: recipe.formula,
                style: const TextStyle(color: Color(0xFFA5B4FC), fontFamily: 'monospace'),
              ),
            ],
          ),
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0x80312E81),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x33818CF8)),
          ),
          child: Text(
            '💡 ${bondRecipeHint(l10n, recipe.id) ?? ''}',
            key: const Key('bond-hint'),
            style: const TextStyle(color: Color(0xFFE0E7FF), fontSize: 12),
          ),
        ),
      ],
    );
  }
}

class _FunFact extends StatelessWidget {
  const _FunFact({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('bond-funfact'),
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0x80064E3B),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0x4D34D399)),
      ),
      child: Text('🧠 $text',
          textAlign: TextAlign.center,
          style: const TextStyle(color: Color(0xFFD1FAE5), fontSize: 12)),
    );
  }
}

class _PeriodicTable extends StatefulWidget {
  const _PeriodicTable({required this.difficulty, required this.wrongSymbol, required this.onPick});

  final String difficulty;
  final String? wrongSymbol;
  final void Function(String symbol) onPick;

  @override
  State<_PeriodicTable> createState() => _PeriodicTableState();
}

class _PeriodicTableState extends State<_PeriodicTable> {
  static const double _w = 34;
  static const double _h = 40;
  static const double _gap = 2;

  final ScrollController _scroll = ScrollController();

  String get difficulty => widget.difficulty;
  String? get wrongSymbol => widget.wrongSymbol;
  void Function(String symbol) get onPick => widget.onPick;

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final entries = bondPeriodicTable(difficulty);
    final config = bondConfig(difficulty);
    final maxRow = entries.fold<int>(0, (m, e) => e.row > m ? e.row : m);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Scrollbar(
          controller: _scroll,
          thumbVisibility: true,
          child: SingleChildScrollView(
            controller: _scroll,
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.only(bottom: 10),
            child: SizedBox(
              key: const Key('bond-table'),
              width: 18 * (_w + _gap),
              height: maxRow * (_h + _gap),
              child: Stack(
                children: [
                  for (final e in entries)
                    Positioned(
                      left: (e.col - 1) * (_w + _gap),
                      top: (e.row - 1) * (_h + _gap),
                      width: _w,
                      height: _h,
                      child: _tile(e, difficulty == 'hard' || config.elements.contains(e.symbol)),
                    ),
                ],
              ),
            ),
          ),
        ),
        Text(
          '\u2190 ${l10n.bondAndBurn_swipeHint} \u2192',
          key: const Key('bond-table-hint'),
          textAlign: TextAlign.center,
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
        ),
      ],
    );
  }

  Widget _tile(TableEntry e, bool bright) {
    final wrong = wrongSymbol == e.symbol;
    final base = kBondCategoryColors[e.cat] ?? const Color(0xCC334155);
    Widget face({bool dragging = false}) => Container(
          key: dragging ? null : Key('bond-el-${e.symbol}'),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: wrong ? const Color(0x99EF4444) : base,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
              color: wrong
                  ? const Color(0xFFF87171)
                  : (bright ? const Color(0x4DFFFFFF) : const Color(0x1AFFFFFF)),
            ),
          ),
          child: Opacity(
            opacity: bright || wrong ? 1 : 0.5,
            child: Text(e.symbol,
                style: const TextStyle(
                    color: Colors.white, fontSize: 13, fontWeight: FontWeight.w800, decoration: TextDecoration.none)),
          ),
        );
    return LongPressDraggable<String>(
      data: e.symbol,
      delay: const Duration(milliseconds: 150),
      dragAnchorStrategy: pointerDragAnchorStrategy,
      feedback: Material(
        color: Colors.transparent,
        child: Container(
          width: 44,
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: kBondElementColors[e.symbol] ?? const Color(0xFF4F46E5),
            border: Border.all(color: Colors.white54),
          ),
          child: Text(e.symbol,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 15)),
        ),
      ),
      childWhenDragging: Opacity(opacity: 0.4, child: face(dragging: true)),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => onPick(e.symbol),
        child: face(),
      ),
    );
  }
}

class _FlaskPainter extends CustomPainter {
  const _FlaskPainter({required this.count, required this.hover});

  final int count;
  final bool hover;

  @override
  void paint(Canvas canvas, Size size) {
    // The web SVG uses a 200x260 view box.
    canvas.scale(size.width / 200, size.height / 260);
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..color = hover ? const Color(0xFF818CF8) : const Color(0xFF475569);
    final fill = Paint()..color = const Color(0xFF1E293B);
    final neck = RRect.fromRectAndRadius(const Rect.fromLTWH(75, 0, 50, 60), const Radius.circular(6));
    canvas.drawRRect(neck, fill);
    canvas.drawRRect(neck, stroke);
    final body = Path()
      ..moveTo(75, 60)
      ..lineTo(30, 160)
      ..quadraticBezierTo(20, 200, 50, 230)
      ..lineTo(150, 230)
      ..quadraticBezierTo(180, 200, 170, 160)
      ..lineTo(125, 60);
    canvas.drawPath(body, fill);
    canvas.drawPath(body, stroke);
    if (count > 0) {
      final y = 220.0 - count * 18;
      final liquid = Path()
        ..moveTo(40, y)
        ..quadraticBezierTo(100, y - 10, 160, y)
        ..lineTo(160, 220)
        ..quadraticBezierTo(150, 235, 50, 235)
        ..lineTo(40, 220)
        ..close();
      canvas.drawPath(
        liquid,
        Paint()
          ..shader = const LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0x6606B6D4), Color(0xB33B82F6)],
          ).createShader(Rect.fromLTWH(40, y, 120, 235 - y)),
      );
    }
    canvas.drawLine(
      const Offset(85, 70),
      const Offset(55, 140),
      Paint()
        ..color = const Color(0x1AFFFFFF)
        ..strokeWidth = 1.5
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(_FlaskPainter old) => old.count != count || old.hover != hover;
}
