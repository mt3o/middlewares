import type {MiddlewareStack} from "./types";
import {areTypesEquivalent} from "./index";
import type {GenMiddlewareStack} from "./gen";

function isNever(value: unknown): boolean {
    return value === undefined || value === null;
}

/**
 * Verify the whole stack of middlewares by checking if argument and return value of one middleware are compatible with another one in the stack.
 * @param stack to be validated
 * @param areEquivalent function that checks if one type overlaps another
 */
export function validateStack<In, Out>(
    stack: MiddlewareStack<In, Out>,
    areEquivalent: typeof areTypesEquivalent = areTypesEquivalent
): Error[] {
    const errors: Error[] = [];
    for (let i = 0; i <= stack.length - 2; i++) {
        const self = stack[i];
        const next = stack[i + 1];

        if (!isNever(self.NextMiddlewareArg) && !areEquivalent(next.MyArgType, self.NextMiddlewareArg)) {
            errors.push(
                new Error(
                    `Types don't match between self:${self.Name}.NextMiddlewareArg and next:${next.Name}.MyArgType argument type`
                )
            );
        }

        if (!areEquivalent(self.NextMiddlewareReturnType, next.MyReturnType)) {
            errors.push(
                new Error(
                    `Types don't match between self:${self.Name}.NextMiddlewareReturnType and next:${next.Name}.MyReturnType output type`
                )
            );
        }
    }
    return errors;
}

export function validateGenStack<In, Out>(stack: GenMiddlewareStack<In, Out>): Error[] {
    const errors: Error[] = [];
    for (let i = 0; i <= stack.length - 2; i++) {
        const self = stack[i];
        const next = stack[i + 1];

        if (!isNever(self.NextArg) && !areTypesEquivalent(next.MyArg, self.NextArg)) {
            errors.push(
                new Error(
                    `Types don't match between self:${self.Name}.NextArg and next:${next.Name}.MyArg argument type`
                )
            );
        }

        if (!areTypesEquivalent(self.NextResponse, next.MyResolved)) {
            errors.push(
                new Error(
                    `Types don't match between self:${self.Name}.NextResponse and next:${next.Name}.MyResolved output type`
                )
            );
        }
    }
    return errors;
}
