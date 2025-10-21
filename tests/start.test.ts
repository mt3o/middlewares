import {z} from 'zod';
import type {Middleware, MiddlewareStack} from '../src'
import {describe, it, expect} from 'vitest';
import {composeStack} from "../src";
import { areTypesEquivalent, validateStack } from '../src';


describe('areTypesEquivalent', () => {
    it('should return true for equivalent schemas', () => {
        const schemaA = z.object({foo: z.string()});
        const schemaB = z.object({foo: z.string()});
        expect(areTypesEquivalent(schemaA, schemaB)).toBe(true);
    });

    it('should return false for non-equivalent schemas', () => {
        const schemaA = z.object({foo: z.string()});
        const schemaB = z.object({bar: z.string()});
        expect(areTypesEquivalent(schemaA, schemaB)).toBe(false);
    });

    it('should return false when one schema is undefined', () => {
        expect(areTypesEquivalent(z.object({foo: z.string()}), undefined)).toBe(false);
        expect(areTypesEquivalent(undefined,z.object({foo: z.string()}))).toBe(false);
    });

    it('should return true for undefined schemas', () => {
        expect(areTypesEquivalent(undefined, undefined)).toBe(true);
    });

    it('should return true for equivalent schemas with nested objects', () => {
        const schemaA = z.object({foo: z.object({bar: z.string()})});
        const schemaB = z.object({foo: z.object({bar: z.string()})});
        expect(areTypesEquivalent(schemaA, schemaB)).toBe(true);
    });

    it('should return false for schemas with different nested objects', () => {
        const schemaA = z.object({foo: z.object({foo: z.string()})});
        const schemaB = z.object({foo: z.object({baz: z.string()})});
        expect(areTypesEquivalent(schemaA, schemaB)).toBe(false);
    });

    it('should return false for schemas with different types', () => {
        const schemaA = z.object({foo: z.string()});
        const schemaB = z.object({foo: z.number()});
        expect(areTypesEquivalent(schemaA, schemaB)).toBe(false);
    });
});

//in real code use real types, not any/never
const Foo: Middleware<any, any, any, any> = async (_input, _next) => ({bar: 42});
Foo.MyArgType = z.object({foo: z.string()});
Foo.NextMiddlewareArg = z.object({question: z.string()});
Foo.NextMiddlewareReturnType = z.object({baz: z.boolean()});
Foo.MyReturnType = z.object({bar: z.number()});
Foo.Name = "Foo";

//in real code use real types, not any/never
const Bar: Middleware<any, any, any, any> = async (_input, _next) => ({baz: true});
Bar.MyArgType = z.object({question: z.string()});
Bar.NextMiddlewareArg = z.object({bar: z.number()});
Bar.NextMiddlewareReturnType = z.object({baz: z.number()});
Bar.MyReturnType = z.object({baz: z.boolean()});
Bar.Name = "Middle";

//in real code use real types, not any/never
const Baz: Middleware<any, never, never, any> = async (_input, _next) => ({baz: 42});
Baz.MyArgType = z.object({bar: z.number()});
Baz.MyReturnType = z.object({baz: z.number()});
Baz.Name = "BackendAjax";


describe('validateStack', () => {

    it('should validate a correct stack', () => {
        const stack: MiddlewareStack = [Foo, Bar, Baz];
        expect(validateStack(stack)).toHaveLength(0);
    });

    it('should return errors for a stack with incompatible types', () => {
        const stack: MiddlewareStack = [Bar, Foo];
        const errors = validateStack(stack);
        expect(errors).toHaveLength(2);
    });

    it('should return errors for a stack with missing types', () => {
        const stack: MiddlewareStack = [Foo, Baz];
        const errors = validateStack(stack);
        expect(errors).toHaveLength(2);
    });
});

describe('composeStack', () => {

    it('should compose and execute the stack correctly', async () => {
        const stack: MiddlewareStack = [Foo, Bar, Baz];
        const composed = composeStack(stack);
        const result = await composed({foo: 'test'});
        expect(result).toEqual({bar: 42});
    });
});


describe("specific tests", () => {

    const InsideRequestSchema = z.object({foo: z.string()});
    const InsideInternalArgSchema = z.object({question: z.string()});
    const InsideInternalReturnSchema = z.object({baz: z.boolean()});
    const InsideResponseSchema = z.object({bar: z.number()});

    type InsideRequest = z.infer<typeof InsideRequestSchema>;
    type InsideInternalArg = z.infer<typeof InsideInternalArgSchema>;
    type InsideInternalReturn = z.infer<typeof InsideInternalReturnSchema>;
    type InsideResponse = z.infer<typeof InsideResponseSchema>;


    const MiddleRequestSchema = z.object({question: z.string()});
    const MiddleInternalArgSchema = z.object({bar: z.number()});
    const MiddleInternalReturnSchema = z.object({baz: z.number()});
    const MiddleResponseSchema = z.object({baz: z.boolean()});

    type MiddleRequest = z.infer<typeof MiddleRequestSchema>;
    type MiddleInternalArg = z.infer<typeof MiddleInternalArgSchema>;
    type MiddleInternalReturn = z.infer<typeof MiddleInternalReturnSchema>;
    type MiddleResponse = z.infer<typeof MiddleResponseSchema>;


    const BackendAjaxRequestSchema = z.object({bar: z.number()});
    const BackendAjaxResponseSchema = z.object({baz: z.number()});

    type BackendAjaxRequest = z.infer<typeof BackendAjaxRequestSchema>;
    type BackendAjaxResponse = z.infer<typeof BackendAjaxResponseSchema>;

    const Inside: Middleware<InsideRequest, InsideInternalArg, InsideInternalReturn, InsideResponse> = async (input, next) => {
        const r = await next({question: input.foo});
        return {
            bar: Number(r.baz)
        }
    };
    Inside.MyArgType = InsideRequestSchema;
    Inside.NextMiddlewareArg = InsideInternalArgSchema;
    Inside.NextMiddlewareReturnType = InsideInternalReturnSchema;
    Inside.MyReturnType = InsideResponseSchema;
    Inside.Name = "Inside";

    const Middle: Middleware<MiddleRequest, MiddleInternalArg, MiddleInternalReturn, MiddleResponse> = async (input, next) => {
        const internalCall = await next({bar: 100 * Number(input.question == "Meaning of Life, universe and everything")});
        return {
            baz: internalCall.baz == 42
        };
    };

    Middle.MyArgType = MiddleRequestSchema;
    Middle.NextMiddlewareArg = MiddleInternalArgSchema;
    Middle.NextMiddlewareReturnType = MiddleInternalReturnSchema;
    Middle.MyReturnType = MiddleResponseSchema;
    Middle.Name = "Middle";

    const BackendAjax: Middleware<BackendAjaxRequest, never, never, BackendAjaxResponse> = async (input, _next) => {
        return {baz: input.bar == 100 ? 42 : -1};
    };
    BackendAjax.MyArgType = BackendAjaxRequestSchema;
    BackendAjax.MyReturnType = BackendAjaxResponseSchema;
    BackendAjax.Name = "BackendAjax";

    type WrongRequest = { foo: string };
    type WideResponse = { field: string };

    const IncompatibleRequestSchema = z.object({foo: z.string()});
    const IncompatibleResponseSchema = z.object({field: z.string()});

    const IncompatibleBackend: Middleware<WrongRequest, never, never, WideResponse> = async (input, _next) => {
        return {field: 'Hello', input};
    };
    IncompatibleBackend.MyArgType = IncompatibleRequestSchema;
    IncompatibleBackend.MyReturnType = IncompatibleResponseSchema;
    IncompatibleBackend.Name = "IncompatibleBackend";


    const stack: MiddlewareStack<InsideRequest, InsideResponse> = [Inside, Middle, BackendAjax];
    const stack2: MiddlewareStack<InsideRequest, InsideResponse> = [Inside, IncompatibleBackend];
    const stack3: MiddlewareStack<MiddleRequest, MiddleResponse> = [Middle, IncompatibleBackend];

    describe('stack validation',()=>{
        it('validates OK stack with no errors', async () => {
            expect(validateStack(stack)).toStrictEqual([]);
        });

        it('fails on stack type errors',()=>{
            const errors: Error[] = validateStack(stack2);
            expect(errors).toHaveLength(2);
            expect(errors.map(e=>e.message)).toStrictEqual([
                "Types don't match between self:Inside.NextMiddlewareArg and next:IncompatibleBackend.MyArgType argument type",
                "Types don't match between self:Inside.NextMiddlewareReturnType and next:IncompatibleBackend.MyReturnType output type",
            ]);

            expect(validateStack(stack3).map(e=>e.message)).toStrictEqual([
                "Types don't match between self:Middle.NextMiddlewareArg and next:IncompatibleBackend.MyArgType argument type",
                "Types don't match between self:Middle.NextMiddlewareReturnType and next:IncompatibleBackend.MyReturnType output type",
            ]);
        });
    })

    it('composes', async () => {
        const composed = composeStack<InsideRequest, InsideResponse>(stack);
        expect(await composed({
            foo: 'Meaning of Life, universe and everything'
        })).toStrictEqual({bar: 1})

        expect(await composed({
            foo: 'XD'
        })).toStrictEqual({bar: 0})
    })

    it('tries wrong stacks in good faith',async()=>{
        expect(await (composeStack(stack2)({foo: 'Meaning of Life, universe and everything'}))).toStrictEqual({bar: NaN});
        expect(await (composeStack(stack3)({question: 'xxx'}))).toStrictEqual({baz: false});
    })

})
