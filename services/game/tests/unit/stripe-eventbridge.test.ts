const handleWebhook = jest.fn(async () => undefined);
jest.mock('../../src/services/stripe.service', () => ({
  StripeService: jest.fn().mockImplementation(() => ({ handleWebhook })),
}));

import { handler, isStripeEventBridgeEvent } from '../../src/index';

const stripeEvent = { id: 'evt_1', type: 'customer.subscription.updated', created: 1796000000, data: { object: { id: 'sub_1' } } };
const ebEvent = {
  id: 'eb-1',
  source: 'aws.partner/stripe.com/ed_test_123',
  'detail-type': 'customer.subscription.updated',
  detail: stripeEvent,
};

describe('Stripe through EventBridge', () => {
  beforeEach(() => handleWebhook.mockClear());

  it('recognizes Stripe partner events only', () => {
    expect(isStripeEventBridgeEvent(ebEvent)).toBe(true);
    expect(isStripeEventBridgeEvent({ source: 'aws.events', detail: {} })).toBe(false);
    expect(isStripeEventBridgeEvent({ requestContext: {} })).toBe(false);
  });

  it('passes the Stripe event to the same handler as the webhook', async () => {
    await handler(ebEvent, { functionName: 'f' });
    expect(handleWebhook).toHaveBeenCalledWith(stripeEvent);
  });

  it('ignores a malformed detail without throwing', async () => {
    await handler({ ...ebEvent, detail: { foo: 1 } }, {});
    expect(handleWebhook).not.toHaveBeenCalled();
  });

  it('lets errors propagate so EventBridge retries', async () => {
    handleWebhook.mockRejectedValueOnce(new Error('dynamo down'));
    await expect(handler(ebEvent, {})).rejects.toThrow('dynamo down');
  });
});
