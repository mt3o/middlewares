import {describe, it, expect} from 'vitest';
import {z} from 'zod';
import {validateStack} from "../src";
import type {GenMiddleware, GenMiddlewareStack} from "../src/types";


// Build a simple valid Gen stack
const StringObjectA = z.object({ a: z.string() });
const StringObjectB = z.object({ b: z.string() });
const NumberObject = z.object({ c: z.number() });
const StringObjectD = z.object({ d: z.string() });

// Middleware 1: A -> (next B -> C) -> resolves to A
const mw1: GenMiddleware<
    z.infer<typeof StringObjectA>,
    z.infer<typeof StringObjectB>,
    z.infer<typeof NumberObject>,
    z.infer<typeof StringObjectA>
> =
    async (details, next, resolve) => {
        next({ b: details.a }, (_response) => {
            resolve({ a: details.a });
        });
    };
mw1.MyArgType = StringObjectA;
mw1.NextMiddlewareArg = StringObjectB;
mw1.NextMiddlewareReturnType = NumberObject;
mw1.MyReturnType = StringObjectA;
mw1.Name = 'mw1';

// Middleware 2: B -> (next never) -> resolves to C
const mw2: GenMiddleware<
    z.infer<typeof StringObjectB>,
    never,
    never,
    z.infer<typeof NumberObject>
> =
    async (details, _next, resolve) => {
        resolve({ c: details.b.length });
    };
mw2.MyArgType = StringObjectB;
mw2.MyReturnType = NumberObject;
mw2.Name = 'mw2';

// Invalid pairs for negative tests


// Middleware A: NextMiddlewareArg mismatches next.MyArgType
const badArgA: GenMiddleware<
    z.infer<typeof StringObjectA>,
    z.infer<typeof StringObjectD>,
    z.infer<typeof NumberObject>,
    z.infer<typeof StringObjectA>
> =
    async (_details, next, resolve) => {
        next({ d: 'x' }, (_r) => resolve({ a: 'x' }));
    };
badArgA.MyArgType = StringObjectA;
badArgA.NextMiddlewareArg = StringObjectD; // expects D
badArgA.NextMiddlewareReturnType = NumberObject;
badArgA.MyReturnType = StringObjectA;
badArgA.Name = 'badArgA';

const badArgB: GenMiddleware<
    z.infer<typeof StringObjectB>,
    never,
    never,
    z.infer<typeof NumberObject>
> =
    async (_details, _next, resolve) => resolve({ c: 1 });
badArgB.MyArgType = StringObjectB; // provides B -> mismatch with D expected by previous
badArgB.MyReturnType = NumberObject;
badArgB.Name = 'badArgB';

// Middleware X: response mismatch with next.MyReturnType
const BoolOk = z.object({ ok: z.boolean() });
const BoolFine = z.object({ fine: z.boolean() });

const badRespA: GenMiddleware<
    z.infer<typeof StringObjectA>,
    z.infer<typeof StringObjectB>,
    z.infer<typeof BoolOk>,
    z.infer<typeof StringObjectA>
> =
    async (_details, next, resolve) => {
        next({ b: 'b' }, (_r) => resolve({ a: 'a' }));
    };
badRespA.MyArgType = StringObjectA;
badRespA.NextMiddlewareArg = StringObjectB;
badRespA.NextMiddlewareReturnType = BoolOk; // expects next.MyReturnType to be BoolOk
badRespA.MyReturnType = StringObjectA;
badRespA.Name = 'badRespA';

const badRespB: GenMiddleware<
    z.infer<typeof StringObjectB>,
    never,
    never,
    z.infer<typeof BoolFine>
> =
    async (_d, _n, resolve) => resolve({ fine: false });
badRespB.MyArgType = StringObjectB;
badRespB.MyReturnType = BoolFine; // does not match BoolOk
badRespB.Name = 'badRespB';

describe('validateGenStack', () => {
    it('returns no errors for a valid Gen stack', () => {
        const stack: GenMiddlewareStack = [mw1, mw2];
        const errors = validateStack(stack);
        expect(errors).toHaveLength(0);
    });

    it('detects argument type mismatch between adjacent gen middlewares', () => {
        const stack: GenMiddlewareStack= [badArgA, badArgB];
        const errors = validateStack(stack);
        expect(errors).toHaveLength(1);
        expect(String(errors[0].message)).toContain("Types don't match between self:badArgA.NextMiddlewareArg and next:badArgB.MyArgType argument type");
    });

    it('detects response type mismatch between adjacent gen middlewares', () => {
        const stack: GenMiddlewareStack= [badRespA, badRespB];
        const errors = validateStack(stack);

        expect(errors).toHaveLength(1);
        expect(String(errors[0].message)).toContain("Types don't match between self:badRespA.NextMiddlewareReturnType and next:badRespB.MyReturnType output type");
    });
});
