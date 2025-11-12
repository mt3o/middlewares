# Middleware-Pipe vs Other Frameworks

## Table of Contents

1. [Express.js](#expressjs)
2. [Apache Tomcat](#apache-tomcat)
3. [Fastify](#fastify)
4. [ASP.NET Core](#aspnet-core)
5. [Django](#django)
6. [Key takeways](#key-takeways)

The middleware pattern is widely used in various web frameworks for handling requests and responses. Below, we compare Middleware-Pipe with several popular frameworks, highlighting similarities and differences so that learning middleware-pipe will be easier.

## Express.js

### Overview

Express.js is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. It uses middleware extensively for request processing.

### Express Middleware Pattern

```javascript
// Express middleware
app.use((req, res, next) => {
  console.log('Request:', req.url);
  next(); // Call next middleware
});

app.use((req, res, next) => {
  req.user = { id: 1, name: 'John' };
  next();
});

app.get('/api/user', (req, res) => {
  res.json(req.user);
});
```

First two middlewares transform the incoming request, and finally the route handler sends the response.
Real world middleware used in Express is [json transformer](https://expressjs.com/en/api.html#express.json). It parses incoming JSON request bodies and makes the data available on req.body.

### Middleware-Pipe Pattern

```typescript
// Middleware-Pipe equivalent
const LoggingMiddleware: Middleware<Request, Request, Response, Response> = 
  async (input, next) => {
    console.log('Request:', input.url);
    return next(input);
  };

const UserEnrichmentMiddleware: Middleware<Request, EnrichedRequest, Response, Response> = 
  async (input, next) => {
    const enriched = {
      ...input,
      user: { id: 1, name: 'John' },
    };
    return next(enriched);
  };

const stack = [LoggingMiddleware, UserEnrichmentMiddleware];
const executable = composeStack(stack);
```

### Parallels

| Aspect                 | Express | Middleware-Pipe                             |
|------------------------|---------|---------------------------------------------|
| **Middleware Concept** | Functions that process requests | Functions that transform data               |
| **Chaining**           | `next()` callback | Type-safe composition                       |
| **Type Safety**        | Loose (JavaScript) | Strict (TypeScript)                         |
| **Composition**        | Linear chain | in-and-out processing                       |
| **Framework Coupling** | Tightly coupled to HTTP | Framework-agnostic                          |


#### 3. Type Transformation

**Express:**
```javascript
// No type transformation tracking
app.use((req, res, next) => {
  req.body = JSON.parse(req.body); // Type unknown
  next();
});

app.use((req, res, next) => {
  req.validated = validateSchema(req.body); // Type unknown
  next();
});
```

**Middleware-Pipe:**
```typescript
// Type transformation is explicit and tracked
const ParseMiddleware: Middleware<string, ParsedData, ValidatedData, ValidatedData> = 
  async (input, next) => {
    const parsed = JSON.parse(input);
    return next(parsed);
  };

const ValidateMiddleware: Middleware<ParsedData, ParsedData, ValidatedData, ValidatedData> = 
  async (input, next) => {
    const validated = schema.parse(input);
    return next(validated);
  };

// Type flow is clear: string → ParsedData → ValidatedData
```

#### 4. Validation

**Express:**
```javascript
// Manual validation
app.post('/user', (req, res) => {
  if (!req.body.email) {
    return res.status(400).json({ error: 'Email required' });
  }
  // Process...
});
```

**Middleware-Pipe:**
```typescript
// Declarative validation with Zod
const UserSchema = z.object({ email: z.string().email() });

const ValidateMiddleware: Middleware<unknown, User, Response, Response> = 
  async (input, next) => {
    const validated = UserSchema.parse(input);
    return next(validated);
  };

ValidateMiddleware.MyArgType = z.unknown();
ValidateMiddleware.NextMiddlewareArg = UserSchema;
ValidateMiddleware.MyReturnType = z.any();
```

## Apache Tomcat

### Overview

Apache Tomcat is a Java-based web server and servlet container. It uses filters and servlets for request processing, which are conceptually similar to middleware.

### Tomcat Filter Pattern

```java
// Tomcat Filter
public class LoggingFilter implements Filter {
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        System.out.println("Request: " + request);
        chain.doFilter(request, response); // Call next filter
        System.out.println("Response: " + response);
    }
}

```

### Middleware-Pipe Pattern

```typescript
const LoggingMiddleware: Middleware<Request, Request, Response, Response> = 
  async (input, next) => {
    console.log('Request:', input);
    const response = await next(input);
    console.log('Response:', response);
    return response;
  };

const stack = [LoggingMiddleware];
const executable = composeStack(stack);
```

### Parallels

| Aspect | Tomcat | Middleware-Pipe |
|--------|--------|-----------------|
| **Core Concept** | Filter chain | Middleware stack |
| **Execution Model** | Synchronous (can be async) | Async/Promise-based |
| **Type Safety** | Loose (Java generics) | Strict (TypeScript) |
| **Composition** | Declarative (annotations) | Programmatic |
| **Framework Coupling** | Tightly coupled to Servlet API | Framework-agnostic |

### Key Differences

#### 1. Execution Model

**Tomcat:**
```java
// Synchronous filter chain
public void doFilter(ServletRequest request, ServletResponse response, 
                    FilterChain chain) throws IOException, ServletException {
    // Pre-processing
    chain.doFilter(request, response); // Blocking call
    // Post-processing
}
```

**Middleware-Pipe:**
```typescript
// Async/Promise-based
const middleware: Middleware<Request, Request, Response, Response> = 
  async (input, next) => {
    // Pre-processing
    const response = await next(input); // Async call
    // Post-processing
    return response;
  };
```

#### 2. Type Safety

**Tomcat:**
```java
// Loose typing - casting required
public void doFilter(ServletRequest request, ServletResponse response, 
                    FilterChain chain) throws IOException, ServletException {
    HttpServletRequest httpRequest = (HttpServletRequest) request; // Cast
    String user = (String) httpRequest.getAttribute("user"); // Unsafe cast
}
```

**Middleware-Pipe:**
```typescript
// Strict typing - no casting needed
const middleware: Middleware<HttpRequest, EnrichedRequest, Response, Response> = 
  async (input, next) => {
    const user = input.user; // Type-safe, no casting
    return next(input);
  };
```

#### 3. Composition

**Tomcat:**
```java
// Declarative composition with annotations
@WebFilter("/*")
public class Filter1 implements Filter { ... }

@WebFilter("/*")
public class Filter2 implements Filter { ... }

// Order determined by container (not explicit)
```

**Middleware-Pipe:**
```typescript
// Explicit programmatic composition
const stack = [Filter1, Filter2, Filter3];
const executable = composeStack(stack);

// Order is explicit and clear
```

## Fastify

### Overview

Fastify is a fast and low-overhead web framework for Node.js. It uses hooks and plugins for middleware-like functionality.

### Fastify Hooks Pattern

```typescript
// Fastify hooks
fastify.addHook('preHandler', async (request, reply) => {
  console.log('Pre-handler:', request.url);
});

fastify.addHook('onSend', async (request, reply, payload) => {
  console.log('On-send:', payload);
  return payload;
});
```

### Middleware-Pipe Pattern

```typescript
const PreHandlerMiddleware: Middleware<Request, Request, Response, Response> = 
  async (input, next) => {
    console.log('Pre-handler:', input.url);
    return next(input);
  };

const OnSendMiddleware: Middleware<Response, Response, FinalResponse, FinalResponse> = 
  async (input, next) => {
    console.log('On-send:', input);
    return next(input);
  };

const stack = [PreHandlerMiddleware, OnSendMiddleware];
const executable = composeStack(stack);
```

### Parallels

| Aspect | Fastify | Middleware-Pipe |
|--------|---------|-----------------|
| **Hook System** | Multiple hook points | Single composition point |
| **Composition** | Hook-based | Stack-based |

## ASP.NET Core

### Overview

ASP.NET Core uses middleware extensively for request processing in a pipeline architecture.

### ASP.NET Core Middleware Pattern

```csharp
// ASP.NET Core middleware
public class LoggingMiddleware
{
    private readonly RequestDelegate _next;

    public LoggingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        Console.WriteLine("Request: " + context.Request.Path);
        await _next(context);
        Console.WriteLine("Response: " + context.Response.StatusCode);
    }
}

// Register middleware
app.UseMiddleware<LoggingMiddleware>();
```

### Middleware-Pipe Pattern

```typescript
const LoggingMiddleware: Middleware<Request, Request, Response, Response> = 
  async (input, next) => {
    console.log('Request:', input.path);
    const response = await next(input);
    console.log('Response:', response.statusCode);
    return response;
  };

const stack = [LoggingMiddleware];
const executable = composeStack(stack);
```

### Parallels

| Aspect | ASP.NET Core | Middleware-Pipe |
|--------|--------------|-----------------|
| **Pipeline Concept** | Middleware pipeline | similar     |
| **Async Support** | Native | Native          |
| **Composition** | Declarative | Programmatic    |
| **Dependency Injection** | Built-in | Via factories   |

## Django

### Overview

Django uses middleware for request/response processing, though it's less central to the framework than in Express or ASP.NET Core.

### Django Middleware Pattern

```python
# Django middleware
class LoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        print(f"Request: {request.path}")
        response = self.get_response(request)
        print(f"Response: {response.status_code}")
        return response

# Register middleware
MIDDLEWARE = [
    'myapp.middleware.LoggingMiddleware',
]
```

### Middleware-Pipe Pattern

```typescript
const LoggingMiddleware: Middleware<Request, Request, Response, Response> = 
  async (input, next) => {
    console.log(`Request: ${input.path}`);
    const response = await next(input);
    console.log(`Response: ${response.statusCode}`);
    return response;
  };

const stack = [LoggingMiddleware];
const executable = composeStack(stack);
```


## Key takeaways

Many advanced frameworks use middleware patterns similar to Middleware-Pipe, with key differences coupling to the processing model, composition, and flexibility. Understanding these patterns helps in establishing a solid foundation for building modular and maintainable applications. Mentioned frameworks employ the middleware concept to varying degrees, but Middleware-Pipe allows you to leverage the pattern in a framework-agnostic manner in your business logic, to orchestrate your code not the frameworks you rely on.
