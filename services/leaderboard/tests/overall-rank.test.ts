/**
 * Regression tests for OVERALL rank (dashboard "Your Rank" widget) and
 * weekly key computation.
 */
import { LeaderboardService } from '../src/services/leaderboard.service';
import { LeaderboardRepository } from '../src/repositories/leaderboard.repository';
import { AggregateRepository } from '../src/repositories/aggregate.repository';
import { GameType, Difficulty, Timeframe, LeaderboardEntry } from '../src/types';

jest.mock('../src/repositories/leaderboard.repository');
jest.mock('../src/repositories/aggregate.repository');

const entry = (userId: string, gameType: GameType, score: number): LeaderboardEntry => ({
  gameType,
  scoreTimestamp: `SCORE#${score}#TIMESTAMP#2026-11-21T10:00:00.000Z`,
  userId,
  username: userId,
  score,
  gameId: `${userId}-${gameType}-${score}`,
  difficulty: Difficulty.MEDIUM,
  completionTime: 30,
  accuracy: 1,
  timestamp: '2026-11-21T10:00:00.000Z',
  date: '2026-11-21',
  week: '2026-W47',
  month: '2026-11',
});

describe('LeaderboardService.getUserRank OVERALL', () => {
  let repo: jest.Mocked<LeaderboardRepository>;
  let service: LeaderboardService;

  beforeEach(() => {
    repo = new LeaderboardRepository() as jest.Mocked<LeaderboardRepository>;
    service = new LeaderboardService(repo, new AggregateRepository() as jest.Mocked<AggregateRepository>);
    // Entries are stored under their concrete game type, never under OVERALL.
    repo.queryByGameTypeAndTimeframe.mockImplementation(async ({ gameType }) => {
      if (gameType === GameType.MEMORY_MATCH) {
        return [entry('me', GameType.MEMORY_MATCH, 500), entry('other', GameType.MEMORY_MATCH, 900)];
      }
      if (gameType === GameType.SUDOKU) {
        return [entry('other', GameType.SUDOKU, 800), entry('third', GameType.SUDOKU, 100)];
      }
      return [];
    });
  });

  it('ranks the user across all game types instead of returning null', async () => {
    const result = await service.getUserRank('me', GameType.OVERALL, Timeframe.ALL_TIME);
    expect(result).not.toBeNull();
    expect(result).toMatchObject({ rank: 2, score: 500, totalPlayers: 3 });
  });

  it('counts a higher-scoring rival once even with several high entries', async () => {
    const result = await service.getUserRank('third', GameType.OVERALL, Timeframe.ALL_TIME);
    expect(result?.rank).toBe(3);
  });

  it('works for WEEKLY and returns null for a user with no entries', async () => {
    expect((await service.getUserRank('me', GameType.OVERALL, Timeframe.WEEKLY))?.rank).toBe(2);
    expect(await service.getUserRank('nobody', GameType.OVERALL, Timeframe.WEEKLY)).toBeNull();
  });
});

describe('weekly key computation', () => {
  const { LeaderboardRepository: Real } = jest.requireActual('../src/repositories/leaderboard.repository');
  const week = (iso: string) => new Real('t').getISOWeek(new Date(iso));

  it.each([
    ['2026-11-21T12:00:00Z', '2026-W47'],
    ['2026-11-23T12:00:00Z', '2026-W48'],
    ['2026-01-01T12:00:00Z', '2026-W01'],
    ['2027-01-01T12:00:00Z', '2026-W53'],
  ])('%s -> %s', (iso, expected) => {
    expect(week(iso)).toBe(expected);
  });
});
