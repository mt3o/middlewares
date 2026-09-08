# @mt3o/middleware-pipe

[![npm](https://img.shields.io/npm/v/@mt3o/middleware-pipe.svg)](https://www.npmjs.com/package/@mt3o/middleware-pipe)
[![license](https://img.shields.io/npm/l/@mt3o/middleware-pipe.svg)](./LICENSE)

Type-safe middleware composition for TypeScript. Build onion-model request pipelines where every
layer declares the types it accepts and returns, and the stack is checked as a whole — at
compile time by TypeScript, and optionally at runtime against Zod schemas.

- **Typed all the way through** — a middleware's four type parameters describe what it takes,
  what it hands to the next layer, what it expects back, and what it returns.
- **Stack validation** — `validateStack()` walks adjacent pairs and reports every place where
  one layer's declared output doesn't line up with its neighbour's declared input.
- **Two execution models** — `composeStack` for `async`/`await`, `composeGenStack` for
  callback-style flows that need explicit resolution.
- **Lazy registry** — name your middlewares, resolve them via dynamic `import()` only when a
  stack that uses them is actually composed.
- **No runtime dependencies** — Zod is used for its *types* and its schema objects; it is an
  optional peer dependency, and none of it is bundled.

## Installation

```bash
npm install @mt3o/middleware-pipe
```

Zod is optional — install it if you want schema-based stack validation:

```bash
npm install zod
```

## Quick start

```typescript QuickStart:@import.meta.vitest
const { expect } = await import('vitest');

const { composeStack, Middleware } = await import('@mt3o/middleware-pipe');
const { z } = await import('zod');

const RequestSchema = z.object({ text: z.string() });
const ResponseSchema = z.object({ result: z.string() });

type Request = z.infer<typeof RequestSchema>;
type Response = z.infer<typeof ResponseSchema>;

// Middleware<MyArg, NextArg, NextReturn, MyReturn>
// `never, never` marks a terminal layer: it does not call next().
const upperCase: Middleware<Request, never, never, Response> = async (input) => ({
  result: input.text.toUpperCase(),
});

upperCase.MyArgType = RequestSchema;
upperCase.MyReturnType = ResponseSchema;
upperCase.Name = 'upperCase';

const executable = composeStack([upperCase]);

expect(await executable({ text: 'hello' })).toStrictEqual({ result: 'HELLO' });
```

## Stacking layers

Each middleware receives the input, calls `next` with whatever the layer below expects, and
shapes the response on the way back out. Execution is an onion: the first entry is the
outermost layer, the last is the innermost.

```typescript Stacking:@import.meta.vitest
const { expect } = await import('vitest');

const { composeStack, validateStack, Middleware } = await import('@mt3o/middleware-pipe');
const { z } = await import('zod');

const ApiRequest = z.object({ question: z.string() });
const ApiResponse = z.object({ answer: z.number() });
const BackendRequest = z.object({ query: z.string() });
const BackendResponse = z.object({ value: z.number() });

// Outer layer: rewrites the request, then post-processes the response.
const adapter: Middleware<
  z.infer<typeof ApiRequest>,
  z.infer<typeof BackendRequest>,
  z.infer<typeof BackendResponse>,
  z.infer<typeof ApiResponse>
> = async (input, next) => {
  const downstream = await next({ query: input.question });
  return { answer: downstream.value };
};

adapter.MyArgType = ApiRequest;
adapter.NextMiddlewareArg = BackendRequest;
adapter.NextMiddlewareReturnType = BackendResponse;
adapter.MyReturnType = ApiResponse;
adapter.Name = 'adapter';

// Inner layer: terminal, does the real work.
const backend: Middleware<
  z.infer<typeof BackendRequest>,
  never,
  never,
  z.infer<typeof BackendResponse>
> = async (input) => ({ value: input.query.length });

backend.MyArgType = BackendRequest;
backend.MyReturnType = BackendResponse;
backend.Name = 'backend';

// The declared schemas line up, so there is nothing to report.
expect(validateStack([adapter, backend])).toStrictEqual([]);

const executable = composeStack([adapter, backend]);
expect(await executable({ question: 'hello' })).toStrictEqual({ answer: 5 });
```

If the layers *don't* line up, `validateStack` tells you exactly which pair and which side:

```
Types don't match between self:adapter.NextMiddlewareArg and next:backend.MyArgType argument type
```

It returns an array of `Error`s rather than throwing, so you can validate a stack at startup and
decide yourself whether to log or fail.

## Registry

A registry maps names to provider functions, so a stack can be described as a list of strings
and the implementations pulled in only when needed:

```typescript Registry:@import.meta.vitest
const { expect } = await import('vitest');

const { composeStack, getFromRegistry, Middleware } = await import('@mt3o/middleware-pipe');
const { z } = await import('zod');

const NumberIn = z.object({ value: z.number() });
const NumberOut = z.object({ result: z.number() });

const double: Middleware<
  z.infer<typeof NumberIn>,
  never,
  never,
  z.infer<typeof NumberOut>
> = async (input) => ({ result: input.value * 2 });

double.MyArgType = NumberIn;
double.MyReturnType = NumberOut;

const registry = {
  // Static: hand back an already-imported middleware.
  double: async () => double,
  // Dynamic: `async () => (await import('./middlewares/logger')).logger`
};

const stack = await getFromRegistry(['double'], registry);
const executable = composeStack(stack);

expect(await executable({ value: 21 })).toStrictEqual({ result: 42 });
```

`getFromRegistry` throws if any requested name is absent, listing every missing one, and it does
so *before* invoking any provider — a typo in a stack definition never triggers a partial load.

## Generator-style middleware

`GenMiddleware` swaps `async`/`await` for an explicit `resolve` callback. This gives a layer
control over *when* it resolves — after the downstream call, before it, or not at all — which
is awkward to express with a plain return value.

```typescript
import { composeGenStack, type GenMiddleware, type NextGen } from '@mt3o/middleware-pipe';

const logger: GenMiddleware<Request, Downstream, DownstreamResponse, Response> = async (
  details,
  next: NextGen<Downstream, DownstreamResponse>,
  resolve,
) => {
  const started = Date.now();
  next({ ...details }, (response) => {
    console.log(`took ${Date.now() - started}ms`);
    resolve({ ...response });
  });
};

const executable = composeGenStack([logger, backend]);
executable(initialRequest, (result) => console.log(result));
```

`validateStack` accepts generator stacks too — the schema properties are identical.

## API

| Export | Purpose |
| --- | --- |
| `composeStack(stack)` | Fold a promise-based stack into a single `(request) => Promise<response>` |
| `composeGenStack(stack)` | Fold a generator-style stack into `(request, resolve) => void` |
| `getFromRegistry(names, registry)` | Resolve named promise-based middlewares from a registry |
| `getGenFromRegistry(names, registry)` | Resolve named generator middlewares from a registry |
| `validateStack(stack, areEquivalent?)` | Check adjacent layers' schemas; returns `Error[]` |
| `areTypesEquivalent(a, b)` | Default schema comparison (Zod 3 and Zod 4); replaceable |

Every middleware carries five optional annotation properties used by `validateStack`:
`MyArgType`, `NextMiddlewareArg`, `NextMiddlewareReturnType`, `MyReturnType`, and `Name`.

### Bring your own validator

`validateStack` takes an optional comparison function, so Zod is not a hard requirement — pass
your own `(a, b) => boolean` and annotate middlewares with whatever schema objects your
validation library uses:

```typescript
validateStack(stack, (a, b) => myLibrary.isCompatible(a, b));
```

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) — middleware concepts, stacking patterns, layering
- [Clean Architecture](./docs/CLEAN_ARCHITECTURE.md) — the Dependency Rule, ports, and the composition root
- [API reference](./docs/API_REFERENCE.md) — every export in detail
- [Code examples](./docs/CODE_EXAMPLES.md) — worked examples and patterns
- [Diagrams](./docs/DIAGRAMS.md) — visual walkthroughs of the execution flow
- [Comparisons](./docs/COMPARISONS.md) — how this relates to Express, Tomcat, and friends
- [Documentation index](./docs/INDEX.md) — suggested reading paths

## Contributing

```bash
npm install
npm test          # vitest, including the doctests embedded in these markdown files
npm run typecheck
npm run lint
npm run build
```

The examples in this README and under `docs/` tagged `:@import.meta.vitest` are executed as part
of the test suite, so they cannot drift from the implementation.

## License

MIT © [Teodor Kulej](https://github.com/mt3o)
