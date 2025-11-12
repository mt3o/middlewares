# Middleware-Pipe: Type-Safe Middleware Composition Library

A powerful TypeScript library for composing type-safe middleware stacks with automatic validation and registry management. Build complex request processing pipelines with confidence through compile-time and runtime type checking.

## 🎯 Overview

**Middleware-Pipe** provides a framework for building composable, type-safe middleware chains. Unlike traditional middleware systems that rely on loose typing and runtime errors, this library allows type safety at both compile-time and runtime, ensuring that each middleware in your stack correctly transforms data as it flows through the pipeline.

### Key Features

- **Type-Safe Composition**: Full TypeScript support with strict type checking for middleware chains
- **Dual Execution Models**: 
  - **Promise-based** (`Middleware`): Traditional async/await pattern
  - **Generator-based** (`GenMiddleware`): Advanced control flow with explicit resolution
- **Runtime Validation**: Zod schema validation for request/response types at each middleware layer
  - **Other libraries are welcome**: You don't need to rely only on Zod; you can integrate your own validation logic
- **Registry System**: Dynamically load and compose middleware from a registry
- **Middleware Stacking**: Easily create and manage ordered middleware stacks
- **Zero Dependencies**: Lightweight core with optional Zod integration for validation
- **Clean Architecture**: Designed to support layered, maintainable application architecture

## 🚀 Quick Start

### Installation

```bash
npm install middleware-pipe zod
```

### Basic Example

```typescript
import { Middleware, composeStack } from 'middleware-pipe';
import { z } from 'zod';

// Define types
const RequestSchema = z.object({ text: z.string() });
type Request = z.infer<typeof RequestSchema>;

const ResponseSchema = z.object({ result: z.string() });
type Response = z.infer<typeof ResponseSchema>;

// Create middleware
const myMiddleware: Middleware<Request, never, never, Response> = async (input) => {
  return { result: input.text.toUpperCase() };
};

myMiddleware.MyArgType = RequestSchema;
myMiddleware.MyReturnType = ResponseSchema;

// Compose and execute
const stack = [myMiddleware];
const executable = composeStack(stack);
const result = await executable({ text: 'hello' });
console.log(result); // { result: 'HELLO' }
```

## 📚 Documentation Structure

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into middleware concepts, stacking patterns, and layered architecture
- **[CLEAN_ARCHITECTURE.md](./CLEAN_ARCHITECTURE.md)** - How Middleware-Pipe supports Clean Architecture principles
- **[COMPARISONS.md](./COMPARISONS.md)** - Parallels with Express.js, Apache Tomcat, and other frameworks
- **[CODE_EXAMPLES.md](./CODE_EXAMPLES.md)** - Comprehensive code examples and patterns
- **[DIAGRAMS.md](./DIAGRAMS.md)** - Visual representations of middleware flow and architecture
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Complete API documentation

## 🏗️ Core Concepts

### Middleware

A middleware is a function that:
1. Receives input of type `MyArgType`
2. Calls the next middleware with `NextMiddlewareArg`
3. Receives a response of type `NextMiddlewareReturnType`
4. Returns a value of type `MyReturnType`

```typescript
type Middleware<MyArgType, NextMiddlewareArg, NextMiddlewareReturnType, MyReturnType> = 
  (
      input: MyArgType, 
      next: MiddlewareCall<NextMiddlewareArg, NextMiddlewareReturnType>
  ) => Promise<MyReturnType>
```

### Middleware Stack

A stack is an ordered array of middleware that processes data sequentially:

```typescript
const stack: MiddlewareStack<InitialRequest, FinalResponse> = [
  middleware1, /*Accepts the first input, and finally returns the response*/
  middleware2, /*is called by m1, calls m2, imposes its own processing for input and output*/
  middleware3, /*innermost execution, could be infrastructure call that calls external APIs*/
];
```

### Composition

The `composeStack` function creates an executable function from a middleware stack:

```typescript
const stack = [middleware1, middleware2, middleware3];
const executable = composeStack(stack);
const result = await executable(initialRequest);
```

## 🔄 Execution Flow

```
Request
  ↓
[Middleware 1] → transforms request
  ↓
[Middleware 2] → transforms request
  ↓
[Middleware 3] → transforms request
  ↓
Response
```

Each middleware can:
- Transform the input before passing to the next middleware
- Transform the response from the next middleware
- Handle errors or side effects
- Short-circuit the chain if needed

## 🛡️ Type Safety

Middleware-Pipe enforces type safety through:

1. **Compile-time checking**: TypeScript ensures type compatibility
2. **Stack validation**: `validateStack()` verifies Zod schemas each middleware in the stack as whole - if one stack element is incompatible with the next, an error is reported
3. **Runtime checking**: Thou its optional, Zod schemas can validate input/output at runtime within your middleware

```typescript
const errors = validateStack(stack);
if (errors.length > 0) {
  console.error('Stack validation failed:', errors);
}
```

## 📦 Use Cases

- **Data Processing Pipelines**: Multi-stage data transformation with validation
- **API Gateway**: Transform and validate requests/responses across services
- **Authentication & Authorization**: Layer-based security checks
- **Logging & Monitoring**: Cross-cutting concerns across the stack
- **Error Handling**: Centralized error transformation and handling
- **Request/Response Transformation**: Format conversion between layers
- **Side effect management**: Business logic responding to external systems can be split into smaller managable chunks
- **Clean Architecture**: Enforce boundaries between layers with type-safe middleware

## 🤝 Contributing

Contributions are welcome! Please ensure:
- All tests pass: `npm test`
- Code is type-safe: `npm run typecheck`
- Linting passes: `npm run lint`

## 📄 License

MIT

## 👤 Author

Teodor Kulej - [GitHub](https://github.com/mt3o)
