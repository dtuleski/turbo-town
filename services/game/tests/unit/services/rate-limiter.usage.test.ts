/**
 * QM2 - RateLimiterService.getUsage (R-VIEW-4): read-only, same record checkLimit reads.
 */
import { SubscriptionTier } from '@memory-game/shared';
import { RateLimiterService } from '../../../src/services/rate-limiter.service';
import type { RateLimitRepository } from '../../../src/repositories/rate-limit.repository';

function limiter(record: unknown) {
  const repo = {
    get: jest.fn(async () => record),
    reset: jest.fn(),
    increment: jest.fn(),
    upsert: jest.fn(),
  };
  return { service: new RateLimiterService(repo as unknown as RateLimitRepository), repo };
}

describe('RateLimiterService.getUsage', () => {
  const future = new Date(Date.now() + 3 * 3600 * 1000).toISOString();
  const past = new Date(Date.now() - 3600 * 1000).toISOString();

  it('missing record means nothing used, and nothing is written', async () => {
    const { service, repo } = limiter(null);
    const usage = await service.getUsage('u1', SubscriptionTier.Free);
    expect(usage).toMatchObject({ tier: SubscriptionTier.Free, limit: 3, used: 0, remaining: 3 });
    expect(usage.resetAt.getTime()).toBeGreaterThan(Date.now());
    expect(repo.reset).not.toHaveBeenCalled();
    expect(repo.increment).not.toHaveBeenCalled();
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it('expired record means nothing used', async () => {
    const { service } = limiter({ userId: 'u1', count: 3, resetAt: past });
    expect(await service.getUsage('u1', SubscriptionTier.Free)).toMatchObject({ used: 0, remaining: 3 });
  });

  it('active record reports used and remaining against the enforced tier limit', async () => {
    const { service } = limiter({ userId: 'u1', count: 7, resetAt: future });
    const usage = await service.getUsage('u1', SubscriptionTier.Light);
    expect(usage).toMatchObject({ limit: 20, used: 7, remaining: 13 });
    expect(usage.resetAt.toISOString()).toBe(future);
  });

  it('remaining never goes below zero', async () => {
    const { service } = limiter({ userId: 'u1', count: 9, resetAt: future });
    expect(await service.getUsage('u1', SubscriptionTier.Free)).toMatchObject({ used: 9, remaining: 0 });
  });
});
