import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  getFromRegistry,
  composeStack,
  composeGenStack,
  getGenFromRegistry,
} from '../src/registry';
import type {
  Middleware,
  MiddlewareRegistry,
  GenMiddleware,
  GenMiddlewareRegistry,
} from '../src';

// ============================================
// Test Fixtures and Types
// ============================================

const RequestSchema = z.object({ value: z.number() });
type Request = z.infer<typeof RequestSchema>;

const ResponseSchema = z.object({ result: z.number() });
type Response = z.infer<typeof ResponseSchema>;

const MiddleSchema = z.object({ doubled: z.number() });
type Middle = z.infer<typeof MiddleSchema>;

// ============================================
// getFromRegistry Tests
// ============================================

describe('getFromRegistry', () => {
  it('should retrieve middleware from registry in order', async () => {
    const middleware1: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value * 2,
    });
    middleware1.MyArgType = RequestSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value * 3,
    });
    middleware2.MyArgType = RequestSchema;
    middleware2.MyReturnType = ResponseSchema;

    const registry: MiddlewareRegistry = {
      'double': async () => middleware1,
      'triple': async () => middleware2,
    };

    const stack = await getFromRegistry(['double', 'triple'], registry);

    expect(stack).toHaveLength(2);
    expect(typeof stack[0]).toBe('function');
    expect(typeof stack[1]).toBe('function');
  });

  it('should handle single middleware in registry', async () => {
    const middleware: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value,
    });
    middleware.MyArgType = RequestSchema;
    middleware.MyReturnType = ResponseSchema;

    const registry: MiddlewareRegistry = {
      'single': async () => middleware,
    };

    const stack = await getFromRegistry(['single'], registry);

    expect(stack).toHaveLength(1);
    expect(typeof stack[0]).toBe('function');
  });

  it('should throw error when middleware is missing from registry', async () => {
    const middleware: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value,
    });
    middleware.MyArgType = RequestSchema;
    middleware.MyReturnType = ResponseSchema;

    const registry: MiddlewareRegistry = {
      'existing': async () => middleware,
    };

    await expect(
      getFromRegistry(['existing', 'missing'], registry)
    ).rejects.toThrow('Missing middlewares in registry: missing');
  });

  it('should throw error when multiple middlewares are missing', async () => {
    const middleware: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value,
    });
    middleware.MyArgType = RequestSchema;
    middleware.MyReturnType = ResponseSchema;

    const registry: MiddlewareRegistry = {
      'existing': async () => middleware,
    };

    await expect(
      getFromRegistry(['existing', 'missing1', 'missing2'], registry)
    ).rejects.toThrow('Missing middlewares in registry: missing1, missing2');
  });

  it('should handle dynamic imports from registry', async () => {
    const middleware: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value * 2,
    });
    middleware.MyArgType = RequestSchema;
    middleware.MyReturnType = ResponseSchema;

    const registry: MiddlewareRegistry = {
      'dynamic': async () => {
        // Simulate dynamic import
        return middleware;
      },
    };

    const stack = await getFromRegistry(['dynamic'], registry);

    expect(stack).toHaveLength(1);
    expect(typeof stack[0]).toBe('function');
  });

  it('should preserve order of middleware from registry', async () => {
    const middleware1: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value * 1,
    });
    middleware1.MyArgType = RequestSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value * 2,
    });
    middleware2.MyArgType = RequestSchema;
    middleware2.MyReturnType = ResponseSchema;

    const middleware3: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value * 3,
    });
    middleware3.MyArgType = RequestSchema;
    middleware3.MyReturnType = ResponseSchema;

    const registry: MiddlewareRegistry = {
      'first': async () => middleware1,
      'second': async () => middleware2,
      'third': async () => middleware3,
    };

    const stack = await getFromRegistry(['third', 'first', 'second'], registry);

    expect(stack).toHaveLength(3);
    expect(typeof stack[0]).toBe('function');
    expect(typeof stack[1]).toBe('function');
    expect(typeof stack[2]).toBe('function');
  });

  it('should handle empty registry gracefully', async () => {
    const registry: MiddlewareRegistry = {};

    await expect(
      getFromRegistry(['any'], registry)
    ).rejects.toThrow('Missing middlewares in registry: any');
  });
});

// ============================================
// composeStack Tests
// ============================================

describe('composeStack', () => {
  it('should compose single middleware into executable', async () => {
    const middleware: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value * 2,
    });
    middleware.MyArgType = RequestSchema;
    middleware.MyReturnType = ResponseSchema;

    const stack = [middleware];
    const executable = composeStack(stack);

    const result = await executable({ value: 5 });

    expect(result.result).toBe(10);
  });

  it('should compose multiple middleware in correct order', async () => {
    const executionOrder: string[] = [];

    const middleware1: Middleware<Request, Request, Response, Response> = async (input, next) => {
      executionOrder.push('middleware1-start');
      const response = await next(input);
      executionOrder.push('middleware1-end');
      return response;
    };
    middleware1.MyArgType = RequestSchema;
    middleware1.NextMiddlewareArg = RequestSchema;
    middleware1.NextMiddlewareReturnType = ResponseSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: Middleware<Request, never, never, Response> = async (input) => {
      executionOrder.push('middleware2');
      return { result: input.value * 2 };
    };
    middleware2.MyArgType = RequestSchema;
    middleware2.MyReturnType = ResponseSchema;

    const stack = [middleware1, middleware2];
    const executable = composeStack(stack);

    await executable({ value: 5 });

    expect(executionOrder).toEqual(['middleware1-start', 'middleware2', 'middleware1-end']);
  });

  it('should pass data through middleware chain', async () => {
    const middleware1: Middleware<Request, Middle, Response, Response> = async (input, next) => {
      const middle: Middle = { doubled: input.value * 2 };
      return next(middle);
    };
    middleware1.MyArgType = RequestSchema;
    middleware1.NextMiddlewareArg = MiddleSchema;
    middleware1.NextMiddlewareReturnType = ResponseSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: Middleware<Middle, never, never, Response> = async (input) => ({
      result: input.doubled + 10,
    });
    middleware2.MyArgType = MiddleSchema;
    middleware2.MyReturnType = ResponseSchema;

    const stack = [middleware1, middleware2];
    const executable = composeStack(stack);

    const result = await executable({ value: 5 });

    expect(result.result).toBe(20); // (5 * 2) + 10
  });

  it('should handle middleware with side effects', async () => {
    const sideEffects: string[] = [];

    const middleware1: Middleware<Request, Request, Response, Response> = async (input, next) => {
      sideEffects.push('before-next');
      const response = await next(input);
      sideEffects.push('after-next');
      return response;
    };
    middleware1.MyArgType = RequestSchema;
    middleware1.NextMiddlewareArg = RequestSchema;
    middleware1.NextMiddlewareReturnType = ResponseSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: Middleware<Request, never, never, Response> = async (input) => {
      sideEffects.push('processing');
      return { result: input.value };
    };
    middleware2.MyArgType = RequestSchema;
    middleware2.MyReturnType = ResponseSchema;

    const stack = [middleware1, middleware2];
    const executable = composeStack(stack);

    await executable({ value: 5 });

    expect(sideEffects).toEqual(['before-next', 'processing', 'after-next']);
  });

  it('should handle errors thrown in middleware', async () => {
    const middleware1: Middleware<Request, Request, Response, Response> = async (input, next) => {
      try {
        return await next(input);
      } catch (error) {
        return { result: -1 };
      }
    };
    middleware1.MyArgType = RequestSchema;
    middleware1.NextMiddlewareArg = RequestSchema;
    middleware1.NextMiddlewareReturnType = ResponseSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: Middleware<Request, never, never, Response> = async (input) => {
      if (input.value < 0) {
        throw new Error('Value must be positive');
      }
      return { result: input.value };
    };
    middleware2.MyArgType = RequestSchema;
    middleware2.MyReturnType = ResponseSchema;

    const stack = [middleware1, middleware2];
    const executable = composeStack(stack);

    const result = await executable({ value: -5 });

    expect(result.result).toBe(-1);
  });

  it('should return executable function', async () => {
    const middleware: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value,
    });
    middleware.MyArgType = RequestSchema;
    middleware.MyReturnType = ResponseSchema;

    const stack = [middleware];
    const executable = composeStack(stack);

    expect(typeof executable).toBe('function');
    expect(executable).toBeInstanceOf(Function);
  });

  it('should handle three middleware stack', async () => {
    const middleware1: Middleware<Request, Middle, Response, Response> = async (input, next) => {
      const middle: Middle = { doubled: input.value * 2 };
      return next(middle);
    };
    middleware1.MyArgType = RequestSchema;
    middleware1.NextMiddlewareArg = MiddleSchema;
    middleware1.NextMiddlewareReturnType = ResponseSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: Middleware<Middle, Middle, Response, Response> = async (input, next) => {
      const middle: Middle = { doubled: input.doubled + 5 };
      return next(middle);
    };
    middleware2.MyArgType = MiddleSchema;
    middleware2.NextMiddlewareArg = MiddleSchema;
    middleware2.NextMiddlewareReturnType = ResponseSchema;
    middleware2.MyReturnType = ResponseSchema;

    const middleware3: Middleware<Middle, never, never, Response> = async (input) => ({
      result: input.doubled * 2,
    });
    middleware3.MyArgType = MiddleSchema;
    middleware3.MyReturnType = ResponseSchema;

    const stack = [middleware1, middleware2, middleware3];
    const executable = composeStack(stack);

    const result = await executable({ value: 10 });

    expect(result.result).toBe(50); // ((10 * 2) + 5) * 2
  });
});

// ============================================
// composeGenStack Tests
// ============================================

describe('composeGenStack', () => {
  it('should compose single generator middleware', async () => {
    const middleware: GenMiddleware<Request, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      resolve({ result: input.value * 2 });
    };
    middleware.MyArgType = RequestSchema;
    middleware.MyReturnType = ResponseSchema;

    const stack = [middleware];
    const executable = composeGenStack(stack);

    const result = await new Promise<Response>((resolve) => {
      executable({ value: 5 }, resolve);
    });

    expect(result.result).toBe(10);
  });

  it('should compose multiple generator middleware in order', async () => {
    const executionOrder: string[] = [];

    const middleware1: GenMiddleware<Request, Request, Response, Response> = async (
      input,
      next,
      resolve
    ) => {
      executionOrder.push('middleware1-start');
      next(input, (response) => {
        executionOrder.push('middleware1-end');
        resolve(response);
      });
    };
    middleware1.MyArgType = RequestSchema;
    middleware1.NextMiddlewareArg = RequestSchema;
    middleware1.NextMiddlewareReturnType = ResponseSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: GenMiddleware<Request, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      executionOrder.push('middleware2');
      resolve({ result: input.value * 2 });
    };
    middleware2.MyArgType = RequestSchema;
    middleware2.MyReturnType = ResponseSchema;

    const stack = [middleware1, middleware2];
    const executable = composeGenStack(stack);

    await new Promise<void>((resolve) => {
      executable({ value: 5 }, () => {
        resolve();
      });
    });

    expect(executionOrder).toEqual(['middleware1-start', 'middleware2', 'middleware1-end']);
  });

  it('should pass data through generator middleware chain', async () => {
    const middleware1: GenMiddleware<Request, Middle, Response, Response> = async (
      input,
      next,
      resolve
    ) => {
      const middle: Middle = { doubled: input.value * 2 };
      next(middle, (response) => {
        resolve(response);
      });
    };
    middleware1.MyArgType = RequestSchema;
    middleware1.NextMiddlewareArg = MiddleSchema;
    middleware1.NextMiddlewareReturnType = ResponseSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: GenMiddleware<Middle, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      resolve({ result: input.doubled + 10 });
    };
    middleware2.MyArgType = MiddleSchema;
    middleware2.MyReturnType = ResponseSchema;

    const stack = [middleware1, middleware2];
    const executable = composeGenStack(stack);

    const result = await new Promise<Response>((resolve) => {
      executable({ value: 5 }, resolve);
    });

    expect(result.result).toBe(20); // (5 * 2) + 10
  });

  it('should return executable function', () => {
    const middleware: GenMiddleware<Request, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      resolve({ result: input.value });
    };
    middleware.MyArgType = RequestSchema;
    middleware.MyReturnType = ResponseSchema;

    const stack = [middleware];
    const executable = composeGenStack(stack);

    expect(typeof executable).toBe('function');
    expect(executable).toBeInstanceOf(Function);
  });
});

// ============================================
// getGenFromRegistry Tests
// ============================================

describe('getGenFromRegistry', () => {
  it('should retrieve generator middleware from registry', async () => {
    const middleware: GenMiddleware<Request, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      resolve({ result: input.value * 2 });
    };
    middleware.MyArgType = RequestSchema;
    middleware.MyReturnType = ResponseSchema;

    const registry: GenMiddlewareRegistry = {
      'double': async () => middleware,
    };

    const stack = await getGenFromRegistry(['double'], registry);

    expect(stack).toHaveLength(1);
    expect(typeof stack[0]).toBe('function');
  });

  it('should retrieve multiple generator middleware in order', async () => {
    const middleware1: GenMiddleware<Request, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      resolve({ result: input.value * 2 });
    };
    middleware1.MyArgType = RequestSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: GenMiddleware<Request, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      resolve({ result: input.value * 3 });
    };
    middleware2.MyArgType = RequestSchema;
    middleware2.MyReturnType = ResponseSchema;

    const registry: GenMiddlewareRegistry = {
      'double': async () => middleware1,
      'triple': async () => middleware2,
    };

    const stack = await getGenFromRegistry(['double', 'triple'], registry);

    expect(stack).toHaveLength(2);
    expect(typeof stack[0]).toBe('function');
    expect(typeof stack[1]).toBe('function');
  });

  it('should throw error when generator middleware is missing', async () => {
    const middleware: GenMiddleware<Request, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      resolve({ result: input.value });
    };
    middleware.MyArgType = RequestSchema;
    middleware.MyReturnType = ResponseSchema;

    const registry: GenMiddlewareRegistry = {
      'existing': async () => middleware,
    };

    await expect(
      getGenFromRegistry(['existing', 'missing'], registry)
    ).rejects.toThrow('Missing middlewares in registry: missing');
  });

  it('should preserve order of generator middleware', async () => {
    const middleware1: GenMiddleware<Request, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      resolve({ result: input.value * 1 });
    };
    middleware1.MyArgType = RequestSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: GenMiddleware<Request, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      resolve({ result: input.value * 2 });
    };
    middleware2.MyArgType = RequestSchema;
    middleware2.MyReturnType = ResponseSchema;

    const middleware3: GenMiddleware<Request, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      resolve({ result: input.value * 3 });
    };
    middleware3.MyArgType = RequestSchema;
    middleware3.MyReturnType = ResponseSchema;

    const registry: GenMiddlewareRegistry = {
      'first': async () => middleware1,
      'second': async () => middleware2,
      'third': async () => middleware3,
    };

    const stack = await getGenFromRegistry(['third', 'first', 'second'], registry);

    expect(stack).toHaveLength(3);
    expect(typeof stack[0]).toBe('function');
    expect(typeof stack[1]).toBe('function');
    expect(typeof stack[2]).toBe('function');
  });
});

// ============================================
// Integration Tests
// ============================================

describe('Registry Integration', () => {
  it('should work with getFromRegistry and composeStack together', async () => {
    const middleware1: Middleware<Request, Request, Response, Response> = async (input, next) => {
      const response = await next(input);
      return { result: response.result * 2 };
    };
    middleware1.MyArgType = RequestSchema;
    middleware1.NextMiddlewareArg = RequestSchema;
    middleware1.NextMiddlewareReturnType = ResponseSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: Middleware<Request, never, never, Response> = async (input) => ({
      result: input.value,
    });
    middleware2.MyArgType = RequestSchema;
    middleware2.MyReturnType = ResponseSchema;

    const registry: MiddlewareRegistry = {
      'double': async () => middleware1,
      'identity': async () => middleware2,
    };

    const stack = await getFromRegistry(['double', 'identity'], registry);
    expect(stack).toHaveLength(2);
    const executable = composeStack(stack);
    expect(typeof executable).toBe('function');
  });

  it('should work with getGenFromRegistry and composeGenStack together', async () => {
    const middleware1: GenMiddleware<Request, Request, Response, Response> = async (
      input,
      next,
      resolve
    ) => {
      next(input, (response) => {
        resolve({ result: response.result * 2 });
      });
    };
    middleware1.MyArgType = RequestSchema;
    middleware1.NextMiddlewareArg = RequestSchema;
    middleware1.NextMiddlewareReturnType = ResponseSchema;
    middleware1.MyReturnType = ResponseSchema;

    const middleware2: GenMiddleware<Request, never, never, Response> = async (
      input,
      _next,
      resolve
    ) => {
      resolve({ result: input.value });
    };
    middleware2.MyArgType = RequestSchema;
    middleware2.MyReturnType = ResponseSchema;

    const registry: GenMiddlewareRegistry = {
      'double': async () => middleware1,
      'identity': async () => middleware2,
    };

    const stack = await getGenFromRegistry(['double', 'identity'], registry);
    expect(stack).toHaveLength(2);
    const executable = composeGenStack(stack);
    expect(typeof executable).toBe('function');
  });
});
