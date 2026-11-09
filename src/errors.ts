/**
 * Thrown when the last middleware of a stack calls `next()`: there is nothing left to call.
 * Usually means the innermost middleware (the one doing the real work) was left out of the stack.
 *
 * Pass `{ terminal }` to `composeStack` / `composeGenStack` to handle the end of the chain yourself.
 */
export class MiddlewareChainEndError extends Error {
    /** `Name` of the middleware that called `next()`, or its function name, if either is set */
    readonly lastMiddleware: string | undefined;

    constructor(lastMiddleware: string | undefined) {
        const who = lastMiddleware ? `"${lastMiddleware}"` : 'The last middleware';
        super(`${who} called next(), but it is the last middleware in the stack. ` +
            'Add the middleware that should handle the request, or pass { terminal } when composing the stack.');
        this.name = 'MiddlewareChainEndError';
        this.lastMiddleware = lastMiddleware;
    }
}

export function middlewareName(middleware: { Name?: string; name?: string } | undefined): string | undefined {
    return middleware?.Name || middleware?.name || undefined;
}
