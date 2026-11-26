import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { createApnsConfigLoader, parseApnsSecret } from '../../../src/notifications/apns-config';
const APP = 'arn:aws:sns:us-east-1:342278407349:app/APNS/dashden-ios-prod';
const SANDBOX = 'arn:aws:sns:us-east-1:342278407349:app/APNS_SANDBOX/dashden-ios-sandbox';
const secret = (o: Record<string, unknown>) => ({ SecretString: JSON.stringify(o) });
describe('parseApnsSecret', () => {
  it('reads the platform application ARNs only', () => {
    expect(parseApnsSecret(JSON.stringify({ keyId: 'K', signingKey: 'PRIVATE', platformApplicationArn: APP }))).toEqual({
      platformApplicationArn: APP,
    });
    expect(parseApnsSecret(JSON.stringify({ platformApplicationArn: APP, platformApplicationArnSandbox: SANDBOX }))).toEqual({
      platformApplicationArn: APP,
      platformApplicationArnSandbox: SANDBOX,
    });
  });
  it.each([undefined, '', 'not json', '[]', JSON.stringify({ keyId: 'K' }), JSON.stringify({ platformApplicationArn: 'arn:aws:s3:::x' })])(
    'is null for %p',
    (s) => expect(parseApnsSecret(s as any)).toBeNull()
  );
});
describe('createApnsConfigLoader', () => {
  it('is null without a secret id and makes no call', async () => {
    const client = { send: jest.fn() };
    expect(await createApnsConfigLoader({ secretId: undefined, client })()).toBeNull();
    expect(client.send).not.toHaveBeenCalled();
  });
  it('a missing secret means push is off (null), never a throw', async () => {
    const client = { send: jest.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'ResourceNotFoundException' })) };
    expect(await createApnsConfigLoader({ secretId: 'dashden/apns/prod', client })()).toBeNull();
  });
  it('a secret without platformApplicationArn means push is off', async () => {
    const client = { send: jest.fn().mockResolvedValue(secret({ keyId: 'K', teamId: 'T', signingKey: 'PRIVATE' })) };
    expect(await createApnsConfigLoader({ secretId: 'dashden/apns/prod', client })()).toBeNull();
  });
  it('reads the secret by id and caches it for 10 minutes', async () => {
    let t = 0;
    const client = { send: jest.fn().mockResolvedValue(secret({ platformApplicationArn: APP })) };
    const load = createApnsConfigLoader({ secretId: 'dashden/apns/prod', client, now: () => t });
    expect(await load()).toEqual({ platformApplicationArn: APP });
    expect(client.send.mock.calls[0][0]).toBeInstanceOf(GetSecretValueCommand);
    expect(client.send.mock.calls[0][0].input).toEqual({ SecretId: 'dashden/apns/prod' });
    t = 9 * 60 * 1000;
    await load();
    expect(client.send).toHaveBeenCalledTimes(1);
    t = 10 * 60 * 1000;
    await load();
    expect(client.send).toHaveBeenCalledTimes(2);
  });
});
