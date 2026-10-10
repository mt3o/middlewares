import { describe, it, expect } from 'vitest';
import type { GenMiddleware, GenMiddlewareStack, Middleware, MiddlewareStack } from '../src/types';
import { composeGenStack, composeStack } from '../src/registry';
import { MiddlewareChainEndError } from '../src/errors';

describe('composeStack: end of chain', () => {
  it('rejects with MiddlewareChainEndError naming the last middleware', async () => {
    const outer: Middleware<number, number, number, number> = async (n, next) => next(n + 1);
    const prepare: Middleware<number, number, number, number> = async (n, next) => next(n * 2);
    prepare.Name = 'Prepare';

    const executable = composeStack([outer, prepare] as MiddlewareStack<number, number>);

    const error = await executable(1).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MiddlewareChainEndError);
    expect((error as MiddlewareChainEndError).lastMiddleware).toBe('Prepare');
    expect((error as Error).message).toContain('"Prepare"');
  });

  it('uses a custom terminal instead of throwing', async () => {
    const only: Middleware<number, number, number, number> = async (n, next) => next(n + 1);
    const received: unknown[] = [];

    const executable = composeStack([only] as MiddlewareStack<number, number>, {
      terminal: async (req) => {
        received.push(req);
        return 42;
      },
    });

    await expect(executable(1)).resolves.toBe(42);
    expect(received).toStrictEqual([2]);
  });
});

describe('composeGenStack: end of chain and errors', () => {
  it('rejects the returned promise when the end of the chain is reached', { timeout: 500 }, async () => {
    const check: GenMiddleware<string, string, string, string> = async (details, next, resolve) => {
      next(details, (response) => resolve(response));
    };
    check.Name = 'Check';

    const executable = composeGenStack([check] as GenMiddlewareStack<string, string>);

    const error = await executable('job').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MiddlewareChainEndError);
    expect((error as MiddlewareChainEndError).lastMiddleware).toBe('Check');
  });

  it('rejects when a middleware throws after calling next without awaiting it', { timeout: 500 }, async () => {
    const outer: GenMiddleware<string, string, string, string> = async (details, next, resolve) => {
      next(details, (response) => resolve(response)); // not awaited
    };
    const execute: GenMiddleware<string, never, never, string> = async (_details, _next, _resolve) => {
      await Promise.resolve();
      throw new Error('IMAP failed');
    };

    const executable = composeGenStack([outer, execute] as GenMiddlewareStack<string, string>);

    await expect(executable('job')).rejects.toThrow('IMAP failed');
  });

  it('resolves with the same value apply receives', async () => {
    const outer: GenMiddleware<number, number, number, number> = async (details, next, resolve) => {
      next(details + 1, (response) => resolve(response * 10));
    };
    const inner: GenMiddleware<number, never, never, number> = async (details, _next, resolve) => {
      resolve(details + 1);
    };

    const applied: number[] = [];
    const executable = composeGenStack([outer, inner] as GenMiddlewareStack<number, number>);

    const result = await executable(1, (value) => applied.push(value));
    expect(result).toBe(30);
    expect(applied).toStrictEqual([30]);
  });
});
