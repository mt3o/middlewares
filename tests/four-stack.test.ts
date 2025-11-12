import { describe, it, expect } from 'vitest';
import type {GenMiddleware, GenMiddlewareStack, NextGen} from "../src/types";
import {composeGenStack} from "../src/registry";

/**
 * Four-stack middleware test suite
 * Tests a complete pipeline with 4 middleware layers:
 * 1. RequestLogger - logs incoming requests
 * 2. RequestValidator - validates and transforms request
 * 3. DataProcessor - processes data with business logic
 * 4. DataFetcher - fetches final data (terminal middleware)
 */


// Type definitions for the 4-stack pipeline
type InitialRequest = {
  userId: string;
  action: string;
};

type LoggerOutput = {
  userId: string;
  action: string;
  timestamp: number;
};

type ValidatorOutput = {
  userId: string;
  action: string;
  timestamp: number;
  validated: boolean;
};

type ProcessorOutput = {
  userId: string;
  action: string;
  timestamp: number;
  validated: boolean;
  processed: boolean;
  multiplier: number;
};

type FetcherOutput = {
  userId: string;
  action: string;
  timestamp: number;
  validated: boolean;
  processed: boolean;
  multiplier: number;
  result: number;
};



describe('Four-Stack GenMiddleware', () => {
  it('should execute a 4-layer middleware stack in correct order', async () => {
    const executionOrder: string[] = [];

    // Layer 1: RequestLogger - adds timestamp and logs request
    const requestLogger: GenMiddleware<
      InitialRequest,
      LoggerOutput,
      ValidatorOutput,
      LoggerOutput
    > = async (
        details:InitialRequest,
        next: NextGen<LoggerOutput, ValidatorOutput>,
        resolve: (arg:LoggerOutput)=>void
    ) => {
      executionOrder.push('logger-start');
      const withTimestamp: LoggerOutput = {
        ...details,
        timestamp: Date.now(),
      };

      next(withTimestamp, (_response) => {
        executionOrder.push('logger-resolve');
        resolve(withTimestamp);
      });
    };

    // Layer 2: RequestValidator - validates the request
    const requestValidator: GenMiddleware<
      LoggerOutput,
      ValidatorOutput,
      ProcessorOutput,
      ValidatorOutput
    > = async (details, next, resolve) => {
      executionOrder.push('validator-start');
      const validated: ValidatorOutput = {
        ...details,
        validated: details.userId.length > 0 && details.action.length > 0,
      };

      next(validated, (_response) => {
        executionOrder.push('validator-resolve');
        resolve(validated);
      });
    };

    // Layer 3: DataProcessor - processes data with business logic
    const dataProcessor: GenMiddleware<
      ValidatorOutput,
      ProcessorOutput,
      FetcherOutput,
      ProcessorOutput
    > = async (details, next, resolve) => {
      executionOrder.push('processor-start');
      const processed: ProcessorOutput = {
        ...details,
        processed: details.validated,
        multiplier: 2,
      };

      next(processed, (_response) => {
        executionOrder.push('processor-resolve');
        resolve(processed);
      });
    };

    // Layer 4: DataFetcher - terminal middleware that fetches final data
    const dataFetcher: GenMiddleware<
      ProcessorOutput,
      never,
      never,
      FetcherOutput
    > = async (
        details: ProcessorOutput,
        _next: NextGen<never,never>,
        resolve: (arg: FetcherOutput)=> void
    ) => {
      executionOrder.push('fetcher-start');
      const result: FetcherOutput = {
        ...details,
        result: 42 * details.multiplier,
      };
      executionOrder.push('fetcher-resolve');
      resolve(result);
    };

    // Build the stack
    const stack: GenMiddlewareStack<InitialRequest, LoggerOutput> = [
      requestLogger,
      requestValidator,
      dataProcessor,
      dataFetcher,
    ];

    const executable = composeGenStack(stack);

    // Execute and capture result
    const result = await new Promise<LoggerOutput>((resolve) => {
      executable({ userId: 'user123', action: 'fetch' }, (output) => {
        resolve(output);
      });
    });

    // Verify execution order
    expect(executionOrder).toEqual([
      'logger-start',
      'validator-start',
      'processor-start',
      'fetcher-start',
      'fetcher-resolve',
      'processor-resolve',
      'validator-resolve',
      'logger-resolve',
    ]);

    // Verify final result contains expected properties
    expect(result.userId).toBe('user123');
    expect(result.action).toBe('fetch');
    expect(result.timestamp).toBeDefined();
  });

  it('should handle data transformation through all 4 layers', async () => {
    const transformations: string[] = [];

    const layer1: GenMiddleware<
      { value: number },
      { value: number },
      { value: number },
      { value: number }
    > = async (details, next, resolve) => {
      transformations.push(`layer1-in:${details.value}`);
      const transformed = { value: details.value + 1 };
      next(transformed, (_response) => {
        transformations.push(`layer1-out:${transformed.value}`);
        resolve(transformed);
      });
    };

    const layer2: GenMiddleware<
      { value: number },
      { value: number },
      { value: number },
      { value: number }
    > = async (details, next, resolve) => {
      transformations.push(`layer2-in:${details.value}`);
      const transformed = { value: details.value * 2 };
      next(transformed, (_response) => {
        transformations.push(`layer2-out:${transformed.value}`);
        resolve(transformed);
      });
    };

    const layer3: GenMiddleware<
      { value: number },
      { value: number },
      { value: number },
      { value: number }
    > = async (details, next, resolve) => {
      transformations.push(`layer3-in:${details.value}`);
      const transformed = { value: details.value + 10 };
      next(transformed, (_response) => {
        transformations.push(`layer3-out:${transformed.value}`);
        resolve(transformed);
      });
    };

    const layer4: GenMiddleware<
      { value: number },
      never,
      never,
      { value: number }
    > = async (details, _next, resolve) => {
      transformations.push(`layer4-in:${details.value}`);
      const transformed = { value: details.value * 3 };
      transformations.push(`layer4-out:${transformed.value}`);
      resolve(transformed);
    };

    const stack: GenMiddlewareStack<{ value: number }, { value: number }> = [
      layer1,
      layer2,
      layer3,
      layer4,
    ];

    const executable = composeGenStack(stack);

    const result = await new Promise<{ value: number }>((done) => {
      executable({ value: 5 }, (output) => {
        done(output);
      });
    });

    // Verify transformations occur through the stack
    expect(result.value).toBeDefined();
    expect(transformations).toContain('layer1-in:5');
    expect(transformations.length).toBeGreaterThan(0);
  });

  it('should handle async operations across 4 layers', async () => {
    const asyncLog: string[] = [];

    const asyncLayer1: GenMiddleware<
      { id: string },
      { id: string },
      { id: string },
      { id: string }
    > = async (details, next, resolve) => {
      asyncLog.push('layer1-start');
      await new Promise((r) => setTimeout(r, 10));
      asyncLog.push('layer1-continue');
      next(details, (_response) => {
        asyncLog.push('layer1-resolve');
        resolve(details);
      });
    };

    const asyncLayer2: GenMiddleware<
      { id: string },
      { id: string },
      { id: string },
      { id: string }
    > = async (details, next, resolve) => {
      asyncLog.push('layer2-start');
      await new Promise((r) => setTimeout(r, 10));
      asyncLog.push('layer2-continue');
      next(details, (_response) => {
        asyncLog.push('layer2-resolve');
        resolve(details);
      });
    };

    const asyncLayer3: GenMiddleware<
      { id: string },
      { id: string },
      { id: string },
      { id: string }
    > = async (details, next, resolve) => {
      asyncLog.push('layer3-start');
      await new Promise((r) => setTimeout(r, 10));
      asyncLog.push('layer3-continue');
      next(details, (_response) => {
        asyncLog.push('layer3-resolve');
        resolve(details);
      });
    };

    const asyncLayer4: GenMiddleware<
      { id: string },
      never,
      never,
      { id: string }
    > = async (details, _next, resolve) => {
      asyncLog.push('layer4-start');
      await new Promise((r) => setTimeout(r, 10));
      asyncLog.push('layer4-resolve');
      resolve(details);
    };

    const stack: GenMiddlewareStack<{ id: string }, { id: string }> = [
      asyncLayer1,
      asyncLayer2,
      asyncLayer3,
      asyncLayer4,
    ];

    const executable = composeGenStack(stack);

    const result = await new Promise<{ id: string }>((done) => {
      executable({ id: 'test-123' }, (output) => {
        done(output);
      });
    });

    expect(result.id).toBe('test-123');
    expect(asyncLog.length).toBeGreaterThan(0);
    expect(asyncLog[0]).toBe('layer1-start');
  });

  it('should handle conditional logic across 4 layers', async () => {
    const conditions: boolean[] = [];

    const conditionalLayer1: GenMiddleware<
      { value: number },
      { value: number },
      { value: number },
      { value: number }
    > = async (details, next, resolve) => {
      const isValid = details.value > 0;
      conditions.push(isValid);
      next(details, (_response) => {
        resolve(details);
      });
    };

    const conditionalLayer2: GenMiddleware<
      { value: number },
      { value: number },
      { value: number },
      { value: number }
    > = async (details, next, resolve) => {
      const isEven = details.value % 2 === 0;
      conditions.push(isEven);
      next(details, (_response) => {
        resolve(details);
      });
    };

    const conditionalLayer3: GenMiddleware<
      { value: number },
      { value: number },
      { value: number },
      { value: number }
    > = async (details, next, resolve) => {
      const isLarge = details.value > 100;
      conditions.push(isLarge);
      next(details, (_response) => {
        resolve(details);
      });
    };

    const conditionalLayer4: GenMiddleware<
      { value: number },
      never,
      never,
      { value: number; allConditionsMet: boolean }
    > = async (details, _next, resolve) => {
      const allMet = conditions.every((c) => c);
      resolve({ value: details.value, allConditionsMet: allMet });
    };

    const stack: GenMiddlewareStack = [
        conditionalLayer1,
        conditionalLayer2,
        conditionalLayer3,
        conditionalLayer4
    ];

    const executable = composeGenStack(stack);

    const result = await new Promise<{ value: number; allConditionsMet: boolean }>(
      (done) => {
        executable({ value: 200 }, (output) => {
          done(output);
        });
      }
    );

    expect(result.value).toBe(200);
    expect(conditions.length).toBeGreaterThan(0);
  });

  it('should handle error scenarios in 4-layer stack', async () => {
    const errorLog: string[] = [];

    const errorLayer1: GenMiddleware<
      { data: string },
      { data: string },
      { data: string },
      { data: string }
    > = async (details, next, resolve) => {
      errorLog.push('layer1');
      next(details, (_response) => {
        resolve(details);
      });
    };

    const errorLayer2: GenMiddleware<
      { data: string },
      { data: string },
      { data: string },
      { data: string }
    > = async (details, next, resolve) => {
      errorLog.push('layer2');
      if (details.data === 'invalid') {
        errorLog.push('layer2-error-detected');
        resolve(details);
        return;
      }
      next(details, (_response) => {
        resolve(details);
      });
    };

    const errorLayer3: GenMiddleware<
      { data: string },
      { data: string },
      { data: string },
      { data: string }
    > = async (details, next, resolve) => {
      errorLog.push('layer3');
      next(details, (_response) => {
        resolve(details);
      });
    };

    const errorLayer4: GenMiddleware<
      { data: string },
      never,
      never,
      { data: string; processed: boolean }
    > = async (details, _next, resolve) => {
      errorLog.push('layer4');
      resolve({ data: details.data, processed: true });
    };

    const stack: GenMiddlewareStack<
      { data: string },
      { data: string; processed?: boolean }
    > = [errorLayer1, errorLayer2, errorLayer3, errorLayer4];

    const executable = composeGenStack(stack);

    const result = await new Promise<{
      data: string;
      processed?: boolean;
    }>((done) => {
      executable({ data: 'invalid' }, (output) => {
        done(output);
      });
    });

    expect(result.data).toBe('invalid');
    expect(errorLog).toStrictEqual([
        'layer1',
        'layer2',
        'layer2-error-detected'
    ]);
  });
});
