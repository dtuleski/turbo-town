import { GameHandler } from '../../src/handlers/game.handler';
function call(handler: GameHandler, operationName: string, variables: Record<string, unknown> = {}) {
  return handler.handleRequest({ query: '', operationName, variables, userId: 'u1' } as any) as Promise<any>;
}
describe('GameHandler notification routes', () => {
  const saved = process.env.PUSH_DEVICES_TABLE_NAME;
  afterEach(() => {
    if (saved === undefined) delete process.env.PUSH_DEVICES_TABLE_NAME;
    else process.env.PUSH_DEVICES_TABLE_NAME = saved;
  });
  it('device operations answer ok: false without PUSH_DEVICES_TABLE_NAME', async () => {
    delete process.env.PUSH_DEVICES_TABLE_NAME;
    const handler = new GameHandler();
    expect((handler as any).pushDeviceService).toBeUndefined();
    expect(await call(handler, 'registerPushDevice', { input: { token: 'ab'.repeat(32) } })).toEqual({
      data: { registerPushDevice: { ok: false } },
    });
    expect(await call(handler, 'unregisterPushDevice', { token: 'ab'.repeat(32) })).toEqual({
      data: { unregisterPushDevice: { ok: false } },
    });
  });
  it('builds the device service when the table name is set', () => {
    process.env.PUSH_DEVICES_TABLE_NAME = 'memory-game-push-devices-dev';
    expect((new GameHandler() as any).pushDeviceService).toBeDefined();
  });
  it('register and unregister pass the JWT user id', async () => {
    const handler = new GameHandler();
    const push = { register: jest.fn().mockResolvedValue({ ok: true }), unregister: jest.fn().mockResolvedValue({ ok: true }) };
    (handler as any).pushDeviceService = push;
    const deviceInput = { token: 'ab'.repeat(32), platform: 'IOS', environment: 'production', userId: 'someone-else' };
    expect((await call(handler, 'registerPushDevice', { input: deviceInput })).data.registerPushDevice).toEqual({ ok: true });
    expect(push.register).toHaveBeenCalledWith('u1', deviceInput);
    await call(handler, 'unregisterPushDevice', { token: 'cd'.repeat(32) });
    expect(push.unregister).toHaveBeenCalledWith('u1', 'cd'.repeat(32));
  });
  it('a validation error is returned as a GraphQL error', async () => {
    const handler = new GameHandler();
    const { ValidationError } = jest.requireActual('@memory-game/shared');
    (handler as any).pushDeviceService = { register: jest.fn().mockRejectedValue(new ValidationError('Invalid push device')) };
    const res = await call(handler, 'registerPushDevice', { input: {} });
    expect(res.errors[0].message).toBe('Invalid push device');
  });
  it('saveNotificationSettings writes the caller\'s zone and language (always available)', async () => {
    delete process.env.PUSH_DEVICES_TABLE_NAME;
    const handler = new GameHandler();
    const setLocale = jest.fn().mockResolvedValue({ timeZone: 'America/Denver', language: 'pt' });
    (handler as any).emailPrefsService = { setLocale };
    const res = await call(handler, 'saveNotificationSettings', { input: { timeZone: 'America/Denver', language: 'pt' } });
    expect(setLocale).toHaveBeenCalledWith('u1', 'America/Denver', 'pt');
    expect(res.data.saveNotificationSettings).toEqual({ timeZone: 'America/Denver', language: 'pt' });
  });
  it('getEmailPrefs reads an item without a toggle as off', async () => {
    const handler = new GameHandler();
    (handler as any).emailPrefsService = { getPrefs: jest.fn().mockResolvedValue({ userId: 'u1', timeZone: 'America/Denver' }) };
    const res = await call(handler, 'getEmailPrefs');
    expect(res.data.getEmailPrefs).toEqual({ userId: 'u1', timeZone: 'America/Denver', dailyDigest: false });
  });
});
