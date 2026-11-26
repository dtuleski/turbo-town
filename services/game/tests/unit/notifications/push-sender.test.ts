import {
  CreatePlatformEndpointCommand,
  DeleteEndpointCommand,
  GetEndpointAttributesCommand,
  PublishCommand,
  SetEndpointAttributesCommand,
} from '@aws-sdk/client-sns';
import { PushSender, apnsMessage, mapWithConcurrency } from '../../../src/notifications/push-sender';
import type { PushDevice } from '../../../src/repositories/push-device.repository';
const APP = 'arn:aws:sns:us-east-1:342278407349:app/APNS/dashden-ios-prod';
const SANDBOX_APP = 'arn:aws:sns:us-east-1:342278407349:app/APNS_SANDBOX/dashden-ios-sandbox';
const ENDPOINT = 'arn:aws:sns:us-east-1:342278407349:endpoint/APNS/dashden-ios-prod/1111';
const TOKEN = 'ab'.repeat(32);
const MESSAGE = { title: 'T', body: 'B', route: '/' };
const device = (over: Partial<PushDevice> = {}): PushDevice => ({
  deviceId: 'd1', userId: 'u1', platform: 'IOS', token: TOKEN, environment: 'production',
  createdAt: 'c', updatedAt: 'u', ...over,
});
const snsError = (name: string, message = name) => Object.assign(new Error(message), { name });
/** Fake SNS: answers per command class from a handler map. */
function fakeSns(handlers: Partial<Record<string, (input: any) => any>>) {
  const calls: any[] = [];
  return {
    calls,
    send: jest.fn(async (c: any) => {
      calls.push(c);
      const h = handlers[c.constructor.name];
      if (!h) return {};
      return h(c.input);
    }),
  };
}
const found = (sns: { calls: any[] }, cls: new (...args: any[]) => unknown): any => sns.calls.find((c) => c instanceof cls);
const store = () => ({ setEndpoint: jest.fn(async () => undefined), delete: jest.fn(async () => undefined) });
describe('apnsMessage', () => {
  it('builds the SNS json structure with the APNs payload and the route', () => {
    const m = JSON.parse(apnsMessage({ title: 'Hi', body: 'There', route: '/challenge/results?day=2026-11-26' }, 'production'));
    expect(Object.keys(m)).toEqual(['APNS']);
    expect(JSON.parse(m.APNS)).toEqual({
      aps: { alert: { title: 'Hi', body: 'There' }, sound: 'default' },
      route: '/challenge/results?day=2026-11-26',
    });
    expect(Object.keys(JSON.parse(apnsMessage(MESSAGE, 'sandbox')))).toEqual(['APNS_SANDBOX']);
  });
});
describe('PushSender.send', () => {
  it('creates the endpoint on first send, stores it, and publishes', async () => {
    const sns = fakeSns({
      CreatePlatformEndpointCommand: () => ({ EndpointArn: ENDPOINT }),
      GetEndpointAttributesCommand: () => ({ Attributes: { Enabled: 'true', Token: TOKEN } }),
    });
    const devices = store();
    const result = await new PushSender(sns, { platformApplicationArn: APP }, devices).send(device(), MESSAGE);
    expect(result).toBe('sent');
    expect(sns.calls[0]).toBeInstanceOf(CreatePlatformEndpointCommand);
    expect(sns.calls[0].input).toEqual({ PlatformApplicationArn: APP, Token: TOKEN });
    expect(devices.setEndpoint).toHaveBeenCalledWith('d1', ENDPOINT);
    const publish = found(sns, PublishCommand);
    expect(publish.input).toMatchObject({ TargetArn: ENDPOINT, MessageStructure: 'json' });
    expect(sns.calls.some((c) => c instanceof SetEndpointAttributesCommand)).toBe(false);
  });
  it('reuses an "already exists" endpoint named in the error and re-enables it', async () => {
    const sns = fakeSns({
      CreatePlatformEndpointCommand: () => {
        throw snsError('InvalidParameterException', `Invalid parameter: Token Reason: Endpoint ${ENDPOINT} already exists with the same Token, but different attributes.`);
      },
      GetEndpointAttributesCommand: () => ({ Attributes: { Enabled: 'false', Token: TOKEN } }),
    });
    const devices = store();
    expect(await new PushSender(sns, { platformApplicationArn: APP }, devices).send(device(), MESSAGE)).toBe('sent');
    const set = found(sns, SetEndpointAttributesCommand);
    expect(set.input).toEqual({ EndpointArn: ENDPOINT, Attributes: { Enabled: 'true', Token: TOKEN } });
    expect(devices.setEndpoint).toHaveBeenCalledWith('d1', ENDPOINT);
  });
  it('uses a stored endpoint without creating one', async () => {
    const sns = fakeSns({});
    expect(await new PushSender(sns, { platformApplicationArn: APP }, store()).send(device({ endpointArn: ENDPOINT }), MESSAGE)).toBe('sent');
    expect(sns.calls).toHaveLength(1);
    expect(sns.calls[0]).toBeInstanceOf(PublishCommand);
  });
  it('EndpointDisabled removes the device and its endpoint', async () => {
    const sns = fakeSns({ PublishCommand: () => { throw snsError('EndpointDisabledException'); } });
    const devices = store();
    expect(await new PushSender(sns, { platformApplicationArn: APP }, devices).send(device({ endpointArn: ENDPOINT }), MESSAGE)).toBe('removed');
    expect(devices.delete).toHaveBeenCalledWith('d1');
    const del = found(sns, DeleteEndpointCommand);
    expect(del.input).toEqual({ EndpointArn: ENDPOINT });
  });
  it('a token SNS rejects removes the device', async () => {
    const sns = fakeSns({ CreatePlatformEndpointCommand: () => { throw snsError('InvalidParameterException', 'Invalid parameter: Token'); } });
    const devices = store();
    expect(await new PushSender(sns, { platformApplicationArn: APP }, devices).send(device(), MESSAGE)).toBe('removed');
    expect(devices.delete).toHaveBeenCalledWith('d1');
  });
  it('a deleted endpoint is cleared on the device and the send counts as failed', async () => {
    const sns = fakeSns({ PublishCommand: () => { throw snsError('NotFoundException'); } });
    const devices = store();
    expect(await new PushSender(sns, { platformApplicationArn: APP }, devices).send(device({ endpointArn: ENDPOINT }), MESSAGE)).toBe('failed');
    expect(devices.setEndpoint).toHaveBeenCalledWith('d1', null);
    expect(devices.delete).not.toHaveBeenCalled();
  });
  it('other errors are "failed" and keep the device', async () => {
    const sns = fakeSns({ PublishCommand: () => { throw snsError('ThrottledException'); } });
    const devices = store();
    expect(await new PushSender(sns, { platformApplicationArn: APP }, devices).send(device({ endpointArn: ENDPOINT }), MESSAGE)).toBe('failed');
    expect(devices.delete).not.toHaveBeenCalled();
  });
  it('sandbox devices use the sandbox application, and are skipped without one', async () => {
    const sns = fakeSns({
      CreatePlatformEndpointCommand: () => ({ EndpointArn: 'arn:aws:sns:us-east-1:342278407349:endpoint/APNS_SANDBOX/dashden-ios-sandbox/2' }),
      GetEndpointAttributesCommand: () => ({ Attributes: { Enabled: 'true', Token: TOKEN } }),
    });
    expect(await new PushSender(sns, { platformApplicationArn: APP }, store()).send(device({ environment: 'sandbox' }), MESSAGE)).toBe('skipped');
    expect(sns.calls).toHaveLength(0);
    const both = { platformApplicationArn: APP, platformApplicationArnSandbox: SANDBOX_APP };
    expect(await new PushSender(sns, both, store()).send(device({ environment: 'sandbox' }), MESSAGE)).toBe('sent');
    expect(sns.calls[0].input.PlatformApplicationArn).toBe(SANDBOX_APP);
    expect(Object.keys(JSON.parse(found(sns, PublishCommand).input.Message))).toEqual(['APNS_SANDBOX']);
    expect(sns.calls.some((c) => c instanceof GetEndpointAttributesCommand)).toBe(true);
  });
  it('Android devices are skipped (no Android push yet)', async () => {
    const sns = fakeSns({});
    expect(await new PushSender(sns, { platformApplicationArn: APP }, store()).send(device({ platform: 'ANDROID' }), MESSAGE)).toBe('skipped');
  });
});
describe('mapWithConcurrency', () => {
  it('keeps at most `limit` in flight and a rejection does not stop the others', async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapWithConcurrency(Array.from({ length: 25 }, (_, i) => i), 10, async (i) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 2));
      inFlight--;
      if (i === 3) throw new Error('one bad');
      return i * 2;
    });
    expect(peak).toBe(10);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(24);
    expect(results[3].status).toBe('rejected');
    expect(results[24]).toEqual({ status: 'fulfilled', value: 48 });
  });
});
