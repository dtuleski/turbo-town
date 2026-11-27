jest.unmock('@aws-sdk/lib-dynamodb');
jest.unmock('@aws-sdk/client-dynamodb');
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = mockClient(DynamoDBDocumentClient);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { handleUnsubscribe } = require('../../src/index');

describe('GET /unsubscribe', () => {
  beforeEach(() => ddb.reset());

  it('sets only the activation opt-out flag and keeps the other settings', async () => {
    ddb.on(UpdateCommand).resolves({});
    const res = await handleUnsubscribe({ queryStringParameters: { userId: 'u1', type: 'activation' } });
    expect(res.statusCode).toBe(200);
    expect(ddb.commandCalls(PutCommand)).toHaveLength(0);
    const input = ddb.commandCalls(UpdateCommand)[0].args[0].input;
    expect(input.Key).toEqual({ userId: 'u1' });
    expect(input.UpdateExpression).toBe('SET activationEmailOptOut = :t, updatedAt = :now');
    expect(input.ExpressionAttributeValues![':t']).toBe(true);
  });

  it('rejects a link without a user id and writes nothing', async () => {
    const res = await handleUnsubscribe({ queryStringParameters: { type: 'activation' } });
    expect(res.statusCode).toBe(400);
    expect(ddb.calls()).toHaveLength(0);
  });
});
