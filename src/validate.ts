import type {GenMiddlewareStack, MiddlewareStack} from "./types";
import {areTypesEquivalent} from "./index";

function isNever(value: unknown): boolean {
    return value === undefined || value === null;
}

/**
 * Verify the whole stack of middlewares by checking if argument and return value of one middleware are compatible with another one in the stack.
 * @param stack to be validated
 * @param areEquivalent function that checks if one type overlaps another
 */
export function validateStack<In, Out>(
    stack: MiddlewareStack<In, Out>|GenMiddlewareStack<In,Out>,
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
