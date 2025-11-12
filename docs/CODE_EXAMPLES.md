# Code Examples and Patterns

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [Real-World Scenarios](#real-world-scenarios)
3. [Advanced Patterns](#advanced-patterns)
4. [Error Handling](#error-handling)
5. [Testing](#testing)

## Basic Examples

### Example 1: Simple Transformation

Transform a string to uppercase:

```typescript UppercaseMiddleware:@import.meta.vitest
const { expect } = await import('vitest');

const { Middleware, composeStack } = await import('middleware-pipe');
const { z } = await import('zod');

// Define types
const InputSchema = z.object({ text: z.string() });
type Input = z.infer<typeof InputSchema>;

const OutputSchema = z.object({ result: z.string() });
type Output = z.infer<typeof OutputSchema>;

// Create middleware
const UppercaseMiddleware: Middleware<Input, never, never, Output> = 
  async (input) => {
    return { result: input.text.toUpperCase() };
  };

UppercaseMiddleware.MyArgType = InputSchema;
UppercaseMiddleware.MyReturnType = OutputSchema;

// Execute
const stack = [UppercaseMiddleware];
const executable = composeStack(stack);
const result = await executable({ text: 'hello' });

expect(result).toStrictEqual({ result: 'HELLO' }); 
```

### Example 2: Two-Middleware Stack

Chain two transformations:

```typescript TwoMiddlewaersStack:@import.meta.vitest
const { expect } = await import('vitest');

const { Middleware, composeStack } = await import('middleware-pipe');
const { z } = await import ('zod');

// Types
const RequestSchema = z.object({ text: z.string() });
type Request = z.infer<typeof RequestSchema>;

const MiddleSchema = z.object({ upper: z.string() });
type Middle = z.infer<typeof MiddleSchema>;

const ResponseSchema = z.object({ reversed: z.string() });
type Response = z.infer<typeof ResponseSchema>;

// Middleware 1: Convert to uppercase
const UppercaseMiddleware: Middleware<Request, Middle, Response, Response> = 
  async (input, next) => {
    const middle: Middle = { upper: input.text.toUpperCase() };
    return next(middle);
  };

UppercaseMiddleware.MyArgType = RequestSchema;
UppercaseMiddleware.NextMiddlewareArg = MiddleSchema;
UppercaseMiddleware.MyReturnType = ResponseSchema;

// Middleware 2: Reverse the string
const ReverseMiddleware: Middleware<Middle, never, never, Response> = 
  async (input) => {
    return { reversed: input.upper.split('').reverse().join('') };
  };

ReverseMiddleware.MyArgType = MiddleSchema;
ReverseMiddleware.MyReturnType = ResponseSchema;

// Execute
const stack = [UppercaseMiddleware, ReverseMiddleware];
const executable = composeStack(stack);
const result = await executable({ text: 'hello' });

expect(result).toStrictEqual({ reversed: 'OLLEH' }); 
```

### Example 3: Middleware with Side Effects

Logging middleware:

```typescript TwoMiddlewaersStack:@import.meta.vitest
const { expect } = await import('vitest');

const { Middleware, composeStack } = await import('middleware-pipe');
const { z } = await import ('zod');

const DataSchema = z.object({ value: z.number() });
type Data = z.infer<typeof DataSchema>;

const LoggingMiddleware: Middleware<Data, Data, Data, Data> = 
  async (input, next) => {
    //console.log('📥 Input:', input);
    const startTime = Date.now();
    
    const response = await next(input);
    
    const duration = Date.now() - startTime;
    //console.log('📤 Output:', response);
    //console.log('⏱️  Duration:', duration, 'ms');
    
    return {duration, input, response};
  };

LoggingMiddleware.MyArgType = DataSchema;
LoggingMiddleware.NextMiddlewareArg = DataSchema;
LoggingMiddleware.NextMiddlewareReturnType = DataSchema;
LoggingMiddleware.MyReturnType = DataSchema;

const ProcessMiddleware: Middleware<Data, never, never, Data> = 
  async (input) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { value: input.value * 2 };
  };

ProcessMiddleware.MyArgType = DataSchema;
ProcessMiddleware.MyReturnType = DataSchema;

const stack = [LoggingMiddleware, ProcessMiddleware];
const executable = composeStack(stack);
 
expect(await executable({ value: 5 })).toStrictEqual({
  duration: expect.any(Number),
  input: { value: 5 },
  response: { value: 10 },
});
```

## Real-World Scenarios

### Scenario 1: API Request Processing Pipeline

Process an API request through multiple layers:

```typescript RealExample:@import.meta.vitest
const { expect } = await import('vitest');

const { Middleware, composeStack, validateStack } = await import('middleware-pipe');
const { z } = await import ('zod');


// ============================================
// Type Definitions
// ============================================

const HttpRequestSchema = z.object({
  method: z.string(),
  path: z.string(),
  body: z.unknown(),
});
type HttpRequest = z.infer<typeof HttpRequestSchema>;

const DomainRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});
type DomainRequest = z.infer<typeof DomainRequestSchema>;

const DomainResponseSchema = z.object({
  userId: z.string(),
  success: z.boolean(),
});
type DomainResponse = z.infer<typeof DomainResponseSchema>;

const HttpResponseSchema = z.object({
  status: z.number(),
  body: z.unknown(),
});
type HttpResponse = z.infer<typeof HttpResponseSchema>;

// ============================================
// Middleware
// ============================================

// Layer 1: Parse HTTP request
const ParseHttpMiddleware: Middleware<HttpRequest, DomainRequest, DomainResponse, HttpResponse> = 
  async (input, next) => {
    const domainRequest: DomainRequest = {
      email: input.body.email,
      name: input.body.name,
    };
    const domainResponse = await next(domainRequest);
    return {
      status: domainResponse.success ? 201 : 400,
      body: domainResponse,
    };
  };

ParseHttpMiddleware.MyArgType = HttpRequestSchema;
ParseHttpMiddleware.NextMiddlewareArg = DomainRequestSchema;
ParseHttpMiddleware.NextMiddlewareReturnType = DomainResponseSchema;
ParseHttpMiddleware.MyReturnType = HttpResponseSchema;

// Layer 2: Validate request
const ValidateMiddleware: Middleware<DomainRequest, DomainRequest, DomainResponse, DomainResponse> = 
  async (input, next) => {
    if (!input.email.includes('@')) {
      throw new Error('Invalid email');
    }
    if (input.name.length === 0) {
      throw new Error('Name cannot be empty');
    }
    return next(input);
  };

ValidateMiddleware.MyArgType = DomainRequestSchema;
ValidateMiddleware.NextMiddlewareArg = DomainRequestSchema;
ValidateMiddleware.NextMiddlewareReturnType = DomainResponseSchema;
ValidateMiddleware.MyReturnType = DomainResponseSchema;

// Layer 3: Business logic
const RegisterUserMiddleware: Middleware<DomainRequest, never, never, DomainResponse> = 
  async (input) => {
    // Simulate database save
    const userId = Math.random().toString(36).substr(2, 9);
    return {
      userId,
      success: true,
    };
  };

RegisterUserMiddleware.MyArgType = DomainRequestSchema;
RegisterUserMiddleware.MyReturnType = DomainResponseSchema;

// ============================================
// Compose and Execute
// ============================================

const stack = [ParseHttpMiddleware, ValidateMiddleware, RegisterUserMiddleware];

// Validate stack before execution
const errors = validateStack(stack);

expect(errors).toHaveLength(0);

if (errors.length > 0) {
  console.error('Stack validation failed:', errors);
  process.exit(1);
}

const executable = composeStack(stack);

// Execute
const result = await executable({
  method: 'POST',
  path: '/api/register',
  body: { email: 'user@example.com', name: 'John Doe' },
});

expect(result).toStrictEqual({
  status: 201,
  body: {
    userId: expect.any(String),
    success: true,
  },
});
```

### Scenario 2: Data Transformation Pipeline

Transform data through multiple stages:

```typescript RealExample2:@import.meta.vitest
const { expect } = await import('vitest');

const { Middleware, composeStack } = await import('middleware-pipe');
const { z } = await import ('zod');


// ============================================
// Type Definitions
// ============================================

const RawDataSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  birthDate: z.string(), // ISO string
});
type RawData = z.infer<typeof RawDataSchema>;

const NormalizedDataSchema = z.object({
  fullName: z.string(),
  age: z.number(),
});
type NormalizedData = z.infer<typeof NormalizedDataSchema>;

const EnrichedDataSchema = z.object({
  fullName: z.string(),
  age: z.number(),
  ageGroup: z.enum(['child', 'adult', 'senior']),
  isAdult: z.boolean(),
});
type EnrichedData = z.infer<typeof EnrichedDataSchema>;

// ============================================
// Middleware
// ============================================

// Stage 1: Normalize data
const NormalizeMiddleware: Middleware<RawData, NormalizedData, EnrichedData, EnrichedData> = 
  async (input, next) => {
    const birthDate = new Date(input.birthDate);
    const today = new Date('2024');
    const age = today.getFullYear() - birthDate.getFullYear();
    
    const normalized: NormalizedData = {
      fullName: `${input.firstName} ${input.lastName}`,
      age,
    };
    
    return next(normalized);
  };

NormalizeMiddleware.MyArgType = RawDataSchema;
NormalizeMiddleware.NextMiddlewareArg = NormalizedDataSchema;
NormalizeMiddleware.NextMiddlewareReturnType = EnrichedDataSchema;
NormalizeMiddleware.MyReturnType = EnrichedDataSchema;

// Stage 2: Enrich data
const EnrichMiddleware: Middleware<NormalizedData, never, never, EnrichedData> = 
  async (input) => {
    let ageGroup: 'child' | 'adult' | 'senior';
    if (input.age < 18) ageGroup = 'child';
    else if (input.age < 65) ageGroup = 'adult';
    else ageGroup = 'senior';
    
    return {
      ...input,
      ageGroup,
      isAdult: input.age >= 18,
    };
  };

EnrichMiddleware.MyArgType = NormalizedDataSchema;
EnrichMiddleware.MyReturnType = EnrichedDataSchema;

// ============================================
// Execute
// ============================================

const stack = [NormalizeMiddleware, EnrichMiddleware];
const executable = composeStack(stack);

const result = await executable({
  firstName: 'John',
  lastName: 'Doe',
  birthDate: '1990-05-15',
});

expect(result).toStrictEqual({
  fullName: 'John Doe',
  age: 34,
  ageGroup: 'adult',
  isAdult: true,
});
```

## Advanced Patterns

### Pattern 1: Middleware Factory

Create reusable middleware with configuration:

```typescript
import { Middleware } from 'middleware-pipe';
import { z } from 'zod';

// Factory function
const createValidationMiddleware = <T,>(schema: z.ZodSchema<T>) => {
  const middleware: Middleware<unknown, T, any, any> = 
    async (input, next) => {
      const validated = schema.parse(input);
      return next(validated);
    };
  
  middleware.MyArgType = z.unknown();
  middleware.NextMiddlewareArg = schema;
  
  return middleware;
};
const registry = {};
// Usage
const UserSchema = z.object({ email: z.string().email() });
registry['ValidateUserMiddleware'] = createValidationMiddleware(UserSchema);
```

### Pattern 2: Conditional Middleware

Apply middleware conditionally:

```typescript
import { Middleware, composeStack } from 'middleware-pipe';
import { z } from 'zod';

const DataSchema = z.object({ value: z.number() });
type Data = z.infer<typeof DataSchema>;

const ConditionalMiddleware: Middleware<Data, Data, Data, Data> = 
  async (input, next) => {
    if (input.value < 0) {
      // Skip processing for negative values
      return input;
    }
    return next(input);
  };

ConditionalMiddleware.MyArgType = DataSchema;
ConditionalMiddleware.NextMiddlewareArg = DataSchema;
ConditionalMiddleware.NextMiddlewareReturnType = DataSchema;
ConditionalMiddleware.MyReturnType = DataSchema;

const ConditionalMiddleware2: Middleware<Data, Data, Data, Data> = 
  async (input, next) => {
    return next(input);
  };


// Usage
const stack = [ConditionalMiddleware, ProcessMiddleware];

//Or even apply conditionally to the stack
if(Math.random()>0.5){
  stack.push(ConditionalMiddleware2);
}
```

### Pattern 3: Caching Middleware

Cache results to avoid reprocessing:

```typescript
import { Middleware } from 'middleware-pipe';
import { z } from 'zod';

const RequestSchema = z.object({ id: z.string() });
type Request = z.infer<typeof RequestSchema>;

const ResponseSchema = z.object({ data: z.unknown() });
type Response = z.infer<typeof ResponseSchema>;

const cache = new Map<string, Response>();

const CachingMiddleware: Middleware<Request, Request, Response, Response> = 
  async (input, next) => {
    const cacheKey = JSON.stringify(input);
    
    if (cache.has(cacheKey)) {
      console.log('Cache hit:', cacheKey);
      return cache.get(cacheKey)!;
    }
    
    console.log('Cache miss:', cacheKey);
    const response = await next(input);
    cache.set(cacheKey, response);
    
    return response;
  };

CachingMiddleware.MyArgType = RequestSchema;
CachingMiddleware.NextMiddlewareArg = RequestSchema;
CachingMiddleware.NextMiddlewareReturnType = ResponseSchema;
CachingMiddleware.MyReturnType = ResponseSchema;
```

## Error Handling

### Pattern 1: Try-Catch Error Handling

```typescript TryCatch Error Handling:@import.meta.vitest
const { expect } = await import('vitest');

const { Middleware, composeStack, validateStack } = await import('middleware-pipe');
const { z } = await import ('zod');

const InputSchema = z.object({ value: z.number() });
type Input = z.infer<typeof InputSchema>;

const OutputSchema = z.object({ result: z.number() });
type Output = z.infer<typeof OutputSchema>;

const ErrorSchema = z.object({ error: z.string() });
type ErrorOutput = z.infer<typeof ErrorSchema>;

const SafeMiddleware: Middleware<Input, never, never, Output | ErrorOutput> = 
  async (input) => {
    try {
      if (input.value === 0) {
        throw new Error('Cannot process zero');
      }
      return { result: 100 / input.value };
    } catch (error) {
      return { error: (error as Error).message };
    }
  };

SafeMiddleware.MyArgType = InputSchema;
SafeMiddleware.MyReturnType = z.union([OutputSchema, ErrorSchema]);

const stack = [SafeMiddleware];
const executable = composeStack(stack);

expect(await executable({ value: 5 })).toStrictEqual({ result: 20 });
expect(await executable({ value: 0 })).toStrictEqual({error: 'Cannot process zero'});
```

### Pattern 2: Error Transformation Middleware

```typescript
import { Middleware } from 'middleware-pipe';
import { z } from 'zod';

const DataSchema = z.object({ value: z.number() });
type Data = z.infer<typeof DataSchema>;

const ErrorResponseSchema = z.object({
  status: z.literal('error'),
  message: z.string(),
});
type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

const SuccessResponseSchema = z.object({
  status: z.literal('success'),
  data: DataSchema,
});
type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

const ErrorHandlingMiddleware: Middleware<
  Data,
  Data,
  SuccessResponse,
  SuccessResponse | ErrorResponse
> = async (input, next) => {
  try {
    return await next(input);
  } catch (error) {
    return {
      status: 'error' as const,
      message: (error as Error).message,
    };
  }
};

ErrorHandlingMiddleware.MyArgType = DataSchema;
ErrorHandlingMiddleware.NextMiddlewareArg = DataSchema;
ErrorHandlingMiddleware.NextMiddlewareReturnType = SuccessResponseSchema;
ErrorHandlingMiddleware.MyReturnType = z.union([SuccessResponseSchema, ErrorResponseSchema]);
```

## Testing

### Example: Unit Testing Middleware

```typescript UnitTesting:@import.meta.vitest
//Note: This example acts as valid test thanks to the doctest plugin, 
// but it has some limitations: we can't use describe/it blocks directly, so we use IIFE instead
// and we use async imports to be compatible with Vitest ESM environment in doctests
const { expect, describe, it, vi } = await import('vitest');

const { Middleware, composeStack, validateStack } = await import('middleware-pipe');
const { z } = await import ('zod');


//describe('Middleware Testing', () => {
//  it('should transform input correctly', async () => {
(async ()=>{ //IFEE instead of it block
        
    const InputSchema = z.object({ text: z.string() });
    type Input = z.infer<typeof InputSchema>;

    const OutputSchema = z.object({ result: z.string() });
    type Output = z.infer<typeof OutputSchema>;

    const middleware: Middleware<Input, never, never, Output> = 
      async (input) => {
        return { result: input.text.toUpperCase() };
      };

    middleware.MyArgType = InputSchema;
    middleware.MyReturnType = OutputSchema;

    const result = await middleware(
      { text: 'hello' },
      async () => ({ result: '' })
    );

    expect(result.result).toBe('HELLO');
  // }); //end it
})();// end IIFE

//it('should call next middleware', async () => {
(async ()=>{ //IFEE instead of it block
    const DataSchema = z.object({ value: z.number() });
    type Data = z.infer<typeof DataSchema>;

    const nextFn = vi.fn().mockResolvedValue({ value: 20 });

    const middleware: Middleware<Data, Data, Data, Data> = 
      async (input, next) => {
        return next(input);
      };

    middleware.MyArgType = DataSchema;
    middleware.NextMiddlewareArg = DataSchema;
    middleware.NextMiddlewareReturnType = DataSchema;
    middleware.MyReturnType = DataSchema;

    await middleware({ value: 10 }, nextFn);

    expect(nextFn).toHaveBeenCalledWith({ value: 10 });
  // }); //end it
  })(); //end IIFE

//it('should handle errors', async () => {
(async ()=>{  //IFEE instead of it block
    const InputSchema = z.object({ value: z.number() });
    type Input = z.infer<typeof InputSchema>;

    const OutputSchema = z.object({ result: z.number() });
    type Output = z.infer<typeof OutputSchema>;

    const middleware: Middleware<Input, never, never, Output> = 
      async (input) => {
        if (input.value < 0) {
          throw new Error('Value must be positive');
        }
        return { result: input.value * 2 };
      };

    middleware.MyArgType = InputSchema;
    middleware.MyReturnType = OutputSchema;

    await expect(
      middleware({ value: -5 }, async () => ({ result: 0 }))
    ).rejects.toThrow('Value must be positive');
  // }); //end it
  })(); //end IIFE


```

## Summary

These examples demonstrate:

1. **Basic transformations** - Simple middleware chains
2. **Real-world scenarios** - API processing and data transformation
3. **Advanced patterns** - Factories, caching, conditional logic
4. **Error handling** - Safe error transformation
5. **Testing** - Unit testing middleware

Use these patterns as templates for your own middleware implementations.
