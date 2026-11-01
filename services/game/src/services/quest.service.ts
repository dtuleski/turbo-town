import {
  GAUNTLET_TTL_MS,
  AppError,
  SubscriptionTier,
  ValidationError,
  applyNodeResult,
  canStartLeg,
  computeNodeStatuses,
  getNode,
  getWorld,
  isGauntletExpired,
  isNodeStartable,
  listWorlds,
  questContextSchema,
  recordLeg,
  maxStars,
  totalStars,
} from '@memory-game/shared';
import type {
  EvalContext,
  Game,
  GauntletAttempt,
  QuestContext,
  QuestLeg,
  QuestNode,
  QuestWorld,
  Stars,
  WorldProgress,
} from '@memory-game/shared';
import type { QuestProgressRepository } from '../repositories/quest-progress.repository';
import { QuestVersionConflictError } from '../repositories/quest-progress.repository';
import type { GameCatalogRepository } from '../repositories/game-catalog.repository';
import type { RateLimiterService } from './rate-limiter.service';
import type { QuestProgressView, QuestResultPayload, QuestWorldView } from '../types/quest';
import { logger } from '../utils/logger';
import { metricsPublisher } from '../utils/metrics';

/** The single message every rejected quest start returns (SECURITY-09). */
export const QUEST_UNAVAILABLE_MESSAGE = 'This quest is not available right now.';

/** Fixed enum of reasons; logged only, never returned to the caller. */
export type QuestRejectReason =
  | 'BAD_SHAPE'
  | 'UNKNOWN_WORLD'
  | 'UNKNOWN_NODE'
  | 'LEG_OUT_OF_RANGE'
  | 'TIER_TOO_LOW'
  | 'LEG_MISMATCH'
  | 'NODE_LOCKED'
  | 'NODE_UNAVAILABLE'
  | 'LEG_ORDER'
  | 'ATTEMPT_EXPIRED'
  | 'NOT_CONFIGURED';

export interface ValidatedQuestStart {
  worldId: string;
  nodeId: string;
  legIndex: number;
  context: QuestContext;
}

const CATALOG_CACHE_MS = 60 * 1000;
const MAX_WRITE_ATTEMPTS = 2; // first try + ONE retry on a version conflict

type CatalogReader = Pick<GameCatalogRepository, 'listAvailableGames'>;

/** What to do after the pure rules ran: write `progress` (version handled by the caller) or not. */
interface Computation {
  payload: QuestResultPayload;
  /** Undefined means nothing to write (duplicate, or nothing changed). */
  progress?: WorldProgress;
  previousStars: Stars;
  previousBestScore: number;
  newBestStars: Stars;
  worldCleared: boolean;
}

function legView(leg: QuestLeg): { themeId: string; difficulty: number; params?: QuestLeg['params'] } {
  return {
    themeId: leg.themeId,
    difficulty: leg.difficulty,
    ...(leg.params ? { params: { ...leg.params } } : {}),
  };
}

function withoutGauntlet(progress: WorldProgress): WorldProgress {
  const { activeGauntlet: _dropped, ...rest } = progress;
  return rest;
}

/**
 * Quest Map orchestration (B2). All decisions come from the pure shared evaluator and
 * gauntlet rules; this class only reads, calls them and writes (SECURITY-11).
 */
export class QuestService {
  private catalogCache?: { at: number; ids: Set<string> };

  constructor(
    private repo: QuestProgressRepository,
    private catalog: CatalogReader,
    private rateLimiter: RateLimiterService,
    private clock: () => number = Date.now
  ) {}

  // ---------------------------------------------------------------------------------------
  // Start validation (Flow 1). Read-only: no write, no metric, no rate-limit call.
  // ---------------------------------------------------------------------------------------

  async validateStart(
    userId: string,
    tier: SubscriptionTier,
    rawContext: unknown,
    themeId: string,
    difficulty: number
  ): Promise<ValidatedQuestStart> {
    const reject = (reason: QuestRejectReason, ids?: Record<string, unknown>): never => {
      // Ids only if they passed config lookup; never the raw input.
      logger.warn('Quest start rejected', { userId, reason, ...ids });
      throw new ValidationError(QUEST_UNAVAILABLE_MESSAGE);
    };

    const parsed = questContextSchema.safeParse(rawContext);
    if (!parsed.success) return reject('BAD_SHAPE');
    const context = parsed.data;

    const world = getWorld(context.worldId);
    if (!world) return reject('UNKNOWN_WORLD');
    const node = getNode(world, context.nodeId);
    if (!node) return reject('UNKNOWN_NODE', { worldId: world.id });
    const ids = { worldId: world.id, nodeId: node.id, legIndex: context.legIndex };

    if (context.legIndex >= node.legs.length) return reject('LEG_OUT_OF_RANGE', ids);

    // Server-read tier decides World 2 access; the client cannot influence it.
    if (world.accessTier === 'PAID' && tier === SubscriptionTier.Free) {
      return reject('TIER_TOO_LOW', ids);
    }

    const leg = node.legs[context.legIndex];
    if (leg.themeId !== themeId || leg.difficulty !== difficulty) {
      return reject('LEG_MISMATCH', ids);
    }

    // Fixed read order: progress, then catalog. A failure here is fatal for the request.
    const progress = await this.repo.getWorld(userId, world.id);
    const ctx = await this.evalContext(world);

    if (ctx.unavailableNodeIds.has(node.id)) return reject('NODE_UNAVAILABLE', ids);
    if (!isNodeStartable(world, node.id, progress, ctx)) return reject('NODE_LOCKED', ids);

    if (context.legIndex > 0) {
      const attempt = progress?.activeGauntlet;
      if (!canStartLeg(attempt, node, context.legIndex, this.clock())) {
        const expired =
          attempt !== undefined && attempt.nodeId === node.id && isGauntletExpired(attempt, this.clock());
        return reject(expired ? 'ATTEMPT_EXPIRED' : 'LEG_ORDER', ids);
      }
    }

    return { worldId: world.id, nodeId: node.id, legIndex: context.legIndex, context };
  }

  // ---------------------------------------------------------------------------------------
  // Completion (Flow 2). Never throws: it runs after the score is already stored.
  // ---------------------------------------------------------------------------------------

  async applyCompletion(
    userId: string,
    game: Game,
    score: number,
    extras?: { levelId?: string }
  ): Promise<QuestResultPayload | undefined> {
    const parsed = questContextSchema.safeParse(game.questContext);
    if (!parsed.success) return undefined;
    const context = parsed.data;
    let worldIdForMetric = context.worldId;

    try {
      const world = getWorld(context.worldId);
      const node = world ? getNode(world, context.nodeId) : undefined;
      const leg = node?.legs[context.legIndex];
      if (!world || !node || !leg) {
        logger.warn('Quest completion skipped', { userId, gameId: game.id, reason: 'CONFIG_GONE' });
        return undefined;
      }
      worldIdForMetric = world.id;

      if (
        game.themeId !== leg.themeId ||
        game.difficulty !== leg.difficulty ||
        (leg.params?.levelId !== undefined && extras?.levelId !== leg.params.levelId)
      ) {
        logger.warn('Quest completion skipped', {
          userId,
          gameId: game.id,
          worldId: world.id,
          nodeId: node.id,
          reason: 'LEG_DRIFT',
        });
        return undefined;
      }

      const ctx = await this.evalContext(world);

      for (let attemptNo = 1; attemptNo <= MAX_WRITE_ATTEMPTS; attemptNo++) {
        const stored = await this.repo.getWorld(userId, world.id);
        const computed = this.compute(world, node, context, stored, game, score, ctx);

        if (!computed.progress) return computed.payload; // duplicate: nothing written

        try {
          await this.repo.saveWorld(userId, computed.progress, stored?.version ?? 0);
        } catch (error) {
          if (error instanceof QuestVersionConflictError && attemptNo < MAX_WRITE_ATTEMPTS) {
            logger.warn('Quest progress version conflict, retrying', {
              userId,
              worldId: world.id,
              gameId: game.id,
              reason: 'CONFLICT_RETRY',
            });
            continue;
          }
          throw error;
        }

        logger.info('Quest progress updated', {
          userId,
          worldId: world.id,
          nodeId: node.id,
          gameId: game.id,
          score: computed.payload.score,
          previousBestStars: computed.previousStars,
          newBestStars: computed.newBestStars,
          previousBestScore: computed.previousBestScore,
        });
        if (computed.previousStars === 0 && computed.newBestStars >= 1) {
          await metricsPublisher.publishQuestMetric('QuestNodeCleared', world.id);
        }
        if (computed.worldCleared) {
          await metricsPublisher.publishQuestMetric('QuestWorldCleared', world.id);
        }
        return computed.payload;
      }
      return undefined; // unreachable: the loop returns or throws
    } catch (error) {
      logger.error('Quest progress write failed', error as Error, {
        userId,
        gameId: game.id,
        worldId: worldIdForMetric,
        nodeId: context.nodeId,
      });
      await metricsPublisher.publishQuestMetric('QuestProgressWriteFailed', worldIdForMetric);
      return undefined;
    }
  }

  /** Pure decision step: no I/O. */
  private compute(
    world: QuestWorld,
    node: QuestNode,
    context: QuestContext,
    stored: WorldProgress | undefined,
    game: Game,
    score: number,
    ctx: EvalContext
  ): Computation {
    const nowIso = new Date(this.clock()).toISOString();
    const previous = stored?.nodes[node.id];
    const previousStars: Stars = previous?.stars ?? 0;
    const previousBestScore = previous?.bestScore ?? 0;
    const isBoss = node.kind === 'BOSS';
    const base = {
      worldId: world.id,
      nodeId: node.id,
      kind: node.kind,
      thresholds: [...node.thresholds] as [number, number, number],
    };
    const gauntletInfo = (status: 'IN_PROGRESS' | 'COMPLETE' | 'EXPIRED', next?: QuestLeg) => ({
      legIndex: context.legIndex,
      legsTotal: node.legs.length,
      status,
      ...(next ? { nextLeg: legView(next) } : {}),
    });
    const duplicatePayload = (): QuestResultPayload => ({
      ...base,
      score,
      stars: previousStars,
      bestStars: previousStars,
      newlyUnlocked: [],
      worldCleared: false,
      badgesAwarded: [],
      ...(isBoss ? { gauntlet: gauntletInfo('COMPLETE') } : {}),
    });
    const unchanged = (payload: QuestResultPayload): Computation => ({
      payload,
      previousStars,
      previousBestScore,
      newBestStars: previousStars,
      worldCleared: false,
    });

    // Duplicate completion of the last gameId applied to this node: change nothing.
    if (previous?.lastGameId !== undefined && previous.lastGameId === game.id) {
      logger.info('Quest completion duplicate', { gameId: game.id, nodeId: node.id, reason: 'DUPLICATE' });
      return unchanged(duplicatePayload());
    }

    let nodeScore = score;
    let working: WorldProgress | undefined = stored;

    if (isBoss) {
      const attempt: GauntletAttempt | undefined = stored?.activeGauntlet;
      const outcome = recordLeg(attempt, node, {
        legIndex: context.legIndex,
        gameId: game.id,
        score,
        nowIso,
      });

      if (outcome.status === 'IN_PROGRESS') {
        const next = node.legs[context.legIndex + 1];
        const payload: QuestResultPayload = {
          ...base,
          score,
          stars: 0,
          bestStars: previousStars,
          newlyUnlocked: [],
          worldCleared: false,
          badgesAwarded: [],
          gauntlet: gauntletInfo('IN_PROGRESS', next),
        };
        if (outcome.attempt === attempt) {
          // Duplicate of a recorded leg: keep the attempt, write nothing.
          logger.info('Quest leg duplicate', { gameId: game.id, nodeId: node.id, reason: 'DUPLICATE' });
          return unchanged(payload);
        }
        const basis = stored ?? { worldId: world.id, nodes: {}, totalStars: 0, badges: [], version: 0, updatedAt: nowIso };
        return {
          payload,
          progress: { ...basis, activeGauntlet: outcome.attempt, updatedAt: nowIso },
          previousStars,
          previousBestScore,
          newBestStars: previousStars,
          worldCleared: false,
        };
      }

      if (outcome.status === 'EXPIRED') {
        logger.warn('Quest leg out of order', {
          gameId: game.id,
          worldId: world.id,
          nodeId: node.id,
          reason: 'LEG_ORDER',
        });
        const payload: QuestResultPayload = {
          ...base,
          score,
          stars: 0,
          bestStars: previousStars,
          newlyUnlocked: [],
          worldCleared: false,
          badgesAwarded: [],
          gauntlet: gauntletInfo('EXPIRED'),
        };
        // Clear a stale attempt only if there is one to clear.
        if (!stored?.activeGauntlet) return unchanged(payload);
        return {
          payload,
          progress: { ...withoutGauntlet(stored), updatedAt: nowIso },
          previousStars,
          previousBestScore,
          newBestStars: previousStars,
          worldCleared: false,
        };
      }

      // COMPLETE: the combined score of all legs decides the stars.
      nodeScore = outcome.combinedScore ?? score;
      working = stored ? withoutGauntlet(stored) : undefined;
    }

    const result = applyNodeResult(
      world,
      working,
      { nodeId: node.id, score: nodeScore, nowIso, gameId: game.id },
      ctx
    );
    const payload: QuestResultPayload = {
      ...base,
      score: result.score,
      stars: result.stars,
      bestStars: result.bestStars,
      newlyUnlocked: result.newlyUnlocked,
      worldCleared: result.worldCleared,
      badgesAwarded: result.badgesAwarded,
      ...(isBoss ? { gauntlet: gauntletInfo('COMPLETE') } : {}),
    };
    return {
      payload,
      progress: withoutGauntlet(result.progress),
      previousStars,
      previousBestScore,
      newBestStars: result.bestStars,
      worldCleared: result.worldCleared,
    };
  }

  // ---------------------------------------------------------------------------------------
  // Read model (Flow 3)
  // ---------------------------------------------------------------------------------------

  async getProgressView(userId: string, tier: SubscriptionTier): Promise<QuestProgressView> {
    const [stored, available, usage] = await Promise.all([
      this.repo.listWorlds(userId),
      this.availableCatalogIds(),
      this.rateLimiter.getUsage(userId, tier),
    ]);
    const byWorld = new Map(stored.map((p) => [p.worldId, p]));
    const nowMs = this.clock();

    const worlds: QuestWorldView[] = listWorlds().map((world) => {
      const progress = byWorld.get(world.id);
      const ctx = this.contextFor(world, available);
      const accessible = world.accessTier === 'FREE' || tier !== SubscriptionTier.Free;
      const statuses = computeNodeStatuses(world, progress, ctx);
      const allNodes = [...world.nodes, world.bonus];

      const nodes = allNodes.map((n) => {
        const nodeProgress = progress?.nodes[n.id];
        return {
          id: n.id,
          kind: n.kind,
          // An inaccessible world is fully locked, but stored stars stay visible.
          status: accessible ? statuses[n.id] : ('LOCKED' as const),
          stars: (nodeProgress?.stars ?? 0) as Stars,
          bestScore: nodeProgress?.bestScore ?? 0,
          thresholds: [...n.thresholds] as [number, number, number],
          map: { x: n.map.x, y: n.map.y },
          legs: n.legs.map(legView), // catalogGameId is deliberately not copied
        };
      });

      const gauntlet = progress?.activeGauntlet;
      const activeGauntlet =
        gauntlet && !isGauntletExpired(gauntlet, nowMs)
          ? {
              nodeId: gauntlet.nodeId,
              legsDone: gauntlet.legs.length,
              legsTotal:
                world.nodes.find((n) => n.id === gauntlet.nodeId)?.legs.length ?? gauntlet.legs.length,
              expiresAt: new Date(Date.parse(gauntlet.lastActivityAt) + GAUNTLET_TTL_MS).toISOString(),
            }
          : undefined;

      return {
        id: world.id,
        order: world.order,
        accessible,
        // Recomputed; the stored totalStars is never trusted.
        totalStars: totalStars(world, progress, ctx),
        maxStars: maxStars(world, ctx),
        badges: progress?.badges ?? [],
        ...(activeGauntlet ? { activeGauntlet } : {}),
        nodes,
      };
    });

    // Paywall impression: a FREE user who has cleared World 1 loaded the map. Never throws.
    if (tier === SubscriptionTier.Free) {
      const first = worlds.find((w) => w.order === Math.min(...worlds.map((x) => x.order)));
      if (first && first.badges.includes('WORLD_CLEARED')) {
        await metricsPublisher.publishQuestMetric('QuestPaywallHit', first.id);
      }
    }

    return {
      tier,
      rateLimit: {
        limit: usage.limit,
        used: usage.used,
        remaining: usage.remaining,
        resetAt: new Date(usage.resetAt).toISOString(),
      },
      worlds,
    };
  }

  // ---------------------------------------------------------------------------------------
  // Catalog availability (FR-QM-18), cached 60 s per service instance.
  // ---------------------------------------------------------------------------------------

  private async availableCatalogIds(): Promise<Set<string>> {
    const now = this.clock();
    if (this.catalogCache && now - this.catalogCache.at < CATALOG_CACHE_MS) {
      return this.catalogCache.ids;
    }
    let games: Awaited<ReturnType<CatalogReader['listAvailableGames']>>;
    try {
      games = await this.catalog.listAvailableGames();
    } catch (error) {
      // Fatal for the request, but never leak the SDK message.
      logger.error('Quest catalog read failed', error as Error);
      throw new AppError('INTERNAL_ERROR', 'Database error occurred', 500);
    }
    const ids = new Set(games.map((g) => g.gameId));
    this.catalogCache = { at: now, ids };
    return ids;
  }

  private contextFor(world: QuestWorld, available: Set<string>): EvalContext {
    const unavailable = new Set<string>();
    for (const n of [...world.nodes, world.bonus]) {
      // A boss is unavailable if any leg's game is.
      if (n.legs.some((l) => !available.has(l.catalogGameId))) unavailable.add(n.id);
    }
    return { unavailableNodeIds: unavailable };
  }

  private async evalContext(world: QuestWorld): Promise<EvalContext> {
    return this.contextFor(world, await this.availableCatalogIds());
  }
}
