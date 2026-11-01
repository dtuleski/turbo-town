/**
 * Shared fakes for the Quest Map backend tests (QM2).
 *
 * FakeQuestRepo enforces the same optimistic-lock rule as the real repository, so a
 * "simulated version conflict" is a real conflict: another writer changes the stored item
 * between this request's read and its save.
 */
import { GameStatus, QUEST_WORLDS, getWorld } from '@memory-game/shared';
import type { Game, NodeProgress, QuestContext, WorldProgress } from '@memory-game/shared';
import { QuestVersionConflictError } from '../../src/repositories/quest-progress.repository';
import { QuestService } from '../../src/services/quest.service';
import type { QuestProgressRepository } from '../../src/repositories/quest-progress.repository';
import type { RateLimiterService } from '../../src/services/rate-limiter.service';

export const T0 = Date.parse('2026-01-15T12:00:00.000Z');
export const MIN = 60 * 1000;
export const USER_ID = 'user-1';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export class FakeQuestRepo {
  store = new Map<string, WorldProgress>();
  saveCalls: { progress: WorldProgress; expected: number }[] = [];
  getCalls = 0;
  /** Runs once, between the read and the first save attempt (a concurrent writer). */
  concurrentWriter?: (repo: FakeQuestRepo) => void;
  failWith?: Error;

  key(worldId: string): string {
    return `${USER_ID}#${worldId}`;
  }

  seed(progress: WorldProgress): void {
    this.store.set(this.key(progress.worldId), progress);
  }

  async getWorld(_userId: string, worldId: string): Promise<WorldProgress | undefined> {
    this.getCalls++;
    if (this.failWith) throw this.failWith;
    const found = this.store.get(this.key(worldId));
    return found ? clone(found) : undefined;
  }

  async listWorlds(): Promise<WorldProgress[]> {
    if (this.failWith) throw this.failWith;
    return [...this.store.values()].map((p) => clone(p));
  }

  async saveWorld(_userId: string, progress: WorldProgress, expectedVersion: number): Promise<void> {
    this.saveCalls.push({ progress: clone(progress), expected: expectedVersion });
    if (this.concurrentWriter) {
      const writer = this.concurrentWriter;
      this.concurrentWriter = undefined;
      writer(this);
    }
    if (this.failWith) throw this.failWith;
    const current = this.store.get(this.key(progress.worldId));
    if (current && current.version !== expectedVersion) throw new QuestVersionConflictError();
    if (!current && expectedVersion !== 0) throw new QuestVersionConflictError();
    this.store.set(this.key(progress.worldId), {
      ...clone(progress),
      version: expectedVersion + 1,
    });
  }

  stored(worldId: string): WorldProgress | undefined {
    return this.store.get(this.key(worldId));
  }
}

export function nodeProgress(stars: 0 | 1 | 2 | 3, bestScore = 0, extra: Partial<NodeProgress> = {}): NodeProgress {
  return {
    stars,
    bestScore,
    firstClearedAt: stars > 0 ? '2026-01-01T00:00:00.000Z' : '',
    lastPlayedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

/** Progress with `stars` on every path node of the world except those in `except`. */
export function clearedWorld(worldId: string, stars: 1 | 2 | 3, except: string[] = []): WorldProgress {
  const world = getWorld(worldId)!;
  const nodes: Record<string, NodeProgress> = {};
  for (const n of world.nodes) {
    if (!except.includes(n.id)) nodes[n.id] = nodeProgress(stars, n.thresholds[stars - 1]);
  }
  return {
    worldId,
    nodes,
    totalStars: 0,
    badges: [],
    version: 1,
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

export function catalogOf(omit: string[] = []) {
  const ids = new Set<string>();
  for (const w of QUEST_WORLDS) {
    for (const n of [...w.nodes, w.bonus]) for (const l of n.legs) ids.add(l.catalogGameId);
  }
  return {
    listAvailableGames: jest.fn(async () =>
      [...ids].filter((id) => !omit.includes(id)).map((gameId) => ({ gameId })) as any
    ),
  };
}

export function fakeRateLimiter() {
  return {
    getUsage: jest.fn(async (_userId: string, tier: string) => ({
      tier,
      limit: 20,
      used: 7,
      remaining: 13,
      resetAt: new Date('2026-01-16T00:00:00.000Z'),
    })),
  };
}

export interface QuestRig {
  repo: FakeQuestRepo;
  catalog: ReturnType<typeof catalogOf>;
  rateLimiter: ReturnType<typeof fakeRateLimiter>;
  service: QuestService;
  clock: { now: number };
}

export function questRig(omitCatalog: string[] = []): QuestRig {
  const repo = new FakeQuestRepo();
  const catalog = catalogOf(omitCatalog);
  const rateLimiter = fakeRateLimiter();
  const clock = { now: T0 };
  const service = new QuestService(
    repo as unknown as QuestProgressRepository,
    catalog,
    rateLimiter as unknown as RateLimiterService,
    () => clock.now
  );
  return { repo, catalog, rateLimiter, service, clock };
}

export function questGame(
  id: string,
  context: QuestContext,
  themeId: string,
  difficulty: number,
  overrides: Partial<Game> = {}
): Game {
  return {
    id,
    userId: USER_ID,
    themeId,
    difficulty,
    status: GameStatus.InProgress,
    startedAt: new Date(T0),
    attempts: 0,
    score: 0,
    questContext: context,
    createdAt: new Date(T0),
    updatedAt: new Date(T0),
    ...overrides,
  } as Game;
}
