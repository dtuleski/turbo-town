jest.unmock('@aws-sdk/lib-dynamodb');
jest.unmock('@aws-sdk/client-dynamodb');
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { ValidationError } from '@memory-game/shared';
import { EmailPrefsService } from '../../../src/services/email-prefs.service';
const TABLE = 'memory-game-email-prefs-test';
const docMock = mockClient(DynamoDBDocumentClient);
function service() {
  return new EmailPrefsService(DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' })), TABLE);
}
const conditionFailed = () => Object.assign(new Error('The conditional request failed'), { name: 'ConditionalCheckFailedException' });
beforeEach(() => docMock.reset());
describe('EmailPrefsService.setPrefs', () => {
  it('uses UpdateItem with only the toggle and contact fields, so time zone, language and claims survive', async () => {
    docMock.on(UpdateCommand).resolves({});
    const prefs = await service().setPrefs('u1', 'a@b.c', 'alice', true);
    expect(prefs).toMatchObject({ userId: 'u1', email: 'a@b.c', username: 'alice', dailyDigest: true });
    expect(docMock.commandCalls(PutCommand)).toHaveLength(0);
    const [call] = docMock.commandCalls(UpdateCommand);
    const input = call.args[0].input;
    expect(input.TableName).toBe(TABLE);
    expect(input.Key).toEqual({ userId: 'u1' });
    expect(input.UpdateExpression).toBe('SET #e = :e, #n = :n, #d = :d, #t = :t');
    expect(Object.values(input.ExpressionAttributeNames ?? {}).sort()).toEqual(['dailyDigest', 'email', 'updatedAt', 'username']);
    expect(input.ExpressionAttributeValues).toMatchObject({ ':e': 'a@b.c', ':n': 'alice', ':d': true });
    const touched = JSON.stringify(input);
    for (const kept of ['timeZone', 'language', 'lastDigestEmailOn', 'lastDigestPushOn', 'lastChallengePushOn']) {
      expect(touched).not.toContain(kept);
    }
    expect(input.UpdateExpression).not.toMatch(/REMOVE/);
  });
  it('falls back to PutItem merged over the current item when UpdateItem is denied (P0 pending)', async () => {
    docMock.on(UpdateCommand).rejects(Object.assign(new Error('not authorized'), { name: 'AccessDeniedException' }));
    docMock.on(GetCommand).resolves({
      Item: { userId: 'u1', email: 'old@b.c', username: 'alice', dailyDigest: true, updatedAt: 'x', timeZone: 'America/Chicago', language: 'es', lastDigestEmailOn: '2026-11-27' },
    });
    docMock.on(PutCommand).resolves({});
    const prefs = await service().setPrefs('u1', 'a@b.c', 'alice', false);
    expect(prefs).toMatchObject({ userId: 'u1', email: 'a@b.c', dailyDigest: false });
    const [put] = docMock.commandCalls(PutCommand);
    expect(put.args[0].input.TableName).toBe(TABLE);
    expect(put.args[0].input.Item).toEqual({
      userId: 'u1', email: 'a@b.c', username: 'alice', dailyDigest: false, updatedAt: prefs.updatedAt,
      timeZone: 'America/Chicago', language: 'es', lastDigestEmailOn: '2026-11-27',
    });
  });
  it('falls back to a plain PutItem for a user with no item yet', async () => {
    docMock.on(UpdateCommand).rejects(Object.assign(new Error('not authorized'), { name: 'AccessDeniedException' }));
    docMock.on(GetCommand).resolves({});
    docMock.on(PutCommand).resolves({});
    const prefs = await service().setPrefs('u2', 'n@b.c', 'neo', true);
    expect(docMock.commandCalls(PutCommand)[0].args[0].input.Item).toEqual(prefs);
  });
  it('rethrows other UpdateItem errors without a PutItem', async () => {
    docMock.on(UpdateCommand).rejects(Object.assign(new Error('boom'), { name: 'ProvisionedThroughputExceededException' }));
    await expect(service().setPrefs('u1', 'a@b.c', 'alice', true)).rejects.toThrow('boom');
    expect(docMock.commandCalls(PutCommand)).toHaveLength(0);
  });
});
describe('EmailPrefsService.setLocale', () => {
  it('sets only the given fields and returns the stored settings', async () => {
    docMock.on(UpdateCommand).resolves({ Attributes: { userId: 'u1', timeZone: 'America/Chicago', language: 'es' } });
    const res = await service().setLocale('u1', 'America/Chicago', undefined);
    expect(res).toEqual({ timeZone: 'America/Chicago', language: 'es' });
    const input = docMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(input.UpdateExpression).toBe('SET #z = :z');
    expect(input.ExpressionAttributeNames).toEqual({ '#z': 'timeZone' });
    expect(input.ExpressionAttributeValues).toEqual({ ':z': 'America/Chicago' });
    expect(JSON.stringify(input)).not.toContain('dailyDigest');
    expect(JSON.stringify(input)).not.toContain('updatedAt');
  });
  it('sets both fields', async () => {
    docMock.on(UpdateCommand).resolves({ Attributes: { userId: 'u1', timeZone: 'Asia/Kolkata', language: 'pt' } });
    await service().setLocale('u1', 'Asia/Kolkata', 'pt');
    const input = docMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(input.UpdateExpression).toBe('SET #z = :z, #l = :l');
  });
  it.each([
    ['Mars/Olympus', undefined],
    ['x'.repeat(65), undefined],
    [42, undefined],
    [undefined, 'fr'],
    [undefined, 'EN'],
  ])('rejects zone %p / language %p without writing', async (zone, lang) => {
    await expect(service().setLocale('u1', zone, lang)).rejects.toBeInstanceOf(ValidationError);
    expect(docMock.calls()).toHaveLength(0);
  });
  it('with nothing given reads the current values and writes nothing', async () => {
    docMock.on(GetCommand).resolves({ Item: { userId: 'u1', timeZone: 'Europe/Lisbon' } });
    expect(await service().setLocale('u1', null, undefined)).toEqual({ timeZone: 'Europe/Lisbon', language: null });
    expect(docMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });
});
describe('EmailPrefsService claims', () => {
  it('claimSend takes the date conditionally on the kind\'s attribute', async () => {
    docMock.on(UpdateCommand).resolves({});
    expect(await service().claimSend('u1', 'DigestEmail', '2026-11-27')).toBe(true);
    const input = docMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(input).toMatchObject({
      Key: { userId: 'u1' },
      UpdateExpression: 'SET #a = :d',
      ConditionExpression: 'attribute_exists(userId) AND (attribute_not_exists(#a) OR #a <> :d)',
      ExpressionAttributeNames: { '#a': 'lastDigestEmailOn' },
      ExpressionAttributeValues: { ':d': '2026-11-27' },
    });
  });
  it.each([
    ['DigestPush', 'lastDigestPushOn'],
    ['ChallengePush', 'lastChallengePushOn'],
  ] as const)('%s uses %s', async (kind, attr) => {
    docMock.on(UpdateCommand).resolves({});
    await service().claimSend('u1', kind, '2026-11-27');
    expect(docMock.commandCalls(UpdateCommand)[0].args[0].input.ExpressionAttributeNames).toEqual({ '#a': attr });
  });
  it('claimSend answers false when already taken for that date', async () => {
    docMock.on(UpdateCommand).rejects(conditionFailed());
    expect(await service().claimSend('u1', 'DigestPush', '2026-11-27')).toBe(false);
  });
  it('claimSend rethrows other errors', async () => {
    docMock.on(UpdateCommand).rejects(Object.assign(new Error('boom'), { name: 'ProvisionedThroughputExceededException' }));
    await expect(service().claimSend('u1', 'DigestPush', '2026-11-27')).rejects.toThrow('boom');
  });
  it('releaseSend removes the attribute only when it still holds that date', async () => {
    docMock.on(UpdateCommand).resolves({});
    await service().releaseSend('u1', 'ChallengePush', '2026-11-27');
    expect(docMock.commandCalls(UpdateCommand)[0].args[0].input).toMatchObject({
      UpdateExpression: 'REMOVE #a',
      ConditionExpression: '#a = :d',
      ExpressionAttributeNames: { '#a': 'lastChallengePushOn' },
      ExpressionAttributeValues: { ':d': '2026-11-27' },
    });
  });
  it('releaseSend ignores a claim that is no longer ours', async () => {
    docMock.on(UpdateCommand).rejects(conditionFailed());
    await expect(service().releaseSend('u1', 'ChallengePush', '2026-11-27')).resolves.toBeUndefined();
  });
});
