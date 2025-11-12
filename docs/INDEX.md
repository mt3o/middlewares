# Middleware-Pipe Documentation Index

Welcome to the comprehensive documentation for **Middleware-Pipe**, a type-safe middleware composition library for TypeScript.

## 📖 Documentation Overview

This documentation suite provides everything you need to understand, implement, and master middleware-based architecture using Middleware-Pipe.

### Quick Navigation

| Document | Purpose | Best For |
|----------|---------|----------|
| **[README.md](./README.md)** | Overview and quick start | Getting started, feature overview |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Middleware concepts and patterns | Understanding middleware design |
| **[CLEAN_ARCHITECTURE.md](./CLEAN_ARCHITECTURE.md)** | Clean Architecture integration | Building maintainable applications |
| **[COMPARISONS.md](./COMPARISONS.md)** | Framework comparisons | Understanding Middleware-Pipe's advantages |
| **[CODE_EXAMPLES.md](./CODE_EXAMPLES.md)** | Practical code examples | Learning by example |
| **[DIAGRAMS.md](./DIAGRAMS.md)** | Visual representations | Understanding execution flow |
| **[API_REFERENCE.md](./API_REFERENCE.md)** | Complete API documentation | API lookup and reference |

## 🎯 Learning Paths

### Path 1: Complete Beginner

Start here if you're new to middleware concepts:

1. **[README.md](./README.md)** - Understand what Middleware-Pipe is
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Learn middleware fundamentals
3. **[DIAGRAMS.md](./DIAGRAMS.md)** - Visualize how it works
4. **[CODE_EXAMPLES.md](./CODE_EXAMPLES.md)** - See practical examples
5. **[API_REFERENCE.md](./API_REFERENCE.md)** - Reference while coding

**Estimated Time:** 2-3 hours

### Path 2: Express.js Developer

If you're familiar with Express.js middleware:

1. **[COMPARISONS.md](./COMPARISONS.md)** - See how it compares to Express
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Understand the differences
3. **[CODE_EXAMPLES.md](./CODE_EXAMPLES.md)** - See practical patterns
4. **[API_REFERENCE.md](./API_REFERENCE.md)** - Learn the API

**Estimated Time:** 1-2 hours

### Path 3: Enterprise Architect

If you're designing scalable applications:

1. **[CLEAN_ARCHITECTURE.md](./CLEAN_ARCHITECTURE.md)** - Understand architectural alignment
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Learn layering patterns
3. **[CODE_EXAMPLES.md](./CODE_EXAMPLES.md)** - See enterprise patterns
4. **[DIAGRAMS.md](./DIAGRAMS.md)** - Visualize the architecture

**Estimated Time:** 1.5-2 hours

### Path 4: Quick Reference

If you just need to look something up:

1. **[API_REFERENCE.md](./API_REFERENCE.md)** - Find what you need
2. **[CODE_EXAMPLES.md](./CODE_EXAMPLES.md)** - See usage examples
3. **[DIAGRAMS.md](./DIAGRAMS.md)** - Visualize the concept

**Estimated Time:** 15-30 minutes

## 📚 Document Summaries

### README.md
**Overview and Quick Start**

- What is Middleware-Pipe?
- Key features and benefits
- Quick start guide
- Core concepts overview
- Use cases
- Contributing guidelines

**Key Takeaway:** Middleware-Pipe is a type-safe middleware composition library that enforces type safety at compile-time and runtime.

### ARCHITECTURE.md
**Middleware Concepts and Design Patterns**

- What is middleware?
- Why layered architecture?
- Middleware stacking patterns
- Execution flow (request and response phases)
- Type transformation pipeline
- Advanced patterns (factories, composition, conditional, caching)

**Key Takeaway:** Middleware enables separation of concerns through layered, composable components.

### CLEAN_ARCHITECTURE.md
**Clean Architecture Integration**

- Clean Architecture overview
- Layers in Clean Architecture
- How Middleware-Pipe supports Clean Architecture
- Dependency rule enforcement
- Practical implementation examples
- Benefits of the approach

**Key Takeaway:** Middleware-Pipe naturally aligns with Clean Architecture principles for building maintainable applications.

### COMPARISONS.md
**Framework Comparisons**

- Express.js comparison
- Apache Tomcat comparison
- Fastify comparison
- ASP.NET Core comparison
- Django comparison
- Feature comparison matrix
- Use case recommendations

**Key Takeaway:** Middleware-Pipe stands out for type safety, framework independence, and composability.

### CODE_EXAMPLES.md
**Practical Code Examples**

- Basic examples (simple transformation, two-middleware stack, side effects)
- Real-world scenarios (API request processing, data transformation)
- Advanced patterns (factories, conditional, caching)
- Error handling patterns
- Testing examples

**Key Takeaway:** See practical implementations of middleware patterns.

### DIAGRAMS.md
**Visual Representations**

- Middleware execution flow
- Type transformation pipeline
- Stack composition
- Clean Architecture layers
- Request/response cycle
- Framework comparisons
- Advanced patterns

**Key Takeaway:** Visual understanding of middleware concepts and execution flow.

### API_REFERENCE.md
**Complete API Documentation**

- Core types (MiddlewareCall)
- Middleware type definition
- Stack types
- Functions (composeStack, validateStack, getFromRegistry, areTypesEquivalent)
- Generator-based middleware
- Validation system
- Registry system
- Complete working example

**Key Takeaway:** Complete reference for all types and functions in the library.

## 🔑 Key Concepts

### Middleware

A function that:
1. Receives input of a specific type
2. Calls the next middleware in the chain
3. Receives a response from the next middleware
4. Returns output of a specific type

```typescript
type Middleware<In, NextIn, NextOut, Out> = 
  (input: In, next: (arg: NextIn) => Promise<NextOut>) 
    => Promise<Out>
```

### Middleware Stack

An ordered array of middleware that processes data sequentially:

```typescript
const stack: MiddlewareStack<InitialRequest, FinalResponse> = [
  middleware1,
  middleware2,
  middleware3,
];
```

### Composition

The process of combining middleware into an executable function:

```typescript
const executable = composeStack(stack);
const result = await executable(initialRequest);
```

### Type Safety

Middleware-Pipe enforces type safety through:
- **Compile-time checking** - TypeScript ensures type compatibility
- **Runtime validation** - Zod schemas validate data at each layer
- **Stack validation** - `validateStack()` checks middleware compatibility

## 🏗️ Architecture Layers

Middleware-Pipe supports Clean Architecture through layered middleware:

```
HTTP Request
    ↓
[Layer 4: Framework Adapter] - Convert HTTP to domain
    ↓
[Layer 3: Validation] - Validate business rules
    ↓
[Layer 2: Use Case] - Execute application logic
    ↓
[Layer 3: Response Adapter] - Convert domain to HTTP
    ↓
HTTP Response
```

## 🚀 Common Use Cases

1. **API Gateway** - Transform and validate requests/responses
2. **Data Processing Pipelines** - Multi-stage data transformation
3. **Authentication & Authorization** - Layer-based security
4. **Logging & Monitoring** - Cross-cutting concerns
5. **Error Handling** - Centralized error transformation
6. **Request/Response Transformation** - Format conversion

## 💡 Best Practices

### 1. Single Responsibility
Each middleware should handle one concern:

```typescript
// ✅ Good
const LoggingMiddleware = async (input, next) => { /*...*/ };
const ValidationMiddleware = async (input, next) => { /*...*/ };

// ❌ Bad
const LoggingAndValidationMiddleware = async (input, next) => { /*...*/ };
```

### 2. Type Safety
Always define validation schemas:

```typescript
middleware1.MyArgType = InputSchema;
middleware1.NextMiddlewareArg = NextInputSchema;
middleware1.NextMiddlewareReturnType = NextOutputSchema;
middleware1.MyReturnType = OutputSchema;
```

And after that, on runtime (or in unit tests), validate the stack:

```typescript
const errors = validateStack([middleware1, middleware2, middleware3]);
if (errors.length > 0) {
  console.error('Stack validation failed:', errors);
  process.exit(1);
}
```

Why on runtime? Because TypeScript types are erased at runtime, so runtime validation ensures data compatibility. 
Besides, its totally valid to shape the middleware stack differently based on some conditions, for example extensive logging might be enabled only in development environment. The dynamic nature prevents us from relying solely on compile-time checks.


### 3. Composition Over Inheritance
Build complex behavior by composing simple middleware:

```typescript
const stack = [
  AuthMiddleware,
  ValidationMiddleware,
  RateLimitMiddleware,
  BusinessLogicMiddleware,
];
```

### 4. Dependency Injection
Middleware should receive dependencies, not create them:

```typescript
const createDatabaseMiddleware = (db: Database) => async (input, next) => { /*...*/ };
```

### 5. Validation Before Execution
Always validate the stack before execution:

```typescript
const errors = validateStack(stack);
if (errors.length > 0) {
  console.error('Stack validation failed:', errors);
  process.exit(1);
}
```

## 🔗 Related Resources

### Official Resources
- [GitHub Repository](https://github.com/mt3o/middleware-pipe)
- [NPM Package](https://npmjs.com/package/middleware-pipe)

### External Resources
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Express.js Middleware Documentation](https://expressjs.com/en/guide/using-middleware.html)
- [Zod Documentation](https://zod.dev/)

## ❓ FAQ


### Q: Can I use Middleware-Pipe with Express.js?

**A:** Yes. Middleware-Pipe is framework-agnostic. You can compose middleware with Middleware-Pipe and integrate it with Express or any other framework:

```typescript
const stack = [middleware1, middleware2];
const executable = composeStack(stack);

app.post('/api', async (req, res) => {
  const result = await executable(req.body);
  res.json(result);
});
```

### Q: What's the difference between Middleware and GenMiddleware?

**A:** 
- **Middleware** - Promise-based, traditional async/await pattern. Single input, single output. 
- **GenMiddleware** - Generator-based, explicit control flow with callbacks, allowing multiple yields. More complex scenarios.

Use Middleware for most cases. Use GenMiddleware for advanced control flow scenarios.

One such example for GenMiddleware is when you want to load data, but also indicate loading states or progress updates.

### Q: How do I test middleware?

**A:** Test middleware independently by calling them directly:

```typescript
const result = await middleware({ input: 'data' });
expect(result).toEqual({ output: 'data' });

const processRsult = vitest.fn();
await genmiddleware({input: 'data'}, processRsult);
expect(processRsult).toHaveBeenCalledWith({ output: 'data' });

```

### Q: Can I use Middleware-Pipe in production?

**A:** Yes! Middleware-Pipe is production-ready with:
- Full TypeScript support
- Comprehensive type checking
- Runtime validation with Zod
- Zero external dependencies (Zod is optional)

## 📞 Support

For questions, issues, or contributions:

1. Check the [FAQ](#faq) section above
2. Review [CODE_EXAMPLES.md](./CODE_EXAMPLES.md) for similar patterns
3. Check the [GitHub Issues](https://github.com/mt3o/middleware-pipe/issues)
4. Create a new issue with details

## 📄 License

Middleware-Pipe is licensed under the MIT License. See the LICENSE file for details.

## 👤 Author

**Teodor Kulej**
- GitHub: [@mt3o](https://github.com/mt3o)
- Email: mt3o@users.noreply.github.com

---

**Last Updated:** 2025-11-12

**Documentation Version:** 1.0.0

For the latest documentation, visit the [GitHub repository](https://github.com/mt3o/middleware-pipe).
