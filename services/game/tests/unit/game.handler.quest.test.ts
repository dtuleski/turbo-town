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

function makeHandler(gameService: any, questService: any, tier = 'PAID') {
  const handler = new GameHandler();
  (handler as any).gameService = gameService;
  (handler as any).questService = questService;
  (handler as any).subscriptionRepository = { getTier: jest.fn().mockResolvedValue(tier) };
  return handler;
}

describe('GameHandler quest wiring', () => {
  it('maps completeGame quest to null when the service returns none', async () => {
    const gameService = { completeGame: jest.fn().mockResolvedValue({ game, achievements: [] }) };
    const handler = makeHandler(gameService, {});
    const res: any = await handler.handleRequest({
      query: '',
      operationName: 'completeGame',
      variables: { input: {} },
      userId: 'u1',
    } as any);
    expect(res.errors).toBeUndefined();
    expect(res.data.completeGame.quest).toBeNull();
  });

  it('passes the quest result through on completeGame', async () => {
    const quest = { worldId: 'w1', stageCleared: true };
    const gameService = { completeGame: jest.fn().mockResolvedValue({ game, achievements: [], quest }) };
    const handler = makeHandler(gameService, {});
    const res: any = await handler.handleRequest({
      query: '',
      operationName: 'completeGame',
      variables: { input: {} },
      userId: 'u1',
    } as any);
    expect(res.data.completeGame.quest).toEqual(quest);
  });

  it('routes getQuestProgress with the JWT userId and tier', async () => {
    const view = { worlds: [] };
    const questService = { getProgressView: jest.fn().mockResolvedValue(view) };
    const handler = makeHandler({}, questService, 'FREE');
    const res: any = await handler.handleRequest({
      query: '',
      operationName: 'getQuestProgress',
      variables: {},
      userId: 'u1',
    } as any);
    expect(questService.getProgressView).toHaveBeenCalledWith('u1', 'FREE');
    expect(res.data.getQuestProgress).toEqual(view);
  });
});

