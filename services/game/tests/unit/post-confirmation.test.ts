jest.unmock('@aws-sdk/lib-dynamodb');
jest.unmock('@aws-sdk/client-dynamodb');
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { displayName, handlePostConfirmation, isPostConfirmationEvent } from '../../src/post-confirmation';

const NOW = new Date('2026-11-27T12:00:00Z');

function event(triggerSource: string, attrs: Record<string, string> = {}) {
  return {
    version: '1',
    triggerSource,
    userName: 'Google_123',
    userPoolId: 'us-east-1_pool',
    request: { userAttributes: { sub: 'u1', email: 'ana@example.com', given_name: 'Ana', ...attrs } },
    response: {},
  };
}

describe('post confirmation trigger', () => {
  it('recognises Cognito post confirmation events only', () => {
    expect(isPostConfirmationEvent(event('PostConfirmation_ConfirmSignUp'))).toBe(true);
    expect(isPostConfirmationEvent({ requestContext: {} })).toBe(false);
    expect(isPostConfirmationEvent(null)).toBe(false);
  });

  it('turns the digest on for a new account without overwriting a choice', async () => {
    const sent: any[] = [];
    const e = event('PostConfirmation_ConfirmSignUp', { preferred_username: 'ana_s' });
    const out = await handlePostConfirmation(e, { send: async (c) => { sent.push(c); }, tableName: 't', now: () => NOW });
    expect(out).toBe(e);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(PutCommand);
    expect(sent[0].input).toEqual({
      TableName: 't',
      Item: { userId: 'u1', email: 'ana@example.com', username: 'ana_s', dailyDigest: true, updatedAt: NOW.toISOString() },
      ConditionExpression: 'attribute_not_exists(userId)',
    });
  });

  it('keeps an existing choice silently', async () => {
    const e = event('PostConfirmation_ConfirmSignUp');
    const fail = async () => { throw Object.assign(new Error('exists'), { name: 'ConditionalCheckFailedException' }); };
    await expect(handlePostConfirmation(e, { send: fail, tableName: 't' })).resolves.toBe(e);
  });

  it('never fails the sign-up on a storage error', async () => {
    const e = event('PostConfirmation_ConfirmSignUp');
    const fail = async () => { throw new Error('DynamoDB down'); };
    await expect(handlePostConfirmation(e, { send: fail, tableName: 't' })).resolves.toBe(e);
  });

  it('ignores password resets and events without a sub', async () => {
    const sent: any[] = [];
    const s = async (c: any) => { sent.push(c); };
    await handlePostConfirmation(event('PostConfirmation_ConfirmForgotPassword'), { send: s, tableName: 't' });
    const noSub = event('PostConfirmation_ConfirmSignUp');
    delete (noSub.request.userAttributes as any).sub;
    await handlePostConfirmation(noSub, { send: s, tableName: 't' });
    expect(sent).toHaveLength(0);
  });

  it('greets with the same name order as the API', () => {
    expect(displayName({ given_name: 'Ana', email: 'a@b.co' }, 'x')).toBe('Ana');
    expect(displayName({ email: 'ana.s@b.co' }, 'x')).toBe('ana.s');
    expect(displayName({}, 'Google_1')).toBe('Google_1');
  });
});
