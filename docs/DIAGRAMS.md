# Middleware-Pipe: Visual Diagrams and Architecture

## Table of Contents

1. [Middleware Execution Flow](#middleware-execution-flow)
2. [Type Transformation Pipeline](#type-transformation-pipeline)
3. [Stack Composition](#stack-composition)
4. [Clean Architecture Layers](#clean-architecture-layers)
5. [Request/Response Cycle](#requestresponse-cycle)
6. [Comparison with Other Frameworks](#comparison-with-other-frameworks)
7. [Advanced Patterns](#advanced-patterns)

## Middleware Execution Flow

### Simple Linear Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Middleware Stack                         │
└─────────────────────────────────────────────────────────────┘

Initial Request
      │
      ▼
┌──────────────────────────────────────────────────────────────┐
│ Middleware 1: Logging                                        │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ console.log('Request:', input)                         │  │
│ │ const response = await next(input)                     │  │
│ │ console.log('Response:', response)                     │  │
│ │ return response                                        │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────────────────────────┐
│ Middleware 2: Validation                                     │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ if (!isValid(input)) throw new Error(...)             │  │
│ │ const response = await next(input)                     │  │
│ │ return response                                        │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────────────────────────┐
│ Middleware 3: Business Logic                                 │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ const result = processData(input)                      │  │
│ │ return result                                          │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
      │
      ▼
Final Response
```

### Request and Response Phases

```
REQUEST PHASE (Going Down)
═════════════════════════════════════════════════════════════

Request: { text: 'hello' }
    │
    ├─→ [Middleware 1] Pre-processing
    │   └─→ Transform to { query: 'hello' }
    │
    ├─→ [Middleware 2] Pre-processing
    │   └─→ Transform to { sql: 'SELECT * WHERE query=hello' }
    │
    └─→ [Middleware 3] Pre-processing
        └─→ Execute query


RESPONSE PHASE (Going Up)
═════════════════════════════════════════════════════════════

Response: { rows: [...] }
    │
    ├─← [Middleware 3] Post-processing
    │   └─← Return { rows: [...] }
    │
    ├─← [Middleware 2] Post-processing
    │   └─← Transform response
    │
    └─← [Middleware 1] Post-processing
        └─← Log response


Final Response: { rows: [...] }
```

### Execution Timeline

```
Time ──────────────────────────────────────────────────────────→

t0   Request enters
     │
t1   ├─ Middleware 1 starts
     │  ├─ Pre-processing
     │  │
t2   │  ├─ Middleware 2 starts
     │  │  ├─ Pre-processing
     │  │  │
t3   │  │  ├─ Middleware 3 starts
     │  │  │  ├─ Processing
     │  │  │  └─ Returns response
     │  │  │
t4   │  │  ├─ Post-processing
     │  │  └─ Returns response
     │  │
t5   │  ├─ Post-processing
     │  └─ Returns response
     │
t6   Response exits
```

## Type Transformation Pipeline

### Single Middleware Type Transformation

```
Input Type: { text: string }
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Middleware<                                             │
│   { text: string },        ← MyArgType                  │
│   { query: string },       ← NextMiddlewareArg          │
│   { result: string },      ← NextMiddlewareReturnType   │
│   { processed: string }    ← MyReturnType               │
│ >                                                       │
└─────────────────────────────────────────────────────────┘
    │
    ├─ Receives: { text: string }
    │
    ├─ Transforms to: { query: string }
    │
    ├─ Calls next with: { query: string }
    │
    ├─ Receives from next: { result: string }
    │
    ├─ Transforms to: { processed: string }
    │
    ▼
Output Type: { processed: string }
```

### Multi-Middleware Type Chain

```
Initial Request
    │
    │ Type: { text: string }
    ▼
┌──────────────────────────────────────┐
│ Middleware 1                         │
│ Input:  { text: string }             │
│ Output: { query: string }            │
└──────────────────────────────────────┘
    │
    │ Type: { query: string }
    ▼
┌──────────────────────────────────────┐
│ Middleware 2                         │
│ Input:  { query: string }            │
│ Output: { sql: string }              │
└──────────────────────────────────────┘
    │
    │ Type: { sql: string }
    ▼
┌──────────────────────────────────────┐
│ Middleware 3                         │
│ Input:  { sql: string }              │
│ Output: { rows: any[] }              │
└──────────────────────────────────────┘
    │
    │ Type: { rows: any[] }
    ▼
Final Response
```

### Type Safety Validation

```
Stack Definition:
┌─────────────────────────────────────────────────────────┐
│ const stack: MiddlewareStack<                           │
│   { text: string },      ← Initial Request Type         │
│   { rows: any[] }        ← Final Response Type          │
│ > = [                                                   │
│   TextToQueryMiddleware,  ← { text } → { query }        │
│   QueryToSqlMiddleware,   ← { query } → { sql }         │
│   SqlToRowsMiddleware,    ← { sql } → { rows }          │
│ ]                                                       │
└─────────────────────────────────────────────────────────┘

Validation:
┌─────────────────────────────────────────────────────────┐
│ validateStack(stack)                                    │
│                                                         │
│ ✓ Middleware 1 output matches Middleware 2 input        │
│ ✓ Middleware 2 output matches Middleware 3 input        │
│ ✓ Middleware 3 output matches final response type       │
│                                                         │
│ Result: No errors                                       │
└─────────────────────────────────────────────────────────┘
```

## Stack Composition

### Composing a Stack

```
Step 1: Define Middleware
┌──────────────────────────────────────┐
│ const middleware1 = async (i, n) ... │
│ const middleware2 = async (i, n) ... │
│ const middleware3 = async (i, n) ... │
└──────────────────────────────────────┘

Step 2: Create Stack
┌──────────────────────────────────────┐
│ const stack = [                      │
│   middleware1,                       │
│   middleware2,                       │
│   middleware3,                       │
│ ]                                    │
└──────────────────────────────────────┘

Step 3: Compose Stack
┌──────────────────────────────────────┐
│ const executable =                   │
│   composeStack(stack)                │
└──────────────────────────────────────┘

Step 4: Execute
┌──────────────────────────────────────┐
│ const result =                       │
│   await executable(request)          │
└──────────────────────────────────────┘
```

### Composition Algorithm (reduceRight)

```
Original Stack:
[Middleware1, Middleware2, Middleware3]

Step 1: Start from the right
Accumulator = async (req) => ({})  // Default response

Step 2: Process Middleware3
Accumulator = async (req) => 
  await Middleware3(req, Accumulator)

Step 3: Process Middleware2
Accumulator = async (req) => 
  await Middleware2(req, Accumulator)

Step 4: Process Middleware1
Accumulator = async (req) => 
  await Middleware1(req, Accumulator)

Result: Fully composed executable function
```

## Clean Architecture Layers

### Concentric Circles Model

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │                                                 │  │  │
│  │  │  ┌───────────────────────────────────────────┐  │  │  │
│  │  │  │                                           │  │  │  │
│  │  │  │  Enterprise Business Rules (Entities)     │  │  │  │
│  │  │  │  - User, Product, Order                   │  │  │  │
│  │  │  │  - Core business logic                    │  │  │  │
│  │  │  │                                           │  │  │  │
│  │  │  └───────────────────────────────────────────┘  │  │  │
│  │  │                                                 │  │  │
│  │  │  Application Business Rules (Use Cases)         │  │  │
│  │  │  - RegisterUser, CreateOrder                    │  │  │
│  │  │  - Application-specific logic                   │  │  │
│  │  │                                                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  Interface Adapters (Middleware)                      │  │
│  │  - Controllers, Presenters, Gateways                  │  │
│  │  - Convert between layers                             │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Frameworks & Drivers (Express, Database, UI)               │
│  - Web frameworks, databases, external APIs                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Middleware-Pipe Alignment with Clean Architecture

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Framework Adapter Middleware                   │
│ (Convert HTTP to domain format)                         │
│ HttpRequest → DomainRequest                             │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Validation Middleware                          │
│ (Validate business rules)                               │
│ DomainRequest → DomainRequest (validated)               │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Use Case Middleware                            │
│ (Execute application business logic)                    │
│ DomainRequest → DomainResponse                          │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Response Adapter Middleware                    │
│ (Convert domain to HTTP format)                         │
│ DomainResponse → HttpResponse                           │
└─────────────────────────────────────────────────────────┘
    │
    ▼
HTTP Response
```

## Request/Response Cycle

### Complete Request/Response Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request                             │
│              POST /api/register                             │
│              { email: "user@example.com" }                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ [1] Parse HTTP Adapter                                      │
│     Input:  HttpRequest                                     │
│     Output: DomainRequest                                   │
│     { email: "user@example.com", name: "..." }              │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ [2] Validation                                              │
│     Input:  DomainRequest                                   │
│     Output: DomainRequest (validated)                       │
│     ✓ Email format valid                                    │
│     ✓ Name not empty                                        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ [3] Authentication                                          │
│     Input:  DomainRequest                                   │
│     Output: AuthenticatedRequest                            │
│     ✓ User authenticated                                    │
│     ✓ Permissions verified                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ [4] Business Logic (Use Case)                               │
│     Input:  AuthenticatedRequest                            │
│     Output: DomainResponse                                  │
│     - Create user in database                               │
│     - Generate user ID                                      │
│     - Return success response                               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ [5] Response Adapter                                        │
│     Input:  DomainResponse                                  │
│     Output: HttpResponse                                    │
│     { status: 201, body: { userId: "123" } }                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Response                            │
│              201 Created                                    │
│              { userId: "123", success: true }               │
└─────────────────────────────────────────────────────────────┘
```

## Comparison with Other Frameworks

### Express.js Middleware Chain

```
Express:
┌──────────────────────────────────────────────────────────┐
│ app.use(middleware1)                                     │
│ app.use(middleware2)                                     │
│ app.use(middleware3)                                     │
│ app.get('/route', handler)                               │
└──────────────────────────────────────────────────────────┘
    │
    ├─ Loose typing (JavaScript)
    ├─ No compile-time validation
    ├─ Runtime errors possible
    └─ Tightly coupled to HTTP

Middleware-Pipe:
┌──────────────────────────────────────────────────────────┐
│ const stack = [middleware1, middleware2, middleware3]    │
│ const executable = composeStack(stack)                   │
│ const result = await executable(request)                 │
└──────────────────────────────────────────────────────────┘
    │
    ├─ Strict typing (TypeScript)
    ├─ Compile-time validation
    ├─ Type errors caught early
    └─ Framework-agnostic
```

### Tomcat Filter Chain

```
Tomcat:
┌──────────────────────────────────────────────────────────┐
│ @WebFilter("/*")                                         │
│ public class Filter1 implements Filter { ... }           │
│ @WebFilter("/*")                                         │
│ public class Filter2 implements Filter { ... }           │
└──────────────────────────────────────────────────────────┘
    │
    ├─ Declarative (annotations)
    ├─ Synchronous execution
    ├─ Loose typing (casting required)
    └─ Tightly coupled to Servlet API

Middleware-Pipe:
┌──────────────────────────────────────────────────────────┐
│ const stack = [filter1, filter2]                         │
│ const executable = composeStack(stack)                   │
│ const result = await executable(request)                 │
└──────────────────────────────────────────────────────────┘
    │
    ├─ Programmatic composition
    ├─ Async execution
    ├─ Strict typing (no casting)
    └─ Framework-agnostic
```

## Advanced Patterns

### Conditional Middleware

```
Request
    │
    ▼
┌──────────────────────────────────────┐
│ Conditional Middleware               │
│                                      │
│ if (condition) {                     │
│   ├─ Path A: Process normally        │
│   │   └─ call next()                 │
│   │                                  │
│   └─ Path B: Skip processing         │
│       └─ return early                │
│ }                                    │
└──────────────────────────────────────┘
    │
    ├─ Path A ──→ [Middleware 2] ──→ [Middleware 3]
    │
    └─ Path B ──→ [Skip] ──→ Response
```

### Caching Middleware

```
Request
    │
    ▼
┌──────────────────────────────────────┐
│ Caching Middleware                   │
│                                      │
│ cacheKey = hash(request)             │
│                                      │
│ if (cache.has(cacheKey)) {           │
│   └─ return cached response          │
│ } else {                             │
│   ├─ call next()                     │
│   ├─ cache response                  │
│   └─ return response                 │
│ }                                    │
└──────────────────────────────────────┘
    │
    ├─ Cache Hit ──→ Return cached
    │
    └─ Cache Miss ──→ [Middleware 2] ──→ Cache ──→ Return
```

### Error Handling Middleware

```
Request
    │
    ▼
┌──────────────────────────────────────┐
│ Error Handling Middleware            │
│                                      │
│ try {                                │
│   └─ response = await next()         │
│ } catch (error) {                    │
│   ├─ Transform error                 │
│   ├─ Log error                       │
│   └─ return error response           │
│ }                                    │
└──────────────────────────────────────┘
    │
    ├─ Success ──→ Return response
    │
    └─ Error ──→ Transform ──→ Return error response
```

### Middleware Registry

```
┌─────────────────────────────────────────────────────────┐
│ Middleware Registry                                     │
│                                                         │
│ {                                                       │
│   'validation': async () => ValidationMiddleware,      │
│   'auth': async () => AuthMiddleware,                  │
│   'logging': async () => LoggingMiddleware,            │
│   'cache': async () => CachingMiddleware,              │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ getFromRegistry(['validation', 'auth', 'logging'])     │
│                                                         │
│ Returns: [                                              │
│   ValidationMiddleware,                                 │
│   AuthMiddleware,                                       │
│   LoggingMiddleware,                                    │
│ ]                                                       │
└─────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ composeStack(middlewares)                               │
│                                                         │
│ Returns: executable function                            │
└─────────────────────────────────────────────────────────┘
```

## Summary

These diagrams illustrate:

1. **Execution Flow** - How middleware processes requests and responses
2. **Type Transformation** - How types flow through the stack
3. **Stack Composition** - How middleware is combined
4. **Clean Architecture** - How middleware aligns with architectural layers
5. **Request/Response Cycle** - Complete flow from HTTP to response
6. **Framework Comparison** - How Middleware-Pipe differs from other frameworks
7. **Advanced Patterns** - Conditional, caching, and error handling patterns

Use these diagrams to understand and explain middleware concepts to others.
