jest.unmock('@aws-sdk/lib-dynamodb');
jest.unmock('@aws-sdk/client-dynamodb');
import { createHash } from 'crypto';
import {
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { DeleteEndpointCommand } from '@aws-sdk/client-sns';
import { ValidationError } from '@memory-game/shared';
import { PushDeviceRepository } from '../../../src/repositories/push-device.repository';
import {
  MAX_DEVICES_PER_USER,
  PushDeviceService,
  createPushDeviceService,
  deviceIdFor,
} from '../../../src/services/push-device.service';
const TABLE = 'memory-game-push-devices-test';
const TOKEN = 'ab'.repeat(32);
const NOW = new Date('2026-11-27T13:00:00Z');
const conditionFailed = () => Object.assign(new Error('failed'), { name: 'ConditionalCheckFailedException' });
/** In-memory device table keyed by deviceId; enough of DynamoDB for the repository. */
function deviceTable() {
  const items = new Map<string, Record<string, any>>();
  const calls: any[] = [];
  const send = jest.fn(async (c: any) => {
    calls.push(c);
    const i = c.input;
    if (c instanceof GetCommand) return { Item: items.get(i.Key.deviceId) };
    if (c instanceof PutCommand) {
      items.set(i.Item.deviceId, { ...i.Item });
      return {};
    }
    if (c instanceof DeleteCommand) {
      const old = items.get(i.Key.deviceId);
      if (i.ConditionExpression === 'userId = :u' && old?.userId !== i.ExpressionAttributeValues[':u']) throw conditionFailed();
      items.delete(i.Key.deviceId);
      return i.ReturnValues === 'ALL_OLD' ? { Attributes: old } : {};
    }
    if (c instanceof QueryCommand) {
      return { Items: [...items.values()].filter((d) => d.userId === i.ExpressionAttributeValues[':u']) };
    }
    if (c instanceof ScanCommand) return { Items: [...items.values()] };
    if (c instanceof UpdateCommand) {
      const old = items.get(i.Key.deviceId);
      if (!old) throw conditionFailed();
      if (i.UpdateExpression.startsWith('SET')) old.endpointArn = i.ExpressionAttributeValues[':a'];
      else delete old.endpointArn;
      return {};
    }
    if (c instanceof BatchWriteCommand) {
      for (const r of i.RequestItems[TABLE]) items.delete(r.DeleteRequest.Key.deviceId);
      return { UnprocessedItems: {} };
    }
    throw new Error('unexpected command');
  });
  return { items, calls, client: { send } };
}
function rig() {
  const table = deviceTable();
  const repo = new PushDeviceRepository(table.client, TABLE);
  const sns = { send: jest.fn(async (_c: any) => ({})) };
  const service = new PushDeviceService(repo, sns, () => NOW);
  return { ...table, repo, sns, service };
}
const input = (over: Record<string, unknown> = {}) => ({
  token: TOKEN,
  platform: 'IOS',
  environment: 'production',
  timeZone: 'America/Chicago',
  language: 'es',
  ...over,
});
describe('createPushDeviceService', () => {
  it('is off without PUSH_DEVICES_TABLE_NAME', () => {
    expect(createPushDeviceService({})).toBeUndefined();
  });
  it('is built when the table name is set', () => {
    expect(createPushDeviceService({ PUSH_DEVICES_TABLE_NAME: TABLE })).toBeInstanceOf(PushDeviceService);
  });
});
describe('deviceIdFor', () => {
  it('is sha256 of "IOS:" and the lower-case token', () => {
    const expected = createHash('sha256').update(`IOS:${TOKEN}`).digest('hex');
    expect(deviceIdFor('IOS', TOKEN)).toBe(expected);
    expect(deviceIdFor('IOS', TOKEN.toUpperCase())).toBe(expected);
  });
});
describe('PushDeviceService.register', () => {
  it('stores the device under the caller with the hashed id', async () => {
    const { service, items } = rig();
    expect(await service.register('u1', input({ token: TOKEN.toUpperCase() }))).toEqual({ ok: true });
    const stored = items.get(deviceIdFor('IOS', TOKEN));
    expect(stored).toEqual({
      deviceId: deviceIdFor('IOS', TOKEN),
      userId: 'u1',
      platform: 'IOS',
      token: TOKEN,
      environment: 'production',
      timeZone: 'America/Chicago',
      language: 'es',
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });
  it('moves a token registered by another user to the caller and keeps its endpoint', async () => {
    const { service, items, sns } = rig();
    items.set(deviceIdFor('IOS', TOKEN), {
      deviceId: deviceIdFor('IOS', TOKEN), userId: 'old', platform: 'IOS', token: TOKEN, environment: 'production',
      endpointArn: 'arn:aws:sns:us-east-1:1:endpoint/APNS/app/1', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: 'x',
    });
    await service.register('u2', input({ timeZone: undefined, language: undefined }));
    const stored = items.get(deviceIdFor('IOS', TOKEN))!;
    expect(stored.userId).toBe('u2');
    expect(stored.endpointArn).toBe('arn:aws:sns:us-east-1:1:endpoint/APNS/app/1');
    expect(stored.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(sns.send).not.toHaveBeenCalled();
  });
  it('drops (and deletes) the endpoint when the APNs environment changed', async () => {
    const { service, items, sns } = rig();
    items.set(deviceIdFor('IOS', TOKEN), {
      deviceId: deviceIdFor('IOS', TOKEN), userId: 'u1', platform: 'IOS', token: TOKEN, environment: 'sandbox',
      endpointArn: 'arn:sandbox', createdAt: 'c', updatedAt: 'u',
    });
    await service.register('u1', input());
    expect(items.get(deviceIdFor('IOS', TOKEN))!.endpointArn).toBeUndefined();
    expect(sns.send.mock.calls[0][0]).toBeInstanceOf(DeleteEndpointCommand);
  });
  it(`keeps at most ${MAX_DEVICES_PER_USER} devices per user, evicting the least recently updated`, async () => {
    const { service, items, sns } = rig();
    const tok = (n: number) => n.toString(16).padStart(64, '0');
    for (let n = 1; n <= MAX_DEVICES_PER_USER; n++) {
      items.set(deviceIdFor('IOS', tok(n)), {
        deviceId: deviceIdFor('IOS', tok(n)), userId: 'u1', platform: 'IOS', token: tok(n), environment: 'production',
        endpointArn: `arn:ep/${n}`, createdAt: 'c', updatedAt: `2026-11-0${n}T00:00:00.000Z`,
      });
    }
    items.set('other-user', {
      deviceId: 'other-user', userId: 'u2', platform: 'IOS', token: tok(99), environment: 'production',
      createdAt: 'c', updatedAt: '2020-01-01T00:00:00.000Z',
    });
    await service.register('u1', input());
    const mine = [...items.values()].filter((d) => d.userId === 'u1');
    expect(mine).toHaveLength(MAX_DEVICES_PER_USER);
    expect(items.has(deviceIdFor('IOS', tok(1)))).toBe(false);
    expect(items.has(deviceIdFor('IOS', TOKEN))).toBe(true);
    expect(items.has('other-user')).toBe(true);
    expect(sns.send).toHaveBeenCalledTimes(1);
    expect((sns.send.mock.calls[0][0] as DeleteEndpointCommand).input).toEqual({ EndpointArn: 'arn:ep/1' });
  });
  it('re-registering a device the user already has evicts nothing', async () => {
    const { service, items, sns } = rig();
    const tok = (n: number) => n.toString(16).padStart(64, '0');
    for (let n = 1; n < MAX_DEVICES_PER_USER; n++) {
      items.set(deviceIdFor('IOS', tok(n)), {
        deviceId: deviceIdFor('IOS', tok(n)), userId: 'u1', platform: 'IOS', token: tok(n), environment: 'production',
        createdAt: 'c', updatedAt: `2026-11-0${n}T00:00:00.000Z`,
      });
    }
    await service.register('u1', input());
    await service.register('u1', input());
    expect([...items.values()].filter((d) => d.userId === 'u1')).toHaveLength(MAX_DEVICES_PER_USER);
    expect(sns.send).not.toHaveBeenCalled();
  });
  it.each([
    ['no input', null],
    ['short token', input({ token: 'ab'.repeat(10) })],
    ['non-hex token', input({ token: 'zz'.repeat(32) })],
    ['long token', input({ token: 'a'.repeat(201) })],
    ['android', input({ platform: 'ANDROID' })],
    ['bad environment', input({ environment: 'staging' })],
    ['bad zone', input({ timeZone: 'Nowhere/Land' })],
    ['bad language', input({ language: 'fr' })],
  ])('rejects %s with one generic message and writes nothing', async (_name, bad) => {
    const { service, calls } = rig();
    await expect(service.register('u1', bad)).rejects.toThrow(new ValidationError('Invalid push device'));
    expect(calls).toHaveLength(0);
  });
});
describe('PushDeviceService.unregister', () => {
  it('deletes only a device owned by the caller', async () => {
    const { service, items, sns } = rig();
    await service.register('owner', input());
    expect(await service.unregister('intruder', TOKEN)).toEqual({ ok: false });
    expect(items.has(deviceIdFor('IOS', TOKEN))).toBe(true);
    expect(sns.send).not.toHaveBeenCalled();
    expect(await service.unregister('owner', TOKEN)).toEqual({ ok: true });
    expect(items.has(deviceIdFor('IOS', TOKEN))).toBe(false);
  });
  it('deletes the SNS endpoint best effort', async () => {
    const { service, items, sns } = rig();
    await service.register('u1', input());
    items.get(deviceIdFor('IOS', TOKEN))!.endpointArn = 'arn:aws:sns:us-east-1:1:endpoint/APNS/app/9';
    sns.send.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NotFoundException' }));
    expect(await service.unregister('u1', TOKEN)).toEqual({ ok: true });
    const call = sns.send.mock.calls[0][0] as DeleteEndpointCommand;
    expect(call.input).toEqual({ EndpointArn: 'arn:aws:sns:us-east-1:1:endpoint/APNS/app/9' });
  });
  it('answers ok: false for a malformed token without a database call', async () => {
    const { service, calls } = rig();
    expect(await service.unregister('u1', 'nope')).toEqual({ ok: false });
    expect(calls).toHaveLength(0);
  });
});
describe('PushDeviceRepository', () => {
  it('lists a user\'s devices through user-index and skips malformed items', async () => {
    const { repo, items, calls } = rig();
    items.set('a', { deviceId: 'a', userId: 'u1', platform: 'IOS', token: TOKEN, environment: 'production' });
    items.set('b', { deviceId: 'b', userId: 'u1', platform: 'IOS' });
    const list = await repo.listForUser('u1');
    expect(list.map((d) => d.deviceId)).toEqual(['a']);
    expect(calls[0].input).toMatchObject({ IndexName: 'user-index', KeyConditionExpression: 'userId = :u' });
  });
  it('setEndpoint does not re-create a deleted device', async () => {
    const { repo, items } = rig();
    await expect(repo.setEndpoint('gone', 'arn:x')).resolves.toBeUndefined();
    expect(items.size).toBe(0);
  });
  it('fails when the table is not configured', async () => {
    const saved = process.env.PUSH_DEVICES_TABLE_NAME;
    delete process.env.PUSH_DEVICES_TABLE_NAME;
    await expect(new PushDeviceRepository({ send: jest.fn() }).get('x')).rejects.toThrow('Push devices are not configured');
    if (saved !== undefined) process.env.PUSH_DEVICES_TABLE_NAME = saved;
  });
});
