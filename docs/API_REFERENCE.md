# Middleware-Pipe API Reference

## Table of Contents

1. [Core Types](#core-types)
2. [Middleware Type](#middleware-type)
3. [Stack Types](#stack-types)
4. [Functions](#functions)
5. [Generator-Based Middleware](#generator-based-middleware)
6. [Validation](#validation)
7. [Registry System](#registry-system)

## Core Types

### MiddlewareCall

A function that executes a middleware call.

```typescript
type MiddlewareCall<Request, Response> = (req: Request) => Promise<Response>;
```

**Parameters:**
- `req: Request` - The request to process

**Returns:**
- `Promise<Response>` - The response from the middleware

**Example:**
```typescript
const call: MiddlewareCall<{ text: string }, { result: string }> = 
  async (req) => ({ result: req.text.toUpperCase() });

const response = await call({ text: 'hello' });
```

## Middleware Type

### Middleware

The core middleware type that processes input and calls the next middleware.

```typescript
type Middleware<
  MyArgType,
  NextMiddlewareArg,
  NextMiddlewareReturnType,
  MyReturnType
> = (
  input: MyArgType,
  next: MiddlewareCall<NextMiddlewareArg, Promise<NextMiddlewareReturnType>>
) => Promise<MyReturnType> & MiddlewareValidation<...>
```

**Type Parameters:**

| Parameter | Description |
|-----------|-------------|
| `MyArgType` | Type of input this middleware receives |
| `NextMiddlewareArg` | Type of input passed to next middleware |
| `NextMiddlewareReturnType` | Type of response from next middleware |
| `MyReturnType` | Type of output this middleware returns |

**Validation Properties:**

```typescript
interface MiddlewareValidation<MyArgType, NextMiddlewareArg, NextMiddlewareReturnType, MyReturnType> {
  MyArgType?: ZodSchema<MyArgType>;
  NextMiddlewareArg?: ZodSchema<NextMiddlewareArg>;
  NextMiddlewareReturnType?: ZodSchema<NextMiddlewareReturnType>;
  MyReturnType?: ZodSchema<MyReturnType>;
  Name?: string;
}
```

**Example:**

```typescript
import { Middleware } from 'middleware-pipe';
import { z } from 'zod';

const InputSchema = z.object({ email: z.string().email() });
type Input = z.infer<typeof InputSchema>;

const OutputSchema = z.object({ userId: z.string() });
type Output = z.infer<typeof OutputSchema>;

const RegisterMiddleware: Middleware<Input, never, never, Output> = 
  async (input) => {
    return { userId: generateId() };
  };

// Add validation schemas
RegisterMiddleware.MyArgType = InputSchema;
RegisterMiddleware.MyReturnType = OutputSchema;
RegisterMiddleware.Name = 'RegisterMiddleware';
```

## Stack Types

### MiddlewareStack

An ordered array of middleware to be composed.

```typescript
type MiddlewareStack<Request = any, Response = any> = 
  [MiddlewareStackItem<Request, Response>, ...MiddlewareStackItem[]];
```

**Type Parameters:**
- `Request` - Type of the initial request
- `Response` - Type of the final response

**Example:**

```typescript
const stack: MiddlewareStack<
  { text: string },
  { result: string }
> = [
  ValidationMiddleware,
  TransformMiddleware,
  ProcessMiddleware,
];
```

### MiddlewareStackItem

A single middleware in a stack.

```typescript
type MiddlewareStackItem<Request = any, Response = any> = 
  Middleware<Request, any, any, Response> | 
  Middleware<Request, never, never, Response>;
```

### ExecutableStack

A function that executes a composed middleware stack.

```typescript
type ExecutableStack<Request, Response> = 
  (initialRequest: Request) => Promise<Response>;
```

**Parameters:**
- `initialRequest: Request` - The initial request to process

**Returns:**
- `Promise<Response>` - The final response

**Example:**

```typescript
const executable: ExecutableStack<{ text: string }, { result: string }> = 
  composeStack(stack);

const result = await executable({ text: 'hello' });
```

## Functions

### composeStack

Composes a middleware stack into an executable function.

```typescript
import {composeStack} from 'middleware-pipe';
function composeStack<Request, Response>(
  stack: MiddlewareStack<Request, Response>
): ExecutableStack<Request, Response>
```

**Parameters:**
- `stack: MiddlewareStack<Request, Response>` - Array of middleware to compose

**Returns:**
- `ExecutableStack<Request, Response>` - Executable function

**Description:**
Uses `reduceRight` to compose middleware from right to left, creating a chain where each middleware calls the next.

**Example:**

```typescript
import { composeStack } from 'middleware-pipe';

const stack = [middleware1, middleware2, middleware3];
const executable = composeStack(stack);
const result = await executable(initialRequest);
```

### validateStack

Validates that a middleware stack is properly typed.

```typescript
function validateStack(stack: MiddlewareStack): string[]
```

**Parameters:**
- `stack: MiddlewareStack` - Array of middleware to validate

**Returns:**
- `string[]` - Array of validation error messages (empty if valid)

**Description:**
Checks that:
1. Each middleware's output type matches the next middleware's input type
2. All required validation schemas are present
3. Type compatibility across the stack

**Example:**

```typescript
import { validateStack } from 'middleware-pipe';

const errors = validateStack(stack);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
  process.exit(1);
}
```

### getFromRegistry

Retrieves middleware from a registry by name.

```typescript
async function getFromRegistry<Request, Response>(
  stack: string[],
  registry: MiddlewareRegistry
): Promise<MiddlewareStack<Request, Response>>
```

**Parameters:**
- `stack: string[]` - Array of middleware names to retrieve
- `registry: MiddlewareRegistry` - Registry object containing middleware providers

**Returns:**
- `Promise<MiddlewareStack<Request, Response>>` - Resolved middleware stack

**Throws:**
- `Error` - If any middleware name is not found in registry

**Example:**

```typescript
import { getFromRegistry } from 'middleware-pipe';

const registry: MiddlewareRegistry = {
  'validation': async () => ValidationMiddleware,
  'auth': async () => AuthMiddleware,
  'logging': async () => LoggingMiddleware,
};

const stack = await getFromRegistry(
  ['validation', 'auth', 'logging'],
  registry
);

const executable = composeStack(stack);
```

### areTypesEquivalent

Checks if two types are equivalent for middleware composition.

```typescript
function areTypesEquivalent(type1: ZodSchema, type2: ZodSchema): boolean
```

**Parameters:**
- `type1: ZodSchema` - First type to compare
- `type2: ZodSchema` - Second type to compare

**Returns:**
- `boolean` - True if types are equivalent

**Example:**

```typescript
import { areTypesEquivalent } from 'middleware-pipe';
import { z } from 'zod';

const schema1 = z.object({ id: z.string() });
const schema2 = z.object({ id: z.string() });

if (areTypesEquivalent(schema1, schema2)) {
  console.log('Types are compatible');
}
```

It's OK to provide your own implementation of this function if you have special type comparison needs, and pass it to `validateStack` like this:

```typescript
import {validateStack} from "./validate";

validateStack(stack, (type1, type2) => {
  // Your custom type comparison logic
  return true; // or false
});
```

## Generator-Based Middleware

### GenMiddleware

Advanced middleware type using generators for explicit control flow.

```typescript
type GenMiddleware<
  MyArgType,
  NextMiddlewareArg,
  NextMiddlewareReturnType,
  MyReturnType
> = (
  details: MyArgType,
  next: NextGen<NextMiddlewareArg, NextMiddlewareReturnType>,
  resolve: (resolved: MyReturnType) => void
) => Promise<void> & MiddlewareValidation<...>
```

**Type Parameters:**
- `MyArgType` - Type of input this middleware receives
- `NextMiddlewareArg` - Type of input passed to next middleware
- `NextMiddlewareReturnType` - Type of response from next middleware
- `MyReturnType` - Type of output this middleware returns

**Parameters:**
- `details: MyArgType` - Input data
- `next: NextGen<...>` - Function to call next middleware
- `resolve: (resolved: MyReturnType) => void` - Function to resolve with output

**Example:**

```typescript
import { GenMiddleware } from 'middleware-pipe';
import { z } from 'zod';

const RequestSchema = z.object({ value: z.number() });
type Request = z.infer<typeof RequestSchema>;

const ResponseSchema = z.object({ result: z.number() });
type Response = z.infer<typeof ResponseSchema>;

const middleware: GenMiddleware<Request, Request, Response, Response> = 
  async (details, next, resolve) => {
    console.log('Before next');
    
    next(details, (response) => {
      console.log('After next');
      resolve(response);
    });
  };

middleware.MyArgType = RequestSchema;
middleware.NextMiddlewareArg = RequestSchema;
middleware.NextMiddlewareReturnType = ResponseSchema;
middleware.MyReturnType = ResponseSchema;
```

### NextGen

Function to be called as the next middleware in a generator-based stack.

```typescript
type NextGen<Request, Response> = (
  arg: Request,
  resolve: (arg: Response) => void
) => void
```

**Parameters:**
- `arg: Request` - Input to pass to next middleware
- `resolve: (arg: Response) => void` - Callback to handle response

**Example:**

```typescript
const middleware: GenMiddleware<Request, Request, Response, Response> = 
  async (details, next, resolve) => {
    next(details, (response) => { //next is the NextGen function
      // Handle response
      resolve(response);
    });
  };
```

### GenMiddlewareStack

Stack of generator-based middleware.

```typescript
type GenMiddlewareStack<Request = any, Response = any> = 
  [GenStackItem<Request, Response>, ...GenStackItem[]];
```

### ExecutableGenStack

Executable generator-based middleware stack.

```typescript
type ExecutableGenStack<Request, Response> = 
  (initialRequest: Request, resolve: (resolved: Response) => void) => void
```

**Parameters:**
- `initialRequest: Request` - Initial request
- `resolve: (resolved: Response) => void` - Callback for final response

**Example:**

```typescript
const executable: ExecutableGenStack<Request, Response> = 
  composeGenStack(stack);

executable(request, (response) => {
  console.log('Response:', response);
});
```

### composeGenStack

Composes a generator-based middleware stack.

```typescript
function composeGenStack<Request, Response>(
  callstack: GenMiddlewareStack<Request, Response>
): ExecutableGenStack<Request, Response>
```

**Parameters:**
- `callstack: GenMiddlewareStack<Request, Response>` - Array of generator middleware

**Returns:**
- `ExecutableGenStack<Request, Response>` - Executable generator stack

**Example:**

```typescript
import { composeGenStack } from 'middleware-pipe';

const stack: GenMiddlewareStack = [
  middleware1,
  middleware2,
  middleware3,
];

const executable = composeGenStack(stack);

executable(request, (response) => {
  console.log('Final response:', response);
});
```

### getGenFromRegistry

Retrieves generator-based middleware from a registry.

```typescript
async function getGenFromRegistry<Request, Response>(
  stack: string[],
  registry: GenMiddlewareRegistry
): Promise<GenMiddlewareStack<Request, Response>>
```

**Parameters:**
- `stack: string[]` - Array of middleware names
- `registry: GenMiddlewareRegistry` - Registry of generator middleware

**Returns:**
- `Promise<GenMiddlewareStack<Request, Response>>` - Resolved middleware stack

**Example:**

```typescript
import { getGenFromRegistry } from 'middleware-pipe';

const registry: GenMiddlewareRegistry = {
  'middleware1': async () => GenMiddleware1,
  'middleware2': async () => GenMiddleware2,
};

const stack = await getGenFromRegistry(['middleware1', 'middleware2'], registry);
const executable = composeGenStack(stack);
```

## Validation

### MiddlewareValidation

Validation configuration for middleware.

```typescript
type MiddlewareValidation<
  MyArgType,
  NextMiddlewareArg,
  NextMiddlewareReturnType,
  MyReturnType
> = {
  MyArgType?: ZodSchema<MyArgType>;
  NextMiddlewareArg?: ZodSchema<NextMiddlewareArg>;
  NextMiddlewareReturnType?: ZodSchema<NextMiddlewareReturnType>;
  MyReturnType?: ZodSchema<MyReturnType>;
  Name?: string;
};
```

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `MyArgType` | `ZodSchema` | Schema for input validation |
| `NextMiddlewareArg` | `ZodSchema` | Schema for next middleware input |
| `NextMiddlewareReturnType` | `ZodSchema` | Schema for next middleware output |
| `MyReturnType` | `ZodSchema` | Schema for output validation |
| `Name` | `string` | Middleware name for debugging |

**Example:**

```typescript
const middleware: Middleware<Input, Middle, Output, Result> = 
  async (input, next) => {
    // Implementation
  };

middleware.MyArgType = InputSchema;
middleware.NextMiddlewareArg = MiddleSchema;
middleware.NextMiddlewareReturnType = OutputSchema;
middleware.MyReturnType = ResultSchema;
middleware.Name = 'MyMiddleware';
```

## Registry System

### MiddlewareRegistry

Registry of middleware providers.

```typescript
type MiddlewareRegistry = Record<string, MiddlewareProvider>;

type MiddlewareProvider = () => Promise<Middleware<any, any, any, any>>;
```

**Example:**

```typescript
import { AuthMiddleware } from './auth';

const registry: MiddlewareRegistry = {
  'auth': async () => {
    return AuthMiddleware; // Eagerly imported
  },
  'validation': async () => { //Lazily imported
    const { ValidationMiddleware } = await import('./validation');
    return ValidationMiddleware;
  },
  'logging': async () => {//Lazily imported
    const { LoggingMiddleware } = await import('./logging');
    return LoggingMiddleware;
  },
};
```

### GenMiddlewareRegistry

Registry of generator-based middleware providers.

```typescript
type GenMiddlewareRegistry = Record<string, GenMiddlewareProvider>;

type GenMiddlewareProvider = () => Promise<GenMiddleware<unknown, unknown, unknown, unknown>>;
```

**Example:**

```typescript
const registry: GenMiddlewareRegistry = {
  'middleware1': async () => {
    const { GenMiddleware1 } = await import('./gen-middleware-1');
    return GenMiddleware1;
  },
  'middleware2': async () => {
    const { GenMiddleware2 } = await import('./gen-middleware-2');
    return GenMiddleware2;
  },
};
```

## Complete Example

```typescript complete-example:@import.meta.vitest
const {
  Middleware,
  MiddlewareStack,
  composeStack,
  validateStack,
  getFromRegistry,
} = await import('middleware-pipe');
const { z } = await import('zod');

const { expect } = await import('vitest');

// ============================================
// Type Definitions
// ============================================

const RequestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});
type Request = z.infer<typeof RequestSchema>;

const ResponseSchema = z.object({
  userId: z.string(),
  success: z.boolean(),
});
type Response = z.infer<typeof ResponseSchema>;

// ============================================
// Middleware
// ============================================

const ValidateMiddleware: Middleware<Request, Request, Response, Response> = 
  async (input, next) => {
    if (input.name.length === 0) {
      throw new Error('Name cannot be empty');
    }
    return next(input);
  };

ValidateMiddleware.MyArgType = RequestSchema;
ValidateMiddleware.NextMiddlewareArg = RequestSchema;
ValidateMiddleware.NextMiddlewareReturnType = ResponseSchema;
ValidateMiddleware.MyReturnType = ResponseSchema;
ValidateMiddleware.Name = 'ValidateMiddleware';

const RegisterMiddleware: Middleware<Request, never, never, Response> = 
  async (input) => {
    return {
      userId: 'ID_'+String(input.name).toUpperCase().replace(' ','_'),
      success: true,
    };
  };

RegisterMiddleware.MyArgType = RequestSchema;
RegisterMiddleware.MyReturnType = ResponseSchema;
RegisterMiddleware.Name = 'RegisterMiddleware';

// ============================================
// Compose and Execute
// ============================================

const stack: MiddlewareStack<Request, Response> = [
  ValidateMiddleware,
  RegisterMiddleware,
];

// Validate
const errors = validateStack(stack);
expect(errors.length).toBe(0);

if (errors.length > 0) {
  console.error('Validation errors:', errors);
  process.exit(1);
}

// Compose
const executable = composeStack(stack);

// Execute
const result = await executable({
  email: 'user@example.com',
  name: 'John Doe',
});

expect(result).toStrictEqual({ 
    userId: 'ID_JOHN_DOE', 
    success: true ,
})

await expect(async ()=>{
    await executable({
        name: '',
    });
}).rejects.toThrowError("Name cannot be empty");


```

## Summary

The Middleware-Pipe API provides:

1. **Core Types** - `Middleware`, `MiddlewareStack`, `ExecutableStack`
2. **Composition Functions** - `composeStack`, `validateStack`
3. **Registry System** - `getFromRegistry`, `MiddlewareRegistry`
4. **Type Utilities** - `areTypesEquivalent`
5. **Generator-Based Middleware** - `GenMiddleware`, `composeGenStack`
6. **Validation** - Built-in Zod schema validation

Use these APIs to build type-safe, composable middleware stacks for your applications.
