# Middleware Architecture: Concepts and Design Patterns

## Table of Contents

1. [What is Middleware?](#what-is-middleware)
2. [Why Layered Architecture?](#why-layered-architecture)
3. [Middleware Stacking Patterns](#middleware-stacking-patterns)
4. [Execution Flow](#execution-flow)
5. [Type Transformation Pipeline](#type-transformation-pipeline)
6. [Advanced Patterns](#advanced-patterns)

## What is Middleware?

### Definition

Middleware is a software component that sits between two layers of an application, intercepting and processing requests and responses. It acts as a bridge that can:

- **Transform** data from one format to another
- **Validate** data against schemas or business rules
- **Enhance** requests with additional information
- **Filter** or reject requests based on conditions
- **Handle** cross-cutting concerns (logging, authentication, etc.)

### Core Characteristics

```
Input → [Process] → Output
         ↓
      Side Effects
      (logging, validation, etc.)
```

Each middleware:
1. Receives input of a specific type
2. Optionally performs side effects
3. Calls the next middleware in the chain
4. Receives a response from the next middleware
5. Optionally transforms the response
6. Returns output of a specific type

### The Middleware Contract

```typescript
type Middleware<In, NextIn, NextOut, Out> = 
  (input: In, next: (arg: NextIn) => Promise<NextOut>) 
    => Promise<Out>
```

**Type Parameters:**
- `In`: Type of input this middleware receives
- `NextIn`: Type of input passed to the next middleware
- `NextOut`: Type of response from the next middleware
- `Out`: Type of output this middleware returns

## Why Layered Architecture?

### Problem: Monolithic Processing

Without middleware, you might write:

```typescript
async function processRequest(request: Request): Promise<Response> {
  // Logging
  console.log('Request:', request);
  
  // Validation
  if (!request.text) throw new Error('Invalid request');
  
  // Authentication
  if (!request.user) throw new Error('Unauthorized');
  
  // Business Logic
  const result = await businessLogic(request);
  
  // Transformation
  const transformed = transform(result);
  
  // Logging
  console.log('Response:', transformed);
  
  return transformed;
}
```

**Issues:**
- ❌ Tightly coupled concerns
- ❌ Hard to test individual steps
- ❌ Difficult to reuse components
- ❌ No type safety between steps
- ❌ Difficult to add/remove steps

### Solution: Layered Middleware Architecture

```typescript
const stack = [
  LoggingMiddleware,      // Layer 1: Log incoming request
  ValidationMiddleware,   // Layer 2: Validate input
  AuthMiddleware,         // Layer 3: Check authentication
  BusinessLogicMiddleware, // Layer 4: Core logic
  TransformMiddleware,    // Layer 5: Transform output
  LoggingMiddleware,      // Layer 6: Log outgoing response
];

const executable = composeStack(stack);
const result = await executable(request);
```

**Benefits:**
- ✅ Separation of concerns
- ✅ Each layer is independently testable
- ✅ Reusable components
- ✅ Type-safe transformations
- ✅ Easy to add/remove/reorder layers
- ✅ Clear data flow

### Layering Principles

#### 1. **Single Responsibility**
Each middleware should handle one concern:

```typescript
// ✅ Good: Single responsibility
const LoggingMiddleware = async (input, next) => {
  console.log('Request:', input);
  const response = await next(input);
  console.log('Response:', response);
  return response;
};

// ❌ Bad: Multiple responsibilities
const LoggingAndValidationMiddleware = async (input, next) => {
  console.log('Request:', input);
  if (!input.text) throw new Error('Invalid');
  const response = await next(input);
  console.log('Response:', response);
  return response;
};
```

#### 2. **Composition Over Inheritance**
Build complex behavior by composing simple middleware:

```typescript
// Instead of inheritance hierarchies, compose middleware
const stack = [
  AuthMiddleware,
  ValidationMiddleware,
  RateLimitMiddleware,
  BusinessLogicMiddleware,
];
```

#### 3. **Dependency Injection**
Middleware should receive dependencies, not create them:

```typescript
// ✅ Good: Dependencies injected
const createDatabaseMiddleware = (db: Database) => 
  async (input, next) => {
    const data = await db.query(input);
    return next(data);
  };

// ❌ Bad: Creates its own dependencies
const DatabaseMiddleware = async (input, next) => {
  const db = new Database(); // Tightly coupled
  const data = await db.query(input);
  return next(data);
};
```

## Middleware Stacking Patterns

### Pattern 1: Linear Stack (Most Common)

Each middleware processes sequentially:

```
Request
  ↓
[Middleware 1]
  ↓
[Middleware 2]
  ↓
[Middleware 3]
  ↓
Response
```

**Use Case:** Request validation → Authentication → Business Logic → Response transformation

```typescript
const stack: MiddlewareStack = [
  ValidationMiddleware,
  AuthMiddleware,
  BusinessLogicMiddleware,
  TransformMiddleware,
];
```

### Pattern 2: Conditional Branching

Middleware can conditionally skip or branch:

```typescript
const ConditionalMiddleware: Middleware<Request, Request, Response, Response> = 
  async (input, next) => {
    if (input.skipProcessing) {
      return { status: 'skipped' };
    }
    return next(input);
  };
```

### Pattern 3: Error Handling Layer

Middleware can catch and transform errors:

```typescript
const ErrorHandlingMiddleware: Middleware<Request, Request, Response, Response> = 
  async (input, next) => {
    try {
      return await next(input);
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  };
```

### Pattern 4: Caching Layer

Middleware can cache results:

```typescript
const CachingMiddleware: Middleware<Request, Request, Response, Response> = 
  async (input, next) => {
    const cacheKey = JSON.stringify(input);
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }
    const response = await next(input);
    cache.set(cacheKey, response);
    return response;
  };
```

### Pattern 5: Enrichment Layer

Middleware can add data to the request:

```typescript
const EnrichmentMiddleware: Middleware<Request, EnrichedRequest, Response, Response> = 
  async (input, next) => {
    const enriched: EnrichedRequest = {
      ...input,
      timestamp: Date.now(),
      userId: getCurrentUserId(),
      requestId: generateId(),
    };
    return next(enriched);
  };
```

## Execution Flow

### Request Phase (Going Down)

```
Request enters the stack
  ↓
Middleware 1 receives request
  ├─ Performs pre-processing
  ├─ Transforms request
  └─ Calls next()
    ↓
  Middleware 2 receives transformed request
    ├─ Performs pre-processing
    ├─ Transforms request
    └─ Calls next()
      ↓
    Middleware 3 receives transformed request
      ├─ Performs pre-processing
      ├─ Transforms request
      └─ Calls next()
        ↓
      Final middleware (no next call)
      Returns response
```

### Response Phase (Going Up)

```
Response from final middleware
  ↓
Middleware 3 receives response
  ├─ Performs post-processing
  ├─ Transforms response
  └─ Returns to Middleware 2
    ↓
  Middleware 2 receives response
    ├─ Performs post-processing
    ├─ Transforms response
    └─ Returns to Middleware 1
      ↓
    Middleware 1 receives response
      ├─ Performs post-processing
      ├─ Transforms response
      └─ Returns to caller
        ↓
      Final response to user
```

### Complete Example

```typescript
const middleware1 = async (input, next) => {
  console.log('1: Before next');
  const response = await next(input);
  console.log('1: After next');
  return response;
};

const middleware2 = async (input, next) => {
  console.log('2: Before next');
  const response = await next(input);
  console.log('2: After next');
  return response;
};

const middleware3 = async (input) => {
  console.log('3: Final middleware');
  return { result: 'done' };
};

// Output:
// 1: Before next
// 2: Before next
// 3: Final middleware
// 2: After next
// 1: After next
```

## Type Transformation Pipeline

### Single Middleware Type Transformation

```typescript
// Input type: { text: string }
// Next middleware expects: { query: string }
// Next middleware returns: { result: string }
// Output type: { processed: string }

const TransformMiddleware: Middleware<
  { text: string },           // MyArgType
  { query: string },          // NextMiddlewareArg
  { result: string },         // NextMiddlewareReturnType
  { processed: string }       // MyReturnType
> = async (input, next) => {
  // Transform input
  const transformed = { query: input.text };
  
  // Call next with transformed input
  const response = await next(transformed);
  
  // Transform response
  return { processed: response.result };
};
```

### Stack Type Transformation

```
Initial Request: { text: string }
  ↓
[Middleware 1] transforms to { query: string }
  ↓
[Middleware 2] transforms to { sql: string }
  ↓
[Middleware 3] transforms to { rows: any[] }
  ↓
Final Response: { rows: any[] }
```

Each middleware ensures type compatibility:

```typescript
const stack: MiddlewareStack<
  { text: string },      // Initial request type
  { rows: any[] }        // Final response type
> = [
  TextToQueryMiddleware,  // { text } → { query }
  QueryToSqlMiddleware,   // { query } → { sql }
  SqlToRowsMiddleware,    // { sql } → { rows }
];
```

## Advanced Patterns

### Pattern: Middleware Factories

Create reusable middleware with configuration:

```typescript
const createValidationMiddleware = (schema: ZodSchema) => 
  async (input, next) => {
    const validated = schema.parse(input);
    return next(validated);
  };

const createLoggingMiddleware = (prefix: string) => 
  async (input, next) => {
    console.log(`${prefix} Request:`, input);
    const response = await next(input);
    console.log(`${prefix} Response:`, response);
    return response;
  };

// Usage
const stack = [
  createValidationMiddleware(RequestSchema),
  createLoggingMiddleware('[API]'),
  BusinessLogicMiddleware,
];
```

### Pattern: Middleware Composition

Combine multiple middleware into a single middleware:

```typescript
const createComposedMiddleware = (middlewares: Middleware[]) => 
  async (input, next) => {
    const composed = composeStack([...middlewares, next]);
    return composed(input);
  };
```

### Pattern: Conditional Middleware

Apply middleware conditionally:

```typescript
const conditionalStack = [
  ValidationMiddleware,
  ...(isProduction ? [SecurityMiddleware] : []),
  ...(enableLogging ? [LoggingMiddleware] : []),
  BusinessLogicMiddleware,
];
```

### Pattern: Middleware Registry

Dynamically load middleware:

```typescript
const registry: MiddlewareRegistry = {
  'validation': async () => ValidationMiddleware,
  'auth': async () => AuthMiddleware,
  'logging': async () => LoggingMiddleware,
};

const stack = await getFromRegistry(
  ['validation', 'auth', 'logging'],
  registry
);
```

## Summary

Middleware architecture provides:

1. **Separation of Concerns**: Each layer handles one responsibility
2. **Reusability**: Middleware can be used in different stacks
3. **Testability**: Each middleware can be tested independently
4. **Flexibility**: Easy to add, remove, or reorder middleware
5. **Type Safety**: Full TypeScript support with compile-time checking
6. **Maintainability**: Clear data flow and dependencies

This makes middleware-based architecture ideal for building scalable, maintainable applications.
