# Clean Architecture with Middleware-Pipe

## Table of Contents

1. [Clean Architecture in Brief](#clean-architecture-in-brief)
2. [The Dependency Rule](#the-dependency-rule)
3. [Where a Middleware Stack Fits](#where-a-middleware-stack-fits)
4. [Where the Analogy Breaks](#where-the-analogy-breaks)
5. [How the Library Enforces the Dependency Rule](#how-the-library-enforces-the-dependency-rule)
6. [A Worked Example](#a-worked-example)
7. [Swapping Adapters: The Composition Root](#swapping-adapters-the-composition-root)
8. [Benefits](#benefits)
9. [Limitations and Honest Caveats](#limitations-and-honest-caveats)

## Clean Architecture in Brief

Clean Architecture organises a system into concentric rings. Moving inward, each ring
is more abstract, more stable, and less aware of the machinery around it:

```
┌─────────────────────────────────────────────────┐
│  Frameworks & Drivers                           │
│  HTTP servers, databases, message queues, CLIs  │
│  ┌───────────────────────────────────────────┐  │
│  │  Interface Adapters                       │  │
│  │  Controllers, presenters, gateways        │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │  Use Cases                          │  │  │
│  │  │  Application-specific business rules│  │  │
│  │  │  ┌───────────────────────────────┐  │  │  │
│  │  │  │  Entities                     │  │  │  │
│  │  │  │  Enterprise business rules    │  │  │  │
│  │  │  └───────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

- **Entities** — rules that would be true even if the software did not exist. A price is
  never negative; an order has at least one line.
- **Use Cases** — what *this* application does with those rules. "Place an order" as a
  sequence of steps, independent of how it is triggered or stored.
- **Interface Adapters** — translation. A controller turning an HTTP body into a use-case
  command; a gateway turning a use-case query into a SQL statement.
- **Frameworks & Drivers** — the machinery you did not write. Express, Postgres, the
  fetch API.

## The Dependency Rule

One rule holds the scheme together:

> **Source code dependencies must point only inward.**

Nothing in an inner ring may name anything in an outer ring. A use case must not
`import` the HTTP controller that calls it, nor the database client that stores its
results. If it did, changing the web framework would force a change to your business
rules — which is precisely what the architecture exists to prevent.

The rule is about **source dependencies**, not about call direction or runtime flow.
Control passes outward all the time; the *knowledge* must not. When an inner ring needs
something from an outer one, it declares the shape it requires — a **port** — and an
outer ring supplies an implementation. That inversion is the whole trick.

## Where a Middleware Stack Fits

A composed stack is a call path through those rings. Written as a Middleware-Pipe stack,
a typical request looks like this:

```typescript
const stack = [
  httpAdapter,      // Interface Adapters   — HTTP payload  → use-case command
  placeOrder,       // Use Cases            — the business operation
  catalogGateway,   // Interface Adapters   — use-case query → catalogue call
];
```

Execution is an onion. `httpAdapter` is outermost: it sees the request first and shapes
the response last. `catalogGateway` is innermost in *call order* — it is the layer that
finally stops calling `next` and returns.

```
        ┌──────────── httpAdapter ────────────┐
        │  parse body → command               │
        │   ┌───────── placeOrder ─────────┐  │
        │   │  apply the business rule     │  │
        │   │  ┌──── catalogGateway ────┐  │  │
        │   │  │  fetch price + stock   │  │  │
        │   │  └────────────────────────┘  │  │
        │   │  compute the total           │  │
        │   └──────────────────────────────┘  │
        │  command result → HTTP response     │
        └─────────────────────────────────────┘
```

Each layer owns one translation and hands a narrower, more domain-shaped value to the
layer beneath it. By the time `placeOrder` runs, there is no HTTP left in sight — it
receives a command, not a request.

## Where the Analogy Breaks

It is tempting to say "stack position equals ring position". It does not, and pretending
otherwise will mislead you.

The **innermost middleware is usually a driven adapter** — the call to the database, the
catalogue service, the payment provider. In Clean Architecture that adapter belongs to an
*outer* ring, not the centre. A stack's depth axis is **call order**, while Clean
Architecture's rings are **source-dependency order**, and the two only coincide on the
inbound half of the journey.

The accurate reading is the Hexagonal one: a stack traces a path from a **driving
adapter**, through the **use case**, out through a **port** to a **driven adapter**.

```
driving adapter  →  use case  →  port  →  driven adapter
  httpAdapter       placeOrder    (types)   catalogGateway
   outer ring       inner ring              outer ring
```

The use case sits in the middle of the stack *and* at the centre of the architecture.
The two ends of the stack are both outer rings. That is the shape to keep in your head.

What matters for Clean Architecture is not where a middleware sits in the array, but
whether it **names** the thing beneath it. Middleware-Pipe is built so that it never
does.

## How the Library Enforces the Dependency Rule

Four properties of the library do the work.

### 1. `next` is injected, never imported

A middleware receives its collaborator as an argument. It cannot import it, because it
never learns which one it got:

```typescript
// The use case names no adapter. It is handed one.
const placeOrder: Middleware<Command, Query, CatalogInfo, Result> =
  async (command, next) => {
    const info = await next({ sku: command.sku });
    return { accepted: info.inStock, totalCents: info.unitPriceCents * command.qty };
  };
```

`composeStack` supplies `next` by folding the array. The use case module's import list
contains no gateway, no HTTP, no database — which is the Dependency Rule stated as a
property of the code rather than as a team convention.

### 2. The four type parameters *are* the port

`Middleware<MyArgType, NextMiddlewareArg, NextMiddlewareReturnType, MyReturnType>` lets a
layer state the contract of the collaborator it needs without naming an implementation:

- `NextMiddlewareArg` — what I will send outward
- `NextMiddlewareReturnType` — what I require back

That pair is a port declaration. In a conventional Clean Architecture codebase you would
write an interface in the use-case package and implement it in the infrastructure
package; here the same information lives in the use case's own type signature, and any
middleware whose `MyArgType` and `MyReturnType` line up can satisfy it.

### 3. The composition root is the only place that knows implementations

`composeStack` — and more sharply, `getFromRegistry` — is the composition root. A stack
can be written as names, with the binding to concrete modules deferred to one file:

```typescript
const registry: MiddlewareRegistry = {
  http:    async () => (await import('./adapters/httpAdapter')).httpAdapter,
  order:   async () => (await import('./usecases/placeOrder')).placeOrder,
  catalog: async () => (await import('./adapters/catalogGateway')).catalogGateway,
};

const stack = await getFromRegistry(['http', 'order', 'catalog'], registry);
```

Because the providers are dynamic imports, the infrastructure module is not even *loaded*
until the composition root asks for it. Swapping a real gateway for a fake is a change to
one map, not a change to any layer.

### 4. `validateStack` makes the boundaries machine-checkable

Architectural boundaries usually erode quietly. Attaching schemas to the annotation
properties turns each seam into something a test can assert:

```typescript
const errors = validateStack(stack);
if (errors.length > 0) throw new AggregateError(errors, 'Stack wiring is wrong');
```

Run that in a unit test and a mismatched boundary fails the build rather than surviving
to production.

## A Worked Example

A complete three-ring stack. Note what each module would need to import: the use case
imports nothing from HTTP or from the catalogue.

```typescript CleanArchitectureStack:@import.meta.vitest
const { expect } = await import('vitest');

const { composeStack, validateStack, Middleware } = await import('@mt3o/middleware-pipe');
const { z } = await import('zod');

// ── Ring boundaries, expressed as schemas ──────────────────────────────
const HttpRequest  = z.object({ body: z.string() });
const HttpResponse = z.object({ status: z.number(), body: z.string() });

const PlaceOrderCommand = z.object({ sku: z.string(), qty: z.number() });
const OrderResult       = z.object({ accepted: z.boolean(), totalCents: z.number() });

// The port the use case requires of the catalogue.
const CatalogQuery = z.object({ sku: z.string() });
const CatalogInfo  = z.object({ unitPriceCents: z.number(), inStock: z.boolean() });

// ── Interface Adapter (driving): HTTP → command, result → HTTP ─────────
const httpAdapter: Middleware<
  z.infer<typeof HttpRequest>,
  z.infer<typeof PlaceOrderCommand>,
  z.infer<typeof OrderResult>,
  z.infer<typeof HttpResponse>
> = async (request, next) => {
  const command = JSON.parse(request.body);
  const result = await next(command);
  return {
    status: result.accepted ? 200 : 409,
    body: JSON.stringify(result),
  };
};

httpAdapter.MyArgType = HttpRequest;
httpAdapter.NextMiddlewareArg = PlaceOrderCommand;
httpAdapter.NextMiddlewareReturnType = OrderResult;
httpAdapter.MyReturnType = HttpResponse;
httpAdapter.Name = 'httpAdapter';

// ── Use Case: the business operation. Knows no HTTP, knows no catalogue.
const placeOrder: Middleware<
  z.infer<typeof PlaceOrderCommand>,
  z.infer<typeof CatalogQuery>,
  z.infer<typeof CatalogInfo>,
  z.infer<typeof OrderResult>
> = async (command, next) => {
  const info = await next({ sku: command.sku });
  return {
    accepted: info.inStock && command.qty > 0,
    totalCents: info.unitPriceCents * command.qty,
  };
};

placeOrder.MyArgType = PlaceOrderCommand;
placeOrder.NextMiddlewareArg = CatalogQuery;
placeOrder.NextMiddlewareReturnType = CatalogInfo;
placeOrder.MyReturnType = OrderResult;
placeOrder.Name = 'placeOrder';

// ── Interface Adapter (driven): satisfies the port. Terminal. ──────────
const catalogGateway: Middleware<
  z.infer<typeof CatalogQuery>,
  never,
  never,
  z.infer<typeof CatalogInfo>
> = async (query) => {
  // In production this is an HTTP call or a database read.
  return { unitPriceCents: query.sku === 'WIDGET-1' ? 1250 : 999, inStock: true };
};

catalogGateway.MyArgType = CatalogQuery;
catalogGateway.MyReturnType = CatalogInfo;
catalogGateway.Name = 'catalogGateway';

// ── Composition root ───────────────────────────────────────────────────
const stack = [httpAdapter, placeOrder, catalogGateway];

// Every seam lines up, so nothing is reported.
expect(validateStack(stack)).toStrictEqual([]);

const handle = composeStack(stack);

const response = await handle({ body: '{"sku":"WIDGET-1","qty":3}' });

expect(response).toStrictEqual({
  status: 200,
  body: '{"accepted":true,"totalCents":3750}',
});
```

A misconnected boundary is caught before anything runs. Suppose someone changes the
catalogue gateway to return a price in whole currency units, forgetting that the use case
asked for cents:

```typescript BoundaryDrift:@import.meta.vitest
const { expect } = await import('vitest');

const { validateStack, Middleware } = await import('@mt3o/middleware-pipe');
const { z } = await import('zod');

const CatalogQuery = z.object({ sku: z.string() });
const CatalogInfo = z.object({ unitPriceCents: z.number(), inStock: z.boolean() });
// The gateway drifted: `price`, not `unitPriceCents`.
const DriftedInfo = z.object({ price: z.number(), inStock: z.boolean() });

const Command = z.object({ sku: z.string(), qty: z.number() });
const Result = z.object({ accepted: z.boolean(), totalCents: z.number() });

const useCase: Middleware<
  z.infer<typeof Command>,
  z.infer<typeof CatalogQuery>,
  z.infer<typeof CatalogInfo>,
  z.infer<typeof Result>
> = async (_command, _next) => ({ accepted: false, totalCents: 0 });

useCase.MyArgType = Command;
useCase.NextMiddlewareArg = CatalogQuery;
useCase.NextMiddlewareReturnType = CatalogInfo; // still expects cents
useCase.MyReturnType = Result;
useCase.Name = 'placeOrder';

const drifted: Middleware<z.infer<typeof CatalogQuery>, never, never, z.infer<typeof DriftedInfo>> =
  async () => ({ price: 12.5, inStock: true });

drifted.MyArgType = CatalogQuery;
drifted.MyReturnType = DriftedInfo;
drifted.Name = 'catalogGateway';

const errors = validateStack([useCase, drifted]);

expect(errors).toHaveLength(1);
expect(errors[0].message).toContain(
  "self:placeOrder.NextMiddlewareReturnType and next:catalogGateway.MyReturnType"
);
```

The port was violated, and the violation is reported by name at the exact seam.

## Swapping Adapters: The Composition Root

The payoff of the Dependency Rule is that outer rings are replaceable. Because the use
case never named the catalogue, testing it against a stub is a change to the registry
and nothing else — no mocking framework, no module interception:

```typescript SwappableAdapter:@import.meta.vitest
const { expect } = await import('vitest');

const { composeStack, getFromRegistry, Middleware, MiddlewareRegistry } =
  await import('@mt3o/middleware-pipe');
const { z } = await import('zod');

const Command = z.object({ sku: z.string(), qty: z.number() });
const Result = z.object({ accepted: z.boolean(), totalCents: z.number() });
const CatalogQuery = z.object({ sku: z.string() });
const CatalogInfo = z.object({ unitPriceCents: z.number(), inStock: z.boolean() });

// Unchanged between production and test.
const placeOrder: Middleware<
  z.infer<typeof Command>,
  z.infer<typeof CatalogQuery>,
  z.infer<typeof CatalogInfo>,
  z.infer<typeof Result>
> = async (command, next) => {
  const info = await next({ sku: command.sku });
  return {
    accepted: info.inStock && command.qty > 0,
    totalCents: info.unitPriceCents * command.qty,
  };
};
placeOrder.MyArgType = Command;
placeOrder.NextMiddlewareArg = CatalogQuery;
placeOrder.NextMiddlewareReturnType = CatalogInfo;
placeOrder.MyReturnType = Result;

const outOfStock: Middleware<z.infer<typeof CatalogQuery>, never, never, z.infer<typeof CatalogInfo>> =
  async () => ({ unitPriceCents: 1250, inStock: false });
outOfStock.MyArgType = CatalogQuery;
outOfStock.MyReturnType = CatalogInfo;

// Only the composition root changes.
const testRegistry: MiddlewareRegistry = {
  order: async () => placeOrder,
  catalog: async () => outOfStock,
};

const stack = await getFromRegistry(['order', 'catalog'], testRegistry);
const result = await composeStack(stack)({ sku: 'WIDGET-1', qty: 3 });

expect(result).toStrictEqual({ accepted: false, totalCents: 3750 });
```

The use case ran its real logic against a substituted driven adapter. That is
dependency inversion doing its job, not a test double bolted on afterwards.

## Benefits

- **The Dependency Rule becomes structural.** A use case physically cannot import its
  adapters, because it receives them. There is nothing to enforce by review.
- **Ports are ordinary types.** No separate interface files to keep in sync; the contract
  lives in the signature of the layer that needs it.
- **Boundaries are testable.** `validateStack` turns "did anyone break the seam between
  the use case and the gateway" into an assertion.
- **One composition root.** `getFromRegistry` concentrates every binding from name to
  implementation into a single map — the one place allowed to know everything.
- **Deferred loading matches deferred knowledge.** Dynamic-import providers mean an
  infrastructure module is not loaded until the root asks for it.
- **Framework independence.** The library has no runtime dependencies, so the inner rings
  do not inherit one transitively.

## Limitations and Honest Caveats

Worth knowing before you commit to the mapping:

- **Stack order is not ring order.** As covered above, both ends of a stack are typically
  outer rings. Do not reason about architecture from array position.
- **Entities have no representation here.** Middleware-Pipe models the *flow* between
  layers. Your innermost enterprise rules are plain types and functions the use-case
  middleware calls; the library neither helps nor hinders them.
- **A stack is linear.** A use case that must consult three collaborators does not
  decompose into one chain. Compose a stack per collaboration, or call ports directly
  from the use case and reserve the stack for the primary path.
- **Schema annotations are optional and unenforced.** `validateStack` only checks what
  you annotated. A middleware with no schemas passes trivially — the check is as good as
  your diligence in filling it in.
- **Shape comparison is structural, not nominal.** The default `areTypesEquivalent`
  compares object keys and primitive type names. Two different domain concepts that
  happen to share a shape (`{ id: string }`) will compare as compatible. Pass your own
  comparison function if you need nominal typing at the boundaries.

**Key Takeaway:** Middleware-Pipe does not make an application Clean, but it removes the
usual reason inner layers reach outward — it injects the collaborator and lets the caller
describe it by type. The Dependency Rule stops being a convention the team maintains and
becomes a property of how the code is wired.

## See Also

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — layering patterns and execution flow
- **[CODE_EXAMPLES.md](./CODE_EXAMPLES.md)** — more worked stacks
- **[API_REFERENCE.md](./API_REFERENCE.md)** — the annotation properties in detail
- **[COMPARISONS.md](./COMPARISONS.md)** — how this differs from Express-style middleware
