import { GameHandler } from '../../src/handlers/game.handler';

jest.mock('../../src/utils/validation', () => ({
  ...jest.requireActual('../../src/utils/validation'),
  validateCompleteGameInput: (i: any) => i,
}));

const game = {
  id: 'g1',
  status: 'COMPLETED',
  completedAt: 't',
  completionTime: 10,
  attempts: 3,
  score: 100,
};

function call(handler: GameHandler, operationName: string, variables: Record<string, unknown> = {}) {
  return handler.handleRequest({ query: '', operationName, variables, userId: 'u1' } as any) as Promise<any>;
}

function makeHandler(challengeService: any, gameService?: any) {
  const handler = new GameHandler();
  (handler as any).challengeService = challengeService;
  if (gameService) (handler as any).gameService = gameService;
  return handler;
}

describe('GameHandler challenge wiring', () => {
  const saved = process.env.DAILY_CHALLENGE_TABLE_NAME;
  afterEach(() => {
    if (saved === undefined) delete process.env.DAILY_CHALLENGE_TABLE_NAME;
    else process.env.DAILY_CHALLENGE_TABLE_NAME = saved;
  });

  it('is off without DAILY_CHALLENGE_TABLE_NAME: both queries return null, the game service gets no challenge service', async () => {
    delete process.env.DAILY_CHALLENGE_TABLE_NAME;
    const handler = new GameHandler();
    expect((handler as any).challengeService).toBeUndefined();
    expect(((handler as any).gameService as any).challengeService).toBeUndefined();
    const today = await call(handler, 'getDailyChallenge');
    expect(today).toEqual({ data: { getDailyChallenge: null } });
    const board = await call(handler, 'getChallengeLeaderboard', { day: '2026-11-26', limit: 5 });
    expect(board).toEqual({ data: { getChallengeLeaderboard: null } });
  });

  it('builds the service when the table name is set', () => {
    process.env.DAILY_CHALLENGE_TABLE_NAME = 'memory-game-daily-challenge-dev';
    const handler = new GameHandler();
    expect((handler as any).challengeService).toBeDefined();
    expect(((handler as any).gameService as any).challengeService).toBe((handler as any).challengeService);
  });

  it('getDailyChallenge sends settings and content as JSON text', async () => {
    const view = {
      day: '2026-11-26',
      gameId: 'code-a-bot',
      themeId: 'CODE_A_BOT',
      difficulty: 2,
      settings: { levels: 5 },
      content: { kind: 'code-a-bot', difficulty: 'medium', levelNumbers: [1, 2, 3, 4, 5] },
      endsAt: '2026-11-27T05:00:00.000Z',
      me: null,
    };
    const challengeService = { getToday: jest.fn().mockResolvedValue(view) };
    const res = await call(makeHandler(challengeService), 'getDailyChallenge');
    expect(challengeService.getToday).toHaveBeenCalledWith('u1');
    expect(res.data.getDailyChallenge).toEqual({
      ...view,
      settings: '{"levels":5}',
      content: JSON.stringify(view.content),
    });
  });

  it('getChallengeLeaderboard passes day and limit with the JWT user id', async () => {
    const board = { day: '2026-11-25', entries: [], me: null, final: true, gameId: 'code-a-bot', themeId: 'CODE_A_BOT' };
    const challengeService = { getLeaderboard: jest.fn().mockResolvedValue(board) };
    const res = await call(makeHandler(challengeService), 'getChallengeLeaderboard', { day: '2026-11-25', limit: 5 });
    expect(challengeService.getLeaderboard).toHaveBeenCalledWith('u1', '2026-11-25', 5);
    expect(res.data.getChallengeLeaderboard).toEqual(board);
  });

  it('returns the service validation error as a GraphQL error', async () => {
    const { ValidationError } = jest.requireActual('@memory-game/shared');
    const challengeService = { getLeaderboard: jest.fn().mockRejectedValue(new ValidationError('Invalid challenge day')) };
    const res = await call(makeHandler(challengeService), 'getChallengeLeaderboard', { day: '2099-01-01' });
    expect(res.errors?.[0]?.message).toBe('Invalid challenge day');
  });

  it('maps completeGame challenge to null when absent and passes it through when present', async () => {
    const none = { completeGame: jest.fn().mockResolvedValue({ game, achievements: [] }) };
    const r1 = await call(makeHandler(undefined, none), 'completeGame', { input: {} });
    expect(r1.data.completeGame.challenge).toBeNull();
    const challenge = { day: '2026-11-26', recorded: true, bestScore: 100, rank: 2, isNewBest: true };
    const some = { completeGame: jest.fn().mockResolvedValue({ game, achievements: [], challenge }) };
    const r2 = await call(makeHandler(undefined, some), 'completeGame', { input: {} });
    expect(r2.data.completeGame.challenge).toEqual(challenge);
  });
});
